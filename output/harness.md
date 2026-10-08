# HW4 — Harness

## משימה 2: מפת מסד הנתונים

מקור: `data/campus_customs.db` (SQLite). הניתוח בוצע בקריאה בלבד. במסד ארבע טבלאות; מספרי הרשומות מתארים את הקובץ כפי שנבדק במשימה זו. אין במסמך פרטי חשבון, תוכן שיחות או ערכי password hash.

הסכמה שלהלן מתעדת את מסד הנתונים כפי שנבדק במשימה 2. במשימה 8 נוספה טבלת `chat_conversations` והורחבה `chat_messages`; מבנה הסכמה הנוכחי וההגירה מתועדים בהמשך.

### `catalogue` — קטלוג מוצרים (102 רשומות)

רשומה אחת לכל מוצר. כל השדות מאוכלסים בנתונים הקיימים.

| שדה | סוג ומבנה | תפקיד וחשיבות |
| --- | --- | --- |
| `product_id` | `TEXT PRIMARY KEY` | מזהה מוצר יציב; מחבר את הקטלוג למלאי ומשמש לאיתור מוצר בצ'אט ובאתר. |
| `name` | `TEXT NOT NULL` | שם המוצר להצגה בכרטיס מוצר ובתשובות הצ'אטבוט. |
| `garment_type` | `TEXT NOT NULL` | סוג הפריט, למשל חולצה או סווטשירט; מאפשר סינון וחיפוש לפי קטגוריה. |
| `description` | `TEXT NOT NULL` | תיאור הפריט; נותן לאתר ולצ'אטבוט פרטים על המראה והמאפיינים שלו. |
| `colors` | `TEXT NOT NULL`, מערך JSON של מחרוזות | הצבעים המתוארים למוצר; מסייעים לחיפוש ולתיאור, אך אינם רשומות מלאי נפרדות. |
| `search_tags` | `TEXT NOT NULL`, מערך JSON של מחרוזות | מילות מפתח למציאת מוצרים לפי נושא, קבוצה, סגנון או בקשת המשתמש. |
| `image_file_path` | `TEXT NOT NULL`, נתיב יחסי | מצביע לקובץ תמונה תחת `data/`; משמש להצגת תמונת המוצר באתר. |
| `price` | `REAL NOT NULL` | מחיר המוצר כפי ששמור בקטלוג; מקור הנתונים לתשובות מחיר, בלי להמציא ערך. |

### `inventory` — מלאי לפי מוצר ומידה (612 רשומות)

רשומה אחת לכל זוג `product_id` ו־`size`. לכל אחד מ־102 המוצרים יש שש רשומות, במידות `XS`, `S`, `M`, `L`, `XL`, `XXL`. הצירוף `(product_id, size)` ייחודי.

| שדה | סוג ומבנה | תפקיד וחשיבות |
| --- | --- | --- |
| `id` | `INTEGER PRIMARY KEY AUTOINCREMENT` | מזהה ייחודי לשורת מלאי; מאפשר לעדכן או לאתר שורה מסוימת. |
| `product_id` | `TEXT NOT NULL`, מפתח זר ל־`catalogue.product_id` | קושר את הכמות והמידה למוצר הנכון בקטלוג. |
| `size` | `TEXT NOT NULL` | המידה של שורת המלאי; מאפשר לברר זמינות למידה המבוקשת. |
| `quantity` | `INTEGER NOT NULL` | מספר היחידות הזמינות לאותה מידה; `0` פירושו שהמידה אינה במלאי כרגע. |

### `users` — חשבונות לקוחות (3 רשומות)

רשומה אחת לכל חשבון. `email` ייחודי. ערכי זיהוי וסיסמאות אינם מוצגים בתיעוד זה.

| שדה | סוג ומבנה | תפקיד וחשיבות |
| --- | --- | --- |
| `id` | `INTEGER PRIMARY KEY AUTOINCREMENT` | מזהה החשבון; מחבר בין המשתמש להודעות הצ'אט שלו. |
| `name` | `TEXT NOT NULL` | שם לתצוגת החשבון ולהתאמה אישית של חוויית המשתמש. |
| `email` | `TEXT NOT NULL UNIQUE` | כתובת ייחודית לזיהוי החשבון בעת הרשמה והתחברות. |
| `password_hash` | `TEXT NOT NULL` | ערך סיסמה מגובב לאימות התחברות; אין להציגו ללקוח או להשתמש בו כסיסמה גלויה. |
| `created_at` | `TEXT NOT NULL`, ברירת מחדל `datetime('now')` | זמן יצירת החשבון לצורכי ניהול והיסטוריה. |
| `first_name` | `TEXT`, יכול להיות `NULL` | שם פרטי אופציונלי להצגה או לפנייה אישית. |
| `last_name` | `TEXT`, יכול להיות `NULL` | שם משפחה אופציונלי לפרטי החשבון. |

### `chat_messages` — היסטוריית שיחה (22 רשומות)

רשומה אחת לכל הודעה. במסד קיימים ערכי `role` מסוג `user` ו־`assistant`; 11 הודעות מכל סוג.

| שדה | סוג ומבנה | תפקיד וחשיבות |
| --- | --- | --- |
| `id` | `INTEGER PRIMARY KEY AUTOINCREMENT` | מזהה ייחודי להודעה, לצורך אחזור וסידור היסטוריית השיחה. |
| `user_id` | `INTEGER NOT NULL`, מפתח זר ל־`users.id` | משייך הודעה לחשבון המשתמש הנכון. |
| `role` | `TEXT NOT NULL` | מציין אם ההודעה נכתבה בידי המשתמש או העוזר, כדי להציג ולפרש את השיחה. |
| `content` | `TEXT NOT NULL` | גוף ההודעה שהמשתמש או הצ'אטבוט כתבו. |
| `products_json` | `TEXT`, מערך JSON או `NULL` | שומר רשימת מוצרים שהוצמדה להודעה כדי להציג כרטיסי מוצר; אינו מקור עדכני למחיר או למלאי. |
| `created_at` | `TEXT NOT NULL`, ברירת מחדל `datetime('now')` | זמן יצירת ההודעה, לשמירת סדר והצגת היסטוריית השיחה. |

### קשרים ומשמעות לאתר

- `catalogue.product_id` ← `inventory.product_id`: מוצר אחד יכול להכיל כמה שורות מלאי, אחת לכל מידה. כל 612 שורות המלאי מפנות למוצר קיים.
- `users.id` ← `chat_messages.user_id`: חשבון אחד יכול להכיל כמה הודעות. כל 22 ההודעות מפנות למשתמש קיים.
- במשימה 8 נוספו `chat_messages.conversation_id` (מפתח זר ל־`chat_conversations.id`) ו־`chat_messages.search_performed` כדי לשייך הודעה לשיחה ולשחזר כרטיסי תוצאות.
- `users.id` ← `chat_conversations.user_id` ו־`chat_conversations.id` ← `chat_messages.conversation_id`: חשבון אחד יכול להכיל כמה שיחות, וכל הודעה משויכת לשיחה אחת.
- `chat_messages.products_json` מכיל עותק JSON של מוצרים שהוצגו בשיחה, ללא מפתח זר לטבלת `catalogue`. מחירים וזמינות יש לקרוא מחדש מ־`catalogue` ומ־`inventory` בעת מענה.
- כל 102 נתיבי התמונות ב־`catalogue.image_file_path` מפנים לקבצים קיימים תחת `data/`. הנתיבים יחסיים ואינם קישורי אינטרנט.
- `colors`, `search_tags` ו־11 ערכי `products_json` שאינם `NULL` הם מערכי JSON תקינים השמורים בעמודות `TEXT`.
- המחירים בקטלוג נעים בין 32 ל־98; אין במסד שדה שמציין מטבע. ל־145 משורות המלאי יש `quantity = 0`.
- אין בטבלאות שנמצאו עגלת קניות, הזמנות או תשלומים. `PRAGMA quick_check` החזיר `ok`.

