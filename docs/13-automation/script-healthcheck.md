---
sidebar_position: 9
title: اسکریپت سلامت سرور
description: بررسی دیسک بالای ۸۵ درصد، load، و سرویس nginx و ssh روی app-1 با خروجی کوتاه مناسب cron و خروج ۲ اگر سرویس inactive باشد.
---

# اسکریپت سلامت سرور

## مقدمه

این اسکریپت روی `app-1.example.internal` (`10.10.1.10`) هر پنج دقیقه جواب یک سؤال را می‌دهد: آیا دیسک از ۸۵ درصد گذشته، آیا load یک‌دقیقه‌ای از تعداد CPU گذشته، و آیا `nginx` و `ssh` فعال‌اند. اگر هر دو سرویس فعال باشند و منبع از آستانه نگذشته باشد، هیچ خطی چاپ نمی‌کند و وضعیت ۰ برمی‌گرداند. سکوت یعنی سالم، به شرطی که خود زمان‌بند واقعاً اسکریپت را صدا زده باشد.

اگر `nginx` یا `ssh` چیزی غیر از `active` باشد، وضعیت ۲ است. اگر فقط دیسک یا load بد باشد، یا `df` گیر کرده باشد، یا اجرای قبلی هنوز قفل را نگه داشته، وضعیت ۱ است. وضعیت ۲ را برای سرویس گذاشته‌ایم تا در `ExecMainStatus` تایمر یا در نامه، اگر روزی نامه را روشن کردید، از هشدار دیسک جدا باشد. هر دو غیرصفرند و هر دو شکست‌اند.

کاربر اجرا `deploy` است. `df` و `systemctl is-active` برای کاربر غیر root روی واحدهای سیستمی کار می‌کنند. اسکریپت سرویس را restart نمی‌کند و فایل لاگ برنامه را نمی‌خواند.

زمان‌بند این صفحه فقط cron است. نمونهٔ کامل timer در [cron](/docs/13-automation/cron) است. یکی را نصب کنید. اگر timer را انتخاب کردید، فایل `/etc/cron.d/healthcheck` را نسازید.

## مفهوم اصلی

آستانهٔ دیسک «بالای ۸۵ درصد» است، نه ۸۵ و بیشتر. استفادهٔ دقیقاً ۸۵ هشدار نیست. درصد را از `df` می‌خوانیم، نه از یک فایل کش‌شده. فایل‌سیستم‌های `tmpfs` و `devtmpfs` و `squashfs` و `overlay` و `efivarfs` کنار گذاشته می‌شوند تا حافظهٔ موقت و لایهٔ کانتینر، دیسک پر جا نزند. ریشهٔ سرور Ubuntu آزمایشگاه ext4 یا xfs است و در این فهرست نیست. اگر روزی ریشه خودش overlay باشد، این حذف باعث کور شدن چک دیسک می‌شود و باید آن نوع را از فهرست `-x` بردارید.

`df` اگر یک mount شبکه گیر کرده باشد ممکن است تا ابد نماند. دور دستور `timeout 20` است. اگر مهلت تمام شود یک خط `CRIT df timed out or failed` چاپ می‌شود و پرچم منبع روشن می‌شود. بقیهٔ چک‌ها هنوز اجرا می‌شوند تا اگر `nginx` هم خوابیده باشد وضعیت ۲ بدهید، نه فقط ۱.

load از `/proc/loadavg` است، فیلد اول، یعنی میانگین یک دقیقه. این درصد CPU نیست. عدد را با `nproc` مقایسه می‌کنیم. اگر load بزرگ‌تر از تعداد CPU ضرب در `LOAD_PER_CPU` باشد هشدار است. پیش‌فرض ضریب ۱ است: روی ماشین چهار هسته‌ای، load بالای ۴ هشدار است. ماشین بیلد را با ضریب بالاتر آرام کنید، نه با خاموش کردن چک. مقایسه اعشاری با `awk` است چون `((` پوسته فقط عدد صحیح است. جداکنندهٔ اعشار در `/proc/loadavg` همیشه نقطه است. `LC_ALL=C` همان را برای `awk` ثابت می‌کند.

