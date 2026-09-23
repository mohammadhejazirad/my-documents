---
title: "journalctl"
sidebar_position: 12
description: "خواندن لاگ با -u و -b و -p و --since و -f، journal پایدار در /var/log/journal، و محدود کردن حجم."
---

# journalctl

## مقدمه

وقتی سرویس بالا نمی‌آید، حقیقت در حافظهٔ فرآیند نیست. در لاگی است که systemd از stdout و stderr و از خود PID 1 جمع کرده. ابزار خواندن آن `journalctl` است. این صفحه فیلتر واحد، بوت، اولویت، بازهٔ زمان، دنبال کردن زنده، ماندگاری بعد از ری‌بوت، و جمع کردن دیسک را پوشش می‌دهد. خود یونیت در [مدیریت سرویس](/docs/01-linux/service-management) است. اگر `portal.service` را نساخته‌اید، مثال‌های `-u portal.service` را روی `ssh.service` اجرا کنید تا دستور را ببینید، بعد برگردید و واحد خودتان را بگذارید.

journal جایگزین هر فایل زیر `/var/log` نیست. برخی بسته‌ها هنوز فایل متنی می‌نویسند. برای واحدی که لاگ را به stdout می‌دهد، منبع اول journal است نه یک `tail` روی فایلی که وجود ندارد. `rsyslog` اگر نصب باشد ممکن است کپی متنی هم بسازد. تصمیم این دانشنامه این است که عیب‌یابی سرویس را از `journalctl -u` شروع کنید و فقط وقتی خط آن‌جا نیست سراغ فایل سنتی بروید.

## مفهوم اصلی

journal یک پایگاه باینری است نه یک فایل متنی که با `grep` روی تکه‌تکه‌اش حساب کنید. `journalctl` آن را به متن تبدیل می‌کند. بدون فیلتر، از قدیمی‌ترین رکورد موجود شروع می‌کند و ممکن است خیلی بلند باشد. عادت درست: واحد را با `-u` محدود کنید، زمان را با `--since` ببندید، و `--no-pager` بگذارید تا در SSH داخل پیجر گیر نکنید.

`-u portal.service` فقط همان واحد. چند بار `-u` اجتماع است نه اشتراک. `-b` بوت جاری است. `-b -1` بوت قبلی و `-b -2` یکی قبل از آن. این پرچم وقتی به درد می‌خورد که می‌خواهید بدانید قبل از ری‌بوتهٔ دیشب چه بوده. اگر journal پایدار نباشد، بوت قبلی خالی است و این خالی بودن خودش نشانه است نه باگ دستور.

`-p err` اولویت خطا و بالاتر را نشان می‌دهد: err و crit و alert و emerg. هشدار را شامل نمی‌شود. `-p warning` هشدار و هرچه شدیدتر است. عدد اولویت از ۰ برای emerg تا ۷ برای debug است. `-p err` یعنی همان `-p 3` با احتساب شدیدترها. برای حادثه اول `err` را ببینید تا در انبوه info غرق نشوید. اگر خالی بود یک پله پایین بیایید. خالی بودن err یعنی یا سرویس آرام مرده یا اصلاً به journal ننوشته.

`--since` و `--until` بازه را می‌بندند. مقدار نسبی مثل `1 hour ago` و `yesterday` و `-30min` کار می‌کند. مقدار مطلق را با تاریخ و ساعت بنویسید، مثلاً `2026-09-23 02:00:00`. منطقهٔ زمانی همان `Asia/Tehran` سرور است اگر `timedatectl` را در نصب درست کرده باشید. ساعت غلط، بازه را بی‌صدا خالی می‌کند.

`-f` مثل `tail -f` دنبال رکورد جدید می‌ماند. سرویس را قطع نمی‌کند. با Ctrl+C بیرون می‌آیید. `-n 50` فقط پنجاه خط آخر است و برای چسباندن در تیکت مناسب‌تر از یک جریان باز.

