/**
 * Typen von System-Warnungen fuer das Monitoring.
 *
 * @remarks Story 5.6 AC3
 */
export enum WarnungTyp {
  ZUSTELLRATE = 'ZUSTELLRATE',
  OUTBOX_STAU = 'OUTBOX_STAU',
  LATENZ = 'LATENZ',
  CIRCUIT_BREAKER = 'CIRCUIT_BREAKER',
}
