@echo off
REM Script para executar migrações do banco de dados no Windows CMD
REM Uso: db-push.bat

echo ========================================
echo Migrando Banco de Dados
echo ========================================
echo.

REM Executar migrações
echo Executando pnpm db:push...
echo.

pnpm db:push

echo.
echo ========================================
echo Migrações concluídas!
echo ========================================

pause
