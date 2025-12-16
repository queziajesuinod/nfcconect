@echo off
REM Script para iniciar o servidor em desenvolvimento no Windows CMD
REM Uso: dev.bat

echo ========================================
echo Sistema de Gerenciamento NFC - Dev
echo ========================================
echo.

REM Definir NODE_ENV para development
set NODE_ENV=development

REM Iniciar o servidor
echo Iniciando servidor em desenvolvimento...
echo.

pnpm dev

pause
