---
sidebar_position: 14
title: آینهٔ APT و NPM و pip و Composer
description: مکانیزم آینهٔ داخلی برای APT و NPM و pip و Composer، با هشدار اعتماد و آدرس آزمایشگاه.
---

# آینهٔ APT و NPM و pip و Composer

## مقدمه

آینهٔ رجیستری Docker ایمیج را حل می‌کند و بس. نصب بستهٔ سیستم، ماژول Node، چرخ پایتون، و بستهٔ PHP هر کدام مسیر خودشان را دارند. میزبان این هر چهار سرویس در آزمایشگاه همان `mirror.example.internal` روی `10.10.1.60` است. URL نمونه `https://mirror.example.internal` است و سازمان اگر مسیر واقعی‌اش فرق دارد همان را می‌گذارد. نام را از یک فهرست عمومی آینه کپی نکنید.

این صفحه چهار مکانیزم را کامل می‌نویسد: APT با deb822، NPM با کلید `registry` در `.npmrc`، pip با `index-url` در `pip.conf`، و Composer با `composer config repos.packagist`. هر چهار تا بدون بررسی اعتماد خطرناک‌اند، چون کسی که آینه را کنترل می‌کند می‌تواند محتوای بسته را عوض کند مگر امضا یا hash قفل جلویش را بگیرد.

## مفهوم اصلی

آینهٔ درست دو ویژگی دارد. اول محتوا را از منبع اصلی می‌گیرد و همان بایت را پس می‌دهد. دوم یا امضای منبع اصلی را دست نمی‌زند، یا اگر خودش مخزن جدا می‌سازد، کلید جدا دارد و شما آگاهانه به آن کلید اعتماد کرده‌اید.

برای APT اوبونتو و دبیان، آینهٔ مستقیم آرشیو همان امضای Release رسمی را دارد. `Signed-By` باید همان کلید آرشیو بماند. اگر آینه Release را با کلید خودش دوباره امضا کند، شما به کلید سازمان اعتماد می‌کنید و آن کلید به‌اندازهٔ root روی میزبان قدرت دارد، چون بسته می‌تواند هر فایلی را عوض کند.

برای NPM و pip و Composer، قفل وابستگی hash محتوا را نگه می‌دارد. آینه‌ای که تاربال را عوض کند ولی نسخه را همان نگه دارد، در `npm ci` و در نصب مبتنی بر hash شکست می‌خورد. آینه‌ای که نسخهٔ دیگری را به‌جای نسخهٔ قفل پیشنهاد کند، وقتی خطرناک است که قفل را کنار بگذارید و `npm install` یا `composer update` آزاد بزنید. روی سرویس Production این کار را از آینه نزنید. قفل را روی شبکهٔ قابل اعتماد بسازید و روی میزبان مقصد فقط نصب از همان قفل را انجام دهید.

هیچ‌کدام از این ابزارها را با خاموش کردن TLS «راه نیندازید». گواهی داخلی یعنی CA سازمان در اعتماد سیستم، نه `strict-ssl` خاموش و نه `trusted-host` و نه `secure-http` نادرست.

## چرا استفاده می‌شود؟

بیلد روی `docker-1` یا روی runner به این چهار منبع می‌خورد، حتی اگر ایمیج پایه از آینهٔ Docker آمده باشد. `npm ci` داخل Dockerfile به رجیستری NPM می‌رود. `apt-get` داخل یک ایمیج Debian به آرشیو همان توزیع می‌رود، جدا از APT خود میزبان. `pip install` و `composer install` هم همین‌طور.

بدون آینهٔ سازمانی، قطع مسیر یعنی بیلد می‌خوابد و کسی یک آینهٔ ناشناس در فایل پروژه می‌گذارد. این صفحه همان جای خالی را با آدرس داخلی پر می‌کند تا فایل پروژه از اول درست باشد.

فرق با [آینهٔ رجیستری](./registry-mirror.md) را در گزارش حادثه حفظ کنید. `registry-mirrors` بستهٔ apt را سریع نمی‌کند. `.npmrc` هم `docker pull` را عوض نمی‌کند.

## Architecture

```text
میزبان بیلد و docker-1
  ├─ /etc/apt/sources.list.d/*.sources     APT
  ├─ /opt/apps/shop-api/.npmrc             NPM
  ├─ /etc/pip.conf                         pip
  └─ composer.json  repos.packagist        Composer
        │
        │  HTTPS
        ▼
mirror.example.internal   10.10.1.60
  /ubuntu
  /ubuntu-security
  /debian
  /debian-security
  /docker          آینهٔ download.docker.com، امضای رسمی Docker
  /npm/
  /pypi/simple/
  /composer
```

