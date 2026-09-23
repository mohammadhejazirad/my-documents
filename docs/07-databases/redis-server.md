---
title: Redis روی سرور
sidebar_position: 11
description: "Redis 8 از بستهٔ Ubuntu، ماندگاری RDB و AOF، سقف حافظه، و مسیر Valkey 9."
---

# Redis روی سرور

## مقدمه

این صفحه Redis 8 را با بستهٔ `redis-server` از کامپوننت universe روی Ubuntu 26.04 نصب می‌کند. فایل کانفیگ `/etc/redis/redis.conf` است، `supervised systemd` است، و شنود `127.0.0.1` می‌ماند مگر اینکه عامدانه و با رمز و فایروال عوضش کنید. ماندگاری با RDB و AOF هر دو روشن می‌شود. اگر Redis کش است، `maxmemory` و سیاست `allkeys-lru` اجباری است.

Valkey 9 در کامپوننت main جایگزین پشتیبانی‌شدهٔ Canonical است و پروتکل Redis را حرف می‌زند. دستورهای این صفحه برای باینری Redis نوشته شده‌اند. اگر سیاست سازمان فقط بستهٔ main را قبول دارد، زیربخش نصب `valkey-server` را اجرا کنید و نام‌ها را همان‌جا عوض کنید، نه اینکه universe را دور بزنید و همچنان فکر کنید Canonical خود Redis را پشتیبانی می‌کند.

میزبان نمونه اگر کنار دیتابیس است همان `db-1` با آدرس `10.10.1.20` است. برنامه روی `10.10.1.10` فقط وقتی به پورت ۶۳۷۹ می‌رسد که خودتان bind و UFW را باز کنید. پیش‌فرض این صفحه آن را باز نمی‌کند. کانتینر در [Redis در Docker](./redis-docker.md) است.

## مفهوم اصلی

Redis داده را در RAM نگه می‌دارد. دیسک برای این است که بعد از ری‌استارت چیزی بماند، نه برای اینکه مجموعه از RAM بزرگ‌تر شود. اگر RAM پر شود و سقفی نگذاشته باشید، هسته فرایند را می‌کشد و بسته به ماندگاری، دادهٔ بعد از آخرین نوشتن امن از بین می‌رود.

RDB یعنی عکس لحظه‌ای. فایل معمول `dump.rdb` در `/var/lib/redis` است. قواعد `save` می‌گویند بعد از گذشت چند ثانیه و چند تغییر، یک عکس گرفته شود. بین دو عکس، قطع برق همان فاصله را گم می‌کند. خوبش این است که یک فایل جمع‌وجور برای ری‌استارت سریع دارید.

AOF یعنی لاگ دستورهای نوشتن. در Redis 8 این لاگ یک فایل تنها به نام قدیمی `appendonly.aof` نیست. با `appendonly yes` دایرکتوری `appendonlydir` ساخته می‌شود که مانیفست، یک فایل پایه، و فایل‌های افزایشی دارد. آن فایل‌ها را با دست ویرایش نکنید. `appendfsync everysec` یعنی حدود هر ثانیه یک‌بار fsync. پنجرهٔ گم‌شدن در قطع برق حدود یک ثانیه است و هزینهٔ دیسک از fsync روی هر دستور کمتر است. `always` امن‌تر و کندتر است. `no` تصمیم را به هسته می‌سپارد و برای این فصل مناسب نیست.

گذاشتن هر دو با هم انتخاب عادی است: RDB برای بالا آمدن سریع‌تر و یک نقطهٔ قابل کپی، AOF برای پنجرهٔ گم‌شدن کوتاه‌تر. هیچ‌کدام بکاپ منطقی جدول سفارش نیستند. سفارش باید در [PostgreSQL](./postgresql-server.md) یا [MySQL](./mysql-server.md) باشد.

`maxmemory` سقف بایت‌هایی است که Redis برای داده قبول می‌کند. `maxmemory-policy allkeys-lru` وقتی سقف پر شود کلیدهایی را که دیرتر استفاده شده‌اند پاک می‌کند، حتی اگر TTL نداشته باشند. این سیاست برای کش درست است و برای صف یا تنها نسخهٔ نشست کاربر خطرناک است. اگر کلیدی نباید هرگز اخراج شود، یا TTL و سیاست `volatile-lru` می‌خواهید (و باز هم باید بدانید کلید بی‌TTL اخراج نمی‌شود و می‌تواند حافظه را پر کند) یا آن کلید اصلاً به این نمونه تعلق ندارد.

