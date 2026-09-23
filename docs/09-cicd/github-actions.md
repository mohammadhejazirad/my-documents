---
title: GitHub Actions
sidebar_position: 2
description: "workflow روی push به main و workflow_dispatch، با job تست و ساخت ایمیج و استقرار SSH فقط از راه یک اسکریپت."
---

# GitHub Actions

## مقدمه

این صفحه خط لولهٔ سرویس `app` را با GitHub Actions می‌سازد. دو راه اجرا دارد: `push` به شاخهٔ `main`، و `workflow_dispatch` تا همان فایل را از زبانهٔ Actions بدون کامیت خالی دوباره اجرا کنید. jobها به ترتیب تست، ساخت و پوش ایمیج، و استقرارند. استقرار به `deploy@10.10.1.10` وصل می‌شود و فقط `/opt/apps/app/bin/deploy.sh` را با شناسهٔ کامیت اجرا می‌کند.

runner میزبانی‌شدهٔ GitHub داخل `10.10.0.0/16` را نمی‌بیند. رجیستری `registry.example.internal` و سرور `app-1` هر دو داخلی‌اند. برای همین jobها روی runner خودمیزبان داخل آزمایشگاه اجرا می‌شوند، روی `docker-1.example.internal` که از قبل موتور Docker دارد. اگر مخزن شما روی GitHub نیست، این صفحه ابزار شما نیست. به [نقشهٔ فصل](/docs/09-cicd) برگردید.

شمارهٔ patch خودِ runner را از روی صفحهٔ GitHub کپی می‌کنید. این صفحه نسخه‌ای از خودش اختراع نمی‌کند. برچسب major اکشن‌های رسمی را پایین، همراه این هشدار، می‌بینید که پین کردن SHA کامل از برچسب متحرک امن‌تر است.

## مفهوم اصلی

workflow یک فایل YAML داخل مخزن است: `.github/workflows/app.yml`. هر job روی یک runner اجرا می‌شود. `permissions: contents: read` یعنی `GITHUB_TOKEN` پیش‌فرض این workflow فقط اجازهٔ خواندن محتوای مخزن را دارد و نمی‌تواند به خود مخزن push کند، release بسازد، یا بستهٔ GitHub را بنویسد. پوش ایمیج با این توکن انجام نمی‌شود. برای رجیستری داخلی secret جداست.

secret مقدار رمزنگاری‌شده‌ای است که در تنظیمات مخزن یا محیط (environment) می‌گذارید. environment در این صفحه یک نام است: `production`. روی آن حفاظت محیط روشن می‌شود. به زبان ساده، job استقرار صف می‌کشد تا یک نفر از تیم در زبانهٔ Actions دکمهٔ تأیید را بزند. قبل از آن تأیید، دستور SSH اجرا نمی‌شود. این بررسی کد نیست. این قفل «نرو روی تولید» است. job تست و ساخت منتظر همان تأیید نمی‌مانند، مگر اینکه آن‌ها را هم به همین environment وصل کنید. در نمونهٔ زیر فقط استقرار وصل است تا تست‌های خراب زود معلوم شوند.

کلید خصوصی SSH داخل secret به نام `DEPLOY_SSH_KEY` است. workflow آن را در لاگ چاپ نمی‌کند، در مخزن commit نمی‌کند، و بعد از `ssh` فایل موقت را پاک می‌کند. توکن رجیستری secret به نام `REGISTRY_TOKEN` است و فقط به `docker login --password-stdin` می‌رود.

## چرا استفاده می‌شود؟

وقتی مخزن روی GitHub است، Actions نزدیک‌ترین اجراکننده به همان مخزن است: مجوزها روی همان repo تعریف می‌شوند، لاگ کنار کامیت است، و `workflow_dispatch` بدون ابزار اضافه در دسترس است. چیزهایی که این صفحه عمداً استفاده نمی‌کند: اجرای دستور آزاد روی سرور تولید، برچسب `latest`، و `ubuntu-latest` برای jobی که باید به `10.10.1.10` برسد.

