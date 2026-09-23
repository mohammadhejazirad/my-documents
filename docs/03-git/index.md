---
sidebar_position: 1
title: نقشهٔ فصل Git
description: ترتیب خواندن فصل Git، نصب روی Ubuntu 26.04، و جای مخزن در مسیر استقرار آزمایشگاه.
---

# نقشهٔ فصل Git

## مقدمه

این فصل ابزار نسخهٔ کد تیم است. سرویس `app` که روی `app-1.example.internal` بالا می‌آید از یک مخزن Git می‌آید، نه از کپی فایل با `scp` و نه از پوشه‌ای که فقط روی لپ‌تاپ یک نفر است. اگر ندانید کامیت (commit) چیست، شاخه (branch) به کجا اشاره می‌کند، و برچسب (tag) چه فرقی با نام ایمیج Docker دارد، استقرار شب حادثه حدس می‌شود.

مخاطب این فصل کسی است که به SSH دسترسی دارد و باید تغییر را تا سرور برساند. لازم نیست قبلاً maintainer یک پروژهٔ بزرگ بوده باشید. باید بتوانید روی یک مخزن خالی، تاریخ را تمیز بسازید و وقتی تاریخ کثیف شد آن را تشخیص دهید.

صفحهٔ حاضر نقشه است. دستورها را اینجا فهرست نمی‌کنیم تا بعد در صفحهٔ مرجع تکرار نشوند. هر صفحهٔ بعدی خودش قابل اجرا است و به همین آزمایشگاه وصل است.

## مفهوم اصلی

Git یک سیستم توزیع‌شدهٔ کنترل نسخه است. هر کلون (clone) تاریخ کامل را دارد و برای ساخت کامیت به شبکه نیاز ندارد. سرور مرکزی در مدل Git یک قرارداد تیمی است، نه جایی که تاریخ فقط آنجا زندگی کند. در این آزمایشگاه آن قرارداد یا یک مخزن برهنه (bare repository) روی SSH است یا پروژهٔ GitLab روی `gitlab.example.internal` با آدرس `10.10.1.50`.

سه واژه‌ای که بقیهٔ فصل روی آن‌ها می‌ایستد:

- درخت کاری (working tree) فایلی است که ویرایشگر باز می‌کند.
- فهرست (index) همان ناحیهٔ آماده‌سازی (staging area) است و مشخص می‌کند کامیت بعدی چه تصویری دارد.
- پایگاه شیء (object database) داخل `.git/objects` محتوای آدرس‌دهی‌شده با درهم‌ساز (hash) را نگه می‌دارد.

کامیت یک تصویر لحظه‌ای (snapshot) از پروژه است، نه یک وصلهٔ ذخیره‌شده. شاخه یک اشاره‌گر به یک کامیت است. برچسب نام ثابتی است که برای انتشار به آن تکیه می‌کنیم. ریموت (remote) به نام `origin` آدرس مخزن طرف مقابل است.

هویت نویسنده در مثال‌های این فصل نام `Ops` و ایمیل `ops@example.internal` است. این هویت روی لپ‌تاپ همان مهندس تنظیم می‌شود. روی سرور مشترک و برای کاربر `deploy` هویت سراسری نمی‌گذاریم، چون کامیت نباید از روی سرور Production ساخته شود.

## چرا استفاده می‌شود؟

بدون Git دو شکست تکراری است. اول، کسی فایلی را روی `app-1` ویرایش می‌کند و فردا معلوم نیست آن خط مال کدام انتشار است. دوم، دو نفر یک فایل را جداگانه درست می‌کنند و نسخهٔ نهایی مخلوط بی‌نام است.

Git این‌ها را جدا می‌کند:

- تاریخ محلی، حتی وقتی `gitlab.example.internal` در دسترس نیست.
- شاخهٔ کوتاه‌عمر برای یک تغییر، بدون دست زدن به `main` تا قبل از بازبینی.
- برچسب تغییرناپذیر که هم کامیت را نام می‌دهد و هم برچسب ایمیج `app:1.4.2` را.
- امکان برگرداندن گفتگو به یک کامیت مشخص وقتی مانیتورینگ روی `mon-1.example.internal` خطا نشان می‌دهد.

فصل‌های استقرار و CI/CD فرض می‌کنند این تاریخ وجود دارد. اگر مخزن شلخته باشد، pipeline سالم هم نسخهٔ غلط را منتشر می‌کند.

