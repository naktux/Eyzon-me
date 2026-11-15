@echo off
setlocal
cd /d "%~dp0slopify"
call npm.cmd run build
if errorlevel 1 (
 echo Build failed. See the error above.
 pause
 exit /b 1
)
echo.
echo Slopify is now a Chrome extension.
echo Open chrome://extensions, enable Developer mode, and choose Load unpacked.
echo Choose this folder: %cd%\extension-dist
echo Click the extension icon to open the dashboard.
pause
