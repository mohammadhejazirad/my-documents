---
sidebar_position: 11
title: اسکریپت استقرار
description: استقرار tag گیت روی app-1 با کاربر deploy، build برنامهٔ Node، تعویض symlink جاری، و برگشت به انتشار قبلی. بدون Docker و بدون root.
---

# اسکریپت استقرار

## مقدمه

انتشار `app.example.com` روی `app-1.example.internal` (`10.10.1.10`) یک کار تکراری است: یک tag مشخص، یک build، و عوض شدن مسیری که سرویس همین حالا اجرا می‌کند. این صفحه همان کار را در یک اسکریپت می‌گذارد. مسیر دستی اطرافش، از جمله ساخت کاربر و نشست SSH و nginx، در [استقرار با SSH](/docs/08-deployment/manual-ssh) است. اینجا فقط قدمی است که نباید هر بار از حافظه تایپ شود.

برنامه زیر `/opt/apps/app` است. هر tag یک پوشه زیر `/opt/apps/app/releases` می‌گیرد که نامش همان tag است. `/opt/apps/app/current` یک symlink به انتشار زنده است. `/opt/apps/app/previous` انتشار قبلی است تا برگشت، جابه‌جایی همان symlink باشد نه حدس زدن نام پوشه.

اسکریپت با root اجرا نمی‌شود. اگر uid صفر باشد همان اول خارج می‌شود، حتی اگر کسی `sudo` بی‌قید زده باشد. کاربر درست `deploy` است و پوستهٔ این حساب روی `app-1` باید `/bin/bash` باشد. `/usr/sbin/nologin` برای حسابی است که هیچ دستوری اجرا نمی‌کند. `deploy` اینجا `git` و `npm` و خود همین فایل را اجرا می‌کند. حق `sudo` او فقط دو دستور دقیق `systemctl` برای سرویس `app` است، نه `ALL`.

Docker در این اسکریپت نیست. ایمیج ساخته نمی‌شود، `docker compose` صدا زده نمی‌شود، و انتشار با تعویض symlink روی خود میزبان است. اگر مسیر تولید تیم کانتینر است، این فایل را برای آن مسیر خم نکنید. یک اسکریپت دیگر است، نه یک فلگ.

زمان‌بند شبانه هم ندارد. انتشار وقتی است که tag وجود دارد. cron هر شب روی یک tag ثابت، حادثه می‌سازد نه اطمینان.

## مفهوم اصلی

مخزن روی سرور یک clone از نوع bare است در `/opt/apps/app/repo.git`. اسکریپت آن را با `git fetch` به‌روز می‌کند و tag را با `git archive` بیرون می‌ریزد. `archive` قلاب‌های مخزن را اجرا نمی‌کند و پوشهٔ `.git` داخل انتشار نمی‌سازد. به همین خاطر یک `post-checkout` که داخل مخزن آمده باشد، موقع استقرار با هویت `deploy` اجرا نمی‌شود.

tag فقط به شکل `v1.2.3` قبول است: حرف `v`، سه عدد، دو نقطه. اسلش، فاصله، `..`، و برچسب شناور رد می‌شود. مسیر انتشار از همین رشته ساخته می‌شود. الگوی سخت یعنی لازم نیست بعداً مسیر را از نو ضدعفونی کنیم، ولی باز هم حذف پوشه فقط زیر `releases` انجام می‌شود.

build مال یک برنامهٔ Node 24 است که `package-lock.json` دارد، اسکریپت `build` دارد، و فایل اجرای سرویس `dist/server.js` است. ترتیب: `npm ci`، بعد `npm run build`، بعد `npm prune --omit=dev` تا وابستگی توسعه روی دیسک تولید نماند ولی موقع build در دسترس بوده باشد. اگر `package.json` یا قفلش نباشد، پوشهٔ نصفه پاک می‌شود و symlink جاری دست نمی‌خورد.

