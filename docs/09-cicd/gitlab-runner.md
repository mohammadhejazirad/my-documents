---
title: GitLab Runner
sidebar_position: 3
description: "نصب Runner از packages.gitlab.com، ثبت غیرتعاملی، فرق executor شل و داکر، و خط لولهٔ test و build و deploy."
---

# GitLab Runner

## مقدمه

GitLab خود آزمایشگاه روی `10.10.1.50` با نام `gitlab.example.internal` است. GitLab Runner برنامه‌ای جداست که jobهای فایل `.gitlab-ci.yml` را برمی‌دارد. این صفحه Runner را از مخزن رسمی `packages.gitlab.com` نصب می‌کند، آن را با `gitlab-runner register` به‌صورت غیرتعاملی و با توکن ثبت می‌کند، و یک خط لوله با stageهای `test` و `build` و `deploy` می‌گذارد.

دو executor کنار هم نشان داده می‌شوند. executor برابر `docker` job را داخل کانتینر اجرا می‌کند. executor برابر `shell` job را مستقیم روی سیستم‌عامل میزبان، با کاربر `gitlab-runner`، اجرا می‌کند. Runner استقرار با executor شل، روی سرور برنامه `app-1` (`10.10.1.10`)، و با برچسب `production` ثبت می‌شود. این ترکیب خطرناک است و پایین با دلیل آمده است. تست را روی این Runner نگذارید.

شمارهٔ نسخهٔ بسته را از apt می‌خوانید. این صفحه یک شمارهٔ patch برای Runner اختراع نمی‌کند.

## مفهوم اصلی

فایل `.gitlab-ci.yml` در ریشهٔ مخزن سرویس `app` است. stage ترتیب را قفل می‌کند: تا `test` سبز نشود `build` شروع نمی‌شود و تا `build` سبز نشود `deploy` شروع نمی‌شود. هر job می‌تواند `tags` داشته باشد. Runnerی که همان برچسب را ندارد job را برنمی‌دارد.

ثبت Runner در GitLab امروزی این‌طور است که اول در رابط کاربری Runner را می‌سازید و یک توکن احراز هویت می‌گیرید، بعد روی میزبان دستور register را با `--token` می‌زنید. توکن قدیمی ثبت سراسری که در وبلاگ‌ها هنوز هست منسوخ شده است. اگر آموزشی `--registration-token` را به‌عنوان تنها راه نشان داد، همان را کپی نکنید. دستور رسمی غیرتعاملی با `--token` در مستندات ثبت Runner است:

https://docs.gitlab.com/runner/register/

executor شل یعنی اسکریپت job همان دسترسی کاربر `gitlab-runner` را به دیسک میزبان دارد. چیزی به‌نام فرار از کانتینر وجود ندارد چون کانتینری در کار نیست. یک خط `curl | bash` داخل مخزن، روی خود سرور برنامه اجرا می‌شود. executor داکر job را در کانتینری می‌گذارد که به‌طور پیش‌فرض ممتاز نیست و سیستم فایل میزبان را نمی‌بیند، مگر شما سوکت Docker یا `privileged` را عمداً وصل کنید. هسته هنوز مشترک است. داکر جعبهٔ امن کامل نیست، ولی از شل روی سرور تولید فاصلهٔ زیادی دارد.

## چرا استفاده می‌شود؟

مخزن و مسئله‌ها و رجیستری داخلی، اگر تیم GitLab را انتخاب کرده، کنار همان `gitlab.example.internal` می‌مانند. Runner لازم است چون خود GitLab job اجرا نمی‌کند. بدون Runner، pipeline در حالت pending می‌ماند.

جدا کردن برچسب‌ها به‌خاطر امنیت است نه سلیقه. تست داخل کانتینر روی `docker-1` اجرا می‌شود. ساخت ایمیج روی همان `docker-1` با executor شل و برچسب `build` است، چون آن میزبان از قبل Docker CLI دارد و این صفحه نسخهٔ ایمیج docker-in-docker اختراع نمی‌کند. استقرار فقط با برچسب `production` روی `app-1` است و تنها کاری که می‌کند اجرای اسکریپت موجود است.

## Architecture

