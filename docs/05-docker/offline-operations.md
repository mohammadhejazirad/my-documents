---
sidebar_position: 15
title: کار وقتی اینترنت قطع یا محدود است
description: ترتیب تصمیم وقتی pull شکست می‌خورد، به‌همراه save و load و کش APT و NPM و pip و Composer.
---

# کار وقتی اینترنت قطع یا محدود است

## مقدمه

این صفحه برای شبی است که `docker pull` روی `docker-1.example.internal` خطا می‌دهد، یا از اول می‌دانید `10.10.1.30` به اینترنت آزاد راه ندارد. مقصد انتقال فایل در آزمایشگاه همین میزبان است. مبدأ هر ماشینی است که هنوز شبکه دارد: لپ‌تاپ `ops`، runner، یا خود آینه اگر فایل را آن‌جا جمع کرده‌اید.

هدف این نیست که با یک آینهٔ عمومی ناشناس «راه را باز کنید». هدف این است که همان بایتی که دیروز قابل اعتماد بود امروز روی `10.10.1.30` باشد: ایمیج با `docker save` و `docker load`، بستهٔ deb از کش APT، وابستگی Node از کش یا از `node_modules` ساخته‌شده، چرخ pip، و پوشهٔ `vendor` برای Composer.

آینهٔ زنده اگر هنوز از داخل شبکهٔ آزمایشگاه جواب می‌دهد، اول همان است. این صفحه وقتی شروع می‌شود که آینه هم لایه را ندارد یا خودش از کار افتاده. پیکربندی آینه در [آینهٔ رجیستری](./registry-mirror.md) و [آینهٔ بسته](./package-mirrors.md) است و این‌جا تکرار تنظیم `daemon.json` نیست.

## مفهوم اصلی

قطع شبکه یک خطا نیست. چند خطا است و هر کدام تصمیم جدا دارند.

| شکل خطا | معنی محتمل | تصمیم اول |
| --- | --- | --- |
| timeout یا قطع TCP | مسیر تا رجیستری نیست | ببینید ایمیج محلی هست یا نه |
| خطای گواهی TLS | ساعت، CA، یا نام اشتباه | ساعت و CA را درست کنید. ایمیج را از جای دیگر قرض نگیرید |
| `manifest unknown` | آن تگ در رجیستری نیست | تگ را عوض نکنید به `latest`. تگ را با تیم تطبیق دهید |
| `denied` یا `unauthorized` | اعتبار ورود | راز را در چت نفرستید. ورود رجیستری را جدا حل کنید |
| `no space left on device` | دیسک | `/var/lib/docker` و `/var/lib/containerd` را خالی کنید، نه اینکه pull را تکرار کنید |

`docker save` ایمیج و تگ و لایه‌ها را در یک فایل tar می‌ریزد. ولوم، کانتینر در حال اجرا، و لایهٔ قابل نوشتن کانتینر داخل این فایل نیستند. `docker load` همان تگ‌ها را روی Engine مقصد می‌سازد. اگر تگ از قبل باشد، به محتوای جدید این فایل اشاره می‌کند و کانتینر در حال اجرا تا بازسازی عوض نمی‌شود.

بستهٔ deb فقط روی همان نسخهٔ توزیع و همان معماری قابل نصب است. یک deb که روی Ubuntu 24.04 گرفته شده را روی 26.04 نصب نکنید. `node_modules` که روی مک ساخته شده روی کانتینر لینوکس به‌درد نمی‌خورد اگر افزونهٔ بومی داشته باشد. مبدأ و مقصد را هم‌خانواده بگیرید: Ubuntu 26.04 با Ubuntu 26.04، یا هر دو داخل `node:24-bookworm-slim`.

`npm pack` آرشیو خود پروژه است، نه آرشیو وابستگی‌ها. برای وابستگی یا کش npm را می‌برید و `npm ci --offline` می‌زنید، یا `node_modules` را روی مبدأ هم‌خانواده می‌سازید و با برنامه کپی می‌کنید. این دو را با هم عوض نکنید.

## چرا استفاده می‌شود؟

تکرار `docker pull` در حلقه، دیسک و وقت شیفت را می‌سوزاند و هیچ لایه‌ای خلق نمی‌کند. عوض کردن تگ به `latest` یا پاک کردن تگ از Dockerfile، سرویس را روی بایت ناشناس بالا می‌آورد. آینهٔ تصادفی از اینترنت هم همان ریسک را دارد، با ظاهر «موقت».

