# HomeFlow — ארכיטקטורת מערכת

## סקירה

HomeFlow היא מערכת Web פרטית לניהול משק בית משותף בין בני זוג (עם הרחבה עתידית למשפחות/שותפים).  
המערכת בנויה כ־**Next.js monolith** על Vercel, עם **Supabase** כשכבת Auth, PostgreSQL, Storage ו־Realtime.

**עלות יעד:** 0 ₪ בחודש (Vercel Hobby + Supabase Free).

---

## עקרונות מנחים

1. **שכבות ברורות** — UI / לוגיקה עסקית / גישת נתונים מופרדים.
2. **אין כפילות לוגיקה** — חישובים פיננסיים רק ב־`lib/finance`.
3. **כל נתון שייך ל־household** — isolation דרך `household_id` + RLS.
4. **אין AI בתשלום** — סיווג, תחזית וחריגות באמצעות חוקים מקומיים.
5. **פרטיות תחילה** — אין הרשמה ציבורית; אין שמירת CVV / מספר כרטיס מלא.
6. **איכות על פני כמות** — MVP צר ומלוטש לפני הרחבת פיצ'רים.

---

## Stack

| שכבה | טכנולוגיה |
|------|-----------|
| Frontend | Next.js (App Router), React, TypeScript, Tailwind, shadcn/ui, Lucide, Recharts, TanStack Table, RHF + Zod |
| Backend | Server Actions, Route Handlers, Server Components |
| Data | Supabase PostgreSQL + RLS |
| Auth | Supabase Auth (Magic Link + Password) |
| Files | Supabase Storage (private buckets) |
| Realtime | Supabase Realtime (קניות) |
| Hosting | Vercel Hobby (`.vercel.app`) |
| PWA | Manifest + service worker (Phase 10) |

---

## שכבות המערכת

```text
┌─────────────────────────────────────────┐
│  UI Layer                               │
│  app/ · components/ · features/*/ui     │
├─────────────────────────────────────────┤
│  Application Layer                      │
│  Server Actions · Route Handlers        │
├─────────────────────────────────────────┤
│  Business Logic                         │
│  lib/finance · lib/import · lib/export  │
│  lib/validation (Zod)                   │
├─────────────────────────────────────────┤
│  Data Access                            │
│  lib/supabase (clients + queries)       │
├─────────────────────────────────────────┤
│  Supabase                               │
│  Auth · Postgres+RLS · Storage · RT     │
└─────────────────────────────────────────┘
```

### גבולות אחריות

| שכבה | מותר | אסור |
|------|------|------|
| UI Components | הצגה, אינטראקציה, קריאה ל־actions/hooks | שאילתות Supabase ישירות, חישובי חוב |
| Server Actions | אימות Zod, orchestration, קריאה ל־DAL/finance | לוגיקת UI, חשיפת service role |
| `lib/finance` | פונקציות טהורות ניתנות לבדיקה | גישה ל־DB או React |
| `lib/supabase` | clients, queries, types מ־DB | לוגיקת UI, חישובים עסקיים מורכבים |

---

## מודולים (Features)

| מודול | אחריות | Phase |
|-------|--------|-------|
| `auth` | התחברות, הזמנות, פרופיל, הגנת routes | 2 |
| `dashboard` | סיכומים, גרפים, תנועות אחרונות, התראות | 4 |
| `transactions` | הכנסות/הוצאות, חלוקה, סינון | 3 |
| `budgets` | תקציבים חודשיים וקטגוריות | 5 |
| `settlements` | התחשבנות, סגירת חוב | 5 |
| `shopping` | רשימות קניות + Realtime | 6 |
| `imports` | Excel/CSV, מיפוי, תצוגה מקדימה | 7 |
| `savings` | יעדי חיסכון והפקדות | 5+ |
| `reports` | דוחות, Excel, PDF | 9 |
| `settings` | משק בית, קטגוריות, מראה, פרטיות | 2+ |

---

## סוגי משתמשים והרשאות

### תפקידים ב־`household_members.role`

| Role | יכולות |
|------|--------|
| `owner` | הכל + הזמנת משתמשים + מחיקת משק בית |
| `member` | קריאה/כתיבה בכל נתוני המשק; ללא ניהול הזמנות קריטיות |

ב־MVP: שני משתמשים — owner + member. הארכיטקטורה תומכת ב־N חברים.

### כללי גישה

1. אין הרשמה ציבורית.
2. משתמש נכנס רק אם הוזמן / נוצר ע״י owner (או seed ראשוני).
3. משתמש רואה רק `household_id` שאליו הוא משויך.
4. RLS על כל טבלה עם נתוני משק בית.
5. Service Role Key רק בשרת (לא בדפדפן).

---

## זרימת מידע (גבוהה)

```text
User → Page (RSC/Client)
     → Server Action
     → Zod validate
     → lib/finance (אם נדרש)
     → lib/supabase query
     → Postgres RLS
     → Response / Revalidate
```

ייבוא Excel: עיבוד ב־**דפדפן** → תצוגה מקדימה → אישור → Server Action שומר עסקאות בלבד (לא קובץ מקור כברירת מחדל).

קניות: Client ↔ Supabase Realtime על `shopping_items`.

---

## מבנה תיקיות

```text
src/
├── app/
│   ├── (auth)/
│   ├── (dashboard)/
│   ├── api/
│   └── layout.tsx
├── components/
│   ├── ui/          # shadcn primitives
│   ├── layout/      # AppShell, Sidebar, MobileNav
│   ├── charts/
│   └── shared/      # EmptyState, MetricCard, ...
├── features/        # feature-scoped UI + hooks
├── lib/
│   ├── supabase/
│   ├── finance/
│   ├── import/
│   ├── export/
│   ├── validation/
│   └── utils/
├── hooks/
├── types/
├── constants/
└── styles/
```

---

## הרחבה עתידית

- יותר מ־2 חברי משק בית (splits באחוזים/סכומים כבר תומכים ב־N).
- מספר משקי בית למשתמש אחד.
- התראות Push (בתוך מגבלות חינמיות).
- תבניות ייבוא לספקי אשראי נוספים.

אין לשנות stack ללא סיבה מוצדקת ומתועדת.

---

## קשר למסמכים נוספים

- Design System → [`design-system.md`](./design-system.md)
- Database → [`database-schema.md`](./database-schema.md)
- Roadmap → [`roadmap.md`](./roadmap.md)
- User flows → [`user-flows.md`](./user-flows.md)
- Risks → [`risks-and-assumptions.md`](./risks-and-assumptions.md)
