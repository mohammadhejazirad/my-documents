---
title: "مدیریت سرویس"
sidebar_position: 11
description: "systemctl enable و disable و mask و restart و reload، و یونیت کامل یک برنامه زیر /opt/apps."
---

# مدیریت سرویس

## مقدمه

این صفحه یک سرویس را از فایل واحد تا پاسخ `ok` روی `127.0.0.1:8080` بالا می‌آورد و همان را درست خاموش، غیرفعال، یا مسدود می‌کند. معماری unit و تفاوت `Type` و مسیر `/etc` در برابر `/usr/lib` در [معماری systemd](/docs/01-linux/systemd) است. این‌جا دستور عملی است. لاگ هر شکست را با [journalctl](/docs/01-linux/journalctl) می‌خوانیم. حسابی که سرویس با آن اجرا می‌شود `deploy` است و در [مدیریت کاربر و گروه](/docs/01-linux/user-management) ساخته شده. اگر آن حساب نیست، اول همان صفحه را تمام کنید. یونیت با کاربر ناموجود بالا نمی‌آید و پیامش شبیه باگ برنامه نیست.

برنامهٔ نمونه یک سرور HTTP پایتون روی فقط localhost است تا بدون نصب Node یا Nginx بتوانید `systemctl` را تمرین کنید. کد مال `root:deploy` است و وضعیت، اگر لازم شد، زیر `/var/lib/portal`. رمز نمونه داخل فایل محیط `change-me` است و فایل `0600` می‌ماند. این فرآیند را به اینترنت منتشر نکنید. جلوی آن بعداً Nginx می‌نشیند.

## مفهوم اصلی

`systemctl` با PID 1 حرف می‌زند. شش کاری که با هم قاطی می‌شوند:

- `start` و `stop` همین لحظه را عوض می‌کنند و بوت بعدی را نه.
- `enable` پیوند بوت را می‌سازد و همین لحظه فرآیند را بالا نمی‌آورد. `disable` پیوند را برمی‌دارد و فرآیند جاری را لزوماً نمی‌کشد.
- `enable --now` هر دو کار را با هم می‌کند: پیوند بوت، و شروع همین حالا. این دستور پیش‌فرض دانشنامه بعد از نوشتن یونیت است.
- `reload` از فرآیند می‌خواهد پیکربندی را دوباره بخواند، اگر واحد `ExecReload` داشته باشد یا خود برنامه سیگنال را بفهمد. قطع اتصال کوتاه است یا صفر. اگر واحد این عمل را نداشته باشد، systemd می‌گوید reload قابل اعمال نیست. آن را با restart عوض نکنید بدون اینکه بدانید اتصال‌ها می‌افتند.
- `restart` فرآیند را می‌کشد و از نو اجرا می‌کند. قطع کوتاه حتمی است. `try-restart` فقط اگر الان فعال است restart می‌کند و برای اسکریپت امن‌تر است.
- `mask` واحد را به `/dev/null` پیوند می‌کند تا حتی وابستگی دیگران هم نتواند بالا بیاوردش. از disable قوی‌تر است و ارتقای بسته معمولاً برنمی‌داردش. `unmask` آن پیوند را پاک می‌کند. mask را روی `ssh.service` نزنید اگر همان SSH تنها راه شماست.

`daemon-reload` هیچ فرآیندی را restart نمی‌کند. فقط متن واحد را از دیسک به حافظهٔ PID 1 می‌آورد. ترتیب درست بعد از ویرایش فایل: اول `daemon-reload`، بعد `restart` یا `reload`. برعکسش یعنی فرآیند جدید با تعریف کهنه، یا تعریف تازه که هنوز اجرا نشده.

`status` هم وضعیت است و هم چند خط آخر لاگ. کد خروجش برای اسکریپت مفید است: صفر یعنی فعال، ۳ یعنی مردهٔ عادی، ۴ یعنی واحد پیدا نشد. `is-active` و `is-enabled` و `is-failed` برای تست تک‌کلمه‌ای کافی‌اند. `reset-failed` شمارندهٔ شکست و حالت failed را پاک می‌کند تا بعد از پر شدن سقف ری‌استارت بتوانید دوباره `start` کنید. بدون آن، start بلافاصله با `start-limit-hit` برمی‌گردد.

