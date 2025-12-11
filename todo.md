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

## Múltiplos Usuários por Tag
- [x] Adicionar campo deviceId no schema de nfcUsers
- [x] Gerar Device ID único no localStorage do navegador
- [x] Atualizar lógica de verificação para identificar por tag + dispositivo
- [x] Atualizar lógica de registro para incluir deviceId
- [x] Permitir múltiplos usuários registrados na mesma tag

## Usuário com Múltiplas Tags
- [x] Criar tabela de relacionamento usuário-tags (muitos-para-muitos)
- [x] Identificar usuário pelo deviceId independente da tag
- [x] Vincular usuário existente a novas tags automaticamente
- [x] Atualizar listagem de usuários para mostrar tags vinculadas
- [x] Evitar cadastros duplicados do mesmo dispositivo

## Correções Urgentes
- [x] Verificar e manter campos de geolocalização do usuário para check-in (já estava funcionando)
- [x] Corrigir redirecionamento após cadastro para o app PWA

## Link do App por DeviceId
- [x] Atualizar página UserApp para aceitar deviceId como parâmetro
- [x] Atualizar listagem de usuários para gerar link com deviceId
- [x] Permitir enviar link personalizado para usuários já cadastrados
- [x] Corrigir página UserApp para funcionar apenas com deviceId (sem precisar de uid da tag)
- [x] Forçar geolocalização obrigatória no cadastro novo

## Reorganização da Página de Agendamentos
- [x] Separar configuração de todos os agendamentos da execução do dia
- [x] Seção de configuração: listar todos os agendamentos cadastrados com CRUD
- [x] Seção de execução do dia: mostrar apenas agendamentos aplicáveis ao dia/período atual
- [x] Botão de executar apenas nos agendamentos do dia/período atual
- [x] Histórico de check-ins filtrado apenas para o dia atual

## Múltiplas Tags por Agendamento
- [x] Criar tabela de relacionamento agendamento-tags (N:N)
- [x] Permitir selecionar múltiplas tags no cadastro de agendamento
- [x] Adicionar opção "Todas as Tags" no cadastro
- [x] Permitir editar tags em agendamentos existentes
- [x] Atualizar lógica de execução de check-in para processar múltiplas tags

## Validação de Horário para Execução de Check-in
- [x] Bloquear execução de check-in fora do período configurado
- [x] Mostrar mensagem de erro quando tentar executar fora do horário

## Unificação de Check-ins e Timezone
- [x] Implementar timezone Campo Grande MS (UTC-4) para validação de horários
- [x] Unificar visualização de check-ins manuais e automáticos na mesma página
- [x] Criar botão de check-in manual na página de tag NFC
- [x] Validar se existe agendamento ativo no período para habilitar check-in manual
- [x] Evitar duplicação: se fez check-in manual, não processar no automático
- [x] Manter redirecionamento funcionando independente de agendamento

## Painel de Presença em Tempo Real
- [x] Criar endpoint para buscar check-ins do dia por agendamento ativo
- [x] Criar página de painel em tempo real com auto-refresh
- [x] Mostrar lista de quem já fez check-in com status (dentro/fora do raio)
- [x] Mostrar estatísticas do agendamento ativo (total esperado vs presentes)
- [x] Adicionar link no menu do dashboard
