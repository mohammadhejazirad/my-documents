---
title: بکاپ و کارایی PostgreSQL
sidebar_position: 7
description: "pg_dump و pg_restore، مفهوم pg_basebackup، و تنظیم محافظه‌کارانهٔ حافظه و لاگ کند."
---

# بکاپ و کارایی PostgreSQL

## مقدمه

این صفحه روی کلاستر `18/main` در `db-1` دو کار را تمام می‌کند: بکاپ منطقی که یک‌بار با `pg_restore` برگشته، و تنظیم حافظه و لاگ کند که از RAM همان ماشین حساب می‌شود نه از عدد این متن. نصب و کاربر در [PostgreSQL روی سرور](./postgresql-server.md) است. اگر داده در کانتینر است، [PostgreSQL در Docker](./postgresql-docker.md) مسیر volume را توضیح داده و فرمان دامپ همان پایین، بخش Docker، تکرار شده است.

عددهای `shared_buffers = 512MB` و `effective_cache_size = 2GB` فقط برای ماشینی است که `free -h` حدود ۴ گیبیابایت RAM نشان می‌دهد و PostgreSQL سرویس اصلی آن است. روی سرور دیگر کپی‌شان نکنید.

## مفهوم اصلی

`pg_dump` یک دیتابیس را به شکل منطقی بیرون می‌ریزد. قالب `custom` با `-Fc` فشرده و قابل انتخاب برای `pg_restore` است و برای کار روزانه بهتر از SQL ساده است. این دامپ نقش‌های سراسری را نمی‌آورد. نقش `app_user` و هش رمزش با `pg_dumpall --globals-only` جداگانه ذخیره می‌شود. بدون آن فایل، روی سرور تازه جدول‌ها را برمی‌گردانید و ورود برنامه شکست می‌خورد.

`pg_restore` فایل custom را در یک دیتابیس موجود می‌ریزد. در PostgreSQL نمی‌توانید از داخل یک دیتابیس، جدول دیتابیس دیگر را بشمارید. مقایسه یعنی دو بار `psql -d`.

`pg_basebackup` چیز دیگری است: یک کپی فیزیکی از کل کلاستر، شامل همهٔ دیتابیس‌ها و فایل‌های WAL لازم برای اینکه آن کپی خودش بالا بیاید. خروجی‌اش را با `pg_restore` باز نمی‌کنید. بازیابی‌اش یعنی جا دادن دایرکتوری داده به‌جای `/var/lib/postgresql/18/main` در حالی که سرویس خاموش است. این کار را روی تنها نسخهٔ تولید تمرین نکنید. این صفحه مفهوم و فرمان گرفتن بکاپ فیزیکی را می‌دهد و بازیابی فیزیکی را روی میزبان یدکی توضیح می‌دهد. آزمونی که همین امروز باید اجرا شود منطقی است.

`shared_buffers` حافظه‌ای است که PostgreSQL برای صفحهٔ داده کنار می‌گذارد و واقعاً از RAM کم می‌شود. `effective_cache_size` هیچ حافظه‌ای نمی‌گیرد. فقط به برنامه‌ریز می‌گوید سیستم‌عامل و خود PostgreSQL روی هم چقدر کش ممکن است داشته باشند تا بین اسکن ترتیبی و ایندکس انتخاب کند. غلط بودنش سرور را فوری نمی‌خواباند؛ برنامهٔ اجرا را بد انتخاب می‌کند.

`log_min_duration_statement` بر حسب میلی‌ثانیه است. مقدار `500` یعنی کوئری کندتر از نیم ثانیه در لاگ می‌آید. `0` همهٔ کوئری‌ها را می‌نویسد و روی تولید دیسک را پر می‌کند. `-1` لاگ کند را خاموش می‌کند.

`work_mem` سقف حافظهٔ هر مرتب‌سازی یا هش در یک کوئری است، نه یک سهمیهٔ سراسری. صد اتصال می‌توانند چند برابرش را با هم بگیرند. مقدار بزرگ «برای سرعت گزارش» روش کلاسیک تمام کردن RAM است.

