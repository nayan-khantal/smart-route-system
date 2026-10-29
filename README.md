# Smart Waste Management

Smart Waste Management is a React/Vite frontend with an Express/Node.js backend and a MySQL database.

## Prerequisites

- Node.js 18 or newer
- npm
- MySQL Server 8 or newer

## Install dependencies

Run these commands from the repository root in PowerShell:

```powershell
npm install
Set-Location backend
npm install
Set-Location ..\frontend
npm install
Set-Location ..
```

## Connect the backend to MySQL

1. Make sure the MySQL service is running.
2. Create the backend environment file:

   ```powershell
   Copy-Item backend\.env.example backend\.env
   ```

3. Open `backend\.env` and set `DB_USER` and `DB_PASS` to your MySQL credentials. The default database name is `smart_waste`.
4. Import the complete schema from the repository root:

   ```powershell
   Get-Content database\complete_schema.sql | mysql -u root -p
   ```

   Enter the MySQL password when prompted. This creates the `smart_waste` database and all required tables.

5. Load the sample Mysuru data:

   ```powershell
   Set-Location backend
   node scripts\seedData.js
   Set-Location ..
   ```

   The seed script clears and recreates the demo data. Do not run it against a database containing data you need to keep.

6. Create the demo admin and driver passwords:

   ```powershell
   Set-Location backend
   node scripts\seed.js
   Set-Location ..
   ```

## Run the backend

From the repository root:

```powershell
Set-Location backend
node server.js
```

The API runs at `http://localhost:5000`. Use `npm start` instead of `npm run dev` for a non-watching process.

## Run the frontend

Open a second terminal at the repository root:

```powershell
Set-Location frontend
npm run dev
```

Open the URL printed by Vite, normally `http://localhost:5173`.

The frontend uses `http://localhost:5000/api` by default. To use another backend URL, create `frontend\.env.local` with:

```text
VITE_API_BASE=http://localhost:5000/api
```

## Useful commands

| Purpose | Command |
| --- | --- |
| Build frontend | `Set-Location frontend; npm run build` |
| Seed demo data | `Set-Location backend; node scripts\seedData.js` |
| Seed login passwords | `Set-Location backend; node scripts\seed.js` |

Demo credentials:

- Admin: `admin` / `admin123`
- Driver Ramesh Nayak: `9988776601`
- Driver Suresh Kumar: `9988776602`

Change these credentials before using this application outside a local demo.
