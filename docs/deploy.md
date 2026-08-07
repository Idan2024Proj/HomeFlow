# פריסת HomeFlow + שני חשבונות

## א. העלאה ל־Vercel (חינם)

### אפשרות מומלצת — דרך האתר

1. היכנסו ל־[vercel.com](https://vercel.com) והתחברו עם GitHub.
2. צרו Repository פרטי ב־GitHub והעלו את הקוד (או חברו את התיקייה).
3. ב־Vercel: **Add New Project** → בחרו את הריפו.
4. הוסיפו Environment Variables (Production):

| שם | ערך |
|----|-----|
| `NEXT_PUBLIC_SUPABASE_URL` | כמו ב־`.env.local` |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | כמו ב־`.env.local` |
| `SUPABASE_SERVICE_ROLE_KEY` | כמו ב־`.env.local` |
| `NEXT_PUBLIC_APP_URL` | `https://YOUR-PROJECT.vercel.app` (אחרי שיש כתובת) |
| `ALLOW_BOOTSTRAP_SIGNUP` | `true` רק בפעם הראשונה, אחר כך `false` |

5. Deploy → קבלו כתובת `.vercel.app`.

### CLI (אופציונלי)

```powershell
npx vercel login
npx vercel
npx vercel --prod
```

---

## ב. עדכון Supabase לכתובת האונליין

ב־Supabase → Authentication → URL Configuration:

- **Site URL:** `https://YOUR-PROJECT.vercel.app`
- **Redirect URLs:** הוסיפו  
  `https://YOUR-PROJECT.vercel.app/auth/callback`  
  (אפשר להשאיר גם `http://localhost:3000/auth/callback` לפיתוח)

ודאו שכל ה־migrations הורצו (קבצים ב־`supabase/migrations/`).

---

## ג. יצירת שני החשבונות (אתה + בת הזוג)

1. פתחו את האתר האונליין → `/login`.
2. תחת **הרשמה עם הזמנה** / או סיסמה — צרו את **החשבון שלך** (Owner).
3. אם אין משק בית: מסך `/onboarding` → צרו משק בית.
4. היכנסו ל־**הגדרות** → **הזמנת שותף** → הזינו את המייל של בת הזוג.
5. היא נרשמת עם **אותו מייל שהוזמן** (הרשמה עם הזמנה / קישור במייל).
6. שניכם תראו את אותו משק בית.

אחרי ששניכם בפנים: ב־Vercel שימו `ALLOW_BOOTSTRAP_SIGNUP=false` ו־Redeploy.
