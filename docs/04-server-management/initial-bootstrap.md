---
title: سی دقیقهٔ اول سرور تازه
sidebar_position: 2
description: "به‌روزرسانی، نام میزبان، ساعت تهران، کاربر ops، و unattended-upgrades فقط برای وصلهٔ امنیتی روی Ubuntu 26.04."
---

# سی دقیقهٔ اول سرور تازه

## مقدمه

سرور تازه‌ای که از نصب Ubuntu 26.04 بیرون آمده هنوز آمادهٔ سرویس نیست. نامش پیش‌فرض است، ساعتش ممکن است UTC باشد، تنها راه ورودش گاهی یک رمز موقت است، و تا وقتی خودتان به‌روزش نکنید همان نسخه‌ای می‌ماند که روی تصویر نصب بوده. این صفحه همان ساعت اول را روی میزبان آزمایشگاه، با نمونهٔ `app-1.example.internal` (`10.10.1.10`)، تمام می‌کند.

کارها به همین ترتیب‌اند: `apt update` و `apt full-upgrade`، بعد `hostnamectl`، بعد `timedatectl set-timezone Asia/Tehran`، بعد کاربر `ops` در گروه `sudo`، بعد بستن ورود رمز SSH که خودش در فصل امنیت است و اینجا فقط به آن لینک می‌دهیم، بعد `unattended-upgrades` طوری که فقط جیب امنیت خودکار بیاید نه همهٔ بسته‌ها، و آخر نگاه کردن به reboot با `checkrestart` یا فایل `/var/run/reboot-required`.

میزبان‌های دیگر همان دستورها را می‌گیرند و فقط نام عوض می‌شود. نام‌ها را از جدول آزمایشگاه بردارید. همه را `app-1` نکنید.

## مفهوم اصلی

`apt full-upgrade` با `apt upgrade` این فرق را دارد که اگر وابستگی لازم بداند، بسته را جابه‌جا می‌کند. روی میزبان تازه، قبل از هر سرویس، این همان کاری است که تصویر کهنه را به نقطهٔ امنیتی امروز می‌رساند. روی میزبان شلوغ تولید، `full-upgrade` را بی‌خبر نزنید. اینجا میزبان هنوز شلوغ نیست.

نام میزبان در هسته، در پرامپت، و در گواهی‌هایی که بعداً می‌سازید دیده می‌شود. `hostnamectl` این نام را پایدار می‌کند. یک خط در `/etc/hosts` هم لازم است تا `sudo` و سرویس‌های محلی برای نام خودشان معطل نشوند.

منطقهٔ `Asia/Tehran` یعنی `journalctl` و timerهای systemd ساعت ایران را نشان می‌دهند. NTP باید روشن بماند. منطقهٔ زمانی جای همگام‌سازی ساعت نیست. هر دو لازم‌اند. ساعت غلط، اعتبار گواهی و لاگ حادثه را با هم خراب می‌کند.

کاربر `ops` انسان است. حساب نصب اولیه، اگر رمز موقت دارد، بعد از ساخته شدن `ops` نباید راه ماندن SSH باشد. خود این صفحه رمز SSH را داخل `sshd` نمی‌بندد تا دو منبع برای یک تنظیم ساخته نشود. لینک پایین همان drop-in است.

`unattended-upgrades` هر شب مخزن را می‌بیند و فقط مبدأهایی را نصب می‌کند که در فهرست `Allowed-Origins` باشند. روی Ubuntu 26.04 فایل پیش‌فرض `/etc/apt/apt.conf.d/50unattended-upgrades` معمولاً هم جیب خود انتشار (`resolute` بدون پسوند) را دارد و هم جیب `-security` را. جیب انتشار یعنی هر به‌روزرسانی آن انتشار، نه فقط وصلهٔ امنیتی. سیاست این دانشنامه این است که شب‌ها فقط امنیت بیاید. جیب `-updates` را باز نمی‌کنیم. جیب خود انتشار را هم از فهرست مؤثر برمی‌داریم.

