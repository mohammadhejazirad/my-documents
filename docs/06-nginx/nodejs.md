---
title: پروکسی Node.js
sidebar_position: 8
description: "کانفیگ کامل Nginx جلوی Node روی 127.0.0.1:3000 برای app.example.com در آزمایشگاه."
---

# پروکسی Node.js

## مقدمه

برنامهٔ Node روی `app-1.example.internal` یعنی `10.10.1.10` اجرا می‌شود و فقط به `127.0.0.1:3000` گوش می‌دهد. Nginx همان میزبان این حلقه را به شبکه نشان می‌دهد، آن هم نه روی همهٔ رابط‌ها: فقط `10.10.1.10:8080`. لبهٔ `10.10.1.5` نام `app.example.com` و TLS را تمام می‌کند و به همین پورت ۸۰۸۰ وصل می‌شود. هدر و WebSocket لبه در [پروکسی معکوس](/docs/06-nginx/reverse-proxy) است. این صفحه کانفیگ کامل میزبان برنامه است.

زنده نگه داشتن فرایند Node کار Nginx نیست. آن کار با systemd یا PM2 در [فصل استقرار](/docs/08-deployment/nodejs-pm2-systemd) است و نباید هر دو ناظر با هم روی پورت ۳۰۰۰ باشند. اگر این صفحه را می‌نویسید و هنوز فرایندی روی ۳۰۰۰ نیست، `curl` به Nginx خطای ۵۰۲ می‌دهد و این علامت کانفیگ غلط نیست.

## مفهوم اصلی

یک `server` با `server_name app.example.com` کافی است. `proxy_pass http://127.0.0.1:3000` بدون مسیر اضافه، URI را دست نمی‌زند. چون اتصال داخلی HTTP است، `$scheme` اینجا `http` است. اگر همین را به Node بفرستید، برنامه لینک و کوکی امن را با طرح غلط می‌سازد. طرح درست را لبه در `X-Forwarded-Proto` گذاشته است. یک `map` اگر هدر خالی بود به `$scheme` برمی‌گردد، تا وقتی کسی روی خود میزبان بدون لبه آزمون می‌کند، مقدار خالی به برنامه نرسد.

مسیر `/socket/` ارتقای WebSocket را با تایم‌اوت بلند می‌فرستد و بافر را خاموش می‌کند. بقیهٔ مسیرها بافر را روشن نگه می‌دارند، `Connection` را خالی می‌کنند و به استخر `keepalive` بالادست وصل می‌شوند. این دو قرارداد در یک location جمع نمی‌شوند.

بدنه تا ۲۰ مگابایت پذیرفته می‌شود تا با حد معمول آپلود این برنامه یکی باشد. بزرگ‌تر از آن ۴۱۳ است و باید در برنامه هم همان سقف باشد.

## چرا استفاده می‌شود؟

اگر Node را به `0.0.0.0:3000` بچسبانید، هر کسی که به میزبان راه شبکه داشته باشد فایروال را دور می‌زند، به شرطی که قانون صریحی نباشد. حتی با فایروال، خود برنامه باید TLS و هدر و صفحهٔ خطای یکدست را بلد باشد. Nginx این‌ها را بلد است و reload می‌شود بدون اینکه فرایند Node را بکشید.

گوش دادن Node به `127.0.0.1` یعنی حتی یک قانون فایروال فراموش‌شده هم پورت ۳۰۰۰ را به شبکه نمی‌دهد. تنها راه رسیدن به برنامه، Nginx محلی است و تنها راه رسیدن به آن Nginx از شبکه، نشانی `10.10.1.10` و مبدأ `10.10.1.5` است.

## Architecture

```text
app.example.com
        │
        ▼
10.10.1.5   TLS، هدر X-Forwarded-Proto
        │
        ▼
10.10.1.10:8080    این صفحه
        │
        ├─ /socket/   Upgrade، بدون بافر، تایم‌اوت ۳۶۰۰
        └─ /          بافر روشن، keepalive
                │
                ▼
        127.0.0.1:3000   Node، کاربر deploy
```

اگر یک روز لبه و برنامه روی یک میزبان جمع شوند، همین فایل را نگه دارید و `listen` را به `443 ssl` با گواهی عوض کنید و `map` طرح را می‌توانید بردارید چون `$scheme` خودش `https` است. تا آن روز فایل را با گواهی لبه قاطی نکنید. این میزبان گواهی عمومی ندارد.

## Installation

بستهٔ Nginx باید روی `10.10.1.10` نصب باشد. خود Node و واحد سرویس در فصل استقرار است. قبل از reload فقط مطمئن شوید پورت برنامه مال کیست:

```bash
sudo ss -lptn 'sport = :3000'
sudo ss -lnt 'sport = :8080' || true
```

