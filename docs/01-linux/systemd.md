---
title: "معماری systemd"
sidebar_position: 10
description: "واحد، تارگت، وابستگی، WantedBy، نوع simple و notify و forking، و فرق /etc با /usr/lib."
---

# معماری systemd

## مقدمه

systemd فرآیند شمارهٔ ۱ است. بوت یعنی فعال کردن یک تارگت، و تارگت یعنی مجموعه‌ای از واحدها با ترتیب و وابستگی. تا این مدل روشن نباشد، `systemctl restart` فقط یک ورد است و وقتی سرویس بالا نمی‌آید نمی‌دانید فایل کدام مسیر واقعاً اجرا شده. دستورهای روزمرهٔ روشن و خاموش کردن در [مدیریت سرویس](/docs/01-linux/service-management) است. خواندن لاگ هر واحد در [journalctl](/docs/01-linux/journalctl) است. این صفحه معماری است تا آن دو صفحه را با حدس اجرا نکنید.

نام واحد سرویس SSH روی Ubuntu و Debian `ssh.service` است و اغلب یک `ssh.socket` جلوی آن است. روی توزیع‌های خانوادهٔ Red Hat نام `sshd.service` رایج است. دستور آن خانواده را این‌جا کپی نکنید. نسخهٔ مرجع Ubuntu 26.04 است و systemd همانی است که بستهٔ سیستم گذاشته. نسخه را با `systemctl --version` از روی سرور بخوانید نه از حافظهٔ این صفحه.

## مفهوم اصلی

واحد (unit) کوچک‌ترین شیئی است که systemd می‌شناسد. نوع را پسوند می‌گوید: `.service` فرآیند بلندمدت، `.socket` سوکت شنود، `.timer` زمان‌بندی، `.mount` نقطهٔ سوار شدن، `.target` نقطهٔ گروه‌بندی. فایل واحد متن است با بخش‌هایی مثل `[Unit]` و `[Service]` و `[Install]`.

تارگت (target) سرویس نیست و فرآیندی اجرا نمی‌کند. `multi-user.target` یعنی حالت چندکاربرهٔ سرور بدون الزام میز گرافیکی. `graphical.target` برای سرور این دانشنامه هدف نیست. بوت پیش‌فرض را `systemctl get-default` نشان می‌دهد و روی Ubuntu Server باید `multi-user.target` باشد.

وابستگی با ترتیب فرق دارد. `After=network-online.target` فقط می‌گوید اگر هر دو فعال می‌شوند، این یکی دیرتر بیاید. به‌تنهایی شبکه را بالا نمی‌آورد. `Wants=network-online.target` وابستگی ضعیف است: systemd سعی می‌کند آن را هم فعال کند ولی اگر شکست، این واحد لزوماً شکست‌خورده حساب نمی‌شود. `Requires=` قوی است: اگر وابستگی شکست بخورد یا از کار بیفتد، این واحد هم می‌خوابد. برای یک برنامهٔ وب، جفت `Wants=` و `After=` روی `network-online.target` یعنی «صبر کن شبکه آماده شود، ولی سیاست شکست را خود برنامه با Restart مدیریت کند». `Requires=network-online.target` بوت را به سلامت شبکه گره می‌زند. در سروری که باید حتی با DNS خراب به SSH برسد، این گره اغلب اشتباه است.

`[Install]` موقع `enable` مصرف می‌شود نه موقع `start`. `WantedBy=multi-user.target` می‌گوید وقتی این واحد را enable می‌کنیم، یک پیوند در `multi-user.target.wants` ساخته شود تا بوت بعدی آن را بیاورد. بدون بخش `[Install]`، `enable` چیزی برای ساختن ندارد و صریحاً خطا می‌دهد. `start` همان لحظه واحد را بالا می‌آورد حتی اگر enable نشده باشد، و با ری‌بوت می‌رود.

