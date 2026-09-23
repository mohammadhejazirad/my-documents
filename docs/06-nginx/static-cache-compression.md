---
title: فایل ثابت، کش و فشرده‌سازی
sidebar_position: 6
description: "gzip و نوع فایل، فرق alias و root، کش طولانی برای دارایی دارای hash، و proxy_cache با levels."
---

# فایل ثابت، کش و فشرده‌سازی

## مقدمه

سه کار این صفحه به هم مربوط‌اند ولی یکی نیستند. gzip پاسخ متنی را موقع خروج کوچک می‌کند. `root` و `alias` فایل روی دیسک را بدون برنامه برمی‌گردانند. `proxy_cache` پاسخ برنامه را روی دیسک لبه نگه می‌دارد تا درخواست بعدی به `10.10.1.10` نرود. قاطی کردن این سه، یا جاوااسکریپت را یک سال در مرورگر زندانی می‌کند، یا صفحهٔ شخصی کاربر را بین کاربرها تقسیم می‌کند.

لبه هنوز `10.10.1.5` است و نام `app.example.com` است. فایل ثابت برنامه روی دیسک پروکسی نیست؛ یا از همان درختی می‌آید که استقرار روی پروکسی کپی کرده، یا پاسخ پروکسی‌شده است. این صفحه هر دو را جدا نشان می‌دهد. دارایی دارای hash زیر `/opt/apps/app/public/assets` فرض شده و نام فایل شامل اثر محتوای همان بیلد است. `index.html` هرگز آن کش را نمی‌گیرد.

## مفهوم اصلی

`gzip on` فیلتر خروجی است و در بستهٔ Ubuntu هست. نوع‌هایی که فشرده می‌شوند را `gzip_types` می‌گوید. پیش‌فرض فقط `text/html` است و آن را نباید در فهرست تکرار کرد. تصویر jpeg و png و ویدیو از قبل فشرده‌اند؛ گذاشتنشان فقط CPU می‌سوزاند. `gzip_min_length 256` جلوی فشردن پاسخ ریز را می‌گیرد. `gzip_comp_level 5` تعادل این لبه است؛ سطح ۹ تأخیر را روی هسته می‌برد و برای این ترافیک نمی‌ارزد. `gzip_vary on` هدر `Vary: Accept-Encoding` را می‌گذارد تا کش میانی پاسخ فشرده را به کسی که gzip نخواسته ندهد. `gzip_proxied any` لازم است چون پاسخ برنامه از بالادست می‌آید و وگرنه Nginx پاسخ پروکسی را فشرده نمی‌کند.

`root` مسیر location را به ته مسیر دیسک می‌چسباند. `location /static/` با `root /opt/apps/app/public` فایل را در `/opt/apps/app/public/static/` می‌جوید. `alias` مسیر location را با مسیر alias عوض می‌کند. `location /media/` با `alias /var/lib/app/media/` فایل `/media/a.jpg` را در `/var/lib/app/media/a.jpg` می‌جوید. هر دو طرف alias باید در اسلش ته با هم بخوانند. `alias` با `try_files` در خیلی از نسخه‌ها رفتار غافلگیرکننده دارد؛ برای alias فقط وقتی فایل را دقیق می‌خواهیم از آن استفاده می‌کنیم و فهرست پوشه نمی‌سازیم.

`expires 1y` هم `Expires` می‌گذارد هم `Cache-Control`. اگر در همان location یک `add_header Cache-Control` هم بگذارید، دو هدر Cache-Control می‌گیرید. این صفحه برای فایل hash‌دار فقط یک `Cache-Control` صریح می‌گذارد و از `expires` همزمان استفاده نمی‌کند. یک سال به‌اضافهٔ `immutable` فقط وقتی درست است که نام فایل با محتوا عوض شود. `index.html` باید `no-cache` باشد تا مرورگر نسخهٔ جدید نام دارایی را ببیند.