```text
gitlab.example.internal  (10.10.1.50)
    مخزن app و رابط CI
    Runner اینجا نصب نمی‌شود
            │
            ├── job test    tag docker
            │     docker-1 (10.10.1.30)
            │     executor docker
            │     image ubuntu:26.04
            │
            ├── job build   tag build
            │     docker-1
            │     executor shell
            │     docker build / push
            │     registry.example.internal/app:<CI_COMMIT_SHA>
            │
            └── job deploy  tag production
                  app-1 (10.10.1.10)
                  executor shell
                  sudo -u deploy -- /opt/apps/app/bin/deploy.sh
                        │
                        ▼
                  همان docker-1، از داخل اسکریپت
                  APP_TAG و docker compose up -d
```

سه ثبت جداست. دو تا روی `docker-1` (یکی داکر، یکی شل) و یکی روی `app-1`. هر سه `run_untagged` را خاموش دارند. job بدون برچسب نباید روی هیچ‌کدام بنشیند.

## Installation

مستندات نصب مخزن، اسکریپت رسمی را نشان می‌دهد و فهرست توزیع‌های پشتیبانی‌شده را همان صفحه نگه می‌دارد. Ubuntu با نام رمز Resolute در همان فهرست آمده است. قبل از اجرا اسکریپت را بخوانید. اگر اسکریپت توزیع را پشتیبانی‌نشده اعلام کرد، خط مخزن را با دست نسازید و همان صفحه را دوباره باز کنید:

https://docs.gitlab.com/runner/install/linux-repository/

روی هر میزبانی که Runner می‌خواهید این را بزنید. برای آزمایشگاه: یک بار روی `docker-1` و یک بار روی `app-1`. روی `10.10.1.50` نه.

```bash
curl -fsSL "https://packages.gitlab.com/install/repositories/runner/gitlab-runner/script.deb.sh" -o /tmp/gitlab-runner.script.deb.sh
less /tmp/gitlab-runner.script.deb.sh
sudo bash /tmp/gitlab-runner.script.deb.sh
sudo apt update
sudo apt install gitlab-runner
gitlab-runner --version
apt-cache policy gitlab-runner
rm -f /tmp/gitlab-runner.script.deb.sh
```

`apt-cache policy` نسخه‌ای را نشان می‌دهد که واقعاً نصب شده. همان را در یادداشت تغییر تیم بنویسید. شماره را از این دانشنامه برندارید چون بسته جلو می‌رود.

در GitLab، پروژهٔ `app`، مسیر Settings، سپس CI/CD، سپس Runners. سه Runner بسازید و هر بار برچسب و گزینهٔ «اجرای job بدون برچسب» را موقع ساخت خاموش کنید. توکن هر کدام یک بار نشان داده می‌شود. آن را در فایل مخزن نگذارید. در پوستهٔ همان میزبان:

```bash
read -r -s RUNNER_TOKEN
printf '\n'
```

ثبت executor شل روی `app-1`، فقط برچسب `production`:

```bash
sudo gitlab-runner register \
  --non-interactive \
  --url "https://gitlab.example.internal" \
  --token "$RUNNER_TOKEN" \
  --executor "shell" \
  --description "app-1 production shell" \
  --tag-list "production" \
  --run-untagged="false"
unset RUNNER_TOKEN
```

اگر پرچم `--locked` را از آموزش قدیمی آوردید و دستور آن را رد کرد، حذفش کنید. Runnerی که در UI به پروژه وصل شده از قبل محدوده دارد. روی `docker-1` دو بار register بزنید، هر بار با توکن مخصوص خودش. بار اول executor داکر برای تست:

```bash
sudo gitlab-runner register \
  --non-interactive \
  --url "https://gitlab.example.internal" \
  --token "$RUNNER_TOKEN_DOCKER" \
  --executor "docker" \
  --docker-image "ubuntu:26.04" \
  --description "docker-1 test" \
  --tag-list "docker" \
  --run-untagged="false"
```

`ubuntu:26.04` ایمیج پیش‌فرض این Runner است و با سیستم‌عامل آزمایشگاه یکی است. اگر `docker pull ubuntu:26.04` روی رجیستری یا Docker Hub شما این برچسب را ندارد، برچسبی را بگذارید که همان میزبان واقعاً می‌کشد. نسخه را اختراع نکنید. job تست پایین دوباره همین ایمیج را نام می‌برد.

