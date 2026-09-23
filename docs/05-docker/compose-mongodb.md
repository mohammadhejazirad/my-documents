---
sidebar_position: 11
title: نمونهٔ MongoDB
description: ایمیج mongo:8 با کاربر ریشهٔ اولیه، ولوم داده، و پورت فقط روی localhost.
---

# نمونهٔ MongoDB

## مقدمه

این صفحه MongoDB 8 را با ایمیج رسمی `mongo:8` روی `docker-1.example.internal` بالا می‌آورد. کاربر مدیر اولیه با `MONGO_INITDB_ROOT_USERNAME` و `MONGO_INITDB_ROOT_PASSWORD` ساخته می‌شود. داده روی ولوم نام‌دار است. پورت میزبان فقط `127.0.0.1:27017` است، یعنی localhost خود `docker-1`.

رمز نمونه `change-me` است و فایل env باید مجوز `0600` داشته باشد. اگر مجوز بازتر است سرویس را شروع نکنید.

نصب بستهٔ Community روی خود Ubuntu، با مخزن `repo.mongodb.org` و نام رمز `resolute`، کار این صفحه نیست. اینجا فقط کانتینر است.

## مفهوم اصلی

اگر هیچ‌کدام از دو متغیر کاربر و رمز را نگذارید، ایمیج رسمی بدون احراز هویت بالا می‌آید. اگر یکی را بگذارید و دیگری خالی باشد، کانتینر خطا می‌دهد و خارج می‌شود. هر دو در این فایل اجباری‌اند تا `docker compose config` بدون `.env` شکست بخورد.

این متغیرها فقط وقتی پایگاه خالی است کاربر ریشه را در پایگاه `admin` می‌سازند. تغییر بعدی `.env` رمز کاربر موجود را عوض نمی‌کند. همان دام MySQL و PostgreSQL اینجاست: اپراتور فایل را عوض می‌کند، ورود شکست می‌خورد، و وسوسه می‌شود ولوم را پاک کند.

مسیر داده `/data/db` است. ولوم `shop-mongo-data` همان‌جا سوار می‌شود. ایمیج مسیر `/data/configdb` را هم برای حالت replica اعلام می‌کند. این نمونه تک‌گره است و همان یک ولوم داده کافی است.

کلاینت داخل ایمیج `mongosh` است. healthcheck با همان، و با کاربر اولیه، دستور ping را می‌زند. پورت از بیرون میزبان باز نیست.

## چرا استفاده می‌شود؟

تیم وقتی Mongo را داخل Compose می‌گذارد که برنامهٔ روی `docker-1` به همان نسخهٔ 8 ایمیج رسمی وابسته است. باز کردن `27017` روی شبکهٔ `10.10.0.0/16` لازم نیست. ابزار مدیریت یا خود برنامه، اگر روی میزبان دیگری است، از تونل SSH رد می‌شود.

اجبار متغیر در Compose جلوی بدترین حالت را می‌گیرد: کانتینر سالم و بی‌رمز که هر کسی روی میزبان به پورت loopback برسد داده را می‌خواند. loopback به‌تنهایی احراز هویت نیست.

## Architecture

```text
.env  0600
  MONGO_INITDB_ROOT_USERNAME
  MONGO_INITDB_ROOT_PASSWORD
        │
        ▼
mongo:8
  پایگاه admin، فقط بار اول
  ولوم shop-mongo-data → /data/db
  127.0.0.1:27017
        │
        ▼
mongosh از docker compose exec
یا تونل از app-1 به همین loopback
```

شبکهٔ `shop-mongo` جداست. کانتینر برنامه به‌صورت پیش‌فرض عضو آن نیست و نباید با اضافه کردن هر دو به شبکهٔ پیش‌فرض `bridge` به هم وصل شوند. اگر قرار شد برنامهٔ کانتینری بدون انتشار پورت وصل شود، هر دو سرویس را صریح به یک شبکهٔ نام‌دار مشترک اضافه کنید و در رشتهٔ اتصال از اسم سرویس `mongo` استفاده کنید، نه از IP.

