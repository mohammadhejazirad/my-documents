---
sidebar_position: 8
title: اسکریپت بکاپ دیتابیس
description: دامپ شبانهٔ دیتابیس app روی db-1 با mysqldump و pg_dump، رمز فقط از فایل 0600، فشردهٔ gzip، و هفت نسخه.
---

# اسکریپت بکاپ دیتابیس

## مقدمه

دیتابیس نمونهٔ آزمایشگاه اسمش `app` است و روی `db-1.example.internal` با آدرس `10.10.1.20` است. این صفحه یک اسکریپت با دو زیر‌دستور دارد: `mysql` و `postgres`. هر کدام دامپ منطقی همان موتور را می‌گیرد، با gzip فشرده می‌کند، در `/var/backups/db` می‌گذارد، و هفت نسخهٔ آخر همان موتور را نگه می‌دارد. بکاپ فایل `/opt/apps` جای این دامپ نیست. آن یکی روی `app-1` است و جدول را برنمی‌گرداند.

رمز روی خط فرمان نیست. `mysqldump --password=...` و `PGPASSWORD` هر دو در `ps` و در `/proc` دیده می‌شوند. MySQL رمز را از فایل گزینه می‌خواند و PostgreSQL از فایل `pgpass`. هر دو فایل حالت `0600` دارند، مالکشان همان کاربری است که اسکریپت را اجرا می‌کند، و symlink نیستند. در این آزمایشگاه آن کاربر root است و مسیر `/root/.backup` است، بیرون از `/etc` و بیرون از `/opt/apps`، تا آرشیو فایل صفحهٔ قبل رمز را جارو نکند.

اسکریپت را روی خود `db-1` اجرا کنید، نه از `app-1` روی شبکه. دامپ بزرگ نباید از روی لینک مدیریت رد شود، و شکست شبکه نباید نسخهٔ نیمه‌کاره به‌جا بگذارد. اتصال داخل اسکریپت همچنان آدرس `10.10.1.20` است تا به‌جای سوکت خاموش، به نمونهٔ اشتباه روی localhost وصل نشوید اگر روزی دو نمونه روی یک میزبان بود. برای این کار سرور باید روی همان آدرس گوش بدهد و `pg_hba` و کاربر MySQL همان مبدأ را قبول کنند.

یک زمان‌بند. نمونه cron است. timer را اضافه نکنید مگر خط cron را بردارید.

## مفهوم اصلی

`mysqldump --single-transaction` برای جدول InnoDB یک تراکنش `REPEATABLE READ` باز می‌کند و داده را از همان نما می‌خواند، بدون اینکه تا آخر دامپ جدول‌ها را قفل کند. این قفل نخواندن برای MyISAM معنی ندارد. دیتابیس `app` در این آزمایشگاه InnoDB است. اگر وسط دامپ `ALTER` یا `DROP` یا `TRUNCATE` بزنید، دامپ از نظر تراکنش هم قابل اعتماد نیست. پنجرهٔ ۰۲:۲۰ را خالی از مهاجرت نگه دارید.

از MySQL 8.0.21 به بعد، و بنابراین روی 8.4 همین دانشنامه، خواندن اطلاعات tablespace بدون امتیاز `PROCESS` رد می‌شود. دامپ منطقی به آن فایل‌ها نیاز ندارد. `--no-tablespaces` همان درخواست را حذف می‌کند تا مجبور نشوید به کاربر بکاپ امتیاز مدیریتی بدهید.

`--set-gtid-purged=OFF` جملهٔ تنظیم GTID را از فایل برمی‌دارد. `app` در آزمایشگاه منبع replication نیست. آن جمله موقع بازیابی روی سرور تازه یا بدون امتیاز کافی شکست می‌خورد. اگر بعدها replica با GTID ساختید، این فلگ را دانسته عوض کنید، نه الان «برای احتیاط».

`--quick` ردیف‌ها را یکجا در حافظهٔ کلاینت جمع نمی‌کند. `--routines` و `--events` و `--triggers` شیءهایی را می‌آورند که `--databases` به‌تنهایی تضمین نمی‌کند.body روتین در MySQL 8 اگر کاربر سازنده‌اش نباشد به امتیاز `SHOW_ROUTINE` نیاز دارد. همان را در نصب می‌گذاریم، نه `SUPER` و نه `PROCESS`.

