---
sidebar_position: 10
title: اسکریپت پاک‌سازی لاگ
description: حذف فایل فشردهٔ قدیمی‌تر از ۱۴ روز زیر یک مسیر مشخص مثل /var/log/nginx، با dry-run، بدون دست زدن به کل /var/log یا journal.
---

# اسکریپت پاک‌سازی لاگ

## مقدمه

لاگ متنی که می‌چرخد و فشرده می‌شود اگر سقفی نداشته باشد دیسک `app-1` را پر می‌کند. logrotate کار معمول چرخش `nginx` است. این اسکریپت تور ایمنی جداست برای فایل فشردهٔ قدیمی‌تر از ۱۴ روز زیر یک پوشهٔ مشخص: پیش‌فرض `/var/log/nginx`، و اگر برنامهٔ خودتان می‌نویسد `/var/log/myapp`. کل `/var/log` را پاک نمی‌کند. journal باینری را هم پاک نمی‌کند.

پیش‌فرض اجرا dry-run است: نام فایل‌هایی را که حذف می‌شدند چاپ می‌کند و هیچ چیز را برنمی‌دارد. حذف فقط با `--apply` است. cron تولید باید `--apply` داشته باشد، و آن خط را بعد از یک dry-run واقعی می‌گذارید نه قبل.

`journalctl --vacuum-time=14d` و `--vacuum-size` ابزار دیگری است. journal زیر `/var/log/journal` است و این اسکریپت آن مسیر را عمداً رد می‌کند. روش خالی کردن journal در [journalctl](/docs/01-linux/journalctl) است. این دو را با هم قاطی نکنید و یکی را جای دیگری در cron نگذارید.

میزبان نمونه `app-1.example.internal` یعنی `10.10.1.10` است. برای لاگ `nginx` اسکریپت را root اجرا می‌کند، چون پوشه را root می‌نویسد. اگر `/var/log/myapp` مال `deploy` است، همان کاربر می‌تواند اجرا کند به شرطی که فایل اسکریپت برایش قابل اجرا باشد.

## مفهوم اصلی

محدوده قبل از `find` بسته می‌شود.

`realpath -e` مسیر را به شکل مطلق درمی‌آورد و اگر پوشه نباشد شکست می‌خورد. symlink حل می‌شود، پس آرگومان `/var/log/nginx/../../etc` به `/etc` تبدیل می‌شود و بعد رد می‌شود. آزمون بعدی روی مسیر حل‌شده است، نه روی متنی که کاربر داده.

فقط این مسیرها مجازند: یک زیرپوشهٔ `/var/log`، نه خود `/var/log`، و نه `/var/log/journal` و هیچ چیز زیر آن. `/var/log/nginx` و `/var/log/myapp` هر دو مجازند. `/var/log/nginx/old` هم مجاز است اگر واقعاً پوشه باشد. هر جای دیگر، از جمله `/opt/apps` و `/etc` و `/`، خروج ۱ است.

`find` این محدودیت‌ها را دارد:

- `-xdev` از این فایل‌سیستم پایین‌تر نمی‌رود. اگر کسی یک mount دیگر را داخل پوشهٔ لاگ وصل کرده باشد، جارو نمی‌شود.
- `-L` نیست. symlink دنبال نمی‌شود.
- فقط `-type f`. پوشه، سوکت، و خود symlink حذف نمی‌شوند.
- نام باید به `.gz` یا `.xz` یا `.bz2` ختم شود. `access.log` و `error.log` و `access.log.1` که هنوز فشرده نشده‌اند دست نمی‌خورند. آن‌ها مال logrotate هستند.
- `-mtime +14` یعنی سن فایل، با واحد ۲۴ ساعت، بیشتر از ۱۴ باشد. فایلی که دقیقاً ۱۴ روز سن دارد ممکن است تا عبور از مرز روز بعد بماند. این رفتار `find` است، نه یک روز اضافهٔ تصادفی. برای «قدیمی‌تر از ۱۴ روز» همان علامت مثبت درست است. `-mtime 14` یعنی حدود همان روز، و `-mtime -14` یعنی جدیدتر، که برعکس خواستهٔ ماست.

قبل از `rm` مسیر دوباره با پیشوند همان `realpath` سنجیده می‌شود و پسوند دوباره چک می‌شود. `rm -rf` روی پوشه هیچ‌جا صدا زده نمی‌شود. هر حذف یک `rm -f` روی یک فایل است.