## چرا استفاده می‌شود؟

سرویس را با `nohup` و `&` در SSH بالا آوردن تا لحظهٔ بستن نشست یا ری‌بوت زنده به نظر می‌رسد و بعد هیچ‌کس نمی‌داند چه کسی باید دوباره اجرا کند. یونیت، مالک فرآیند، ری‌استارت، و لاگ را یک‌جا تعریف می‌کند. `enable --now` یعنی همان تعریف، بوت بعدی را هم پوشش می‌دهد. بدون `--now` مدیر فکر می‌کند enable کافی بوده، از سرور خارج می‌شود، و تا ری‌بوت بعدی کسی نمی‌فهمد فرآیند اصلاً شروع نشده. بدون enable و فقط با start، ری‌بوت شبانه سرویس را برنمی‌گرداند.

mask برای واحدی است که بسته اصرار دارد بالا بیاورد و شما عمداً نمی‌خواهید، مثلاً یک تایمر اضافه. disable تنها کافی نیست اگر واحد دیگری `Wants=` آن را داشته باشد. mask آن کشش را هم می‌بندد. هزینهٔ mask این است که فراموشش می‌کنید و ماه بعد `start` می‌گوید واحد masked است و علت را در کد برنامه جستجو می‌کنید.

## Architecture

```text
/etc/systemd/system/portal.service
        |
        | daemon-reload
        v
PID 1 ---- enable --now ----> multi-user.target.wants/portal.service
        |
        +---- start/stop/restart/reload ----> فرآیند python، کاربر deploy
        |
        +---- mask ----> پیوند به /dev/null در /etc/systemd/system

/opt/apps/portal/server.py     root:deploy   0640   کد
/etc/portal.env                root:root     0600   متغیر، از جمله رمز نمونه
/var/lib/portal                deploy:deploy 0750   وضعیت
127.0.0.1:8080                 فقط همین میزبان
```

برنامه به `0.0.0.0` گوش نمی‌دهد. اگر `ss` آدرس `0.0.0.0:8080` را نشان داد، فایل محیط یا کد را کسی عوض کرده. واحد، `BIND` را از فایل محیط می‌گیرد و نمونهٔ سالم `127.0.0.1` است.

## Installation

پیش‌نیاز حساب و درخت دایرکتوری:

```bash
id deploy
getent passwd deploy
sudo install -d -o root -g deploy -m 0750 /opt/apps/portal
sudo install -d -o deploy -g deploy -m 0750 /var/lib/portal
```

کد برنامه. این همان فرآیند بلندمدت است. پایتون ۳ با خود Ubuntu هست. اگر `python3` نبود `sudo apt install python3` و دوباره مسیر `command -v python3` را در یونیت بگذارید.

```bash
sudo tee /opt/apps/portal/server.py >/dev/null <<'PY'
#!/usr/bin/env python3
import os
from http.server import BaseHTTPRequestHandler, HTTPServer

class Handler(BaseHTTPRequestHandler):
    def do_GET(self):
        body = b"ok\n"
        self.send_response(200)
        self.send_header("Content-Type", "text/plain")
        self.send_header("Content-Length", str(len(body)))
        self.end_headers()
        self.wfile.write(body)

bind = os.environ.get("BIND", "127.0.0.1")
port = int(os.environ.get("PORT", "8080"))
HTTPServer((bind, port), Handler).serve_forever()
PY
sudo chown root:deploy /opt/apps/portal/server.py
sudo chmod 0640 /opt/apps/portal/server.py
```

فایل محیط. `change-me` را قبل از وصل کردن هر دیتابیس واقعی عوض کنید. چون systemd فایل را به‌عنوان روت می‌خواند، لازم نیست `deploy` آن را بخواند.

```bash
sudo tee /etc/portal.env >/dev/null <<'EOF'
BIND=127.0.0.1
PORT=8080
DB_PASSWORD=change-me
EOF
sudo chown root:root /etc/portal.env
sudo chmod 0600 /etc/portal.env
```

یونیت کامل:

```ini
[Unit]
Description=Portal application
After=network-online.target
Wants=network-online.target

[Service]
Type=simple
User=deploy
Group=deploy
WorkingDirectory=/opt/apps/portal
EnvironmentFile=/etc/portal.env
ExecStart=/usr/bin/python3 /opt/apps/portal/server.py
Restart=on-failure
RestartSec=3
UMask=0027
NoNewPrivileges=true
ProtectSystem=strict
ProtectHome=true
PrivateTmp=true
StateDirectory=portal

[Install]
WantedBy=multi-user.target
```

`StateDirectory=portal` دایرکتوری `/var/lib/portal` را برای کاربر سرویس آماده می‌کند. با پوشه‌ای که خودمان ساختیم سازگار است. `ProtectSystem=strict` درخت سیستم را فقط‌خواندنی می‌کند، پس برنامه نباید در `/opt` بنویسد. `ProtectHome=true` خانهٔ انسان‌ها را از دید فرآیند پنهان می‌کند. `NoNewPrivileges=true` جلوی بالا بردن حق داخل خود فرآیند را می‌گیرد.

فایل را این‌جا بگذارید:

```bash
sudo install -o root -g root -m 0644 /dev/null /etc/systemd/system/portal.service
```

بعد محتوا را با ویرایشگر روت در همان مسیر بنویسید، یا با `tee` اگر کپی دقیق را از همین صفحه می‌گذارید. مسیر باید `/etc/systemd/system/portal.service` باشد نه زیر `/usr/lib`.

```bash
sudo systemctl daemon-reload
sudo systemctl enable --now portal.service
systemctl status portal.service --no-pager
```

`enable --now` باید هم `Created symlink` را نشان بدهد و هم فرآیند را `active (running)` کند. پیوند این‌جاست:

```text
/etc/systemd/system/multi-user.target.wants/portal.service
```

تست از خود سرور:

```bash
curl -fsS http://127.0.0.1:8080/
ss -lptn 'sport = :8080'
```

خروجی `curl` باید دقیقاً `ok` باشد. `ss` باید `127.0.0.1:8080` و کاربر `deploy` یا فرآیند `python3` را نشان بدهد، نه `0.0.0.0:8080`.

## Configuration

وضعیت را بدون تفسیر اضافه ببینید:

```bash
systemctl is-enabled portal.service
systemctl is-active portal.service
systemctl show portal.service -p FragmentPath -p User -p ExecStart -p NeedDaemonReload --no-pager
```

`FragmentPath` باید زیر `/etc/systemd/system` باشد. `NeedDaemonReload` باید `no` باشد. اگر `yes` است قبل از هر restart این را بزنید:

```bash
sudo systemctl daemon-reload
```

عوض کردن یک کلید بدون کپی کردن کل یونیت. مثلاً مهلت ری‌استارت را بیشتر کنید. `systemctl edit portal.service` ویرایشگر را باز می‌کند. اگر ویرایشگر در دسترس نیست، خود فایل drop-in را بسازید:

```ini
[Service]
RestartSec=10
```

مسیر:

```text
/etc/systemd/system/portal.service.d/override.conf
```

```bash
sudo install -d -o root -g root -m 0755 /etc/systemd/system/portal.service.d
sudo systemctl daemon-reload
sudo systemctl restart portal.service
systemctl show portal.service -p RestartUSec --no-pager
```

باید ۱۰ ثانیه را نشان بدهد نه ۳ ثانیه را. drop-in روی کلیدهای فهرست‌وار مثل `ExecStart` جایگزین نمی‌شود مگر اول فهرست خالی شود. اگر روزی مسیر اسکریپت عوض شد:

```ini
[Service]
ExecStart=
ExecStart=/usr/bin/python3 /opt/apps/portal/server.py
```

خط خالی عمدی است. بدون آن `daemon-reload` خطا می‌دهد که `ExecStart` چندبار آمده و نوع سرویس simple بیش از یک فرمان اصلی نمی‌پذیرد.

این برنامه reload بلد نیست. عمداً `ExecReload` نگذاشته‌ایم. نتیجه:

```bash
sudo systemctl reload portal.service
```

پیام این است که job از نوع reload قابل اعمال نیست، یا واحد از reload پشتیبانی نمی‌کند. سرویس باید `active` بماند. اگر برای برنامه‌ای که SIGHUP را می‌فهمد reload می‌خواهید، آن را جدا اضافه کنید و این پایتون را با آن اشتباه نگیرید:

```ini
[Service]
ExecReload=/bin/kill -HUP $MAINPID
```

`$MAINPID` را systemd می‌گذارد. روی این نمونهٔ پایتون حتی با این خط، برنامه HUP را به ری‌خواندن پیکربندی تبدیل نمی‌کند و ممکن است بمیرد. پس برای `portal.service` همین نمونه، reload را تعریف نکنید. تغییر کد یعنی `restart`.

خاموش کردن موقت، بدون برداشتن از بوت:

```bash
sudo systemctl stop portal.service
systemctl is-active portal.service
systemctl is-enabled portal.service
```

فعال بودن باید `inactive` شود و enabled بماند. `start` دوباره بالا می‌آورد. برداشتن از بوت و همین حالا:

```bash
sudo systemctl disable --now portal.service
```

برگرداندن همان `enable --now` است. مسدود کردن، وقتی یک واحد مزاحم است و نباید با وابستگی دیگران زنده شود:

```bash
sudo systemctl mask portal.service
systemctl is-enabled portal.service
sudo systemctl start portal.service
```

`is-enabled` می‌گوید `masked`. `start` شکست می‌خورد. این تمرین را روی `portal` انجام دهید نه روی `ssh`. برداشتن انسداد:

```bash
sudo systemctl unmask portal.service
sudo systemctl enable --now portal.service
```

اگر فراموش کنید unmask، فایل `/etc/systemd/system/portal.service` هنوز سر جایش است ولی پیوندی به `/dev/null` روی همان نام نشسته و واحد شما اجرا نمی‌شود. `systemctl cat` در حالت mask اغلب همان `/dev/null` را نشان می‌دهد. این اولین چیزی است که وقتی «فایل هست ولی سرویس نیست» چک می‌کنید.

## Production Example

سقف ری‌استارت را پر کنید تا شکل شکست را بشناسید، بعد درستش کنید. یک خطای عمدی: پورت را به عددی ببرید که این کاربر حق ندارد.

در `/etc/portal.env` موقتاً `PORT=80` بگذارید. فایل باید `0600` بماند.

```bash
sudo systemctl daemon-reload
sudo systemctl restart portal.service
systemctl status portal.service --no-pager
```

فرآیند با `Permission denied` می‌میرد، `Restart=on-failure` دوباره امتحان می‌کند، و بعد از چند بار:

```text
Start request repeated too quickly.
Failed with result 'start-limit-hit'.
```

`PORT=8080` را برگردانید. تا `reset-failed` نزنید شروع جدید قبول نمی‌شود:

```bash
sudo systemctl reset-failed portal.service
sudo systemctl start portal.service
curl -fsS http://127.0.0.1:8080/
```

ری‌استارت بعد از عوض کردن کد:

```bash
sudo systemctl restart portal.service
systemctl is-active portal.service
```

`daemon-reload` برای عوض شدن فقط `server.py` لازم نیست، چون مسیر `ExecStart` همان است و پایتون هر بار فایل را از نو می‌خواند. `daemon-reload` وقتی لازم است که خود فایل واحد یا drop-in یا `EnvironmentFile` را systemd باید دوباره بخواند. دربارهٔ فایل محیط: تغییر `/etc/portal.env` با restart برداشته می‌شود، چون موقع شروع خوانده می‌شود نه با reload حافظهٔ PID 1. اگر فقط محیط عوض شده، restart کافی است. اگر خود خط `EnvironmentFile=` در یونیت عوض شده، اول daemon-reload.

SSH را با همین عادت بررسی کنید بدون اینکه قطعش کنید:

```bash
systemctl is-active ssh.socket ssh.service
systemctl is-enabled ssh.socket ssh.service
sudo systemctl reload ssh.service
```

`reload` روی SSH پیکربندی را دوباره می‌خواند اگر واحد اجازه بدهد، و نشست باز شما نباید بیفتد. اگر خطا داد که واحد فعال نیست، احتمالاً فقط سوکت فعال است. آن‌وقت reload را روی واحدی بزنید که `is-active` آن `active` است، یا هر دو را از صفحهٔ معماری بشناسید و وسط شیفت سوکت را disable نکنید. تأیید پورت:

```bash
ss -lptn 'sport = :22'
```

