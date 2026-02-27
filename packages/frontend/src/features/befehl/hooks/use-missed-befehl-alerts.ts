/**
 * useMissedBefehlAlerts Hook
 *
 * Prüft beim Laden der Befehle-Daten ob es ungesehene kritische
 * Quittierungen (RUECKFRAGE / NICHT_VERSTANDEN) oder Korrekturen gibt,
 * bei denen der aktuelle User betroffen ist.
 *
 * Zeigt persistente Alarm-Toasts (mit Sound) für verpasste Events,
 * z.B. wenn der User offline war als die Quittierung/Korrektur einging.
 *
 * "Gesehen"-Tracking via localStorage.
 */

import { useCurrentUser } from '@/features/auth/api';
import { soundService } from '@/features/reminders/services/sound.service';
import type { BefehlDto } from '@bluelight-hub/shared/client';
import { useEffect, useRef } from 'react';
import { showKorrekturAlarmToast, showQuittierungAlarmToast } from '../ui/atoms/BefehlAlarmToast.atom';
import { useBefehleByEinsatz } from '../api/use-befehle-by-einsatz';

const STORAGE_KEY = 'befehl-alerts-seen';
const MAX_SEEN_ENTRIES = 200;

/** Lädt gesehene Keys aus localStorage */
function loadSeenKeys(): Set<string> {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return new Set();
    return new Set(JSON.parse(raw) as string[]);
  } catch {
    return new Set();
  }
}

/** Speichert gesehene Keys in localStorage (begrenzt auf MAX_SEEN_ENTRIES) */
function saveSeenKeys(keys: Set<string>): void {
  try {
    const entries = [...keys];
    const trimmed = entries.length > MAX_SEEN_ENTRIES ? entries.slice(entries.length - MAX_SEEN_ENTRIES) : entries;
    localStorage.setItem(STORAGE_KEY, JSON.stringify(trimmed));
  } catch {
    // localStorage-Fehler ignorieren
  }
}

interface CriticalQuittierung {
  befehlId: string;
  einsatzId: string;
  nummer: string;
  quittierungArt: 'RUECKFRAGE' | 'NICHT_VERSTANDEN';
  quittiertAm: string;
  key: string;
}

/**
 * Scannt Befehle nach ungesehenen kritischen Quittierungen.
 */
function findUnseenCriticalQuittierungen(befehle: BefehlDto[], userId: string, seenKeys: Set<string>): CriticalQuittierung[] {
  const unseen: CriticalQuittierung[] = [];

  for (const befehl of befehle) {
    const isBefehlsgeber = befehl.befehlsgeberId === userId || befehl.erstellerId === userId;
    if (!isBefehlsgeber) continue;

    for (const empfaenger of befehl.empfaenger) {
      if (!empfaenger.quittiertAm || !empfaenger.quittierungArt) continue;
      if (empfaenger.quittierungArt !== 'RUECKFRAGE' && empfaenger.quittierungArt !== 'NICHT_VERSTANDEN') continue;
      if (empfaenger.empfaengerId === userId) continue;

      const quittiertAmStr = empfaenger.quittiertAm instanceof Date ? empfaenger.quittiertAm.toISOString() : String(empfaenger.quittiertAm);

      const key = `quittierung:${befehl.id}:${empfaenger.id}:${quittiertAmStr}`;
      if (seenKeys.has(key)) continue;

      unseen.push({
        befehlId: befehl.id,
        einsatzId: befehl.einsatzId,
        nummer: befehl.nummer,
        quittierungArt: empfaenger.quittierungArt as 'RUECKFRAGE' | 'NICHT_VERSTANDEN',
        quittiertAm: quittiertAmStr,
        key,
      });
    }
  }

  return unseen;
}

interface UnseenKorrektur {
  befehlId: string;
  einsatzId: string;
  nummer: string;
  key: string;
}

/**
 * Scannt Befehle nach ungesehenen Korrekturen, bei denen der User Empfaenger ist.
 */
function findUnseenKorrekturen(befehle: BefehlDto[], userId: string, seenKeys: Set<string>): UnseenKorrektur[] {
  const unseen: UnseenKorrektur[] = [];

  for (const befehl of befehle) {
    if (befehl.status !== 'KORRIGIERT') continue;

    const isEmpfaenger = befehl.empfaenger.some((e) => e.empfaengerId === userId);
    if (!isEmpfaenger) continue;

    const key = `korrektur:${befehl.id}`;
    if (seenKeys.has(key)) continue;

    unseen.push({
      befehlId: befehl.id,
      einsatzId: befehl.einsatzId,
      nummer: befehl.nummer,
      key,
    });
  }

  return unseen;
}

/**
 * Markiert einen Alert als gesehen (fuer WebSocket Live-Events).
 * Verhindert Doppel-Toasts bei Page-Reload nach Live-Empfang.
 */
export function markAlertSeen(key: string): void {
  const seenKeys = loadSeenKeys();
  seenKeys.add(key);
  saveSeenKeys(seenKeys);
}

/**
 * Prüft beim Laden der Befehle ob es ungesehene kritische Quittierungen
 * oder Korrekturen gibt und zeigt persistente Alarm-Toasts.
 */
export function useMissedBefehlAlerts(einsatzId: string) {
  const { user } = useCurrentUser();
  const userId = user?.id;
  const { data: befehle } = useBefehleByEinsatz(einsatzId);
  const hasCheckedRef = useRef<string | null>(null);

  useEffect(() => {
    if (!befehle?.length || !userId) return;

    const dataFingerprint = `${befehle.length}:${befehle[0]?.updatedAt}`;
    if (hasCheckedRef.current === dataFingerprint) return;
    hasCheckedRef.current = dataFingerprint;

    const seenKeys = loadSeenKeys();
    const unseenQuittierungen = findUnseenCriticalQuittierungen(befehle, userId, seenKeys);
    const unseenKorrekturen = findUnseenKorrekturen(befehle, userId, seenKeys);

    const hasUnseen = unseenQuittierungen.length > 0 || unseenKorrekturen.length > 0;
    if (!hasUnseen) return;

    // Sound nur einmal abspielen (nicht pro Toast)
    const soundType = unseenQuittierungen.length > 0 ? 'warning' : 'info';
    soundService.playAlarm(soundType as 'warning' | 'info').catch(() => {
      /* non-critical */
    });

    for (const item of unseenQuittierungen) {
      showQuittierungAlarmToast(item.befehlId, item.einsatzId, item.nummer, item.quittierungArt, item.quittiertAm);
      seenKeys.add(item.key);
    }

    for (const item of unseenKorrekturen) {
      showKorrekturAlarmToast(item.befehlId, item.einsatzId, item.nummer, new Date().toISOString());
      seenKeys.add(item.key);
    }

    saveSeenKeys(seenKeys);
  }, [befehle, userId]);
}
