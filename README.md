# NexColetas — Logística de Coletas Urbanas (Fase 01 — Foundation / Core Platform)

Plataforma SaaS multi-tenant de logística inteligente, coletas urbanas, entregas rápidas e operações regionais com base inicial em **Manhuaçu — MG, Brasil**.

---

## 1. Identidade Visual Oficial & Sistema de Temas

A plataforma respeita rigorosamente o manual oficial da marca **NexColetas**:

- **Verde Floresta:** `#0B2E1E`
- **Verde Principal:** `#166534`
- **Verde Vivo:** `#22C55E`
- **Verde Limão:** `#84CC16`
- **Verde Claro:** `#F1FDF4`
- **Grafite:** `#111827`
- **Tipografia:** `Montserrat` (Títulos, logotipo textual, headlines e números principais `tabular-nums`) e `Inter` (Interface, tabelas, menus e formulários).

### 3 Temas Globais Persistentes (Tokens CSS)
1. **THEME GREEN (Verde — Padrão):** Background `#F1FDF4`, Surface `#FFFFFF`, Primary `#166534`, Accent `#22C55E`, Highlight `#84CC16`.
2. **THEME WHITE (Branco — Corporativo):** Background `#FFFFFF`, Surface `#F8FAFC`, Primary `#166534`, Borders `#E2E8F0`.
3. **THEME NIGHT (Noite — Escuro Premium):** Background `#030712`, Surface `#111827`, Surface Secondary `#1F2937`, Primary `#22C55E`, Accent `#84CC16`.

---

## 2. Arquitetura Modular (Frontend, Backend & Shared)

```text
/
├── backend/
│   └── src/
│       ├── middleware/
│       │   ├── auth.ts             # Firebase Auth + Isolamento Multi-Tenant e RBAC
│       │   └── security.ts         # Rate limiting, cabeçalhos HTTP e sanitização
│       ├── routes/
│       │   └── api.ts              # Rotas REST Multi-Tenant (/api/*)
│       └── services/
│           ├── dataService.ts      # Repositório Drizzle ORM isolado por Tenant
│           └── googleIntegrations.ts # Camada Google Maps, Gemini AI e Firebase
├── shared/
│   ├── constants/index.ts          # Paleta, Roles, Tenants e Bairros de Manhuaçu - MG
│   ├── types/index.ts              # Contratos TypeScript compartilhados
│   └── validators/
│       ├── smartData.ts            # NexColetas Smart Data (CPF, CNPJ, CEP, Telefone, Data, BRL)
│       └── smartData.test.ts       # Testes unitários automatizados (node:test)
├── src/
│   ├── app/TenantAuthContext.tsx   # Contexto Multi-Tenant e autenticação Firebase
│   ├── components/
│   │   ├── brand/NexColetasLogo.tsx # 4 variantes oficiais de logo (horizontal, symbol, light-bg, dark-bg)
│   │   ├── layout/NexControlLayout.tsx # Sidebar desktop colapsável + Drawer mobile (11 módulos)
│   │   └── ui/DesignSystem.tsx     # 28 componentes reutilizáveis do Design System
│   ├── db/
│   │   ├── schema.ts               # Schema relacional Drizzle (users, companies, pickups, audit_logs...)
│   │   ├── drizzle.config.ts       # Configuração de migrations
│   │   ├── index.ts                # Pool de conexões (Object Method)
│   │   └── users.ts                # Sincronização segura de usuários
│   ├── features/                   # 11 Módulos do NexColetas Control
│   ├── hooks/usePWAInstall.ts      # Instalação PWA e status de conectividade
│   ├── services/apiClient.ts       # Cliente REST com headers de isolamento de Tenant
│   └── theme/ThemeContext.tsx      # ThemeProvider com persistência e zero flash
└── server.ts                       # Servidor Full-Stack Express + Vite
```

---

## 3. Configuração de Variáveis de Ambiente

Copie `.env.example` para `.env` e configure conforme necessário:

- `SQL_HOST`, `SQL_USER`, `SQL_PASSWORD`, `SQL_DB_NAME`, `SQL_ADMIN_USER`, `SQL_ADMIN_PASSWORD`: provisionados automaticamente pelo Cloud SQL no AI Studio (e preparado para `MYSQL_*` na hospedagem futura Hostinger).
- `GEMINI_API_KEY`: chave server-side para triagem operacional com Gemini AI.
- `VITE_GOOGLE_MAPS_API_KEY` / `GOOGLE_MAPS_SERVER_API_KEY`: chaves para ativação visual do Google Maps Platform.
