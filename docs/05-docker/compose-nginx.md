---
sidebar_position: 7
title: نمونهٔ Nginx
description: Nginx 1.28 در Compose برای فایل ایستا، با پورت میزبان 8080 و کانفیگ سوارشده.
---

# نمونهٔ Nginx

## مقدمه

این صفحه یک Nginx تنها را روی `docker-1.example.internal` بالا می‌آورد. ایمیج `nginx:1.28-alpine` است، هم‌خانواده با Nginx 1.28 بسته‌های Ubuntu، ولی فضای کاربر داخل کانتینر Alpine است نه خود میزبان. پورت منتشرشده `8080` است تا با سرویسی که روی میزبان پورت `80` را گرفته تصادم نکند. کانفیگ از پوشهٔ پروژه سوار می‌شود تا برای عوض کردن یک `server` مجبور به بیلد ایمیج نباشید.

اگر جلوی این Nginx باید به یک API پروکسی شود، مدل دو سرویسی در [مدل Compose](./compose.md) است. اینجا خود Nginx محتوا را از دیسک سرو می‌کند و آزمون `curl` به فایل ایستا و به مسیر سلامت است.

## مفهوم اصلی

ایمیج رسمی با یک `default.conf` بالا می‌آید که صفحهٔ خوش‌آمد را نشان می‌دهد. ما آن فایل را با mount فقط-خواندنی عوض می‌کنیم: مسیر میزبان `./nginx.conf` روی `/etc/nginx/conf.d/default.conf` داخل کانتینر. فایل‌های HTML جدا سوار می‌شوند روی `/usr/share/nginx/html`. با این کار محتوا و کانفیگ هر دو مال پوشهٔ `/opt/apps/edge` می‌مانند و با عوض شدن تگ ایمیج پاک نمی‌شوند.

پورت سمت کانتینر `80` است چون خود Nginx داخل ایمیج به‌عنوان root شروع می‌شود و به پورت پایین گوش می‌دهد، بعد workerها را کم‌اختیار می‌کند. این رفتار ایمیج رسمی است. پورت سمت میزبان `8080` است. این دو عدد یکی نیستند. `10.10.1.30:8080:80` یعنی روی کارت آزمایشگاه و پورت `8080` گوش بده و به پورت `80` کانتینر وصل کن.

`restart: unless-stopped` همان سیاست بقیهٔ فصل است. healthcheck با `wget` خود ایمیج Alpine به `http://127.0.0.1/health` می‌زند. این مسیر را خود کانفیگ جواب می‌دهد تا سلامت Nginx به یک فایل HTML وابسته نباشد.

## چرا استفاده می‌شود؟

نصب `nginx` از APT روی میزبان وقتی درست است که همان میزبان چند سایت و گواهی را با بستهٔ Ubuntu اداره می‌کند. کانتینر وقتی درست است که این سایت باید با بقیهٔ سرویس‌های Docker جابه‌جا شود و نباید فایل `/etc/nginx` میزبان را شلوغ کند. پورت `8080` اجازه می‌دهد هر دو همزمان باشند: Nginx میزبان روی `80` و `443`، و این کانتینر پشت آن یا مستقیم روی `8080`.

سوار کردن کانفیگ به‌جای `COPY` داخل ایمیج یعنی اصلاح یک هدر یا یک `root` نیاز به `docker build` ندارد. عیبش این است که کانفیگ غلط Nginx را در حلقهٔ restart می‌اندازد. قبل از `up` کانفیگ را با یک اجرای کوتاه `nginx -t` امتحان می‌کنیم.

## Architecture

```text
proxy.example.internal  10.10.1.5
        │
        │   http://10.10.1.30:8080
        ▼
docker-1  10.10.1.30:8080
        │
        ▼
کانتینر edge-web
  nginx:1.28-alpine
  شنود :80
  کانفیگ  /opt/apps/edge/nginx.conf
  محتوا   /opt/apps/edge/html
```

شبکهٔ `edge` برای این تک‌سرویس هم تعریف شده تا بعداً یک سرویس دیگر را با اسم به آن اضافه کنید و مجبور نشوید به بریج پیش‌فرض برگردید. فعلاً فقط `web` عضو آن است.

## Installation

```bash
sudo install -d -o ops -g ops -m 0755 /opt/apps/edge /opt/apps/edge/html
cd /opt/apps/edge
```

صفحهٔ ایستا:

```text
<!DOCTYPE html>
<html lang="fa" dir="rtl">
<head>
  <meta charset="utf-8">
  <title>edge</title>
</head>
<body>
  <p>edge ok</p>
</body>
</html>
```

