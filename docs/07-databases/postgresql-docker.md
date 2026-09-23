---
title: PostgreSQL در Docker
sidebar_position: 6
description: "PostgreSQL 18 در Compose، داده زیر /var/lib/postgresql، پورت فقط localhost، و کاربر app_user."
---

# PostgreSQL در Docker

## مقدمه

این صفحه PostgreSQL 18 را روی `docker-1.example.internal` یعنی `10.10.1.30` با ایمیج `postgres:18` بالا می‌آورد. پورت میزبان فقط `127.0.0.1:5432` است، volume نام‌دار است، رمز نمونه `change-me` است، و `restart` برابر `unless-stopped` است. مدل Compose در [compose](/docs/05-docker/compose) و نمونهٔ کوتاه در [compose-postgres](/docs/05-docker/compose-postgres) است. دستورهای زیر برای بالا آوردن همین سرویس کافی‌اند.

برنامهٔ روی `app-1` از شبکه به این پورت نمی‌رسد. اگر باید برسد، [PostgreSQL روی سرور](./postgresql-server.md) را روی `db-1` نصب کنید و پورت کانتینر را به `0.0.0.0` باز نکنید.

## مفهوم اصلی

از PostgreSQL 18 مسیر دادهٔ ایمیج رسمی عوض شده است. متغیر `PGDATA` برابر `/var/lib/postgresql/18/docker` است و `VOLUME` ایمیج روی `/var/lib/postgresql` است. volume را باید همان‌جا سوار کنید. سوار کردن روی `/var/lib/postgresql/data` عادت نسخه‌های ۱۷ و قبل است و در ۱۸ داده را نگه نمی‌دارد: کانتینر بالا می‌آید، فایل‌ها می‌روند داخل لایه‌ای که با حذف کانتینر از بین می‌رود، و شما فکر می‌کنید volume کار کرده است.

کاربر `POSTGRES_USER` اگر ست شود ابرکاربر همان کلاستر می‌شود. `app_user` را آنجا نگذارید. رمز `POSTGRES_PASSWORD` مال نقش `postgres` داخل کانتینر است. کاربر برنامه را اسکریپت اولین اجرا می‌سازد، با حق محدود روی دیتابیس `app`. آن اسکریپت فقط وقتی اجرا می‌شود که دایرکتوری داده خالی باشد. بار دوم که volume پر است، تغییر اسکریپت هیچ اثری ندارد.

داخل کانتینر سرور روی رابط‌های خودش گوش می‌دهد. محدودیت شبکه مال کلید `ports` روی میزبان است، نه مال `listen_addresses = localhost` داخل کانتینر. اگر داخل کانتینر فقط localhost باشد، هم پورت منتشرشده و هم سرویس کناری Compose بی‌صدا رد می‌شوند.

احراز هویت ایمیج برای اتصال TCP رمز می‌خواهد. سوکت `peer` میزبان Ubuntu این‌جا نیست چون کاربر سیستم میزبان با کاربر داخل کانتینر یکی نیست.

## چرا استفاده می‌شود؟

وقتی برنامه هم در همان Compose روی `docker-1` است، قفل بودن روی `postgres:18` ارتقای توزیع را از ارتقای موتور جدا می‌کند. مسیر دادهٔ نسخه‌دار ایمیج برای ارتقای عمده با `pg_upgrade --link` طراحی شده؛ این صفحه آن ارتقا را انجام نمی‌دهد و فقط volume را درست سوار می‌کند تا ارتقای بعدی ممکن بماند.

برای `app-1` که بیرون از Docker است، کانتینر با پورت localhost مسئله را حل نمی‌کند. یک آزمون بازیابی دامپ روی کانتینر موقتی هنوز معنی دارد و در [بکاپ و کارایی](./postgresql-backup-performance.md) از همین ایمیج استفاده می‌شود.

## Architecture

```text
docker-1  10.10.1.30
   │
   ├── 127.0.0.1:5432 ──► کانتینر app-postgres
   │                      ایمیج postgres:18
   │                      volume app-postgres-data -> /var/lib/postgresql
   │                      دادهٔ واقعی: /var/lib/postgresql/18/docker
   │
   └── شبکهٔ Compose
         سرویس برنامه ── نام postgres ، پورت 5432

app-1 10.10.1.10
   └── به پورت میزبان docker-1 نمی‌رسد
```

فایل‌ها:

```text
/opt/apps/postgres/compose.yaml
/opt/apps/postgres/.env                         مجوز 0600
/opt/apps/postgres/init/01-app.sql              فقط در volume خالی
```

## Installation

```bash
docker compose version
sudo docker pull postgres:18
sudo install -d -o root -g root -m 0755 /opt/apps/postgres/init
sudo touch /opt/apps/postgres/.env
sudo chmod 0600 /opt/apps/postgres/.env
```

