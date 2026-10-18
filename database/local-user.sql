-- =========================================================
--   Synora — the API's MySQL login on YOUR computer
--
--   Run this in Workbench on your LOCAL MySQL only, after
--   schema.sql. Never run it on the cloud database: the
--   password below is public (it is in this repository), which
--   is fine only because this user can connect from this
--   computer alone.
--
--   server/.env.example uses the same password.
-- =========================================================

CREATE USER IF NOT EXISTS 'synora_app'@'localhost' IDENTIFIED BY 'Synora_Local_2026';
ALTER USER 'synora_app'@'localhost' IDENTIFIED BY 'Synora_Local_2026';
GRANT SELECT, INSERT, UPDATE, DELETE ON synora.* TO 'synora_app'@'localhost';
-- Lets the API add new columns and tables by itself (server/migrate.js).
GRANT CREATE, ALTER, INDEX, REFERENCES ON synora.* TO 'synora_app'@'localhost';