## המשך תיעוד

נוסיף כאן בהמשך, לפי המשימות הבאות, מידע על המודלים, הכלים, הבטיחות והבדיקות של המערכת.

## משימה 3: יסודות אתר החנות

- ממשק: React, Vite ו־TypeScript עם ניווט בין Home, Products, About Us, Log in, Create account ועמוד נפרד לכל מוצר. תוכן Home ו־About Us מקורי; הסגנון וכתובת החנות נשענים על אתר Yale Bulldog Blue של Campus Customs.
- מקור המוצרים: FastAPI קורא את `data/campus_customs.db` במצב `mode=ro` ו־`query_only=ON`. `GET /api/products` מחזיר את הקטלוג עם סך המלאי, ו־`GET /api/products/{product_id}` מחזיר מוצר ואת מלאי המידות שלו.
- תמונות: `GET /api/products/{product_id}/image` מאתר את הנתיב מתוך `catalogue.image_file_path` ומגיש רק קובץ קיים תחת `data/`, ללא העתקת התמונות ל־frontend.
- נתוני חנות: שם, תיאור, מחיר ומלאי מגיעים מהמסד. תיאורי placeholder פנימיים במסד מוצגים למבקר כהודעה ניטרלית, בלי להמציא פרטי מוצר.
- גבול המשימה: עמודי החשבון קיימים לצורכי ניווט ועיצוב, אך השדות והשליחה מושבתים עד למשימת האימות. אין עדיין Agent או צ'אטבוט בשלב זה.
- בדיקות שבוצעו: בניית TypeScript/Vite ו־lint עברו; ה־API החזיר 102 מוצרים; עמוד מוצר החזיר שש מידות; תמונה הוגשה כ־JPEG; ניווט לעמודי החנות עבד בדפדפן, ובחירת מידה הציגה את הכמות מהמסד.

- צ׳אט frontend: ווידג׳ט צף בפינה הימנית התחתונה, עם פתיחה וסגירה, הודעת פתיחה, שדה הקלדה והצגת הודעות שהוזנו בזיכרון הדף בלבד. אינו קורא ל־Backend, אינו מחובר ל־Agent ואינו מייצר תשובות.


## משימה 4: הרשמה והתחברות

### זרימת החשבון

- `POST /api/auth/register` בודק שדות נדרשים, אורך סיסמה ואימייל תקין, מנרמל אימייל לאותיות קטנות, ודוחה כתובת שכבר קיימת (גם אם נכתבה באותיות גדולות). בהרשמה נשמרים `first_name`, `last_name`, השם המלא ב־`name`, האימייל, גיבוב הסיסמה ו־`created_at` בטבלת `users`.
- בטופס יצירת חשבון המשתמש מקליד את הסיסמה פעמיים. ה־Frontend משווה בין השדות לפני השליחה; שדה האימות עצמו אינו נשלח לשרת ואינו נשמר במסד.
- `POST /api/auth/login` מאתר משתמש לפי אימייל מנורמל ומאמת את הסיסמה מול הגיבוב. אימייל לא קיים וסיסמה שגויה מקבלים אותה הודעת שגיאה כללית. השדות החסרים או הלא תקינים נחסמים בטופס ומאומתים מחדש ב־API.
- אחרי הרשמה או התחברות השרת מחזיר רק `id`, שם פרטי, שם משפחה, אימייל וזמן יצירה, ומגדיר עוגיית session חתומה ל־7 ימים. `/api/auth/me` טוען את מצב החשבון מהעוגייה; `/api/auth/logout` מנקה אותה. העוגייה היא `HttpOnly` ו־`SameSite=Lax`; ב־HTTPS יש להגדיר `CAMPUS_CUSTOMS_COOKIE_SECURE=true`.

### שמירת סיסמאות והגנה עליהן

- הסיסמה הגלויה משמשת רק בזמן ההרשמה או ההתחברות; היא לא נשמרת במסד ולא מוחזרת ל־Frontend. גם גיבוב הסיסמה ואסימון ה־session אינם חלק מתשובת פרטי המשתמש.
- חשבון חדש מקבל גיבוב PBKDF2-HMAC-SHA256 עם salt אקראי ו־600,000 סבבים. בעת התחברות נעשית השוואה בזמן קבוע באמצעות `compare_digest`.
- הגיבובים הקיימים במסד הם בפורמט `pbkdf2_sha256$salt$hex_digest`, ללא מספר סבבים בשדה. אימות מול משתמש הבדיקה אימת שהפורמט משתמש ב־120,000 סבבים. לאחר התחברות תקינה ראשונה, הגיבוב הישן מוחלף בגיבוב החדש עם 600,000 סבבים; ניסיון שגוי אינו משנה אותו.
- עוגיית ה־session מכילה מזהה משתמש וזמן תפוגה חתומים ב־HMAC-SHA256. מפתח קבוע מוגדר באמצעות `CAMPUS_CUSTOMS_SESSION_SECRET`; אם לא הוגדר, נוצר מפתח חדש בהפעלת השרת, והפעלות מחדש מנתקות sessions קיימים.

### בדיקה שבוצעה

- התחברות דרך האתר עם משתמש הבדיקה שסופק הצליחה. הגיבוב הישן שלו אומת ושודרג ל־600,000 סבבים; הסיסמה נשארה ניתנת לאימות.
- נוצר דרך עמוד Create account משתמש בדיקה נוסף עם השדות `Campus`, `Verification` וכתובת `auth-verification-muw33r4q-wobi79@campuscustoms.yale.edu`. הרשומה נמצאת במסד האמיתי; הספירה עלתה מ־3 ל־4 משתמשים, והשדה `password_hash` מכיל גיבוב PBKDF2 ולא סיסמה גלויה.
- המשתמש החדש התחבר דרך עמוד Log in. האתר הציג `ACCOUNT ACTIVE`, את שם המשתמש והאימייל, ואת קישורי My account ו־Log out.
- בניית ה־Frontend, בדיקת תחביר ל־FastAPI, ובדיקות זרימה לעמודות וה־session הצליחו. משתמש הבדיקה החדש נשאר במסד כדי לאפשר אימות של השמירה.

## משימה 5: חיבור הצ׳אט ל־PydanticAI ול־FastAPI

### חיבור האתר ל־FastAPI ול־Agent

- `ChatWidget` ב־`frontend/src/App.tsx` מעביר את ההיסטוריה האחרונה דרך `sendChatMessage` שב־`frontend/src/api.ts` כ־JSON ל־`POST /api/chat`. בזמן פיתוח, פרוקסי Vite מעביר בקשות `/api` אל `http://127.0.0.1:8000`.
- FastAPI מאמת את גוף הבקשה כ־`ChatRequest`, קורא ל־`run_chat` ומחזיר `ChatResponse` עם תשובת העוזר (`reply`) ומוצרים (`products`). הממשק מציג את הטקסט ואת כרטיסי המוצרים המקושרים עם תמונות ומלאי לפי מידה.
- `backend/agent.py` קורא את `backend/prompts/prompt.md` בזמן בניית ה־Agent ושומר Agent במטמון לפי הגדרות החיבור. הטקסט מועבר ל־PydanticAI כ־`instructions` (הנחיות המערכת). המודל הוא `PORTKEY_MODEL`, או `gpt-6-luna` כברירת מחדל; עבור מודל זה מוגדר `openai_reasoning_effort=none` כדי לאפשר קריאות כלים דרך Chat Completions. חיבור OpenAI תואם נשלח דרך Portkey. `PORTKEY_API_KEY` נקרא מסביבת השרת בלבד, ולא נכלל בקוד או בבקשות הדפדפן.
- כלי ה־Agent ב־`backend/tools.py` קוראים לקטלוג ולמלאי העדכניים ממסד SQLite במצב קריאה בלבד. ה־Agent מחזיר כרטיסים שנאספו בתוצאות הכלים, ולא מוצרים שהומצאו.

