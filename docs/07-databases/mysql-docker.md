---
title: MySQL در Docker
sidebar_position: 3
description: "MySQL 8.4 در Compose روی docker-1، پورت فقط localhost، volume نام‌دار، و کاربر app_user."
---

# MySQL در Docker

## مقدمه

این صفحه MySQL 8.4 را روی `docker-1.example.internal` یعنی `10.10.1.30` با Compose بالا می‌آورد. ایمیج `mysql:8.4` است. پورت میزبان فقط `127.0.0.1:3306` است، داده روی volume نام‌دار می‌ماند، و سیاست راه‌اندازی مجدد `unless-stopped` است. مدل کلی Compose در [compose](/docs/05-docker/compose) و نمونهٔ کوتاه‌تر در [compose-mysql](/docs/05-docker/compose-mysql) است. دستور همین صفحه برای اجرا کافی است و به آن فایل‌ها وابسته نیست.

اگر برنامه روی `app-1` با آدرس `10.10.1.10` است و باید از شبکه به دیتابیس برسد، این صفحه مسیر شما نیست. پورت را به `0.0.0.0` باز نکنید. نصب بسته‌ای روی `db-1` در [MySQL روی سرور](./mysql-server.md) همان مسیر است.

## مفهوم اصلی

ایمیج رسمی داخل کانتینر روی همهٔ رابط‌های همان netns گوش می‌دهد. این با `bind-address = 127.0.0.1` روی سرور بسته‌ای یکی نیست. چیزی که از بیرون میزبان دیده می‌شود فقط چیزی است که در `ports` منتشر شده. `127.0.0.1:3306:3306` یعنی فقط پردازش‌های روی خود `docker-1` به پورت میزبان می‌رسند. کانتینر دیگری در همان پروژهٔ Compose اصلاً از این پورت میزبان استفاده نمی‌کند؛ با نام سرویس `mysql` و پورت ۳۳۰۶ داخل شبکهٔ Compose وصل می‌شود.

رمز ریشه در این ایمیج اجباری است و پلاگین `auth_socket` وجود ندارد. `sudo mysql` این‌جا معنی ندارد. متغیر `MYSQL_ROOT_PASSWORD` ریشه را با `caching_sha2_password` می‌سازد. `MYSQL_USER` و `MYSQL_PASSWORD` کاربر برنامه را روی دیتابیس `MYSQL_DATABASE` می‌سازند و آن کاربر مدیر کل نیست. هر دو رمز در مثال `change-me` هستند.

داده اگر فقط لایهٔ قابل نوشتن کانتینر باشد با `docker compose down` و حذف کانتینر از بین می‌رود. volume نام‌دار `app-mysql-data` روی مسیر `/var/lib/mysql` داخل کانتینر سوار می‌شود و با حذف کانتینر پاک نمی‌شود. `docker compose down -v` آن را پاک می‌کند.

این ایمیج با بستهٔ Ubuntu یکی نیست. کانفیگ دراپ‌این ما زیر `/etc/mysql/conf.d` سوار می‌شود، نه در `/etc/mysql/mysql.conf.d/99-app.cnf` میزبان.

## چرا استفاده می‌شود؟

وقتی خود برنامه هم روی `docker-1` و داخل همان Compose است، قفل کردن نسخهٔ `mysql:8.4` به ایمیج، ارتقای سرور Ubuntu را از ارتقای MySQL جدا می‌کند. برای یک دیتابیس سازمانی که `app-1` باید از شبکه ببیندش، کانتینر با پورت localhost فقط پیچیدگی اضافه است. آن را به‌خاطر یکنواختی «همه چیز Docker» انتخاب نکنید.

سناریوی دوم که این صفحه به دردش می‌خورد آزمون بازیابی است: دامپ تولید را به یک کانتینر موقتی می‌ریزید تا سرور اصلی دست نخورد. آن حالت در [بکاپ و بازیابی MySQL](./mysql-backup-restore.md) آمده و لازم نیست این Compose دائمی باشد.