## چرا استفاده می‌شود؟

دامپ منطقی را می‌شود روی کلاستر ۱۸ دیگری، و اغلب روی کانتینر `postgres:18`، برگرداند بدون اینکه شمارهٔ patch باینری یکی باشد. برای خطای انسانی مثل `DELETE` بدون شرط، این همان چیزی است که فردا لازم دارید. بکاپ فیزیکی زمان بازیابی دیتابیس خیلی بزرگ را کوتاه‌تر می‌کند ولی ابزار و مسیر بازیابی‌اش جداست. تیمی که این دو را یکی بداند، فایل tar را به `psql` می‌دهد و فکر می‌کند بکاپ خراب بوده است.

تنظیم حافظه این‌جا هست چون پیش‌فرض `shared_buffers` روی بستهٔ Debian کوچک است و روی سرور اختصاصی بیشتر RAM را دست‌نخورده به کش فایل می‌سپارد، در حالی که لاگ کند هم خاموش است و کسی نمی‌بیند کدام کوئری بد است. هر دو را با هم روشن می‌کنیم تا «کند است» به یک خط لاگ برسد، نه به حدس.

## Architecture

```text
cron ریشه
   ├── pg_dumpall --globals-only  -> /var/backups/postgresql/globals.sql
   └── pg_dump -Fc -d app         -> /var/backups/postgresql/app-STAMP.dump
                                      │
                                      ├── pg_restore -d app_restore     آزمون روی همین کلاستر
                                      └── کپی بیرون از db-1             فصل بکاپ سرور

pg_basebackup -Ft -X stream
   └── /var/backups/postgresql/base-STAMP/base.tar.gz و pg_wal.tar.gz
         بازیابی فقط روی میزبان یدکی، با سرویس خاموش

postgresql.conf از راه conf.d/99-performance.conf
   shared_buffers          RAM واقعی
   effective_cache_size    فقط راهنمای برنامه‌ریز
   work_mem                ضرب در تعداد عملیات همزمان
   log_min_duration_statement = 500
```

لاگ کلاستر از قبل در `/var/log/postgresql/postgresql-18-main.log` جمع می‌شود. لازم نیست `logging_collector` را روشن کنید تا لاگ کند را ببینید. بستهٔ Ubuntu خروجی را همان‌جا می‌نویسد.

## Installation

ابزارها با بستهٔ سرور نصب شده‌اند.

```bash
pg_dump --version
pg_restore --version
pg_basebackup --version
sudo install -d -o postgres -g postgres -m 0750 /var/backups/postgresql
```

هر سه باید نسخهٔ ۱۸ را بگویند. دایرکتوری بکاپ مال کاربر `postgres` است چون دامپ را خود آن کاربر می‌نویسد و فایل globals هش رمز دارد.

اسکریپت شبانه:

```bash
sudo tee /usr/local/sbin/backup-postgres-app.sh >/dev/null <<'EOF'
#!/usr/bin/env bash
set -euo pipefail
umask 077
dest="/var/backups/postgresql"
stamp="$(date +%F-%H%M)"
install -d -o postgres -g postgres -m 0750 "$dest"
avail="$(df --output=avail -B1 /var/backups | tail -n 1)"
if [ "$avail" -lt 1073741824 ]; then
  echo "postgres backup: less than 1 GiB free on /var/backups" >&2
  exit 1
fi
sudo -u postgres pg_dumpall --globals-only --file="${dest}/globals-${stamp}.sql"
sudo -u postgres pg_dump --format=custom --file="${dest}/app-${stamp}.dump" app
sudo -u postgres chmod 0600 "${dest}/globals-${stamp}.sql" "${dest}/app-${stamp}.dump"
find "$dest" -type f \( -name 'app-*.dump' -o -name 'globals-*.sql' \) -mtime +14 -print -delete
echo "postgres backup ok ${stamp}"
EOF
sudo chmod 0750 /usr/local/sbin/backup-postgres-app.sh
sudo tee /etc/cron.d/postgres-app-backup >/dev/null <<'EOF'
SHELL=/bin/bash
PATH=/usr/sbin:/usr/bin:/sbin:/bin
35 2 * * * root /usr/local/sbin/backup-postgres-app.sh >> /var/log/postgres-backup.log 2>&1
EOF
sudo chmod 0644 /etc/cron.d/postgres-app-backup
```