تأیید environment جلوی این حادثه را می‌گیرد که یک push اشتباه به `main`، در همان دقیقه کانتینر را عوض کند. reviewer می‌تواند همان job را رد کند. رد کردن، ایمیج پوش‌شده را از رجیستری پاک نمی‌کند. ایمیج بد در رجیستری می‌ماند و بالا نمی‌آید. پاک‌سازی رجیستری کار جداگانه‌ای است.

## Architecture

```text
GitHub  (مخزن سرویس app)
    │  push main  یا  workflow_dispatch
    ▼
runner خودمیزبان روی docker-1  (10.10.1.30)
    کاربر یونیکس ghrunner
    │
    ├─ job test     actions/checkout  و  scripts/test.sh
    ├─ job docker   login + build + push
    │                 registry.example.internal/app:<github.sha>
    └─ job deploy   environment production
                      تأیید انسان
                      ssh deploy@10.10.1.10
                      فقط /opt/apps/app/bin/deploy.sh <sha>
                            │
                            ▼
                      docker-1  دوباره، از داخل اسکریپت
                      APP_TAG عوض می‌شود و compose بالا می‌آید
```

runner روی `app-1` نصب نمی‌شود. `app-1` فقط هدف SSH است. ساخت ایمیج روی میزبانی است که از قبل Docker دارد. معنی اسکریپت و برگشت در [سناریو](/docs/09-cicd/pipeline-scenario) است.

## Installation

نسخهٔ runner را از صفحهٔ رسمی بردارید، نه از حافظه. در مخزن GitHub مسیر Settings، سپس Actions، سپس Runners، سپس New self-hosted runner است. سیستم‌عامل Linux و معماری x64 را انتخاب کنید. همان صفحه دستور `curl` را با شمارهٔ نسخهٔ روز نشان می‌دهد. همان بلوک را اجرا کنید.

```bash
sudo adduser --disabled-password --gecos "" ghrunner
sudo install -d -m 755 -o ghrunner -g ghrunner /home/ghrunner/actions-runner
```

داخل `/home/ghrunner/actions-runner` همان خطوط `curl` و `tar` را که صفحهٔ runner در GitHub برای Linux x64 چاپ کرده، با کاربر `ghrunner` اجرا کنید. آن خطوط نسخهٔ روز را دارند. نسخه را از جای دیگری تایپ نکنید. فهرست انتشار اگر UI در دسترس نبود اینجاست و باز هم همان برچسب را از خود صفحه کپی می‌کنید، نه از این دانشنامه:

https://github.com/actions/runner/releases

توکن `config.sh` را هم همان صفحهٔ New runner یک بار نشان می‌دهد. آن توکن کوتاه‌عمر است و با کلید SSH استقرار یکی نیست. دستور `./config.sh` چاپ‌شده در UI را با کاربر `ghrunner` بزنید و این برچسب‌ها را کم نکنید: `--name docker-1-lab` و `--labels lab` و `--unattended`. اگر UI این پرچم‌ها را ندارد، بعد از توکن همان‌ها را به دستور اضافه کنید. سپس سرویس را با کاربر غیرریشه نصب کنید:

```bash
sudo /home/ghrunner/actions-runner/svc.sh install ghrunner
sudo /home/ghrunner/actions-runner/svc.sh start
sudo /home/ghrunner/actions-runner/svc.sh status
```

در UI وضعیت runner باید Idle باشد. برچسب `lab` همان است که workflow با `runs-on` انتخاب می‌کند. کاربر `ghrunner` را عضو گروه `docker` کنید فقط روی `docker-1`، و بدانید این عضویت معادل root روی همان میزبان است:

```bash
sudo usermod -aG docker ghrunner
sudo /home/ghrunner/actions-runner/svc.sh stop
sudo /home/ghrunner/actions-runner/svc.sh start
```

