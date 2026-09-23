---
title: FFmpeg
sidebar_position: 3
description: "نصب FFmpeg از apt، تبدیل wav به mp3، تصویر بندانگشتی از ویدیو، و صف با systemd برای فایل زیر /opt/apps."
---

# FFmpeg

## مقدمه

FFmpeg روی سرور برنامه فایل رسانه را عوض می‌کند: یک `wav` را به `mp3`، و از ویدیوی آپلودشده زیر `/opt/apps` یک تصویر بندانگشتی می‌سازد. بسته از مخزن Ubuntu است. صف، یک نرم‌افزار جدا نیست. یک اسکریپت و دو واحد systemd است که هر بار یک فایل را از پوشهٔ ورودی برمی‌دارند.

فایل کاربر اعتماد ندارد. یک فایل کوچک می‌تواند هنگام باز شدن به فریم خام خیلی بزرگ تبدیل شود و حافظه را پر کند. برای همین واحد systemd سقف حافظه و زمان دارد، فرایند با کاربر `deploy` است نه root، و اسکریپت قبل از تبدیل اندازه و، تا جایی که سرآیند راست بگوید، ابعاد را نگاه می‌کند. این بررسی‌ها دیوار کامل نیستند. سقف حافظه دیوار آخر است.

شمارهٔ نسخه را `apt-cache policy ffmpeg` می‌گوید. در دستور نصب پین نمی‌شود.

## مفهوم اصلی

FFmpeg یک فرایند خط فرمان است. ورودی، خروجی، و کدک را خودتان می‌دهید. روی سرور دمون دائمی FFmpeg بالا نمی‌آوریم که به شبکه گوش دهد. هر تبدیل یک فرایند کوتاه است و تمام می‌شود. این با سرویس وب فرق دارد و نباید آن را پشت Nginx به‌عنوان یک API باز بگذارید، مگر برنامهٔ خودتان صف را کنترل کند و همین حدها را نگه دارد.

`ffmpeg` تبدیل می‌کند. `ffprobe` سرآیند را می‌خواند و لازم نیست کل فایل را decode کند. سرآیند دروغ می‌گوید. برای همین `ffprobe` را شرط لازم می‌گیریم نه شرط کافی. `MemoryMax` و `RuntimeMaxSec` حتی اگر سرآیند آرام باشد، فرایند را می‌کشند.

صف این صفحه پوشه است. برنامه فایل را در `/opt/apps/media/incoming` می‌گذارد. واحد path وقتی پوشه خالی نیست سرویس را صدا می‌زند. سرویس یک فایل را به `/opt/apps/media/work` می‌برد، تبدیل می‌کند، نتیجه را در `/opt/apps/media/out` می‌گذارد، و اگر خطا بود فایل را به `/opt/apps/media/failed` می‌فرستد. یک قفل `flock` جلوی دو اجرای هم‌زمان را می‌گیرد.

## چرا استفاده می‌شود؟

ساخت تصویر بندانگشتی روی لپ‌تاپ مدیر به سرویس شبانه نمی‌رسد. کتابخانهٔ داخل خود برنامه هم گاهی همان FFmpeg را صدا می‌زند و نسخه و پرچم‌هایش نامعلوم می‌ماند. یک واحد مشخص، با کاربر مشخص و سقف مشخص، یعنی لاگ `journalctl` همان تبدیل را نشان می‌دهد و یک فایل بد کل ماشین را تا صبح در swap فرو نمی‌برد.

تبدیل `wav` به `mp3` نمونهٔ ساده‌تر همان مسیر است و برای فایل صدای آپلودشده واقعی است، نه فقط تمرین. هر دو در یک اسکریپت هستند تا دو روش نگهداری نشوند.

## Architecture

```text
برنامهٔ app
    فایل را در incoming می‌گذارد
            │
            ▼
media-queue.path
    DirectoryNotEmpty
            │
            ▼
media-queue.service
    User=deploy
    MemoryMax=512M
    RuntimeMaxSec=120
    flock
            │
            ▼
/opt/apps/media/bin/process-one.sh
    اندازه، بعد ffprobe، بعد ffmpeg
            │
            ├── out/     jpg یا mp3
            └── failed/  فایل ردشده، بدون اجرای دوبارهٔ بی‌نهایت
```