مسیرها نمونهٔ خوانا هستند. اگر نرم‌افزار آینهٔ سازمان مسیر دیگری دارد، همان را در فایل بنویسید و در همین دانشنامهٔ داخلی ثبت کنید. چیزی که نباید عوض شود مکانیزم هر ابزار است، نه الزام به یک نرم‌افزار آینهٔ خاص.

## Installation

قبل از عوض کردن منبع، از میزبانی که هنوز منبع قبلی‌اش کار می‌کند یک بار به‌روزرسانی بگیرید و مطمئن شوید نام آینه حل می‌شود.

```bash
getent hosts mirror.example.internal
curl -fsS -o /dev/null -w '%{http_code}\n' https://mirror.example.internal/
```

`getent` باید `10.10.1.60` باشد. کد HTTP صفحهٔ ریشه به نرم‌افزار آینه بستگی دارد. مهم این است که TLS بدون نادیده گرفتن گواهی تمام شود. CA داخلی را مثل صفحهٔ رجیستری با `update-ca-certificates` روی میزبان بگذارید.

کلید آرشیو را از بستهٔ خود توزیع پیدا کنید و همان مسیر را در `Signed-By` بگذارید. حدس نزنید.

```bash
dpkg -L ubuntu-archive-keyring | grep keyrings
dpkg -L debian-archive-keyring | grep keyrings
```

روی Ubuntu 26.04 مسیر معمول `/usr/share/keyrings/ubuntu-archive-keyring.gpg` است. روی Debian 13 مسیر معمول `/usr/share/keyrings/debian-archive-keyring.gpg` است. اگر فرمان بالا مسیر دیگری نشان داد، همان را بنویسید.

## Configuration

### APT روی Ubuntu 26.04

فایل فعلی `/etc/apt/sources.list.d/ubuntu.sources` است. قبل از جایگزینی کپی بگیرید.

```bash
sudo cp -a /etc/apt/sources.list.d/ubuntu.sources /etc/apt/sources.list.d/ubuntu.sources.bak
```

فایل تازه. suite باید `resolute` باشد. بخش security را حذف نکنید، وگرنه میزبان به‌روزرسانی امنیتی را از دست می‌دهد.

```text
Types: deb
URIs: https://mirror.example.internal/ubuntu
Suites: resolute resolute-updates resolute-backports
Components: main universe restricted multiverse
Signed-By: /usr/share/keyrings/ubuntu-archive-keyring.gpg

Types: deb
URIs: https://mirror.example.internal/ubuntu-security
Suites: resolute-security
Components: main universe restricted multiverse
Signed-By: /usr/share/keyrings/ubuntu-archive-keyring.gpg
```

`universe` را اگر آینه ندارد برندارید و توقع نداشته باشید بستهٔ universe نصب شود. یا آینه آن جزء را دارد یا آن جزء را از فایل حذف می‌کنید و می‌دانید چه بسته‌هایی دیگر نمی‌آیند. `trusted=yes` ننویسید. آن گزینه بررسی امضا را کنار می‌گذارد.

روی Ubuntu 24.04 همین فایل با `noble` به‌جای `resolute` است.

### APT روی Debian 13

```text
Types: deb
URIs: https://mirror.example.internal/debian
Suites: trixie trixie-updates
Components: main
Signed-By: /usr/share/keyrings/debian-archive-keyring.gpg

Types: deb
URIs: https://mirror.example.internal/debian-security
Suites: trixie-security
Components: main
Signed-By: /usr/share/keyrings/debian-archive-keyring.gpg
```

### آینهٔ مخزن Docker

اگر خود `download.docker.com` هم باید از آینه بیاید، این فایل جدا از آرشیو توزیع است و کلیدش همچنان `/etc/apt/keyrings/docker.asc` رسمی است. آینه نباید این ایندکس را با کلید دیگری امضا کند. روی Ubuntu:

```text
Types: deb
URIs: https://mirror.example.internal/docker
Suites: resolute
Components: stable
Signed-By: /etc/apt/keyrings/docker.asc
```

روی Debian به‌جای `resolute` مقدار `trixie` و کلید همان فایل است، به شرطی که کلید را از `https://download.docker.com/linux/debian/gpg` گرفته باشید، نه از مسیر اوبونتو. جزئیات کلید در [نصب](./installation.md) است.

بعد از نوشتن منبع:

```bash
sudo apt update
apt-cache policy docker-ce
```

