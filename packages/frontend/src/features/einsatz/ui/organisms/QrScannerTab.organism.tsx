/**
 * QR Scanner Tab Komponente (Story 4-2)
 *
 * Ermöglicht das Scannen von DRK QR-Codes zur schnellen Personenregistrierung.
 * Unterstützt zwei Modi:
 * - Tauri: Natives Barcode-Scanner Plugin mit nativer Kamera-Ansicht
 * - Browser: navigator.mediaDevices + jsQR für QR-Erkennung
 *
 * Implementiert:
 * - AC1: QR Scanner öffnet mit Kamera-Zugriff
 * - AC2: Dekodierung des DRK-Formats
 * - AC4: Automatische Registrierung ohne Bestätigungs-Button
 * - AC5: Performance <3s (E2E)
 * - AC6: Fehlerbehandlung bei ungültigem QR-Code oder Duplikaten
 *
 * @module features/einsatz/ui/organisms
 */

import { isDuplicatePersonError, useRegistrierePersonViaQr } from '@/features/einsatz/api';
import { type DrkQrData, DrkQrParseErrorCode, isDrkQrCodeFormat, parseDrkQrCode } from '@/features/einsatz/utils';
import type { ResponseError } from '@/shared';
import { Button } from '@/shared/ui/atoms/button.atom';
import { InlineSpinner } from '@/shared/ui/atoms/spinner.atom';
import { cn } from '@/shared/ui/cn';
import { isTauri } from '@tauri-apps/api/core';
import jsQR from 'jsqr';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { PiCamera, PiCameraSlash, PiCheckCircle, PiQrCode, PiWarningCircle, PiXCircle } from 'react-icons/pi';
import { toast } from 'sonner';

/**
 * Sanitizes string for safe console logging (prevents log injection attacks)
 */
function sanitizeForLog(input: string): string {
  if (input.length > 100) {
    return `${input.substring(0, 100)}... [truncated, ${input.length} chars total]`;
  }
  // Remove control characters and potential injection patterns
  // biome-ignore lint/suspicious/noControlCharactersInRegex: Needed for security - sanitizing untrusted QR input
  return input.replace(/[\x00-\x1F\x7F]/g, '?');
}

interface QrScannerTabProps {
  einsatzId: string;
  onSuccess?: (personName: string) => void;
  isActive?: boolean; // CRITICAL FIX #6: Track if tab is active to stop camera
}

type ScannerState =
  | { status: 'idle' }
  | { status: 'requesting-permission' }
  | { status: 'permission-denied'; error: string }
  | { status: 'scanning' }
  | { status: 'processing'; data: DrkQrData }
  | { status: 'success'; personName: string }
  | { status: 'error'; message: string };

/**
 * Prüft ob wir in einer Tauri Mobile Umgebung laufen (iOS/Android)
 * Der Barcode Scanner ist nur auf Mobile verfügbar.
 * Auf Desktop-Tauri und Browser nutzen wir navigator.mediaDevices + jsQR.
 */
async function isTauriMobileEnvironment(): Promise<boolean> {
  // Nutze offizielle isTauri() Funktion statt manueller window.__TAURI__ Prüfung
  if (!isTauri()) {
    return false;
  }

  // Prüfe ob der Barcode Scanner verfügbar ist (nur auf Mobile)
  try {
    const { checkPermissions } = await import('@tauri-apps/plugin-barcode-scanner');
    // Wenn der Import funktioniert und wir permissions prüfen können, sind wir auf Mobile
    await checkPermissions();
    return true;
  } catch {
    // Plugin nicht verfügbar = Desktop Tauri oder Browser
    return false;
  }
}

/**
 * QR Scanner Tab für Personenregistrierung
 *
 * Automatisierter Ablauf (AC4):
 * 1. Kamera-Zugriff anfordern
 * 2. Video-Feed anzeigen (Browser) oder native Kamera öffnen (Tauri)
 * 3. QR-Code automatisch erkennen
 * 4. DRK-Format validieren
 * 5. Person automatisch registrieren (ohne Button!)
 * 6. Erfolgs/Fehler-Feedback anzeigen
 *
 * Der Scanner bleibt nach erfolgreicher Registrierung aktiv für weitere Scans.
 */
