---
title: PHP-FPM
sidebar_position: 9
description: "PHP 8.5 با سوکت جدا، استخر www کنار استخر deploy، و pm محافظه‌کارانه روی میزبان برنامه."
---

# PHP-FPM

## مقدمه

PHP در این دانشنامه داخل Nginx اجرا نمی‌شود. php-fpm یک سرویس جداست و Nginx فقط فایل `.php` را که مجاز است به سوکت یونیکس می‌فرستد. نسخهٔ آزمایشگاه PHP 8.5 از مخزن Ubuntu 26.04 است. نام سوکت پیش‌فرض بسته معمولاً `/run/php/php8.5-fpm.sock` است، ولی قبل از نوشتن آن در کانفیگ باید روی خود میزبان دیده شود. مسیر را از حافظه کپی نکنید.

میزبان برنامه `10.10.1.10` است. لبهٔ `10.10.1.5` هنوز TLS و نام `app.example.com` را دارد و به Nginx محلی این میزبان وصل می‌شود. سوکت php-fpm فقط روی همان میزبان است و هرگز به شبکه وصل نمی‌شود. پیش‌فرض دانشنامه Nginx است. استقرار مقایسه‌ای با Apache جای دیگری است: [PHP با Apache و Nginx](/docs/08-deployment/php-apache-nginx).

## مفهوم اصلی

بسته یک استخر به نام `www` می‌سازد که با کاربر `www-data` اجرا می‌شود و به سوکت `php8.5-fpm.sock` گوش می‌دهد. آن استخر برای یک صفحهٔ تصادفی روی سرور تازه راحت است و برای برنامهٔ تولید غلط است: کد برنامه نباید با همان کاربری باشد که فایل‌های استاتیک Nginx را می‌خواند، و یک استخر مشترک بین دو برنامه یعنی یکی می‌تواند فایل آن دیگری را بخواند.

استخر برنامه نامش `app` است، کاربر و گروهش `deploy` است، و سوکت جدا دارد: `/run/php/php8.5-fpm-app.sock`. مالک سوکت `www-data` می‌ماند تا worker از Nginx بتواند وصل شود. خود اسکریپت با `deploy` اجرا می‌شود تا فایل `/opt/apps` را که مالکیتش با `deploy` است بخواند. این دو هویت را یکی نکنید.

`pm` مدل فرایند است. `dynamic` چند فرایند آماده نگه می‌دارد تا درخواست اول منتظر `fork` نماند. `ondemand` فرایند را با درخواست می‌سازد و بعد از بیکاری می‌کشد؛ RAM کمتر، تأخیر اولین درخواست بیشتر. برنامهٔ رو به کاربر `dynamic` می‌ماند. یک ابزار کم‌ترافیک را می‌شود `ondemand` گذاشت، با سوکت دیگر، نه به‌جای استخر اصلی.

عددها برای یک میزبان برنامه با حدود دو گیگابایت RAM است که دیتابیس روی `10.10.1.20` است نه روی همین جعبه. هر فرزند PHP در عمل اغلب چند ده مگابایت است و سقف `memory_limit` صد و بیست و هشت مگابایت است. `pm.max_children = 8` بدترین حالت را دور نیم تا یک گیگابایت نگه می‌دارد تا سیستم‌عامل و Nginx جا داشته باشند. این عدد محافظه‌کارانه است چون هشت درخواست همزمان سنگین را قبول می‌کنیم و نهمین نفر منتظر می‌ماند، به‌جای اینکه OOM قاتل، همه را با هم بکشد. `pm.start_servers = 2` و `pm.min_spare_servers = 1` و `pm.max_spare_servers = 3` داخل همان سقف هستند. اگر حداقل بیکار از حداکثر بیکار بیشتر باشد، php-fpm اصلاً بالا نمی‌آید.

## چرا استفاده می‌شود؟

چسباندن PHP به Nginx با ماژول تعبیه‌شده مال این بسته نیست و در این دانشنامه هم الگو نیست. سوکت یونیکس مجوز فایل دارد و از پورت TCP که اشتباهی روی `0.0.0.0` باز بماند امن‌تر است. استخر جدا یعنی می‌توانید برنامه را ری‌استارت کنید بدون استخر پیش‌فرض، و برعکس.

