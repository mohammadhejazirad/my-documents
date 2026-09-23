---
title: سخت‌سازی SSH
sidebar_position: 2
description: "drop-in برای OpenSSH حدود 10.2 روی Ubuntu 26.04: فقط کلید ed25519، بدون رمز، و معافیت پایش از PerSourcePenalties."
---

# سخت‌سازی SSH

## مقدمه

ورود مدیریتی آزمایشگاه فقط با SSH و فقط با کلید `ed25519` است. روی Ubuntu 26.04 سرویس `ssh.service` است و OpenSSH حدود 10.2. فایل اصلی `/etc/ssh/sshd_config` را بازنویسی نمی‌کنیم. تنظیم سخت در drop-in می‌نشیند: `/etc/ssh/sshd_config.d/10-hardening.conf`.

قبل از هر چیز یک کلید برای `ops` روی میزبان باشد و یک نشست باز را نگه دارید. بعد نحو را با `sshd -t` چک کنید، سرویس را reload کنید، و از یک پنجرهٔ دیگر وارد شوید. اگر نشست دوم بالا نیامد، نشست اول هنوز زنده است و فایل را برمی‌گردانید. این ترتیب قابل حذف نیست.

`PerSourcePenalties` در این نسخه پیش‌فرض روشن است. آن را خاموش نمی‌کنیم. فقط آدرس پایش `10.10.1.40` را در `PerSourcePenaltyExemptList` می‌گذاریم تا بررسی سلامت، خودش را از SSH قفل نکند.

## مفهوم اصلی

`sshd` اولین مقدار دیده‌شده برای هر کلیدواژه را نگه می‌دارد. Include فایل‌های `sshd_config.d` در بستهٔ Ubuntu اول فایل اصلی است، برای همین drop-in بر تنظیم بعدی داخل فایل اصلی غلبه می‌کند، به شرطی که فایل دیگری که از نظر الفبایی زودتر می‌آید همان کلیدواژه را قبلاً ست نکرده باشد. نام `10-hardening.conf` عمدی است. فایلی مثل `00-cloud.conf` اگر `PasswordAuthentication yes` را ست کند، فایل ما دیگر آن را عوض نمی‌کند. بعد از reload خروجی `sshd -T` را باور کنید، نه نیت نویسنده را.

کلید `ed25519` کوتاه است و الگوریتمش همان چیزی است که OpenSSH 10 برای استفادهٔ روزمره هنوز توصیهٔ عملی است. DSA سال‌هاست حذف شده. `ssh-rsa` با امضای SHA-1 الگوریتم میراثی است و آن را برنمی‌گردانیم. `diffie-hellman-group1-sha1` هم همین‌طور. این صفحه خط `Ciphers` و `KexAlgorithms` سفارشی نمی‌نویسد، چون پیش‌فرض OpenSSH 10.2 این‌ها را ندارد و یک فهرست دست‌ساز راحت یک الگوریتم لازم را هم حذف می‌کند یا یک الگوریتم بد را برمی‌گرداند. کاری که می‌کنیم این است که چنین خطی اضافه نکنیم.

`PerSourcePenalties` برای هر منبع، روی شکست احراز، اتصال بدون احراز، و چند شرط دیگر زمان محرومیت جمع می‌کند. پیش‌فرض‌ها را با نوشتن یک خط ناقص عوض نکنید. اگر فقط `PerSourcePenalties authfail:0` بنویسید، ممکن است بقیهٔ کلاس‌های جریمه را هم با تعریف ناقص عوض کنید. ما فقط فهرست معافیت را ست می‌کنیم.

`AllowUsers ops` یعنی هر حساب دیگر، حتی اگر کلید داشته باشد، از SSH رد نمی‌شود. راه اضطراری کنسول هایپروایزر است. روی `app-1` استثنا این است که `deploy` هم باید برای یک اسکریپت ثابت وارد شود. آن استثنا پایین جدا نوشته شده و به معنی رمز یا پوستهٔ آزاد نیست.

