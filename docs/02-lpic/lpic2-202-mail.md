---
title: پست
sidebar_position: 15
description: Postfix فقط به‌صورت null client که نامهٔ سیستم را به یک relay داخلی می‌سپارد.
---

# پست

## مقدمه

هدف ۲۱۱ آزمون ۲۰۲ و هدف ۱۰۸.۳ آزمون ۱۰۲ هر دو نامه هستند، با عمق متفاوت. ۱۰۲ از شما alias و forward و اسم MTA را می‌خواهد. ۲۰۲ تحویل نامه را می‌خواهد. این صفحه فقط یک null client می‌سازد: Postfix روی `app-1` نامهٔ محلی سیستم را به یک relay داخلی می‌فرستد و خودش صندوق کاربران اینترنت را نگه نمی‌دارد. سرور میل کامل، با دریافت از هر جای جهان، اینجا ساخته نمی‌شود. open relay صریحاً به‌عنوان خطا نشان داده می‌شود، نه به‌عنوان یک حالت قابل قبول آزمایش.

نام‌ها با زون [DNS](/docs/02-lpic/lpic2-202-dns) یکی‌اند. MX دامنهٔ `example.internal` به `mail.example.internal` است و آن نام در زون آزمایشگاه به `10.10.1.5` اشاره می‌کند. اگر سازمان شما relay دیگری دارد، همان را بگذارید. `10.10.1.5` را فقط وقتی سرور SMTP داخلی بدانید که واقعاً هست.

## مفهوم اصلی

MTA نامه را بین میزبان‌ها جابه‌جا می‌کند. MDA آن را در صندوق می‌گذارد. MUA برنامهٔ انسان است. Postfix، Exim و Sendmail هر سه MTA هستند. آزمون اسم هر سه را می‌شناسد. روی Ubuntu و Debian بستهٔ پیش‌فرض عملیاتی این صفحه Postfix است، چون پیکربندی null client آن کوتاه و قابل آزمون است.

null client یعنی این میزبان مقصد نهایی هیچ دامنه‌ای نیست. نامه را یا به relay می‌دهد یا اصلاً قبول نمی‌کند. `inet_interfaces = loopback-only` یعنی از شبکهٔ بیرونی روی پورت ۲۵ گوش نمی‌دهد. `mydestination` خالی یعنی دامنهٔ محلی را مال خودش نمی‌داند. `local_transport` که تحویل محلی را خطا کند، جلوی افتادن نامه در صندوق نیمه‌کاره را می‌گیرد.

MX رکوردی است که می‌گوید برای یک دامنه نامه را به کدام نام بفرستند، با عدد اولویت. عدد کوچک‌تر اول امتحان می‌شود. MX به آدرس IP مستقیم اشاره نمی‌کند؛ به یک نام اشاره می‌کند که خودش A یا AAAA دارد. خود null client لازم نیست MX باشد. MX مال میزبانی است که نامه را می‌پذیرد.

open relay یعنی سرور نامهٔ غریبه‌ای را که نه فرستندهٔ مجاز است و نه گیرنده مال دامنهٔ شماست، بپذیرد و به اینترنت بفرستد. این خطا است. عاقبتش فهرست سیاه و سوءاستفاده از آدرس شماست. محدودیت `mynetworks` و `smtpd_relay_restrictions` همان چیزی است که این خطا را باز یا بسته می‌کند.

## چرا استفاده می‌شود؟

cron، شکست اسکریپت، و `aide` اگر نامه را به ریشه بفرستند و MTA نباشد، خروجی یا گم می‌شود یا در صف محلی بدون نظارت می‌ماند. یک null client این نامه را به جایی می‌برد که انسان واقعاً می‌خواند. این با «داشتن ایمیل شرکت» فرق دارد.

اپراتور باید MX را بخواند تا بفهمد چرا نامه به `example.internal` از روی لپ‌تاپش به جای غلط می‌رود. ساختن سرور کامل برای این فهم لازم نیست و اگر بد ساخته شود خطرناک‌تر از نبودن نامه است.

## Architecture

```text
برنامه یا cron روی app-1
    │  نامه به root یا ops
    ▼
Postfix فقط روی 127.0.0.1:25
    │  relayhost = [mail.example.internal]
    ▼
relay داخلی (در زون آزمایشگاه 10.10.1.5)
    │
    ▼
صندوق واقعی انسان، خارج از این صفحه

app-1 این کارها را نمی‌کند
    شنیدن روی 0.0.0.0:25
    پذیرفتن گیرندهٔ دامنهٔ غریبه از میزبان غریبه
    نگهداری mailbox کاربران
```