پایداری: اگر پوشهٔ `/var/log/journal` نباشد، journal پیش‌فرض اغلب روی `/run/log/journal` می‌ماند و tmpfs است. ری‌بوت یعنی پاک شدن. `Storage=persistent` در تنظیم journald، یا ساختن همان پوشه با مالک درست، رکورد را زیر `/var` نگه می‌دارد. `/var` اگر پر شود journal هم متوقف می‌شود. به همین دلیل هم `/var` را در صفحهٔ پارتیشن جدا کردیم و هم برای خود journal سقف می‌گذاریم.

سقف دائمی کلید `SystemMaxUse` و `SystemKeepFree` است. جمع کردن یک‌باره دستور `journalctl --vacuum-size` است. در فایل تنظیم کلیدی به‌نام `VacuumSize` وجود ندارد. اگر آن را در conf بنویسید نادیده گرفته می‌شود و دیسک همچنان پر می‌ماند. این صفحه همان دستور واقعی و کلید واقعی را می‌نویسد.

## چرا استفاده می‌شود؟

`echo` داخل اسکریپت و فایل لاگ دست‌ساز، در ری‌استارت و در چرخش دیسک گم می‌شود و مجوز فایل جدا می‌خواهد. برنامه‌ای که به stdout بنویسد و زیر systemd باشد، بدون باز کردن پورت لاگ و بدون فایل جهان‌خوانا، رکورد زمان‌دار و وابسته به واحد دارد. نیمهٔ شب می‌پرسید «از ساعت دو تا سه چه شد» و `--since` جواب می‌دهد، به شرطی که journal آن ساعت را دور نریخته باشد.

بدون سقف، journal پایدار می‌تواند همان `/var` جدا را هم پر کند. آن‌وقت هم لاگ جدید نمی‌آید و هم سرویس‌هایی که زیر `/var` می‌نویسند می‌خوابند. سقف و vacuum بخشی از راه‌اندازی‌اند نه کار تزئینی بعد از حادثه.

## Architecture

```text
فرآیند سرویس  stdout/stderr
PID 1 و سرویس‌های سیستم
        |
        v
systemd-journald
        |
        +-- /run/log/journal     ناپایدار، پیش‌فرض اگر پوشهٔ var نباشد
        |
        +-- /var/log/journal     پایدار، بعد از Storage=persistent
                  |
                  سقف SystemMaxUse و SystemKeepFree
                  جمع دستی journalctl --vacuum-size

خواندن فقط با journalctl
  -u واحد     -b بوت     -p اولویت     --since بازه     -f زنده
```

گروه `systemd-journal` لاگ را می‌خواند. کاربر عادی بدون این گروه فقط لاگ خودش را می‌بیند و `journalctl -u ssh.service` ممکن است خالی یا محدود باشد. `ops` اگر عضو `adm` یا `systemd-journal` باشد لاگ سیستم را می‌خواند. روی Ubuntu عضویت `adm` اغلب کافی است. اگر نبود، او را در `systemd-journal` بگذارید نه اینکه دستور را همیشه با sudo بزنید و عادت sudo برای خواندن بسازید. حساب `deploy` عضو این گروه نیست و نباید باشد.

## Installation

ببینید همین حالا journal کجاست و چقدر جا گرفته:

```bash
journalctl --disk-usage
ls -ld /var/log/journal /run/log/journal
systemctl is-active systemd-journald.service
```

اگر فقط `/run/log/journal` هست، یک ری‌بوت لاگ امروز را می‌برد. پایدار کردن با drop-in، نه با ویرایش فایل بسته. فایل اصلی `/etc/systemd/journald.conf` مال بسته است و ارتقا ممکن است سؤال ادغام بپرسد. پوشهٔ `journald.conf.d` مال مدیر است.

```bash
sudo install -d -o root -g root -m 0755 /etc/systemd/journald.conf.d
```

محتوای `/etc/systemd/journald.conf.d/size.conf`:

```ini
[Journal]
Storage=persistent
SystemMaxUse=1G
SystemKeepFree=2G
MaxRetentionSec=1month
```

