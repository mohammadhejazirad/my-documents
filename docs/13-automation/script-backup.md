---
sidebar_position: 7
title: اسکریپت بکاپ فایل
description: آرشیو tar از /opt/apps و /etc در /var/backups/files با تاریخ، نگهداری هفت نسخه، قفل، لاگ، و خروج غیرصفر اگر مبدأ نباشد.
---

# اسکریپت بکاپ فایل

## مقدمه

این صفحه بکاپ فایل `app-1.example.internal` (`10.10.1.10`) است. دو درخت آرشیو می‌شوند: `/opt/apps` و `/etc`. مقصد `/var/backups/files` است. نام فایل میزبان، کلمهٔ `files`، و مُهر `Asia/Tehran` را دارد. هفت نسخهٔ آخر می‌ماند. اگر یکی از مبدأها پوشه نباشد، اسکریپت هیچ آرشیوی نمی‌سازد و وضعیت غیرصفر برمی‌گرداند.

بکاپ دیتابیس این فایل نیست. دامپ `app` روی `db-1` در [بکاپ دیتابیس](/docs/13-automation/script-database-backup) است. اینجا کپی منطقی جدول‌ها ساخته نمی‌شود. کسی که فقط این tar را داشته باشد، دادهٔ داخل MySQL یا PostgreSQL را ندارد، مگر اینکه فایل‌سیستم دیتابیس را هم زیر همین مسیرها گذاشته باشد که در آزمایشگاه این‌طور نیست: دادهٔ دیتابیس روی `10.10.1.20` است.

کاربر اجرا root است. `deploy` مالک برنامه است ولی بسیاری از فایل‌های `/etc` را نمی‌تواند بخواند: کلید TLS، فایل shadow، و رمزهای سرویس. اجرای این اسکریپت با `deploy` یا آرشیو ناقص می‌سازد یا همان شب با وضعیت `tar` می‌میرد. root اینجا بی‌قید نیست: اسکریپت مسیر اضافه از آرگومان نمی‌پذیرد، فقط همان دو مبدأ ثابت را می‌خواند، و فایل خروجی را `0600` می‌گذارد.

زمان‌بند فقط یکی. نمونهٔ این صفحه cron است. timer معادل را از [cron](/docs/13-automation/cron) بردارید و این فایل cron را حذف کنید. هر دو را با هم نگذارید.

## مفهوم اصلی

ترتیب داخل اسکریپت عمدی است.

1. اگر root نیست، قبل از هر نوشتنی خارج شود.
2. هر دو مبدأ را به‌عنوان پوشهٔ واقعی بسنجد. نبودن یکی یعنی خروج ۱. پوشه ساخته نمی‌شود تا یک سرور اشتباه «بکاپ خالی موفق» نسازد.
3. فایل لاگ اگر symlink باشد رد شود.
4. پوشهٔ مقصد با `0700` ساخته شود.
5. `flock` غیرمسدود. اگر نسخهٔ دیگری در حال کار است، خروج ۱. منتظر نمی‌ماند تا دو آرشیو پشت سر هم دیسک را پر کنند و cron بعدی هم صف شود.
6. فضای خالی حداقل یک گیبی‌بایت روی همان فایل‌سیستم مقصد. عدد در بالای اسکریپت است و اگر درخت `/opt/apps` بزرگ‌تر از این کف است باید کف را بالا ببرید. این کف جلوی پر شدن کامل دیسک را به‌تنهایی تضمین نمی‌کند؛ جلوی شروع کار وقتی دیسک از قبل تقریباً پر است را می‌گیرد.
7. `tar` فشرده روی یک نام موقت مخفی. وضعیت ۰ پذیرفته است. وضعیت ۱، که در tar گنو هشدار غیرکشنده است، فقط اگر فایل بعداً با `gzip -t` و فهرست `tar` خوانده شود پذیرفته و در لاگ با سطح warning می‌آید. وضعیت ۲ و بالاتر کشنده است و نام موقت پاک می‌شود.
8. جابه‌جایی به نام نهایی، خالی کردن متغیر نام موقت تا تله فایل نهایی را برندارد، سپس `chmod 600`.
9. هرس. قدیمی‌ترین فایل‌های همین میزبان تا وقتی بیشتر از هفت تا مانده‌اند حذف می‌شوند. هرس بعد از موفقیت خواندن آرشیو است، نه قبل.

