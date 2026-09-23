---
title: ساختار کانفیگ Nginx
sidebar_position: 3
description: "زمینهٔ events و http و server و location، اولویت انتخاب location، و خاموش کردن سایت پیش‌فرض Ubuntu."
---

# ساختار کانفیگ Nginx

## مقدمه

بستهٔ Nginx که در [نصب](/docs/06-nginx/installation) آمد یک فایل اصلی و یک سایت پیش‌فرض دارد. این صفحه همان فایل را نمی‌نویسد از نو. نشان می‌دهد هر دستور در کدام زمینه معتبر است، Nginx بین چند location کدام را برمی‌دارد، و چرا پیوند `sites-enabled/default` باید حذف شود قبل از اینکه `app.example.com` را جدی بگیرید.

آزمون نحو همیشه `sudo nginx -t` است و اعمالش `sudo systemctl reload nginx`. ری‌استارت فقط وقتی لازم است که خود باینری عوض شده باشد. reload سیگنال را به master می‌دهد، worker تازه کانفیگ جدید را می‌خواند، و worker قدیمی اتصال باز را تمام می‌کند.

## مفهوم اصلی

چهار زمینه تو در تو هستند. دستور را اگر در زمینهٔ غلط بگذارید، `nginx -t` با `directive is not allowed here` شکست می‌خورد، حتی اگر املا درست باشد.

| زمینه | چه چیزی اینجاست | کجا فایلش را می‌گذاریم |
| --- | --- | --- |
| main | `user`، `worker_processes`، `pid` | فقط `nginx.conf` |
| events | `worker_connections` | فقط `nginx.conf` |
| http | `include`، `map`، `gzip`، `limit_req_zone`، `upstream` | `nginx.conf` یا `conf.d` |
| server | `listen`، `server_name`، گواهی | `sites-available` |
| location | `proxy_pass`، `root`، `try_files` | داخل همان server |

`sites-available` خودش خوانده نمی‌شود. `nginx.conf` پوشهٔ `sites-enabled` را include می‌کند و آن پوشه فقط پیوند است. ویرایش فایلی که مستقیم داخل `sites-enabled` ساخته شده، دو منبع حقیقت می‌سازد اگر کسی بعداً از `sites-available` هم لینک کند. قرارداد این دانشنامه: فایل در `sites-available`، پیوند در `sites-enabled`.

انتخاب location برای یک URI این ترتیب را دارد و ترتیب نوشتن بلوک‌ها این قانون را عوض نمی‌کند، جز در عبارت باقاعده:

1. اگر `location =` دقیقاً همان URI باشد، همان برنده است و جستجو تمام می‌شود.
2. بلندترین پیشوند معمولی یادداشت می‌شود. اگر آن پیشوند با `^~` علامت خورده باشد، عبارت باقاعده اصلاً دیده نمی‌شود.
3. عبارت‌های `~` و `~*` به ترتیبی که در فایل آمده‌اند امتحان می‌شوند. اولی که منطبق شود برنده است.
4. اگر هیچ عبارتی منطبق نشود، همان بلندترین پیشوند معمولی برنده است.

`location /` پیشوند همهٔ URIهاست و تقریباً همیشه آخرین پناه است، نه اولین انتخاب. یک `location ~ \.php$` که بالاتر یا پایین‌تر از آن باشد باز هم برای فایل php برنده می‌شود، مگر پیشوند منطبق `^~` داشته باشد.

## چرا استفاده می‌شود؟

بدون این نقشه، هر صفحهٔ بعدی یک تکه کانفیگ است که یا در `server` جا نمی‌شود یا بی‌صدا زیر یک location دیگر می‌رود. حادثهٔ پرتکرار این است که محدودیت نرخ را داخل `server` می‌گذارند در حالی که zone باید در `http` باشد، یا `proxy_cache_path` را داخل `location` می‌گذارند و `-t` رد می‌شود. حادثهٔ دوم این است که سایت پیش‌فرض هنوز `default_server` است و درخواست با Host غلط یا با IP خام، برنامهٔ شما را نشان نمی‌دهد ولی شما فکر می‌کنید کانفیگ جدید بارگذاری نشده است.

خاموش کردن پیش‌فرض یک سلیقه نیست. تا وقتی آن پیوند هست، Ubuntu روی پورت ۸۰ یک `default_server` دارد. اضافه کردن `default_server` دوم خطا می‌دهد. نزدنش یعنی هر درخواستی که `server_name` را جور نکند می‌رود سراغ `/var/www/html`.

## Architecture

شکل فایل اصلی که بسته می‌سازد، بعد از حذف توضیح‌ها. این را جایگزین فایل توزیع نکنید؛ با `grep` همان خط‌ها را در میزبان ببینید و فقط اگر include کامنت شده بود آن را برگردانید.

```nginx
user www-data;
worker_processes auto;
pid /run/nginx.pid;
error_log /var/log/nginx/error.log;

events {
    worker_connections 768;
}

http {
    include /etc/nginx/mime.types;
    default_type application/octet-stream;
    access_log /var/log/nginx/access.log;
    include /etc/nginx/conf.d/*.conf;
    include /etc/nginx/sites-enabled/*;
}
```

