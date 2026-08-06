# HomeFlow — Design System

## כיוון עיצובי

מינימליסטי, מודרני, רגוע ומקצועי — פיננסי אך לא בנקאי כבד.  
השראה כללית (לא העתקה): Linear, Notion, Stripe Dashboard, Vercel, Revolut, Copilot Money.

### עקרונות

- הרבה שטח לבן
- טיפוגרפיה ברורה והיררכיה חזקה
- ריווח עקבי לפי סולם
- גבולות דקים במקום צללים כבדים
- צבע Accent אחד רגוע
- לא יותר מדי כרטיסים מופרדים
- לא גרדיאנטים חזקים / אפקטים מוגזמים
- אנימציות קצרות (120–250ms), כיבוד `prefers-reduced-motion`

---

## טיפוגרפיה

**פונט יחיד:** [Heebo](https://fonts.google.com/specimen/Heebo) (תמיכה מלאה בעברית).

| Token | Size | Weight | שימוש |
|-------|------|--------|-------|
| `display` | 28–32px | 600 | כותרת עמוד ראשית |
| `title` | 20–22px | 600 | כותרת סעיף |
| `body` | 15–16px | 400 | טקסט גוף |
| `label` | 13–14px | 500 | תוויות שדות |
| `caption` | 12–13px | 400 | מטא־דאטה |
| `money` | לפי הקשר | 600 | סכומים כספיים |

מספרים כספיים: `₪1,250` (פורמט ישראלי). אדום רק לחריגה/שגיאה/חשד — לא לכל הוצאה.

---

## פלטת צבעים (Light)

| Token | Hex | שימוש |
|-------|-----|-------|
| `--background` | `#FAFAF9` | רקע ראשי |
| `--surface` | `#FFFFFF` | משטחים / פאנלים |
| `--secondary` | `#F4F4F5` | רקע משני |
| `--foreground` | `#18181B` | טקסט ראשי |
| `--muted-foreground` | `#71717A` | טקסט משני |
| `--border` | `#E4E4E7` | גבולות |
| `--accent` | `#1E4D6B` | פעולות ראשיות / קישורים |
| `--accent-foreground` | `#FFFFFF` | טקסט על Accent |
| `--success` | `#3F6F5B` | חיובי / הכנסה עדינה |
| `--warning` | `#B45309` | אזהרה |
| `--destructive` | `#B91C1C` | שגיאה / חריגה / מחיקה |

## Dark Mode

| Token | ערך משוער |
|-------|-----------|
| `--background` | `#121416` |
| `--surface` | `#1A1D21` |
| `--secondary` | `#22262B` |
| `--foreground` | `#F4F4F5` |
| `--muted-foreground` | `#A1A1AA` |
| `--border` | `#2E3338` |
| `--accent` | `#3D7A9E` (עדין יותר על רקע כהה) |

לא שחור מוחלט. ניגודיות מספקת ל־WCAG. גרפים חייבים להיות קריאים בשני המצבים.

---

## ריווח

סולם בלבד: **4 · 8 · 12 · 16 · 24 · 32 · 48** px.  
אין ריווחים שרירותיים מחוץ לסולם.

---

## Border Radius

| הקשר | Radius |
|------|--------|
| רכיבים קטנים (כפתור, input) | 8px |
| כרטיסים / פאנלים | 12px |
| מודאלים / sheets | 16px |

אין `rounded-full` על רוב הרכיבים (יוצא דופן: avatars).

---

## צללים

- ברירת מחדל: **גבול דק**, בלי צל.
- צל עדין רק ל־popover / dropdown / modal.

---

## אנימציות

| סוג | משך |
|-----|------|
| Fade / hover | 120–150ms |
| Modal open | 150–200ms |
| Progress / מספרים | עד 250ms |

אסור: קפיצות, parallax, אנימציות ארוכות.

---

## RTL

- `dir="rtl"` ברמת המסמך
- יישור טקסט לימין
- אייקונים ממוקמים נכון (לא שיקוף של מספרי כסף)
- תאריכים בפורמט ישראלי
- מטבע ברירת מחדל: ₪
- אזור זמן: Asia/Jerusalem

---

## רכיבים משותפים (יעד)

| רכיב | תפקיד |
|------|--------|
| AppShell | מעטפת desktop/mobile |
| Sidebar | ניווט desktop |
| MobileNavigation | Bottom nav (5 פריטים) |
| PageHeader | כותרת + פעולות |
| SummaryCard / MetricCard | מדדים מרכזיים |
| BudgetProgress | פס תקציב |
| TransactionRow / TransactionCard | שורת תנועה |
| EmptyState / LoadingSkeleton / ErrorState | מצבי UX |
| FilterBar / SearchInput / DateRangePicker | סינון |
| MoneyInput | קלט סכום |
| UserAvatarGroup | משתמשים |
| CategoryIcon / StatusBadge | ויזואליה |
| ConfirmationDialog | מחיקה / פעולות רגישות |
| ResponsiveTable | טבלה ↔ כרטיסים |
| ChartCard / AlertCard | גרפים והתראות |
| FileDropzone / ImportStepper | ייבוא |
| SplitExpenseEditor | חלוקת הוצאה |

אין ליצור רכיב חדש אם קיים דומה.

---

## Navigation

### Desktop — Sidebar

בית · תנועות · תקציב · קניות · התחשבנות · יעדי חיסכון · דוחות · ייבוא · הגדרות  
+ כפתור מרכזי **הוספת תנועה**

### Mobile — Bottom Nav (5)

בית · תנועות · הוספה · קניות · עוד

---

## מצבי UX (חובה לכל מסך)

Loading (skeletons) · Empty · Error · Success · Disabled · Mobile · Desktop

Empty state כולל הסבר קצר + CTA (למשל "הוסף הוצאה" / "ייבא דוח").

---

## נגישות

- ניווט מקלדת + focus ברור
- Labels / aria-labels
- ניגודיות מספקת
- לא להסתמך על צבע בלבד
- אזור לחיצה מינימלי במובייל (~44px)
- גרפים עם תיאור טקסטואלי