واحد path بعد از تمام شدن سرویس، اگر پوشه هنوز پر باشد، دوباره سرویس را صدا می‌زند. برای همین هر اجرا فقط یک فایل برمی‌دارد. اگر ده فایل آمده باشد، ده اجرا پشت سر هم می‌آید، نه یک فرایند که هر ده تا را در حافظه نگه دارد.

## Installation

```bash
sudo apt update
apt-cache policy ffmpeg
sudo apt install ffmpeg
ffmpeg -version
ffprobe -version
```

خط اول `ffmpeg -version` نسخهٔ بستهٔ Ubuntu را نشان می‌دهد. همان را در یادداشت تغییر بنویسید. باینری را از سایت جدا دانلود نکنید. دو FFmpeg روی یک میزبان یعنی واحد systemd یکی را صدا می‌زند و شما دیگری را آزمایش می‌کنید.

پوشه‌ها و کاربر. `deploy` اگر از قبل هست، `adduser` را تکرار نکنید:

```bash
id deploy || sudo adduser --system --group --home /var/lib/deploy --shell /usr/sbin/nologin deploy
sudo install -d -m 750 -o deploy -g deploy /opt/apps/media/incoming
sudo install -d -m 750 -o deploy -g deploy /opt/apps/media/work
sudo install -d -m 750 -o deploy -g deploy /opt/apps/media/out
sudo install -d -m 750 -o deploy -g deploy /opt/apps/media/failed
sudo install -d -m 750 -o deploy -g deploy /opt/apps/media/bin
```

برنامه اگر با کاربر دیگری فایل می‌سازد، باید بتواند در `incoming` بنویسد. گروه مشترک یا ACL را در [ACL](/docs/01-linux/acl) بگذارید. پوشه را `777` نکنید.

## Configuration

اسکریپت `/opt/apps/media/bin/process-one.sh`. مالک `deploy`، مجوز `750`. سقف اندازه دویست مگابایت است. ویدیویی که سرآیندش عرضی بزرگ‌تر از ۱۹۲۰ یا زمانی بلندتر از ده دقیقه بگوید به `failed` می‌رود. این عددها سیاست سرویس `app` هستند تا یک آپلود معمولی جا شود و یک فایل مسخره نه. اگر محصول شما ویدیوی بلند قانونی دارد، سقف زمان را آگاهانه زیاد کنید و `RuntimeMaxSec` واحد را هم با همان زیاد کنید. واحد باید از اسکریپت سخت‌گیرتر یا برابر باشد، نه شل‌تر.

```bash
#!/bin/bash
set -euo pipefail

incoming=/opt/apps/media/incoming
work=/opt/apps/media/work
out=/opt/apps/media/out
failed=/opt/apps/media/failed
max_bytes=$((200 * 1024 * 1024))

exec 9>/var/lock/media-queue.lock
flock -n 9 || exit 0

shopt -s nullglob
files=("$incoming"/*)
if ((${#files[@]} == 0)); then
  exit 0
fi

src="${files[0]}"
base="$(basename "$src")"
mv -- "$src" "$work/$base"
target="$work/$base"

size="$(stat -c %s "$target")"
if (( size > max_bytes || size == 0 )); then
  mv -- "$target" "$failed/$base"
  printf '%s\n' "rejected size: $base" >&2
  exit 0
fi

probe="$(ffprobe -v error -show_entries format=duration:stream=codec_type,width,height -of default=nw=1 "$target" || true)"
printf '%s\n' "$probe" | awk -F= '
  $1 == "width" && $2+0 > 1920 { bad = 1 }
  $1 == "height" && $2+0 > 1920 { bad = 1 }
  $1 == "duration" && $2+0 > 600 { bad = 1 }
  END { exit bad ? 1 : 0 }
' || {
  mv -- "$target" "$failed/$base"
  printf '%s\n' "rejected probe: $base" >&2
  exit 0
}

if printf '%s\n' "$probe" | grep -q 'codec_type=video'; then
  ffmpeg -y -ss 1 -i "$target" -frames:v 1 -vf 'scale=320:-1' "$out/${base}.jpg"
elif printf '%s\n' "$probe" | grep -q 'codec_type=audio'; then
  ffmpeg -y -i "$target" -codec:a libmp3lame -qscale:a 2 "$out/${base}.mp3"
else
  mv -- "$target" "$failed/$base"
  printf '%s\n' "rejected type: $base" >&2
  exit 0
fi

rm -f -- "$target"
```

