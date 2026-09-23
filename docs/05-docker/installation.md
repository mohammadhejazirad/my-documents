---
sidebar_position: 3
title: نصب Docker روی Ubuntu و Debian
description: نصب Docker Engine از download.docker.com روی Ubuntu 26.04 و Debian 13 با deb822.
---

# نصب Docker روی Ubuntu و Debian

## مقدمه

میزبان Docker آزمایشگاه `docker-1.example.internal` با آدرس `10.10.1.30` است. این صفحه Engine را از مخزن رسمی Docker نصب می‌کند، نه از بستهٔ توزیعی. روی Ubuntu نام آن بستهٔ توزیعی `docker.io` است. روی Debian هم بسته‌ای با همین نقش در آرشیو توزیع وجود دارد. هر دو را فقط برای اینکه موقع حذف و موقع خواندن `apt-cache policy` اشتباه نگیرید اسم می‌بریم. مسیر اصلی این دانشنامه `https://download.docker.com` است.

دستور چندسرویسی بعد از این نصب `docker compose` با فاصله است. پلاگین را بستهٔ `docker-compose-plugin` می‌آورد. باینری پایتونی `docker-compose` را نصب نکنید و اگر از قبل مانده، مبنای کار قرار ندهید.

Ubuntu 26.04 LTS نام رمز `resolute` دارد. Debian 13 نام رمز `trixie` دارد. اگر میزبان هنوز Ubuntu 24.04 است، نام رمز `noble` است و تنها فرق عملی در خط `Suites` است. بقیهٔ بسته‌ها و مسیر کلید همان است.

## مفهوم اصلی

نصب رسمی پنج بسته است:

| بسته | نقش |
| --- | --- |
| `docker-ce` | دیمون Engine |
| `docker-ce-cli` | کلاینت `docker` |
| `containerd.io` | runtime و، روی نصب تازه، فروشگاه ایمیج |
| `docker-buildx-plugin` | بیلد با BuildKit از راه `docker build` |
| `docker-compose-plugin` | زیر‌دستور `docker compose` |

بستهٔ `containerd.io` همین مخزن، خط containerd 2 است. روی نصب تازهٔ Engine 29 و جدیدتر، فروشگاه ایمیج containerd پیش‌فرض است و محتوای ایمیج زیر `/var/lib/containerd` می‌رود. ولوم و بقیهٔ متادیتا زیر `/var/lib/docker` می‌مانند. اگر Engine را از نسخهٔ قدیمی‌تر ارتقا داده‌اید، درایور قبلی سر جایش می‌ماند. هیچ‌کدام از این دو حالت دستور `docker pull` یا `docker images` یا `docker build` را عوض نمی‌کند. لازم نیست برای «تمام شدن نصب» کلیدی در `daemon.json` روشن یا خاموش کنید. سوییچ دستی فروشگاه، ایمیج‌های درایور دیگر را از فهرست پنهان می‌کند در حالی که روی دیسک هستند. این کار را وسط شیفت انجام ندهید.

کلید امضای مخزن فایل `/etc/apt/keyrings/docker.asc` است و منبع APT به شکل deb822 در `/etc/apt/sources.list.d/docker.sources` نوشته می‌شود. `Signed-By` به همان فایل کلید اشاره می‌کند. منبع تک‌خطی قدیمی `docker.list` را کنار این فایل نگذارید، وگرنه APT یک مخزن را دو بار می‌بیند.

## چرا استفاده می‌شود؟

بستهٔ `docker.io` را نگهداری‌کنندهٔ توزیع می‌سازد. نسخه، پلاگین Compose، و زمان رسیدن اصلاح امنیتی‌اش با Engine رسمی یکی نیست. تیم باید بتواند `docker version` و `docker compose version` را با سند انتشار Docker تطبیق بدهد. مخزن `download.docker.com` همان تطبیق را ممکن می‌کند.