## چرا استفاده می‌شود؟

رمز SSH روی سروری که به شبکهٔ مدیریت وصل است دیر یا زود در لاگ شکست می‌خورد، چون اسکنر آن را حدس می‌زند. کلید، حدس‌زدنی نیست اگر خود فایل خصوصی لو نرود. بستن ورود root جلوی این را می‌گیرد که یک کلید اضافه روی حساب همه‌کاره، کل میزبان را بی‌نام بدهد. `MaxAuthTries 3` تلاش هر اتصال را کوتاه می‌کند. جریمهٔ منبع، اتصال بعدی از همان آدرس را کند می‌کند حتی وقتی Fail2ban هنوز نصب نشده.

`ClientAliveInterval` امنیت رمزنگاری نیست. نشست مرده را جمع می‌کند تا کسی که لپ‌تاپ را بسته، تا صبح یک پوستهٔ باز روی سرور نداشته باشد. اگر آن را خیلی کوچک بگذارید، کار طولانی که کلاینت جواب زنده بودن را ندهد قطع می‌شود. مقدار این صفحه سیصد ثانیه است.

## Architecture

```text
لپ‌تاپ ops
    کلید ed25519
        │
        ▼
sshd  سرویس ssh.service
    /etc/ssh/sshd_config
        Include sshd_config.d/*.conf
            10-hardening.conf
                PermitRootLogin no
                PasswordAuthentication no
                KbdInteractiveAuthentication no
                PubkeyAuthentication yes
                AllowUsers ops
                MaxAuthTries 3
                X11Forwarding no
                ClientAliveInterval 300
                PerSourcePenaltyExemptList 10.10.1.40
        │
        ├── mon-1 (10.10.1.40)  از جریمهٔ منبع معاف
        └── بقیهٔ منابع  جریمهٔ پیش‌فرض روشن

app-1 استثنا:
    AllowUsers ops deploy
    authorized_keys کاربر deploy فقط اسکریپت استقرار
```

پایش `mon-1` معاف است چون بررسی SSH اگر چند بار ناکامل باشد نباید دید پایش را سیاه کند. بقیهٔ آزمایشگاه، از جمله لپ‌تاپ شما، معاف نیستند. اگر سه بار کلید اشتباه بزنید ممکن است همان آدرس برای مدتی کوتاه رد شود. کنسول را از قبل باز نگه دارید.

## Installation

بسته از قبل روی Ubuntu Server هست. اگر میزبان خیلی کوچک است و بسته را ندارد:

```bash
sudo apt update
sudo apt install openssh-server
sudo systemctl enable --now ssh
systemctl status ssh --no-pager
ssh -V
```

`ssh -V` روی 26.04 چیزی نزدیک `OpenSSH_10.2` نشان می‌دهد. اگر میزبان هنوز 24.04 است، همین drop-in برای بستن رمز و root درست است، ولی `PerSourcePenalties` آنجا نیست چون OpenSSH 9.6 آن را ندارد. این صفحه برای 26.04 نوشته شده. روی 24.04 خط `PerSourcePenaltyExemptList` را نگذارید اگر `sshd -t` آن را نمی‌شناسد. به‌جایش Fail2ban را جدی‌تر بگیرید.

کلید را روی دستگاه خود مدیر بسازید، نه با یک کلید مشترک تیمی:

```bash
ssh-keygen -t ed25519 -a 64 -f ~/.ssh/id_ed25519 -C "ops@app-1"
```

`-a 64` دور KDF را بالا می‌برد. اگر `ssh-keygen` این پرچم را برای `ed25519` در نسخهٔ کلاینت شما نپذیرفت، بدون `-a` دوباره بسازید و همان را در یادداشت بنویسید. نوع کلید را به RSA یا DSA برنگردانید.

