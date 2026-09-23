---
sidebar_position: 12
title: نمونهٔ PostgreSQL
description: PostgreSQL 18 با POSTGRES_PASSWORD، ولوم روی مسیر جدید ایمیج، و پورت localhost.
---

# نمونهٔ PostgreSQL

## مقدمه

این صفحه PostgreSQL 18 را با ایمیج رسمی `postgres:18` روی `docker-1.example.internal` بالا می‌آورد. رمز کاربر با `POSTGRES_PASSWORD` از فایل env می‌آید. پورت میزبان فقط `127.0.0.1:5432` است. داده روی ولوم نام‌دار می‌ماند.

مسیر سوار شدن ولوم با راهنماهای PostgreSQL 17 و قبل از آن فرق دارد. در ایمیج ۱۸ به بعد ولوم را روی `/var/lib/postgresql` سوار کنید. مسیر قدیمی که به `data` ختم می‌شد برای این تگ غلط است و کانتینر بالا نمی‌آید یا داده را جایی می‌نویسد که شما فکر می‌کنید ولوم است ولی نیست. جزئیات پایین است.

رمز نمونه `change-me` است. فایل env باید مجوز `0600` داشته باشد.

## مفهوم اصلی

ایمیج بدون `POSTGRES_PASSWORD` از بالا آمدن امتناع می‌کند، مگر صریحاً به آن گفته باشید رمز نمی‌خواهید. این صفحه آن استثنا را ندارد. Compose متغیر را اجباری کرده تا فایل ناقص اصلاً به `up` نرسد.

`POSTGRES_USER` در این نمونه `shop` است و `POSTGRES_DB` هم `shop`. اگر کاربر را ننویسید، ایمیج کاربر `postgres` می‌سازد. اینجا هر دو صریح‌اند تا رشتهٔ اتصال به پیش‌فرض پنهان وابسته نباشد. این مقدارها فقط روی ولوم خالی اعمال می‌شوند. عوض کردن `.env` بعد از اولین اجرا، رمز کاربر موجود را عوض نمی‌کند.

در PostgreSQL 18 متغیر داده‌ها داخل ایمیج به مسیر نسخه‌دار منتقل شده است. برای ۱۸ این مسیر `/var/lib/postgresql/18/docker` است. خود ایمیج `VOLUME` را روی `/var/lib/postgresql` اعلام کرده تا ارتقای major بعدی بتواند کنار همین ولوم بنشیند. شما ولوم را روی همان مسیر والد سوار می‌کنید، نه روی مسیر `PGDATA`. لازم نیست `PGDATA` را دوباره در `environment` بنویسید، مگر اینکه بدانید چرا پیش‌فرض ایمیج را کنار می‌گذارید.

`shm_size` را `256mb` گذاشته‌ایم. `/dev/shm` پیش‌فرض کانتینر کوچک است و بعضی پرس‌وجوهای موازی با خطای حافظهٔ مشترک شکست می‌خورند. این عدد جایگزین تنظیم `shared_buffers` داخل خود Postgres نیست.

## چرا استفاده می‌شود؟

روی `db-1` ممکن است PostgreSQL 18 را از بستهٔ Ubuntu و کلاستر `18/main` اجرا کنید. روی `docker-1` این ایمیج همان major را بدون دست زدن به کلاستر میزبان می‌آورد. مسیر دادهٔ ایمیج با مسیر کلاستر Debian یکی نیست. `/var/lib/postgresql/18/main` مال بسته‌های توزیع است. داخل این کانتینر داده زیر `/var/lib/postgresql/18/docker` روی ولومی است که به `/var/lib/postgresql` وصل شده. این دو را به هم کپی نکنید مگر مهاجرت را با ابزار خود Postgres طراحی کرده باشید.

پورت localhost جلوی انتشار روی LAN را می‌گیرد. کلاینت روی `app-1` از تونل SSH استفاده می‌کند.

## Architecture

```text
ولوم shop-postgres-data
        │
        ▼
/var/lib/postgresql          نقطهٔ سوار
   └── 18/docker             PGDATA پیش‌فرض ایمیج postgres:18
        │
        ▼
127.0.0.1:5432  روی docker-1
        │
        ▼
psql از compose exec، یا تونل از 10.10.1.10
```