فایل محیطی داخل git نیست. `/opt/apps/app/shared/.env` حالت `0600` و مالک `deploy` است. اسکریپت به آن symlink می‌دهد. اگر خود درخت tag از قبل `.env` داشته باشد، استقرار می‌میرد تا یک رازِ commit‌شده پشت symlink قایم نشود.

تعویض جاری دو قدم است: ساختن `current.next` و `mv -T` روی symlink. `mv -T` مقصد را پوشه فرض نمی‌کند و symlink را یکجا عوض می‌کند. اگر `current` را کسی به یک پوشهٔ واقعی تبدیل کرده باشد، این جابه‌جایی شکست می‌خورد و انتشار قبلی سر جایش می‌ماند.

قبل از تعویض، مقصد symlink قبلی در `previous` ثبت می‌شود. اگر health بعد از restart شکست بخورد، اسکریپت به همان مسیر برمی‌گردد و دوباره restart می‌کند. درخت tag شکست‌خورده پاک نمی‌شود تا بشود لاگ build را دید. درخت شکست‌خوردهٔ قبل از تعویض symlink، پاک می‌شود تا اجرای بعدی روی ماندهٔ `node_modules` نصفه ننشیند.

health یعنی سرویس `app` فعال باشد و `http://127.0.0.1:3000/health` تا ده ثانیه جواب موفق بدهد. nginx جلوی اینترنت است. این اسکریپت به پورت عمومی وصل نمی‌شود تا گواهی و پروکسی را با خود build قاطی نکند. اگر برنامه health ندارد، این قرارداد را در برنامه بسازید. اسکریپت را طوری عوض نکنید که فقط `systemctl is-active` کافی باشد، چون فرایندی که بالا است و پورت را باز نکرده هنوز قطعی است.

هرس بعد از health موفق است. پنج پوشه می‌ماند، و پوشه‌ای که `current` یا `previous` به آن اشاره می‌کند حتی اگر قدیمی باشد حذف نمی‌شود. `rm -rf` فقط روی مسیر زیر `releases` است.

قفل `flock` جلوی دو استقرار هم‌زمان را می‌گیرد. دومی فوراً خطا می‌دهد و منتظر تمام شدن `npm ci` نمی‌ماند.

## چرا استفاده می‌شود؟

کپی دستی فایل به `/opt/apps/app/current` وقتی `current` پوشه باشد، بازگشت را به «امیدوارم پوشهٔ دیروز هنوز باشد» وصل می‌کند. symlink به‌علاوهٔ یک پوشه برای هر tag، بازگشت را یک دستور می‌کند: `deploy.sh rollback`.

گرفتن کد با `git checkout` داخل درخت زنده، قلاب و فایل محلی و مالکیت قاطی تولید می‌کند. `git archive` از یک bare repo درخت تمیز tag را می‌دهد و کاری به شاخهٔ کاری ندارد.

root نزدن برای این است که `node_modules` و فایل build مال `deploy` بمانند، همان کاربری که واحد systemd با آن سرویس را اجرا می‌کند. یک استقرار root، فایل‌هایی می‌سازد که اجرای بعدی `deploy` حق نوشتنشان را ندارد و کسی برای حل کردنش `chmod 777` می‌گذارد.

## Architecture

```text
git@gitlab.example.internal:team/app.git
        │  fetch tag، کلید ed25519 کاربر deploy
        ▼
/opt/apps/app/repo.git          bare
        │  git archive
        ▼
/opt/apps/app/releases/v1.2.3
        ├── package.json
        ├── dist/server.js      بعد از npm run build
        └── .env → /opt/apps/app/shared/.env
        │
        ▼
/opt/apps/app/current  ──symlink──►  releases/v1.2.3
/opt/apps/app/previous ──symlink──►  releases/v1.2.2

systemd  app.service
  User=deploy
  WorkingDirectory=/opt/apps/app/current
  ExecStart=/usr/bin/node /opt/apps/app/current/dist/server.js
        │
        ▼
127.0.0.1:3000/health
nginx روی همین میزبان، بیرون از این اسکریپت
```

## Installation

