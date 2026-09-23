---
title: Chromium بی‌پنجره
sidebar_position: 4
description: "تشخیص بستهٔ Chromium روی Ubuntu 26.04 با apt-cache policy، PDF از صفحهٔ محلی، و ممنوعیت no-sandbox روی میزبان چندکاربره."
---

# Chromium بی‌پنجره

## مقدمه

گاهی سرور باید یک صفحه را به PDF تبدیل کند، بدون نمایشگر و بدون اینکه کسی کنار کنسول نشسته باشد. ابزار این کار Chromium در حالت بی‌پنجره (headless) است. روی Ubuntu 26.04 اسم بسته را از حافظه انتخاب نکنید. آرشیو، بستهٔ `chromium-browser` را به‌صورت بستهٔ انتقالی به snap مرورگر Chromium دارد. بسته‌ای به نام `chromium` که روی Debian یک deb واقعی است، در آرشیو پیش‌فرض Ubuntu ممکن است اصلاً کاندید نداشته باشد.

روش تشخیص `apt-cache policy chromium chromium-browser` است. هر کدام کاندید از مخزن Ubuntu داشت همان نصب می‌شود. مثال فرمان این صفحه بعد از نصب، دودویی `chromium` است، چون snap همان نام را در مسیر می‌گذارد. اگر `command -v chromium` چیز دیگری نشان داد، همان مسیر واقعی را در واحد سرویس بگذارید نه اسمی که این صفحه حدس زده.

`--no-sandbox` روی میزبان چندکاربره ممنوع است. پایین یک بار نشان داده می‌شود، فقط برای کانتینر یک‌بارمصرف، با هشدار. مسیر درست روی `app-1` کاربر جدا به نام `chrome` است، با خانه‌ای که راز ندارد، و بدون آن پرچم.

## مفهوم اصلی

حالت بی‌پنجره یعنی همان موتور مرورگر، بدون پنجره، یک آدرس را باز می‌کند و نتیجه را به PDF یا تصویر می‌نویسد. جعبهٔ شنی (sandbox) فرایندی است که اگر صفحهٔ خصمانه از باگ موتور استفاده کند، به بقیهٔ میزبان نرسد. خاموش کردن آن با `--no-sandbox` این دیوار را برمی‌دارد.

روی Ubuntu این موتور اغلب از راه snap می‌آید، چون بستهٔ `chromium-browser` در آرشیو Resolute انتقالی است. نسخهٔ بسته‌ای که Launchpad برای این انتشار منتشر کرده از خانوادهٔ `2:1snap1-0ubuntu4` بوده است. این شماره جابه‌جا می‌شود. خروجی `apt-cache policy` روی خود میزبان معتبر است، نه عدد این پاراگراف.

snap محدودیت فایل دارد. خانه‌ای که در `/etc/passwd` برای کاربر است معمولاً خوانده می‌شود، و مسیرهای دیگر مثل `/opt` و `/etc` ممکن است از دید مرورگر بسته باشند. برای همین صفحهٔ محلی نمونه را زیر خانهٔ `chrome` می‌گذاریم، نه زیر `/opt`، و اگر snap باز هم نخواند به `http://127.0.0.1` روی همان میزبان می‌رویم. آن نشانی محلی است، نه انتشار در شبکه.

کاربر `chrome` پوستهٔ ورود ندارد، در `sudo` نیست، و کلید SSH در خانه‌اش نیست. «خانهٔ خالی» یعنی خالی از راز، نه اینکه بعد از اولین اجرا پروفایل مرورگر هم نداشته باشد. پروفایل باید جایی باشد وگرنه Chromium هر بار وضعیت موقت می‌سازد و گاهی همان اول خارج می‌شود.

## چرا استفاده می‌شود؟

گزارش PDF اگر روی لپ‌تاپ ساخته شود، قلم و نسخهٔ مرورگر با سرور فرق می‌کند و کار شبانه ممکن نیست. اگر سرور با حساب `ops` و با `--no-sandbox` این کار را بکند، یک HTML آپلودشده راه نسبتاً کوتاهی به بقیهٔ حساب‌ها دارد. کاربر جدا و جعبهٔ شنی روشن، هزینه را به یک خانهٔ بی‌راز محدود می‌کند.

