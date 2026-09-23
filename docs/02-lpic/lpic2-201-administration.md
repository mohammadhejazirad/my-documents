---
title: مدیریت سیستم ۲۰۱
sidebar_position: 12
description: ظرفیت، journal و rsyslog، chrony در برابر timesyncd، locale و hostnamectl.
---

# مدیریت سیستم ۲۰۱

## مقدمه

بخش مدیریت آزمون ۲۰۱ که این صفحه جمع می‌کند ظرفیت (هدف ۲۰۰)، زمان و لاگ (در ۱۰۲ هم هست و اینجا از دید سرور عمیق‌تر می‌شود)، locale، و نام میزبان است. ابزار پایش بلندمدت در [پایش منبع](/docs/12-monitoring/resource-monitoring) و [مدیریت لاگ](/docs/12-monitoring/log-management) است. journal روزمره در [journalctl](/docs/01-linux/journalctl) است. سی دقیقهٔ اول سرور در [بوت‌استرپ](/docs/04-server-management/initial-bootstrap) است. اینجا تصمیم تولیدی همان موضوع‌هاست: چه عددی را باور کنید، کدام کلاینت زمان باید تنها بماند، و چرا زبان لاگ را فارسی نکنید.

منطقهٔ آزمایشگاه `Asia/Tehran` است. نام میزبان `app-1.example.internal` است.

## مفهوم اصلی

بار (load average) صف آماده‌به‌اجرای CPU به‌علاوهٔ دیسک بلاک‌شده در سه پنجرهٔ ۱ و ۵ و ۱۵ دقیقه است. درصد نیست. مقایسهٔ درست با تعداد هسته است که `nproc` می‌گوید. بار ۴ روی ماشین دو هسته‌ای بد است و روی ماشین ۱۶ هسته‌ای الزاماً فوری نیست.

حافظهٔ «آزاد» در `free` عدد گمراه‌کننده‌ای است چون هسته کش فایل را آنجا نگه می‌دارد و هنگام فشار رها می‌کند. ستون موجودِ قابل‌استفاده را `MemAvailable` در `/proc/meminfo` بهتر می‌گوید. پر شدن دیسک و پر شدن inode دو ظرفیت جدا هستند.

زمان سه ساعت است: ساعت سخت‌افزار (RTC)، ساعت هسته، و منطقهٔ زمانی برای نمایش. سرویس NTP فقط باید یکی باشد. دو دیمون که هر دو ساعت را عقب و جلو ببرند، لاگ و گواهی و قفل فایل را متناقض می‌کنند.

locale زبان و کدگذاری و ترتیب مرتب‌سازی را تعیین می‌کند. `LANG=C` یا `C.UTF-8` خروجی ابزار را برای اسکریپت پایدار می‌کند. سرور تولید را با locale فارسی برای خود برنامه‌ها تنظیم نکنید اگر لاگ و parser را انگلیسی می‌خواهید؛ رابط انسانی جای دیگری است.

## چرا استفاده می‌شود؟

بدون خط پایه، «کند شده» قابل اثبات نیست. هدف ۲۰۰ می‌خواهد مصرف را اندازه بگیرید و کمی جلوتر را حدس بزنید. حدس یعنی دیدن شیب دیسک در چند هفته، نه یک مدل پیچیده. اگر `/var` روزی یک گیگ رشد می‌کند و ۲۰ گیگ خالی است، کمتر از سه هفته فرصت دارید حتی اگر CPU بیکار باشد.

زمان غلط بدتر از سرویس خاموش است چون همه‌چیز بالا است و خطاها مبهم‌اند: TLS که «هنوز معتبر نیست»، cron که یک ساعت جابه‌جا شده، و journal که ترتیب حادثه را دروغ می‌گوید.

نام میزبان غلط در گواهی، در لاگ مرکزی، و در اعلان مانیتورینگ، اپراتور را به ماشین دیگر SSH می‌دهد. `hostnamectl` هر سه نام ایستا و گذرا و قشنگ را یکجا نشان می‌دهد.

