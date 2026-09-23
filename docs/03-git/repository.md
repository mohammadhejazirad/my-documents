---
sidebar_position: 3
title: مخزن Git
description: ساخت مخزن با init و clone، ریموت origin، و مخزن bare در /opt/git/app.git در برابر GitLab.
---

# مخزن Git

## مقدمه

مخزن (repository) پوشه‌ای است که تاریخ Git را نگه می‌دارد. روی لپ‌تاپ، کنار فایل‌های قابل ویرایش یک پوشهٔ `.git` هست. روی سرور مرکزی که فقط باید push بگیرد، درخت کاری نباید باشد. آن شکل را مخزن برهنه (bare repository) می‌گویند و مسیر نمونه‌اش در این آزمایشگاه `/opt/git/app.git` است.

این صفحه دو مقصد را عمداً کنار هم می‌گذارد، چون تیم‌ها این دو را قاطی می‌کنند. مقصد اول یک سرور SSH ساده است و خودتان `git init --bare` می‌زنید. مقصد دوم GitLab روی `gitlab.example.internal` با آدرس `10.10.1.50` است. GitLab هم در نهایت مخزن Git نگه می‌دارد، ولی شما آنجا `git init --bare` نمی‌زنید و مسیر داده‌اش `/opt/git` نیست. هر مخزن فقط یک `origin` دارد. یکی از این دو مقصد را انتخاب کنید، نه هر دو را هم‌زمان برای یک پروژه.

## مفهوم اصلی

`git init` در پوشهٔ پروژه `.git` می‌سازد و شاخهٔ اول را، اگر `-b main` بدهید، `main` می‌نامد. هنوز کامیتی نیست. `HEAD` به شاخه‌ای اشاره می‌کند که هنوز شیء ندارد. به این حالت unborn branch می‌گویند. اولین کامیت، هم شیء را می‌سازد و هم فایل `refs/heads/main` را.

`git clone` برعکس init از صفر است. شیءها را از یک مخزن موجود می‌گیرد، پوشهٔ کاری می‌سازد، ریموت را به نام `origin` ثبت می‌کند، و شاخهٔ پیش‌فرض طرف مقابل را checkout می‌کند. بعد از clone شما تاریخ را دارید، حتی اگر شبکه قطع شود.

ریموت یک نام محلی برای یک URL است. نام قراردادی مخزن بالادست `origin` است. این نام جادویی نیست. `git remote add origin URL` فقط دو خط در `.git/config` می‌نویسد: یکی برای fetch و یکی برای push. شاخهٔ محلی `main` تا وقتی `git push -u` یا `git branch -u` نزده‌اید، شاخهٔ بالادست (upstream) ندارد. بدون upstream، `git status` نمی‌تواند بگوید از `origin/main` جلو هستید یا عقب.

مخزن bare یعنی `git init --bare`. پوشهٔ حاصل خودش همان چیزهایی را دارد که معمولاً داخل `.git` است: `HEAD`، `config`، `objects`، `refs`، `hooks`. درخت کاری و index کار روزمره ندارد. پیکربندی `core.bare` برابر true است. push به این مخزن، شاخهٔ checkout‌شده را به‌هم نمی‌ریزد، چون checkoutی وجود ندارد.

GitLab یک برنامه است: مخزن، merge request، مجوز، رجیستری کانتینر، و CI. دادهٔ Omnibus معمولاً زیر `/var/opt/gitlab/git-data/repositories` است و مالکش کاربر داخلی GitLab است. پروژه را از رابط یا API می‌سازید و URL کلون شبیه `git@gitlab.example.internal:ops/app.git` است. دونقطهٔ بین میزبان و `ops/app.git` نحو GitLab است، نه یک مسیر مطلق روی دیسک. مسیر مطلق bare شبیه `git@gitlab.example.internal:/opt/git/app.git` است و قبل از دونقطه هیچ چیزی نیست جز خالی بودن کاربر، و بعد از دونقطه مسیر از ریشه است. این دو URL را با هم عوض نکنید.

