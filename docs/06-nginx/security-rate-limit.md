---
title: هدر امنیتی و محدودیت نرخ
sidebar_position: 7
description: "add_header با always، HSTS فقط روی TLS، limit_req_zone و limit_conn، و server_tokens off."
---

# هدر امنیتی و محدودیت نرخ

## مقدمه

لبهٔ `10.10.1.5` تنها جایی است که نشانی واقعی کاربر را روی سوکت می‌بیند و تنها جایی است که گواهی `app.example.com` را تمام می‌کند. هدر امنیتی و محدودیت نرخ را اینجا می‌گذاریم. اگر روی Nginx محلی `10.10.1.10` محدودیت را با نشانی اتصال حساب کنید، همهٔ کاربران یک نفرند: خود پروکسی.

بسته همان `nginx` شاخهٔ 1.28 است. مخفی کردن نسخه با `server_tokens off` شماره را از هدر `Server` و صفحهٔ خطا برمی‌دارد و خود کلمهٔ `nginx` می‌ماند. پاک کردن کامل نام سرور ماژول جدا می‌خواهد که در این بسته نیست و این صفحه ادعای آن را ندارد.

## مفهوم اصلی

`add_header` دو دام دارد. اول، بدون پارامتر `always` هدر فقط روی چند کد موفق و ریدایرکت می‌رود و روی ۴۰۴ و ۵۰۲ و ۴۲۹ نمی‌آید. مرورگر و اسکنر همان پاسخ‌های خطا را بدون هدر می‌بینند. دوم، اگر یک location حتی یک `add_header` داشته باشد، هدرهای `add_header` والد به آن location به ارث نمی‌رسند. `always` این دومی را درست نمی‌کند. برای همین هر location که هدر کش یا وضعیت کش می‌گذارد باید هدر امنیتی را هم دوباره بنویسد، یا همه از یک فایل include تکرار شوند.

HSTS به مرورگر می‌گوید برای مدتی فقط HTTPS بیاید. این هدر روی پاسخ HTTP هم توسط مرورگر جدی گرفته می‌شود و اگر گواهی‌تان بعداً خراب شود، کاربر را بیرون نگه می‌دارد. جایش فقط بلوک `listen 443` است، بعد از اینکه TLS واقعاً کار می‌کند. `preload` و `includeSubDomains` را روز اول نمی‌گذاریم. پیش‌بارگذاری را فقط وقتی همهٔ زیردامنه‌ها HTTPS واقعی دارند و تیم عمداً ثبت کرده درخواست می‌کنیم. اینجا `max-age=15552000` یعنی صد و هشتاد روز، بدون زیردامنه.

`limit_req_zone` در زمینهٔ http است و یک شمارنده در حافظهٔ مشترک می‌سازد. کلید `$binary_remote_addr` فشردهٔ نشانی اتصال است، نه هدر `X-Forwarded-For`. `zone=app_login:10m` حدود صد و شصت هزار نشانی را در ده مگابایت نگه می‌دارد. `rate=5r/m` برای ورود و `rate=10r/s` برای بقیهٔ سایت این آزمایشگاه است. `burst` چند درخواست اضافه را می‌پذیرد. `nodelay` یعنی همان burst را معطل صف نکن، ولی بیشتر از سقف را ۴۲۹ کن. بدون `nodelay` درخواست اضافه در صف می‌خوابد و کاربر فکر می‌کند سایت کند است نه محدود.

`limit_conn_zone` تعداد اتصال همزمان را محدود می‌کند، نه نرخ. یک کلاینت که اتصال را باز نگه می‌دارد با `limit_req` دیده نمی‌شود. هر دو را می‌گذاریم. `limit_conn` باید به zoneی اشاره کند که قبلاً در http ساخته شده است.

## چرا استفاده می‌شود؟