`pg_dump` با قالب plain متن SQL می‌سازد و لوله به gzip می‌رود تا الزام فشرده‌سازی همین صفحه برآورده شود. قالب custom خود pg فشرده است، ولی فایل خروجی این فصل برای هر دو موتور `.sql.gz` است تا باز کردن و آزمون یک شکل باشد. `--no-password` اگر فایل رمز خوانده نشود سؤال نمی‌پرسد. cron نباید تا ابد پشت prompt بماند.

هر دو لوله زیر `pipefail` هستند. شکست دامپ یعنی فایل موقت پاک می‌شود و نسخهٔ قبلی می‌ماند. بعد از جابه‌جایی به نام نهایی، `gzip -t` و یک نشانگر ته فایل چک می‌شود. برای MySQL نشانگر `Dump completed` است و برای PostgreSQL `PostgreSQL database dump complete`. اگر نسخهٔ بعدی ابزار این جمله را عوض کند، اسکریپت فایل را نگه نمی‌دارد و خطا می‌دهد. شکست بسته بهتر از دامپی است که ته ندارد و فردا با وضعیت ۰ بازیابی نمی‌شود.

هرس بعد از همین آزمون است و فقط فایل‌های همان موتور را می‌بیند. دامپ MySQL، نسخهٔ PostgreSQL را پاک نمی‌کند. قفل بین دو موتور مشترک است تا ۰۲:۲۰ و یک اجرای دستی روی هم نیفتند. فاصلهٔ cron سی دقیقه است. قفل برای وقتی است که کسی فاصله را بردارد.

## چرا استفاده می‌شود؟

فایل‌سیستم سرور دیتابیس را خاموش نکرده‌ایم که کپی سرد بگیریم. دامپ منطقی را روی نسخهٔ روشن می‌شود گرفت، با محدودیت‌هایی که بالا گفته شد، و بازیابی‌اش به یک نسخهٔ همان خانواده از موتور ممکن است نه به بلوک دیسک. برای حادثهٔ «جدول پاک شد» همین کافی و لازم است. برای حادثهٔ «دیسک دیتابیس ناخوانا شد» باید فایل دامپ روی دیسک دیگری باشد. اگر `/var/backups` همان دیسک داده است، این اسکریپت شما را نجات نمی‌دهد. در آزمایشگاه مسیر را جدا فرض کرده‌ایم. اگر نیست، مقصد را به دیسک دیگر عوض کنید و حالت `0700` را حفظ کنید.

هفت نسخه یعنی یک هفته. بیشتر از آن را به دیسک بکاپ جداگانه ببرید، نه اینکه `RETENTION` را بی‌حساب بزرگ کنید تا خود دامپ دیسک را پر کند و دیتابیس را هم با آن زمین بزند. کف فضای خالی داخل اسکریپت یک گیبی‌بایت است. دامپ `app` اگر بزرگ‌تر است، کف را قبل از اعتماد شبانه بالا ببرید.

## Architecture

```text
db-1  10.10.1.20
  cron  02:20  backup-db.sh mysql
  cron  02:50  backup-db.sh postgres
        │
        ▼
  /root/.backup/mysql-app.cnf      0600
  /root/.backup/pg-app.pgpass      0600
        │
        ▼
  mysqldump --single-transaction | gzip
  pg_dump --no-password           | gzip
        │
        ▼
  /var/backups/db/mysql-app-YYYYMMDD-HHMMSS.sql.gz
  /var/backups/db/postgres-app-YYYYMMDD-HHMMSS.sql.gz
        حالت 0600، هفت فایل برای هر موتور

  قفل مشترک  /var/backups/db/.backup-db.lock
  لاگ        /var/log/backup-db.log
```

`app-1` در این مسیر نیست. برنامه روی `10.10.1.10` به دیتابیس وصل می‌شود. خود بکاپ از روی سرور دیتابیس است.

## Installation

بستهٔ کلاینت باید روی `db-1` باشد. سرور MySQL 8.4 و PostgreSQL 18 طبق جدول نسخهٔ دانشنامه از مخزن Ubuntu می‌آیند. اینجا فقط ابزار دامپ و حساب بکاپ را می‌گذاریم. اگر سرور دیتابیس هنوز نصب نیست، اول همان فصل دیتابیس را تمام کنید و این حساب را به آن اضافه کنید. شمارهٔ patch بسته را از `dpkg` بخوانید.

```bash
sudo apt-get update
sudo apt-get install -y mysql-client postgresql-client gzip
mysqldump --version
pg_dump --version
```

