/**
 * Erinnerung Card
 *
 * Zeigt eine einzelne Erinnerung mit Status-Badge, Countdown und Aktionen.
 *
 * **Story 1.3 AC1/AC3:**
 * - Bearbeiten-Button nur bei Status GEPLANT sichtbar
 * - Tooltip wenn nicht editierbar
 *
 * **Story 1.4 AC1/AC2:**
 * - Loeschen-Button bei Status GEPLANT oder AUSGELOEST
 * - Loeschen oeffnet Bestaetigungs-Dialog
 *
 * **Story 1.6 AC1:**
 * - Acknowledge-Button bei Status GEPLANT, AUSGELOEST oder ESKALIERT
 * - 1-Tap Bestaetigung ruft API auf
 * - Optimistic Update fuer schnelles Feedback
 *
 * **Story 1.7 (Visuell):**
 * - AlarmStateBadge mit Status-Farben und Icons
 * - CountdownDisplay mit dynamischen Updates
 * - Progressive Card-Border-Farben basierend auf Urgency
 *
 * **Story 1.8 AC1:**
 * - Offline-Badge fuer offline erstellte Erinnerungen (temp_ ID)
 *
 * **Story 2.1 AC1/AC2 (Snooze):**
 * - Snooze-Buttons mit Presets (1, 5, 10 Min) bei Status AUSGELOEST
 * - Escape-Taste aktiviert Standard-Snooze (5 Min)
 * - Audio wird bei Snooze gestoppt
 * - Optimistic Update fuer Status → SNOOZED
 *
 * **Story 2.2 AC2 (Re-Trigger Badge):**
 * - Bei snoozeCount > 0 und Status AUSGELOEST: Badge "X. Auslösung"
 * - Zeigt dem User optisch, dass es ein Re-Trigger nach Snooze ist
 *
 * **Story 2.3 (Alarm-Intensivierung):**
 * - Bei intensityLevel !== 'none': Schnelleres Pulsieren (AlarmStateBadge)
 * - Bei intensityLevel !== 'none': Intensivere Border-Animation (border-glow)
 * - Intensification Timer wird bei Acknowledge/Snooze gestoppt
 *
 * **UX-Verbesserungen (Keyboard Support):**
 * - Bei AUSGELOEST Status: Gesamte Card mit Enter bestaetigbar
 * - Escape-Taste: 5 Min Snooze (Standard)
 * - Card bekommt tabIndex={0} fuer Keyboard-Navigation
 * - Visueller Fokus-Indikator (grüner Ring) bei Fokus
 * - Hinweistext "Enter: Bestätigen · Esc: 5 Min Snooze" bei Fokus
 * - Accessibility: role="button" und aria-label fuer Screen Reader
 *
 * **Story 3.2 AC2 (Status-Aenderungsanimation):**
 * - Update-Animation: Kurzer Highlight bei Status-Wechsel via WebSocket
 * - Insert-Animation: Slide-in bei neuer Erinnerung via WebSocket
 */

import { KategorieChip } from '@/features/kategorien';
import { ItemTypeBadge } from '@/features/notizen';
import type { ErinnerungResponseDto } from '@/shared';

import { Button } from '@/shared/ui/atoms/button.atom';
import { cn } from '@/shared/ui/cn';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { PiCheckCircle, PiCheckSquareOffset, PiClockCounterClockwise, PiCloudSlash, PiNotepad, PiPencil, PiRepeat, PiStopCircle, PiTimer, PiTrash, PiUserPlus, PiWarning } from 'react-icons/pi';
import { type SnoozeMinutes, useAcknowledgeErinnerung, useSnoozeErinnerung } from '../../api';
import { useCountdown } from '../../hooks/use-countdown';
import { useErinnerungKonfiguration } from '../../hooks/use-erinnerung-konfiguration';
import { intensificationService, soundService, timerService } from '../../services';
import { syncService } from '../../services/sync.service';
import {
  openDeleteDialog,
  openEditDialog,
  openMarkErledigtDialog,
  openStopRecurringDialog,
  setHighlightedEntry,
  useAnimationEntry,
  useAudioFailed,
  useIntensityLevel,
  useIsHighlighted,
} from '../../stores';
import { markAsSeen, useIsUnseen } from '../../stores/seen-assignments.store';
import { ErinnerungEtbLink, NewBadge } from '../atoms';
import { AlarmStateBadge } from '../atoms/AlarmStateBadge';
import { AvatarInitials } from '../atoms/AvatarInitials';
import { CountdownDisplay } from '../atoms/CountdownDisplay';
import { ErinnerungAssignDialog } from '../organisms/ErinnerungAssignDialog';
import { ErinnerungHistoryDialog } from '../organisms/ErinnerungHistoryDialog';
import { SnoozeButtonGroup } from './SnoozeButtonGroup'; // Helper für relative Zeit (TODO: In shared/utils verschieben wenn öfter benötigt)

// Helper für relative Zeit (TODO: In shared/utils verschieben wenn öfter benötigt)
const calculateRelativeTime = (dateStr: string) => {
  const diff = Date.now() - new Date(dateStr).getTime();
  const minutes = Math.floor(diff / 60000);
  if (minutes < 1) return 'gerade eben';
  if (minutes < 60) return `vor ${minutes}m`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `vor ${hours}h`;
  return 'vor >24h';
};

/**
 * Hook zur Erkennung der Benutzer-Praeferenz fuer reduzierte Bewegung.
 *
 * Story 3.2 AC2 Accessibility: Bei `prefers-reduced-motion: reduce` werden
 * Animationen durch subtile statische Effekte ersetzt.
 *
 * @returns true wenn der Benutzer reduzierte Bewegung bevorzugt
 */
const usePrefersReducedMotion = (): boolean => {
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(() => {
    // SSR-safe: Pruefe ob window verfuegbar ist
    if (typeof window === 'undefined') return false;
    return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  });

  useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    setPrefersReducedMotion(mediaQuery.matches);

    const handler = (e: MediaQueryListEvent) => setPrefersReducedMotion(e.matches);
    mediaQuery.addEventListener('change', handler);
    return () => mediaQuery.removeEventListener('change', handler);
  }, []);

  return prefersReducedMotion;
};

/**
 * Display-Variante fuer verschiedene Kontexte.
 * - 'full': Alle Details und Actions sichtbar (Standard, fuer rote Swimlane)
 * - 'compact': Titel + Status + Zeit, Actions bei Hover (fuer gelbe Swimlane)
 * - 'minimal': Einzeilig, nur Status-Dot + Titel + Zeit (fuer gruene/graue Swimlane)
 */