## Architecture

```text
ظرفیت زنده
  nproc, uptime, free, vmstat, df, ss
ظرفیت ثبت‌شده
  sysstat (sar, iostat) اگر بسته نصب باشد
  پایش خارجی روی mon-1

زمان
  timedatectl  ── وضعیت یکپارچهٔ systemd
      │
      ├─ Ubuntu 26.04 پیش‌فرض: chrony
      │     /etc/chrony/chrony.conf
      │     chronyc tracking
      └─ Debian 13 اغلب: systemd-timesyncd
            /etc/systemd/timesyncd.conf
            timedatectl timesync-status
  همزمان هر دو active نباشد

لاگ
  systemd-journald  ── journalctl
  rsyslog اگر نصب باشد ── /var/log/syslog
  logrotate

هویت میزبان
  hostnamectl
  /etc/hostname
  /etc/hosts
  locale از /etc/default/locale
```

آزمون هنوز `/etc/chrony.conf` و `ntpd` و `ntp.conf` را نام می‌برد. روی Ubuntu و Debian فایل chrony در `/etc/chrony/chrony.conf` است. `ntpd` کلاسیک پیش‌فرض این دو توزیع نیست. `ntpq` را بشناسید و روی سروری که chrony دارد نصب موازی نکنید.

## Installation

ابزار پایه از قبل هستند. برای ظرفیت دیسک در طول زمان، `sysstat` را روی سروری که هنوز عامل پایش ندارد نصب کنید. خود پایش کامل جای این بسته را نمی‌گیرد و برعکس.

```bash
sudo apt update
sudo apt install sysstat
sudo sed -i 's/^ENABLED="false"/ENABLED="true"/' /etc/default/sysstat
sudo systemctl enable --now sysstat
```

اگر فایل از قبل `true` بود، sed چیزی عوض نمی‌کند. ده دقیقه بعد `sar -q` باید عدد داشته باشد. بلافاصله بعد از نصب ممکن است خالی باشد.

زمان را نصب اضافی نکنید تا وقتی وضعیت را ندیده‌اید.

```bash
timedatectl
systemctl is-active chrony systemd-timesyncd
```

روی Ubuntu 26.04 انتظار این است که `chrony` برابر `active` باشد و `systemd-timesyncd` یا نصب نباشد یا inactive. از ۲۵.۱۰ به بعد chrony جای timesyncd را به‌عنوان پیش‌فرض گرفته تا NTS و دقت بهتری داشته باشد. سندهای قدیمی که فقط timesyncd را پیش‌فرض 26.04 می‌دانند با این میزبان نمی‌خوانند.

روی Debian 13 انتظار برعکس است: `systemd-timesyncd` فعال است و chrony نیست، تا وقتی خودتان برای سرو کردن زمان یا NTS نصبش کنید. timesyncd فقط کلاینت SNTP است و سرور زمان برای بقیهٔ شبکه نمی‌شود.

## Configuration

منطقه و ساعت:

```bash
sudo timedatectl set-timezone Asia/Tehran
timedatectl
```

خط `Time zone` باید `Asia/Tehran` باشد. RTC را در منطقهٔ محلی نگذارید؛ `RTC in local TZ: no` درست است.

اگر Ubuntu است و chrony فعال است، سرور زمان را در `/etc/chrony/chrony.conf` ببینید. برای میزبانی که اینترنت دارد، استخر پیش‌فرض بسته کافی است. برای شبکه‌ای که باید از یک منبع داخلی بگیرد، خط `pool` را کامنت نکنید تا نسخهٔ پشتیبان فایل را داشته باشید؛ یک فایل drop-in اگر نسخهٔ chrony شما پشتیبانی کند، یا یک خط صریح:

```text
server 10.10.1.40 iburst
```

