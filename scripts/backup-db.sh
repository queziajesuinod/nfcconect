#!/bin/bash

# Script de backup do PostgreSQL
# Cria backup diário e o compacta

set -e

# Configurações
BACKUP_DIR="${BACKUP_DIR:-/backups}"
RETENTION_DAYS="${RETENTION_DAYS:-30}"
DATE=$(date +%Y%m%d_%H%M%S)
BACKUP_FILE="$BACKUP_DIR/backup_$DATE.sql.gz"

# Cores para output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

echo -e "${YELLOW}🔄 Iniciando backup do banco de dados...${NC}"

# Verificar se DATABASE_URL está definido
if [ -z "$DATABASE_URL" ]; then
    echo -e "${RED}❌ Erro: DATABASE_URL não está definido${NC}"
    exit 1
fi

# Criar diretório se não existir
mkdir -p "$BACKUP_DIR"

# Fazer backup
echo -e "${YELLOW}📦 Fazendo backup...${NC}"
pg_dump "$DATABASE_URL" | gzip > "$BACKUP_FILE"

if [ $? -eq 0 ]; then
    SIZE=$(du -h "$BACKUP_FILE" | cut -f1)
    echo -e "${GREEN}✅ Backup criado com sucesso: $BACKUP_FILE ($SIZE)${NC}"
else
    echo -e "${RED}❌ Erro ao criar backup${NC}"
    exit 1
fi

# Limpar backups antigos
echo -e "${YELLOW}🧹 Limpando backups antigos (> $RETENTION_DAYS dias)...${NC}"
find "$BACKUP_DIR" -name "backup_*.sql.gz" -mtime +$RETENTION_DAYS -delete

echo -e "${GREEN}✅ Backup concluído!${NC}"