### אימות הפעלה וזרימת צ׳אט

- מתוך תיקיית `backend`, הפקודה שנבדקה `uvicorn main --reload --port 8000` לא עבדה: Uvicorn דרש שם ASGI בפורמט `module:attribute`. הפקודה המתוקנת שנבדקה ועלתה בהצלחה היא `../.venv/bin/uvicorn main:app --reload --port 8000` (או `uvicorn main:app --reload --port 8000` כאשר סביבת הפרויקט פעילה והפקודה זמינה ב־`PATH`).
- עם השרת ב־`127.0.0.1:8000` ו־Vite ב־`127.0.0.1:5173`, נשלחה דרך הצ׳אט באתר ההודעה: “Do you have Yale hoodies under $80? Please check current stock and sizes.”
- יומן FastAPI אישר `POST /api/chat` עם HTTP 200. ה־Agent השיב עם חמישה פריטים מהקטלוג במחיר $68, עם סך מלאי וכמויות לפי מידה. באתר הופיעו התשובה וחמשת כרטיסי המוצר; כל חמש התמונות נטענו בהצלחה והקישורים הובילו לעמודי המוצר.
- בתצוגה הנוכחית תשובות שמכילות Markdown מוצגות כטקסט פשוט, ולכן סימונים כגון `**מודגש**` נראים למשתמש. תוכן התשובה וכרטיסי המוצר עצמם הוצגו.

### רכיבי המערכת

- `POST /api/chat` מקבל עד 24 הודעות תפקיד־תוכן, מאמת שהשיחה מתחילה ומסתיימת בהודעת משתמש, ומחזיר `reply` ורשימת מוצרים שנשלפו בכלים. תקלת מודל אינה חושפת פרטי ספק או מפתחות API לדפדפן.
- `backend/agent.py` מגדיר Agent של PydanticAI ומחבר אותו ל־Portkey דרך ממשק OpenAI. ברירת המחדל הנוכחית היא `gpt-6-luna`; אפשר להגדיר `PORTKEY_MODEL`, `PORTKEY_BASE_URL` ו־`PORTKEY_PROVIDER`. המפתח נקרא רק מ־`PORTKEY_API_KEY` בצד השרת.
- `backend/tools.py` מספק חיפוש קטלוג ופרטי מוצר לפי מזהה. הוא פותח את `campus_customs.db` במצב קריאה בלבד, מחזיר מחיר עדכני ומלאי לפי מידה, ואינו ניגש לטבלת `users` או משנה נתונים.
- `backend/models.py` מגדיר את הודעות הבקשה, פרטי המלאי, מוצרי המלצה ותשובת הצ׳אט ב־Pydantic. ההיסטוריה מוגבלת בגודל והודעות ריקות נדחות.
- `backend/prompts/prompt.md` מנחה לענות בשפת המשתמש, להשתמש בכלי הקטלוג לשאלות עובדתיות ולא לנחש מוצרים, מחירים או כמויות.
- ה־Frontend שולח את היסטוריית ההודעות המוצלחת ל־`/api/chat`, מציג מצב המתנה ושגיאות, ומציג כרטיסי מוצר מקושרים רק לפריטים שהוחזרו מתוצאת הכלי. עד משימה 8 ההודעות נשארו בזיכרון הדף; משימה 8 מוסיפה שמירה לחשבונות מחוברים.

### בטיחות וגבולות נתונים

- כלי החיפוש קורא ממסד הנתונים ב־`mode=ro` ומפעיל `PRAGMA query_only=ON`; הוא אינו יכול לשנות את המלאי, המשתמשים או המוצרים.
- כרטיסים ותשובות מלאי נשענים על תוצאות הכלים בשיחה הנוכחית. כמות במידה נבדקת מול שורת המלאי המתאימה, וסך המלאי מוצג כשדה נפרד.
- חסר `PORTKEY_API_KEY` או רכיב Agent מותקן מחזיר שגיאת שירות ברורה; ה־API הקיים למוצרים, תמונות וחשבונות ממשיך לפעול גם בלי קריאת מודל.

### בדיקות

- `npm run build` ו־`npm run lint` עברו.
- בדיקות FastAPI עברו: health דיווח על 102 מוצרים, הקטלוג החזיר 102 רשומות, עמוד מוצר החזיר שש מידות, תמונת מוצר הוגשה בהצלחה, ו־`/api/auth/me` המשיך לעבוד.
- נבנה Agent של PydanticAI עם מודל `gpt-5.6-luna` ו־Portkey בלי לשלוח קריאת מודל במהלך בדיקת הבנייה.
- שתי קריאות צ׳אט אמיתיות דרך `POST /api/chat` ל־Portkey חזרו ב־HTTP 200; השנייה בדקה גם היסטוריית שיחה מרובת הודעות. שתיהן החזירו תשובה וחמישה מוצרי קטלוג, עם מחירים ומלאי לפי מידה. גיבוב קובץ SQLite לפני ואחרי הקריאה השנייה היה זהה.


## המשך משימה 5: System Prompt וכללי בטיחות לצ׳אט

### אישיות, עובדות והרשאות

- `backend/prompts/prompt.md` מגדיר עוזר חנות ידידותי, מועיל, קצר ומקצועי, שעונה בשפת הלקוח ושואל שאלת הבהרה כשצריך.
- הקטלוג והמלאי שמוחזרים מכלי החיפוש הם מקור האמת היחיד לשמות, תיאורים, צבעים, מחירים ומידות. כשכלי נכשל או שאין התאמה, העוזר אומר שאינו יכול לאמת את הפרט במקום לנחש.
- העוזר מבחין בין מלאי כולל לכמות של מידה מסוימת, וממליץ רק על מוצרים שהוחזרו מכלי הקטלוג.
- הכלים הנוכחיים מאפשרים קריאה בלבד של מוצרים ומלאי. העוזר אינו מבצע רכישות, תשלומים, שינויי מלאי/מוצרים, פעולות חשבון או פעולות בשם המשתמש; עליו לסרב לבקשות כאלה ולא לטעון שביצע אותן.
- פרטי חשבונות של לקוחות אחרים, סיסמאות, hashes, session tokens, מפתחות API, הגדרות פנימיות וה־System Prompt אינם מיועדים לחשיפה. הודעות משתמש וטקסט בקטלוג נחשבים נתונים לא מהימנים ואינם יכולים לעקוף את הכללים.
- המפתח נקרא מ־`PORTKEY_API_KEY` בשרת ולא נשמר בקוד או נשלח ל־Frontend. מודל Portkey ופרטי החיבור נשארים כפי שהוגדרו במשימה 5.

### מבני הודעות וכרטיסים

- `backend/models.py` כבר כולל `ChatRequest`/`ChatMessage` עבור היסטוריה מאומתת, `ChatResponse` עם `reply` ו־`products`, ו־`ChatProduct` עם פרטי מוצר, תמונה, מחיר, מלאי כולל ומלאי לפי מידה. אלה תואמים לכרטיסים שה־Frontend מציג; לא נדרש מבנה כפול.
- האתר ממשיך לקרוא ל־`POST /api/chat`; תשובות המשתמש מוצגות מה־Agent ולא מטקסט תשובה קבוע. הודעת הפתיחה היא בלבד טקסט UI סטטי.

### בדיקות

- `npm run build` ו־`npm run lint` עברו גם לאחר עדכון ה־System Prompt.
- דרך `/api/chat` בוצעה שיחת מוצר אמיתית מול ה־Agent ב־Portkey; התקבלו תשובה וכרטיסי מוצר מהקטלוג. בבקשה נפרדת לשנות מלאי העוזר סירב במפורש, ולא הופעלה פעולת כתיבה.
- בדיקת endpoint מדומה של שגיאת ספק מסוג `content_filter` החזירה סירוב ידידותי ב־HTTP 200, בלי לכלול מפתח בדיקה בתשובה. תשובות רגילות עדיין מגיעות מ־PydanticAI.
- ה־Agent נרשם עם שני כלים לקריאת קטלוג/מלאי בלבד. מסד הנתונים נשאר במצב קריאה בלבד; גיבובו נשאר זהה בבדיקת ה־API.