مسیر این صفحه کندتر است و قابل توضیح است. در تیکت می‌نویسید فایل از کدام میزبان آمده، جمع sha256 چه بوده، و روی مقصد همان جمع دیده شده. فردا می‌شود فهمید چه اجرا شده.

اگر ایمیج هیچ‌جا در سازمان نیست و Hub هم بسته است، هیچ دستوری آن را نمی‌سازد. کار درست این است که همان را بگویید و منتظر مسیری بمانید که به منبع رسمی می‌رسد. ساختن یک پایهٔ خانگی «شبیه node» وسط حادثه ممنوع است.

## Architecture

```text
مبدأ با شبکه
  docker pull یا docker build
  docker save
  sha256sum
        │
        │  rsync  به ops@10.10.1.30
        ▼
docker-1  ~/incoming
  sha256sum -c
  docker load
  docker images
  docker compose up -d     بدون pull تازه
```

برای بستهٔ سیستم، مبدأ همان نام رمز را دارد: `resolute` یا `trixie`. debها به `/var/backups/debs` روی مقصد می‌روند. برای زبان، مبدأ بیلد همان قفلی را دارد که سرور دارد.

ترتیب را از پایین این صفحه برنگردانید. اول تشخیص، بعد موجودی محلی، بعد آینه، بعد انتقال فایل، آخر اعلام اینکه بایت در سازمان نیست.

## Installation

روی `docker-1` پوشهٔ ورود را `ops` از قبل دارد. اگر ندارد:

```bash
install -d -m 0750 ~/incoming
sudo install -d -o root -g ops -m 0770 /var/backups/images /var/backups/debs
```

ابزار انتقال `rsync` و `ssh` است. هر دو روی میزبان‌های آزمایشگاه هستند. اگر `rsync` نیست، از بستهٔ همان توزیع نصبش کنید، نه از یک tar ناشناس.

```bash
rsync --version
ssh -o BatchMode=yes ops@10.10.1.30 'hostname'
```

خروجی hostname باید `docker-1` یا نامی باشد که در `/etc/hostname` همان میزبان ثبت شده. اگر به میزبان دیگری رسیدید، انتقال را قطع کنید.

روی مبدأ، ابزار جمع کنترلی `sha256sum` از coreutils است. فایل را بدون جمع منتقل نکنید. `rsync` خرابی وسط راه را با `--partial` قابل ادامه می‌کند، ولی سالم بودن محتوا را sha256 می‌گوید نه خود rsync به‌تنهایی.

## Configuration

هیچ کلید دائمی در `daemon.json` برای «حالت آفلاین» نگذارید. Engine اگر ایمیج را محلی داشته باشد و شما pull نخواهید، از شبکه استفاده نمی‌کند. `docker compose up` اگر در فایل تگی باشد که محلی نیست، سعی می‌کند بکشد. قبل از آن `docker images` باید همهٔ تگ‌های فایل را نشان بدهد.

تگ‌های این فصل که باید یا محلی باشند یا در فایل tar:

| تگ | کجا استفاده می‌شود |
| --- | --- |
| `nginx:1.28-alpine` | لبه و مدل |
| `node:24-bookworm-slim` | پایهٔ بیلد |
| `shop-api:1.0.0` | برنامه، فقط از بیلد خودتان |
| `mysql:8.4` | پایگاه |
| `redis:8` | کش |
| `mongo:8` | سند |
| `postgres:18` | پایگاه |
| `registry:2` | خود میزبان آینه |

`latest` را به این فهرست اضافه نکنید تا «چیزی بالا بیاید».

اگر Compose برای بیلد به NPM نیاز دارد و شبکه نیست، بیلد را روی مبدأ انجام دهید و فقط تگ `shop-api:1.0.0` را load کنید. روی مقصد `docker compose up -d` را بدون `--build` بزنید.

## Production Example

### ترتیب تصمیم وقتی pull خطا می‌دهد

این فهرست را از بالا طی کنید و از وسط نپرید.

1. متن خطا را کامل در تیکت بگذارید. timeout و `manifest unknown` و دیسک پر را یک جمله نکنید.
2. جا را بسنجید. اگر پر است، pull بعدی هم می‌میرد.

```bash
df -h / /var/lib/docker /var/lib/containerd
```

3. ببینید تگ از قبل محلی هست یا نه.

```bash
docker images
docker image inspect nginx:1.28-alpine
```

اگر inspect موفق است، pull را متوقف کنید و سرویس را با همان تگ بالا بیاورید.

