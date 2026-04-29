# Fix Admin Products 404 - Clear Cache Script

Write-Host "=== Fixing Admin Products 404 ===" -ForegroundColor Yellow
Write-Host ""

# Navigate to project directory
$projectPath = "C:\Users\ACER\Desktop\gosh-main\gosh-main"
Set-Location $projectPath

Write-Host "1. Stopping any running dev servers..." -ForegroundColor Cyan
# Kill any node processes (optional, comment out if you want to stop manually)
# Get-Process node -ErrorAction SilentlyContinue | Stop-Process -Force

Write-Host "2. Deleting .next cache folder..." -ForegroundColor Cyan
if (Test-Path ".next") {
    Remove-Item -Recurse -Force .next
    Write-Host "   ✓ .next folder deleted" -ForegroundColor Green
} else {
    Write-Host "   ℹ .next folder not found (already clean)" -ForegroundColor Gray
}

Write-Host "3. Deleting node_modules cache..." -ForegroundColor Cyan
if (Test-Path "node_modules/.cache") {
    Remove-Item -Recurse -Force "node_modules/.cache"
    Write-Host "   ✓ node_modules/.cache deleted" -ForegroundColor Green
} else {
    Write-Host "   ℹ node_modules/.cache not found" -ForegroundColor Gray
}

Write-Host ""
Write-Host "=== Cache Cleared Successfully ===" -ForegroundColor Green
Write-Host ""
Write-Host "Next steps:" -ForegroundColor Yellow
Write-Host "1. Run: npm run dev" -ForegroundColor White
Write-Host "2. Clear browser cache (Ctrl + Shift + R)" -ForegroundColor White
Write-Host "3. Login at: http://localhost:3000/admin/login" -ForegroundColor White
Write-Host "4. Visit: http://localhost:3000/admin/products" -ForegroundColor White
Write-Host ""
Write-Host "Press any key to start dev server..." -ForegroundColor Cyan
$null = $Host.UI.RawUI.ReadKey("NoEcho,IncludeKeyDown")

Write-Host ""
Write-Host "Starting dev server..." -ForegroundColor Cyan
npm run dev
