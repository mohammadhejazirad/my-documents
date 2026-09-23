---
title: بکاپ و بازیابی MySQL
sidebar_position: 4
description: "دامپ منطقی MySQL 8.4 با mysqldump، بازیابی، و آزمون app_restore قبل از اعتماد به فایل."
---

# بکاپ و بازیابی MySQL

## مقدمه

این صفحه از MySQL 8.4 روی `db-1` دامپ منطقی می‌گیرد و همان دامپ را برمی‌گرداند. مسیر عملیاتی `mysqldump` است. دامپی که یک‌بار داخل دیتابیس `app_restore` برنگشته و تعداد سطرش با `app` مقایسه نشده، بکاپ حساب نمی‌شود. نصب سرور در [MySQL روی سرور](./mysql-server.md) است. اگر داده داخل کانتینر [MySQL در Docker](./mysql-docker.md) است، همان دستورهای `mysqldump` را با `docker compose exec` اجرا کنید؛ تفاوت در بخش مثال تولید آمده است.

ابزار `mysqlpump` در MySQL 8.0.34 منسوخ شد و در 8.4 حذف شده. روی این سرور باینری‌اش را انتظار نداشته باشید و جریان تازه را روی آن نسازید. MySQL Shell دستور `util.dumpInstance` را برای دامپ موازی دارد و بستهٔ جدای `mysql-shell` است. این فصل آن را نصب نمی‌کند. اگر روزی لازم شد، سند خود Shell را با همان نسخهٔ نصب‌شده بخوانید و همچنان یک بازیابی واقعی امتحان کنید. مسیر روزمرهٔ ما فایل SQL از `mysqldump` است.

## مفهوم اصلی

`mysqldump` یک نسخهٔ منطقی می‌سازد: دستور `CREATE` و `INSERT`، به‌علاوهٔ روال و تریگر و رویداد اگر فلگ‌هایشان را بدهید. فایل حاصل را می‌شود خواند و روی MySQL 8.4 دیگری بار کرد. این با کپی پوشهٔ `/var/lib/mysql` فرق دارد. کپی خام در حالی که `mysqld` روشن است ناسازگار است، چون InnoDB وسط نوشتن است.

فلگ `--single-transaction` برای InnoDB یک تراکنش خواندنی یکنواخت باز می‌کند و جدول را برای مدت دامپ قفل سراسری نمی‌کند. با `MyISAM` این یکنواختی را نمی‌دهد. فلگ را با `--lock-all-tables` ترکیب نکنید. `--routines` روال و تابع را می‌آورد، `--triggers` تریگر را، `--events` رویداد زمان‌بندی‌شده را. بدون این سه تا، بازیابی اسکیما را نصفه برمی‌گرداند و خطا هم نمی‌دهد.

دو شکل دامپ این‌جا استفاده می‌شود و نباید قاطی شوند.

| شکل | فلگ | محتویات | کجا مصرف می‌شود |
| --- | --- | --- | --- |
| فایل شبانه | `--databases app` | `CREATE DATABASE` و `USE app` | ساخت مجدد `app` روی سرور خالی |
| آزمون روی همان سرور | بدون `--databases` | فقط جدول و روال همان دیتابیس | لوله شدن به `app_restore` |

اگر فایل شبانه را که `USE app` دارد به `mysql app_restore` بدهید، کلاینت وسط فایل به دیتابیس `app` برمی‌گردد و آزمون شما روی دادهٔ واقعی می‌نویسد. این خطا را با دقت در بخش مثال جلویش را می‌گیریم.

`mysqldump` وقتی با کاربر سیستم `root` و سوکت محلی اجرا شود، به خاطر `auth_socket` بدون رمز به حساب `root` MySQL وصل می‌شود. از حساب `ops` باید با `sudo` باشد. کاربر `app_user` حق دامپ ندارد و نباید بگیرد.

لاگ باینری که در کانفیگ سرور هفت روز عمر دارد، فاصلهٔ بین دو دامپ را برای بازیابی نقطه‌ای نگه می‌دارد. این صفحه خود بازیابی نقطه‌ای را اجرا نمی‌کند. بدون فایل باینری سالم و بدون تمرین، ادعای point-in-time recovery نداشته باشید. دامپ منطقی نقطهٔ مشخص روزانه است.

## چرا استفاده می‌شود؟