restart لازم است تا گروه جدید داخل سرویس دیده شود. `ghrunner` عضو `sudo` نمی‌شود.

## Configuration

فایل workflow را در مخزن بگذارید. سه `uses` اکشن رسمی‌اند. برچسب major همان چیزی است که صفحهٔ انتشار آن اکشن در سپتامبر ۲۰۲۶ به‌عنوان خط جاری نشان می‌داد: `actions/checkout` روی `@v7`، `docker/login-action` روی `@v4`، `docker/setup-buildx-action` روی `@v4`، و `docker/build-push-action` روی `@v7`. برچسب major جابه‌جا می‌شود. پین امن، SHA کامل چهل‌نویسه است که از صفحهٔ Releases همان مخزن کپی می‌شود و به‌جای `@v7` می‌نشیند. SHA را از یک آموزش کپی نکنید. اگر صفحهٔ انتشار major جدیدتری نشان داد، همان را بگذارید و بعد SHA همان انتشار را پین کنید.

```yaml
name: app

on:
  push:
    branches:
      - main
  workflow_dispatch:

permissions:
  contents: read

concurrency:
  group: deploy-app
  cancel-in-progress: false

jobs:
  test:
    runs-on: [self-hosted, linux, lab]
    steps:
      - name: Checkout
        # Moving major tag. Pin the full commit SHA from the release page.
        uses: actions/checkout@v7

      - name: Test
        run: bash scripts/test.sh

  docker:
    needs: test
    runs-on: [self-hosted, linux, lab]
    steps:
      - name: Checkout
        uses: actions/checkout@v7

      - name: Login to internal registry
        # Confirm the major tag, then pin the full SHA:
        # https://github.com/docker/login-action/releases
        uses: docker/login-action@v4
        with:
          registry: registry.example.internal
          username: deploy
          password: ${{ secrets.REGISTRY_TOKEN }}

      - name: Set up Buildx
        # https://github.com/docker/setup-buildx-action/releases
        uses: docker/setup-buildx-action@v4

      - name: Build and push
        # https://github.com/docker/build-push-action/releases
        uses: docker/build-push-action@v7
        with:
          context: .
          push: true
          tags: registry.example.internal/app:${{ github.sha }}

  deploy:
    needs: docker
    if: github.ref == 'refs/heads/main'
    runs-on: [self-hosted, linux, lab]
    environment: production
    steps:
      - name: Run the existing deploy script
        env:
          DEPLOY_SSH_KEY: ${{ secrets.DEPLOY_SSH_KEY }}
        run: |
          umask 077
          key="$RUNNER_TEMP/deploy_ed25519"
          printf '%s\n' "$DEPLOY_SSH_KEY" > "$key"
          chmod 600 "$key"
          ssh -i "$key" -o IdentitiesOnly=yes -o StrictHostKeyChecking=yes \
            deploy@10.10.1.10 \
            /opt/apps/app/bin/deploy.sh "$GITHUB_SHA"
          rm -f "$key"
```

در تنظیمات مخزن، Environments، محیط `production` را بسازید و Required reviewers را روشن کنید. حداقل یک نفر غیر از نویسنده‌ای که عجله دارد باید تأیید کند. secretهای `DEPLOY_SSH_KEY` و `REGISTRY_TOKEN` را اگر روی خود environment بگذارید، job تست به آن‌ها دسترسی ندارد. این کار را بکنید. کلید باید متن کامل PEM باشد، شامل خط‌های آغاز و پایان، از نوع `ed25519`. ساخت کلید در صفحهٔ SSH است.