کروشه‌ دور نام relay در Postfix یعنی MX آن نام را دوباره جستجو نکن و خود این نام را به A حل کن. برای یک میزبان مشخص داخلی این همان چیزی است که می‌خواهیم، تا یک MX اشتباه حلقه نسازد.

`/etc/aliases` نام محلی را به آدرس دیگر نگاشت می‌کند. بعد از ویرایش باید `newaliases` خورد تا پایگاه `aliases.db` تازه شود. `~/.forward` برای یک کاربر است و آزمون ۱۰۲ آن را جدا می‌پرسد. روی null client که تحویل محلی خاموش است، forward خانگی به صندوق محلی نمی‌رسد؛ alias سیستمی که به آدرس دامنهٔ relay اشاره کند مسیر درست است.

## Installation

```bash
sudo apt update
sudo debconf-set-selections <<'EOF'
postfix postfix/mailname string app-1.example.internal
postfix postfix/main_mailer_type string Satellite system
EOF
sudo apt install postfix mailutils swaks
sudo systemctl enable --now postfix
systemctl is-active postfix
```

اگر بسته قبلاً با نوع «Internet site» نصب شده، debconf به‌تنهایی فایل را عوض نمی‌کند. کانفیگ پایین را صریح بنویسید. `mailutils` فرمان `mail` را می‌آورد. `swaks` ابزار آزمایش SMTP است و اگر مخزن در دسترس نبود، نبودنش صفحه را باطل نمی‌کند؛ همان `mail` و `mailq` کافی است.

`postconf` مقدار مؤثر را می‌گوید، از جمله پیش‌فرض‌هایی که در فایل نیستند.

```bash
postconf mail_version
```

## Configuration

فایل اصلی را جایگزین سیاست null client کنید. یک نسخه از فایل بسته‌شده را نگه دارید.

```bash
sudo cp -a /etc/postfix/main.cf /etc/postfix/main.cf.dist.bak
sudo tee /etc/postfix/main.cf >/dev/null <<'EOF'
myhostname = app-1.example.internal
myorigin = example.internal
relayhost = [mail.example.internal]
inet_interfaces = loopback-only
mydestination =
local_transport = error: local delivery disabled
mynetworks = 127.0.0.0/8 [::1]/128
smtpd_relay_restrictions = permit_mynetworks, reject_unauth_destination
EOF
sudo postfix check
sudo systemctl reload postfix
```

`postfix check` نحو را می‌سنجد. سپس مقدار مؤثر:

```bash
postconf -n
sudo ss -lnt | awk '/:25/'
```

باید فقط `127.0.0.1:25` و شاید `::1:25` را ببینید، نه `0.0.0.0:25`.

alias ریشه به یک آدرس که relay قبولش دارد. آدرس را با صندوق واقعی تیم عوض کنید؛ نمونهٔ زیر فقط داخل دامنهٔ آزمایشگاه معنی دارد.

```bash
echo 'root: ops@example.internal' | sudo tee -a /etc/aliases
sudo newaliases
```

خط را دو بار الحاق نکنید. `grep '^root:' /etc/aliases` باید یک خط باشد.

این کانفیگ خطا است. آن را در فایل نگذارید. فقط بشناسید تا اگر در سروری دیدید همان روز برش گردانید.

```text
inet_interfaces = all
mynetworks = 0.0.0.0/0 [::]/0
smtpd_relay_restrictions = permit
```

ترکیب بالا از هر مبدأ نامه برای هر مقصدی می‌پذیرد. این open relay است. `permit` تنها در محدودیت relay یعنی بقیهٔ شرط‌ها از جمله رد مقصد نامجاز اصلاً دیده نمی‌شوند. درستش همان دو خطی است که در فایل اصلی صفحه آمد: فقط شبکه‌های خودی، و بعد رد مقصدی که مال شما نیست و relay هم نیست.

آزمون ممکن است `smtpd_recipient_restrictions` را هم نام ببرد. در Postfix تازه، محدودیت relay برای سؤال «آیا این نامه را به جای دیگر بفرستم» همان `smtpd_relay_restrictions` است. هر دو را در `postconf -n` نگاه کنید اگر سرور قدیمی‌تر بود.

## Production Example