کاربر و پوسته. اگر `deploy` از قبل هست، فقط پوسته را چک کنید و اگر nologin است روی این میزبان به bash عوض کنید. دلیلش بالا گفته شد.

```bash
getent passwd deploy
sudo chsh -s /bin/bash deploy
sudo install -d -o deploy -g deploy -m 0755 \
  /opt/apps/app \
  /opt/apps/app/releases \
  /opt/apps/app/shared \
  /opt/apps/app/bin
sudo install -m 0600 -o deploy -g deploy /dev/null /opt/apps/app/shared/.env
sudoedit /opt/apps/app/shared/.env
```

`.env` فقط خط‌های `KEY=value` ساده دارد، چون همان فایل را واحد systemd هم با `EnvironmentFile` می‌خواند. رمز نمونه را اینجا `change-me` نگذارید و در گیت هم نگذارید. فایل روی سرور ساخته می‌شود.

کلید `ed25519` مخصوص همین مخزن، بدون passphrase تا اسکریپت پشت سؤال گیر نکند. در GitLab این کلید deploy key فقط‌خواندنی است، نه کلید شخصی یک نفر. اثر انگشت میزبان را با چیزی که خود GitLab نشان می‌دهد مقایسه کنید و خروجی `ssh-keyscan` را کور قبول نکنید.

```bash
sudo -u deploy mkdir -p -m 0700 /home/deploy/.ssh
sudo -u deploy ssh-keygen -t ed25519 -f /home/deploy/.ssh/id_ed25519 -N ""
sudo -u deploy ssh-keyscan -t ed25519 gitlab.example.internal | sudo -u deploy tee -a /home/deploy/.ssh/known_hosts
sudo -u deploy ssh -o BatchMode=yes -T git@gitlab.example.internal
```

مخزن bare:

```bash
sudo -u deploy git clone --bare git@gitlab.example.internal:team/app.git /opt/apps/app/repo.git
```

اگر رجیستری npm از این سرور در دسترس نیست، برای کاربر `deploy` فایل `/home/deploy/.npmrc` را به آینهٔ سازمان بدهید. آدرس آزمایشگاه `https://mirror.example.internal` است و تیم آدرس واقعی خودش را می‌گذارد. اسکریپت آینه را حدس نمی‌زند.

Node باید نسخهٔ ۲۴ باشد. اسکریپت خروجی `node -v` را می‌سنجد و نسخهٔ دیگر را رد می‌کند. مسیر `node` و `npm` باید در `/usr/bin` یا `/usr/local/bin` باشد.

sudoers، فایل `/etc/sudoers.d/deploy-app` با حالت `0440` و مالک root. فقط همین دو دستور، با همین آرگومان‌ها:

```text
Defaults:deploy !requiretty
deploy ALL=(root) NOPASSWD: /usr/bin/systemctl restart app, /usr/bin/systemctl is-active --quiet app
```

```bash
sudo visudo -cf /etc/sudoers.d/deploy-app
```

واحد `/etc/systemd/system/app.service`. `WorkingDirectory` خود symlink است تا بعد از هر تعویض، restart به درخت جدید برسد. بدون restart، فرایند هنوز پوشهٔ قبلی را در حافظه دارد.

```systemd
[Unit]
Description=app.example.com Node service
After=network-online.target
Wants=network-online.target

[Service]
Type=simple
User=deploy
Group=deploy
WorkingDirectory=/opt/apps/app/current
EnvironmentFile=/opt/apps/app/shared/.env
ExecStart=/usr/bin/node /opt/apps/app/current/dist/server.js
Restart=on-failure
RestartSec=2
NoNewPrivileges=true
PrivateTmp=true

[Install]
WantedBy=multi-user.target
```

```bash
sudo systemctl daemon-reload
sudo install -m 0750 -o deploy -g deploy /dev/null /opt/apps/app/bin/deploy.sh
sudoedit /opt/apps/app/bin/deploy.sh
bash -n /opt/apps/app/bin/deploy.sh
```

