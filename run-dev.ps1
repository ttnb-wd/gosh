Write-Host "============================================" -ForegroundColor Cyan
Write-Host "GOSH PERFUME Development Server Launcher" -ForegroundColor Cyan
Write-Host "============================================" -ForegroundColor Cyan
Write-Host ""

Write-Host "Starting the Next.js development server from this project root." -ForegroundColor Yellow
Write-Host ""

Set-Location (Split-Path -Parent $MyInvocation.MyCommand.Path)

if (Test-Path "package.json") {
    Write-Host "Found package.json in current directory." -ForegroundColor Green
    Write-Host "Starting development server..." -ForegroundColor Green
    Write-Host ""
    npm.cmd run dev
} else {
    Write-Host "ERROR: package.json was not found next to this script." -ForegroundColor Red
    Write-Host ""
    Write-Host "Expected project root: C:\Users\ACER\Desktop\gosh-main" -ForegroundColor Yellow
    Write-Host ""
    Write-Host "Press any key to exit..." -ForegroundColor Yellow
    $null = $Host.UI.RawUI.ReadKey("NoEcho,IncludeKeyDown")
}
