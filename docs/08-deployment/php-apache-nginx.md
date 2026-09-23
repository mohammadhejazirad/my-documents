---
title: PHP با Apache و Nginx
sidebar_position: 4
description: "یک برنامهٔ PHP ساده پشت Apache و پشت Nginx با PHP-FPM، و دلیل انتخاب فقط یکی در تولید."
---

# PHP با Apache و Nginx

## مقدمه

این صفحه هر دو وب‌سرور را روی Ubuntu 26.04 با PHP 8.5 نشان می‌دهد تا فرق‌شان روی یک فایل `index.php` دیده شود. پیش‌فرض دانشنامه Nginx است. Apache اینجا جایگزین است برای برنامه‌ای که واقعاً به آن نیاز دارد، نه وب‌سرور دوم کنار Nginx. هر دو نمی‌توانند همزمان مالک پورت ۸۰ باشند.

میزبان `10.10.1.10` است. لبهٔ `10.10.1.5` و نام `app.example.com` اگر Nginx را انتخاب کنید از فصل Nginx می‌آیند. سوکت php-fpm را قبل از نوشتن در هر کدام از دو کانفیگ با `ls /run/php` ببینید. استخر جدا با کاربر `deploy` در [PHP-FPM](/docs/06-nginx/php-fpm) است. این صفحه برای مقایسه از همان سوکت پیش‌فرض بسته استفاده می‌کند تا مثال کوتاه بماند، و در تولید همان استخر `deploy` را جایگزین این سوکت می‌کنید.

## مفهوم اصلی

PHP-FPM یک سرویس است و هر دو وب‌سرور می‌توانند به سوکتش وصل شوند. `libapache2-mod-php8.5` مدل دیگری است: PHP داخل خود فرایند Apache است، فایل `php.ini` جدا زیر `/etc/php/8.5/apache2/` دارد، و با استخری که Nginx استفاده می‌کند یکی نیست. این صفحه آن ماژول را نصب نمی‌کند تا یک `php.ini` و یک سوکت داشته باشیم.

Apache پیکربندی سایت را در `/etc/apache2/sites-available` می‌گذارد و با `a2ensite` به `sites-enabled` پیوند می‌کند. آزمون نحوش `apache2ctl configtest` است و reload با `systemctl reload apache2`. Nginx را [فصل خودش](/docs/06-nginx) توضیح داده است. اینجا فقط همان سایت PHP را کنار Apache می‌گذاریم تا انتخاب با چشم باشد نه با عادت.

تولید یکی را برمی‌دارد چون دو سرور یعنی دو جا برای TLS، دو قالب لاگ، دو مجموعه هدر، و یک پورت که بالاخره مال یکی است. بقیهٔ این دانشنامه نرخ، کش و لبهٔ Docker را برای Nginx نوشته است. Apache را وقتی نگه دارید که برنامه به فایل `.htaccess` زنده وابسته است و فرصت تبدیل آن قاعده‌ها را ندارید. در غیر این صورت Nginx و php-fpm.

## چرا استفاده می‌شود؟

تیم گاهی سروری را تحویل می‌گیرد که Apache از قبل روی آن است. بدون دیدن هر دو، مهاجرت یا «هر دو را روشن بگذاریم» از روی ترس انجام می‌شود. این صفحه هر دو را تا یک پاسخ `ok` و نسخهٔ PHP می‌برد و بعد یکی را خاموش می‌کند. مقایسه روی `phpinfo()` نیست. آن تابع نقشهٔ ماژول و مسیر را به هر بازدیدکننده نشان می‌دهد و فقط چند ثانیه برای عیب‌یابی مجاز است، بعد فایلش باید پاک شود. اثبات کار، یک `index.php` کوتاه است.

## Architecture

```text
انتخاب تولید: فقط یک شاخه

شاخهٔ Nginx (پیش‌فرض)
  10.10.1.5 لبه
       │
       ▼
  Nginx 10.10.1.10:8080
       │
       ▼
  php-fpm  /run/php/php8.5-fpm.sock

شاخهٔ Apache (جایگزین)
  Apache :80 روی همان میزبان
       │
       ▼
  همان php-fpm
  پورت 80 دیگر مال Nginx نیست
```

فایل برنامه در هر دو شاخه یکی است: `/var/www/php-app/index.php`. در تولید واقعی مسیر `/opt/apps` و کاربر `deploy` است. اینجا مسیر `www` فقط برای این است که بستهٔ Apache همان را می‌شناسد و مقایسه شلوغ نشود.

## Installation