`proxy_cache_path` در زمینهٔ http است. `levels=1:2` یعنی کلید کش در یک حرف و بعد دو حرف زیرپوشه پخش شود تا یک دایرکتوری چندصدهزار فایلی نسازید. `keys_zone=app_cache:10m` حافظهٔ فراداده است، نه سقف دیسک. `max_size=1g` سقف محتواست. `inactive=60m` فایلی را که شصت دقیقه کسی نخواسته پاک می‌کند. `use_temp_path=off` فایل موقت را در خود دایرکتوری کش می‌نویسد تا مجوز یک مسیر جدا غافلگیرتان نکند.

## چرا استفاده می‌شود؟

بدون gzip، جاوااسکریپت و JSON همان اندازهٔ خام را از لبه تا کاربر می‌روند. روی لینک کاربران این آزمایشگاه این تفاوت قابل اندازه‌گیری است و CPU سطح ۵ برای آن قابل قبول است. بدون جدا کردن کش `index.html` از دارایی hash‌دار، یا هر استقرار یک ساعت در مرورگر کسی نمی‌آید، یا بدتر، مرورگر تا یک سال برنامهٔ کهنه را اجرا می‌کند.

`proxy_cache` برای فهرست عمومی است که از دیتابیس می‌آید و در چند ثانیه عوض نمی‌شود. کش کردن پاسخ دارای کوکی نشست، دادهٔ یک کاربر را به کاربر بعدی می‌دهد. برای همین کش فقط روی location مشخص `/api/catalog` است و اگر درخواست هدر `Authorization` یا کوکی `session` داشته باشد اصلاً ذخیره نمی‌شود.

## Architecture

```text
درخواست GET /assets/app.<hash>.js
        │
        ▼
لبه 10.10.1.5
  location ^~ /assets/     دیسک محلی، بدون برنامه
  Cache-Control یک سال

درخواست GET /api/catalog
        │
        ▼
لبه
  proxy_cache app_cache
  ┌─ HIT  → فایل /var/cache/nginx/app
  └─ MISS → 10.10.1.10:8080 → برنامه
```

دایرکتوری کش مال کاربر `www-data` است چون worker با همان کاربر می‌نویسد. مسیر برنامهٔ ثابت اگر روی لبه کپی می‌شود باید برای `www-data` خوانا باشد و مالکیتش با `deploy` بماند.

## Installation

دایرکتوری‌ها را قبل از reload بسازید. `nginx -t` نبودن کش را همیشه سخت نمی‌گیرد، ولی worker اولی که بخواهد بنویسد خطا می‌دهد و شما فکر می‌کنید کش «گاهی» کار نمی‌کند.

```bash
sudo mkdir -p /var/cache/nginx/app /opt/apps/app/public/assets /var/lib/app/media
sudo chown www-data:www-data /var/cache/nginx/app
sudo chmod 700 /var/cache/nginx/app
sudo chown -R deploy:deploy /opt/apps/app /var/lib/app
sudo find /opt/apps/app/public /var/lib/app/media -type d -exec chmod 755 {} \;
sudo find /opt/apps/app/public /var/lib/app/media -type f -exec chmod 644 {} \;
```

`chmod 700` روی کش یعنی فقط `www-data` محتوای پاسخ ذخیره‌شده را می‌خواند. آن مسیر را در پشتیبان خانگی کاربرها کپی نکنید؛ بازتولیدشدنی است و ممکن است پاسخ عمومی را داشته باشد، ولی جای بکاپ دیتابیس نیست.

## Configuration

فایل `/etc/nginx/sites-available/app.conf` روی لبه، gzip و مسیر کش را بالای `server` دارد. هر دو زمینهٔ http هستند و این فایل از همان زمینه include می‌شود. اگر بعداً به `conf.d` منتقل‌شان کردید، از این فایل بردارید تا zone کش دو بار تعریف نشود. هدر امنیتی را در هر location که `add_header` خودش را دارد تکرار می‌کنیم، چون یک `add_header` ارث والد را دور می‌ریزد. دلیلش در [امنیت و نرخ](/docs/06-nginx/security-rate-limit) است. بقیهٔ قرارداد پروکسی در [پروکسی معکوس](/docs/06-nginx/reverse-proxy) است.