`SystemMaxUse=1G` سقف مصرف journal روی دیسک پایدار است. `SystemKeepFree=2G` یعنی journald سعی می‌کند دست‌کم این قدر روی فایل‌سیستم آزاد بماند. اگر `/var` کوچک‌تر از این سیاست است، عدد را با اندازهٔ LV صفحهٔ پارتیشن تنظیم کنید نه اینکه کور ۱ گیگ و ۲ گیگ را روی یک `/var` چهارگیگی بگذارید. `MaxRetentionSec=1month` رکورد قدیمی‌تر از یک ماه را قابل پاک شدن می‌کند حتی اگر سقف حجم پر نشده باشد.

اعمال. ری‌استارت journald خود سرور را ری‌بوت نمی‌کند. اگر وسط حادثه‌اید و هنوز این خطوط را جای دیگری کپی نکرده‌اید، اول همان‌ها را در فایل جدا ذخیره کنید. ری‌استارت journald رکورد پایدار قبلی را پاک نمی‌کند، ولی لحظه‌ای نوشتن قطع می‌شود.

```bash
sudo systemctl restart systemd-journald
journalctl --disk-usage
ls -ld /var/log/journal
```

پوشه باید ظاهر شود. مالک درست `root:systemd-journal` و حالت معمولاً `2755` است تا گروه روی فایل‌های داخل حفظ شود. اگر خودتان پوشه را با مالک غلط ساخته‌اید، journald ممکن است دوباره به `/run` برگردد. اصلاح:

```bash
sudo install -d -o root -g systemd-journal -m 2755 /var/log/journal
sudo systemctl restart systemd-journald
```

تست ماندگاری، فقط وقتی ری‌بوت آزمایشگاه مجاز است:

```bash
logger -t portal-test "persist check before reboot"
sudo reboot
```

بعد از برگشتن:

```bash
journalctl -t portal-test -b -1 --no-pager
```

اگر خط `persist check before reboot` را روی بوت `-1` دیدید، پایدار است. اگر خالی بود، هنوز دارید از journal ناپایدار می‌خوانید یا بازهٔ بوت را اشتباه گرفته‌اید. `journalctl --list-boots` بوت‌های موجود را با شماره و زمان نشان می‌دهد.

## Configuration

خواندن واحد برنامه، پنجاه خط آخر، بدون پیجر:

```bash
journalctl -u portal.service -n 50 --no-pager
```

همین واحد از ابتدای بوت جاری:

```bash
journalctl -u portal.service -b --no-pager
```

خطاهای کل سیستم در بوت جاری، نه فقط پورتال:

```bash
journalctl -b -p err --no-pager
```

بوت قبلی، فقط خطا:

```bash
journalctl -b -1 -p err --no-pager
```

بازهٔ مطلق شب حادثه. تاریخ را با روز خودتان عوض کنید:

```bash
journalctl -u portal.service --since "2026-09-23 02:00:00" --until "2026-09-23 03:00:00" --no-pager
```

نسبی، برای وقتی دقیق نمی‌دانید:

```bash
journalctl -u portal.service --since "30 min ago" --no-pager
journalctl -p err --since yesterday --no-pager
```

زنده، موقع یک `restart` در ترمینال دیگر:

```bash
journalctl -u portal.service -f
```

خروج با Ctrl+C. شکل زمان را با `-o short-iso` یک‌خطی و قابل کپی کنید:

```bash
journalctl -u portal.service -n 20 -o short-iso --no-pager
```

چند واحد با هم، مثلاً برنامه و SSH، وقتی نمی‌دانید قطعی از کدام بوده:

```bash
journalctl -u portal.service -u ssh.service --since "1 hour ago" --no-pager
```

هسته، جدا از سرویس کاربر:

```bash
journalctl -k -b -p err --no-pager
```

این برای دیسک و OOM مفید است. اگر هسته گفته فرآیند را به‌خاطر حافظه کشته، در لاگ خود پایتون شاید فقط سکوت ببینید.