قفل جهان‌خوانا نیست اگر `/var/lock` برای `deploy` قابل نوشتن نباشد. روی Ubuntu این مسیر معمولاً برای همه قابل نوشتن با بیت چسبنده است. اگر سرویس روی قفل خطا داد، قفل را به `/opt/apps/media/work/queue.lock` با مالک `deploy` ببرید.

واحد `/etc/systemd/system/media-queue.service`:

```ini
[Unit]
Description=Process one queued media file
After=network.target

[Service]
Type=oneshot
User=deploy
Group=deploy
ExecStart=/opt/apps/media/bin/process-one.sh
Nice=10
RuntimeMaxSec=120
MemoryMax=512M
NoNewPrivileges=true
PrivateTmp=true
ProtectSystem=strict
ReadWritePaths=/opt/apps/media /var/lock
```

واحد `/etc/systemd/system/media-queue.path`:

```ini
[Unit]
Description=Watch media incoming directory

[Path]
DirectoryNotEmpty=/opt/apps/media/incoming
Unit=media-queue.service

[Install]
WantedBy=multi-user.target
```

`ProtectSystem=strict` نوشتن را به مسیرهایی که نام برده‌اید محدود می‌کند. اگر قفل را جای دیگری بردید، همان مسیر را به `ReadWritePaths` اضافه کنید.

```bash
sudo chmod 750 /opt/apps/media/bin/process-one.sh
sudo chown deploy:deploy /opt/apps/media/bin/process-one.sh
sudo systemctl daemon-reload
sudo systemctl enable --now media-queue.path
systemctl status media-queue.path --no-pager
```

تبدیل دستی، بدون صف، برای وقتی که فقط یک فایل آزمایشی خودتان را دارید. این دو دستور همان کار واحد را روی یک فایل معلوم می‌کنند:

```bash
sudo -u deploy ffmpeg -y -i /opt/apps/media/incoming/sample.wav -codec:a libmp3lame -qscale:a 2 /opt/apps/media/out/sample.mp3
sudo -u deploy ffmpeg -y -ss 1 -i /opt/apps/media/incoming/sample.mp4 -frames:v 1 -vf 'scale=320:-1' /opt/apps/media/out/sample.jpg
```

`-ss 1` یک ثانیه جلو می‌رود تا تصویر سیاه ابتدای بعضی فایل‌ها بندانگشتی نشود. اگر ویدیو کوتاه‌تر از یک ثانیه است، این پرچم را بردارید. `-qscale:a 2` کیفیت فشردهٔ LAME است، حدود بالای بازهٔ خوب، و نرخ بیت ثابت اختراع نمی‌کند.

## Production Example

کاربر یک ویدیوی کوتاه را در سرویس `app` گذاشته و برنامه آن را اتمیک در `/opt/apps/media/incoming` جابه‌جا کرده. کپی ناتمام را در این پوشه نگذارید. اول در یک پوشهٔ موقت روی همان فایل‌سیستم بنویسید و بعد `rename` کنید، وگرنه واحد نصف فایل را برمی‌دارد.

```bash
sudo -u deploy install -m 640 /path/to/ready.mp4 /opt/apps/media/incoming/ready.mp4
sudo systemctl start media-queue.service
sudo journalctl -u media-queue.service -n 30 --no-pager
sudo -u deploy ls -l /opt/apps/media/out /opt/apps/media/failed
```

خروجی سالم: یک `ready.mp4.jpg` زیر `out`، و نبودن همان پایه زیر `failed`. اگر فایل به `failed` رفته، لاگ جملهٔ `rejected` را دارد. آن فایل را دوباره به `incoming` برنگردانید تا دلیل رد را ندیده‌اید، وگرنه صف همان را تا سقف زمان تکرار می‌کند. اسکریپت فعلی فایل ردشده را از `incoming` خارج می‌کند، پس حلقهٔ بی‌نهایت نمی‌سازد. برگرداندن دستی شما آن را از نو شروع می‌کند.

برای صدای پشتیبانی، همان مسیر با پسوندی که `ffprobe` آن را صوت می‌بیند به `mp3` ختم می‌شود. برنامه باید خروجی را از `out` بردارد و به کاربر نشان دهد، نه اینکه مسیر systemd را به مرورگر بدهد.

اگر صف خالی است و path فعال است، لازم نیست سرویس را با دست شروع کنید. گذاشتن فایل کافی است. شروع دستی برای آزمایش روشن است.

## Security Notes

