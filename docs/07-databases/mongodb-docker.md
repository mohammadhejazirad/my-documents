---
title: MongoDB در Docker
sidebar_position: 9
description: "MongoDB 8 در Compose با احراز هویت، پورت localhost، و volume نام‌دار روی docker-1."
---

# MongoDB در Docker

## مقدمه

این صفحه ایمیج `mongo:8` را روی `docker-1.example.internal` یعنی `10.10.1.30` بالا می‌آورد. پورت میزبان فقط `127.0.0.1:27017` است، داده روی volume نام‌دار `/data/db` می‌ماند، رمز نمونه `change-me` است، و `restart` برابر `unless-stopped` است. مدل Compose در [compose](/docs/05-docker/compose) و نمونهٔ کوتاه در [compose-mongodb](/docs/05-docker/compose-mongodb) است. دستور همین صفحه برای اجرای سرویس کافی است.

احراز هویت روشن است چون هر دو متغیر ریشه ست شده‌اند. این صفحه replica set نمی‌سازد. تراکنش چندسندی و change stream این‌جا کار نمی‌کنند. آن را در [Replica و بکاپ MongoDB](./mongodb-replica-backup.md) اضافه کنید، نه با خاموش کردن رمز.

اگر برنامه روی `app-1` با آدرس `10.10.1.10` بیرون از Docker است، این پورت به آن نمی‌رسد. نصب بسته‌ای روی `db-1` در [MongoDB روی سرور](./mongodb-server.md) است. پورت کانتینر را روی همهٔ کارت‌ها منتشر نکنید.

## مفهوم اصلی

ایمیج رسمی اگر `MONGO_INITDB_ROOT_USERNAME` و `MONGO_INITDB_ROOT_PASSWORD` هر دو باشند، `mongod` را با `--auth` بالا می‌آورد و کاربر ریشه را در دیتابیس `admin` می‌سازد. اگر یکی از دو متغیر نباشد، کاربر ساخته نمی‌شود و نباید فرض کنید نصف پیکربندی یعنی امنیت. بدون هر دو، نمونه بدون رمز می‌ماند.

اسکریپت‌های `/docker-entrypoint-initdb.d` فقط وقتی اجرا می‌شوند که volume داده خالی باشد. ایمیج آن‌ها را با کاربر ریشه‌ای که همین الان ساخته اجرا می‌کند. تغییر بعدی فایل اسکریپت روی volume پر اثری ندارد.

دادهٔ پایدار `/data/db` است. بدون volume، سندها داخل لایهٔ کانتینر می‌مانند و با حذف کانتینر می‌روند. `docker compose down -v` خود volume را هم پاک می‌کند.

داخل کانتینر فرایند روی رابط‌های netns گوش می‌دهد تا پورت منتشرشده و سرویس‌های هم‌شبکه بتوانند وصل شوند. چیزی که از شبکهٔ سازمان دیده می‌شود فقط `127.0.0.1` روی میزبان Docker است. این دو جمله با هم تناقض ندارند: یکی شنود داخل netns است و دیگری انتشار روی میزبان.

## چرا استفاده می‌شود؟

برنامهٔ سندی که خودش هم در Compose روی `docker-1` زندگی می‌کند، با تگ `mongo:8` به بستهٔ Ubuntu وابسته نیست. MongoDB از اول هم در مخزن Ubuntu نبود، پس اینجا مرز «پشتیبانی Canonical» را از دست نمی‌دهید؛ همان مرز را روی نصب بسته‌ای هم نداشتید. چیزی که به‌دست می‌آورید قفل نسخه و حجم جدا است. چیزی که از دست می‌دهید سادگی `systemctl` و مسیر مستقیم `app-1` است.

برای آزمون بازیابی `mongodump` یک کانتینر دوم با volume جدا مناسب است. آن را با volume تولید یکی نکنید.

## Architecture

```text
docker-1  10.10.1.30
   │
   ├── 127.0.0.1:27017 ──► کانتینر app-mongodb
   │                       ایمیج mongo:8
   │                       --auth به‌خاطر متغیرهای ریشه
   │                       volume app-mongodb-data -> /data/db
   │
   └── شبکهٔ Compose
         سرویس برنامه ── نام mongodb ، پورت 27017

app-1
   └── به پورت میزبان نمی‌رسد
```

فایل‌ها:

```text
/opt/apps/mongodb/compose.yaml
/opt/apps/mongodb/.env
/opt/apps/mongodb/init/01-app.js
```

