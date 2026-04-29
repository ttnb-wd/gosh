@echo off
echo ============================================
echo GOSH PERFUME Development Server Launcher
echo ============================================
echo.
echo Starting the Next.js development server from this project root.
echo.

cd /d "%~dp0"

if exist "package.json" (
    echo Found package.json in current directory.
    echo Starting development server...
    echo.
    npm.cmd run dev
) else (
    echo ERROR: package.json was not found next to this script.
    echo.
    echo Expected project root:
    echo C:\Users\ACER\Desktop\gosh-main
    echo.
    pause
)
