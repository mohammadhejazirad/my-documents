---
title: MySQL روی سرور
sidebar_position: 2
description: "نصب MySQL 8.4 LTS روی Ubuntu 26.04، کاربر caching_sha2_password، و شنود محدود db-1."
---

# MySQL روی سرور

## مقدمه

این صفحه Oracle MySQL 8.4 LTS را با بستهٔ `mysql-server` روی `db-1.example.internal` یعنی `10.10.1.20` نصب می‌کند. توزیع Ubuntu 26.04 است. برنامه روی `app-1` با آدرس `10.10.1.10` به دیتابیس `app` و کاربر `app_user` وصل می‌شود. کانتینر در [MySQL در Docker](./mysql-docker.md) است و دامپ در [بکاپ و بازیابی MySQL](./mysql-backup-restore.md). اگر هنوز بین موتورها مردد هستید از [نقشهٔ دیتابیس](./index.md) شروع کنید.

ورود مدیر محلی `sudo mysql` است، چون ریشه با `auth_socket` ساخته می‌شود. پلاگین `mysql_native_password` را فعال نمی‌کنیم. کاربر برنامه `caching_sha2_password` می‌گیرد.

## مفهوم اصلی

MySQL 8.4 خط پشتیبانی بلندمدت اوراکل است و در کامپوننت universe همین Ubuntu هست. مخزن جدا لازم نیست. MariaDB 11.8 هم در کامپوننت main وجود دارد و محصول دیگری است: دستور، فایل کانفیگ و این صفحه را برایش به کار نبرید و بستهٔ `mariadb-server` را کنار `mysql-server` نصب نکنید. هر دو پورت ۳۳۰۶ می‌خواهند.

روی بسته‌بندی Ubuntu حساب `root` پلاگین `auth_socket` دارد. یعنی کاربر سیستم `root` از راه سوکت محلی بدون رمز وارد می‌شود و `mysql -u root -p` از یک حساب معمولی خطای دسترسی می‌دهد. این رفتار را به رمز عبوری که در اینترنت نمونه شده عوض نکنید.

حساب برنامه رمز دارد و پلاگینش `caching_sha2_password` است، که پیش‌فرض MySQL 8 است. کلاینت قدیمی که فقط `mysql_native_password` بلد است باید عوض شود. PHP 8.5 با `mysqlnd` و درایورهای فعلی Node این پلاگین را بلدند. در 8.4 آن پلاگین قدیمی به‌صورت پیش‌فرض بارگذاری نیست و ما بارگذاری‌اش نمی‌کنیم.

شنود پیش‌فرض بسته `127.0.0.1` است. چون برنامه روی ماشین دیگری است، در کانفیگ همین صفحه شنونده `127.0.0.1` و `10.10.1.20` است، نه `0.0.0.0`. مدیریت همچنان از سوکت محلی انجام می‌شود و به این آدرس‌ها وابسته نیست.

موتور جدول `InnoDB` است. جدول `MyISAM` برای دادهٔ برنامه ساخته نمی‌شود چون قفل و بازیابی‌اش با `--single-transaction` جور نیست.

## چرا استفاده می‌شود؟

برنامه‌ای که از قبل SQL مخصوص MySQL دارد، یا تیم نمی‌خواهد برای یک سرویس موجود PostgreSQL را از نو یاد بگیرد، روی همین بسته بالا می‌آید و تا وقتی خط 8.4 دریافت به‌روزرسانی می‌کند با `apt` جلو می‌رود. نیازی به مخزن `dev.mysql.com` نیست و نباید دو منبع بسته را قاطی کرد.

برای برنامهٔ رابطه‌ای تازه، اگر قید و نوع داده مهم‌تر از سازگاری با MySQL قدیمی است، [PostgreSQL روی سرور](./postgresql-server.md) انتخاب صادقانه‌تری است. MySQL اینجا به‌خاطر سازگاری و بستهٔ آماده است، نه به‌خاطر اینکه تنها موتور درست است.

## Architecture

