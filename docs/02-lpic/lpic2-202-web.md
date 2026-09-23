---
title: سرویس وب
sidebar_position: 13
description: Apache و Nginx در حد آزمون ۲۰۲، با یک میزبان مجازی برای app.example.com.
---

# سرویس وب

## مقدمه

هدف ۲۰۸ آزمون ۲۰۲ سرویس HTTP است: Apache، HTTPS در حد پیکربندی، آگاهی از Squid، و Nginx هم به‌عنوان سرور و هم به‌عنوان پروکسی وارونه. کار روزمرهٔ Nginx این تیم، شامل پروکسی، کش و PHP، در فصل [Nginx](/docs/06-nginx) است. گواهی را اینجا اختراع نمی‌کنیم؛ مسیرش [Let's Encrypt](/docs/11-networking/ssl-letsencrypt) و در صورت گواهی سازمانی [گواهی پولی](/docs/11-networking/ssl-commercial) است. این صفحه فرق دو سرویس، دلیل این که روی پورت ۸۰ با هم بالا نمی‌مانند، و یک میزبان مجازی ساده برای `app.example.com` را طوری می‌نویسد که سؤال آزمون را جواب دهد بدون این که فصل Nginx را رونویسی کند.

بستهٔ Nginx همان بستهٔ Ubuntu است، شاخهٔ ۱.۲۸. نسخه را با `nginx -v` بخوانید. Apache بستهٔ `apache2` است و `apache2 -v` نسخه را می‌گوید.

## مفهوم اصلی

هر دو برنامه می‌توانند فایل ثابت بدهند، میزبان مجازی (virtual host) بر اساس نام داشته باشند، و جلوی یک برنامهٔ دیگر بایستند. فرق عملیاتی در مدل پیکربندی و در عادت این تیم است. Apache روی Ubuntu فایل‌ها را در `/etc/apache2` می‌چیند و `sites-available` را با `a2ensite` به `sites-enabled` وصل می‌کند. Nginx بستهٔ توزیع هم `sites-available` و `sites-enabled` دارد، ولی دستور فعال‌سازی‌اش پیوند نمادین است نه `a2ensite`. نحو فایل یکی نیست و کپی کردن بلوک از یکی به دیگری بوت سرویس را می‌شکند.

پورت ۸۰ روی یک آدرس فقط یک شنونده دارد. دومی با خطای address already in use بالا نمی‌آید. این محدودیت آزمون نیست؛ محدودیت TCP است. برای یادگیری هر دو، یکی را فعال نگه دارید و دیگری را `disable` کنید. در تولید این دانشنامه، جلوی برنامه Nginx است.

Squid یک پروکسی کش است و آزمون پیکربندی پایه و پورت ۳۱۲۸ را می‌شناسد. آزمایشگاه ما Squid را بالا نمی‌آورد. پروکسی وارونهٔ ترافیک وب همان Nginx است و در [پروکسی وارونه](/docs/06-nginx/reverse-proxy) نوشته شده. اگر سؤال Squid آمد، آن را با Nginx عوض نکنید: Squid معمولاً جلوی کلاینت برای کش خروج است، Nginx در این تیم جلوی برنامه برای ورود است.

## چرا استفاده می‌شود؟

نام `app.example.com` باید به یک ریشهٔ فایل یا یک برنامه برسد، نه به صفحهٔ پیش‌فرض بسته که روی هر میزبانی یکسان است. میزبان مجازی همان چیزی است که این جداسازی را می‌کند. بدون `ServerName` درست، اولین سایت فایل پیکربندی جواب را می‌گیرد و شما فکر می‌کنید برنامه خراب است.

دلیل دانستن هر دو سرویس این است که ایمیج و بستهٔ قدیمی هنوز Apache می‌آورند. اپراتور باید بتواند ببیند کدام‌یک پورت را گرفته، نه این که هر بار هر دو را restart کند.

## Architecture

```text
درخواست به app.example.com:80
        │
        ▼
یک شنونده روی 0.0.0.0:80
        │
        ├─ یا nginx     /etc/nginx/sites-enabled/app.example.com
        │                 root /var/www/app.example.com
        └─ یا apache2   /etc/apache2/sites-enabled/app.example.com.conf
                          DocumentRoot همان مسیر

هر دو با هم روی همین پورت: دومی fail می‌شود

HTTPS 443
  گواهی از فصل شبکه، نه از این صفحه
  Nginx: فصل ۰۶
  Apache: ماژول ssl و یک VirtualHost جدا
```

کاربر فایل باید بتواند مسیر را بخواند. Nginx روی Ubuntu با کاربر `www-data` کار می‌کند و Apache هم همین کاربر را برای محتوای معمولی استفاده می‌کند. ریشهٔ `/var/www/app.example.com` باید برای دیگران اجرا-و-عبور روی دایرکتوری‌ها و خواندن روی فایل‌ها را داشته باشد، مگر این که ACL جدا بخواهید. ACL در [ACL](/docs/01-linux/acl) است.

## Installation

هر دو بسته را می‌شود نصب کرد. هر دو را فعال نگذارید.

```bash
sudo apt update
sudo apt install nginx apache2
nginx -v
apache2 -v
```

بلافاصله ببینید چه کسی پورت را برده است. ترتیب نصب معمولاً دومی را شکست‌خورده بالا می‌گذارد.

```bash
sudo ss -lntup | awk 'NR==1 || /:80/'
systemctl is-active nginx apache2
```

نمونهٔ تعارض:

```text
LISTEN 0 511 0.0.0.0:80  users:(("nginx",pid=...,fd=...))
active
failed
```

سیاست این آزمایشگاه: Nginx بماند، Apache نصب بماند ولی خاموش و غیرفعال در بوت باشد تا فایل پیکربندی‌اش را برای آزمون بتوان خواند.

```bash
sudo systemctl disable --now apache2
sudo systemctl enable --now nginx
sudo nginx -t
systemctl is-active nginx apache2
```

خروجی مطلوب `active` و سپس `inactive` است. `nginx -t` باید `syntax is ok` و `test is successful` بدهد.

اگر برعکس، فقط می‌خواهید Apache را برای تمرین هدف ۲۰۸.۱ ببینید، Nginx را disable کنید و Apache را enable. در پایان تمرین به Nginx برگردید تا فصل‌های دیگر که پورت ۸۰ را مال Nginx می‌دانند غافلگیر نشوند.

## Configuration

ریشهٔ فایل مشترک، تا تعویض سرویس محتوا را عوض نکند:

```bash
sudo mkdir -p /var/www/app.example.com
echo 'app.example.com via lab' | sudo tee /var/www/app.example.com/index.html
sudo chown -R www-data:www-data /var/www/app.example.com
sudo chmod 755 /var/www/app.example.com
```

میزبان Nginx. فایل را در available بگذارید و به enabled پیوند دهید. سایت پیش‌فرض را از enabled بردارید وگرنه همان اول جواب می‌دهد.

```bash
sudo tee /etc/nginx/sites-available/app.example.com >/dev/null <<'EOF'
server {
    listen 80;
    listen [::]:80;
    server_name app.example.com;
    root /var/www/app.example.com;
    index index.html;
    location / {
        try_files $uri $uri/ =404;
    }
}
EOF
sudo ln -sfn /etc/nginx/sites-available/app.example.com /etc/nginx/sites-enabled/app.example.com
sudo rm -f /etc/nginx/sites-enabled/default
sudo nginx -t
sudo systemctl reload nginx
```

میزبان Apache، بدون روشن کردن سرویس اگر Nginx پورت را دارد. فایل باید نحو درست داشته باشد تا روزی که فقط Apache را امتحان می‌کنید غافلگیر نشوید.

```bash
sudo tee /etc/apache2/sites-available/app.example.com.conf >/dev/null <<'EOF'
<VirtualHost *:80>
    ServerName app.example.com
    DocumentRoot /var/www/app.example.com
    ErrorLog ${APACHE_LOG_DIR}/app.example.com-error.log
    CustomLog ${APACHE_LOG_DIR}/app.example.com-access.log combined
</VirtualHost>
EOF
sudo a2dissite 000-default.conf || true
sudo a2ensite app.example.com.conf
sudo apachectl configtest
```

`apachectl configtest` سرویس را بالا نمی‌آورد. `AH00558` دربارهٔ تعیین‌نشدن نام سرور سراسری هشدار است، نه شکست، اگر `Syntax OK` در خط بعد باشد. تا وقتی Nginx روی ۸۰ است، `systemctl start apache2` باید شکست بخورد. همان شکست را یک‌بار ببینید تا پیامش آشنا باشد، بعد واحد را دوباره disable کنید.

```bash
sudo systemctl start apache2 || true
systemctl is-active apache2
sudo systemctl disable --now apache2
```

آزمون HTTPS آپاچی ماژول `ssl` و یک VirtualHost روی ۴۴۳ با `SSLEngine on` و مسیر گواهی را می‌خواهد. تا فایل گواهی از فصل شبکه ساخته نشده، آن VirtualHost را فعال نکنید. شکل مسیر، وقتی فایل واقعاً وجود دارد:

```text
SSLCertificateFile /etc/letsencrypt/live/app.example.com/fullchain.pem
SSLCertificateKeyFile /etc/letsencrypt/live/app.example.com/privkey.pem
```

دستور `sudo a2enmod ssl` به‌تنهایی گواهی نمی‌سازد. فعال کردن سایت ۴۴۳ بدون فایل، Apache را در حالت شکست نگه می‌دارد.

## Production Example

از ایستگاه مدیر، نام باید به `10.10.1.10` برسد و بدنهٔ صفحه همان فایل آزمایشگاه باشد. اگر DNS عمومی این نام را ندارد، روی ایستگاه فقط برای تست یک خط hosts به `10.10.1.10` کافی است. روی خود سرور:

```bash
curl -sS -H 'Host: app.example.com' http://127.0.0.1/
sudo ss -lntup | awk 'NR==1 || /:80/'
```

خروجی curl باید `app.example.com via lab` باشد. اگر صفحهٔ پیش‌فرض Nginx آمد، `server_name` جور نشده یا سایت default هنوز enabled است. `sudo nginx -T | awk '/server_name|listen /'` پیکربندی مؤثر را نشان می‌دهد، نه فقط فایلی که فکر می‌کنید خوانده شده.

لاگ را وقتی کد وضعیت غلط است ببینید، نه قبل از هر درخواست:

```bash
sudo tail -n 20 /var/log/nginx/access.log
sudo tail -n 20 /var/log/nginx/error.log
```

۴۰۳ یعنی مجوز مسیر تا `index.html` برای `www-data` نیست. ۴۰۴ یعنی root غلط است یا فایل نیست. ۵۰۲ در این صفحه نباید بیاید چون پروکسی تعریف نشده. اگر ۵۰۲ دیدید، این فایل ساده نیست و باید [پیکربندی Nginx](/docs/06-nginx/configuration) را برای `proxy_pass` باز کنید.

تعویض موقت به Apache برای اثبات آزمون، فقط در پنجرهٔ نگهداری:

```bash
sudo systemctl stop nginx
sudo systemctl start apache2
curl -sS -H 'Host: app.example.com' http://127.0.0.1/
sudo systemctl stop apache2
sudo systemctl start nginx
```

اگر curl وسط کار شکست خورد، به حالت Nginx برگردید حتی اگر دلیل را هنوز نمی‌دانید. پورت بدون شنونده بدتر از شنوندهٔ اشتباهِ شناخته‌شده است.

## Security Notes

فایل را با کاربر `www-data` ننویسید اگر برنامه جدا دارد. مالک محتوا در این مثال همان کاربر وب است چون فقط یک فایل ثابت آزمایشی است. برنامهٔ واقعی زیر `/opt/apps` با کاربر `deploy` است و Nginx فقط پروکسی است. آن مدل در [PHP-FPM](/docs/06-nginx/php-fpm) و [Node](/docs/06-nginx/nodejs) است. `deploy` را عضو گروهی نکنید که روی کل `/var/www` نوشتن دارد.

لیستینگ دایرکتوری را روشن نکنید. در Nginx پیش‌فرض خاموش است. در Apache `Options Indexes` را به این میزبان اضافه نکنید.

سرآیند امنیتی و محدودیت نرخ مال [امنیت Nginx](/docs/06-nginx/security-rate-limit) است و اینجا تکرار نمی‌شود. آزمون ممکن است `ServerTokens Prod` را برای Apache بپرسد. آن خط در `/etc/apache2/conf-available/security.conf` است. پنهان کردن نسخه جای وصله را نمی‌گیرد.

Squid را «چون در آزمون است» روی همان میزبان با پورت باز روی همهٔ رابط‌ها نصب نکنید. پروکسی باز، رلهٔ ترافیک غریبه می‌شود. اگر روزی لازم شد، شنود فقط روی شبکهٔ داخلی و با ACL است و صفحهٔ خودش را می‌خواهد.

## Troubleshooting

علامت: `nginx -t` شکست. شمارهٔ خط را همان می‌گوید. شایع‌ترین علت، تمام نشدن یک دستور با نقطه‌ویرگول یا یک مهار بدون جفت داخل فایل سایت است. فایل را با نسخهٔ همین صفحه مقایسه کنید. `apachectl configtest` را برای خطای Nginx نخوانید.

علامت: Apache active نمی‌شود و journal می‌گوید address already in use.

```bash
sudo ss -lntup | awk '/:80/'
sudo journalctl -u apache2 -b --no-pager | tail -n 20
```

اگر خط nginx را نشان داد، رفتار درست disable ماندن Apache است. کشتن فرایند با `kill` بدون disable یعنی بعد از reboot دوباره هر دو مسابقه می‌دهند.

علامت: curl از خود سرور درست است و از بیرون نه. یا فایروال پورت ۸۰ را بسته، یا نام به IP دیگری می‌رود. فایروال در [UFW](/docs/10-security/ufw) و نام در [شبکهٔ ۱۰۲](/docs/02-lpic/lpic1-102-networking). `curl` به `http://10.10.1.10/` از ایستگاه مدیر این دو را جدا می‌کند.

علامت: `13: Permission denied` در error.log. یک دایرکتوری والد قابل عبور نیست. `namei -l /var/www/app.example.com/index.html` کل زنجیره را نشان می‌دهد. فقط chmod ۷۷۷ نکنید.

## Best Practices

- یک شنونده روی پورت ۸۰. در این دانشنامه Nginx. Apache را نصب‌شده و غیرفعال نگه دارید اگر برای خواندن پیکربندی آزمون لازم است.
- `nginx -t` و `apachectl configtest` قبل از reload یا start. آزمون نحو، سرویس را بالا نمی‌آورد.
- سایت default را از enabled بردارید تا میزبان نام‌دار واقعاً جواب بدهد.
- محتوا و پروکسی را قاطی نکنید. این صفحه فقط فایل ثابت است. پروکسی را از فصل ۰۶ بیاورید.
- گواهی را به VirtualHost وصل نکنید تا وقتی فایل‌ها روی دیسک هستند.
- Squid را سرویس پیش‌فرض این آزمایشگاه نکنید.

## تمرین

سناریو: همکار Apache را برای «یک تست» start کرده و صفحهٔ `app.example.com` یا قطع است یا صفحهٔ پیش‌فرض توزیع است. شما باید Nginx همان ریشهٔ `/var/www/app.example.com` را برگردانید و Apache را در بوت خاموش نگه دارید.

```bash
systemctl is-active nginx apache2
sudo ss -lntup | awk '/:80/'
curl -sS -H 'Host: app.example.com' http://127.0.0.1/ || true
```

سؤال‌ها:

1. چرا دو سرویس سالم هم نمی‌توانند هر دو روی `0.0.0.0:80` بمانند؟
2. `a2ensite` چه می‌کند که در Nginx معادلش یک پیوند است؟
3. Squid در این آزمایشگاه چه نقشی دارد؟

## پاسخ تمرین

اگر Apache پورت را دارد، Nginx را با پیکربندی بخش کانفیگ برگردانید:

```bash
sudo nginx -t
sudo systemctl disable --now apache2
sudo systemctl enable --now nginx
curl -sS -H 'Host: app.example.com' http://127.0.0.1/
systemctl is-enabled apache2 nginx
```

خروجی curl باید همان جملهٔ فایل index باشد. `is-enabled` برای apache باید `disabled` و برای nginx باید `enabled` باشد. اگر `nginx -t` شکست خورد، Apache را خاموش نکنید تا نحو را درست کنید، وگرنه پورت بی‌صاحب می‌ماند. در تمرین، اگر Apache بالا است و تست هنوز لازم است، اول فایل Nginx را اصلاح کنید.

1. چون یک سوکت گوش‌دهنده همان پروتکل و آدرس و پورت را دارد. دومی از هسته جواب رد می‌گیرد. این به سالم بودن فایل پیکربندی ربطی ندارد.
2. `a2ensite` پیوند سایت Apache را در `sites-enabled` می‌سازد و سایت را برای خوانده شدن علامت می‌زند. در Nginx بستهٔ Ubuntu خودتان `ln -s` به `sites-enabled` می‌زنید. هر دو مکانیزم «این فایل را موقع شروع بخوان» هستند، با نحو فایل متفاوت.
3. هیچ سرویس فعالی ندارد. فقط باید بدانید پروکسی کش آزمون است و با Nginx جلوی برنامه یکی نیست. بالا آوردنش روی همهٔ رابط‌ها پروکسی باز می‌سازد.