reboot را خودکار نمی‌کنیم. هستهٔ نو تا reboot در دیسک است نه در حافظه. فایل `/var/run/reboot-required` را بسته‌های Ubuntu وقتی لازم باشد می‌سازند. `checkrestart` از بستهٔ `debian-goodies` فرایندهایی را نشان می‌دهد که هنوز فایل پاک‌شدهٔ کتابخانه را در حافظه دارند و باید سرویسشان از نو بیاید، حتی اگر خود هسته reboot نخواهد.

## چرا استفاده می‌شود؟

بدون این ساعت، بقیهٔ فصل‌ها روی ماسه‌اند. لاگ ClamAV با UTC نوشته می‌شود و شما فکر می‌کنید اسکن شب اجرا نشده. دو نفر با رمز اولیه وارد می‌شوند چون کلید هنوز رسم نشده. یک ماه بعد هستهٔ تصویر نصب هنوز در `uname -r` است چون کسی reboot را ندیده.

به‌روزرسانی بی‌حضور فقط برای امنیت است تا جمعه شب، نسخهٔ تازهٔ Nginx یا پایگاه داده بی‌آنکه کسی تغییر را خوانده باشد روی تولید ننشیند. وصلهٔ امنیتی را هم بی‌نهایت عقب نیندازید. این تعادل است: امنیت خودکار، بقیه در ساعت اداری، reboot با خبر.

## Architecture

```text
تصویر Ubuntu 26.04
    │
    ├─ apt update && apt full-upgrade
    ├─ hostnamectl  →  app-1.example.internal
    ├─ timedatectl  →  Asia/Tehran و NTP روشن
    ├─ کاربر ops در گروه sudo، بدون رمز عبور برای SSH
    ├─ کلید، بعد بستن رمز در فصل امنیت
    ├─ 20auto-upgrades  تا کار شبانه روشن باشد
    ├─ 52unattended-upgrades-security-only
    │     فهرست 50 را پاک می‌کند و فقط -security می‌گذارد
    └─ انسان نگاه می‌کند:
          /var/run/reboot-required
          checkrestart
          reboot فقط وقتی آن نشانه‌ها بگویند و نشست دوم سالم باشد
```

فایل `50unattended-upgrades` مال بسته است. به‌روزرسانی خود بسته ممکن است بپرسد آن را نگه دارید یا نه. برای همین سیاست مؤثر را در فایل دیرتر می‌نویسیم. apt فهرست‌ها را از چند فایل با هم جمع می‌کند. اگر فقط یک مبدأ تازه اضافه کنید، مبدأهای فایل ۵۰ سر جایشان می‌مانند. پس فایل ۵۲ اول فهرست را خالی می‌کند و بعد فقط امنیت را می‌گذارد.

## Installation

با حسابی که همین حالا sudo دارد وارد شوید. نشست را نبندید.

```bash
sudo apt update
sudo apt full-upgrade
```

اگر هسته یا `openssh-server` در فهرست بود، تا آخر این صفحه reboot نکنید. اول نام و کاربر و کلید را درست کنید، وگرنه بعد از reboot ممکن است با وضعیت نیمه‌کاره برگردید.

نام و ساعت:

```bash
hostnamectl
sudo hostnamectl set-hostname app-1.example.internal
hostnamectl
timedatectl
sudo timedatectl set-timezone Asia/Tehran
sudo timedatectl set-ntp true
timedatectl
```

`Time zone: Asia/Tehran` باید در خروجی باشد و `System clock synchronized: yes` بعد از چند ثانیه. اگر NTP هرگز yes نمی‌شود، خروجی نیست و فایروال خروجی را جایی بسته، یا میزبان به هیچ سرور زمانی نمی‌رسد. ساعت را با دست برای همیشه نگذارید. دلیل نرسیدن NTP را پیدا کنید.

`/etc/hosts` را با `sudoedit` طوری کنید که نام کامل و کوتاه به آدرس محلی اشاره کنند. خط پیش‌فرض `127.0.1.1` را عوض کنید نه اینکه یک خط دوم متناقض اضافه کنید:

```text
127.0.1.1 app-1.example.internal app-1
127.0.0.1 localhost
```

کاربر مدیر:

```bash
sudo adduser --disabled-password --gecos "Ops admin" ops
sudo usermod -aG sudo ops
id ops
sudo install -d -m 700 -o ops -g ops /home/ops/.ssh
sudo install -m 600 -o ops -g ops /dev/null /home/ops/.ssh/authorized_keys
sudoedit /home/ops/.ssh/authorized_keys
```

`--disabled-password` یعنی حساب رمز ورود ندارد و چیزی برای حدس زدن روی SSH نیست. یک خط کلید عمومی `ed25519` را در `authorized_keys` بگذارید. کلید را روی لپ‌تاپ خود `ops` ساخته‌اید، نه روی سرور با یک کلید مشترک. ساخت کلید و بستن رمز و root در [سخت‌سازی SSH](/docs/10-security/ssh-hardening) است. تا آن drop-in اعمال نشده، کار این صفحه تمام نیست. اینجا فقط کاربر را جوری می‌سازیم که آن صفحه چیزی برای قفل کردن داشته باشد.

یک نشست نو با `ssh ops@10.10.1.10` باز کنید و `sudo -v` بزنید. اگر گروه `sudo` را همین الان اضافه کرده‌اید، نشست قدیمی آن گروه را نمی‌بیند. نشست نو ملاک است.

ابزار دیدن reboot و فرایندهای جا مانده:

```bash
sudo apt install unattended-upgrades debian-goodies
```

`unattended-upgrades` اغلب روی تصویر سرور از قبل هست. نصب دوباره ضرری ندارد. `debian-goodies` فرمان `checkrestart` را می‌آورد.

## Configuration

روشن بودن کار شبانه در `/etc/apt/apt.conf.d/20auto-upgrades`. اگر فایل هست، همین مقدارها را داشته باشد. اگر نیست، با `sudoedit` بسازید:

```text
APT::Periodic::Update-Package-Lists "1";
APT::Periodic::Unattended-Upgrade "1";
APT::Periodic::Download-Upgradeable-Packages "0";
APT::Periodic::AutocleanInterval "7";
```

فایل سیاست، `/etc/apt/apt.conf.d/52unattended-upgrades-security-only`. این فایل فهرست `Allowed-Origins` داخل `50unattended-upgrades` را خالی می‌کند و فقط امنیت را برمی‌گرداند. خط‌های ESM اگر اشتراک Ubuntu Pro نداشته باشید نادیده می‌مانند. بودنشان ضرر ندارد و اگر Pro روشن شود، وصلهٔ امنیتی جیب universe هم می‌آید. خط `-updates` عمداً نیست. خط بدون پسوند که یعنی کل انتشار، عمداً نیست.

```text
#clear Unattended-Upgrade::Allowed-Origins;
Unattended-Upgrade::Allowed-Origins {
    "${distro_id}:${distro_codename}-security";
    "${distro_id}ESMApps:${distro_codename}-apps-security";
    "${distro_id}ESM:${distro_codename}-infra-security";
};

Unattended-Upgrade::DevRelease "false";
Unattended-Upgrade::Automatic-Reboot "false";
Unattended-Upgrade::Remove-Unused-Dependencies "false";
```

علامت clear باید اول همان خط باشد، همان‌طور که در فایل بالا هست. اگر آن خط را برندارید و فقط مبدأ امنیت را در فایل دوم اضافه کنید، مبدأهای فایل ۵۰ هم فعال می‌مانند و هدف «فقط امنیت» از بین می‌رود.

در خود `50unattended-upgrades` این دو را روشن نکنید و اگر روشن‌اند خاموششان کنید تا حتی قبل از خواندن فایل ۵۲ هم کسی با خواندن فایل ۵۰ گول نخورد:

```text
// "${distro_id}:${distro_codename}-updates";
// "${distro_id}:${distro_codename}-proposed";
// "${distro_id}:${distro_codename}-backports";
```

در فایل ۵۰ اگر خطی هست که فقط نام انتشار را دارد و پسوند security ندارد، آن را هم کامنت کنید. فایل ۵۲ با clear نتیجه را قطعی می‌کند. کامنت در ۵۰ برای انسانی است که فردا فقط همان فایل را باز می‌کند.