حذف تصادفی جدول، ارتقای خراب، و دیسک پر، هر سه را با یک فایل SQL قابل فهم بهتر از پشتیبان مبهم جواب می‌دهند. فایل منطقی به نسخهٔ patch دقیق باینری InnoDB وابسته نیست و روی کانتینر `mysql:8.4` هم بار می‌شود. هزینهٔ آن زمان و حجم است: دیتابیس بزرگ ساعت‌ها طول می‌کشد و تا تمام نشود نقطهٔ سازگارش همان لحظهٔ شروع تراکنش است.

برای دیتابیس چندده گیگابایتی، دامپ منطقی روزانه هنوز به‌درد ممیزی و انتقال می‌خورد ولی هدف زمان بازیابی را زودتر با نسخهٔ فیزیکی و لاگ باینری طراحی کنید. آن طراحی را وقتی شروع کنید که همین آزمون منطقی را قبلاً گذرانده باشید. تیمی که `mysqldump` را برنگردانده، ابزار پیچیده‌تر را هم برنمی‌گرداند.

## Architecture

```text
cron.root روی db-1
   └── /usr/local/sbin/backup-mysql-app.sh
         │  mysqldump --single-transaction --routines --triggers --events
         │  --databases app
         ▼
       /var/backups/mysql/app-YYYY-MM-DD-HHMM.sql.gz     مجوز 0600
         │
         ├── کپی بیرون از سرور   (فصل بکاپ سرور، این صفحه فایل را همین‌جا می‌سازد)
         └── آزمون، دستور جدا، بدون --databases
               mysqldump app | mysql app_restore
               مقایسهٔ COUNT
               DROP DATABASE app_restore
```

دامپ شبانه را داخل آزمون به `app_restore` وارد نمی‌کنیم. آزمون یک دامپ دوم، بدون `USE`، می‌گیرد تا `app` دست نخورد. هر دو از یک سرور زنده و با `--single-transaction` هستند. اگر تعداد سطر فرق کرد، یا نوشتن وسط دامپ را بد فهمیده‌اید یا دامپ خطا داده و `pipefail` جایی خاموش بوده است.

فضای خالی باید دست‌کم به اندازهٔ حجم دادهٔ منطقی باشد. دامپ SQL از دادهٔ باینری بزرگ‌تر است و فشردهٔ gzip کوچک‌تر. روی دیسک شلوغ اول `df` را در اسکریپت می‌سنجیم.

## Installation

بستهٔ `mysql-server` کلاینت `mysqldump` را هم می‌آورد. نصب جدا لازم نیست. وجودش را ببینید.

```bash
mysqldump --version
sudo test -S /var/run/mysqld/mysqld.sock && echo socket-ok
sudo install -d -o root -g root -m 0750 /var/backups/mysql
```

خروجی نسخه باید خط `8.4` را نشان دهد، هم‌خانواده با `mysql --version`. اگر فرمان پیدا نشد، `mysql-client` با سرور نصب نشده و باید به صفحهٔ نصب برگردید، نه اینکه کلاینت را از مخزن دیگری بیاورید.

اسکریپت شبانه. فقط ریشه اجراش می‌کند. داخل اسکریپت `sudo` نیست.

```bash
sudo tee /usr/local/sbin/backup-mysql-app.sh >/dev/null <<'EOF'
#!/usr/bin/env bash
set -euo pipefail
umask 077

dest="/var/backups/mysql"
stamp="$(date +%F-%H%M)"
mkdir -p "$dest"

avail="$(df --output=avail -B1 /var/backups | tail -n 1)"
if [ "$avail" -lt 1073741824 ]; then
  echo "mysql backup: less than 1 GiB free on /var/backups" >&2
  exit 1
fi

mysqldump \
  --single-transaction \
  --routines \
  --triggers \
  --events \
  --databases app \
  --result-file="${dest}/app-${stamp}.sql"

gzip -f "${dest}/app-${stamp}.sql"
find "$dest" -type f -name 'app-*.sql.gz' -mtime +14 -print -delete
echo "mysql backup ok ${dest}/app-${stamp}.sql.gz"
EOF
sudo chmod 0750 /usr/local/sbin/backup-mysql-app.sh
sudo tee /etc/cron.d/mysql-app-backup >/dev/null <<'EOF'
SHELL=/bin/bash
PATH=/usr/sbin:/usr/bin:/sbin:/bin
30 2 * * * root /usr/local/sbin/backup-mysql-app.sh >> /var/log/mysql-backup.log 2>&1
EOF
sudo chmod 0644 /etc/cron.d/mysql-app-backup
```

