export class GetVorfallAuditTimelineQuery {
  constructor(
    public readonly einsatzId: string,
    public readonly vorfallId: string,
  ) {}
}
