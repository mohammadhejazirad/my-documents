---
title: سناریوی خط لوله
sidebar_position: 5
description: "یک تغییر کوچک روی سرویس app از کامیت تا پوش ایمیج با شناسهٔ git و استقرار و برگشت روی docker-1."
---

# سناریوی خط لوله

## مقدمه

این صفحه داستان یک تغییر کوچک روی سرویس `app` است، از کامیت تا بالا آمدن کانتینر، به‌علاوهٔ برگشت به برچسب قبلی. ابزار اجرا هر کدام از سه صفحهٔ قبل می‌تواند باشد. معنا یکی است: Commit، بعد Build، بعد Test، بعد Docker Build، بعد Push، بعد Deploy.

استقرار یعنی عوض کردن برچسب در فایل Compose و اجرای `docker compose up -d` روی `docker-1.example.internal` (`10.10.1.30`). خط لوله این کار را با دستور آزاد روی سرور انجام نمی‌دهد. فقط `/opt/apps/app/bin/deploy.sh` را با شناسهٔ git صدا می‌زند. خود اسکریپت، آن هم فقط بعد از اینکه شناسه را هگز معتبر دانست، روی `docker-1` برچسب را عوض می‌کند.

رجیستری `registry.example.internal` است. ایمیج `registry.example.internal/app` با tag برابر شناسهٔ کامل git پوش می‌شود. برچسب `latest` در این سناریو وجود ندارد، چون برگشت با آن ممکن نیست.

ابزار را قبلاً انتخاب کرده‌اید: [GitHub Actions](/docs/09-cicd/github-actions)، [GitLab Runner](/docs/09-cicd/gitlab-runner)، یا [Jenkins](/docs/09-cicd/jenkins). این صفحه را بدون آن نصب‌ها هم می‌شود خواند، ولی دستور استقرار وقتی واقعی است که یکی از آن سه، اسکریپت را صدا بزند.

## مفهوم اصلی

شناسهٔ git برای یک کامیت ثابت است. چه `git rev-parse HEAD` روی لپ‌تاپ، چه `github.sha`، چه `CI_COMMIT_SHA`، چه `GIT_COMMIT`، برای همان کامیت یک رشتهٔ هگز است. معمولاً چهل نویسه، و اگر مخزن SHA-256 باشد شصت‌وچهار نویسه. اسکریپت فقط همین دو شکل را قبول می‌کند.

ترتیب مهم است و برعکسِ عجلهٔ شب حادثه است:

1. Commit. تغییر کوچک داخل مخزن سرویس `app` ثبت شده و به `main` پوش شده است.
2. Build. اینجا یعنی خط لوله مخزن را برمی‌دارد و آمادهٔ تست می‌کند. در Actions این `checkout` است. در GitLab و Jenkins خود job کد را روی میزبان ساخت دارد.
3. Test. `scripts/test.sh` باید صفر برگرداند. غیرصفر یعنی ایمیج ساخته نمی‌شود.
4. Docker Build. `docker build` روی `docker-1` ایمیج را با برچسب شناسه می‌سازد.
5. Push. همان برچسب به `registry.example.internal` می‌رود. قبل از push ورود به رجیستری انجام شده است.
6. Deploy. اسکریپت روی `app-1` شناسه را به `docker-1` می‌دهد. آنجا `APP_TAG` در `.env` عوض می‌شود و `docker compose up -d` کانتینر را با ایمیج جدید می‌سازد.

Compose متغیر `APP_TAG` را از فایل `.env` کنار فایل Compose می‌خواند، نه از `env_file` داخل سرویس. `env_file` مال محیط داخل کانتینر است. قاطی کردن این دو، برچسب را عوض نمی‌کند و رازهای برنامه را هم بی‌دلیل در فایلی که اسکریپت بازنویسی می‌کند می‌گذارد. در این سناریو `.env` فقط خط `APP_TAG` را دارد. رازهای برنامه اگر لازم باشند در فایل جدا با مجوز `600` می‌مانند و اسکریپت استقرار به آن فایل دست نمی‌زند.

برگشت یعنی نوشتن شناسهٔ قبلی در `APP_TAG` و یک بار دیگر `docker compose up -d`. شناسهٔ قبلی را اسکریپت، قبل از عوض کردن، در `.env.previous` ذخیره کرده است.

## چرا استفاده می‌شود؟

تغییر کوچک هم می‌تواند سرویس را بخواباند. تفاوت این سناریو با «یک docker build روی سرور» این است که شناسهٔ بالاآمده را می‌شود در لاگ خط لوله نشان داد و همان را برگرداند. بدون آن، روی `docker-1` فقط می‌دانید کانتینر چند دقیقه پیش ساخته شده و نمی‌دانید از کدام کامیت آمده.