export function QrScannerTab({ einsatzId, onSuccess, isActive = true }: QrScannerTabProps) {
  // Refs
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const animationRef = useRef<number | null>(null);
  const lastScannedRef = useRef<string | null>(null);
  const cooldownRef = useRef<boolean>(false);
  const mountedRef = useRef(false);
  const tauriScanActiveRef = useRef(false);
  // Timeout refs for cleanup (Memory Leak Fix)
  const timeoutRefs = useRef<Set<ReturnType<typeof setTimeout>>>(new Set());

  // Stable refs für Callback-Dependencies (verhindert infinite loops)
  const einsatzIdRef = useRef(einsatzId);
  const onSuccessRef = useRef(onSuccess);
  einsatzIdRef.current = einsatzId;
  onSuccessRef.current = onSuccess;

  // State
  const [state, setState] = useState<ScannerState>({ status: 'idle' });
  const [isTauriMobile, setIsTauriMobile] = useState(false);
  const [environmentChecked, setEnvironmentChecked] = useState(false);

  // Mutation - in Ref speichern um stabile Referenz zu haben
  const registriereViaQr = useRegistrierePersonViaQr();
  const registriereViaQrRef = useRef(registriereViaQr);
  registriereViaQrRef.current = registriereViaQr;

  /**
   * Stoppt alle aktiven Streams und Animationen (Browser-Modus)
   */
  const cleanupBrowser = useCallback(() => {
    if (animationRef.current) {
      cancelAnimationFrame(animationRef.current);
      animationRef.current = null;
    }

    if (streamRef.current) {
      for (const track of streamRef.current.getTracks()) {
        track.stop();
      }
      streamRef.current = null;
    }

    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
  }, []);

  /**
   * Stoppt den Tauri Scanner
   */
  const cleanupTauri = useCallback(async () => {
    if (tauriScanActiveRef.current) {
      try {
        const { cancel } = await import('@tauri-apps/plugin-barcode-scanner');
        await cancel();
      } catch {
        // Ignore errors during cleanup
      }
      tauriScanActiveRef.current = false;
    }
  }, []);

  /**
   * Cleanup-Funktion für beide Modi
   */
  const cleanup = useCallback(async () => {
    // Clear all pending timeouts (Memory Leak Fix)
    for (const timeoutId of timeoutRefs.current) {
      clearTimeout(timeoutId);
    }
    timeoutRefs.current.clear();

    cleanupBrowser();
    await cleanupTauri();
  }, [cleanupBrowser, cleanupTauri]);

  /**
   * Helper to create tracked timeouts that are cleaned up on unmount
   */
  const createTrackedTimeout = useCallback((callback: () => void, delay: number) => {
    const timeoutId = setTimeout(() => {
      timeoutRefs.current.delete(timeoutId);
      callback();
    }, delay);
    timeoutRefs.current.add(timeoutId);
    return timeoutId;
  }, []);

  /**
   * Verarbeitet einen erkannten QR-Code
   * Verwendet Refs für stabile Dependencies (keine infinite loops)
   */
  const processQrCode = useCallback(
    async (qrContent: string) => {
      // MEDIUM FIX (1): Check if unmounted to prevent race condition
      if (!mountedRef.current) {
        return;
      }

      console.log('[QR Scanner] processQrCode aufgerufen:', sanitizeForLog(qrContent));

      // CRITICAL FIX #7: Debounce check und cooldown SOFORT setzen (BEFORE ANY async operations)
      if (lastScannedRef.current === qrContent || cooldownRef.current) {
        console.log('[QR Scanner] Debounce aktiv, überspringe');
        return;
      }
      // Set cooldown IMMEDIATELY to prevent race condition (gap between check and set)
      cooldownRef.current = true;
      lastScannedRef.current = qrContent;

      // Quick-Check: Ist es überhaupt ein DRK QR-Code?
      if (!isDrkQrCodeFormat(qrContent)) {
        // Log: Zeige das tatsächliche Format für Debugging
        console.log('[QR Scanner] Kein DRK-Format erkannt. Erwartet: drk://person?..., Erhalten:', sanitizeForLog(qrContent.substring(0, 50)));
        // Reset cooldown for non-DRK codes to allow scanning valid codes immediately
        cooldownRef.current = false;
        lastScannedRef.current = null;
        return;
      }

      console.log('[QR Scanner] DRK-Format erkannt, parse...');

      // Parse den QR-Code
      const parseResult = parseDrkQrCode(qrContent);
      console.log('[QR Scanner] Parse-Ergebnis:', parseResult);

      if (!parseResult.success) {
        // Parsing-Fehler anzeigen
        const errorMessage = getParseErrorMessage(parseResult.error.code);

        // Cancel animation frame before state transition
        if (animationRef.current) {
          cancelAnimationFrame(animationRef.current);
          animationRef.current = null;
        }

        setState({ status: 'error', message: errorMessage });

        // Cooldown um Spam zu vermeiden (Memory Leak Fix: use tracked timeout)
        createTrackedTimeout(() => {
          // CRITICAL FIX #8: Check stream exists before setState (prevent state transition after cleanup)
          if (mountedRef.current && streamRef.current !== null) {
            cooldownRef.current = false;
            lastScannedRef.current = null;
            setState({ status: 'scanning' });
          }
        }, 2000);

        return;
      }

      // Erfolgreiches Parsing
      const qrData = parseResult.data;

      // CRITICAL FIX: Cancel animation frame before switching to processing state
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
        animationRef.current = null;
      }

      setState({ status: 'processing', data: qrData });

      try {
        // AC4: Automatische Registrierung ohne Bestätigungs-Button!
        // Verwende Refs für stabile Referenzen
        const result = await registriereViaQrRef.current.mutateAsync({
          einsatzId: einsatzIdRef.current,
          qrData: {
            personalnummer: qrData.personalnummer,
            vorname: qrData.vorname,
            nachname: qrData.nachname,
            funkkennung: qrData.funkkennung,
          },
        });

        const personName = `${result.data?.vorname ?? qrData.vorname} ${result.data?.nachname ?? qrData.nachname}`;

        // Erfolg!
        setState({ status: 'success', personName });
        toast.success(`${personName} registriert`, {
          description: 'Person wurde erfolgreich zum Einsatz hinzugefügt',
        });

        onSuccessRef.current?.(personName);

        // Cancel animation frame before state transition
        if (animationRef.current) {
          cancelAnimationFrame(animationRef.current);
          animationRef.current = null;
        }

        // Nach kurzer Pause wieder scannen (für nächste Person) (Memory Leak Fix: use tracked timeout)
        createTrackedTimeout(() => {
          // CRITICAL FIX #8: Check stream exists before setState (prevent state transition after cleanup)
          if (mountedRef.current && streamRef.current !== null) {
            lastScannedRef.current = null;
            cooldownRef.current = false;
            setState({ status: 'scanning' });
          }
        }, 1500);
      } catch (error) {
        const apiError = error as ResponseError;

        // Cancel animation frame before state transition
        if (animationRef.current) {
          cancelAnimationFrame(animationRef.current);
          animationRef.current = null;
        }

        if (isDuplicatePersonError(apiError)) {
          // Duplikat ist kein schwerer Fehler
          setState({ status: 'error', message: 'Person bereits registriert' });
          toast.warning('Person bereits registriert', {
            description: `${qrData.vorname} ${qrData.nachname} ist bereits in diesem Einsatz`,
          });
        } else {
          setState({ status: 'error', message: 'Registrierung fehlgeschlagen' });
          toast.error('Fehler bei Registrierung', {
            description: apiError.message || 'Unbekannter Fehler',
          });
        }

        // Nach Fehler wieder scannen (Memory Leak Fix: use tracked timeout)
        createTrackedTimeout(() => {
          // CRITICAL FIX #8: Check stream exists before setState (prevent state transition after cleanup)
          if (mountedRef.current && streamRef.current !== null) {
            lastScannedRef.current = null;
            cooldownRef.current = false;
            setState({ status: 'scanning' });
          }
        }, 2500);
      }
    },
    [createTrackedTimeout],
  ); // createTrackedTimeout ist stabil (keine Dependencies)

  /**
   * Scan-Loop für Browser: Liest Frames vom Video und sucht nach QR-Codes
   * Optimiert: Scannt nur alle ~100ms und skaliert auf max 640px für bessere Performance
   */
  const scanFrame = useCallback(() => {
    const video = videoRef.current;
    const canvas = canvasRef.current;

    if (!video || !canvas || video.readyState !== video.HAVE_ENOUGH_DATA) {
      animationRef.current = requestAnimationFrame(scanFrame);
      return;
    }

    const ctx = canvas.getContext('2d', { willReadFrequently: true });
    if (!ctx) {
      animationRef.current = requestAnimationFrame(scanFrame);
      return;
    }

    // Skaliere auf max 640px Breite für bessere jsQR Performance
    const maxWidth = 640;
    const scale = Math.min(1, maxWidth / video.videoWidth);
    const width = Math.floor(video.videoWidth * scale);
    const height = Math.floor(video.videoHeight * scale);

    // MEDIUM FIX (2): Only resize canvas when dimensions change to prevent layout reflow
    if (canvas.width !== width || canvas.height !== height) {
      canvas.width = width;
      canvas.height = height;
    }

    // Video-Frame auf Canvas zeichnen (skaliert)
    ctx.drawImage(video, 0, 0, width, height);

    // MEDIUM FIX (7): Safari 4K - Wrap jsQR in try-catch for large canvas
    try {
      const imageData = ctx.getImageData(0, 0, width, height);
      const code = jsQR(imageData.data, imageData.width, imageData.height, {
        inversionAttempts: 'attemptBoth',
      });

      if (code?.data) {
        console.log('[QR Scanner] Code erkannt:', sanitizeForLog(code.data));
        processQrCode(code.data);
      }
    } catch (err) {
      console.error('[QR Scanner] jsQR failed on large canvas:', err);
      // Continue scanning - don't break the loop
    }

    // Nächsten Frame nach kurzer Pause planen (~10 FPS statt 60 FPS)
    setTimeout(() => {
      animationRef.current = requestAnimationFrame(scanFrame);
    }, 100);
  }, [processQrCode]);

  /**
   * Startet den Tauri Native Scanner
   */
  const startTauriScanning = useCallback(async () => {
    setState({ status: 'requesting-permission' });

    try {
      const { scan, Format, checkPermissions, requestPermissions } = await import('@tauri-apps/plugin-barcode-scanner');

      // Permissions prüfen und anfordern
      let permissions = await checkPermissions();
      if (permissions.camera !== 'granted') {
        permissions = await requestPermissions();
        if (permissions.camera !== 'granted') {
          setState({
            status: 'permission-denied',
            error: 'Kamerazugriff wurde verweigert. Bitte erlauben Sie den Zugriff in den Einstellungen.',
          });
          return;
        }
      }

      setState({ status: 'scanning' });
      tauriScanActiveRef.current = true;

      // Kontinuierliches Scannen in Tauri
      const scanLoop = async () => {
        let retryCount = 0;
        const maxRetries = 3;

        while (tauriScanActiveRef.current) {
          try {
            const result = await scan({
              windowed: true,
              formats: [Format.QRCode],
            });

            if (result?.content) {
              await processQrCode(result.content);
            }
            retryCount = 0; // Reset on success
          } catch (err) {
            // User cancelled - exit cleanly
            if (!tauriScanActiveRef.current) {
              break;
            }

            retryCount++;
            console.error(`Tauri scan error (attempt ${retryCount}/${maxRetries}):`, err);

            if (retryCount >= maxRetries) {
              // Max retries reached - notify user and stop
              setState({
                status: 'error',
                message: 'Scanner-Fehler. Bitte neu starten.',
              });
              tauriScanActiveRef.current = false;
              break;
            }

            // Wait before retry (exponential backoff)
            await new Promise((resolve) => setTimeout(resolve, 1000 * retryCount));
          }
        }
      };

      await scanLoop();
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Scanner konnte nicht gestartet werden';
      setState({ status: 'permission-denied', error: errorMessage });
    }
  }, [processQrCode]);

  /**
   * Startet den Browser Scanner (navigator.mediaDevices + jsQR)
   */
  const startBrowserScanning = useCallback(async () => {
    // Prüfe ob Kamera-API verfügbar ist
    if (!navigator.mediaDevices?.getUserMedia) {
      setState({
        status: 'permission-denied',
        error: 'Kamera-Zugriff ist in dieser Umgebung nicht verfügbar.',
      });
      return;
    }

    setState({ status: 'requesting-permission' });

    try {
      // Kamera-Zugriff anfordern (bevorzugt Rückkamera für QR-Scans)
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: { ideal: 'environment' },
          width: { ideal: 1280 },
          height: { ideal: 720 },
        },
        audio: false,
      });

      // CRITICAL FIX (1): Check if unmounted during async getUserMedia
      if (!mountedRef.current) {
        // Cleanup stream immediately if unmounted
        for (const track of stream.getTracks()) {
          track.stop();
        }
        return;
      }

      streamRef.current = stream;

      if (videoRef.current) {
        const video = videoRef.current;
        video.srcObject = stream;

        // Warte bis Video bereit ist bevor play() aufgerufen wird
        await new Promise<void>((resolve, reject) => {
          video.onloadedmetadata = () => {
            video
              .play()
              .then(() => resolve())
              .catch((err) => {
                // AbortError ignorieren - tritt auf wenn Stream vor play() gewechselt wird
                if (err.name === 'AbortError') {
                  resolve();
                } else {
                  reject(err);
                }
              });
          };
          video.onerror = () => reject(new Error('Video konnte nicht geladen werden'));
        });
      }

      // CRITICAL FIX (1): Check again after async play()
      if (!mountedRef.current) {
        cleanupBrowser();
        return;
      }

      setState({ status: 'scanning' });

      // Scan-Loop starten
      animationRef.current = requestAnimationFrame(scanFrame);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Kamerazugriff verweigert';

      // Cleanup before setting error state
      cleanupBrowser();

      // Spezifische Fehlerbehandlung für Permission-Denied
      if (error instanceof DOMException) {
        if (error.name === 'NotAllowedError') {
          setState({
            status: 'permission-denied',
            error: 'Kamerazugriff wurde verweigert. Bitte erlauben Sie den Zugriff in den Browser-Einstellungen.',
          });
          return;
        }
        if (error.name === 'NotFoundError') {
          setState({
            status: 'permission-denied',
            error: 'Keine Kamera gefunden. Bitte schließen Sie eine Kamera an.',
          });
          return;
        }
        if (error.name === 'NotSupportedError') {
          setState({
            status: 'permission-denied',
            error: 'Kamera-Zugriff wird von diesem Browser nicht unterstützt. Bitte verwenden Sie Chrome oder Firefox.',
          });
          return;
        }
        // CRITICAL FIX (5): iOS Safari SecurityError für non-HTTPS
        if (error.name === 'SecurityError') {
          setState({
            status: 'permission-denied',
            error: 'Kamera-Zugriff benötigt eine sichere Verbindung (HTTPS). Bitte nutzen Sie HTTPS oder localhost.',
          });
          return;
        }
      }

      setState({ status: 'permission-denied', error: errorMessage });
    }
  }, [scanFrame, cleanupBrowser]);

  /**
   * Startet den Scanner im passenden Modus
   */
  const startScanning = useCallback(async () => {
    // Prüfe erst die Umgebung wenn noch nicht geschehen
    if (!environmentChecked) {
      const isMobile = await isTauriMobileEnvironment();
      setIsTauriMobile(isMobile);
      setEnvironmentChecked(true);

      // Starte im passenden Modus
      if (isMobile) {
        await startTauriScanning();
      } else {
        await startBrowserScanning();
      }
    } else {
      // Umgebung bereits bekannt
      if (isTauriMobile) {
        await startTauriScanning();
      } else {
        await startBrowserScanning();
      }
    }
  }, [environmentChecked, isTauriMobile, startTauriScanning, startBrowserScanning]);

  /**
   * Stoppt den Scanner
   */
  const stopScanning = useCallback(async () => {
    await cleanup();
    setState({ status: 'idle' });
    lastScannedRef.current = null;
    cooldownRef.current = false;
  }, [cleanup]);

  // Auto-Start beim Mount (nur einmal!) und Cleanup bei Unmount
  // biome-ignore lint/correctness/useExhaustiveDependencies: Absichtlich nur beim Mount ausführen - Refs für stabile Funktionen
  useEffect(() => {
    // Verhindere doppelten Start durch StrictMode
    if (mountedRef.current) {
      return;
    }
    mountedRef.current = true;

    startScanning();

    return () => {
      // CRITICAL FIX (3): Set mounted to false and cancel animation frame
      mountedRef.current = false;
      if (animationRef.current !== null) {
        cancelAnimationFrame(animationRef.current);
        animationRef.current = null;
      }
      cleanup();
    };
  }, []);

  // CRITICAL FIX #6: Stop camera when tab becomes inactive (memory leak prevention)
  useEffect(() => {
    if (!isActive && (state.status === 'scanning' || state.status === 'processing')) {
      stopScanning();
    }
  }, [isActive, state.status, stopScanning]);

  // KEYBOARD NAVIGATION: Escape to stop, Space to start
  // MEDIUM FIX (5): Use refs for handlers to prevent dependency accumulation
  const startScanningRef = useRef(startScanning);
  const stopScanningRef = useRef(stopScanning);
  startScanningRef.current = startScanning;
  stopScanningRef.current = stopScanning;

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      // Escape to stop scanner
      if (event.key === 'Escape' && (state.status === 'scanning' || state.status === 'processing')) {
        stopScanningRef.current();
      }
      // Space to start scanner when idle
      if (event.key === ' ' && state.status === 'idle') {
        event.preventDefault();
        startScanningRef.current();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [state.status]); // Only depends on status, not the functions

  return (
    <div className="flex flex-col items-center gap-4">
      {/* Status-Anzeige */}
      <StatusDisplay state={state} />

      {/* Video-Container (nur im Browser-Modus sichtbar) */}
      {!isTauriMobile && (
        <div
          className={cn(
            'relative aspect-square w-full max-w-sm overflow-hidden rounded-xl border-2',
            'bg-gray-900',
            state.status === 'scanning' && 'border-primary-500',
            state.status === 'processing' && 'border-amber-500',
            state.status === 'success' && 'border-green-500',
            state.status === 'error' && 'border-red-500',
            ['idle', 'requesting-permission', 'permission-denied'].includes(state.status) && 'border-gray-700',
          )}
        >
          {/* Video Element */}
          <video
            ref={videoRef}
            className={cn('h-full w-full object-cover', state.status !== 'scanning' && state.status !== 'processing' && 'hidden')}
            playsInline
            muted
            autoPlay
            title="QR-Code Scanner Kamera-Feed"
          />

          {/* Verstecktes Canvas für QR-Erkennung */}
          <canvas ref={canvasRef} className="hidden" />

          {/* Overlay für verschiedene Status */}
          {/* MEDIUM FIX #15: Keep output mounted for screen readers, toggle visibility via className */}
          <output className={cn('absolute inset-0 flex flex-col items-center justify-center gap-4 bg-gray-900/80', state.status !== 'idle' && 'hidden')} aria-live="polite">
            <PiQrCode className="h-16 w-16 text-gray-400" />
            <span className="text-gray-400 text-sm">Scanner bereit</span>
          </output>

          <output
            className={cn('absolute inset-0 flex flex-col items-center justify-center gap-4 bg-gray-900/80', state.status !== 'requesting-permission' && 'hidden')}
            aria-live="polite"
            aria-busy={state.status === 'requesting-permission'}
          >
            <InlineSpinner size="lg" />
            <span className="text-gray-300 text-sm">Kamerazugriff wird angefordert…</span>
          </output>

          <div
            className={cn('absolute inset-0 flex flex-col items-center justify-center gap-4 bg-gray-900/80 p-4 text-center', state.status !== 'permission-denied' && 'hidden')}
            role="alert"
            aria-live="assertive"
          >
            <PiCameraSlash className="h-16 w-16 text-red-400" />
            <span className="text-red-300 text-sm">{state.status === 'permission-denied' ? state.error : ''}</span>
          </div>

          {state.status === 'scanning' && (
            <>
              {/* Scan-Rahmen Overlay */}
              <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
                <div className="h-48 w-48 rounded-lg border-2 border-white/50">
                  {/* Ecken-Markierungen */}
                  <div className="absolute top-0 left-0 h-6 w-6 border-primary-400 border-t-4 border-l-4" />
                  <div className="absolute top-0 right-0 h-6 w-6 border-primary-400 border-t-4 border-r-4" />
                  <div className="absolute bottom-0 left-0 h-6 w-6 border-primary-400 border-b-4 border-l-4" />
                  <div className="absolute right-0 bottom-0 h-6 w-6 border-primary-400 border-r-4 border-b-4" />
                </div>
              </div>
              {/* Scan-Anweisung */}
              <output className="absolute right-0 bottom-4 left-0 text-center" aria-live="polite">
                <span className="rounded-lg bg-black/60 px-3 py-1.5 text-sm text-white">
                  QR-Code in den Rahmen halten
                  {/* MEDIUM FIX (3): Add keyboard hints */}
                  <span className="ml-2 text-xs opacity-75">(ESC zum Stoppen)</span>
                </span>
              </output>
            </>
          )}

          <output
            className={cn('absolute inset-0 flex flex-col items-center justify-center gap-3 bg-gray-900/80', state.status !== 'processing' && 'hidden')}
            aria-live="assertive"
            aria-busy={state.status === 'processing'}
          >
            <InlineSpinner size="lg" />
            <span className="text-amber-300 text-sm">{state.status === 'processing' ? `${state.data.vorname} ${state.data.nachname} wird registriert…` : ''}</span>
          </output>

          <output className={cn('absolute inset-0 flex flex-col items-center justify-center gap-3 bg-gray-900/80', state.status !== 'success' && 'hidden')} aria-live="assertive">
            <PiCheckCircle className="h-16 w-16 text-green-400" />
            <span className="text-green-300 text-sm">{state.status === 'success' ? `${state.personName} registriert!` : ''}</span>
          </output>

          <div className={cn('absolute inset-0 flex flex-col items-center justify-center gap-3 bg-gray-900/80', state.status !== 'error' && 'hidden')} role="alert" aria-live="assertive">
            <PiXCircle className="h-16 w-16 text-red-400" />
            <span className="text-red-300 text-sm">{state.status === 'error' ? state.message : ''}</span>
          </div>
        </div>
      )}

      {/* Tauri Mobile-Modus Status-Anzeige */}
      {isTauriMobile && (
        <div
          className={cn(
            'flex min-h-[200px] w-full max-w-sm flex-col items-center justify-center gap-4 rounded-xl border-2 bg-gray-900 p-6',
            state.status === 'scanning' && 'border-primary-500',
            state.status === 'processing' && 'border-amber-500',
            state.status === 'success' && 'border-green-500',
            state.status === 'error' && 'border-red-500',
            ['idle', 'requesting-permission', 'permission-denied'].includes(state.status) && 'border-gray-700',
          )}
        >
          {state.status === 'idle' && (
            <>
              <PiQrCode className="h-16 w-16 text-gray-400" />
              <span className="text-center text-gray-400 text-sm">Scanner bereit</span>
            </>
          )}

          {state.status === 'requesting-permission' && (
            <>
              <InlineSpinner size="lg" />
              <span className="text-center text-gray-300 text-sm">Kamera wird gestartet…</span>
            </>
          )}

          {state.status === 'permission-denied' && (
            <>
              <PiCameraSlash className="h-16 w-16 text-red-400" />
              <span className="text-center text-red-300 text-sm">{state.error}</span>
            </>
          )}

          {state.status === 'scanning' && (
            <>
              <PiCamera className="h-16 w-16 animate-pulse text-primary-400" />
              <span className="text-center text-primary-300 text-sm">Native Kamera aktiv - QR-Code scannen</span>
            </>
          )}

          {state.status === 'processing' && (
            <>
              <InlineSpinner size="lg" />
              <span className="text-center text-amber-300 text-sm">
                {state.data.vorname} {state.data.nachname} wird registriert…
              </span>
            </>
          )}

          {state.status === 'success' && (
            <>
              <PiCheckCircle className="h-16 w-16 text-green-400" />
              <span className="text-center text-green-300 text-sm">{state.personName} registriert!</span>
            </>
          )}

          {state.status === 'error' && (
            <>
              <PiXCircle className="h-16 w-16 text-red-400" />
              <span className="text-center text-red-300 text-sm">{state.message}</span>
            </>
          )}
        </div>
      )}

      {/* Aktions-Buttons */}
      <div className="flex gap-3">
        {state.status === 'permission-denied' && (
          <Button intent="primary" onClick={startScanning}>
            <PiCamera className="mr-2 h-5 w-5" />
            Erneut versuchen
          </Button>
        )}

        {(state.status === 'scanning' || state.status === 'processing') && (
          <Button intent="secondary" appearance="ghost" onClick={stopScanning} title="ESC drücken zum Stoppen">
            <PiCameraSlash className="mr-2 h-5 w-5" />
            Scanner stoppen
            {/* MEDIUM FIX (3): Show keyboard shortcut hint */}
            <span className="ml-2 text-xs opacity-60">(ESC)</span>
          </Button>
        )}

        {state.status === 'idle' && (
          <Button intent="primary" onClick={startScanning} title="Leertaste drücken zum Starten">
            <PiCamera className="mr-2 h-5 w-5" />
            Scanner starten
            {/* MEDIUM FIX (3): Show keyboard shortcut hint */}
            <span className="ml-2 text-xs opacity-60">(Leertaste)</span>
          </Button>
        )}
      </div>

      {/* Hinweis-Box */}
      <div className="w-full max-w-sm rounded-lg border border-blue-200 bg-blue-50 p-3 dark:border-blue-800 dark:bg-blue-900/20">
        <p className="text-blue-900 text-xs dark:text-blue-100">
          <strong>DRK QR-Format:</strong> Der Scanner erkennt DRK-Mitgliedsausweise automatisch. Nach dem Scannen wird die Person direkt registriert.
        </p>
      </div>
    </div>
  );
}