بدون هدر، مرورگر نوع فایل را از روی محتوا حدس می‌زند و یک پاسخ اسکریپت را ممکن است در زمینه‌ای اجرا کند که شما فقط دانلود حساب کرده‌اید. `X-Content-Type-Options: nosniff` این حدس را می‌بندد. `X-Frame-Options: SAMEORIGIN` جلوی نشاندن سایت داخل قاب یک مبدأ دیگر را می‌گیرد. `Referrer-Policy` نشانی کامل را به سایت‌های دیگر نمی‌فرستد. این‌ها جای بررسی کد برنامه نیستند و از لبه ارزان‌تر اعمال می‌شوند.

بدون محدودیت نرخ، یک حلقهٔ ورود از یک نشانی می‌تواند همهٔ workerها را مشغول رمز عبور غلط کند. محدودیت، احراز هویت برنامه را جایگزین نمی‌شود؛ فقط تعداد حدس را پایین می‌آورد تا بقیهٔ کاربران هنوز پاسخ بگیرند. `limit_req_status 429` را صریح می‌گذاریم تا پیش‌فرض ۵۰۳ با «سایت خوابیده» اشتباه نشود.

## Architecture

```text
کاربر
  │  $binary_remote_addr = نشانی واقعی
  ▼
10.10.1.5
  server_tokens off
  limit_req_zone  app_general و app_login
  limit_conn_zone app_conn
  ├─ listen 80     ریدایرکت، بدون HSTS
  └─ listen 443    HSTS و بقیهٔ هدرها
         │
         ▼
  10.10.1.10:8080     اینجا نرخ را با نشانی پروکسی حساب نکنید
```

حافظهٔ zone بین workerها مشترک است. بدون این، هر worker سقف جدا می‌داشت و نرخ واقعی چند برابر می‌شد.

## Installation

چیز جدیدی نصب نمی‌شود. گواهی باید قبل از بلوک HSTS روی دیسک باشد و `curl https://app.example.com/` از بیرون کد ۲۰۰ یا ۳۰۲ برنامه را بدهد، نه خطای گواهی. تا آن لحظه بلوک ۴۴۳ را با HSTS بارگذاری نکنید.

```bash
sudo test -r /etc/letsencrypt/live/app.example.com/fullchain.pem && echo cert-ok
nginx -v
```

`cert-ok` یعنی فایل خوانا است. معتبر بودن نام داخل گواهی را مرورگر یا `curl` بدون `-k` می‌گوید. `curl -k` این آزمون را بی‌معنی می‌کند.

## Configuration

`/etc/nginx/sites-available/app.conf` روی لبه. دستورهای zone زمینهٔ http می‌خواهند و بالای همین فایل آمده‌اند، چون `sites-enabled` از داخل http خوانده می‌شود. اگر آن‌ها را به `/etc/nginx/conf.d/limits.conf` بردید، از این فایل حذفشان کنید تا zone هم‌نام دو بار ساخته نشود. هدر HSTS فقط در سرور ۴۴۳ است. پورت ۸۰ فقط ریدایرکت می‌کند و `add_header` ندارد.

```nginx
server_tokens off;
limit_req_status 429;
limit_req_zone $binary_remote_addr zone=app_login:10m rate=5r/m;
limit_req_zone $binary_remote_addr zone=app_general:10m rate=10r/s;
limit_conn_zone $binary_remote_addr zone=app_conn:10m;
limit_conn_status 429;

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

    add_header Strict-Transport-Security "max-age=15552000" always;
    add_header X-Content-Type-Options nosniff always;
    add_header X-Frame-Options SAMEORIGIN always;
    add_header Referrer-Policy strict-origin-when-cross-origin always;
    add_header Permissions-Policy "camera=(), microphone=(), geolocation=()" always;

    limit_req zone=app_general burst=20 nodelay;
    limit_conn app_conn 20;

    location /login {
        limit_req zone=app_login burst=3 nodelay;
        proxy_pass http://10.10.1.10:8080;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_set_header Connection "";
        add_header Strict-Transport-Security "max-age=15552000" always;
        add_header X-Content-Type-Options nosniff always;
        add_header X-Frame-Options SAMEORIGIN always;
        add_header Referrer-Policy strict-origin-when-cross-origin always;
        add_header Permissions-Policy "camera=(), microphone=(), geolocation=()" always;
    }

    location / {
        proxy_pass http://10.10.1.10:8080;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_set_header Connection "";
    }
}
```

