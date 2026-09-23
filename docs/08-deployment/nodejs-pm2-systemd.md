---
title: Node با PM2 و systemd
sidebar_position: 3
description: "نصب باینری رسمی Node 24 بدون شمارهٔ patch ثابت، سپس یکی از PM2 یا systemd، نه هر دو."
---

# Node با PM2 و systemd

## مقدمه

برنامهٔ `/opt/apps/app` روی `10.10.1.10` باید بعد از بستن SSH و بعد از reboot همچنان به `127.0.0.1:3000` گوش بدهد. دو راه در این دانشنامه هست: واحد systemd که خودمان می‌نویسیم، و PM2 که واحد systemd را برای کاربر `deploy` می‌سازد. هر دو درست‌اند. هر دو با هم روی یک پورت غلط‌اند. یکی را انتخاب کنید و دیگری را خاموش کنید.

Node اینجا Node 24 LTS است، Active LTS در زمان این سند. شمارهٔ patch را صفحه ثابت نمی‌کند. آن شماره را از فهرست رسمی همان روز برمی‌دارید، چک‌سام را با `SHASUMS256.txt` می‌سنجید، و باینری `linux-x64` را زیر `/usr/local` باز می‌کنید. بستهٔ `nodejs` آرشیو Ubuntu را برای این شاخه جایگزین این روش نکنید؛ نسخهٔ آن بسته را این صفحه تضمین نمی‌کند.

پیش‌نیاز کد و کلون در [استقرار دستی](/docs/08-deployment/manual-ssh) است. جلوی پورت، [Nginx](/docs/06-nginx/nodejs) است.

## مفهوم اصلی

فهرست `https://nodejs.org/dist/latest-v24.x/` همیشه آخرین انتشار شاخهٔ 24 را نشان می‌دهد. داخل آن، فایل باینری لینوکس ۶۴بیتی هست و کنارش `SHASUMS256.txt`. متغیر `VERSION` همان تکه‌ای است که با `v24` شروع می‌شود و در نام فایل، بین `node-` و `-linux-x64.tar.xz` نشسته است. آن رشته را از فهرست کپی می‌کنید. اگر از این صفحه یک شماره بسازید، یا هنوز منتشر نشده یا دیگر آخرین اصلاح امنیتی نیست.

بایگانی رسمی را با `tar` در `/usr/local` باز می‌کنیم تا `node` و `npm` در `/usr/local/bin` باشند. چک‌سام باید قبل از `tar` موفق باشد. شکست چک‌سام یعنی فایل ناقص یا عوض‌شده است و نباید باز شود.

systemd با `Restart=on-failure` فقط وقتی دوباره شروع می‌کند که فرایند با خطا بمیرد. خروج تمیز و `systemctl stop` آن را برنمی‌گرداند. `User=deploy` و `WorkingDirectory=/opt/apps/app` یعنی کد و مجوز همان است که در صفحهٔ دستی گذاشتید.

PM2 فرایند را خودش زیر نظر می‌گیرد و `pm2 startup systemd` یک واحد می‌سازد که بعد از بوت، `pm2 resurrect` را برای همان کاربر اجرا می‌کند. آن واحد معمولاً `pm2-deploy.service` است. اگر هم این واحد enable باشد و هم `app.service`، هر کدام که دیرتر بالا بیاید یا `EADDRINUSE` می‌گیرد یا بدتر، بعد از بوت نسخهٔ دیگری را روی پورت می‌نشاند.

## چرا استفاده می‌شود؟

اجرای دستی ثابت کرد فرمان درست است و ثابت کرد که با قطع شبکهٔ SSH می‌میرد. ناظر این شکاف را می‌بندد. systemd به بستهٔ اضافه نیاز ندارد و لاگش در journal است. PM2 برای تیمی است که چند برنامهٔ Node روی یک میزبان دارد و فهرست `pm2 ls` را از قبل می‌شناسد. هیچ‌کدام برتری جادویی ندارند. برتری با داشتن دو ناظر از بین می‌رود، چون دیگر معلوم نیست کدام pid تولید است.

چک‌سام را برای این می‌خواهیم که باینری را از اینترنت، نه از آرشیو امضاشدهٔ Ubuntu، می‌گیریم. بدون آن، استقرار بر پایهٔ فایل نیمه‌دانلودشده هم ممکن است `node -v` را نشان بدهد و وسط درخواست بشکند.

## Architecture

```text
https://nodejs.org/dist/latest-v24.x/
        │  SHASUMS256.txt و tarball linux-x64
        ▼
/usr/local/bin/node
        │
        ├─ راه A   app.service
        │          User=deploy
        │          WorkingDirectory=/opt/apps/app
        │          Restart=on-failure
        │
        └─ راه B   pm2 به نام app
                   واحد pm2-deploy از pm2 startup
        │
        ▼
127.0.0.1:3000     فقط یکی از A یا B
```