`www` را خاموش می‌کنیم تا یک سایت که هنوز سوکت قدیمی را دارد، بی‌صدا با `www-data` بالا نیاید و هم‌زمان RAM را دو بار مصرف نکند. تا وقتی `ls` سوکت app را نشان نداده، Nginx را به آن مسیر اشاره ندهید؛ خطای ۵۰۲ فوری است و شبیه باگ برنامه است.

## Architecture

```text
لبه 10.10.1.5
        │
        ▼
Nginx روی 10.10.1.10
        │  fastcgi فقط location دقیق index یا فایل مجاز
        ▼
سوکت /run/php/php8.5-fpm-app.sock
        │  مالک سوکت www-data، فرایندها deploy
        ▼
استخر app   pm=dynamic   حداکثر ۸ فرزند
استخر www   فایلش کنار گذاشته شده
```

مسیر واحد و استخر:

```text
/etc/php/8.5/fpm/php.ini
/etc/php/8.5/fpm/pool.d/www.conf          بعد از این صفحه بارگذاری نمی‌شود
/etc/php/8.5/fpm/pool.d/app.conf
/run/php/php8.5-fpm-app.sock
```

## Installation

```bash
sudo apt update
sudo apt install php8.5-fpm php8.5-cli php8.5-mysql php8.5-xml php8.5-mbstring php8.5-curl php8.5-zip
sudo systemctl enable --now php8.5-fpm
ls -l /run/php
php8.5 -v
```

خروجی `ls` را بخوانید قبل از هر ویرایش Nginx. شکل سالم بعد از نصب اولیه یک سوکت `php8.5-fpm.sock` است. اگر نام چیز دیگری بود، همان نام واقعی را در کانفیگ بگذارید و این صفحه را خط‌به‌خط کورکورانه کپی نکنید. `php8.5 -v` باید شاخهٔ 8.5 را نشان بدهد. شمارهٔ patch مال آرشیو همان روز است.

کاربر برنامه اگر نیست:

```bash
id deploy || sudo adduser --disabled-password --gecos "" --home /home/deploy deploy
sudo usermod -s /usr/sbin/nologin deploy
```

## Configuration

اول سوکت را ببینید. این فرمان را هر بار که واحد php-fpm را تازه کرده‌اید تکرار کنید، نه فقط روز نصب:

```bash
ls -l /run/php
```

فایل `/etc/php/8.5/fpm/pool.d/app.conf` استخر تولید است:

```ini
[app]
user = deploy
group = deploy
listen = /run/php/php8.5-fpm-app.sock
listen.owner = www-data
listen.group = www-data
listen.mode = 0660
pm = dynamic
pm.max_children = 8
pm.start_servers = 2
pm.min_spare_servers = 1
pm.max_spare_servers = 3
pm.max_requests = 500
request_terminate_timeout = 60s
request_slowlog_timeout = 5s
slowlog = /var/log/php8.5-fpm-app.slow.log
chdir = /opt/apps
security.limit_extensions = .php
php_admin_value[memory_limit] = 128M
php_admin_value[upload_max_filesize] = 20M
php_admin_value[post_max_size] = 20M
php_admin_flag[expose_php] = off
```

`pm.max_requests = 500` فرزند را بعد از پانصد درخواست عوض می‌کند تا نشت آرام حافظهٔ یک افزونه، فرایند را تا ابد بزرگ نکند. `request_terminate_timeout` درخواست گیرکرده را می‌کشد. صفر یعنی بی‌نهایت و در تولید نمی‌گذاریم. اگر یک گزارش معلوم بیشتر از شصت ثانیه طول می‌کشد، فقط همان مسیر را در برنامه جدا کنید، نه اینکه تایم‌اوت کل استخر را بردارید.

استخر کم‌ترافیک، اگر واقعاً ابزار دومی دارید، فایل جدا با سوکت جدا است. آن را به‌جای `app` فعال نکنید:

```ini
[toolbox]
user = deploy
group = deploy
listen = /run/php/php8.5-fpm-toolbox.sock
listen.owner = www-data
listen.group = www-data
listen.mode = 0660
pm = ondemand
pm.max_children = 2
pm.process_idle_timeout = 10s
security.limit_extensions = .php
php_admin_value[memory_limit] = 128M
php_admin_flag[expose_php] = off
```

`ondemand` اینجا حداکثر دو فرزند دارد چون ابزار داخلی نباید همان هشت جایگاه برنامهٔ اصلی را هم اشغال کند. ده ثانیه بیکاری فرایند را جمع می‌کند. برای `app.example.com` از این حالت استفاده نکنید؛ کاربر اول بعد از سکوت، بهای ساخت فرایند را می‌دهد.

استخر `www` را از دور خارج کنید تا فقط یک مدل اجرا بماند:

```bash
sudo mv /etc/php/8.5/fpm/pool.d/www.conf /etc/php/8.5/fpm/pool.d/www.conf.disabled
sudo systemctl reload php8.5-fpm
ls -l /run/php
```

بعد از reload باید `php8.5-fpm-app.sock` را ببینید و سوکت `www` باید رفته باشد. اگر هر دو ماندند، فایل `www.conf` هنوز پسوند `.conf` دارد.

Nginx همان میزبان، فقط بعد از `ls`. فایل سایت برنامه:

```nginx
server {
    listen 10.10.1.10:8080;
    server_name app.example.com;
    root /opt/apps/php-app;
    index index.php;
    client_max_body_size 20m;

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
}
```

`include fastcgi_params` متغیر `SCRIPT_FILENAME` را نمی‌گذارد. خط بعد از include آن را می‌سازد. اگر این خط نباشد، php-fpm فایل را پیدا نمی‌کند و پاسخ خالی یا ۴۰۴ از خود PHP می‌آید در حالی که Nginx ۲۰۰ داده است. `location = /index.php` فقط درِ ورود است. هر php دیگر ۴۰۴ می‌شود تا یک فایل پشتیبان یا یک اسکریپت جا مانده اجرا نشود. Laravel این قاعده را در [صفحهٔ خودش](/docs/06-nginx/laravel) سخت‌تر هم می‌کند، چون ریشه باید `public` باشد.

`fastcgi_read_timeout` با `request_terminate_timeout` یکی است تا Nginx و php-fpm دو داستان مختلف از «گیر کردن» نگویند.

## Production Example

یک فایل موقت برای اثبات استخر، نه برای ماندن:

```bash
sudo mkdir -p /opt/apps/php-app
sudo tee /opt/apps/php-app/index.php >/dev/null <<'EOF'
<?php
header('Content-Type: text/plain; charset=utf-8');
echo 'ok ' . PHP_VERSION . PHP_EOL;
EOF
sudo chown -R deploy:deploy /opt/apps/php-app
sudo find /opt/apps/php-app -type d -exec chmod 755 {} \;
sudo find /opt/apps/php-app -type f -exec chmod 644 {} \;
sudo ln -sfn /etc/nginx/sites-available/app.conf /etc/nginx/sites-enabled/app.conf
sudo rm -f /etc/nginx/sites-enabled/default
sudo nginx -t && sudo systemctl reload nginx
curl -fsS -H "Host: app.example.com" http://10.10.1.10:8080/
```

بدنه باید با `ok 8.5` شروع شود. اگر `www-data` در خروجی یک `phpinfo` قدیمی دیدید، هنوز دارید به سوکت `www` می‌روید. `phpinfo` را روی این میزبان جا نگذارید؛ فهرست ماژول و مسیر فایل را به هر کسی که URL را بزند نشان می‌دهد. همان فایل آزمون بالا کافی است و بعد از اثبات می‌تواند بماند فقط اگر چیز محرمانه‌ای چاپ نکند. نسخهٔ PHP محرمانه نیست، ولی مسیر خانگی و متغیر محیط چرا.

از لبه، وقتی پروکسی به `10.10.1.10:8080` اشاره کند، `curl https://app.example.com/` همان بدنه را می‌دهد. سوکت را از `10.10.1.5` با `ls` نخواهید؛ آنجا `/run/php` مال پروکسی است و خالی بودنش طبیعی است.

