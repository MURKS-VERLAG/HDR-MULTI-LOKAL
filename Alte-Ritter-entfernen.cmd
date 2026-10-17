@echo off
setlocal
rem Nur die alten Ritter aus Patch 11 entfernen. Standardfigur bleibt erhalten.
if exist "%~dp0assets\player\variants\sova.png" del /q "%~dp0assets\player\variants\sova.png"
if exist "%~dp0assets\player\variants\hormelz.png" del /q "%~dp0assets\player\variants\hormelz.png"
if exist "%~dp0assets\player\variants\lpc.png" del /q "%~dp0assets\player\variants\lpc.png"
if exist "%~dp0assets\player\variants\SOVA-LICENSE.txt" del /q "%~dp0assets\player\variants\SOVA-LICENSE.txt"
if exist "%~dp0assets\player\variants\HORMELZ-LICENSE.txt" del /q "%~dp0assets\player\variants\HORMELZ-LICENSE.txt"
if exist "%~dp0assets\player\variants\LPC-AUTHORS.txt" del /q "%~dp0assets\player\variants\LPC-AUTHORS.txt"
if exist "%~dp0assets\player\variants\LPC-CC-BY-SA-3.0.txt" del /q "%~dp0assets\player\variants\LPC-CC-BY-SA-3.0.txt"
if exist "%~dp0assets\player\variants" rd "%~dp0assets\player\variants" 2>nul
if exist "%~dp0credits.html" findstr /i /c:"SovDigital" "%~dp0credits.html" >nul && del /q "%~dp0credits.html"
echo Alte Ritterdateien entfernt. Die Standardfigur bleibt erhalten.
echo Bei einem Git-Projekt die geloeschten Dateien ebenfalls committen.
pause