`tar` از ریشه با مسیرهای نسبی `opt/apps` و `etc` آرشیو می‌کند تا عضو آرشیو با اسلش اول ذخیره نشود. باز کردن سرسری در `/` سخت‌تر می‌شود و باید مقصد را خودتان بدهید. گزینهٔ هشدار `no-file-changed` مال GNU tar است و روی Ubuntu 26.04 هست. فایل‌هایی که هنگام خواندن عوض می‌شوند، مثل فایل زیر `/etc` که یک سرویس همان لحظه نوشته، دیگر به‌تنهایی وضعیت ۱ نمی‌سازند. اگر tar بدون این گزینه هر شب وضعیت ۱ بدهد، آرشیو را دور نریزید تا وقتی آزمون خواندن رد شود؛ اسکریپت همین کار را می‌کند.

قفل با `flock` روی توصیف‌گر ۹ است. فایل قفل داخل همان پوشهٔ بکاپ است تا به سیاست `/run/lock` وابسته نباشد. cron دو نسخه را هم‌زمان شروع می‌کند اگر هم فایل cron باشد هم timer. قفل جلوی هم‌پوشانی را می‌گیرد و خروج غیرصفر می‌گذارد تا آن اشتباه دیده شود. درمان، حذف یکی از زمان‌بندهاست، نه برداشتن قفل.

مُهر زمان با `TZ=Asia/Tehran` و `LC_ALL=C` ساخته می‌شود تا نام فایل به زبان پوسته وابسته نباشد. ساعت شلیک شدن کار هنوز مال timezone سیستم است، طبق صفحهٔ cron.

## چرا استفاده می‌شود؟

`/opt/apps` بدون این آرشیو فقط روی دیسک همان سرور است. اشتباه در استقرار، `rm` روی یک پوشهٔ انتشار، یا خراب شدن فایل کانفیگ `/etc` را با دامپ دیتابیس برنمی‌گردانید. دامپ، جدول را برمی‌گرداند. این tar، واحد systemd، کانفیگ nginx، و خود فایل‌های برنامه را برمی‌گرداند اگر داخل `/opt/apps` بوده باشند.

هفت نسخه یعنی یک هفته بکاپ شبانه، به‌علاوهٔ کمی جا برای دو اجرای دستی. بیشتر از آن دیسک را می‌خورد و کمتر از آن جمعهٔ خراب دوشنبه را هم می‌بلعد. عدد در متغیر `RETENTION` است.

خروج غیرصفر وقتی مبدأ نیست، جلوی این حادثه را می‌گیرد: دیسک تازه، `/opt/apps` هنوز mount نشده، و اسکریپت از `/etc` تنها یک آرشیو «سبز» می‌سازد و شش نسخهٔ کامل قبلی را در هرس حذف می‌کند. آزمون مبدأ قبل از هرس است و اگر مبدأ نباشد اصلاً به هرس نمی‌رسد.

## Architecture

```text
cron.d/backup-files     کاربر root     03:10 Asia/Tehran
        │
        ▼
/usr/local/sbin/backup-files.sh
        │
        ├── آزمون /opt/apps و /etc
        ├── flock   /var/backups/files/.backup-files.lock
        ├── tar.gz موقت، سپس mv
        └── هرس به هفت فایل app-1-files-*.tar.gz

لاگ
  /var/log/backup-files.log     چرخش با logrotate
  logger -t backup-files        journalctl -t backup-files
```

آرشیو رمز دیتابیس را شامل نمی‌شود. رمزها زیر `/root/.backup` هستند و آن مسیر در فهرست مبدأ نیست. اگر کسی فایل رمز را برگرداند داخل `/etc`، این tar از آن به بعد محرمانهٔ کامل است. امروز مسیر رمز عمداً بیرون `/etc` و بیرون `/opt/apps` است.

## Installation

ابزارها از بسته‌های پایه می‌آیند: `tar`،‏ `gzip`،‏ `find`،‏ `flock`،‏ `logger`. اگر سرور حداقلی است همان فهرست صفحهٔ [نقشه](/docs/13-automation) را نصب کنید. سرویس cron باید روشن باشد.