این فایل را در `/opt/apps/edge/html/index.html` بگذارید.

کانفیگ:

```text
server {
    listen 80;
    server_name app.example.com;
    root /usr/share/nginx/html;
    index index.html;

    location = /health {
        access_log off;
        default_type text/plain;
        return 200 'ok\n';
    }

    location / {
        try_files $uri $uri/ =404;
    }
}
```

این فایل `/opt/apps/edge/nginx.conf` است. `server_name` نمونهٔ عمومی `app.example.com` است. داخل آزمایشگاه اگر فقط با IP وارد می‌شوید، Nginx اولین `server` روی آن پورت را انتخاب می‌کند و همین بلوک جواب می‌دهد.

`compose.yaml`:

```yaml
name: edge

services:
  web:
    image: nginx:1.28-alpine
    restart: unless-stopped
    ports:
      - "10.10.1.30:8080:80"
    volumes:
      - ./nginx.conf:/etc/nginx/conf.d/default.conf:ro
      - ./html:/usr/share/nginx/html:ro
    networks:
      - edge
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
  edge:
    name: edge
    driver: bridge
```

کلید `version` نیست. قبل از هر چیز:

```bash
docker compose config
docker run --rm -t \
  -v /opt/apps/edge/nginx.conf:/etc/nginx/conf.d/default.conf:ro \
  nginx:1.28-alpine nginx -t
```

خط `syntax is ok` و `test is successful` یعنی کانفیگ با همین ایمیج خوانده می‌شود. اگر این آزمون شکست بخورد، `up -d` فقط کانتینر را در حلقهٔ خروج می‌اندازد.

## Configuration

مسیرها نسبت به `/opt/apps/edge` هستند. mount با `:ro` یعنی فرایند داخل کانتینر کانفیگ و HTML را عوض نمی‌کند. اصلاح را روی میزبان انجام می‌دهید.

اگر به‌جای فایل ایستا باید به یک سرویس داخل همان شبکه پروکسی شود، بلوک `location` را عوض کنید و آن سرویس را به شبکهٔ `edge` اضافه کنید. شکل پروکسی:

```text
location /api/ {
    proxy_pass http://api:3000/;
    proxy_set_header Host $host;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
}
```

این بلوک را وقتی اضافه کنید که سرویس `api` واقعاً در همان شبکه باشد. تنها گذاشتنش در فایل، healthcheck مسیر `/health` را خراب نمی‌کند چون آن `location` جداست، ولی درخواست `/api/` خطای میزبان می‌دهد.

پورت را به `80:80` برنگردانید. روی `docker-1` پورت `80` برای Nginx میزبان یا برای جلوگیری از تصادم رزرو ذهنی تیم است. اگر این کانتینر پورت `80` را بگیرد، سرویس میزبان بالا نمی‌آید یا برعکس.

بعد از تغییر `nginx.conf`:

```bash
docker compose exec web nginx -t && docker compose exec web nginx -s reload
```

اگر کانتینر به‌خاطر کانفیگ غلط اصلاً بالا نیست، `reload` ممکن نیست. فایل را درست کنید و `docker compose up -d` بزنید.

## Production Example

```bash
cd /opt/apps/edge
docker compose up -d
docker compose ps
curl -fsS http://10.10.1.30:8080/health
curl -fsS http://10.10.1.30:8080/
```

خروجی سلامت `ok` است. خروجی صفحه شامل `edge ok` است. `docker compose ps` باید `healthy` نشان بدهد.

از یک میزبان دیگر در آزمایشگاه:

```bash
curl -fsS http://10.10.1.30:8080/health
```

اگر فقط از خود `docker-1` جواب می‌دهد و از `10.10.1.5` نه، مشکل bind نیست. مسیر شبکه یا فایروال است. `ss` روی `docker-1` باید شنونده را روی `10.10.1.30:8080` نشان بدهد.

```bash
ss -ltnp | grep 8080
docker compose logs --tail 20 web
```

توقف و برگشت:

```bash
docker compose stop
docker compose start
```

حذف کانتینر. این سرویس ولوم نام‌دار ندارد. محتوا روی دیسک میزبان در `/opt/apps/edge/html` می‌ماند.

```bash
docker compose down
```

## Security Notes

