---
title: DNS
sidebar_position: 14
description: یک زون داخلی example.internal با BIND، named-checkzone، و کلاینت روی آزمایشگاه.
---

# DNS

## مقدمه

هدف ۲۰۷ آزمون ۲۰۲ یعنی BIND را به‌عنوان سرور نام بشناسید، یک زون بسازید، و آن را ناامن به کل اینترنت باز نگذارید. معنی رکوردها در [رکوردهای DNS](/docs/11-networking/dns-records) است و این صفحه همان نام‌ها را در یک زون واقعی آزمایشگاه می‌گذارد: `example.internal`. دامنهٔ عمومی نمونه همچنان `app.example.com` است و اینجا زون عمومی نمی‌سازیم. وصل کردن نام به سرور از بیرون، وقتی دامنهٔ واقعی سازمان وسط باشد، در [اتصال دامنه](/docs/11-networking/domain-binding) است.

سرور نام این تمرین خود `app-1` با آدرس `10.10.1.10` است، فقط برای این که آزمایشگاه میزبان جداگانهٔ DNS در جدول ثابت ندارد. در تولید، نام را روی میزبانی بگذارید که با هر استقرار برنامه عوض نشود.

## مفهوم اصلی

سرور مقتدر (authoritative) جواب نهایی یک زون را از روی فایل خودش می‌دهد. سرور بازگشتی (recursive) جواب را از ریشه به پایین برای کلاینت پیدا می‌کند. یک دیمون می‌تواند هر دو کار را بکند و اگر هر دو را برای کل اینترنت باز بگذارید، هم زونتان را غریبه می‌خواند و هم در حملهٔ بازتاب استفاده می‌شوید. سیاست این صفحه: مقتدر برای `example.internal`، و بازگشتی فقط برای `127.0.0.1` و `10.10.1.0/24`.

رکوردهایی که با فصل شبکه هم‌نام‌اند: A برای نشانی v4، AAAA برای نشانی مستند v6، CNAME برای اسم مستعار، MX برای نامه، TXT برای یک رشتهٔ اثبات مالکیتِ ساختگی. PTR را فقط اگر زون معکوس را هم نگه می‌دارید اضافه کنید. این تمرین زون معکوس را می‌سازد تا `dig -x` بی‌جواب نماند، ولی وزنش کمتر از زون مستقیم است.

شمارهٔ سریال زون باید با هر ویرایش زیاد شود وگرنه سرور ثانویه تغییر را نمی‌گیرد. قالب تاریخ `YYYYMMDDNN` خوانا است. SOA تعیین می‌کند نام اصلی و ایمیل مسئول و زمان‌ها کجایند. ایمیل داخل SOA علامت `@` ندارد؛ نقطه جای آن است.

## چرا استفاده می‌شود؟

`/etc/hosts` روی سه میزبان خیلی زود از هم فاصله می‌گیرد. زون داخلی یک منبع برای نام `db-1` و `gitlab` است. برنامه نباید آدرس را سخت‌کد کند اگر فردا VM را عوض می‌کنید.

دلیل دوم آزمون این است که `named-checkzone` و `named-checkconf` را قبل از reload بزنید. BIND با فایل خراب بالا نمی‌آید و آن وقت حتی نام قبلی هم می‌خوابد. این همان عادت `nginx -t` است، برای نام.

## Architecture

```text
کلاینت 10.10.1.20
    │  resolvectl / dig
    ▼
10.10.1.10:53   named
    ├─ زون example.internal          مقتدر
    ├─ زون معکوس 1.10.10.in-addr.arpa
    └─ بازگشتی فقط از 10.10.1.0/24 و localhost

فایل‌ها
    /etc/bind/named.conf.options
    /etc/bind/named.conf.local
    /etc/bind/zones/db.example.internal
    /etc/bind/zones/db.10.10.1
```

سرویس بستهٔ Ubuntu و Debian اسم واحدش `named` است. کاربر اجرایی `bind` است. AppArmor روی Ubuntu اجازهٔ خواندن زیر `/etc/bind` را می‌دهد. زون را جای دیگری نگذارید وگرنه سرویس با خطای مجوز بالا می‌آید در حالی که فایل از پوستهٔ root خوانا است.

`listen-on` را به آدرس آزمایشگاه و حلقهٔ محلی محدود کنید. گوش دادن روی همهٔ رابط‌ها فقط وقتی درست است که فایروال جلویش ایستاده باشد. هر دو با هم بهترند، نه به‌جای هم.

## Installation

```bash
sudo apt update
sudo apt install bind9 bind9-dnsutils
sudo systemctl enable --now named
systemctl is-active named
named -v
```