اگر روی همان ماشینی که Omnibus نصب است پوشهٔ `/opt/git` هم بسازید، دو انبار جدا دارید. دیسک پر می‌شود و بکاپ GitLab دومی را نمی‌بیند. در آزمایشگاه، bare را فقط وقتی نشان می‌دهیم که آن میزبان نقش «سرور SSH ساده» دارد. وقتی نقشش GitLab است، از پروژهٔ `ops/app` استفاده کنید و bare دستی نسازید.

## چرا استفاده می‌شود؟

مخزن محلی برای کارکردن کافی است و برای تیم کافی نیست. بدون یک مقصد مشترک، تاریخ‌ها از هم جدا می‌شوند و «نسخهٔ روی سرور» تعریف ندارد.

bare وجود دارد چون push کردن به مخزنی که درخت کاری و شاخهٔ جاری دارد، index را از چیزی که push شده عقب می‌اندازد. Git به‌صورت پیش‌فرض این کار را رد می‌کند. راه درست برای سرور داخلی، bare است. راه غلط این است که `receive.denyCurrentBranch` را ignore کنید تا بتوانید مستقیم به checkout سرویس push کنید. آن الگو درخت `/opt/apps/app` را بی‌سروصدا از فرآیندی که در حال اجراست جدا می‌کند.

GitLab را وقتی می‌خواهید که بازبینی، محافظت `main`، و pipeline لازم است. Runner که بعد از push کار را می‌سازد در [GitLab Runner](/docs/09-cicd/gitlab-runner) است. خود مخزن bare هیچ تستی اجرا نمی‌کند. هوک اگر بنویسید فقط یک اسکریپت محلی است، نه جایگزین CI.

## Architecture

```text
لپ‌تاپ ops
  /home/ops/src/app/          مخزن معمولی
    .git/config               [remote "origin"]
    درخت کاری                 فایل‌هایی که ویرایش می‌شوند

        │  git push / git fetch   فقط SSH
        ▼

یکی از این دو، نه هر دو برای یک origin

  سرور ساده
    میزبان     app-1 یا یک VM که Omnibus ندارد
    مسیر       /opt/git/app.git
    مالک       کاربر سیستمی git ، پوسته git-shell
    URL        git@10.10.1.10:/opt/git/app.git

  GitLab
    میزبان     gitlab.example.internal    10.10.1.50
    مسیر دیسک  /var/opt/gitlab/git-data/...   دست نزنید
    URL        git@gitlab.example.internal:ops/app.git
    بعد از push   pipeline در Runner
```

داخل bare این‌ها را می‌بینید و فایل سورس را نمی‌بینید:

```text
/opt/git/app.git/
  HEAD
  config          bare = true
  description
  hooks/
  info/
  objects/
  refs/heads/
  refs/tags/
```

`origin/main` که روی لپ‌تاپ می‌بینید یک شاخهٔ remote-tracking است و زیر `.git/refs/remotes/origin/main` یا در `packed-refs` زندگی می‌کند. این فایل با push شما به سرور نوشته نمی‌شود. fetch و clone آن را تازه می‌کنند. اشتباه رایج این است که آدم فکر کند `git commit` روی لپ‌تاپ، `origin/main` را هم جلو برده است.

## Installation

کلاینت Git همان بستهٔ Ubuntu 26.04 است. روی لپ‌تاپ و روی سروری که bare می‌خواهد هر دو لازم است.

```bash
sudo apt update
sudo apt install -y git
git --version
```

```text
git version 2.53.0
```

برای حالت سرور ساده یک کاربر سیستمی بسازید که پوستهٔ عادی نداشته باشد. `git-shell` با بستهٔ `git` می‌آید و فقط دستورهای Git را از راه SSH قبول می‌کند. این کاربر را `git` می‌نامیم تا با انسان `ops` و با سرویس `deploy` قاطی نشود.