فایل آپلود را با حساب `ops` یا root تبدیل نکنید. باگ FFmpeg با امتیاز همان کاربر اجرا می‌شود. `deploy` نباید در گروه `sudo` و نباید در گروه `docker` باشد، مگر استثنای جدا روی `docker-1` که مال این واحد نیست. این واحد را روی `docker-1` نگذارید اگر آنجا `deploy` معادل root است. جای این صف `app-1` است.

`MemoryMax=512M` و `RuntimeMaxSec=120` را برندارید تا صف «سریع‌تر» شود. فایل خصمانه دقیقاً همان موقع خودش را نشان می‌دهد که سقف را برداشته‌اید. اگر تبدیل سالم شما به سقف می‌خورد، سقف را با عدد مشخص و دلیل در واحد بالا ببرید، نه اینکه خط را حذف کنید.

`ffprobe` و پسوند فایل امنیت نیستند. اسکریپت پسوند را ملاک نوع قرار نمی‌دهد. نوع را از وجود استریم در خروجی probe می‌گیرد و باز هم decode واقعی ممکن است گران‌تر از سرآیند باشد. سقف systemd همان decode را قطع می‌کند.

خروجی `out` را از مسیر وب مستقیم سرو نکنید اگر نام فایل کاربر در آن است و پوشه فهرست‌شدنی است. برنامه فایل را با نام خودش تحویل دهد. مجوز `750` روی پوشه یعنی دیگران روی میزبان آن را نمی‌خوانند. کاربر وب اگر جداست باید در گروه `deploy` باشد یا از برنامه بخواند، نه اینکه پوشه `755` شود «تا Nginx ببیند».

## Troubleshooting

| نشانه | کار |
| --- | --- |
| فایل در `incoming` می‌ماند و journal خالی است | `systemctl status media-queue.path`. اگر inactive است `enable --now` نشده. اگر پوشه را root ساخته و `deploy` نمی‌بیند، path ممکن است رویداد را ببیند و سرویس همان اول خطا دهد |
| `Permission denied` روی قفل | مسیر قفل را به `/opt/apps/media/work/queue.lock` ببرید و `ReadWritePaths` را با آن یکی کنید |
| سرویس با کد کشته‌شده تمام می‌شود و فایل در `work` مانده | احتمالاً `MemoryMax` یا `RuntimeMaxSec`. `journalctl -u media-queue.service` دلیل را می‌گوید. فایل را به `failed` منتقل کنید و سقف را فقط اگر فایل امین است زیاد کنید |
| `libmp3lame` پیدا نمی‌شود | بستهٔ Ubuntu این کدک را در `ffmpeg` دارد. اگر ساخت شخصی بدون LAME گذاشته‌اید، همان ساخت را بردارید و بستهٔ مخزن را نصب کنید |
| تصویر ساخته نمی‌شود و صوت هم نه | probe نه ویدیو دیده نه صوت. فایل را در `failed` ببینید. آن را با پخش‌کنندهٔ میز باز نکنید و فرض نکنید سرور هم باید بازش کند |
| دو jpg برای یک فایل | سرویس دو بار روی دو کپی اجرا شده. نام یکتا از خود برنامه بیاید |
| بار CPU بلند است | `Nice=10` اولویت را کم می‌کند نه مصرف را. اگر صف طولانی است، این طراحی عمداً یک فایل در هر اجرا است. موازی کردنش سقف حافظه را ضرب می‌کند |

دیدن اینکه واحد واقعاً محدود شده:

```bash
systemctl show media-queue.service -p MemoryMax -p RuntimeMaxSec -p User
```

مقدارها باید با فایل واحد یکی باشند. اگر خالی‌اند، `daemon-reload` فراموش شده یا واحد دیگری اجرا می‌شود.

## Best Practices

- یک فایل در هر اجرا، با قفل، با سقف حافظه و زمان، با کاربر `deploy`.
- رد شده‌ها به `failed` بروند و خودکار برنگردند.
- نسخه را از `ffmpeg -version` بردارید و باینری دوم کنار بستهٔ Ubuntu نگذارید.
- تبدیل دستی فقط برای فایل خودتان است. فایل مشتری از صف رد شود تا سقف‌ها دور زده نشوند.
- پوشه را `777` نکنید. اگر Nginx باید بخواند، گروه یا ACL، طبق صفحهٔ ACL.
- وقتی آپلود از بیرون می‌آید، اسکن زمان‌بندی‌شدهٔ [ClamAV](/docs/04-server-management/clamav) روی همان مسیر مکمل این صف است، نه جایگزین سقف حافظه.