نسخه را از خروجی بخوانید. شاخهٔ ۹ روی این توزیع‌ها انتظار معقول است. عدد patch را این صفحه ثابت نمی‌کند.

اگر پورت ۵۳ را چیز دیگری گرفته، `ss` نشان می‌دهد. systemd-resolved اگر روی ۵۳ واقعی گوش بدهد با BIND دعوا می‌کند. روی Ubuntu، resolved معمولاً فقط روی `127.0.0.53` است و پورت ۵۳ روی `10.10.1.10` آزاد می‌ماند. اثبات:

```bash
sudo ss -ulnp 'sport = :53'
sudo ss -ltnp 'sport = :53'
```

باید `named` را روی `10.10.1.10` و `127.0.0.1` ببینید، بعد از کانفیگ پایین. قبل از کانفیگ ممکن است فقط روی localhost باشد، بسته به گزینهٔ پیش‌فرض بسته.

## Configuration

فایل گزینه. بازنویسی کامل `named.conf.options` پیش‌فرض بسته را دور می‌ریزد؛ اگر فایل فعلی کلیدهای محلی دارد، اول کپی بگیرید.

```bash
sudo cp -a /etc/bind/named.conf.options /etc/bind/named.conf.options.bak
sudo tee /etc/bind/named.conf.options >/dev/null <<'EOF'
options {
    directory "/var/cache/bind";
    listen-on port 53 { 127.0.0.1; 10.10.1.10; };
    listen-on-v6 { none; };
    allow-query { localhost; 10.10.1.0/24; };
    recursion yes;
    allow-recursion { localhost; 10.10.1.0/24; };
    allow-transfer { none; };
    dnssec-validation auto;
};
EOF
```

اگر آزمایشگاه به اینترنت راه ندارد، `dnssec-validation auto` پرسش نام‌های عمومی را شکست می‌دهد. زون خودتان هنوز جواب می‌گیرد. در آن شبکه مقدار را `no` بگذارید و بدانید اعتبارسنجی DNSSEC را خاموش کرده‌اید.

زون‌ها را در `named.conf.local` اعلام کنید. واژهٔ `primary` در BIND تازه همان `master` آزمون است. هر دو پذیرفته می‌شوند. در فایل جدید `primary` بنویسید و در آزمون کلمهٔ `master` را هم بشناسید.

```bash
sudo mkdir -p /etc/bind/zones
sudo tee /etc/bind/named.conf.local >/dev/null <<'EOF'
zone "example.internal" {
    type primary;
    file "/etc/bind/zones/db.example.internal";
};

zone "1.10.10.in-addr.arpa" {
    type primary;
    file "/etc/bind/zones/db.10.10.1";
};
EOF
```

فایل زون مستقیم. سریال را با تاریخ امروز عوض کنید. نشانی v6 از پیشوند مستند `2001:db8::/32` است و روی اینترنت مسیریابی نمی‌شود.

```bash
sudo tee /etc/bind/zones/db.example.internal >/dev/null <<'EOF'
$TTL 300
@   IN SOA ns1.example.internal. hostmaster.example.internal. (
        2026092301
        3600
        600
        604800
        300 )
    IN NS  ns1.example.internal.
ns1     IN A    10.10.1.10
app-1   IN A    10.10.1.10
db-1    IN A    10.10.1.20
docker-1 IN A   10.10.1.30
mon-1   IN A    10.10.1.40
gitlab  IN A    10.10.1.50
mirror  IN A    10.10.1.60
proxy   IN A    10.10.1.5
mail    IN A    10.10.1.5
www     IN CNAME app-1
@       IN MX 10 mail.example.internal.
@       IN TXT "lab-verification=example-internal"
app-1   IN AAAA 2001:db8::10
EOF
```

MX به یک نام اشاره می‌کند و آن نام باید A داشته باشد. اینجا `mail` همان `10.10.1.5` است، یعنی میزبان پروکسی فقط به‌عنوان نام نامهٔ داخلی معرفی شده. این خط به‌تنهایی سرور نامه نمی‌سازد. ساخت رله در [پست](/docs/02-lpic/lpic2-202-mail) است و آنجا هم نباید باز باشد.

زون معکوس کوتاه:

```bash
sudo tee /etc/bind/zones/db.10.10.1 >/dev/null <<'EOF'
$TTL 300
@   IN SOA ns1.example.internal. hostmaster.example.internal. (
        2026092301 3600 600 604800 300 )
    IN NS ns1.example.internal.
10  IN PTR app-1.example.internal.
20  IN PTR db-1.example.internal.
5   IN PTR proxy.example.internal.
EOF
```