اولویت را دست‌کم یک بار با عدد ببینید تا جدول برایتان انتزاعی نماند:

```bash
journalctl -p 3 -b --no-pager | head
```

`-p 3` همان آستانهٔ err است.

## Production Example

حادثه: بعد از ری‌بوت، `portal.service` بالا نیست و کسی لاگ دیشب را می‌خواهد.

```bash
systemctl is-failed portal.service
journalctl -u portal.service -b --no-pager
journalctl -u portal.service -b -1 -n 100 --no-pager
```

اگر `-b -1` خالی است و `--list-boots` فقط بوت جاری را دارد، journal ناپایدار بوده. اول بخش Installation را انجام دهید تا حادثهٔ بعدی این‌طور کور نباشد. برای همین حادثه، فایل متنی سنتی را هم چک کنید ولی فرض نکنید چیزی آن‌جاست:

```bash
ls -l /var/log/syslog
```

اگر سرویس در حلقهٔ start-limit است، خط پایانی journal همان را می‌گوید. درمان عملیاتی در صفحهٔ سرویس `reset-failed` است. این صفحه فقط خواندن است. لاگ را قبل از پاک کردن وضعیت در یک فایل بگذارید تا گزارش حادثه خالی نماند:

```bash
journalctl -u portal.service -n 200 --no-pager > /var/backups/portal-journal.txt
sudo chown root:root /var/backups/portal-journal.txt
sudo chmod 0600 /var/backups/portal-journal.txt
```

پر شدن دیسک به‌خاطر journal. اول اندازه، بعد جمع کردن تا ۵۰۰ مگابایت، بعد دوباره اندازه:

```bash
df -h /var
journalctl --disk-usage
sudo journalctl --vacuum-size=500M
journalctl --disk-usage
df -h /var
```

خروجی vacuum تعداد فایل‌های پاک‌شده و فضای آزادشده را می‌گوید. اگر گفت چیزی پاک نشد، یا از قبل زیر سقف بوده‌اید یا فایل در حال استفاده را نگه داشته. سقف `SystemMaxUse` را پایین‌تر بیاورید و journald را restart کنید تا سیاست جدید بماند. vacuum یک‌باره است. بدون سقف، journal دوباره رشد می‌کند.

پاک کردن بر اساس سن، مثلاً قدیمی‌تر از ۳۰ روز، وقتی حجم هنوز زیر سقف است ولی سیاست نگهداری کوتاه‌تر شده:

```bash
sudo journalctl --vacuum-time=30d
```

این کار رکورد حادثهٔ قدیمی‌تر از ۳۰ روز را هم می‌برد. قبلش اگر تیکت باز دارید همان بازه را در فایل `0600` ذخیره کنید.

پیام `Suppressed ... messages` یعنی محدودیت نرخ journald خط‌ها را دور ریخته. لاگ آن بازه کامل نیست. برای یک سرویس پرچانه، در همان drop-in موقتاً نرخ را بالا ببرید و هزینهٔ دیسک را قبول کنید. آن را جهانی و دائمی باز نگذارید:

```ini
[Journal]
RateLimitIntervalSec=30s
RateLimitBurst=10000
```

بعد از حادثه این فایل اضافه را بردارید و journald را restart کنید تا پیش‌فرض بسته برگردد. پیش‌فرض برای این است که یک برنامهٔ دیوانه `/var` را در یک ساعت پر نکند.

دنبال کردن زنده هنگام اصلاح سرویس. ترمینال اول:

```bash
journalctl -u portal.service -f
```

ترمینال دوم:

```bash
sudo systemctl restart portal.service
curl -fsS http://127.0.0.1:8080/
```

در ترمینال اول باید خط شروع واحد و درخواست HTTP را ببینید. اگر درخواست را نمی‌بینید، برنامه access log به stdout نمی‌نویسد. سرور نمونهٔ پایتون به‌صورت پیش‌فرض درخواست را روی stderr لاگ می‌کند و journal همان را برمی‌دارد. اگر هیچ خطی نیامد، `-f` را روی واحد غلط باز کرده‌اید یا سرویس اصلاً restart نشده. `systemctl status` همان لحظه Main PID را نشان می‌دهد.