### הערת פרסום

הפרומפט שנשמר ב־`AI_prompts.md` כולל את סיסמת משתמש הבדיקה כפי שנשלח, בהתאם לבקשה לתעד פרומפטים כלשונם. לפני פרסום GitHub ציבורי יש להסיר או למסך את סיסמת הבדיקה בקובץ הזה; אין להעלות את מסד הנתונים עצמו.

## משימה 6: Tools: product info and stock

### הכלים ותוצאותיהם

שני כלי ה-Agent קוראים את `data/campus_customs.db` ב־SQLite במצב `mode=ro` עם `PRAGMA query_only=ON`. שניהם משתמשים באותו `ProductToolResult`; ההבדל הוא אם מחזירים רשימת התאמות או מוצר יחיד.

| כלי | קלט ותוצאת הכלי | למה הכלי והשדות נחוצים |
|---|---|---|
| `search_catalogue(query, max_price, size, available_only)` | `list[ProductToolResult]`; כל תוצאה מכילה את השדות המשותפים שבהמשך. | מאפשר לגלות מוצרים לפי שם, סוג, תיאור, צבעים ותגיות, ולצמצם לפי מחיר/מידה/זמינות כדי לענות על שאלות חיפוש והמלצה. מסנן מידה משאיר כמות אפס כש־`available_only=false`, כדי שאפשר יהיה לדווח על אזילה; `true` משאיר רק תוצאות זמינות. |
| `get_product_details(product_id)` | `ProductToolResult` למזהה קיים, או `None` כשהמוצר אינו קיים; אותן עובדות מוצר ומלאי כמו בתוצאת החיפוש. | מאמת פרטים של מוצר מסוים ומחזיר את כל המידות, כולל מידות בכמות אפס, כדי לענות על מחיר, תיאור ומלאי בלי לנחש. |

ה־Agent מקבל משני הכלים את השדות הבאים, שנבחרו מנתוני `catalogue` ו־`inventory`:

| שדה מוחזר | למה הוא חשוב |
|---|---|
| `product_id` | מזהה חד־משמעי לצורך קישור בין מוצר לתוצאת פרטים מדויקת. |
| `name` | השם שמוצג ללקוח ומסייע לזהות את המוצר. |
| `garment_type` | סוג הבגד, שימושי להבנת בקשת חיפוש או המלצה. |
| `description` | תיאור המוצר העובדתי מתוך הקטלוג. |
| `colors` | מאפשר לענות ולהמליץ לפי צבעים שקיימים בנתונים. |
| `price` | המחיר הנוכחי מתוך הקטלוג, בלי אומדן של המודל. |
| `total_stock` | סכום המלאי במוצר, כדי להבחין בין מוצר שאזל כולו לבין מידה שאזלה. |
| `inventory[]` עם `size` ו־`quantity` | הכמות לכל מידה; שורת כמות אפס נשמרת כדי שהעוזר יוכל לומר שהמידה אינה זמינה. |

טיפוס הכלי הוא `ProductToolResult` (כולל `InventoryStock` עבור `inventory[]`). `ChatProduct` מרחיב אותו עם `search_tags` ו־`image_url` לצורך כרטיסי המוצר שמוחזרים לממשק; שדות אלה אינם חלק מתוצאת הכלי שהמודל מקבל. נתיב קובץ התמונה המקומי אינו מוחזר למודל. `limit` הוא פרמטר של פונקציית החיפוש הפנימית, עם ברירת מחדל 5 ומקסימום 8, ואינו פרמטר כלי שהמודל בוחר.

### אימות מול מסד הנתונים והצ׳אט

- נבדקו כל 102 מוצרי הקטלוג: פרטי המוצר, התיאור, המחיר, המלאי הכולל וכמויות המידות מכלי הפרטים תאמו לערכים שנקראו ישירות מ־SQLite.
- בדיקות ממוקדות קודמות אישרו שחיפוש מידה ללא `available_only` משאיר תוצאת מלאי אפס, ושעם `available_only=true` היא מסוננת.
- בבדיקות החיות הנוכחיות נשלחו ארבע שאלות דרך `POST /api/chat` ב־FastAPI ל־Agent ול־Portkey. כל התשובות חזרו ב־HTTP 200, וכרטיסי המוצר החזירו שדות שתאמו למסד:
  - מחיר `Baseball Left Chest Crewneck`: ‏$58.
  - תיאור מלא: “Navy long-sleeve crewneck sweatshirt with ribbed collar, cuffs, and waistband, featuring a white YALE BASEBALL wordmark on the left chest.”
  - כמויות במידות S/L/XL: ‏15/25/0.
  - בשאלה נפרדת על XL, העוזר אמר במפורש שהמידה אזלה וציין כמות 0.
- למסד יש כרגע אפס מוצרים עם מלאי כולל 0, ולכן לא נמצאה דוגמת אמת למוצר שאזל בכל המידות. כן נבדקו מידות שאזלו במוצרים שעדיין יש להם מלאי במידות אחרות.
- גיבוב `campus_customs.db` לפני ואחרי בדיקות הצ׳אט היה זהה; הכלים והבדיקות לא שינו את מסד הנתונים.
## Problem 7: Chat search that updates the page

### חיפוש, API ותצוגת האתר

- בקשות גילוי מוצרים — למשל “what hoodies do you have?” — מיועדות להפעיל את `search_catalogue` במהלך אותה פנייה ל-Agent. הכלי מתאים למוצרי `catalogue` לפי שם, סוג, תיאור, צבעים ותגיות, ומקבל גם מסנני מחיר, מידה וזמינות. עבור קטגוריה הוא מחזיר את כל ההתאמות בקטלוג.
- ה-Agent שומר את רשומות הכלי ב-`AgentDependencies`; `ChatResponse` של `POST /api/chat` כולל אותן במערך המובנה `products` כ-`ChatProduct` ואת `search_performed=true`. כל כרטיס כולל מזהה, שם, סוג, תיאור, צבעים, מחיר, מלאי, תגיות ונתיב תמונה של API. ה-Frontend מציג את התוצאות בתוך הצ׳אט ובמדף תוצאות משותף בדף הבית ובעמוד Products.
- כל תוצאה ניתנת ללחיצה ומפנה ל-`/products/{product_id}`. המדף משתמש ברכיב `ProductCard` של הקטלוג, וכרטיסי הצ׳אט משתמשים באותה כתובת ובאותו route של React Router. `/products/:productId` טוען את `ProductPage` היחיד שנבנה במשימה 3; הוא מביא את הפרטים באמצעות `GET /api/products/{product_id}` ומציג תמונה גדולה, תיאור מלא, מחיר, צבעים ומלאי לפי מידה. אין עמוד פרטים נפרד לתוצאות צ׳אט.

### אימות

- בבדיקת החיפוש המקורית של משימה 7, שנעשתה לפני בקשת ההמשך הזו, ה-Agent החי דרך `POST /api/chat` החזיר HTTP 200, `search_performed=true` ו-27 תוצאות ל-“what hoodies do you have?”. התוצאות תאמו לחיפוש SQLite, וכל 27 נתיבי התמונות החזירו HTTP 200.
- בבדיקות המקומיות עבור בקשת ההמשך, כלי הקטלוג החזיר 27 התאמות. לכל 27 המוצרים `GET /api/products/{product_id}` החזיר HTTP 200, שדות המוצר והמלאי תאמו לתוצאות SQLite, ונתיב התמונה החזיר HTTP 200 עם סוג תוכן של תמונה. גיבוב מסד הנתונים היה זהה לפני ואחרי הבדיקה.
- בדיקת קוד אישרה שרכיב כרטיס הקטלוג וכרטיס תוצאת הצ׳אט מפנים לאותו route, ושה-route הזה מציג את `ProductPage` הקיים. `npm run build` ו-`npm run lint` עברו. בדיקת לחיצה בדפדפן לא רצה בסביבה הנוכחית.
- ניסיון לחזור על שיחת Agent חיה דרך Portkey בבקשה זו נדחה על ידי בדיקת האישור האוטומטית: הקריאה הייתה שולחת למודל מחירים, תיאורים ומלאי שנשלפו ממסד הנתונים. לכן לא בוצעה קריאת Portkey נוספת בבדיקה הנוכחית.

