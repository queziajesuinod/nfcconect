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