## Installation

```bash
sudo install -d -o ops -g ops -m 0750 /opt/apps/shop-mongo
cd /opt/apps/shop-mongo
umask 077
cat > .env <<'EOF'
MONGO_INITDB_ROOT_USERNAME=root
MONGO_INITDB_ROOT_PASSWORD=change-me
EOF
chmod 0600 .env
ls -l .env
```

:::danger رمز نمونه و مجوز فایل
`change-me` را عوض کنید. نام کاربر `root` در این نمونه یعنی کاربر مدیر Mongo، نه کاربر root لینوکس. `ls -l .env` باید `-rw-------` باشد. فایل را وارد گیت نکنید.
:::

`compose.yaml`:

```yaml
name: shop-mongo

services:
  mongo:
    image: mongo:8
    restart: unless-stopped
    environment:
      MONGO_INITDB_ROOT_USERNAME: ${MONGO_INITDB_ROOT_USERNAME:?set MONGO_INITDB_ROOT_USERNAME in .env}
      MONGO_INITDB_ROOT_PASSWORD: ${MONGO_INITDB_ROOT_PASSWORD:?set MONGO_INITDB_ROOT_PASSWORD in .env}
      TZ: Asia/Tehran
    ports:
      - "127.0.0.1:27017:27017"
    volumes:
      - shop-mongo-data:/data/db
    networks:
      - shop-mongo
    healthcheck:
      test:
        - CMD-SHELL
        - 'mongosh --quiet --username "$$MONGO_INITDB_ROOT_USERNAME" --password "$$MONGO_INITDB_ROOT_PASSWORD" --authenticationDatabase admin --eval "db.runCommand({ ping: 1 }).ok" | grep 1'
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
  shop-mongo:
    name: shop-mongo
    driver: bridge

volumes:
  shop-mongo-data:
    name: shop-mongo-data
```

```bash
docker compose config
```

خروجی رمز را دارد. منتشرش نکنید. اگر متغیر اجباری نباشد، فرمان باید قبل از ساخت کانتینر بایستد.

## Configuration

هر دو متغیر باید با هم باشند. Compose آن‌ها را به محیط کانتینر می‌دهد. ایمیج فقط در اولین اجرا روی ولوم خالی استفاده می‌کند.

`TZ` برابر `Asia/Tehran` است. زمان ذخیرهٔ BSON از این مقدار تبعیت کلاینت و سرور را یکسان نمی‌کند. قرارداد برنامه را جدا بنویسید. این متغیر حداقل لاگ کانتینر را با ساعت آزمایشگاه هم‌خوان می‌کند.

پورت `27017` را بدون آدرس منتشر نکنید. healthcheck به پورت داخلی وصل است و به انتشار میزبان نیاز ندارد. اگر انتشار را حذف کنید، `exec` همچنان کار می‌کند و از `app-1` دیگر حتی با تونل به پورت میزبان نمی‌رسید. برای این نمونه انتشار loopback می‌ماند تا کلاینت روی خود میزبان هم قابل آزمون باشد.

کاربر برنامه را با حساب مدیر نسازید. ساخت کاربر محدود کار عملیات دیتابیس است. تا وقتی آن کاربر را نساخته‌اید، برنامه را با همین حساب مدیر به شبکه وصل نکنید.

## Production Example

```bash
cd /opt/apps/shop-mongo
docker compose up -d
docker compose ps
```

تا `healthy` صبر کنید. آزمون:

```bash
set -a
. ./.env
set +a
docker compose exec mongo mongosh --quiet \
  --username "$MONGO_INITDB_ROOT_USERNAME" \
  --password "$MONGO_INITDB_ROOT_PASSWORD" \
  --authenticationDatabase admin \
  --eval 'db.runCommand({ ping: 1 })'
```

خروجی باید فیلد موفق را نشان بدهد. بدون نام کاربری، `mongosh` به پایگاه محلی نباید کار مدیریتی بکند. یک بار بدون رمز امتحان کنید. اگر بدون رمز وارد `admin` شد و دستور مدیریتی گرفت، مقداردهی اولیه انجام نشده و ولوم را برای استفادهٔ واقعی نپذیرید.