باید URL آینه را در کاندیدا ببینید، نه خطای امضا. اگر امضا شکست، فایل را از `.bak` برگردانید و آینه را متهم کنید، نه اینکه `Signed-By` را حذف کنید.

### NPM

فایل پروژه، نه فایل جهانی روی لپ‌تاپ شخصی، تا بیلد روی `docker-1` همان را ببیند. مسیر `/opt/apps/shop-api/.npmrc`:

```text
registry=https://mirror.example.internal/npm/
```

انتهای آدرس با `/` است. تأیید:

```bash
npm config get registry --userconfig /opt/apps/shop-api/.npmrc
```

باید همان URL را چاپ کند. `package-lock.json` باید از قبل وجود داشته باشد. `npm ci` اگر hash تاربال با قفل نخواند می‌ایستد. این ایستادن یعنی آینه یا خراب است یا مخرب. آن را با پاک کردن قفل دور نزنید.

توکن اگر آینهٔ خصوصی لازم دارد، در `.npmrc` پروژه که commit می‌شود نگذارید. در فایل خانگی `ops` با مجوز `0600`:

```text
registry=https://mirror.example.internal/npm/
//mirror.example.internal/npm/:_authToken=change-me
```

`change-me` را با توکن واقعی عوض کنید و فایل را commit نکنید. `strict-ssl=false` را به این فایل اضافه نکنید. اگر CA داخلی است، همان CA سیستم یا متغیر `NODE_EXTRA_CA_CERTS` که به فایل CA اشاره می‌کند کافی است.

داخل Dockerfile، این `.npmrc` پروژه که فقط URL بی‌رمز دارد می‌تواند کپی شود. فایل دارای توکن باید secret موقت باشد، همان‌طور که در [Dockerfile](./dockerfile.md) آمده، نه `ARG`.

### pip

فایل `/etc/pip.conf` برای کل میزبان، یا `PIP_CONFIG_FILE` برای یک سرویس:

```text
[global]
index-url = https://mirror.example.internal/pypi/simple/
timeout = 30
```

`trusted-host` را وقتی گواهی معتبر است ننویسید. آن گزینه بررسی میزبان و گواهی را برای همان آدرس ضعیف می‌کند. فقط اگر برای تشخیص یک قطعی موقت لازم شد، بعد از تشخیص حذفش کنید و در فایل ماندگار نگذارید.

نصب قابل اعتماد از فایلی است که برای هر بسته hash دارد. hash را با `python3 -m pip hash` روی چرخی که از منبع مورد اعتماد گرفته‌اید حساب کنید و در `requirements.txt` بگذارید. سپس:

```bash
python3 -m pip install --require-hashes --requirement requirements.txt
```

اگر آینه محتوا را عوض کرده باشد، این فرمان شکست می‌خورد. hash ساختگی در مستند نمی‌گذاریم تا کسی همان را کپی نکند و فکر کند نصب امن است.

### Composer

داخل پوشهٔ پروژه، تا در گیت بماند و به تنظیم جهانی لپ‌تاپ وابسته نباشد:

```bash
composer config repos.packagist composer https://mirror.example.internal/composer
```

نتیجه در `composer.json` شکلی مثل این است:

```json
{
  "repositories": {
    "packagist": {
      "type": "composer",
      "url": "https://mirror.example.internal/composer"
    }
  }
}
```

این کلید منبع پیش‌فرض Packagist را با آینه عوض می‌کند. URL باید ریشهٔ مخزن Composer باشد، یعنی همان‌جایی که `packages.json` را سرو می‌کند. اگر `composer diagnose` آن را نمی‌خواند، مسیر را از سند آینهٔ خود سازمان بردارید و حدس نزنید.

`secure-http` باید روشن بماند. پیش‌فرض Composer همین است. آن را خاموش نکنید. نصب Production با `composer install` از روی `composer.lock` است، نه `composer update`. قفل، نسخه و checksum محتوا را دارد.

توکن مخزن خصوصی در `auth.json` است. آن فایل را gitignore کنید و `0600` نگه‌دارید. `change-me` اگر در مثال توکن دیدید نمونه است و نباید در مخزن بماند. این صفحه توکن را داخل `composer.json` نمی‌گذارد.

## Production Example

روی یک میزبان تازهٔ Ubuntu 26.04 ترتیب بررسی این است.

```bash
getent hosts mirror.example.internal
sudo apt update
apt-cache policy nginx
npm config get registry --userconfig /opt/apps/shop-api/.npmrc
python3 -m pip config get global.index-url
composer diagnose
```