```bash
sudo adduser --system --group --home /opt/git --shell /usr/bin/git-shell git
sudo install -d -o git -g git -m 0750 /opt/git
sudo -u git git init --bare -b main /opt/git/app.git
```

`--system` حساب ورود انسانی نمی‌سازد. خانهٔ `/opt/git` مال خود مخزن‌هاست. اگر `adduser` خانه را با مجوز بازتر ساخته، همان `0750` بالا درستش می‌کند. `git init --bare` بدون `-b` در Git 2.53 ممکن است شاخهٔ اول را `master` نام بگذارد. `-b main` را حذف نکنید.

کلید عمومی مهندس‌ها را در `/opt/git/.ssh/authorized_keys` بگذارید، فایل با مجوز `0600` و مالک `git`. کلید خصوصی را داخل مخزن کپی نکنید. ساخت کلید `ed25519` در [سخت‌سازی SSH](/docs/10-security/ssh-hardening) است.

روی خود لپ‌تاپ مخزن کاری را جدا بسازید:

```bash
mkdir -p /home/ops/src/app
cd /home/ops/src/app
git init -b main
git config user.name "Ops"
git config user.email "ops@example.internal"
```

هویت این دو خط مال همین پوشه است. روی سرور bare اصلاً `user.name` نگذارید. آنجا کسی کامیت نمی‌سازد.

## Configuration

یک ریموت، به نام `origin`. اگر حالت ساده را انتخاب کرده‌اید، URL مسیر مطلق دیسک است. آدرس را با IP آزمایشگاه عوض نکنید مگر میزبان bare جای دیگری باشد. اینجا bare را روی `app-1.example.internal` یعنی `10.10.1.10` گذاشته‌ایم تا با دیسک GitLab روی `10.10.1.50` قاطی نشود.

```bash
cd /home/ops/src/app
git remote add origin git@app-1.example.internal:/opt/git/app.git
git remote -v
```

```text
origin	git@app-1.example.internal:/opt/git/app.git (fetch)
origin	git@app-1.example.internal:/opt/git/app.git (push)
```

اگر مقصد GitLab است، همان دستور با URL دیگر است و قبلی را add نکنید. اگر اشتباه add کرده‌اید، `git remote remove origin` و بعد URL درست. remove فقط پیکربندی محلی را برمی‌دارد و شیءهای سرور را پاک نمی‌کند.

```bash
git remote add origin git@gitlab.example.internal:ops/app.git
```

فرق نویسه‌ای کوچک است و رفتار کاملاً فرق می‌کند. URL دوم را SSH به برنامهٔ GitLab می‌دهد. GitLab پروژهٔ `ops/app` را پیدا می‌کند. مسیر `/opt/git/app.git` در کار نیست.

ببینید Git واقعاً چه خوانده:

```bash
git config --get remote.origin.url
git config --get remote.origin.fetch
```

مقدار fetch معمولاً این است و فقط داخل پیکربندی معنی دارد:

```text
+refs/heads/*:refs/remotes/origin/*
```

علامت `+` یعنی موقع fetch، شاخهٔ remote-tracking محلی اجازه دارد عقب هم برود اگر سمت سرور تاریخ بازنویسی شده باشد. این علامت مجوز بازنویسی نوک `main` روی سرور نیست. آن کار حادثه است و پایین، در یادداشت امنیتی، آمده است.

روی bare این سه سیاست را بگذارید. از حساب `git` یا با `--git-dir` توسط root:

```bash
sudo -u git git --git-dir=/opt/git/app.git config receive.denyNonFastForwards true
sudo -u git git --git-dir=/opt/git/app.git config receive.denyDeletes true
```

اثرشان این است که push معمولی که نوک شاخه را عقب برگرداند رد می‌شود، و حذف شاخه با push هم رد می‌شود. برای مخزن مرکزی ساده این سخت‌گیری درست است. شاخهٔ feature را قبل از اولین push تمیز کنید، نه بعد از آن با بازنویسی. در GitLab به‌جای این دو کلید، شاخهٔ `main` را Protected کنید، force push را خاموش کنید، و push مستقیم را برای Developer ببندید. شاخهٔ feature می‌تواند آزادتر باشد. این همان چیزی است که bare ساده یک‌جا ندارد: سیاست به ازای هر شاخه.