فقط اگر `mon-1` واقعاً سرویس زمان می‌دهد. وگرنه همان پیش‌فرض بسته را دست نزنید و این خط را اضافه نکنید. اعمال:

```bash
sudo systemctl restart chrony
chronyc tracking
chronyc sources
```

`System time` باید کند کند به صفر نزدیک شود. پرش بزرگ را `makestep` در همان فایل کنترل می‌کند. بستهٔ Ubuntu معمولاً `makestep 1 3` دارد، یعنی فقط اوایل مجاز است ساعت را پرش دهد.

اگر Debian است و timesyncd کافی است، سرورها در `/etc/systemd/timesyncd.conf` زیر بخش Time با کلید `NTP` می‌آیند. فاصله‌دار، نه فهرست تو در تو. سپس `sudo systemctl restart systemd-timesyncd` و `timedatectl timesync-status`.

هرگز هر دو را با هم enable نکنید. اگر chrony را روی Debian نصب می‌کنید:

```bash
sudo systemctl disable --now systemd-timesyncd
sudo apt install chrony
sudo systemctl enable --now chrony
```

برعکسش اگر کسی روی Ubuntu هر دو را روشن کرده: یکی را `disable --now` کنید. `timedatectl set-ntp true` روی Ubuntu 26.04 کلاینت پیش‌فرض، یعنی chrony، را هدف می‌گیرد نه لزوماً timesyncd را. بعد از هر تغییر `systemctl is-active` را برای هر دو نام تکرار کنید.

ساعت سخت‌افزار، وقتی chrony با `rtcsync` خودش RTC را تنظیم می‌کند، نیازی به `hwclock` دستی هر شب ندارد. آزمون فرمان را می‌شناسد: `sudo hwclock --show` و در صورت نیاز یک‌بار `sudo hwclock --systohc --utc`. هر شب هر دو مکانیزم را با هم نزنید.

journal ماندگار. پیش‌فرض بعضی ایمیج‌ها journal را در حافظه نگه می‌دارد و با reboot پاک می‌شود. برای سرور:

```bash
sudo mkdir -p /var/log/journal
sudo systemd-tmpfiles --create --prefix /var/log/journal
sudo systemctl restart systemd-journald
journalctl --disk-usage
```

سقف را در `/etc/systemd/journald.conf` با `SystemMaxUse=200M` بگذارید اگر دیسک کوچک است. بعد از ویرایش، سرویس journald را restart کنید. خالی کردن کنترل‌شده: `sudo journalctl --vacuum-time=30d`.

اگر `rsyslog` نصب است، `/var/log/syslog` هنوز پر می‌شود و `logrotate` باید بچرخاندش. اگر نصب نیست، دنبال فایل syslog نگردید؛ منبع، journal است.

```bash
systemctl is-active rsyslog || echo 'rsyslog-not-running'
logger -t lpic-admin "lab line from ops"
journalctl -t lpic-admin -n 1 --no-pager
```

نام میزبان:

```bash
sudo hostnamectl set-hostname app-1.example.internal
hostnamectl status
getent hosts app-1.example.internal
```

`/etc/hosts` باید `10.10.1.10` را به همین نام کامل و به نام کوتاه `app-1` نگاشت کند. بدون آن، برنامه‌هایی که نام خود را حل می‌کنند معطل می‌مانند. نام قشنگ (pretty) را با نام DNS یکی نکنید اگر فاصله دارد؛ pretty برای نمایش است.

locale:

```bash
localectl status
sudo localectl set-locale LANG=C.UTF-8
```

`C.UTF-8` روی Ubuntu بدون `locale-gen` موجود است، کدگذاری یونیکد دارد، و مرتب‌سازی‌اش وابسته به زبان انسان نیست. اگر برنامهٔ خاصی `en_US.UTF-8` خواست، اول `locale -a` را ببینید و در صورت نبود `sudo locale-gen en_US.UTF-8`. متغیر `LC_ALL` همهٔ `LC_*` را له می‌کند؛ در اسکریپت برای یک فرمان قابل قبول است و در محیط سراسری سرویس پنهان‌کار است چون باگ زبان را ساکت می‌کند.

