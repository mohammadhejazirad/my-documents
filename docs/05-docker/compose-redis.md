---
sidebar_position: 10
title: نمونهٔ Redis
description: ایمیج رسمی redis:8 با requirepass از env، ماندگاری AOF، و تفاوت با Valkey اوبونتو.
---

# نمونهٔ Redis

## مقدمه

این صفحه ایمیج رسمی `redis:8` را روی `docker-1.example.internal` بالا می‌آورد. رمز با `requirepass` از متغیر محیطی می‌آید که Compose از فایل env می‌خواند. داده با AOF روی ولوم نام‌دار می‌ماند. پورت میزبان فقط `127.0.0.1:6379` است.

روی خود Ubuntu، بستهٔ `redis-server` در مخزن universe است و Valkey 9 در کامپوننت main جایگزین پشتیبانی‌شدهٔ Canonical است و پروتکل Redis را حرف می‌زند. این صفحه آن بسته را نصب نمی‌کند و ایمیج را به Valkey عوض نمی‌کند. اگر سازمان روی `db-1` سرویس را از APT می‌خواهد، Valkey همان مسیر پشتیبانی‌شده است. اینجا هدف، ایمیج رسمی Redis روی Engine است.

نمونهٔ رمز `change-me` است. فایل env باید مجوز `0600` داشته باشد.

## مفهوم اصلی

ایمیج رسمی `redis` متغیر `REDIS_PASSWORD` را خودش نمی‌خواند. اگر فقط env را بگذارید و فرمان را عوض نکنید، سرور بدون رمز بالا می‌آید. `requirepass` را باید به `redis-server` بدهید. در این فایل، Compose مقدار را از `.env` در آرگومان فرمان می‌گذارد و همان مقدار را در محیط کانتینر هم می‌گذارد تا healthcheck بتواند با `REDISCLI_AUTH` وارد شود.

ماندگاری با `--appendonly yes` و `--appendfsync everysec` است. بدون ولوم، فایل AOF در لایهٔ قابل نوشتن است و با حذف کانتینر می‌رود. نقطهٔ سوار `/data` است. در Redis 8 فایل‌های AOF زیر `/data` و معمولاً داخل `appendonlydir` هستند. اگر بعد از بالا آمدن فقط `dump.rdb` دیدید و دایرکتوری AOF نبود، پرچم appendonly اعمال نشده است.

`requirepass` کاربر پیش‌فرض را رمزدار می‌کند. این ACL کامل چندکاربره نیست. برای این نمونه کافی است. دستور مدیریتی بدون رمز باید رد شود.

پورت `6379` روی loopback میزبان است. Redis بدون رمز روی LAN یک حادثهٔ آشناست. با رمز هم دلیلی ندارد پورت را به `0.0.0.0` باز کنید، چون انتشار پورت Docker از UFW رد می‌شود.

## چرا استفاده می‌شود؟

کش و صف سبک در پشتهٔ Docker باید با بقیهٔ سرویس‌ها یک‌جا تعریف شود. ایمیج `redis:8` نسخه را از بستهٔ توزیع جدا می‌کند. Valkey را انکار نمی‌کنیم. روی میزبانی که فقط APT مجاز است، Valkey انتخاب پشتیبانی‌شدهٔ Ubuntu است. مخلوط کردن «کلاینت فکر می‌کند به Redis وصل است» با «ایمیج این صفحه Valkey است» مستند را دروغ می‌کند. کلاینت این صفحه به همین کانتینر `redis:8` وصل می‌شود.

رمز از env می‌آید تا در گیت نماند. خود فرمان `redis-server` بعد از جایگذاری Compose رمز را در پیکربندی کانتینر دارد. `docker inspect` آن را نشان می‌دهد. این راز مخفی داخل ایمیج نیست، ولی خروجی inspect را پخش نکنید.

## Architecture

```text
.env  مجوز 0600
  REDIS_PASSWORD
        │
        ▼
compose.yaml
  redis-server --requirepass  (مقدار از env)
  ولوم shop-redis-data → /data
  127.0.0.1:6379 → کانتینر:6379
        │
        ▼
کلاینت روی خود docker-1
  redis-cli با REDISCLI_AUTH
```

از `app-1` مسیر تونل است، مثل MySQL:

```text
ssh -L 6379:127.0.0.1:6379 ops@10.10.1.30
```

