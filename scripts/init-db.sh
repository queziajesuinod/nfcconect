#!/bin/bash

# Script de inicialização do banco de dados
# Executa migrações e setup inicial

set -e

echo "🚀 Iniciando setup do banco de dados..."

# Cores para output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Verificar se DATABASE_URL está definido
if [ -z "$DATABASE_URL" ]; then
    echo -e "${RED}❌ Erro: DATABASE_URL não está definido${NC}"
    exit 1
fi

echo -e "${YELLOW}📦 Instalando dependências...${NC}"
pnpm install --frozen-lockfile

echo -e "${YELLOW}🔄 Gerando migrações...${NC}"
pnpm drizzle-kit generate

echo -e "${YELLOW}🗄️  Aplicando migrações...${NC}"
pnpm drizzle-kit migrate

echo -e "${YELLOW}🏗️  Buildando aplicação...${NC}"
pnpm run build

echo -e "${GREEN}✅ Setup do banco de dados concluído com sucesso!${NC}"
echo -e "${GREEN}✅ Aplicação pronta para iniciar${NC}"