`requirepass` یک رمز برای کاربر پیش‌فرض است. در Redis 8 هنوز کار می‌کند. فهرست ACL دقیق‌تر است و این صفحه برای یک رمز عملیاتی همان `requirepass` را در فایل جدا می‌گذارد. رمز را در تاریخچهٔ شل و در `redis-cli -a` ننویسید.

بستهٔ Ubuntu یونیت را با `--supervised systemd --daemonize no` بالا می‌آورد. `daemonize yes` را کنار این یونیت روشن نکنید وگرنه systemd وضعیت را گم می‌کند. در خود `redis.conf` هم `supervised systemd` را می‌گذاریم تا اجرای دستی با یونیت یکی باشد.

## چرا استفاده می‌شود؟

کش سبد، محدودیت نرخ، و قفل کوتاه، اگر داخل PostgreSQL بروند هم درست کار می‌کنند و هم کندتر و گران‌ترند. Redis برای این کار ساخته شده، به شرطی که از دست رفتن کلید رفتار برنامه را خراب نکند. برنامه باید بتواند بعد از خالی شدن کش از دیتابیس اصلی دوباره بسازد.

دلیل دوم ماندن روی بستهٔ `redis-server` این است که دستور، فایل، و کلاینت `redis-cli` همان چیزی است که بقیهٔ ابزارها انتظار دارند. دلیل نرفتن سراغ آن، وقتی قرارداد پشتیبانی فقط main است، وجود Valkey 9 در همان Ubuntu است. Valkey شاخه‌ای سازگار با پروتکل است، نه یک پلاگین. دادهٔ RDB را بین این دو بدون آزمون نسخه جابه‌جا نکنید؛ قابلیت پروتکل مشترک است و فایل دیسک را باید روی همان نسخه که ساخته امتحان کنید.

## Architecture

```text
برنامه روی خود db-1 یا روی docker-1
   └── 127.0.0.1:6379
         redis-server
         کانفیگ /etc/redis/redis.conf
         رمز جدا /etc/redis/requirepass.conf
         داده   /var/lib/redis/dump.rdb
         AOF    /var/lib/redis/appendonlydir/
         unit   redis-server.service
         کاربر سیستم redis

app-1 10.10.1.10
   └── به‌صورت پیش‌فرض نمی‌رسد
       باز کردن یعنی bind اضافه، requirepass، و UFW فقط از همین IP
```

اگر Redis کنار PostgreSQL روی یک ماشین ۴ گیبیابایتی است، سقف Redis باید کوچک بماند تا بافر دیتابیس و کش فایل جا داشته باشند. مثال این صفحه `256mb` است. آن را با `shared_buffers` جمع نکنید و فرض نکنید هر دو می‌توانند نصف RAM را بردارند.

## Installation

```bash
sudo apt update
apt-cache policy redis-server
sudo apt install redis-server
sudo systemctl enable --now redis-server
sudo systemctl status redis-server --no-pager
redis-server --version
redis-cli ping
```

کاندیدای `apt-cache` باید از `resolute/universe` و خط نسخهٔ ۸ باشد. نمونهٔ بسته‌ای که در Resolute دیده شده `5:8.0.5-1` است. epoch اول شماره (`5:`) مال بسته‌بندی Debian است نه شمارهٔ Redis. اگر patch بالاتر از ۸.۰ بود و هنوز خط ۸ است، همین صفحه معتبر است. `ping` قبل از رمز باید `PONG` بدهد. بعد از کانفیگ پایین، بدون رمز باید رد شود.

یونیت را ببینید تا `--supervised systemd` و `--daemonize no` را با چشم ببینید.

```bash
systemctl cat redis-server | head -n 40
```

### مسیر پشتیبانی Canonical: Valkey 9

اگر باید از کامپوننت main نصب کنید، Redis را کنار Valkey روی یک پورت نصب نکنید.