روی سرور، خانه و فایل کلید مجاز را محدود کنید. کلید عمومی را خودتان در فایل بگذارید. اینجا متن کلید نمونه نیست:

```bash
sudo adduser --disabled-password --gecos "" ops
sudo usermod -aG sudo ops
sudo install -d -m 700 -o ops -g ops /home/ops/.ssh
sudo install -m 600 -o ops -g ops /dev/null /home/ops/.ssh/authorized_keys
sudoedit /home/ops/.ssh/authorized_keys
```

یک خط، همان خروجی `id_ed25519.pub`. بعد از این، با همان کلید وارد شوید و نشست را باز نگه دارید. تا وقتی این ورود کار نکرده، فایل سخت‌سازی را فعال نکنید.

## Configuration

فایل `/etc/ssh/sshd_config.d/10-hardening.conf` را با `sudoedit` بسازید:

```text
PermitRootLogin no
PasswordAuthentication no
KbdInteractiveAuthentication no
PubkeyAuthentication yes
AuthenticationMethods publickey
AllowUsers ops
MaxAuthTries 3
X11Forwarding no
ClientAliveInterval 300
ClientAliveCountMax 2
PerSourcePenaltyExemptList 10.10.1.40
```

`KbdInteractiveAuthentication no` ورود تعاملی صفحه‌کلید را هم می‌بندد، از جمله بعضی پرسش‌های PAM که در عمل همان رمز هستند. اگر روزی احراز دومرحله‌ای از راه PAM و صفحه‌کلید خواستید، این خط را باید عمداً بازطراحی کنید، نه اینکه رمز را برگردانید. `UsePAM` را `no` نکنید. بررسی حساب و نشست PAM هنوز به درد می‌خورد. ما فقط روش احراز را به کلید محدود کرده‌ایم.

`ClientAliveCountMax 2` با فاصلهٔ ۳۰۰ ثانیه یعنی نشست بی‌پاسخ تقریباً ده دقیقه بعد قطع می‌شود. کلاینت سالم به پیام زنده بودن جواب می‌دهد. کار طولانی `scp` قطع نمی‌شود فقط به‌خاطر طولانی بودن.

روی `app-1` و روی `docker-1` خط `AllowUsers` فرق دارد، چون خط لولهٔ سرویس `app` با کاربر `deploy` به `app-1` وصل می‌شود و خود `app-1` با همان کاربر به `docker-1` وصل می‌شود. اولین مقدار برنده است، پس این خط را در فایل دیرتر تکرار نکنید. در همان `10-hardening.conf` این میزبان‌ها بنویسید:

```text
AllowUsers ops deploy
```

فقط همین دو میزبان. روی `db-1`، پروکسی، پایش، و GitLab همان `AllowUsers ops` می‌ماند. `deploy` روی `app-1` پوستهٔ `/bin/bash` دارد چون باید یک اسکریپت مشخص اجرا شود، ولی کلیدش در `authorized_keys` به همان اسکریپت محدود است. جزئیات کلید و `from=` در [سناریوی خط لوله](/docs/09-cicd/pipeline-scenario) است. روی میزبانی که `deploy` فقط واحد systemd است، پوسته `/usr/sbin/nologin` است و اصلاً در `AllowUsers` نیست.

معافیت جریمه فقط `10.10.1.40` است. آدرس را با `10.10.0.0/16` عوض نکنید. اگر پایش از آدرس دیگری هم SSH می‌زند، همان آدرس تکی را با ویرگول اضافه کنید، نه کل زیرشبکه. فهرست معافیت ماسک غلط را هم رد می‌کند. `sshd -t` آن خطا را قبل از reload نشان می‌دهد.

چک و اعمال:

```bash
sudo sshd -t
sudo systemctl reload ssh
sudo sshd -T | grep -Ei 'permitrootlogin|passwordauthentication|kbdinteractiveauthentication|pubkeyauthentication|authenticationmethods|allowusers|maxauthtries|x11forwarding|clientalive|persource'
```