export type ErinnerungCardVariant = 'full' | 'compact' | 'minimal';

/** Akzent-Farbe fuer den linken Border im Priority Board Stil (Option C) */
export type ErinnerungCardAccentColor = 'red' | 'amber' | 'green' | 'blue' | 'gray';

/** Border-Klassen pro Akzent-Farbe */
const ACCENT_BORDER: Record<ErinnerungCardAccentColor, string> = {
  red: 'border-red-500',
  amber: 'border-amber-400',
  green: 'border-green-300 dark:border-green-700',
  blue: 'border-blue-400 dark:border-blue-600',
  gray: 'border-gray-300 dark:border-gray-700',
};

/** Hintergrund-Klassen pro Akzent-Farbe (full/compact) */
const ACCENT_BG: Record<ErinnerungCardAccentColor, string> = {
  red: 'bg-red-50/95 dark:bg-red-950/30',
  amber: 'bg-amber-50/95 dark:bg-amber-950/30',
  green: 'bg-green-50/95 dark:bg-green-950/30',
  blue: 'bg-blue-50/95 dark:bg-blue-950/30',
  gray: 'dark:bg-gray-800/70',
};

/** Hover-Hintergrund pro Akzent-Farbe (minimal) */
const ACCENT_HOVER_BG: Record<ErinnerungCardAccentColor, string> = {
  red: 'hover:bg-red-50 dark:hover:bg-red-950/30',
  amber: 'hover:bg-amber-50 dark:hover:bg-amber-950/30',
  green: 'hover:bg-green-50/50 dark:hover:bg-green-950/20',
  blue: 'hover:bg-blue-50/50 dark:hover:bg-blue-950/20',
  gray: 'hover:bg-gray-50/50 dark:hover:bg-gray-800/50',
};

/** Uhrzeit-Farbe pro Akzent-Farbe */
const ACCENT_TIME: Record<ErinnerungCardAccentColor, string> = {
  red: 'text-red-600 dark:text-red-400',
  amber: 'text-amber-600 dark:text-amber-400',
  green: 'text-green-600 dark:text-green-400',
  blue: 'text-blue-600 dark:text-blue-400',
  gray: 'text-gray-400 dark:text-gray-600',
};

/** Accent-Farben mit ausgefuellten Aktions-Buttons (sofort handeln + unter Kontrolle) */
const FILLED_BUTTON_ACCENTS = new Set<ErinnerungCardAccentColor>(['red', 'green']);

interface ErinnerungCardProps {
  /** Die anzuzeigende Erinnerung */
  erinnerung: ErinnerungResponseDto;
  /** Die Einsatz-ID (fuer den Edit Dialog) */
  einsatzId: string;
  /** Zusaetzliche CSS-Klassen */
  className?: string;
  /**
   * Story 3.1 AC3/AC4: Ersteller-Namen anzeigen (fuer Team-Ansicht)
   * @default false
   */
  showCreator?: boolean;
  /**
   * Story 3.1 AC5/AC8: Aktuelle User-ID fuer "eigene vs fremde" Unterscheidung
   * Wenn angegeben, werden fremde Erinnerungen mit "Team"-Badge markiert
   */
  currentUserId?: string;
  /**
   * Display-Variante fuer verschiedene Kontexte.
   * - 'full': Alle Details und Actions sichtbar (Standard, fuer rote Swimlane)
   * - 'compact': Titel + Status + Zeit, Actions bei Hover (fuer gelbe Swimlane)
   * - 'minimal': Einzeilig, nur Status-Dot + Titel + Zeit (fuer gruene/graue Swimlane)
   * @default 'full'
   */
  variant?: ErinnerungCardVariant;
  /**
   * Akzent-Farbe fuer Priority Board Stil (border-l-4).
   * Wenn gesetzt, wird der Card-Stil auf den Prototyp-Look umgestellt.
   */
  accentColor?: ErinnerungCardAccentColor;
}

/**
 * Karte fuer eine einzelne Erinnerung mit Status-Badge, Countdown und Bearbeiten-Button.
 *
 * **Story 1.3 AC1:** Bearbeiten-Button oeffnet Edit Dialog
 * **Story 1.3 AC3:** Nur GEPLANT Status ist editierbar
 * **Story 1.7:** Visuelle Status-Anzeige mit AlarmStateBadge und CountdownDisplay
 */