یک نشست تازه از لپ‌تاپ باز کنید قبل از اینکه نشست فعلی را ببندید.

## Security Notes

- `User=` را خالی نگذارید. خالی یعنی روت. نمونهٔ این صفحه `deploy` است و پورت ۸۰ را عمداً نمی‌گیرد تا این محدودیت با چشم دیده شود.
- `DB_PASSWORD=change-me` رمز واقعی نیست. قبل از هر اتصال واقعی عوض شود. فایل `0600` و مال روت. آن را کنار کد در `/opt` نگذارید.
- `ProtectSystem=strict` را برای راحتی دیباگ برندارید. اگر برنامه باید جایی بنویسد، `StateDirectory` یا `ReadWritePaths` همان مسیر را اضافه کنید.
- mask روی واحدی که راه ورود شماست ممنوع عملیاتی است. اول کنسول هایپروایزر را باز کنید.
- یونیت را جهان‌نوشتنی نکنید. `0644` مال روت یعنی دیگران می‌خوانند و نمی‌نویسند. خواندن یونیت راز نیست. نوشتن آن برابر تصاحب سرویس است.
- برنامه را روی `127.0.0.1` نگه دارید تا وقتی پروکسی جلویش ننشسته. `BIND=0.0.0.0` در فایل محیط این را بی‌صدا عوض می‌کند. بعد از هر تغییر محیط، `ss` را ببینید.

## Troubleshooting

| نشانه | علت محتمل | کار |
| --- | --- | --- |
| `Unit portal.service not found` | فایل در مسیر غلط است یا daemon-reload نشده | `ls /etc/systemd/system/portal.service` و reload |
| `Failed to determine user credentials` | کاربر `deploy` نیست | `getent passwd deploy` |
| `status=217/USER` | همان نبودن کاربر یا گروه | صفحهٔ کاربر |
| `Permission denied` و پورت ۸۰ | فرآیند غیرروت | `PORT=8080` |
| `start-limit-hit` | حلقهٔ شکست | علت را در journal بگیرید، reset-failed، بعد start |
| `reload` می‌گوید not applicable | ExecReload تعریف نشده | برای این نمونه restart |
| تغییر یونیت بی‌اثر است | NeedDaemonReload=yes | daemon-reload سپس restart |
| `masked` | unmask فراموش شده | `systemctl unmask portal.service` |
| curl از لپ‌تاپ وصل نمی‌شود ولی روی سرور ok است | عمداً localhost است | از خود سرور تست کنید. انتشار کار این صفحه نیست |
| active است و پورت نیست | برنامه زود برگشته یا BIND غلط | `journalctl -u portal.service -n 50` و `ss` |

لاگ لحظهٔ شکست:

```bash
journalctl -u portal.service -n 50 --no-pager
```

اگر واحد اصلاً ثبت نشده، `-u` خالی است. آن را با نبودن لاگ برنامه اشتباه نگیرید. `systemctl status` همان لحظه می‌گوید واحد پیدا نشد.

وقتی `enable` می‌گوید واحد Install ندارد، بخش `[Install]` را از نمونه جا انداخته‌اید. `start` ممکن است هنوز کار کند و بوت بعدی نه. هر دو را با `is-enabled` بسنجید.

## Best Practices

- بعد از نوشتن یونیت: `daemon-reload`، `enable --now`، `status`، `curl` یا `ss`. یکی را جا نیندازید.
- تغییر فایل واحد یا drop-in همیشه reload دیمون است. تغییر فقط کد پایتون restart است. تغییر فقط `/etc/portal.env` هم restart است.
- `disable` را با `stop` یکی ندانید. برای هر دو، `disable --now` هست. برای بوت ماندن ولی قطع موقت، فقط `stop`.
- `mask` را فقط با یادداشت برمی‌دارید. همان روز در تیکت بنویسید چه چیزی masked است.
- reload را وقتی تعریف کنید که برنامه واقعاً پیکربندی را زنده دوباره می‌خواند. وگرنه restart را صریح بزنید تا قطعی در گزارش بیاید نه در رفتار پنهان.
- سرویس را با کاربر اختصاصی، `UMask=0027`، و `NoNewPrivileges=true` بگذارید و پورت آزمایش را روی localhost نگه دارید.