آستانهٔ یک گیبیابایت برای آزمایشگاه است. دامپ بزرگ‌تر یعنی این عدد باید از حجم واقعی دامپ بیشتر باشد. نگهداری ۱۴ روز فقط روی همین دیسک است.

## Configuration

اول RAM را بخوانید.

```bash
free -h
```

اگر کل RAM حدود ۴ گیبیابایت است و سرویس سنگین دیگری روی `db-1` نیست، فایل زیر محافظه‌کارانه است: `shared_buffers` نزدیک یک‌هشتم RAM، نه یک‌چهارم و نه نصف. `effective_cache_size` حدود نصف RAM و فقط یک راهنماست. اگر RAM شما ۲ گیگابایت است `shared_buffers` را `256MB` و `effective_cache_size` را `1GB` بگذارید. اگر ۳۲ گیگابایت است این ۵۱۲ مگابایت را دست نزنید و از نو حساب کنید؛ شروع رایج بحث برای سرور اختصاصی حدود ۲۵ درصد RAM برای `shared_buffers` و حدود ۵۰ تا ۷۵ درصد برای `effective_cache_size` است، بعد معیار کش را می‌بینند. آن درصد مجوز کپی از این صفحه نیست.

```bash
sudo tee /etc/postgresql/18/main/conf.d/99-performance.conf >/dev/null <<'EOF'
shared_buffers = 512MB
effective_cache_size = 2GB
work_mem = 8MB
maintenance_work_mem = 128MB
log_min_duration_statement = 500
log_line_prefix = '%m [%p] user=%u db=%d app=%a '
EOF
sudo systemctl restart postgresql
sudo systemctl status postgresql --no-pager
sudo -u postgres psql -c "SHOW shared_buffers;"
sudo -u postgres psql -c "SHOW effective_cache_size;"
sudo -u postgres psql -c "SHOW log_min_duration_statement;"
```

`shared_buffers` بدون ری‌استارت عوض نمی‌شود. `effective_cache_size` و `log_min_duration_statement` را می‌شد reload کرد، ولی چون هر دو فایل را با هم می‌گذاریم یک ری‌استارت کافی است. خروجی `SHOW` باید همان مقدارها باشد. اگر هنوز `128MB` است، فایل در `conf.d` نیست یا `include_dir` در فایل اصلی حذف شده.

`work_mem = 8MB` را به `64MB` نبرید چون یک گزارش کند دیده‌اید. اول کوئری را از لاگ درآورید. `maintenance_work_mem` فقط کار نگهداری مثل ساخت ایندکس و `VACUUM` است و ضرب در تعداد اتصال برنامه نمی‌شود.

اتووکيوم را خاموش نکنید. `VACUUM FULL` جدول را قفل می‌کند و راه حل باد کردن معمولی نیست. اگر جدول باد کرده، علت توقف autovacuum را در لاگ پیدا کنید.

## Production Example

یک اجرای دستی:

```bash
sudo /usr/local/sbin/backup-postgres-app.sh
sudo ls -l /var/backups/postgresql
```

آزمون بازیابی. فایل custom بدون گزینهٔ ساخت دیتابیس است، پس داخل `app_restore` خالی می‌ریزد و به `app` دست نمی‌زند.