4. آینه را تست کنید. اگر `docker info` بخش Registry Mirrors را ندارد، کلاینت مستقیم به Hub می‌رود. اگر دارد، خود آینه باید جواب بدهد.

```bash
docker info
getent hosts mirror.example.internal
curl -fsS -o /dev/null -w '%{http_code}\n' https://mirror.example.internal/v2/
```

5. اگر آینه کد `200` می‌دهد، یک بار دیگر همان تگ را pull کنید. شکست این بار یعنی خود آینه به Hub نرسیده و لایه را ندارد. لاگ روی `10.10.1.60` را بخوانید.
6. اگر میزبان دیگری در سازمان همان تگ را دارد، از همان‌جا save بگیرید. از لپ‌تاپ ناشناس همکار که «یک nginx دارد» برندارید مگر digest را با آنچه در انتشار ثبت شده تطبیق دهید.
7. فایل را با rsync به `ops@10.10.1.30` ببرید، جمع را چک کنید، load کنید.
8. اگر هیچ میزبانی تگ را ندارد و راهی به منبع رسمی نیست، بنویسید ایمیج در سازمان موجود نیست. `FROM` را به یک ایمیج شانسی عوض نکنید و `registry-mirrors` را به یک URL عمومی که کسی ادارهٔ سازمان نیست عوض نکنید.
9. برای وابستگی زبان، همان ترتیب را با کش و قفل طی کنید، نه با حذف `package-lock.json`.

### انتقال ایمیج

روی مبدأ، بعد از آنکه `docker images` تگ را نشان داد:

```bash
install -d -m 0750 /var/backups/images
docker save -o /var/backups/images/nginx-1.28-alpine.tar nginx:1.28-alpine
sha256sum /var/backups/images/nginx-1.28-alpine.tar | tee /var/backups/images/nginx-1.28-alpine.tar.sha256
```

چند ایمیج در یک فایل، وقتی می‌خواهید یک پشته را با هم ببرید:

```bash
docker save -o /var/backups/images/shop-set.tar \
  nginx:1.28-alpine \
  node:24-bookworm-slim \
  mysql:8.4 \
  redis:8 \
  mongo:8 \
  postgres:18
sha256sum /var/backups/images/shop-set.tar | tee /var/backups/images/shop-set.tar.sha256
```

انتقال به `10.10.1.30`:

```bash
rsync -a --partial --progress \
  /var/backups/images/shop-set.tar \
  /var/backups/images/shop-set.tar.sha256 \
  ops@10.10.1.30:~/incoming/
```

روی مقصد:

```bash
cd ~/incoming
sha256sum -c shop-set.tar.sha256
docker load -i shop-set.tar
docker images
```

`sha256sum -c` باید `OK` بدهد. اگر نداد، load نکنید. rsync را دوباره بگیرید. `docker images` باید همان تگ‌ها را نشان بدهد. سپس در پوشهٔ سرویس:

```bash
cd /opt/apps/edge
docker compose up -d
curl -fsS http://10.10.1.30:8080/health
```

اگر compose سعی کرد دوباره بکشد و شکست، تگ داخل فایل با تگ load‌شده یکی نیست. فایل را با تگ موجود محلی هم‌خوان کنید، نه اینکه تگ محلی را به `latest`retag کنید.

### APT بدون شبکه روی مقصد

روی یک میزبان متصل با همان نام رمز و همان معماری:

```bash
. /etc/os-release
printf '%s %s\n' "$VERSION_CODENAME" "$(dpkg --print-architecture)"
sudo apt-get update
sudo apt-get install --download-only docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin
```

بسته‌ها در `/var/cache/apt/archives` می‌نشینند. همهٔ debهای لازم، از جمله وابستگی‌هایی که خود فرمان کشیده، باید بروند. فقط پنج نام آشنا کافی نیست اگر کتابخانه‌شان در کش نباشد.

```bash
install -d -m 0750 /var/backups/debs
cp -a /var/cache/apt/archives/*.deb /var/backups/debs/
sha256sum /var/backups/debs/*.deb | tee /var/backups/debs/SHA256SUMS
rsync -a --partial --progress /var/backups/debs/ ops@10.10.1.30:/var/backups/debs/
```

روی `docker-1`، بعد از `sha256sum -c SHA256SUMS`، نصب از فایل محلی بدون کشیدن دوباره:

```bash
cd /var/backups/debs
sudo apt-get install --no-download ./*.deb
```

