---
sidebar_position: 7
title: مرجع دستورهای Git
description: مرجع init، clone، add، commit، push، pull، fetch، branch، checkout، switch، merge، rebase، stash و log.
---

# مرجع دستورهای Git

## مقدمه

این صفحه فرهنگ دستور است، نه جای یاد گرفتن مدل. اگر نمی‌دانید index با درخت کاری چه فرقی دارد، اول [معماری](./architecture.md) را بخوانید. اگر نمی‌دانید `origin` کدام URL است، [مخزن](./repository.md) را بخوانید. گردش تیم در [گردش‌کار](./workflows.md) است.

همهٔ مثال‌ها روی Ubuntu 26.04 و بستهٔ `git` همان توزیع‌اند. در زمان نوشتن، نسخهٔ resolute برابر `1:2.53.0-1ubuntu1` است و `git --version` عدد `2.53.0` را چاپ می‌کند. قبل از اعتماد، روی خود ماشین ببینید:

```bash
sudo apt update
sudo apt install -y git
git --version
```

```text
git version 2.53.0
```

Git سرویس systemd نیست. نصبش پورت باز نمی‌کند. هویت مثال‌ها نام `Ops` و ایمیل `ops@example.internal` است و داخل همان مخزن تنظیم می‌شود. `--global` فقط روی لپ‌تاپ شخصی همان مهندس معنی دارد. روی `app-1` و هر حساب مشترکی، هویت سراسری نگذارید. کاربر `deploy` کامیت نمی‌سازد. اگر دستور از او `Please tell me who you are` گرفت، کار اشتباه را متوقف کرده، نه اینکه ناقص باشد.

مخزن نمونه `/home/ops/src/app` است. ریموت، پروژهٔ `git@gitlab.example.internal:ops/app.git` است. مسیر استقرار `/opt/apps/app` روی `10.10.1.10` مصرف‌کنندهٔ برچسب است و محل تمرین این دستورها نیست.

## git init

### توضیح

`git init` پوشهٔ `.git` را می‌سازد. تاریخ را از جای دیگری کپی نمی‌کند. با `-b main` نام شاخهٔ اول را صریح می‌گذارد. در Git 2.53 اگر این پرچم را ندهید و `init.defaultBranch` هم خالی باشد، پیش‌فرض بالادست هنوز `master` است و تا Git 3.0 همین می‌ماند. `--bare` مخزن بدون درخت کاری می‌سازد و شرح عملیاتی‌اش در صفحهٔ مخزن است. init دوباره روی یک مخزن موجود، قالب را از نو اختراع نمی‌کند و معمولاً بی‌خطر است، ولی عادت نکنید آن را داخل هر پوشه‌ای بزنید.

### مثال واقعی

```bash
mkdir -p /home/ops/src/app
cd /home/ops/src/app
git init -b main
git status
```

```text
Initialized empty Git repository in /home/ops/src/app/.git/
On branch main

No commits yet

nothing to commit (create/copy files and use "git add" to track)
```

هویت را همین‌جا محلی کنید، نه با `--global` روی سرور:

```bash
git config user.name "Ops"
git config user.email "ops@example.internal"
```

### کاربرد Production

مخزن سرویس را روی لپ‌تاپ init می‌کنیم، نه داخل `/opt/apps/app`. روی سرور، برنامه یا از ایمیج می‌آید یا با clone. init در پوشهٔ سرویس یک `.git` دوم و بی‌ربط می‌سازد که بکاپ و مجوز را گیج می‌کند. مخزن مرکزی با `git init --bare -b main /opt/git/app.git` ساخته می‌شود و مالکش کاربر `git` است، نه `deploy`. بعد از init محلی، تا اولین کامیت چیزی برای push وجود ندارد.

### وقتی خراب می‌شود

`fatal: not a directory` یعنی مسیر پدر نیست. `Permission denied` یعنی `ops` در آن پوشه حق نوشتن ندارد. بدترین حالت خاموش این است که داخل یک مخزن موجود، دوباره در زیرپوشه init کنید. آن وقت `git status` بالای مخزن، پوشهٔ پایین را یک‌جا نادیده می‌گیرد یا بدتر، دو تاریخ تو در تو دارید. قبل از init، `git rev-parse --is-inside-work-tree` را بزنید. اگر چاپ کرد `true`، init نکنید.

اگر شاخه `master` شد، مخزن را به ریموت وصل نکنید و بعد اسم را بی‌خبر عوض کنید. یا مخزن هنوز push نشده و با `git branch -m main` درستش می‌کنید، یا از اول با `-b main` بسازید.

## git clone

### توضیح

`git clone` شیءها را می‌گیرد، پوشهٔ کاری می‌سازد، `origin` را ثبت می‌کند، و شاخهٔ پیش‌فرض طرف مقابل را checkout می‌کند. این همان init به‌علاوهٔ fetch به‌علاوهٔ ساخت upstream است. URL با دونقطهٔ `git@gitlab.example.internal:ops/app.git` مال GitLab است. URL با مسیر مطلق `git@app-1.example.internal:/opt/git/app.git` مال bare است. این دو را در یک دستور قاطی نکنید.

`--branch v1.4.2` اگر هدفش برچسب باشد، HEAD را detached می‌گذارد. برای استقرار خواسته است. برای کارکردن روی ویژگی، بدون آن پرچم کلون کنید و بعد `switch` بزنید.

### مثال واقعی

```bash
git clone git@gitlab.example.internal:ops/app.git /home/ops/src/app
cd /home/ops/src/app
git status
git remote -v
```

```text
Cloning into '/home/ops/src/app'...
remote: Enumerating objects: 48, done.
remote: Counting objects: 100% (48/48), done.
remote: Compressing objects: 100% (31/31), done.
remote: Total 48 (delta 14), reused 48 (delta 14), pack-reused 0
Receiving objects: 100% (48/48), 18.42 KiB | 18.42 MiB/s, done.
Resolving deltas: 100% (14/14), done.
On branch main
Your branch is up to date with 'origin/main'.

nothing to commit, working tree clean
origin	git@gitlab.example.internal:ops/app.git (fetch)
origin	git@gitlab.example.internal:ops/app.git (push)
```

### کاربرد Production

روی میزبان استقرار، اگر مسیر دستی است:

```bash
sudo install -d -o deploy -g deploy -m 0750 /opt/apps/app
sudo -u deploy git clone git@gitlab.example.internal:ops/app.git /opt/apps/app
```

کلون کم‌عمق نگیرید. برگشت به `v1.4.1` در تاریخ ناقص گیر می‌کند. کلیدی که `deploy` با آن clone می‌کند فقط‌خواندنی باشد. بعد از clone، اگر باید دقیقاً انتشار باشد نه نوک متحرک `main`:

```bash
sudo -u deploy git -C /opt/apps/app switch --detach v1.4.2
```

ساختن ایمیج و بالا آوردنش در فصل استقرار است. clone جایگزین آن نیست اگر تیم مسیر کانتینر را انتخاب کرده باشد.

### وقتی خراب می‌شود

`Permission denied (publickey)` یعنی SSH به Git نرسیده که مخزن را نشان بدهد. `ssh -T git@gitlab.example.internal` را جدا امتحان کنید. `repository not found` اغلب نقش یا نام پروژه است، نه قطع شبکه. `destination path already exists and is not an empty directory` یعنی `/opt/apps/app` از یک نصب قبلی پر است. محتوا را با `rm -rf` کور پاک نکنید. شاید درخت کثیفِ تنها کپی یک اصلاح سروری باشد. اول `ls` و اگر `.git` دارد `git status`.

`detected dubious ownership` وقتی است که `ops` داخل مخزن مال `deploy` دستور می‌زند. مالک را عوض نکنید فقط برای اینکه دستور شما کار کند. با همان کاربرِ مالک اجرا کنید.

## git add

### توضیح

`git add` محتوای فعلی فایل را به شکل blob می‌نویسد و مسیر را در index به آن blob وصل می‌کند. هنوز کامیت نیست. اگر بعد از add دوباره فایل را ذخیره کنید، index نسخهٔ لحظهٔ add را دارد و دیسک نسخهٔ جدیدتر را. کامیت بعدی، index را برمی‌دارد.

مسیر را صریح بنویسید. `git add -u` فقط فایل‌های از قبل ردگیری‌شده را به index می‌آورد و untracked را برنمی‌دارد. `git add -p` تکه‌ها را جدا می‌پرسد و برای وقتی است که یک فایل هم اصلاح مهلت را دارد و هم یک آزمایش نصفه. `git add -f` نادیدهٔ ignore را دور می‌زند. برای `.env` زدنش حادثه است.

### مثال واقعی

```bash
cd /home/ops/src/app
git add src/billing-client.js
git status
```

```text
On branch feature/billing-timeout
Your branch is up to date with 'origin/feature/billing-timeout'.

Changes to be committed:
  (use "git restore --staged <file>..." to unstage)
	modified:   src/billing-client.js

Changes not staged for commit:
  (use "git add <file>..." to update what will be committed)
  (use "git restore <file>..." to discard changes in working directory)
	modified:   README.md

Untracked files:
  (use "git add <file>..." to include in what will be committed)
	deploy/healthcheck.sh
```

فقط `src/billing-client.js` سوار کامیت بعدی است. README و اسکریپت سلامت نیستند.

### کاربرد Production

قبل از add، `git status` را تا آخر بخوانید. روی سرویس `app` فایل‌هایی که هرگز نباید add شوند: `.env`، هر چیز زیر `/var/backups` که اشتباهاً داخل درخت کپی شده، دامپ SQL، و کلید `id_ed25519`. یک `.gitignore` در ریشهٔ مخزن این نام‌ها را بی‌اثر می‌کند، به شرطی که قبلاً ردگیری نشده باشند. فایل ردگیری‌شده با ignore تنها نمی‌شود.

روی سرور `git add` نزنید. اگر `status` آنجا چیزی نشان می‌دهد، درخت استقرار کثیف است و باید دور ریخته شود و از برچسب دوباره ساخته شود، نه اینکه کثیفی کامیت شود.

### وقتی خراب می‌شود

`The following paths are ignored by one of your .gitignore files` یعنی add معمولی درست امتناع کرده. `-f` را نزنید تا وقتی ندانید چرا ignore شده. پوشهٔ خالی add نمی‌شود، چون Git درخت خالی نگه نمی‌دارد. اگر برنامه به آن پوشه نیاز دارد، یک فایل نگهبان با دلیل مشخص اضافه کنید.

اگر `git add src` یک دنیای فایل باینری آورد، دستور را با مسیر تنگ‌تر تکرار نکنید قبل از اینکه index را تمیز کنید. بیرون آوردن از index، بدون پاک کردن دیسک:

```bash
git restore --staged src/vendor-dump.bin
```

خود فایل روی دیسک می‌ماند. `git reset` بدون مسیر، برای این کار در اسکریپت تازه استفاده نکنید. معنی‌های زیادی دارد و در صفحهٔ معماری از restore حرف زده‌ایم.

## git commit

### توضیح

`git commit` از روی index یک tree و یک شیء commit می‌سازد و نوک شاخهٔ جاری را به آن می‌برد. چیزی که add نشده واردش نمی‌شود، حتی اگر در ویرایشگر باز باشد. نویسنده (author) و ثبت‌کننده (committer) از `user.name` و `user.email` می‌آیند. در کامیت معمولی یکی‌اند. تاریخ، زمان ماشین با منطقهٔ `Asia/Tehran` است.

پیام خوب می‌گوید چرا این تغییر هست. خط اول امری و مشخص است. بدنه، محدودیتی را که برداشته‌اید می‌گوید. `update` و `fix` و `wip` پیام نیستند، چون فردا در `git log` بی‌مصرف‌اند.

### مثال واقعی

هویت محلی، بعد پیام:

```bash
cd /home/ops/src/app
git config user.name "Ops"
git config user.email "ops@example.internal"
git add src/billing-client.js
git commit -m "$(cat <<'EOF'
fix: raise billing client timeout to 8s

The invoice API p99 is about 5s after the tax-service change.
A 3s client budget aborted valid checkouts on app-1.
EOF
)"
git log -1
```

```text
[feature/billing-timeout e41bb20] fix: raise billing client timeout to 8s
 1 file changed, 1 insertion(+), 1 deletion(-)
commit e41bb20c9d8e7f6a5b4c3d2e1f0a9b8c7d6e5f4a
Author: Ops <ops@example.internal>
Date:   Wed Sep 23 14:22:08 2026 +0330

    fix: raise billing client timeout to 8s

    The invoice API p99 is about 5s after the tax-service change.
    A 3s client budget aborted valid checkouts on app-1.
```