```bash
sudo install -d -o root -g root -m 0700 /var/backups/files
sudo install -m 0750 -o root -g root /dev/null /usr/local/sbin/backup-files.sh
sudoedit /usr/local/sbin/backup-files.sh
bash -n /usr/local/sbin/backup-files.sh
```

متن اسکریپت همان بلوک بخش Production Example است، بدون حذف خط. بعد از ذخیره، یک‌بار با دست:

```bash
sudo /usr/local/sbin/backup-files.sh
sudo ls -l /var/backups/files
sudo tail -n 20 /var/log/backup-files.log
```

باید یک فایل `.tar.gz` با حالت `0600` ببینید و خط `info` با کلمهٔ complete. وضعیت خروج ۰. این اجرا یکی از هفت نسخه را مصرف می‌کند و اشکالی ندارد.

زمان‌بند، فقط cron، فایل `/etc/cron.d/backup-files` با مالک root و حالت `0644`. نام بدون نقطه:

```text
SHELL=/bin/bash
PATH=/usr/local/sbin:/usr/local/bin:/usr/sbin:/usr/bin:/sbin:/bin
MAILTO=""

10 3 * * * root /usr/local/sbin/backup-files.sh
```

اگر برای همین اسکریپت timer ساخته‌اید، این فایل را نگذارید. ساعت ۰۳:۱۰ از دامپ دیتابیس روی `db-1` جداست. دامپ آنجا ۰۲:۲۰ و ۰۲:۵۰ است. این یکی روی دیسک `app-1` است.

کانفیگ چرخش `/etc/logrotate.d/backup-files`:

```text
/var/log/backup-files.log {
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

```bash
sudo logrotate --debug /etc/logrotate.d/backup-files
```

## Configuration

بالای اسکریپت این مقدارها قابل تغییرند. منطق پایین را برای یک سرور کپی نکنید.

| متغیر | مقدار آزمایشگاه | معنی |
| --- | --- | --- |
| `BACKUP_ROOT` | `/var/backups/files` | مقصد، حالت اعمال‌شده `0700` |
| `sources` | `/opt/apps` و `/etc` | مبدأ ثابت، بدون آرگومان |
| `RETENTION` | `7` | تعداد فایل نهایی که می‌ماند |
| `MIN_FREE_KB` | `1048576` | کف فضای خالی به کیبی‌بایت، حدود یک گیبی‌بایت |
| `LOG_FILE` | `/var/log/backup-files.log` | حالت `0640`، گروه `adm` |

اگر `/var` جدا mount شده و کوچک است، کف فضا را با اندازهٔ واقعی `/opt/apps` تنظیم کنید. `du -sk /opt/apps /etc` را در وقت خلوت بزنید و کف را کمتر از آن نگذارید. فشرده‌سازی معمولاً کوچک‌تر می‌شود، ولی بدترین حالت این است که فشرده نشود.

هرس فقط فایل‌های همین میزبان را می‌بیند: پیشوند `hostname -s` و الگوی `files`. آرشیو میزبان دیگر اگر روزی به این پوشه کپی شود پاک نمی‌شود. نام میزبان باید فقط حرف و رقم و نقطه و خط تیره باشد. نام غریب یعنی خروج ۱، تا یک نام با اسلش یا فاصله وارد `rm` نشود.

## Production Example

اسکریپت کامل. همان را در `/usr/local/sbin/backup-files.sh` بگذارید.

```bash
#!/usr/bin/env bash
set -euo pipefail

# Archive /opt/apps and /etc. Keep 7 dated copies. Root only.
export LC_ALL=C
export TZ=Asia/Tehran
export PATH="/usr/local/sbin:/usr/local/bin:/usr/sbin:/usr/bin:/sbin:/bin"

BACKUP_ROOT="/var/backups/files"
LOG_FILE="/var/log/backup-files.log"
LOG_TAG="backup-files"
RETENTION=7
MIN_FREE_KB=1048576
FAIL_MSG=""
partial=""
list_file=""
host=""
final=""
sources=(
  /opt/apps
  /etc
)

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