آزمایش خشک، بدون نصب:

```bash
sudo unattended-upgrade --dry-run --debug
```

در خروجی باید مبدأ `resolute-security` را ببینید. نباید مبدأ `resolute-updates` را ببینید. نباید یک مبدأ که آرشیوش فقط `resolute` است، بدون پسوند security، در فهرست مجاز باشد. شکل واقعی خروجی شبیه این است و نام دقیق را از روی میزبان خودتان باور کنید نه از این نمونه:

```text
Allowed origins are: o=Ubuntu,a=resolute-security, o=UbuntuESMApps,a=resolute-apps-security, o=UbuntuESM,a=resolute-infra-security
```

تایمرهایی که این کار را شبانه صدا می‌زنند روی Ubuntu معمولاً این‌ها هستند:

```bash
systemctl list-timers apt-daily.timer apt-daily-upgrade.timer
sudo systemctl enable --now apt-daily.timer apt-daily-upgrade.timer
```

لاگ اجرا، بعد از اولین شب، اینجاست:

```text
/var/log/unattended-upgrades/unattended-upgrades.log
```

reboot خودکار خاموش است. بعد از هر `full-upgrade` و هر صبح بعد از کار بی‌حضور:

```bash
if [ -f /var/run/reboot-required ]; then
  cat /var/run/reboot-required
  cat /var/run/reboot-required.pkgs
else
  printf '%s\n' "no reboot-required file"
fi
sudo checkrestart
```

اگر فایل reboot وجود دارد، متنش می‌گوید راه‌اندازی دوباره لازم است و فایل کناری‌اش اسم بسته‌ها را دارد. `checkrestart` فرایندهایی را فهرست می‌کند که هنوز کتابخانهٔ عوض‌شده را گرفته‌اند. برای آن‌ها reboot لازم نیست. `systemctl restart` همان سرویس کافی است، در ساعتی که قطعی کوتاه را می‌پذیرید. اگر سرویس را نمی‌شناسید، قبل از restart بپرسید چه کسی به آن وصل است.

reboot را وقتی بزنید که فایل reboot هست، نشست دوم `ops` با کلید کار می‌کند، و کنسول هایپروایزر را در دسترس می‌دانید:

```bash
sudo reboot
```

بعد از بالا آمدن:

```bash
uname -r
timedatectl
systemctl is-system-running
```

## Production Example

`app-1` دیروز از تصویر نصب آمده. امروز این صفحه را تا `checkrestart` جلو رفته‌اید. `hostnamectl` نام `app-1.example.internal` را نشان می‌دهد. `timedatectl` تهران را نشان می‌دهد. `id ops` گروه `sudo` را دارد. از لپ‌تاپ با کلید وارد شده‌اید. drop-in فصل امنیت رمز را بسته و شما هنوز یک پنجرهٔ قدیمی را تا تمام شدن آزمایش پنجرهٔ نو نبسته‌اید.

`unattended-upgrade --dry-run` فقط `resolute-security` را مجاز نشان می‌دهد. شب همان روز لاگ یا می‌گوید بسته‌ای نبوده، یا چند بستهٔ امنیتی نصب کرده. صبح فایل reboot را می‌خوانید. اگر هست، در پنجرهٔ اعلام‌شده reboot می‌کنید نه همان لحظه‌ای که کاربران روی برنامه هستند. اگر نیست و `checkrestart` یک سرویس را نشان می‌دهد، فقط همان سرویس را restart می‌کنید.

روی `db-1` همین فایل‌های apt را می‌گذارید ولی reboot را با زمان بکاپ و قطعی دیتابیس یکی می‌کنید. `full-upgrade` آنجا ممکن است خود موتور پایگاه را لمس کند. اول خشک‌وش را بخوانید. اگر بستهٔ `mysql` یا `postgresql` در فهرست است، آن میزبان را با میزبان برنامه یک جا reboot نکنید.

## Security Notes