ابزارهای سبک‌تر از موتور کامل مرورگر برای HTML ساده وجود دارند. وقتی صفحه واقعاً به موتور مرورگر نیاز دارد، Chromium همان چیزی است که محصول در مرورگر کاربر هم می‌بیند. این صفحه همان حالت را روی سرور تکرار می‌کند، نه یک مرورگر دوم برای مدیر.

## Architecture

```text
صفحهٔ محلی
    /home/chrome/pages/health.html
    یا  http://127.0.0.1:8080/health
            │
            ▼
کاربر chrome
    خانه /home/chrome  مجوز 700
    بدون کلید، بدون sudo
            │
            ▼
chromium --headless --disable-gpu
    بدون --no-sandbox
    --user-data-dir زیر همان خانه
            │
            ▼
/home/chrome/output/health.pdf

ممنوع روی همین میزبان:
    --no-sandbox
    فقط داخل کانتینر یک‌بارمصرف که راز میزبان را سوار نکرده
```

پورت برنامه را در نمودار ثابت نمی‌کنیم. روی `docker-1` سرویس `app` به `8080` منتشر شده، ولی این صفحه روی `app-1` است و باید به همان جایی وصل شود که صفحه واقعاً گوش می‌دهد. `ss -lnt` قبل از فرمان PDF این را نشان می‌دهد.

## Installation

اول ببینید آرشیو چه دارد:

```bash
sudo apt update
apt-cache policy chromium chromium-browser
```

خواندن خروجی:

- اگر `chromium-browser` کاندید دارد و نسخه شبیه `2:1snap1-...` است، این همان انتقالی Ubuntu 26.04 به snap است. همان را نصب کنید.
- اگر `chromium` کاندید `(none)` است، بستهٔ deb به این نام در آرشیو Ubuntu نیست. PPA و مخزن Debian را برای «درست شدن اسم» اضافه نکنید.
- اگر روی یک میزبان Debian 13 هستید نه Ubuntu، برعکس، `chromium` معمولاً خود deb است و `chromium-browser` ممکن است نباشد. این صفحه برای Ubuntu 26.04 است. سیاست را با خروجی همان میزبان حل کنید، نه با اسم محبوب.

روی Ubuntu 26.04 آزمایشگاه:

```bash
sudo apt install chromium-browser
snap list chromium
command -v chromium
chromium --version
```

`snap list` نام `chromium` و کانال را نشان می‌دهد. نسخهٔ آنجا نسخهٔ مرورگر است و با نسخهٔ بستهٔ انتقالی یکی نیست. هر دو را از خروجی واقعی یادداشت کنید. اگر `command -v` خالی است، snap هنوز لینک را نساخته. `sudo snap alias` را شانسی نزنید. یک بار خروج و ورود مسیر، یا `systemd` کاربر، گاهی لازم است. تا وقتی `command -v chromium` مسیر نداد، واحد سرویس ننویسید.

کاربر و خانه:

```bash
sudo adduser --system --create-home --home /home/chrome --shell /usr/sbin/nologin chrome
sudo chmod 700 /home/chrome
sudo install -d -m 700 -o chrome -g chrome /home/chrome/pages
sudo install -d -m 700 -o chrome -g chrome /home/chrome/output
sudo install -d -m 700 -o chrome -g chrome /home/chrome/profile
```

خانه را با کلید `ops` پر نکنید. `usermod -aG sudo chrome` را نزنید.

## Configuration

یک صفحهٔ محلی کوچک برای آزمایش. این فایل راز ندارد و فقط ثابت می‌کند PDF ساخته می‌شود:

```html
<!DOCTYPE html>
<html lang="fa">
<head>
  <meta charset="utf-8">
  <title>health</title>
</head>
<body>
  <p>app health page</p>
</body>
</html>
```

مسیر `/home/chrome/pages/health.html`، مالک `chrome`، مجوز `640`.

فرمان درست روی میزبان، بدون خاموش کردن جعبهٔ شنی:

```bash
sudo -u chrome chromium \
  --headless \
  --disable-gpu \
  --user-data-dir=/home/chrome/profile \
  --no-pdf-header-footer \
  --print-to-pdf=/home/chrome/output/health.pdf \
  file:///home/chrome/pages/health.html
sudo -u chrome ls -l /home/chrome/output/health.pdf
```