پوشهٔ رمز و مقصد:

```bash
sudo install -d -o root -g root -m 0700 /root/.backup /var/backups/db
sudo install -m 0600 -o root -g root /dev/null /root/.backup/mysql-app.cnf
sudo install -m 0600 -o root -g root /dev/null /root/.backup/pg-app.pgpass
sudoedit /root/.backup/mysql-app.cnf
sudoedit /root/.backup/pg-app.pgpass
```

فایل گزینهٔ MySQL. مقدار `change-me` رمز واقعی نیست. قبل از اولین دامپ عوضش کنید. این رشته را در خط فرمان `mysql -p` ننویسید.

```ini
[client]
host=10.10.1.20
port=3306
user=backup
password=change-me
```

فایل `pgpass`. فیلدها با دونقطه جدا می‌شوند. اگر رمز واقعی دونقطه یا بک‌اسلش دارد، در همین فایل با بک‌اسلش گریخته شود. حالت غیر از `0600` را libpq نادیده می‌گیرد و `pg_dump` با `--no-password` شکست می‌خورد.

```text
10.10.1.20:5432:app:backup:change-me
```

بعد از ویرایش دوباره حالت را بسنجید. `sudoedit` گاهی فایل موقت را با حالت پیش‌فرض جابه‌جا می‌کند.

```bash
sudo chmod 600 /root/.backup/mysql-app.cnf /root/.backup/pg-app.pgpass
sudo chown root:root /root/.backup/mysql-app.cnf /root/.backup/pg-app.pgpass
stat -c '%a %U' /root/.backup/mysql-app.cnf /root/.backup/pg-app.pgpass
```

کاربر MySQL را داخل خود کلاینت بسازید، نه با یک خط `mysql -p... -e` که در history می‌ماند. رمز را همان‌جا عوض کنید و خط را از `~/.mysql_history` بردارید اگر کلاینت آن را ضبط کرد. امتیاز `PROCESS` ندهید.

```sql
CREATE USER 'backup'@'127.0.0.1' IDENTIFIED BY 'change-me';
CREATE USER 'backup'@'10.10.1.20' IDENTIFIED BY 'change-me';
GRANT SELECT, SHOW VIEW, TRIGGER, EVENT, SHOW_ROUTINE ON app.* TO 'backup'@'127.0.0.1';
GRANT SELECT, SHOW VIEW, TRIGGER, EVENT, SHOW_ROUTINE ON app.* TO 'backup'@'10.10.1.20';
```

`SHOW_ROUTINE` در MySQL 8 امتیاز سراسری است و شکل `ON app.*` ممکن است روی 8.4 پذیرفته نشود. اگر سرور خطا داد، همان امتیاز را جدا و سراسری بدهید و بقیه را روی `app.*` نگه دارید:

```sql
GRANT SELECT, SHOW VIEW, TRIGGER, EVENT ON app.* TO 'backup'@'10.10.1.20';
GRANT SHOW_ROUTINE ON *.* TO 'backup'@'10.10.1.20';
```

همان دو میزبان را برای `127.0.0.1` هم اگر ساختید تکرار کنید. `IDENTIFIED BY` را در اسکریپت پوسته و در crontab نگذارید.

برای PostgreSQL نقش را بدون رمز در دستور بسازید و رمز را با prompt خود `psql` بگذارید تا در history پوسته نیاید. ممکن است در `~/.psql_history` بیاید. آن خط را پاک کنید یا `HISTFILE` جلسه را موقتاً به `/dev/null` ببرید.

```sql
CREATE ROLE backup LOGIN;
```

```text
\password backup
```

بعد، وصل به دیتابیس `app`، خواندن را بدهید. `ALTER DEFAULT PRIVILEGES` را با نقشی اجرا کنید که جدول‌های برنامه را می‌سازد، وگرنه فقط جدول‌های بعدیِ همان نقشی که الان وارد شده را پوشش می‌دهد.

```sql
GRANT CONNECT ON DATABASE app TO backup;
\c app
GRANT USAGE ON SCHEMA public TO backup;
GRANT SELECT ON ALL TABLES IN SCHEMA public TO backup;
GRANT SELECT ON ALL SEQUENCES IN SCHEMA public TO backup;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT SELECT ON TABLES TO backup;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT SELECT ON SEQUENCES TO backup;
```