`known_hosts` را خالی رها نکنید و هشدار بررسی میزبان را با `StrictHostKeyChecking=no` خاموش نکنید. یک بار با کاربر `ghrunner` به `10.10.1.10` وصل شوید تا کلید میزبان در `/home/ghrunner/.ssh/known_hosts` بنشیند، یا فایل `known_hosts` را خودتان با خروجی `ssh-keyscan` پر کنید و آن خروجی را با اثر انگشتی که روی کنسول `app-1` می‌بینید مقایسه کنید.

job استقرار رشته‌ای مثل `bash -lc` یا زنجیرهٔ `cd` و `docker` نمی‌فرستد. تنها آرگومان راه دور، شناسه است. اگر اسکریپت روی سرور آرگومان را شناسهٔ معتبر نداند، خودش خارج می‌شود. بدنهٔ اسکریپت در [سناریو](/docs/09-cicd/pipeline-scenario) است.

## Production Example

یک اصلاح کوچک داخل سرویس `app` به `main` پوش شده است. در زبانهٔ Actions ترتیب را این‌طور می‌بینید:

1. job تست اجرای `scripts/test.sh` است. اگر این اسکریپت نباشد یا غیرصفر شود، jobهای بعدی شروع نمی‌شوند.
2. job ساخت، ایمیج `registry.example.internal/app:` را با همان `github.sha` پوش می‌کند. در خروجی، شناسه را با `git rev-parse HEAD` روی همان کامیت مقایسه کنید. باید یکی باشند.
3. job استقرار زرد می‌ماند تا reviewer در environment تأیید کند.
4. بعد از تأیید، لاگ فقط خط `ssh` را نشان می‌دهد که به مسیر اسکریپت ختم می‌شود. متن کلید در لاگ نیست. اگر GitHub بخشی از secret را ماسک کند، باز هم حق ندارید کلید را `echo` کنید. ماسک روی کلید چندخطی کامل قابل اتکا نیست.

اجرای دستی: زبانهٔ Actions، workflow به نام `app`، دکمهٔ Run workflow، شاخهٔ `main`. شرط `github.ref` جلوی استقرار از شاخهٔ دیگر را می‌گیرد حتی اگر کسی از روی عادت شاخهٔ دیگری را در منو انتخاب کند. ساخت و تست در آن حالت هم اجرا می‌شوند و استقرار نه.

روی `app-1` کلید عمومی متناظر در `/home/deploy/.ssh/authorized_keys` است و `AllowUsers` باید `ops` و `deploy` را داشته باشد. جزئیات در [سخت‌سازی SSH](/docs/10-security/ssh-hardening). بدون آن خط، این job با `Permission denied` می‌میرد و این رفتار درست است.

## Security Notes

`permissions: contents: read` را در سطح workflow برندارید و به job استقرار `contents: write` ندهید. این خط لوله به نوشتن در Git نیاز ندارد.

اکشن شخص ثالث ناشناس اضافه نکنید. همین چهار اکشن رسمی‌اند. برچسب `@v7` و `@v4` راحت‌اند و ضعیف‌تر از SHA. نگهداری‌کننده می‌تواند برچسب major را به کامیت دیگری ببرد. بعد از اینکه workflow یک بار سبز شد، از صفحهٔ Releases هر مخزن SHA کامل همان نسخه را کپی کنید و در YAML به‌جای برچسب بگذارید. کنارش کامنت بماند که SHA از کدام انتشار آمده تا نفر بعدی آن را «تمیزکاری» نکند و به برچسب برنگرداند.

کلید در `RUNNER_TEMP` با `umask 077` و `chmod 600` نوشته می‌شود و در همان step حذف می‌شود. step را با `set -x` اجرا نکنید. secret را در `run: echo` نگذارید. اگر step شکست خورد و حدس می‌زنید کلید به دیسک runner مانده، فایل `deploy_ed25519` را زیر خانهٔ `ghrunner` و زیر `/tmp` جستجو کنید و پاک کنید، بعد کلید را در GitHub و روی سرور عوض کنید.