اگر `docker pull` به رجیستری نرسید، [آینهٔ رجیستری](/docs/05-docker/registry-mirror) را بگذارید و همان تگ `postgres:18` را بکشید. تگ `latest` را جایگزین نکنید.

نسخهٔ داخل ایمیج را ببینید.

```bash
sudo docker run --rm --entrypoint postgres postgres:18 --version
```

باید خط ۱۸ را چاپ کند. patch داخل تگ `18` با زمان کشیدن ایمیج عوض می‌شود.

## Configuration

```bash
sudo tee /opt/apps/postgres/.env >/dev/null <<'EOF'
POSTGRES_PASSWORD=change-me
POSTGRES_INITDB_ARGS=--data-checksums --encoding=UTF8 --locale=C.UTF-8
EOF
sudo chmod 0600 /opt/apps/postgres/.env
```

`--data-checksums` را فقط روی volume خالی می‌توان انتخاب کرد. بعداً با یک خط کانفیگ روشن نمی‌شود. اگر volume را قبلاً بدون این پرچم ساخته‌اید، برای گرفتنش باید از نو و با دامپ منطقی منتقل کنید، نه با عوض کردن `.env`.

:::warning رمز نمونه
`change-me` رمز نقش `postgres` داخل کانتینر است. عوضش کنید. `docker inspect` آن را نشان می‌دهد. گروه `docker` روی میزبان معادل دسترسی ریشه است.
:::

اسکریپت کاربر برنامه. این فایل رمز دوم را دارد؛ مجوزش را شل نگذارید.

```bash
sudo tee /opt/apps/postgres/init/01-app.sql >/dev/null <<'EOF'
CREATE ROLE app_user LOGIN PASSWORD 'change-me';
CREATE DATABASE app;
REVOKE ALL ON DATABASE app FROM PUBLIC;
GRANT CONNECT, TEMP ON DATABASE app TO app_user;
\connect app
REVOKE CREATE ON SCHEMA public FROM PUBLIC;
GRANT USAGE ON SCHEMA public TO app_user;
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public
  GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO app_user;
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public
  GRANT USAGE, SELECT ON SEQUENCES TO app_user;
EOF
sudo chmod 0640 /opt/apps/postgres/init/01-app.sql
```

`\connect` دستور خود `psql` است و ایمیج رسمی فایل `.sql` را با `psql` اجرا می‌کند. اگر آن خط را بردارید، `GRANT`های اسکیما روی دیتابیس `postgres` می‌نشینند نه روی `app`.

```bash
sudo tee /opt/apps/postgres/compose.yaml >/dev/null <<'EOF'
name: app-postgres
services:
  postgres:
    image: postgres:18
    container_name: app-postgres
    restart: unless-stopped
    env_file:
      - .env
    ports:
      - "127.0.0.1:5432:5432"
    volumes:
      - app-postgres-data:/var/lib/postgresql
      - ./init/01-app.sql:/docker-entrypoint-initdb.d/01-app.sql:ro
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U postgres -d postgres"]
      interval: 10s
      timeout: 5s
      retries: 10
      start_period: 20s
volumes:
  app-postgres-data:
    name: app-postgres-data
EOF
```

مسیر volume عمداً `/var/lib/postgresql` است، بدون پسوند `data`. `healthcheck` رمز نمی‌خواهد؛ `pg_isready` فقط قبول اتصال را می‌سنجد نه درست بودن رمز `app_user` را.

## Production Example

```bash
cd /opt/apps/postgres
sudo docker compose up -d
sudo docker compose ps
sudo ss -lptn 'sport = :5432'
```

`ss` باید `127.0.0.1:5432` را نشان دهد. لاگ اولین اجرا باید از اجرای `01-app.sql` بگوید. اگر volume از تلاش قبلی پر شده باشد این خط را نمی‌بینید.

```bash
sudo docker compose logs --tail 50 postgres
sudo docker compose exec postgres psql -U postgres -d app -c "SELECT current_user, current_database();"
```

جدول و داده:

```bash
sudo docker compose exec postgres psql -U postgres -d app -v ON_ERROR_STOP=1 <<'SQL'
CREATE TABLE orders (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  sku text NOT NULL,
  qty integer NOT NULL CHECK (qty >= 0),
  created_at timestamptz NOT NULL DEFAULT now()
);
INSERT INTO orders (sku, qty) VALUES ('A-1', 2), ('B-4', 1);
SQL
```

ورود برنامه از میزبان، از پورت منتشرشده. رمز را در خط فرمان نگذارید.

```bash
sudo docker compose exec postgres psql "host=127.0.0.1 dbname=app user=app_user" -c "SELECT id, sku, qty FROM orders ORDER BY id;"
```

این دستور رمز را می‌پرسد. دو سطر باید برگردد. ساخت جدول با همین کاربر باید رد شود.

```bash
sudo docker compose exec postgres psql "host=127.0.0.1 dbname=app user=app_user" -c "CREATE TABLE should_fail (id int);"
```