## Installation

```bash
docker compose version
sudo docker pull mongo:8
sudo install -d -o root -g root -m 0755 /opt/apps/mongodb/init
sudo touch /opt/apps/mongodb/.env
sudo chmod 0600 /opt/apps/mongodb/.env
```

تگ را `latest` نگذارید. اگر کشیدن ایمیج شکست خورد، [آینهٔ رجیستری](/docs/05-docker/registry-mirror) و دوباره همان `mongo:8`.

نسخه:

```bash
sudo docker run --rm --entrypoint mongod mongo:8 --version
```

خروجی باید خط `v8.0` را داشته باشد. patch را از همین فرمان بخوانید.

شناسهٔ کاربر داخل ایمیج را هم یک‌بار ببینید. صفحهٔ replica برای کلیدفایل به آن نیاز دارد. این صفحه کلیدفایل نمی‌سازد، ولی اگر عدد غیر از ۹۹۹ بود همان را یادداشت کنید.

```bash
sudo docker run --rm --entrypoint id mongo:8
```

نمونهٔ سالم:

```text
uid=999(mongodb) gid=999(mongodb) groups=999(mongodb)
```

## Configuration

```bash
sudo tee /opt/apps/mongodb/.env >/dev/null <<'EOF'
MONGO_INITDB_ROOT_USERNAME=root
MONGO_INITDB_ROOT_PASSWORD=change-me
MONGO_INITDB_DATABASE=app
EOF
sudo chmod 0600 /opt/apps/mongodb/.env
```

`MONGO_INITDB_DATABASE` فقط دیتابیس اولیه را می‌سازد و به کاربر ریشه نقش محدود نمی‌دهد. کاربر ریشه همچنان نقش `root` در `admin` است.

:::warning رمز نمونه
`change-me` را عوض کنید. در `docker inspect` دیده می‌شود. فایل را کامیت نکنید.
:::

کاربر برنامه در اسکریپت init. این اسکریپت محدودیت مبدأ Docker را روی یک IP میزبان سخت‌کد نمی‌کند، چون مبدأ داخل شبکهٔ Compose یک آدرس پل است که با هر بالا آمدن عوض می‌شود. جبرانش این است که پورت میزبان localhost بماند و کانتینر غریبه به این شبکه وصل نشود.

```bash
sudo tee /opt/apps/mongodb/init/01-app.js >/dev/null <<'EOF'
db = db.getSiblingDB("admin")
db.createUser({
  user: "app_user",
  pwd: "change-me",
  roles: [ { role: "readWrite", db: "app" } ]
})
EOF
sudo chmod 0640 /opt/apps/mongodb/init/01-app.js
```

```bash
sudo tee /opt/apps/mongodb/compose.yaml >/dev/null <<'EOF'
name: app-mongodb
services:
  mongodb:
    image: mongo:8
    container_name: app-mongodb
    restart: unless-stopped
    env_file:
      - .env
    ports:
      - "127.0.0.1:27017:27017"
    volumes:
      - app-mongodb-data:/data/db
      - ./init/01-app.js:/docker-entrypoint-initdb.d/01-app.js:ro
volumes:
  app-mongodb-data:
    name: app-mongodb-data
EOF
```

## Production Example

```bash
cd /opt/apps/mongodb
sudo docker compose up -d
sudo docker compose ps
sudo ss -lptn 'sport = :27017'
```

شنوندهٔ میزبان باید `127.0.0.1:27017` باشد. لاگ باید از ساخت کاربر ریشه و اجرای `01-app.js` بگوید.

```bash
sudo docker compose logs --tail 40 mongodb
```

ورود بی‌رمز باید شکست بخورد.

```bash
sudo docker compose exec mongodb mongosh --quiet --eval 'db.getSiblingDB("admin").getUsers()'
```

انتظار: خطای احراز هویت. سپس کار واقعی. رمز را بعد از `--password` خالی بگذارید تا پرسیده شود. در خط زیر مقدار رمز نوشته نشده است.

```bash
sudo docker compose exec mongodb mongosh --quiet --username app_user --password --authenticationDatabase admin app --eval 'db.orders.insertOne({ sku: "A-1", qty: 2 }); db.orders.insertOne({ sku: "B-4", qty: 1 }); print("count=" + db.orders.countDocuments())'
```

باید `count=2` را ببینید. برنامهٔ هم‌کامپوز از نام `mongodb` و پورت `27017` و `authSource=admin` استفاده می‌کند. `127.0.0.1` داخل کانتینر برنامه به این MongoDB نمی‌رسد.