نوع سرویس (`Type`) به systemd می‌گوید کی واحد را «آمده» حساب کند:

- `simple` یعنی فرآیند `ExecStart` همان فرآیند اصلی است و بلافاصله آمده حساب می‌شود. اگر برنامه همان اول یک خطای مهلک بدهد، وضعیت کمی دیرتر `failed` می‌شود. برنامهٔ پیش‌زمینه، از جمله اسکریپت پایتونی که `serve_forever` می‌کند، simple است. اگر `Type` را ننویسید و `ExecStart` داشته باشید، پیش‌فرض همین است.
- `notify` یعنی فرآیند باید خودش با پروتکل `sd_notify` بگوید `READY=1`. تا آن پیام نیاید systemd منتظر می‌ماند و اگر مهلت شروع تمام شود واحد را شکست‌خورده می‌کند. این نوع را فقط وقتی بگذارید که خود برنامه واقعاً این پیام را می‌فرستد. یک برنامهٔ معمولی با `Type=notify` بالا نمی‌آید و لاگش `timeout` است نه باگ کد.
- `forking` مال دیمون سنتی است که والد فورک می‌کند و خارج می‌شود و فرزند می‌ماند. systemd باید PID واقعی را بداند. بدون `PIDFile=` اغلب فرآیند غلط را دنبال می‌کند و `stop` یا بی‌اثر است یا فرآیند دیگری را می‌کشد. سرویس تازه را forking ننویسید. برنامه را در پیش‌زمینه اجرا کنید و `simple` بگذارید.

مسیر فایل مهم‌تر از محتوایی است که فکر می‌کنید نوشته‌اید. systemd چند لایه را با هم می‌خواند و اولی که پیدا شود، یا ترکیب drop-in، برنده است:

- `/etc/systemd/system` مال مدیر است. واحد محلی و drop-in این‌جاست. بستهٔ به‌روزشونده این را پاک نمی‌کند.
- `/usr/lib/systemd/system` مال بسته است. روی Ubuntu مسیر `/lib` به `usr/lib` پیوند خورده. فایل فروشنده را ویرایش نکنید. ارتقای بسته آن را برمی‌گرداند و تغییر شما بی‌صدا می‌رود.
- `/run/systemd/system` مال همین بوت است و با ری‌بوت پاک می‌شود.

اگر همان نام هم در `/etc` باشد و هم در `/usr/lib`، نسخهٔ `/etc` کل فایل فروشنده را سایه می‌زند. drop-in این کار را نمی‌کند. پوشهٔ `/etc/systemd/system/portal.service.d/override.conf` فقط کلیدهایی را که نوشته‌اید روی واحد اصلی می‌نشاند. برای عوض کردن یک عدد، drop-in درست است. برای جایگزینی کامل یک واحد فروشنده، `systemctl edit --full` که کپی را در `/etc` می‌سازد. کپی کامل یعنی دیگر به‌روزرسانی امنیتی خود فایل واحد را نمی‌بینید تا وقتی خودتان ادغام کنید. drop-in را ترجیح دهید.

`ExecStart` فهرست است. در drop-in اگر یک `ExecStart=` تازه بنویسید، به قبلی اضافه می‌شود نه اینکه جایش را بگیرد. اول یک خط `ExecStart=` خالی لازم است تا فهرست پاک شود، بعد خط جدید. بدون خط خالی، systemd یا خطا می‌دهد یا دو فرمان اجرا می‌کند. این رفتار در صفحهٔ سرویس با فایل واقعی نشان داده می‌شود چون آنجا یونیت ساخته می‌شود. این‌جا فقط باید بدانید چرا drop-in «هر دو دستور» را زده.

## چرا استفاده می‌شود؟

