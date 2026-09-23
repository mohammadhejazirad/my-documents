---
title: Laravel پشت Nginx
sidebar_position: 10
description: "ریشهٔ public برای Laravel در /opt/apps/laravel، try_files، و جلوگیری از اجرای php بیرون از public."
---

# Laravel پشت Nginx

## مقدمه

Laravel روی `app-1.example.internal` در `/opt/apps/laravel` می‌نشیند و فقط پوشهٔ `public` از راه وب دیده می‌شود. php-fpm استخر `app` با کاربر `deploy` است که در [PHP-FPM](/docs/06-nginx/php-fpm) ساخته شده. صف و زمان‌بند در [فصل استقرار](/docs/08-deployment/laravel) هستند و داخل Nginx اجرا نمی‌شوند. اگر worker صف را فراموش کنید سایت ممکن است باز هم صفحه بدهد و کار پس‌زمینه نرود؛ این صفحه آن را حل نمی‌کند، فقط درِ HTTP را درست می‌کند.

لبه `10.10.1.5` نام `app.example.com` را تمام می‌کند. Nginx این صفحه روی `10.10.1.10:8080` است. قبل از نوشتن مسیر سوکت، `ls /run/php` را بزنید و مطمئن شوید `php8.5-fpm-app.sock` واقعاً آنجاست.

## مفهوم اصلی

درخت Laravel فایل `.env`، پوشهٔ `vendor` و `storage` را کنار `public` دارد. اگر `root` را `/opt/apps/laravel` بگذارید، یک درخواست به `/.env` ممکن است فایل محیط را به عنوان متن برگرداند و یک درخواست به مسیر php داخل `vendor` ممکن است به فست‌سی‌جی‌آی برسد. Nginx مسیر `..` را قبل از نگاشت به دیسک جمع می‌کند، ولی این کافی نیست وقتی خود ریشه اشتباه است.

`root` برابر `/opt/apps/laravel/public` است. `try_files` اول فایل را می‌جوید، بعد دایرکتوری را، و اگر هیچ‌کدام نبود درخواست را به `/index.php` می‌سپارد و رشتهٔ پرس‌وجو را نگه می‌دارد. `index.php` تنها فایلی است که به سوکت می‌رود. هر URI دیگر که به `.php` ختم شود ۴۰۴ است، حتی اگر کسی فایل php را داخل `public` کپی کرده باشد. اسکریپت‌های `vendor` اصلاً زیر ریشه نیستند و از وب قابل انتخاب نیستند.

`autoindex` خاموش است. پوشهٔ بی‌ایندکس کد ۴۰۳ می‌گیرد نه فهرست فایل. پیوند `public/storage` که `artisan storage:link` می‌سازد به `storage/app/public` اشاره می‌کند و Nginx به‌طور پیش‌فرض پیوند را دنبال می‌کند. آن پوشه مخصوص فایل عمومی است و باید برای `www-data` خوانا باشد. `storage/logs` و `.env` نباید از این پیوند قابل دیدن باشند و مجوزشان این را جداگانه می‌بندد.

## چرا استفاده می‌شود؟

یک برنامهٔ Laravel که با `php artisan serve` روی پورت ۸۰۰۰ بالا آمده برای تولید نیست: تک‌نخی است، TLS ندارد، و با بستن نشست می‌میرد. Nginx فایل ثابت `public` را مستقیم می‌دهد و فقط مسیرهای پویا را به php-fpm می‌فرستد. این همان مرزی است که بقیهٔ فصل برای Node هم گذاشت، با این فرق که اینجا بخشی از درخت واقعاً باید از دیسک خوانده شود.

بستن اجرای php بیرون از `index.php` ارزان‌ترین دفاع در برابر اسکریپت جا مانده است. تکیه بر «کسی URL را نمی‌داند» دفاع نیست. مسیرهای قدیمی ابزار تست داخل `vendor` اگر ریشه غلط باشد خطرناک‌اند؛ با ریشهٔ `public` آن URL اصلاً به فایل نمی‌رسد و اگر هم فایل php دیگری زیر `public` باشد، location دوم آن را اجرا نمی‌کند.

## Architecture

```text
https://app.example.com
        │
        ▼
10.10.1.5
        │
        ▼
10.10.1.10:8080
  root /opt/apps/laravel/public
        │
        ├─ فایل واقعی در public     → دیسک، کاربر خواندن www-data
        ├─ هیچ فایلی نیست           → /index.php
        ├─ دقیقاً /index.php        → سوکت php8.5-fpm-app.sock
        └─ هر .php دیگر             → 404

/opt/apps/laravel/.env              از این root دیده نمی‌شود
/opt/apps/laravel/vendor            از این root دیده نمی‌شود
صف و schedule                       فرایند جدا، نه location
```

## Installation