اولین انتشار شاخه، upstream را هم تنظیم می‌کند:

```bash
git push -u origin main
```

```text
To app-1.example.internal:/opt/git/app.git
 * [new branch]      main -> main
branch 'main' set up to track 'origin/main'.
```

از این به بعد `git status` می‌گوید `main` با `origin/main` هم‌تراز است یا نه.

## Production Example

مخزن سرویس را یک‌بار می‌سازیم و بعد فقط clone می‌کنیم. روی لپ‌تاپ، بعد از init، حداقل فایل را وارد تاریخ کنید تا push چیزی برای فرستادن داشته باشد.

```bash
cd /home/ops/src/app
mkdir -p src
printf '%s\n' 'const timeoutMs = 3000;' > src/billing-client.js
git add src/billing-client.js
git commit -m "chore: initial service layout"
git push -u origin main
```

همکار یا خود سرور استقرار، مخزن را از نو init نمی‌کند. clone می‌کند.

```bash
git clone git@app-1.example.internal:/opt/git/app.git /home/ops/src/app
```

```text
Cloning into '/home/ops/src/app'...
remote: Enumerating objects: 3, done.
remote: Counting objects: 100% (3/3), done.
remote: Total 3 (delta 0), reused 0 (delta 0), pack-reused 0
Receiving objects: 100% (3/3), done.
```

اگر GitLab را انتخاب کرده‌اید، پروژهٔ `ops/app` را در رابط GitLab بسازید، گزینهٔ README خودکار را خاموش کنید تا تاریخ با init محلی‌تان دو ریشهٔ بی‌ربط پیدا نکند، و سپس:

```bash
git remote add origin git@gitlab.example.internal:ops/app.git
git push -u origin main
```

بعد از این push، کاری که باید خودکار بیلد شود مال Runner است، نه مال هوک دست‌ساز روی دیسک. مسیر نصب و ثبت Runner را در [GitLab Runner](/docs/09-cicd/gitlab-runner) دنبال کنید. checkout روی `app-1` زیر `/opt/apps/app` یا اجرای ایمیج، هر کدام باشد، از این مخزن به‌عنوان منبع حقیقت استفاده می‌کند و در [استقرار دستی](/docs/08-deployment/manual-ssh) و [Docker در Production](/docs/08-deployment/docker-production) آمده است.

clone کم‌عمق با `--depth 1` برای سروری که باید به برچسب دیروز برگردد مناسب نیست. تاریخ ناقص است و `git fetch` بعدی باید عمق را جبران کند. برای `/opt/apps/app` کلون کامل بگیرید، یا اصلاً کلون نگیرید و ایمیج همان برچسب را اجرا کنید.

## Security Notes

مخزن bare را `everyone` writable نکنید. `git init --bare --shared=all` برای این آزمایشگاه ممنوع است، چون «همه» روی یک سرور چندکاربره واقعاً همه است. اگر چند انسان باید push کنند، گروه مشخص و `--shared=group` کافی است، و همان گروه نباید شامل کاربر سرویس وب باشد.

`receive.denyNonFastForwards` حادثه را کم می‌کند، حذفش نمی‌کند. کسی که به حساب `git` یا به فایل `objects` دسترسی نوشتن دارد از این کلید رد می‌شود، چون کلید فقط داخل `git-receive-pack` اعمال می‌شود. پس SSH را با کلید محدود کنید و پوسته را `git-shell` بگذارید.