## משימה 8: זיכרון שיחות לחשבונות

### מבנה הטבלאות שנוסף

| טבלה/שדה | סוג ומבנה | תפקיד וחשיבות |
|---|---|---|
| `chat_conversations.id` | `INTEGER PRIMARY KEY AUTOINCREMENT` | מזהה שיחה יציב לבורר השיחות ולקישור ההודעות. |
| `chat_conversations.user_id` | `INTEGER NOT NULL`, מפתח זר ל־`users.id` | בעל החשבון של השיחה; משמש לבידוד היסטוריות בין משתמשים. |
| `chat_conversations.title` | `TEXT NOT NULL` | כותרת קצרה שנגזרת מהודעת הפתיחה כדי לזהות את השיחה ברשימה. |
| `chat_conversations.created_at` | `TEXT NOT NULL`, ברירת מחדל זמן נוכחי | זמן יצירת השיחה. |
| `chat_conversations.updated_at` | `TEXT NOT NULL`, ברירת מחדל זמן נוכחי | מסדר שיחות לפי הפעילות האחרונה. |
| `chat_messages.conversation_id` | `INTEGER`, מפתח זר ל־`chat_conversations.id`, nullable בסכמה לצורך תאימות | משייך הודעה לשיחה; כל הודעה שהממשק החדש שומר כוללת מזהה שיחה. |
| `chat_messages.search_performed` | `INTEGER NOT NULL`, ברירת מחדל `0` | שומר אם תשובת העוזר כללה חיפוש קטלוג, כדי לשחזר תוצאות חיפוש בהיסטוריה. |

### שמירה ושליפה

- `chat_conversations` מכילה `id`, `user_id`, `title`, `created_at` ו־`updated_at`. `user_id` הוא מפתח זר ל־`users.id`; אינדקס לפי בעלים וזמן עדכון מאפשר להציג את השיחות האחרונות של החשבון.
- `chat_messages` נשארת מקור ההודעות ומקושרת ל־`chat_conversations` באמצעות `conversation_id`. נוספו גם `search_performed` לשחזור תוצאות חיפוש; `products_json` שומר צילום של כרטיסי המוצרים שהוצגו בהודעת העוזר.
- `GET /api/chat/conversations` מחזיר רק שיחות של המשתמש המזוהה. `GET /api/chat/conversations/{id}` מחזיר הודעות וכרטיסי מוצר רק אחרי אימות שהשיחה שייכת לאותו חשבון. מזהה שיחה של משתמש אחר מקבל 404.
- `POST /api/chat` משתמש בעוגיית ה־session החתומה כדי לזהות חשבון. בשיחה שמורה השרת טוען עד 23 הודעות קודמות מהמסד, מסיר הודעת assistant ראשונה אם חיתוך ההיסטוריה היה מתחיל באמצע תור, ואז מוסיף את הודעת המשתמש הנוכחית להקשר ה-Agent. כך נשמר רצף תורות תקין. ההיסטוריה שהדפדפן שולח אינה משמשת כמקור ההקשר לחשבון מחובר. רק אחרי תשובת Agent מוצלחת נשמרות הודעת המשתמש ותשובת העוזר, יחד עם צילום המוצרים וסמן החיפוש.
- בקשת משתמש מחובר ללא `conversation_id` יוצרת שיחה חדשה לאחר קבלת תשובת Agent; שמה נגזר מהודעת המשתמש הראשונה ומוגבל ל־80 תווים. בקשה עם מזהה שיחה בודקת בעלות לפני קריאת ה-Agent וגם לפני הכתיבה.
- צ׳אט אורח ממשיך לקבל את היסטוריית הדף הנוכחית ולעבוד כרגיל, אך השרת אינו יוצר עבורו שיחה או הודעה ומחזיר `conversation_id=null`. נתיבי קריאת היסטוריה דורשים session תקף.

### ממשק והגירת נתונים קיימים

- לאחר התחברות, הצ׳אט טוען אוטומטית את השיחה האחרונה. בורר השיחות מאפשר לחזור לשיחה אחרת; `New chat` פותח שיחה חדשה, וההודעה הבאה ממשיכה אותה. התשובות וכרטיסי המוצר משוחזרים בחלון הצ׳אט, והיסטוריית החיפוש האחרונה משוחזרת גם במדף תוצאות החיפוש באתר.
- החלפת משתמש או יציאה מאפסות את מצב הצ׳אט ותוצאות החיפוש בצד הדפדפן. כך הודעות של חשבון קודם אינן נשארות מוצגות לאחר יציאה או החלפת חשבון.
- ההגירה מוסיפה את `chat_conversations`, ואת `conversation_id` ו־`search_performed` ל־`chat_messages` באופן אידמפוטנטי. מכיוון שבסכמה הישנה לא היה מזהה שיחה, ההודעות הקיימות שויכו לשיחת עבר אחת לכל חשבון שהיה לו היסטוריה. השמות שלהן הם `Earlier chat history`.
- ההגירה בוצעה במסד המקומי: כל 22 ההודעות הקיימות נשמרו, קושרו לשתי שיחות עבר (6 ו־16 הודעות), ובדיקת `PRAGMA foreign_key_check` החזירה אפס שגיאות. תוכן ההודעות ופרטי החשבונות לא הוכנסו למסמך.
- לאחר ההגירה, נתיבי ההיסטוריה החזירו דרך ה־API את 6 ו־16 ההודעות של שתי השיחות, כולל 9 ו־24 כרטיסי מוצר שמורים. נבדקו ספירות בלבד; תוכן השיחות לא הודפס.

### בדיקות

- בדיקת ה־API רצה מול עותק זמני של SQLite ו־Agent מדומה, כך שתוכן השיחה לא נשלח לשירות חיצוני. נבדקו טעינת ההיסטוריה הישנה, המשך שיחה, יצירת שיחה שנייה, סינון לפי בעל חשבון, 404 כשמנסים לקרוא או להמשיך שיחה של חשבון אחר, ו־401 לאורחים בנתיבי ההיסטוריה.
- בבדיקת המשך השיחה נשלח מהדפדפן transcript מזויף לצד הודעה חדשה; ה-Agent המדומה קיבל רק את ההודעות השמורות בחשבון ואת הודעת המשתמש החדשה. ניסיון עם מזהה של חשבון אחר נדחה לפני קריאה ל-Agent.
- הודעת אורח החזירה `conversation_id=null` ולא שינתה את מספר שורות `chat_messages`. תוכן מסד המקור נותר ללא שינוי בבדיקות העותק הזמני.
- בדיקת round-trip נוספת שמרה תשובת Agent מדומה עם מוצר אמיתי מהקטלוג, ואז שלפה את השיחה ואישרה שכרטיס המוצר, נתיב התמונה ו־`search_performed` שוחזרו.
- שיחה ארוכה עם 15 חילופי הודעות שוחזרה ונשלחה ל-Agent המדומה כרצף תקין של 23 הודעות לכל היותר; החיתוך לא התחיל בתשובת assistant ללא ההודעה שקדמה לה.
- ההגירה המקומית שימרה את ההודעות כאמור. `npm run build`, `npm run lint` ובדיקות תחביר Python עברו.

### זהות הלקוח והקשר העמוד ל-Agent