اگر snap از خواندن `file://` زیر همین خانه هم خودداری کرد، صفحه را از سرویس محلی بگیرید. پورت را با `ss` عوض کنید. نمونه برای وقتی برنامه روی خود `app-1` به پورت `8080` گوش می‌دهد:

```bash
sudo -u chrome chromium \
  --headless \
  --disable-gpu \
  --user-data-dir=/home/chrome/profile \
  --no-pdf-header-footer \
  --print-to-pdf=/home/chrome/output/health.pdf \
  http://127.0.0.1:8080/health
```

`--disable-gpu` روی سرور بدون کارت نمایشگر جلوی بعضی خطاهای شروع را می‌گیرد. جعبهٔ شنی نیست و جای `--no-sandbox` هم نیست.

اگر خروجی می‌گوید جعبهٔ شنی قابل استفاده نیست، پرچم ممنوع را اضافه نکنید. ببینید محدودیت user namespace میزبان چیست:

```bash
sysctl kernel.apparmor_restrict_unprivileged_userns
```

صفر کردن این کلید برای کل میزبان، تا Chromium راحت شود، محافظ هسته را برای همهٔ کاربرها شل می‌کند. این صفحه آن را توصیه نمی‌کند. راه قابل قبول اگر snap روی این میزبان واقعاً جعبهٔ شنی را بالا نمی‌آورد: همان کار PDF را داخل کانتینر یک‌بارمصرف ببرید که پایین آمده، نه اینکه میزبان را شل کنید.

:::danger فقط کانتینر یک‌بارمصرف
فرمان زیر جعبهٔ شنی مرورگر را خاموش می‌کند. روی `app-1` و روی هر میزبان چندکاربره اجرا نکنید. فقط داخل کانتینری که بعد از همین تبدیل دور انداخته می‌شود، راز میزبان را سوار نکرده، و کاربر دیگری داخلش نیست.
:::

```bash
chromium --headless --disable-gpu --no-sandbox --print-to-pdf=/tmp/health.pdf file:///tmp/health.html
```

این بلوک را در unit سرویس، در اسکریپت `deploy`، و در تاریخچهٔ `ops` روی سرور کپی نکنید.

## Production Example

سرویس `app` یک صفحهٔ سلامت دارد که تیم می‌خواهد هر بامداد PDF شود و کنار بکاپ گزارش بماند. timer با کاربر `chrome` همان فرمان درست را می‌زند. فایل واحد `/etc/systemd/system/health-pdf.service`:

```ini
[Unit]
Description=Print local health page to PDF
After=network.target

[Service]
Type=oneshot
User=chrome
Group=chrome
ExecStart=/usr/bin/chromium --headless --disable-gpu --user-data-dir=/home/chrome/profile --no-pdf-header-footer --print-to-pdf=/home/chrome/output/health.pdf http://127.0.0.1:8080/health
Nice=15
RuntimeMaxSec=60
MemoryMax=1G
NoNewPrivileges=true
PrivateTmp=true
```

مسیر دودویی را با `command -v chromium` یکی کنید. اگر snap آن را زیر `/snap/bin/chromium` گذاشته، همان را در `ExecStart` بنویسید. timer:

```ini
[Unit]
Description=Daily health PDF

[Timer]
OnCalendar=*-*-* 06:10:00
Persistent=true
RandomizedDelaySec=5min

[Install]
WantedBy=timers.target
```

ساعت به وقت `Asia/Tehran` است اگر [سی دقیقهٔ اول](/docs/04-server-management/initial-bootstrap) انجام شده باشد.

```bash
sudo systemctl daemon-reload
sudo systemctl enable --now health-pdf.timer
sudo systemctl start health-pdf.service
sudo systemctl status health-pdf.service --no-pager
sudo -u chrome ls -l /home/chrome/output/health.pdf
```

PDF را به `/tmp` کپی نکنید تا «برنامه راحت بردارد». برنامه اگر باید آن را ببیند، یا در گروه `chrome` می‌خواند و پوشه `750` است، یا خود `chrome` فایل را به مسیر مشخص برنامه با مجوز `640` کپی می‌کند. جزئیات مجوز در [کاربر و فایل](/docs/10-security/users-and-files) است.

## Security Notes

