---
title: ClamAV و freshclam
sidebar_position: 5
description: "نصب clamav و clamav-daemon و freshclam، به‌روزرسانی امضا، و اسکن زمان‌بندی‌شدهٔ مسیر آپلود به‌جای fanotify روی سرور شلوغ."
---

# ClamAV و freshclam

## مقدمه

ClamAV امضای بدافزار را روی فایل می‌گذارد و می‌گوید این فایل شناخته‌شده است یا نه. روی سرور برنامه جای آن، مسیر آپلود است نه کل دیسک و نه هر بار باز شدن فایل. این صفحه سه بسته را نصب می‌کند: `clamav` برای اسکن خط فرمان، `clamav-daemon` برای دمون `clamd`، و `clamav-freshclam` که فرمان `freshclam` را دارد و امضا را تازه می‌کند.

تولید پیش‌فرض این آزمایشگاه یک timer شبانه است که `/opt/apps/app/uploads` را با `clamdscan` می‌خواند. اسکن لحظه‌ای با `clamonacc` و fanotify را روشن نمی‌کنیم. روی سرور شلوغ آن قلاب، هر باز شدن فایل را از هسته رد می‌کند و هزینهٔ CPU و تأخیر نوشتن واقعی است. اگر روزی فقط یک پوشهٔ خیلی حساس آن را خواست، عارضه پایین نوشته شده و باز هم پیش‌فرض نیست.

نسخه را از `apt-cache policy clamav` می‌خوانید. آرشیو Ubuntu 26.04 بسته را در مخزن main دارد. شمارهٔ patch را این صفحه پین نمی‌کند.

## مفهوم اصلی

سه فرایند را قاطی نکنید. `freshclam` فقط پایگاه امضا را از شبکه می‌گیرد و فایل را اسکن نمی‌کند. `clamscan` هر بار امضا را از دیسک در حافظهٔ خودش بار می‌کند و برای یک پوشهٔ بزرگ کند است. `clamd` یک بار امضا را نگه می‌دارد و `clamdscan` از آن می‌پرسد. timer تولید با `clamdscan` است تا هر شب بار کردن امضا از صفر تکرار نشود.

بستهٔ `clamav-freshclam` روی Ubuntu هم سرویس دائمی `clamav-freshclam.service` را دارد و هم timer یک‌بارهٔ `clamav-freshclam-once.timer`. سرویس دائمی طبق فایل تنظیم خودش دوره‌ای بیدار می‌شود. timer یک‌باره روزی یک بار است. هر دو را با هم روشن نکنید، چون روی قفل پایگاه امضا با هم دعوا می‌کنند. این صفحه سرویس دائمی را روشن می‌کند و دفعات را به همان عددی وامی‌گذارد که `/etc/clamav/freshclam.conf` از بسته آورده، مگر آن فایل خودش هشدار داده باشد که بیشتر از آن، آینه شما را موقتاً بند می‌کند. عدد را از فایل بخوانید. از این صفحه برندارید و زیادش نکنید.

کاربر `clamav` را بسته می‌سازد. اسکن تولید با همین کاربر است، نه با root، به شرطی که پوشهٔ آپلود برایش خواندنی باشد. اگر فایل‌ها `600` و مالک `deploy` باشند، `clamav` هیچ نمی‌بیند و گزارش «همه سالم» دروغ خاموش است. مجوز پایین این را درست می‌کند.

فایل آزمون EICAR ویروس نیست. رشتهٔ استانداردی است که امضاها عمداً می‌شناسند تا بفهمید موتور زنده است. بعد از آزمایش پاکش می‌کنید و در پوشهٔ آپلود واقعی رهایش نمی‌کنید.

## چرا استفاده می‌شود؟

کاربر فایل می‌فرستد. محدود کردن پسوند و جدا کردن پوشه لازم است و کافی نیست. ClamAV فایل‌هایی را می‌گیرد که امضای عمومی دارند. فایل خیلی تازه، یا فایل بدون امضا، را سالم رد می‌کند. برای همین این ابزار لایهٔ آخرِ ارزان است نه دروازدهٔ اصلی. دروازدهٔ اصلی هنوز نوع فایل، اندازه، و اجرا نکردن فایل آپلود است.

