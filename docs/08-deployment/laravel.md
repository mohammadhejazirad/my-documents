---
title: صف، Supervisor و Scheduler
sidebar_position: 5
description: "worker صف Laravel با Supervisor از apt، و schedule:run هر دقیقه با تایمر یا cron، فقط یکی."
---

# صف، Supervisor و Scheduler

## مقدمه

صفحهٔ وب Laravel در [Nginx](/docs/06-nginx/laravel) تمام می‌شود و کار پس‌زمینه تازه شروع می‌شود. job در جدول صف می‌ماند تا یک worker دستور `queue:work` را اجرا کند. کار زمان‌بندی‌شده اجرا نمی‌شود تا کسی هر دقیقه `schedule:run` را بزند. این صفحه هر دو را روی `10.10.1.10` برای درخت `/opt/apps/laravel` روشن می‌کند.

worker را Supervisor از بستهٔ `supervisor` در apt نگه می‌دارد، با `numprocs` بیشتر از یک. زمان‌بند یا تایمر systemd است یا cron کاربر `deploy`. هر دو با هم یعنی کار روزانه دو بار اجرا می‌شود. یکی را انتخاب کنید. پیش‌فرض این صفحه تایمر است چون کنار بقیهٔ واحدها در `systemctl list-timers` دیده می‌شود.

منطقهٔ زمانی میزبان آزمایشگاه `Asia/Tehran` است. خود Laravel ساعت کار زمان‌بندی را از پیکربندی برنامه می‌خواند، نه لزوماً از کرنل. `schedule:run` هر دقیقه بی‌ربط به منطقه اجرا می‌شود؛ ساعت داخل کار، مثلاً اجرای روزانه، تابع همان پیکربندی است و باید `Asia/Tehran` باشد. بعد از عوض کردنش کش پیکربندی را تازه کنید.

## مفهوم اصلی

`queue:work` یک فرایند دراز است. درخواست وب آن را شروع نمی‌کند. اگر در یک شل SSH اجرا شود با قطع اتصال می‌میرد. Supervisor اگر بمیرد یا اگر با `--max-time` خودش خارج شود دوباره بالایش می‌آورد. `--max-time=3600` یعنی حدود یک ساعت بعد از شروع، worker بعد از تمام شدن job جاری خارج می‌شود تا کد تازه را در فرایند بعدی ببیند. `numprocs=2` دو کپی می‌سازد تا یک job طولانی، صف کوتاه را کاملاً بلوکه نکند. بیشتر از دو تا روی این میزبان یعنی دو برابر اتصال دیتابیس به `10.10.1.20`، بی‌آنکه CPU لزوماً جا داشته باشد. عدد را با سقف اتصال دیتابیس انتخاب کنید نه با تعداد هسته.

`stopwaitsecs` باید به worker وقت بدهد job جاری را تمام کند. پیش‌فرض ده ثانیهٔ Supervisor برای job که چند دقیقه طول می‌کشد یعنی کشتن وسط کار. اینجا ۳۶۰۰ ثانیه کنار `--max-time` نشسته است. سیگنال توقف، TERM است و `queue:work` آن را برای خروج تمیز می‌فهمد.

`schedule:run` یک‌بار فرمان‌های سررسیدشده را نگاه می‌کند و خارج می‌شود. باید هر دقیقه صدا زده شود. تایمر `OnCalendar=minutely` با `AccuracySec=1s` است چون دقت پیش‌فرض تایمر systemd ممکن است اجرای دقیقه‌ای را تا حدود یک دقیقه جابه‌جا کند و دو تیک روی هم بیفتند یا یکی دیر شود. `Persistent=true` اگر میزبان خاموش بود، بعد از بوت یک بار جبران می‌کند، نه یک بار به ازای هر دقیقهٔ از دست رفته.

cron معادل همان تیک است. اگر هر دو فعال باشند، `withoutOverlapping` داخل بعضی کارها جلوی هم‌پوشانی را می‌گیرد و بعضی کارها را دو بار اجرا می‌کند. به آن ویژگی تکیه نکنید؛ یکی از دو ناظر زمان را خاموش کنید.

## چرا استفاده می‌شود؟

بدون worker، کاربر در سایت کار را «تمام» می‌بیند و نامه یا تصویر هرگز پردازش نمی‌شود. بدون زمان‌بند، پاک‌سازی و گزارش روزانه فقط روزی که کسی به سرور وصل است اجرا می‌شود. هر دو از جنس فرایندی هستند که باید در لاگ و در بوت دیده شوند، همان‌طور که خود php-fpm دیده می‌شود.

بستهٔ Supervisor در apt واحد systemd خودش را دارد و نیازی به نصب از اسکریپت بیرونی ندارد. worker صف را داخل واحد جداگانهٔ دستی هم می‌شود نوشت؛ این صفحه Supervisor را انتخاب کرده چون `numprocs` و نام فرایندهای هم‌گروه را خودش می‌سازد و ری‌استارت گروهی‌اش برای استقرار ساده‌تر از چند واحد کپی‌شده است.

## Architecture