```text
ops روی db-1
   │  sudo mysql
   │  سوکت /var/run/mysqld/mysqld.sock
   │  حساب root با auth_socket
   ▼
mysqld  (unit: mysql.service، کاربر سیستم mysql)
   ├── 127.0.0.1:3306          آزمون محلی TCP
   ├── 10.10.1.20:3306         فقط از app-1، پشت UFW
   ├── 127.0.0.1:33060         پروتکل X، اگر بسته روشن گذاشته باشد
   ├── داده‌ها /var/lib/mysql
   ├── خطا /var/log/mysql/error.log
   └── کند /var/log/mysql/mysql-slow.log

app-1 10.10.1.10
   └── mysql://app_user@10.10.1.20:3306/app
       حساب فقط میزبان 10.10.1.10
       پلاگین caching_sha2_password
```

فایل بسته `/etc/mysql/mysql.conf.d/mysqld.cnf` است. تغییر ما در `/etc/mysql/mysql.conf.d/99-app.cnf` می‌نشیند تا ارتقای بسته کامنت‌های خودش را برنگرداند و مقدار ما، چون بعد از آن خوانده می‌شود، بماند. `!includedir` فایل‌ها را به ترتیب نام می‌خواند.

## Installation

روی `db-1` با کاربر `ops`:

```bash
sudo apt update
apt-cache policy mysql-server
sudo apt install mysql-server
sudo systemctl enable --now mysql
sudo systemctl status mysql --no-pager
mysql --version
sudo ss -lptn 'sport = :3306 or sport = :33060'
```

`apt-cache policy` باید کاندیدا را از `resolute/universe` نشان دهد و خط نسخه `8.4` باشد. شمارهٔ patch را از همین خروجی بردارید؛ نمونهٔ زیر شکل خروجی است و patch جدیدتر روی خط 8.4 هنوز همین صفحه است.

```text
mysql  Ver 8.4.8-0ubuntu1 for Linux on x86_64 ((Ubuntu))
```

یونیت سالم `active (running)` است و خط وضعیت `Server is operational` دارد. بلافاصله وارد شوید و پلاگین ریشه را ببینید. تاریخچه را خاموش کنید تا دستوری که بعداً رمز دارد در `/root/.mysql_history` نماند.

```bash
sudo env MYSQL_HISTFILE=/dev/null mysql --table -e "SELECT user, host, plugin FROM mysql.user WHERE user IN ('root','debian-sys-maint');"
```

خروجی مورد انتظار:

```text
+------------------+-----------+-------------+
| user             | host      | plugin      |
+------------------+-----------+-------------+
| debian-sys-maint | localhost | auth_socket |
| root             | localhost | auth_socket |
+------------------+-----------+-------------+
```

اگر `root` چیز دیگری بود، قبل از ادامه متوقف شوید. احتمال زیاد یک نصب قبلی یا اسکریپت hardening پلاگین را عوض کرده است. حساب `debian-sys-maint` را حذف نکنید؛ اسکریپت نگهداری بسته از آن استفاده می‌کند.

`sudo mysql_secure_installation` را فقط اگر خروجی بالا هنوز `auth_socket` است اجرا کنید. اعتبارسنجی رمز را اگر روشن می‌کنید، دیگر از `change-me` استفاده نکنید چون رد می‌شود. کاربر ناشناس و دیتابیس `test` را حذف کنید. اگر اسکریپت پیشنهاد کرد ریشه را به `mysql_native_password` ببرد، نه بگویید. بعد از اسکریپت همان `SELECT` پلاگین را دوباره بگیرید.

## Configuration

فایل دراپ‌این را بسازید. مقدار `innodb_buffer_pool_size` برای میزبانی است که `free -h` حدود ۴ گیبیابایت RAM نشان می‌دهد و MySQL سرویس اصلی آن است. این عدد حدود یک‌چهارم آن RAM است. روی VM یک گیبیابایتی نگذارید؛ همان پیش‌فرض ۱۲۸ مگابایت بسته سالم‌تر است. روی میزبان بزرگ‌تر هم این ۱ گیگابایت را کور کپی نکنید: برای سرور اختصاصی MySQL معمولاً از حدود یک‌چهارم RAM شروع می‌کنند و با مصرف واقعی و دیسک تنظیم می‌کنند.