از میزبان، کلاینت اگر نصب است:

```bash
mongosh "mongodb://127.0.0.1:27017/admin" --username "$MONGO_INITDB_ROOT_USERNAME" --password "$MONGO_INITDB_ROOT_PASSWORD" --eval 'db.runCommand({ ping: 1 })'
```

از `app-1` پورت نباید باز باشد. تونل:

```bash
ssh -L 27017:127.0.0.1:27017 ops@10.10.1.30
```

نشست شل را بعد از آزمون ببندید تا رمز محیط پاک شود.

## Security Notes

Mongo بدون احراز هویت روی پورت منتشرشده، حتی موقت، قبول نیست. هر دو متغیر اجباری‌اند. `change-me` فقط نمونه است و باید عوض شود. مجوز `0600` بخش از همین کنترل است.

رمز در `docker inspect` و در خروجی `config` هست. در لاگ healthcheck هم اگر فرمان را اشتباه بنویسید ممکن است دیده شود. فرمان این صفحه رمز را از محیط می‌خواند. خروجی `docker compose logs` را نگاه کنید و اگر رمز آن‌جا بود، همان لاگ را پاک‌کردنی بدانید و فرمان را اصلاح کنید.

پورت `127.0.0.1:27017` را به `0.0.0.0` تغییر ندهید. تونل SSH برای آدم، و شبکهٔ Docker مشترک برای کانتینر هم‌میزبان، دو مسیر مجازند.

ایمیج `mongo:8` بماند. `latest` را نگذارید. حساب مدیر را در رشتهٔ اتصال برنامهٔ وب کپی نکنید.

ولوم را با کاربر میزبان `chown` نکنید. ایمیج مالک `/data/db` را خودش تنظیم می‌کند.

## Troubleshooting

| نشانه | علت | کار |
| --- | --- | --- |
| خروج فوری با پیام رمز | یکی از دو متغیر خالی است | هر دو را در `.env` بگذارید و `config` بگیرید |
| ورود با رمز جدید شکست می‌خورد | ولوم قبلاً ساخته شده | رمز را داخل `mongosh` عوض کنید، ولوم را پاک نکنید |
| بدون رمز هم وصل می‌شود | بار اول متغیرها نبوده‌اند | این ولوم را برای دادهٔ واقعی استفاده نکنید |
| `unhealthy` | `mongosh` یا نام پایگاه احراز `admin` غلط است | همان فرمان health را با `exec` اجرا کنید |
| داده بعد از `down` رفته | `down -v` زده شده یا ولوم سوار نبوده | `docker volume ls` و اسم `shop-mongo-data` |
| از `app-1` رد می‌شود | loopback عمدی است | تونل |
| پورت اشغال است | Mongo دیگری روی میزبان است | `ss -ltnp` |
| دیسک پر | ولوم روی `/var/lib/docker` جا ندارد | `df -h` قبل از پاک کردن داده |

بازسازی فقط وقتی که داده آزمایشی است و تأیید شده چیزی لازم ندارید:

```bash
docker compose down
docker volume rm shop-mongo-data
```

بدون آن تأیید، این فرمان حادثه است.

## Best Practices

- هر دو متغیر `MONGO_INITDB_ROOT_USERNAME` و `MONGO_INITDB_ROOT_PASSWORD` اجباری باشند.
- رمز غیر از `change-me` و فایل با `0600`.
- تگ `mongo:8` ثابت بماند.
- ولوم `shop-mongo-data` روی `/data/db`.
- پورت فقط `127.0.0.1:27017`.
- healthcheck با `mongosh` و پایگاه احراز `admin`.
- رمز را بعد از پر شدن ولوم با ویرایش `.env` عوض‌شده فرض نکنید.
- `down -v` را عادت نکنید.
- خروجی config را منتشر نکنید.
- کاربر برنامه را از کاربر مدیر جدا کنید، حتی اگر ساختن آن کاربر در صفحهٔ دیگری انجام شود.
