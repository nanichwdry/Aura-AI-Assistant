@echo off
echo Installing Aura Native Host...

cd /d "%~dp0"
call npm install

set MANIFEST_PATH=%CD%\com.aura.native_host.json
set HOST_PATH=%CD%\host.js

echo Updating manifest with absolute path...
powershell -Command "(Get-Content com.aura.native_host.json) -replace '\"path\": \"host.js\"', ('\"path\": \"' + $env:HOST_PATH.Replace('\', '\\') + '\"') | Set-Content com.aura.native_host.json"

echo Registering native host with Chrome...
reg add "HKCU\Software\Google\Chrome\NativeMessagingHosts\com.aura.native_host" /ve /t REG_SZ /d "%MANIFEST_PATH%" /f

echo.
echo Installation complete!
echo.
echo Next steps:
echo 1. Edit config.json and add your Gemini API key
echo 2. Install the Chrome extension
echo 3. Update manifest allowed_origins with your extension ID
echo.
pause