روی لپ‌تاپ شخصی، اگر نمی‌خواهید هر مخزن را جدا تنظیم کنید، یک‌بار `--global` با همین نام و ایمیل قابل قبول است. همان دستور را روی حساب مشترک `app-1` نزنید. آنجا چند انسان یک `~/.gitconfig` را شریک می‌شوند و تاریخ دروغ می‌گوید.

### کاربرد Production

یک کامیت یک دلیل. مهلت شبکه و تغییر بی‌ربط README را در دو کامیت بگذارید تا hotfix بعدی بتواند یکی را نام ببرد. کامیت را روی لپ‌تاپ بسازید و با merge request به `main` برسانید. pipeline باید روی همان هش تست شود. کامیت مستقیم روی `main` محلی، که هنوز push نشده، هم با قرار تیم نمی‌خواند. اگر زدید، آن را به یک شاخهٔ feature منتقل کنید قبل از push، نه اینکه `main` ریموت را مجبور کنید آن را بپذیرد.

در اسکریپت، پیام را با `-m` بدهید تا `vim` روی سرور بدون ترمینال گیر نکند. اسکریپت استقرار اصلاً نباید commit داشته باشد.

### وقتی خراب می‌شود

```text
Author identity unknown

*** Please tell me who you are.

Run

  git config user.email "you@example.com"
  git config user.name "Your Name"
```

این متن را با `--global` روی سرور جواب ندهید. یا محلی همین مخزن را با `Ops` و `ops@example.internal` پر کنید، یا بپذیرید که اینجا نباید کامیت ساخته شود.

`nothing to commit, working tree clean` یعنی add نکرده‌اید یا تغییر واقعاً نیست. `no changes added to commit` یعنی فایل عوض شده ولی index خالی است. ویرایشگر را اگر با پیام خالی بستید، کامیت ساخته نمی‌شود و index دست نمی‌خورد. این شکست سالم است. دوباره با پیام واقعی commit کنید.

اگر هوک سمت کلاینت کامیت را رد کرد، متن هوک را بخوانید. `--no-verify` را عادت نکنید. همان هوک معمولاً جلوی نشانگر تداخل یا فایل ممنوع را گرفته است.

## git push

### توضیح

`git push` شیءهایی که ریموت ندارد را می‌فرستد و یک ref سمت ریموت را جلو می‌برد. با `push.default=simple` فقط شاخهٔ جاری به upstream همنامش می‌رود. `-u` همان upstream را اولین بار ثبت می‌کند. بدون نام ریموت، Git از upstream شاخهٔ جاری استفاده می‌کند و اگر نباشد خطا می‌دهد. این خطا بهتر از فرستادن خاموش به جای غلط است.

`--follow-tags` برچسب annotated قابل رسیدن از همین push را هم می‌فرستد. شرحش در صفحهٔ برچسب است. push مجوز بازنویسی تاریخ را ندارد. اگر نوک ریموت جدّ کامیت شما نباشد، سرور رد می‌کند.

### مثال واقعی

```bash
cd /home/ops/src/app
git push -u origin feature/billing-timeout
```

```text
Enumerating objects: 7, done.
Counting objects: 100% (7/7), done.
Delta compression using up to 4 threads
Compressing objects: 100% (4/4), done.
Writing objects: 100% (4/4), 612 bytes | 612.00 KiB/s, done.
Total 4 (delta 2), reused 0 (delta 0), pack-reused 0
remote: 
remote: To create a merge request for feature/billing-timeout, visit:
remote:   https://gitlab.example.internal/ops/app/-/merge_requests/new
remote:
To gitlab.example.internal:ops/app.git
 * [new branch]      feature/billing-timeout -> feature/billing-timeout
branch 'feature/billing-timeout' set up to track 'origin/feature/billing-timeout'.
```

پیام ساخت merge request را GitLab می‌نویسد، نه خود Git. bare ساده این متن را ندارد.

### کاربرد Production

انسان‌ها شاخهٔ feature یا hotfix را push می‌کنند. `main` را GitLab بعد از merge request جلو می‌برد، یا Maintainer بعد از برچسب با `--follow-tags`. سرور `app-1` push نمی‌کند. اگر اسکریپت استقرار دستور push دارد، مرز نقش‌ها قاطی شده است.

قبل از push یک‌بار `git log origin/feature/billing-timeout..HEAD` را ببینید تا معلوم باشد دقیقاً کدام کامیت‌ها می‌روند. اگر آن دستور گفت upstream ندارید، هنوز `-u` نزده‌اید و این نگاه را با `git log` روی همان شاخهٔ محلی انجام دهید.

### وقتی خراب می‌شود

رد شدن غیر fast-forward:

```text
To gitlab.example.internal:ops/app.git
 ! [rejected]        feature/billing-timeout -> feature/billing-timeout (non-fast-forward)
error: failed to push some refs to 'gitlab.example.internal:ops/app.git'
hint: Updates were rejected because the tip of your current branch is behind
hint: its remote counterpart. If you want to integrate the remote changes,
hint: use 'git pull' before pushing again.
```

راهنمای خود Git که می‌گوید pull کنید، روی `main` خطرناک است اگر pullrebase یا ادغام بی‌قاعده روشن باشد. اول `git fetch` و `git log` تا ببینید چه کسی جلو است. برای `main` شما نباید نوک را عوض کنید. برای feature، اگر تنها نویسنده هستید و کامیت ریموت را خودتان ساخته‌اید، fetch و ادغام یا یک rebase منتشرنشده کافی است.

رد شدن به‌خاطر Protected branch موفقیت سیاست است. کار را داخل merge request بگذارید. `src refspec main does not match any` یعنی شاخهٔ محلی `main` نیست یا هنوز کامیت ندارد.

این مرجع دستور force به `main` ندارد. اگر push فقط با اجبار قبول می‌شود، یا شاخه را کسی دیگر جلو برده، یا شما تاریخ منتشرشده را بازنویسی کرده‌اید. هر دو را با fetch بررسی کنید. باز کردن محافظ `main` برای رد شدن از این خطا حادثه است و در یادداشت‌های امنیتی صفحه‌های گردش و مخزن آمده است.

## git pull

### توضیح