اگر apt گفت بسته‌ای نیست، همان بسته را روی مبدأ با `--download-only` بگیرید و دوباره بیاورید. `apt-get -f install` که به شبکه وصل شود این‌جا راه نیست. منبع apt را وسط کار به یک آدرس ناشناس عوض نکنید.

### NPM

`npm pack` داخل پوشهٔ پروژه فقط آرشیو خود `shop-api` را می‌سازد. وابستگی را شامل نمی‌شود. برای برنامهٔ بدون وابستگی این فصل، همان قفل و سورس کافی است و بیلد داخل ایمیجی که پایهٔ `node:24-bookworm-slim` را محلی دارید انجام می‌شود، به شرطی که `npm ci` به شبکه نرود. با قفل بدون وابستگی، کش خالی هم باید کافی باشد. اگر `npm ci` باز هم به شبکه رفت، شبکه را با محیط اجرا ببندید تا به‌جای صبر طولانی واضح شکست بخورد، بعد علت را بخوانید.

برای پروژه‌ای که وابستگی دارد، روی مبدأ متصل و با همان قفل:

```bash
cd /opt/apps/shop-api
npm ci
npm cache verify
tar -C "$HOME/.npm" -czf /var/backups/npm-cache.tar.gz .
sha256sum /var/backups/npm-cache.tar.gz | tee /var/backups/npm-cache.tar.gz.sha256
rsync -a --partial --progress /var/backups/npm-cache.tar.gz ops@10.10.1.30:~/incoming/
```

روی مقصد، کش را باز کنید و فقط آفلاین نصب کنید:

```bash
install -d -m 0750 "$HOME/.npm"
tar -C "$HOME/.npm" -xzf ~/incoming/npm-cache.tar.gz
cd /opt/apps/shop-api
npm ci --offline
```

اگر `--offline` بسته‌ای را کم داشت، به شبکه دست نمی‌زند و خطا می‌دهد. همان بسته را در کش مبدأ پیدا کنید. قفل را حذف نکنید.

جایگزین وقتی افزونهٔ بومی ندارید یا مبدأ و مقصد هر دو همان ایمیج لینوکس هستند: کل `node_modules` ساخته‌شده را با tar ببرید و روی مقصد اصلاً `npm ci` نزنید. این روش وقتی libc دو طرف فرق دارد می‌شکند. ترجیح این صفحه کش به‌علاوهٔ `npm ci --offline` است.

`npm pack` را وقتی بزنید که می‌خواهید خود پروژه را مثل یک بسته جابه‌جا کنید:

```bash
npm pack
```

فایل `shop-api-1.0.0.tgz` وابستگی نیست. کنارش باید قفل و کش هم باشد وگرنه مقصد همان تاربال را باز می‌کند و باز به رجیستری نیاز دارد.

### pip و Composer

روی مبدأ، با همان نسخهٔ Python:

```bash
python3 -m pip download --dest /var/backups/wheels -r requirements.txt
sha256sum /var/backups/wheels/* | tee /var/backups/wheels/SHA256SUMS
rsync -a --partial --progress /var/backups/wheels/ ops@10.10.1.30:/var/backups/wheels/
```

روی مقصد:

```bash
python3 -m pip install --no-index --find-links /var/backups/wheels -r requirements.txt
```

`--no-index` یعنی به PyPI نرو حتی اگر آینه در `pip.conf` مانده باشد. اگر چرخی کم باشد فرمان می‌ایستد.

برای Composer، ضمانت آفلاین پوشهٔ `vendor` است که `composer install` روی مبدأ، با همان نسخهٔ PHP و با `composer.lock`، ساخته است. پرچمی که «شاید از کش استفاده کند و شاید به شبکه بزند» ضمانت نیست.

```bash
composer install --no-dev --prefer-dist
tar -czf /var/backups/vendor.tar.gz vendor composer.lock composer.json
sha256sum /var/backups/vendor.tar.gz | tee /var/backups/vendor.tar.gz.sha256
rsync -a --partial --progress /var/backups/vendor.tar.gz ops@10.10.1.30:~/incoming/
```

روی مقصد آرشیو را در پوشهٔ برنامه باز کنید و `composer update` نزنید. اگر `vendor` کامل است، فرایند PHP را همان‌طور راه بیندازید. `composer install` روی مقصد فقط وقتی مجاز است که مطمئنید هیچ درخواستی به شبکه نمی‌زند. در غیر این صورت همان `vendor` مبدأ منبع حقیقت است.

## Security Notes