اسکریپت ازپیش‌موجود جلوی دستور اضافه وسط job استقرار را می‌گیرد. مهاجرت دیتابیس، اگر لازم شد، اسکریپت جداست.

## Architecture

```text
نویسنده
  commit + push به main
        │
        ▼
ابزار CI  (یکی از سه تا، نه هر سه)
  test  scripts/test.sh
  docker build
  docker push
  registry.example.internal/app:<sha>
        │
        │  فقط این فراخوانی، روی app-1 (10.10.1.10)
        ▼
/opt/apps/app/bin/deploy.sh <sha>
        │  ssh با کلید، from = 10.10.1.10
        ▼
docker-1 (10.10.1.30)
  /opt/apps/app/bin/deploy.sh
  .env  APP_TAG=<sha>
  .env.previous  شناسهٔ قبلی
  docker compose pull
  docker compose up -d
        │
        ▼
کانتینر app گوش می‌دهد روی 10.10.1.30:8080
پروکسی 10.10.1.5 فقط از همین آدرس بالا را می‌بیند
```

دو فایل همنام‌اند و بدنه فرق دارد. CI فقط نسخهٔ `app-1` را صدا می‌زند. نسخهٔ `docker-1` برچسب Compose را عوض می‌کند. مسیر یکی است تا sudoers و `authorized_keys` یک رشتهٔ ثابت داشته باشند.

## Installation

روی `app-1` و `docker-1` کاربر `deploy` پوستهٔ `/bin/bash` دارد چون اسکریپت و SSH باید اجرا شوند. جای دیگر پوستهٔ `/usr/sbin/nologin` است. فرق در [سخت‌سازی SSH](/docs/10-security/ssh-hardening) است.

```bash
sudo adduser --disabled-password --gecos "" deploy
sudo install -d -m 755 -o deploy -g deploy /opt/apps/app/bin
sudo install -d -m 700 -o deploy -g deploy /home/deploy/.ssh
```

کلید پرش از `app-1` به `docker-1` را با کاربر `deploy` بسازید. کلید را در مخزن نگذارید:

```bash
sudo -u deploy ssh-keygen -t ed25519 -a 64 -f /home/deploy/.ssh/id_ed25519 -C "deploy@app-1-to-docker-1"
sudo cat /home/deploy/.ssh/id_ed25519.pub
```

روی `docker-1` همان خط عمومی را در `/home/deploy/.ssh/authorized_keys` بگذارید و جلوی آن محدودیت منبع را بنویسید. `restrict` اینجا نیست، چون اگر command اجباری را با گزینه‌هایی که کانال SSH داکر را می‌بندند قاطی کنید، خود اسکریپت ما از مسیر forced command می‌آید و به سوکت داکر نیازی به کانال اضافه ندارد. forced command کافی است:

```text
from="10.10.1.10",restrict,command="/opt/apps/app/bin/deploy.sh" ssh-ed25519 AAAA... deploy@app-1-to-docker-1
```

`AAAA...` را با یک خط واقعی `id_ed25519.pub` عوض کنید. کلید خصوصی متناظر روی `docker-1` نیست.

`deploy` روی `docker-1` باید در گروه `docker` باشد. این گروه معادل root است و فقط همین میزبان:

```bash
sudo usermod -aG docker deploy
```

ورود رجیستری را یک بار با کاربر `deploy` روی `docker-1` انجام دهید. گذرواژه را از فایل با مجوز `600` به stdin بدهید و آن فایل را در مخزن نگذارید. `config.json` رمزنگاری نیست. مجوز `600` و مالک `deploy` الزامی است:

```bash
sudo -u deploy docker login registry.example.internal --username deploy --password-stdin
sudo ls -l /home/deploy/.docker/config.json
```

نام `registry.example.internal` باید از `docker-1` و از میزبان ساخت حل شود. آن را با `10.10.1.60` یکی فرض نکنید.

## Configuration

فایل Compose روی `docker-1` در `/opt/apps/app/compose.yml`. انتشار پورت به آدرس خود میزبان است تا با UI داخلی دیگری که شاید به loopback چسباده قاطی نشود:

```yaml
services:
  app:
    image: registry.example.internal/app:${APP_TAG}
    restart: unless-stopped
    ports:
      - "10.10.1.30:8080:8080"
```

فایل `/opt/apps/app/.env` روی `docker-1` فقط خط `APP_TAG` را دارد، مجوز `600`، مالک `deploy`. اسکریپت اگر خط نباشد آن را می‌سازد.