- `ChatRequest.page_context` מקבל רק סוג עמוד ומזהה מוצר אופציונלי. ה-Frontend גוזר אותם מהנתיב הנוכחי בכל שליחה, כך שה-Agent מקבל את העמוד שבו הלקוח נמצא כעת.
- שרת FastAPI אינו מקבל שם או אימייל מהדפדפן. כאשר קיימת עוגיית session תקפה, הוא קורא את פרטי החשבון משורת `users` המתאימה ומעביר ל-Agent dependencies רק שם ואימייל. אורחים מקבלים הקשר זהות ריק. פרטים אלה נכללים בבקשה הנוכחית למודל אך אינם נשמרים בהודעות או בטבלת השיחות.
- כאשר סוג העמוד הוא מוצר, השרת מאמת את `product_id` באמצעות `get_product_details` מול הקטלוג ומעביר ל-Agent את מזהה ושם המוצר שנמצאו. לכן שינוי שרירותי של שם או אימייל בגוף הבקשה אינו יוצר זהות מאומתת, ומזהה מוצר אינו משמש ללא אימות בקטלוג.
- `AgentDependencies` כולל את הזהות ואת הקשר העמוד; הוראת `@agent.instructions` דינמית מוסיפה אותם להנחיות בכל הרצה, גם כשיש היסטוריית הודעות. ה-System Prompt מורה ל-Agent להשתמש בשם לפי הצורך, לשמור את האימייל כמידע פרטי, ולפרש "this/it" כמוצר המאומת בעמוד. לפני תשובה על מחיר, צבע או מלאי הוא עדיין חייב לקרוא לכלי המוצר.
- הקטלוג מתעד צבעים ברמת מוצר והמלאי לפי מידה בלבד; הוא אינו מתעד מלאי ייחודי לצבע. ה-Agent מונחה שלא להציג צבע כרמת מלאי נפרדת.
- בבדיקת API מול עותק זמני של SQLite ו-Agent מדומה, פרטי הזהות שהגיעו ל-Agent תאמו לשורת החשבון לפי cookie תקף, שדות שם ואימייל מזויפים בגוף הבקשה לא השפיעו עליהם, אורח קיבל `customer_context=None`, ומזהה מוצר עבר lookup מול הקטלוג. סוג עמוד ומזהה מוצר לא עקביים נדחו ב־422. הבדיקה לא הדפיסה שמות או כתובות אימייל.
- בדיקות תחביר Python, `npm run lint`, בדיקת TypeScript עם `tsc --noEmit` ובניית Vite לפרודקשן דרך `vite build --configLoader runner` עברו. קובצי הבנייה נוצרו תחת `/private/tmp`; `npm run build` הרגיל נחסם בהרשאת sandbox כשניסה לכתוב קובץ tsbuildinfo בתוך `node_modules`.

### בדיקת דפדפן מקצה לקצה

- באתר המקומי התחברות לחשבון הבדיקה הציגה את פרטי המשתמש המחובר. הודעת צ׳אט חיה ל-Agent דרך Portkey ביקשה לזהות את בעל החשבון; התשובה החזירה את השם ואת האימייל התואמים לחשבון המאומת.
- לאחר רענון מלא, ה-session נשאר תקף והצ׳אט שחזר את אותה שיחה ואת התשובה השמורה. שיחת בדיקה זו מכילה את תשובת האימייל ונשמרה במסד המקומי כחלק מהתנהגות זיכרון השיחות.
- בעמוד הפרטים של `Basic Hoodie Big Yale` נשלחה השאלה “Do you have this in pink?” בלי לציין את שם המוצר. ה-Agent התייחס להודי שבעמוד, בדק את נתוני הקטלוג והחזיר שכרטיס המוצר מציג את אותו מוצר; התשובה תאמה לצבעים הרשומים (navy blue ו-white). מלאי בדאטה נשמר לפי מידה ולא לפי צבע.
- לאחר יציאה, הניווט חזר למצב אורח והצ׳אט הציג הודעת פתיחה בלי בורר שיחות או היסטוריה. לאחר התחברות מחדש, אותה שיחה ושני חילופי ההודעות שוחזרו מהחשבון.
- הבדיקה החיה השתמשה ב־Vite זמני על `127.0.0.1:5174` וב־FastAPI המקומי על `127.0.0.1:8000`, ללא שינוי הקוד לצורך שרת הבדיקה. מסד הבדיקה הפעיל שמר את השיחה תחת המשתמש המאומת; תוכן השיחה לא הוכנס למסמך.

## Task 9: Frontend filters and mobile layout

- `/api/products` includes `available_sizes`, derived from `inventory` rows where `quantity > 0`. The filter therefore excludes a product when the selected size has no stock; size choices are also derived from this field.
- The Products page builds category choices from distinct `catalogue.garment_type` values. Minimum and maximum price filters use the catalogue's `price`; the existing sort control supports ascending and descending price.
- The browser check selected `pullover hoodie` and got 18 products, narrowed the price to $60–$70, then selected size S and got 16. A direct SQLite count for those same filters also returned 16. Price descending put the $98 fleece products before lower-priced items; clearing filters restored all 102 products.
- Responsive styles provide a collapsible navigation through 900px, narrower product cards with readable descriptions on phones (single column below 360px), stacked catalogue filters, and a chat panel sized to the dynamic viewport with safe-area spacing and larger touch controls.
- `npm run lint`, TypeScript `--noEmit`, and the Vite production build passed. Browser interaction was checked at the available desktop viewport; this browser session does not expose a viewport-resize control, so a visual phone-width screenshot was not available.


## Task 10: In-stock alternatives and flexible search

### Catalogue search behavior

- `backend/tools.py` keeps the existing `search_catalogue` interface, read-only SQLite source, and substring-based all-terms matching as its first pass, preserving exact-query behavior. It searches catalogue names, garment types, descriptions, colors, and search tags. The small alias list recognizes hoodie/hooded forms and lets a sweatshirt query include hoodie products, while a hoodie query remains specific. Spaced or hyphenated “sweat shirt” is normalized to “sweatshirt”.
- Only when the existing search finds no complete match, a fallback token check tolerates a single insertion, deletion, substitution, or adjacent transposition for longer words (five or more characters). Exact results always take precedence, and every meaningful query term still has to match. There are no embeddings, external search services, or vector database.

### Out-of-stock alternatives

- The existing agent tools and return models are unchanged. When a requested product or size is unavailable, the System Prompt now directs the Agent to make another `search_catalogue` call using the verified item's garment type or useful style terms, the requested size if supplied, `available_only=true`, and any stated price ceiling.
- `available_only=true` reads current SQLite inventory and only returns products with positive total stock, or positive quantity in the requested size. The `AgentDependencies` object merges products from the detail lookup and the alternative search, so the existing API can return both the unavailable requested product and the real alternatives for storefront cards. The Agent must clearly distinguish the unavailable request from alternatives and only state quantities found in tool results.
- If no alternatives meet the filters, the Agent says it found none. A likely spelling miss with no results gets one retry using a plausible spelling or category alias; no product facts are inferred from the spelling correction.

### Verification

- Direct checks against `data/campus_customs.db` compared the existing substring search with the updated tool for seven exact queries (`pullover hoodie`, `hoodies`, `hoodie`, `base`, `long sleeve`, `navy blue`, and `yale baseball`); all product ID sets were unchanged. The counts were 25, 27, 27, 7, 44, 63, and 4 respectively.
- The one-letter typo query `pullover hoddie` returned 25 hoodie products, and the adjacent-transposition query `sweatshrit` returned 59 database matches. `sweatshirt`, `sweat shirt`, and `sweat-shirt` all returned the same 66 products.
- `Baseball Left Chest Crewneck` has zero units in XS. Searching its verified garment type with `size=XS` and `available_only=true` returned 19 alternatives; every result had a positive XS quantity, and the unavailable requested item was excluded. The database has no product with zero total stock, so that whole-product branch is specified in the Agent instructions but cannot be demonstrated with a naturally matching row.
- The SQLite file's SHA-256 was unchanged by these read-only checks. Python source for the Agent and tools parsed successfully. This validates the tool and filter behavior; no new live Portkey model call was made for this task.

