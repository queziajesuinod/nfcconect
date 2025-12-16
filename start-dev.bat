@echo off
REM Script para iniciar o servidor em desenvolvimento no Windows
REM Duplo clique para executar ou rode: start-dev.bat

echo ========================================
echo Sistema de Gerenciamento NFC - Dev
echo ========================================
echo.

REM Definir NODE_ENV para development
set NODE_ENV=development

REM Iniciar o servidor
echo Iniciando servidor em desenvolvimento...
echo Acesse: http://localhost:3000
echo.

call pnpm dev

pause
