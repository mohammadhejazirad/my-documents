---
title: PostgreSQL روی سرور
sidebar_position: 5
description: "نصب PostgreSQL 18 روی Ubuntu 26.04، کلاستر 18/main، و دسترسی فقط از app-1."
---

# PostgreSQL روی سرور

## مقدمه

این صفحه PostgreSQL 18 را با بستهٔ Ubuntu روی `db-1.example.internal` یعنی `10.10.1.20` نصب می‌کند. کلاستر `18/main` است، فایل‌هایش زیر `/etc/postgresql/18/main/` می‌مانند، و ورود مدیر با `sudo -u postgres psql` است. برنامه از `10.10.1.10` با کاربر `app_user` به دیتابیس `app` وصل می‌شود. کانتینر در [PostgreSQL در Docker](./postgresql-docker.md) است. حافظه، لاگ کند، و بکاپ در [بکاپ و کارایی PostgreSQL](./postgresql-backup-performance.md) است تا عدد `shared_buffers` وسط نصب گم نشود.

اگر بین MySQL و PostgreSQL مردد هستید، [نقشهٔ دیتابیس](./index.md) را ببینید. پیش‌فرض این دانشنامه برای برنامهٔ رابطه‌ای تازه همین صفحه است.

## مفهوم اصلی

بستهٔ `postgresql` روی Ubuntu 26.04 کلاستر ۱۸ را می‌سازد. «کلاستر» در زبان بسته‌بندی Debian یعنی یک نمونهٔ در حال اجرای PostgreSQL با دایرکتوری دادهٔ خودش، نه یعنی چند نود. نام این یکی `main` است. دو کلاستر می‌توانند کنار هم باشند؛ این فصل فقط `18/main` را استفاده می‌کند.

کاربر سیستم `postgres` مالک داده است و با احراز هویت `peer` از سوکت محلی بدون رمز وارد می‌شود. یعنی سیستم‌عامل کاربر را معرفی می‌کند و رمز پرسیده نمی‌شود. این معادل عملی `sudo mysql` در صفحهٔ MySQL است، با این تفاوت که باید خود کاربر `postgres` باشید نه `root`. `sudo psql` به‌تنهایی معمولاً شکست می‌خورد چون کاربر سیستم `root` نقش PostgreSQL به نام `root` ندارد.

شنود پیش‌فرض `localhost` است. برای آزمایشگاه، برنامه روی ماشین دیگری است، پس به `listen_addresses` آدرس `10.10.1.20` را هم اضافه می‌کنیم و در `pg_hba.conf` فقط یک خط برای `10.10.1.10/32` می‌گذاریم. زیرشبکهٔ `10.10.1.0/24` میزبان‌های دیگری هم دارد (پروکسی، مانیتورینگ، گیت). باز کردن کل آن زیرشبکه لازم نیست و این صفحه آن خط را نمی‌نویسد.

رمز نقش‌ها با `scram-sha-256` ذخیره می‌شود. این پیش‌فرض نسخه‌های اخیر است. احراز هویت `md5` را به `pg_hba.conf` برنگردانید.

هر اتصال به یک دیتابیس است. نمی‌شود از داخل `app` جدول دیتابیس دیگری را با نام سه‌قسمتی خواند. این را موقع مقایسهٔ بکاپ فراموش نکنید؛ عادت MySQL این‌جا کار نمی‌کند.

## چرا استفاده می‌شود؟

قید، تراکنش، و نوع داده در خود موتور است و برنامه مجبور نیست تنها نگهبان درستی داده باشد. JSONB هست اگر بخشی از سند منعطف است، بدون اینکه کل سفارش را به MongoDB ببرید. بسته در کامپوننت main است و با `apt` به‌روز می‌شود. برخلاف MySQL، اینجا بحث universe در برابر MariaDB را ندارید: `postgresql` همان محصولی است که این صفحه توضیح می‌دهد.

هزینه‌اش مفهوم بیشتر است: نقش (role) با کاربر سیستم فرق دارد، `pg_hba.conf` جدا از `listen_addresses` است، و تنظیم حافظه اگر از یک مقاله کپی شود یا RAM را می‌خورد یا برنامه‌ریز را گمراه می‌کند. آن تنظیم را در صفحهٔ کارایی با روش حساب کردن می‌آوریم، نه به‌صورت یک عدد جادویی در نصب.

## Architecture

