# HomeFlow — סיכונים, הנחות והחלטות

## החלטות שאושרו

| נושא | החלטה |
|------|--------|
| Auth | Magic Link + סיסמה (Supabase Auth) |
| הזמנות | Owner נוצר ידנית (seed); Owner מזמין שותף מההגדרות; אין הרשמה ציבורית |
| פונט | Heebo |
| Accent | כחול עמוק `#1E4D6B` |
| Hosting | Vercel Hobby + כתובת `.vercel.app` |
| DB/Auth | Supabase Free |
| עלות | 0 ₪ — ללא AI בתשלום, ללא דומיין בתשלום |
| שפה | עברית RTL, ₪, Asia/Jerusalem |
| היקף נוכחי | Phase 0 docs + Phase 1 Foundation בלבד |

---

## הנחות עבודה

1. ב־MVP יש משק בית אחד ושני משתמשים פעילים.
2. הארכיטקטורה (`household_members`, splits) תומכת ב־N משתמשים בעתיד ללא redesign.
3. ייבוא קבצי אשראי מתבצע בדפדפן; הקובץ המקורי לא נשמר כברירת מחדל.
4. סיווג/תחזית/חריגות מבוססי חוקים מקומיים בלבד.
5. GitHub Repository פרטי + Vercel מחובר אליו.
6. משתמשים יודעים ליצור פרויקט Supabase ולמלא `.env.local`.
7. Soft delete נדרש בעיקר ל־`transactions`; שאר המחיקות יכולות להיות קשיחות עם ConfirmationDialog.
8. מטבע יחיד למשק בית ב־MVP (ILS).

---

## סיכונים טכניים

| סיכון | השפעה | הפחתה |
|-------|--------|--------|
| מגבלות Free של Supabase (Realtime, Storage, DB size) | קטיעות / מכסות | שימוש מינימלי ב־Realtime (קניות בלבד); ניקוי attachments; ניטור usage |
| מגבלות Vercel Hobby (serverless duration/bandwidth) | כשל ייצוא כבד | ייצוא client-side כשאפשר; פיצול פעולות |
| ייבוא Excel גדול במובייל | קריסת זיכרון | הגבלת גודל קובץ; עיבוד בשורות; הודעת שגיאה ברורה |
| PDF עברית RTL | תצוגה שבורה | הטמעת פונט עברית; בדיקות ויזואליות מוקדמות ב־Phase 9 |
| מורכבות RLS עם splits ו־joins | דליפת נתונים או באגים | פונקציית `is_household_member`; בדיקות הרשאות ב־Phase 2/10 |
| PWA + Next App Router | SW מורכב | שימוש בפתרון מתוחזק (`@ducanh2912/next-pwa` או מקביל) ב־Phase 10 |
| כפילות לוגיקה בין UI ל־finance | באגים בהתחשבנות | איסור חישובים ב־UI; unit tests ל־`lib/finance` |
| OneDrive/path בעברית בסביבת dev | בעיות כלי build | נתיבים יחסיים; בדיקת הרצה מקומית מוקדמת |

---

## החלטות שטרם נדרשות (יידחו לשלב הרלוונטי)

- ספקי אשראי ספציפיים לתבניות ייבוא מוכנות (Phase 7)
- ספריית PDF סופית (jsPDF מול pdf-lib) — בחירה ב־Phase 9 לפי תוצאות RTL
- אסטרטגיית offline מלאה מעבר למסך בסיסי (Phase 10)
- האם לאפשר למשתמש אחד מספר משקי בית (אחרי MVP)

---

## מה לא נעשה במכוון ב־Phase 1

- מסכי מוצר מלאים
- Migrations רצות על פרויקט Supabase חי
- Auth מלא / הזמנות
- לוגיקת finance / import / export
- PWA מלא