نصب از اسکریپت لوله‌شده به شل در این دانشنامه استفاده نمی‌شود. اسکریپت تعاملی مخزن را پنهان می‌کند و بازتولیدش روی سرور بعدی سخت‌تر است. مراحل زیر همان کاری را می‌کنند که باید قابل بازخوانی باشد: کلید، فایل منبع، نام بسته، و سرویس systemd.

## Architecture

```text
apt
  │
  ├─ /etc/apt/keyrings/docker.asc
  └─ /etc/apt/sources.list.d/docker.sources
         │
         ▼
download.docker.com   stable   resolute  یا  trixie
         │
         ▼
docker.service  ──depends──►  containerd.service
         │
         ├─ /run/docker.sock          اختیار معادل root
         ├─ /etc/docker/daemon.json
         ├─ /var/lib/docker
         └─ /var/lib/containerd       نصب تازه
```

کلاینت `docker` با سوکت یونیکس با دیمون حرف می‌زند. عضویت در گروه `docker` یعنی حق نوشتن روی این سوکت. سرویس را `systemd` بالا نگه می‌دارد. `docker.socket` هم ممکن است با بسته فعال شود. اگر سوکت فعال باشد، توقف ظاهری `docker.service` با اولین اتصال دوباره سرویس را بالا می‌آورد. هر دو واحد را در عیب‌یابی چک کنید.

## Installation

این بخش را روی میزبان با کاربر `ops` اجرا کنید، جایی که `sudo` دارید. قبل از اضافه کردن مخزن، بسته‌های متضاد توزیع را بردارید. `apt remove` روی بسته‌ای که نصب نیست خطا نمی‌دهد.

```bash
sudo apt update
sudo apt remove -y docker.io docker-doc docker-compose podman-docker containerd runc
sudo apt install -y ca-certificates curl
sudo install -m 0755 -d /etc/apt/keyrings
```

`containerd` و `runc` در فرمان بالا بسته‌های توزیع‌اند، نه `containerd.io`. بعد از نصب رسمی، `containerd.io` جای runtime را می‌گیرد.

نام رمز را از خود میزبان بخوانید. روی Ubuntu 26.04 باید `resolute` باشد و روی Debian 13 باید `trixie` باشد. اگر چیز دیگری چاپ شد، فایل منبع را با عجله ننویسید.

```bash
. /etc/os-release
printf '%s\n' "$VERSION_CODENAME"
dpkg --print-architecture
```

### Ubuntu 26.04

کلید و فایل منبع فقط برای اوبونتو:

```bash
sudo curl -fsSL https://download.docker.com/linux/ubuntu/gpg -o /etc/apt/keyrings/docker.asc
sudo chmod a+r /etc/apt/keyrings/docker.asc
sudo tee /etc/apt/sources.list.d/docker.sources > /dev/null <<'EOF'
Types: deb
URIs: https://download.docker.com/linux/ubuntu
Suites: resolute
Components: stable
Signed-By: /etc/apt/keyrings/docker.asc
EOF
```

اگر میزبان 24.04 است، در همین فایل به‌جای `resolute` مقدار `noble` بنویسید. بقیهٔ خط‌ها همان می‌ماند. روی 26.04 خط `Suites` باید `resolute` بماند.

### Debian 13

کلید دبیان مسیر جدا دارد. فایل اوبونتو را روی دبیان کپی نکنید.

```bash
sudo curl -fsSL https://download.docker.com/linux/debian/gpg -o /etc/apt/keyrings/docker.asc
sudo chmod a+r /etc/apt/keyrings/docker.asc
sudo tee /etc/apt/sources.list.d/docker.sources > /dev/null <<'EOF'
Types: deb
URIs: https://download.docker.com/linux/debian
Suites: trixie
Components: stable
Signed-By: /etc/apt/keyrings/docker.asc
EOF
```

### نصب بسته‌ها

روی هر دو توزیع، بعد از نوشتن منبع:

```bash
sudo apt update
sudo apt install -y docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin
sudo systemctl enable --now docker.service
sudo systemctl enable --now containerd.service
```

