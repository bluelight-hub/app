/**
 * Query fuer das Abrufen der Custom Permissions eines Users.
 *
 * CQRS Read-Only Query - keine State-Aenderungen, keine Events.
 */
export class GetUserPermissionsQuery {
  constructor(
    /** User ID dessen Permissions abgerufen werden */
    public readonly userId: string,
  ) {}
}