## Installation

```bash
sudo install -d -o ops -g ops -m 0750 /opt/apps/shop-redis
cd /opt/apps/shop-redis
umask 077
cat > .env <<'EOF'
REDIS_PASSWORD=change-me
EOF
chmod 0600 .env
ls -l .env
```

:::danger رمز نمونه و مجوز فایل
`change-me` را عوض کنید. `ls -l .env` باید `-rw-------` باشد. فایل را commit نکنید. اگر مجوز شل است، `docker compose up` را اجرا نکنید.
:::

`compose.yaml`:

```yaml
name: shop-redis

services:
  redis:
    image: redis:8
    restart: unless-stopped
    environment:
      REDIS_PASSWORD: ${REDIS_PASSWORD:?set REDIS_PASSWORD in .env}
      TZ: Asia/Tehran
    command:
      - redis-server
      - --appendonly
      - "yes"
      - --appendfsync
      - everysec
      - --requirepass
      - ${REDIS_PASSWORD:?set REDIS_PASSWORD in .env}
    ports:
      - "127.0.0.1:6379:6379"
    volumes:
      - shop-redis-data:/data
    networks:
      - shop-redis
    healthcheck:
      test:
        - CMD-SHELL
        - REDISCLI_AUTH="$$REDIS_PASSWORD" redis-cli --no-auth-warning ping | grep -q PONG
      interval: 10s
      timeout: 3s
      retries: 5
      start_period: 5s
    logging:
      driver: json-file
      options:
        max-size: "10m"
        max-file: "5"

networks:
  shop-redis:
    name: shop-redis
    driver: bridge

volumes:
  shop-redis-data:
    name: shop-redis-data
```

```bash
docker compose config
```

اگر `.env` نباشد این فرمان باید با خطای متغیر تمام شود. خروجی موفق را جایی که آرشیو عمومی دارد نفرستید. رمز در آن هست.

## Configuration

فرمان با `redis-server` شروع می‌شود تا entrypoint رسمی ایمیج، مجوز `/data` را مثل حالت عادی تنظیم کند. آن را با یک `sh -c` جایگزین نکنید، مگر بدانید کاربر فرایند را به root برگردانده‌اید.

`appendfsync everysec` یعنی حداکثر حدود یک ثانیه دادهٔ تأییدشده ممکن است در قطع برق نماند. برای کش قابل بازسازی معمولاً قبول است. اگر این Redis صف کاری است که از دست رفتن یک ثانیه هم حادثه است، این صفحه به‌تنهایی کافی نیست و باید سیاست پایداری را جدا تصمیم بگیرید. پیش‌فرض این نمونه همان `everysec` است.

healthcheck از `REDISCLI_AUTH` استفاده می‌کند تا رمز در آرگومان `redis-cli` نباشد. متغیر از محیط کانتینر می‌آید.

عوض کردن رمز: مقدار `.env` را عوض کنید، `docker compose up -d` بزنید تا فرمان جدید ساخته شود. برخلاف MySQL، این رمز مال فایل دادهٔ کاربر نیست. `requirepass` هر بار از روی فرمان اعمال می‌شود. کلاینت‌های باز با رمز قدیم قطع می‌شوند. این را در پنجرهٔ مشخص انجام دهید.

`TZ` برای لاگ محلی `Asia/Tehran` است. خود کلیدهای Redis منطقهٔ زمانی ندارند.

## Production Example

```bash
cd /opt/apps/shop-redis
docker compose up -d
docker compose ps
```

وضعیت باید `healthy` شود. آزمون از میزبان، بدون نوشتن رمز در خط `redis-cli`:

```bash
set -a
. ./.env
set +a
docker compose exec -e REDISCLI_AUTH="$REDIS_PASSWORD" redis redis-cli --no-auth-warning ping
```

جواب باید `PONG` باشد. بدون متغیر، `ping` باید شکست بخورد. این را هم یک بار ببینید تا مطمئن شوید سرور باز نمانده:

```bash
docker compose exec redis redis-cli ping
```

انتظار: خطا یا `NOAUTH`. اگر `PONG` گرفتید، `requirepass` اعمال نشده و سرویس را برای استفاده متوقف کنید.

داده:

```bash
docker compose exec -e REDISCLI_AUTH="$REDIS_PASSWORD" redis redis-cli --no-auth-warning SET lab:ping 1
docker compose exec redis ls -la /data
```