نسخهٔ دقیق را پین نمی‌کنیم، چون شمارهٔ patch در این صفحه کهنه می‌شود. اگر سیاست سازمان پین می‌خواهد، اول فهرست واقعی را ببینید و همان رشته را کپی کنید.

```bash
apt-cache policy docker-ce
apt list --all-versions docker-ce
```

در خروجی `policy` باید URL برابر `https://download.docker.com/linux/ubuntu` یا مسیر `debian` باشد و suite برابر `resolute` یا `trixie`. اگر کاندیدا از آرشیو خود Ubuntu آمده و بستهٔ نصب‌شده `docker.io` است، این صفحه را درست اجرا نکرده‌اید.

برای دیدن نسخهٔ در حال اجرا:

```bash
docker version
docker compose version
containerd --version
docker buildx version
```

خط Server در `docker version` باید پر باشد. `docker compose version` باید اجرا شود. اگر فقط فرمان `docker-compose` با خط تیره جواب می‌دهد، پلاگین نصب نشده و آن باینری را برای ادامهٔ فصل استفاده نکنید. `containerd --version` روی این مخزن باید خط ۲ را نشان بدهد. خط ۱ یعنی هنوز runtime توزیعی یا پین قدیمی در کار است.

آزمایش کارکرد، با کشیدن ایمیج رسمی `hello-world`:

```bash
sudo docker run --rm hello-world
```

متن موفق این ایمیج شامل جملهٔ `Hello from Docker!` است. اگر pull به‌خاطر شبکه شکست، نصب بسته غلط نیست. مسیر را در [آینهٔ رجیستری](./registry-mirror.md) و [کار آفلاین](./offline-operations.md) ادامه دهید و این شکست را با شکست `apt install` یکی نگیرید.

کاربر انسانی مدیر `ops` است. بعد از نصب به گروه `docker` اضافه‌اش کنید.

```bash
sudo usermod -aG docker ops
getent group docker
```

`usermod` نشست فعلی را عوض نمی‌کند. `ops` باید یک بار از SSH خارج و دوباره وارد شود. بعد از ورود تازه، `id` باید گروه `docker` را نشان بدهد و `docker ps` بدون `sudo` باید جدول خالی یا فهرست کانتینرها را بدهد، نه خطای سوکت.

## Configuration

فایل `/etc/docker/daemon.json` را خود بسته با تنظیمات کامل نمی‌سازد. اگر فایل از قبل هست، کلیدها را ادغام کنید. JSON تکراری یا ویرگول اضافی دیمون را از بالا آمدن می‌اندازد. این فایل لاگ را سقف‌دار می‌کند و زیرشبکهٔ شبکه‌های تازه را از `10.10.0.0/16` آزمایشگاه دور نگه می‌دارد.

```bash
sudo install -d -m 0755 /etc/docker
sudo tee /etc/docker/daemon.json > /dev/null <<'EOF'
{
  "log-driver": "json-file",
  "log-opts": {
    "max-size": "10m",
    "max-file": "5"
  },
  "live-restore": true,
  "default-address-pools": [
    {
      "base": "172.30.0.0/16",
      "size": 24
    }
  ]
}
EOF
sudo systemctl restart docker.service
sudo systemctl status docker.service --no-pager
```

`max-size` و `max-file` یعنی هر کانتینر حداکثر پنج فایل حدود ده مگابایتی لاگ محلی دارد. قدیمی‌تر از این در `docker logs` نیست. آرشیو بلندمدت کار این فایل نیست.

`live-restore` کانتینرهای در حال اجرا را هنگام `systemctl restart docker` بالا نگه می‌دارد. ریبوت خود میزبان به این کلید تکیه نمی‌کند. بعد از ریبوت، برگشتن کانتینر به `restart: unless-stopped` در تعریف همان کانتینر بستگی دارد. این کلید برای Swarm نیست و این فصل Swarm ندارد.

