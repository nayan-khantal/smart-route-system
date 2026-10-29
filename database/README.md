Smart Waste — Database folder

Purpose:
- Hold canonical database schema, migrations, and seed instructions for the WastePilot (SmartWasteMngt) project.
- Organize SQL and seed code so it's easy to explain in lab or demo settings.

Contents:
- `complete_schema.sql` — Full schema and migrations for a fresh install.
- `backend/scripts/seedData.js` — Inserts the sample Mysuru data.

Recommended workflow (fresh database):
1. For a fresh install, create the database and apply the complete schema:

   mysql -u <user> -p < complete_schema.sql

2. Seed sample data (Mysuru dataset):

   cd backend
   node scripts/seedData.js

Notes for instructors / students:
- `complete_schema.sql` is the authoritative fresh-install file; it contains comments marking migration boundaries.
- For reproducible, idempotent seeding use `backend/seedData.js` (it uses `INSERT IGNORE` and `ON DUPLICATE KEY UPDATE`).
