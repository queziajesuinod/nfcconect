#!/bin/bash

# Script de restore do PostgreSQL
# Restaura um backup anterior

set -e

# Cores para output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

# Verificar argumentos
if [ $# -eq 0 ]; then
    echo -e "${RED}❌ Uso: $0 <caminho_do_backup>${NC}"
    echo "Exemplo: $0 /backups/backup_20240101_120000.sql.gz"
    exit 1
fi

BACKUP_FILE="$1"
BACKUP_DIR="${BACKUP_DIR:-/backups}"

# Verificar se arquivo existe
if [ ! -f "$BACKUP_FILE" ]; then
    echo -e "${RED}❌ Erro: Arquivo de backup não encontrado: $BACKUP_FILE${NC}"
    exit 1
fi

# Verificar se DATABASE_URL está definido
if [ -z "$DATABASE_URL" ]; then
    echo -e "${RED}❌ Erro: DATABASE_URL não está definido${NC}"
    exit 1
fi

echo -e "${YELLOW}⚠️  ATENÇÃO: Você está prestes a restaurar um backup!${NC}"
echo -e "${YELLOW}Arquivo: $BACKUP_FILE${NC}"
echo -e "${YELLOW}Banco de dados será SOBRESCRITO!${NC}"
read -p "Deseja continuar? (s/n) " -n 1 -r
echo
if [[ ! $REPLY =~ ^[Ss]$ ]]; then
    echo -e "${RED}❌ Operação cancelada${NC}"
    exit 1
fi

echo -e "${YELLOW}🔄 Restaurando backup...${NC}"

# Detectar se arquivo é compactado
if [[ "$BACKUP_FILE" == *.gz ]]; then
    gunzip -c "$BACKUP_FILE" | psql "$DATABASE_URL"
else
    psql "$DATABASE_URL" < "$BACKUP_FILE"
fi

if [ $? -eq 0 ]; then
    echo -e "${GREEN}✅ Backup restaurado com sucesso!${NC}"
else
    echo -e "${RED}❌ Erro ao restaurar backup${NC}"
    exit 1
fi