بار دوم روی `docker-1`، executor شل برای ساخت ایمیج، برچسب `build`:

```bash
sudo gitlab-runner register \
  --non-interactive \
  --url "https://gitlab.example.internal" \
  --token "$RUNNER_TOKEN_BUILD" \
  --executor "shell" \
  --description "docker-1 image build" \
  --tag-list "build" \
  --run-untagged="false"
```

کاربر `gitlab-runner` روی `docker-1` باید به سوکت Docker برسد. گروه `docker` معادل root است. این عضویت فقط روی میزبان ساخت است:

```bash
sudo usermod -aG docker gitlab-runner
sudo systemctl restart gitlab-runner
```

بررسی:

```bash
sudo gitlab-runner verify
sudo gitlab-runner list
sudo systemctl status gitlab-runner --no-pager
```

اگر ثبت به‌خاطر گواهی قطع شد، اعتبارسنجی TLS را با پرچم ناامن دائمی نکنید. گواهی داخلی `gitlab.example.internal` باید در فروشگاه اعتماد همان میزبان باشد. آدرس را هم از UI کپی کنید. اگر GitLab آزمایشگاه هنوز HTTP است، همان طرحی را بگذارید که UI نشان می‌دهد، نه اینکه کورکورانه HTTPS را نگه دارید.

## Configuration

فایل مخزن:

```yaml
stages:
  - test
  - build
  - deploy

variables:
  IMAGE: registry.example.internal/app

test:
  stage: test
  tags:
    - docker
  image: ubuntu:26.04
  script:
    - bash scripts/test.sh

build:
  stage: build
  tags:
    - build
  script:
    - test -n "$REGISTRY_PASSWORD"
    - printf '%s\n' "$REGISTRY_PASSWORD" | docker login registry.example.internal --username deploy --password-stdin
    - docker build -t "$IMAGE:$CI_COMMIT_SHA" .
    - docker push "$IMAGE:$CI_COMMIT_SHA"

deploy:
  stage: deploy
  tags:
    - production
  rules:
    - if: $CI_COMMIT_BRANCH == "main"
  script:
    - sudo -u deploy -- /opt/apps/app/bin/deploy.sh "$CI_COMMIT_SHA"
```

متغیر `REGISTRY_PASSWORD` را در Settings، سپس CI/CD، سپس Variables بگذارید. پرچم Masked را روشن کنید. اگر مقدار فاصله یا خط جدید دارد، ماسک GitLab آن را نمی‌پذیرد. در آن صورت مقدار را کوتاه کنید یا فایل اعتبار را فقط روی `docker-1` بگذارید و از متغیر محیط برندارید، ولی آن فایل را commit نکنید. متغیر را Protected کنید و شاخهٔ `main` را protected کنید تا job شاخهٔ محافظت‌نشده این رمز را نبیند.

روی `app-1` فایل `/etc/sudoers.d/gitlab-deploy` فقط این یک دستور را اجازه می‌دهد. با `visudo` بسازیدش:

```bash
sudo visudo -f /etc/sudoers.d/gitlab-deploy
```

محتوا:

```text
gitlab-runner ALL=(deploy) NOPASSWD: /opt/apps/app/bin/deploy.sh
```

مجوز فایل باید `440` باشد. `visudo` این را چک می‌کند. یک خط `NOPASSWD: ALL` یعنی executor شل، root بی‌رمز است. آن خط را نگذارید.

`/etc/gitlab-runner/config.toml` توکن Runner را دارد. باید مالک root و مجوز `600` باشد. آن را در بکاپِ قابل‌خواندن برای همه کپی نکنید.

در UI، Runner روی `app-1` را به شاخهٔ protected محدود کنید. rule فایل YAML هم استقرار را به `main` محدود کرده است. هر دو را نگه دارید.

## Production Example

کامیت کوچک روی `main` در پروژهٔ `app`. در صفحهٔ pipeline سه stage را به ترتیب می‌بینید.

stage تست داخل `ubuntu:26.04` روی `docker-1` است. وابستگی کم را داخل همان job نصب کنید، نه با بردن تست به executor شل `app-1`. stage ساخت شناسه را در نام ایمیج می‌گذارد. آن را با صفحهٔ کامیت مقایسه کنید.