شبکهٔ `shop-postgres` جداست. اسم DNS سرویس، `postgres` است، همان کلید زیر `services`.

## Installation

```bash
sudo install -d -o ops -g ops -m 0750 /opt/apps/shop-postgres
cd /opt/apps/shop-postgres
umask 077
cat > .env <<'EOF'
POSTGRES_PASSWORD=change-me
EOF
chmod 0600 .env
ls -l .env
```

:::danger رمز نمونه و مجوز فایل
`change-me` را عوض کنید. مجوز باید `0600` باشد و `ls -l` باید `-rw-------` نشان بدهد. تا وقتی این‌طور نشده `up` نزنید.
:::

`compose.yaml`:

```yaml
name: shop-postgres

services:
  postgres:
    image: postgres:18
    restart: unless-stopped
    environment:
      POSTGRES_PASSWORD: ${POSTGRES_PASSWORD:?set POSTGRES_PASSWORD in .env}
      POSTGRES_USER: shop
      POSTGRES_DB: shop
      TZ: Asia/Tehran
      POSTGRES_INITDB_ARGS: "--encoding=UTF8 --locale=C.UTF-8"
    ports:
      - "127.0.0.1:5432:5432"
    volumes:
      - shop-postgres-data:/var/lib/postgresql
    shm_size: 256mb
    networks:
      - shop-postgres
    healthcheck:
      test:
        - CMD-SHELL
        - pg_isready -U shop -d shop -h 127.0.0.1
      interval: 10s
      timeout: 5s
      retries: 10
      start_period: 20s
    logging:
      driver: json-file
      options:
        max-size: "10m"
        max-file: "5"

networks:
  shop-postgres:
    name: shop-postgres
    driver: bridge

volumes:
  shop-postgres-data:
    name: shop-postgres-data
```

```bash
docker compose config
```

خروجی رمز را نشان می‌دهد. به کانال مشترک نفرستید. نبود متغیر باید همین‌جا خطا بدهد.

## Configuration

`POSTGRES_INITDB_ARGS` فقط بار اول، هنگام `initdb`، اثر دارد. `--encoding=UTF8` و `--locale=C.UTF-8` در ایمیج رسمی وجود دارد. locale فارسی را این‌جا نگذارید. ایمیج آن locale را از قبل تولید نکرده و `initdb` شکست می‌خورد.

`pg_isready` بررسی می‌کند سرور اتصال را بپذیرد. رمز را امتحان نمی‌کند. برای سلامت «فرایند بالا است و به پایگاه `shop` گوش می‌دهد» کافی است. آزمون رمز را در مثال Production با `psql` جدا می‌زنیم تا healthcheck رمز را در خط فرمان تکرار نکند.

`TZ` برابر `Asia/Tehran` است. نوع `timestamptz` لحظه را مطلق نگه می‌دارد و نمایشش به منطقهٔ زمانی نشست بستگی دارد. `timestamp` بدون منطقه این حفاظت را ندارد. برنامه و پایگاه باید از اول یک قرارداد داشته باشند. عوض کردن `TZ` بعد از داده‌دار شدن، معنی ستون بدون منطقه را عوض می‌کند.

پورت را `5432:5432` بدون آدرس ننویسید. healthcheck به `127.0.0.1` داخل کانتینر است و به این انتشار وابسته نیست.

## Production Example

```bash
cd /opt/apps/shop-postgres
docker compose up -d
docker compose ps
```

تا وضعیت `healthy` صبر کنید.

```bash
set -a
. ./.env
set +a
docker compose exec -e PGPASSWORD="$POSTGRES_PASSWORD" postgres \
  psql -U shop -d shop -h 127.0.0.1 -c 'SELECT current_user, current_database();'
```

باید کاربر `shop` و پایگاه `shop` را نشان بدهد. نسخه:

```bash
docker compose exec -e PGPASSWORD="$POSTGRES_PASSWORD" postgres \
  psql -U shop -d shop -h 127.0.0.1 -c 'SELECT version();'
```

متن نسخه باید خط ۱۸ را داشته باشد. مسیر داده را هم ببینید تا سوار بودن ولوم قطعی شود:

```bash
docker compose exec postgres ls -la /var/lib/postgresql/18/docker
```