`pg_hba.conf` باید این کاربر را با `scram-sha-256` از خود سرور قبول کند، نه با `trust`. بعد از ویرایش، کلاستر را reload کنید نه اینکه لزوماً restart. مسیر فایل روی PostgreSQL 18 اوبونتو زیر `/etc/postgresql/18/main/` است. اگر `pg_lsclusters` مسیر دیگری نشان داد همان را بگیرید.

```text
host  app  backup  127.0.0.1/32   scram-sha-256
host  app  backup  10.10.1.20/32  scram-sha-256
```

`listen_addresses` باید `127.0.0.1,10.10.1.20` را داشته باشد، نه همهٔ رابط‌ها، مگر اینکه دیوارهٔ شبکه پورت `5432` و `3306` را از بیرون شبکهٔ `10.10.0.0/16` بسته باشد. MySQL هم `bind-address` را روی همین دو آدرس بگذارید. `ss -ltn` باید `10.10.1.20:3306` و `10.10.1.20:5432` را نشان دهد وگرنه اسکریپت به آدرسی وصل می‌شود که کسی گوش نمی‌دهد.

اسکریپت:

```bash
sudo install -m 0750 -o root -g root /dev/null /usr/local/sbin/backup-db.sh
sudoedit /usr/local/sbin/backup-db.sh
bash -n /usr/local/sbin/backup-db.sh
sudo /usr/local/sbin/backup-db.sh mysql
sudo /usr/local/sbin/backup-db.sh postgres
```

cron، فایل `/etc/cron.d/backup-db` بدون نقطه در نام:

```text
SHELL=/bin/bash
PATH=/usr/local/sbin:/usr/local/bin:/usr/sbin:/usr/bin:/sbin:/bin
MAILTO=""

20 2 * * * root /usr/local/sbin/backup-db.sh mysql
50 2 * * * root /usr/local/sbin/backup-db.sh postgres
```

logrotate:

```text
/var/log/backup-db.log {
    weekly
    rotate 8
    compress
    delaycompress
    missingok
    notifempty
    create 0640 root adm
    su root adm
}
```

## Configuration

| نام | مقدار |
| --- | --- |
| میزبان | `10.10.1.20` |
| دیتابیس | `app` |
| کاربر دامپ | `backup` |
| پورت MySQL | `3306` |
| پورت PostgreSQL | `5432` |
| فایل رمز MySQL | `/root/.backup/mysql-app.cnf` |
| فایل رمز PostgreSQL | `/root/.backup/pg-app.pgpass` |
| مقصد | `/var/backups/db` |
| نگهداری | ۷ فایل برای هر موتور |
| کف فضا | ۱۰۴۸۵۷۶ کیبی‌بایت |

آرگومان اسکریپت فقط `mysql` یا `postgres` است. میزبان و نام دیتابیس آرگومان نیستند تا در crontab قابل تزریق نباشند.

## Production Example