سوکت را ببینید، بعد یکی از دو وب‌سرور را نصب کنید. اگر می‌خواهید هر دو را در آزمایش ببینید، اول Apache را تمام کنید، سرویس را خاموش کنید، بعد Nginx را روی همان پورت یا روی ۸۰۸۰ بالا بیاورید. همزمان `enable` نکنید.

```bash
sudo apt update
sudo apt install php8.5-fpm
sudo systemctl enable --now php8.5-fpm
ls -l /run/php
```

نام سوکت را از خروجی بردارید. ادامه فرض می‌کند `php8.5-fpm.sock` همانی است که `ls` نشان داده. اگر نیست، هر دو کانفیگ پایین را با نام واقعی عوض کنید.

شاخهٔ Apache:

```bash
sudo apt install apache2
sudo a2enmod proxy_fcgi
sudo a2dismod php8.5 || true
sudo a2disconf php8.5-fpm || true
sudo a2dissite 000-default
```

`a2dismod` اگر ماژول اصلاً نصب نباشد خطا می‌دهد و `|| true` اجازه می‌دهد ادامه دهید. هدف این است که PHP تعبیه‌شده در Apache روشن نماند.

شاخهٔ Nginx:

```bash
sudo apt install nginx
sudo rm -f /etc/nginx/sites-enabled/default
```

## Configuration

فایل برنامه:

```bash
sudo mkdir -p /var/www/php-app
sudo tee /var/www/php-app/index.php >/dev/null <<'EOF'
<?php
header('Content-Type: text/plain; charset=utf-8');
echo 'ok ' . PHP_VERSION . PHP_EOL;
EOF
sudo chown -R deploy:www-data /var/www/php-app
sudo find /var/www/php-app -type d -exec chmod 755 {} \;
sudo find /var/www/php-app -type f -exec chmod 644 {} \;
```

اگر کاربر `deploy` هنوز وجود ندارد، مالک را موقتاً `www-data:www-data` بگذارید. در تولید مالک `deploy` است، مطابق صفحهٔ PHP-FPM.

سایت Apache در `/etc/apache2/sites-available/app.conf`:

```bash
sudo tee /etc/apache2/sites-available/app.conf >/dev/null <<'EOF'
<VirtualHost *:80>
    ServerName app.example.com
    DocumentRoot /var/www/php-app
    DirectoryIndex index.php
    <Directory /var/www/php-app>
        Require all granted
        FallbackResource /index.php
    </Directory>
    <FilesMatch "\.php$">
        SetHandler "proxy:unix:/run/php/php8.5-fpm.sock|fcgi://localhost"
    </FilesMatch>
    ErrorLog /var/log/apache2/app-error.log
    CustomLog /var/log/apache2/app-access.log combined
</VirtualHost>
EOF
```

`FallbackResource` نزدیک‌ترین معادل `try_files` برای فرستادن مسیرهای برنامه به `index.php` است. `FilesMatch` همهٔ phpها را به سوکت می‌فرستد. این برای مقایسه کافی است و از نظر امنیتی شل‌تر از کانفیگ Laravel دانشنامه است که فقط `index.php` را اجرا می‌کند. اگر همین Apache را در تولید نگه داشتید، اجرای هر فایل php زیر ریشه را دوباره محدود کنید.

سایت Nginx در `/etc/nginx/sites-available/app.conf`:

```nginx
server {
    listen 80;
    server_name app.example.com;
    root /var/www/php-app;
    index index.php;

    location / {
        try_files $uri $uri/ /index.php?$query_string;
    }

    location = /index.php {
        include fastcgi_params;
        fastcgi_param SCRIPT_FILENAME $realpath_root$fastcgi_script_name;
        fastcgi_pass unix:/run/php/php8.5-fpm.sock;
    }

    location ~ \.php$ {
        return 404;
    }
}
```

روی میزبان آزمایش اگر پورت ۸۰ باید مال یکی باشد، دومی را به `listen 10.10.1.10:8080` ببرید تا هر دو را پشت سر هم `curl` کنید. در تولید دومی اصلاً نصب و enable نمی‌شود.

## Production Example

اثبات Apache:

```bash
sudo a2ensite app
sudo apache2ctl configtest
sudo systemctl enable --now apache2
sudo systemctl reload apache2
curl -fsS -H "Host: app.example.com" http://127.0.0.1/
sudo ss -lptn 'sport = :80'
```

بدنه باید با `ok 8.5` شروع شود و `ss` باید `apache2` را نشان بدهد. سپس خاموشش کنید و Nginx را اثبات کنید:

```bash
sudo systemctl disable --now apache2
sudo ln -sfn /etc/nginx/sites-available/app.conf /etc/nginx/sites-enabled/app.conf
sudo nginx -t && sudo systemctl enable --now nginx
sudo systemctl reload nginx
curl -fsS -H "Host: app.example.com" http://127.0.0.1/
sudo ss -lptn 'sport = :80'
```