```bash
sudo -u postgres psql -v ON_ERROR_STOP=1 -c "DROP DATABASE IF EXISTS app_restore;"
sudo -u postgres psql -v ON_ERROR_STOP=1 -c "CREATE DATABASE app_restore;"
latest="$(sudo ls -1t /var/backups/postgresql/app-*.dump | head -n 1)"
sudo -u postgres pg_restore --dbname=app_restore --exit-on-error "$latest"
sudo -u postgres psql -d app -c "SELECT count(*) AS app_orders FROM orders;"
sudo -u postgres psql -d app_restore -c "SELECT count(*) AS restored_orders FROM orders;"
```

هر دو عدد، با دادهٔ نمونهٔ صفحهٔ سرور، برابر ۲ است. سپس کپی آزمون را بردارید.

```bash
sudo -u postgres psql -c "DROP DATABASE app_restore;"
```

فهرست محتویات دامپ، بدون بار کردن:

```bash
sudo -u postgres pg_restore --list "$latest" | head
```

باید جدول `orders` را در فهرست ببینید. اگر `pg_restore` خطای نقش داد، globals را روی آن میزبان برنگردانده‌اید. روی خود `db-1` نقش‌ها از قبل هستند و آزمون بالا این خطا را نمی‌دهد. روی سرور فاجعه ترتیب این است: اول `globals-*.sql` با `psql`، بعد ساخت دیتابیس، بعد `pg_restore`. فایل globals را روی کلاستر زندهٔ همین `db-1` دوباره و بی‌دلیل اجرا نکنید؛ نقش موجود خطا می‌دهد و اگر کسی فایل را دست‌کاری کرده باشد رفتارش قابل حدس نیست.

کوئری کند را عمداً بسازید و در لاگ پیدا کنید.

```bash
sudo -u postgres psql -d app -c "SELECT pg_sleep(0.6);"
sudo grep -n "pg_sleep" /var/log/postgresql/postgresql-18-main.log | tail -n 3
```

خط لاگ باید کاربر و نام دیتابیس را داشته باشد، چون `log_line_prefix` را گذاشته‌ایم. مدت باید بالای ۵۰۰ میلی‌ثانیه باشد.

بکاپ فیزیکی، فقط گرفتن فایل، نه جاگذاری روی کلاستر زنده:

```bash
sudo -u postgres mkdir -p /var/backups/postgresql/base-lab
sudo -u postgres pg_basebackup \
  --pgdata=/var/backups/postgresql/base-lab \
  --format=tar \
  --gzip \
  --checkpoint=fast \
  --progress
sudo ls -lh /var/backups/postgresql/base-lab
```

باید `base.tar.gz` و فایل WAL را ببینید. این کل کلاستر است، نه فقط `app`. بازیابی روی میزبان یدکی، بعد از نصب همان نسخهٔ عمدهٔ ۱۸ و خاموش بودن سرویس: دایرکتوری دادهٔ خالی را کنار بگذارید، `base.tar.gz` را در دایرکتوری دادهٔ جدید باز کنید، فایل WAL را در `pg_wal` بگذارید، مالک را `postgres` و مجوز دایرکتوری را `0700` کنید، بعد کلاستر را بالا بیاورید. این کار `db-1` زنده را بازنویسی می‌کند اگر مسیر را اشتباه بدهید. روی این آزمایشگاه انجامش ندهید مگر یک VM دوم داشته باشید. اثبات امروز همان `pg_restore` است.

از داخل کانتینر [صفحهٔ Docker](./postgresql-docker.md)، اگر داده آن‌جاست:

```bash
cd /opt/apps/postgres
sudo docker compose exec -T postgres pg_dump --format=custom --file=/tmp/app.dump app
sudo docker compose cp postgres:/tmp/app.dump ./app.dump
sudo docker compose exec -T postgres rm -f /tmp/app.dump
```

فایل `./app.dump` روی میزبان Docker است. آن را در گیت نگذارید. بازیابی آزمایشی‌اش یک کانتینر دوم با volume جدا می‌خواهد، نه `pg_restore` روی همان دیتابیس `app` بدون نگاه کردن به نام مقصد.

## Security Notes

