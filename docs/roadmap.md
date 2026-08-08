# HomeFlow — Roadmap

## סטטוס כללי

Phases 1–10 מומשו בקוד. יש להריץ את כל קבצי ה־SQL ב־Supabase לפי הסדר.

---

## Phase 1 — Foundation — הושלם
## Phase 2 — Authentication — הושלם
## Phase 3 — Transactions — הושלם
## Phase 4 — Dashboard — הושלם
## Phase 5 — Budgets and Settlements — הושלם
## Phase 6 — Shopping — הושלם
## Phase 7 — Excel Import — הושלם
## Phase 8 — Forecast and Detection — הושלם (אלגוריתמים + דוחות)
## Phase 9 — Reports — הושלם
## Phase 10 — PWA and Polish — הושלם (manifest + SW + offline)
## Phase 11 — Receipt Intelligence — Beta (UI + API; דורש GEMINI_API_KEY + מיגרציית receipt_items)
## Phase 12 — Supermarket prices (Shufersal) — Adapter + schema (Cerberus/Rami Levi blocked until login works)

---

## Migrations להרצה

1. `20260307000000_phase2_auth.sql`
2. `20260307000100_phase3_transactions.sql`
3. `20260307000200_phase4_budgets.sql` ← **חובה לתקציבים** (אם חסר — מסך תקציב ריק)
4. `20260307000300_phases_5_to_8.sql`

לאחר מכן ב־Supabase (אופציונלי ל־Realtime קניות):
`alter publication supabase_realtime add table public.shopping_items;`

מסכי Phase 5 באתר: `/budgets` · `/settlements` · `/savings`
