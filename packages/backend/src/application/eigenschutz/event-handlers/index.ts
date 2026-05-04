/**
 * Barrel-Export der Eigenschutz-Application-Event-Handler.
 *
 * Diese Handler sind feature-spezifische Bridges zu Plattform-Diensten
 * (Push-Notifications, externe Telemetrie etc.). Sie hängen sich via
 * `@OnEvent` an Domain-Events und arbeiten Best-Effort (kein Reject-Pfad,
 * vgl. Story 3.8 AC6).
 */
export { EmitCriticalPushOnPsaProfilGeaendertHandler } from './emit-critical-push-on-psa-profil-geaendert.handler';