باید اثری از AOF زیر `/data` باشد. سپس:

```bash
docker compose restart redis
docker compose exec -e REDISCLI_AUTH="$REDIS_PASSWORD" redis redis-cli --no-auth-warning GET lab:ping
```

مقدار `1` یعنی ولوم مانده است. کلید آزمایشی را پاک کنید:

```bash
docker compose exec -e REDISCLI_AUTH="$REDIS_PASSWORD" redis redis-cli --no-auth-warning DEL lab:ping
```

`set -a` رمز را در محیط شل فعلی گذاشته. در پایان نشست آن شل را ببندید.

## Security Notes

Redis بدون رمز، حتی روی loopback، اگر کانتینر دیگری بتواند به پورت میزبان برسد خطرناک است. اینجا هم رمز هست هم پورت فقط `127.0.0.1` است. هر دو را نگه دارید. یکی جایگزین دیگری نیست، چون کانتینرهای دیگر روی همان میزبان ممکن است به loopback میزبان دسترسی نداشته باشند ولی یک فرایند محلی بدخواه دسترسی داشته باشد.

فایل `.env` با `0600`. مقدار `change-me` ممنوع برای استفادهٔ واقعی.

`docker inspect` بخش `Args` رمز را دارد. خواندن سوکت Docker معادل root است. با این حال از `docker compose config` عکس نگیرید و در کانال تیم نفرستید.

دستور `CONFIG` و `DEBUG` روی Redis باز، سابقهٔ حادثه دارد. این صفحه سطح شبکه را می‌بندد و رمز می‌گذارد. سخت‌کردن فرمان‌ها با ACL نام‌دار کار جداگانه‌ای است و اگر فقط `requirepass` را حذف کنید تا «کلاینت راحت شود»، صفحه را نقض کرده‌اید.

ایمیج `redis:8` است. به `redis:latest` نروید. به ایمیج Valkey در همین فایل سوئیچ نکنید و اسم را Redis نگه ندارید. اگر تصمیم سازمان Valkey شد، فایل و عنوان سرویس باید همان را بگوید.

## Troubleshooting

| نشانه | علت | کار |
| --- | --- | --- |
| `config` متغیر را کم دارد | `.env` نیست یا اسمش `REDIS_PASSWORD` نیست | فایل را کنار compose بگذارید |
| `ping` بدون رمز `PONG` است | `command` بازنویسی شده | `docker compose config` باید `--requirepass` را نشان بدهد |
| healthcheck همیشه unhealthy | رمز env و رمز سرور یکی نیست | لاگ health را در `docker inspect` ببینید |
| بعد از restart کلید نیست | ولوم سوار نیست یا appendonly خاموش است | `ls /data` و آرگومان فرمان |
| `NOAUTH` از برنامه | برنامه رمز را نمی‌فرستد | رمز را از env برنامه بدهید، نه اینکه requirepass را بردارید |
| از `app-1` وصل نمی‌شود | loopback عمدی است | تونل SSH |
| `port is already allocated` | Redis یا Valkey میزبان پورت را گرفته | `ss -ltnp`. هر دو را روی یک پورت اجرا نکنید |
| مجوز `/data` | entrypoint دور زده شده | فرمان باید با `redis-server` شروع شود |

Valkey میزبان اگر فعال است با این کانتینر روی `6379` تصادم می‌کند. یکی را خاموش کنید. این صفحه مال کانتینر است.

## Best Practices

- ایمیج `redis:8` بماند. این صفحه Valkey نیست، هرچند Valkey جایگزین APT اوبونتو است.
- `requirepass` را از env بگیرید. سرور بی‌رمز را بالا نیاورید.
- فایل env با `0600` و رمز غیر از `change-me` در استفادهٔ واقعی.
- AOF روشن و ولوم روی `/data`.
- پورت فقط `127.0.0.1:6379`.
- healthcheck با `REDISCLI_AUTH`، نه با رمز در آرگومان `redis-cli`.
- خروجی `config` و `inspect` را منتشر نکنید.
- فرمان را با شل پیچیده جایگزین نکنید.
- قبل از حذف ولوم مطمئن شوید کش است یا دادهٔ کاری.
- `docker compose config` را قبل از `up` بزنید و خطای متغیر خالی را دور نزنید.