بدون تفکیک `/etc` و `/usr/lib`، نیمهٔ شب فایل nginx یا ssh را در جای فروشنده ویرایش می‌کنید، هفتهٔ بعد `apt upgrade` آن را برمی‌گرداند، و تنها نشانه این است که «دیشب درست بود». با drop-in، `systemctl cat` هر دو لایه را پشت سر هم نشان می‌دهد و می‌شود دید تنظیم زنده از کجا آمده.

بدون فهم `Type`، سرویس را `failed` می‌بینید و کد را عوض می‌کنید در حالی که برنامه سالم است و فقط `READY=1` نفرستاده. یا برعکس، `Type=simple` روی دیمونی که فورک می‌کند می‌گذارید و systemd فکر می‌کند سرویس مرده چون والد خارج شده، و `Restart=` آن را در حلقه بالا می‌آورد تا `start-limit` پر شود.

بدون تفکیک `Wants` و `After`، واحد را `After=db-1` می‌نویسید و فکر می‌کنید دیتابیس را صدا کرده‌اید. `After` نام واحد محلی است نه نام میزبان. انتظار برای میزبان دیگر یا با منطق خود برنامه است یا با واحدی که واقعاً سلامت دیتابیس را چک کند. نام میزبان را در `After=` نگذارید. systemd آن واحد را پیدا نمی‌کند و بسته به نحوهٔ نوشتن، یا خطا می‌دهد یا انتظاری که خیال می‌کنید وجود ندارد.

## Architecture

```text
هسته
  |
  PID 1 systemd
  |
  default.target
    |
    multi-user.target
      |
      +-- network-online.target
      |       ^
      |       | Wants و After، نه Requires، برای برنامهٔ کاربر
      |
      +-- ssh.socket  --->  ssh.service
      |
      +-- portal.service
              FragmentPath: /etc/systemd/system/portal.service
              DropIn:       /etc/systemd/system/portal.service.d/*.conf

جستجوی فایل
  /etc/systemd/system          مدیر، برندهٔ سایه
  /run/systemd/system          همین بوت
  /usr/lib/systemd/system      بسته، ویرایش ممنوع
```

`WantedBy` در فایل، تا وقتی `systemctl enable` نزده‌اید، پیوند `multi-user.target.wants/portal.service` را نمی‌سازد. وجود فایل واحد زیر `/etc` به‌تنهایی یعنی بوت بعدی آن را بالا می‌آورد؟ نه. باید enable شده باشد یا چیز دیگری `Wants=`/`Requires=` آن را کشیده باشد. `systemctl is-enabled` این را می‌گوید. `is-active` فقط وضع همین لحظه است. هر دو را ببینید. فرق عملی‌شان در صفحهٔ مدیریت سرویس با دستور آمده است.

سوکت SSH یک واحد جدا از خود دیمون است. خاموش کردن سرویس بدون خاموش کردن سوکت، شنونده را ممکن است زنده بگذارد. این هم از معماری همین صفحه است: چیزی که پورت را باز کرده همان فرآیندی نیست که `status` سرویس نشان می‌دهد. تأیید نهایی همیشه `ss` است نه اسم واحد.

## Installation

systemd خودش PID 1 است. بسته‌ای به‌نام نصب systemd روی سرور Ubuntu اضافه نمی‌کنید. اگر `ps -p 1 -o comm=` چیزی غیر از `systemd` چاپ کرد، این صفحه مال آن ماشین نیست.

```bash
ps -p 1 -o comm=
systemctl --version
systemctl get-default
ls -ld /lib /usr/lib/systemd/system
```

`/lib` باید پیوند به `usr/lib` باشد. اگر دایرکتوری جدا بود، هنوز همان قاعده را رعایت کنید: فایل بسته را ویرایش نکنید. مسیر واقعی واحد فروشنده را از خود systemd بپرسید:

```bash
systemctl show ssh.service -p FragmentPath -p DropInPaths --no-pager
systemctl cat ssh.service
```