Nginx و php-fpm و استخر `app` باید مطابق صفحهٔ PHP بالا باشند. کد را کاربر `deploy` مالک است. این صفحه مخزن را کلون نمی‌کند؛ فرض این است که درخت در `/opt/apps/laravel` نشسته و `public/index.php` وجود دارد. استقرار خود برنامه، از جمله `composer` و صف، در فصل استقرار است.

سوکت را ببینید و بعد فایل Nginx را بنویسید:

```bash
ls -l /run/php
test -f /opt/apps/laravel/public/index.php && echo public-ok
```

اگر `public-ok` نیست، ریشه را به پوشهٔ بالاتر عوض نکنید تا «سایت باز شود». استقرار ناقص است و باید همان را درست کنید.

## Configuration

`/etc/nginx/sites-available/app.conf` روی `10.10.1.10`:

```nginx
server {
    listen 10.10.1.10:8080;
    server_name app.example.com;
    root /opt/apps/laravel/public;
    index index.php;
    client_max_body_size 20m;

    access_log /var/log/nginx/app.example.com.access.log;
    error_log  /var/log/nginx/app.example.com.error.log warn;

    add_header X-Content-Type-Options nosniff always;
    add_header X-Frame-Options SAMEORIGIN always;
    add_header Referrer-Policy strict-origin-when-cross-origin always;

    location / {
        try_files $uri $uri/ /index.php?$query_string;
    }

    location = /index.php {
        include fastcgi_params;
        fastcgi_param SCRIPT_FILENAME $realpath_root$fastcgi_script_name;
        fastcgi_pass unix:/run/php/php8.5-fpm-app.sock;
        fastcgi_read_timeout 60s;
        fastcgi_hide_header X-Powered-By;
    }

    location ~ \.php$ {
        return 404;
    }

    location ~ /\.(?!well-known) {
        deny all;
    }

    location ~* \.(?:env|ini|log|sh|sql|bak)$ {
        deny all;
    }
}
```

اولویت location این را تضمین می‌کند: `/index.php` با تطبیق دقیق می‌رود به فست‌سی‌جی‌آی، حتی با وجود عبارت `.php`. هر php دیگر به عبارت دوم می‌افتد و ۴۰۴ می‌شود. فایل مخفی، جز مسیر `/.well-known/` که برای اثبات مالکیت گواهی لازم است، رد می‌شود. پسوندهای پشتیبان حتی اگر داخل `public` کپی شده باشند متن‌شان برنمی‌گردد.

`try_files` با `$uri/` دایرکتوری را هم قبول می‌کند. `autoindex` را روشن نکنید. اگر دایرکتوری ایندکس نداشته باشد پاسخ ۴۰۳ است و این بهتر از فهرست است.

مجوز را طوری بگذارید که Nginx فقط `public` و فایل عمداً عمومی را بخواند و PHP که با `deploy` اجرا می‌شود `.env` را بخواند:

```bash
sudo chown -R deploy:deploy /opt/apps/laravel
sudo find /opt/apps/laravel -type d -exec chmod 755 {} \;
sudo find /opt/apps/laravel -type f -exec chmod 644 {} \;
sudo chmod 640 /opt/apps/laravel/.env
sudo chmod 750 /opt/apps/laravel/storage/logs /opt/apps/laravel/storage/framework
sudo find /opt/apps/laravel/storage/app/public -type d -exec chmod 755 {} \;
sudo find /opt/apps/laravel/storage/app/public -type f -exec chmod 644 {} \;
```

`storage` و `bootstrap/cache` باید برای `deploy` نوشتنی بمانند. اگر `chmod 644` روی فایل لاگ، نوشتن را از خود کاربر گرفته، مالک هنوز `deploy` است و بیت مالک را برگردانید:

```bash
sudo chmod -R u+rwX /opt/apps/laravel/storage /opt/apps/laravel/bootstrap/cache
```

## Production Example

```bash
sudo ln -sfn /etc/nginx/sites-available/app.conf /etc/nginx/sites-enabled/app.conf
sudo rm -f /etc/nginx/sites-enabled/default
sudo nginx -t && sudo systemctl reload nginx
curl -fsS -H "Host: app.example.com" -o /dev/null -w "%{http_code}\n" http://10.10.1.10:8080/
curl -s -o /dev/null -w "%{http_code}\n" -H "Host: app.example.com" http://10.10.1.10:8080/.env
curl -s -o /dev/null -w "%{http_code}\n" -H "Host: app.example.com" http://10.10.1.10:8080/vendor/autoload.php
curl -s -o /dev/null -w "%{http_code}\n" -H "Host: app.example.com" http://10.10.1.10:8080/index.php
```

