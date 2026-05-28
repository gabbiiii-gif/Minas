# Como Rodar — MinasCaixa

## Pré-requisitos

- Node.js 20+ (LTS)
- npm 10+
- Windows 10/11 (build alvo)

## 1) Instalar dependências

```powershell
npm install
```

Tempo estimado: 2-3 min. Instala Electron 32, React 18, Supabase JS v2, Tailwind, Zustand, Zod, etc.

## 2) Configurar Supabase

Projeto já criado:
- **URL:** `https://mwyzixmpmjpbfuhvkyhi.supabase.co`
- **Region:** sa-east-1 (São Paulo)
- **Project ID:** `mwyzixmpmjpbfuhvkyhi`

`.env` já preenchido. Migrations aplicadas (0001-0006). Seed rodado.

### Credenciais de teste (TROCAR EM PRODUÇÃO)

| Email | Senha | Role |
|---|---|---|
| `operador@minas.local` | `TrocarLogo!2026` | operador |
| `admin@minas.local` | `TrocarLogo!2026` | admin |

## 3) Rodar dev

```powershell
npm run dev
```

Abre janela Electron, login, vai pra `/caixa`. Admin redirecionado pra `/admin`.

## 4) Atalhos do Caixa

| Tecla | Ação |
|---|---|
| F1 | Venda Dinheiro |
| F2 | Venda Pix |
| F3 | Venda Débito |
| F4 | Venda Crédito |
| F5 | Nova Promissória |
| F8 | Despesa |
| F9 | Receber Promissória |
| F12 | Fechar Caixa |
| ENTER | Confirmar (em modais) |
| ESC | Cancelar (em modais) |

## 5) Conferência tripla (F12)

3 colunas:
- **SISTEMA**: calculado automaticamente (vendas + recebimentos − despesas)
- **CADERNO**: operador digita o que registrou no caderno físico
- **FÍSICO**: operador digita o que contou em dinheiro / extrato

Se qualquer diferença ≠ 0, é obrigatório preencher observação antes de fechar.

## 6) Build Windows

```powershell
npm run build:win
```

Gera `release/0.1.0/MinasCaixa-Setup-0.1.0.exe` (instalador NSIS x64).

## 7) Realtime ADM ↔ Caixa

Cada lançamento no PC Caixa aparece no Dashboard ADM em ≤2s via Supabase Realtime, sem refresh.

## 8) Regras de ouro

1. **NUNCA** DELETE físico em registros financeiros — apenas soft-delete (`deleted_at`).
2. Valores em **centavos (bigint)** no banco; UI converte só na exibição.
3. Recebimento de promissória **não é receita nova** — separado em card próprio.
4. Caixa fechado bloqueia lançamentos retroativos (trigger Postgres).
5. RLS bloqueia operador de ver/lançar em dia ≠ hoje (admin tem acesso total).

## 9) Troubleshoot Windows — Smart App Control

Se `npm run build:web` falhar com:

```
Cannot find module @rollup/rollup-win32-x64-msvc
Uma política de Controle de Aplicativos bloqueou este arquivo.
```

É o **Smart App Control** (ou App Locker) bloqueando a binary nativa do Rollup.
Opções:

1. **Desativar Smart App Control** (Configurações > Privacidade > Segurança Windows > Controle de Aplicativos > Desativar — exige reboot, irreversível na sessão).
2. **Mover projeto pra fora de OneDrive** (`C:\dev\minascaixa`). OneDrive + SAC interagem mal com binários nativos.
3. **Confiar no Vercel** — cloud roda Linux, sem esse bloqueio. Para dev local use `npm run dev:web` (esbuild, não Rollup native) — funciona sem build.

## 10) Pendências futuras (fora MVP)

- Impressora térmica ESC/POS (`electron/printer.ts` é stub — integrar `node-thermal-printer` após validar modelo).
- Exportação PDF (atual exporta CSV — instalar `@react-pdf/renderer` ou `jspdf` quando necessário).
- Fila offline (Dexie) — internet da loja é estável, baixa prioridade.
- Comparativos com Recharts (dashboard hoje só mostra dia atual).
- Auto-update via `electron-updater`.
