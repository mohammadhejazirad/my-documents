---
title: پروکسی معکوس
sidebar_position: 4
description: "proxy_pass به برنامهٔ آزمایشگاه، هدر Host و X-Forwarded، ارتقای WebSocket، و اندازهٔ بافر."
---

# پروکسی معکوس

## مقدمه

پروکسی معکوس یعنی کاربر به Nginx وصل می‌شود و Nginx از طرف او به فرایند برنامه وصل می‌شود. در آزمایشگاه لبه `10.10.1.5` است و برنامه روی `10.10.1.10:8080` نشسته است. خود Node روی `127.0.0.1:3000` می‌ماند و فقط Nginx همان میزبان به آن سوکت محلی وصل می‌شود. کانفیگ کامل آن میزبان در [صفحهٔ Node](/docs/06-nginx/nodejs) است. اینجا قرارداد هدر، WebSocket و بافر را روی لبه ثابت می‌کنیم.

اگر `proxy_pass` را بدون این هدرها بگذارید، برنامه Host را `10.10.1.10:8080` می‌بیند، نشانی کاربر را نشانی پروکسی فرض می‌کند، و لینک مطلق را با `http` می‌سازد در حالی که کاربر `https` زده است. این سه تا هر کدام یک حادثهٔ جدا هستند و هر سه از یک بلوک ناقص می‌آیند.

## مفهوم اصلی

`proxy_pass` یک نشانی بالادست می‌گیرد. اگر بعد از نام میزبان و پورت، مسیر ننویسید، URI اصلی کاربر تقریباً دست‌نخورده جلو می‌رود. اگر مسیر بنویسید، بخشی از URI که با location جور شده حذف و مسیر جدید جایش می‌نشیند. هر دو نحو معتبرند و رفتارشان فرق دارد. برای برنامهٔ `app.example.com` مسیر اضافه نمی‌خواهیم.

```nginx
server {
    listen 127.0.0.1:8091;
    server_name pass-full.example.com;
    location / {
        proxy_pass http://10.10.1.10:8080;
    }
}

server {
    listen 127.0.0.1:8092;
    server_name pass-prefix.example.com;
    location /api/ {
        proxy_pass http://10.10.1.10:8080/;
    }
}
```

سرور `pass-full` درخواست `/api/v1/items` را همان‌طور به بالادست می‌فرستد. سرور `pass-prefix` چون `proxy_pass` با مسیر تمام شده، پیشوند `location` را حذف می‌کند و بالادست `/v1/items` را می‌بیند. این دو بلوک فقط فرق نحو را نشان می‌دهند و در فایل تولید `app.example.com` کپی نمی‌شوند. پیش‌فرض این دانشنامه شکل بدون مسیر اضافه است.

هدر `Host` را خودمان می‌گذاریم چون وگرنه Nginx نام و پورت بالادست را می‌فرستد. `X-Real-IP` نشانی TCP کاربر است. `X-Forwarded-For` زنجیره است؛ دستور `proxy_add_x_forwarded_for` مقدار ورودی را دور نمی‌ریزد، به ته آن نشانی همین اتصال را اضافه می‌کند. `X-Forwarded-Proto` باید همان طرحی باشد که کاربر دیده، یعنی روی لبهٔ TLS برابر `https`.

WebSocket یک درخواست HTTP است که هدر `Upgrade` دارد و بعد از آن اتصال نباید مثل پاسخ کوتاه بسته شود. `map` در زمینهٔ http مقدار `Connection` را از روی وجود Upgrade می‌سازد. این `map` داخل `server` مجاز نیست.

بافر یعنی Nginx پاسخ بالادست را قبل از فرستادن به کاربر جمع کند. پیش‌فرض روشن است و برای API درست است. اگر هدر پاسخ از `proxy_buffer_size` بزرگ‌تر باشد، به‌جای صفحهٔ برنامه خطای ۵۰۲ می‌گیرید. خاموش کردن بافر برای جریان بلند و Server-Sent Events است، نه برای همهٔ locationها.

## چرا استفاده می‌شود؟