خروجی مؤثر باید این مقدارها را داشته باشد. اگر `passwordauthentication yes` دیدید، یک فایل زودتر آن را ست کرده. `ls /etc/ssh/sshd_config.d` را ببینید.

```text
permitrootlogin no
passwordauthentication no
kbdinteractiveauthentication no
pubkeyauthentication yes
authenticationmethods publickey
allowusers ops
maxauthtries 3
x11forwarding no
clientaliveinterval 300
clientalivecountmax 2
persourcepenaltyexemptlist 10.10.1.40
```

`persourcepenalties` را هم در همان خروجی می‌بینید، با عددهای پیش‌فرض مثل `authfail` و `max`. آن خط را کپی نکنید و در فایل خودتان بازنویسی نکنید. بودنش یعنی مکانیزم روشن است.

نام سرویس روی 26.04 این است:

```bash
systemctl status ssh --no-pager
```

`sshd.service` نام این یونیت نیست. اگر آموزشی `systemctl reload sshd` گفت و واحد پیدا نشد، همان `ssh` است.

قبل از بستن پنجرهٔ فعلی: از یک ترمینال دیگر `ssh ops@10.10.1.10` (یا هر میزبانی که همین الان عوض کردید) را بزنید. ورود با کلید باید کامل شود. یک دستور `sudo -v` در نشست جدید بزنید. بعد پنجرهٔ قدیمی را ببندید. اگر نشست جدید شکست، در پنجرهٔ قدیمی فایل drop-in را جابه‌جا کنید، `sudo sshd -t` و `sudo systemctl reload ssh` بزنید، و دلیل را از لاگ بخوانید:

```bash
sudo journalctl -u ssh -n 40 --no-pager
```

## Production Example

`app-1` را سخت می‌کنید در حالی که خط لوله هنوز کلید `deploy` را لازم دارد. ترتیب همان است: اول کلید `ops` و نشست دوم، بعد فایلی که `AllowUsers ops deploy` دارد، بعد reload، بعد از لپ‌تاپ با `ops` وارد شوید، بعد از `docker-1` با کلید `deploy` فقط اسکریپت را امتحان کنید نه یک پوسته:

```bash
ssh -i /home/ghrunner/.ssh/deploy_ed25519 -o IdentitiesOnly=yes deploy@10.10.1.10 /opt/apps/app/bin/deploy.sh
```

بدون شناسه، اسکریپت باید با پیام `refusing` خارج شود نه با یک پوسته. اگر پوسته گرفتید، `authorized_keys` محدودیت command را ندارد و باید قبل از هر کار دیگری اصلاح شود. سناریوی CI همان فایل را نشان می‌دهد.

از `mon-1` یک بررسی عمداً ناقص نباید شما را به‌عنوان `ops` قفل کند، و نباید پایش را هم قفل کند. معافیت فقط مال آدرس پایش است. این را با قطع کردن کلید خودتان آزمایش نکنید مگر کنسول زیر دستتان باشد.

X11 لازم ندارید. اگر کسی `ssh -X` بزند، سرور رد می‌کند. این برای سرور بدون نمایشگر درست است.

## Security Notes

رمز را برای «یک بار عیب‌یابی» برنگردانید. کنسول هایپروایزر همان یک بار است. اگر کنسول ندارید، قبل از این فایل یک کلید دوم روی یک لپ‌تاپ دوم بگذارید.

`AuthorizedKeysFile` پیش‌فرض را به یک مسیر جهان‌نوشتنی عوض نکنید. خانهٔ `ops` باید `755` یا سخت‌تر باشد و `.ssh` باید `700` و `authorized_keys` باید `600` باشد. مالک هر دو `ops` است. اگر مالک root باشد و مجوز اشتباه، ورود کلید بی‌صدا شکست می‌خورد.