## Security Notes

- journal سیستم راز و مسیر فایل و گاهی توکن اشتباه‌چاپ‌شده را دارد. خروجی را در تیکت عمومی نچسبانید. فایل کپی `0600` باشد.
- `deploy` را عضو `systemd-journal` نکنید. او لاگ بقیهٔ سرویس‌ها را لازم ندارد.
- `SystemMaxUse` را حذف نکنید تا «چیزی از دست نرود». دیسک پر، لاگ جدیدتر را که مهم‌تر است هم نمی‌نویسد.
- `--vacuum-size` را روی سرور حادثه قبل از ذخیرهٔ بازهٔ لازم نزنید. جمع کردن برمی‌گردد ندارد.
- دسترسی خواندن journal برابر دیدن فعالیت همهٔ واحدهاست. گروه را به هر انسان لاگ‌خوان بدهید، نه به حساب سرویس و نه به حساب مشترک.
- ساعت غلط را با لاگ غلط اشتباه نگیرید. اگر `--since yesterday` خالی است، `timedatectl` را ببینید.

## Troubleshooting

| نشانه | علت محتمل | کار |
| --- | --- | --- |
| `-b -1` خالی است | journal ناپایدار بوده | `Storage=persistent` و وجود `/var/log/journal` |
| کاربر عادی هیچ خط سیستمی نمی‌بیند | گروه journal نیست | `id` و عضویت `adm` یا `systemd-journal` |
| `--since` خالی ولی حادثه را یادتان هست | ساعت یا منطقهٔ زمانی | `timedatectl` و بازهٔ مطلق |
| دیسک `/var` پر است و vacuum چیزی کم نکرد | فایل باز یا سقف بالاتر از واقعیت | `journalctl --disk-usage` و `SystemMaxUse` کوچک‌تر |
| `VacuumSize` در conf اثری ندارد | چنین کلیدی نیست | `SystemMaxUse` و دستور `--vacuum-size` |
| خط‌ها جا افتاده و Suppressed آمده | محدودیت نرخ | بازه را ناقص بدانید، نرخ را موقتاً فقط برای همان عیب‌یابی |
| `-u` خالی است و status واحد را نمی‌شناسد | نام واحد غلط است | `systemctl list-units --type=service` |
| بعد از restart journald پوشهٔ var نیست | مالک یا حالت پوشه غلط است | `install -d` با گروه `systemd-journal` و حالت `2755` |

برای اینکه بفهمید یک پیام مال کدام واحد است وقتی فقط متن را دارید:

```bash
journalctl -b --grep "Permission denied" --no-pager
```

`--grep` روی متن تبدیل‌شده کار می‌کند و از فیلتر `-u` کندتر است. اول واحد را محدود کنید اگر می‌دانید کدام است. از grep روی فایل باینری `/var/log/journal/*` استفاده نکنید. خروجی‌اش زباله است و فایل را به‌اشتباه «متن خراب» جلوه می‌دهد.

## Best Practices

- عیب‌یابی را با `journalctl -u نام -n 50 --no-pager` شروع کنید، بعد `-p err`، بعد بوت قبلی.
- journal را در نصب سرور پایدار کنید، نه بعد از اولین ری‌بوت کور.
- سقف `SystemMaxUse` و `SystemKeepFree` را با اندازهٔ واقعی `/var` بنویسید. vacuum را جایگزین سقف نکنید.
- کلید خیالی در conf نگذارید. سیاست حجم `SystemMaxUse` است و جمع یک‌باره `--vacuum-size` است.
- قبل از vacuum در حادثه، بازه را در فایل `0600` زیر `/var/backups` کپی کنید.
- `-f` را موقع تست restart باز نگه دارید و با Ctrl+C ببندید. سرویس با بستن journalctl نمی‌خوابد.
