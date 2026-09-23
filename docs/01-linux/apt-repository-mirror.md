---
title: "مخزن، آینه و پروکسی APT"
sidebar_position: 14
description: "ساختار deb822، آینهٔ mirror.example.internal، پروکسی APT، و ادامهٔ کار وقتی آرشیو اصلی در دسترس نیست."
---

# مخزن، آینه و پروکسی APT

## مقدمه

`apt update` فقط به آدرسی وصل می‌شود که در فایل مخزن نوشته‌اید، و بسته را فقط اگر امضای `InRelease` با کلید معرفی‌شده بخواند قبول می‌کند. این صفحه همان فایل را روی Ubuntu 26.04 توضیح می‌دهد، شکل تک‌خطی قدیمی را کنارش نشان می‌دهد، آینهٔ داخلی آزمایشگاه را با حفظ امضا جایگزین آرشیو می‌کند، و پروکسی `10.10.1.5` را وقتی تنها خروجی شبکه است تنظیم می‌کند. دستور نصب و pin در [مدیریت بسته با APT](/docs/01-linux/apt-package-management) است. این‌جا اگر update سبز نشود، upgrade شروع نمی‌شود.

آینهٔ آزمایشگاه `mirror.example.internal` با آدرس `10.10.1.60` است. سازمان باید به‌جای این نام، نام واقعی آینهٔ خودش را بگذارد اگر با آزمایشگاه دانشنامه یکی نیست. مکانیزم را عوض نکنید: همان قالب، همان کلید رسمی Ubuntu، بدون اعتماد کور.

## مفهوم اصلی

از Ubuntu 24.04 به این طرف، و روی 26.04 به‌صورت پیش‌فرض نصب تازه، مخزن رسمی در `/etc/apt/sources.list.d/ubuntu.sources` است. قالب deb822 است: چند خط کلید و مقدار، و یک خط خالی بین دو بند. بند اول معمولاً suiteهای `resolute` و `resolute-updates` و `resolute-backports` را از آرشیو می‌گیرد. بند دوم `resolute-security` را از `security.ubuntu.com` می‌گیرد تا حتی اگر آینهٔ اصلی عقب ماند، وصلهٔ امنیتی از مبدأ جدا بیاید. پیش‌فرض 26.04 این فایل است نه `/etc/apt/sources.list`.

قالب تک‌خطی `deb uri suite component` هنوز معتبر است و اگر در `sources.list` یا در فایلی زیر `sources.list.d` با پسوند مناسب باشد APT آن را می‌خواند. آن را برای فهم لاگ‌های قدیمی بلد باشید. روی نصب تازهٔ 26.04 آن را منبع حقیقت نکنید و هم‌زمان با deb822 برای همان suite نگه ندارید. دو تعریف یعنی دو مبدأ و گاهی دو نسخهٔ متعارض در `apt policy`.

هر بند فیلد `Signed-By` دارد و به کلید آرشیو Ubuntu اشاره می‌کند: `/usr/share/keyrings/ubuntu-archive-keyring.gpg`. APT فایل `InRelease` را با همین کلید چک می‌کند، بعد هش فهرست بسته‌ها را با `InRelease`، بعد هش خود deb را با فهرست. اگر `InRelease` را از آینه حذف کنید یا `Signed-By` را بردارید، زنجیر می‌شکند. راه‌حل شکستن زنجیر `Trusted: yes` نیست. آن گزینه بررسی امضا را خاموش می‌کند و هر کسی که به آن HTTP دسترسی داشته باشد می‌تواند بستهٔ روت‌دار بفرستد. آینه‌ای که نمی‌دانید کی است و کلیدش با کلید رسمی Ubuntu یکی نیست قابل اعتماد نیست، حتی اگر داخل شبکهٔ شرکت باشد و سریع باشد.

پروکسی با فایل مخزن فرق دارد. فایل مخزن می‌گوید چه مسیری روی سرور HTTP مبدأ است. پروکسی می‌گوید آن HTTP از کدام در برود. در آزمایشگاه در خروجی `http://10.10.1.5:3128` است و نامش `proxy.example.internal`. اگر آینه داخل همان شبکه است، لازم نیست ترافیک آینه هم از پروکسی بیرون برود. استثنای `DIRECT` برای نام آینه همین کار را می‌کند.