```text
Nginx و php-fpm
    درخواست وب، job را فقط در صف می‌نویسد
        │
        ▼
Supervisor
  laravel-worker_00
  laravel-worker_01
  هر دو: php artisan queue:work
  کاربر deploy
  /opt/apps/laravel

تایمر laravel-scheduler.timer
  هر دقیقه یک بار
  سرویس oneshot: php artisan schedule:run
        │
        ✕  cron همان کاربر را هم‌زمان روشن نکنید
```

دیتابیس صف روی `db-1.example.internal` یعنی `10.10.1.20` است. این صفحه سرور دیتابیس نصب نمی‌کند. اگر صف `database` است، همان کاربر برنامه باید به آن برسد و بس. worker را با کاربر `root` اجرا نکنید تا «به دیتابیس وصل شود».

## Installation

درخت برنامه باید در `/opt/apps/laravel` باشد و `artisan` با کاربر `deploy` اجرا شود. php باید همان `php8.5` صفحهٔ FPM باشد.

```bash
php -v
sudo -u deploy php /opt/apps/laravel/artisan --version
sudo apt install supervisor
sudo systemctl enable --now supervisor
systemctl is-active supervisor
```

اگر `artisan` از مجوز `.env` یا `storage` خطا داد، همان مجوز صفحهٔ Nginx را برگردانید و اینجا با `chmod 777` رد نشوید. منطقهٔ زمانی میزبان:

```bash
timedatectl
sudo timedatectl set-timezone Asia/Tehran
```

دستور دوم فقط اگر خروجی هنوز تهران نیست و سرویس دیگری روی این میزبان به UTC وابسته نیست.

## Configuration

فایل `/etc/supervisor/conf.d/laravel-worker.conf`:

```ini
[program:laravel-worker]
process_name=%(program_name)s_%(process_num)02d
command=/usr/bin/php /opt/apps/laravel/artisan queue:work --sleep=3 --tries=3 --max-time=3600 --queue=default
directory=/opt/apps/laravel
autostart=true
autorestart=true
stopasgroup=true
killasgroup=true
user=deploy
numprocs=2
redirect_stderr=true
stdout_logfile=/var/log/laravel-worker.log
stopwaitsecs=3600
stopsignal=TERM
```

`/usr/bin/php` روی Ubuntu به نسخهٔ پیش‌فرض توزیع اشاره می‌کند. بعد از نصب 8.5 باید همان 8.5 باشد. با `readlink -f /usr/bin/php` تأیید کنید. اگر به نسخهٔ دیگری رفت، در `command` مسیر `/usr/bin/php8.5` را بگذارید.

تایمر. واحد سرویس:

```bash
sudo tee /etc/systemd/system/laravel-scheduler.service >/dev/null <<'EOF'
[Unit]
Description=Laravel scheduler for app.example.com

[Service]
Type=oneshot
User=deploy
Group=deploy
WorkingDirectory=/opt/apps/laravel
ExecStart=/usr/bin/php artisan schedule:run
EOF
```

و خود تایمر:

```bash
sudo tee /etc/systemd/system/laravel-scheduler.timer >/dev/null <<'EOF'
[Unit]
Description=Run Laravel scheduler every minute

[Timer]
OnCalendar=minutely
AccuracySec=1s
Persistent=true
Unit=laravel-scheduler.service

[Install]
WantedBy=timers.target
EOF
```

جایگزین cron، فقط اگر تایمر را enable نمی‌کنید. فایل را با `sudo crontab -u deploy -e` نگذارید اگر ویرایشگر روی سرور دردسر است؛ این روش مستقیم است:

```bash
echo '* * * * * cd /opt/apps/laravel && /usr/bin/php artisan schedule:run >> /var/log/laravel-schedule.log 2>&1' | sudo crontab -u deploy -
```

گرداندن لاگ worker تا دیسک پر نشود. فایل `/etc/logrotate.d/laravel-worker`:

```bash
sudo tee /etc/logrotate.d/laravel-worker >/dev/null <<'EOF'
/var/log/laravel-worker.log {
    weekly
    rotate 8
    compress
    missingok
    notifempty
    copytruncate
}
EOF
```

## Production Example

تایمر را روشن کنید و cron کاربر `deploy` را خالی نگه دارید:

```bash
sudo crontab -u deploy -r || true
sudo systemctl daemon-reload
sudo systemctl enable --now laravel-scheduler.timer
systemctl list-timers laravel-scheduler.timer --no-pager
sudo supervisorctl reread
sudo supervisorctl update
sudo supervisorctl status
```

وضعیت باید دو خط `RUNNING` برای `laravel-worker_00` و `laravel-worker_01` نشان بدهد. یک job آزمایشی را فقط اگر برنامه فرمان صف خودش را دارد وارد کنید. در غیر این صورت حداقل اجرای زمان‌بند را در journal ببینید:

```bash
sudo systemctl start laravel-scheduler.service
sudo journalctl -u laravel-scheduler.service -n 20 --no-pager
```

خروجی سالم یعنی artisan بدون استثنا خارج شده. خطای اتصال دیتابیس را اینجا با باز کردن پورت دیتابیس به دنیا حل نکنید. از `10.10.1.10` تا `10.10.1.20` باید همان مسیری باز باشد که خود php-fpm استفاده می‌کند.