`worker_connections 768` مقدار بسته است. برای لبهٔ این آزمایشگاه کافی است. وقتی صف `listen` در `ss` مدام پر می‌شود، آن را بالا ببرید و `worker_rlimit_nofile` را هم در زمینهٔ main ببینید. بی‌دلیل آن را به عددهای پنج‌رقمی نرسانید؛ هر اتصال فایل‌دیسکریپتور می‌گیرد.

جریان انتخاب سایت:

```text
درخواست با Host: app.example.com
        │
        ▼
include sites-enabled/*
        │
        ├─ default   listen 80 default_server     ← باید حذف شود
        └─ app.conf  server_name app.example.com  ← برندهٔ این نام
                │
                ▼
           location مطابق قانون چهارگانه
```

## Installation

این صفحه بسته نصب نمی‌کند. اگر `nginx -t` فرمان را نمی‌شناسد، برگردید به [نصب](/docs/06-nginx/installation). ابزار کار اینجا فقط ویرایشگر و این فرمان‌هاست:

```bash
ls -l /etc/nginx/sites-enabled
sudo rm -f /etc/nginx/sites-enabled/default
sudo mkdir -p /etc/nginx/sites-available /etc/nginx/conf.d
sudo nginx -t && sudo systemctl reload nginx
```

`rm` روی `sites-enabled/default` پیوند را برمی‌دارد. فایل `/etc/nginx/sites-available/default` می‌ماند تا اگر لازم شد مقایسه کنید، ولی دیگر include نمی‌شود. آن فایل را به سایت برنامه ویرایش نکنید. بسته در ارتقا ممکن است فایل `sites-available/default` را عوض کند و تغییر شما یا گم شود یا پرسش dpkg در بیاورد.

اگر میزبان IPv6 ندارد و بعد از هر کانفیگی که `listen [::]:80` دارد `-t` با `Address family not supported by protocol` می‌میرد، فقط خط‌های گوش دادن داخل براکت را از فایل خودتان حذف کنید. این محدودیت کرنل است، نه نسخهٔ 1.28.

## Configuration

سایت پیش‌فرض بسته، در شکل کوتاه، این رفتار را دارد. فایل واقعی توضیح و چند location اضافه دارد؛ این سطرها همان‌هایی هستند که باید از دور خارج شوند:

```nginx
server {
    listen 80 default_server;
    listen [::]:80 default_server;
    server_name _;
    root /var/www/html;
    index index.html index.htm index.nginx-debian.html;
    location / {
        try_files $uri $uri/ =404;
    }
}
```

جای آن، یک پیش‌فرض بسته و یک نام مشخص. فایل `/etc/nginx/sites-available/app.conf` این است. پیش‌فرض جدید `444` برمی‌گرداند تا IP خام صفحهٔ برنامه نشود. سایت نام‌دار هنوز بدنهٔ آزمون است؛ [پروکسی معکوس](/docs/06-nginx/reverse-proxy) آن `return` را برمی‌دارد.

```nginx
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
    default_type text/plain;
    return 200 "ok app.example.com\n";
    access_log /var/log/nginx/app.example.com.access.log;
    error_log /var/log/nginx/app.example.com.error.log warn;

    location = /health {
        access_log off;
        return 200 "healthy\n";
    }

    location ^~ /assets/ {
        root /var/www/app;
        try_files $uri =404;
    }

    location ~* \.(?:png|jpg|jpeg|gif|ico)$ {
        root /var/www/app;
        try_files $uri =404;
    }

    location / {
        return 200 "ok app.example.com\n";
    }
}
```

برای URI برابر `/health` بلوک `=` می‌برد، حتی اگر `/` هم باشد. برای `/assets/app.js` پیشوند `^~ /assets/` می‌برد و عبارت تصویر اصلاً اجرا نمی‌شود. برای `/logo.png` عبارت `~*` می‌برد چون پیشوند `/assets/` منطبق نیست. برای `/` هیچ‌کدام از آن سه نیست و پیشوند `/` می‌ماند. این چهار درخواست را بعد از reload با `curl` امتحان کنید تا قانون از حالت حفظی دربیاید.

`root /var/www/app` در این صفحه فقط برای نشان دادن اولویت است. تا وقتی دایرکتوری و فایل را نساخته‌اید، آن دو location کد ۴۰۴ می‌دهند و این انتظار درست است. برنامهٔ واقعی زیر `/opt/apps` است و در صفحه‌های Node و Laravel `root` عوض می‌شود.

## Production Example

روی `10.10.1.5` پیوند را بسازید و کانفیگ ادغام‌شده را نگاه کنید، نه فقط فایل را:

```bash
sudo ln -sfn /etc/nginx/sites-available/app.conf /etc/nginx/sites-enabled/app.conf
sudo nginx -t && sudo systemctl reload nginx
sudo nginx -T | grep -n "server_name"
curl -s -o /dev/null -w "%{http_code}\n" http://127.0.0.1/health -H "Host: app.example.com"
curl -s -D- -o /dev/null http://127.0.0.1/ -H "Host: wrong.example"
```