```text
ops روی db-1
   │  sudo -u postgres psql
   │  سوکت محلی، روش peer
   ▼
postgres کلاستر 18/main     unit: postgresql.service
   ├── داده   /var/lib/postgresql/18/main
   ├── کانفیگ /etc/postgresql/18/main/postgresql.conf
   ├── دسترسی /etc/postgresql/18/main/pg_hba.conf
   ├── دراپ‌این /etc/postgresql/18/main/conf.d/99-app.conf
   ├── لاگ    /var/log/postgresql/postgresql-18-main.log
   ├── localhost:5432
   └── 10.10.1.20:5432     فقط اگر خط pg_hba جور شود

app-1 10.10.1.10
   └── کاربر app_user، دیتابیس app، روش scram-sha-256
```

ترتیب رد کردن اتصال این است: اگر `listen_addresses` آدرس را نگرفته باشد اتصال اصلاً به احراز هویت نمی‌رسد. اگر گرفته باشد، اولین خط جور در `pg_hba.conf` برنده است و خط‌های بعدی دیده نمی‌شوند. خط شل را بالای خط خاص نگذارید.

`include_dir = 'conf.d'` در فایل اصلی بسته هست. فایل `99-app.conf` همان‌جا می‌نشیند تا ارتقای بسته تنظیم محلی را با یک diff ناخوانا قاطی نکند.

## Installation

```bash
sudo apt update
apt-cache policy postgresql postgresql-18
sudo apt install postgresql
sudo systemctl enable --now postgresql
sudo pg_lsclusters
sudo systemctl status postgresql --no-pager
psql --version
```

`pg_lsclusters` باید یک سطر داشته باشد.

```text
Ver Cluster Port Status Owner    Data directory              Log file
18  main    5432 online postgres /var/lib/postgresql/18/main /var/log/postgresql/postgresql-18-main.log
```

اگر `Status` برابر `down` است، `sudo pg_ctlcluster 18 main start` و بعد `journalctl -u postgresql@18-main -n 50 --no-pager`. نسخهٔ کلاینت باید ۱۸ باشد. patch جدیدتر روی خط ۱۸ همین صفحه را باطل نمی‌کند؛ عدد را از `psql --version` بردارید نه از این متن.

ورود مدیر:

```bash
sudo -u postgres psql -c "SELECT version();"
sudo ss -lptn 'sport = :5432'
```

قبل از کانفیگ این صفحه، `ss` فقط `127.0.0.1:5432` و احتمالاً `::1` را نشان می‌دهد. این حالت امن است و تا وقتی برنامه روی خود `db-1` است کافی است. ادامهٔ کانفیگ برای جدا بودن `app-1` است.

## Configuration

منطقهٔ زمانی موتور UTC می‌ماند. ساعت سیستم همچنان `Asia/Tehran` است.

```bash
sudo tee /etc/postgresql/18/main/conf.d/99-app.conf >/dev/null <<'EOF'
listen_addresses = 'localhost,10.10.1.20'
timezone = 'UTC'
log_timezone = 'UTC'
EOF
```

`listen_addresses` با reload اعمال نمی‌شود. ری‌استارت لازم است و اتصال‌ها قطع می‌شوند.

یک خط به ته `pg_hba.conf`. اگر فرمان را دوباره اجرا کنید خط تکراری نمی‌سازد.

```bash
sudo grep -q '10.10.1.10/32' /etc/postgresql/18/main/pg_hba.conf \
  || echo 'host    app    app_user    10.10.1.10/32    scram-sha-256' \
  | sudo tee -a /etc/postgresql/18/main/pg_hba.conf >/dev/null
sudo systemctl restart postgresql
sudo systemctl status postgresql --no-pager
sudo ss -lptn 'sport = :5432'
```

باید هم `127.0.0.1:5432` باشد و هم `10.10.1.20:5432`. `0.0.0.0:5432` نباید باشد. خط `pg_hba` نام دیتابیس را `app` محدود کرده، نه `all`. نقش‌های دیگر از آن IP وارد نمی‌شوند.

نقش و دیتابیس. تاریخچهٔ `psql` را دور بریزید تا رمز در `/var/lib/postgresql/.psql_history` نماند. تاریخچهٔ شل خود `ops` این متن را دارد؛ بعد از اجرا آن خط را از تاریخچهٔ شل پاک کنید.