Debian 13 به‌صورت سنتی `sources.list` تک‌خطی داشته و ابزار `apt modernize-sources` آن را به `/etc/apt/sources.list.d/debian.sources` تبدیل می‌کند. کلیدش `/usr/share/keyrings/debian-archive-keyring.gpg` است و suite آن `trixie` است. فایل Ubuntu را روی Debian کپی نکنید.

## چرا استفاده می‌شود؟

آرشیو عمومی از بعضی شبکه‌ها تایم‌اوت می‌شود یا سیاست سازمان اجازهٔ خروج مستقیم نمی‌دهد. بدون آینه یا پروکسی، `apt update` می‌میرد و صفحهٔ بسته بی‌اثر می‌شود. کپی کردن deb با مرورگر و `dpkg -i` همان کار را بدون امضا و بدون وابستگی می‌کند و این دانشنامه آن را راه عملیاتی نمی‌داند.

جدا ماندن بند security از آینهٔ کند، عمدی است. اگر فقط بند آرشیو را به آینهٔ داخلی ببرید و security را روی `security.ubuntu.com` بگذارید، تا وقتی آن میزبان از شبکهٔ شما reachable است وصله عقب نمی‌ماند. وقتی خود آرشیو و خود security هر دو از این شبکه بسته هستند، هر دو بند باید به آینه‌ای بروند که هر دو suite را واقعاً همگام کرده باشد. آینه‌ای که فقط پوشهٔ `resolute` را دارد و `resolute-security` را نه، update را با 404 بند دوم می‌خواباند.

## Architecture

```text
مهمان  app-1
  /etc/apt/sources.list.d/ubuntu.sources
  /etc/apt/apt.conf.d/01proxy          اختیاری
        |
        |  اگر پروکسی باشد
        v
  proxy.example.internal  10.10.1.5:3128
        |
        +-- مسیر عادی: archive.ubuntu.com و security.ubuntu.com
        |
        +-- وقتی آرشیو از همین‌جا هم بسته است
                |
                v
        mirror.example.internal  10.10.1.60
          dists/resolute/InRelease          امضای رسمی، حذف ممنوع
          dists/resolute-updates/InRelease
          dists/resolute-security/InRelease
          dists/resolute-backports/InRelease
          pool/...
```

APT اول `InRelease` را می‌گیرد که فایل Release امضاشده داخل خودش است. اگر فقط `Release` بدون امضا باشد و `InRelease` و `Release.gpg` نباشند، نتیجه همان خطای ناامن بودن مخزن است. آینه باید این فایل را همان‌طور که آرشیو رسمی داده کپی کند، نه اینکه با دست یک Release بسازد.

## Installation

وضعیت پیش‌فرض 26.04 را قبل از هر ویرایشی بخوانید:

```bash
ls -l /etc/apt/sources.list /etc/apt/sources.list.d/
cat /etc/apt/sources.list.d/ubuntu.sources
```

شکل پیش‌فرض deb822. آدرس اگر نصب را با آینهٔ دیگری تمام کرده باشید فرق می‌کند. ساختار باید همین باشد:

```text
Types: deb
URIs: http://archive.ubuntu.com/ubuntu/
Suites: resolute resolute-updates resolute-backports
Components: main restricted universe multiverse
Signed-By: /usr/share/keyrings/ubuntu-archive-keyring.gpg

Types: deb
URIs: http://security.ubuntu.com/ubuntu/
Suites: resolute-security
Components: main restricted universe multiverse
Signed-By: /usr/share/keyrings/ubuntu-archive-keyring.gpg
```

معادل تک‌خطی، که پیش‌فرض 26.04 نیست و فقط اگر مجبورید ابزار قدیمی را بفهمید یا موقت در `sources.list` بگذارید:

```text
deb http://archive.ubuntu.com/ubuntu/ resolute main restricted universe multiverse
deb http://archive.ubuntu.com/ubuntu/ resolute-updates main restricted universe multiverse
deb http://archive.ubuntu.com/ubuntu/ resolute-backports main restricted universe multiverse
deb http://security.ubuntu.com/ubuntu/ resolute-security main restricted universe multiverse
```