خانهٔ `deploy` برای راه B لازم است چون PM2 وضعیت را در `/home/deploy/.pm2` می‌نویسد. شل تعاملی لازم نیست. راه A به آن خانه نیاز ندارد.

## Installation

فهرست `https://nodejs.org/dist/latest-v24.x/` را باز کنید. نام فایل `linux-x64.tar.xz` را پیدا کنید. مقدار `VERSION` را از همان نام کپی کنید. در پوسته، عدد را از این سند وارد نکنید؛ `read` همان رشته را از شما می‌گیرد. اگر چک‌سام رد شد، `tar` به خاطر `set -e` اجرا نمی‌شود.

```bash
set -euo pipefail
cd /tmp
read -r VERSION
test -n "$VERSION"
curl -fsSLO "https://nodejs.org/dist/latest-v24.x/SHASUMS256.txt"
curl -fsSLO "https://nodejs.org/dist/latest-v24.x/node-${VERSION}-linux-x64.tar.xz"
grep -F "node-${VERSION}-linux-x64.tar.xz" SHASUMS256.txt | sha256sum -c -
sudo tar -xJf "node-${VERSION}-linux-x64.tar.xz" -C /usr/local --strip-components=1
hash -r
/usr/local/bin/node -v
/usr/local/bin/npm -v
```

`node -v` باید همان `VERSION` باشد، از جمله پیشوند `v`. اگر خروجی با `v24.` شروع نمی‌شود، باینری دیگری در PATH جلوتر است. `which -a node` را ببینید و واحد سرویس را با مسیر کامل `/usr/local/bin/node` بنویسید، نه با `env node`.

امضای `SHASUMS256.txt.asc` هم در همان فهرست هست. این صفحه همان بررسی sha256 را الزامی می‌کند. اگر `sha256sum` کلمهٔ `FAILED` چاپ کرد، تاربال را پاک کنید و دوباره بگیرید. آن فایل را باز نکنید.

برای راه PM2، بعد از آماده بودن درخت `/opt/apps/app`:

```bash
sudo /usr/local/bin/npm install -g pm2
/usr/local/bin/pm2 -v
sudo install -d -o deploy -g deploy -m 750 /home/deploy
```

## Configuration

راه systemd. فایل واحد را یک بار بنویسید:

```bash
sudo tee /etc/systemd/system/app.service >/dev/null <<'EOF'
[Unit]
Description=Node application app.example.com
After=network-online.target
Wants=network-online.target
StartLimitIntervalSec=60
StartLimitBurst=5

[Service]
Type=simple
User=deploy
Group=deploy
WorkingDirectory=/opt/apps/app
Environment=NODE_ENV=production
Environment=HOST=127.0.0.1
Environment=PORT=3000
ExecStart=/usr/local/bin/node /opt/apps/app/server.js
Restart=on-failure
RestartSec=5
NoNewPrivileges=true
PrivateTmp=true
LimitNOFILE=65535

[Install]
WantedBy=multi-user.target
EOF
```

`Restart=on-failure` را به `always` عوض نکنید. `always` حتی خروج عمدی را هم زنده می‌کند و با `systemctl stop` مسابقه می‌دهد. `StartLimitBurst=5` جلوی حلقهٔ بی‌نهایت وقتی کد اصلاً بالا نمی‌آید را می‌گیرد. پنج بار در شصت ثانیه، بعد واحد شکست‌خورده می‌ماند تا شما لاگ را بخوانید.

راه PM2، فقط اگر راه systemd را انتخاب نکرده‌اید:

```bash
sudo -u deploy env PATH="/usr/local/bin:$PATH" HOME=/home/deploy pm2 start /opt/apps/app/server.js --name app --cwd /opt/apps/app --time
sudo -u deploy env PATH="/usr/local/bin:$PATH" HOME=/home/deploy pm2 save
sudo env PATH="/usr/local/bin:$PATH" pm2 startup systemd -u deploy --hp /home/deploy
```

خروجی `pm2 startup` ممکن است یک خط `sudo` چاپ کند. همان خط را اجرا کنید، بعد یک بار دیگر `pm2 save` با کاربر `deploy`. واحد ساخته‌شده را با `systemctl cat pm2-deploy` ببینید. آن را با دست بازنویسی نکنید؛ با ارتقای PM2 دوباره تولید می‌شود.

متغیر `HOST` در راه PM2 باید همان `127.0.0.1` بماند. اگر در `pm2 start` نگذاشته‌اید، پیش‌فرض `server.js` همین است. برای صریح بودن:

```bash
sudo -u deploy env PATH="/usr/local/bin:$PATH" HOME=/home/deploy HOST=127.0.0.1 PORT=3000 NODE_ENV=production pm2 restart app --update-env
sudo -u deploy env HOME=/home/deploy pm2 save
```

## Production Example

راه systemd، و خاموش بودن PM2:

```bash
sudo systemctl disable --now pm2-deploy.service || true
sudo -u deploy env HOME=/home/deploy pm2 delete app || true
sudo -u deploy env HOME=/home/deploy pm2 save || true
sudo systemctl daemon-reload
sudo systemctl enable --now app.service
systemctl status app.service --no-pager
curl -fsS http://127.0.0.1:3000/
sudo ss -lptn 'sport = :3000'
```

`|| true` فقط برای میزبانی است که PM2 هرگز نصب نشده و فرمان پاک‌سازی نباید استقرار را متوقف کند. اگر PM2 را انتخاب کرده‌اید، جهت برعکس است:

```bash
sudo systemctl disable --now app.service || true
sudo systemctl enable --now pm2-deploy.service
sudo -u deploy env HOME=/home/deploy pm2 status
curl -fsS http://127.0.0.1:3000/
sudo ss -lptn 'sport = :3000'
```

دقیقاً یک خط listen. فرایند `node`. کاربر در `ps` باید `deploy` باشد: `ps -o user,pid,cmd -C node`. از لبه، `https://app.example.com/` وقتی Nginx صفحهٔ Node وصل باشد همان `ok` را می‌دهد.

یک بار میزبان را reboot کنید یا حداقل `sudo systemctl reboot` را در پنجرهٔ نگهداری بزنید و بدون ورود به شل برنامه، از پروکسی دوباره `curl` کنید. اگر بالا نیامد، `enable` جا مانده است.

## Security Notes

تاربال را قبل از چک‌سام باز نکنید. خروجی `FAILED` را با ادامهٔ «شاید ترمینال غلط چاپ کرده» نادیده نگیرید.

`User=deploy` داخل واحد یعنی حتی اگر کد `process.exit` نکند و کسی در برنامه `listen(80)` بخواهد، روی پورت ممتاز بدون قابلیت اضافه شکست می‌خورد. قابلیت `CAP_NET_BIND_SERVICE` اضافه نکنید. پورت ۸۰ مال Nginx است.

PM2 را با کاربر `root` بالا نیاورید چون راه systemd سخت به نظر می‌رسد. `pm2 startup` بدون `-u deploy` واحدی می‌سازد که برنامه را ریشه اجرا می‌کند و فایل‌های `/opt/apps/app` را مال ریشه می‌کند. نفر بعدی `git pull` با `deploy` را با خطای مجوز از دست می‌دهد.

دو ناظر را «برای اطمینان» روشن نگذارید. اطمینان یعنی بعد از بوت یک pid.

## Troubleshooting

`sha256sum` می‌گوید `FAILED` یا `no properly formatted checksum lines` : یا `VERSION` با نام فایل یکی نیست، یا فایل را نصفه گرفته‌اید. `echo "$VERSION"` را با نام داخل `SHASUMS256.txt` مقایسه کنید. فاصله و پیشوند `v` مهم است.

`status=200/CHDIR` در `systemctl status app.service` یعنی `WorkingDirectory` نیست یا `deploy` حق ورود به آن را ندارد. `ls -ld /opt/apps/app` و `sudo -u deploy test -x /opt/apps/app`.

`EADDRINUSE` در journal یعنی پورت را دیگری گرفته. `sudo ss -lptnp 'sport = :3000'` هر دو pid را نشان می‌دهد. یکی را متوقف و واحدش را disable کنید، بعد فقط یکی را enable کنید.

اگر `pm2 status` برنامه را `online` نشان می‌دهد و `systemctl` هم `active` است، سایت ممکن است درست به نظر برسد در حالی که فقط یکی واقعاً سوکت را دارد و دیگری در حلقهٔ restart است. `systemctl --failed` را ببینید.

`node -v` روی شل شما درست است و واحد می‌گوید `No such file`: واحد PATH شما را ندارد و مسیر `ExecStart` غلط است. باید `/usr/local/bin/node` باشد.

اگر بعد از بوت PM2 بالا است ولی برنامه نیست، `pm2 save` بعد از `start` فراموش شده و `resurrect` فهرست خالی را برگردانده. start و save را تکرار کنید. اگر هر دو ناظر را این وسط روشن کنید، همان تلهٔ پورت برمی‌گردد.

## Best Practices

- `VERSION` را از فهرست `latest-v24.x` کپی کنید و با `SHASUMS256.txt` بسنجید. patch را در سند تیم هم سخت ننویسید مگر برای یک انتشار مشخص که خودتان آرشیو کرده‌اید.
- باینری رسمی زیر `/usr/local`. واحد و PM2 هر دو مسیر کامل `node` را صدا بزنند.
- یا `app.service` با `User=deploy` و `WorkingDirectory` و `Restart=on-failure`، یا PM2 با `pm2 startup systemd`. نه هر دو.
- `HOST=127.0.0.1` را در محیط ناظر صریح بگذارید.
- بعد از انتخاب، یک reboot آزمایشی. `enable` را از روی `status` بخوانید نه از حافظه.
- ارتقای Node یعنی تکرار همین چک‌سام با `VERSION` جدید، نه کپی تاربال از لپ‌تاپ همکار.