## Problem 12: Agent audit trail

- `output/audit_trail.json` is a valid JSON array. The backend adds a UTC timestamp and random per-run ID for each `agent_started`, `tool_completed`/`tool_failed`, and `agent_stopped` event. A stopped event records a normalized reason such as `final_response`, `content_filter`, `configuration_error`, `model_error`, `agent_error`, or `cancelled`.
- Search records identify the tool and summarize only whether free-text, price, size, and availability filters were supplied; they include a capped word count but never the search text or exact filter values. Product-detail records say only whether an identifier was supplied. Results contain aggregate match counts or found/stock-row summaries, not product identifiers, descriptions, or raw tool output.
- User messages, names, emails, user IDs, passwords, API keys, provider error bodies, and full model responses are not written. Error events contain only a Python exception class or HTTP status code.
- The appender obtains an exclusive file lock and adds each event before the array's closing delimiter, retaining earlier event objects. It does not reset or cap the log; malformed existing JSON is left untouched and the audit write fails closed. The file is created with owner-only permissions.
- Verification: Python bytecode compilation passed. An isolated temporary-file check appended multiple events, parsed the result as JSON, confirmed earlier event bytes remained present, and verified a search string containing an email and password was not recorded. No live Portkey call was made; the project audit file is an empty JSON array until the first real chat request.

## מפת מימוש עדכנית — לפי הקוד שנבדק

החלק הזה מסכם את המימוש הנוכחי בקובצי המקור. הסעיפים ההיסטוריים למעלה מתעדים את שלבי העבודה; במקרה של הבדל, הקוד והסיכום העדכני כאן מתארים את המצב הנוכחי. נבדקו `backend/models.py`, `backend/agent.py`, `backend/tools.py`, `backend/main.py`, `backend/prompts/prompt.md`, `backend/audit.py`, הגדרות Vite, `requirements.txt` ו־`README.md`.

### זרימת הבקשה

1. ממשק React שולח הודעת צ׳אט ל־`POST /api/chat` דרך `frontend/src/api.ts`. בזמן פיתוח Vite מעביר את `/api` ל־`http://127.0.0.1:8000`.
2. FastAPI מאמת את גוף הבקשה באמצעות `ChatRequest`. לחשבון מחובר הוא מאמת את עוגיית ה־session, טוען את הזהות מטבלת `users`, ומצרף היסטוריה רק משיחה השייכת לאותו חשבון. מזהה המוצר בעמוד נבדק מול הקטלוג לפני העברתו ל־Agent.
3. `backend/agent.py` טוען את `backend/prompts/prompt.md`, בונה Agent של PydanticAI, ומחבר את כלי הקטלוג. המודל מקבל את ההודעה האחרונה, היסטוריית השיחה המאומתת והקשר הלקוח/עמוד.
4. הכלים קוראים ל־SQLite במצב קריאה בלבד. תוצאות הכלים משמשות לתשובת הטקסט וגם ל־`products` מובנה; האתר מציג את הכרטיסים מתוך הרשומות שהכלים החזירו.
5. משתמש מחובר מקבל `conversation_id`, והודעת הלקוח ותשובת העוזר נשמרות בשיחה שבבעלותו. אצל אורח השיחה נשארת בצד הדפדפן ולא נשמרת במסד.

### שדות המודלים ב־`backend/models.py`

| מודל | שדות ואימות | למה הם קיימים |
| --- | --- | --- |
| `ChatMessage` | `role`: רק `user` או `assistant`; `content`: מחרוזת באורך 1–4000 תווים, לאחר הסרת רווחים בתחילה ובסוף. | תפקיד ההודעה מאפשר לבנות היסטוריה תקינה; גבול האורך והסרת תוכן ריק מגינים על ממשק ה־API ועל הקשר ה־Agent. |
| `ChatPageContext` | `page_type`: אחד מ־`home`, `products`, `product`, `about`, `login`, `create-account`, `other` (ברירת מחדל `other`); `product_id`: אופציונלי, 1–200 תווים. Validator מאפשר מזהה רק כשהעמוד הוא `product`. | מאפשר ל־Agent להבין את מיקום הלקוח ולהתייחס למוצר הנצפה; השרת עדיין מאמת את המזהה מול הקטלוג. |
| `ChatRequest` | `messages`: 1–24 הודעות; `conversation_id`: מזהה חיובי אופציונלי; `page_context`: הקשר עמוד, ברירת מחדל ריק. Validator דורש שהרצף יתחיל ויסתיים בהודעת משתמש. | מספק הודעה נוכחית, הקשר ושיחה קודמת בפורמט תחום וברור, ומונע transcript שמתחיל או מסתיים בתפקיד לא צפוי. |
| `InventoryStock` | `size`: תווית מידה; `quantity`: מספר שלם שאינו שלילי. | מאפשר להשיב על זמינות לפי מידה ולשמר במפורש כמות אפס כדי לזהות מידה שאזלה. |
| `ProductToolResult` | `product_id`, `name`, `garment_type`, `description`, `colors`, `price` (מספר לא שלילי), `total_stock` (מספר שלם לא שלילי), `inventory` (רשימת `InventoryStock`, ברירת מחדל ריקה). | שדות מהקטלוג והמלאי שמספיקים לתשובה עובדתית על מוצר, מחיר, צבע ומלאי, בלי להעמיס שדות משתמש או מידע לא נחוץ על ה־Agent. |
| `ChatProduct` | כל שדות `ProductToolResult`, ובנוסף `search_tags` ו־`image_url`. | מוסיף למוצר את מילות החיפוש ואת כתובת התמונה היחסית שדרושות לכרטיסים באתר; אלה אינם חלק מעובדות הליבה שעליהן ה־Agent משיב. |
| `ChatHistoryMessage` | `id`, `role`, `content`, `products` (רשימה ריקה כברירת מחדל), `search_performed` (ברירת מחדל `false`), `created_at`. | מחזיר הודעה היסטורית עם כרטיסי המוצר ומצב החיפוש כפי שנשמרו, כדי לשחזר את השיחה בממשק. |
| `ChatConversationSummary` | `id`, `title`, `created_at`, `updated_at`, `message_count` (לא שלילי). | מספק פרטי שיחה לתפריט ההיסטוריה בלי לטעון את גוף כל ההודעות. |
| `ChatConversationHistory` | שדות `ChatConversationSummary` ובנוסף `messages` (רשימה ריקה כברירת מחדל). | מחזיר את פרטי השיחה המלאים יחד עם ההודעות שלה. |
| `ChatResponse` | `reply` (טקסט לא ריק), `products` (רשימה ריקה כברירת מחדל), `search_performed` (ברירת מחדל `false`), `conversation_id` (מזהה חיובי או `null`). | מפריד בין תשובת השיחה, תוצאות מוצרים מובנות ומזהה השיחה השמורה, כך שה־Frontend יכול לרנדר אותם בנפרד. |

ב־`backend/main.py` קיימים גם מודלי בקשה/תגובה לחשבונות: `RegisterPayload` כולל שם פרטי, שם משפחה, אימייל וסיסמה עם גבולות אורך ואימות; `LoginPayload` כולל אימייל וסיסמה; `PublicUser` מחזיר רק `id`, שמות, אימייל ו־`created_at`, ולא סיסמה או גיבוב.

### כלי ה־Agent ויכולותיו

