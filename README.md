# HomeFlow

מערכת Web פרטית לניהול משק בית משותף.

**Phase נוכחי:** MVP מלא (Phases 1–10 בקוד)

## התקנה מהירה

```powershell
npm install
copy .env.example .env.local
```

מלאו מפתחות Supabase, ואז ב־SQL Editor הריצו לפי הסדר את כל הקבצים ב־`supabase/migrations/`.

Redirect: `http://localhost:3000/auth/callback`

```powershell
npm run dev
```

## מסכים

בית · תנועות · תקציב · קניות · התחשבנות · חיסכון · דוחות · ייבוא · קבלה (Beta) · הגדרות

## הערות

- `npm run dev` רץ עם `--use-system-ca` (תיקון SSL ב־Windows)
- PWA: manifest + service worker בסיסי
- PDF בעברית מלאה דורש הטמעת פונט — כרגע PDF באנגלית בסיסית; Excel מלא
- Realtime לקניות: הוסיפו את `shopping_items` ל־publication ב־Supabase
- סריקת קבלות (Beta): `GEMINI_API_KEY` בשרת + הרצת `20260307000400_receipt_items.sql`
