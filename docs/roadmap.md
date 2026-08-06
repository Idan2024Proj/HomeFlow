# HomeFlow — Roadmap

## כללי מעבר בין Phases

לפני סימון Phase כהושלם:

1. TypeScript עובר
2. Lint עובר
3. Tests רלוונטיים עוברים (מה־Phase שבו נוספו)
4. בדיקת Mobile + Desktop
5. בדיקת RTL + Dark Mode
6. בדיקת הרשאות / Empty / Error / Loading
7. אין שגיאות Console קריטיות

אין לדלג לשלב הבא עם כשלים פתוחים.

---

## Phase 1 — Foundation (נוכחי)

- Next.js App Router + TypeScript strict
- Tailwind + shadcn/ui
- ESLint + Prettier
- מבנה תיקיות
- Design tokens (Heebo, light/dark)
- Supabase client scaffold
- `.env.example` + README
- מסמכי ארכיטקטורה ב־`docs/`

**Done when:** האפליקציה עולה ב־RTL בסיסי, tsc+lint ירוקים, אין secrets ב־Git.

---

## Phase 2 — Authentication

- Magic Link + Password
- Profiles + Households
- הזמנות (Owner מזמין)
- RLS מלא על טבלאות הבסיס
- Route protection (middleware)
- מסך התחברות מינימליסטי

**Done when:** שני משתמשים מוזמנים רואים את אותו משק בית; משתמש לא מורשה נחסם.

---

## Phase 3 — Transactions

- הכנסות / הוצאות
- קטגוריות + אמצעי תשלום
- חלוקה: אישי / 50-50 / אחוזים / סכומים
- חיפוש, סינון, מיון
- מסך תנועות (טבלה + כרטיסים במובייל)

**Done when:** אפשר ליצור/לערוך תנועה עם paid_by ו־split.

---

## Phase 4 — Dashboard

- שורת סיכום: הכנסות, הוצאות, יתרה, תחזית בסיסית
- גרף הוצאות חודשי
- חלוקה לקטגוריות
- תקציבים (top 3)
- תנועות אחרונות
- עד 3 התראות

**Done when:** Dashboard קריא ב־desktop ו־mobile עם empty/loading states.

---

## Phase 5 — Budgets and Settlements

- תקציבים לפי קטגוריה + כולל
- חישוב חוב מצטבר
- סגירת חוב (settlements)
- היסטוריה חודשית
- יעדי חיסכון בסיסיים

**Done when:** מסך התחשבנות מציג "מי חייב למי" בצורה ברורה.

---

## Phase 6 — Shopping

- רשימות + פריטים
- Realtime sync
- מצב קנייה למובייל
- יצירת הוצאה מסיום קנייה

**Done when:** שני משתמשים מסמנים פריטים בזמן אמת.

---

## Phase 7 — Excel Import

- העלאה + קריאה בדפדפן
- מיפוי עמודות (אוטומטי + ידני)
- ניקוי, תצוגה מקדימה, כפילויות
- שמירת תבנית מיפוי
- שמירה רק לאחר אישור

**Done when:** ייבוא CSV/XLSX עם אישור משתמש ומניעת כפילות.

---

## Phase 8 — Forecast and Detection

- תחזית סוף חודש (חסכוני / רגיל / גבוה)
- זיהוי תשלומים חוזרים
- זיהוי כפילויות
- זיהוי חריגות
- המלצות חיסכון מבוססות חוקים

**Done when:** אלגוריתמים טהורים עם unit tests + הצגה ב־UI.

---

## Phase 9 — Reports

- דוחות חודשי / שנתי / מותאם
- ייצוא Excel (גיליונות מרובים)
- ייצוא PDF בעברית RTL
- פילטרים וגרפים

**Done when:** ייצוא Excel+PDF עובד לתקופה נבחרת.

---

## Phase 10 — PWA and Polish

- Manifest + icons + standalone
- Offline בסיסי
- Dark Mode מלוטש
- Accessibility
- Performance
- Mobile polish + אנימציות
- QA מלא לפי רשימת הבדיקות

**Done when:** ניתן להתקין כ־PWA ומסלול MVP המלא עובד.

---

## MVP — הגדרת מוכנות

המערכת מוכנה לשימוש יומיומי כש:

1. שני משתמשים מתחברים לאותו משק בית  
2. מוסיפים הכנסות והוצאות עם מי שילם ואישי/משותף  
3. רואים מי חייב למי  
4. מגדירים תקציב ורואים Dashboard  
5. מנהלים רשימת קניות  
6. מייבאים Excel/CSV עם אישור  
7. מייצאים ל־Excel  
8. עובדים במחשב ובטלפון + התקנת PWA  

עדיפות: איכות ובהירות על פני כמות פיצ'רים.