on_exit() {
  local rc=$?
  if [[ -n "${partial}" && -f "${partial}" && ! -L "${partial}" ]]; then
    rm -f -- "${partial}" || true
  fi
  if [[ -n "${list_file}" && -f "${list_file}" ]]; then
    rm -f -- "${list_file}" || true
  fi
  if (( rc != 0 )) && [[ -f "${LOG_FILE}" && ! -L "${LOG_FILE}" ]]; then
    log err "${FAIL_MSG:-file backup failed with status ${rc}}" || true
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
  local mode owner
  mode="$(stat -c '%a' "${LOG_FILE}")"
  owner="$(stat -c '%u' "${LOG_FILE}")"
  [[ "${mode}" == "640" ]] || die "log mode ${mode} is not 0640"
  [[ "${owner}" == "0" ]] || die "log owner is not root"
}

check_sources() {
  local src
  for src in "${sources[@]}"; do
    if [[ ! -d "${src}" || -L "${src}" ]]; then
      die "source directory missing: ${src}"
    fi
    if [[ ! -r "${src}" ]]; then
      die "source directory not readable: ${src}"
    fi
  done
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
  local lock_file="${BACKUP_ROOT}/.backup-files.lock"
  if [[ -L "${lock_file}" ]]; then
    die "refusing symlink lock ${lock_file}"
  fi
  exec 9>"${lock_file}"
  if ! flock -n 9; then
    die "another file backup holds ${lock_file}"
  fi
}

make_archive() {
  local stamp src tar_rc
  local -a rel_sources=()
  stamp="$(date +%Y%m%d-%H%M%S)"
  host="$(hostname -s)"
  if [[ ! "${host}" =~ ^[A-Za-z0-9][A-Za-z0-9.-]*$ ]]; then
    die "unsafe hostname: ${host}"
  fi
  for src in "${sources[@]}"; do
    rel_sources+=("${src#/}")
  done
  final="${BACKUP_ROOT}/${host}-files-${stamp}.tar.gz"
  partial="${BACKUP_ROOT}/.${host}-files-${stamp}.tar.gz.partial"
  tar_rc=0
  tar --warning=no-file-changed -C / -czf "${partial}" -- "${rel_sources[@]}" || tar_rc=$?
  if (( tar_rc > 1 )); then
    die "tar failed with status ${tar_rc}"
  fi
  if (( tar_rc == 1 )); then
    log warning "tar returned 1; keeping archive only if it reads back"
  fi
  gzip -t -- "${partial}" || die "gzip test failed"
  tar -tzf "${partial}" >/dev/null || die "tar listing failed"
  mv -f -- "${partial}" "${final}"
  partial=""
  chmod 600 -- "${final}"
}

prune_old() {
  local f extra
  local -a files=()
  list_file="$(mktemp)"
  find "${BACKUP_ROOT}" -maxdepth 1 -type f -name "${host}-files-*.tar.gz" -printf '%T@\t%p\0' \
    | sort -z -n | cut -z -f2- > "${list_file}"
  while IFS= read -r -d '' f; do
    case "${f}" in
      "${BACKUP_ROOT}/${host}-files-"*.tar.gz) files+=("${f}") ;;
      *) die "refusing unexpected archive name: ${f}" ;;
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
    log info "removing old archive ${files[$i]}"
    rm -f -- "${files[$i]}"
  done
}

main() {
  if [[ "$(id -u)" -ne 0 ]]; then
    printf 'run backup-files as root\n' >&2
    exit 1
  fi
  umask 077
  prepare_log
  check_sources
  mkdir -p -- "${BACKUP_ROOT}"
  chmod 700 "${BACKUP_ROOT}"
  take_lock
  check_space
  log info "file backup starting"
  make_archive
  prune_old
  log info "file backup complete ${final}"
  exit 0
}