قفل `flock` یک فایل مخفی داخل همان پوشهٔ هدف است، تا دو cron هم‌زمان روی یک درخت `rm` نزنند. فایل قفل پسوند فشرده ندارد و حذف نمی‌شود. اگر پوشه قابل نوشتن نباشد، حتی dry-run هم می‌ایستد، چون قفل باید ساخته شود. این برای root روی `/var/log/nginx` مسئله نیست.

خروج ۰ یعنی کار تمام شده، حتی اگر dry-run چیزی برای حذف فهرست کرده باشد. dry-run پیش‌نمایش است نه خطا. خروج ۱ یعنی مسیر غیرمجاز، پوشهٔ گم‌شده، قفل، یا شکست `rm`. خروج ۲ یعنی آرگومان نامفهوم.

## چرا استفاده می‌شود؟

logrotate با `rotate` تعداد فایل را محدود می‌کند اگر کانفیگ درست باشد. این اسکریپت جای کانفیگ خراب یا برنامه‌ای است که خودش `*.gz` می‌سازد و سقفی ندارد. هر دو با هم کار می‌کنند: logrotate فایل زنده را می‌چرخاند، این اسکریپت فشردهٔ کهنه‌تر از ۱۴ روز را برمی‌دارد حتی اگر شمارندهٔ logrotate را کسی زیاد کرده باشد.

کور پاک کردن `/var/log` سرویس را از لاگی که همین حالا لازم دارد محروم می‌کند و ممکن است `wtmp`، `btmp`، و journal را هم ببرد. محدودیت مسیر و پسوند برای همین است. ۱۴ روز با پنجرهٔ عیب‌یابی یک حادثهٔ آخر هفته تا هفتهٔ بعد جور است. اگر سازمان نگهداری طولانی‌تر می‌خواهد، `RETENTION_DAYS` را بالا ببرید، نه اینکه اسکریپت را بردارید و `rm` دستی بگذارید.

جدا بودن vacuum برای این است که journal فایل متنی `*.gz` نیست. `find` روی آن یا هیچ کاری نمی‌کند یا، اگر کسی الگو را شل کند، آرشیو journal را سوراخ می‌کند. رد کردن صریح `/var/log/journal` این شل شدن را گران می‌کند: اسکریپت می‌میرد به‌جای اینکه «چیزی پیدا نکرد» وانمود کند.

## Architecture

```text
انسان:  log-cleaner.sh --dry-run /var/log/nginx
        بعد از دیدن فهرست:
cron:   log-cleaner.sh --apply /var/log/nginx

        │
        ▼
realpath  باید زیر /var/log باشد و journal نباشد
        │
        ▼
flock روی پوشهٔ هدف
        │
        ▼
find -xdev  فقط *.gz و *.xz و *.bz2 با -mtime +14
        │
        ├── dry-run   چاپ DRY و خروج ۰
        └── --apply   rm -f همان فایل، لاگ، چاپ REMOVE

جدا:
journalctl --vacuum-time=14d     فقط journal، در فصل لینوکس
```

## Installation

`find` و `flock` و `realpath` روی Ubuntu Server هستند. اسکریپت را root-owned بگذارید تا `deploy` بتواند برای پوشهٔ خودش اجرا کند ولی متن را عوض نکند.

```bash
sudo install -m 0750 -o root -g deploy /dev/null /usr/local/sbin/log-cleaner.sh
sudoedit /usr/local/sbin/log-cleaner.sh
bash -n /usr/local/sbin/log-cleaner.sh
sudo install -m 640 -o root -g adm /dev/null /var/log/log-cleaner.log
```

اگر پوشهٔ برنامه جداست و هنوز نیست:

```bash
sudo install -d -o deploy -g deploy -m 0750 /var/log/myapp
```

اولین اجرا بدون `--apply`. روی تولید هم همین را بزنید قبل از cron. خروجی باید یا خالی باشد یا خط `DRY` با مسیر فشرده. نباید `access.log` بدون پسوند فشرده در فهرست باشد.

```bash
sudo /usr/local/sbin/log-cleaner.sh --dry-run /var/log/nginx
sudo /usr/local/sbin/log-cleaner.sh --dry-run /var/log/myapp
```

اگر `/var/log/nginx` نیست، خروج غیرصفر درست است. اسکریپت پوشه را نمی‌سازد.

cron فقط بعد از dry-run قابل قبول، فایل `/etc/cron.d/log-cleaner`، نام بدون نقطه، و فقط یک زمان‌بند:

```text
SHELL=/bin/bash
PATH=/usr/local/sbin:/usr/local/bin:/usr/sbin:/usr/bin:/sbin:/bin
MAILTO=""

20 4 * * * root /usr/local/sbin/log-cleaner.sh --apply /var/log/nginx
```

ساعت ۰۴:۲۰ بعد از بکاپ فایل ۰۳:۱۰ است تا پاک‌سازی همان شب، آرشیوی را که هنوز در حال خواندن است شلوغ نکند. این اسکریپت داخل `/var/backups` را نگاه نمی‌کند. تداخل مستقیم ندارد. فاصله برای دیسک و برای خواندن لاگ حادثه است.

برای `/var/log/myapp` اگر مالک `deploy` است، یا یک خط جدا با کاربر `deploy` بگذارید یا همان خط root را نگه دارید. دو خط برای یک پوشه نگذارید. timer جدا هم برای همین اسکریپت نگذارید.

چرخش خود لاگ این اسکریپت، `/etc/logrotate.d/log-cleaner`:

```text
/var/log/log-cleaner.log {
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

| متغیر یا فلگ | مقدار | اثر |
| --- | --- | --- |
| `RETENTION_DAYS` | `14` | به `find` به‌صورت `+14` داده می‌شود. کمتر از ۱ رد می‌شود |
| `DEFAULT_DIR` | `/var/log/nginx` | اگر آرگومان مسیر ندهید |
| `--dry-run` | پیش‌فرض | فقط چاپ |
| `--apply` | خاموش تا بخواهید | حذف همان فهرست |
| `LOG_FILE` | `/var/log/log-cleaner.log` | حذف‌ها اینجا هم می‌آیند |

مسیر آرگومان جای پیش‌فرض را می‌گیرد. بیش از یک مسیر در یک اجرا قبول نیست. دو پوشه یعنی دو خط cron، تا لاگ هر کدام روشن باشد.

`RETENTION_DAYS=0` را نگذارید. `+0` تقریباً هر فشرده‌ای را که از مرز روز گذشته برمی‌دارد، از جمله چرخش دیشب. اسکریپت عدد کمتر از ۱ را رد می‌کند.

## Production Example

```bash
#!/usr/bin/env bash
set -euo pipefail

# Delete compressed logs older than 14 days under one directory.
# Default is dry-run. Does not touch /var/log itself or the journal.
export LC_ALL=C
export TZ=Asia/Tehran
export PATH="/usr/local/sbin:/usr/local/bin:/usr/sbin:/usr/bin:/sbin:/bin"

RETENTION_DAYS=14
DEFAULT_DIR="/var/log/nginx"
LOG_FILE="/var/log/log-cleaner.log"
LOG_TAG="log-cleaner"
FAIL_MSG=""
list_file=""
mode="dry-run"
real=""

log() {
  local level="$1"
  shift
  local line
  printf -v line '%s [%s] %s' "$(date -Is)" "${level}" "$*"
  if [[ -f "${LOG_FILE}" && ! -L "${LOG_FILE}" && -w "${LOG_FILE}" ]]; then
    printf '%s\n' "${line}" >> "${LOG_FILE}"
  fi
  logger -t "${LOG_TAG}" -p "user.${level}" -- "$*" || true
}

die() {
  FAIL_MSG="$*"
  printf '%s\n' "${FAIL_MSG}" >&2
  exit 1
}

usage() {
  FAIL_MSG="usage: log-cleaner.sh [--dry-run|--apply] [directory]"
  printf '%s\n' "${FAIL_MSG}" >&2
  exit 2
}

on_exit() {
  local rc=$?
  if [[ -n "${list_file}" && -f "${list_file}" ]]; then
    rm -f -- "${list_file}" || true
  fi
  if (( rc != 0 )) && [[ "${rc}" -ne 2 ]]; then
    log err "${FAIL_MSG:-log-cleaner failed with status ${rc}}" || true
  fi
  exit "${rc}"
}
trap on_exit EXIT
trap 'exit 130' INT
trap 'exit 143' TERM