خط اول `systemctl cat` مسیر فایل را در کامنت نشان می‌دهد. اگر بعدش بلوک دیگری با مسیر `# /etc/systemd/system/ssh.service.d/...` آمد، مدیر قبلاً drop-in گذاشته و رفتار سرور با بستهٔ خام یکی نیست. قبل از هر تغییری این خروجی را بخوانید.

تارگت پیش‌فرض اگر `graphical.target` بود و این ماشین سرور است، میز گرافیکی را بیهوده بالا می‌آورد. برگرداندن:

```bash
sudo systemctl set-default multi-user.target
systemctl get-default
```

این دستور بوت فعلی را عوض نمی‌کند. از بوت بعدی اثر دارد. برای همین نشست، اگر واقعاً لازم است، جداگانه تارگت را ایزوله می‌کنند. روی سرور تولیدی وسط شیفت `isolate` نزنید. نشست گرافیکی و هر چیزی که به تارگت قبلی وابسته بوده قطع می‌شود.

## Configuration

یک واحد حداقلی که فقط معماری را نشان می‌دهد، نه واحد کامل برنامه. واحد قابل اجرای `portal` را در صفحهٔ بعد کپی کنید. این‌جا رابطهٔ کلیدها مهم است.

```ini
[Unit]
Description=Portal application
After=network-online.target
Wants=network-online.target

[Service]
Type=simple
ExecStart=/usr/bin/python3 /opt/apps/portal/server.py

[Install]
WantedBy=multi-user.target
```

`Type=simple` را وقتی بردارید و `notify` بگذارید که کد برنامه `READY=1` می‌فرستد. برای پایتون کتابخانهٔ استاندارد این کار را نمی‌کند. `forking` هم برای این برنامه غلط است چون فرآیند والد نمی‌میرد. اگر کسی واحد را این‌طور خراب کند:

```ini
[Service]
Type=notify
ExecStart=/usr/bin/python3 /opt/apps/portal/server.py
```

systemd تا `TimeoutStartSec` صبر می‌کند و بعد واحد را failed می‌کند. در journal عبارت timeout را می‌بینید نه استثنای پایتون را. درمان، برگشت به `simple` است نه زیاد کردن بی‌حد مهلت. زیاد کردن مهلت فقط شکست را دیرتر نشان می‌دهد.

وابستگی قوی را با چشم بشناسید تا در واحد فروشنده غافلگیر نشوید:

```ini
[Unit]
Requires=network-online.target
After=network-online.target
```

اگر `systemd-networkd-wait-online` گیر کند، این واحد هم بالا نمی‌آید. روی سرور آزمایشگاه که شبکهٔ پل گاهی دیر DHCP می‌گیرد، `Wants=` کافی است و خود برنامه باید اتصال دیتابیس را دوباره امتحان کند. واحد نمونهٔ صفحهٔ بعد همین کار را با `Restart=on-failure` می‌کند، نه با زنجیر کردن مرگ سرویس به مرگ شبکه.

برای دیدن درخت وابستگی یک واحد، بدون عوض کردن آن:

```bash
systemctl list-dependencies multi-user.target --plain | head -n 40
systemctl show portal.service -p Wants -p Requires -p After -p WantedBy --no-pager
```

اگر `portal.service` هنوز نصب نشده، دستور show خطا می‌دهد. آن خطا طبیعی است تا صفحهٔ بعد را تمام کنید. برای تمرین معماری همین حالا روی واحد واقعی:

```bash
systemctl show ssh.service -p Wants -p Requires -p After -p FragmentPath --no-pager
systemctl is-enabled ssh.socket ssh.service
```

یکی از این دو باید enabled باشد. اگر هر دو disabled باشند و هنوز به SSH وصلید، یا از کنسول آمده‌اید یا یک سوکت گذرا در `/run` شنونده است. `ss -lptn 'sport = :22'` را با خروجی is-enabled کنار هم بگذارید و به تنهایی به یکی اعتماد نکنید.