```bash
sudo -u postgres env PSQL_HISTORY=/dev/null psql -v ON_ERROR_STOP=1 <<'SQL'
SELECT current_setting('password_encryption');
CREATE ROLE app_user LOGIN PASSWORD 'change-me';
CREATE DATABASE app;
REVOKE ALL ON DATABASE app FROM PUBLIC;
GRANT CONNECT, TEMP ON DATABASE app TO app_user;
SQL
sudo -u postgres env PSQL_HISTORY=/dev/null psql -v ON_ERROR_STOP=1 -d app <<'SQL'
REVOKE CREATE ON SCHEMA public FROM PUBLIC;
GRANT USAGE ON SCHEMA public TO app_user;
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO app_user;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO app_user;
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public
  GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO app_user;
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public
  GRANT USAGE, SELECT ON SEQUENCES TO app_user;
SQL
```

:::warning رمز نمونه
`change-me` را روی سرور واقعی عوض کنید. خروجی `password_encryption` باید `scram-sha-256` باشد. اگر `md5` بود، نقش را بعد از درست کردن تنظیم دوباره بسازید وگرنه هش قدیمی می‌ماند.
:::

`ALTER DEFAULT PRIVILEGES` فقط روی شیءهایی اثر دارد که خود `postgres` از این به بعد می‌سازد. جدولی که نقش دیگری بسازد این امتیاز را ارث نمی‌برد. در این فصل ساخت جدول کار `postgres` است و `app_user` حق `CREATE` ندارد.

فایروال:

```bash
sudo ufw allow OpenSSH
sudo ufw allow from 10.10.1.10 to any port 5432 proto tcp comment 'app-1 postgres'
sudo ufw status verbose
```

قانون برای `10.10.1.0/24` ننویسید. مبدأ فقط `app-1` است. توضیح UFW در [UFW](/docs/10-security/ufw) است.

درستی خط‌ها:

```bash
sudo -u postgres psql -c "SHOW listen_addresses;"
sudo -u postgres psql -c "SELECT line_number, type, database, user_name, address, auth_method FROM pg_hba_file_rules WHERE address = '10.10.1.10';"
```

یک سطر با روش `scram-sha-256` باید برگردد. ستون دیتابیس را ابزار `psql` گاهی به‌شکل آرایه نشان می‌دهد. در خود فایل `pg_hba.conf` فقط کلمهٔ `app` را بنویسید و از نحو آرایه استفاده نکنید. خط فایل همان متن ساده‌ای است که بالاتر اضافه کردیم.

## Production Example

جدول را با مدیر بسازید.

```bash
sudo -u postgres psql -v ON_ERROR_STOP=1 -d app <<'SQL'
CREATE TABLE orders (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  sku text NOT NULL,
  qty integer NOT NULL CHECK (qty >= 0),
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX orders_sku ON orders (sku);
INSERT INTO orders (sku, qty) VALUES ('A-1', 2), ('B-4', 1);
SQL
```

از `app-1` کلاینت را نصب کنید اگر نیست: `sudo apt install postgresql-client`. فایل رمز محلی، نه متغیر `PGPASSWORD` که در محیط فرایند می‌ماند.

```bash
install -m 0600 /dev/null "$HOME/.pgpass"
printf '%s\n' '10.10.1.20:5432:app:app_user:change-me' > "$HOME/.pgpass"
chmod 0600 "$HOME/.pgpass"
psql -h 10.10.1.20 -U app_user -d app -c "SELECT id, sku, qty FROM orders ORDER BY id;"
```

اگر مجوز `.pgpass` از `0600` شل‌تر باشد، `libpq` فایل را نادیده می‌گیرد و رمز می‌پرسد. خروجی سالم دو سطر سفارش است. این کاربر نباید جدول بسازد.

```bash
psql -h 10.10.1.20 -U app_user -d app -c "CREATE TABLE should_fail (id int);"
```

انتظار: `ERROR: permission denied for schema public`. اگر جدول ساخته شد، `REVOKE CREATE` اجرا نشده است.

روی `db-1` اتصال سوکت هنوز برای `postgres` باز است و از خط جدید `pg_hba` رد نمی‌شود، چون خط‌های `local` بالاترند.

```bash
sudo -u postgres psql -d app -c "SELECT current_user;"
```

باید `postgres` چاپ شود، بدون پرسیدن رمز.

تنظیم حافظه و لاگ کند را همین حالا از صفحهٔ [بکاپ و کارایی](./postgresql-backup-performance.md) اعمال کنید. بدون آن، پیش‌فرض `shared_buffers` برای یک سرور اختصاصی کوچک است و کندی را جایی ثبت نمی‌کنید.

## Security Notes

