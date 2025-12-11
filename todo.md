# NFC Management System - TODO

## Database & Schema
- [x] Schema para tags NFC (id, uid, nome, dados, status, timestamps)
- [x] Schema para usuários NFC (id, nome, email, telefone, primeira conexão, timestamps)
- [x] Schema para histórico de conexões (id, tag_id, user_id, ação, timestamps)
- [x] Schema para links dinâmicos (id, user_id, url, ações configuradas)

## Backend API
- [x] Endpoint para registro automático na primeira leitura NFC
- [x] Endpoint para validação de usuários registrados
- [x] Endpoint CRUD para gerenciamento de tags NFC
- [x] Endpoint para geração de links dinâmicos personalizados
- [x] Endpoint para consulta de histórico de atividades
- [x] Endpoint para logs de interações

## Frontend - Dashboard Administrativo
- [x] Layout brutalista com tipografia pesada
- [x] Página inicial com visão geral do sistema
- [x] Página de listagem de usuários NFC registrados
- [x] Página de gerenciamento de tags NFC
- [x] Página de histórico de conexões/atividades
- [x] Página de configuração de links dinâmicos
- [x] Sistema de logs visual

## Autenticação
- [x] Integração com Manus OAuth para admins
- [x] Validação de usuários NFC por UID da tag

## Estilo Visual
- [x] Implementar estética brutalista tipográfica
- [x] Tipografia sans-serif massiva em preto sobre branco
- [x] Layout assimétrico de alto contraste
- [x] Linhas geométricas grossas (colchetes, sublinhados)
- [x] Espaço negativo abundante

## Testes
- [x] Testes vitest para endpoints de API
- [x] Validação de fluxos de registro e autenticação

## Melhorias
- [x] Gerar URL automática para gravação NFC ao criar tag
- [x] Exibir URL com botão de copiar na listagem de tags
- [x] Adicionar QR Code da URL para facilitar gravação
- [x] Redirecionar usuários já cadastrados diretamente sem mostrar tela de registro

## Geolocalização e Check-in
- [x] Adicionar campos de latitude/longitude no schema de tags NFC
- [x] Adicionar campo de raio de proximidade na tag
- [x] Capturar geolocalização no primeiro cadastro do usuário
- [x] Criar tabela de check-ins com localização
- [x] Implementar API de check-in com validação de proximidade
- [x] Interface para configurar raio de proximidade por tag
- [x] Visualização de check-ins no dashboard

## Módulo de Check-in Automático
- [x] Schema para agendamentos de check-in (dias da semana, horário início/fim, tag associada)
- [x] API CRUD para gerenciar agendamentos
- [x] Lógica de verificação de usuários no raio durante período agendado
- [x] Sistema de check-in automático no meio do período
- [x] Interface de gerenciamento de agendamentos no dashboard
- [x] Histórico de check-ins automáticos

## PWA com Background Sync
- [x] Configurar manifest.json para PWA
- [x] Criar service worker com Background Sync
- [x] Implementar Periodic Background Sync para atualização de localização
- [x] Criar página de instalação do PWA para usuários
- [x] Página de atualização de localização com UI amigável
- [x] Notificações push para lembrar usuário de ativar localização

## Melhorias de Acesso ao PWA
- [x] Botão "Instalar App" na listagem de usuários com link copiável
- [x] Redirecionar automaticamente após primeiro cadastro para o PWA

## Bugs
- [x] Corrigir página de Check-ins que não está funcionando
- [x] Evitar check-ins duplicados no mesmo período de agendamento
- [x] Redirecionar para URL da tag após primeiro cadastro

## Deploy Externo (Docker/Portainer/Traefik) - ADIADO
- [ ] Converter Drizzle ORM de MySQL para PostgreSQL
- [ ] Atualizar schema.ts para sintaxe PostgreSQL
- [ ] Atualizar db.ts para driver PostgreSQL
- [ ] Criar Dockerfile para produção
- [ ] Criar docker-compose.yml com Traefik
- [ ] Criar arquivo .env.example
- [ ] Documentação de deploy