اولین انتشار را وقتی بزنید که tag واقعاً در GitLab است و health در برنامه جواب می‌دهد. قبل از آن `systemctl enable` سرویس را نگذارید، چون `current` هنوز نیست و واحد در حلقهٔ شکست می‌افتد. بعد از اولین استقرار موفق:

```bash
sudo systemctl enable --now app.service
```

`enable` این سرویس درست است. این timer نیست. سرویس باید موقع بوت بالا بیاید. آنچه نباید enable شود، یک timer استقرار است که این صفحه ندارد.

## Configuration

| نام | مقدار |
| --- | --- |
| کاربر | `deploy` و هر uid دیگری از جمله root رد می‌شود |
| مخزن bare | `/opt/apps/app/repo.git` |
| انتشار | `/opt/apps/app/releases/v1.2.3` |
| جاری | `/opt/apps/app/current` |
| قبلی | `/opt/apps/app/previous` |
| محیط | `/opt/apps/app/shared/.env` حالت `0600` |
| health | `http://127.0.0.1:3000/health` |
| نگهداری | ۵ پوشه، به‌علاوهٔ هر چه جاری یا قبلی است اگر بیرون این پنج تا بیفتد |
| لاگ | `/opt/apps/app/deploy.log` |
| قفل | `/opt/apps/app/.deploy.lock` |

زیر‌دستورها: `deploy v1.2.3` و `rollback`. چیز دیگر وضعیت ۲ است.

اگر health برنامه مسیر دیگری دارد، فقط متغیر `HEALTH_URL` بالای اسکریپت عوض شود. پورت را به `0.0.0.0` باز نکنید تا چک آسان شود. چک روی loopback است و nginx همان پورت را به بیرون پروکسی می‌کند.

## Production Example

اسکریپت کامل برای `/opt/apps/app/bin/deploy.sh`.

