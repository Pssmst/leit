@echo off
robocopy "C:\Users\Owner\Music" "%~dp0\App\assets\Music" ^
    /MIR ^
    /MT:16 ^
    /XD "FlashIntegro" "Covers (Images)" "iTunes" "Playlists" ^
    /XF ".gitkeep" ^
pause