فایل tar ایمیج را مثل باینری Production نگه دارید. هر کسی آن را عوض کند، `docker load` همان را اجرا می‌کند. جمع sha256 را از کانال دیگری غیر از خود فایل تأیید کنید اگر مبدأ و کانال انتقال یکی نیست. حداقل، جمع را روی مبدأ ببینید و روی مقصد `sha256sum -c` بگیرید و در تیکت بنویسید.

از ایمیج و deb که همکار «از یک کانال عمومی ذخیره کرده» استفاده نکنید. مبدأ باید میزبان خود سازمان باشد که یا از آینهٔ خودتان کشیده یا از منبع رسمی.

`~/incoming` را جهان‌خوان نکنید. `0750` برای پوشه و مالک `ops`. فایل env و توکن را داخل tar ایمیج نفرستید. `docker save` از ایمیجی که راز در لایه‌اش مانده، راز را هم می‌برد. قبل از save، `docker history` را ببینید. اگر توکن دیدید آن تگ را منتقل نکنید.

`apt-get install ./*.deb` بسته‌ای را که در پوشه است نصب می‌کند. پوشهٔ `/var/backups/debs` را با deb دانلودشده از جای دیگر قاطی نکنید. جمع‌ها را با `SHA256SUMS` چک کنید.

گروه `docker` روی مقصد معادل root است. `docker load` را فقط `ops` اجرا می‌کند.

## Troubleshooting

| نشانه | علت | کار |
| --- | --- | --- |
| `sha256sum -c` شکست | انتقال ناقص یا فایل عوض شده | دوباره rsync. load ممنوع |
| load تمام شد ولی `compose up` باز pull می‌کند | تگ فایل با تگ محلی فرق دارد | `docker images` را با compose تطبیق دهید |
| save خیلی بزرگ است | چند ایمیج پایه در یک tar، یا زمینهٔ کثیف داخل ایمیج برنامه | جدا save کنید. `.dockerignore` را درست کنید |
| `no space left` موقع load | مقصد جا ندارد | `df` روی هر دو مسیر Docker. فایل tar هم جا می‌گیرد. بعد از load می‌توانید tar را به دیسک دیگر ببرید |
| `apt-get --no-download` بسته کم دارد | وابستگی را نیاورده‌اید | روی مبدأ `--download-only` را تکرار کنید |
| deb نصب می‌شود و سرویس غریبه بالا می‌آید | deb مال توزیع دیگر است | نام رمز مبدأ و مقصد را چاپ کنید |
| `npm ci --offline` خطا می‌دهد | کش ناقص است | همان خطا نام بسته را دارد. از مبدأ اضافه کنید. آنلاینش نکنید |
| `npm pack` را بردید و هنوز NPM می‌خواهد | pack وابستگی نیست | کش یا `node_modules` هم‌خانواده |
| pip می‌خواهد به اینترنت برود | `--no-index` را نزده‌اید | همان پرچم صفحه |
| vendor هست ولی برنامه کلاس کم دارد | `composer install` ناقص بوده یا PHP دو طرف فرق دارد | مبدأ را با همان نسخهٔ PHP دوباره بسازید |
| وسوسهٔ آینهٔ ناشناس | این صفحه را نیمه‌کاره رها کرده‌اید | به قدم ۸ ترتیب تصمیم برگردید |

اگر `docker load` وسط کار قطع شد، فضا را خالی کنید و همان فایل را دوباره load کنید. tar نیمه‌کاره را با یک ایمیج سالم اشتباه نگیرید. تا `sha256sum -c` سبز نشده هیچ فایلی سالم نیست.

## Best Practices

- خطا را دسته‌بندی کنید، بعد فرمان بزنید.
- اول `docker images` و `docker image inspect`. ایمیج محلی را دوباره نکشید.
- آینهٔ سازمان را قبل از حمل دستی تست کنید.
- حمل با `docker save`، `sha256sum`، `rsync` به `ops@10.10.1.30`، و `docker load` فقط بعد از جمع درست.
- ولوم را با save منتقل‌شده فرض نکنید.
- deb را از میزبان با همان `resolute` یا `trixie` و همان معماری بگیرید و با `--no-download` نصب کنید.
- `npm pack` را با کش وابستگی اشتباه نگیرید. نصب آفلاین `npm ci --offline` است.
- pip را با `--no-index` و `--find-links` نصب کنید.
- Composer را با `vendor` ساخته‌شده روی همان نسخهٔ PHP ببرید و روی مقصد `update` نزنید.
- تگ را به `latest` پایین نیاورید و آینهٔ ناشناس در daemon ننویسید.
- اگر بایت در سازمان نیست، همان را گزارش کنید.