## Architecture

ترتیب خواندن عمدی است. معماری را قبل از دستور حفظ کنید، وگرنه `checkout` و `switch` و `reset` را با هم عوض می‌کنید.

```text
نقشهٔ فصل

  index            همین صفحه، نصب، هویت، جای آزمایشگاه
  architecture     درخت کاری، index، شیء، هش، سه حالت فایل
  repository       init، clone، origin، مخزن bare در /opt/git/app.git
  branching        شاخه، HEAD، switch در برابر checkout
  merge-rebase     ادغام --no-ff، تداخل، rebase فقط روی شاخهٔ منتشرنشده
  tags-releases    برچسب annotated و ارتباط با ایمیج
  commands         مرجع دستورها
  workflows        Git Flow، Feature Branch، مسیر Production و hotfix
```

صفحه‌ها به همین ترتیب‌اند: [معماری](./architecture.md)، [مخزن](./repository.md)، [شاخه](./branching.md)، [ادغام و بازنویسی](./merge-rebase.md)، [برچسب و انتشار](./tags-releases.md)، [مرجع دستورها](./commands.md)، [گردش‌کار](./workflows.md).

جریان واقعی یک تغییر در آزمایشگاه این است، نه «فایل را روی سرور ذخیره کن»:

```text
لپ‌تاپ ops
  ویرایش در درخت کاری
  git add  ->  index
  git commit  ->  شیء کامیت روی شاخهٔ feature
        │
        │  git push origin
        ▼
gitlab.example.internal   10.10.1.50
  merge request به main
  برچسب v1.4.2 روی همان کامیت main
        │
        ├── pipeline و Runner     فصل CI/CD
        ▼
ایمیج app:1.4.2
        │
        ▼
app-1.example.internal    10.10.1.10
  /opt/apps/app فقط همان نسخه، نه شاخهٔ نیمه‌کاره
```

کاربر انسانی `ops` است. کاربر سرویس `deploy` است و shell تعاملی‌اش وقتی فقط سرویس را اجرا می‌کند `/usr/sbin/nologin` است. منطقهٔ زمانی `Asia/Tehran` است و تاریخ نمونهٔ این فصل ۲۳ سپتامبر ۲۰۲۶ است. دامنهٔ عمومی، اگر مثالی باید شکل اینترنتی داشته باشد، `app.example.com` است. شبکهٔ `10.10.0.0/16` مسیریابی عمومی ندارد.

## Installation

Git دیمون نیست. بعد از نصب، `systemctl status` برای آن یونیت ندارد و `ss` پورت تازه‌ای نشان نمی‌دهد. حمل‌ونقل ما SSH است، یا HTTP خود GitLab. بستهٔ `git-daemon` را نصب نمی‌کنیم.

روی Ubuntu Server 26.04 LTS، بستهٔ `git` در کامپوننت main است. در زمان نوشتن این صفحه نسخهٔ منتشرشده در resolute برابر `1:2.53.0-1ubuntu1` است. به‌روزرسانی امنیتی ممکن است revision را جلو ببرد. عدد را از ماشین بخوانید، از حافظه قفل نکنید.

```bash
sudo apt update
sudo apt install -y git
git --version
apt-cache policy git
command -v git
```

خروجی قابل قبول روی این توزیع شبیه این است. اگر آینهٔ APT سازمان جای `archive.ubuntu.com` را گرفته باشد، خط `500` فرق می‌کند و نسخه باید همان خانواده باشد.

```text
git version 2.53.0
git:
  Installed: 1:2.53.0-1ubuntu1
  Candidate: 1:2.53.0-1ubuntu1
  Version table:
 *** 1:2.53.0-1ubuntu1 500
        500 http://archive.ubuntu.com/ubuntu resolute/main amd64 Packages
        100 /var/lib/dpkg/status
/usr/bin/git
```

بستهٔ `git` وابستگی `git-man` و `liberror-perl` را می‌آورد. پیشنهادهای `gitk` و `git-gui` را روی سرور نصب نکنید. بستهٔ تجمیعی `git-all` ابزار گرافیکی و اضافی می‌کشد و به درد میزبان Production نمی‌خورد.

`git --version` عدد بالادست را چاپ می‌کند، بدون epoch دبیان. یعنی `2.53.0` نه `1:2.53.0-1ubuntu1`. هر دو را با `apt-cache policy` کنار هم ببینید.

