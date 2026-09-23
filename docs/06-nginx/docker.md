---
title: Nginx جلوی کانتینر
sidebar_position: 11
description: "Nginx تنها منتشرکنندهٔ پورت ۸۰ و ۴۴۳ جلوی برنامهٔ کانتینری، با کانفیگ کامل و compose کوتاه."
---

# Nginx جلوی کانتینر

## مقدمه

این صفحه لبه را داخل compose می‌گذارد، روی یک میزبان. میزبان آزمایشگاه `docker-1.example.internal` با نشانی `10.10.1.30` است، نه پروکسی `10.10.1.5`. وقتی برنامه به‌جای systemd داخل کانتینر است، نام `app.example.com` به همین میزبان می‌رسد و فقط کانتینر Nginx پورت ۸۰ و ۴۴۳ را روی میزبان منتشر می‌کند. برنامه و دیتابیس پورت عمومی ندارند.

ساخت ایمیج، شبکه و دستورهای روزمرهٔ Docker در [فصل Docker](/docs/05-docker) است. مدل compose در [compose](/docs/05-docker/compose) و نمونهٔ کلی Nginx در [compose-nginx](/docs/05-docker/compose-nginx) است. کانفیگ همین سایت را آنجا تکرار نمی‌کنیم؛ فایل کامل اینجاست. معماری تولید، تگ گیت و برگشت به تگ قبلی در [استقرار Docker](/docs/08-deployment/docker-production) است.

ایمیج Nginx در این صفحه `nginx:1.28` است تا شاخه با بستهٔ Ubuntu یکی باشد. ایمیج برنامه تگ شناور ندارد. کاربر داخل ایمیج رسمی `nginx` است، نه `www-data`. خط `user www-data` را از کانفیگ میزبان به این فایل کپی نکنید.

## مفهوم اصلی

فایل کانفیگ این صفحه جایگزین `/etc/nginx/nginx.conf` داخل کانتینر می‌شود و پوشهٔ `conf.d` ایمیج را include نمی‌کند. اگر include بماند، `default.conf` ایمیج هم به پورت ۸۰ گوش می‌دهد و یا `duplicate default server` می‌گیرید یا صفحهٔ خوش‌آمد کانتینر به‌جای برنامه جواب می‌دهد.

برنامه در شبکهٔ compose نام `app` دارد و به پورت ۳۰۰۰ گوش می‌دهد. نشانی کانتینر با هر بالا آمدن عوض می‌شود. `proxy_pass` به نام ثابت، فقط یک بار هنگام شروع Nginx حل می‌شود و بعد از بازساختن کانتینر برنامه، لبه به IP مرده می‌رود. برای همین نشانی را در متغیر می‌گذاریم و `resolver 127.0.0.11` را که DNS داخلی Docker است با اعتبار ده ثانیه می‌گذاریم. متغیر در `proxy_pass` یعنی URI کامل کاربر عبور می‌کند؛ مسیر اضافه به `proxy_pass` نچسبانید.

دیتابیس در همین شبکه هست تا برنامه به نام `db` وصل شود، و در فایل Nginx اصلاً ظاهر نمی‌شود. اگر برای Nginx یک `proxy_pass` به پورت ۳۳۰۶ ساختید، دارید دیتابیس را به وب وصل می‌کنید. این صفحه آن را ندارد.

## چرا استفاده می‌شود؟

کانتینر برنامه نباید `ports: "3000:3000"` داشته باشد. آن خط، حلقهٔ `127.0.0.1` داخل کانتینر را به رابط میزبان می‌دوزد و فایروال را تنها سد می‌کند. با انتشار فقط از Nginx، همان قرارداد فصل حفظ می‌شود: کاربر فقط ۸۰ و ۴۴۳ را می‌بیند.

جدا کردن فایل Nginx از فصل Docker عمدی است. کسی که لبه را درست می‌کند نباید بین Dockerfile و کش لایه دنبال `proxy_set_header` بگردد، و کسی که ایمیج می‌سازد نباید گواهی را داخل لایهٔ ایمیج کپی کند. گواهی از میزبان به مسیر `/etc/nginx/certs` فقط‌خواندنی سوار می‌شود.

## Architecture

```text
میزبان 10.10.1.30
  پورت 80 و 443 روی میزبان
        │
        ▼
  کانتینر nginx:1.28
        │  شبکهٔ appnet
        ▼
  کانتینر app: تگ گیت، پورت 3000 بدون انتشار
        │
        ▼
  کانتینر mysql:8.4  بدون پورت میزبان
```

compose کوتاه پایین فقط جای سرویس و پورت را نشان می‌دهد. توضیح تگ، برگشت، و اینکه دیتابیس پورت ندارد را صفحهٔ استقرار کامل می‌کند. هر دو فایل باید یک مسیر داشته باشند: `/opt/apps/web`.

## Installation

Docker Engine و پلاگین `docker compose` طبق فصل Docker روی `10.10.1.30` نصب‌اند. اینجا موتور را دوباره نصب نمی‌کنیم. درخت کار:

```bash
sudo mkdir -p /opt/apps/web/nginx /opt/apps/web/certs
sudo chown -R deploy:deploy /opt/apps/web
```

گواهی را در `/opt/apps/web/certs/fullchain.pem` و `privkey.pem` بگذارید. این فایل‌ها را داخل ایمیج `COPY` نکنید. صدورشان کار فصل شبکه است. تا وقتی فایل نیست، کانتینر Nginx با شکست `nginx -t` بالا نمی‌آید چون مسیر گواهی در کانفیگ هست.

## Configuration

فایل `/opt/apps/web/nginx/nginx.conf` کانفیگ کامل است. آن را به‌صورت تکهٔ داخل `conf.d` سوار نکنید؛ `events` و `http` دارد و زمینهٔ `conf.d` از قبل داخل `http` است.

```nginx
user nginx;
worker_processes auto;
error_log /var/log/nginx/error.log warn;
pid /run/nginx.pid;

events {
    worker_connections 1024;
}

http {
    include /etc/nginx/mime.types;
    default_type application/octet-stream;
    server_tokens off;
    sendfile on;
    keepalive_timeout 65;

    gzip on;
    gzip_vary on;
    gzip_proxied any;
    gzip_comp_level 5;
    gzip_min_length 256;
    gzip_types text/plain text/css application/javascript application/json image/svg+xml application/xml;

    map $http_upgrade $connection_upgrade {
        default upgrade;
        ""      close;
    }

    resolver 127.0.0.11 valid=10s ipv6=off;

    server {
        listen 80 default_server;
        listen [::]:80 default_server;
        server_name _;
        return 444;
        access_log off;
    }

    server {
        listen 80;
        listen [::]:80;
        server_name app.example.com;
        return 301 https://$host$request_uri;
    }

    server {
        listen 443 ssl;
        listen [::]:443 ssl;
        http2 on;
        server_name app.example.com;

        ssl_certificate     /etc/nginx/certs/fullchain.pem;
        ssl_certificate_key /etc/nginx/certs/privkey.pem;
        ssl_protocols       TLSv1.2 TLSv1.3;

        add_header Strict-Transport-Security "max-age=15552000" always;
        add_header X-Content-Type-Options nosniff always;
        add_header X-Frame-Options SAMEORIGIN always;
        add_header Referrer-Policy strict-origin-when-cross-origin always;

        access_log /var/log/nginx/app.example.com.access.log;
        error_log  /var/log/nginx/app.example.com.error.log warn;
        client_max_body_size 20m;

        location / {
            set $app_upstream app:3000;
            proxy_pass http://$app_upstream;
            proxy_http_version 1.1;
            proxy_set_header Host $host;
            proxy_set_header X-Real-IP $remote_addr;
            proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
            proxy_set_header X-Forwarded-Proto $scheme;
            proxy_set_header Upgrade $http_upgrade;
            proxy_set_header Connection $connection_upgrade;
            proxy_connect_timeout 5s;
            proxy_send_timeout 60s;
            proxy_read_timeout 60s;
            proxy_buffering on;
            proxy_buffer_size 16k;
            proxy_buffers 8 16k;
            proxy_busy_buffers_size 32k;
        }
    }
}
```

دستور ایمیج رسمی `nginx -g "daemon off;"` است. آن را در compose عوض نکنید وگرنه فرایند پس‌زمینه می‌شود و کانتینر خارج می‌شود در حالی که Nginx روی میزبان یتیم مانده یا اصلاً نمانده.

compose کوتاه `/opt/apps/web/compose.yml`. کلید `version` در Compose v2 لازم نیست و اینجا نیست. ایمیج `app` یک تگ گیت است؛ مقدار `1.8.0` نمونهٔ تگ مخزن برنامه است نه نسخهٔ Nginx.

```yaml
services:
  nginx:
    image: nginx:1.28
    restart: unless-stopped
    security_opt:
      - no-new-privileges:true
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - ./nginx/nginx.conf:/etc/nginx/nginx.conf:ro
      - ./certs:/etc/nginx/certs:ro
    depends_on:
      - app
    networks:
      - appnet

  app:
    image: mirror.example.internal/team/app:1.8.0
    restart: unless-stopped
    security_opt:
      - no-new-privileges:true
    environment:
      PORT: "3000"
    networks:
      - appnet

  db:
    image: mysql:8.4
    restart: unless-stopped
    security_opt:
      - no-new-privileges:true
    env_file:
      - ./db.env
    volumes:
      - dbdata:/var/lib/mysql
    networks:
      - appnet

networks:
  appnet:
    name: appnet

volumes:
  dbdata:
```

سرویس `db` و `app` کلید `ports` ندارند. `depends_on` فقط ترتیب شروع است و منتظر آماده شدن MySQL نمی‌ماند. رمز دیتابیس در `db.env` با حالت `0600` است و در این فایل yaml تکرار نمی‌شود. نمونهٔ مقدار و برگشت تگ در صفحهٔ استقرار است.

## Production Example

روی `10.10.1.30`:

```bash
cd /opt/apps/web
docker compose up -d
docker compose ps --format '{{.Service}} {{.Ports}}'
curl -fsS -D- -o /dev/null https://app.example.com/
```

ستون پورت باید برای `nginx` نگاشت ۸۰ و ۴۴۳ را نشان بدهد و برای `app` و `db` خالی باشد. از خود میزبان:

```bash
sudo ss -lptn 'sport = :80'
sudo ss -lptn 'sport = :3306'
sudo ss -lptn 'sport = :3000'
```

۸۰ باید شنونده داشته باشد. ۳۳۰۰ و ۳۰۰۰ نباید روی `0.0.0.0` باشند. اگر بودند، یک کلید `ports` اضافه در compose مانده است.

لاگ لبه:

```bash
docker compose logs --tail=50 nginx
```

بعد از بازساختن کانتینر `app`، درخواست بعدی باید بدون reload دستی Nginx به IP تازه برسد. اگر ۵۰۲ ماند تا وقتی کانتینر Nginx را هم از نو بسازید، متغیر `proxy_pass` یا `resolver` جا مانده و Nginx هنوز نشانی قدیمی را دارد.

## Security Notes

گواهی و کلید خصوصی فقط در `/opt/apps/web/certs` روی میزبان‌اند و سوارشدن‌شان `:ro` است. آن‌ها را در لایهٔ ایمیج نگذارید و به رجیستری نفرستید. حالت فایل کلید `640` یا سخت‌تر، مالک `deploy`، و گروه فقط اگر فرایند میزبان باید بخواند. داخل کانتینر کاربر `nginx` باید بتواند کلید را بخواند؛ اگر سوار کردن با کاربر ریشه است و حالت `600` مالک ریشه است، worker گواهی را باز نمی‌کند و سایت ۴۴۳ بالا نمی‌آید. در آن حالت گروه را طوری بگذارید که کانتینر بخواند، نه اینکه کلید را `644` کنید.

HSTS فقط در سرور ۴۴۳ است. پورت ۸۰ فقط ریدایرکت یا `444` است.

شبکهٔ `appnet` جای فایروال میزبان را نمی‌گیرد. روی `10.10.1.30` ورودی باید ۲۲ و ۸۰ و ۴۴۳ باشد. پل Docker از خود میزبان هنوز ممکن است به پورت کانتینر برسد؛ این با منتشر کردن پورت روی همهٔ رابط‌ها یکی نیست، ولی دلیلی برای `docker exec` بی‌حساب به دیتابیس هم نیست.

`server_tokens off` داخل همین فایل است. نسخهٔ ایمیج `nginx:1.28` را با به‌روزرسانی خود ایمیج جلو می‌برید، جدا از `apt` میزبان.

## Troubleshooting

کانتینر Nginx بلافاصله خارج می‌شود:

```bash
docker compose logs nginx
```

اگر متن `host not found in upstream "app"` است، `proxy_pass` را بدون متغیر نوشته‌اید و موقع شروع، نام `app` هنوز نبوده. شکل متغیر و `resolver` این صفحه را برگردانید. اگر متن دربارهٔ باز نشدن گواهی است، مسیر سوار شدن `./certs` غلط است یا فایل اسم دیگری دارد.

`duplicate listen` یا صفحهٔ پیش‌فرض ایمیج: دارید هم `nginx.conf` کامل را سوار می‌کنید هم `conf.d` ایمیج را include کرده‌اید. include آن پوشه نباید در فایل این صفحه باشد.

۵۰۲ درست بعد از `up` اغلب یعنی برنامه هنوز به ۳۰۰۰ گوش نداده. چند ثانیه بعد دوباره `curl` بزنید. اگر ماند، `docker compose logs app` را ببینید. Nginx را برای این موضوع تکثیر نکنید.

اگر `curl` به IP میزبان صفحهٔ پیش‌فرض Nginx را نشان می‌دهد، درخواست به بلوک `server_name _` نرفته و هنوز کانفیگ ایمیج فعال است. `docker compose exec nginx nginx -T` را برای `app.example.com` بگردید.

پورت ۳۳۰۶ روی میزبان: compose را اصلاح کنید، `docker compose up -d` بزنید، و دوباره `ss` بگیرید. حذف کلید `ports` تا بالا آمدن دوبارهٔ همان سرویس اثر کامل را نشان می‌دهد.

## Best Practices

- فقط Nginx پورت منتشر کند. `app` و `db` در شبکهٔ `appnet` بمانند.
- فایل این صفحه را کامل به‌جای `nginx.conf` کانتینر سوار کنید، نه به‌صورت تکهٔ اضافه کنار پیش‌فرض ایمیج.
- نام `app` را با `resolver 127.0.0.11` و متغیر در `proxy_pass` حل کنید.
- تگ برنامه را latest نگذارید. برگشت به تگ قبلی در [استقرار Docker](/docs/08-deployment/docker-production) است.
- گواهی روی میزبان بماند و فقط‌خواندنی سوار شود.
- دستور `docker compose` را با خط تیرهٔ `docker-compose` عوض نکنید؛ آن باینری پایتونی در این دانشنامه نیست.