سرویس‌ها در آرایهٔ `nginx` و `ssh` هستند. روی Ubuntu 26.04 و Debian 13 واحد OpenSSH نام `ssh.service` دارد، نه `sshd`. `systemctl is-active` متن وضعیت را چاپ می‌کند و اگر فعال نباشد غیرصفر برمی‌گردد. آن غیرصفر زیر `set -e` کشنده است، پس خروجی را می‌گیریم و شکست دستور را در همان انتساب با شکل `|| true` فقط برای همین پرسش مجاز می‌شماریم. بعد خود متن را با `active` مقایسه می‌کنیم. `inactive` و `failed` و `activating` و رشتهٔ خالی همه غیرسالم‌اند.

خروجی فقط خط مشکل است، کوتاه، مناسب cron:

```text
CRIT disk /var 91%
WARN load 4.20 cpus 4 factor 1
CRIT service nginx inactive
```

موفقیت یک مُهر در `/var/lib/healthcheck/last-ok` می‌نویسد و بس. اگر این فایل از چند دوره قدیمی‌تر از پنج دقیقه باشد، یا زمان‌بند نمرده یا ساعت سیستم پریده است. خود اسکریپت این تازگی را چک نمی‌کند تا با خودش مسابقه ندهد. ابزار پایش می‌تواند سن فایل را ببیند.

قفل `flock` غیرمسدود است. اگر اجرای قبلی، معمولاً به‌خاطر `df` گیرکرده، هنوز مانده باشد، خط `WARN healthcheck already running` و وضعیت ۱. قفل با بسته شدن توصیف‌گر آزاد می‌شود و فایل قفل کهنه بعد از مرگ فرایند مانع اجرا نیست.

## چرا استفاده می‌شود؟

پایش کامل این دانشنامه جای دیگری است. این اسکریپت جایگزین Prometheus نیست. کاری است که وقتی پایش بیرونی خودش در دسترس نیست، یا هنوز نصب نشده، باز هم دیسک پر و مرگ `nginx` را در journal یا در وضعیت cron نشان می‌دهد. خروجی‌اش کوتاه است تا اگر `MAILTO` را روشن کردید نامه فقط همان سه خط باشد، نه یک `df` کامل.

وضعیت ۲ برای این است که «ssh خواب است» با «دیسک ۸۶ درصد است» یکی نشود. هر دو باید بیدارشان کنید. اولی یعنی ورود بعدی ممکن است ناممکن باشد. دومی یعنی چند ساعت وقت دارید. اگر هر دو با هم‌اند، وضعیت ۲ می‌ماند چون سرویس مهم‌تر از هشدار ظرفیت است، و خط دیسک هم چاپ شده است.

## Architecture

```text
*/5  cron.d/healthcheck  کاربر deploy
        │
        ▼
/usr/local/sbin/healthcheck.sh
        ├── timeout 20 df     درصد استفاده، بدون tmpfs و overlay
        ├── /proc/loadavg     مقایسه با nproc
        └── systemctl is-active nginx
            systemctl is-active ssh
                    │
        ┌───────────┼────────────┐
        ▼           ▼            ▼
   stdout خالی   stdout CRIT   stdout WARN
   exit 0        exit 2        exit 1
   last-ok       سرویس         دیسک یا load یا قفل

/var/lib/healthcheck/last-ok
logger -t healthcheck          فقط هنگام شکست
```

## Installation

```bash
sudo install -d -o deploy -g deploy -m 0755 /var/lib/healthcheck
sudo install -m 0750 -o root -g deploy /dev/null /usr/local/sbin/healthcheck.sh
sudoedit /usr/local/sbin/healthcheck.sh
bash -n /usr/local/sbin/healthcheck.sh
sudo -u deploy /usr/local/sbin/healthcheck.sh
printf 'exit=%s\n' "$?"
```