اسکن لحظه‌ای وسوسه‌کننده است چون «قبل از باز شدن» را وعده می‌دهد. روی `app-1` که همان دیسک برنامه و لاگ و آپلود را دارد، fanotify می‌تواند نوشتن عادی را کند کند و عیب‌یابی را به «گاهی دیسک خواب است» تبدیل کند. timer ساعت ۰۳:۳۰ به وقت تهران، وقتی [ساعت میزبان](/docs/04-server-management/initial-bootstrap) درست باشد، همان پوشه را می‌خواند و سرویس روزانه را معطل نمی‌کند. تأخیرش این است که فایل تا اسکن بعدی تحویل کاربر شده. محصول اگر باید قبل از تحویل اسکن شود، اسکن را در همان درخواست، با سقف زمان، صدا بزند نه اینکه fanotify را روی کل میزبان روشن کند. آن مسیر برنامه است. پیش‌فرض این صفحه timer است.

## Architecture

```text
اینترنت امضا
    │
    ▼
clamav-freshclam.service
    کاربر clamav
    /var/lib/clamav
            │
            ▼
clamd   سرویس clamav-daemon
            ▲
            │  clamdscan --fdpass
            │
clamav-uploads.timer  هر شب ۰۳:۳۰
    فقط /opt/apps/app/uploads
    User=clamav

عمداً خاموش:
    clamonacc و fanotify روی کل دیسک
```

`--fdpass` یعنی `clamd` توصیف‌گر فایل را می‌گیرد و لازم نیست خود دمون کل مسیر را با امتیاز root بخواند. پوشه باید برای کاربر `clamav` قابل عبور و فایل قابل خواندن باشد. دمون را `User root` نکنید تا مجوز را دور بزنید.

## Installation

```bash
sudo apt update
apt-cache policy clamav clamav-daemon clamav-freshclam
sudo apt install clamav clamav-daemon clamav-freshclam
```

امضای اول را با دست بگیرید تا با سرویس روی یک قفل نیفتید:

```bash
sudo systemctl stop clamav-freshclam.service
sudo freshclam
sudo systemctl enable --now clamav-freshclam.service
sudo systemctl enable --now clamav-daemon.service
systemctl status clamav-freshclam.service clamav-daemon.service --no-pager
```

اولین بالا آمدن `clamd` طول می‌کشد چون امضا را در حافظه می‌چیند. اگر بلافاصله `active` نشد، چند دقیقه صبر کنید و journal را ببینید نه اینکه سرویس را پشت سر هم restart کنید:

```bash
sudo journalctl -u clamav-daemon -n 30 --no-pager
```

`freshclam` باید در لاگ بگوید پایگاه به‌روز است یا دانلود شده. مسیر لاگ را خود فایل تنظیم می‌گوید. معمولاً زیر `/var/log/clamav/` است. اگر آن پوشه را پاک کردید، سرویس دیگر نمی‌نویسد. مجوزش باید به `clamav` اجازهٔ نوشتن بدهد.

دفعات را فقط نگاه کنید، زیاد نکنید:

```bash
grep -E '^Checks' /etc/clamav/freshclam.conf
```

اگر خط کامنت است، پیش‌فرض بسته همان است که در توضیح همان فایل نوشته شده. آن را به هر ساعت یک بار یا بیشتر نبرید. آینهٔ عمومی منبعی را که بیش از حد بپرسد برای مدتی رد می‌کند و بعد اسکن شما با امضای کهنه «سالم» گزارش می‌دهد.

## Configuration

پوشهٔ آپلود را طوری بگذارید که `deploy` بنویسد و `clamav` بخواند. بیت setgid گروه را به فایل‌های تازه می‌دهد اگر خود برنامه گروه را عوض نکند:

```bash
sudo install -d -m 2750 -o deploy -g clamav /opt/apps/app/uploads
```

برنامه باید فایل را `640` بسازد نه `600`. اگر umask سرویس `077` است، `clamav` باز هم کور است. یا umask را در unit برنامه طوری بگذارید که گروه بخواند، یا ACL پیش‌فرض بدهید. مدل ACL در [ACL](/docs/01-linux/acl) است. کوتاه و محلی:

```bash
sudo setfacl -m g:clamav:rX /opt/apps/app/uploads
sudo setfacl -d -m g:clamav:rX /opt/apps/app/uploads
```

اگر `setfacl` نیست، بستهٔ `acl` را نصب کنید. `chmod 777` راه‌حل این صفحه نیست.

واحد `/etc/systemd/system/clamav-uploads.service`:

```ini
[Unit]
Description=Scan application uploads with ClamAV
After=clamav-daemon.service
Requires=clamav-daemon.service

[Service]
Type=oneshot
User=clamav
Group=clamav
ExecStart=/usr/bin/clamdscan --fdpass --multiscan /opt/apps/app/uploads
Nice=15
IOSchedulingClass=idle
```

