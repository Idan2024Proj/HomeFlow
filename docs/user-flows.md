# HomeFlow — זרימות משתמש

## 1. הזמנה והתחברות ראשונה

```text
[Admin/Seed] יוצר Owner ב־Supabase Auth
    → נוצרת שורת profiles
    → נוצר household
    → נוצר household_members (role=owner, status=active)

Owner נכנס להגדרות → מזמין שותף (אימייל)
    → נוצרת רשומת member עם status=invited
    → נשלח מייל הזמנה / קישור הרשמה סגור

שותף לוחץ על קישור / מתחבר לראשונה
    → אם האימייל תואם הזמנה → status=active, user_id נקשר
    → אחרת → נדחה (אין הרשמה ציבורית)

שני המשתמשים רואים אותו household_id
```

### התחברות יומיומית

1. מסך Login  
2. סיסמה **או** Magic Link  
3. Middleware בודק session  
4. הפניה ל־Dashboard  
5. כשל → הודעת שגיאה ברורה  

---

## 2. הוספת הוצאה משותפת

```text
משתמש לוחץ [+ תנועה]
  → טופס: סכום, בית עסק, קטגוריה, תאריך, מי שילם, משותף
  → (אופציונלי) חלוקה מותאמת ב־SplitExpenseEditor
  → Server Action + Zod
  → יצירת transaction + transaction_splits
  → activity_log
  → רענון רשימות / Dashboard
```

הוצאה אישית: `is_shared=false`, split יחיד על המשתמש שבחר.

---

## 3. התחשבנות

```text
מסך Settlements טוען תנועות משותפות לתקופה
  → lib/finance מחשב לכל חבר: שילם בפועל vs חלקו
  → יתרה נטו: מי חייב למי
  → תצוגה: "X צריך לקבל ₪Y" או "מאוזן"
  → [סגירת חוב] → יצירת settlement + אישור
  → יתרה מתעדכנת
```

---

## 4. תקציב חודשי

```text
הגדרת סכום לקטגוריה / כולל
  → שמירה ב־budgets
  → Dashboard/Budgets מציגים spent / remaining / % / status
  → חריגה → anomaly_alert או indicator אדום עדין
```

---

## 5. ייבוא דוח אשראי

```text
בחירת קובץ (xlsx/csv) בדפדפן
  → בדיקת סוג/גודל
  → קריאה ב־SheetJS (client)
  → זיהוי כותרות + מיפוי אוטומטי / ידני
  → ניקוי תאריכים/סכומים/זיכויים
  → סיווג לפי merchant_rules
  → fingerprint → סימון כפילויות
  → תצוגה מקדימה (ללא שמירה ל־DB של עסקאות)
  → אישור משתמש
  → Server Action שומר transactions + batch metadata
  → קובץ מקור לא נשמר (default)
  → שמירת תבנית מיפוי ב־app_settings
```

---

## 6. רשימת קניות + Realtime

```text
יצירת רשימה / בחירת רשימה
  → הוספת פריט
  → סימון is_checked (Realtime לצד השני)
  → מצב קנייה במובייל
  → [סיום קנייה] → סיכום מחירים משוערים
  → אופציה: יצירת הוצאה מתנועת הקנייה
```

---

## 7. דוח וייצוא

```text
בחירת תקופה + סוג דוח
  → שליפת נתונים דרך DAL
  → הצגת סיכומים וגרפים
  → Excel: ExcelJS (גיליונות מרובים)
  → PDF: jsPDF/pdf-lib + פונט עברית RTL
  → הורדה ללקוח
```

---

## 8. משתמש לא מורשה

```text
ניסיון גישה ל־/(dashboard) ללא session → /login
ניסיון עם session ללא membership → מסך "אין גישה" / logout
ניסיון API/Action על household זר → RLS דוחה + error
```
