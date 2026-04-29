# How to Run Development Server

The project root is now:

```powershell
C:\Users\ACER\Desktop\gosh-main
```

Run npm commands from that folder.

## Quick Start Commands

### 1. Navigate to Project Directory

```powershell
cd C:\Users\ACER\Desktop\gosh-main
```

### 2. Install Dependencies If Needed

```powershell
npm install
```

### 3. Run Development Server

```powershell
npm run dev
```

### 4. Open in Browser

The server will start at: http://localhost:3000

## Common Commands

```powershell
# Development server
npm run dev

# Build for production
npm run build

# Start production server
npm start

# Run linter
npm run lint
```

## Troubleshooting

### Error: "Cannot find module"

```powershell
npm install
```

### Error: "Port 3000 already in use"

```powershell
npm run dev -- -p 3001
```

### Error: "ENOENT: no such file or directory"

Make sure you're in the correct directory:

```powershell
pwd  # Should show: C:\Users\ACER\Desktop\gosh-main
```

## VS Code Terminal Tip

Open the `gosh-main` folder in VS Code. The terminal should open in the correct directory, then you can run:

```powershell
npm run dev
```

## Quick Launch Scripts

You can also use the launch scripts in this folder:

```powershell
.\run-dev.ps1
```

or double-click `run-dev.bat`.