## Production Example

`app-1` کند است و تیکت فقط نوشته «سرور سنگین است». پنج عدد را در تیکت بگذارید، بعد تصمیم بگیرید.

```bash
nproc
uptime
free -h
df -hT / /var
vmstat 1 5
```

`vmstat` پنج خط می‌دهد. اگر ستون `wa` بالا است، CPU منتظر دیسک است نه این که هسته کم است. اگر `si` و `so` غیر از صفرند، سیستم در حال swap است. آن وقت به [حافظه](/docs/14-troubleshooting/memory-leak) و [دیسک پر](/docs/14-troubleshooting/disk-full) نگاه کنید، نه به ارتقای بی‌برنامه.

رشد دیسک را اگر sar نصب است از دیسک بخوانید:

```bash
sar -d -f /var/log/sysstat/sa$(date +%d) | tail -n 20
df -i /
```

پیش‌بینی ساده: اندازهٔ `/var` را امروز و عدد یادداشت هفتهٔ قبل. تفاضل تقسیم بر روز. این همان «پیش‌بینی منبع» در حد عملیات است. اگر شیب تا پنجرهٔ نگهداری بعدی به ۱۰۰ درصد می‌رسد، پاک‌سازی یا دیسک تازه را همین هفته تیکت کنید، نه وقتی نوشتن فایل شکست خورد.

اختلاف ساعت با `mon-1` را این‌طور ثابت کنید. روی هر دو میزبان:

```bash
timedatectl show -p NTPSynchronized -p TimeUSec --no-pager
```

اگر یکی synchronized ندارد، همان میزبان را درست کنید. ساعت را با `date -s` روی ماشینی که NTP فعال دارد دستی نکشید؛ دقیقهٔ بعد دیمون برش می‌گرداند یا بدتر، هر دو با هم می‌جنگند.

## Security Notes

سرور chrony را به اینترنت به‌عنوان منبع زمان باز نکنید. دستور `allow` در chrony اگر بدون محدودیت باشد، میزبان را وارد حملات بازتابی NTP می‌کند. کلاینت ماندن کافی است. اگر باید به `10.10.1.0/24` زمان بدهید، allow را به همان زیرشبکه محدود کنید و در فایروال UDP 123 را به همان محدوده ببندید.

journal ممکن است فرمان و شناسه داخل پیام برنامه را نگه دارد. `journalctl` را در کانال عمومی اسکرول نکنید. حقوق خواندن journal برای گروه `systemd-journal` است. کاربر عادی را بی‌دلیل به آن گروه اضافه نکنید.

`set-hostname` نام را عوض می‌کند ولی گواهی TLS و رکورد DNS و فایل `known_hosts` دیگران را نه. بعد از تغییر نام، هر سه را در برنامهٔ تغییر بیاورید. گواهی در [گواهی](/docs/11-networking/ssl-letsencrypt) است.

## Troubleshooting

علامت: `System clock synchronized: no`.

```bash
systemctl is-active chrony systemd-timesyncd
chronyc tracking 2>&1 | head -n 15
timedatectl timesync-status 2>&1 | head -n 15
```

اگر هر دو inactive هستند، هیچ کلاینتی نیست. یکی را روشن کنید، نه هر دو. اگر chrony می‌گوید `Not synchronised` و sources خالی است، خروجی به UDP 123 بسته است یا سرور نام زمان حل نمی‌شود. آن را با روش [شبکهٔ ۱۰۲](/docs/02-lpic/lpic1-102-networking) جدا کنید. اگر هر دو active هستند، ساعت را تا خاموش کردن یکی باور نکنید.