`git pull` بدون تنظیم اضافه، ابتدا fetch می‌کند و بعد شاخهٔ fetch‌شده را در شاخهٔ جاری ادغام می‌کند. یعنی یک دستور دو کار است و دومی را تا وقتی تمام نشده خوب نمی‌بینید. `git pull --ff-only` اگر ادغام فقط با جلو بردن اشاره‌گر ممکن باشد انجام می‌دهد و اگر تاریخ‌ها واگرا باشند متوقف می‌شود. این شکل برای `main` محلی درست است.

معادل خوانا و قابل توقف، دو دستور است: `git fetch` و بعد تصمیم جدا برای `git merge`. pull را وقتی بزنید که از قبل می‌دانید فقط fast-forward است. rebase را داخل pull قایم نکنید.

### مثال واقعی

```bash
cd /home/ops/src/app
git switch main
git pull --ff-only origin main
```

```text
From gitlab.example.internal:ops/app
 * branch            main       -> FETCH_HEAD
   b71e902..d09aa31  main       -> origin/main
Updating b71e902..d09aa31
Fast-forward
 package.json | 2 +-
 1 file changed, 1 insertion(+), 1 deletion(-)
```

معادلش که وسط کار اجازهٔ نگاه می‌دهد:

```bash
git fetch origin
git log --oneline --decorate HEAD..origin/main
git merge --ff-only origin/main
```

اگر آن `git log` چیزی نشان بدهد که انتظارش را ندارید، merge را نزنید. pull این مکث را ندارد.

### کاربرد Production

روی لپ‌تاپ، به‌روزرسانی `main` فقط با `--ff-only` است. اگر متوقف شد، `main` محلی کامیت اضافه دارد و این با گردش تیم جور نیست. آن کامیت‌ها را به یک شاخهٔ feature ببرید.

روی `/opt/apps/app` به‌جای pull روزمرهٔ `main`، برچسب را fetch کنید و detached checkout کنید. pull کردن `main` روی سرور یعنی اجرای کدی که شاید هنوز برچسب نخورده. این کار را اسکریپت استقرار نکنید.

`git pull` داخل شاخهٔ feature، تغییرات همکار روی همان شاخه را می‌آورد. اگر تنها نیستید، `--ff-only` باز هم درست است. واگرایی یعنی هر دو کامیت دارید و باید آگاهانه merge کنید، نه اینکه pull تصمیم بگیرد.

### وقتی خراب می‌شود

```text
From gitlab.example.internal:ops/app
 * branch            main       -> FETCH_HEAD
hint: Diverging branches can't be fast-forwarded, you need to either:
fatal: Not possible to fast-forward, aborting.
```

این شکست `--ff-only` است و سالم است. `git status` و `git log --oneline --graph --decorate --all -n 15` را بخوانید. اگر نوک ریموت با force عوض شده باشد، fast-forward هم نیست. آن را با pull اجباری «درست» نکنید. حادثه است.

اگر درخت کثیف باشد pull متوقف می‌شود تا فایل محلی‌تان را له نکند. تغییر را کامیت یا stash کنید. stash پایین همین صفحه است. رها کردن merge نیمه‌کارهٔ pull، `git status` را تا `git merge --abort` در حالت ادغام نگه می‌دارد.

## git fetch

### توضیح

`git fetch` شیء تازه را می‌گیرد و شاخه‌های remote-tracking مثل `origin/main` را به‌روز می‌کند. درخت کاری، index، و شاخهٔ محلی `main` را عوض نمی‌کند. به همین دلیل fetch دستور امنِ نگاه کردن است. pull این ایمنی را ندارد چون بلافاصله ادغام می‌کند.

`git fetch origin --prune` نام شاخه‌های remote-tracking را که سمت سرور حذف شده‌اند از لپ‌تاپ پاک می‌کند. خود شاخهٔ محلی شما را پاک نمی‌کند. بدون `--prune`، `origin/feature/old` ماه‌ها بعد از حذف سرور هنوز در `git branch -a` هست و آدم فکر می‌کند کار هنوز باز است.

### مثال واقعی

```bash
cd /home/ops/src/app
git fetch origin
git log --oneline --graph --decorate HEAD..origin/main
```

```text
From gitlab.example.internal:ops/app
   b71e902..d09aa31  main       -> origin/main
* d09aa31 (origin/main) chore: bump pg client to 18
```

`HEAD..origin/main` یعنی «آنچه origin دارد و این شاخه ندارد». اگر خروجی خالی باشد، شما عقب نیستید. جهت را برعکس بنویسید تا ببینید چه چیزی را هنوز نفرستاده‌اید: `origin/main..HEAD`.

### کاربرد Production

هر تصمیم merge یا rebase با fetch تازه شروع می‌شود. cache ذهنی از دیروز کافی نیست، چون همکار یا pipeline ممکن است `main` را جلو برده باشد. Job مربوط به Runner هم باید همان هش fetch‌شده را بیلد کند، نه یک کلون قدیمی روی دیسک Runner که کسی fetch نکرده. ثبت Runner جداست. از این صفحه فقط این را بردارید که منبع بیلد، نتیجهٔ fetch همان لحظه است.

روی سرور، برای عوض کردن انتشار:

```bash
sudo -u deploy git -C /opt/apps/app fetch origin tag v1.4.2
```

این دستور درخت را عوض نمی‌کند تا وقتی خودتان switch کنید. همین مکث مفید است. فرآیند در حال اجرا تا ری‌استارت یا تعویض کانتینر هنوز باینری قبلی است. fetch به‌تنهایی سرویس را عوض نمی‌کند و این را با «تمام شد» اشتباه نگیرید.

### وقتی خراب می‌شود

خطای SSH همان خطای clone و push است. `fatal: couldn't find remote ref v1.4.2` یعنی برچسب push نشده یا سبک بوده و follow-tags آن را نبرده. `origin` غلط را با `git remote -v` ببینید، نه با حدس.

اگر fetch موفق است ولی `git status` هنوز می‌گوید up to date در حالی که وب GitLab کامیت جدید نشان می‌دهد، یا به ریموت دیگری نگاه می‌کنید یا شاخهٔ محلی upstream دیگری دارد. `git branch -vv` نام upstream را می‌گوید.

`--prune` یک شاخهٔ محلی همنام را حذف نمی‌کند. اگر فکر می‌کنید کار از بین رفته، `git branch` را جدا از `git branch -r` بخوانید.