آستانهٔ یک گیبیابایت آزاد برای آزمایشگاه است. اگر دامپ غیرفشردهٔ شما بزرگ‌تر از این است، عدد را از روی یک دامپ واقعی بالا ببرید. `find` فقط فایل‌های با پیشوند `app-` و پسوند `.sql.gz` قدیمی‌تر از ۱۴ روز را حذف می‌کند. مسیر را گسترده‌تر نکنید.

یک‌بار با دست اجرا کنید.

```bash
sudo /usr/local/sbin/backup-mysql-app.sh
sudo ls -l /var/backups/mysql
sudo gzip -dc /var/backups/mysql/app-*.sql.gz | head -n 8
```

سرِ فایل باید `MySQL dump` و `Server version` خط 8.4 و `Database: app` باشد. مجوز فایل `0600` و مالک `root` است. اگر `head` خالی است، gzip خراب است و اسکریپت نباید با کد صفر تمام شده باشد؛ `set -o pipefail` در اجرای شبانه هست، ولی این لولهٔ نمایش را شما زده‌اید و شکست `gzip` را باید از روی نبودن سربرگ بفهمید.

## Configuration

فلگ‌ها را در اسکریپت ثابت کرده‌ایم تا cron و اجرای دستی از هم جدا نشوند. این‌ها را عوض نکنید مگر دلیلشان را بنویسید.

| فلگ | دلیل |
| --- | --- |
| `--single-transaction` | خواندن یکنواخت InnoDB بدون قفل کلی |
| `--routines` | روال‌هایی که برنامه یا مهاجرت ساخته |
| `--triggers` | تریگر جزو اسکیماست |
| `--events` | رویداد زمان‌بندی‌شده داخل دامپ می‌ماند |
| `--databases app` | فایل شبانه خودش دیتابیس را می‌سازد |
| `--result-file` | فایل با مجوز `umask 077` همین اسکریپت ساخته می‌شود، نه با ریدایرکت شل کاربر دیگر |

`--all-databases` را برای بکاپ شبانهٔ این برنامه استفاده نکنید. دیتابیس‌های سیستم `mysql`، `sys` و `performance_schema` را داخل فایل برنامه می‌ریزد و بازیابی‌اش روی یک سرور زنده خطرناک است. حساب‌ها را این دامپ برنمی‌گرداند. بعد از بازیابی فاجعه باید `CREATE USER` صفحهٔ سرور را دوباره اجرا کنید. این را در دفتر بازیابی بنویسید تا کسی فکر نکند فایل SQL کاربر `app_user` را هم ساخته است.

اگر چند دیتابیس برنامه دارید، نامشان را صریح پشت `--databases` ردیف کنید. هنوز `--all-databases` نزنید.

نگهداری ۱۴ روز روی همان دیسک فقط حافظهٔ محلی خطای انسانی است. کپی خارج از سرور را این cron انجام نمی‌دهد. تا آن کپی نباشد، سوختن دیسک `db-1` هر ۱۴ فایل را با هم می‌برد.

## Production Example

اول مطمئن شوید دادهٔ نمونه هست. اگر صفحهٔ سرور را اجرا کرده‌اید دو سطر در `orders` هست.

```bash
sudo mysql --table -e "SELECT COUNT(*) AS app_orders FROM app.orders;"
```

آزمون بازیابی روی همان سرور، با دامپ بدون `--databases`. این فرمان فایل شبانه را وارد نمی‌کند.

```bash
sudo mysql --execute="DROP DATABASE IF EXISTS app_restore; CREATE DATABASE app_restore CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci;"
sudo mysqldump --single-transaction --routines --triggers --events app | sudo mysql app_restore
sudo mysql --execute="SELECT 'app' AS src, COUNT(*) AS n FROM app.orders UNION ALL SELECT 'app_restore', COUNT(*) FROM app_restore.orders;"
```

خروجی سالم وقتی دادهٔ نمونه سر جایش است:

```text
src	n
app	2
app_restore	2
```

