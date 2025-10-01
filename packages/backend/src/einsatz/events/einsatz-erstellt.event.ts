/**
 * Domain-Event: Wird emittiert, wenn ein neuer Einsatz erstellt wurde
 *
 * Dieses Event ermöglicht lose Kopplung zwischen Modulen.
 * Andere Module (z.B. ETB) können auf dieses Event reagieren,
 * ohne dass eine direkte Abhängigkeit zum EinsatzModule besteht.
 */
export class EinsatzErstelltEvent {
  constructor(
    public readonly einsatzId: string,
    public readonly userId: string,
    public readonly timestamp: Date = new Date(),
  ) {}
}