parse_args() {
  local dir_set=0
  local dir="${DEFAULT_DIR}"
  while [[ $# -gt 0 ]]; do
    case "$1" in
      --dry-run) mode="dry-run" ;;
      --apply) mode="apply" ;;
      --) usage ;;
      -*) usage ;;
      *)
        if (( dir_set == 1 )); then
          usage
        fi
        dir="$1"
        dir_set=1
        ;;
    esac
    shift
  done
  if [[ ! "${RETENTION_DAYS}" =~ ^[0-9]+$ ]] || (( RETENTION_DAYS < 1 )); then
    die "RETENTION_DAYS must be an integer >= 1"
  fi
  if ! real="$(realpath -e -- "${dir}")"; then
    die "directory does not exist: ${dir}"
  fi
  case "${real}" in
    /var/log|/var/log/)
      die "refusing to clean all of /var/log"
      ;;
    /var/log/journal|/var/log/journal/*)
      die "refusing journal path; use journalctl vacuum"
      ;;
    /var/log/*)
      ;;
    *)
      die "path must be a subdirectory of /var/log: ${real}"
      ;;
  esac
  if [[ ! -d "${real}" || -L "${real}" ]]; then
    die "not a real directory: ${real}"
  fi
  if [[ ! -w "${real}" ]]; then
    die "directory not writable: ${real}"
  fi
}

take_lock() {
  local lock_file="${real}/.log-cleaner.lock"
  if [[ -L "${lock_file}" ]]; then
    die "refusing symlink lock ${lock_file}"
  fi
  exec 9>"${lock_file}"
  if ! flock -n 9; then
    die "another log-cleaner holds ${lock_file}"
  fi
}

clean() {
  local path seen removed
  seen=0
  removed=0
  list_file="$(mktemp)"
  find "${real}" -xdev -type f \
    \( -name '*.gz' -o -name '*.xz' -o -name '*.bz2' \) \
    -mtime "+${RETENTION_DAYS}" -print0 > "${list_file}"
  while IFS= read -r -d '' path; do
    case "${path}" in
      "${real}"/*) ;;
      *) die "refusing path outside target: ${path}" ;;
    esac
    if [[ -L "${path}" || ! -f "${path}" ]]; then
      log warning "skip non-regular ${path}"
      continue
    fi
    case "${path}" in
      *.gz|*.xz|*.bz2) ;;
      *) die "refusing unexpected suffix: ${path}" ;;
    esac
    seen=$((seen + 1))
    if [[ "${mode}" == "dry-run" ]]; then
      printf 'DRY %s\n' "${path}"
      continue
    fi
    rm -f -- "${path}"
    removed=$((removed + 1))
    printf 'REMOVE %s\n' "${path}"
    log info "removed ${path}"
  done < "${list_file}"
  rm -f -- "${list_file}"
  list_file=""
  if [[ "${mode}" == "dry-run" ]]; then
    printf 'DRY files=%s\n' "${seen}"
    log info "dry-run ${real} files=${seen}"
  else
    log info "apply ${real} removed=${removed}"
    if (( removed == 0 )); then
      printf 'REMOVE files=0\n'
    fi
  fi
}

main() {
  if [[ -L "${LOG_FILE}" ]]; then
    printf 'refusing symlink log %s\n' "${LOG_FILE}" >&2
    exit 1
  fi
  parse_args "$@"
  take_lock
  log info "start mode=${mode} dir=${real}"
  clean
  exit 0
}

main "$@"
```

من انتظار دارم خط `REMOVE files=0` در اجرای apply بدون فایل کهنه چاپ شود تا اپراتور دستی بداند کار کرده است. cron با `MAILTO=""` آن یک خط را دور می‌ریزد. اگر نامه را روشن کرده‌اید و هر شب «صفر فایل» نمی‌خواهید، همان `printf` صفر را بردارید و به خط `info` داخل فایل لاگ اکتفا کنید.

آزمون مسیر ممنوع باید بدون حذف بماند:

```bash
sudo /usr/local/sbin/log-cleaner.sh --dry-run /var/log
sudo /usr/local/sbin/log-cleaner.sh --dry-run /var/log/journal
sudo /usr/local/sbin/log-cleaner.sh --dry-run /etc
printf 'exit=%s\n' "$?"
```

هر سه باید غیرصفر باشند. آخری وضعیت ۱ است. `/var/log` و journal هم وضعیت ۱. هیچ فایلی نباید جابه‌جا شده باشد. بعد از این، dry-run مسیر واقعی و فقط سپس `--apply`.

## Security Notes

حذف با root روی مسیری که از آرگومان می‌آید خطرناک است اگر آزمون `realpath` نباشد. این اسکریپت آن آزمون را دارد و باز هم cron را با مسیر ثابت بنویسید، نه با متغیر محیطی که کاربر دیگر بتواند بگذارد. فایل `/etc/cron.d/log-cleaner` را فقط root می‌نویسد.

`deploy` را در sudoers برای این اسکریپت `NOPASSWD` نکنید. اگر پوشهٔ برنامه مال اوست، خط cron با کاربر `deploy` کافی است. اگر مال root است، خود cron با root اجرا می‌کند. یک sudo عمومی برای «پاک کردن لاگ» یعنی `deploy` می‌تواند آرگومان را عوض کند و، اگر آزمون مسیر روزی شل شود، فراتر از لاگ برود. آزمون مسیر را به امید sudo محدود برندارید.

فایل قفل داخل پوشهٔ لاگ برای دیگران قابل نوشتن نباشد. حالت `/var/log/nginx` معمولاً `0755` root است. جهان می‌تواند فهرست را ببیند ولی فایل قفل را عوض نمی‌کند اگر فایل را root با umask سخت ساخته باشد. بالای اسکریپت `umask` نیست. یک خط `umask 077` قبل از `exec 9` قفل را برای دیگران ناخوانا می‌کند. در بلوک بالا اضافه نشده تا قفل ساده بماند؛ پوشه اگر `0755` است، دیگران می‌توانند وجود قفل را ببینند نه اینکه فایل لاگ را حذف کنند. حذف فقط دست خود اسکریپت است.

خروجی dry-run نام فایل است. اگر نام فایل راز باشد، خروجی را به چت نفرستید. معمولاً `access.log.2.gz` راز نیست. محتوای فایل را این اسکریپت چاپ نمی‌کند.

## Troubleshooting

| نشانه | علت | کار |
| --- | --- | --- |
| dry-run خالی است و دیسک هنوز پر است | جا را فایل فشردهٔ کهنه نگرفته | `du -sh /var/log/*` و خود journal. vacuum جداست |
| `access.log` در فهرست DRY است | الگو را عوض کرده‌اید | فقط سه پسوند فشرده. فایل زنده را برگردانید اگر apply شده |
| `refusing to clean all of /var/log` | آرگومان خود `/var/log` است | زیرپوشه بدهید |
| `refusing journal path` | مسیر journal است | [journalctl](/docs/01-linux/journalctl) و vacuum. این اسکریپت را وادار نکنید |
| فایل ۱۴ روزه هنوز هست | `+14` یعنی بیشتر از ۱۴ شبانه‌روز | فردا دوباره، یا اگر سیاستتان فرق دارد عدد را عوض کنید |
| `directory not writable` | با `deploy` روی لاگ nginx | root، یا پوشه را به `deploy` بدهید اگر واقعاً مال برنامه است |
| `another log-cleaner holds` | هم cron هم timer، یا apply دستی وسط cron | یکی از زمان‌بندها. فرایند مانده را با `ps` ببینید |
| چیزی حذف نشد و حالت apply بود | فراموش کردید اسکریپت پیش‌فرض dry-run است و فلگ را نگذاشته‌اید | خط cron را با `--apply` ببینید |
| `path must be a subdirectory` | realpath بیرون `/var/log` رفته | لینک یا مسیر اشتباه. مقصد را عوض نکنید که آزمون را رد کند |

اگر apply فایلی را برد که هنوز لازم بود، از بکاپ فایل همان شب برگردانید اگر `/var/log/nginx` داخل tar نیست. بکاپ فایل این فصل `/opt/apps` و `/etc` است، نه `/var/log`. لاگ پاک‌شده را از این tar انتظار نداشته باشید. ۱۴ روز برای همین فاصلهٔ تصمیم است: dry-run را بخوانید قبل از اینکه cron هر شب apply کند.

## Best Practices

- اول dry-run، بعد `--apply` در cron. پیش‌فرض را برعکس نکنید.
- یک پوشه در هر اجرا. `/var/log` را به‌عنوان میانبر ندهید.
- journal را با `find` تمیز نکنید. vacuum را در فصل لینوکس نگه دارید.
- پسوند را شل نکنید تا `*.log` را هم بگیرد. چرخش نفشرده کار logrotate است.
- `rm -rf` اضافه نکنید. یک فایل، یک `rm`.
- ساعت پاک‌سازی را از ساعت بکاپ فاصله بدهید و برای همین کار timer دوم نسازید.
- `RETENTION_DAYS` را در حادثهٔ «دیسک پر است» یک‌شبه صفر نکنید. اول ببینید کدام پوشه بزرگ است. صفر کردن، لاگ همان حادثه را هم می‌برد.