```bash
apt-cache policy valkey-server
sudo apt install valkey-server
sudo systemctl enable --now valkey-server
sudo systemctl status valkey-server --no-pager
valkey-server --version
```

کانفیگ `/etc/valkey/valkey.conf` و یونیت `valkey-server.service` است. کلاینت `valkey-cli` است. پروتکل همان پروتکل Redis است، پس مفهوم `requirepass`، `appendonly`، `maxmemory` و `allkeys-lru` همان است. دستورهای پایین را با مسیر و نام Valkey اجرا کنید. بستهٔ `valkey-redis-compat` اگر در `apt-cache policy` موجود بود نام‌های `redis-cli` را به Valkey وصل می‌کند؛ قبل از نصب وجودش را ببینید و فرض نکنید حتماً در آرشیو هست. این فصل بعد از این زیربخش دوباره دستور Redis را ادامه می‌دهد.

## Configuration

رمز در فایل جدا. آن را با ویرایشگر و `sudoedit` بگذارید تا در تاریخچهٔ شل نیاید. اینجا برای اینکه دستور قابل اجرا باشد از `tee` استفاده شده و بلافاصله هشدار تاریخچه آمده است.

```bash
sudo tee /etc/redis/requirepass.conf >/dev/null <<'EOF'
requirepass change-me
EOF
sudo chown redis:redis /etc/redis/requirepass.conf
sudo chmod 0640 /etc/redis/requirepass.conf
```

:::warning رمز نمونه
`change-me` را عوض کنید. اگر این بلوک را در شل چسبانده‌اید، از تاریخچهٔ کاربر `ops` و `root` حذفش کنید. فایل را کامیت نکنید.
:::

در `/etc/redis/redis.conf` این مقدارها باید مؤثر باشند. خط‌های توضیح‌دار با `#` اثر ندارند. اگر همان کلید را بسته قبلاً ست کرده، خط فعال قبلی را حذف یا خاموش کنید تا دو مقدار متناقض نماند. `include` را بگذارید ته بخش امنیت، و در خود فایل اصلی `requirepass` دوم ننویسید.

```ini
bind 127.0.0.1 -::1
protected-mode yes
port 6379
supervised systemd
daemonize no
dir /var/lib/redis
appendonly yes
appendfsync everysec
save 900 1
save 300 10
save 60 10000
maxmemory 256mb
maxmemory-policy allkeys-lru
include /etc/redis/requirepass.conf
```

علامت `-::1` یعنی روی IPv6 حلقه‌برگشت گوش نده. `bind 127.0.0.1` همان محدودیتی است که این فصل می‌خواهد. `save 900 1` یعنی اگر دست‌کم یک کلید عوض شده باشد، بعد از ۹۰۰ ثانیه یک RDB گرفته شود. دو خط بعدی فاصله را برای تغییر بیشتر کوتاه‌تر می‌کنند. با AOF هر ثانیه، این عکس‌ها پنجرهٔ گم‌شدن را تعیین نمی‌کنند؛ نقطهٔ کمکی‌اند.

`256mb` برای کش کنار یک دیتابیس روی ماشین حدود ۴ گیبیابایتی است. اگر `free -h` کمتر نشان می‌دهد، `128mb` بگذارید. اگر Redis تنها سرویس یک ماشین حافظه‌دار است، سقف را بعد از کم کردن حداقل یک گیگابایت برای سیستم‌عامل از نو حساب کنید و عدد این صفحه را کپی نکنید. بدون `maxmemory` سیاست اخراج هرگز شروع نمی‌شود.

```bash
sudo systemctl restart redis-server
sudo systemctl status redis-server --no-pager
sudo ss -lptn 'sport = :6379'
```

باید فقط `127.0.0.1:6379` باشد. آزمون رمز. از `-a` استفاده نکنید.

```bash
redis-cli ping
REDISCLI_HISTFILE=/dev/null redis-cli --askpass ping
```

اولی باید `NOAUTH` بدهد. دومی رمز را می‌پرسد و باید `PONG` بدهد. `--askpass` رمز را در تاریخچهٔ شل نمی‌گذارد. تاریخچهٔ خود `redis-cli` را هم خاموش کرده‌ایم چون دستور `AUTH` ممکن است آنجا بماند.

