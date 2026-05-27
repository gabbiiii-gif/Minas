# MinasCaixa — Livro Caixa Digital

Sistema desktop (Electron + React + TypeScript + Supabase) para o livro-caixa diário da **Minas Auto Peças** (Altamira/PA).

- **PC Caixa (operador):** lança vendas (dinheiro, pix, débito, crédito, promissória), recebe promissórias, registra despesas e fecha o dia com conferência tripla (caderno × físico × sistema). Operação 100% por atalhos de teclado (F1-F12).
- **PC ADM (admin):** acompanha totais ao vivo via Supabase Realtime, gerencia clientes/promissórias e gera relatórios PDF/XLSX.

> **Regra crítica:** recebimento de promissória **não** é receita do dia — relatórios separam receita nova de quitação de dívida.

## Stack

- Electron 32 (electron-vite) + React 18 + TypeScript 5 + Vite + Tailwind CSS 3 + shadcn/ui
- Supabase JS v2 (Postgres + Auth + Realtime + RLS) — backend único
- Zustand, Zod, TanStack Query, React Router 6, React Hook Form
- Recharts, react-pdf, SheetJS, Dexie (fila offline), node-thermal-printer (ESC/POS)
- Empacotamento: electron-builder (NSIS, Windows x64)

## Setup local

```powershell
cp .env.example .env
# preencha VITE_SUPABASE_URL e VITE_SUPABASE_ANON_KEY após criar o projeto Supabase
npm install
npm run dev
```

## Scripts

```
npm run dev           # Electron + Vite dev
npm test              # vitest unit
npm run test:e2e      # playwright e2e
npm run build         # build renderer + main + preload
npm run build:win     # NSIS installer (Windows x64)
npm run typecheck     # tsc noEmit (web + node)
npm run supabase:types  # regera src/types/database.ts via Supabase CLI
```

## Estrutura

```
electron/   processo Electron (main, preload, printer ESC/POS)
src/        renderer React
  lib/      utilities puros (money, date, supabase, rpc, offline-queue)
  stores/   Zustand (auth, caixa, network)
  schemas/  Zod
  pages/    Login + caixa/* + admin/*
  hooks/    useRealtimeTable, useKeyboardShortcut, useDailyTotals
  components/ ui (shadcn), layout, shared
supabase/migrations/  SQL versionado
tests/      vitest unit + playwright e2e
```

## Fases (ver `C:/Users/Gabriel/.claude/plans/use-a-skills-para-linked-thimble.md`)

1. Bootstrap (este commit)
2. Migrations + RLS + Seed
3. Tela Caixa + atalhos + Realtime
4. Promissórias + Impressora térmica
5. Despesas + Conferência + Fechamento
6. Dashboard ADM
7. Relatórios + Offline
8. Empacotamento NSIS