timer `/etc/systemd/system/clamav-uploads.timer`:

```ini
[Unit]
Description=Nightly upload malware scan

[Timer]
OnCalendar=*-*-* 03:30:00
Persistent=true
RandomizedDelaySec=20min

[Install]
WantedBy=timers.target
```

`Persistent=true` یعنی اگر میزبان در آن ساعت خاموش بود، بعد از روشن شدن یک بار جبران می‌کند. `RandomizedDelaySec` همهٔ میزبان‌ها را در یک دقیقه به دیسک نمی‌کوبد.

```bash
sudo systemctl daemon-reload
sudo systemctl enable --now clamav-uploads.timer
systemctl list-timers clamav-uploads.timer
```

آزمایش EICAR. رشته را فقط برای همین آزمایش بسازید. اسکن باید آن را پیدا کند. بعد پاک کنید:

```bash
printf '%s\n' 'X5O!P%@AP[4\PZX54(P^)7CC)7}$EICAR-STANDARD-ANTIVIRUS-TEST-FILE!$H+H*' \
  | sudo tee /opt/apps/app/uploads/eicar.com >/dev/null
sudo chown deploy:clamav /opt/apps/app/uploads/eicar.com
sudo chmod 640 /opt/apps/app/uploads/eicar.com
sudo -u clamav clamdscan --fdpass /opt/apps/app/uploads/eicar.com
sudo rm -f /opt/apps/app/uploads/eicar.com
```

خروجی سالم اسم فایل را با کلمهٔ `FOUND` نشان می‌دهد. یک فایل معمولی کنارش باید `OK` باشد. اگر EICAR هم `OK` بود، امضا نیست یا اسکنر پایگاه را ندیده. `sudo freshclam` را دوباره بعد از توقف سرویس بزنید و `clamd` را یک بار restart کنید تا پایگاه تازه را بار کند.

cron لازم نیست چون timer هست. اگر جایی cron مانده که همان پوشه را با `clamscan` هم می‌خواند، یکی را بردارید. دو اسکن سنگین روی یک دیسک، شب را شلوغ می‌کند و تازگی امضا را بهتر نمی‌کند.

## Production Example

`app-1` آپلود کاربر را زیر `/opt/apps/app/uploads` نگه می‌دارد. شب، timer با کاربر `clamav` همان درخت را به `clamd` می‌دهد. صبح:

```bash
systemctl status clamav-uploads.service --no-pager
sudo journalctl -u clamav-uploads.service --since yesterday --no-pager
sudo journalctl -u clamav-freshclam.service --since yesterday --no-pager
```

یک اجرای سالم در journal تعداد فایل و خطای دسترسی را نشان می‌دهد. اگر تعداد فایل صفر است و شما می‌دانید پوشه پر است، مجوز است نه «شبی تمیز». `sudo -u clamav ls /opt/apps/app/uploads` را بزنید. اگر این هم `Permission denied` است، setgid یا ACL را درست کنید و شب را منتظر نمانید. یک بار `sudo systemctl start clamav-uploads.service` تا قبل از timer بعدی حقیقت را ببینید.

فایل پیدا شده را timer این صفحه پاک نمی‌کند و قرنطینهٔ خودکار ندارد. قرنطینهٔ بی‌فکر، فایل مشتری را از مسیر برنامه برمی‌دارد و پشتیبانی فردا نمی‌داند چرا پیوست نیست. گزارش journal را انسان می‌بیند، فایل را از دسترس برنامه خارج می‌کند، و بعد تصمیم می‌گیرد. اگر محصول باید خودکار قرنطینه کند، مسیر مقصد با مالک `clamav` و مجوز `700` جدا باشد و برنامه حق خواندن آن را نداشته باشد. آن مسیر را داخل خود `uploads` نگذارید، وگرنه اسکن بعدی همان فایل را دوباره پیدا می‌کند.

fanotify را این‌طور روشن نمی‌کنیم. اگر کسی در `clamd.conf` مقدار `OnAccessIncludePath` را روی `/` یا روی `/home` گذاشته، بردارید و `sudo systemctl restart clamav-daemon` بزنید. دیدن اینکه هسته اصلاً fanotify دارد با این است:

```bash
grep FANOTIFY /boot/config-$(uname -r)
```

بودن `CONFIG_FANOTIFY=y` دلیل روشن کردن `clamonacc` نیست. فقط می‌گوید اگر روزی روشن کنید، هسته قادر است. هزینه سر جایش است.

## Security Notes