در GitLab، Protected branch جای این کلید است. `main` نباید برای نقش Developer قابل push باشد، force push باید بسته باشد، و حذف شاخه بسته باشد. اگر کسی main را بازنویسی کرد و سرور قبول کرد، محافظ خاموش بوده یا نقش Maintainer بدون توافق این کار را کرده است. این یک حادثه است: نوک شاخهٔ قبلی را از reflog یک کلون سالم یا از لاگ حسابرسی GitLab پیدا می‌کنید و برگرداندن نوک، خودش یک تغییر استثنایی با دسترسی Maintainer است، نه دستور روزمرهٔ این صفحه. اینجا دستوری برای force نوشته نمی‌شود تا کسی آن را به اسکریپت استقرار کپی نکند.

کلید Deploy و کلید انسان را یکی نکنید. کلیدی که pipeline با آن به سرور وصل می‌شود نباید همان کلیدی باشد که می‌تواند مخزن را از روی لپ‌تاپ بازنویسی کند.

راز داخل URL ریموت ممنوع است. URL نمونهٔ این صفحه کلید را در خودش ندارد. اگر مجبور به HTTPS شدید، توکن را در `~/.git-credentials` با مجوز `0600` بگذارید و آن فایل را کامیت نکنید. ترجیح آزمایشگاه SSH است.

## Troubleshooting

push به یک مخزن غیر bare این شکل را دارد. درمان، ignore کردن خطا نیست. درمان، push به `/opt/git/app.git` است.

```text
remote: error: refusing to update checked out branch: refs/heads/main
remote: error: By default, updating the current branch in a non-bare repository
remote: is denied, because it will make the index and work tree inconsistent
remote: with what you pushed, and will require 'git reset --hard' to match
remote: the work tree to HEAD.
To app-1.example.internal:/opt/apps/app
 ! [remote rejected] main -> main (branch is currently checked out)
error: failed to push some refs to 'app-1.example.internal:/opt/apps/app'
```

`git reset --hard` که متن خطا پیشنهاد می‌کند روش استقرار این دانشنامه نیست. آن دستور تغییر ذخیره‌نشدهٔ درخت را دور می‌ریزد.

| نشانه | چه کار کنید |
| --- | --- |
| `Permission denied (publickey)` | کلید `ed25519` در `authorized_keys` کاربر `git` نیست، یا به GitLab اضافه نشده. `ssh -T git@app-1.example.internal` را جدا از Git امتحان کنید |
| `repository not found` | در GitLab مسیر `ops/app` غلط است یا نقش شما Reporter است و push ندارید. URL bare را با URL دونقطه‌ای GitLab عوضی نزده باشید |
| `remote origin already exists` | قبلاً add شده. `git remote -v` را بخوانید. اگر URL غلط است `git remote set-url origin URL-درست` |
| `src refspec main does not match any` | هنوز کامیتی ندارید، یا شاخه `master` مانده و شما `main` را push می‌کنید. `git branch --show-current` |
| `non-fast-forward` | کسی از شما جلوتر push کرده، یا تاریخ محلی را بازنویسی کرده‌اید. `git fetch` و بعد لاگ. برای `main` بازنویسی را به سرور تحمیل نکنید |
| `dubious ownership` | `sudo git` در پوشهٔ `ops` زده‌اید یا برعکس. مالک را درست کنید. استثناهای گستردهٔ `safe.directory` نگذارید |
| `git remote -v` خالی | فقط init کرده‌اید و هنوز `origin` نیست. این خرابی نیست. `git remote add` مانده است |

## Best Practices

- مخزن مرکزی یا bare است یا پروژهٔ GitLab، با یک `origin` که بعد از add با `git remote -v` خوانده شود. checkout سرویس را مقصد push نکنید.
- روی Ubuntu 26.04 و Git 2.53 همیشه `-b main` بدهید، هم برای init معمولی و هم برای `--bare`.
- `denyNonFastForwards` روی bare ساده روشن باشد. در GitLab معادلش Protected branch است، با force بسته.
- clone سرور استقرار را کم‌عمق نکنید اگر باید بین برچسب‌ها برگردید. ساخت و تست بعد از push کار Runner است، نه هوک روی دیسک Omnibus.
