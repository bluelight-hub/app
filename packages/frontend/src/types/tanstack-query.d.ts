/**
 * Type-Augmentation für `@tanstack/react-query` — erweitert das globale
 * `Register`-Interface um eigene Metadaten-Felder für Queries und Mutations.
 *
 * Ohne diese Augmentation wäre `meta.silentError` ein untypisiertes `unknown`-
 * Feld — ein Tippfehler (`silenErr`, `silentErrors`) fiele silent durch und
 * der globale Sonner-Toast erschiene trotz intendierter Zero-Toast-Policy
 * (UX-DR21). Die Augmentation macht das Feld zum kompilierpflichtigen
 * Contract zwischen Hook-Konfiguration und zentralem Error-Handler in
 * `query-client.provider.tsx`.
 */
import '@tanstack/react-query';

declare module '@tanstack/react-query' {
  interface Register {
    queryMeta: {
      /**
       * Wenn `true`, unterdrückt der globale `QueryCache.onError`-Handler
       * den Sonner-Toast für diese Query. Die Route-Komponente rendert den
       * Fehler inline (z. B. als `EmptyState` oder `SeverityBanner`).
       */
      silentError?: boolean;
    };
    mutationMeta: {
      /**
       * Wenn `true`, unterdrückt der globale `MutationCache.onError`-Handler
       * den Sonner-Toast für diese Mutation. Die aufrufende Komponente
       * rendert den Fehler inline (z. B. als Konflikt-Banner).
       */
      silentError?: boolean;
    };
  }
}
