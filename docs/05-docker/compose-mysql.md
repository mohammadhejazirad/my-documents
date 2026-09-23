---
sidebar_position: 9
title: نمونهٔ MySQL
description: MySQL 8.4 با رمز ریشه از فایل env، ولوم نام‌دار، charset و پورت فقط روی loopback.
---

# نمونهٔ MySQL

## مقدمه

این صفحه MySQL 8.4 را روی `docker-1.example.internal` با ایمیج رسمی `mysql:8.4` بالا می‌آورد. MySQL 8.4 خط LTS است و با نسخهٔ مرجع دانشنامه یکی است. داده روی ولوم نام‌دار `shop-mysql-data` می‌ماند. پورت فقط `127.0.0.1:3306` میزبان است. از `app-1` مستقیم به آن وصل نمی‌شوید.

رمز ریشه `MYSQL_ROOT_PASSWORD` از فایل env کنار Compose می‌آید. نمونهٔ نوشته‌شده `change-me` است و باید عوض شود. فایل باید مجوز `0600` داشته باشد. اگر `ls -l` چیزی جز `-rw-------` نشان داد، سرویس را بالا نیاورید.

عملیات روزمرهٔ کاربر و بکاپ دیتابیس کار این صفحه نیست. اینجا سرویس باید سالم بالا بیاید و charset درست باشد.

## مفهوم اصلی

ایمیج رسمی فقط وقتی پایگاه را مقداردهی می‌کند که دایرکتوری داده خالی باشد. `MYSQL_ROOT_PASSWORD` و `MYSQL_DATABASE` و `MYSQL_USER` و `MYSQL_PASSWORD` در همان بار اول خوانده می‌شوند. بار بعد، حتی اگر `.env` را عوض کنید، کاربر ریشه همان رمز قبلی را دارد. این رفتار حفاظت از داده است، نه باگ Compose.

مسیر داده داخل کانتینر `/var/lib/mysql` است. این مسیر را با تغییر مسیر PostgreSQL 18 قاطی نکنید. ولوم باید همین‌جا سوار شود. اگر سوار نشود، ایمیج یک ولوم بی‌نام می‌سازد و داده از فایل Compose ناپیدا می‌شود.

charset سرور `utf8mb4` و collation برابر `utf8mb4_0900_ai_ci` است. این‌ها را با آرگومان `mysqld` می‌دهیم، نه با یک `SET` موقت بعد از ورود. آرگومان‌هایی که با خط تیره شروع می‌شوند را entrypoint ایمیج به `mysqld` می‌دهد.

پورت `3306` داخل کانتینر به `127.0.0.1:3306` میزبان وصل است. برنامه روی خود `docker-1` می‌تواند وصل شود. برنامه روی `10.10.1.10` نه، مگر از تونل SSH.

## چرا استفاده می‌شود؟

بستهٔ MySQL روی Ubuntu برای سرور دیتابیس اختصاصی `db-1.example.internal` درست است. این نمونه برای پشته‌ای است که روی `docker-1` کنار بقیهٔ کانتینرها می‌ماند و باید همان 8.4 ایمیج رسمی باشد، نه هر چه در آرشیو توزیع است.

محدود کردن پورت به loopback جلوی افشای تصادفی پایگاه روی LAN را می‌گیرد. Docker هنگام انتشار پورت قاعدهٔ iptables می‌نویسد و UFW را دور می‌زند. `127.0.0.1` این دور زدن را به خود میزبان محدود می‌کند.

ولوم نام‌دار یعنی `docker compose down` بدون پرچم حذف ولوم، داده را نگه می‌دارد. حذف داده فرمان جداست و نباید در استقرار معمولی باشد.

## Architecture

```text
app-1  10.10.1.10
   │
   │  ssh -L 3306:127.0.0.1:3306 ops@10.10.1.30
   ▼
docker-1  127.0.0.1:3306
   │
   ▼
کانتینر mysql:8.4
   /var/lib/mysql  ← ولوم shop-mysql-data
   شبکهٔ shop-mysql
```

شبکهٔ `shop-mysql` عضو دیگری ندارد. کلاینت نمونه خود `docker compose exec` است. اگر سرویس Node باید بدون تونل وصل شود، هر دو سرویس باید در یک شبکهٔ مشترک باشند و برنامه به‌جای `127.0.0.1` اسم سرویس `mysql` و پورت `3306` را بزند. آن روز انتشار پورت میزبان را برنمی‌دارید مگر هنوز به کلاینت میزبان نیاز دارید. این صفحه همان حالت محدود را نگه می‌دارد.

## Installation