## Architecture

```text
docker-1  10.10.1.30
   │
   ├── 127.0.0.1:3306  ──►  کانتینر app-mysql  (داخل: 0.0.0.0:3306)
   │                         ایمیج mysql:8.4
   │                         volume app-mysql-data -> /var/lib/mysql
   │
   └── شبکهٔ Compose
         برنامهٔ هم‌پروژه  ── mysql:3306
         نام DNS فقط داخل همین شبکه معتبر است

app-1 10.10.1.10
   └── به 10.10.1.30:3306 نمی‌رسد، چون میزبان آن پورت را منتشر نکرده
```

فایل‌ها روی میزبان:

```text
/opt/apps/mysql/compose.yaml
/opt/apps/mysql/.env                  مجوز 0600
/opt/apps/mysql/conf.d/99-app.cnf
```

## Installation

Docker Engine و پلاگین Compose باید روی `docker-1` باشد. اگر `docker compose version` فرمان را نمی‌شناسد، [نصب Docker](/docs/05-docker/installation) را انجام دهید و برگردید. باینری پایتونی `docker-compose` را نصب نکنید.

```bash
docker compose version
sudo install -d -o root -g root -m 0755 /opt/apps/mysql/conf.d
sudo touch /opt/apps/mysql/.env
sudo chmod 0600 /opt/apps/mysql/.env
```

ایمیج را صریح بکشید تا شکست شبکه را از شکست کانفیگ جدا ببینید.

```bash
sudo docker pull mysql:8.4
sudo docker image inspect mysql:8.4 --format 'id={{.Id}}'
```

خروجی `id=` باید یک شناسهٔ ایمیج باشد. اگر رجیستری از این شبکه بسته است، آینه را از [آینهٔ رجیستری](/docs/05-docker/registry-mirror) بگذارید و همین `docker pull` را تکرار کنید. تگ را به `latest` عوض نکنید؛ خط 8.4 همان LTS است و patch داخل تگ شناور 8.4 به‌روز می‌شود.

## Configuration

فایل محیط. رمز را همین‌جا عوض کنید. این فایل را به گیت نفرستید.

```bash
sudo tee /opt/apps/mysql/.env >/dev/null <<'EOF'
MYSQL_ROOT_PASSWORD=change-me
MYSQL_DATABASE=app
MYSQL_USER=app_user
MYSQL_PASSWORD=change-me
EOF
sudo chmod 0600 /opt/apps/mysql/.env
```

:::warning رمز نمونه
`change-me` فقط مثال است. هر دو رمز را عوض کنید. هر کسی `docker inspect app-mysql` را بتواند اجرا کند متغیرهای محیطی کانتینر را می‌بیند. روی میزبان مشترک این یعنی رمز در اختیار گروه `docker` است. گروه `docker` معادل ریشه است؛ عضو اضافه نگیرید.
:::

کانفیگ داخل کانتینر. `bind-address` را `127.0.0.1` نگذارید وگرنه پورت منتشرشده و بقیهٔ سرویس‌های Compose به `mysqld` نمی‌رسند. محدود کردن شبکه کار کلید `ports` روی میزبان است.

```bash
sudo tee /opt/apps/mysql/conf.d/99-app.cnf >/dev/null <<'EOF'
[mysqld]
bind-address = 0.0.0.0
character-set-server = utf8mb4
collation-server = utf8mb4_0900_ai_ci
default-time-zone = +00:00
innodb_buffer_pool_size = 256M
slow_query_log = ON
long_query_time = 1
EOF
```

۲۵۶ مگابایت برای کانتینر آزمایشی روی میزبانی است که خودش برنامهٔ دیگری هم دارد. اگر `free -h` روی `docker-1` کمتر از ۲ گیگابایت آزاد نشان می‌دهد، این عدد را به `128M` برگردانید. این مقدار RAM واقعی رزرو می‌کند.