```bash
#!/usr/bin/env bash
set -euo pipefail

# Deploy one git tag as user deploy and switch /opt/apps/app/current.
# Refuses root. No Docker.
export LC_ALL=C
export TZ=Asia/Tehran
export HOME="/home/deploy"
export PATH="/usr/local/bin:/usr/bin:/bin"
export GIT_TERMINAL_PROMPT=0
export GIT_SSH_COMMAND="ssh -o BatchMode=yes -o StrictHostKeyChecking=yes"

APP_USER="deploy"
APP_ROOT="/opt/apps/app"
RELEASES="${APP_ROOT}/releases"
SHARED="${APP_ROOT}/shared"
REPO="${APP_ROOT}/repo.git"
CURRENT="${APP_ROOT}/current"
PREVIOUS="${APP_ROOT}/previous"
LOCK_FILE="${APP_ROOT}/.deploy.lock"
LOG_FILE="${APP_ROOT}/deploy.log"
HEALTH_URL="http://127.0.0.1:3000/health"
KEEP_RELEASES=5
FAIL_MSG=""
RELEASE_CREATED=0
KEEP_FAILED=0
RELEASE_DEST=""
list_file=""

log() {
  local level="$1"
  shift
  local line
  printf -v line '%s [%s] %s' "$(date -Is)" "${level}" "$*"
  if [[ -f "${LOG_FILE}" && ! -L "${LOG_FILE}" && -w "${LOG_FILE}" ]]; then
    printf '%s\n' "${line}" >> "${LOG_FILE}"
  fi
  logger -t deploy-app -p "user.${level}" -- "$*" || true
}

die() {
  FAIL_MSG="$*"
  printf '%s\n' "${FAIL_MSG}" >&2
  exit 1
}

usage() {
  FAIL_MSG="usage: deploy.sh deploy v1.2.3 | deploy.sh rollback"
  printf '%s\n' "${FAIL_MSG}" >&2
  exit 2
}

on_exit() {
  local rc=$?
  local cur=""
  if [[ -n "${list_file}" && -f "${list_file}" ]]; then
    rm -f -- "${list_file}" || true
  fi
  if (( rc != 0 && RELEASE_CREATED == 1 && KEEP_FAILED == 0 )); then
    if [[ -n "${RELEASE_DEST}" && -d "${RELEASE_DEST}" ]]; then
      case "${RELEASE_DEST}" in
        "${RELEASES}"/*)
          if [[ -L "${CURRENT}" ]]; then
            cur="$(readlink -f "${CURRENT}" || true)"
          fi
          if [[ "${cur}" != "${RELEASE_DEST}" ]]; then
            rm -rf -- "${RELEASE_DEST}" || true
          fi
          ;;
      esac
    fi
  fi
  if (( rc != 0 && rc != 2 )) && [[ -w "${LOG_FILE}" && ! -L "${LOG_FILE}" ]]; then
    log err "${FAIL_MSG:-deploy failed with status ${rc}}" || true
  fi
  exit "${rc}"
}

require_user() {
  if [[ "$(id -u)" -eq 0 ]]; then
    printf 'refusing to run as root\n' >&2
    exit 1
  fi
  if [[ "$(id -un)" != "${APP_USER}" ]]; then
    printf 'refusing to run as %s\n' "$(id -un)" >&2
    exit 1
  fi
}

require_layout() {
  local mode
  [[ -d "${RELEASES}" && ! -L "${RELEASES}" ]] || die "missing ${RELEASES}"
  [[ -d "${SHARED}" && ! -L "${SHARED}" ]] || die "missing ${SHARED}"
  [[ -d "${REPO}" && ! -L "${REPO}" ]] || die "missing bare repo ${REPO}"
  [[ -f "${SHARED}/.env" && ! -L "${SHARED}/.env" ]] || die "missing ${SHARED}/.env"
  mode="$(stat -c '%a' "${SHARED}/.env")"
  [[ "${mode}" == "600" ]] || die ".env mode ${mode} is not 0600"
  [[ -d "${HOME}" ]] || die "missing home ${HOME}"
}

require_tools() {
  local bin node_ver
  for bin in git node npm curl sudo flock; do
    command -v "${bin}" >/dev/null || die "missing command ${bin}"
  done
  node_ver="$(node -v)"
  [[ "${node_ver}" =~ ^v24\. ]] || die "need Node 24, found ${node_ver}"
}

take_lock() {
  if [[ -L "${LOCK_FILE}" ]]; then
    die "refusing symlink lock"
  fi
  exec 9>"${LOCK_FILE}"
  if ! flock -n 9; then
    die "another deploy is running"
  fi
}

valid_tag() {
  local tag="$1"
  [[ "${tag}" =~ ^v[0-9]+\.[0-9]+\.[0-9]+$ ]]
}

fetch_tag() {
  local tag="$1"
  local commit
  git --git-dir="${REPO}" fetch --prune origin '+refs/tags/*:refs/tags/*' \
    || die "git fetch failed"
  git --git-dir="${REPO}" rev-parse --verify "refs/tags/${tag}^{}" >/dev/null \
    || die "tag not found: ${tag}"
  commit="$(git --git-dir="${REPO}" rev-parse --verify "refs/tags/${tag}^{}")"
  log info "tag ${tag} is ${commit}"
}

extract_release() {
  local tag="$1"
  local dest="$2"
  mkdir -p -- "${dest}" || die "cannot create ${dest}"
  RELEASE_CREATED=1
  git --git-dir="${REPO}" archive --format=tar "${tag}" \
    | tar -C "${dest}" -xf - \
    || die "git archive failed for ${tag}"
  [[ -f "${dest}/package.json" ]] || die "package.json missing in ${tag}"
  [[ -f "${dest}/package-lock.json" ]] || die "package-lock.json missing in ${tag}"
  if [[ -e "${dest}/.env" || -L "${dest}/.env" ]]; then
    die "release tree already contains .env"
  fi
  ln -s "${SHARED}/.env" "${dest}/.env" || die "cannot link .env"
}

build_release() {
  local dest="$1"
  (
    cd "${dest}" || exit 1
    npm ci
    npm run build
    npm prune --omit=dev
  ) || die "build failed for ${dest}"
}

switch_to() {
  local dest="$1"
  ln -sfn "${dest}" "${CURRENT}.next" || die "cannot create next symlink"
  mv -Tf "${CURRENT}.next" "${CURRENT}" || die "cannot switch current to ${dest}"
}

record_previous() {
  local old="$1"
  if [[ -z "${old}" ]]; then
    return 0
  fi
  ln -sfn "${old}" "${PREVIOUS}.next" || die "cannot record previous"
  mv -Tf "${PREVIOUS}.next" "${PREVIOUS}" || die "cannot move previous symlink"
}

restart_app() {
  local i
  sudo -n /usr/bin/systemctl restart app || return 1
  for i in 1 2 3 4 5 6 7 8 9 10; do
    if curl -fsS --max-time 3 "${HEALTH_URL}" >/dev/null; then
      sudo -n /usr/bin/systemctl is-active --quiet app || return 1
      return 0
    fi
    sleep 1
  done
  return 1
}

rollback_to() {
  local dest="$1"
  log warning "rolling back to ${dest}"
  switch_to "${dest}"
  if ! restart_app; then
    log err "rollback restart failed for ${dest}"
    return 1
  fi
  return 0
}

prune_releases() {
  local cur="" prev="" d count
  local -a oldest=()
  if [[ -L "${CURRENT}" ]]; then
    cur="$(readlink -f "${CURRENT}" || true)"
  fi
  if [[ -L "${PREVIOUS}" ]]; then
    prev="$(readlink -f "${PREVIOUS}" || true)"
  fi
  list_file="$(mktemp)"
  find "${RELEASES}" -mindepth 1 -maxdepth 1 -type d -printf '%T@\t%p\0' \
    | sort -z -n | cut -z -f2- > "${list_file}" || die "cannot list releases"
  if [[ ! -s "${list_file}" ]]; then
    rm -f -- "${list_file}"
    list_file=""
    return 0
  fi
  while IFS= read -r -d '' d; do
    oldest+=("${d}")
  done < "${list_file}"
  rm -f -- "${list_file}"
  list_file=""
  count="${#oldest[@]}"
  if (( count == 0 )); then
    return 0
  fi
  for d in "${oldest[@]}"; do
    if (( count <= KEEP_RELEASES )); then
      break
    fi
    if [[ -n "${cur}" && "${d}" == "${cur}" ]]; then
      continue
    fi
    if [[ -n "${prev}" && "${d}" == "${prev}" ]]; then
      continue
    fi
    case "${d}" in
      "${RELEASES}"/*) ;;
      *) die "refuse to delete ${d}" ;;
    esac
    log info "removing old release ${d}"
    rm -rf -- "${d}" || die "cannot remove ${d}"
    count=$((count - 1))
  done
}

cmd_deploy() {
  local tag="${1:-}"
  local old="" dest
  if [[ -z "${tag}" ]]; then
    usage
  fi
  valid_tag "${tag}" || die "tag must look like v1.2.3"
  dest="${RELEASES}/${tag}"
  RELEASE_DEST="${dest}"
  if [[ -L "${CURRENT}" ]]; then
    old="$(readlink -f "${CURRENT}" || true)"
  fi
  if [[ -e "${dest}" ]]; then
    if [[ -n "${old}" && "${old}" == "$(readlink -f "${dest}")" ]]; then
      log info "tag ${tag} already current"
      exit 0
    fi
    die "release directory already exists: ${dest}"
  fi
  fetch_tag "${tag}"
  extract_release "${tag}" "${dest}"
  build_release "${dest}"
  record_previous "${old}"
  KEEP_FAILED=1
  switch_to "${dest}"
  if ! restart_app; then
    if [[ -n "${old}" ]]; then
      rollback_to "${old}" || die "health check failed and rollback failed"
    fi
    die "health check failed for ${tag}"
  fi
  KEEP_FAILED=0
  prune_releases
  log info "deployed ${tag}"
  exit 0
}

cmd_rollback() {
  local dest old
  [[ -L "${PREVIOUS}" ]] || die "no previous release recorded"
  dest="$(readlink -f "${PREVIOUS}")" || die "cannot read previous"
  [[ -d "${dest}" ]] || die "previous target missing: ${dest}"
  old=""
  if [[ -L "${CURRENT}" ]]; then
    old="$(readlink -f "${CURRENT}" || true)"
  fi
  if [[ -n "${old}" && "${old}" == "${dest}" ]]; then
    log info "already at ${dest}"
    exit 0
  fi
  switch_to "${dest}"
  if [[ -n "${old}" ]]; then
    record_previous "${old}"
  fi
  if ! restart_app; then
    die "rollback switched files but health check failed"
  fi
  log info "rolled back to ${dest}"
  exit 0
}

main() {
  local cmd
  require_user
  umask 027
  require_layout
  require_tools
  if [[ -L "${LOG_FILE}" ]]; then
    printf 'refusing symlink log\n' >&2
    exit 1
  fi
  if [[ ! -e "${LOG_FILE}" ]]; then
    install -m 640 -o "${APP_USER}" -g "${APP_USER}" /dev/null "${LOG_FILE}" \
      || die "cannot create log"
  fi
  trap on_exit EXIT
  trap 'exit 130' INT
  trap 'exit 143' TERM
  take_lock
  cmd="${1:-}"
  shift || true
  case "${cmd}" in
    deploy) cmd_deploy "$@" ;;
    rollback) cmd_rollback ;;
    *) usage ;;
  esac
}

main "$@"
```