`location /login` هدرها را تکرار کرده چون اگر فقط همان location هدر تازه‌ای می‌گذاشت، HSTS روی صفحهٔ ورود که بیشتر از همه به آن نیاز دارد حذف می‌شد. `location /` هدر اضافه ندارد و هدرهای `server` را به ارث می‌برد. `limit_req` سطح `server` روی `/login` هم هست مگر در آن location یک `limit_req` دیگر بگذارید؛ در عمل هر دو zone برای ورود حساب می‌شوند و zone سخت‌گیرتر زودتر ۴۲۹ می‌دهد. این خواستهٔ ماست: ورود هم سقف عمومی را دارد هم سقف خودش را.

اگر صفحه‌ای `add_header X-Cache-Status` دارد، هر پنج هدر امنیتی را آنجا هم کپی کنید. یک هدر جاافتاده در همان location یعنی بقیه هم نمی‌آیند.

روی Ubuntu 24.04 `http2 on` را با `listen 443 ssl http2` عوض کنید.

## Production Example

```bash
sudo nginx -t && sudo systemctl reload nginx
curl -fsS -D- -o /dev/null https://app.example.com/ | head -n 20
curl -s -D- -o /dev/null http://app.example.com/ | head -n 15
```

پاسخ HTTPS باید `strict-transport-security` و `x-content-type-options` و `x-frame-options` را داشته باشد و هدر `Server` باید `nginx` باشد بدون اسلش و شماره. پاسخ HTTP باید `301` باشد و `strict-transport-security` نداشته باشد.

ورود را با یک حلقهٔ کوچک از یک میزبان آزمون کنید، نه از اسکریپت توزیع‌شده:

```bash
i=0
while [ "$i" -lt 12 ]; do
  curl -s -o /dev/null -w "%{http_code}\n" -X POST https://app.example.com/login
  i=$((i+1))
done
```

باید چند ۳۰۲ یا ۴۰۱ یا ۲۰۰ برنامه بیاید و بعد ۴۲۹. اگر همه‌اش ۴۰۱ است، zone بارگذاری نشده یا دارید از نشانی دیگری می‌زنید که در حافظهٔ شماست نه در آزمایش. `sudo nginx -T` را برای `app_login` بگردید.

این حلقه را علیه محیط واقعی کاربران نزنید. از یک IP آزمون در شبکهٔ خودتان بزنید و بعد اگر لازم است همان IP را با reload از حافظه پاک کنید؛ reload شمارنده را از نو می‌سازد.

## Security Notes

HSTS روی پورت ۸۰ ممنوع است. اگر گواهی آزمایشی یا نام غلط دارید، اول گواهی را درست کنید، بعد هدر را بگذارید. `max-age` بلند با گواهی خراب یعنی کاربران تا پایان عمر هدر گیر کرده‌اند، مگر با پاک کردن وضعیت مرورگر.

`server_tokens off` امنیت رمزنگاری نمی‌خرد. فقط شمارهٔ دقیق را از صفحهٔ خطای پیش‌فرض برمی‌دارد. وصله را هنوز باید با `apt upgrade` بیاورید. به این دستور به چشم مخفی‌کاری کامل نگاه نکنید.