`default-address-pools` به شبکه‌هایی اعمال می‌شود که بعد از این تغییر ساخته می‌شوند. شبکه‌های قبلی زیرشبکهٔ خودشان را نگه می‌دارند. بریج پیش‌فرض جداگانه است و معمولاً `172.17.0.0/16` می‌ماند. استخر `172.30.0.0/16` با اندازهٔ ۲۴، شبکه‌های کاربری را در تکه‌های `/24` می‌سازد و با شبکهٔ آزمایشگاه تداخل ندارد.

کلید `registry-mirrors` را همین حالا نگذارید، مگر سرویس آینه روی `mirror.example.internal` مطابق [آینهٔ رجیستری](./registry-mirror.md) جواب بدهد.

تأیید:

```bash
docker info
ss -ltnp | grep -E 'docker|containerd' || true
```

در `docker info` درایور لاگ باید `json-file` باشد. روی نصب تازه، وضعیت درایور باید نشان بدهد فروشگاه از نوع snapshotter مربوط به containerd است و `Storage Driver` معمولاً `overlayfs` دیده می‌شود. روی میزبان ارتقایافته ممکن است هنوز `overlay2` ببینید. هر دو با دستورهای همین دانشنامه سازگارند. اگر `docker info` بالا نمی‌آید، فایل JSON را با ابزار زیر چک کنید و سرویس را دوباره راه بیندازید.

```bash
python3 -m json.tool /etc/docker/daemon.json
sudo journalctl -u docker.service -n 50 --no-pager
```

منطقهٔ زمانی میزبان باید `Asia/Tehran` باشد. کانتینر این مقدار را از میزبان به ارث نمی‌برد. هر نمونهٔ Compose متغیر `TZ` را خودش تنظیم می‌کند.

## Production Example

روی `docker-1` ترتیب تحویل میزبان این است.

```bash
. /etc/os-release
printf '%s %s\n' "$VERSION_CODENAME" "$(dpkg --print-architecture)"
apt-cache policy docker-ce
docker version
docker compose version
containerd --version
docker info
getent group docker
```

خروجی `policy` را در تیکت نصب بچسبانید. شمارهٔ نسخه همان است که APT داده، نه عددی که از حافظه می‌نویسید. سپس یک کانتینر کوتاه بدون سرویس دائمی:

```bash
docker run --rm nginx:1.28-alpine nginx -v
```

باید خط نسخهٔ Nginx سری ۱.۲۸ را چاپ کند و کانتینر خارج شود. اگر این pull شکست، میزبان را ناقص حساب نکنید. بسته نصب شده و شبکهٔ رجیستری مسئلهٔ جداست.

کاربر `deploy` را به گروه `docker` اضافه نکنید. سرویس داخل کانتینر با کاربر خودش بالا می‌آید. حساب `deploy` روی میزبان برای وقتی است که فرایند بدون Docker و بدون شل تعاملی لازم است، و سوکت Docker مال آن نقش نیست.

## Security Notes

:::danger عضویت در گروه docker معادل root است
هر کسی در گروه `docker` می‌تواند کانتینری بسازد که ریشهٔ فایل‌سیستم میزبان را سوار کند و فایل سیستم را با اختیار root عوض کند. `usermod -aG docker ops` فقط برای اپراتور میزبان است. گروه را به حساب‌های روزمره، به `deploy`، و به کاربران CI روی همین سرور ندهید. اگر چند نفر باید Engine را ببینند، میزبان را شلوغ نکنید. ورودشان را جدا و با حساب شخصی دارای sudo محدود کنید، یا از راه یک runner جدا باشد.
:::

فایل کلید `docker.asc` باید برای APT خوانا باشد، ولی منبع را از آدرسی جز `download.docker.com` نگیرید. کپی کردن کلید یک آینهٔ ناشناس به‌جای کلید رسمی یعنی اعتماد به امضای دیگری. اگر سازمان خود `download.docker.com` را آینه می‌کند، امضا باید همان کلید رسمی بماند. آن حالت در [آینهٔ بسته](./package-mirrors.md) است.