خانه باید ۲۰۰ یا ۳۰۲ خود Laravel باشد، نه فهرست پوشه. `/.env` و `/vendor/autoload.php` باید ۴۰۴ باشند. `index.php` را برنامه جواب می‌دهد؛ ۴۰۴ برای خود `index.php` یعنی `fastcgi_pass` به آن location نرسیده است.

اگر `storage:link` را زده‌اید، یک فایل آزمایشی داخل `storage/app/public` از راه `/storage/...` باید خوانده شود و یک فایل داخل `storage/logs` نباید از راه وب اسم داشته باشد. لاگ را زیر `public` کپی نکنید.

صف و `schedule:run` را این‌جا بالا نیاورید. بعد از اینکه HTTP سالم بود، صفحهٔ استقرار Laravel همان میزبان را کامل می‌کند. بدون آن، job در جدول می‌ماند و این کانفیگ همچنان «درست» به نظر می‌رسد.

## Security Notes

`APP_DEBUG` در تولید باید خاموش باشد. Nginx صفحهٔ استثنای Laravel را زیباتر نمی‌کند؛ اگر دیباگ روشن باشد همان صفحه مسیر و گاهی متغیر را نشان می‌دهد و هدر `nosniff` جلوی آن را نمی‌گیرد. خاموش کردنش کار استقرار است و بعد از تغییر `.env` باید کش پیکربندی برنامه تازه شود.

ریشه را حتی موقتاً برای عیب‌یابی به `/opt/apps/laravel` نبرید. همان پنج دقیقه کافی است که یک اسکنر `/.env` را بردارد. اگر فایل استاتیک ۴۰۴ است، مسیر `public` و مجوز را درست کنید.

`.env` با حالت ۶۴۰ و مالک `deploy` یعنی `www-data` از راه دیسک هم آن را نمی‌خواند، حتی اگر یک alias غلط اضافه شود. این جایگزین `root` درست نیست؛ هر دو را می‌خواهیم.

فایل `server.php` در ریشهٔ بعضی نسخه‌های قدیمی پروژه گاهی برای سرور داخلی PHP استفاده می‌شد. زیر `public` نیست و با این کانفیگ اجرا نمی‌شود. آن را به `public` منتقل نکنید.

## Troubleshooting

۵۰۲ فقط روی مسیرهای پویا، در حالی که فایل css زیر `public` باز می‌شود: سوکت php-fpm. `ls -l /run/php` و خط `fastcgi_pass`. فایل ثابت اصلاً به PHP نمی‌رود و سالم بودنش اثبات Nginx است نه اثبات استخر.

۴۰۴ روی همهٔ مسیرهای قشنگ Laravel، و فقط `/index.php` کار می‌کند: `try_files` نیست یا `location /` به یک `return` قدیمی از آزمون دود هنوز هست. `nginx -T` را ببینید. یک `return 200` جا مانده کل برنامه را سایه می‌زند.

۴۰۳ روی `/` اغلب یعنی `public` برای `www-data` قابل ورود نیست. `namei -l /opt/apps/laravel/public` باید روی همهٔ دایرکتوری‌های مسیر بیت اجرا برای دیگران یا برای گروه Nginx داشته باشد. `chmod 700` روی `/opt/apps` همین علامت را می‌دهد.

۵۰۰ از خود Laravel با بدنهٔ برنامه: Nginx کارش را کرده. لاگ `/opt/apps/laravel/storage/logs` و `journalctl` واحد php-fpm را ببینید. مجوز نوشتن `storage` و `bootstrap/cache` پرتکرارترین علت بلافاصله بعد از کلون است.

اگر `/.env` کد ۲۰۰ و متن کلید داد، `root` غلط است یا یک کپی از `.env` داخل `public` مانده. کانفیگ این صفحه را برگردانید، کپی را پاک کنید، و رمزهایی که در آن فایل بود را عوض کنید. پاک کردن فایل بعد از نشت، به‌تنهایی کافی نیست.

`client intended to send too large body` یعنی آپلود از ۲۰ مگابایت گذشته. حد PHP در استخر هم ۲۰ مگابایت است. هر دو را با هم تغییر دهید.

## Best Practices

- `root` فقط `public`. مسیر پروژه را ریشهٔ وب نکنید.
- `try_files` به `index.php` با حفظ پرس‌وجو. فقط تطبیق دقیق همان فایل به سوکت برود.
- هر `.php` دیگر ۴۰۴. پسوند پشتیبان و فایل مخفی رد شوند، با استثنای `well-known`.
- قبل از قفل کردن مسیر سوکت، `ls /run/php`.
- صف و زمان‌بند را در [استقرار Laravel](/docs/08-deployment/laravel) روشن کنید. بالا بودن صفحه دلیل بر اجرای job نیست.
- دیباگ برنامه در تولید خاموش باشد و `.env` حالت ۶۴۰ بماند.