## git branch

### توضیح

`git branch` بدون آرگومان فهرست محلی را چاپ می‌کند و ستاره، شاخهٔ جاری است. `git branch -vv` upstream و هش کوتاه و پیام نوک را هم نشان می‌دهد. `git branch feature/billing-timeout` اشاره‌گر می‌سازد ولی شما را به آن نمی‌برد. برای ساختن و رفتن، در این تیم `git switch -c` را ترجیح می‌دهیم تا یک دستور نقش checkout قدیمی را بازی نکند.

`git branch -d` فقط اگر کامیت‌های آن شاخه از جایی که هستید قابل رسیدن باشند حذف می‌کند. این محافظ است. شکل اجباری حذف، این محافظ را برمی‌دارد. کامیت‌ها تا مدتی فقط در reflog همین لپ‌تاپ می‌مانند و روی سرور نیستند اگر push نشده باشند.

### مثال واقعی

```bash
cd /home/ops/src/app
git branch -vv
```

```text
* feature/billing-timeout e41bb20 [origin/feature/billing-timeout] fix: raise billing client timeout to 8s
  main                    d09aa31 [origin/main] chore: bump pg client to 18
```

ستاره روی feature است. هر دو upstream دارند چون قبلاً `-u` خورده‌اند.

### کاربرد Production

نام‌ها: `feature/billing-timeout` و `hotfix/invoice-null` و `main`. شاخهٔ شخصی با نام آزمایشی را push نکنید. بعد از ادغام در `main` و اطمینان از اینکه برچسب یا کامیت ادغام آن کار را دارد، نسخهٔ محلی را با `-d` بردارید. نسخهٔ ریموت را از رابط GitLab حذف کنید وقتی merge request بسته شده، تا فهرست استقرار شلوغ نشود. حذف ریموت با push اجبارگونه در اسکریپت این تیم نیست.

`git branch -vv` را قبل از شروع hotfix ببینید تا مطمئن شوید `main` محلی به `origin/main` وصل است، نه به یک ریموت آزمایشی.

### وقتی خراب می‌شود

```text
error: the branch 'feature/billing-timeout' is not fully merged.
If you are sure you want to delete it, run 'git branch -D feature/billing-timeout'.
```

این خطا را با کپی کردن دستور پیشنهادی جواب ندهید تا وقتی `git log main..feature/billing-timeout` را خوانده باشید. اگر آن لاگ کامیت دارد و جای دیگری نیست، حذف یعنی گم کردن کار.

نمی‌شود شاخه‌ای را که روش ایستاده‌اید با `-d` برداشت. اول `git switch main`. اگر Git بگوید شاخه پیدا نشد، نام را از `git branch` بردارید نه از حافظه. حروف بزرگ و کوچک در نام شاخه فرق دارند.

## git checkout

### توضیح

`git checkout` دستور قدیمی و دوکاره است. با نام شاخه، `HEAD` را جابه‌جا می‌کند. با مسیر فایل، محتوای درخت کاری را از index یا از یک کامیت پر می‌کند و تغییر ذخیره‌نشدهٔ آن مسیر را دور می‌ریزد. این دو در یک کلمه، حادثهٔ کلاسیک است: آدم می‌خواسته شاخه عوض کند و یک مسیر را هم هم‌نام نوشته، یا برعکس.

از Git 2.23 جایگزین روشن وجود دارد و در 2.53 هم همان است. برای شاخه `git switch`. برای برگرداندن فایل `git restore`. checkout را فقط وقتی در این صفحه می‌آوریم که اسکریپت قدیمی را بخوانید و بفهمید چه می‌کند. اسکریپت تازه را با checkout شروع نکنید.

`git checkout --detach v1.4.2` همان سنجاق کردن HEAD روی برچسب است. معادل روشن‌ترش `git switch --detach v1.4.2` است.

### مثال واقعی

شکل خطرناک، برگرداندن یک مسیر است. این دستور تغییر ذخیره‌نشدهٔ README را از بین می‌برد اگر هنوز add نشده باشد:

```bash
git checkout -- README.md
git status
```

اگر README دیگر در بخش modified نباشد، آن ویرایش تمام شده است. reflog این را برنمی‌گرداند، چون هرگز شیء نشده بود.

شکل قدیمی عوض کردن شاخه، که هنوز در یادداشت‌های کهنه هست:

```bash
git checkout main
```

```text
Switched to branch 'main'
Your branch is up to date with 'origin/main'.
```

همان کار را با `git switch main` بکنید تا ماه بعد، وقتی خواستید فایل را برگردانید، عادت دستتان checkout نباشد.

### کاربرد Production

در اسکریپت استقرار قدیمی ممکن است `git checkout v1.4.2` ببینید. رفتارش روی برچسب، detached HEAD است و برای یک checkout فقط‌خواندنی قابل قبول است، به شرطی که بعدش کسی آنجا کامیت نسازد. اسکریپت تازه را به `git switch --detach v1.4.2` عوض کنید تا خواننده فکر نکند قرار است شاخه‌ای به نام برچسب ساخته شود.

روی لپ‌تاپ، checkout را از تابع‌های مشترک پوسته حذف کنید. یک تابع که گاهی شاخه می‌گیرد و گاهی مسیر، دیر یا زود یک فایل را صفر می‌کند.

### وقتی خراب می‌شود

detached HEAD بعد از checkout یک هش یا برچسب:

```text
Note: switching to 'v1.4.2'.

You are in 'detached HEAD' state.
```

اگر این را روی لپ‌تاپ و وسط کار feature می‌بینید، کامیت نکنید. `git switch feature/billing-timeout` برگردید. اگر کامیت هم ساخته‌اید، با `git switch -c` نجاتش دهید تا از فهرست شاخه‌ها بیرون نماند.

`error: pathspec 'README.md' did not match` یعنی نام را غلط نوشته‌اید. چیزی پاک نشده است. اگر دستور بدون `--` یک نام را هم به شاخه و هم به فایل شبیه ببیند، Git می‌پرسسد یا بدتر، یکی را انتخاب می‌کند. به همین دلیل این دستور را کنار می‌گذاریم.

## git switch

### توضیح

