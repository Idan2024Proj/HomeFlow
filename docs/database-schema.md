# HomeFlow — סכמת מסד נתונים

## עקרונות

- כל מזהה ראשי: `uuid` (default `gen_random_uuid()`)
- `created_at timestamptz` בכל טבלה
- `updated_at timestamptz` היכן שרלוונטי (trigger)
- `household_id` בכל נתון השייך למשק בית
- `created_by` היכן שיש יוצר אנושי
- Soft delete רק כשיש צורך אמיתי (`deleted_at`)
- RLS על כל הטבלאות הרגישות
- אין שמירת מספר כרטיס מלא / CVV — לכל היותר 4 ספרות אחרונות

---

## ER (לוגי)

```text
auth.users
    └── profiles (1:1)
            └── household_members (N) ── households (1)
                    ├── transactions ── transaction_splits
                    ├── categories
                    ├── merchants ── merchant_rules
                    ├── payment_methods
                    ├── budgets
                    ├── recurring_payments
                    ├── savings_goals ── savings_contributions
                    ├── shopping_lists ── shopping_items
                    ├── import_batches ── imported_rows
                    ├── anomaly_alerts
                    ├── settlements
                    ├── attachments
                    ├── activity_logs
                    ├── notifications
                    └── app_settings
```

---

## טבלאות

### profiles

| עמודה | טיפוס | הערות |
|-------|--------|--------|
| id | uuid PK | = `auth.users.id` |
| email | text | |
| full_name | text | |
| avatar_url | text null | |
| preferred_locale | text | default `he` |
| created_at / updated_at | timestamptz | |

### households

| עמודה | טיפוס | הערות |
|-------|--------|--------|
| id | uuid PK | |
| name | text | |
| currency | text | default `ILS` |
| timezone | text | default `Asia/Jerusalem` |
| created_by | uuid FK → profiles | |
| created_at / updated_at | timestamptz | |

### household_members

| עמודה | טיפוס | הערות |
|-------|--------|--------|
| id | uuid PK | |
| household_id | uuid FK | |
| user_id | uuid FK → profiles | |
| role | text | `owner` \| `member` |
| display_name | text | |
| invite_email | text null | להזמנות ממתינות |
| status | text | `active` \| `invited` \| `removed` |
| invited_by | uuid null | |
| joined_at | timestamptz null | |
| created_at / updated_at | timestamptz | |

**Unique:** `(household_id, user_id)` היכן ש־user_id לא null; `(household_id, invite_email)` להזמנות.

### categories

| עמודה | טיפוס | הערות |
|-------|--------|--------|
| id | uuid PK | |
| household_id | uuid FK | |
| name | text | |
| kind | text | `expense` \| `income` \| `both` |
| icon | text null | |
| color | text null | |
| is_system | boolean | default false |
| sort_order | int | |
| created_at / updated_at | timestamptz | |

**Unique:** `(household_id, name)`

### merchants

| עמודה | טיפוס | הערות |
|-------|--------|--------|
| id | uuid PK | |
| household_id | uuid FK | |
| name | text | |
| normalized_name | text | לזיהוי כפילויות/מנויים |
| default_category_id | uuid null FK | |
| created_at / updated_at | timestamptz | |

**Index:** `(household_id, normalized_name)`

### merchant_rules

| עמודה | טיפוס | הערות |
|-------|--------|--------|
| id | uuid PK | |
| household_id | uuid FK | |
| pattern | text | התאמת שם בית עסק |
| match_type | text | `contains` \| `exact` \| `starts_with` |
| category_id | uuid FK | |
| priority | int | |
| created_at / updated_at | timestamptz | |

### payment_methods

| עמודה | טיפוס | הערות |
|-------|--------|--------|
| id | uuid PK | |
| household_id | uuid FK | |
| name | text | |
| type | text | `cash` \| `credit` \| `debit` \| `transfer` \| `other` |
| last_four | char(4) null | |
| owner_user_id | uuid null | מי מחזיק באמצעי |
| is_active | boolean | |
| created_at / updated_at | timestamptz | |

### transactions