اجرای واقعی، از روی `app-1` با همان کاربر، نه با `sudo bash`:

```bash
sudo -u deploy /opt/apps/app/bin/deploy.sh deploy v1.2.3
readlink -f /opt/apps/app/current
sudo -u deploy /opt/apps/app/bin/deploy.sh rollback
```

`sudo -u deploy` از حساب `ops` درست است چون خود اسکریپت را root اجرا نمی‌کند. `sudo /opt/apps/app/bin/deploy.sh` غلط است و باید جملهٔ `refusing to run as root` را بدهد.

اولین tag قبلی ندارد. اگر health‌اش شکست بخورد، `current` روی همان درخت می‌ماند تا لاگ را ببینید و سرویس را درست کنید. از tag دوم به بعد شکست health به انتشار قبلی برمی‌گردد.

## Security Notes

کلید deploy فقط‌خواندنی است. اگر به آن حق push بدهید، یک نفر با دسترسی به `app-1` می‌تواند tag را عوض کند و استقرار بعدی همان را می‌کشد. tag در اسکریپت با `--force` به‌روز نمی‌شود. جابه‌جا کردن tag در GitLab یعنی مخزن bare هنوز commit قبلی را دارد تا کسی عمداً tag محلی را پاک کند. این محافظ کوچک را با `git fetch --force` برندارید.

