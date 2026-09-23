---
sidebar_position: 10
title: نصب Google Chrome روی سرور
description: نصب Chrome for Testing از مخزن عمومی install-googleCrome-server، با بررسی SHA-256 و مسیر Puppeteer.
---

# نصب Google Chrome روی سرور

## مقدمه

بعضی برنامه‌ها، از جمله Laravel با Browsershot و Puppeteer، دودویی Chrome for Testing می‌خواهند نه بستهٔ Chromium توزیع. روی سروری که به `storage.googleapis.com` پایدار دسترسی ندارد، یا نمی‌خواهید هر بار از کاتالوگ گوگل دانلود کنید، از آینهٔ عمومی زیر استفاده می‌شود:

[https://github.com/mohammadhejazirad/install-googleCrome-server](https://github.com/mohammadhejazirad/install-googleCrome-server)

این مخزن باینری رسمی Chrome for Testing را در GitHub نگه می‌دارد. اسکریپت نصب روی سرور، مانیفست را می‌خواند، تکه‌ها را می‌گیرد، SHA-256 را چک می‌کند، جایگزین اتمیک می‌کند، و اگر آزمون بی‌پنجره شکست بخورد نسخهٔ قبلی را برمی‌گرداند.

این صفحه جایگزین [Chromium بی‌پنجره](./chromium) نیست. Chromium بستهٔ Ubuntu یا snap است. اینجا Chrome for Testing است که Puppeteer همان را صدا می‌زند.

## مفهوم اصلی

Chrome for Testing ساخت جداگانه‌ای از Chrome مصرف‌کننده است. برای اتوماسیون منتشر می‌شود، به‌روزرسانی خاموش پس‌زمینه ندارد، و نسخهٔ دقیق در `manifest.json` مخزن نوشته می‌شود. اسکریپت عدد نسخه را از فیلد `latest_stable` همان فایل می‌خواند. روزی که این صفحه نوشته شد آن فیلد `156.0.8066.0` بود. فردا ممکن است عوض شود. سرور را با عدد این پاراگراف پین نکنید. منبع حقیقت خروجی خود اسکریپت است.

فایل زیپ از حد ۱۰۰ مگابایت GitHub بزرگ‌تر است، برای همین مخزن آن را به تکه‌های حدود ۹۰ مگابایت به نام `chrome.zip.part-000` و بعدی‌ها تقسیم کرده است. اسکریپت تکه‌ها را به همان ترتیب به هم می‌چسباند و هش کل فایل را با `sha256` داخل مانیفست مقایسه می‌کند. اگر هش نخورد، نصب جلو نمی‌رود.

معماری را اسکریپت از `uname -m` می‌فهمد. `x86_64` می‌شود `linux64` و مسیر نهایی:

```text
/opt/chrome-for-testing/chrome-linux64/chrome
```

`aarch64` می‌شود `linux-arm64` و مسیر:

```text
/opt/chrome-for-testing/chrome-linux-arm64/chrome
```

یک پیوند هم در `/usr/local/bin/chrome-for-testing` ساخته می‌شود.

اگر همان نسخه از قبل نصب باشد، اسکریپت بدون دانلود خارج می‌شود. برای نصب دوباره متغیر `FORCE=1` است.

## چرا استفاده می‌شود؟

Puppeteer اگر خودش Chrome را دانلود کند، به شبکهٔ گوگل و به کش خانگی کاربر سرویس وابسته است. روی سرور برنامه این کار شکننده است: کاربر `deploy` اجازهٔ نوشتن در کش خانگی root را ندارد، و قطع بودن `storage.googleapis.com` استقرار را می‌خواباند. آینهٔ بالا یک URL ثابت است که تیم خودش هم به آن دسترسی دارد.

جایگزین، بستهٔ `chromium` توزیع است. اگر محصول فقط PDF ساده می‌خواهد و به رفتار Chrome for Testing وابسته نیست، صفحهٔ Chromium کافی است. اگر نسخه باید با همان Chrome for Testing که در CI تست شده یکی باشد، این مخزن مسیر تکرارپذیر است.

## Architecture

```text
GitHub Actions روی مخزن
    کاتالوگ رسمی Chrome for Testing
    تکه‌ها زیر chrome/<version>/<platform>/
    manifest.json  با latest_stable و sha256
            │
            │  curl از سرور
            ▼
اسکریپت scripts/install-chrome.sh
    معماری را تشخیص می‌دهد
    کتابخانه‌های سیستم را با apt نصب می‌کند
    SHA-256 را چک می‌کند
    /opt/chrome-for-testing را اتمیک عوض می‌کند
    آزمون headless؛ شکست یعنی برگشت نسخهٔ قبل
            │
            ▼
برنامه (Browsershot / Puppeteer)
    PUPPETEER_EXECUTABLE_PATH به دودویی بالا
```

آزمون دود خود اسکریپت با کاربر root و با پرچم `--no-sandbox` اجرا می‌شود، چون این آزمون باید بدون نمایشگر و بدون کاربر واردشده جواب بدهد. این پرچم مخصوص همان چند ثانیهٔ نصب است. برنامهٔ وب را با root و با همین پرچم به عنوان حالت دائمی راه نیندازید. کاربر سرویس `deploy` باشد، خانهٔ مرورگر جدا باشد، و اگر جعبهٔ شنی روی آن کاربر کار کرد پرچم را برندارید.

## Installation

اسکریپت را اول بخوانید، بعد با root اجرا کنید. اجرای کور `curl | bash` در این دانشنامه رسم نیست.

```bash
curl -fsSL https://raw.githubusercontent.com/mohammadhejazirad/install-googleCrome-server/main/scripts/install-chrome.sh -o /tmp/install-chrome.sh
less /tmp/install-chrome.sh
sudo bash /tmp/install-chrome.sh
```

خروجی سالم نسخه را چاپ می‌کند و این خط را هم می‌دهد:

```text
PUPPETEER_EXECUTABLE_PATH=/opt/chrome-for-testing/chrome-linux64/chrome
```

روی ARM64 مسیر `chrome-linux-arm64` است. معماری را حدس نزنید:

```bash
uname -m
/opt/chrome-for-testing/chrome-linux64/chrome --version
```

اگر دودویی نبود، مسیر ARM را امتحان کنید. اسکریپت روی معماری غیر از این دو تا همان اول خارج می‌شود.

به‌روزرسانی یعنی اجرای دوبارهٔ همان دستور. اگر نسخهٔ مانیفست جدیدتر باشد جایگزین می‌شود. اگر آزمون بی‌پنجره شکست بخورد، پوشهٔ قبلی از `chrome-linux64.backup.<pid>` برمی‌گردد و اسکریپت با وضعیت غیرصفر تمام می‌شود. آن پوشهٔ پشتیبان را بعد از موفقیت اسکریپت خودش پاک می‌کند. اگر شکست دیدید و پوشهٔ backup ماند، پاکش نکنید تا مرورگر قبلی هنوز سر جایش است.

نصب اجباری حتی اگر نسخه یکی است:

```bash
sudo FORCE=1 bash /tmp/install-chrome.sh
```

وابستگی‌هایی که اسکریپت اگر نباشند با apt می‌آورد: `curl`، `jq`، `unzip`، و کتابخانه‌هایی مثل `libnss3`، `libgbm1`، `libgtk-3-0`، فونت `fonts-liberation` و `fonts-noto-color-emoji`. اگر نام بسته‌ای در Ubuntu 26.04 نباشد، اسکریپت همان یکی را رد می‌کند و بقیه را نصب می‌کند. `libasound2t64` را ترجیح می‌دهد و اگر نبود `libasound2` را می‌گذارد.

## Configuration

برای Laravel و Puppeteer مسیر را در محیط سرویس بگذارید، نه در پروفایل تعاملی root. واحد systemd برنامه:

```ini
[Service]
User=deploy
Environment=PUPPETEER_EXECUTABLE_PATH=/opt/chrome-for-testing/chrome-linux64/chrome
```

در PHP می‌توانید همان مقدار را در `.env` برنامه بگذارید، به شرطی که فایل `.env` مجوز `0640` و مالک `deploy` داشته باشد. مقدار را داخل مخزن گیت نگذارید اگر مسیر روی سرورهای مختلف فرق می‌کند. مسیر پیش‌فرض x86_64 بالاست و می‌تواند در مستند استقرار تیم ثابت باشد.

Browsershot معمولاً این را می‌پذیرد:

```php
Browsershot::html('<h1>ok</h1>')
    ->setChromePath(getenv('PUPPETEER_EXECUTABLE_PATH'))
    ->noSandbox()
    ->save('/tmp/out.pdf');
```

`noSandbox()` را فقط وقتی روشن کنید که بدون آن، فرایند کاربر `deploy` واقعاً با خطای sandbox می‌میرد، و همان واحد systemd با `NoNewPrivileges=true` و `PrivateTmp=true` محدود شده باشد. روشن کردنش به عنوان کپی از آموزش‌های اینترنت، روی سروری که کاربر دیگری دارد، همان خطری است که صفحهٔ Chromium گفته است.

آزمون دستی، با کاربر سرویس نه با root:

```bash
sudo -u deploy -H /opt/chrome-for-testing/chrome-linux64/chrome --version
sudo -u deploy -H timeout 30 /opt/chrome-for-testing/chrome-linux64/chrome \
  --headless=new --disable-gpu --disable-dev-shm-usage \
  --dump-dom 'data:text/html,<html><body>CHROME_OK</body></html>'
```

اگر این دستور بدون `--no-sandbox` کار کرد، در برنامه هم همان را نگه دارید. اگر خطای namespace یا sandbox داد، کاربر `deploy` را با `sysctl` بازی‌دادنِ سراسری درمان نکنید. اول `kernel.unprivileged_userns_clone` را فقط در صورتی که سیاست سازمان اجازه می‌دهد بررسی کنید، و اگر مجاز نیست همان پرچم را محدود به این واحد بگذارید و در یادداشت واحد دلیل را بنویسید.

## Production Example

روی `app-1` (`10.10.1.10`) محصول گزارش PDF می‌سازد. Chrome for Testing یک بار با اسکریپت نصب می‌شود. واحد `app.service` کاربر `deploy` است و `PUPPETEER_EXECUTABLE_PATH` را دارد. پوشهٔ `/opt/chrome-for-testing` مالک root و حالت `0755` می‌ماند تا `deploy` اجرا کند ولی نتواند دودویی را عوض کند.

به‌روزرسانی ماه بعد: اسکریپت را دوباره می‌گیرید، diff را با نسخهٔ قبلی فایل اگر نگه داشته‌اید نگاه می‌کنید، و `sudo bash` می‌زنید. در همان پنجره یک PDF آزمایشی از صفحهٔ سلامت داخلی می‌گیرید. اگر PDF خالی بود، لاگ واحد برنامه را ببینید نه اینکه بلافاصله `FORCE=1` را در cron بگذارید.

cron شبانه برای این اسکریپت نگذارید. تعویض دودویی وسط تولید گزارش، فرایندهای باز Chrome را نمی‌کشد ولی اجرای بعدی ممکن است وسط جابه‌جایی پوشه به دودویی قدیمی اشاره کند. به‌روزرسانی در ساعت خلوت و با دست انجام شود، مگر واحدی نوشته باشید که اول برنامه را به حالت نگهداری ببرد.

## Security Notes

مخزن عمومی است. قبل از هر اجرا اسکریپت را بخوانید. اگر کامیت تازه رفتار غیرمنتظره داشت، همان SHA گیت را که تیم بازبینی کرده اجرا کنید، نه همیشه نوک `main`. برای پین کردن، URL خام را با کامیت مشخص عوض کنید و در یادداشت سرور همان کامیت را بنویسید.

هش SHA-256 داخل مانیفست را اسکریپت چک می‌کند. این جلوی فایل نصفه را می‌گیرد. جلوی مخزنِ عوض‌شده توسط صاحبش را نمی‌گیرد، چون مانیفست و تکه‌ها از یک جا می‌آیند. اعتماد شما به صاحب مخزن و به بازبینی اسکریپت است.

آزمون نصب با `--no-sandbox` و root است. بعد از نصب، سرویس را با root بالا نیاورید. دودویی setuid نیست و نباید بشود.

Chrome را به اینترنت آزاد برای صفحات کاربر وصل کردن یعنی سرور شما صفحهٔ شخص ثالث را رندر می‌کند. URL را به ورودی کاربر نسپارید مگر محصول واقعاً این را می‌خواهد و زمان و حافظه محدود است. `timeout` جلوی تبِ گیرکرده را می‌گیرد.

## Troubleshooting

| نشانه | کار |
| --- | --- |
| `Run with sudo/root` | بدون root پوشهٔ `/opt` ساخته نمی‌شود |
| `Unsupported architecture` | `uname -m` نه x86_64 است نه aarch64 |
| `Invalid mirror version` یا مانیفست خالی | `curl` به GitHub نرسیده. پروکسی یا آینهٔ سازمان را چک کنید. فایل `/tmp` را نگه دارید و `jq .latest_stable` بزنید |
| `SHA256 verification failed` | دانلود ناقص یا پروکسی که بدنه را عوض کرده. دوباره اجرا کنید. اگر تکرار شد مخزن را در مرورگر باز کنید و اندازهٔ تکه‌ها را ببینید |
| `New Chrome failed; previous installation restored` | آزمون headless شکست خورده. کتابخانهٔ گم‌شده معمولاً در همان خروجی `TEST` چاپ می‌شود. نسخهٔ قبلی باید هنوز `--version` بدهد |
| Puppeteer هنوز Chrome خودش را می‌خواهد | متغیر محیط به فرایند سرویس نرسیده. `systemctl show app.service -p Environment` |
| PDF متن فارسی مربع است | فونت سیستم. `fonts-noto` یا فونتی که محصول لازم دارد را جدا نصب کنید. خود Chrome فونت فارسی سیستم را برنمی‌دارد اگر بسته نباشد |

اگر اسکریپت وسط کار قطع شد، `/opt/chrome-for-testing` را کور پاک نکنید. اول `ls` کنید. پوشهٔ `backup` یعنی نسخهٔ قبلی هنوز هست.

## Best Practices

- اسکریپت را در مخزن برنامه کپی نکنید و دو منبع حقیقت نسازید، مگر اینکه عمداً یک کامیت را پین کرده باشید و URL همان کامیت را در مستند استقرار نوشته باشید.
- مسیر دودویی را در کد سخت نکنید. متغیر محیط یک جا در واحد systemd باشد.
- به‌روزرسانی را با یک PDF واقعی از صفحهٔ خودتان تمام کنید، نه فقط با `--version`.
- این مرورگر را روی `db-1` نصب نکنید. جای آن سرور برنامه است.
- تفاوت با صفحهٔ Chromium را برای تیم بنویسید تا کسی هر دو را نصب نکند و هر بار یکی را در کد صدا بزند.
