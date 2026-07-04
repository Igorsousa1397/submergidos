# Submergidos — Estrutura

App Router + Supabase, organizado por feature (não monolito).

```
submergidos/
├─ middleware.ts                  # renova sessão + protege rotas
├─ src/
│  ├─ app/
│  │  ├─ login/                   # público
│  │  ├─ inscricao/               # público (inscrição do encontrista)
│  │  └─ (dashboard)/             # protegido — shell + telas internas
│  │     ├─ layout.tsx            # nav + guarda de auth
│  │     └─ encontristas/page.tsx # exemplo de tela (Server Component)
│  ├─ features/                   # 1 pasta por domínio
│  │  └─ encontristas/
│  │     ├─ queries.ts            # leitura (server-only)
│  │     ├─ actions.ts            # mutations (Server Actions)
│  │     └─ components/           # UI da feature
│  └─ lib/
│     ├─ supabase/                # clients SSR (client/server/middleware)
│     ├─ database.types.ts        # tipos do schema
│     ├─ permissions.ts           # espelha flags de roles
│     └─ constants.ts             # status, sexo, dias, regras
```

## Padrão por feature (replicar nas demais)
1. `queries.ts` — toda leitura, retorna tipado.
2. `actions.ts` — toda escrita com "use server" + revalidatePath.
3. `components/` — Server Components buscam, Client Components ("use client") interagem.
4. `app/(dashboard)/<rota>/page.tsx` — fina; só compõe.

## Telas a portar (do core Encontro com Deus)
Welcome/Inscrição · Encontristas · Dashboard · Servos · Tela do Servo ·
Check-in · Quartos · Back Office (Perfis/Escalas/Funções) · Cartas ·
Ocorrências · Ônibus · Avisos · Agenda · Push.

## Setup
1. Rodar `submergidos_0001_init.sql` no Supabase.
2. `cp .env.local.example .env.local` e preencher.
3. `npm install && npm run dev`.
4. (opcional) `npm run gen:types` para regenerar os tipos do banco.