اسکریپت `app-1`، مسیر `/opt/apps/app/bin/deploy.sh`:

```bash
#!/bin/bash
set -euo pipefail

tag="${1:-}"
if [[ ! "$tag" =~ ^[0-9a-f]{40}$ ]] && [[ ! "$tag" =~ ^[0-9a-f]{64}$ ]]; then
  printf '%s\n' "refusing: tag is not a git sha" >&2
  exit 2
fi

exec ssh \
  -i /home/deploy/.ssh/id_ed25519 \
  -o IdentitiesOnly=yes \
  -o StrictHostKeyChecking=yes \
  deploy@10.10.1.30 \
  /opt/apps/app/bin/deploy.sh "$tag"
```

اسکریپت `docker-1` با همان مسیر. وقتی SSH با command اجباری بیاید، آرگومان در `SSH_ORIGINAL_COMMAND` است نه در `$1`. اجرای محلی برگشت، `$1` را پر می‌کند و آن متغیر SSH خالی است:

```bash
#!/bin/bash
set -euo pipefail
umask 077
cd /opt/apps/app
tag="${1:-}"
if [[ -n "${SSH_ORIGINAL_COMMAND:-}" ]]; then
  case "$SSH_ORIGINAL_COMMAND" in
    "/opt/apps/app/bin/deploy.sh "[0-9a-f][0-9a-f]*)
      tag="${SSH_ORIGINAL_COMMAND##* }"
      ;;
    *)
      printf '%s\n' "refusing command" >&2
      exit 2
      ;;
  esac
fi
if [[ ! "$tag" =~ ^[0-9a-f]{40}$ ]] && [[ ! "$tag" =~ ^[0-9a-f]{64}$ ]]; then
  printf '%s\n' "refusing: tag is not a git sha" >&2
  exit 2
fi
if [[ ! -f .env ]]; then
  printf '%s\n' "APP_TAG=" > .env
fi
chmod 600 .env
current="$(awk -F= '$1 == "APP_TAG" { print $2 }' .env)"
if [[ -n "$current" && "$current" != "$tag" ]]; then
  printf 'APP_TAG=%s\n' "$current" > .env.previous
  chmod 600 .env.previous
fi
tmp="$(mktemp /opt/apps/app/.env.XXXXXX)"
awk -F= -v tag="$tag" '
  BEGIN { found = 0 }
  $1 == "APP_TAG" { print "APP_TAG=" tag; found = 1; next }
  { print }
  END { if (!found) print "APP_TAG=" tag }
' .env > "$tmp"
mv "$tmp" .env
chmod 600 .env
docker compose pull
docker compose up -d
docker compose ps
```

هر دو فایل:

```bash
sudo chown deploy:deploy /opt/apps/app/bin/deploy.sh
sudo chmod 700 /opt/apps/app/bin/deploy.sh
```

روی `docker-1` برگشت:

```bash
#!/bin/bash
set -euo pipefail
cd /opt/apps/app
test -f .env.previous
prev="$(awk -F= '$1 == "APP_TAG" { print $2 }' .env.previous)"
exec /opt/apps/app/bin/deploy.sh "$prev"
```

این را `/opt/apps/app/bin/rollback.sh` بنامید، مالک `deploy`، مجوز `700`. اجرای محلی است. از CI با آرگومان آزاد صدا زده نمی‌شود. کلید میزبان `10.10.1.30` باید در `known_hosts` کاربر `deploy` روی `app-1` باشد.

## Production Example

داستان این هفته: یک رشتهٔ غلط در پاسخ سلامت سرویس `app` اصلاح شده است. diff کوچک است و داخل مخزن همان سرویس است. نویسنده روی شاخهٔ `main` پوش می‌کند. یکی از سه ابزار، نه هر سه، بیدار می‌شود.

`scripts/test.sh` اگر غیرصفر شود، در هر سه ابزار مرحلهٔ بعدی شروع نمی‌شود. ایمیج جدید پوش نمی‌شود و `APP_TAG` سر جایش می‌ماند. حداقل دروازه این است که `Dockerfile` خالی نباشد. تست واقعی برنامه را تیم در همین فایل می‌گذارد. این دروازه باگ منطقی برنامه را نمی‌گیرد.

اگر تست سبز باشد، میزبان ساخت `docker build` و `docker push` را با برچسب `git rev-parse HEAD` انجام می‌دهد. شناسه را ابزار خودش می‌گذارد. بعد فقط این را روی `app-1` اجرا می‌کند:

```bash
sudo -u deploy /opt/apps/app/bin/deploy.sh "$sha"
```

