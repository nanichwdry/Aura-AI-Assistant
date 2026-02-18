@echo off
echo Building Aura Native Host Installer...

cd /d "%~dp0"

if not exist "dist" mkdir dist

echo Copying files...
xcopy /Y /I host.js dist\
xcopy /Y /I package.json dist\
xcopy /Y /I com.aura.native_host.json dist\
xcopy /Y /I config.json dist\
xcopy /Y /I install.bat dist\
xcopy /Y /I README.md dist\

echo Creating installer archive...
powershell Compress-Archive -Path dist\* -DestinationPath aura-native-host-installer.zip -Force

echo.
echo Installer created: aura-native-host-installer.zip
echo.
echo Users should:
echo 1. Extract the zip
echo 2. Run install.bat
echo 3. Edit config.json with their API key
echo 4. Install Chrome extension
echo.
pause