main "$@"
```

باز کردن آزمایشی یک عضو، بدون نوشتن روی `/`:

```bash
archive="$(sudo find /var/backups/files -maxdepth 1 -type f -name '*-files-*.tar.gz' | sort | tail -n 1)"
sudo tar -tzf "${archive}" | head
```

باید `etc/` و `opt/apps/` را در فهرست ببینید. بازیابی واقعی را روی یک پوشهٔ خالی تمرین کنید، نه با `-C /`.

## Security Notes

این آرشیو `/etc` را دارد. یعنی هر کلیدی که آنجا مانده، هر واحدی که رمز در فایل متنی دارد، و shadow. حالت `0600` و پوشهٔ `0700` حداقل کار است. کپی کردن فایل به یک share گروهی این محافظ را دور می‌زند. اگر نسخه باید از سرور خارج شود، مقصد باید به همان اندازه محدود باشد و انتقال با `scp` یا `rsync` روی SSH با کاربر مشخص باشد، نه با یک پوشهٔ وب.

اسکریپت آرگومان مسیر نمی‌گیرد تا کسی در cron مسیر ` /` یا یک لینک را به آن نچسباند. تغییر مبدأ یعنی ویرایش فایل و مرور دوباره، نه یک فلگ شبانه.

`tar` را از آرشیو نامطمئن با کاربر root روی `/` باز نکنید. مسیرهای داخل آرشیو نسبی‌اند ولی باز کردن در پوشهٔ اشتباه باز هم روی فایل موجود می‌نویسد.

قفل و لاگ symlink نیستند. نوشتن root از روی یک لینک، فایل هر جایی را که سازندهٔ لینک خواسته بزرگ می‌کند.

`set -x` را به این فایل اضافه نکنید. مبدأها محرمانه‌اند حتی اگر خود دستور tar رمز را در آرگومان نگذارد؛ trace شلوغ دیرتر به لاگ دستورهای دیگر هم سرایت می‌کند.

## Troubleshooting

| نشانه | علت | کار |
| --- | --- | --- |
| `source directory missing` | `/opt/apps` نیست یا symlink است | mount و مسیر را درست کنید. اسکریپت نباید پوشه را بسازد |
| `only N KiB free` | زیر کف فضا | نسخهٔ کهنهٔ دستی را جابه‌جا کنید یا `MIN_FREE_KB` را با دلیل کم کنید |
| `another file backup holds` | اجرای قبلی مانده، یا cron و timer هر دو هستند | `ps` برای `backup-files` و `tar`. یکی از زمان‌بندها را بردارید |
| هر شب `tar returned 1` و فایل هست | هشدار غیرکشنده، آزمون خواندن رد شده | اگر `gzip -t` در اجرای بعدی رد شود فایل همان شب نمی‌ماند. یک‌بار `tar -tzf` دستی |
| فایل نهایی نیست و لاگ `err` دارد | شکست بعد از ساخت موقت | تله باید `.partial` را برداشته باشد. اگر مانده، تله اجرا نشده |
| هفت نسخه نمانده و فایل امشب خراب است | هرس قبل از آزمون خواندن بوده | این نسخهٔ اسکریپت هرس را بعد از `gzip -t` انجام می‌دهد. فایل را عوض نکنید |
| `unsafe hostname` | `hostname -s` نویسهٔ غریب دارد | نام میزبان را ساده کنید |
| logrotate فایل را رد می‌کند | دستور `su` نیست | کانفیگ همین صفحه |
| آرشیو را `deploy` نمی‌بیند | حالت `0600` root | عمدی است. خواندن با `sudo` |

اگر `bash -n` خطا داد، فایل موقع کپی ناقص شده است. بلوک را دوباره کامل بگذارید. خطای `unexpected EOF` یعنی `fi` یا نقل‌قول جا مانده است.

## Best Practices

- یک زمان‌بند. قبل از افزودن timer، وجود `/etc/cron.d/backup-files` را چک کنید.
- هرس را قبل از تمام شدن آزمون خواندن نیاورید. نسخهٔ ناقص نباید یکی از هفت نسخهٔ معتبر شمرده شود.
- مبدأ ثابت بماند. آرگومان مسیر اضافه نکنید.
- رمز و کلید را زیر `/root/.backup` نگه دارید تا این tar مجبور نباشد آن‌ها را هر شب کپی کند. اگر مجبورید چیزی محرمانه در `/etc` بماند، مقصد بکاپ را مثل خود `/etc` محدود کنید.
- بازیابی را فصلی یک‌بار روی VM تمرین کنید. آرشیوی که باز نشده، بکاپ نیست.
- دامپ دیتابیس را با این tar عوض نکنید. هر کدام خرابی خودش را پوشش می‌دهد.
- اجرای دستی وسط شب اشکالی ندارد؛ قفل نمی‌گذارد با cron قاطی شود. اگر قفل را گرفتید، صبر کنید تا تمام شود و اجرای دوم را با دست شروع نکنید مگر اینکه بدانید اولی مرده و قفل مانده نیست. `flock` با مرگ فرایند آزاد می‌شود چون روی توصیف‌گر باز است، نه یک فایل قفل کهنه.