```bash
sudo tee /etc/mysql/mysql.conf.d/99-app.cnf >/dev/null <<'EOF'
[mysqld]
bind-address = 127.0.0.1,10.10.1.20
mysqlx-bind-address = 127.0.0.1
character-set-server = utf8mb4
collation-server = utf8mb4_0900_ai_ci
default-time-zone = +00:00
innodb_buffer_pool_size = 1G
slow_query_log = ON
slow_query_log_file = /var/log/mysql/mysql-slow.log
long_query_time = 1
server-id = 20
binlog_expire_logs_seconds = 604800
EOF
sudo mysqld --validate-config
sudo systemctl restart mysql
sudo systemctl status mysql --no-pager
```

`mysqld --validate-config` اگر کانفیگ خراب باشد قبل از ری‌استارت غیرصفر خارج می‌شود. `bind-address` چند مقدار را از MySQL 8.0.13 به این طرف می‌فهمد. `0.0.0.0` ننویسید. پروتکل X روی پورت ۳۳۰۶۰ فقط localhost می‌ماند چون برنامه به آن نیاز ندارد.

لاگ باینری در بستهٔ Ubuntu برای 8.4 از قبل روشن است. ما فقط عمرش را هفت روز می‌گذاریم تا دیسک با بایگانی بی‌نهایت پر نشود. بازیابی نقطه‌ای بین دو دامپ به همین فایل‌ها وابسته است؛ اگر دامپ روزانه دارید، هفت روز جا برای عقب‌گرد می‌گذارد. پاک کردنشان با دست کار بازیابی را سوراخ می‌کند.

منطقهٔ زمانی سرور `+00:00` است. سیستم‌عامل `Asia/Tehran` می‌ماند. `CURRENT_TIMESTAMP` در ستون‌ها UTC است و برنامه برای نمایش تبدیل می‌کند.

کاربر و دیتابیس. این دستورها را داخل نشست `mysql` نزنید اگر تاریخچه روشن است.

```bash
sudo env MYSQL_HISTFILE=/dev/null mysql <<'SQL'
CREATE DATABASE app CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci;
CREATE USER 'app_user'@'10.10.1.10' IDENTIFIED WITH caching_sha2_password BY 'change-me';
GRANT SELECT, INSERT, UPDATE, DELETE ON app.* TO 'app_user'@'10.10.1.10';
FLUSH PRIVILEGES;
SQL
```

:::warning رمز نمونه
`change-me` رمز آزمایشگاه است. روی سرور واقعی قبل از `CREATE USER` عوضش کنید. بعد از ساخت، خط دارای `IDENTIFIED` نباید در تاریخچه مانده باشد. فایل محیطی برنامه روی `app-1` مجوز `0600` و مالک `deploy` است.
:::

حساب را بسنجید.

```bash
sudo env MYSQL_HISTFILE=/dev/null mysql --table -e "SELECT user, host, plugin FROM mysql.user WHERE user = 'app_user'; SHOW GRANTS FOR 'app_user'@'10.10.1.10';"
```

باید یک سطر باشد: میزبان `10.10.1.10` و پلاگین `caching_sha2_password`. در فهرست مجوزها `ALL` و `GRANT OPTION` نباید باشد. تغییر اسکیما کار `sudo mysql` است، نه کار کاربر برنامه. اگر فریم‌ورک در استقرار `CREATE TABLE` می‌زند، برای همان کار یک حساب مهاجرت جدا بسازید و بعد جمعش کنید؛ حق DDL را به حساب دائمی برنامه ندهید.

فایروال. ورودی پیش‌فرض باید بسته باشد. SSH را نبندید.

```bash
sudo ufw allow OpenSSH
sudo ufw allow from 10.10.1.10 to any port 3306 proto tcp comment 'app-1 mysql'
sudo ufw status verbose
```