```bash
sudo tee /opt/apps/mysql/compose.yaml >/dev/null <<'EOF'
name: app-mysql
services:
  mysql:
    image: mysql:8.4
    container_name: app-mysql
    restart: unless-stopped
    env_file:
      - .env
    ports:
      - "127.0.0.1:3306:3306"
    volumes:
      - app-mysql-data:/var/lib/mysql
      - ./conf.d/99-app.cnf:/etc/mysql/conf.d/99-app.cnf:ro
volumes:
  app-mysql-data:
    name: app-mysql-data
EOF
```

`restart: unless-stopped` یعنی با بالا آمدن Docker سرویس برمی‌گردد، مگر اینکه خودتان `docker compose stop` کرده باشید. سیاست `always` این تفاوت را قاطی می‌کند و اینجا استفاده نمی‌شود.

## Production Example

```bash
cd /opt/apps/mysql
sudo docker compose up -d
sudo docker compose ps
sudo ss -lptn 'sport = :3306'
```

`ss` باید `127.0.0.1:3306` را نشان دهد و `0.0.0.0:3306` را نشان ندهد. تا وقتی health واقعی سبز نشده، لاگ را ببینید. اولین بالا آمدن به‌خاطر مقداردهی اولیهٔ InnoDB طول می‌کشد.

```bash
sudo docker compose logs --tail 40 mysql
```

خط سالم شبیه `ready for connections` همراه نسخهٔ 8.4 است. سپس از خود میزبان، نه از `app-1`:

```bash
sudo docker compose exec mysql mysql --user=app_user -p --host=127.0.0.1 app --execute="CREATE TABLE IF NOT EXISTS orders (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  sku VARCHAR(64) NOT NULL,
  qty INT UNSIGNED NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
INSERT INTO orders (sku, qty) VALUES ('A-1', 2), ('B-4', 1);
SELECT id, sku, qty FROM orders ORDER BY id;"
```

رمز `MYSQL_PASSWORD` پرسیده می‌شود. آن را بعد از `-p` در همان خط ننویسید. خروجی دو سطر `A-1` و `B-4` است.

برنامهٔ هم‌کامپوز، اگر سرویس دیگری به این فایل اضافه کردید، میزبان را `mysql` می‌گذارد نه `127.0.0.1`. از داخل کانتینر برنامه `127.0.0.1` یعنی خود همان کانتینر، نه MySQL. این اشتباه را در عیب‌یابی زیاد می‌بینیم.

پلاگین کاربر را ببینید.

```bash
sudo docker compose exec mysql mysql --user=root -p --host=127.0.0.1 --table --execute="SELECT user, host, plugin FROM mysql.user WHERE user IN ('root','app_user');"
```

هر دو باید `caching_sha2_password` باشند. میزبان این کاربرها معمولاً `%` است چون ایمیج رسمی نمی‌داند کلاینت از کدام شبکهٔ Docker می‌آید. این `%` داخل کانتینر خطرناک است اگر پورت میزبان را به همهٔ کارت‌ها باز کنید. با انتشار فقط روی `127.0.0.1`، `%` از اینترنت دیده نمی‌شود. جبران این ضعف ایمیج با باز کردن فایروال روی میزبان ممنوع است.

volume را ثابت کنید.

```bash
sudo docker volume inspect app-mysql-data --format 'name={{.Name}} mount={{.Mountpoint}}'
```

`down` بدون `-v` داده را نگه می‌دارد.

```bash
cd /opt/apps/mysql
sudo docker compose down
sudo docker volume ls --filter name=app-mysql-data
sudo docker compose up -d
sudo docker compose exec mysql mysql --user=app_user -p --host=127.0.0.1 app --execute="SELECT COUNT(*) AS orders_after_recreate FROM orders;"
```

عدد باید همان ۲ باشد. اگر صفر بود، volume به مسیر دیگری سوار شده یا کسی `down -v` زده است.

## Security Notes