```nginx
gzip on;
gzip_vary on;
gzip_proxied any;
gzip_comp_level 5;
gzip_min_length 256;
gzip_types text/plain text/css text/xml application/javascript application/json application/xml application/xml+rss image/svg+xml;

proxy_cache_path /var/cache/nginx/app levels=1:2 keys_zone=app_cache:10m max_size=1g inactive=60m use_temp_path=off;

upstream app_origin {
    server 10.10.1.10:8080;
    keepalive 16;
}

server {
    listen 443 ssl;
    listen [::]:443 ssl;
    http2 on;
    server_name app.example.com;
    ssl_certificate     /etc/letsencrypt/live/app.example.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/app.example.com/privkey.pem;
    ssl_protocols TLSv1.2 TLSv1.3;

    location = /index.html {
        root /opt/apps/app/public;
        add_header Cache-Control "no-cache" always;
        add_header X-Content-Type-Options nosniff always;
    }

    location ^~ /assets/ {
        root /opt/apps/app/public;
        try_files $uri =404;
        access_log off;
        add_header Cache-Control "public, max-age=31536000, immutable" always;
        add_header X-Content-Type-Options nosniff always;
    }

    location /media/ {
        alias /var/lib/app/media/;
        add_header X-Content-Type-Options nosniff always;
    }

    location /api/catalog {
        proxy_pass http://app_origin;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header Connection "";
        proxy_cache app_cache;
        proxy_cache_valid 200 5m;
        proxy_cache_lock on;
        proxy_cache_bypass $http_authorization $cookie_session;
        proxy_no_cache $http_authorization $cookie_session;
        add_header X-Cache-Status $upstream_cache_status always;
        add_header X-Content-Type-Options nosniff always;
    }

    location / {
        proxy_pass http://app_origin;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_set_header Connection "";
    }
}
```

`^~ /assets/` جلوی افتادن فایل `.js` به یک عبارت باقاعدهٔ دیگر را می‌گیرد. `proxy_cache_lock on` نمی‌گذارد ده‌ها درخواست همزمانِ MISS همزمان به برنامه بکوبند؛ بقیه منتظر نتیجهٔ اول می‌مانند. `proxy_cache_valid 200 5m` فقط وقتی به کار می‌رود که خود پاسخ قانون تازگی نداده باشد. اگر برنامه `Cache-Control: private` بفرستد، Nginx آن را کش نمی‌کند. این را با `proxy_ignore_headers` دور نزنید.

`location /` کش ندارد. هر مسیر تازه‌ای که اضافه می‌کنید بی‌کش است تا عمداً زیر `/api/catalog` یا مکان عمومی دیگری ببریدش.

## Production Example

یک فایل ساختگی با نام hash‌دار و یک index بگذارید و هدر را ببینید:

```bash
echo "console.log(1);" | sudo tee /opt/apps/app/public/assets/app.8f3a2c1.js >/dev/null
echo "<!doctype html><title>app</title>" | sudo tee /opt/apps/app/public/index.html >/dev/null
sudo nginx -t && sudo systemctl reload nginx
curl -fsS -D- -o /dev/null https://app.example.com/assets/app.8f3a2c1.js
curl -fsS -D- -o /dev/null https://app.example.com/index.html
curl -fsS -D- -o /dev/null https://app.example.com/api/catalog
curl -fsS -D- -o /dev/null https://app.example.com/api/catalog
```

در دارایی باید `Cache-Control: public, max-age=31536000, immutable` باشد و `Content-Encoding: gzip` اگر کلاینت `Accept-Encoding: gzip` فرستاده باشد. `curl` پیش‌فرض gzip نمی‌خواهد؛ برای دیدن فشرده‌سازی:

```bash
curl -fsS -D- -o /dev/null -H "Accept-Encoding: gzip" https://app.example.com/assets/app.8f3a2c1.js
```

درخواست اول کاتالوگ باید `X-Cache-Status: MISS` باشد و دومی `HIT`، به شرطی که برنامه ۲۰۰ داده باشد و هدر خصوصی نفرستاده باشد. اگر هر دو MISS ماندند، پاسخ `Set-Cookie` دارد یا `Cache-Control` اجازه نداده است. آن نقطه را کش نکنید؛ برنامه را برای آن URL عمومی کنید.