روی Debian 13 دستور نصب همین است. نسخهٔ بسته ممکن است با Ubuntu یکی نباشد. باز هم `apt-cache policy git` معیار است، نه این صفحه.

این نصب را روی لپ‌تاپ `ops` و روی میزبانی که مخزن برهنه می‌خواهد انجام دهید. اگر استقرار فقط با ایمیج Docker است، خود `app-1` برای اجرای کانتینر به کلاینت Git نیاز ندارد. مسیر checkout دستی در فصل استقرار جداست و آنجا به Git روی میزبان نیاز است.

## Configuration

هویت را از نام شاخه جدا نگه دارید. نام شاخهٔ پیش‌فرض یک سیاست مخزن است. نام و ایمیل، هویت یک انسان است.

بالادست Git 2.53 اگر `init.defaultBranch` خالی باشد هنوز شاخهٔ اول را `master` می‌نامد و گفته است در Git 3.0 این پیش‌فرض `main` می‌شود. به تنظیم پنهان اعتماد نکنید. یا صریح `-b main` بدهید یا سیاست سیستم را بگذارید و بعد بررسی کنید.

```bash
git var GIT_DEFAULT_BRANCH
sudo git config --system init.defaultBranch main
git config --show-origin --get init.defaultBranch
```

این دستور سیستم هویت نمی‌سازد. فقط نام شاخهٔ مخزن‌های تازه را روی همین ماشین `main` می‌کند. فایلش `/etc/gitconfig` است و برای همهٔ کاربران آن میزبان است. روی سرور مشترک این کار قابل دفاع است چون شاخه است نه انسان.

هویت نمونه را روی لپ‌تاپ شخصی مهندس، یک‌بار سراسری بگذارید. اینجا «سراسری» یعنی فایل `~/.gitconfig` همان کاربر روی همان لپ‌تاپ، نه حساب مشترک روی `app-1`.

```bash
git config --global user.name "Ops"
git config --global user.email "ops@example.internal"
git config --global --get user.name
git config --global --get user.email
```

اگر چند مهندس با یک حساب لینوکس وارد می‌شوند، `--global` ممنوع است. هر کس باید مخزن را با هویت خودش و در سطح همان مخزن تنظیم کند، یا از حساب لینوکس جدا استفاده کند. کاربر `deploy` اصلاً کامیت نمی‌سازد. نگذاشتن `user.name` برای او یک محافظ است: اگر کسی روی سرور `git commit` بزند، Git به خاطر نبودن هویت متوقف می‌شود.

اولویت خواندن پیکربندی این است: مقدار داخل `.git/config` همان مخزن، بعد `~/.gitconfig`، بعد `/etc/gitconfig`. خروجی زیر را بعد از اولین کامیت یک مخزن واقعی ببینید.

```bash
git config --list --show-origin
```

```text
file:/etc/gitconfig     init.defaultbranch=main
file:/home/ops/.gitconfig       user.name=Ops
file:/home/ops/.gitconfig       user.email=ops@example.internal
```

روی checkout استقرار، اگر اصلاً Git لازم است، این دو را محلی همان مخزن بگذارید تا یک هویت سراسری روی سرور ساخته نشود:

```bash
git config user.name "Ops"
git config user.email "ops@example.internal"
```

جزئیات دستور در [مرجع دستورها](./commands.md) است. معنی سه ناحیه در [معماری](./architecture.md) است.

## Production Example

صبح روز انتشار، قبل از اینکه کسی به `app-1` دست بزند، از لپ‌تاپ این را می‌خوانیم. فرض این است که مخزن `app` را قبلاً کلون کرده‌اید و `origin` به GitLab تیم اشاره می‌کند. ساختن خود مخزن در صفحهٔ [مخزن](./repository.md) است.

```bash
cd /home/ops/src/app
git status
git log --oneline --graph --decorate -n 8
git describe --tags --exact-match HEAD
```

اگر درخت تمیز و HEAD دقیقاً روی برچسب انتشار باشد، وضعیت شبیه این است:

```text
On branch main
Your branch is up to date with 'origin/main'.

nothing to commit, working tree clean
```

```text
*   0ab77e1 (HEAD -> main, tag: v1.4.2, origin/main) Merge branch 'feature/billing-timeout'
|\
| * f52cc07 chore: log upstream latency
| * e41bb20 fix: raise billing client timeout to 8s
|/
* d09aa31 chore: bump pg client to 18
* c88d14a feat: add invoice export endpoint
* b71e902 feat: add healthz endpoint
* a3f1c0d chore: initial service layout
```