```bash
sudo install -d -o ops -g ops -m 0750 /opt/apps/shop-mysql
cd /opt/apps/shop-mysql
umask 077
cat > .env <<'EOF'
MYSQL_ROOT_PASSWORD=change-me
MYSQL_DATABASE=shop
MYSQL_USER=shop
MYSQL_PASSWORD=change-me
EOF
chmod 0600 .env
ls -l .env
```

:::danger رمز نمونه و مجوز فایل
`change-me` را قبل از هر استفادهٔ غیرآزمایشی عوض کنید. `chmod 0600` اجباری است. مالک فایل `ops` باشد. اگر فایل `0644` بماند، هر کاربر میزبان رمز ریشه را می‌خواند. خروجی `ls -l` باید با `-rw-------` شروع شود.
:::

`compose.yaml`:

```yaml
name: shop-mysql

services:
  mysql:
    image: mysql:8.4
    restart: unless-stopped
    environment:
      MYSQL_ROOT_PASSWORD: ${MYSQL_ROOT_PASSWORD:?set MYSQL_ROOT_PASSWORD in .env}
      MYSQL_DATABASE: shop
      MYSQL_USER: shop
      MYSQL_PASSWORD: ${MYSQL_PASSWORD:?set MYSQL_PASSWORD in .env}
      TZ: Asia/Tehran
    command:
      - --character-set-server=utf8mb4
      - --collation-server=utf8mb4_0900_ai_ci
    ports:
      - "127.0.0.1:3306:3306"
    volumes:
      - shop-mysql-data:/var/lib/mysql
    networks:
      - shop-mysql
    healthcheck:
      test:
        - CMD-SHELL
        - mysqladmin ping -h 127.0.0.1 -uroot -p"$$MYSQL_ROOT_PASSWORD" --silent
      interval: 10s
      timeout: 5s
      retries: 10
      start_period: 40s
    logging:
      driver: json-file
      options:
        max-size: "10m"
        max-file: "5"

networks:
  shop-mysql:
    name: shop-mysql
    driver: bridge

volumes:
  shop-mysql-data:
    name: shop-mysql-data
```

Compose متغیر را از `.env` همین پوشه داخل فایل حل می‌کند. اگر متغیر نباشد، `docker compose config` باید خطا بدهد و کانتینر بدون رمز بالا نیاید. علامت سؤال داخل فایل Compose یعنی مقدار اجباری است.

```bash
docker compose config
```

خروجی config رمز را گسترش می‌دهد. آن را در تیکت یا گفتگوی گروهی نفرستید.

## Configuration

`TZ` برابر `Asia/Tehran` است تا وقت محلی کانتینر با آزمایشگاه یکی باشد. نوع `TIMESTAMP` در MySQL به منطقهٔ زمانی سرور حساس است. بعد از آنکه داده نوشتید، `TZ` را بی‌برنامه عوض نکنید.

`command` فقط دو پرچم سرور است. entrypoint رسمی هنوز اول اجرا می‌شود. کل `mysqld` را جایگزین نکنید، وگرنه مقداردهی اولیهٔ رمز انجام نمی‌شود.

healthcheck از `mysqladmin ping` استفاده می‌کند. رمز در خط فرمان همان فرایند داخل کانتینر دیده می‌شود. برای این آزمایشگاه قبول است. اگر سیاست سازمان حتی داخل کانتینر خط فرمان را هم لاگ می‌کند، به‌جای آن یک فایل defaults با مجوز محدود بسازید و `mysqladmin --defaults-extra-file` را صدا بزنید. رمز را در مستند دوم ننویسید.

کاربر `shop` و پایگاه `shop` فقط بار اول ساخته می‌شوند. برای عوض کردن رمز یک کاربر موجود از خود SQL استفاده می‌کنید، نه از ویرایش `.env` به‌تنهایی.

پورت را به `3306:3306` بدون آدرس تغییر ندهید. آن شکل روی همهٔ رابط‌ها گوش می‌دهد.

## Production Example

```bash
cd /opt/apps/shop-mysql
docker compose up -d
docker compose ps
```

بار اول ممکن است تا پایان `start_period` طول بکشد. وضعیت باید به `healthy` برسد. سپس از خود میزبان:

```bash
mysql --protocol=TCP -h 127.0.0.1 -P 3306 -uroot -p -e 'SHOW VARIABLES LIKE "character_set_server"; SHOW VARIABLES LIKE "collation_server";'
```

رمز را وقتی کلاینت پرسید وارد کنید. انتظار این است که مقدار charset برابر `utf8mb4` و collation برابر `utf8mb4_0900_ai_ci` باشد. اگر کلاینت `mysql` روی میزبان نصب نیست، از داخل کانتینر:

