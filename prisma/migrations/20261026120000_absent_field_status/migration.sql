-- Campos Pendiente cuyo valor guardado es un marcador vacío pasan a Sin dato.
-- El texto que sí se guardó y no se interpretó sigue en Pendiente.

UPDATE "BeoField"
SET "status" = 'ABSENT'
WHERE "status" = 'PENDING'
  AND (
    "value" IS NULL
    OR btrim("value") = ''
    OR btrim("value") IN ('...', '…', '-', '—', '–')
  );

UPDATE "BudgetBlock"
SET "scheduleStatus" = 'ABSENT'
WHERE "scheduleStatus" = 'PENDING'
  AND (
    "schedule" IS NULL
    OR btrim("schedule") = ''
    OR btrim("schedule") IN ('...', '…', '-', '—', '–')
  );

UPDATE "BudgetBlock"
SET "setupStatus" = 'ABSENT'
WHERE "setupStatus" = 'PENDING'
  AND (
    "setup" IS NULL
    OR btrim("setup") = ''
    OR btrim("setup") IN ('...', '…', '-', '—', '–')
  );

UPDATE "BudgetBlock"
SET "salonStatus" = 'ABSENT',
    "salonName" = NULL
WHERE "salonStatus" = 'PENDING'
  AND ("salonName" IS NULL OR btrim("salonName") = '' OR btrim("salonName") IN ('...', '…', '-', '—', '–'))
  AND ("salonRaw" IS NULL OR btrim("salonRaw") = '' OR btrim("salonRaw") IN ('...', '…', '-', '—', '–'));

UPDATE "BudgetBlock"
SET "paxStatus" = 'ABSENT'
WHERE "paxStatus" = 'PENDING'
  AND "pax" IS NULL;

UPDATE "BudgetItem"
SET "sectionStatus" = 'ABSENT'
WHERE "sectionStatus" = 'PENDING'
  AND ("sectionTarget" IS NULL OR btrim("sectionTarget") = '')
  AND (
    "sectionHeader" IS NULL
    OR btrim("sectionHeader") = ''
    OR btrim("sectionHeader") IN ('...', '…', '-', '—', '–')
  );