انتشار روی `10.10.1.30` به‌جای همهٔ رابط‌ها عمدی است. `0.0.0.0:8080` هر کارت میزبان را باز می‌کند و قاعدهٔ iptables Docker می‌تواند UFW را دور بزند. اگر سایت فقط باید از Nginx میزبان روی همان ماشین دیده شود، انتشار را به `127.0.0.1:8080:80` تغییر دهید و از LAN دیگر به آن نرسید. در آزمایشگاه، پروکسی جداست، پس آدرس کارت `10.10.1.30` درست است.

کانفیگ و HTML فقط-خواندنی سوار شده‌اند. یک آسیب در ماژول Nginx نباید بتواند صفحه را روی دیسک میزبان عوض کند. این جایگزین به‌روزرسانی ایمیج نیست. تگ را روی `1.28-alpine` نگه دارید و موقع اصلاح امنیتی، تگ patch مشخص همان خط را بعد از خواندن یادداشت انتشار جایگزین کنید. به `latest` نروید.

فایل کانفیگ را از مسیر غیرقابل اعتماد سوار نکنید. هر کسی که بتواند `nginx.conf` را بنویسد می‌تواند `root` را به مسیر دیگری از میزبان اشاره دهد، ولی فقط به مسیرهایی که جداگانه mount شده‌اند یا داخل ایمیج هستند. کل دیسک میزبان را زیر `/` داخل این کانتینر سوار نکنید.

این صفحه رمز ندارد. گواهی TLS را این کانتینر صادر نمی‌کند. در آزمایشگاه TLS را پروکسی `10.10.1.5` تمام می‌کند و تا `8080` می‌تواند HTTP داخلی بماند. آن تصمیم را با باز کردن `443` داخل همین کانتینر عوض نکنید مگر گواهی و کلید با مجوز محدود کنار سرویس آمده باشند.

## Troubleshooting

| نشانه | علت | کار |
| --- | --- | --- |
| `port is already allocated` | `8080` یا `80` اشغال است | `ss -ltnp` و `docker ps`. پورت میزبان باید `8080` بماند |
| `bind: cannot assign requested address` | میزبان آدرس `10.10.1.30` را ندارد | این فایل مال `docker-1` است. جای دیگر موقت از `127.0.0.1` استفاده کنید |
| کانتینر `Restarting` است | `nginx -t` شکست می‌خورد | همان `docker run` آزمون نصب را تکرار کنید و لاگ را بخوانید |
| `curl` کد 404 روی `/` | `index.html` نیست یا مسیر mount غلط است | `docker compose exec web ls -l /usr/share/nginx/html` |
| `/health` کد 404 | `location` در فایلی است که سوار نشده | `docker compose exec web nginx -T` کانفیگ مؤثر را نشان می‌دهد |
| وضعیت `unhealthy` و صفحه از بیرون باز است | `wget` به `127.0.0.1` داخل کانتینر نمی‌رسد | `docker compose exec web wget -S -O - http://127.0.0.1/health` |
| تغییر فایل دیده نمی‌شود | کش مرورگر یا Nginx reload نشده | `reload` را بزنید و با `curl` نه با مرورگر تست کنید |
| صفحهٔ پیش‌فرض Nginx را می‌بینید | mount روی `default.conf` انجام نشده | `docker inspect` بخش Mounts را ببینید |

لاگ دسترسی و خطا:

```bash
docker compose logs --tail 100 web
```

اگر لاگ خالی است و درخواست‌ها جواب می‌گیرند، شاید `access_log off` فقط مال `/health` است و مسیر `/` باید خط بسازد. یک `curl` به `/` بزنید و دوباره logs را ببینید.

## Best Practices

- پورت میزبان `8080` بماند. پورت `80` کانتینر را با پورت `80` میزبان یکی نکنید.
- کانفیگ و محتوا را mount کنید و در ایمیج کپی نکنید، مگر محتوا خودش محصول بیلد باشد.
- هر دو mount برای این صفحه `:ro` باشند.
- قبل از `up` یک بار `nginx -t` با همان ایمیج.
- تگ `nginx:1.28-alpine` بماند. `latest` ممنوع است.
- healthcheck به مسیر `/health` خود کانفیگ باشد، نه فقط به باز بودن پورت.
- شبکهٔ نام‌دار `edge` را حتی برای تک‌سرویس نگه دارید.
- `docker compose config` را بعد از هر ویرایش فایل Compose بزنید.
- TLS عمومی را به این کانتینر منتقل نکنید تا وقتی پروکسی آزمایشگاه همان نقش را دارد.
- HTML نمونه را با دادهٔ واقعی کاربران عوض نکنید بدون اینکه فکر کنید چه کسی به پورت `8080` دسترسی دارد.