`apt-cache policy` باید URL را با `mirror.example.internal` نشان بدهد. `pip config` اگر فایل را نخوانده، مسیر را با `python3 -m pip config list` پیدا کنید. `composer diagnose` باید به مخزن آینه اشاره کند نه اینکه خطای TLS بدهد.

یک نصب واقعی بسته را فقط وقتی انجام دهید که به آن بسته نیاز دارید. برای آزمون مکانیزم، `apt-get download` یک بستهٔ کوچک بهتر از ارتقای کامل بی‌برنامه است.

```bash
cd /tmp
apt-get download hello
```

اگر این فرمان بسته را از آینه گرفت و `apt-cache policy` منبع را درست نشان داد، APT تمام است. فایل deb آزمایشی را بعد از آزمون حذف کنید.

## Security Notes

آینه را مثل رجیستری رمزدار اداره کنید. دسترسی نوشتن به دیسک آینه یعنی توانایی جایگزینی بسته. شبکهٔ `10.10.1.60` نباید از اینترنت عمومی بی‌محافظ قابل نوشتن باشد.

این کارها ممنوع است، چون مکانیزم اعتماد را خاموش می‌کنند:

- `trusted=yes` در منبع APT
- حذف `Signed-By`
- `strict-ssl=false` در NPM
- `trusted-host` دائمی در pip
- `secure-http` خاموش در Composer
- `composer update` یا `npm install` بدون قفل، روی سرور Production، از آینه‌ای که آن روز کسی بررسی نکرده

قفل و امضا را نگه دارید. آینهٔ سازمان جایگزین قفل نیست. آینه فقط محل دریافت همان بایتی است که قفل گفته.

توکن `change-me` را عوض کنید. فایل حاوی توکن `0600` باشد. `.npmrc` دارای توکن و `auth.json` وارد زمینهٔ Docker نشوند. `.dockerignore` در صفحهٔ Dockerfile همین را می‌گوید.

اگر شک کردید آینه محتوا را عوض کرده، نصب را متوقف کنید، قفل یا امضا را با یک کپی که از قبل خارج از آینه نگه داشته‌اید مقایسه کنید، و آینه را از فایل منبع برندارید تا با یک آدرس ناشناس عوضش کنید.

## Troubleshooting

| نشانه | علت | کار |
| --- | --- | --- |
| `apt update` خطای امضا | آینه Release را عوض کرده یا کلید غلط است | `.bak` را برگردانید. `trusted=yes` نگذارید |
| 404 روی suite | مسیر آینه یا `resolute` در برابر `trixie` غلط است | URL را از سند آینه بردارید |
| security به‌روز نمی‌شود | بلوک دوم منبع حذف شده | suite امنیتی را برگردانید |
| `npm ci` خطای integrity | تاربال با قفل یکی نیست | آینه را بررسی کنید. قفل را پاک نکنید |
| NPM خطای گواهی | CA داخلی روی بیلد نیست | CA سیستم یا `NODE_EXTRA_CA_CERTS` |
| pip هنوز به pypi.org می‌رود | `pip.conf` را نخوانده | `pip config list` و مسیر فایل |
| `composer diagnose` به packagist.org می‌رود | `repos.packagist` تنظیم نشده | همان `composer config` را در پوشهٔ پروژه بزنید |
| Docker pull با این صفحه درست شد ولی apt نه | ابزار اشتباه را تنظیم کرده‌اید | این صفحه غیر از کلید `registry-mirrors` است |

اگر `apt update` میزبان را شکست، سرویس‌های در حال اجرا را با عجله ارتقا ندهید. منبع را برگردانید، `apt update` را دوباره سبز کنید، بعد علت آینه را ببینید.

## Best Practices

- هر چهار ابزار به `https://mirror.example.internal` روی `10.10.1.60` اشاره کنند، با مسیری که خود آینه سند کرده.
- APT را deb822 بنویسید و `Signed-By` را نگه دارید. suite امنیتی را حذف نکنید.
- Ubuntu 26.04 برابر `resolute` و Debian 13 برابر `trixie`.
- NPM در `.npmrc` پروژه با کلید `registry`. توکن در فایل جدا با `0600`.
- pip فقط `index-url`. بدون `trusted-host` دائمی.
- Composer با `composer config repos.packagist` داخل پروژه.
- نصب Production از قفل، نه از به‌روزرسانی آزاد.
- TLS را خاموش نکنید. CA سازمان را درست نصب کنید.
- این آینه را با `registry-mirrors` یکی ندانید.
- وقتی آینه خراب است به یک URL ناشناس پناه نبرید. مسیر قطع شبکه در [کار آفلاین](./offline-operations.md) است.