روی `app-1` سالم، خروجی خالی و `exit=0` است و `last-ok` تازه است. روی میزبانی که `nginx` نصب نیست، وضعیت ۲ درست است. این اسکریپت را روی `db-1` نگذارید مگر واحد `nginx` آنجا واقعاً باید فعال باشد. `db-1` (`10.10.1.20`) در آزمایشگاه سرور دیتابیس است، نه وب.

`timeout` از `coreutils` است و `awk` از `gawk` یا `mawk`. Ubuntu Server هر دو را دارد.

زمان‌بند، یک فایل، `/etc/cron.d/healthcheck`، مالک root، حالت `0644`، نام بدون نقطه:

```text
SHELL=/bin/bash
PATH=/usr/local/sbin:/usr/local/bin:/usr/sbin:/usr/bin:/sbin:/bin
MAILTO=""

*/5 * * * * deploy /usr/local/sbin/healthcheck.sh
```

timer را همزمان enable نکنید. اگر تیم timer می‌خواهد، همین خط را حذف کنید و واحدهای صفحهٔ cron را نصب کنید. `User=deploy` در آن سرویس باید بماند.

## Configuration

| متغیر | پیش‌فرض | اثر |
| --- | --- | --- |
| `DISK_THRESHOLD` | `85` | هشدار فقط اگر درصد بزرگ‌تر از این باشد |
| `LOAD_PER_CPU` | `1` | آستانه برابر تعداد CPU ضرب در این ضریب |
| `STATE_DIR` | `/var/lib/healthcheck` | قفل و `last-ok`، مالک `deploy` |
| `services` | `nginx` و `ssh` | هر نامی غیر از `active` یعنی وضعیت ۲ |

ضریب load را اعشاری می‌توانید بگذارید، مثلاً `1.5`. آن را داخل نقل‌قول نگه دارید چون مقدار به `awk` می‌رود. آستانهٔ دیسک عدد صحیح است.

واحد SSH اگر روی یک میزبان قدیمی `sshd` است، فقط عضو آرایه را عوض کنید و بقیهٔ منطق را دست نزنید. نام را با `systemctl list-unit-files 'ssh*'` دربیاورید، حدس نزنید.

## Production Example

