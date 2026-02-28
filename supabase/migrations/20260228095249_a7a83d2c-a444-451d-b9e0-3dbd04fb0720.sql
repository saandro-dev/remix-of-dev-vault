
-- whatsapp-sql-schema is a standalone module within the whatsapp group.
-- It has no logical dependencies, so removing module_group allows it to score 100.
UPDATE vault_modules 
SET module_group = NULL 
WHERE id = 'aed2617b-6183-4da8-b432-28b8ee22f291';