خروجی سالم پورت ۳۰۰۰ یک خط `127.0.0.1:3000` با فرایند `node` است. اگر `0.0.0.0:3000` دیدید، برنامه به همهٔ رابط‌ها چسبیده و باید در واحد سرویس `HOST=127.0.0.1` شود. اگر هیچ خطی نبود، Nginx را هنوز می‌توانید بارگذاری کنید ولی تا بالا آمدن Node پاسخ ۵۰۲ است.

فایروال میزبان برنامه، بعد از اینکه کانفیگ گوش دادن را محدود کرد:

```bash
sudo ufw default deny incoming
sudo ufw allow OpenSSH
sudo ufw allow from 10.10.1.5 to any port 8080 proto tcp
sudo ufw status
```

`ufw` اگر از قبل سیاست دیگری داشته، این سه خط را بی‌ملاحظه روی میزبان شلوغ نزنید. اصل این است که ۸۰۸۰ فقط از پروکسی باز باشد و ۳۰۰۰ قانونی لازم ندارد چون روی رابط خارجی گوش نمی‌دهد.

## Configuration

`/etc/nginx/sites-available/app.conf` روی `10.10.1.10`. دو `map` بالای فایل‌اند چون فایل از زمینهٔ http خوانده می‌شود. همان متغیر را در `conf.d` هم تعریف نکنید؛ تعریف دوباره، `nginx -t` را رد می‌کند. این سرور کامل همین نقش است:

```nginx
map $http_upgrade $connection_upgrade {
    default upgrade;
    ""      close;
}

map $http_x_forwarded_proto $forwarded_proto {
    default $http_x_forwarded_proto;
    ""      $scheme;
}

upstream node_local {
    server 127.0.0.1:3000;
    keepalive 8;
}

server {
    listen 10.10.1.10:8080;
    server_name app.example.com;

    access_log /var/log/nginx/app.example.com.access.log;
    error_log  /var/log/nginx/app.example.com.error.log warn;
    client_max_body_size 20m;

    add_header X-Content-Type-Options nosniff always;
    add_header X-Frame-Options SAMEORIGIN always;
    add_header Referrer-Policy strict-origin-when-cross-origin always;

    location /socket/ {
        proxy_pass http://node_local;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $forwarded_proto;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection $connection_upgrade;
        proxy_buffering off;
        proxy_read_timeout 3600s;
        proxy_send_timeout 3600s;
    }

    location / {
        proxy_pass http://node_local;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $forwarded_proto;
        proxy_set_header Connection "";
        proxy_connect_timeout 2s;
        proxy_send_timeout 60s;
        proxy_read_timeout 60s;
        proxy_buffering on;
        proxy_buffer_size 16k;
        proxy_buffers 8 16k;
        proxy_busy_buffers_size 32k;
    }
}
```

`listen 10.10.1.10:8080` عمداً `default_server` نیست و روی `0.0.0.0` هم نیست. درخواستی که به `127.0.0.1:8080` بیاید به این بلوک نمی‌رسد. آزمون را با نشانی خصوصی بزنید. HSTS اینجا نیست چون این اتصال TLS نیست؛ HSTS فقط روی لبه و فقط روی ۴۴۳ است، طبق [امنیت و نرخ](/docs/06-nginx/security-rate-limit).

هدر امنیتی این میزبان برای کسی است که از شبکهٔ داخلی مستقیم به ۸۰۸۰ می‌رسد. لبه هدر خودش را هم می‌گذارد. تکرارشان بی‌ضرر است. اگر location تازه‌ای `add_header` گرفت، این سه تا را آنجا تکرار کنید وگرنه روی آن مسیر حذف می‌شوند.

## Production Example

```bash
sudo ln -sfn /etc/nginx/sites-available/app.conf /etc/nginx/sites-enabled/app.conf
sudo rm -f /etc/nginx/sites-enabled/default
sudo nginx -t && sudo systemctl reload nginx
curl -fsS -D- -H "Host: app.example.com" -H "X-Forwarded-Proto: https" http://10.10.1.10:8080/
```

از خود `10.10.1.10` این `curl` باید بدنهٔ برنامه را بدهد، نه ۵۰۲. سپس از لبه، بعد از اینکه [پروکسی معکوس](/docs/06-nginx/reverse-proxy) به `10.10.1.10:8080` اشاره می‌کند:

```bash
curl -fsS -D- https://app.example.com/
```

اگر برنامه در پاسخ یک نشانی مطلق ساخت، طرح آن باید `https` باشد. اگر `http://10.10.1.10` بود، `Host` یا طرح به Node نرسیده است. در لاگ دسترسی برنامه، اگر نشانی کاربر را لاگ می‌کند، باید غیر از `127.0.0.1` هم بتواند مقدار `X-Real-IP` را بخواند. خود اتصال TCP از دید Node همیشه `127.0.0.1` است و این درست است.

یک بار هم ثابت کنید پورت برنامه از پروکسی مستقیم باز نیست:

```bash
curl -m 3 -s -o /dev/null -w "%{http_code}\n" http://10.10.1.10:3000/ || true
```

این فرمان را روی `10.10.1.5` بزنید. باید خطای اتصال باشد، نه ۲۰۰. ۲۰۰ یعنی Node به رابط شبکه چسبیده و `HOST` را غلط گذاشته‌اید.

## Security Notes

`X-Forwarded-Proto` را فقط به این دلیل از هدر می‌خوانیم که تنها مشتری پورت ۸۰۸۰ لبهٔ خودمان است. اگر فایروال را باز کنید، هر مشتری می‌تواند طرح `https` جعل کند و کوکی امن را روی کانال ناامن تحویل بگیرد. محدودیت `ufw` بخشی از همین کانفیگ است، نه کار اضافه.

Node را با کاربر `deploy` اجرا کنید، نه با `root` و نه با `www-data`. Nginx لازم نیست کد زیر `/opt/apps/app` را بخواند؛ فقط به پورت وصل می‌شود. مجوز درخت برنامه می‌تواند `750` و مالک `deploy:deploy` باشد.

`client_max_body_size` را با حد بدنه در خود Node یکی نگه دارید. اگر Nginx بزرگ‌تر باشد، برنامه باید خودش رد کند. اگر Nginx کوچک‌تر باشد، کاربر ۴۱۳ می‌بیند قبل از اینکه برنامه لاگ کند؛ این را در عیب‌یابی به حساب «درخواست به برنامه نرسید» بگذارید.

هدر `Server` این میزبان هنوز نسخه را ممکن است نشان بدهد تا `server_tokens off` را در `conf.d` بگذارید. همان دستور صفحهٔ امنیت است و اینجا تکرار فایل نمی‌خواهد، به شرطی که یک بار در http بارگذاری شده باشد.

## Troubleshooting

```text
connect() failed (111: Connection refused) while connecting to upstream, upstream: "http://127.0.0.1:3000/"
```

هیچ فرایندی روی ۳۰۰۰ نیست، یا روی IPv6 گوش می‌دهد، یا کرش کرده. `systemctl status` واحد Node یا `pm2 status` را ببینید، نه اول کانفیگ Nginx را. اگر هر دو ناظر را روشن کرده باشید، یکی با `EADDRINUSE` مرده و دیگری شاید نسخهٔ قدیمی باشد. یکی را خاموش کنید. توضیح در صفحهٔ استقرار Node است.

```text
upstream sent too big header while reading response header from upstream
```

`proxy_buffer_size` را به `32k` ببرید و `proxy_busy_buffers_size` را حداقل `64k` بگذارید. کوکی بزرگ Node این را می‌سازد.

اگر از لپ‌تاپ به `http://10.10.1.10:8080/` تایم‌اوت می‌گیرید ولی روی خود میزبان `curl` درست است، فایروال درست کار می‌کند و شما در مبدأ مجاز نیستید. از `10.10.1.5` آزمون کنید.

اگر WebSocket از مرورگر قطع می‌شود ولی REST سالم است، مسیر کلاینت باید زیر `/socket/` باشد. بیرون از آن location هدر Upgrade فرستاده نمی‌شود چون `Connection` را خالی کرده‌ایم تا keepalive بماند. برنامه را به همان پیشوند بیاورید یا یک location جدا با همان پنج هدر سوکت بسازید.

`nginx -t` که می‌گوید `host not found in upstream "127.0.0.1:3000"` نیست؛ نشانی عددی است. اگر به‌جایش نام میزبان گذاشته‌اید و آن نام در DNS نیست، `-t` همان لحظه شکست می‌خورد. برای سوکت محلی عدد را نگه دارید.

۴۱۳ روی آپلود یعنی بدنه از ۲۰ مگابایت گذشته است. لاگ Node خالی می‌ماند. یا حد را دو طرفه بالا ببرید یا کلاینت را درست کنید. حد را برای یک فایل استثنایی روی کل `server` بی‌نهایت نکنید؛ یک `location` جدا برای همان مسیر آپلود بسازید.

## Best Practices

- Node فقط `127.0.0.1:3000`. Nginx محلی فقط `10.10.1.10:8080`. TLS فقط روی `10.10.1.5`.
- طرح را از `X-Forwarded-Proto` لبه بگیرید، نه از `$scheme` اتصال داخلی.
- WebSocket و keepalive را در دو location بگذارید.
- یک ناظر برای فرایند Node. Nginx را ناظر برنامه حساب نکنید.
- سایت پیش‌فرض بسته را روی این میزبان هم از `sites-enabled` بردارید تا پورت ۸۰ تصادفی صفحهٔ Ubuntu را نشان ندهد. این فایل اصلاً به پورت ۸۰ گوش نمی‌دهد؛ یک سایت پیش‌فرض فراموش‌شده چرا.
- بعد از هر تغییر `sudo nginx -t && sudo systemctl reload nginx`.
