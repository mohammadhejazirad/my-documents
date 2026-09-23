---
sidebar_position: 6
title: گواهی پولی
description: ساخت CSR با openssl، نصب fullchain و کلید با مجوز 600، و تمدید دستی تقویمی.
---

# گواهی پولی

## مقدمه

گواهی پولی همان نقش Let's Encrypt را دارد با این فرق که یک فروشنده آن را بعد از دیدن CSR صادر می‌کند و تمدید خودکار روی سرور ندارید. کلید خصوصی روی پروکسی ساخته می‌شود و از ماشین خارج نمی‌شود. برای فروشنده فقط CSR می‌رود. نصب یعنی گذاشتن fullchain و کلید در مسیر Nginx، محدود کردن مجوز کلید به `600`، و نوشتن تاریخ انقضا در تقویم تیم.

این مسیر را وقتی می‌روید که سازمان CA مشخصی را خواسته، یا قرارداد پشتیبانی گواهی دارید. برای نام معمولی `app.example.com` اگر چنین قیدی نیست، [Let's Encrypt](./ssl-letsencrypt) کمتر به حافظهٔ انسان وابسته است. هر دو مکانیزم را روی یک `server_name` فعال نگذارید.

## مفهوم اصلی

CSR (درخواست امضای گواهی) حاوی نام و کلید عمومی است، نه کلید خصوصی. openssl هر دو فایل را با هم می‌سازد: کلید روی دیسک می‌ماند و CSR را می‌فرستید. فروشی که فرم «کلید خصوصی را هم بچسبانید» دارد را رها کنید. آن کانال دیگر مال شما نیست.

خروجی فروشنده معمولاً دو یا سه فایل است: گواهی برگ (خود `app.example.com`)، یک یا چند میان‌گواهی (intermediate)، و گاهی ریشه. Nginx یک فایل زنجیره می‌خواهد که اول برگ باشد و بعد میان‌گواهی‌ها، به ترتیب صدور. ریشه لازم نیست داخل این فایل باشد. مرورگر ریشه را در فروشگاه اعتماد خودش دارد.

زنجیرهٔ ناقص یعنی فقط برگ را در `ssl_certificate` گذاشته‌اید. مرورگر دسکتاپ اغلب میان‌گواهی را از بازدید قبلی یا از کش خودش دارد و سایت را باز می‌کند. مرورگر موبایل و `curl` و خیلی از کلاینت‌های غیرمرورگر میان‌گواهی کش‌شده ندارند و خطا می‌دهند: نمی‌توان صادرکننده را ساخت. این خطا متناقض دیده می‌شود و آدم را به شک در مورد خود گواهی می‌اندازد. گواهی درست است. فایل ناقص است.

عمر گواهی پولی را فروشنده روی خود گواهی می‌نویسد. سقف عمر گواهی عمومی در سال‌های اخیر کوتاه شده و دیگر گواهی چندسالهٔ رایج قدیم را فرض نکنید. عدد را از `notAfter` بخوانید. تمدید دستی یعنی چند هفته قبل از همان تاریخ، CSR تازه یا تجدید طبق رویهٔ همان فروشنده، دریافت فایل تازه، جایگزینی روی دیسک، `nginx -t`، و reload. هیچ تایمر systemd این کار را برای شما نمی‌کند مگر خودتان اسکریپت و هشدار نوشته باشید. این صفحه اسکریپت جادویی اضافه نمی‌کند. تقویم را اجباری می‌کند.

## چرا استفاده می‌شود؟

بعضی سازمان‌ها به ریشهٔ یک CA خاص در فروشگاه اعتماد داخلی وابسته‌اند، یا مشتری‌شان مهر یک فروشنده را در قرارداد خواسته. در آن شرایط Let's Encrypt از نظر فنی کار می‌کند و از نظر ممیزی رد می‌شود. گواهی پولی این قید را برمی‌آورد به قیمت عملیات دستی.

هزینهٔ اشتباه هم مشخص است. فرستادن کلید خصوصی، زنجیرهٔ ناقص، و جا ماندن تاریخ انقضا سه حادثهٔ تکراری این مسیرند. هر سه با رویهٔ همین صفحه قابل جلوگیری‌اند و هیچ‌کدام با گران‌تر خریدن گواهی حل نمی‌شوند.

## Architecture

```text
proxy (10.10.1.5)
    │
    ├── /etc/ssl/private/app.example.com.key     حالت 600 ، root
    ├── /etc/ssl/certs/app.example.com.csr       قابل ارسال
    └── /etc/ssl/certs/app.example.com.fullchain.pem
                │
                ▼
            Nginx  ssl_certificate  و  ssl_certificate_key
                │
                ▼
            کلاینت زنجیره را تا یک ریشهٔ شناخته‌شده می‌سازد

فروشنده
    فقط CSR را می‌بیند
    برگ + میان‌گواهی را برمی‌گرداند
    کلید خصوصی را هرگز نمی‌بیند
```

مسیرها را با `/etc/letsencrypt` قاطی نکنید. اگر روزی به Certbot مهاجرت کردید، کانفیگ Nginx باید عمداً عوض شود، نه این‌که دو فایل روی دیسک باشد و معلوم نباشد کدام لود شده.

## Installation

openssl در Ubuntu Server هست. جدا نصب نمی‌کنید مگر دستور نباشد.

```bash
openssl version
sudo install -d -m 0755 -o root -g root /etc/ssl/private /etc/ssl/certs
```

`install -d` اگر پوشه باشد دستش نمی‌زند جز ساختن در صورت نبود. `/etc/ssl/private` روی Debian و Ubuntu معمولاً از قبل با حالت `710` وجود دارد. اگر `ls -ld` چیز دیگری نشان داد، قبل از ادامه دلیلش را بفهمید. این صفحه حالت کلید را روی خود فایل `600` می‌گذارد تا حتی اگر پوشه بازتر باشد کلید برای دیگران خواندنی نباشد. حالت پوشهٔ `710` با مالک root و گروه ssl-cert هم الگوی توزیع است. آن را به `777` «برای این‌که Nginx بخواند» تغییر ندهید. master process در Nginx با root کلید را می‌خواند و worker به کلید نیاز ندارد.

## Configuration

ساخت کلید و CSR روی خود پروکسی. منحنی P-256 برای نام معمولی وب کافی است. کلید از نوع EC است و فایلش کوتاه است. اگر فروشنده هنوز فقط RSA می‌پذیرد، همان را در فرم خوانده‌اید و دستور جایگزین پایین‌تر است. اول روش فروشنده را بخوانید، بعد دستور را بزنید.

```bash
sudo openssl req -new -newkey ec -pkeyopt ec_paramgen_curve:prime256v1 \
  -nodes \
  -keyout /etc/ssl/private/app.example.com.key \
  -out /etc/ssl/certs/app.example.com.csr \
  -subj "/CN=app.example.com"
sudo chown root:root /etc/ssl/private/app.example.com.key
sudo chmod 600 /etc/ssl/private/app.example.com.key
```

`-nodes` یعنی کلید روی دیسک با گذرواژهٔ تعاملی رمز نشود. گذرواژهٔ تعاملی بعد از reboot سرویس را بالا نمی‌آورد، چون کسی پشت کنسول نیست. حفاظت کلید مجوز فایل و دسترسی root است، نه یک پسورد فراموش‌شدنی.

اگر فروشنده RSA با طول 2048 خواست:

```bash
sudo openssl req -new -newkey rsa:2048 -nodes \
  -keyout /etc/ssl/private/app.example.com.key \
  -out /etc/ssl/certs/app.example.com.csr \
  -subj "/CN=app.example.com"
sudo chmod 600 /etc/ssl/private/app.example.com.key
```

یکی از این دو را اجرا کنید، نه هر دو را پشت سر هم، وگرنه دومی کلید اولی را عوض می‌کند در حالی که شاید CSR اول را قبلاً فرستاده باشید.

قبل از ارسال، نوع فایل را ببینید. CSR باید درخواست باشد، نه کلید.

```bash
sudo openssl req -in /etc/ssl/certs/app.example.com.csr -noout -subject
sudo head -n 1 /etc/ssl/certs/app.example.com.csr
sudo ls -l /etc/ssl/private/app.example.com.key
```

خط اول CSR این است:

```text
-----BEGIN CERTIFICATE REQUEST-----
```

خط موضوع:

```text
subject=CN = app.example.com
```

خروجی `ls` باید این شکل را داشته باشد. اندازهٔ دقیق با نوع کلید فرق می‌کند. ستون حالت باید همین باشد.

```text
-rw------- 1 root root 302 Sep 23 10:15 /etc/ssl/private/app.example.com.key
```

برای فروشنده فایل `app.example.com.csr` را می‌فرستید یا محتوای بین دو خط BEGIN و END درخواست را. فایل `.key` را ضمیمه نکنید، در تیکت نگذارید، و در چت نفرستید.

وقتی برگ و میان‌گواهی رسید، روی یک ماشین جدا (لپ‌تاپ عملیات، نه پوشهٔ عمومی) زنجیره را بسازید و به سرور کپی کنید. ترتیب: اول برگ، بعد میان‌گواهی. اگر دو میان‌گواهی است، اول همان که برگ را امضا کرده.

```bash
sudo cp app.example.com.fullchain.pem /etc/ssl/certs/app.example.com.fullchain.pem
sudo chmod 644 /etc/ssl/certs/app.example.com.fullchain.pem
sudo openssl x509 -in /etc/ssl/certs/app.example.com.fullchain.pem -noout -subject -issuer -enddate
```

موضوع باید `CN = app.example.com` باشد. اگر موضوع مال میان‌گواهی است، ترتیب cat را برعکس کرده‌اید.

بلوک Nginx روی پروکسی. جزئیات پروکسی برنامه در [پیکربندی Nginx](/docs/06-nginx/configuration) و [پروکسی معکوس](/docs/06-nginx/reverse-proxy) است. این‌جا بخش TLS کامل است تا زنجیره و کلید جا نیفتد.

```nginx
server {
    listen 443 ssl;
    listen [::]:443 ssl;
    server_name app.example.com;

    ssl_certificate     /etc/ssl/certs/app.example.com.fullchain.pem;
    ssl_certificate_key /etc/ssl/private/app.example.com.key;
    ssl_protocols       TLSv1.2 TLSv1.3;

    location / {
        proxy_pass http://10.10.1.10:8080;
        proxy_set_header Host $host;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}

server {
    listen 80;
    listen [::]:80;
    server_name app.example.com;
    return 301 https://app.example.com$request_uri;
}
```

`ssl_certificate` فایل زنجیره است، نه کلید. جابه‌جایی این دو، Nginx را با خطای PEM بالا نمی‌آورد یا تست را رد می‌کند. پروتکل زیر TLS 1.2 را نگذارید.

```bash
sudo nginx -t
sudo systemctl reload nginx
```

تاریخ را همان روز در تقویم عملیات بگذارید. یک یادآوری دو هفته قبل از `enddate` و یکی سه روز قبل. مسئولش نقش تیم است، نه یک نفر به اسم.

## Production Example

سایت روی لپ‌تاپ باز می‌شود و روی تلفن همراه خطای گواهی می‌دهد. گواهی را دیروز نصب کرده‌اید.

### نشانه

موبایل می‌گوید ارتباط خصوصی برقرار نشد یا صادرکننده نامعتبر است. لپ‌تاپ همان URL را بدون هشدار باز می‌کند. کاربر فکر می‌کند تلفن خراب است.

### فرضیه

زنجیره ناقص است. دسکتاپ میان‌گواهی را دارد. موبایل ندارد. فرض دوم این است که موبایل به IP دیگری می‌رود و گواهی دیگری می‌بیند.

### دستور مشاهده

از یک ماشین که سایت را «سالم» می‌بیند، زنجیرهٔ واقعی روی سیم را بشمارید، نه فایل روی دیسک را تنها.

```bash
echo | openssl s_client -showcerts -connect app.example.com:443 -servername app.example.com 2>/dev/null | grep -E 's:|i:|BEGIN|verify'
dig +short app.example.com A
```

خروجی ناقص شبیه این است. یک گواهی در پاسخ هست و تأیید شکست می‌خورد:

```text
verify error:num=20:unable to get local issuer certificate
 0 s:CN = app.example.com
   i:CN = Example Intermediate CA
-----BEGIN CERTIFICATE-----
```

یک بلوک BEGIN یعنی فقط برگ روی سیم است. `i:` می‌گوید صادرکننده یک CA میانی است، نه یک ریشه‌ای که لازم باشد همین‌جا باشد. پس میان‌گواهی باید در کنار برگ می‌بود و نیست.

خروجی سالم دو بلوک گواهی نشان می‌دهد (برگ و میان) و خط verify error ندارد. کد دقیق ممکن است 20 یا 21 باشد. متن `unable to get local issuer` یا `unable to verify the first certificate` هر دو یعنی زنجیره برای این کلاینت ساخته نشد. به عدد خالی تکیه نکنید.

`dig` باید همان آدرسی باشد که Nginx روی آن گوش می‌دهد. اگر موبایل از DNS دیگری آدرس دوم می‌گیرد، مشکل زنجیره نیست و برمی‌گردید به صفحهٔ رکورد.

### تصمیم

یک گواهی روی سیم و issuer میانی: fullchain را دوباره بسازید. Nginx و فروشنده را عوض نکنید.

دو گواهی روی سیم و هنوز خطا روی موبایل: یا ریشه در فروشگاه آن دستگاه نیست (CA خصوصی سازمان) یا نام گواهی با نام URL یکی نیست. موضوع `s:` را با نامی که انسان زده مقایسه کنید.

اگر `dig` از شبکهٔ موبایل آدرس دیگری می‌دهد، اول DNS را یکی کنید. دست زدن به فایل گواهی در این حالت بی‌اثر است.

### اصلاح

فایل را با ترتیب درست دوباره بسازید. برگ را فروشنده جدا فرستاده. میان‌گواهی را هم جدا.

```bash
cat app.example.com.crt intermediate.crt | sudo tee /etc/ssl/certs/app.example.com.fullchain.pem >/dev/null
sudo chmod 644 /etc/ssl/certs/app.example.com.fullchain.pem
sudo nginx -t && sudo systemctl reload nginx
```

دوباره `s_client -showcerts` را بگیرید. تا وقتی دو گواهی روی سیم نیست و verify error هست، به کاربر نگویید مشکل از گوشی است.

مجوز کلید را همان لحظه دوباره ببینید، چون گاهی در عجله کلید را کنار زنجیره در پوشهٔ certs کپی می‌کنند.

```bash
sudo ls -l /etc/ssl/private/app.example.com.key
```

اگر حالت چیزی غیر از `-rw-------` است:

```bash
sudo chown root:root /etc/ssl/private/app.example.com.key
sudo chmod 600 /etc/ssl/private/app.example.com.key
```

reload بعد از chmod کلید لازم است فقط اگر Nginx به‌خاطر مجوز نتوانسته باشد کلید را بخواند. اگر سایت از قبل بالا بوده، master کلید را قبلاً خوانده است. باز هم حالت را درست کنید.

### جلوگیری از تکرار

در چک‌لیست نصب گواهی پولی سه خط اجباری است: `ls -l` کلید با حالت `600`، شمارش گواهی در `s_client -showcerts`، و یک آزمایش از شبکه‌ای که آن سایت را قبلاً باز نکرده (یا `curl` از کانتینر تازه). تقویم را همان روز با خروجی این دستور پر کنید.

```bash
openssl x509 -in /etc/ssl/certs/app.example.com.fullchain.pem -noout -enddate
```

دو هفته قبل از آن تاریخ CSR تازه صادر می‌شود. کلید قبلی را تا وقتی گواهی جدید روی سیم تست نشده دور نریزید، و کلید جدید را هم جایی آپلود نکنید. بعد از جایگزینی، کلید قبلی را فقط وقتی حذف کنید که `s_client` تاریخ جدید را نشان می‌دهد. حذف زودتر یعنی اگر reload شکست بخورد دیگر کلید سازگار با فایل قبلی را ندارید.

## Security Notes

کلید خصوصی را در تیکت، ایمیل، یا «پوشهٔ مشترک تیم برای راحتی» نگذارید. اگر رفت، آن گواهی را سوخته حساب کنید. از فروشنده ابطال (revoke) بخواهید، کلید تازه بسازید، CSR تازه بدهید. عوض کردن مجوز فایل بعد از لو رفتن، لو رفتن را پس نمی‌گیرد.

CSR را می‌شود فرستاد. اگر اشتباهاً کلید را فرستادید، با پاک کردن پیام مسئله تمام نمی‌شود. فرض کنید طرف مقابل کلید را دارد.

`chmod 644` روی کلید راه‌حل خوانده شدن توسط پروسهٔ غیر root نیست. master در Nginx با root می‌خواند. حالت `600` و مالک root را نگه دارید. گواهی wildcard را روی هر میکروسرویس کپی نکنید. TLS قدیمی‌تر از 1.2 را از آموزش‌های کهنه وارد بلوک نکنید.

## Troubleshooting

`nginx -t` می‌گوید key values mismatch: کلید و برگ از دو صدور مختلف‌اند. معمولاً CSR تازه ساخته‌اید و فایل گواهی قبلی را سر جایش گذاشته‌اید، یا برعکس. زوج را از یک اجرا نگه دارید. openssl این را روشن می‌کند.

```bash
sudo openssl x509 -in /etc/ssl/certs/app.example.com.fullchain.pem -noout -modulus | openssl sha256
sudo openssl rsa -in /etc/ssl/private/app.example.com.key -noout -modulus | openssl sha256
```

برای کلید EC به‌جای `openssl rsa` از `openssl pkey` استفاده کنید. اگر دو خروجی یکی نیستند، فایل درست را بگذارید. reload این اختلاف را حل نمی‌کند.

`nginx -t` می‌گوید cannot load certificate: مسیر غلط است یا فایل PEM نیست. گاهی فایل DER با پسوند crt رسیده. `head -n 1` باید `-----BEGIN CERTIFICATE-----` باشد. اگر نبود، همان فایل را با openssl به PEM تبدیل کنید فقط وقتی مطمئنید منبعش فروشنده است، نه یک فایل تصادفی.

مرورگر خطای نام می‌دهد نه خطای زنجیره: `CN` یا SAN با Host یکی نیست. گواهی `example.com` برای `app.example.com` کافی نیست مگر SAN آن نام را داشته باشد. موضوع را با `openssl x509 -noout -ext subjectAltName` ببینید. امروز نام مؤثر SAN است. به CN تنها تکیه نکنید.

اگر گواهی «هنوز معتبر نیست»، قبل از خرید دوباره `timedatectl` را ببینید.

## Best Practices

- کلید روی سرور بماند. برای فروشنده فقط CSR.
- fullchain: برگ، بعد میان‌گواهی. نه کلید، نه لزوماً ریشه.
- کلید `root:root` و حالت `600`. زنجیره می‌تواند `644` باشد چون عمومی است.
- بعد از هر نصب `s_client -showcerts` از بیرون. تاریخ `enddate` همان روز در تقویم مشترک، با یادآوری دو هفته قبل.
- تا وقتی گواهی جدید روی سیم دیده نشده، کلید قبلی را پاک نکنید. اگر Let's Encrypt کافی است، مسیر پولی را به‌خاطر عادت ادامه ندهید.