نامهٔ آزمایشی از خود میزبان، بدون باز کردن پورت برای شبکه. اگر relay واقعاً در دسترس نباشد، نامه در صف می‌ماند و این خودش نتیجهٔ قابل مشاهده است، نه شکست دستور.

```bash
echo "lab disk watch from app-1" | mail -s "lpic mail test" ops@example.internal
mailq
```

صف خالی یعنی relay نامه را پذیرفته یا هنوز فرصت نمایش صف نشده. صف با شناسه و نام `mail.example.internal` یعنی هنوز تحویل نشده. چند دقیقه بعد دوباره `mailq` بگیرید.

اگر `swaks` نصب است، گفتگو را خودتان می‌بینید:

```bash
swaks --to ops@example.internal --from root@app-1.example.internal --server 127.0.0.1 --header "Subject: swaks lab"
```

خروجی سالم یک کد `250` از Postfix محلی است. این فقط ثابت می‌کند null client نامه را گرفته. رسیدن به صندوق انسان را لاگ relay ثابت می‌کند، نه این دستور.

لاگ:

```bash
sudo journalctl -u postfix -n 30 --no-pager
```

دنبال `status=sent` یا `status=deferred` بگردید. deferred یعنی بعداً دوباره تلاش می‌کند. اگر پیام گفت relay اتصال را رد کرده، مشکل سمت `10.10.1.5` است نه سمت باز کردن Postfix به جهان. راه‌حل، باز کردن `mynetworks` نیست.

خواندن MX، تا مقصد دامنه را با خیال راحت اشتباه نگیرید:

```bash
dig @10.10.1.10 example.internal MX +short
dig @10.10.1.10 mail.example.internal A +short
```

اگر زون صفحهٔ DNS بار شده باشد، اولویت ۱۰ و سپس `10.10.1.5` را می‌بینید. نبودن A برای نام MX یعنی زنجیره ناقص است، حتی اگر Postfix محلی سالم باشد.

`~/.forward` را فقط وقتی تمرین کنید که تحویل محلی روشن باشد. روی این null client عمداً خاموش است. برای آزمون، بدانید یک خط آدرس در آن فایل نامهٔ همان کاربر را به جای دیگر می‌فرستد و `chown` فایل باید مال خود کاربر باشد وگرنه Postfix نادیده‌اش می‌گیرد.

## Security Notes

پورت ۲۵ را در فایروال برای این میزبان باز نکنید. چیزی نباید از شبکه به آن وصل شود. اثبات منفی:

```bash
sudo ss -lnt | awk '/:25/'
```

اگر `0.0.0.0:25` ظاهر شد، `inet_interfaces` اعمال نشده یا سرویس دیگری مثل Exim هنوز نصب است. هر دو MTA با هم صف را دو تکه‌ای می‌کنند. یکی را purge نکنید تا `ss` و `dpkg -l` را دیده باشید؛ بعد سرویس اضافه را `disable` کنید.

`mynetworks` را برای «نامه از لپ‌تاپ من هم برود» به کل `10.10.1.0/24` گسترش ندهید مگر هر میزبان آن زیرشبکه قابل اعتماد باشد و باز هم `reject_unauth_destination` سر جایش بماند. لپ‌تاپ باید به relay رسمی سازمان حرف بزند، نه به هر سرور برنامه‌ای که Postfix تمرینی دارد.

بدنهٔ نامهٔ cron اغلب مسیر و نام میزبان و گاهی خطای برنامه را دارد. گیرنده را صندوق شخصی عمومی نکنید. `ops@example.internal` باید صندوق نقش باشد.

دستور `sendmail` روی این سیستم اغلب پوششی به Postfix است. آزمون «لایهٔ سازگاری sendmail» را همین می‌داند. `dpkg -S $(command -v sendmail)` باید به بستهٔ postfix برسد، نه به یک MTA دوم.

## Troubleshooting

علامت: `mail` می‌گوید فرمان نیست. بستهٔ `mailutils` یا `bsd-mailx` نصب نیست. یکی کافی است. هر دو را با هم نصب نکنید اگر جایگزین فرمان `mail` تعارض داد.

علامت: نامه فوری برمی‌گردد با `local delivery disabled`. گیرنده را دامنهٔ محلی فرض کرده‌اید، مثلاً `ops` بدون `@example.internal`. null client صندوق محلی ندارد. آدرس را کامل کنید یا alias ریشه را به آدرس کامل بدهید.