`StrictHostKeyChecking=yes` و `BatchMode=yes` یعنی میزبان ناشناس و پرسش رمز، استقرار را متوقف می‌کند به‌جای اینکه کلید را در `known_hosts` بنویسد یا منتظر ترمینال بماند. `GIT_TERMINAL_PROMPT=0` همان را از خود git هم می‌خواهد.

sudoers ستاره ندارد. `systemctl restart app` با یک آرگومان اضافه جور نمی‌شود و نباید برای «راحتی» `systemctl *` شود. `restart nginx` را به این خط اضافه نکنید. nginx را استقرار برنامه بی‌قید reload نمی‌کند.

اسکریپت را root-owned نکنید اگر `deploy` باید اجرا کند، و جهان‌نوشتنی هم نکنید. حالت `0750` و مالک `deploy` است. کسی که می‌تواند این فایل را بنویسد، با هویت `deploy` و با sudo محدود، سرویس را restart می‌کند. آن دسترسی معادل انتشار است و باید همان سیاست مخزن را داشته باشد.

`.env` در لاگ کپی نمی‌شود. `set -x` را اضافه نکنید. `npm` اگر راز را در خروجی build چاپ کند، روی ترمینال SSH همان جلسه هست. آن را در برنامه درست کنید، نه با قایم کردن stdout اسکریپت.