```bash
#!/usr/bin/env bash
set -euo pipefail

# Short cron health check for app-1. Quiet when healthy.
# Exit 2 when nginx or ssh is not active. Exit 1 for disk, load, or lock.
export LC_ALL=C
export TZ=Asia/Tehran
export PATH="/usr/local/sbin:/usr/local/bin:/usr/sbin:/usr/bin:/sbin:/bin"

DISK_THRESHOLD=85
LOAD_PER_CPU="1"
STATE_DIR="/var/lib/healthcheck"
LOCK_FILE="${STATE_DIR}/.lock"
handled=0
resource_bad=0
service_bad=0
services=(
  nginx
  ssh
)

finish() {
  handled=1
  exit "$1"
}

on_exit() {
  local rc=$?
  if (( rc != 0 && handled == 0 )); then
    printf 'CRIT healthcheck aborted with status %s\n' "${rc}"
  fi
  exit "${rc}"
}
trap on_exit EXIT
trap 'exit 130' INT
trap 'exit 143' TERM

check_disk() {
  local df_out pct mount seen
  seen=0
  if ! df_out="$(timeout 20 df --output=pcent,target -x tmpfs -x devtmpfs -x squashfs -x overlay -x efivarfs)"; then
    printf 'CRIT df timed out or failed\n'
    resource_bad=1
    return 0
  fi
  while read -r pct mount; do
    if [[ "${pct}" == "Use%" || -z "${mount}" ]]; then
      continue
    fi
    pct="${pct%%%}"
    if [[ ! "${pct}" =~ ^[0-9]+$ ]]; then
      continue
    fi
    seen=$((seen + 1))
    if (( pct > DISK_THRESHOLD )); then
      printf 'CRIT disk %s %s%%\n' "${mount}" "${pct}"
      resource_bad=1
    fi
  done <<< "${df_out}"
  if (( seen == 0 )); then
    printf 'CRIT df returned no mounts\n'
    resource_bad=1
  fi
  return 0
}

check_load() {
  local load1 cpus
  read -r load1 _ _ < /proc/loadavg
  cpus="$(nproc)"
  if [[ ! "${cpus}" =~ ^[0-9]+$ ]] || (( cpus < 1 )); then
    printf 'CRIT nproc unusable\n'
    resource_bad=1
    return 0
  fi
  if awk -v load="${load1}" -v cpus="${cpus}" -v factor="${LOAD_PER_CPU}" 'BEGIN { exit !(load > cpus * factor) }'; then
    printf 'WARN load %s cpus %s factor %s\n' "${load1}" "${cpus}" "${LOAD_PER_CPU}"
    resource_bad=1
  fi
  return 0
}

check_services() {
  local unit state
  for unit in "${services[@]}"; do
    state="$(systemctl is-active "${unit}" 2>/dev/null || true)"
    if [[ "${state}" != "active" ]]; then
      printf 'CRIT service %s %s\n' "${unit}" "${state:-unknown}"
      service_bad=1
    fi
  done
  return 0
}

main() {
  command -v df >/dev/null || { printf 'CRIT df missing\n'; finish 1; }
  command -v timeout >/dev/null || { printf 'CRIT timeout missing\n'; finish 1; }
  command -v systemctl >/dev/null || { printf 'CRIT systemctl missing\n'; finish 1; }
  command -v awk >/dev/null || { printf 'CRIT awk missing\n'; finish 1; }
  if [[ ! -d "${STATE_DIR}" || -L "${STATE_DIR}" ]]; then
    printf 'CRIT missing %s\n' "${STATE_DIR}"
    finish 1
  fi
  if [[ -L "${LOCK_FILE}" ]]; then
    printf 'CRIT refusing symlink lock\n'
    finish 1
  fi
  exec 9>"${LOCK_FILE}"
  if ! flock -n 9; then
    printf 'WARN healthcheck already running\n'
    finish 1
  fi
  check_disk
  check_load
  check_services
  if (( service_bad == 1 )); then
    logger -t healthcheck -p user.err -- "service check failed" || true
    finish 2
  fi
  if (( resource_bad == 1 )); then
    logger -t healthcheck -p user.warning -- "resource check failed" || true
    finish 1
  fi
  date -Is > "${STATE_DIR}/last-ok"
  logger -t healthcheck -p user.info -- "ok" || true
  finish 0
}

main "$@"
```

یک نکتهٔ خروجی: موفقیت در stdout ساکت است، ولی یک خط `info` با برچسب `healthcheck` در journal می‌رود تا بشود فهمید چک اجرا شده، نه اینکه cron فایل را گم کرده. اگر journal را شلوغ می‌دانید، همان یک خط `logger` موفقیت را بردارید و به سن `last-ok` تکیه کنید. خط شکست را برندارید.

آزمون سرویس را روی VM انجام دهید، نه روی تنها مسیر ورود تولید. `systemctl stop nginx` باید یک خط `CRIT service nginx inactive` و وضعیت ۲ بدهد. بعد سرویس را برگردانید. اگر `ssh` را روی تنها نشست خودتان متوقف کنید، راهِ برگشت را بسته‌اید.

```bash
sudo -u deploy /usr/local/sbin/healthcheck.sh
printf 'exit=%s\n' "$?"
cat /var/lib/healthcheck/last-ok
```

## Security Notes

اسکریپت فقط می‌خواند، به‌جز `last-ok` و فایل قفل در پوشه‌ای که مالکش `deploy` است. آن پوشه را جهان‌نوشتنی نکنید. یک کاربر دیگر می‌تواند قفل را نگه دارد یا `last-ok` را تازه نشان دهد و چک واقعی را بی‌معنی کند.