- `globals-*.sql` هش scram نقش‌ها را دارد و گاهی رمز را اگر کسی با `PASSWORD` ساده در یک اسکریپت قدیمی نقش ساخته باشد. مجوز `0600` اجباری است.
- `app_restore` دادهٔ تولید است. بعد از مقایسه حذفش کنید.
- `pg_basebackup` را به مسیری که نسخهٔ قبلی را با `rm -rf` «تمیز» می‌کنید نسپارید تا وقتی اسم مسیر را دو نفر نخوانده‌اند.
- کاربر برنامه حق `pg_read_server_files` یا ابرکاربر برای بکاپ نمی‌گیرد. دامپ با کاربر سیستم `postgres` است.
- لاگ کند متن کوئری را ذخیره می‌کند. پارامتر را داخل رشتهٔ SQL نچسبانید.
- فایل دامپ را مثل کد منبع به مخزن برنامه نفرستید.

## Troubleshooting

| نشانه | علت محتمل | کار |
| --- | --- | --- |
| `pg_restore` جدول را در `app` ساخته نه در `app_restore` | نام `--dbname` غلط بوده | فوراً متوقف شوید. مقصد را با `\conninfo` ببینید |
| عددها یکی نیست | نوشتن همزمان، یا دامپ ناقص | `pg_restore --exit-on-error` را برندارید. اختلاف بزرگ یعنی خطا بلعیده شده |
| `permission denied` روی `/var/backups/postgresql` | دایرکتوری مال `root` است | `chown postgres:postgres` و مجوز `0750` |
| `SHOW shared_buffers` هنوز پیش‌فرض است | ری‌استارت نشده یا فایل اشتباه | `sudo -u postgres psql -c "SHOW config_file;"` و وجود فایل در `conf.d` |
| بعد از ری‌استارت سرور بالا نمی‌آید | غلط در فایل conf | `journalctl -u postgresql@18-main -n 40 --no-pager` و برداشتن آخرین فایل |
| لاگ کند خالی است | کوئری از ۵۰۰ میلی‌ثانیه تندتر است، یا به لاگ دیگری نگاه می‌کنید | `pg_sleep(0.6)` و مسیر `postgresql-18-main.log` |
| `pg_basebackup` می‌گوید دایرکتوری خالی نیست | اجرای دوباره | دایرکتوری تازه با نام تاریخ جدید. قبلی را پاک نکنید مگر نسخهٔ دیگری داشته باشید |
| `pg_dump: error: connection to server on socket` | کلاستر خواب است | `sudo pg_lsclusters` |

فضای دیسک را قبل از شب حادثه ببینید.

```bash
df -h /var/backups /var/lib/postgresql
sudo tail -n 20 /var/log/postgres-backup.log
```

## Best Practices

- globals و دامپ دیتابیس با هم بایگانی شوند. یکی بدون دیگری روی سرور خام ناکامل است.
- هفته‌ای یک‌بار `app_restore` را واقعاً بسازید، دو `COUNT` را یادداشت کنید، دیتابیس آزمون را حذف کنید.
- `shared_buffers` را از این صفحه کپی نکنید اگر `free -h` با فرض ۴ گیگابایت یکی نیست. `effective_cache_size` را هم مثل یک تخصیص RAM جمع نزنید؛ جمعش با `shared_buffers` بی‌معنی است چون دومی راهنماست.
- `log_min_duration_statement = 0` را روی تولید رها نکنید.
- `work_mem` را سراسری و بزرگ نکنید. اگر یک گزارش واقعاً حافظه می‌خواهد، همان جلسه `SET work_mem` بگیرد و بعد تمام شود.
- autovacuum روشن بماند. `VACUUM FULL` در ساعت شلوغی ممنوع.
- بکاپ فیزیکی را با `pg_restore` قاطی نکنید و روی تنها کپی تولید جا نزنید.
- کپی فایل‌ها را از خود `db-1` خارج کنید. ۱۴ روز روی همان دیسک در برابر خرابی دیسک صفر است.