`--no-sandbox` یعنی رندر صفحه با همان کاربر، بدون دیوار اضافه. روی میزبان مشترک این کاربر اگر به گروه اشتباهی اضافه شده باشد، یا اگر خانهٔ دیگران برای او خوانا باشد، یک صفحهٔ خصمانه فراتر از PDF می‌رود. کانتینر یک‌بارمصرف این شعاع را به عمر همان کانتینر محدود می‌کند، به شرطی که سوکت Docker، خانهٔ `ops`، و `/opt/apps` را داخلش سوار نکرده باشید. کانتینری که `/var/run/docker.sock` دارد یک‌بارمصرف امن نیست. root میزبان است.

صفحه را از اینترنت باز نکنید اگر فقط گزارش داخلی می‌خواهید. `file://` زیر خانهٔ `chrome` یا `127.0.0.1` کافی است. باز کردن آدرس دلخواه کاربر، این واحد را به پروکسی مرورگر تبدیل می‌کند. اگر محصول واقعاً URL مشتری را به PDF تبدیل می‌کند، آن URL را این واحد systemd با یک رشتهٔ آزاد ندهید. برنامه باید فهرست مجاز میزبان داشته باشد و باز هم کاربر `chrome` بی‌sudo بماند. طراحی آن فهرست کار همین صفحه نیست. بدون آن فهرست، واحد را به اینترنت وصل نکنید.

پروفایل مرورگر کوکی و کش نگه می‌دارد. برای صفحهٔ سلامت لازم نیست. پاک کردن دوره‌ای `/home/chrome/profile` اشکالی ندارد، به شرطی که واحد در حال اجرا نباشد. کلید و توکن را آنجا نگذارید چون «پروفایل مرورگر جای بدی برای راز نیست» جملهٔ غلطی است. هر چه آنجا باشد در دسترس همان فرایند رندر است.

## Troubleshooting

| نشانه | کار |
| --- | --- |
| `apt` می‌گوید `chromium` کاندید ندارد | طبیعی روی Ubuntu 26.04. `chromium-browser` را نصب کنید و policy را دوباره بخوانید |
| `chromium: command not found` | snap نصب شده ولی مسیر نیست. `snap list chromium` و `ls /snap/bin` |
| PDF ساخته نمی‌شود و خطا sandbox است | پرچم ممنوع را نگذارید. sysctl مربوط به user namespace را ببینید و اگر نمی‌خواهید کل میزبان را شل کنید کار را به کانتینر یک‌بارمصرف ببرید |
| `file://` خطای دسترسی می‌دهد | محدودیت snap است. فایل را زیر `/home/chrome` بگذارید یا از `127.0.0.1` بگیرید |
| PDF سفید است | صفحه هنوز جاوااسکریپت را تمام نکرده یا سرویس محلی بالا نیست. اول با `curl -fsS` همان نشانی را از خود میزبان بگیرید |
| timer ساعت غلط اجرا شده | `timedatectl`. اگر UTC است، بوت‌استرپ ساعت را عقب انداخته |
| `MemoryMax` فرایند را کشته | صفحهٔ محلی نباید این‌قدر سنگین باشد. اگر هست، صفحه را ساده کنید. سقف را بی‌سقف نکنید |

لاگ واحد:

```bash
sudo journalctl -u health-pdf.service -n 40 --no-pager
```

یک PDF سالم حجم غیرصفر دارد. فایل صفر بایتی یعنی فرمان خارج شده ولی چاپ نشده. کد خروج واحد را در همان journal ببینید.

## Best Practices

- اسم بسته را با `apt-cache policy` انتخاب کنید. روی 26.04 پیش‌فرض آرشیو `chromium-browser` و snap است.
- کاربر `chrome`، خانهٔ بدون راز، بدون sudo، بدون `--no-sandbox`.
- پرچم ممنوع فقط داخل کانتینر دورریختنی و بدون سوار کردن راز میزبان. آن فرمان را در واحد میزبان کپی نکنید.
- صفحهٔ داخلی را از اینترنت باز نکنید. `file://` زیر خانه یا loopback.
- نسخهٔ snap و خروجی `--version` را از خود میزبان یادداشت کنید. این صفحه آن شماره را ثابت نمی‌کند.
- PDF را در `/tmp` رها نکنید. مقصد `700` زیر خانهٔ `chrome` است تا وقتی برنامه با مجوز صریح آن را بردارد.