drop-in را بشناسید قبل از اینکه فایل فروشنده را باز کنید. این دستور ویرایشگر را باز می‌کند و پوشه را می‌سازد:

```bash
sudo systemctl edit ssh.service
```

اگر فقط می‌خواهید مسیر را ببینید و هنوز چیزی ننویسید، از ویرایشگر بدون ذخیره خارج شوید. فایل ساخته‌شده این‌جاست:

```text
/etc/systemd/system/ssh.service.d/override.conf
```

خالی ماندنش بی‌ضرر است ولی گیج‌کننده است. پوشهٔ خالی را حذف کنید اگر منصرف شدید. هر بار که فایل واحد یا drop-in عوض شد:

```bash
sudo systemctl daemon-reload
```

بدون reload، systemd متن قدیمی حافظه را اجرا می‌کند. `restart` فایل را از دیسک دوباره نمی‌خواند. این جمله را در حادثه فرض نگیرید. `systemctl show -p FragmentPath` مسیر را می‌گوید و برای دیدن اینکه محتوای تازه خوانده شده، بعد از reload مقدار کلیدی که عوض کرده‌اید را با `systemctl show` بسنجید.

## Production Example

سناریو: می‌خواهید بدانید SSH این میزبان از سوکت بالا می‌آید یا از سرویس دائمی، قبل از اینکه پورت را در حادثه عوض کنید. این صفحه پورت را عوض نمی‌کند. فقط معماری شنونده را درمی‌آورد تا تغییر بعدی را در جای غلط ننویسید.

```bash
systemctl cat ssh.socket ssh.service
systemctl is-active ssh.socket ssh.service
ss -lptn 'sport = :22'
```

اگر `ssh.socket` برابر `active` است و `ss` شنونده را به `systemd` نسبت می‌دهد نه به `sshd`، پورت را سوکت باز کرده است. ری‌استارت `ssh.service` به‌تنهایی ممکن است شنونده را تکان ندهد. هر دو واحد را در گزارش حادثه بنویسید. اگر تصمیم سازمان این است که دیمون سنتی همیشه بالا باشد، هر دو طرف را با هم عوض کنید:

```bash
sudo systemctl disable --now ssh.socket
sudo systemctl enable --now ssh.service
ss -lptn 'sport = :22'
```

این کار را وقتی بزنید که یک نشست کنسول غیر از SSH باز است. اشتباه در ترتیب، شما را بیرون می‌اندازد در حالی که سرویس هنوز بالا نیامده. برگشت به مدل سوکت، برعکس همین دو خط است: سرویس دائمی را disable کنید و سوکت را enable. بعد از هر طرف، `ss` باید هنوز `:22` را نشان بدهد و یک نشست تازهٔ SSH باید کار کند. نشست فعلی را معیار نگیرید. نشست باز شما حتی اگر شنونده بمیرد زنده می‌ماند تا خودتان خارج شوید.

سناریوی دوم: واحد فروشنده را عوض نکنید. ببینید بسته کجا گذاشته و مدیر کجا سایه انداخته.

```bash
systemctl show nginx.service -p FragmentPath -p DropInPaths --no-pager
```

اگر nginx نصب نیست، به‌جایش `cron.service` یا `systemd-journald.service` را بگذارید. `FragmentPath` زیر `/usr/lib` یعنی دارید همان پیش‌فرض بسته را اجرا می‌کنید. اگر زیر `/etc/systemd/system` است، یک نفر کل واحد را سایه زده. قبل از ارتقای بسته، آن کپی را با `systemctl cat` بخوانید و فرق را بدانید. ارتقا، سایهٔ `/etc` را خودش به‌روز نمی‌کند.

## Security Notes