برنامه نباید گواهی و صف اتصال اینترنت را خودش اداره کند. لبه می‌تواند reload شود بدون اینکه فرایند Node را بکشید، و برعکس. لاگ لبه زمان کل درخواست و زمان بالادست را جدا نشان می‌دهد؛ بدون این جداسازی، کندی PHP و کندی شبکه یکی دیده می‌شوند.

WebSocket را اگر با هدر پیش‌فرض پروکسی کنید، مرورگر روی ارتقا می‌ماند و بعد قطع می‌شود. علامت سمت برنامه اغلب این است که درخواست GET معمولی رسیده و هدر Upgrade نرسیده. بافر کوچک هم در برنامهٔ Laravel که کوکی و هدر امنیتی زیاد می‌گذارد، ۵۰۲های تصادفی می‌سازد که با تکرار همان URL در `curl` مستقیم به php-fpm دیده نمی‌شوند.

## Architecture

```text
کاربر  ──TLS──  10.10.1.5
                  Host: app.example.com
                  X-Forwarded-Proto: https
                  X-Real-IP: نشانی کاربر
                       │
                       ▼
                  10.10.1.10:8080
                  Nginx محلی، طرح http
                       │
                       ▼
                  127.0.0.1:3000   Node
```

لبه تنها جایی است که `$scheme` برابر `https` است. Nginx محلی اگر `$scheme` خودش را به Node بفرستد، برنامه فکر می‌کند کاربر HTTP زده است. برای همین روی میزبان برنامه، طرح را از هدر لبه برمی‌داریم نه از طرح اتصال داخلی. آن خط در صفحهٔ Node است. اینجا لبه موظف است هدر را درست پر کند و فقط از شبکهٔ `10.10.0.0/16` به پورت ۸۰۸۰ وصل شود.

## Installation

روی لبه بسته باید نصب باشد. بالادست باید واقعاً گوش بدهد. قبل از نوشتن کانفیگ از خود پروکسی امتحان کنید:

```bash
curl -fsS -D- -o /dev/null --connect-timeout 3 http://10.10.1.10:8080/ -H "Host: app.example.com" || true
sudo ss -lnt 'sport = :443' 
```

اگر `curl` به `10.10.1.10:8080` رد شد، پروکسی را دست نزنید. یا Nginx محلی برنامه بالا نیست، یا فایروال `10.10.1.10` هنوز از `10.10.1.5` اجازه نداده، یا برنامه فقط به `127.0.0.1` گوش می‌دهد و پورت ۸۰۸۰ را nobody نگرفته است. پروکسی نمی‌تواند به `127.0.0.1` یک میزبان دیگر وصل شود؛ آن نشانی مال خود لبه است.

گواهی این نمونه مسیر استاندارد Certbot روی خود لبه است. صدور گواهی در فصل شبکه است. تا وقتی فایل‌ها نیستند، بلوک ۴۴۳ را بارگذاری نکنید چون `nginx -t` وجود فایل گواهی را هم چک می‌کند و شکست می‌خورد.

## Configuration

فایل سایت `/etc/nginx/sites-available/app.conf` روی `10.10.1.5`. بالادست این صفحه یک میزبان است. دو میزبان و سلامت منفعل در [توازن بار](/docs/06-nginx/load-balancing) است و آنجا به‌جای نشانی ثابت، نام upstream می‌نشیند. `map` ارتقا بالای همین فایل است، چون فایل از زمینهٔ http خوانده می‌شود. اگر آن را به `/etc/nginx/conf.d/upgrade-map.conf` منتقل کردید، از اینجا حذفش کنید تا متغیر دو بار تعریف نشود.