محدودیت نرخ جای گذرواژه و قفل حساب در خود برنامه نیست. یک مهاجم با چند نشانی همچنان حدس می‌زند، فقط آهسته‌تر. کلید را `$binary_remote_addr` نگه دارید. اگر کسی پیشنهاد کرد کلید را `$http_x_forwarded_for` بگذارید، روی لبه این کار را نکنید؛ آن هدر را خود کاربر می‌فرستد و هر بار یک کلید تازه می‌سازد و محدودیت بی‌اثر می‌شود.

`Permissions-Policy` این صفحه دوربین و میکروفون و مکان را برای مبدأ خودش هم نمی‌بندد به شکل یک سیاست کامل محتوا. سیاست محتوا به برنامه بستگی دارد و یک خط کپی‌شده اغلب برنامه را می‌شکند. آن را جدا و با آزمون مرورگر اضافه کنید، نه داخل همین فایل به امید اینکه «هر چه سخت‌تر بهتر».

پورت برنامه را با این هدرها «امن» حساب نکنید. هدر به کسی که مستقیم به `10.10.1.10:8080` برسد ارسال نمی‌شود اگر آن Nginx هدر را نداشته باشد، و اصل مشکل باز بودن پورت است.

## Troubleshooting

هدر روی ۲۰۰ هست و روی ۴۰۴ نیست: `always` جا مانده. بعد از اضافه کردنش reload کنید و `curl -D-` را روی یک مسیر عمداً غلط تکرار کنید.

هدر روی `/` هست و روی `/assets/` نیست: آن location `add_header` کش دارد و ارث را بریده. هدر امنیتی را همان‌جا تکرار کنید.

```text
nginx: [emerg] zero size shared memory zone "app_login"
```

یعنی `limit_req` به نامی اشاره می‌کند که `limit_req_zone` هم‌نام در هیچ فایل include‌شده‌ای نیست، یا zone داخل `server` نوشته شده و `-t` همان‌جا رد شده. zone را به `conf.d` برگردانید.

اگر همهٔ کاربران یک‌دفعه ۴۲۹ می‌گیرند، محدودیت را به‌اشتباه روی Nginx پشت پروکسی گذاشته‌اید و کلید همه `10.10.1.5` است. zone را از آن میزبان بردارید و فقط روی لبه نگه دارید. علامت دیگرش این است که `limit_req` حتی با یک کلیک شما هم سریع پر می‌شود چون ترافیک دفتر همه از یک NAT می‌آید. برای ورود، `5r/m` با NAT یک دفتر کوچک ممکن است تنگ باشد؛ burst را سه نگه دارید و نرخ را با لاگ ۴۲۹ تنظیم کنید، نه با خاموش کردن zone.

`server_tokens off` اثر ندارد اگر یک پروکسی دیگر جلوی این Nginx هدر `Server` خودش را می‌گذارد، یا اگر پاسخ از `add_header Server ...` در برنامه آمده باشد. اول `curl -D-` مستقیم به `10.10.1.5` را ببینید.

اگر `-t` می‌گوید گواهی باز نمی‌شود، HSTS را هنوز به کاربران ندهید. فایل گواهی باید همان لحظه موجود باشد. مسیر Certbot بعد از تمدید با پیوند `live` ثابت می‌ماند؛ به فایل `archive` با شمارهٔ تاریخ نچسبید.

## Best Practices

- `always` روی هر `add_header` امنیتی. تکرار هدر در هر location که `add_header` دیگری دارد.
- HSTS فقط داخل سرور ۴۴۳، بدون preload، بعد از سالم بودن گواهی.
- `limit_req_zone` و `limit_conn_zone` در `conf.d`، کلید نشانی واقعی اتصال، وضعیت ۴۲۹.
- ورود سخت‌گیرتر از بقیهٔ سایت. آزمون حلقه را از یک IP آزمایشی بزنید.
- `server_tokens off` را بگذارید و همچنان بسته را به‌روز کنید.
- نرخ را روی لبه حساب کنید، نه روی میزبانی که فقط پروکسی را می‌بیند.