بعد از کشیدن کد تازه:

```bash
sudo -u deploy php /opt/apps/laravel/artisan config:cache
sudo -u deploy php /opt/apps/laravel/artisan route:cache
sudo -u deploy php /opt/apps/laravel/artisan view:cache
sudo supervisorctl restart laravel-worker:
```

دونقطهٔ ته نام، همهٔ شماره‌های `numprocs` را با هم ری‌استارت می‌کند. `config:cache` متغیر محیط را در فایل کش منجمد می‌کند. تغییر `.env` بدون تکرار `config:cache` در worker دیده نمی‌شود، حتی بعد از restart، اگر کش قدیمی هنوز روی دیسک است. اول کش را تازه کنید، بعد worker را.

وب را همچنان با `curl` به `10.10.1.10:8080` یا از لبه به `https://app.example.com/` چک کنید. سالم بودن صف، سالم بودن HTTP نیست و برعکس.

## Security Notes

`user=deploy` در Supervisor و در تایمر اجباری است. worker ریشه می‌تواند فایل `storage` را مال ریشه کند و php-fpm که `deploy` است دیگر نتواند لاگ بنویسد. این حادثه شبیه «دیسک پر» یا «سایت ۵۰۰» دیده می‌شود.

لاگ `/var/log/laravel-worker.log` ممکن است متن job را داشته باشد. حالت فایل نباید برای همه خوانا باشد. بعد از اولین اجرا `ls -l` بگیرید و اگر `0644` است و محتوا حساس است، در برنامه لاگ را کم کنید نه اینکه worker را ریشه کنید تا logrotate راحت شود. `copytruncate` در پیکربندی بالا برای این است که Supervisor فایل باز را از دست ندهد.

cron را از کاربر `root` نگذارید در حالی که تایمر با `deploy` است. دو هویت یعنی دو مجموعه مجوز و دو بار اجرا.

پورت صف یا یک UI جدا روی `0.0.0.0` نسازید. دیدن صف از راه SSH و `supervisorctl` کافی است.

## Troubleshooting

`supervisorctl status` می‌گوید `FATAL` و `spawn error`:

```bash
sudo supervisorctl tail laravel-worker_00
sudo -u deploy /usr/bin/php /opt/apps/laravel/artisan queue:work --once
```

فرمان دوم همان باینری است بدون Supervisor. اگر آنجا هم می‌میرد، مشکل واحد نیست. معمولاً `.env`، اتصال دیتابیس، یا نبودن جدول صف است. `php artisan migrate --force` را با `deploy` بزنید فقط وقتی می‌دانید این استقرار باید اسکیما را جلو ببرد.

`BACKOFF` یعنی فرایند سریع می‌میرد و Supervisor فاصله می‌اندازد. همان `--once` را بزنید.

تایمر در `list-timers` نیست: `enable` نشده یا فایل در `/etc/systemd/system` نیست. `systemctl cat laravel-scheduler.timer`. اگر next خالی است و `n/a` می‌بینید، واحد را reload کنید.

کار زمان‌بندی دو بار در لاگ برنامه ظاهر می‌شود:

```bash
systemctl is-enabled laravel-scheduler.timer
sudo crontab -u deploy -l
```

اگر هر دو خروجی زنده دارند، cron را با `sudo crontab -u deploy -r` بردارید و تایمر را نگه دارید. jobهایی که دو بار اثر مالی یا نامه داشته‌اند را از لاگ برنامه درآورید؛ خاموش کردن ناظر دوم اثر قبلی را پاک نمی‌کند.

worker کد جدید را نمی‌بیند: یا `max-time` هنوز نرسیده و restart نزده‌اید، یا `config:cache` کهنه است. `supervisorctl restart laravel-worker:` بعد از کش.

`stopwaitsecs` اگر به ۱۰ برگشته باشد، موقع استقرار jobها ناقص می‌مانند و در صف دوباره ظاهر می‌شوند اگر درایور از retry پشتیبانی کند. مقدار ۳۶۰۰ را در `supervisorctl avail` و فایل تأیید کنید. بعد از تغییر فایل، `reread` و `update` لازم است. reload خود Nginx این فایل را نمی‌خواند.

## Best Practices

- دو worker با `numprocs=2` روی این میزبان، نه یک عدد دلبخواه. اتصال دیتابیس را با همین عدد جمع بزنید.
- `--max-time=3600` و `stopwaitsecs=3600` تا هم کد تازه شود هم job جاری با TERM کشته نشود.
- زمان‌بند هر دقیقه، یا تایمر با `AccuracySec=1s` یا cron. هرگز هر دو.
- کاربر `deploy` برای صف و برای `schedule:run`. بعد از تغییر `.env` اول `config:cache`، بعد restart گروه worker.
- لاگ را بچرخانید. دیسک پر، صف را هم متوقف می‌کند چون worker نمی‌تواند بنویسد.
- وب را با صفحهٔ Nginx سالم نگه دارید. این صفحه جایگزین `root` برابر `public` نیست.