رمز موقت نصب را روی SSH رها نکنید. `--disabled-password` برای `ops` کافی نیست اگر حساب دیگری رمز دارد و `sshd` هنوز رمز را قبول می‌کند. تمام کردن این صفحه بدون [سخت‌سازی SSH](/docs/10-security/ssh-hardening) یعنی در هنوز باز است.

`unattended-upgrades` با امتیاز root بسته نصب می‌کند. مخزن اضافی و PPA را وارد `Allowed-Origins` نکنید مگر همان مخزن را به اندازهٔ آرشیو Ubuntu امین بدانید. یک مبدأ شل، یعنی شب‌ها هر چه آن مخزن بگذارد نصب می‌شود. فایل ۵۲ فقط نام‌های امنیت Ubuntu را دارد.

reboot خودکار را روشن نکنید تا «فایل reboot دیگر اعصاب‌خردکن نباشد». روی `docker-1` و `db-1` reboot بی‌خبر یعنی قطعی بی‌خبر. فایل و `checkrestart` اعصاب را خرد می‌کنند تا انسان زمان را انتخاب کند. این عیب نیست.

`checkrestart` را با حساب معمولی بی‌sudo باور نکنید. بعضی فرایندها را نمی‌بیند. با sudo بزنید. خروجی‌اش دستور حذف نیست. سرویسی را که نمی‌شناسید restart نکنید.

## Troubleshooting

| نشانه | کار |
| --- | --- |
| `apt full-upgrade` قفل dpkg می‌گوید | یک نصب دیگر باز است. `ps` را برای `apt` و `dpkg` ببینید. قفل را با دست پاک نکنید مگر فرایند واقعاً مرده باشد |
| `hostnamectl` عوض شده ولی `sudo` کند است و هشدار نام می‌دهد | `/etc/hosts` هنوز نام قدیمی را دارد |
| `set-ntp true` و ساعت همگام نمی‌شود | `systemctl status systemd-timesyncd` و مسیر خروجی UDP/123. فایروال خروجی اگر بسته است باید زمان را اجازه دهد |
| خشک‌وش هنوز `a=resolute` یا `a=resolute-updates` نشان می‌دهد | clear در فایل ۵۲ نیست، یا فایل ۵۲ پسوند و مسیر غلط دارد و خوانده نمی‌شود. نام را با `ls /etc/apt/apt.conf.d` ببینید |
| شب‌ها بستهٔ عادی هم آمده | همان مبدأ اضافی. خشک‌وش را دوباره بخوانید. لاگ مسیر دقیق بسته را می‌گوید |
| فایل reboot نیست ولی `uname -r` از بستهٔ نصب‌شده قدیمی‌تر است | نادر است. `linux-image` نصب‌شده را با `uname -r` مقایسه کنید. اگر فرق داشت، reboot را به تعویق نیندازید |
| `checkrestart` نیست | `debian-goodies` نصب نشده. تا آن موقع فقط فایل `/var/run/reboot-required` را ببینید |
| بعد از reboot دیگر SSH نمی‌آید | رمز را قبل از کلید بسته‌اید، یا UFW را جای دیگری روشن کرده‌اید. کنسول هایپروایزر |

برای دیدن اینکه چه بسته‌ای reboot خواسته:

```bash
cat /var/run/reboot-required.pkgs
```

اگر فایل نیست، دستور خطا می‌دهد و این یعنی نشانه‌ای برای reboot ثبت نشده. آن خطا را با خراب بودن دیسک اشتباه نگیرید.

## Best Practices

- ترتیب را به‌هم نزنید: اول به‌روزرسانی و کاربر و کلید، بعد بستن رمز، بعد فکر به reboot.
- نام میزبان را از جدول آزمایشگاه بردارید و در `/etc/hosts` هم بنویسید.
- `Asia/Tehran` و NTP هر دو. یکی جای دیگری نیست.
- فقط امنیت، خودکار. `-updates` و جیب خود انتشار را به فایل ۵۲ برنگردانید.
- reboot خودکار خاموش. هر صبح فایل reboot و `checkrestart` را ببینید.
- این صفحه را روی هر میزبان تازه تکرار کنید. ابزارهای بعدی این فصل فرض می‌کنند نام، ساعت، و `ops` از قبل درست‌اند.