```text
v1.4.2
```

`git describe --exact-match` اگر HEAD خودش برچسب نخورده باشد خطا می‌دهد. این خطا مفید است. یعنی دارید چیزی را منتشر می‌کنید که نام انتشار ندارد.

همان روز روی سرور، اگر مسیر دستی `/opt/apps/app` یک checkout است، باید detached روی همان برچسب باشد یا اصلاً درخت کاری نباشد و فقط ایمیج `app:1.4.2` در حال اجرا باشد. شاخهٔ `feature/billing-timeout` روی سرور Production جایی ندارد. گردش کامل در [گردش‌کار](./workflows.md) و معنی برچسب در [برچسب و انتشار](./tags-releases.md) است.

## Security Notes

- مخزن را جهان‌خوان نکنید. پروژهٔ خصوصی GitLab یا مخزن bare با دسترسی SSH محدود، پیش‌فرض این آزمایشگاه است.
- فایل محیط، کلید خصوصی، و دامپ دیتابیس داخل Git نمی‌آید. `.env` باید در `.gitignore` باشد. اگر یک‌بار کامیت شد، پاک کردن از آخرین کامیت کافی نیست، چون در تاریخ مانده است.
- `main` محافظت می‌شود. پوش مستقیم مهندس‌ها به `main` رویهٔ این تیم نیست. مسیر، شاخهٔ feature و merge request است.
- بازنویسی تاریخ `main` و فرستادن آن با force یک حادثه است، نه ابزار روزمره. در این صفحه و صفحه‌های بعد دستور force به `main` به‌عنوان روش کار نوشته نمی‌شود. اگر در یادداشت امنیتی از چنین حادثه‌ای حرف زدیم، منظور شرح خراب شدن محافظت شاخه است.
- کلید SSH فقط `ed25519` است. ساخت و محدودکردن کلید در [سخت‌سازی SSH](/docs/10-security/ssh-hardening) است. الگوریتم‌های منسوخ را برای «جور شدن با سرور قدیمی» برنمی‌گردانیم.

## Troubleshooting

| نشانه | معنی عملی |
| --- | --- |
| `git: command not found` | بسته نصب نشده یا `PATH` این کاربر خالی از `/usr/bin` است. `command -v git` و `dpkg -l git` |
| `Please tell me who you are` | `user.name` یا `user.email` برای این مخزن و این کاربر تنظیم نشده. روی سرور مشترک به‌جای `--global` هویت محلی بگذارید، یا اصلاً روی سرور کامیت نسازید |
| `fatal: not a git repository` | دستور را بیرون از مخزن زده‌اید، یا پوشه `.git` پاک شده است |
| `detected dubious ownership` | مالک پوشه با کاربری که دستور را زده یکی نیست. مالکیت را درست کنید. `safe.directory *` روی سرور مشترک ممنوع است |
| شاخه هنوز `master` است | `init.defaultBranch` خالی بوده. برای مخزن تازه `-b main` را از اول بدهید. مخزن موجود را با عجله rename نکنید اگر ریموت و pipeline به نام قدیمی وصل‌اند |

اگر `git status` فایلی را نشان می‌دهد که نباید منتشر شود، آن را کامیت نکنید تا «بعداً از تاریخ حذف شود». اول از ناحیهٔ آماده‌سازی بیرونش بیاورید و ignore را درست کنید. جزئیات دستور در مرجع است.

## Best Practices

- این فصل را به ترتیب نقشه بخوانید. مرجع دستور جای معماری را نمی‌گیرد.
- هر مثال را با همان نام‌ها نگه دارید: کاربر `ops`، ایمیل `ops@example.internal`، میزبان `gitlab.example.internal`، برنامه روی `app-1`، مسیر `/opt/apps/app`.
- نسخهٔ Git را با `git --version` و `apt-cache policy git` از خود سیستم بگیرید.
- هویت سراسری فقط روی لپ‌تاپ شخصی است. حساب مشترک سرور هویت سراسری نمی‌گیرد.
- چیزی که باید در Production اجرا شود یک برچسب است، نه نوک یک شاخهٔ باز و نه `latest`.
- قبل از `git add` خروجی `git status` را بخوانید. اضافه کردن کور پوشه، راز و فایل ماشین را هم برمی‌دارد.