علامت: لاگ بعد از reboot نیست. journal روی دیسک پایدار نشده. بخش کانفیگ `mkdir /var/log/journal` را انجام دهید. اگر rsyslog انتظار دارید و واحدش failed است، `journalctl -u rsyslog -b` دلیل را می‌گوید؛ اغلب مجوز یا دیسک پر.

علامت: `sar` می‌گوید cannot open. یا sysstat تازه است و هنوز فایلی ننوشته، یا `ENABLED` هنوز false است. `systemctl status sysstat` را ببینید.

علامت: برنامه مرتب‌سازی را متفاوت از لپ‌تاپ شما انجام می‌دهد. `locale` را روی هر دو مقایسه کنید. برای اسکریپت، همان فرمان را با `LC_ALL=C` اجرا کنید به‌جای عوض کردن locale کل سرور.

## Best Practices

- بار را با `nproc` معنی کنید. عدد تنها را در تیکت نگذارید.
- یک کلاینت زمان. Ubuntu 26.04 یعنی chrony مگر کسی عمداً عوضش کرده باشد. Debian 13 یعنی timesyncd مگر chrony را با دلیل نصب کرده باشید.
- مسیر فایل chrony روی این توزیع‌ها `/etc/chrony/chrony.conf` است، حتی اگر سؤال آزمون مسیر کوتاه `/etc/chrony.conf` را نوشته باشد.
- journal را ماندگار و سقف‌دار کنید. دو کپی بی‌صاحب، هم journal و هم فایل‌های rotate‌نشده، دیسک را پر می‌کنند.
- `LANG=C.UTF-8` برای سرور. زبان رابط را به locale سرویس‌ها گره نزنید.
- hostname کامل را در hostnamectl و `/etc/hosts` و DNS با هم یکی نگه دارید.

## تمرین

سناریو: گواهی جدید روی `app-1` رد می‌شود و ساعت مشکوک است. تیم هم می‌گوید دیسک «هنوز جا دارد» ولی inode را نگاه نکرده‌اند. چیزی را پاک نکنید.

```bash
timedatectl
systemctl is-active chrony systemd-timesyncd
nproc
uptime
df -hT / /var
df -i / /var
hostnamectl status
localectl status
```

سؤال‌ها:

1. اگر هر دو واحد زمان active بودند اول چه می‌کنید؟
2. چرا `Mem` آزادِ خیلی کوچک در `free` به‌تنهایی ثابت نمی‌کند حافظه تمام شده؟
3. فرق مسیر آزمون `/etc/chrony.conf` با مسیر Ubuntu چیست؟

## پاسخ تمرین

`Time zone` باید `Asia/Tehran` باشد. روی Ubuntu 26.04 سالم، chrony فعال و timesyncd غیرفعال است و `NTPSynchronized` بله است. روی Debian 13 سالم، برعکسِ واحدها قابل قبول است اگر synchronized بله باشد. `hostnamectl` باید `app-1.example.internal` را نشان دهد. اگر inode بالای ۹۰ درصد است، جا داشتن بلوک بی‌معنی است؛ دنبال دایرکتوری پر از فایل کوچک بگردید، با روش صفحهٔ دیسک، نه با پاک کردن تصادفی.

1. یکی را `systemctl disable --now` کنید. برای سرور Ubuntu chrony بماند. تا وقتی هر دو فعال‌اند، ساعت را با `date -s` «درست» نکنید.
2. چون هستهٔ لینوکس حافظهٔ آزاد را صرف کش می‌کند و `available` همان چیزی است که بدون swap می‌تواند به برنامه بدهد. `free -h` ستون available را نشان می‌دهد. اگر آن هم کم بود و `vmstat` ستون si/so داشت، آن وقت فشار واقعی است.
3. آزمون اغلب مسیر سبک رد هت را نوشته. روی Ubuntu 26.04 و Debian 13 فایل `/etc/chrony/chrony.conf` است. هر دو اسم را بشناسید و روی دیسک مسیر واقعی را ویرایش کنید.