`git switch` فقط شاخه را عوض می‌کند یا با `-c` می‌سازد و می‌رود. فایل را از تاریخ برنمی‌گرداند. آن کار `git restore` است. `--detach` برای نشستن روی برچسب است. بدون `--detach`، دادن یک برچسب خطا است و این خطا مفید است، چون انتشار نباید مثل شاخهٔ کاری رفتار کند.

اگر تغییر ذخیره‌نشده با درخت مقصد برخورد داشته باشد، switch هیچ فایلی را عوض نمی‌کند و خارج می‌شود. این سخت‌گیری را با پرچم اجبار دور نزنید. یا کامیت، یا stash، یا restore آگاهانه.

### مثال واقعی

```bash
cd /home/ops/src/app
git fetch origin
git switch main
git merge --ff-only origin/main
git switch -c feature/billing-timeout
git status
```

```text
Switched to branch 'main'
Your branch is up to date with 'origin/main'.
Already up to date.
Switched to a new branch 'feature/billing-timeout'
On branch feature/billing-timeout
nothing to commit, working tree clean
```

برگشت به کار قبلی، اگر شاخه وجود دارد، بدون `-c` است:

```bash
git switch feature/billing-timeout
```

### کاربرد Production

شروع هر feature و هر hotfix در گردش این تیم همین سه خط است: fetch، هم‌تراز کردن `main` با `--ff-only`، `switch -c`. روی `app-1` بین featureها switch نکنید. تنها switch مجاز روی سرور، در اسکریپت استقرار و به شکل `--detach` روی برچسبی است که قرار است اجرا شود. بعد از آن `git status` باید clean باشد. اگر نیست، اسکریپت باید غیرصفر خارج شود و سرویس را ری‌استارت نکند.

### وقتی خراب می‌شود

```text
error: Your local changes to the following files would be overwritten by checkout:
	src/billing-client.js
Please commit your changes or stash them before you switch branches.
Aborting
```

کلمهٔ checkout داخل متن، باقی‌ماندهٔ پیاده‌سازی است. دستور شما switch بوده. چیزی از بین نرفته. یا کامیت کنید یا اگر تغییر واقعاً بی‌ارزش است `git restore src/billing-client.js` که دیگر برگشتی ندارد.

`fatal: a branch named 'feature/billing-timeout' already exists` یعنی `-c` زیادی است. بدون `-c` همان شاخه را باز کنید. `fatal: invalid reference: feature/billing-timeout` یعنی هنوز ساخته نشده، یا فقط روی ریموت است. در حالت دوم `git fetch` و بعد `git switch feature/billing-timeout` اگر upstream پیدا شود آن را محلی می‌سازد. اگر نساخت، `git switch -c feature/billing-timeout --track origin/feature/billing-timeout`.

## git merge

### توضیح

`git merge` تاریخ یک شاخه را در شاخه‌ای که روش هستید وارد می‌کند. اگر fast-forward ممکن باشد و منعش نکرده باشید، فقط اشاره‌گر جلو می‌رود. `--no-ff` همیشه کامیت ادغام با دو والد می‌سازد. راهبرد پیش‌فرض Git 2.53 نامش `ort` است. تداخل، فایل را با نشانگر در درخت کاری می‌گذارد و تا `git add` و یک کامیت، کار ناتمام است. `--abort` به وضعیت قبل از همین merge برمی‌گردد، به شرطی که خودتان فایل‌های بی‌ربط را وسط کار قاطی نکرده باشید.

صفحهٔ [ادغام و بازنویسی](./merge-rebase.md) عدد دو کامیت `e41bb20` و `f52cc07` را با نمودار نشان می‌دهد. اینجا فقط شکل دستور است.

### مثال واقعی

```bash
cd /home/ops/src/app
git switch main
git merge --no-ff feature/billing-timeout -m "Merge branch 'feature/billing-timeout'"
git log --oneline --graph --decorate -n 5
```

```text
Merge made by the 'ort' strategy.
 src/billing-client.js | 4 +++-
 1 file changed, 3 insertions(+), 1 deletion(-)
*   0ab77e1 (HEAD -> main) Merge branch 'feature/billing-timeout'
|\
| * f52cc07 (feature/billing-timeout) chore: log upstream latency
| * e41bb20 fix: raise billing client timeout to 8s
|/
* d09aa31 (origin/main) chore: bump pg client to 18
```

### کاربرد Production

روی `main`، ادغام ویژگی با `--no-ff` است تا مرز merge request در تاریخ بماند. در GitLab همین را با روش merge commit انتخاب کنید، نه squash. squash دو کامیت را به یک پیام له می‌کند و hotfix بعدی نمی‌تواند بگوید کدام بخش برگشته است.

ادغام را روی سرور Production انجام ندهید. اگر `/opt/apps/app` به merge نیاز دارد، آنجا منبع حقیقت شده و گردش را ترک کرده‌اید. تداخل مال لپ‌تاپ نویسنده است، جایی که تست قابل اجراست.

`git merge --ff-only origin/main` روی `main` محلی، قبل از ساختن feature، ادغام نیست. فقط عقب‌ماندگی را جبران می‌کند و اگر محلی کامیت اضافه داشته باشید می‌ایستد.

### وقتی خراب می‌شود

```text
Auto-merging src/billing-client.js
CONFLICT (content): Merge conflict in src/billing-client.js
Automatic merge failed; fix conflicts and then commit the result.
```

فایل را باز کنید، بخش بین نشانگرها را به یک متن نهایی برسانید، نشانگر را برندارید اگر هنوز در فایل است، `git add` کنید، و کامیت کنید. `git merge --abort` اگر خواستید از اول. کامیت کردن در حالی که نشانگر مانده، blob خراب می‌سازد و pipeline باید جلویش را بگیرد، ولی به آن تکیه نکنید.

`Already up to date` یعنی چیزی برای آوردن نیست. خطا نیست. اگر انتظار کامیت داشتید، شاخهٔ غلط را merge کرده‌اید یا fetch نکرده‌اید.

## git rebase

### توضیح

`git rebase` کامیت‌هایی که روی شاخهٔ جاری هستند و روی پایه نیستند را به ترتیب روی پایه از نو می‌سازد. هش جدید می‌شود. پیام اغلب همان می‌ماند. برای شاخهٔ feature که هنوز push نشده، این کار تداخل با `main` تازه را همان‌جا حل می‌کند. برای `main`، و برای هر شاخه‌ای که کس دیگری از آن گرفته، ممنوع است چون هویت کامیت‌های منتشرشده را عوض می‌کند.