قالب تک‌خطی فیلد `Signed-By` را روی همان خط ندارد و APT از کلیدهای پیش‌فرض سیستم استفاده می‌کند. قالب deb822 صریح‌تر است و باید همان را نگه دارید. هر دو را با هم فعال نکنید.

وجود کلید:

```bash
ls -l /usr/share/keyrings/ubuntu-archive-keyring.gpg
```

اگر این فایل نیست، بستهٔ `ubuntu-keyring` خراب یا پاک شده. آن را از کش محلی نصب کنید اگر deb‌اش هنوز در `/var/cache/apt/archives` است. از یک کلید دانلودشده از وبلاگ استفاده نکنید.

تست اینکه آرشیو از این میزبان دیده می‌شود:

```bash
curl -fsSI http://archive.ubuntu.com/ubuntu/dists/resolute/InRelease | head -n 15
```

باید وضعیت HTTP 200 و نوعی از `Content-Type` یا طول ببینید، نه تایم‌اوت. اگر curl خودش باید از پروکسی بیرون برود، تست را بعد از بخش پروکسی تکرار کنید. `apt` از تنظیم curl استفاده نمی‌کند. موفق بودن curl بدون پروکسی و شکست apt، یا برعکس، یعنی تنظیم `Acquire::http::Proxy` با محیط شل یکی نیست.

## Configuration

پروکسی آزمایشگاه، بدون رمز، فقط روی شبکهٔ `10.10.0.0/16`. فایل `/etc/apt/apt.conf.d/01proxy`:

```text
Acquire::http::Proxy "http://proxy.example.internal:3128";
Acquire::https::Proxy "http://proxy.example.internal:3128";
Acquire::http::Proxy::mirror.example.internal "DIRECT";
Acquire::https::Proxy::mirror.example.internal "DIRECT";
```

آینهٔ داخلی نباید دور بزند بیرون را. اگر پروکسی رمز می‌خواهد، رمز را در این فایل جهان‌خوانا نگذارید. حالت فایل را `0600` کنید و رمز نمونه را `change-me` نگذارید و در گیت نفرستید. آزمایشگاه این دانشنامه پروکسی بی‌رمز فرض می‌کند. اگر سازمان رمز دارد، همان فایل `0600` و یک حساب مخصوص APT، نه حساب انسانی شما.

```bash
sudo chmod 644 /etc/apt/apt.conf.d/01proxy
sudo apt update
```

در خروجی update باید همچنان نام میزبان آرشیو را ببینید، نه اینکه خطا بگوید به `127.0.0.1` وصل شده‌اید. اگر پروکسی غلط باشد نمونهٔ شکست:

```text
Could not connect to proxy.example.internal:3128 (10.10.1.5). - connect (111: Connection refused)
```

آن‌وقت یا پروکسی خاموش است یا پورت چیز دیگری است. تا وقتی پروکسی درست نشده، فایل `01proxy` را جابه‌جا کنید و دوباره update بزنید تا بفهمید مسیر مستقیم کار می‌کند یا نه. هر دو مسیر را هم‌زمان خراب دیباگ نکنید.

سوئیچ به آینه وقتی آرشیو از این شبکه باز نمی‌شود. فقط URI عوض می‌شود. `Signed-By` همان کلید رسمی می‌ماند. suite همان `resolute` می‌ماند. این diff بند اول است. بند security را در سناریوی پایین جدا تصمیم بگیرید.

```diff
-URIs: http://archive.ubuntu.com/ubuntu/
+URIs: http://mirror.example.internal/ubuntu/
```

فایل کامل وقتی هم آرشیو و هم security از شبکهٔ شما بسته است و آینه هر دو را همگام کرده:

```text
Types: deb
URIs: http://mirror.example.internal/ubuntu/
Suites: resolute resolute-updates resolute-backports
Components: main restricted universe multiverse
Signed-By: /usr/share/keyrings/ubuntu-archive-keyring.gpg

Types: deb
URIs: http://mirror.example.internal/ubuntu/
Suites: resolute-security
Components: main restricted universe multiverse
Signed-By: /usr/share/keyrings/ubuntu-archive-keyring.gpg
```