export function ErinnerungCard({ erinnerung, einsatzId, className, showCreator = false, currentUserId, variant: variantProp, accentColor }: ErinnerungCardProps) {
  const variant = variantProp ?? 'full';
  // Story 1.7: Countdown Hook für dynamische Updates und Urgency Level
  const { urgencyLevel, remaining } = useCountdown(erinnerung.faelligAm);

  // Berechne minutesUntilDue für AlarmStateBadge progressive Farben
  const minutesUntilDue = useMemo(() => {
    return Math.max(0, Math.floor(remaining / 60000));
  }, [remaining]);

  // Story 2.3: Intensivierungs-Level aus Store
  const intensityLevel = useIntensityLevel(erinnerung.id);

  // Story 2.8: Audio-Ausfall Flag aus Store
  const audioFailed = useAudioFailed(erinnerung.id);

  // Story 3.2 AC2: Animation bei WebSocket-Updates
  const animationEntry = useAnimationEntry(erinnerung.id);

  // Story 5.4 Task 6.2: Highlight für Scroll-to-Erinnerung aus ETB Badge
  const isHighlighted = useIsHighlighted(erinnerung.id);
  const cardRef = useRef<HTMLDivElement>(null);

  // Story 5.4 Task 6.2: Bei Highlight scrollIntoView aufrufen
  useEffect(() => {
    if (isHighlighted && cardRef.current) {
      cardRef.current.scrollIntoView({ behavior: 'smooth', block: 'center' });
      // Optional: Fokus setzen fuer Accessibility
      // Nur fokussieren wenn kein Input-Element aktiv ist (verhindert Formular-Unterbrechung)
      if (document.activeElement?.tagName !== 'INPUT' && document.activeElement?.tagName !== 'TEXTAREA') {
        cardRef.current.focus({ preventScroll: true });
      }
    }
  }, [isHighlighted]);

  // Story 3.2 AC2 Accessibility: Reduced-Motion Praeferenz des Benutzers
  const prefersReducedMotion = usePrefersReducedMotion();

  // Story 1.6: Acknowledge Mutation Hook
  const acknowledgeErinnerung = useAcknowledgeErinnerung();

  // Story 2.1: Snooze Mutation Hook
  const snoozeErinnerung = useSnoozeErinnerung();

  // Story 4.7: Escalation Timeout Config & Countdown
  const { config: erinnerungConfig } = useErinnerungKonfiguration();

  const escalationDeadline = useMemo(() => {
    if (erinnerung.status === 'AUSGELOEST' && erinnerung.ausgeloestAm) {
      // Story 4.3: Konfiguration nutzen, Fallback auf 300s (5 Min) Server-Default
      const timeoutSeconds = erinnerungConfig?.eskalationsTimeoutSeconds ?? 300;

      const triggered = new Date(erinnerung.ausgeloestAm as unknown as string).getTime();
      return new Date(triggered + timeoutSeconds * 1000).toISOString();
    }
    return undefined;
  }, [erinnerung.status, erinnerung.ausgeloestAm, erinnerungConfig]);

  // Nutzen wir useCountdown auch für Escalation Deadline (wenn gesetzt)
  const { remaining: msUntilEscalation } = useCountdown(escalationDeadline || '');

  // Warnung anzeigen wenn < 60s bis Eskalation ODER bereits überfällig (da Backend evtl. verzögert)
  const isEscalationImminent = !!escalationDeadline && msUntilEscalation < 60000;

  const isEditable = erinnerung.status === 'GEPLANT';
  const isTriggered = erinnerung.status === 'AUSGELOEST';
  const isEskaliert = erinnerung.status === 'ESKALIERT';
  const isAcknowledged = erinnerung.status === 'ACKNOWLEDGED';
  const isErledigt = erinnerung.status === 'ERLEDIGT';
  // Story 1.4 AC1: Nur GEPLANT oder AUSGELOEST Status loeschbar
  const isDeletable = erinnerung.status === 'GEPLANT' || erinnerung.status === 'AUSGELOEST';
  // Story 1.5 Task 14.4: GEPLANT, AUSGELOEST oder ESKALIERT Status kann bestätigt werden
  const isAcknowledgeable = erinnerung.status === 'GEPLANT' || erinnerung.status === 'AUSGELOEST' || erinnerung.status === 'ESKALIERT';
  // Story 2.1 AC1: Nur AUSGELOEST Status kann gesnoozed werden
  const isSnoozeable = erinnerung.status === 'AUSGELOEST';
  // Story 2.5 AC1: Nur ACKNOWLEDGED oder ESKALIERT Status kann erledigt werden
  const isMarkErledigtable = erinnerung.status === 'ACKNOWLEDGED' || erinnerung.status === 'ESKALIERT';
  // Story 1.8 AC1: Offline erstellte Erinnerung (temp_ ID)
  const isOfflineCreated = syncService.isTempId(erinnerung.id);
  // Story 2.2 AC2: Re-Trigger Badge anzeigen wenn snoozeCount > 0 und AUSGELOEST
  const isRetrigger = isTriggered && (erinnerung.snoozeCount ?? 0) > 0;
  const retriggerNumber = (erinnerung.snoozeCount ?? 0) + 1; // 1. Auslösung = 0 Snoozes + 1
  // Story 3.4 AC1: Nur aktive Erinnerungen (nicht ERLEDIGT/ESKALIERT) können zugewiesen werden
  // Story 4.2: Delegation nur erlaubt wenn mir zugewiesen oder noch niemandem zugewiesen
  // Generator Issue: assignedToId is typed as object | null, but it is string | null
  const assignedToId = erinnerung.assignedToId as unknown as string | null;
  const isAssignedToMe = currentUserId && assignedToId === currentUserId;
  const isUnassigned = !assignedToId;

  const hasAssignableStatus = ['GEPLANT', 'AUSGELOEST', 'SNOOZED'].includes(erinnerung.status);
  const isAssignable = hasAssignableStatus && (isUnassigned || isAssignedToMe);

  const assignActionLabel = isAssignedToMe ? 'Weiterdelegieren' : 'Zuweisen';

  // Story 3.4: State fuer Zuweisungs-Dialog
  const [isAssignDialogOpen, setIsAssignDialogOpen] = useState(false);
  // Story 4.5: State fuer History-Dialog
  const [isHistoryDialogOpen, setIsHistoryDialogOpen] = useState(false);

  // Story 3.1 AC5/AC8: Eigene vs. fremde Erinnerung erkennen
  // Eine Erinnerung ist "meine" wenn ich sie erstellt habe ODER mir zugewiesen wurde
  const isOwnReminder = currentUserId ? erinnerung.erstelltVon === currentUserId || assignedToId === currentUserId : true;
  const isTeamReminder = currentUserId && !isOwnReminder;

  // Story 3.7 AC3: "Neu" Badge Logik
  // Zeige "Neu" wenn:
  // 1. Mir zugewiesen (assignedTo === me) - bereits durch AC abgedeckt, da store nur meine Zuweisungen trackt?
  //    Nein, store trackt IDs. Wir müssen prüfen ob es AKTUELL mir zugewiesen ist.
  // 2. ID ist im seen-store (als unseen)
  // 3. Ich habe es NICHT selbst zugewiesen (updater !== me) - das ist schwer zu prüfen ohne extra props.
  //    Aber: Wenn ich es selbst zuweise, sollte ich es beim Erstellen/Update gleich als "seen" markieren?
  //    Vereinfachung: Store Logic `markAsSeen` sollte bei aktiven Actions aufgerufen werden.
  const isUnseen = useIsUnseen(erinnerung.id);
  const shouldShowNewBadge = isUnseen && erinnerung.assignedToId === currentUserId;

  // Story 3.7 AC4: "Neu" Markierung entfernen
  const handleMarkAsSeen = useCallback(() => {
    if (shouldShowNewBadge) {
      markAsSeen(erinnerung.id);
    }
  }, [shouldShowNewBadge, erinnerung.id]);

  const handleEdit = useCallback(() => {
    handleMarkAsSeen();
    if (isEditable) {
      openEditDialog(erinnerung, einsatzId);
    }
  }, [erinnerung, einsatzId, isEditable, handleMarkAsSeen]);

  // Story 1.4 AC2: Loeschen oeffnet Bestaetigungs-Dialog
  const handleDelete = useCallback(() => {
    if (isDeletable) {
      openDeleteDialog(erinnerung, einsatzId);
    }
  }, [erinnerung, einsatzId, isDeletable]);

  // Story 2.5: Als Erledigt markieren oeffnet Dialog
  const handleMarkErledigt = useCallback(() => {
    if (isMarkErledigtable) {
      openMarkErledigtDialog(erinnerung, einsatzId);
    }
  }, [erinnerung, einsatzId, isMarkErledigtable]);

  // Story 3.4: Zuweisungs-Dialog oeffnen
  const handleOpenAssignDialog = useCallback(() => {
    if (isAssignable) {
      setIsAssignDialogOpen(true);
    }
  }, [isAssignable]);

  // Story 1.6 AC1: Acknowledge-Handler mit API Call
  // Story 2.3 AC4: Intensification Timer wird bei Acknowledge gestoppt
  const handleAcknowledge = useCallback(() => {
    if (isAcknowledgeable && !acknowledgeErinnerung.isPending) {
      // Story 2.3 AC4: Intensification Timer stoppen
      intensificationService.stopTimer(erinnerung.id);

      acknowledgeErinnerung.mutate({
        einsatzId,
        erinnerungId: erinnerung.id,
      });
    }
  }, [isAcknowledgeable, acknowledgeErinnerung, einsatzId, erinnerung.id]);

  /**
   * Story 2.1 AC1/AC2: Snooze-Handler mit Audio-Stop und Timer-Reset
   * Story 2.3 AC4: Intensification Timer wird bei Snooze gestoppt
   *
   * Stoppt Audio, resettet Timer-Trigger-State, dann snoozed die Erinnerung fuer die gewaehlte Dauer.
   * Status wechselt zu SNOOZED, neue faelligAm wird berechnet.
   */
  const handleSnooze = useCallback(
    (minutes: SnoozeMinutes) => {
      if (isSnoozeable && !snoozeErinnerung.isPending) {
        // Story 2.1 AC2: Audio bei Snooze stoppen
        // TODO(Story 2.x): Ersetze durch erinnerungs-spezifisches stopAlarm(id) wenn Sound Service erweitert wird
        soundService.stopAllSounds();

        // F3 Fix: Timer-Trigger-State zuruecksetzen um erneutes Triggern nach Snooze zu ermoeglichen
        timerService.resetTriggered(erinnerung.id);

        // Story 2.3 AC4: Intensification Timer stoppen
        intensificationService.stopTimer(erinnerung.id);

        snoozeErinnerung.mutate({
          einsatzId,
          erinnerungId: erinnerung.id,
          snoozeMinutes: minutes,
        });
      }
    },
    [isSnoozeable, snoozeErinnerung, einsatzId, erinnerung.id],
  );

  // H2 Fix: Enter-Key Support für AC1 Requirement + Story 2.1 AC1: Escape-Key für 5 Min Snooze
  const _handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      // Enter: Acknowledge
      if (e.key === 'Enter' && isAcknowledgeable && !acknowledgeErinnerung.isPending) {
        e.preventDefault();
        handleAcknowledge();
      }
      // Story 2.1 AC1: Escape aktiviert Standard-Snooze (5 Min)
      if (e.key === 'Escape' && isSnoozeable && !snoozeErinnerung.isPending) {
        e.preventDefault();
        handleSnooze(5);
      }
    },
    [isAcknowledgeable, acknowledgeErinnerung.isPending, handleAcknowledge, isSnoozeable, snoozeErinnerung.isPending, handleSnooze],
  );

  // Story 3.7 AC4: Markiere als gesehen beim Klicken/Fokussieren der Karte?
  // "When ich sie öffne / Details ansehe".
  // Wir nutzen handleCardClick (unten) dafür, erweitern es aber.

  // Focus-State für visuellen Indikator tracken
  const [isFocused, setIsFocused] = useState(false);

  // Story 1.7 AC5: Card-Border-Farben basierend auf Status und Urgency Level
  // Story 2.3 AC2: Intensivierte Border-Animation bei Nicht-Reaktion
  // Story 2.8 AC2: Intensivere Farben bei Audio-Ausfall
  const getBorderClasses = () => {
    // AUSGELOEST: Roter Border mit Animation
    if (isTriggered || isEskaliert) {
      // Story 4.7: Drohende Eskalation -> Dringendste Warnstufe
      if (isEscalationImminent) {
        return 'border-red-600 dark:border-red-500 ring-4 ring-red-500 dark:ring-red-600 animate-pulse bg-red-100 dark:bg-red-900/40';
      }
      // Story 2.8 AC2: Bei Audio-Ausfall intensivere visuelle Darstellung
      if (audioFailed) {
        return 'border-red-600 dark:border-red-500 ring-4 ring-red-400 dark:ring-red-700 animate-border-glow-urgent';
      }
      // Story 2.3 AC2: Bei Intensivierung animate-border-glow hinzufuegen
      if (intensityLevel !== 'none') {
        return 'border-red-500 dark:border-red-400 ring-2 ring-red-300 dark:ring-red-800 animate-border-glow';
      }
      return 'border-red-500 dark:border-red-400 ring-2 ring-red-200 dark:ring-red-900/50';
    }
    // ACKNOWLEDGED/ERLEDIGT: Gedämpfte Farben
    if (isAcknowledged || isErledigt) {
      return 'border-gray-200 dark:border-gray-700 opacity-75';
    }
    // GEPLANT: Progressive Border basierend auf Urgency
    if (erinnerung.status === 'GEPLANT') {
      switch (urgencyLevel) {
        case 'urgent':
          return 'border-orange-400 dark:border-orange-500';
        case 'warning':
          return 'border-yellow-300 dark:border-yellow-500';
        case 'critical':
          return 'border-red-500 dark:border-red-400';
        default:
          return 'border-gray-200 dark:border-gray-700';
      }
    }
    return 'border-gray-200 dark:border-gray-700';
  };

  // Story 3.2 AC2: Animation-Classes basierend auf Animation-Typ
  // Accessibility: Bei prefers-reduced-motion subtile statische Effekte statt Animationen
  const getAnimationClasses = () => {
    if (!animationEntry) return '';

    // Bei prefers-reduced-motion: Subtile statische Effekte statt Animationen
    // Dies erfuellt AC2 "subtile Animation" - bei reduced-motion als statischer visueller Hinweis
    if (prefersReducedMotion) {
      switch (animationEntry.type) {
        case 'update':
          // Statischer blauer Ring als Highlight (ohne Animation)
          return 'ring-2 ring-blue-400 ring-opacity-50';
        case 'insert':
          // Statischer gruener Ring fuer neue Items (ohne Slide-Animation)
          return 'ring-2 ring-green-400 ring-opacity-50';
        default:
          return '';
      }
    }

    // Normale Animationen wenn reduced-motion nicht aktiv
    switch (animationEntry.type) {
      case 'update':
        // Highlight-Effekt bei Update (kurzer Glow/Pulse)
        return 'animate-highlight ring-2 ring-blue-400 ring-opacity-75';
      case 'insert':
        // Slide-in Animation für neue Items
        return 'animate-slide-in-right';
      default:
        return '';
    }
  };

  // Effekt-Klassen fuer triggered/eskaliert im Accent-Modus (ohne Border, nur Ring/Glow)
  const getEffectClasses = () => {
    if (isTriggered || isEskaliert) {
      if (isEscalationImminent) return 'ring-4 ring-red-500 dark:ring-red-600 animate-pulse';
      if (audioFailed) return 'ring-4 ring-red-400 dark:ring-red-700 animate-border-glow-urgent';
      if (intensityLevel !== 'none') return 'ring-2 ring-red-300 dark:ring-red-800 animate-border-glow';
    }
    if (isAcknowledged || isErledigt) return 'opacity-75';
    return '';
  };

  // Gemeinsame CSS-Klassen fuer Card-Container (variant-abhaengig)
  // Bei accentColor: Priority Board Stil (border-l-4 Akzent)
  // Ohne accentColor: Standard-Stil (rounded-lg border shadow-sm) fuer Rueckwaertskompatibilitaet
  const cardBaseClasses = cn(
    variant === 'minimal'
      ? accentColor
        ? cn('border-l-4 rounded-r px-3 py-2 transition-colors', ACCENT_BORDER[accentColor], ACCENT_HOVER_BG[accentColor])
        : 'border-b border-gray-100 bg-white py-2 px-3 dark:border-gray-800 dark:bg-gray-800'
      : accentColor
        ? cn(
            'border-l-4 rounded-r-lg transition-all',
            variant === 'compact' ? 'px-4 py-3' : 'p-4',
            ACCENT_BORDER[accentColor],
            ACCENT_BG[accentColor],
            getEffectClasses(),
            getAnimationClasses(),
            isHighlighted && 'ring-4 ring-amber-400 ring-opacity-75 animate-pulse',
          )
        : cn(
            'rounded-lg border bg-white shadow-sm transition-all dark:bg-gray-800',
            variant === 'compact' ? 'p-3' : 'p-4',
            getBorderClasses(),
            (isTriggered || isEskaliert) && 'bg-red-50 dark:bg-red-900/20',
            getAnimationClasses(),
            isHighlighted && 'ring-4 ring-amber-400 ring-opacity-75 animate-pulse',
          ),
    className,
  );

  // Uhrzeit fuer compact/minimal
  const timeString = new Date(erinnerung.faelligAm).toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' });

  // Status-Dot Farbe fuer minimal Variante
  const getStatusDotColor = () => {
    if (isTriggered || isEskaliert) return 'bg-red-500 animate-pulse';
    if (erinnerung.status === 'SNOOZED') return 'bg-orange-400';
    if (isAcknowledged) return 'bg-emerald-500';
    if (isErledigt) return 'bg-gray-300 dark:bg-gray-600';
    // GEPLANT: Orange wenn bald faellig
    if (urgencyLevel === 'warning' || urgencyLevel === 'urgent' || urgencyLevel === 'critical') return 'bg-orange-400';
    return 'bg-gray-400';
  };

  // Status-spezifische Text-Klassen fuer minimal Variante
  const getMinimalTextClasses = () => {
    if (isTriggered || isEskaliert) return 'font-medium text-red-700 dark:text-red-400';
    if (erinnerung.status === 'SNOOZED') return 'italic text-orange-600 dark:text-orange-400';
    if (isErledigt) return 'line-through text-gray-500 dark:text-gray-400';
    return 'text-gray-900 dark:text-white';
  };

  // Story 3.4: Zuweisungs-Dialog (wird immer gerendert, sichtbar nur wenn isAssignDialogOpen)
  const assignDialog = <ErinnerungAssignDialog isOpen={isAssignDialogOpen} onClose={() => setIsAssignDialogOpen(false)} erinnerung={erinnerung} einsatzId={einsatzId} />;

  // History-Dialog (wird in allen Varianten benoetigt)
  const historyDialog = <ErinnerungHistoryDialog isOpen={isHistoryDialogOpen} onClose={() => setIsHistoryDialogOpen(false)} erinnerung={erinnerung} einsatzId={einsatzId} />;

  /**
   * Click-Handler fuer den Card-Container.
   * Markiert die Erinnerung als gesehen (Story 3.7 AC4).
   * Acknowledge erfolgt NUR ueber die expliziten Action-Buttons.
   */
  const handleCardClick = useCallback(() => {
    handleMarkAsSeen();
  }, [handleMarkAsSeen]);

  // ═══════════════════════════════════════════════════════════════════
  // MINIMAL Variante: Einzeilige Darstellung mit Status-Dot
  // ═══════════════════════════════════════════════════════════════════
  if (variant === 'minimal') {
    return (
      <>
        {/* biome-ignore lint/a11y/useSemanticElements: div mit role="group" ist hier korrekt, da Container interaktive Elemente enthaelt */}
        {/* biome-ignore lint/a11y/useKeyWithClickEvents: Keyboard-Navigation via interaktive Kindelemente */}
        <div ref={cardRef} role="group" onClick={handleCardClick} aria-label={`Erinnerung "${erinnerung.titel}"`} className={cn(cardBaseClasses, 'group relative focus:outline-none')}>
          <div className="flex items-center gap-2">
            {/* Status-Dot */}
            <span className={cn('h-2 w-2 flex-shrink-0 rounded-full', getStatusDotColor())} aria-hidden="true" />

            {/* Snoozed: Kleines Uhr-Icon */}
            {erinnerung.status === 'SNOOZED' && <PiTimer className="h-3 w-3 flex-shrink-0 text-orange-500 dark:text-orange-400" aria-hidden="true" />}

            {/* Titel mit Status-spezifischem Styling */}
            <span className={cn('min-w-0 truncate text-sm', getMinimalTextClasses())}>{erinnerung.titel}</span>

            {/* Uhrzeit (wird bei Hover durch Actions ersetzt) */}
            <span className={cn('ml-auto whitespace-nowrap text-xs group-hover:hidden', accentColor ? cn('font-mono font-semibold', ACCENT_TIME[accentColor]) : 'text-gray-400')}>{timeString}</span>

            {/* Hover-Actions (ersetzen die Uhrzeit visuell) */}
            <div className="ml-auto hidden flex-shrink-0 items-center gap-0.5 group-hover:flex">
              {isAcknowledgeable && (
                <Button
                  appearance="ghost"
                  size="sm"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleAcknowledge();
                  }}
                  aria-label="Bestätigen"
                  title="Bestätigen"
                  className="h-6 w-6 cursor-pointer p-0 text-green-600 hover:bg-green-50 dark:text-green-400 dark:hover:bg-green-900/20"
                >
                  <PiCheckCircle className="pointer-events-none h-3.5 w-3.5" />
                </Button>
              )}
              {isMarkErledigtable && (
                <Button
                  appearance="ghost"
                  size="sm"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleMarkErledigt();
                  }}
                  aria-label="Erledigt"
                  title="Erledigt"
                  className="h-6 w-6 cursor-pointer p-0 text-green-600 hover:bg-green-50 dark:text-green-400 dark:hover:bg-green-900/20"
                >
                  <PiCheckSquareOffset className="pointer-events-none h-3.5 w-3.5" />
                </Button>
              )}
              {isSnoozeable && (
                <Button
                  appearance="ghost"
                  size="sm"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleSnooze(5);
                  }}
                  aria-label="5 Min Snooze"
                  title="5 Min Snooze"
                  className="h-6 w-6 cursor-pointer p-0 text-amber-600 hover:bg-amber-50 dark:text-amber-400 dark:hover:bg-amber-900/20"
                >
                  <PiTimer className="pointer-events-none h-3.5 w-3.5" />
                </Button>
              )}
              <Button
                appearance="ghost"
                size="sm"
                onClick={(e) => {
                  e.stopPropagation();
                  setIsHistoryDialogOpen(true);
                }}
                aria-label="Verlauf anzeigen"
                title="Verlauf anzeigen"
                className="h-6 w-6 cursor-pointer p-0 text-gray-500 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-700"
              >
                <PiClockCounterClockwise className="pointer-events-none h-3.5 w-3.5" />
              </Button>
            </div>
          </div>
        </div>
        {assignDialog}
        {historyDialog}
      </>
    );
  }

  // ═══════════════════════════════════════════════════════════════════
  // COMPACT und FULL Varianten: Gemeinsamer cardContent mit bedingtem Ausblenden
  // ═══════════════════════════════════════════════════════════════════

  // Card-Inhalt als JSX (wird in beiden Varianten wiederverwendet)
  const cardContent = (
    <div className={cn('flex flex-col', variant === 'compact' ? 'gap-2' : 'gap-3')}>
      <div className="flex items-start justify-between gap-3">
        {/* Status-Badge und Inhalt */}
        <div className="flex items-start gap-3">
          {/* Story 1.7 AC1/AC6: AlarmStateBadge statt inline Icon */}
          {/* biome-ignore lint/suspicious/noExplicitAny: DTO type mismatch */}
          <AlarmStateBadge status={erinnerung.status as any} minutesUntilDue={minutesUntilDue} size={variant === 'compact' ? 'sm' : 'md'} intensityLevel={intensityLevel} audioFailed={audioFailed} />

          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <h4 className="font-medium text-gray-900 text-sm dark:text-white">{erinnerung.titel}</h4>
              {/* Compact: Uhrzeit rechtsbuendig in Zeile 1 */}
              {variant === 'compact' && <span className={cn('ml-auto whitespace-nowrap font-mono font-semibold text-xs', accentColor ? ACCENT_TIME[accentColor] : 'text-gray-400')}>{timeString}</span>}
              {/* Story 7.5 AC3: Typ-Badge (nur full) */}
              {variant === 'full' && <ItemTypeBadge type="erinnerung" />}
              {/* Story 8.2: Kategorie-Badge mit Runtime Type Check */}
              {typeof erinnerung.kategorieName === 'string' && typeof erinnerung.kategorieFarbe === 'string' && <KategorieChip name={erinnerung.kategorieName} farbe={erinnerung.kategorieFarbe} />}
              {/* Story 3.7 AC3: Neu Badge */}
              {shouldShowNewBadge && <NewBadge />}
              {/* Folgende Badges nur in full Variante */}
              {variant === 'full' && (
                <>
                  {/* Story 6.4 + 6.5: Wiederkehrend-Badge */}
                  {(erinnerung.isRecurring || erinnerung.parentErinnerungId) && (
                    <span
                      className="inline-flex items-center text-amber-500 dark:text-amber-400"
                      title={
                        erinnerung.isRecurring
                          ? `Wiederkehrend alle ${erinnerung.recurringIntervalMinutes} Min`
                          : `Instanz ${(erinnerung.recurringSequenceNumber as unknown as number) ?? '?'}/${(erinnerung.recurringMaxCount as unknown as number) ?? '\u221E'}`
                      }
                    >
                      <PiRepeat className="h-4 w-4" aria-hidden="true" />
                    </span>
                  )}
                  {/* Story 6.5 AC3: Serie gestoppt Badge */}
                  {!erinnerung.isRecurring && !erinnerung.parentErinnerungId && (erinnerung.recurringCurrentCount as unknown as number) > 0 && erinnerung.recurringIntervalMinutes && (
                    <output
                      aria-label="Serie gestoppt"
                      className="inline-flex items-center gap-1 rounded-full bg-gray-100 px-1.5 py-0.5 font-medium text-gray-600 text-xs dark:bg-gray-700 dark:text-gray-300"
                      title={`Serie gestoppt (${erinnerung.recurringCurrentCount as unknown as number} Instanzen erstellt)`}
                    >
                      <PiStopCircle className="h-3 w-3" aria-hidden="true" />
                      Serie gestoppt
                    </output>
                  )}
                  {/* Story 1.8 AC1: Offline-Badge */}
                  {isOfflineCreated && (
                    <output
                      aria-label="Offline erstellt"
                      className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-1.5 py-0.5 font-medium text-amber-700 text-xs dark:bg-amber-900/40 dark:text-amber-300"
                      title="Offline erstellt"
                    >
                      <PiCloudSlash className="h-3 w-3" aria-hidden="true" />
                      Offline
                    </output>
                  )}
                  {/* Story 2.2 AC2: Re-Trigger Badge */}
                  {isRetrigger && (
                    <output
                      aria-label={`${retriggerNumber}. Auslösung`}
                      className="inline-flex items-center gap-1 rounded-full bg-red-100 px-1.5 py-0.5 font-medium text-red-700 text-xs dark:bg-red-900/40 dark:text-red-300"
                      title={`${retriggerNumber}. Auslösung`}
                    >
                      {retriggerNumber}. Auslösung
                    </output>
                  )}
                  {/* Story 2.6: Pflicht-Notiz */}
                  {erinnerung.requiresNote && (
                    <output
                      aria-label="Pflicht-Notiz"
                      className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-1.5 py-0.5 font-medium text-amber-700 text-xs dark:bg-amber-900/40 dark:text-amber-300"
                      title="Notiz erforderlich"
                    >
                      <PiNotepad className="h-3 w-3" aria-hidden="true" />
                      Pflicht
                    </output>
                  )}
                  {/* Story 3.1 AC8: Team-Badge */}
                  {isTeamReminder && (
                    <output
                      aria-label="Team-Erinnerung"
                      className="inline-flex items-center gap-1 rounded-full bg-blue-100 px-1.5 py-0.5 font-medium text-blue-700 text-xs dark:bg-blue-900/40 dark:text-blue-300"
                    >
                      Team
                    </output>
                  )}
                  {/* Story 4.1: Eskalationsperson */}
                  {erinnerung.eskalationsPersonName && (
                    <output
                      aria-label={`Eskalation an: ${erinnerung.eskalationsPersonName}`}
                      className="inline-flex items-center gap-1 rounded-full bg-red-50 px-1.5 py-0.5 font-medium text-red-700 text-xs dark:bg-red-900/40 dark:text-red-300"
                      title={`Im Eskalationsfall benachrichtigt: ${erinnerung.eskalationsPersonName}`}
                    >
                      <PiWarning className="h-3 w-3" aria-hidden="true" />
                      {erinnerung.eskalationsPersonName}
                    </output>
                  )}
                  {/* Story 4.10: Ruecklaufer Badge */}
                  {(erinnerung as unknown as { eskalationNurAnErsteller?: boolean })?.eskalationNurAnErsteller && (
                    <output
                      aria-label="Rückläufer aktiv - Eskalation geht an Ersteller"
                      className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-1.5 py-0.5 font-medium text-amber-700 text-xs dark:bg-amber-900/40 dark:text-amber-300"
                      title="Eskalation geht automatisch an den Ersteller zurück (Rückläufer)"
                    >
                      ↩️ Rückläufer
                    </output>
                  )}
                  {/* Story 4.5: Eskaliert von Info */}
                  {erinnerung.previousAssigneeName && (
                    <output
                      aria-label={`Eskaliert von: ${erinnerung.previousAssigneeName}`}
                      className="inline-flex items-center gap-1 rounded-full bg-red-100 px-1.5 py-0.5 font-medium text-red-700 text-xs dark:bg-red-900/40 dark:text-red-300"
                      title={`Eskaliert von ${erinnerung.previousAssigneeName} am ${erinnerung.escalatedAt ? new Date(erinnerung.escalatedAt as unknown as string).toLocaleTimeString() : ''}`}
                    >
                      <PiWarning className="h-3 w-3" aria-hidden="true" />
                      Von {erinnerung.previousAssigneeName}
                      {erinnerung.escalatedAt && <span className="opacity-75"> ({calculateRelativeTime(erinnerung.escalatedAt as unknown as string)})</span>}
                    </output>
                  )}
                </>
              )}
            </div>
            {/* Beschreibung: nur in full */}
            {variant === 'full' && erinnerung.beschreibung && <p className="mt-0.5 text-gray-500 text-xs dark:text-gray-400">{erinnerung.beschreibung as unknown as string}</p>}

            {/* ETB-Link: nur in full */}
            {variant === 'full' && erinnerung.etbEntryId && (
              <div className="mt-1">
                <ErinnerungEtbLink
                  etbEntryId={erinnerung.etbEntryId}
                  onClick={() => {
                    setHighlightedEntry(erinnerung.etbEntryId as string);
                  }}
                />
              </div>
            )}

            {/* Ersteller-Info: nur in full */}
            {variant === 'full' && (showCreator || isTeamReminder || (assignedToId && assignedToId === currentUserId)) && erinnerung.erstellerName && (
              <div className="mt-0.5 flex items-center gap-1.5">
                <AvatarInitials name={erinnerung.erstellerName as unknown as string} size="sm" />
                <p className="text-gray-400 text-xs dark:text-gray-500">
                  <span className="text-gray-500 dark:text-gray-400">{assignedToId === currentUserId ? 'Erstellt von' : 'von'}</span> {erinnerung.erstellerName as unknown as string}
                </p>
              </div>
            )}

            {/* CountdownDisplay und Uhrzeit: nur in full */}
            {variant === 'full' && (
              <div className="mt-1 flex items-center gap-2">
                {erinnerung.status === 'GEPLANT' && <CountdownDisplay faelligAm={erinnerung.faelligAm} className="text-sm" />}

                {/* Story 4.7: Escalation Countdown */}
                {isEscalationImminent && (
                  <span className="flex animate-pulse items-center gap-1 font-bold text-red-600 text-xs dark:text-red-400">
                    <PiWarning className="h-3 w-3" />
                    {msUntilEscalation > 0 ? `Eskaliert in ${Math.ceil(msUntilEscalation / 1000)}s` : 'Eskalation wird ausgeführt...'}
                  </span>
                )}

                <span className="text-gray-400 text-xs">{timeString}</span>
              </div>
            )}
          </div>
        </div>

        {/* Administrative Aktionen */}
        {/* Compact: Versteckt, nur bei Hover sichtbar (group + group-hover Pattern) */}
        {/* Full: Immer sichtbar */}
        <div className={cn('flex flex-shrink-0 gap-1', variant === 'compact' && 'opacity-0 transition-opacity group-hover:opacity-100')}>
          {isEditable && (
            <Button appearance="ghost" size="sm" onClick={handleEdit} aria-label="Erinnerung bearbeiten" title="Erinnerung bearbeiten" className="h-10 w-10 p-0">
              <PiPencil className="h-5 w-5" />
            </Button>
          )}

          {isAssignable && (
            <Button
              appearance="ghost"
              size="sm"
              onClick={handleOpenAssignDialog}
              aria-label={`Erinnerung ${assignActionLabel}`}
              title={`Erinnerung ${assignActionLabel}`}
              className="h-10 w-10 p-0 text-blue-600 hover:bg-blue-50 dark:text-blue-400 dark:hover:bg-blue-900/20"
            >
              <PiUserPlus className="h-5 w-5" />
            </Button>
          )}

          {isDeletable && (
            <Button
              appearance="ghost"
              size="sm"
              onClick={handleDelete}
              aria-label="Erinnerung löschen"
              title="Erinnerung löschen"
              className="h-10 w-10 p-0 text-red-600 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-900/20"
            >
              <PiTrash className="h-5 w-5" />
            </Button>
          )}

          {/* Story 6.5 AC1/AC4: Serie beenden Button */}
          {erinnerung.isRecurring && !erinnerung.parentErinnerungId && (
            <Button
              appearance="ghost"
              size="sm"
              onClick={(e) => {
                e.stopPropagation();
                openStopRecurringDialog(erinnerung, einsatzId);
              }}
              aria-label="Serie beenden"
              title="Wiederkehrende Serie beenden"
              className="h-10 w-10 p-0 text-amber-600 hover:bg-amber-50 dark:text-amber-400 dark:hover:bg-amber-900/20"
            >
              <PiStopCircle className="h-5 w-5" />
            </Button>
          )}

          {/* Story 4.5 AC2: Verlauf anzeigen */}
          <Button
            appearance="ghost"
            size="sm"
            onClick={(e) => {
              e.stopPropagation();
              setIsHistoryDialogOpen(true);
            }}
            aria-label="Verlauf anzeigen"
            title="Verlauf anzeigen"
            className="h-10 w-10 p-0 text-gray-500 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-700"
          >
            <PiClockCounterClockwise className="h-5 w-5" />
          </Button>
        </div>
      </div>

      {/* Primaere Aktionen fuer AUSGELOEST oder ACKNOWLEDGED */}
      {(isAcknowledgeable || isMarkErledigtable || isSnoozeable) && (
        <div className={cn('flex flex-wrap items-center gap-2 border-t pt-2', isTriggered ? 'border-red-200 dark:border-red-800' : 'border-gray-100 dark:border-gray-700')}>
          {/* Acknowledge Button - filled in rot/gruen Zone, outline in anderen */}
          {isAcknowledgeable &&
            (accentColor && FILLED_BUTTON_ACCENTS.has(accentColor) ? (
              <Button
                appearance="filled"
                size="sm"
                onClick={handleAcknowledge}
                disabled={acknowledgeErinnerung.isPending}
                className={cn(
                  'justify-center gap-2',
                  variant === 'compact'
                    ? cn('h-8 min-w-[80px]', isTriggered ? 'bg-red-600 hover:bg-red-700' : 'bg-green-600 hover:bg-green-700')
                    : cn('h-10 min-w-[120px] flex-1', isTriggered ? 'bg-red-600 hover:bg-red-700' : 'bg-green-600 hover:bg-green-700'),
                )}
              >
                <PiCheckCircle className={cn(variant === 'compact' ? 'h-4 w-4' : 'h-5 w-5', acknowledgeErinnerung.isPending && 'animate-pulse')} />
                <span>Bestätigen</span>
              </Button>
            ) : (
              <Button
                appearance="outline"
                size="sm"
                onClick={handleAcknowledge}
                disabled={acknowledgeErinnerung.isPending}
                className={cn(
                  'justify-center gap-2 border-green-500 text-green-700 hover:bg-green-50 dark:border-green-600 dark:text-green-400 dark:hover:bg-green-950/30',
                  variant === 'compact' ? 'h-8 min-w-[80px]' : 'h-10 min-w-[120px] flex-1',
                )}
              >
                <PiCheckCircle className={cn(variant === 'compact' ? 'h-4 w-4' : 'h-5 w-5', acknowledgeErinnerung.isPending && 'animate-pulse')} />
                <span>Bestätigen</span>
              </Button>
            ))}

          {/* Erledigt Markieren Button - filled gruen in rot/gruen Zone, outline in anderen */}
          {isMarkErledigtable &&
            (accentColor && FILLED_BUTTON_ACCENTS.has(accentColor) ? (
              <Button
                appearance="filled"
                size="sm"
                onClick={handleMarkErledigt}
                className={cn('justify-center gap-2 bg-green-600 text-white hover:bg-green-700', variant === 'compact' ? 'h-8 min-w-[80px]' : 'h-10 flex-1')}
              >
                <PiCheckSquareOffset className={variant === 'compact' ? 'h-4 w-4' : 'h-5 w-5'} />
                <span>Erledigt</span>
              </Button>
            ) : (
              <Button
                appearance="outline"
                size="sm"
                onClick={handleMarkErledigt}
                className={cn(
                  'justify-center gap-2 border-green-500 text-green-700 hover:bg-green-50 dark:border-green-600 dark:text-green-400 dark:hover:bg-green-950/30',
                  variant === 'compact' ? 'h-8 min-w-[80px]' : 'h-10 flex-1',
                )}
              >
                <PiCheckSquareOffset className={variant === 'compact' ? 'h-4 w-4' : 'h-5 w-5'} />
                <span>Erledigt</span>
              </Button>
            ))}

          {/* Snooze Buttons (Nur bei AUSGELOEST) */}
          {isSnoozeable && <SnoozeButtonGroup onSnooze={handleSnooze} disabled={snoozeErinnerung.isPending} className="flex-shrink-0" variant={isTriggered ? 'default' : 'default'} />}

          {/* Keyboard Hint: nur in full */}
          {variant === 'full' && isFocused && isAcknowledgeable && (
            <span className="mt-1 w-full animate-pulse text-center font-medium text-red-600 text-xs dark:text-red-400">Enter: Bestätigen · Esc: 5 Min Snooze</span>
          )}
        </div>
      )}
    </div>
  );

  // Render: Card-Container mit group-Klasse fuer Hover-Sichtbarkeit der Actions
  // Acknowledge erfolgt NUR ueber explizite Buttons, nicht per Card-Klick.
  return (
    <>
      {/* biome-ignore lint/a11y/useSemanticElements: div mit role="group" ist hier korrekt, da Container interaktive Elemente enthaelt */}
      {/* biome-ignore lint/a11y/useKeyWithClickEvents: Keyboard-Navigation via interaktive Kindelemente */}
      <div
        ref={cardRef}
        role="group"
        tabIndex={isHighlighted ? 0 : undefined}
        onFocus={() => setIsFocused(true)}
        onBlur={() => setIsFocused(false)}
        onClick={handleCardClick}
        aria-label={`Erinnerung "${erinnerung.titel}"`}
        className={cn(cardBaseClasses, 'group w-full text-left focus:outline-none')}
      >
        {cardContent}
      </div>
      {assignDialog}
      {historyDialog}
    </>
  );
}