بعد از استقرار بیلد جدید، نام فایل دارایی عوض می‌شود و کش یک‌سالهٔ مرورگر به فایل جدید نمی‌چسبد. اگر نام را ثابت نگه داشته‌اید و فقط محتوا را عوض کرده‌اید، `immutable` را بردارید. وگرنه کاربر تا انقضای کش، باگ اصلاح‌شده را نمی‌بیند.

## Security Notes

کش پروکسی را برای هر location که کوکی یا `Authorization` دارد روشن نکنید. `proxy_no_cache` این صفحه یک نام کوکی مشخص را می‌شناسد: `session`. اگر برنامه نام دیگری می‌گذارد، همان نام را اضافه کنید. یک کش همگانی روی `location /` دادهٔ نشست را به اشتراک می‌گذارد و این دیگر کندی نیست، نشت است.

`alias` را به ریشهٔ فایل‌سیستم یا به `/opt/apps/app` بدون مرز `public` ندهید. یک اسلش غلط می‌تواند مسیر را به درخت کنار آن بچسباند. بعد از هر تغییر alias، یک فایل بیرون از پوشهٔ مدنظر را با `curl` بخواهید و باید ۴۰۴ بگیرید.

دایرکتوری کش را با `autoindex` منتشر نکنید. هیچ `location`ی نباید `root /var/cache/nginx` داشته باشد. مجوز ۷۰۰ این اشتباه را کم‌اثر می‌کند ولی جایگزین کانفیگ درست نیست.

gzip بمب را با نوع محدود و `gzip_min_length` کوچک نگه می‌داریم، نه با خاموش کردن کامل فیلتر. پاسخ فشردهٔ بسیار بزرگ هنوز می‌تواند CPU بگیرد؛ حد بدنهٔ `client_max_body_size` مال درخواست ورودی است و جای حد پاسخ نیست. اگر یک URL مشخص پاسخ غول می‌سازد، کش و gzip را روی همان location خاموش کنید.

## Troubleshooting

۴۰۴ در حالی که فایل روی دیسک هست، اولین علامت alias غلط است. در error log مسیر واقعی که Nginx باز کرده را بخوانید. اگر `/var/lib/app/media/media/a.jpg` می‌بینید، اسلش ته `location` و `alias` یکی نیست. اگر `/opt/apps/app/public/static/static/a.js` می‌بینید، خواسته‌اید alias باشید ولی `root` گذاشته‌اید.

اگر دارایی gzip نمی‌شود، `gzip_types` نوع واقعی پاسخ را ندارد. هدر `Content-Type` را در `curl -D-` بخوانید. `application/javascript` با `text/javascript` یکی نیست و هر کدام را که برنامه می‌فرستد باید در فهرست باشد. متن HTML لازم نیست در فهرست باشد.

اگر HIT می‌آید ولی محتوا کهنهٔ خراب است:

```bash
sudo rm -rf /var/cache/nginx/app/*
sudo nginx -t && sudo systemctl reload nginx
```

دایرکتوری را پاک نکنید، محتوایش را پاک کنید، و مالک `www-data` بماند. reload به‌تنهایی فایل کش را دور نمی‌ریزد.

خطای `permission denied` هنگام نوشتن کش یعنی `chown` جا مانده یا مسیر را به‌جای `www-data` با کاربر دیگری ساخته‌اید. `namei -l /var/cache/nginx/app` را ببینید.

اگر `add_header` کش را گذاشتید و هدر امنیتی صفحهٔ امنیت روی همان URL غیب شد، طبیعی است. هدرها را در همان location تکرار کنید. این باگ ارث Nginx است نه از قلم افتادن reload.

## Best Practices

- gzip سطح ۵، فقط نوع متنی و svg و json و جاوااسکریپت. تصویر و فونت فشرده را اضافه نکنید.
- `immutable` و یک سال فقط برای نامی که با محتوا عوض می‌شود. `index.html` جدا و `no-cache`.
- `expires` و `add_header Cache-Control` را در یک location قاطی نکنید.
- `proxy_cache_path` یک بار در `conf.d`. تکرار zone هم‌نام سرویس را بالا نمی‌آورد.
- کش پروکسی را location به location روشن کنید، با `proxy_no_cache` برای درخواست احراز هویت.
- `alias` را با اسلش جفت بنویسید و با `try_files` ترکیب نکنید.