```bash
#!/usr/bin/env bash
set -euo pipefail

# Logical backup of database "app" on db-1. Password comes from a 0600 file.
export LC_ALL=C
export TZ=Asia/Tehran
export PATH="/usr/local/sbin:/usr/local/bin:/usr/sbin:/usr/bin:/sbin:/bin"

BACKUP_ROOT="/var/backups/db"
LOG_FILE="/var/log/backup-db.log"
LOG_TAG="backup-db"
RETENTION=7
MIN_FREE_KB=1048576
DB_NAME="app"
MYSQL_HOST="10.10.1.20"
MYSQL_PORT="3306"
PGHOST="10.10.1.20"
PGPORT="5432"
PGUSER="backup"
MYSQL_CNF="/root/.backup/mysql-app.cnf"
PGPASS="/root/.backup/pg-app.pgpass"
FAIL_MSG=""
partial=""
list_file=""
tail_file=""
final=""
engine=""

log() {
  local level="$1"
  shift
  local line
  printf -v line '%s [%s] %s' "$(date -Is)" "${level}" "$*"
  printf '%s\n' "${line}" >> "${LOG_FILE}"
  logger -t "${LOG_TAG}" -p "user.${level}" -- "$*" || true
}

die() {
  FAIL_MSG="$*"
  printf '%s\n' "${FAIL_MSG}" >&2
  exit 1
}

usage() {
  FAIL_MSG="usage: backup-db.sh mysql|postgres"
  printf '%s\n' "${FAIL_MSG}" >&2
  exit 2
}

on_exit() {
  local rc=$?
  if [[ -n "${partial}" && -f "${partial}" && ! -L "${partial}" ]]; then
    rm -f -- "${partial}" || true
  fi
  if [[ -n "${list_file}" && -f "${list_file}" ]]; then
    rm -f -- "${list_file}" || true
  fi
  if [[ -n "${tail_file}" && -f "${tail_file}" ]]; then
    rm -f -- "${tail_file}" || true
  fi
  if (( rc != 0 )) && [[ -f "${LOG_FILE}" && ! -L "${LOG_FILE}" ]]; then
    log err "${FAIL_MSG:-database backup failed with status ${rc}}" || true
  fi
  exit "${rc}"
}
trap on_exit EXIT
trap 'exit 130' INT
trap 'exit 143' TERM

prepare_log() {
  if [[ -L "${LOG_FILE}" ]]; then
    printf 'refusing symlink log %s\n' "${LOG_FILE}" >&2
    exit 1
  fi
  if [[ ! -e "${LOG_FILE}" ]]; then
    install -m 640 -o root -g adm /dev/null "${LOG_FILE}"
  fi
  if [[ ! -f "${LOG_FILE}" || ! -w "${LOG_FILE}" ]]; then
    printf 'log file not writable %s\n' "${LOG_FILE}" >&2
    exit 1
  fi
}

assert_secret() {
  local f="$1"
  local mode owner
  if [[ ! -e "${f}" || -L "${f}" || ! -f "${f}" ]]; then
    die "refusing secret file ${f}"
  fi
  mode="$(stat -c '%a' "${f}")"
  owner="$(stat -c '%u' "${f}")"
  if [[ "${mode}" != "600" ]]; then
    die "mode ${mode} on ${f}; need 0600"
  fi
  if [[ "${owner}" != "$(id -u)" ]]; then
    die "secret owner is not the user running this script"
  fi
}

check_space() {
  local avail
  avail="$(df -Pk "${BACKUP_ROOT}" | awk 'NR==2 {print $4}')"
  if [[ ! "${avail}" =~ ^[0-9]+$ ]]; then
    die "could not read free space for ${BACKUP_ROOT}"
  fi
  if (( avail < MIN_FREE_KB )); then
    die "only ${avail} KiB free under ${BACKUP_ROOT}; need ${MIN_FREE_KB}"
  fi
}

take_lock() {
  local lock_file="${BACKUP_ROOT}/.backup-db.lock"
  if [[ -L "${lock_file}" ]]; then
    die "refusing symlink lock ${lock_file}"
  fi
  exec 9>"${lock_file}"
  if ! flock -n 9; then
    die "another database backup holds ${lock_file}"
  fi
}

verify_dump() {
  local file="$1"
  local marker="$2"
  if ! gzip -t -- "${file}"; then
    rm -f -- "${file}"
    die "gzip test failed"
  fi
  tail_file="$(mktemp)"
  if ! gzip -dc -- "${file}" | tail -n 40 > "${tail_file}"; then
    rm -f -- "${tail_file}" "${file}"
    tail_file=""
    die "could not read dump back"
  fi
  if ! grep -q -F -- "${marker}" "${tail_file}"; then
    rm -f -- "${tail_file}" "${file}"
    tail_file=""
    die "dump missing completion marker"
  fi
  rm -f -- "${tail_file}"
  tail_file=""
}

prune_old() {
  local f extra
  local -a files=()
  list_file="$(mktemp)"
  find "${BACKUP_ROOT}" -maxdepth 1 -type f -name "${engine}-${DB_NAME}-*.sql.gz" -printf '%T@\t%p\0' \
    | sort -z -n | cut -z -f2- > "${list_file}"
  while IFS= read -r -d '' f; do
    case "${f}" in
      "${BACKUP_ROOT}/${engine}-${DB_NAME}-"*.sql.gz) files+=("${f}") ;;
      *) die "refusing unexpected dump name: ${f}" ;;
    esac
  done < "${list_file}"
  rm -f -- "${list_file}"
  list_file=""
  if (( ${#files[@]} <= RETENTION )); then
    return 0
  fi
  extra=$(( ${#files[@]} - RETENTION ))
  local i
  for (( i = 0; i < extra; i++ )); do
    log info "removing old dump ${files[$i]}"
    rm -f -- "${files[$i]}"
  done
}

start_paths() {
  local stamp
  stamp="$(date +%Y%m%d-%H%M%S)"
  final="${BACKUP_ROOT}/${engine}-${DB_NAME}-${stamp}.sql.gz"
  partial="${BACKUP_ROOT}/.${engine}-${DB_NAME}-${stamp}.sql.gz.partial"
}

dump_mysql() {
  command -v mysqldump >/dev/null || die "mysqldump not found"
  command -v gzip >/dev/null || die "gzip not found"
  assert_secret "${MYSQL_CNF}"
  start_paths
  mysqldump \
    --defaults-extra-file="${MYSQL_CNF}" \
    --host="${MYSQL_HOST}" \
    --port="${MYSQL_PORT}" \
    --single-transaction \
    --quick \
    --routines \
    --events \
    --triggers \
    --no-tablespaces \
    --default-character-set=utf8mb4 \
    --set-gtid-purged=OFF \
    --databases "${DB_NAME}" \
    2>>"${LOG_FILE}" \
    | gzip -c > "${partial}"
  mv -f -- "${partial}" "${final}"
  partial=""
  chmod 600 -- "${final}"
  verify_dump "${final}" "Dump completed"
  prune_old
  log info "mysql backup complete ${final}"
}

dump_postgres() {
  command -v pg_dump >/dev/null || die "pg_dump not found"
  command -v gzip >/dev/null || die "gzip not found"
  assert_secret "${PGPASS}"
  export PGPASSFILE="${PGPASS}"
  start_paths
  pg_dump \
    --host="${PGHOST}" \
    --port="${PGPORT}" \
    --username="${PGUSER}" \
    --dbname="${DB_NAME}" \
    --no-password \
    --format=plain \
    2>>"${LOG_FILE}" \
    | gzip -c > "${partial}"
  mv -f -- "${partial}" "${final}"
  partial=""
  chmod 600 -- "${final}"
  verify_dump "${final}" "PostgreSQL database dump complete"
  prune_old
  log info "postgres backup complete ${final}"
}

main() {
  if [[ "$(id -u)" -ne 0 ]]; then
    printf 'run backup-db as root\n' >&2
    exit 1
  fi
  case "${1:-}" in
    mysql) engine="mysql" ;;
    postgres) engine="postgres" ;;
    *) usage ;;
  esac
  umask 077
  prepare_log
  mkdir -p -- "${BACKUP_ROOT}"
  chmod 700 "${BACKUP_ROOT}"
  take_lock
  check_space
  log info "database backup starting engine=${engine}"
  case "${engine}" in
    mysql) dump_mysql ;;
    postgres) dump_postgres ;;
    *) usage ;;
  esac
  exit 0
}

main "$@"
```

