# NeuroAtlas TEA Platform

Plataforma web completa para psicólogas e psicopedagogas estruturarem avaliação, intervenção e acompanhamento de pessoas com Transtorno do Espectro Autista (TEA), alinhada ao Protocolo do Estado de São Paulo (2013).

## Visão geral

- **Backend**: Django 5, Django REST Framework, JWT (SimpleJWT), drf-spectacular para documentação
- **Frontend**: React (Webpack + TailwindCSS 2), componentes responsivos e dashboard interativo (Recharts)
- **Banco**: PostgreSQL
- **Infra**: Docker e docker-compose prontos para build/renderização (backend + frontend + banco)

Principais módulos:

1. Gestão de profissionais (registro, edição de perfil, auditoria)
2. Cadastro completo de pacientes com históricos clínicos, familiares e escolares
3. Avaliações padronizadas (M-CHAT, ABC, Vineland, ATEC, C-GAS) com interpretação e comparativo
4. Projeto Terapêutico Singular (PTS) com monitoramento de metas e alertas de revisão
5. Registro de sessões (psicológicas, psicopedagógicas, avaliação, reavaliação) com indicadores de progresso
6. Emissão de relatórios gerais e reavaliações semestrais
7. Psicoeducação e apoio familiar, incluindo pesquisas de satisfação (Anexo E)
8. Painel clínico com indicadores chave (pacientes ativos, escalas mensais, média de progresso, reavaliações pendentes, adesão)

## Estrutura do projeto

`
.
|-- backend/            # Projeto Django "core" + app "clinical"
|-- frontend/           # React SPA (Webpack, Tailwind)
|-- docker-compose.yml  # Orquestração backend/frontend/banco
|-- .env.example        # Variáveis de exemplo para o backend
\-- README.md
`

### Backend

- clinical/models.py: modelos principais (Professional, Patient, Assessment, TherapeuticPlan, Session, Report, SatisfactionSurvey, FamilySession, AuditLog)
- clinical/serializers.py: serialização com validações específicas (ex.: M-CHAT exige 20 respostas)
- clinical/views.py: viewsets e endpoints REST (inclui log de auditoria, timeline e dashboard consolidado)
- clinical/services.py: regras de negócio para indicadores e série de progresso
- core/settings.py: configuração com django-environ, fallback SQLite para desenvolvimento e JWT completo
- clinical/urls.py: rotas REST (inclui nested routes para pacientes)
- core/urls.py: inclui API, Swagger (/api/docs/) e schema (/api/schema/)

### Frontend

- src/contexts/auth-context.jsx: contexto de autenticação com SimpleJWT (refresh automático)
- src/services/api.js: instância Axios com interceptors e renovação de token
- src/pages/*: páginas principais (dashboard, pacientes, avaliações, intervenções, relatórios, recursos familiares, configurações)
- src/layouts/main-layout.jsx: layout responsivo com menu lateral e header de profissional
- src/routes/index.jsx: rotas protegidas via ProtectedRoute
- 	ailwind.config.js: tema com paleta terapêutica (azul claro, branco, cinza)

## Executando localmente

### Via Docker

`ash
# 1. Copie o arquivo de variáveis
cp .env.example .env

# 2. Suba os serviços
docker-compose up --build

# Backend: http://localhost:8000/api/
# Frontend: http://localhost:3000/
`

### Manualmente

#### Backend

`ash
cd backend
python -m venv .venv
.venv\Scripts\activate
pip install -r requirements.txt
cp ..\.env.example ..\.env  # ajuste as variáveis conforme necessário
python manage.py migrate
python manage.py runserver
`

#### Frontend

`ash
cd frontend
npm install
npm start
`

> Nota: para build local recomenda-se Node >= 14. Em ambiente Docker o build usa Node 18.

## Variáveis importantes

- SECRET_KEY: chave secreta do Django
- DATABASE_URL: string Postgres (ex.: postgres://usuario:senha@host:5432/teacare)
- ALLOWED_HOSTS, CORS_ALLOWED_ORIGINS, CSRF_TRUSTED_ORIGINS: domínios autorizados
- API_BASE_URL (frontend): URL base da API (automaticamente definida no Docker)

## Endpoints principais

- POST /api/auth/register/: cadastro de profissional
- POST /api/auth/login/ + POST /api/auth/refresh/: autenticação JWT
- GET/PUT /api/auth/me/: perfil do profissional
- GET/POST /api/patients/: pacientes
- GET/POST /api/patients/{id}/assessments/: avaliações padronizadas
- GET/POST /api/patients/{id}/pts/: projeto terapêutico
- GET/POST /api/patients/{id}/sessions/: sessões terapêuticas
- GET/POST /api/patients/{id}/reports/: relatórios
- GET/POST /api/patients/{id}/surveys/: pesquisas de satisfação
- GET/POST /api/patients/{id}/family-sessions/: psicoeducação familiar
- GET /api/dashboard/: indicadores consolidados (painel inicial)
- GET /api/docs/: Swagger UI protegido (requer autenticação)

## Boas práticas implementadas

- Senhas com mínimo de 10 caracteres e armazenamento seguro (set_password)
- Auditoria de todas as operações CRUD relevantes (AuditLog)
- Filtro automático por profissional logado em todas as consultas
- Rotação de refresh tokens habilitada (	oken_blacklist)
- Documentação automática (drf-spectacular)
- Layout responsivo (Tailwind + componentes reutilizáveis)
- Dashboard com série temporal gerada a partir de sessões reais

## Próximos passos sugeridos

1. Implementar fluxo de anexos (upload seguro) e armazenamento S3 equivalente
2. Automatizar matriz comparativa entre avaliações sequenciais (por escala)
3. Gerar PDFs dos relatórios via Celery + wkhtmltopdf
4. Implementar notificações assíncronas (e-mail/SMS) para reavaliações pendentes
5. Adicionar testes automatizados (pytest + React Testing Library)

Contribuições e melhorias são bem-vindas!
