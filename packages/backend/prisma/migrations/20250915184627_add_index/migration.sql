CREATE INDEX IF NOT EXISTS etb_eintraege_active_idx
    ON public.etb_eintraege ("etbId", "timestamp")
    WHERE "deletedAt" IS NULL;

ALTER TABLE public.etb_eintrag_historie
    ADD CONSTRAINT etb_historie_version_chk CHECK ("version" >= 1);
ALTER TABLE public.etb_eintraege
    DROP CONSTRAINT IF EXISTS etb_eintraege_version_chk,
    ADD CONSTRAINT etb_eintraege_version_chk CHECK ("version" >= 1);