## Security Notes

`listen.mode = 0660` و گروه `www-data` یعنی فقط worker وب به سوکت وصل می‌شود. `0666` هر کاربر محلی را به php-fpm می‌رساند. آن را برای «رفع ۵۰۲» باز نکنید؛ ۵۰۲ معمولاً سوکت غلط یا استخر مرده است.

`php_admin_value` را برنامه با `ini_set` عوض نمی‌کند. سقف حافظه و آپلود را اینجا بگذارید تا یک اسکریپت خطادار آن را برندارد. `expose_php = off` هدر `X-Powered-By` را از خود PHP برمی‌دارد و `fastcgi_hide_header` اگر جایی هنوز آمده باشد آن را در Nginx هم می‌اندازد.

کاربر `deploy` شل تعاملی ندارد. استقرار با `sudo -u deploy` از حساب `ops` انجام می‌شود. php-fpm برای اجرا به شل ورود نیاز ندارد.

استخر `www` را فقط با تغییر نام از `pool.d` خارج کردیم تا فایل بسته حفظ شود. آن را دوباره `.conf` نکنید مگر سایت مشخصی واقعاً به `www-data` نیاز داشته باشد و جدا بودنش را قبول کرده باشید.

## Troubleshooting

سوکت در `ls` نیست:

```bash
systemctl status php8.5-fpm --no-pager
sudo journalctl -u php8.5-fpm -n 40 --no-pager
sudo php-fpm8.5 -t
```

خطای پرتکرار عدد pm این است که `start_servers` بیرون بازهٔ spare است. پیام journal صریح می‌گوید کدام مقدار غلط است. سرویس بالا نمی‌آید و Nginx همان لحظه ۵۰۲ می‌دهد. عددهای این صفحه را برگردانید و reload کنید.

۵۰۲ با این خط در error log از Nginx:

```text
connect() to unix:/run/php/php8.5-fpm-app.sock failed (2: No such file or directory)
```

یا مسیر را قبل از دیدن `ls` نوشته‌اید، یا استخر crash کرده و سوکت را با خودش برده. `ls -l /run/php` دوباره.

```text
connect() to unix:/run/php/php8.5-fpm-app.sock failed (13: Permission denied)
```

`listen.owner` گروه Nginx نیست. `www-data` را برگردانید و `systemctl reload php8.5-fpm`. با `chmod 777` درستش نکنید.

اگر پاسخ ۲۰۰ است و بدنه خالی است، `SCRIPT_FILENAME` نرسیده. `include fastcgi_params` باید قبل از خط `fastcgi_param SCRIPT_FILENAME` باشد تا خط شما برنده شود.

اگر سایت هنوز با کاربر `www-data` فایل می‌سازد، سوکت `app` در Nginx نیست. `sudo nginx -T` را برای `fastcgi_pass` بگردید.

کندی متناوب با رشد حافظه: `pm.max_requests` را کم نکنید تا «ری‌استارت کمتر شود». لاگ آهسته در `/var/log/php8.5-fpm-app.slow.log` درخواست بالای پنج ثانیه را نشان می‌دهد. آن URL را در برنامه درست کنید. بالا بردن `max_children` روی جعبهٔ دو گیگابایتی فقط OOM را جلو می‌اندازد.

## Best Practices

- قبل از سفت کردن مسیر در Nginx، `ls /run/php` را روی همان میزبان ببینید.
- استخر `www` را از بارگذاری خارج کنید و برنامه را با `deploy` و سوکت جدا اجرا کنید.
- برنامهٔ عمومی `dynamic` با سقف ۸ روی میزبان کوچک. `ondemand` فقط برای ابزار کم‌ترافیک با سوکت دیگر.
- فقط `index.php` به فست‌سی‌جی‌آی برود. بقیهٔ `.php` کد ۴۰۴ بگیرند.
- سقف حافظه و آپلود را `php_admin_value` بگذارید و با `client_max_body_size` یکی نگه دارید.
- سوکت را TCP و روی `0.0.0.0` نکنید.