| עמודה | טיפוס | הערות |
|-------|--------|--------|
| id | uuid PK | |
| household_id | uuid FK | |
| type | text | `expense` \| `income` |
| amount | numeric(12,2) | תמיד חיובי; כיוון לפי type |
| currency | text | default ILS |
| occurred_on | date | תאריך עסקה |
| charged_on | date null | תאריך חיוב |
| merchant_id | uuid null | |
| merchant_name | text | snapshot |
| category_id | uuid null | |
| payment_method_id | uuid null | |
| paid_by | uuid FK → profiles | |
| split_mode | text | `personal` \| `equal` \| `percent` \| `custom` |
| is_shared | boolean | |
| note | text null | |
| tags | text[] | |
| installment_count | int null | |
| installment_number | int null | |
| parent_transaction_id | uuid null | קישור תשלומים |
| import_batch_id | uuid null | |
| external_fingerprint | text null | למניעת כפילות ייבוא |
| status | text | `confirmed` \| `pending` \| `excluded` |
| created_by | uuid | |
| created_at / updated_at | timestamptz | |
| deleted_at | timestamptz null | soft delete |

**Checks:** `amount > 0`  
**Indexes:** `(household_id, occurred_on desc)`, `(household_id, category_id)`, `(household_id, external_fingerprint)` unique partial

### transaction_splits

| עמודה | טיפוס | הערות |
|-------|--------|--------|
| id | uuid PK | |
| household_id | uuid FK | |
| transaction_id | uuid FK | |
| user_id | uuid FK | |
| share_amount | numeric(12,2) | |
| share_percent | numeric(5,2) null | |
| created_at | timestamptz | |

**Unique:** `(transaction_id, user_id)`  
**Check:** `share_amount >= 0`

### budgets

| עמודה | טיפוס | הערות |
|-------|--------|--------|
| id | uuid PK | |
| household_id | uuid FK | |
| category_id | uuid null | null = תקציב כולל |
| year | int | |
| month | int | 1–12 |
| amount | numeric(12,2) | |
| created_by | uuid | |
| created_at / updated_at | timestamptz | |

**Unique:** `(household_id, category_id, year, month)`

### recurring_payments

| עמודה | טיפוס | הערות |
|-------|--------|--------|
| id | uuid PK | |
| household_id | uuid FK | |
| name | text | |
| amount | numeric(12,2) | |
| category_id | uuid null | |
| merchant_id | uuid null | |
| frequency | text | `monthly` \| `weekly` \| `yearly` |
| next_due_on | date | |
| paid_by | uuid null | |
| is_active | boolean | |
| detected_automatically | boolean | |
| created_at / updated_at | timestamptz | |

### savings_goals

| עמודה | טיפוס | הערות |
|-------|--------|--------|
| id | uuid PK | |
| household_id | uuid FK | |
| name | text | |
| target_amount | numeric(12,2) | |
| current_amount | numeric(12,2) | denormalized או מחושב |
| target_date | date null | |
| created_by | uuid | |
| created_at / updated_at | timestamptz | |

### savings_contributions

| עמודה | טיפוס | הערות |
|-------|--------|--------|
| id | uuid PK | |
| household_id | uuid FK | |
| goal_id | uuid FK | |
| amount | numeric(12,2) | |
| contributed_on | date | |
| contributed_by | uuid | |
| note | text null | |
| created_at | timestamptz | |

### shopping_lists

| עמודה | טיפוס | הערות |
|-------|--------|--------|
| id | uuid PK | |
| household_id | uuid FK | |
| name | text | |
| is_archived | boolean | |
| created_by | uuid | |
| created_at / updated_at | timestamptz | |

### shopping_items

| עמודה | טיפוס | הערות |
|-------|--------|--------|
| id | uuid PK | |
| household_id | uuid FK | |
| list_id | uuid FK | |
| name | text | |
| quantity | numeric(10,2) | default 1 |
| unit | text null | |
| category | text null | |
| estimated_price | numeric(12,2) null | |
| is_checked | boolean | |
| added_by | uuid | |
| checked_by | uuid null | |
| sort_order | int | |
| created_at / updated_at | timestamptz | |