علامت: صف دراز شده و `mailq` ده‌ها نامه نشان می‌دهد.

```bash
mailq
postconf relayhost inet_interfaces mynetworks
```

اگر relayhost خالی است، کسی فایل را به حالت اینترنتی برگردانده. کانفیگ این صفحه را برگردانید و `sudo postfix flush` را فقط بعد از سالم شدن مقصد بزنید وگرنه تلاش بی‌فایده را سریع‌تر می‌کنید. حذف یک نامهٔ گیرکرده: `sudo postsuper -d شناسه`. حذف همهٔ صف تمرین: `sudo postsuper -d ALL` فقط وقتی می‌دانید نامهٔ تولیدی داخلش نیست.

علامت: `status=bounced` با `Relay access denied`. relay شما را به‌عنوان کلاینت مجاز نمی‌شناسد. این را سمت relay با سیاست همان سازمان حل کنید. سمت `app-1` با باز کردن relay به روی جهان حل نمی‌شود.

علامت: MX به میزبان دیگری اشاره می‌کند و نامهٔ آزمون شما به `10.10.1.5` می‌رود چون کروشه گذاشته‌اید. این رفتار `relayhost` است نه خرابی DNS. کروشه را برندارید مگر عمداً می‌خواهید MX آن نام استفاده شود. برای null client، مقصد مشخص بهتر از MX است.

## Best Practices

- فقط null client. شنود روی حلقهٔ محلی، مقصد خالی، تحویل محلی خاموش.
- open relay را با دیدن `mynetworks` خیلی باز و `permit` تنها تشخیص دهید و همان روز ببندید.
- MX را با A نام مقصدش با هم بخوانید. یکی بدون دیگری زنجیره نیست.
- یک MTA. Postfix و Exim را همزمان فعال نکنید.
- alias را بعد از ویرایش با `newaliases` به پایگاه تبدیل کنید.
- نامهٔ سیستم را به صندوق نقش بفرستید و پورت ۲۵ را از شبکه بسته نگه دارید.

## تمرین

سناریو: اسکریپت دیسک روی `app-1` شکست خورده و کسی نامه را ندیده. باید ثابت کنید Postfix فقط محلی گوش می‌دهد، یک نامهٔ آزمایشی به صف یا به relay می‌رود، و کانفیگ فعلی open relay نیست.

```bash
postconf -n inet_interfaces mynetworks smtpd_relay_restrictions mydestination relayhost
sudo ss -lnt | awk '/:25/'
echo "queue check $(date -Is)" | mail -s "lpic queue check" ops@example.internal
mailq
```

سؤال‌ها:

1. کدام ترکیب، open relay است؟
2. null client چرا نباید MX دامنه باشد؟
3. `newaliases` چه چیزی را تازه می‌کند؟

## پاسخ تمرین

`inet_interfaces` باید `loopback-only` باشد و `ss` نباید `0.0.0.0:25` نشان دهد. `mynetworks` فقط حلقهٔ محلی است. `smtpd_relay_restrictions` باید `permit_mynetworks` و بعد `reject_unauth_destination` باشد، نه `permit` تنها. `mydestination` خالی است. `relayhost` نام داخل کروشه است.

`mailq` یا خالی است (تحویل سریع) یا یک نامه با گیرندهٔ `ops@example.internal` نشان می‌دهد. اگر فرمان `mail` نبود، `sudo apt install mailutils` و تکرار فقط همان خط نامه. اگر bounce فوری دربارهٔ تحویل محلی آمد، آدرس را بدون دامنه نوشته‌اید.

1. `inet_interfaces = all` به‌همراه `mynetworks` برابر کل آدرس‌ها و `smtpd_relay_restrictions = permit`. هر کدام به‌تنهایی هم خطرناک است؛ این ترکیب کلاسیک رلهٔ باز است.
2. چون قرار نیست نامهٔ دامنه را بپذیرد. MX اعلام می‌کند «نامهٔ این دامنه را به من بده». null client فقط نامه را بیرون می‌فرستد. اعلام کردنش به‌عنوان MX یعنی فرستنده‌های دیگر به میزبانی می‌زنند که روی شبکه اصلاً پورت ۲۵ باز نکرده، یا اگر باز کند دیگر null client نیست.
3. پایگاه دودویی alias را از روی `/etc/aliases`. تا وقتی زده نشود Postfix هنوز نگاشت قدیمی را دارد، حتی اگر فایل متن را ذخیره کرده باشید.