بقا:

```bash
cd /opt/apps/mongodb
sudo docker compose down
sudo docker volume ls --filter name=app-mongodb-data
sudo docker compose up -d
sudo docker compose exec mongodb mongosh --quiet --username app_user --password --authenticationDatabase admin app --eval 'print("count=" + db.orders.countDocuments())'
```

دوباره `count=2`. اگر صفر بود یا اسکریپت init دوباره اجرا شده، volume نو است یا نامش در `compose.yaml` عوض شده است.

تراکنش را همین‌جا امتحان کنید تا محدودیت صفحه روشن باشد.

```bash
sudo docker compose exec mongodb mongosh --quiet --username root --password --authenticationDatabase admin --eval 'const s = db.getMongo().startSession(); s.startTransaction(); s.abortTransaction(); s.endSession();'
```

انتظار: خطا دربارهٔ replica set، نه یک موفقیت خاموش. راه‌اندازی تک‌عضوی در صفحهٔ replica است و آنجا گفته می‌شود چرا هنوز دسترس‌پذیری بالا نیست.

## Security Notes

- هر دو متغیر ریشه باید باشند. پاک کردن رمز از `.env` بعد از اولین اجرا، احراز هویت volume موجود را خاموش نمی‌کند و پاک کردنش قبل از اولین اجرا امنیت را خاموش می‌کند.
- پورت فقط `127.0.0.1`. `27017:27017` بدون آدرس ممنوع است.
- `app_user` نقش `root` ندارد. کار مدیر با کاربر ریشه و فقط از `docker compose exec` روی خود میزبان است.
- اسکریپت init و `.env` را به گیت نفرستید.
- `down -v` داده را پاک می‌کند.
- هر سرویس داخل همین پروژه به پورت ۲۷۰۱۷ شبکهٔ Compose می‌رسد. این جایگزین فایروال میزبان نیست و دلیل باز کردن پورت روی `10.10.1.30` هم نیست.
- این صفحه `clientSource` نمی‌گذارد چون IP کانتینر ثابت نیست. اگر به آن محدودیت نیاز دارید، مسیر بسته‌ای روی `db-1` صادق‌تر است.

## Troubleshooting

| نشانه | علت محتمل | کار |
| --- | --- | --- |
| بدون رمز می‌شود دستور زد | یکی از متغیرهای ریشه نبوده، یا volume قدیمی بدون auth است | لاگ اولین اجرا. volume آزمایشی را فقط اگر داده ندارید حذف و دوباره بسازید |
| `01-app.js` تغییر کرده و کاربر نیست | init دوباره اجرا نمی‌شود | کاربر را با `mongosh` و حساب root بسازید |
| `app-1` وصل نمی‌شود | انتشار فقط localhost | صفحهٔ سرور روی `db-1` |
| برنامهٔ کانتینری `ECONNREFUSED` روی `127.0.0.1` | میزبان اشتباه | نام سرویس `mongodb` |
| کانتینر ری‌استارت می‌شود | حجم `/data/db` خراب یا مجوز | `docker compose logs mongodb` |
| پورت اشغال است | `mongod` میزبان یا کانتینر دیگر | `sudo ss -lptn 'sport = :27017'` |
| تراکنش شکست می‌خورد | replica نیست | صفحهٔ replica |

اگر شک دارید auth واقعاً از متغیرها آمده:

```bash
cd /opt/apps/mongodb
sudo docker compose config
```

خروجی رمز را دارد. در تیکت پیست نکنید.

## Best Practices

- تگ `mongo:8`، volume با نام ثابت `app-mongodb-data`، پورت فقط localhost، `unless-stopped`.
- init را برای کاربر برنامه استفاده کنید و انتظار نداشته باشید بار دوم اجرا شود.
- سلامت سرویس را با یک فرمان بی‌رمز که باید رد شود بسنجید، نه فقط با `docker compose ps`.
- بکاپ را `mongodump` بگیرید. کپی `/data/db` از volume در حال اجرا ناسازگار است.
- replica و کلیدفایل را به این فایل «یک خط command» بدون خواندن صفحهٔ بعد اضافه نکنید. بدون کلیدفایل، ترکیب auth و replica بالا نمی‌آید.
- کانتینر آزمون را با نام volume تولید یکی نکنید و در پایان `-v` را فقط روی همان نام آزمون بزنید.
