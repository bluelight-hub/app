/**
 * QR Scanner Tab Komponente (Story 4-2)
 *
 * Ermöglicht das Scannen von DRK QR-Codes zur schnellen Personenregistrierung.
 * Verwendet die Gerätekamera und jsqr für die QR-Code-Erkennung.
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

import { useRegistrierePersonViaQr, isDuplicatePersonError } from '@/features/einsatz/api';
import { parseDrkQrCode, isDrkQrCodeFormat, type DrkQrData, DrkQrParseErrorCode } from '@/features/einsatz/utils';
import { Button } from '@/shared/ui/atoms/button.atom';
import { InlineSpinner } from '@/shared/ui/atoms/spinner.atom';
import { cn } from '@/shared/ui/cn';
import type { ResponseError } from '@bluelight-hub/shared/client';
import jsQR from 'jsqr';
import { useCallback, useEffect, useRef, useState } from 'react';
import { PiCamera, PiCameraSlash, PiCheckCircle, PiQrCode, PiWarningCircle, PiXCircle } from 'react-icons/pi';
import { toast } from 'sonner';

interface QrScannerTabProps {
  einsatzId: string;
  onSuccess?: (personName: string) => void;
  onClose?: () => void;
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
 * QR Scanner Tab für Personenregistrierung
 *
 * Automatisierter Ablauf (AC4):
 * 1. Kamera-Zugriff anfordern
 * 2. Video-Feed anzeigen
 * 3. QR-Code automatisch erkennen
 * 4. DRK-Format validieren
 * 5. Person automatisch registrieren (ohne Button!)
 * 6. Erfolgs/Fehler-Feedback anzeigen
 *
 * Der Scanner bleibt nach erfolgreicher Registrierung aktiv für weitere Scans.
 */