```nginx
map $http_upgrade $connection_upgrade {
    default upgrade;
    ""      close;
}

log_format app '$remote_addr $host "$request" $status rt=$request_time ut=$upstream_response_time us=$upstream_status';

upstream app_origin {
    server 10.10.1.10:8080;
    keepalive 16;
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

    ssl_certificate     /etc/letsencrypt/live/app.example.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/app.example.com/privkey.pem;
    ssl_protocols       TLSv1.2 TLSv1.3;

    access_log /var/log/nginx/app.example.com.access.log app;
    error_log  /var/log/nginx/app.example.com.error.log warn;

    client_max_body_size 20m;

    location /socket/ {
        proxy_pass http://app_origin;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection $connection_upgrade;
        proxy_read_timeout 3600s;
        proxy_send_timeout 3600s;
        proxy_buffering off;
    }

    location / {
        proxy_pass http://app_origin;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_set_header Connection "";
        proxy_connect_timeout 5s;
        proxy_send_timeout 60s;
        proxy_read_timeout 60s;
        proxy_buffering on;
        proxy_buffer_size 16k;
        proxy_buffers 8 16k;
        proxy_busy_buffers_size 32k;
    }
}
```

قالب لاگ `app` بالای همان فایل سایت است. این فایل از زمینهٔ http خوانده می‌شود، پس `log_format` آنجا مجاز است. اگر قالب را به `/etc/nginx/conf.d/log-format.conf` منتقل کردید، خط را از فایل سایت بردارید. نام تکراری، `nginx -t` را می‌شکند.

`keepalive 16` فقط وقتی اتصال را واقعاً دوباره استفاده می‌کند که location معمولی `Connection` را خالی بفرستد و پروتکل 1.1 باشد. location سوکت عمداً از این استخر استفاده نمی‌کند؛ هدر `Connection: close` یا `upgrade` با نگهداری اتصال عادی نمی‌خواند. هر دو location به یک upstream می‌روند ولی قرارداد هدرشان جداست.

`proxy_buffer_size` اندازهٔ بافر هدر پاسخ است، نه بدنه. `proxy_buffers 8 16k` هشت تکه برای بدنه است. `proxy_busy_buffers_size` باید از یک تکه بزرگ‌تر و از جمع تکه‌ها کوچک‌تر باشد؛ اینجا ۳۲k بین ۱۶k و ۱۲۸k است. اگر این نسبت را به هم بزنید `-t` قبول می‌کند ولی زیر بار هشدار بافر می‌دهد.

روی Ubuntu 24.04 خط `http2 on` را بردارید و به‌جایش بنویسید `listen 443 ssl http2` و همین را برای خط IPv6.

## Production Example

```bash
sudo nginx -t && sudo systemctl reload nginx
curl -fsS -o /dev/null -D- https://app.example.com/
```

در پاسخ، اگر برنامه یک مسیر مطلق در هدر `Location` ساخت، باید با `https://app.example.com` شروع شود نه با نشانی `10.10.1.10`. اگر `http://` بود، هدر `X-Forwarded-Proto` به برنامه نرسیده یا برنامه فقط به `$scheme` اتصال خودش نگاه کرده است.

یک درخواست عادی در access log لبه باید سه میدان اضافه داشته باشد. `rt` زمان کل از دید کاربر است، `ut` زمان پاسخ بالادست، `us` کد وضعیت بالادست. اگر `rt` بزرگ است و `ut` کوچک، معطلی جلوی Nginx است: شبکهٔ کاربر، بافر، یا محدودیت نرخ. اگر هر دو بزرگ‌اند، برنامه یا دیتابیس کند است.

برای سوکت، از خود لبه یک ارتقا را فقط وقتی برنامه واقعاً WebSocket دارد آزمون کنید. حداقل، لاگ خطای ۵۰۰ با جملهٔ `upstream prematurely closed` نباید برای یک اتصال بیکار زیر یک ساعت تکرار شود. `proxy_read_timeout 3600s` یعنی اتصال خاموش را یک ساعت نگه می‌داریم، نه اینکه درخواست معمولی API هم یک ساعت معطل بماند؛ آن تایم‌اوت فقط روی `/socket/` است.

## Security Notes

`X-Forwarded-For` را کاربر هم می‌تواند در درخواست اول جعل کند. لبه آن را پاک نمی‌کند؛ نشانی واقعی را به ته زنجیره اضافه می‌کند. برنامه باید آخرین نشانی اضافه‌شده توسط پروکسی مورد اعتماد را بردارد، نه اولین مقدار رشته را. محدودیت نرخ را روی لبه با `$binary_remote_addr` بگذارید، نه با هدر ورودی. این کار در [امنیت و نرخ](/docs/06-nginx/security-rate-limit) است.