بررسی قبل از reload:

```bash
sudo named-checkconf
sudo named-checkzone example.internal /etc/bind/zones/db.example.internal
sudo named-checkzone 1.10.10.in-addr.arpa /etc/bind/zones/db.10.10.1
sudo systemctl reload named
```

`named-checkzone` باید `OK` بدهد. اگر `loaded serial` را چاپ کرد، فایل خوانده شده است. reload بدون checkconf یعنی ریسک خوابیدن دیمون.

## Production Example

کلاینت `app-1` باید اول از خود BIND بپرسد. روی Ubuntu این کار با resolved است نه با ویرایش مستقیم `resolv.conf`. یک راه آزمون‌شده برای میزبان systemd-resolved این است که DNS رابط را صریح کنید. اگر Netplan رابط را مدیریت می‌کند، ماندگاری باید در Netplan باشد و این فرمان زنده تا reboot دوام نیاورد.

```bash
resolvectl dns ens18 10.10.1.10
resolvectl domain ens18 example.internal
resolvectl query app-1.example.internal
dig @10.10.1.10 db-1.example.internal A +short
dig @10.10.1.10 example.internal MX +short
dig @10.10.1.10 -x 10.10.1.10 +short
```

خروجی مورد انتظار:

```text
10.10.1.10
10 mail.example.internal.
app-1.example.internal.
```

`dig` اول باید `10.10.1.10` برای app از راه پرسش A مستقیم هم بدهد؛ خط بالا مربوط به `db-1` است که باید `10.10.1.20` باشد. اگر `db-1` مقدار `10.10.1.20` نداد، فایل زون یا کش کلاینت کهنه است. `resolvectl flush-caches` را بزنید و دوباره `dig @10.10.1.10` بگیرید تا کلاینت را از سرور جدا کنید.

از میزبان دیگر آزمایشگاه، مثلاً `db-1`، همان `dig @10.10.1.10 app-1.example.internal` باید جواب بدهد. اگر timeout شد، یا `listen-on` آدرس غلط دارد یا فایروال UDP و TCP پورت ۵۳ را از `10.10.1.0/24` بسته است. TCP را هم باز کنید؛ انتقال بزرگ و بعضی پاسخ‌ها از UDP به TCP می‌روند.

پرسش از بیرون این زیرشبکه باید جواب نگیرد. از میزبانی که آدرسش در `allow-query` نیست:

```bash
dig @10.10.1.10 example.internal SOA +time=2 +tries=1
```

انتظار: رد شدن پرسش (`REFUSED`) نه فهرست رکوردها. اگر `NOERROR` و رکورد آمد، `allow-query` بیش از حد باز است.

## Security Notes

بستن انتقال زون، همان گزینه‌ای که در فایل options گذاشتیم، جلوی AXFR ناشناس را می‌گیرد. بدون آن، هر کس می‌تواند نقشهٔ نام داخلی را یکجا ببرد. آزمون انتقال زون را بلد می‌خواهد؛ سیاست تولید این آزمایشگاه این است که ثانویه نداریم پس انتقال را می‌بندیم. اگر ثانویه آمد، به‌جای باز کردن برای همه، فقط آدرس همان ثانویه را بگذارید.

بازگشتی باز را با `recursion yes` بدون `allow-recursion` نسازید. این همان کلاس اشتباهی است که در نامه open relay نام دارد: منبع شما برای تقویت ترافیک دیگران.

نسخهٔ BIND را در پاسخ chaos به جهان نشان ندهید اگر آزمون `version none` را آورد. یک خط در options کافی است: `version "none";`. این پنهان‌کاری وصله را عوض نمی‌کند. بسته را از مخزن به‌روز نگه دارید.

فایل زون را از مسیر وب قابل‌خواندن نگذارید. زیر `/etc/bind` بماند و مالک root باشد. `named` فقط خواندن می‌خواهد چون به‌روزرسانی پویا نداریم. اگر روزی `allow-update` گذاشتید، فایل باید برای کاربر `bind` نوشتنی باشد و ACL به‌روزرسانی باید به هیچ‌کسِ عمومی نخورد. به‌روزرسانی پویای باز یعنی غریبه رکورد A شما را عوض می‌کند.

## Troubleshooting

علامت: `named-checkzone` خطای near line می‌دهد. پرانتز SOA بسته نشده، یا فاصلهٔ تب در جایی که نقطهٔ انتهای FQDN جا مانده. نامی که در فایل زون نقطهٔ آخر ندارد، نسبی به نام زون است و این همان چیزی است که می‌خواهیم. نامی که باید مطلق باشد و نقطه ندارد، به `example.internal` چسبانده می‌شود و رکورد عجیب ساخته می‌شود. MX را با `named-checkzone -i full` سخت‌گیرانه‌تر هم می‌شود دید.