روی `docker-1` نام ایمیج در `docker compose ps` و مقدار `APP_TAG` باید همان شناسه باشد. پروکسی هنوز به `10.10.1.30:8080` می‌رود. برگشت را همان روز روی `docker-1` تمرین کنید:

```bash
sudo -u deploy awk -F= '$1 == "APP_TAG" { print }' /opt/apps/app/.env
sudo -u deploy awk -F= '$1 == "APP_TAG" { print }' /opt/apps/app/.env.previous
sudo -u deploy /opt/apps/app/bin/rollback.sh
sudo -u deploy docker compose -f /opt/apps/app/compose.yml ps
```

`rollback.sh` شناسهٔ داخل `.env.previous` را به `deploy.sh` می‌دهد. اگر رجیستری آن شناسه را پاک کرده باشد، `pull` شکست می‌خورد. شناسهٔ فعلی و قبلی را نگه دارید.

## Security Notes

آرگومان اسکریپت دستور shell نیست. هر دو اسکریپت قبل از `ssh` و قبل از `docker` آن را با الگوی هگز رد می‌کنند. command اجباری روی `docker-1` جلوی این را می‌گیرد که کلید مخصوص `app-1` یک پوستهٔ آزاد روی میزبان کانتینر باز کند. گزینهٔ `from="10.10.1.10"` جلوی استفادهٔ همان کلید از لپ‌تاپ را می‌گیرد. اگر `app-1` خودش تصرف شود، مهاجم می‌تواند اسکریپت را با یک شناسهٔ موجود صدا بزند و کانتینر را به یک ایمیج قدیمی برگرداند. نمی‌تواند با همان کلید دستور تازه اختراع کند، مگر فایل اسکریپت روی `docker-1` را هم عوض کرده باشد. فایل اسکریپت مجوز `700` و مالک `deploy` است. `ops` با sudo می‌تواند آن را عوض کند و این همان سطح اعتماد مدیر سرور است.

`.env` مجوز `600` دارد و فقط شناسه است. `config.json` رجیستری را جهان‌خوانا نکنید. گروه `docker` برای `deploy` روی `docker-1` معادل root است. پوستهٔ آزاد از این کلید SSH وجود ندارد. مدل محدود کردن sudo در [sudo](/docs/01-linux/sudo) است. شناسه را در لاگ می‌شود دید. کلید را نه. اگر لاگ ابزار بلوک کلید خصوصی داشت، کلید سوخته است.

## Troubleshooting

| نشانه | معنی | کار |
| --- | --- | --- |
| اسکریپت فوری با `refusing: tag is not a git sha` می‌میرد | شناسه کوتاه، یا `latest`، یا رشتهٔ خالی فرستاده شده | `git rev-parse HEAD` شناسهٔ کامل است. هفت نویسهٔ اول کافی نیست |
| `refusing command` فقط از راه SSH | `SSH_ORIGINAL_COMMAND` شکل مورد انتظار نیست | کلاینت باید دقیقاً مسیر اسکریپت و یک شناسه بفرستد. command اجباری را با مسیر دیگری ننویسید |
| `Permission denied (publickey)` | کلید اشتباه است، یا اتصال از جایی جز `10.10.1.10` آمده | `from` در `authorized_keys` را با مبدأ واقعی مقایسه کنید |
| `pull access denied` | روی `docker-1` با کاربر `deploy` به رجیستری login نشده | login را تکرار کنید. گذرواژه را داخل اسکریپت ننویسید |
| `up` سبز است ولی پروکسی هنوز نسخهٔ قدیم را نشان می‌دهد | کش پروکسی، یا Compose پروژهٔ دیگری را بالا آورده | `docker compose ps` نام ایمیج را نشان می‌دهد. اگر ایمیج جدید است، کش جلوی پروکسی است نه اسکریپت |
| برگشت ایمیج را پیدا نمی‌کند | رجیستری برچسب قبلی را پاک کرده | سیاست نگهداری را عوض کنید. با دست یک ایمیج جدید نسازید و اسم شناسهٔ قدیمی را رویش نگذارید |

اگر `docker compose ps` شناسهٔ جدید را نشان می‌دهد و برنامه خطا می‌دهد، خط لوله کار کرده و باگ داخل همان کامیت است. برگشت را بزنید. فایل داخل کانتینر را روی سرور ویرایش نکنید.

## Best Practices

- یک تغییر کوچک را تا برگشت در ساعت اداری ببرید. شناسهٔ کامل را نگه دارید و `latest` را کنارش پوش نکنید.
- اسکریپت را بی‌مخزن hotfix نکنید. راز برنامه را در `.env` نگذارید. ابزار دوم را برای همین سرویس روشن نکنید.
