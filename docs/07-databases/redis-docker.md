---
title: Redis در Docker
sidebar_position: 12
description: "Redis 8 در Compose روی docker-1، پورت فقط localhost، AOF، و سقف حافظهٔ کش."
---

# Redis در Docker

## مقدمه

این صفحه ایمیج `redis:8` را روی `docker-1.example.internal` یعنی `10.10.1.30` بالا می‌آورد. پورت میزبان فقط `127.0.0.1:6379` است، داده روی volume نام‌دار می‌ماند، رمز نمونه `change-me` است، و `restart` برابر `unless-stopped` است. مفهوم RDB، AOF، و دلیل `allkeys-lru` در [Redis روی سرور](./redis-server.md) است و این‌جا تکرار عملیاتی‌اش را می‌گذاریم تا صفحه تنها هم اجرا شود. مدل Compose در [compose](/docs/05-docker/compose) و نمونهٔ کوتاه در [compose-redis](/docs/05-docker/compose-redis) است.

برنامهٔ روی `app-1` از شبکه به این پورت نمی‌رسد. اگر باید برسد، Redis را با بسته روی `db-1` نصب کنید. پورت کانتینر را `0.0.0.0` منتشر نکنید.

ایمیج `valkey` را این صفحه استفاده نمی‌کند. اگر سازمان فقط بستهٔ Ubuntu در کامپوننت main را می‌خواهد، مسیرش نصب `valkey-server` در صفحهٔ سرور است، نه یک ایمیج ناشناس. پروتکل داخل کانتینر Redis همان پروتکل Redis است.

## مفهوم اصلی

کانتینر Redis اگر `bind 127.0.0.1` داشته باشد، فقط از داخل خودش قابل دسترسی است. انتشار پورت Docker و سرویس هم‌شبکه به رابط اترنت کانتینر وصل می‌شوند، نه به localhost کانتینر. برای همین داخل این کانتینر `bind 0.0.0.0` است و محدودیت واقعی در کلید `ports` روی میزبان است: `127.0.0.1:6379:6379`. این استثنا را به کانفیگ بسته‌ای `db-1` کپی نکنید. آنجا `0.0.0.0` یعنی شنود روی کارت واقعی سرور.

رمز را در `command` خط فرمان کانتینر نگذارید. `docker inspect` و فهرست فرایند آن را نشان می‌دهند. رمز داخل فایل کانفیگی است که فقط‌خواندنی سوار می‌شود. باز هم هر کسی فایل روی دیسک میزبان را بخواند رمز را دارد، پس مجوز `0640` و مالک ریشه است. گروه را شل نکنید.

volume روی `/data` است، همان `dir` کانفیگ. بدون آن، AOF و RDB با حذف کانتینر می‌روند. `docker compose down -v` volume را پاک می‌کند.

`maxmemory 256mb` داخل کانتینر یعنی خود Redis قبل از پر کردن RAM میزبان کلید را اخراج می‌کند. این با محدودیت حافظهٔ خود کانتینر یکی نیست. هر دو را می‌گذاریم: Redis در ۲۵۶ مگابایت اخراج می‌کند و Docker اگر فرایند از ۵۱۲ مگابایت گذشت کانتینر را متوقف می‌کند. اختلاف این دو جا برای سربار فرایند است. عددها برای کش آزمایشی روی `docker-1` است، نه برای یک کش چندده گیگابایتی.

سیاست `allkeys-lru` یعنی این نمونه کش است. سفارش مشتری را فقط این‌جا ننویسید.

## چرا استفاده می‌شود؟

وقتی خود برنامه در همان Compose است، Redis کنارش با تگ `redis:8` بالا می‌آید و به universe میزبان وابسته نیست. این دلیل خوبی است اگر بقیهٔ برنامه هم کانتینر است. اگر فقط Redis را کانتینر کنید و برنامه روی `app-1` بماند، به پورت localhost `docker-1` نمی‌رسید و باید برگردید به صفحهٔ سرور.