روش جایگزین، بدون فایل include: داخل `redis-cli` بعد از ورود، `CONFIG SET requirepass ...` و سپس `CONFIG REWRITE`. `CONFIG REWRITE` کانفیگ در حال اجرا را داخل `/etc/redis/redis.conf` از نو می‌نویسد و رمز را اغلب به خود فایل اصلی می‌آورد، نه لزوماً داخل فایل جدا. بعد از REWRITE فایل را باز کنید. اگر `requirepass` در فایل اصلی کنار `include` تکرار شده، یکی را بردارید وگرنه دفعهٔ بعد معلوم نیست کدام مانده است. ویرایش فایل جدا و ری‌استارت برای این فصل تمیزتر است. `CONFIG SET` بدون `CONFIG REWRITE` یا بدون تغییر فایل، با ری‌استارت گم می‌شود.

اگر برنامه روی `app-1` باید از شبکه برسد، فقط این تغییر را بدهید و همان رمز را از قبل فعال داشته باشید. `protected-mode yes` بدون رمز، اتصال غیرمحلی را رد می‌کند، ولی این بهانهٔ بی‌رمز ماندن نیست.

```ini
bind 127.0.0.1 10.10.1.20 -::1
```

```bash
sudo ufw allow OpenSSH
sudo ufw allow from 10.10.1.10 to any port 6379 proto tcp comment 'app-1 redis'
sudo systemctl restart redis-server
sudo ss -lptn 'sport = :6379'
```

`0.0.0.0` ننویسید. تا وقتی برنامه روی خود `db-1` است همین بخش را اجرا نکنید و bind را `127.0.0.1 -::1` بگذارید.

## Production Example

کش را مثل کش امتحان کنید، نه مثل جدول سفارش.

```bash
REDISCLI_HISTFILE=/dev/null redis-cli --askpass <<'EOF'
SET cart:42 "A-1" EX 60
GET cart:42
TTL cart:42
CONFIG GET maxmemory
CONFIG GET maxmemory-policy
CONFIG GET appendonly
EOF
```

`EX 60` یعنی کلید یک دقیقه دیگر از بین می‌رود حتی اگر حافظه پر نباشد. `maxmemory-policy` باید `allkeys-lru` باشد و `appendonly` باید `yes`. بعد از ری‌استارت کلیدهایی که TTL نشده‌اند باید از AOF برگردند.

```bash
REDISCLI_HISTFILE=/dev/null redis-cli --askpass SET persist:demo 1
sudo systemctl restart redis-server
REDISCLI_HISTFILE=/dev/null redis-cli --askpass GET persist:demo
```

باید `1` برگردد. اگر خالی است، AOF روشن نشده یا `dir` جای دیگری است.

```bash
sudo ls -lh /var/lib/redis /var/lib/redis/appendonlydir
```

باید `dump.rdb` بعد از اولین save، و دایرکتوری `appendonlydir` را ببینید. نرسیدن فوری `dump.rdb` تا وقتی قاعدهٔ `save` به آستانه نرسیده طبیعی است. با این دستور یک عکس همین حالا بگیرید.

```bash
REDISCLI_HISTFILE=/dev/null redis-cli --askpass BGSAVE
```

سیاست اخراج را با یک سقف خیلی کوچک روی سرور تولید امتحان نکنید. اگر خواستید رفتار را ببینید، فقط روی یک VM آزمایشی `maxmemory 1mb` بگذارید، چند کلید بزرگ بنویسید، و `INFO stats` را برای `evicted_keys` بخوانید. بعد عدد را به سقف واقعی برگردانید. روی `db-1` که دادهٔ کش زنده دارد این بازی را نکنید.

## Security Notes