قبل از ذخیره، از خود میزبان ببینید آینه فایل امضا را دارد:

```bash
curl -fsSI http://mirror.example.internal/ubuntu/dists/resolute/InRelease
curl -fsSI http://mirror.example.internal/ubuntu/dists/resolute-security/InRelease
```

هر دو باید 200 باشند. اگر دومی 404 است، بند security را به آینه نبرید. بگذارید روی `security.ubuntu.com` بماند اگر آن یکی باز است. اگر هیچ‌کدام باز نیست، آینه ناقص است و با `Trusted: yes` کامل نمی‌شود. مسئول آینه باید suite جاافتاده را همگام کند.

`Signed-By` را به یک فایل کلید که از خود آینه دانلود کرده‌اید عوض نکنید. آینهٔ مخرب کلید و بسته را با هم قاطی می‌دهد و امضا «درست» به نظر می‌رسد. اعتماد شما به کلید داخل ایمیج Ubuntu است که از ISO چک‌سام‌شده آمده، نه به کلیدی که همان HTTP به شما می‌دهد.

بعد از ویرایش:

```bash
sudo apt update
apt policy nginx
```

خروجی update باید `Hit` یا `Get` از `mirror.example.internal` نشان بدهد و نباید بگوید مخزن امضا نشده. `apt policy` باید کاندید را با اولویت ۵۰۰ از همان میزبان نشان بدهد.

همگام‌سازی خود آینه کار میزبان `10.10.1.60` است نه کار `app-1`. حجم آرشیو کامل Ubuntu چندصد گیگابایت است. برای آزمایشگاه فقط معماری لازم را بگیرید نه کل تاریخ را. ابزار `debmirror` این کار را می‌کند. فلگ نادیده گرفتن امضا ندارد در دستوری که این صفحه قبول دارد. نمونه، روی خود میزبان آینه، بعد از `sudo apt install debmirror` و فقط وقتی همان میزبان به آرشیو رسمی دسترسی دارد:

```bash
sudo install -d -o root -g root -m 0755 /srv/mirror/ubuntu
sudo debmirror /srv/mirror/ubuntu \
  --host=archive.ubuntu.com \
  --root=ubuntu \
  --method=http \
  --dist=resolute,resolute-updates,resolute-security,resolute-backports \
  --section=main,restricted,universe,multiverse \
  --arch=amd64 \
  --nosource \
  --progress \
  --keyring=/usr/share/keyrings/ubuntu-archive-keyring.gpg
```

اگر `debmirror` روی نسخهٔ شما فلگ `--keyring` را نپذیرفت، `man debmirror` همان میزبان را بخوانید و فلگ بررسی امضا را برندارید. گزینه‌ای که اسمش ignore یا no-check برای gpg است در این دستور جایی ندارد. بعد از همگام‌سازی، یک وب‌سرور فقط‌خوانا باید `/srv/mirror/ubuntu` را زیر مسیر `/ubuntu/` منتشر کند تا URL با `URIs` بالا یکی شود. Nginx آن میزبان موضوع فصل خودش است. تا وقتی `curl` روی `InRelease` از خود `app-1` کد 200 نمی‌دهد، sources را عوض نکنید.

وب‌سرور آینه نباید `InRelease` را حذف یا بازنویسی کند. برخی تنظیم‌های غلط، فایل ناشناخته را به HTML فهرست دایرکتوری تبدیل می‌کنند. اگر `head` فایل را گرفتید و به‌جای متن امضاشده یک HTML دیدید، APT می‌گوید امضا نامعتبر است. درمان در وب‌سرور آینه است نه `Trusted: yes` روی کلاینت.

## Production Example

سناریو: از `app-1` آرشیو رسمی تایم‌اوت است، پروکسی سازمان هم به آن نمی‌رسد، آینهٔ داخلی بالا است. نشانه:

```text
Err:1 http://archive.ubuntu.com/ubuntu resolute InRelease
  Could not connect to archive.ubuntu.com:80 (....). - connect (113: No route to host)
```

یا با پروکسی:

```text
504 Gateway Time-out
```

قدم‌ها، به همین ترتیب:

1. ساعت را ببینید. `timedatectl` باید همگام باشد. اگر نباشد اول NTP، چون خطای امضا بعد از وصل شدن آینه شما را به شک در کلید می‌اندازد.
2. آینه را بدون APT تست کنید: دو `curl -fsSI` بالا برای `resolute` و `resolute-security`.
3. فایل `ubuntu.sources` را به شکل آینهٔ کامل همین صفحه عوض کنید. `Signed-By` را دست نزنید. فایل تک‌خطی موازی را خالی یا جابه‌جا کنید.
4. اگر ترافیک آینه نباید از پروکسی رد شود، خط `DIRECT` در `01proxy` باشد.
5. `sudo apt update`.
6. `apt policy nginx` و یک نصب بی‌خطر برای اثبات زنجیر، نه یک `full-upgrade` فوری:

```bash
sudo apt update
apt policy bash
sudo apt install --reinstall bash
```

`bash` از قبل نصب است. نصب دوباره ثابت می‌کند deb از آینه می‌آید و امضا قبول شده. اگر update این پیام را داد، آینه را دور نزنید:

```text
The following signatures were invalid: EXPKEYSIG ...
```

یا:

```text
NO_PUBKEY ...
```

کلید روی کلاینت با امضای `InRelease` نمی‌خواند. یا فایل `Signed-By` مسیر غلط دارد، یا آینه محتوا را عوض کرده، یا ساعت خیلی پرت است. `ls` مسیر کلید و `timedatectl` را دوباره ببینید. اگر آینه `InRelease` رسمی را دست نخورده بدهد و ساعت درست باشد و مسیر کلید همان بستهٔ `ubuntu-keyring` باشد، update باید سبز شود.

پیام ممنوع که نباید با «راه‌حل» اشتباه گرفته شود:

```text
N: Updating from such a repository can't be done securely, and is therefore disabled by default.
```

این یعنی APT کارش را کرده. مخزن را امن ندیده. `Trusted: yes` یا `--allow-insecure-repositories` این قفل را برای آزمایش باز می‌کند و همان قفل را در تولید هم باز می‌گذارد. در این دانشنامه آن فلگ‌ها دستور عملیاتی نیستند.

برگرداندن به آرشیو رسمی، روزی که مسیر مستقیم یا پروکسی دوباره سالم است، برعکس همان diff است. security را به `security.ubuntu.com` برگردانید تا به آینهٔ داخلی برای وصله وابسته نمانید، مگر سیاست سازمان این است که تنها مبدأ مجاز همان آینه باشد. در آن حالت آینه باید چند بار در روز همگام شود و شکست همگام‌سازی باید برای تیم مرئی باشد. آینهٔ ساکتِ عقب‌مانده بدتر از آرشیو رسمی کند است چون شما فکر می‌کنید به‌روزید.

Debian را با همین سناریو قاطی نکنید. روی Trixie فایل `/etc/apt/sources.list.d/debian.sources` است، URI پایه معمولاً `http://deb.debian.org/debian` است، suite برابر `trixie` و `trixie-security` و `trixie-updates` است، و `Signed-By` کلید دبیان است. آینهٔ Ubuntu بستهٔ دبیان را به‌درد نمی‌خورد حتی اگر هر دو deb باشند.

## Security Notes