کلید خصوصی را در بکاپ جهان‌خوانا، در تیکت، و در لاگ CI نگذارید. چرخش کلید یعنی کلید عمومی تازه در `authorized_keys`، آزمایش نشست جدید، بعد حذف خط قدیمی. حذف خط قدیمی را قبل از آزمایش انجام ندهید.

`PermitRootLogin no` حتی اگر کسی برای root کلید بگذارد جلوی ورود root را می‌گیرد. این را با `sudo` از حساب `ops` عوض نکنید. مدل sudo در [صفحهٔ sudo](/docs/01-linux/sudo) است.

معافیت `10.10.1.40` اعتماد به میزبان پایش است. اگر آن میزبان تصرف شود، جریمهٔ منبع جلوی SSH از آنجا را نمی‌گیرد. فایروال و کلید هنوز هستند. معافیت را به محدودهٔ بزرگ «تا راحت شویم» گسترش ندهید.

## Troubleshooting

| نشانه | کار |
| --- | --- |
| `sshd -t` خطا می‌دهد | reload نکنید. همان خطا مسیر خط را می‌گوید. معمولاً کلیدواژهٔ ناشناخته یا ماسک شبکهٔ غلط در فهرست معافیت است |
| نشست جدید `Permission denied (publickey)` | `AllowUsers`، مجوز `.ssh`، و اینکه کلید درست را فرستاده‌اید. `ssh -v` از کلاینت، و `journalctl -u ssh` روی سرور |
| رمز هنوز قبول می‌شود | `sshd -T` هنوز `passwordauthentication yes` است. یک drop-in زودتر برنده شده |
| بلافاصله بعد از چند اشتباه، اتصال رد می‌شود و لاگ Fail2ban خالی است | `PerSourcePenalties`. اگر منبع `10.10.1.40` است نباید این اتفاق بیفتد. `sshd -T` فهرست معافیت را نشان می‌دهد |
| `systemctl reload ssh` واحد را پیدا نمی‌کند | نام واحد `ssh` است نه `sshd` |
| `deploy` پوستهٔ آزاد گرفته | خط `command=` در `authorized_keys` نیست یا مسیر اسکریپت غلط است |
| X11 هنوز جلو می‌رود | `x11forwarding yes` در فایلی که اول خوانده شده. دوباره `sshd -T` |

اگر هر دو نشست را بسته‌اید و کلید کار نمی‌کند، تنها راه کنسول هایپروایزر است. از آنجا:

```bash
sudo mv /etc/ssh/sshd_config.d/10-hardening.conf /root/10-hardening.conf.bak
sudo sshd -t
sudo systemctl reload ssh
```

بعد دلیل را با آرامش اصلاح کنید. فایل را با عجله با یک نسخه که `PasswordAuthentication yes` دارد عوض نکنید.

## Best Practices

- نشست دوم را واقعاً باز کنید. گفتن اینکه «کنسول داریم» وقتی رمز کنسول را کس دیگری دارد، آزمایش نیست.
- `sshd -T` را بعد از هر تغییر بخوانید. فایل را خواندن کافی نیست.
- برای میزبان معمولی `AllowUsers` را با کاربر سرویس شلوغ نکنید. استثنای `deploy` فقط `app-1` و `docker-1` است و فقط با کلید محدود.
- الگوریتم میراثی را حتی به‌صورت موقت برای یک کلاینت قدیمی برنگردانید. کلاینت را عوض کنید.
- `PerSourcePenalties` را `no` نکنید چون Fail2ban را هم نصب کرده‌اید. این دو هم‌پوشانی دارند و یکی جای دیگری را نمی‌گیرد. Fail2ban در صفحهٔ بعد است.
- بعد از اینکه ورود کلید پایدار شد، [UFW](/docs/10-security/ufw) را روشن کنید. فایروال قبل از آزمایش نشست دوم، ترکیب دو قفل است.