اگر عددها یکی نبود، `app_restore` را همان لحظه حذف نکنید. اول خروجی خطای `mysqldump` را بردارید. اگر یکی بود، کپی آزمون را پاک کنید چون دادهٔ واقعی است و کاربر اضافه‌ای ندارد ولی روی دیسک مانده است.

```bash
sudo mysql --execute="DROP DATABASE app_restore;"
```

بازیابی فاجعه، روی سرور خالی یا کانتینر موقتی، از فایل شبانه است. این یکی `USE app` دارد و دیتابیس `app` را می‌سازد. آن را روی `db-1` زنده که همین الان `app` را دارد اجرا نکنید.

روی `docker-1`، جدا از volume تولید:

```bash
sudo docker volume create mysql-restore-test
sudo docker run -d --name mysql-restore --restart no \
  -e MYSQL_ROOT_PASSWORD=change-me \
  -p 127.0.0.1:3307:3306 \
  -v mysql-restore-test:/var/lib/mysql \
  mysql:8.4
```

صبر کنید تا لاگ `ready for connections` بدهد. فایل دامپ را به آن میزبان کپی کنید و بار کنید. رمز را در خط فرمان نگذارید؛ کلاینت رسمی داخل کانتینر با متغیر محیطی خودش مقداردهی شده و این دستور از فایل گزینه‌ها استفاده می‌کند تا رمز در `ps` نیاید.

```bash
sudo docker exec mysql-restore sh -c 'printf "%s\n" "[client]" "user=root" "password=${MYSQL_ROOT_PASSWORD}" > /tmp/client.cnf && chmod 0600 /tmp/client.cnf'
sudo docker cp /var/backups/mysql/app-STAMP.sql.gz mysql-restore:/tmp/app.sql.gz
sudo docker exec mysql-restore sh -c 'gzip -dc /tmp/app.sql.gz | mysql --defaults-extra-file=/tmp/client.cnf'
sudo docker exec mysql-restore mysql --defaults-extra-file=/tmp/client.cnf --execute="SELECT COUNT(*) AS restored_orders FROM app.orders;"
```

به‌جای `app-STAMP` نام واقعی فایل را بگذارید. عدد باید با `app` روی `db-1` یکی باشد. سپس ظرف آزمون را دور بریزید.

```bash
sudo docker rm -f mysql-restore
sudo docker volume rm mysql-restore-test
```

اگر Docker روی `db-1` نیست، آزمون `app_restore` همان اثبات این فصل است و بازیابی فاجعه را روی یک VM دیگر با بستهٔ `mysql-server` تکرار کنید: فایل gzip را ببرید، `gzip -dc file.sql.gz | mysql` را با `sudo` بزنید، `SELECT COUNT(*)` را مقایسه کنید.

یک روال کوچک، تا فلگ `--routines` فقط تزئینی نباشد. بعد از ساختنش هر دو دامپ را یک‌بار دیگر بگیرید.

```bash
sudo env MYSQL_HISTFILE=/dev/null mysql app <<'SQL'
DELIMITER $$
CREATE PROCEDURE touch_order(IN p_id BIGINT UNSIGNED)
BEGIN
  UPDATE orders SET qty = qty WHERE id = p_id;
END$$
DELIMITER ;
SQL
```

بعد از آزمون، وجود روال در `app_restore` را ببینید.

```bash
sudo mysql -N -e "SELECT COUNT(*) FROM information_schema.routines WHERE routine_schema = 'app_restore' AND routine_name = 'touch_order';"
```

باید `1` باشد. اگر `0` است، فلگ `--routines` از فرمان آزمون حذف شده.

## Security Notes

- فایل دامپ نام مشتری، سفارش و هر ستونی که در `app` است را دارد. `umask 077` و مسیر `0750` حداقل کار است. آن را به `/tmp` با مجوز پیش‌فرض نریزید.
- کپی آزمون `app_restore` را بعد از مقایسه حذف کنید. رها کردنش یک نسخهٔ دوم بدون نظارت است.
- `app_user` را به `PROCESS`، `RELOAD` یا `BACKUP_ADMIN` ارتقا ندهید تا خودش دامپ بگیرد. دامپ کار ریشهٔ سوکت است.
- اسکریپت را با `bash -x` روی سرور تولید اجرا نکنید. اگر روزی رمزی وارد اسکریپت شد، `set -x` آن را در لاگ می‌نویسد. نسخهٔ فعلی اسکریپت رمز ندارد چون `auth_socket` است؛ این را با اضافه کردن `-p` خراب نکنید.
- بازیابی فایل شبانه روی سرور زنده `app` را از نو می‌نویسد. اسم فایل و میزبان را در تیکت بنویسید و دستور را از روی حافظه نزنید.
- `change-me` روی کانتینر آزمون را بعد از `docker rm` دیگر جایی نگذارید. volume آزمون باید حذف شده باشد.
- دامپ را در مخزن گیت برنامه کامیت نکنید.