/**
 * Status-Anzeige Komponente
 * MEDIUM FIX #13: useMemo to prevent recreating statusConfig on every render
 */
const StatusDisplay = React.memo(({ state }: { state: ScannerState }) => {
  // MEDIUM FIX #13: Only depend on state.status (not entire state object) to prevent unnecessary re-renders
  const statusConfig = useMemo<Record<ScannerState['status'], { icon: React.ReactNode; text: string; color: string }>>(
    () => ({
      idle: {
        icon: <PiQrCode className="h-5 w-5" />,
        text: 'Scanner bereit',
        color: 'text-gray-500 dark:text-gray-400',
      },
      'requesting-permission': {
        icon: <InlineSpinner size="sm" />,
        text: 'Kamerazugriff wird angefordert…',
        color: 'text-amber-600 dark:text-amber-400',
      },
      'permission-denied': {
        icon: <PiCameraSlash className="h-5 w-5" />,
        text: 'Kamerazugriff verweigert',
        color: 'text-red-600 dark:text-red-400',
      },
      scanning: {
        icon: <PiCamera className="h-5 w-5 animate-pulse" />,
        text: 'Scanne nach QR-Code…',
        color: 'text-primary-600 dark:text-primary-400',
      },
      processing: {
        icon: <InlineSpinner size="sm" />,
        text: 'Registriere Person…',
        color: 'text-amber-600 dark:text-amber-400',
      },
      success: {
        icon: <PiCheckCircle className="h-5 w-5" />,
        text: 'Person registriert!',
        color: 'text-green-600 dark:text-green-400',
      },
      error: {
        icon: <PiWarningCircle className="h-5 w-5" />,
        text: 'error' in state ? state.message : 'Fehler',
        color: 'text-red-600 dark:text-red-400',
      },
    }),
    [state.status, state.message, state],
  );

  const config = statusConfig[state.status];

  return (
    <div className={cn('flex items-center gap-2 font-medium text-sm', config.color)} aria-live="polite" aria-atomic="true">
      {config.icon}
      <span>{config.text}</span>
    </div>
  );
});

/**
 * Mappt Parse-Fehlercodes zu benutzerfreundlichen Nachrichten
 */
function getParseErrorMessage(code: DrkQrParseErrorCode): string {
  const messages: Record<DrkQrParseErrorCode, string> = {
    [DrkQrParseErrorCode.EMPTY_INPUT]: 'QR-Code ist leer',
    [DrkQrParseErrorCode.INVALID_PROTOCOL]: 'Ungültiges QR-Code Format (kein DRK-Code)',
    [DrkQrParseErrorCode.INVALID_TYPE]: 'QR-Code ist kein Personen-Code',
    [DrkQrParseErrorCode.MISSING_REQUIRED_FIELD]: 'QR-Code unvollständig',
    [DrkQrParseErrorCode.EMPTY_FIELD_VALUE]: 'QR-Code enthält leere Felder',
    [DrkQrParseErrorCode.MALFORMED_URL]: 'QR-Code hat ungültiges Format',
  };

  return messages[code] || 'Unbekannter Fehler beim Lesen des QR-Codes';
}