- Redis در universe است. پشتیبانی امنیتی‌اش با بستهٔ main یکی نیست. اگر سازمان فقط main می‌خواهد، Valkey 9 مسیر Canonical است و پروتکل را حفظ می‌کند؛ رمز و bind را آنجا هم همین‌قدر سخت بگیرید.
- `bind 127.0.0.1` پیش‌فرض این صفحه است. باز کردن `10.10.1.20` بدون `requirepass` و بدون UFW ممنوع است. `protected-mode yes` را خاموش نکنید.
- `redis-cli -a` رمز را در `ps` و تاریخچه نشان می‌دهد. `--askpass` یا داخل اسکریپت `REDISCLI_AUTH` از فایل `0600`، با این آگاهی که محیط فرایند را ریشه می‌تواند بخواند.
- `CONFIG REWRITE` ممکن است رمز را به `redis.conf` برگرداند. بعدش فایل را ببینید.
- `allkeys-lru` داده را پاک می‌کند. این ویژگی امنیتی نیست ولی حادثهٔ داده‌ای هست اگر کسی Redis را تنها محل نوشتن گذاشته باشد.
- پورت ۶۳۷۹ را روی اینترنت و روی کل `10.10.1.0/24` باز نکنید. اگر اصلاً باز شد، فقط `10.10.1.10`.
- فایل `requirepass.conf` گروه `redis` و مجوز `0640` است تا خود سرویس بخواند و بقیه نخوانند.

## Troubleshooting

| نشانه | علت محتمل | کار |
| --- | --- | --- |
| `PONG` بدون رمز | `requirepass` در فایل مؤثر نیست یا include خوانده نشده | `redis-cli CONFIG GET requirepass` بعد از ورود. اگر خالی است ری‌استارت بعد از include |
| `NOAUTH` در خود برنامه | برنامه رمز قدیمی را می‌فرستد | فایل محیطی برنامه و فایل Redis را یکی کنید و فرایند برنامه را از نو بالا بیاورید |
| یونیت `timeout` یا وضعیت نامعلوم | `daemonize yes` با `Type=notify` | `daemonize no` و `supervised systemd`، مطابق یونیت بسته |
| از `app-1` تایم‌اوت | هنوز bind محلی است، یا UFW | `ss` و `ufw status`. اگر برنامه محلی است اصلاً bind را باز نکنید |
| بعد از ری‌استارت کلید نیست | AOF خاموش بوده و RDB هم گرفته نشده | `appendonly` و وجود `appendonlydir`. کلیدهای فقط حافظه‌ای قبل از این تنظیم برنمی‌گردند |
| حافظهٔ سرور پر است و Redis مقصر است | `maxmemory` نیست یا بزرگ‌تر از RAM است | `INFO memory` و عدد `maxmemory` |
| کلید مهم غیب شده | `allkeys-lru` | `INFO stats` و شمارندهٔ `evicted_keys`. سیاست را عوض نکنید تا وقتی دادهٔ ماندگار را از این نمونه خارج نکرده‌اید؛ والّا دوباره پر می‌شود |
| `Can't open include` | مجوز `requirepass.conf` | مالک `redis` و `0640` |

لاگ یونیت:

```bash
sudo journalctl -u redis-server -n 40 --no-pager
```

خط `Ready to accept connections` حالت سالم است.

## Best Practices

- کش و دادهٔ ماندگار را در یک نمونه با `allkeys-lru` قاطی نکنید.
- سقف حافظه را از RAM آزاد همین ماشین حساب کنید، به‌خصوص اگر PostgreSQL یا MySQL همان‌جاست. ۲۵۶ مگابایت این صفحه مخصوص آن همزیستی روی ماشین کوچک است.
- RDB را خاموش نکنید فقط چون AOF روشن است، و AOF را هم به‌خاطر «دیسک زیاد» خاموش نکنید اگر گم شدن یک عکس چنددقیقه‌ای قبول نیست.
- `appendfsync always` را بدون اندازه گرفتن تأخیر روشن نکنید.
- رمز در فایل جدا، نه در تاریخچه. بعد از هر `CONFIG REWRITE` فایل اصلی را برای رمز تکراری بگردید.
- bind محلی بماند مگر مسیر شبکه واقعاً لازم باشد. آن وقت هم فقط کارت `10.10.1.20` و فقط مبدأ `10.10.1.10`.
- اگر به Valkey مهاجرت می‌کنید، پورت، فایل رمز، و یک آزمون `GET` بعد از ری‌استارت را دوباره بگیرید. اسم پروتکل مشترک به‌معنی کپی کور فایل کانفیگ بین دو مسیر `/etc/redis` و `/etc/valkey` بدون خواندن کلیدها نیست، ولی کلیدهای این صفحه در هر دو شناخته شده‌اند.