Docker نکردن این فایل یک محدودیت امنیتی هم هست: کسی نمی‌تواند با یک آرگومان، سوکت داکر میزبان را به استقرار برنامه وصل کند. اگر روزی مسیر کانتینر خواستید، فایل جدا با سیاست جدا بسازید.

## Troubleshooting

| نشانه | علت | کار |
| --- | --- | --- |
| `refusing to run as root` | با sudo مستقیم زده شده | `sudo -u deploy` یا نشست SSH خود `deploy` |
| `need Node 24` | نسخهٔ دیگر در `PATH` است | `command -v node` و `node -v` با همان کاربر |
| `tag must look like v1.2.3` | نام tag آزاد یا دارای اسلش | tag را به همین شکل بسازید. الگو را برای یک انتشار شل نکنید |
| `tag not found` | fetch نشده یا tag در origin نیست | `git --git-dir=/opt/apps/app/repo.git ls-remote --tags origin` |
| `git fetch failed` | کلید، known_hosts، یا شبکه | `ssh -o BatchMode=yes -T git@gitlab.example.internal` با کاربر `deploy` |
| `package-lock.json missing` | مخزن قفل npm ندارد | قفل را commit کنید. `npm install` را جای `npm ci` نگذارید |
| `release tree already contains .env` | راز داخل git است | فایل را از تاریخچه بیرون کنید و symlink را حفظ کنید |
| `build failed` | وابستگی یا TypeScript | خروجی همان جلسه. پوشهٔ نصفه را اسکریپت پاک کرده. دوباره بعد از اصلاح tag |
| `health check failed` و سایت برگشته | پورت ۳۰۰۰ یا مسیر health | از خود `app-1` با `curl` همان URL را بزنید. درخت مردود زیر `releases` می‌ماند |
| `a password is required` از sudo | خط sudoers با آرگومان دقیق جور نیست | `visudo -cf` و مسیر `/usr/bin/systemctl` |
| `another deploy is running` | اجرای دوم وسط npm | صبر کنید. timer یا cron اضافه نکنید |
| `cannot switch current` | `current` پوشه است نه symlink | پوشه را فقط اگر خالی و اشتباه است کنار بگذارید. دادهٔ داخلش را با `rm -rf` شانسی پاک نکنید |
| rollback می‌گوید previous نیست | اولین انتشار است | health را درست کنید. انتشار قبلی وجود ندارد |
| بعد از موفقیت، سرویس هنوز کد قدیمی است | restart نشده یا واحد مسیر دیگری دارد | `systemctl cat app` و `readlink -f /opt/apps/app/current` |

`bash -n` خطاهای نقل‌قول و `fi` جاافتاده را می‌گیرد. شکست health را نمی‌گیرد. آن را با یک tag آزمایشی روی VM ببینید.

## Best Practices

- root نه. `deploy` بله. sudo فقط همان دو دستور systemd.
- یک tag، یک پوشه. روی درخت زنده `git pull` نکنید.
- `.env` خارج از git، حالت `0600`، و اگر داخل tag بود استقرار باید بایستد.
- health را به «سرویس active است» تقلیل ندهید. پورت loopback بخشی از تمام شدن کار است.
- شکست بعد از تعویض symlink باید به previous برگردد. شکست قبل از تعویض باید پوشهٔ نصفه را بردارد.
- پنج انتشار کافی است. دیسک را با `node_modules` بی‌نهایت پر نکنید و هرس را قبل از health موفق نیاورید.
- این کار cron ندارد. با بکاپ ۰۳:۱۰ و سلامت پنج‌دقیقه‌ای قاطی‌اش نکنید.
- Docker را وارد این فایل نکنید. مسیر کانتینر جداست. مسیر دستی SSH در صفحهٔ استقرار با SSH مانده است.
