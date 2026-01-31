# How to run Forever Faded

## One-time setup (if you haven’t already)

In a terminal (PowerShell or Command Prompt):

```bash
cd C:\Users\Admin\forever-faded-platform

# Server
cd server
npm install
npx prisma generate
npx prisma db push
npx prisma db seed
cd ..

# Client
cd client
npm install
cd ..
```

## Run the app

You need **two** terminals (or two batch windows).

### Option 1: Double-click batch files

1. Double-click **`run-server.bat`**  
   → API runs at http://localhost:3001  
2. Double-click **`run-client.bat`**  
   → Web app runs at http://localhost:3000  

Leave both windows open. In your browser, open **http://localhost:3000**.

### Option 2: Terminal

**Terminal 1 – API:**

```bash
cd C:\Users\Admin\forever-faded-platform\server
npm run dev
```

**Terminal 2 – Web app:**

```bash
cd C:\Users\Admin\forever-faded-platform\client
npm run dev
```

Then open **http://localhost:3000** in your browser.

## Server won't start?

If you see `Failed running 'src/index.js'`:

1. **Regenerate Prisma client** (in `server` folder):
   ```bash
   npx prisma generate
   ```
2. **Run the server directly** to see the full error:
   ```bash
   cd server
   node src/index.js
   ```
   Copy the full error message; it usually points to a missing dependency or bad `.env`.
3. **Node version:** The app is tested on Node 18–22. If you use Node 24+, try Node 20 LTS if errors persist.

## Seed logins (password: `password123`)

- **Owner:** owner@foreverfaded.com  
- **Barber:** mike@foreverfaded.com, chris@foreverfaded.com  
- **Client:** john@example.com  