export function QrScannerTab({ einsatzId, onSuccess }: QrScannerTabProps) {
  // Refs
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const animationRef = useRef<number | null>(null);
  const lastScannedRef = useRef<string | null>(null);
  const cooldownRef = useRef<boolean>(false);

  // State
  const [state, setState] = useState<ScannerState>({ status: 'idle' });

  // Mutation
  const registriereViaQr = useRegistrierePersonViaQr();

  /**
   * Stoppt alle aktiven Streams und Animationen
   */
  const cleanup = useCallback(() => {
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
   * Verarbeitet einen erkannten QR-Code
   */
  const processQrCode = useCallback(
    async (qrContent: string) => {
      // Debounce: Verhindere mehrfaches Scannen desselben Codes
      if (lastScannedRef.current === qrContent || cooldownRef.current) {
        return;
      }

      // Quick-Check: Ist es überhaupt ein DRK QR-Code?
      if (!isDrkQrCodeFormat(qrContent)) {
        // Ignoriere non-DRK QR-Codes still (kein Fehler anzeigen)
        return;
      }

      // Parse den QR-Code
      const parseResult = parseDrkQrCode(qrContent);

      if (!parseResult.success) {
        // Parsing-Fehler anzeigen
        const errorMessage = getParseErrorMessage(parseResult.error.code);
        setState({ status: 'error', message: errorMessage });

        // Cooldown um Spam zu vermeiden
        cooldownRef.current = true;
        setTimeout(() => {
          cooldownRef.current = false;
          setState({ status: 'scanning' });
        }, 2000);

        return;
      }

      // Erfolgreiches Parsing - merken und registrieren
      lastScannedRef.current = qrContent;
      const qrData = parseResult.data;

      setState({ status: 'processing', data: qrData });

      try {
        // AC4: Automatische Registrierung ohne Bestätigungs-Button!
        const result = await registriereViaQr.mutateAsync({
          einsatzId,
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

        onSuccess?.(personName);

        // Nach kurzer Pause wieder scannen (für nächste Person)
        setTimeout(() => {
          lastScannedRef.current = null;
          setState({ status: 'scanning' });
        }, 1500);
      } catch (error) {
        const apiError = error as ResponseError;

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

        // Nach Fehler wieder scannen
        setTimeout(() => {
          lastScannedRef.current = null;
          cooldownRef.current = false;
          setState({ status: 'scanning' });
        }, 2500);
      }
    },
    [einsatzId, registriereViaQr, onSuccess],
  );

  /**
   * Scan-Loop: Liest Frames vom Video und sucht nach QR-Codes
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

    // Canvas auf Video-Größe setzen
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;

    // Video-Frame auf Canvas zeichnen
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

    // QR-Code suchen
    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const code = jsQR(imageData.data, imageData.width, imageData.height, {
      inversionAttempts: 'dontInvert',
    });

    if (code?.data) {
      processQrCode(code.data);
    }

    // Nächsten Frame planen
    animationRef.current = requestAnimationFrame(scanFrame);
  }, [processQrCode]);

  /**
   * Startet die Kamera und den Scan-Loop
   */
  const startScanning = useCallback(async () => {
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

      streamRef.current = stream;

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }

      setState({ status: 'scanning' });

      // Scan-Loop starten
      animationRef.current = requestAnimationFrame(scanFrame);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Kamerazugriff verweigert';

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
      }

      setState({ status: 'permission-denied', error: errorMessage });
    }
  }, [scanFrame]);

  /**
   * Stoppt den Scanner
   */
  const stopScanning = useCallback(() => {
    cleanup();
    setState({ status: 'idle' });
    lastScannedRef.current = null;
    cooldownRef.current = false;
  }, [cleanup]);

  // Cleanup bei Unmount
  useEffect(() => {
    return () => {
      cleanup();
    };
  }, [cleanup]);

  // Auto-Start beim Mount wenn der Tab aktiv ist
  useEffect(() => {
    startScanning();
    return () => {
      cleanup();
    };
  }, [startScanning, cleanup]);

  return (
    <div className="flex flex-col items-center gap-4">
      {/* Status-Anzeige */}
      <StatusDisplay state={state} />

      {/* Video-Container */}
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
        <video ref={videoRef} className={cn('h-full w-full object-cover', state.status !== 'scanning' && state.status !== 'processing' && 'hidden')} playsInline muted autoPlay />

        {/* Verstecktes Canvas für QR-Erkennung */}
        <canvas ref={canvasRef} className="hidden" />

        {/* Overlay für verschiedene Status */}
        {state.status === 'idle' && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 bg-gray-900/80">
            <PiQrCode className="h-16 w-16 text-gray-400" />
            <span className="text-gray-400 text-sm">Scanner bereit</span>
          </div>
        )}

        {state.status === 'requesting-permission' && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 bg-gray-900/80">
            <InlineSpinner size="lg" />
            <span className="text-gray-300 text-sm">Kamerazugriff wird angefordert…</span>
          </div>
        )}

        {state.status === 'permission-denied' && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 bg-gray-900/80 p-4 text-center">
            <PiCameraSlash className="h-16 w-16 text-red-400" />
            <span className="text-red-300 text-sm">{state.error}</span>
          </div>
        )}

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
            <div className="absolute right-0 bottom-4 left-0 text-center">
              <span className="rounded-lg bg-black/60 px-3 py-1.5 text-sm text-white">QR-Code in den Rahmen halten</span>
            </div>
          </>
        )}

        {state.status === 'processing' && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-gray-900/80">
            <InlineSpinner size="lg" />
            <span className="text-amber-300 text-sm">
              {state.data.vorname} {state.data.nachname} wird registriert…
            </span>
          </div>
        )}

        {state.status === 'success' && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-gray-900/80">
            <PiCheckCircle className="h-16 w-16 text-green-400" />
            <span className="text-green-300 text-sm">{state.personName} registriert!</span>
          </div>
        )}

        {state.status === 'error' && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-gray-900/80">
            <PiXCircle className="h-16 w-16 text-red-400" />
            <span className="text-red-300 text-sm">{state.message}</span>
          </div>
        )}
      </div>

      {/* Aktions-Buttons */}
      <div className="flex gap-3">
        {state.status === 'permission-denied' && (
          <Button intent="primary" onClick={startScanning}>
            <PiCamera className="mr-2 h-5 w-5" />
            Erneut versuchen
          </Button>
        )}

        {(state.status === 'scanning' || state.status === 'processing') && (
          <Button intent="secondary" appearance="ghost" onClick={stopScanning}>
            <PiCameraSlash className="mr-2 h-5 w-5" />
            Scanner stoppen
          </Button>
        )}

        {state.status === 'idle' && (
          <Button intent="primary" onClick={startScanning}>
            <PiCamera className="mr-2 h-5 w-5" />
            Scanner starten
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
 */
function StatusDisplay({ state }: { state: ScannerState }) {
  const statusConfig: Record<ScannerState['status'], { icon: React.ReactNode; text: string; color: string }> = {
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
  };

  const config = statusConfig[state.status];

  return (
    <div className={cn('flex items-center gap-2 font-medium text-sm', config.color)}>
      {config.icon}
      <span>{config.text}</span>
    </div>
  );
}

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