گروه `docker` برای `ghrunner` یعنی یک workflow مخرب می‌تواند کانتینر ممتاز بالا بیاورد و به میزبان `docker-1` برسد. runner را روی `db-1` و روی پروکسی نگذارید. مخزن باید خصوصی باشد و حق نوشتن workflow محدود به کسانی باشد که حق استقرار دارند. تأیید environment این خطر را صفر نمی‌کند. فقط جلوی اجرای ناخواستهٔ job آخر را می‌گیرد.

## Troubleshooting

| نشانه | معنی محتمل | کار |
| --- | --- | --- |
| job در حالت Waiting for a runner می‌ماند | برچسب `lab` روی هیچ runner آنلاین نیست، یا سرویس خواب است | `svc.sh status` روی `docker-1` و برچسب‌ها در UI |
| `dial tcp 10.10.1.10:22: i/o timeout` | workflow هنوز روی `ubuntu-latest` است یا runner بیرون آزمایشگاه است | `runs-on` را با نمونهٔ همین صفحه مقایسه کنید |
| `Permission denied (publickey)` | کلید secret با `authorized_keys` یکی نیست، یا `AllowUsers` کاربر `deploy` را ندارد | از خود `docker-1` با همان کلید یک نشست آزمایشی بگیرید |
| `Host key verification failed` | `known_hosts` خالی است یا میزبان عوض شده | اثر انگشت را روی کنسول سرور ببینید و فایل را تازه کنید. بررسی را خاموش نکنید |
| login رجیستری خطای unauthorized می‌دهد | secret محیط به job ساخت نرسیده چون secret را فقط روی environment گذاشته‌اید و job ساخت آن environment را ندارد | توکن رجیستری را به job ساخت برسانید، یا secret را در سطح مخزن بگذارید و کلید SSH را فقط روی environment |
| reviewer دکمه را نمی‌بیند | environment ساخته نشده یا نامش در YAML چیز دیگری است | نام `production` باید در YAML و در تنظیمات یکی باشد |
| لاگ حاوی `BEGIN OPENSSH PRIVATE KEY` است | یک step کلید را چاپ کرده | آن step را حذف کنید، کلید را باطل کنید، secret را عوض کنید |

اگر job استقرار سبز شود و کانتینر عوض نشود، اشکال داخل اسکریپت یا مسیر `DOCKER` روی `docker-1` است. لاگ SSH فقط می‌گوید اسکریپت چه کدی برگردانده. خود اسکریپت باید خطا را روی stderr بنویسد تا در لاگ Actions دیده شود. `printf` خطا در اسکریپت سناریو همین کار را می‌کند.

## Best Practices

- SHA اکشن را از صفحهٔ انتشار همان اکشن پین کنید. تا آن روز، برچسب major همین صفحه قابل اجراست و ضعیف‌تر است. هر دو جمله را به کسی که YAML را «ساده‌تر» می‌کند نشان دهید.
- `latest` را کنار شناسه پوش نکنید. استقرار و برگشت هر دو با شناسه کار می‌کنند.
- `workflow_dispatch` را روی شاخه‌ای غیر از `main` برای استقرار باز نگذارید. شرط `github.ref` همین کار را می‌کند.
- reviewer محیط تولید کسی باشد که همان دقیقه نویسندهٔ کامیت نیست، اگر تیم دو نفر دارد. یک‌نفره بودن تیم بهانهٔ حذف environment نیست. همان یک نفر هم دکمه را جدا از push می‌زند تا عجله دو تکه شود.
- بعد از هر چرخش کلید، secret و `authorized_keys` را با هم عوض کنید و یک `workflow_dispatch` آزمایشی بگیرید.
- بدنهٔ استقرار را در workflow تکرار نکنید. اگر فردا مسیر compose عوض شد، فقط اسکریپت روی سرور و مخزن برنامه عوض می‌شود. لینک معنا: [سناریوی خط لوله](/docs/09-cicd/pipeline-scenario).