- `listen_addresses = '*'` و `0.0.0.0` ننویسید. مقدار این صفحه `localhost` به‌علاوهٔ کارت خود `db-1` است.
- خط `pg_hba` برای `10.10.1.10/32` است. خط `10.10.1.0/24` را «برای راحتی» اضافه نکنید. روش `trust` و `md5` ممنوع است.
- `app_user` مالک دیتابیس و ابرکاربر نیست. `SUPERUSER`، `CREATEDB` و `CREATEROLE` ندهید.
- رمز در `PGPASSWORD` و در آرگومان `-c` تاریخچه نماند. `.pgpass` فقط `0600`.
- فایل `pg_hba.conf` را از آموزش اینترنتی رونویسی نکنید. خط‌های `local peer` برای کاربر `postgres` باید بمانند وگرنه `sudo -u postgres psql` می‌شکند.
- پورت ۵۴۳۲ در UFW فقط از `10.10.1.10`.
- لاگ PostgreSQL ممکن است متن کوئری را داشته باشد. اگر کوئری را با پارامتر داخل متن بسازید، دادهٔ مشتری وارد لاگ می‌شود. از پارامتر آماده استفاده کنید، نه از چسباندن رشته.

## Troubleshooting

| نشانه | علت محتمل | کار |
| --- | --- | --- |
| `Peer authentication failed for user` | با کاربر سیستم اشتباه به سوکت زده‌اید | مدیر فقط `sudo -u postgres psql` |
| `psql: error: connection to server on socket` | کلاستر خواب است | `sudo pg_lsclusters` و `sudo pg_ctlcluster 18 main start` |
| از `app-1` تایم‌اوت | شنود یا فایروال | `ss` باید `10.10.1.20:5432` را نشان دهد و UFW فقط همان مبدأ |
| `pg_hba.conf rejects connection` | خط غلط، یا فایل reload نشده، یا آدرس مبدأ چیز دیگری است | `sudo -u postgres psql -c "SELECT pg_reload_conf();"` بعد از اصلاح خط. تغییر `listen_addresses` ری‌استارت می‌خواهد نه reload |
| `password authentication failed` با رمز درست | هش با روش خط `pg_hba` یکی نیست، یا به دیتابیس/کاربر دیگری می‌روید | `SHOW password_encryption` و خط hba هر دو scram |
| `no pg_hba.conf entry` | مبدأ شما `10.10.1.10` نیست | از خود `app-1` بزنید. آزمون از `db-1` با آن حساب باید رد شود |
| `permission denied for schema public` برای مهاجرت | حساب برنامه حق DDL ندارد | مهاجرت را با `sudo -u postgres` بزنید، نه با شل کردن `app_user` |
| ری‌استارت شکست می‌خورد | غلط املایی در `conf.d` | `sudo journalctl -u postgresql@18-main -n 40 --no-pager` |

قبل از ری‌استارت می‌توانید فایل را با خود سرور بسنجید، بدون قطع کردن سرویس. این فرمان کلاستر را عوض نمی‌کند.

```bash
sudo -u postgres /usr/lib/postgresql/18/bin/postgres -D /var/lib/postgresql/18/main -C listen_addresses
```

اگر کانفیگ خراب باشد همین‌جا خطا می‌دهد. مقدار چاپ‌شده باید `localhost,10.10.1.20` باشد.

## Best Practices

- تنظیم محلی فقط در `conf.d/99-app.conf`. `postgresql.conf` بسته را برای یک کلید بازنویسی نکنید.
- اول `ss`، بعد یک اتصال از `app-1`، بعد بستن UFW را امتحان کنید. اگر ترتیب را برعکس کنید خودتان را بیرون می‌گذارید فقط اگر قانون SSH را هم اشتباه کرده باشید؛ قانون SSH را دست نزنید.
- جدول جدید را با `postgres` بسازید و امتیاز پیش‌فرض را همان‌جا به `app_user` بدهید. نقش برنامه `CREATE` ندارد.
- دیتابیس‌ها را با کوئری بین‌پایگاهی MySQL مقایسه نکنید. دو بار `psql -d` بزنید.
- عدد حافظه را از صفحهٔ کارایی و از `free -h` همین ماشین بیاورید.
- همان روز، یک `pg_dump` و یک `pg_restore` را از صفحهٔ بعدی انجام دهید.
- کلاستر دوم را «برای آزمون» روی پورت ۵۴۳۲ نسازید. آزمون بازیابی دیتابیس `app_restore` روی همین کلاستر است، یا روی کانتینر جدا.
