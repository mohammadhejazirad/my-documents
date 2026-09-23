---
sidebar_position: 6
title: مدل Compose
description: فایل Compose بدون کلید version، با سرویس و شبکه و ولوم و وابستگی به سلامت.
---

# مدل Compose

## مقدمه

Compose فایل متنی است که چند سرویس را یک‌جا تعریف می‌کند. فرمان این فصل همیشه `docker compose` با فاصله است. در پوشهٔ پروژه اجرا می‌شود و به‌طور پیش‌فرض `compose.yaml`، بعد `compose.yml`، بعد `docker-compose.yml` را برمی‌دارد. باینری `docker-compose` را صدا نزنید، حتی اگر روی سرور قدیمی هنوز نصب است.

نمونهٔ این صفحه مدل را نشان می‌دهد: دو سرویس، یک شبکهٔ مشترک، یک ولوم نام‌دار، سیاست `restart: unless-stopped`، و بالا آمدن وب فقط بعد از سالم شدن API. نمونه‌های تک‌سرویسی Nginx و دیتابیس از همین مدل می‌آیند و هر کدام فایل قابل کپی خودشان را دارند.

پوشهٔ کار `/opt/apps/shop` روی `docker-1.example.internal` است.

## مفهوم اصلی

کلید `version` بالای فایل در مشخصات فعلی Compose منسوخ است. Compose نسخهٔ ۲ آن را نادیده می‌گیرد و هشدار می‌دهد. در فایل‌های این دانشنامه این کلید نیست. اگر فایل قدیمی `version: "3.9"` دارید، با حذف همان خط و با `docker compose config` دوباره اعتبارسنجی کنید. بقیهٔ کلیدهای سرویس را بی‌دلیل بازنویسی نکنید.

هر کلید زیر `services` یک سرویس است. اسم سرویس، اسم DNS داخل شبکهٔ همان فایل است. `image` ایمیج را مشخص می‌کند. `build` ایمیج را از Dockerfile همان پوشه می‌سازد. این صفحه برای اینکه مدل بدون بیلد قابل فهم بماند از ایمیج آماده استفاده می‌کند. برنامهٔ واقعی Node در [نمونهٔ Node.js](./compose-nodejs.md) بیلد می‌شود.

`networks` دامنهٔ ارتباط است. `volumes` دادهٔ ماندگار است. `depends_on` با `condition: service_healthy` یعنی سرویس وابسته تا وقتی وابستگی سالم نشده شروع نمی‌شود. این سلامت از healthcheck همان سرویس می‌آید، نه از بالا بودن صرف کانتینر. اسم این الگو در گفتگوی تیم «وابستگی به سلامت» است. کلید واقعی فایل `depends_on` است، نه یک کلید جدا به نام دیگر.

`restart: unless-stopped` یعنی با مرگ فرایند و با ریبوت میزبان کانتینر برمی‌گردد، ولی اگر `ops` خودش `docker compose stop` کرده باشد، ریستارت دیمون آن را خودسرانه بالا نمی‌آورد.

فایل `.env` کنار `compose.yaml` را Compose برای جایگذاری متغیر داخل فایل می‌خواند. این با تزریق متغیر به داخل کانتینر یکی نیست. جایی که رمز باید به فرایند برسد، `environment` یا `env_file` لازم است. نمونه‌های دیتابیس هر دو سطح را نشان می‌دهند.

## چرا استفاده می‌شود؟

`docker run` طولانی در تاریخچهٔ شل گم می‌شود، ولوم بی‌نام می‌سازد، و نفر بعدی نمی‌داند شبکه کدام بود. فایل Compose همان تصمیم را قابل بازخوانی می‌کند و `docker compose config` آن را قبل از دست زدن به دیتابیس حل می‌کند.

وابستگی به سلامت جلوی حالتی را می‌گیرد که Nginx بالا بیاید و ترافیک بگیرد در حالی که API هنوز به پورت گوش نداده. `depends_on` بدون شرط سلامت فقط ترتیب ایجاد کانتینر را عوض می‌کند و برای برنامه کافی نیست.

ولوم نام‌دار با اسم صریح، داده را از اسم پوشه جدا می‌کند. اگر اسم پروژه عوض شود و ولوم اسم داخلی نداشته باشد، Compose یک ولوم تازه می‌سازد و دادهٔ قدیمی را یتیم می‌گذارد. در این صفحه ولوم `shop-data` اسم ثابت دارد.

## Architecture

```text
/opt/apps/shop/compose.yaml
        │
        ▼
docker compose
        │
        ├─ شبکهٔ shop
        │     api:3000  ◄──── نام DNS ──── web
        │
        ├─ ولوم shop-data  →  /var/lib/shop داخل api
        │
        └─ انتشار  10.10.1.30:8080  →  web:80
```

`api` به بیرون منتشر نمی‌شود. فقط `web` روی کارت `10.10.1.30` و پورت `8080` دیده می‌شود. پورت `80` میزبان آزاد می‌ماند. از `proxy.example.internal` یعنی `10.10.1.5` به `http://10.10.1.30:8080` می‌رسید.