## Troubleshooting

| نشانه | علت محتمل | کار |
| --- | --- | --- |
| `app` بعد از آزمون خالی یا دو برابر شده | فایل `--databases` را داخل `app_restore` ریخته‌اید و `USE app` برگشته | بازیابی را قطع کنید. از دامپ شبانه روی یک کانتینر خالی برگردانید. دیگر این اشتباه را روی تولید تکرار نکنید |
| `mysqldump: Error 1044` | با کاربر `app_user` دامپ گرفته‌اید | `sudo` و سوکت ریشه |
| `Access denied` برای `sudo mysqldump` | ریشه دیگر `auth_socket` نیست | صفحهٔ سرور، بخش عیب‌یابی پلاگین. رمز را به اسکریپت اضافه نکنید تا پلاگین درست شود |
| فایل gzip هست ولی `gzip -t` خطا می‌دهد | دیسک وسط کار پر شده | `gzip -t` را به اسکریپت بعد از فشرده‌سازی اضافه نکنید اگر همین حالا جا نیست؛ اول جا خالی کنید. فایل خراب را در چرخش ۱۴ روزه تنها نسخه نگذارید |
| تعداد سطر `app_restore` کمتر است | نوشتن جدید طبیعی است، یا دامپ وسط خطا قطع شده | اختلاف کوچک بلافاصله بعد از دامپ را با زمان دامپ مقایسه کنید. اختلاف همراه با خطای SQL یعنی لوله بدون `pipefail` بوده |
| `Unknown database 'app'` | صفحهٔ سرور اجرا نشده | اول دیتابیس را بسازید |
| cron هیچ فایلی نساخته | `cron.d` یا PATH | `sudo grep mysql-backup /var/log/syslog` یا `journalctl -u cron --since today` و خود اسکریپت را با دست بزنید |
| سرِ دامپ نسخهٔ 8.0 یا 5.7 است | کلاینت `mysqldump` از جای دیگری در PATH است | `which mysqldump` باید زیر `/usr/bin` بستهٔ Ubuntu باشد |

سن اسکریپت را ببینید.

```bash
sudo tail -n 20 /var/log/mysql-backup.log
systemctl is-enabled cron || systemctl is-enabled crond
```

یکی از یونیت‌های cron باید enable باشد. Ubuntu 26.04 معمولاً `cron` است.

## Best Practices

- هر تغییر اسکریپت را با یک اجرای دستی و یک `gzip -t` تمام کنید.
- هفته‌ای یک‌بار آزمون `app_restore` را واقعاً اجرا کنید و دو عدد `COUNT` را در تیکت بنویسید. وجود فایل در `/var/backups/mysql` کافی نیست.
- فایل شبانه را روی سرور زندهٔ دارای `app` ریستور نکنید. ریستور فاجعه میزبان خالی می‌خواهد.
- `--single-transaction` را برندارید تا دامپ «سریع‌تر و مطمئن‌تر» شود. بدون آن دامپ InnoDB شلوغ ناسازگار است یا قفل طولانی می‌گیرد، بسته به فلگ جایگزین.
- کاربر و مجوز را جدا از دامپ داده نگه دارید. دفتر بازیابی باید `CREATE USER` را هم فهرست کند.
- نگهداری ۱۴ روز را با ظرفیت دیسک یکی کنید. اگر دامپ روزانه ۵ گیگابایت فشرده است، ۱۴ نسخه ۷۰ گیگابایت می‌خواهد و آستانهٔ فضای خالی اسکریپت باید بیشتر از یک گیگابایت باشد.
- `mysqlpump` را از آموزش قدیمی به این سرور برنگردانید. در 8.4 وجود ندارد.
- کپی بیرون از `db-1` را فراموش نکنید. این صفحه فقط ساخت و اثبات فایل را تمام می‌کند.