stage استقرار روی `app-1` فقط یک خط sudo است. هر خط اضافه‌ای در `script` همان روز روی میزبان برنامه اجرا می‌شود. مرور این فایل بخشی از مرور کد است.

بعد از سبز شدن، روی `docker-1`:

```bash
cd /opt/apps/app
sudo -u deploy docker compose ps
awk -F= '$1 == "APP_TAG" { print }' .env
```

مقدار `APP_TAG` باید همان `CI_COMMIT_SHA` باشد. جزئیات فایل و برگشت در [سناریو](/docs/09-cicd/pipeline-scenario) است.

## Security Notes

خطر executor شل روی `app-1` را کوچک نکنید. هر کسی که بتواند `.gitlab-ci.yml` شاخه‌ای را که این Runner می‌پذیرد تغییر دهد، کد دلخواه روی سرور برنامه اجرا می‌کند. کاهش خطر، حذف خطر نیست:

- `run_untagged = false` و فقط برچسب `production`.
- rule و شاخهٔ protected، هر دو، تا job غیر از `main` به این Runner نرسد.
- sudo فقط برای مسیر دقیق اسکریپت، با کاربر `deploy`، بدون `ALL`.
- Runner روی خود `gitlab.example.internal` نیست. مستندات GitLab هم به‌خاطر امنیت و بار، جدایی Runner از سرور GitLab را می‌خواهد.
- روی `docker-1` هم executor شلِ ساخت، به‌خاطر گروه `docker`، معادل root است. این میزبان را میزبان دیتابیس نکنید.
- به job داکر `privileged = true` ندهید و `/var/run/docker.sock` را داخل job تست mount نکنید. آن دو کار، فاصلهٔ executor داکر از root میزبان را تقریباً صفر می‌کند.
- توکن register و `config.toml` را در بکاپ جهان‌خوانا نگذارید.

## Troubleshooting

| نشانه | معنی | کار |
| --- | --- | --- |
| pipeline تا ابد pending است | برچسب job با هیچ Runner آنلاینی جور نیست، یا Runner قطع است | `gitlab-runner verify` و برچسب‌ها در UI |
| job تست روی `app-1` اجرا شد | Runner تولید `run_untagged` روشن دارد یا job برچسب ندارد | `config.toml` و `tags` فایل YAML |
| `sudo: a password is required` | خط sudoers مسیر دیگری دارد یا `visudo` ذخیره نشده | `sudo -l -U gitlab-runner` باید فقط همان اسکریپت را نشان دهد |
| `ERROR: Registering runner... failed` وضعیت 403 | توکن منقضی، مصرف‌شده، یا مال پروژهٔ دیگری است | در UI یک Runner تازه و توکن تازه |
| خطای x509 هنگام register | گواهی GitLab در اعتماد میزبان نیست | گواهی داخلی را نصب کنید. اعتبارسنجی را خاموش نکنید |
| `dial unix /var/run/docker.sock: connect: permission denied` در stage ساخت | کاربر `gitlab-runner` بعد از `usermod` هنوز گروه را نگرفته | `systemctl restart gitlab-runner` و بعد `id gitlab-runner` |
| `apt install gitlab-runner` بسته را پیدا نمی‌کند | اسکریپت مخزن شکست خورده یا توزیع را رد کرده | خروجی اسکریپت و صفحهٔ رسمی مخزن. یک خط `deb` از حافظه ننویسید |

اگر سرویس خود Runner بالا نمی‌آید، `sudo journalctl -u gitlab-runner -n 80 --no-pager` را بخوانید. اگر job استقرار سبز است و برچسب کانتینر کهنه است، Runner کارش را کرده و `APP_TAG` را باید روی `docker-1` دید. آن عیب‌یابی در سناریو است.

## Best Practices

- نسخهٔ Runner را با `apt-cache policy` و `gitlab-runner --version` ثبت کنید. توکن ثبت را بعد از `register` از شل پاک کنید.
- job بدون برچسب ننویسید. یک job فراموش‌شده روی executor شل تولید می‌نشیند اگر `run_untagged` روشن باشد.
- ساخت ایمیج را به `app-1` نبرید. استقرار از آنجا فقط اجرای اسکریپت است. منطق compose در [سناریوی خط لوله](/docs/09-cicd/pipeline-scenario) است.