قانون کلی `allow 3306` نگذارید. جزئیات سیاست UFW در [UFW](/docs/10-security/ufw) است. اگر UFW هنوز غیرفعال است، قبل از `enable` مطمئن شوید قانون SSH را دارید و نشست فعلی‌تان قطع نمی‌شود.

شنود را بعد از ری‌استارت ببینید.

```bash
sudo ss -lptn 'sport = :3306'
sudo mysql --table -e "SHOW VARIABLES WHERE Variable_name IN ('bind_address','default_authentication_plugin','mysql_native_password');"
```

`SHOW VARIABLES` برای پلاگین پیش‌فرض در 8.4 ممکن است نام `default_authentication_plugin` را نداشته باشد چون آن متغیر برداشته شده و سیاست احراز هویت جایش را گرفته. اگر خطا داد، این را بزنید.

```bash
sudo mysql --table -e "SHOW VARIABLES LIKE 'authentication_policy';"
```

سیاست باید `caching_sha2_password` را اول نشان دهد و `mysql_native_password` را به‌صورت فعال طلب نکند. اگر کسی `mysql_native_password=ON` را در کانفیگ گذاشته، آن خط را بردارید و ری‌استارت کنید.

## Production Example

اسکیما را به‌عنوان مدیر بسازید، نه با `app_user`.

```bash
sudo env MYSQL_HISTFILE=/dev/null mysql app <<'SQL'
CREATE TABLE orders (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  sku VARCHAR(64) NOT NULL,
  qty INT UNSIGNED NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY orders_sku (sku)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
INSERT INTO orders (sku, qty) VALUES ('A-1', 2), ('B-4', 1);
SQL
```

از خود `db-1` این کاربر نباید با مبدأ محلی قبول شود. آزمون درست از `app-1` است.

```bash
mysql --protocol=TCP -h 10.10.1.20 -u app_user -p app -e "SELECT id, sku, qty FROM orders ORDER BY id;"
```

رمز را در خط فرمان نگذارید. کلاینت می‌پرسد. خروجی سالم:

```text
id	sku	qty
1	A-1	2
2	B-4	1
```

روی `app-1` رشتهٔ اتصال در `/opt/apps/app/.env` با مجوز `0600` است.

```text
DB_HOST=10.10.1.20
DB_PORT=3306
DB_DATABASE=app
DB_USERNAME=app_user
DB_PASSWORD=change-me
```

یک کوئری کند مصنوعی بزنید تا مسیر لاگ ثابت شود. از `app-1`:

```bash
mysql --protocol=TCP -h 10.10.1.20 -u app_user -p app -e "SELECT SLEEP(1.2);"
```

روی `db-1`:

```bash
sudo tail -n 5 /var/log/mysql/mysql-slow.log
```

باید سطری با زمان حدود یک ثانیه ببینید. `long_query_time = 1` یعنی فقط کندتر از یک ثانیه. این لاگ را در دیسک کوچک رها نکنید؛ چرخش لاگ بسته معمولاً `/etc/logrotate.d/mysql-server` است. اگر فایل کند غایب است، یک‌بار ری‌استارت بعد از `99-app.cnf` را چک کنید.

بکاپ همان شب را از [بکاپ و بازیابی MySQL](./mysql-backup-restore.md) بسازید. سرور بدون یک بازیابی آزمایشی تمام‌شده نیست.

## Security Notes

- ریشه را `mysql_native_password` نکنید و `INSTALL COMPONENT` یا `INSTALL PLUGIN` برای آن پلاگین اجرا نکنید. خط `mysql_native_password=ON` را به کانفیگ اضافه نکنید.
- `GRANT ALL ON *.*` و میزبان `%` ممنوع است. حساب این صفحه فقط `app.*` و فقط `10.10.1.10` است.
- `bind-address` شامل `0.0.0.0` یا `*` نیست. کارت دوم فقط آدرس خود `db-1` است.
- پورت ۳۳۰۶ از هر مبدأ جز `10.10.1.10` در UFW باز نیست. پورت ۳۳۰۶۰ هم باز نیست.
- رمز در `ps`، در اسکرین‌شات تیکت، و در مخزن نیست. `MYSQL_HISTFILE=/dev/null` برای نشستی است که `CREATE USER` دارد.
- هشدار گواهی خودامضا در `error.log` هنگام اولین بالا آمدن طبیعی است. ترافیک این آزمایشگاه داخل `10.10.1.0/24` است. اگر از همین شبکه هم رمزنگاری TLS می‌خواهید، گواهی را جدا عوض کنید؛ برای بستن این هشدار پلاگین احراز هویت را ضعیف نکنید.
- کاربر سیستم `mysql` مالک `/var/lib/mysql` می‌ماند. آن مسیر را با کاربر `ops` دست‌کاری نکنید.