- واحد را با `User=root` ننویسید مگر برنامه واقعاً به پورت زیر ۱۰۲۴ یا به فایل روت نیاز دارد و راه کم‌خطرتری مثل `CAP_NET_BIND_SERVICE` را بررسی کرده‌اید. پیش‌فرض نبودن `User=` یعنی روت. در واحد نمونهٔ صفحهٔ بعد `User=deploy` صریح است.
- `Type=notify` را برای «سخت نشان دادن» نگذارید. سرویس بالا نمی‌آید و کسی برای نجات، `User=root` و `NoNewPrivileges=false` اضافه می‌کند. نوع غلط، سخت‌سازی را دور می‌ریزد.
- فایل واحد در `/etc` مال روت و حالت `0644` است. اگر `deploy` بتواند آن را بنویسد، ری‌استارت بعدی را خودش تعریف می‌کند، از جمله `ExecStart` را. درخت `/etc/systemd/system` نباید برای حساب سرویس نوشتنی باشد.
- `Requires=ssh.service` را در واحد برنامه ننویسید. خواباندن برنامه نباید سیاست SSH را بکشد، و برعکس هم لازم نیست برنامه برای زنده ماندن SSH بمیرند.
- drop-in را از دانلود ناشناس کپی نکنید. یک خط `ExecStart` کافی است تا فرآیند دیگری با حق سرویس شما بالا بیاید.

## Troubleshooting

| نشانه | علت محتمل | کار |
| --- | --- | --- |
| `Unit has no [Install] section` موقع enable | `WantedBy` نیست | بخش Install را اضافه کنید و daemon-reload |
| سرویس timeout و کد سالم است | `Type=notify` بدون sd_notify | برگرداندن به `simple` |
| `stop` فرآیند را نمی‌کشد | `Type=forking` بدون PIDFile درست | پیش‌زمینه و `simple`، یا PIDFile واقعی |
| تغییر فایل واحد اثر ندارد | daemon-reload نشده | `sudo systemctl daemon-reload` و بعد restart |
| ویرایش زیر `/usr/lib` بعد از apt برگشته | فایل فروشنده را عوض کرده‌اید | drop-in در `/etc/systemd/system` |
| `Failed to load` به‌خاطر ExecStart تکراری | drop-in بدون خط خالی `ExecStart=` | پاک کردن فهرست، بعد یک فرمان |
| پورت ۲۲ باز است ولی ssh.service inactive است | `ssh.socket` شنونده است | `is-active` هر دو و `ss` |
| بوت روی شبکه می‌ایستد | `Requires=network-online` و wait-online گیر کرده | Wants به‌جای Requires، یا اصلاح شبکه |

برای دیدن اینکه systemd کدام فایل را واقعاً خوانده، نه کدام فایل را ویرایشگر شما باز کرده:

```bash
systemctl cat portal.service
systemctl show portal.service -p FragmentPath -p DropInPaths -p NeedDaemonReload --no-pager
```

اگر `NeedDaemonReload=yes` است، حافظهٔ PID 1 با دیسک فرق دارد. تا reload نکنید هر restart رفتار قدیم را دارد.

## Best Practices

- واحد محلی و drop-in فقط زیر `/etc/systemd/system`. زیر `/usr/lib` را فقط بخوانید.
- `Type=simple` برای برنامهٔ پیش‌زمینه، `notify` فقط با پشتیبانی خود برنامه، `forking` فقط با `PIDFile` و ترجیحاً هرگز برای سرویس تازه.
- `Wants=` به‌علاوهٔ `After=` برای وابستگی معمولی. `Requires=` را وقتی بگذارید که بالا بودن این واحد بدون آن یکی دروغ است.
- `WantedBy=multi-user.target` و سپس enable. وجود فایل را با بوت خودکار یکی ندانید.
- بعد از هر ویرایش `daemon-reload` و سپس `systemctl cat` تا سایه و drop-in را با چشم ببینید.
- شنوندهٔ واقعی را با `ss` تأیید کنید، مخصوصاً وقتی واحد سوکت و واحد سرویس هر دو وجود دارند.