اسکنر ویروس فایل را اجرا نمی‌کند، ولی باگ در خود پارسر ClamAV با امتیاز کاربر `clamav` اجرا می‌شود. برای همین `clamd` را root نکنید. پوشهٔ آپلود خواندنی کافی است. نوشتن روی `/opt/apps` برای `clamav` لازم نیست، جز لاگ خودش.

گزارش «OK» یعنی امضای شناخته‌شده‌ای جور نشده. یعنی فایل امن است را از این کلمه در نیاورید. امضای کهنه این دروغ را بزرگ‌تر می‌کند. اگر `freshclam` چند روز خطا داشته، اسکن را تا درست شدن امضا «حفاظت فعال» حساب نکنید.

رشتهٔ EICAR را در مخزن برنامه و در تصویر Docker نگذارید. بعضی رجیستری‌ها و اسکنرهای بعدی همان تصویر را قرنطینه می‌کنند و استقرار بی‌دلیل می‌خوابد. فقط روی دیسک آزمایش، و بعد حذف.

لاگ اسکن نام فایل مشتری را دارد. مجوز `/var/log/clamav` را `755` جهان‌خوانا نکنید اگر نام‌ها حساس‌اند. کاربر `clamav` باید بنویسد. `ops` با sudo می‌خواند.

اسکن زمان‌بندی‌شده فایل را قبل از تحویل به کاربر بعدی متوقف نمی‌کند. اگر این فاصله برای محصول خطرناک است، باید در مسیر آپلود برنامه، همگام و با سقف، `clamdscan` شود. آن را با روشن کردن prevention روی کل میزبان عوض نکنید.

## Troubleshooting

| نشانه | کار |
| --- | --- |
| `freshclam` می‌گوید پایگاه قفل است | سرویس `clamav-freshclam` هنوز در حال اجراست. stop، بعد freshclam، بعد start. timer یک‌باره را هم‌زمان enable نکنید |
| `clamdscan` وصل نمی‌شود | `systemctl status clamav-daemon`. اولین بارگذاری طول می‌کشد. سوکت را در `/etc/clamav/clamd.conf` ببینید و همان را `ls` کنید |
| EICAR پیدا نمی‌شود | امضا بار نشده یا فایل برای کاربر `clamav` خواندنی نیست. مجوز `640` و گروه `clamav`، بعد restart دمون |
| همهٔ فایل‌های واقعی خطای `Access denied` دارند | همان مجوز پوشه. اسکن را با root عادت ندهید |
| آینه شما را موقتاً رد کرده | `Checks` را زیاد کرده‌اید. به مقدار فایل تنظیم برگردید و تا پایان مهلت صبر کنید |
| timer ساعت ظهر اجرا شده نه نیمه‌شب | میزبان UTC است. `timedatectl set-timezone Asia/Tehran` |
| بعد از روشن کردن on-access دیسک کند شده | `OnAccessIncludePath` را بردارید، دمون را restart کنید، به timer برگردید |
| `Requires=clamav-daemon` و timer خطا می‌دهد | دمون بالا نیست. journal همان واحد را ببینید. اسکن را به `clamscan` کند برنگردانید فقط برای دور زدن دمون، مگر دمون را واقعاً نمی‌خواهید و این انتخاب را در یادداشت میزبان بنویسید |

وضعیت امضا:

```bash
sudo systemctl is-active clamav-freshclam.service clamav-daemon.service
sudo -u clamav clamdscan --version
```

نسخهٔ موتور و نسخهٔ پایگاه امضا هر دو در خروجی‌اند. اگر پایگاه خیلی قدیمی است، تاریخ را با امروز مقایسه کنید و لاگ freshclam را بخوانید نه اینکه بسته را حذف و نصب کنید.

## Best Practices

- سه بسته: `clamav`، `clamav-daemon`، `clamav-freshclam`. فرمان به‌روزرسانی `freshclam` است و مال بستهٔ سوم است.
- یک روش به‌روزرسانی امضا، نه سرویس و timer یک‌باره با هم.
- تولید یعنی timer روی مسیر آپلود، کاربر `clamav`، مجوز خواندن واقعی. fanotify پیش‌فرض نیست.
- EICAR را برای آزمایش بسازید و پاک کنید. داخل مخزن و ایمیج نگذارید.
- «OK» را با «امن» یکی ندانید. تازگی امضا را در لاگ ببینید.
- فایل آلوده را خودکار داخل همان پوشهٔ آپلود جابه‌جا نکنید. انسان یا مسیر قرنطینهٔ جدا، با مجوز بسته.