بازیابی آزمایشی را روی یک دیتابیس خالی به نام دیگر انجام دهید، نه با وارد کردن این فایل روی `app` تولیدی وسط روز. شکل خواندن، بدون اجرا روی تولید:

```bash
sudo gzip -t /var/backups/db/mysql-app-*.sql.gz
sudo gzip -dc /var/backups/db/postgres-app-*.sql.gz | tail -n 5
```

خط ته PostgreSQL باید همان نشانگر تمام شدن دامپ باشد. MySQL هم `Dump completed` را در ته دارد.

## Security Notes

رمز در history پوسته، در `~/.mysql_history`، در `~/.psql_history`، در `ps`، و در `/proc/PID/cmdline` و `/proc/PID/environ` لو می‌رود اگر در آن جاها گذاشته شود. فایل `0600` هیچ‌کدام از این‌ها نیست، به شرطی که خود دستور ساختن فایل رمز را در history نگذارد. `sudoedit` این کار را می‌کند. `echo password | tee` و `mysql -pchange-me` این کار را نمی‌کنند. `change-me` را در تولید نگه ندارید. نمونه‌ای است که باید عوض شود.

`export PGPASSWORD` را حتی برای یک خط اضافه نکنید. همان کاربر می‌تواند محیط فرایند را بخواند. مسیر `PGPASSFILE` در محیط دیده می‌شود و راز نیست. خود فایل راز است.

آرگومان `--defaults-extra-file` باید اولین گزینهٔ `mysqldump` باشد. اگر عقب‌تر برود، ابزار یا نادیده‌اش می‌گیرد یا خطا می‌دهد و کسی وسوسه می‌شود رمز را به فلگ `--password` برگرداند. ترتیب داخل اسکریپت را عوض نکنید.

