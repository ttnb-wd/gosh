# How to Run Development Server

## Issue
You were trying to run `npm run dev` from the wrong directory:
```
C:\Users\ACER\Desktop\gosh-main> npm run dev  ❌ WRONG
```

The `package.json` file is inside the `gosh-main` subdirectory, not in the parent folder.

## Solution

### Option 1: Change Directory First (Recommended)
```powershell
cd C:\Users\ACER\Desktop\gosh-main\gosh-main
npm run dev
```

### Option 2: Run from Parent Directory
```powershell
cd C:\Users\ACER\Desktop\gosh-main
npm run dev --prefix gosh-main
```

## Correct Directory Structure
```
C:\Users\ACER\Desktop\gosh-main\          ← Parent folder
└── gosh-main\                             ← Project folder (you need to be here!)
    ├── package.json                       ← npm looks for this file
    ├── node_modules\
    ├── app\
    ├── components\
    └── ...
```

## Quick Start Commands

### 1. Navigate to Project Directory
```powershell
cd C:\Users\ACER\Desktop\gosh-main\gosh-main
```

### 2. Install Dependencies (if needed)
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
# Delete node_modules and reinstall
rm -r node_modules
npm install
```

### Error: "Port 3000 already in use"
```powershell
# Kill the process using port 3000
npx kill-port 3000

# Or use a different port
npm run dev -- -p 3001
```

### Error: "ENOENT: no such file or directory"
Make sure you're in the correct directory:
```powershell
pwd  # Should show: C:\Users\ACER\Desktop\gosh-main\gosh-main
```

## VS Code Terminal Tip

If using VS Code:
1. Open the `gosh-main\gosh-main` folder in VS Code
2. Terminal will automatically open in the correct directory
3. Just run: `npm run dev`


## Quick Launch Scripts

To prevent the directory error, I've created launch scripts that automatically navigate to the correct directory:

### Windows Batch File (run-dev.bat)
```powershell
# Double-click this file or run from command line:
run-dev.bat
```

### PowerShell Script (run-dev.ps1)
```powershell
# Run PowerShell script (may need to allow execution first):
.\run-dev.ps1
```

### To allow PowerShell script execution:
```powershell
# Run this once in PowerShell as Administrator:
Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser
```

## Always Use Correct Directory
Remember: The project folder is `gosh-main\gosh-main`, not just `gosh-main`.