- کلید `ports` فقط `127.0.0.1` است. شکل `3306:3306` و شکل `0.0.0.0:3306:3306` هر دو میزبان را روی همهٔ کارت‌ها باز می‌کنند و در این فصل ممنوع‌اند.
- `bind-address = 0.0.0.0` فقط داخل netns کانتینر است و مجوز انتشار روی میزبان نیست.
- `.env` مجوز `0600` است. `docker inspect` همچنان رمز را نشان می‌دهد. این را با «فایل env امن است» اشتباه نگیرید.
- کاربر `app_user` حق `ALL` روی کل سرور ندارد، ولی میزبان `%` داخل ایمیج رسمی هست. شبکهٔ Compose را با کانتینر نامطمئن شریک نشوید. هر سرویس داخل همین فایل به `mysql:3306` می‌رسد.
- `docker compose down -v` داده را پاک می‌کند. آن را در اسکریپت استقرار نگذارید.
- ایمیج `mysql:latest` را جایگزین `mysql:8.4` نکنید. `latest` خط LTS را تضمین نمی‌کند.
- ریشهٔ کانتینر را به `mysql_native_password` برنگردانید. اگر کلاینت وصل نشد، کلاینت را به `caching_sha2_password` برسانید.

## Troubleshooting

| نشانه | علت محتمل | کار |
| --- | --- | --- |
| از `app-1` اتصال رد می‌شود | طراحی این صفحه | دیتابیس بسته‌ای روی `db-1`، یا برنامه را به همین Compose بیاورید |
| `compose exec` بلافاصله Access denied نمی‌دهد و انتظار می‌کشد | هنوز InnoDB بالا نیامده | `docker compose logs --tail 50 mysql` تا `ready for connections` |
| پورت میزبان باز است ولی کانتینر دیگر وصل نمی‌شود | برنامه `127.0.0.1` را داخل کانتینر خودش صدا زده | میزبان را `mysql` بگذارید |
| بعد از `up` جدول نیست | volume تازه است، یا دستور ساخت جدول روی volume قبلی نبوده | `docker volume inspect app-mysql-data` |
| `Address already in use` | بستهٔ MySQL میزبان یا کانتینر دیگری ۳۳۰۶ را گرفته | `sudo ss -lptn 'sport = :3306'` |
| کانتینر در حلقهٔ ری‌استارت است | کانفیگ یا رمز خالی | لاگ. `MYSQL_ROOT_PASSWORD` خالی را ایمیج قبول نمی‌کند |
| `down` و `up` داده را صفر کرده | `-v` استفاده شده یا نام volume عوض شده | نام `app-mysql-data` را در `compose.yaml` ثابت نگه دارید |

اعتبار کانفیگ را بدون بالا آوردن سرویس ببینید.

```bash
cd /opt/apps/mysql
sudo docker compose config
```

اگر این فرمان متغیر محیط را در خروجی چاپ کرد، همان خروجی را در تیکت پیست نکنید. رمز داخلش است.

## Best Practices

- تگ `mysql:8.4`، volume با نام ثابت، `restart: unless-stopped`، پورت فقط `127.0.0.1`.
- رمز را در `command` و در بخش `healthcheck` نگذارید تا در `docker ps` کمتر تکرار شود. بودن رمز در `env` را هم یک ضعف بدانید و دسترسی گروه `docker` را محدود کنید.
- بافر ۲۵۶ مگابایتی را به سرور بسته‌ای `db-1` کپی نکنید. آن عدد مال این کانتینر است.
- بکاپ را از volume با کپی خام فایل `/var/lib/mysql` در حالی که کانتینر روشن است نگیرید. فایل‌های InnoDB آن لحظه سازگار نیستند. دامپ منطقی یا توقف کامل، در صفحهٔ بکاپ.
- ارتقای عمده (از 8.4 به خط بعدی) را با دامپ و بازیابی امتحان کنید، نه با عوض کردن تگ روی volume زنده.
- اگر تنها دلیل Docker آزمون بازیابی است، کانتینر را بعد از آزمون حذف کنید و volume آزمون را با `-v` فقط وقتی بردارید که اسمش با volume تولید یکی نباشد.