```bash
docker compose exec mysql mysql -uroot -p -e 'SHOW VARIABLES LIKE "character_set_server";'
```

باز هم رمز را در خط فرمان ننویسید. `-p` خالی سؤال می‌کند.

از `app-1` این پورت نباید باز باشد:

```bash
nc -vz -w 3 10.10.1.30 3306
```

باید رد شود یا زمان تمام کند. مسیر درست از `app-1`:

```bash
ssh -L 3306:127.0.0.1:3306 ops@10.10.1.30
```

در یک نشست دیگر روی `app-1` کلاینت به `127.0.0.1:3306` همان تونل وصل می‌شود.

لاگ شروع:

```bash
docker compose logs --tail 100 mysql
```

توقف بدون حذف داده:

```bash
docker compose stop
```

## Security Notes

فایل `.env` با `0600` و مالک `ops`. نمونهٔ `change-me` را عوض کنید. دو رمز در این فایل است: ریشه و کاربر `shop`. هر دو باید نیرومند و متفاوت باشند. کاربر برنامه نباید ریشه باشد. `MYSQL_USER` برای برنامه است و `MYSQL_ROOT_PASSWORD` برای مدیریت.

خروجی `docker compose config` و `docker inspect` رمز را نشان می‌دهد. دسترسی خواندن به سوکت Docker از قبل معادل root است. با این حال خروجی را جایی که آرشیو می‌شود پخش نکنید.

پورت loopback را «موقت» روی `0.0.0.0` باز نکنید تا یک همکار تست کند. تونل SSH همان تست را بدون باز کردن LAN انجام می‌دهد.

ولوم را روی یک پوشهٔ خانگی با `chmod 777` سوار نکنید. ولوم نام‌دار مجوز را خود ایمیج تنظیم می‌کند. `chown` از روی میزبان روی `Mountpoint` راه‌حل شروع‌نشدن نیست و داده را خراب می‌کند.

ایمیج `mysql:8.4` بماند. `latest` ممنوع است. افزونهٔ احراز هویت قدیمی را برای راحتی کلاینت روشن نکنید. کلاینت این دهه `caching_sha2_password` را بلد است.

## Troubleshooting

| نشانه | علت | کار |
| --- | --- | --- |
| `config` خطای متغیر می‌دهد | `.env` نیست یا اسم متغیر فرق دارد | فایل کنار `compose.yaml` و بدون فاصله دور `=` |
| بلافاصله خارج می‌شود و لاگ از رمز خالی می‌گوید | جایگذاری انجام نشده | `config` را ببینید، نه اینکه رمز را در YAML سخت بنویسید |
| رمز `.env` را عوض کردید و ورود رد می‌شود | ولوم از قبل مقداردهی شده | رمز را با SQL عوض کنید. ولوم را پاک نکنید |
| پایگاه خالی بعد از ری‌استارت | ولوم سوار نیست یا اسم ولوم عوض شده | `docker volume ls` و Mounts در `inspect` |
| `connection refused` از `app-1` | پورت فقط loopback است | تونل SSH. این خطا یعنی تنظیم درست کار کرده |
| `port is already allocated` | MySQL دیگری روی `3306` میزبان است | `ss -ltnp` |
| `unhealthy` در حالی که لاگ آماده است | healthcheck و رمز محیط یکی نیست | `docker compose exec mysql mysqladmin ping -h 127.0.0.1 -uroot -p` |
| دیسک پر و InnoDB متوقف | ولوم جا ندارد | `df -h` روی فایل‌سیستم `/var/lib/docker` |

اگر مجبورید پایگاه آزمایشی را از نو بسازید و داده ارزشی ندارد، فقط همان وقت:

```bash
docker compose down
docker volume rm shop-mysql-data
```

این حذف برگشت‌پذیر نیست. روی ولومی که دادهٔ واقعی دارد این دو فرمان را نزنید.

## Best Practices

- رمز فقط در `.env` با `0600`. مقدار نمونه `change-me` تا قبل از استفادهٔ واقعی بماند و بعد عوض شود.
- `docker compose config` باید بدون متغیر اجباری شکست بخورد.
- ولوم نام‌دار `shop-mysql-data` روی `/var/lib/mysql`.
- پورت فقط `127.0.0.1:3306`.
- charset و collation را در `command` سرور ثابت کنید.
- `TZ` را `Asia/Tehran` بگذارید و بعد از داشتن داده بی‌برنامه عوض نکنید.
- تگ `mysql:8.4` بماند.
- `down -v` را در اسکریپت استقرار نگذارید.
- از میزبان دیگر با تونل وصل شوید، نه با باز کردن پورت.
- رمز را در تاریخچهٔ شل و در تیکت ننویسید.