حالا شنونده باید `nginx` باشد و بدنه همان `ok 8.5`. اگر هنوز Apache را می‌بینید، `disable --now` اجرا نشده یا یک فرایند دستی مانده است.

انتخاب تولید برای `app.example.com` در این دانشنامه Nginx است. Apache را نصب‌شده و خاموش نگه ندارید «شاید به درد خورد»؛ هر ارتقا و هر نفر جدید فرض می‌کند پورت ۸۰ مال همان سرویسی است که enable است. اگر واقعاً Apache را انتخاب می‌کنید، Nginx را disable کنید، لبه را به همان میزبان وصل کنید، و بقیهٔ فصل Nginx را برای هدر و نرخ خودتان ترجمه کنید. آن ترجمه در این صفحه نیست تا دو منبع حقیقت نسازد.

`phpinfo` را اگر برای یک دقیقه ساختید:

```bash
sudo rm -f /var/www/php-app/phpinfo.php /var/www/php-app/info.php
```

و در لاگ دسترسی بگردید که کسی همان دقیقه آن URL را از بیرون نگرفته باشد.

## Security Notes

هر دو سرور را به `0.0.0.0:80` روی میزبان تولید نسپارید. یکی خاموش باشد. گواهی را هم فقط روی همان یکی بگذارید. دو گواهی برای یک نام، تمدید Certbot را به سایتی که خاموش است گره می‌زند.

`index.php` این صفحه نسخهٔ PHP را چاپ می‌کند. این برای آزمایش قبول است و برای سایتی که چیز دیگری هم روی دیسک دارد زیاده‌گویی است. بعد از اثبات، فایل واقعی برنامه را بگذارید و این فایل نمونه را بردارید اگر مخزن برنامه فایل خودش را دارد.

ماژول `php` داخل Apache و php-fpm را با هم برای یک سایت روشن نکنید. دو مفسر با دو `php.ini` باگ «روی لپ‌تاپ من درست بود» می‌سازند. `a2dismod` بالای صفحه برای همین است.

سوکت را بعد از `ls` بنویسید. کپی کردن مسیر از این صفحه به میزبانی که سوکت را جای دیگری ساخته، هر دو سرور را همزمان ۵۰۲ می‌کند و به نظر می‌رسد «PHP خراب است».

## Troubleshooting

`apache2ctl configtest` خطای `Invalid command 'SetHandler'` یا ماژول پروکسی: `sudo a2enmod proxy_fcgi` و دوباره configtest. اگر می‌گوید پورت ۸۰ اشغال است، `ss` را ببینید. اغلب Nginx هنوز `enable` است. یکی را `disable --now` کنید.

پاسخ Apache صفحهٔ پیش‌فرض Debian است نه `ok`: سایت `000-default` هنوز enable است یا `ServerName` با هدر Host نمی‌خواند. `apache2ctl -S` فهرست سایت‌های مؤثر را نشان می‌دهد.

پاسخ Nginx دانلود فایل php به‌صورت متن است: `fastcgi_pass` به آن location نرسیده و PHP داخل Nginx تفسیر نمی‌شود. این علامت کانفیگ است نه علامت اینکه «باید mod_php نصب کنید». location دقیق `index.php` را با `nginx -T` چک کنید.

`File not found` از php-fpm با کد ۲۰۰: `SCRIPT_FILENAME` غلط است. خط `fastcgi_param` باید بعد از `include fastcgi_params` باشد. در Apache اگر همین علامت را دیدید، `DocumentRoot` و مسیر سوکت را با `ls` یکی کنید.

`ls /run/php` خالی است: واحد `php8.5-fpm` بالا نیست. هر دو وب‌سرور در این حالت بی‌فایده‌اند. اول استخر، بعد وب‌سرور.

## Best Practices

- در تولید یک وب‌سرور. پیش‌فرض این دانشنامه Nginx با php-fpm است.
- Apache جایگزین است، با همان php-fpm نه با ماژول تعبیه‌شده، و فقط وقتی `.htaccess` زنده را واقعاً لازم دارید.
- قبل از سخت کردن مسیر سوکت، `ls /run/php`.
- اثبات با `index.php` کوتاه. `phpinfo` را جا نگذارید.
- پورت ۸۰ را با `ss` به نام فرایند ببندید تا بحث «کدام یک جواب داد» حدسی نماند.
- استخر تولید همان استخر `deploy` صفحهٔ PHP-FPM است، نه الزاماً سوکت `www` این مقایسه.