دلیل دوم، جدا کردن دیسک داده از لایهٔ ایمیج است تا `compose up` دوباره کش را صفر نکند. برای کش خالص، از دست رفتن volume دردناک است ولی کش باید از دیتابیس بازسازی شود. اگر بازسازی ممکن نیست، این Redis را کش حساب نکنید و سیاست اخراج را برندارید تا «هیچ چیز پاک نشود»؛ بدون سقف، RAM میزبان تمام می‌شود.

## Architecture

```text
docker-1  10.10.1.30
   │
   ├── 127.0.0.1:6379 ──► کانتینر app-redis
   │                      ایمیج redis:8
   │                      داخل کانتینر bind 0.0.0.0 و requirepass
   │                      volume app-redis-data -> /data
   │                      سقف Docker 512m ، سقف Redis 256mb
   │
   └── شبکهٔ Compose
         سرویس برنامه ── نام redis ، پورت 6379 ، با رمز

app-1 10.10.1.10
   └── به پورت میزبان نمی‌رسد
```

فایل‌ها:

```text
/opt/apps/redis/compose.yaml
/opt/apps/redis/redis.conf
```

## Installation

```bash
docker compose version
sudo docker pull redis:8
sudo install -d -o root -g root -m 0755 /opt/apps/redis
sudo docker run --rm --entrypoint redis-server redis:8 --version
```

خروجی باید خط `v=8` را نشان دهد. تگ `latest` را به‌جای `redis:8` نگذارید. اگر `pull` شکست خورد، [آینهٔ رجیستری](/docs/05-docker/registry-mirror) و دوباره همین تگ.

## Configuration

کانفیگ را قبل از بالا آوردن بنویسید. `requirepass` این‌جا هست چون ایمیج رسمی فایل رمز جدا را مثل بستهٔ Ubuntu از قبل ندارد. معنی‌اش این نیست که رمز را در `compose.yaml` هم تکرار کنید.

```bash
sudo tee /opt/apps/redis/redis.conf >/dev/null <<'EOF'
bind 0.0.0.0
protected-mode yes
port 6379
dir /data
appendonly yes
appendfsync everysec
save 900 1
save 300 10
save 60 10000
maxmemory 256mb
maxmemory-policy allkeys-lru
requirepass change-me
EOF
sudo chmod 0640 /opt/apps/redis/redis.conf
```

:::warning رمز نمونه
`change-me` را در `redis.conf` عوض کنید. فایل را به گیت نفرستید. `docker inspect` این‌بار رمز را از محیط نمی‌خواند، ولی متن کانفیگ روی دیسک هست و داخل کانتینر در `/usr/local/etc/redis/redis.conf` خوانده می‌شود.
:::

`supervised systemd` را این‌جا نگذارید. داخل ایمیج رسمی، خود entrypoint فرایند را جلوی Docker نگه می‌دارد و سوکت notify سیستم‌عامل میزبان را ندارد. گذاشتن `supervised systemd` بدون آن سوکت بالا آمدن را خراب می‌کند. این برعکس صفحهٔ سرور است و عمدی است.

```bash
sudo tee /opt/apps/redis/compose.yaml >/dev/null <<'EOF'
name: app-redis
services:
  redis:
    image: redis:8
    container_name: app-redis
    restart: unless-stopped
    mem_limit: 512m
    ports:
      - "127.0.0.1:6379:6379"
    command: ["redis-server", "/usr/local/etc/redis/redis.conf"]
    volumes:
      - app-redis-data:/data
      - ./redis.conf:/usr/local/etc/redis/redis.conf:ro
volumes:
  app-redis-data:
    name: app-redis-data
EOF
```

اگر `docker compose config` کلید `mem_limit` را نپذیرفت، خطش را برندارید تا وقتی خروجی خطا را دیده‌اید؛ سپس به‌جای آن بعد از بالا آمدن این را بزنید و در مستند داخلی خودتان یادداشت کنید:

```bash
sudo docker update --memory 512m --memory-swap 512m app-redis
```

`--memory-swap` برابر خود حافظه یعنی سواپ اضافه برای این کانتینر نخواهیم. بدون سقف، `maxmemory` هنوز Redis را محدود می‌کند، ولی یک باگ یا `CONFIG SET maxmemory 0` می‌تواند میزبان را پر کند. هر دو لایه را داشته باشید.

## Production Example

```bash
cd /opt/apps/redis
sudo docker compose up -d
sudo docker compose ps
sudo ss -lptn 'sport = :6379'
```

باید `127.0.0.1:6379` باشد و `0.0.0.0:6379` نباشد. بدون رمز باید رد شود. رمز را در `-a` نگذارید.

```bash
sudo docker compose exec redis redis-cli ping
sudo docker compose exec redis redis-cli --askpass ping
```

اولی `NOAUTH`، دومی بعد از وارد کردن رمز `PONG`.

دادهٔ نمونه و ماندگاری:

```bash
sudo docker compose exec redis redis-cli --askpass SET cart:42 "A-1" EX 3600
sudo docker compose exec redis redis-cli --askpass SET persist:demo 1
sudo docker compose exec redis redis-cli --askpass BGSAVE
sudo docker compose exec redis redis-cli --askpass CONFIG GET appendonly
sudo docker compose exec redis redis-cli --askpass CONFIG GET maxmemory-policy
```

`appendonly` باید `yes` و سیاست `allkeys-lru` باشد. ری‌استارت کانتینر، نه حذف volume:

```bash
cd /opt/apps/redis
sudo docker compose restart redis
sudo docker compose exec redis redis-cli --askpass GET persist:demo
sudo docker compose exec redis redis-cli --askpass TTL cart:42
```

`persist:demo` باید `1` باشد. `TTL` عدد مثبت زیر ۳۶۰۰ است، نه `-2` که یعنی کلید نیست. اگر هر دو خالی‌اند، volume روی `/data` نیست یا AOF در کانفیگ دیگری خاموش است.

```bash
sudo docker compose exec redis ls -lh /data /data/appendonlydir
sudo docker volume inspect app-redis-data --format 'name={{.Name}}'
```

برنامهٔ داخل همین Compose میزبان را `redis` می‌گذارد، پورت `6379`، و رمز را از مکانیسم رمز خود Compose یا فایل محیطی برنامه می‌خواند، نه از آرگومان خط فرمان. `127.0.0.1` داخل کانتینر برنامه به این Redis نمی‌رسد.

حذف کانتینر بدون حذف volume:

```bash
cd /opt/apps/redis
sudo docker compose down
sudo docker volume ls --filter name=app-redis-data
sudo docker compose up -d
sudo docker compose exec redis redis-cli --askpass GET persist:demo
```

باز هم `1`. این آزمون را با `down -v` انجام ندهید.

## Security Notes

- انتشار پورت فقط `127.0.0.1`. شکل `6379:6379` ممنوع است، حتی با `requirepass`. رمز جای فایروال را نمی‌گیرد؛ Redis سریع است و حدس زدن رمز روی پورت باز عملی‌تر از چیزی است که به نظر می‌رسد.
- `bind 0.0.0.0` فقط داخل netns این کانتینر مجاز است. در `/etc/redis/redis.conf` میزبان `db-1` مجاز نیست.
- رمز در `command` نیست. در `redis.conf` روی دیسک هست. مجوز `0640`.
- `protected-mode yes` روشن می‌ماند.
- شبکهٔ Compose به هر سرویس این فایل اجازه می‌دهد به `redis:6379` برسد. کانتینر نامطمئن را به پروژه اضافه نکنید. رمز هنوز لازم است، چون شبکهٔ Docker به‌تنهایی احراز هویت نیست.
- `allkeys-lru` کلید را پاک می‌کند. برنامه باید از دیتابیس اصلی بازسازی کند.
- `docker compose down -v` کش و هر چیز دیگری که اشتباهی این‌جا مانده را پاک می‌کند.
- Valkey بسته‌ای و این ایمیج را هم‌زمان روی پورت ۶۳۷۹ میزبان نگذارید.