پورت ۸۰۸۰ روی `10.10.1.10` نباید از اینترنت باز باشد. اگر کسی مستقیم به آن برسد، می‌تواند `X-Forwarded-Proto: https` جعل کند. فایروال میزبان برنامه فقط `10.10.1.5` را به ۸۰۸۰ راه می‌دهد.

`client_max_body_size 20m` را با حد برنامه یکی نگه دارید. بزرگ‌تر کردنش بدون دلیل، حافظه و دیسک موقت `/var/lib/nginx` یا `/var/cache/nginx` را به بدنهٔ آپلود گره می‌زند. مقدار پیش‌فرض Nginx یک مگابایت است و خطای ۴۱۳ می‌دهد؛ این بهتر از بی‌نهایت است.

## Troubleshooting

اتصال رد شده از لبه:

```text
connect() failed (111: Connection refused) while connecting to upstream, client: ..., server: app.example.com, upstream: "http://10.10.1.10:8080/"
```

بالادست گوش نمی‌دهد یا به رابط دیگری چسبیده است. روی `10.10.1.10` بزنید `ss -lnt 'sport = :8080'`. باید `10.10.1.10:8080` را ببینید نه فقط `127.0.0.1:8080`.

هدر بیش از حد بزرگ:

```text
upstream sent too big header while reading response header from upstream
```

`proxy_buffer_size` را به `32k` ببرید و `proxy_busy_buffers_size` را حداقل دو برابر آن نگه دارید. علت معمولاً کوکی نشست یا هدر خطای طولانی PHP است، نه بدنهٔ JSON.

اگر همهٔ POSTها ناگهان ۴۱۳ شدند، `client_max_body_size` هنوز پیش‌فرض است یا در location دیگری که `add_header` ندارد بازنویسی نشده. این دستور در location ارث نمی‌برد اگر آن location بلوک خودش را کامل سایه بزند؛ آن را در `server` بگذارید تا هر دو location ببینند، مگر جایی که عمداً حد کوچک‌تر می‌خواهید.

`upstream timed out` با `ut=-` در لاگ یعنی اتصال برقرار شده ولی در `proxy_read_timeout` پاسخی نیامده. برای API شصت ثانیه را کورکورانه به ده دقیقه نبرید؛ اول ببینید برنامه روی همان URL مستقیم کند است یا نه. برای `/socket/` تایم‌اوت بلند عمدی است.

اگر WebSocket بلافاصله قطع می‌شود، `map` بارگذاری نشده یا location سوکت زیر یک پیشوند `^~` دیگر رفته است. `nginx -T` را برای `connection_upgrade` بگردید. اگر نیست، فایل `conf.d` include نشده است.

اسلش ته `proxy_pass` را اگر یک بار اضافه کنید، علامت این است که `/` کار می‌کند و `/api/...` روی بالادست به یک مسیر کوتاه‌شده می‌رود و برنامه ۴۰۴ می‌دهد در حالی که مستقیم به پورت ۸۰۸۰ درست است.

## Best Practices

- `proxy_pass` بدون مسیر اضافه، مگر عمداً می‌خواهید پیشوند location را عوض کنید.
- چهار هدر Host و X-Real-IP و X-Forwarded-For و X-Forwarded-Proto را در هر location پروکسی تکرار کنید. location جدید هدر location دیگر را به ارث نمی‌برد.
- WebSocket را در location خودش بگذارید، بافر را آنجا خاموش کنید، و اتصال عادی را با `Connection` خالی روی keepalive بالادست نگه دارید.
- زمان `rt` و `ut` را در لاگ داشته باشید قبل از اینکه کسی بگوید «Nginx کند است».
- روی 24.04 به‌جای `http2 on` از پارامتر `http2` روی `listen` استفاده کنید.
- مرحلهٔ بعد برای دو گره، [توازن بار](/docs/06-nginx/load-balancing) است. نشانی تکی این صفحه را آنجا داخل upstream می‌گذارید، نه اینکه هر دو الگو همزمان به یک پورت وصل باشند.
