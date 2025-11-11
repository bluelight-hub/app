# Security Notes

## No-Delete Policy (Einsätze)
- Einsätze werden NIEMALS physisch gelöscht
- Verwende Status `ARCHIVIERT` für "gelöschte" Einsätze
- Gesetzliche Aufbewahrungspflichten (mind. 10 Jahre)
- Audit-Trail und Nachvollziehbarkeit
- Siehe: `docs/architecture/08-concepts.adoc#no-delete-policy-für-einsätze`

## Cookie Security
- HTTP-Only Cookies (XSS-Schutz)
- Secure Flag in Production (HTTPS)
- SameSite: Strict (CSRF-Schutz)

## File Upload Security
- MIME-Type Validierung
- Filename Sanitization (Path Traversal Prevention)
- File Size Limits (10MB für Screenshots)

## Rate Limiting
- Controller-Level und Service-Level Throttling
- Schutz vor API-Missbrauch und DDoS

---