`chmod 666` روی `/var/run/docker.sock` ممنوع است. این کار همان گروه `docker` را به همهٔ کاربران میزبان تعمیم می‌دهد. مجوز سوکت را بسته مدیریت می‌کند.

پورت‌هایی که بعداً با `-p` منتشر می‌کنید ممکن است از کنار UFW رد شوند، چون Docker قاعدهٔ iptables خودش را می‌نویسد. این صفحه هنوز پورتی منتشر نمی‌کند. هنگام ساخت سرویس، آدرس bind را محدود کنید. نمونه‌ها این کار را کرده‌اند.

## Troubleshooting

| نشانه | علت محتمل | کار |
| --- | --- | --- |
| `apt update` خطای NO_PUBKEY یا امضا | کلید دانلود نشده یا `Signed-By` غلط است | مسیر فایل `docker.asc` و URL کلید همان توزیع را دوباره اجرا کنید |
| 404 روی suite | `resolute` را روی دبیان نوشته‌اید یا برعکس | `VERSION_CODENAME` را دوباره چاپ کنید |
| `docker-ce` از archive.ubuntu.com آمده | فایل `docker.sources` خوانده نشده یا بستهٔ `docker.io` نصب است | `apt-cache policy docker-ce` و وجود فایل منبع |
| `Cannot connect to the Docker daemon` | سرویس پایین است یا نشست گروه را نگرفته | `systemctl status docker.service` و ورود مجدد `ops` |
| سرویس بلافاصله بعد از stop برمی‌گردد | `docker.socket` فعال است | `systemctl status docker.socket` |
| دیمون بعد از ویرایش JSON بالا نمی‌آید | JSON نامعتبر | `python3 -m json.tool` و `journalctl -u docker.service` |
| `docker compose` نیست | پلاگین نصب نشده | بستهٔ `docker-compose-plugin` را نصب کنید، باینری خط‌تیره‌دار را صدا نزنید |
| pull زمان تمام می‌کند | مسیر رجیستری، نه نصب apt | فصل آینه و کار آفلاین |
| `docker images` بعد از یک تغییر daemon خالی شده | سوییچ فروشگاه ایمیج | برگرداندن پیکربندی قبلی. داده هنوز روی دیسک است |

اگر `hello-world` بالا می‌آید ولی `nginx:1.28-alpine` نه، نصب تمام شده و مشکل تگ یا دسترسی رجیستری است. خطای apt را دوباره باز نکنید.

برای دیدن اینکه واحدها فعال مانده‌اند:

```bash
systemctl is-enabled docker.service containerd.service
systemctl is-active docker.service containerd.service
```

هر چهار پاسخ باید `enabled` و `active` باشند. `inactive` یعنی `enable --now` انجام نشده یا استارت شکست خورده است.

## Best Practices

- مخزن را deb822 بنویسید و فقط یک فایل منبع برای Docker داشته باشید.
- suite را از `/etc/os-release` تأیید کنید و در فایل سخت بنویسید تا میزبان بعدی مبهم نباشد: `resolute` یا `trixie`.
- پنج بسته را با هم نصب کنید. Engine بدون پلاگین Compose برای این فصل ناقص است.
- نسخه را با `apt-cache policy` و `docker version` ثبت کنید، نه از حافظه.
- `ops` فقط بعد از نصب بسته به گروه `docker` اضافه شود و یک بار دوباره وارد شود.
- گروه `docker` را معادل root بدانید و کوچک نگه‌اش دارید.
- `daemon.json` را قبل از restart با `python3 -m json.tool` اعتبارسنجی کنید.
- آینه را وقتی به daemon اضافه کنید که `curl` به آدرس آینه جواب داده باشد.
- فروشگاه ایمیج را روی میزبان ارتقایافته بی‌دلیل عوض نکنید.
- اسکریپت نصب لوله‌شده به شل را وارد رویهٔ سرور نکنید.