فهرست باید فایل‌های کلاستر را نشان بدهد، نه یک پوشهٔ خالی ماندگار روی لایهٔ کانتینر. اگر این مسیر خالی است و کانتینر بالا است، ولوم جای دیگری سوار شده.

از میزبان، اگر `psql` نصب است، به `127.0.0.1` و پورت `5432` وصل شوید. از `app-1` مستقیم نباید وصل شود. تونل:

```bash
ssh -L 5432:127.0.0.1:5432 ops@10.10.1.30
```

شل آزمون را ببندید تا `PGPASSWORD` در محیط نماند.

## Security Notes

رمز در `.env` با `0600`. `change-me` را عوض کنید. کاربر `shop` در این نمونه هم مالک پایگاه است هم تنها کاربر. برای برنامهٔ واقعی بعداً یک نقش محدود بسازید و رمز مدیر را در رشتهٔ اتصال وب نگذارید. آن کار این فایل Compose را عوض نمی‌کند، به شرطی که `POSTGRES_PASSWORD` هنوز رمز همان نقش مدیر اولیه بماند.

`pg_isready` رمز نمی‌خواهد. باز بودن پورت loopback یعنی هر فرایند محلی می‌تواند تلاش ورود کند. رمز ضعیف این را خطرناک می‌کند. مجوز فایل env و خود رمز هر دو لازم‌اند.

خروجی `docker compose config` را منتشر نکنید. `docker logs` را بعد از شکست ورود نگاه کنید. اگر برنامه رمز را در خطا چاپ کرده، مشکل از برنامه است و باید لاگ چرخانده شود.

ایمیج `postgres:18` بماند. `latest` ممنوع است. مسیر ولوم را برای «سازگاری با یادداشت قدیمی» به مسیر `data` برنگردانید. آن یادداشت مال ایمیج ۱۷ به قبل است.

## Troubleshooting

| نشانه | علت | کار |
| --- | --- | --- |
| `config` متغیر کم دارد | `.env` نیست | `POSTGRES_PASSWORD` کنار compose |
| کانتینر فوراً خارج می‌شود و از مسیر `data` می‌گوید | ولوم روی مسیر قدیمی سوار شده | مسیر را `/var/lib/postgresql` کنید. دادهٔ قدیمی را با کپی خام قاطی نکنید |
| `initdb` خطای locale | locale در ایمیج نیست | همان `C.UTF-8` بماند |
| رمز جدید کار نمی‌کند | ولوم از قبل init شده | رمز را با `ALTER ROLE` عوض کنید |
| `healthy` ولی `psql` رمز را رد می‌کند | healthcheck رمز را نمی‌سنجد | `.env` و مقدار اولیهٔ ولوم یکی نیست |
| `could not resize shared memory segment` | `shm` کوچک است | `shm_size` همین فایل را کم نکنید |
| از `app-1` رد می‌شود | loopback عمدی است | تونل SSH |
| پورت اشغال | Postgres میزبان روی `5432` است | `ss -ltnp`. کلاستر Ubuntu و این کانتینر یک پورت را شریک نمی‌شوند |
| پوشهٔ `18/docker` خالی است | ولوم به مسیر درست نرسیده | `docker inspect` بخش Mounts |

اگر داده آزمایشی است و باید از نو ساخته شود:

```bash
docker compose down
docker volume rm shop-postgres-data
```

برای پایگاه واقعی این حذف ممنوع است مگر بکاپ را برگردانده باشید.

## Best Practices

- تگ `postgres:18` و ولوم روی `/var/lib/postgresql`، نه روی مسیر `data` راهنمای قدیمی.
- `PGDATA` را بی‌دلیل override نکنید.
- `POSTGRES_PASSWORD` اجباری و فایل env با `0600`. مقدار واقعی غیر از `change-me`.
- کاربر و پایگاه را صریح `shop` بنویسید.
- locale اولیه `C.UTF-8`.
- پورت فقط `127.0.0.1:5432`.
- `shm_size` را برای این نمونه `256mb` نگه دارید.
- healthcheck با `pg_isready`، آزمون رمز با `psql` جدا.
- `down -v` را در استقرار معمولی نگذارید.
- خروجی config را جایی که رمز لو می‌رود نفرستید.