## Troubleshooting

| نشانه | علت محتمل | کار |
| --- | --- | --- |
| `PONG` بدون رمز | کانفیگ سوار نشده و ایمیج بدون رمز بالا آمده | `docker compose exec redis redis-cli CONFIG GET requirepass` و مسیر mount |
| از میزبان `Connection refused` روی IP خود `docker-1` | طراحی صفحه | از خود میزبان `127.0.0.1`، یا برنامه در همان شبکهٔ Compose |
| سرویس هم‌کامپوز وصل نمی‌شود | برنامه `127.0.0.1` را صدا می‌زند، یا `bind 127.0.0.1` را به کانفیگ کانتینر کپی کرده‌اید | میزبان `redis` و bind داخل کانتینر `0.0.0.0` |
| کانتینر بلافاصله خارج می‌شود | `supervised systemd` را در کانفیگ کانتینر گذاشته‌اید، یا فایل کانفیگ غلط است | لاگ. آن کلید مال صفحهٔ سرور است |
| بعد از `restart` کلید نیست | داده در `/data` نیست | `CONFIG GET dir` باید `/data` باشد و volume همان مسیر باشد |
| `OOMKilled` | سقف ۵۱۲ مگابایت کوچک‌تر از مصرف واقعی شده | `docker inspect app-redis` بخش حافظه. `maxmemory` را بی‌حساب بالا نبرید؛ اول ببینید چه کسی حافظه را خورده |
| پورت اشغال است | `redis-server` میزبان یا کانتینر دیگر | `sudo ss -lptn 'sport = :6379'` |
| `appendonlydir` نیست | `appendonly` اعمال نشده | کانفیگ سوارشده را داخل کانتینر `cat` کنید |

لاگ:

```bash
sudo docker compose logs --tail 40 redis
```

خط آمادهٔ پذیرش اتصال، همراه مسیر کانفیگ، حالت سالم است.

## Best Practices

- تگ `redis:8`، volume با نام ثابت، پورت فقط localhost، `unless-stopped`، رمز داخل فایل نه داخل `command`.
- داخل کانتینر bind باز، روی میزبان انتشار بسته. این دو را جابه‌جا ننویسید.
- `maxmemory` و محدودیت خود کانتینر را با هم بگذارید و هر دو را از RAM واقعی `docker-1` کم کنید، به‌خصوص اگر MySQL یا PostgreSQL هم کانتینر همان میزبان است.
- AOF با `everysec` روشن بماند. RDB را هم با `save` نگه دارید.
- سیاست `allkeys-lru` را فقط چون کلید گم شده خاموش نکنید. اول تصمیم بگیرید این نمونه کش است یا نه. اگر نیست، سقف بدون اخراج کور (`noeviction`) یعنی نوشتن جدید خطا می‌گیرد و برنامه باید آن خطا را ببیند، نه اینکه بی‌صدا داده عوض شود. برای کش همین صفحه، `allkeys-lru` درست است.
- بکاپ کش معمولاً لازم نیست. اگر این نمونه استثنائاً دادهٔ بازسازی‌نشدنی دارد، طراحی غلط است؛ تا اصلاحش، حداقل volume را مثل دادهٔ جدی کپی نکنید در حالی که کانتینر روشن است. `BGSAVE` و کپی فایل بعد از تمام شدن save، یا پذیرش اینکه AOF روی volume تنها کپی است و باید جای دیگری هم برود.
- ارتقای تگ عمده را روی volume تولید بدون یک کپی آزمایشی انجام ندهید.