درخواست `/health` باید کد ۲۰۰ بدهد. درخواست با Host غلط باید اتصال را ببندد یا از `curl` خطای empty reply بگیرید، چون `return 444` بدنه‌ای نمی‌نویسد. اگر به‌جایش ۲۰۰ و صفحهٔ html پیش‌فرض دیدید، پیوند `default` هنوز هست.

`nginx -T` کانفیگ نهایی بعد از همهٔ includeها را چاپ می‌کند. اگر دستوری که نوشته‌اید در این خروجی نیست، فایلتان در `sites-enabled` نیست یا داخل بلوکی است که هرگز include نشده. ویرایش `sites-available` بدون پیوند دقیقاً همین علامت را دارد: `-t` موفق است چون آن فایل را ندیده، و رفتار میزبان عوض نمی‌شود.

هر بار که فایلی در `conf.d` یا سایت عوض می‌شود همین زنجیره کافی است:

```bash
sudo nginx -t && sudo systemctl reload nginx
```

اگر `-t` غیرصفر برگردد، reload اجرا نمی‌شود. این `&&` را به دو فرمان جدا که خطا را نادیده بگیرند تبدیل نکنید.

## Security Notes

`default_server` با `root /var/www/html` هر نامی را که گواهی و کانفیگ ندارد به یک درخت فایل وصل می‌کند. بعد از حذفش، پیش‌فرض ما اصلاً فایل‌سیستم را باز نمی‌کند. `return 444` از `return 404` بهتر است چون بدنه‌ای برای اسکنر نمی‌ماند.

بلوک `^~ /assets/` اگر بعداً فایل php داخل همان درخت بگذارید، عبارت php را دور می‌زند. دارایی ثابت نباید اسکریپت قابل اجرا باشد. وقتی صفحهٔ PHP را اضافه می‌کنید، مسیر دارایی و مسیر `fastcgi_pass` را یکی نکنید.

`nginx -T` را به تیکت عمومی نچسبانید. خروجی ممکن است مسیر گواهی و بعداً قانون محدودیت را داشته باشد. روی میزبان ببینید و فقط خط مرتبط را در یادداشت حادثه بگذارید.

## Troubleshooting

دو `default_server` این شکل را دارد:

```text
nginx: [emerg] a duplicate default server for 0.0.0.0:80 in /etc/nginx/sites-enabled/app.conf:2
nginx: configuration file /etc/nginx/nginx.conf test failed
```

پیوند `sites-enabled/default` را حذف کنید. اگر فایل را کپی کرده‌اید نه پیوند، هر دو کپی را پیدا کنید: `grep -R default_server /etc/nginx/sites-enabled`.

آکولاد جاافتاده معمولاً خط بعدی را نشان می‌دهد نه خط خودش را:

```text
nginx: [emerg] unexpected end of file, expecting "}" in /etc/nginx/sites-enabled/app.conf:40
```

فایل را از آخر ببندید و دوباره `-t` بگیرید. یک آکولاد اضافه هم emergent است و متن خطا می‌گوید علامت اضافه دیده شده، معمولاً چند خط بعد از جایی که بلوک را اشتباه بسته‌اید.

اگر `directive is not allowed here` دیدید، دستور را به زمینهٔ جدول بالای صفحه برگردانید. `limit_req_zone` و `upstream` و `map` داخل `server` نمی‌نشینند. `proxy_pass` مستقیم داخل `server` بدون `location` هم مجاز نیست.

اگر reload موفق است ولی رفتار قدیمی است، احتمالاً دارید به میزبان دیگری `curl` می‌زنید. روی خود `10.10.1.5` با هدر Host آزمون کنید. کش مرورگر برای این آزمون مناسب نیست.

وقتی `sites-enabled` یک فایل معمولی است نه پیوند، `ls -l` آن را بدون `->` نشان می‌دهد. محتوا را به `sites-available` ببرید، فایل داخل enabled را پاک کنید، و پیوند بسازید. وگرنه نفر بعدی فایل اصل را ویرایش می‌کند و میزبان هنوز کپی کهنه را می‌خواند.

## Best Practices

- فایل اصلی را با نمونهٔ این صفحه بازنویسی نکنید. includeها را تأیید کنید و سایت را جدا نگه دارید.
- قبل از `default_server` جدید، پیش‌فرض بسته را از `sites-enabled` بردارید.
- location دقیق و `^~` را برای مسیری بگذارید که نباید به عبارت باقاعده بیفتد. بقیه را به پیشوند `/` نسپارید بدون اینکه بدانید چه عبارتی جلوتر برنده می‌شود.
- بعد از هر تغییر `nginx -t` و بعد reload. خروجی `-T` را وقتی رفتار با فایل روی دیسک یکی نیست ببینید.
- شمارهٔ خط خطا را در خود فایل باز کنید؛ Nginx گاهی خطِ علامتِ جاافتاده را گزارش می‌کند نه خط دستور.
- این سایت آزمون را با صفحهٔ [پروکسی](/docs/06-nginx/reverse-proxy) ادامه دهید. `return 200` را در تولید رها نکنید.