| כלי | קלט והתנהגות | תוצאה ושימוש |
| --- | --- | --- |
| `search_catalogue(query="", max_price=None, size=None, available_only=False)` | קורא את `catalogue` ו־`inventory`; מסנן לפי טקסט, תקרת מחיר, מידה וזמינות. חיפוש מדויק קודם לחיפוש גמיש. קיימים aliases ל־hoodie/hooded/sweatshirt, טיפול ברבים, ובמילים ארוכות התאמה של עריכת תו אחת (הוספה, מחיקה, החלפה או החלפת סדר סמוכים), ורק אם לא נמצאו התאמות מדויקות. | הכלי מחזיר לכל היותר 102 מוצרים. עם `size` בלבד הוא משאיר גם שורת מלאי בכמות 0 כדי לאפשר דיווח על חוסר; עם `available_only=true` הוא מחזיר רק מוצר עם מלאי חיובי, או מלאי חיובי במידה המבוקשת. ה־Agent מקבל `ProductToolResult`, וה־API אוסף `ChatProduct` להצגה באתר. |
| `get_product_details(product_id)` | מאתר מזהה מוצר מדויק בקטלוג וטוען שוב מחיר, פרטים ומלאי לפי כל המידות. | מחזיר `ProductToolResult` או `null` אם המזהה אינו קיים. משמש לשאלות פרטניות, להקשר של עמוד מוצר ולאימות לפני מענה על עובדות עדכניות. |

ה־Agent יכול לחפש פריטים, לסנן לפי מחיר/מידה/זמינות, לבדוק פרטי מוצר ומלאי לפי מידה, להציע חלופות שנמצאו בחיפוש שני, ולהציג תוצאות ככרטיסי מוצר. החיפוש הוא טקסטואלי; אין embeddings או vector database. אין ל־Agent כלי לקריאה מטבלת `users`, לשינוי קטלוג/מלאי, להזמנות או לתשלומים. רשימת הכרטיסים לכל הרצה מאוחדת לפי `product_id` ומוגבלת ל־102 מוצרים.

### כללי הבטיחות שהוגדרו

הכללים נמצאים ב־`backend/prompts/prompt.md` ונאכפים כהנחיות ל־Agent; ה־API וכלי SQLite מוסיפים גבולות טכניים:

- מחיר, צבע, תיאור ומלאי עדכניים נבדקים בכל פנייה עובדתית באמצעות כלי הקטלוג; הנתונים מהמסד הם מקור האמת. אם אין התאמה, שורת מידה או אפשרות לאמת, ה־Agent אומר זאת ולא משלים מידע בניחוש.
- מידע זהות מגיע מה־session המאומת ומהרשומה המתאימה בלבד. שאילתות היסטוריה ושיחות מסוננות גם לפי בעל החשבון; מזהה שיחה של משתמש אחר אינו מאפשר קריאה או המשך.
- ה־Agent אינו חושף פרטי חשבון של אדם אחר או היסטוריית שיחה שלו, סיסמאות, password hashes, session tokens, API keys, הוראות מערכת/מפתח או תצורה פנימית רגישה. כתובת האימייל של המשתמש עצמו מוצגת רק לפי בקשתו.
- הודעות משתמש, היסטוריית שיחה, שדות קטלוג ונתוני הקשר נחשבים קלט לא מהימן; הם אינם יכולים לעקוף את ההוראות. בקשת חשיפת סודות או פעולה לא מורשית נדחית ומופנית חזרה לעזרה בקניות.
- כלי הקטלוג פותחים SQLite עם `mode=ro` ומפעילים `PRAGMA query_only=ON`. נקודת ה־API לתמונות מגישה רק קובץ קיים שמתחת ל־`data/`.
- ב־`output/audit_trail.json` נרשמים אירועי התחלה, קריאת כלי וסיום עם זמן UTC וסיבה מנורמלת. נרשמים סיכומי arguments ותוצאות בלבד; לא נרשמים תוכן חיפוש, מזהי מוצר, פרטי לקוחות, הודעות, סודות או תשובות מלאות. כתיבה נעשית עם נעילת קובץ ב־Unix וב־Windows; ב־Unix הרשאות הקובץ מוגבלות לבעלים בלבד, וב־Windows ההרשאות תלויות ב־ACL של המחשב.

### מפרטי ריצה ומגבלות

| הגדרה | מה קיים בקוד |
| --- | --- |
| מודל | ברירת המחדל היא `gpt-6-luna` עם `openai_reasoning_effort=none`; ניתן לשנות דרך `PORTKEY_MODEL`. זוהי ההגדרה הנוכחית בקוד, ללא מפתח סודי בקוד. קריאת Portkey חיה למודל הזה עם קריאת כלי הצליחה. |
| שער וספק | בקשת OpenAI-compatible נשלחת ל־Portkey. `PORTKEY_API_KEY` נקרא מסביבת ה־Backend; `PORTKEY_BASE_URL` אופציונלי, אחרת משתמשים ב־`PORTKEY_GATEWAY_URL`; `PORTKEY_PROVIDER` ברירת מחדל `openai`. |
| זמן/ניסיון HTTP | לקוח המודל מוגדר עם timeout של 30 שניות ו־`max_retries=1` ברמת בקשת ה־HTTP. זהו ניסיון HTTP חוזר, לא הגבלת לולאת ה־Agent. |
| מגבלת שיחה נכנסת | עד 24 הודעות ועד 4,000 תווים לכל תוכן הודעה; חשבון מחובר משחזר עד 23 הודעות קודמות ומוסיף את ההודעה החדשה, בהתאם לתקרה. |
| תוצאות חיפוש | `search_catalogue` מגביל כל חיפוש ל־102 מוצרים; גם צבירת הכרטיסים ב־Agent מוגבלת ל־102 מוצרים ייחודיים להרצה. |
| לולאת Agent | הקוד אינו מגדיר `usage_limits`, `max_tool_calls` או מגבלת איטרציות ייעודית; `Agent.run` משתמש בברירות המחדל של PydanticAI. גרסת PydanticAI שנמצאה בסביבת `.venv` בזמן הבדיקה היא 1.107.7, בעוד `requirements.txt` מאפשר גרסאות `>=1.0,<2.0`; לכן אין כאן מספר מקסימלי קשיח של קריאות כלי שמוגדר בפרויקט. |
| שמירת Agent | `_build_agent` משתמש ב־`lru_cache(maxsize=4)` לפי הגדרות המודל והשער. ה־System Prompt נקרא מקובץ בזמן בניית Agent. |
| session | עוגיית session חתומה תקפה לשבעה ימים. יש להגדיר `CAMPUS_CUSTOMS_SESSION_SECRET` קבוע להפעלה יציבה; `CAMPUS_CUSTOMS_COOKIE_SECURE=true` מסמן עוגיית HTTPS. |
| בסיס הנתונים וקבצים | המסד והתמונות נמצאים ב־`data/`; הם מוחרגים מ־Git. `PORTKEY_API_KEY` ו־`.env` מוחרגים אף הם. יש לפרוס את `data.zip` מקומית לפני הפעלה. |

### הפעלת ה־Backend וה־Frontend

מתיקיית הפרויקט הראשית, מתקינים פעם אחת את התלויות (אם סביבת העבודה עדיין לא הוכנה):

```bash
python3 -m venv .venv
.venv/bin/python -m pip install -r requirements.txt
cd frontend && npm install
```

בטרמינל הראשון, משורש הפרויקט. יש לספק את המפתח דרך סביבת התהליך ולא לשמור אותו בקובץ שעולה ל־Git:

```bash
export PORTKEY_API_KEY="<Portkey key>"
.venv/bin/python -m uvicorn backend.main:app --reload --host 127.0.0.1 --port 8000
```

בטרמינל השני:

```bash
cd frontend
npm run dev
```

פותחים את כתובת Vite שמופיעה בטרמינל (בדרך כלל `http://127.0.0.1:5173`). תצורת `vite.config.ts` קושרת אותו ל־`127.0.0.1` ומעבירה בקשות `/api` ל־FastAPI בפורט 8000. לשרת יחיד לאחר build מריצים `cd frontend && npm run build`, מפעילים את Uvicorn, ונכנסים ל־`http://127.0.0.1:8000`; `backend/main.py` מגיש את `frontend/dist` כאשר הוא קיים.