**Realtime:** מופעל על טבלה זו.

### import_batches

| עמודה | טיפוס | הערות |
|-------|--------|--------|
| id | uuid PK | |
| household_id | uuid FK | |
| source_name | text | ספק / שם קובץ לוגי |
| file_type | text | `xlsx` \| `csv` |
| column_mapping | jsonb | תבנית מיפוי |
| status | text | `preview` \| `committed` \| `cancelled` |
| row_count | int | |
| created_by | uuid | |
| created_at / updated_at | timestamptz | |

קובץ מקור **לא** נשמר כברירת מחדל.

### imported_rows

| עמודה | טיפוס | הערות |
|-------|--------|--------|
| id | uuid PK | |
| household_id | uuid FK | |
| batch_id | uuid FK | |
| raw | jsonb | |
| parsed | jsonb | |
| fingerprint | text | |
| status | text | `new` \| `duplicate` \| `invalid` \| `imported` |
| transaction_id | uuid null | |
| created_at | timestamptz | |

### anomaly_alerts

| עמודה | טיפוס | הערות |
|-------|--------|--------|
| id | uuid PK | |
| household_id | uuid FK | |
| transaction_id | uuid null | |
| type | text | `duplicate` \| `unusual_amount` \| `budget_over` \| `other` |
| severity | text | `info` \| `warning` \| `critical` |
| message | text | |
| is_dismissed | boolean | |
| created_at | timestamptz | |

### settlements

| עמודה | טיפוס | הערות |
|-------|--------|--------|
| id | uuid PK | |
| household_id | uuid FK | |
| from_user_id | uuid | |
| to_user_id | uuid | |
| amount | numeric(12,2) | |
| settled_on | date | |
| note | text null | |
| period_year | int null | |
| period_month | int null | |
| created_by | uuid | |
| created_at | timestamptz | |

### attachments

| עמודה | טיפוס | הערות |
|-------|--------|--------|
| id | uuid PK | |
| household_id | uuid FK | |
| transaction_id | uuid null | |
| storage_path | text | private bucket |
| file_name | text | |
| mime_type | text | |
| size_bytes | int | |
| created_by | uuid | |
| created_at | timestamptz | |

### activity_logs

| עמודה | טיפוס | הערות |
|-------|--------|--------|
| id | uuid PK | |
| household_id | uuid FK | |
| actor_id | uuid | |
| action | text | |
| entity_type | text | |
| entity_id | uuid null | |
| metadata | jsonb | |
| created_at | timestamptz | |

### notifications

| עמודה | טיפוס | הערות |
|-------|--------|--------|
| id | uuid PK | |
| household_id | uuid FK | |
| user_id | uuid | |
| title | text | |
| body | text | |
| is_read | boolean | |
| link | text null | |
| created_at | timestamptz | |

### app_settings

| עמודה | טיפוס | הערות |
|-------|--------|--------|
| id | uuid PK | |
| household_id | uuid FK | |
| key | text | |
| value | jsonb | |
| updated_at | timestamptz | |

**Unique:** `(household_id, key)`  
דוגמאות מפתחות: `default_split`, `import_templates`, `theme`, `notification_prefs`.

---

## RLS — עקרון אחיד

פונקציית עזר מומלצת:

```sql
create or replace function public.is_household_member(hid uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.household_members m
    where m.household_id = hid
      and m.user_id = auth.uid()
      and m.status = 'active'
  );
$$;
```

מדיניות טיפוסית לכל טבלה עם `household_id`:

- `SELECT/INSERT/UPDATE/DELETE` רק אם `is_household_member(household_id)`
- פעולות owner-only (הזמנות, מחיקת משק) נבדקות ב־role

`profiles`: משתמש קורא/מעדכן את השורה שלו; חברי משק רואים פרופילים של חברים פעילים.

Storage: bucket פרטי; מדיניות לפי נתיב שכולל `household_id`.

---

## Migrations

קבצי SQL יישמרו ב־`supabase/migrations/`.  
יישום בפועל ל־Supabase יתבצע ב־**Phase 2** יחד עם Auth ו־RLS.