کاربر `backup` فقط `SELECT` و امتیازهای لازم دامپ را دارد، نه `INSERT` و نه `SUPER`. با این حساب دزدیدن فایل رمز، نوشتن در دیتابیس نیست، ولی خواندن کل دادهٔ `app` هست. فایل را در بکاپ فایل `/etc` نگذارید. مسیر فعلی بیرون آن درخت است.

خروجی دامپ خود داده است. حالت `0600` و پوشهٔ `0700` بخشی از بکاپ است، نه تزئین. `chmod` بعد از `mv` هست چون `umask 077` تنها تکیه نیست اگر روزی `umask` خط خورد.

لاگ خطای اتصال را نگه می‌دارد. MySQL گاهی نام کاربر را در خطای دسترسی می‌نویسد و رمز را نمی‌نویسد. اگر پلاگینی رمز را در هشدار آورد، آن خط را از لاگ پاک کنید و رمز را عوض کنید. اسکریپت خروجی استاندارد ابزار را داخل gzip می‌ریزد، نه داخل لاگ.

## Troubleshooting

| نشانه | علت | کار |
| --- | --- | --- |
| `need 0600` | `sudoedit` حالت را باز کرده | `chmod 600` و دوباره |
| `password file ... has group or world access` | libpq فایل را نادیده گرفته | همان حالت. این هشدار خود `pg_dump` است |
| `Access denied` برای MySQL | کاربر برای میزبان `10.10.1.20` ساخته نشده، یا رمز فایل کهنه است | کاربر و `GRANT` را ببینید. رمز را روی خط فرمان آزمایش نکنید |
| `mysqldump` می‌گوید tablespace یا `PROCESS` | فلگ `--no-tablespaces` برداشته شده | فلگ را برگردانید. `PROCESS` ندهید |
| خطا روی روتین | `SHOW_ROUTINE` نیست | همان امتیاز سراسری، نه `SUPER` |
| دامپ تمام می‌شود و اسکریپت فایل را پاک می‌کند | نشانگر ته فایل نیست | یک دامپ دستی کوتاه را ببینید. اگر ابزار جمله را عوض کرده، نشانگر را در اسکریپت با جملهٔ واقعی همان نسخه عوض کنید و فایل ناقص را نگه ندارید |
| `another database backup holds` | mysql و postgres هم‌زمان، یا timer اضافه | فاصلهٔ cron را برگردانید و زمان‌بند دوم را بردارید |
| prompt رمز و توقف cron | `--no-password` برداشته شده یا فایل pgpass خوانده نشده | فلگ و حالت فایل |
| `could not read free space` | پوشهٔ مقصد نیست | `install -d` قبل از cron |
| فایل هست ولی `gzip -t` دستی رد می‌شود | کپی نصفه بعد از موفقیت | این نسخه اگر آزمون رد شود فایل را پاک می‌کند. اگر فایل مانده، آزمون را خودتان رد کرده‌اید یا فایل را از جای دیگر کپی کرده‌اید |

بازیابی را این صفحه خودکار نمی‌کند. یک دامپ را روی VM با `gzip -dc ... \| mysql` یا `psql` امتحان کنید و نتیجه را بنویسید. دستوری که اینجا با لولهٔ بازیابی روی `app` تولیدی چاپ شود، خطرناک‌تر از نبودن دامپ است، چون خواننده کپی می‌کند. بازیابی تولیدی یک کار جدا با پنجرهٔ خاموشی است.

## Best Practices

- رمز فقط در فایل `0600`. نه در اسکریپت، نه در cron، نه در محیط `PGPASSWORD`، نه در history.
- `--defaults-extra-file` اولین آرگومان `mysqldump` بماند.
- `--single-transaction` را با مهاجرت schema هم‌زمان نکنید.
- `--no-tablespaces` را برندارید تا به `PROCESS` «نیاز» پیدا کنید.
- نشانگر ته دامپ را دور نزنید. دامپ بدون ته، نسخه نیست.
- هرس را بعد از آزمون بگذارید و فایل‌های موتور دیگر را در الگو نیاورید.
- یک قفل برای هر دو زیر‌دستور، دو ساعت جدا در cron، و هیچ timer هم‌زمان.
- مقصد بکاپ را روی دیسک خود دادهٔ دیتابیس تنها نگذارید.
- کاربر دامپ را فقط خواندنی نگه دارید و بازیابی را با کاربر دیگر و روی نام دیتابیس دیگر تمرین کنید.