## Troubleshooting

| نشانه | علت محتمل | کار |
| --- | --- | --- |
| `ERROR 1698 (28000)` یا `ERROR 1045` برای `root` | ورود با رمز به‌جای سوکت | `sudo mysql` بدون `-p` |
| `ERROR 2003` از `app-1` | شنونده یا فایروال یا مسیر شبکه | `ss` روی `db-1` و `sudo ufw status` و از `app-1` دستور `nc -vz 10.10.1.20 3306` |
| `ERROR 1130` میزبان مجاز نیست | حساب برای `localhost` ساخته شده | باید `'app_user'@'10.10.1.10'` باشد. `localhost` سوکت است و با این IP یکی نیست |
| کلاینت می‌گوید پلاگین `mysql_native_password` پیدا نشد | کلاینت قدیمی پلاگین حذف‌شده را می‌خواهد | کلاینت را عوض کنید. سرور را به آن پلاگین برنگردانید |
| `systemctl restart mysql` شکست می‌خورد | خطای کانفیگ | `sudo journalctl -u mysql -n 80 --no-pager` و `sudo mysqld --validate-config` |
| بعد از ری‌استارت برنامه روی همان میزبان با `localhost` کار نمی‌کند | اصلاً چنین حسابی نساختیم | از `10.10.1.10` وصل شوید |
| دیسک `/var/lib/mysql` پر شده | باینری‌لاگ یا لاگ کند | دامپ سالم را اول مطمئن شوید، بعد [دیسک پر](/docs/14-troubleshooting/disk-full). فایل `binlog` را با `rm` پاک نکنید |

اگر `authentication_policy` را کسی به `*:mysql_native_password` تغییر داده، خط را حذف کنید. ستاره در آن مقدار یعنی هر پلاگینی؛ آن را وارد کانفیگ این فصل نکنید.

برای دیدن اینکه بسته واقعاً بالا آمده:

```bash
sudo journalctl -u mysql -n 30 --no-pager
```

خط `ready for connections` به‌همراه نسخهٔ `8.4` و سوکت `/var/run/mysqld/mysqld.sock` حالت سالم است.

## Best Practices

- تغییر کانفیگ فقط در `99-app.cnf`. فایل اصلی بسته را برای تنظیم محلی ویرایش نکنید تا ادغام ارتقا قابل فهم بماند.
- قبل از ری‌استارت `mysqld --validate-config`. ری‌استارت اتصال برنامه را قطع می‌کند؛ در پنجرهٔ تغییر انجامش دهید.
- جدول جدید `ENGINE=InnoDB`. اگر برنامه `MyISAM` ساخت، همان را به InnoDB تبدیل کنید قبل از اینکه روش بکاپ این فصل را به آن ببندید.
- `innodb_flush_log_at_trx_commit` را برای سرعت از `1` پایین نیاورید. مقدار `2` یا `0` یعنی قطع برق می‌تواند تراکنش تأییدشده را گم کند.
- حقوق برنامه را روی DML نگه دارید. مهاجرت اسکیما حساب کوتاه‌عمر دارد.
- بافر پول را از RAM همین ماشین حساب کنید. ۱ گیگابایت این صفحه مخصوص مثال ۴ گیبیابایتی است.
- همان روز نصب، بازیابی آزمایشی را از صفحهٔ بکاپ انجام دهید.
- `apt install mariadb-server` را روی این میزبان اجرا نکنید.