- `InRelease` را از آینه حذف نکنید و روی کلاینت بررسی امضا را خاموش نکنید.
- آینهٔ بی‌نام، آینهٔ با کلید خودساخته، و آینه‌ای که بسته‌اش را از جای ناشناس می‌گیرد قابل اعتماد نیست. سرعت و «داخلی بودن» اعتماد نیست. اعتماد یعنی همان کلید `/usr/share/keyrings/ubuntu-archive-keyring.gpg` فایل را تأیید کند.
- کلید تازه را از خود آینه نصب نکنید تا مشکل امضا حل شود. این حلقه اعتماد را به مهاجم می‌دهد.
- پروکسی با رمز در فایل `0644` یعنی هر حساب محلی رمز خروج سازمان را می‌خواند. یا پروکسی بی‌رمز روی شبکهٔ بسته، یا فایل `0600`.
- `DIRECT` برای آینه را برنمی‌دارید تا ترافیک داخلی بیهوده از یک پروکسی بیرون برود و همان‌جا لاگ شود، مگر سیاست امنیتی سازمان عمداً همهٔ HTTP را در یک نقطه می‌خواهد. اگر چنین سیاستی هست، استثنا را نگذارید و آینه باید از خود پروکسی reachable باشد.
- کامپوننت `multiverse` و `restricted` نرم‌افزار با مجوز متفاوت است. بودنشان در sources پیش‌فرض Ubuntu یعنی قابل نصب‌اند نه اینکه هر بستهٔ آن‌ها را باید نصب کنید. اضافه کردن مخزن شخص ثالث برای یک بسته، سطح امضای کل سیستم را به همان مخزن گره می‌زند. فقط با `Signed-By` مخصوص همان فروشنده، در فایل جدا زیر `sources.list.d`، نه با چسباندن به `ubuntu.sources`.

## Troubleshooting

| نشانه | علت محتمل | کار |
| --- | --- | --- |
| تایم‌اوت به archive.ubuntu.com | مسیر شبکه یا پروکسی | curl مستقیم، بعد فایل 01proxy |
| Connection refused به پورت 3128 | پروکسی گوش نمی‌دهد | سرویس پروکسی، یا برداشتن موقت 01proxy |
| 404 برای resolute-security روی آینه | همگام‌سازی آن suite انجام نشده | بند security را برگردانید یا آینه را کامل کنید |
| `signatures were invalid` | ساعت، کلید غلط، یا دست‌کاری InRelease | `timedatectl` و `Signed-By` و curl خود فایل |
| `NO_PUBKEY` | مسیر کلید اشتباه است | `ls` همان فایل gpg داخل ubuntu-keyring |
| update دو بار یک suite را می‌گوید | هم sources.list و هم ubuntu.sources پر است | یکی را از دور خارج کنید |
| HTML به‌جای InRelease | وب‌سرور آینه فهرست دایرکتوری می‌دهد | تنظیم root وب‌سرور، نه Trusted |
| apt از آینه می‌گیرد ولی خیلی قدیمی است | debmirror عقب مانده | زمان آخرین فایل dists روی آینه |
| Debian بعد از کپی فایل Ubuntu شکسته | کدنام و کلید قاطی شده | debian.sources جدا با trixie |

یک بررسی که HTML را از امضا جدا می‌کند:

```bash
curl -fsS http://mirror.example.internal/ubuntu/dists/resolute/InRelease | head -n 5
```

خط اول فایل سالم شبیه سرآیند امضای OpenPGP است. اگر به‌جایش برچسب صفحهٔ وب یا فهرست دایرکتوری دیدید، کلاینت سالم است و آینه غلط سرو می‌کند.

اگر `apt update` می‌گوید فایل Release منقضی شده (`expired`)، آینه دیگر همگام نمی‌شود و تاریخ داخل Release قدیمی است. APT عمداً فهرست کهنه را رد می‌کند. درمان، یک بار debmirror تازه است. فلگ اجازهٔ مخزن منقضی را در کلاینت روشن نکنید. آن فلگ یعنی قبول فهرست آسیب‌پذیرِ تاریخ‌گذشته.

## Best Practices

- پیش‌فرض 26.04 را deb822 در `ubuntu.sources` نگه دارید. تک‌خطی را فقط برای خواندن سیستم قدیمی بلد باشید و دو قالب را موازی نگذارید.
- URI آینه عوض می‌شود، `Signed-By` و نام suite نه. `resolute` را با سلیقه به اسم سرور عوض نکنید.
- تا `curl` روی `InRelease` کد 200 و سرآیند امضا نداده، sources را عوض نکنید.
- پروکسی در `apt.conf.d` باشد نه در محیط شل، چون systemd و اسکریپت شبانه محیط شما را ندارند.
- آینهٔ داخلی باید `resolute-security` را هم داشته باشد اگر بند security را به آن برده‌اید. وگرنه بند security روی مبدأ رسمی بماند.
- هرگز `Trusted: yes` و هرگز حذف `InRelease`. آینه‌ای که برای کار کردن به این دو نیاز دارد آینه نیست.