انتظار: خطای مجوز روی اسکیما. مسیر داده را با خود سرور ببینید تا سوار شدن اشتباه معلوم شود.

```bash
sudo docker compose exec postgres psql -U postgres -tAc "SHOW data_directory;"
```

خروجی باید `/var/lib/postgresql/18/docker` باشد. اگر `/var/lib/postgresql/data` بود، ایمیج ۱۸ نیست یا `PGDATA` را دستی به مسیر قدیمی برگردانده‌اید.

بقا بعد از ساخت مجدد کانتینر:

```bash
cd /opt/apps/postgres
sudo docker compose down
sudo docker volume ls --filter name=app-postgres-data
sudo docker compose up -d
sudo docker compose exec postgres psql -U postgres -d app -tAc "SELECT count(*) FROM orders;"
```

باید `2` باشد. `down` بدون `-v` این را تضمین می‌کند.

سرویس برنامه در همین Compose میزبان را `postgres` می‌گذارد، کاربر را `app_user`، و دیتابیس را `app`. از داخل آن کانتینر آدرس `127.0.0.1` به PostgreSQL نمی‌رسد.

## Security Notes

- `ports` فقط `127.0.0.1:5432:5432`. شکل بدون آدرس، پورت را روی همهٔ کارت‌های `docker-1` باز می‌کند.
- `app_user` ابرکاربر نیست. `POSTGRES_USER=app_user` را به `.env` اضافه نکنید.
- `01-app.sql` و `.env` رمز دارند. اولی `0640` و دومی `0600`. هیچ‌کدام را کامیت نکنید.
- `docker compose down -v` داده را پاک می‌کند. در اسکریپت استقرار نباشد.
- شبکهٔ پیش‌فرض Compose به هر سرویس این فایل اجازهٔ رسیدن به پورت ۵۴۳۲ را می‌دهد. کانتینر متفرقه را به این پروژه وصل نکنید.
- checksum داده را با پاک کردن volume و یک دامپ از نو می‌گیرید، نه با ری‌استارت.
- تگ `postgres:latest` ممنوع. خط ۱۸ را صریح نگه دارید.

## Troubleshooting

| نشانه | علت محتمل | کار |
| --- | --- | --- |
| بعد از `down` و `up` جدول نیست | volume روی مسیر `.../data` بوده یا `-v` خورده | `SHOW data_directory` و نام volume |
| `01-app.sql` را اصلاح کرده‌اید و کاربر ساخته نمی‌شود | اسکریپت init فقط روی دادهٔ خالی است | volume آزمایشی را عمداً حذف کنید، یا کاربر را با `psql` بسازید |
| `app-1` تایم‌اوت | پورت localhost میزبان Docker | مسیر بسته‌ای روی `db-1` |
| برنامهٔ کانتینری وصل نمی‌شود | میزبان را `127.0.0.1` گذاشته | میزبان `postgres` |
| `password authentication failed` برای `postgres` | `.env` بعد از init عوض شده | رمز اولیه داخل volume مانده. یا volume را از نو بسازید یا `ALTER ROLE` |
| health غیرسالم می‌ماند | سرور هنوز initdb می‌کند یا کانفیگ خراب است | `docker compose logs postgres` |
| `locale` خطا می‌دهد | آرگومان init با ایمیج جور نیست | مقدار همین صفحه `C.UTF-8` است. فقط روی volume خالی اثر دارد |
| دو پروژه هر دو `5432` می‌خواهند | پورت میزبان تکراری | `sudo ss -lptn 'sport = :5432'` |

اگر حدس می‌زنید init اجرا نشده:

```bash
sudo docker compose logs postgres | head -n 80
```

به‌دنبال نام فایل `01-app.sql` بگردید. نبودنش یعنی volume از قبل داده داشته است.

## Best Practices

- volume روی `/var/lib/postgresql`، نه روی مسیر قدیمی `data`.
- کاربر برنامه را init script بسازید، نه با `POSTGRES_USER`.
- پورت میزبان، نام volume، و سیاست `unless-stopped` را در بازبینی Compose مثل کد برنامه چک کنید.
- رمز را بعد از اولین init با ویرایش `.env` «عوض‌شده» حساب نکنید. فایل محیطی فقط ساخت اول را تغذیه می‌کند.
- بکاپ این کانتینر `pg_dump` است. کپی دایرکتوری volume در حالی که کانتینر روشن است بکاپ سازگار نیست.
- ارتقای ۱۹ در آینده یعنی ایمیج جدید و مسیر `/var/lib/postgresql/19/docker` کنار دادهٔ ۱۸، نه عوض کردن کور تگ روی همان دایرکتوری بدون خواندن یادداشت ارتقای ایمیج.
- آزمون تخریبی را روی volume با نام `app-postgres-data` انجام ندهید. volume جدا بسازید و آخر حذفش کنید.
