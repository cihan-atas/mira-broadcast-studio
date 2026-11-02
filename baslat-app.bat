@echo off
title MIRA BROADCAST STUDIO
cd /d "%~dp0"
echo ========================================================
echo  MIRA BROADCAST STUDIO - Professional Stream Deck
echo ========================================================
if exist node_modules\.bin\electron.cmd (
  start "" node_modules\.bin\electron.cmd .
) else (
  start "" npx electron .
)
exit
