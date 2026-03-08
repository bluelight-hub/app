-- Story 4.3: Token-Usage-Statistiken einsehen
-- Index fuer performante Sortierung nach lastUsedAt
-- NULLS LAST damit nie-verwendete Tokens am Ende erscheinen (bei DESC)

CREATE INDEX idx_server_access_token_last_used ON server_access_tokens ("lastUsedAt" DESC NULLS LAST);
