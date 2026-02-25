-- Convert Befehl nummer from B{YEAR}-{CUID-8} to B-{SEQ} per Einsatz
UPDATE befehl SET nummer = subq.new_nummer
FROM (
  SELECT id,
    'B-' || LPAD(ROW_NUMBER() OVER (PARTITION BY einsatz_id ORDER BY erteilt_am)::text, 3, '0') as new_nummer
  FROM befehl
) subq
WHERE befehl.id = subq.id;