پایه می‌تواند `main` باشد. موضوع rebase خود `main` نیست. اگر وسط کار پشیمان شدید `--abort` به نوک قبلی همان شاخه برمی‌گرداند.

### مثال واقعی

دو کامیت feature هنوز push نشده‌اند و `main` یک کامیت جلوتر است:

```bash
cd /home/ops/src/app
git switch feature/billing-timeout
git rebase main
git log --oneline --graph --decorate -n 4
```

```text
Successfully rebased and updated refs/heads/feature/billing-timeout.
* 8c01aa4 (HEAD -> feature/billing-timeout) chore: log upstream latency
* 7ab90e2 fix: raise billing client timeout to 8s
* d09aa31 (main, origin/main) chore: bump pg client to 18
* c88d14a feat: add invoice export endpoint
```

`8c01aa4` و `7ab90e2` جایگزین `f52cc07` و `e41bb20` شده‌اند. diff هر کدام شبیه قبلی است. parent فرق دارد. اگر این هش‌های قدیمی را جایی یادداشت کرده بودید، دیگر نوک شاخه نیستند.

### کاربرد Production

فقط نویسنده، فقط شاخهٔ feature یا hotfix هنوز منتشرنشده، فقط برای نشستن روی `main` تازه، آن هم قبل از merge request. بعد از اینکه بازبین کامنت را روی هش مشخص گذاشت، rebase نکنید. کامنت به هشی وصل است که دیگر روی شاخه نیست. در آن مرحله `git merge origin/main` داخل feature هش‌ها را زنده نگه می‌دارد.

هیچ اسکریپت استقرار و هیچ Jobای `git rebase main` روی مخزن مشترک اجرا نمی‌کند. تمیز کردن تاریخ `main` با rebase هدف این دستور نیست.

### وقتی خراب می‌شود

```text
Rebasing (1/2)
CONFLICT (content): Merge conflict in src/billing-client.js
error: could not apply e41bb20... fix: raise billing client timeout to 8s
hint: Resolve all conflicts manually, mark them as resolved with
hint: "git add/rm <conflicted_files>", then run "git rebase --continue".
hint: You can instead skip this commit: run "git rebase --skip".
hint: To abort and get back to the state before "git rebase", run "git rebase --abort".
Could not apply e41bb20... fix: raise billing client timeout to 8s
```

`--skip` آن یکی از دو کامیت را در تاریخ جدید حذف می‌کند. برای رد شدن از تداخل نزنید. یا حل و `--continue`، یا `--abort`.

اگر بعد از rebase، push معمولی رد شد، یعنی شاخه را قبلاً فرستاده بودید و این بازنویسی دیگر خصوصی نبود. `--abort` دیگر کافی نیست چون rebase تمام شده. نوک قبلی در reflog همین لپ‌تاپ است. برگرداندن شاخهٔ feature به آن نوک، اگر کس دیگری همان شاخه را دارد، باید با او باشد. `main` را وارد این بازی نکنید. force به `main` پاسخ این خطا نیست و در این مرجع به‌عنوان دستور نیامده است.

## git stash

### توضیح

`git stash push` تغییر ذخیره‌نشدهٔ ردگیری‌شده را از درخت کاری و index برمی‌دارد و روی یک پشتهٔ محلی می‌گذارد تا بتوانید شاخه عوض کنید. کامیت نیست و push به `origin` هم نیست. اسم دستور متأسفانه با push شبکه یکی است. `git stash pop` آخرین مورد را روی درخت فعلی اعمال می‌کند و اگر اعمال تمیز باشد از پشته حذف می‌کند. اگر تداخل شود، مورد را روی پشته نگه می‌دارد تا عمداً حذفش کنید.

untracked به‌صورت پیش‌فرض داخل stash نمی‌آید. فایل جدید را یا add کنید یا بپذیرید که stash آن را جابه‌جا نمی‌کند. پیام `-m` را بگذارید، وگرنه ماه بعد یک پشتهٔ «WIP» بی‌معنی دارید.

### مثال واقعی

```bash
cd /home/ops/src/app
git stash push -m "wip before switching to main"
git switch main
git switch feature/billing-timeout
git stash pop
```

```text
Saved working directory and index state On feature/billing-timeout: wip before switching to main
On branch feature/billing-timeout
Changes not staged for commit:
  (use "git add <file>..." to update what will be committed)
  (use "git restore <file>..." to discard changes in working directory)
	modified:   src/billing-client.js

no changes added to commit (use "git add" and/or "git commit -a")
Dropped refs/stash@{0} (3d2c1b0a9f8e7d6c5b4a39281706f5e4d3c2b1a0)
```

خط آخر فقط وقتی چاپ می‌شود که pop تمیز اعمال شده باشد.

### کاربرد Production

stash تخته‌سیاه لپ‌تاپ است، نه بکاپ و نه راه انتقال hotfix به سرور. اگر اصلاح ارزش دارد، کامیت روی `hotfix/invoice-null` است حتی اگر پیام بگوید هنوز آزمایشی است. stash با خراب شدن دیسک لپ‌تاپ می‌رود و روی GitLab دیده نمی‌شود.

روی `app-1` stash نسازید. درخت استقرار یا تمیز است یا غلط است. پشتهٔ stash روی سرور یعنی یک رفتار سوم که در برچسب نیست و در `git log` هم نیست.

قبل از pull روی شاخهٔ feature، اگر تغییر نیمه‌کاره دارید و هنوز نمی‌خواهید کامیت کنید، stash push با پیام، بعد pull با `--ff-only`، بعد pop. اگر pull قرار است تداخل بدهد، بهتر است اول کامیت کنید تا هر دو طرف در تاریخ باشند.

### وقتی خراب می‌شود

pop روی درختی که همان خط‌ها را عوض کرده:

```text
Auto-merging src/billing-client.js
CONFLICT (content): Merge conflict in src/billing-client.js
On branch feature/billing-timeout
Unmerged paths:
  (use "git restore --staged <file>..." to unstage)
  (use "git add <file>..." to mark resolution)
	both modified:   src/billing-client.js

no changes added to commit (use "git add" and/or "git commit -a")
The stash entry is kept in case you need it again.
```

