@echo off
echo Copying file
@RD /S /Q "%~dp0\assets\Music"
robocopy "C:\Users\Owner\Music" "%~dp0\assets\Music" /E /MT:16 /XD "C:\Users\Owner\Music\FlashIntegro" "C:\Users\Owner\Music\Covers (Images)" "C:\Users\Owner\Music\iTunes" "C:\Users\Owner\Music\Playlists"
pause