`deploy` در این فایل حق `sudo` ندارد و نباید برای «راحتی restart» اضافه شود. واکنش به nginx خوابیده کار آدم یا یک واحد جداست که صفحهٔ عیب‌یابی مسیرش را می‌گوید. سلامتِ خودکار که سرویس را بی‌قید restart کند، حلقهٔ شکست را قایم می‌کند.

خروجی cron نام mount و نام سرویس را دارد. این راز نیست، ولی `MAILTO` را به صندوق بیرون سازمان نفرستید. رمز در این خروجی نیست. اگر کسی `set -x` اضافه کند، باز هم رمز این فایل کم است؛ عادت را به اسکریپت‌های دیگر نبرید.

فایل اسکریپت را `deploy` ننویسد. مالک root، گروه `deploy`، حالت `0750`. زمان‌بند با هویت `deploy` اجرا می‌کند و فقط بیت اجرا می‌خواهد.

## Troubleshooting

| نشانه | علت | کار |
| --- | --- | --- |
| هر پنج دقیقه وضعیت ۲ و `ssh inactive` | نام واحد `sshd` است نه `ssh` | `systemctl status ssh sshd` و اصلاح آرایه |
| `nginx inactive` روی db-1 | اسکریپت را روی میزبان اشتباه گذاشته‌اید | فقط `app-1` |
| `CRIT df timed out` | mount گیر کرده | `mount` و `ps` برای `df` مانده. همان mount را جدا کنید. چک را بدون timeout رها نکنید |
| دیسک ۸۵ درصد است و خطی نیست | آستانه «بالای ۸۵» است | رفتار درست. برای سخت‌گیری عدد را به ۸۴ ببرید، نه مقایسه را به بزرگ‌تر یا مساوی بدون دلیل |
| `exit=0` ولی سایت بالا نیست | health برنامه را چک نمی‌کند، فقط واحد systemd را | مرگ فرایند اگر واحد `active` نماند دیده می‌شود. خطای ۵۰۰ برنامه مال این اسکریپت نیست |
| `missing /var/lib/healthcheck` | پوشه ساخته نشده | دستور `install -d` بخش نصب |
| همیشه `already running` | یک `df` گیر کرده قفل را نگه داشته | فرایند `timeout` یا `df` را پیدا کنید. فایل قفل را پاک نکنید مگر فرایند مرده باشد |
| دو نامه یا دو journal هم‌زمان | هم cron هم timer | یکی را بردارید |
| `last-ok` تازه است و cron هیچ خطی ندارد | موفقیت | برای اطمینان `journalctl -t healthcheck` |
| وضعیت ۱ و فقط load | ضریب برای این ماشین تنگ است | `LOAD_PER_CPU` را با عدد واقعی اوج کار عوض کنید و در لاگ دلیل را بنویسید |

`logger` موفقیت هر پنج دقیقه یک خط است. اگر فکر می‌کنید اجرا نمی‌شود، اول `systemctl status cron` و نام فایل بدون نقطه را ببینید، بعد journal را. سکوت stdout به‌تنهایی دلیل اجرا نیست.

## Best Practices

- سکوت stdout را برای موفقیت حفظ کنید. چاپ `OK` هر پنج دقیقه یا نامه می‌سازد یا عادت به نادیده گرفتن نامه.
- وضعیت ۲ را برای سرویس نگه دارید و برای دیسک مصرف نکنید.
- `df` را بدون `timeout` صدا نزنید.
- نام واحد را از روی همین سرور دربیاورید. `ssh` مال Ubuntu و Debian این دانشنامه است.
- یک زمان‌بند. صفحهٔ cron هر دو را بلد است و هر دو را با هم اجازه نمی‌دهد.
- این چک را به‌جای بکاپ سبز نکنید. دیسک خالی و nginx فعال هنوز یعنی دامپ دیشب ممکن است خراب باشد.
- آستانه را در حادثهٔ همان شب شل نکنید تا صفحه خاموش شود. اگر آستانه غلط است، در روز با دلیل عوض شود.