مورد هنوز روی پشته است. بعد از اینکه فایل را درست کردید و add کردید، اگر دیگر به کپی stash نیاز ندارید آن را حذف کنید. تا وقتی حذفش نکرده‌اید، pop بعدی همان تغییر را دوباره می‌ریزد روی کار تازه. فهرست پشته:

```bash
git stash list
```

```text
stash@{0}: On feature/billing-timeout: wip before switching to main
```

اگر pop را روی شاخهٔ غلط زدید، نشانگر را حل نکنید و کور کامیت نکنید. وضعیت درخت را به قبل برگردانید فقط اگر تغییر ارزشمند دیگری در کنارش نیست، و stash چون نگه داشته شده هنوز قابل اعمال روی شاخهٔ درست است. `git stash drop` بدون نگاه به `git stash show -p` حذف است. reflog خود stash تا مدتی می‌ماند، ولی این را روش کار نکنید.

## git log

### توضیح

`git log` از نوک شاخهٔ جاری به سمت parentها می‌رود و به‌صورت پیش‌فرض پیام کامل، نویسنده، و تاریخ را نشان می‌دهد. برای دیدن شکل تاریخ، این سه پرچم را با هم بزنید. `--oneline` هر کامیت را یک خط می‌کند. `--graph` والد ادغام را با خط نشان می‌دهد. `--decorate` نام شاخه و برچسب چسبیده به همان کامیت را در پرانتز می‌گذارد. بدون decorate، برچسب `v1.4.2` را نمی‌بینید و فکر می‌کنید فقط یک هش است.

`-n` تعداد را محدود می‌کند. روی مخزن بزرگ، graph بدون حد، هم کند است و هم بی‌مصرف. `-- path` تاریخ را به فایل محدود می‌کند.

### مثال واقعی

```bash
cd /home/ops/src/app
git log --oneline --graph --decorate -n 8
```

```text
*   0ab77e1 (HEAD -> main, tag: v1.4.2, origin/main) Merge branch 'feature/billing-timeout'
|\
| * f52cc07 (origin/feature/billing-timeout) chore: log upstream latency
| * e41bb20 fix: raise billing client timeout to 8s
|/
* d09aa31 chore: bump pg client to 18
* c88d14a feat: add invoice export endpoint
* b71e902 feat: add healthz endpoint
* a3f1c0d chore: initial service layout
```

شکل کامل وقتی باید نویسنده و منطقهٔ زمانی را به شیفت نشان بدهید:

```bash
git log -1 --decorate v1.4.2
```

```text
commit 0ab77e14c5d6e7f8091a2b3c4d5e6f708192a3b4 (tag: v1.4.2, HEAD -> main, origin/main)
Merge: d09aa31 f52cc07
Author: Ops <ops@example.internal>
Date:   Wed Sep 23 16:05:41 2026 +0330

    Merge branch 'feature/billing-timeout'
```

خط `Merge:` فقط روی کامیت دو والدی هست. اگر نباشد، این شیء، کامیت ادغام `--no-ff` نیست.

### کاربرد Production

قبل از ساختن برچسب، همین graph را ببینید و مطمئن شوید `HEAD` همان merge request است، نه یک کامیت محلی که هنوز `origin/main` نشده. قبل از hotfix، `git log -1 --oneline v1.4.2` باید همان چیزی باشد که روی `app-1` اجرا می‌شود. اگر سرور checkout دارد:

```bash
sudo -u deploy git -C /opt/apps/app log -1 --oneline --decorate
```

هش باید با `v1.4.2` یکی باشد. اگر سرور فقط کانتینر است، این دستور آنجا معنی ندارد و شناسهٔ ایمیج `app:1.4.2` جای آن است.

برای جواب «این خط از کی است» مسیر را محدود کنید:

```bash
git log --oneline -- src/billing-client.js
```

این جایگزین خواندن کل تاریخ نیست. فقط همان فایل را دنبال می‌کند، از جمله اگر نام فایل در تاریخ عوض شده باشد فقط وقتی `--follow` هم بدهید.

### وقتی خراب می‌شود

`fatal: ambiguous argument 'v1.4.2': unknown revision` یعنی برچسب را fetch نکرده‌اید یا نام غلط است. `git fetch origin --tags` برای دیدن برچسب‌های ریموت است. این با `--follow-tags` که مال push است فرق دارد.

اگر graph یک خط صاف است در حالی که می‌دانید merge request ادغام شده، یا روش squash بوده، یا log را با `--first-parent` گرفته‌اید. `--first-parent` برای دیدن فقط خط `main` مفید است و فرزندان feature را مخفی می‌کند. برای بازرسی یک ویژگی آن پرچم را برندارید.

pager با `less` خروجی را نگه می‌دارد و در اسکریپت شبیه گیر کردن است. در Job از `git --no-pager log --oneline --graph --decorate -n 20` استفاده کنید. بدون `-n`، لاگ کامل یک مخزن قدیمی خروجی Job را بی‌معنی بزرگ می‌کند.

اگر نویسندهٔ همهٔ کامیت‌ها یک ایمیل است و می‌دانید چند نفر روی حساب مشترک کار کرده‌اند، لاگ برای حسابرسی بی‌ارزش شده است. این خرابی دستور log نیست. هویت سراسری روی سرور مشترک است که نباید گذاشته می‌شد.

## Best Practices

- هویت `Ops` / `ops@example.internal` را در مثال و روی لپ‌تاپ در سطح مخزن بگذارید. `--global` مال حساب مشترک سرور نیست.
- قبل از `add` و قبل از `commit` خروجی `status` را بخوانید. پیام کامیت بگوید چرا، نه فقط چه فایلی.
- `pull` را فقط با `--ff-only` عادت کنید. هر وقت باید فکر کنید، `fetch` و بعد `log` و بعد `merge`.
- شاخه را با `switch` عوض کنید. `checkout` را در اسکریپت تازه ننویسید.
- `merge --no-ff` برای ورود feature به `main`. `rebase` فقط روی feature منتشرنشده. `main` موضوع rebase نیست.
- `stash` تخته‌سیاه محلی است. تداخل pop یعنی مورد هنوز روی پشته است. hotfix را stash نکنید.
- `log --oneline --graph --decorate` را قبل از برچسب و قبل از hotfix بزنید.
- force به `main` دستور این مرجع نیست. رد شدن push روی شاخهٔ محافظت‌شده را با برداشتن محافظ جواب ندهید.