ترتیب شروع: Engine آزمون سلامت `api` را می‌زند. تا وقتی نتیجه موفق نباشد، `web` را شروع نمی‌کند. اگر `api` هیچ‌وقت سالم نشود، `web` بالا نمی‌آید و `docker compose ps` همان را نشان می‌دهد. این شکست بهتر از سرو کردن خطای مبهم به کاربر است.

## Installation

پوشه و فایل کانفیگ وب را بسازید. این مدل به رمز نیاز ندارد.

```bash
sudo install -d -o ops -g ops -m 0755 /opt/apps/shop
cd /opt/apps/shop
```

کانفیگ Nginx که به اسم سرویس `api` پروکسی می‌کند:

```text
server {
    listen 80;
    server_name app.example.com;

    location = /health {
        proxy_pass http://api:3000/health;
    }

    location / {
        proxy_pass http://api:3000/;
    }
}
```

`compose.yaml`:

```yaml
name: shop

services:
  api:
    image: node:24-bookworm-slim
    restart: unless-stopped
    command:
      - node
      - -e
      - "const http=require('node:http');const s=http.createServer((q,r)=>{const b=q.url==='/health'?'ok':'shop';r.writeHead(200,{'content-type':'text/plain'});r.end(b);});s.listen(3000,'0.0.0.0');"
    networks:
      - shop
    volumes:
      - shop-data:/var/lib/shop
    healthcheck:
      test:
        - CMD
        - node
        - -e
        - "fetch('http://127.0.0.1:3000/health').then((r) => process.exit(r.ok ? 0 : 1)).catch(() => process.exit(1))"
      interval: 10s
      timeout: 3s
      retries: 3
      start_period: 10s
    logging:
      driver: json-file
      options:
        max-size: "10m"
        max-file: "5"

  web:
    image: nginx:1.28-alpine
    restart: unless-stopped
    depends_on:
      api:
        condition: service_healthy
    ports:
      - "10.10.1.30:8080:80"
    volumes:
      - ./nginx.conf:/etc/nginx/conf.d/default.conf:ro
    networks:
      - shop
    healthcheck:
      test:
        - CMD
        - wget
        - -q
        - -O
        - /dev/null
        - http://127.0.0.1/health
      interval: 10s
      timeout: 3s
      retries: 3
      start_period: 5s
    logging:
      driver: json-file
      options:
        max-size: "10m"
        max-file: "5"

networks:
  shop:
    name: shop
    driver: bridge

volumes:
  shop-data:
    name: shop-data
```

فرمان داخل `api` فقط برای این است که مدل بدون فایل اضافه بالا بیاید. برنامهٔ واقعی را این‌طور داخل YAML ننویسید. جایش [Dockerfile](./dockerfile.md) است. ولوم `shop-data` در این مدل به `/var/lib/shop` سوار شده تا شکل ولوم نام‌دار در `docker compose config` دیده شود. این فرایند نمونه‌روی آن مسیر نمی‌نویسد.

قبل از بالا آوردن، پیکربندی حل‌شده را ببینید. این فرمان کانتینر نمی‌سازد.

```bash
docker compose config
```

خروجی باید هر دو سرویس، شبکهٔ `shop`، ولوم `shop-data`، و شرط `service_healthy` را نشان بدهد. اگر Compose دربارهٔ کلید `version` هشدار داد، آن کلید هنوز در فایل است و باید حذف شود.

## Configuration

| کلید | تصمیم این فصل |
| --- | --- |
| `name` | اسم پروژه ثابت، مستقل از اسم پوشه |
| `restart` | `unless-stopped` |
| `depends_on` | فقط با `condition: service_healthy` وقتی ترتیب واقعی مهم است |
| `ports` | آدرس میزبان صریح، نه فقط شمارهٔ پورت |
| `volumes` | اسم بلندمدت در کلید `name` ولوم |
| `logging` | سقف `10m` و پنج فایل، هم‌سو با daemon |

`docker compose config` جایگذاری متغیر را هم انجام می‌دهد. اگر بعداً رمزی با علامت سؤال اجباری اضافه کردید و `.env` ناقص بود، همین فرمان باید با خطای متغیر خالی تمام شود. آن را دور نزنید.

تغییر فایل بعد از `up` خودش کانتینر را عوض نمی‌کند. `docker compose up -d` تفاوت را اعمال می‌کند. اگر فقط کانفیگ Nginx را عوض کرده‌اید و ایمیج همان است، `up -d` کانتینر `web` را با همان mount تازه می‌سازد. `restart` بدون ساخت دوباره، فایل mount‌شده را که از قبل داخل فرایند خوانده شده لزوماً دوباره نمی‌خواند. برای Nginx یا `nginx -s reload` داخل کانتینر، یا `up -d`.

## Production Example

```bash
cd /opt/apps/shop
docker compose config
docker compose up -d
docker compose ps
```

صبر کنید تا `api` از `health: starting` به `healthy` برسد و `web` بالا بیاید. سپس از خود `docker-1`:

```bash
curl -fsS http://10.10.1.30:8080/health
curl -fsS http://10.10.1.30:8080/
```

خروجی اول `ok` و خروجی دوم `shop` است. از پروکسی آزمایشگاه همین URL باید همان متن را بدهد، به شرطی که فایروال مسیر `10.10.1.5` به `10.10.1.30` پورت `8080` را باز گذاشته باشد.

وضعیت و لاگ:

```bash
docker compose ps
docker compose logs --tail 50 api
docker compose logs --tail 50 web
```

توقف عمدی، بدون حذف ولوم:

```bash
docker compose stop
```

بعد از این، ریستارت دیمون سرویس را بالا نمی‌آورد چون سیاست `unless-stopped` است و توقف از طرف شما بوده. برگشت:

```bash
docker compose start
```

حذف کانتینر و شبکه، با ماندن ولوم:

```bash
docker compose down
```

`down -v` را روی این پوشه نزنید مگر اینکه واقعاً بخواهید ولوم `shop-data` پاک شود. در این مدل ولوم خالی است، ولی عادت فرمان خطرناک است.

## Security Notes

پورت `8080` فقط روی `10.10.1.30` منتشر شده تا روی بقیهٔ کارت‌های میزبان شنیده نشود. Docker هنگام انتشار پورت قاعدهٔ iptables خودش را می‌نویسد و این قاعده می‌تواند UFW را دور بزند. محدود کردن آدرس bind همان دور زدن را به یک آدرس کاهش می‌دهد.

سرویس `api` پورت میزبان ندارد. از LAN مستقیم به Node نمی‌رسید. اگر کسی `-p 3000:3000` اضافه کند، این تصمیم امنیتی را بی‌اثر کرده است.

ایمیج‌ها تگ صریح دارند: `node:24-bookworm-slim` و `nginx:1.28-alpine`. `latest` نگذارید.

این فایل رمز ندارد. روزی که رمز اضافه شد، `change-me` فقط نمونه است، فایل env باید مجوز `0600` داشته باشد، و `docker compose config` نباید در تیکت عمومی چسبانده شود اگر خروجی‌اش رمز را گسترش داده باشد. خروجی config را قبل از فرستادن به کانال مشترک نگاه کنید.

گروه `docker` معادل root است. کسی که بتواند این فایل را عوض کند و `up` بزند، می‌تواند فایل میزبان را داخل کانتینر سوار کند. مجوز نوشتن `/opt/apps/shop` مال `ops` بماند.

## Troubleshooting

| نشانه | علت | کار |
| --- | --- | --- |
| هشدار `version` | کلید منسوخ هنوز هست | حذف کلید و اجرای دوبارهٔ `config` |
| `web` اصلاً ساخته نمی‌شود | `api` سالم نشده | `docker compose logs api` و `docker compose ps` |
| `curl` به `10.10.1.30:8080` رد می‌شود | این میزبان آن آدرس را ندارد | روی لپ‌تاپ موقت `127.0.0.1:8080:80` بگذارید. روی `docker-1` آدرس را برگردانید |
| `host not found` داخل لاگ Nginx | شبکه مشترک نیست یا اسم سرویس عوض شده | `docker network inspect shop` |
| پورت `80` میزبان اشغال شد | به‌جای `8080` پورت `80` نوشته شده | فایل را به `8080` برگردانید و `ss -ltnp` را ببینید |
| ولوم قدیمی پیدا نمی‌شود | اسم پروژه یا اسم ولوم عوض شده | `docker volume ls` و تطبیق با `name` |
| `wget` در healthcheck پیدا نمی‌شود | ایمیج وب ابزار را ندارد | `docker exec` روی `web` وجود `wget` را نشان می‌دهد. `nginx:1.28-alpine` ابزار busybox را دارد |
| تغییر `nginx.conf` اثر نکرد | فرایند هنوز کانفیگ قدیم را دارد | `docker compose exec web nginx -s reload` |

اگر `docker compose` خودش پیدا نمی‌شود، پلاگین نصب نشده و نباید سراغ باینری خط‌تیره‌دار بروید. [نصب](./installation.md) را ببینید.

## Best Practices

- کلید `version` را ننویسید.
- هر پروژه `name` صریح داشته باشد.
- هر ولوم ماندگار `name` صریح داشته باشد.
- شبکهٔ پیش‌فرض بی‌نام را برای سرویس چندبخشی رها نکنید.
- `depends_on` را با `condition: service_healthy` بنویسید و برای همان سرویس healthcheck تعریف کنید.
- `restart` را `unless-stopped` بگذارید، نه `always`، مگر دلیل جدا داشته باشید که توقف عمدی هم باید برگردد.
- پورت میزبان را با آدرس بنویسید. وب این آزمایشگاه `8080` است تا با `80` میزبان تصادم نکند.
- قبل از `up` همیشه `docker compose config`.
- `down -v` را در اسکریپت استقرار نگذارید.
- منطق برنامه را در `command` طولانی پنهان نکنید. مدل این صفحه استثناست تا بدون فایل جانبی قابل اجرا باشد.