علامت: سرویس reload می‌شود و بلافاصله failed است.

```bash
sudo journalctl -u named -n 40 --no-pager
sudo named-checkconf
```

خط AppArmor یا permission یعنی مسیر فایل خارج از `/etc/bind` است. خط address in use یعنی پورت ۵۳ اشغال است. `ss` را دوباره بگیرید.

علامت: `dig` از خود سرور جواب می‌دهد و `resolvectl query` نه. کلاینت هنوز به DNS دیگری می‌رود یا nsswitch اول از hosts غلط می‌خواند. `resolvectl status ens18` سرور نام مؤثر را نشان می‌دهد. ویرایش `/etc/resolv.conf` روی Ubuntu ماندگار نیست؛ در [شبکهٔ ۱۰۲](/docs/02-lpic/lpic1-102-networking) آمده است.

علامت: تغییر زون دیده نمی‌شود. سریال را زیاد نکرده‌اید و یک ثانویهٔ فرضی کهنه مانده، یا فقط کلاینت کش دارد. روی سرور مقتدر تنها، `dig @127.0.0.1` بدون کش resolved حقیقت فایل را می‌گوید. اگر همین هم کهنه است، reload واقعاً انجام نشده.

## Best Practices

- زون را قبل از reload با `named-checkzone` و کل کانفیگ را با `named-checkconf` بسنجید.
- بازگشتی و انتقال را به آزمایشگاه محدود کنید. پیش‌فرض «باز برای همه» ممنوع است.
- رکورد را با فصل DNS یکی نگه دارید: A و AAAA و CNAME و MX و TXT همان معنی را دارند.
- فقط از نام `example.internal` و پیشوند `2001:db8::` استفاده کنید.
- سریال را با هر ویرایش بالا ببرید، حتی وقتی ثانویه ندارید، تا عادت تولید بماند.
- BIND را روی میزبان برنامه فقط برای آزمایشگاه بپذیرید. در تولید، نام را از چرخهٔ استقرار برنامه جدا کنید.

## تمرین

سناریو: برنامه‌نویس می‌گوید `db-1.example.internal` از روی `app-1` به `10.10.1.20` نمی‌رسد. شما حق ندارید آدرس را در `/etc/hosts` برای همیشه سخت کنید. باید از زون جواب بگیرید.

```bash
dig @127.0.0.1 db-1.example.internal A +norecurse
dig @127.0.0.1 example.internal MX +short
sudo named-checkzone example.internal /etc/bind/zones/db.example.internal
systemctl is-active named
```

سؤال‌ها:

1. فرق `primary` در فایل با کلمهٔ `master` در آزمون چیست؟
2. چرا `allow-recursion` را به `10.10.1.0/24` محدود کردیم؟
3. اگر MX به `mail.example.internal` اشاره کند و رکورد A آن نام نباشد چه می‌شود؟

## پاسخ تمرین

اگر زون این صفحه بار شده باشد، `dig` اول باید در بخش جواب `10.10.1.20` نشان دهد و وضعیت `NOERROR`. MX باید `10 mail.example.internal.` باشد. checkzone باید `OK` بدهد و واحد `active` باشد.

اگر جواب خالی است، فایل زون را با بخش کانفیگ مقایسه کنید، سریال را یکی بالا ببرید، checkzone را دوباره بزنید و `sudo systemctl reload named` کنید. سپس همان dig را تکرار کنید. افزودن به `/etc/hosts` این تمرین را قبول نمی‌کند، چون پرسش `@127.0.0.1` از BIND می‌پرسد نه از فایل میزبان.

1. در BIND فعلی `primary` و `master` یک نقش‌اند: این سرور منبع زون است. فایل تازه را با `primary` بنویسید. سؤال قدیمی کلمهٔ `master` را می‌آورد و معنی‌اش سرور اصلی است نه یک دستور جدا.
2. تا میزبان بیرون آزمایشگاه از این سرور به‌عنوان حل‌کنندهٔ باز استفاده نکند. مقتدر بودن برای زون خودمان با حل‌کنندهٔ عمومی بودن فرق دارد. دومی منبع حملهٔ بازتاب است.
3. نامه به آن دامنه مقصد نهایی ندارد یا به نامی می‌رسد که حل نمی‌شود. MX به‌تنهایی کافی نیست؛ نام سمت راستش باید به آدرس برسد. در این زون رکورد A برای `mail` همان نقش را دارد.
