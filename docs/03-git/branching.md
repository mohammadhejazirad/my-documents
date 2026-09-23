---
sidebar_position: 4
title: شاخه در Git
description: شاخه به‌عنوان اشاره‌گر، HEAD، ساخت شاخه از main، و ترجیح switch بر checkout.
---

# شاخه در Git

## مقدمه

شاخه (branch) کپی فایل‌ها نیست. یک نام است که به یک کامیت اشاره می‌کند. تا این جمله ملکه نشود، `switch` ترسناک می‌ماند و آدم برای «نگه داشتن کار فعلی» یک پوشهٔ دوم از پروژه می‌سازد.

در آزمایشگاه، `main` خطی است که اجازهٔ استقرار دارد، آن هم فقط بعد از برچسب. کار صورتحساب روی `feature/billing-timeout` انجام می‌شود و از نوک فعلی `main` شروع می‌شود، نه از یک کامیت قدیمی که کسی یادش مانده. ساخت خود مخزن در [مخزن](./repository.md) است و مدل اشاره‌گر در [معماری](./architecture.md).

## مفهوم اصلی

فایل `.git/refs/heads/main` فقط یک خط است: هش کامیت نوک. وقتی کامیت جدید می‌سازید، Git شیء کامیت را در پایگاه می‌نویسد و همان فایل را به هش جدید عوض می‌کند. کامیت قبلی با فیلد parent پیدا می‌شود. هیچ چیز به نام «محتوای شاخه» جدا از این زنجیره وجود ندارد.

`HEAD` می‌گوید الان کدام اشاره‌گر، اشاره‌گر جاری است. محتوای عادی‌اش این است:

```text
ref: refs/heads/main
```

این را symbolic ref می‌گویند. `git switch` این خط را عوض می‌کند و درخت کاری و index را با درخت آن کامیت یکی می‌کند. اگر تفاوت ذخیره‌نشده‌ای باشد که این جابه‌جایی پاکش می‌کند، Git متوقف می‌شود.

حالت دیگر این است که `HEAD` خودش هش باشد، بدون `ref:`. به این می‌گویند detached HEAD. با رفتن روی یک برچسب این حالت پیش می‌آید، چون برچسب با کامیت جدید جلو نمی‌رود. برای استقرار خواسته است. برای نوشتن ویژگی خواسته نیست، چون کامیت بعدی به هیچ نام شاخه‌ای وصل نیست و با یک `switch` بعدی فقط از راه reflog پیدا می‌شود.

`git checkout` قدیمی هر دو کار را با یک دستور می‌کند: عوض کردن شاخه، و برگرداندن فایل از روی index یا از روی یک کامیت. به همین دلیل `git checkout -- README.md` و `git checkout main` برای یک مبتدی شبیه هم‌اند و یکی‌شان کار ذخیره‌نشده را دور می‌ریزد. از Git 2.23 این دو نقش شکسته شده است. `git switch` فقط اشاره‌گر و درخت را عوض می‌کند. `git restore` فقط محتوای فایل را برمی‌گرداند. در Git 2.53 هر دو هستند و `checkout` هنوز حذف نشده، چون اسکریپت قدیمی زیاد است. در کار دستِ این تیم، برای شاخه فقط `switch` را می‌زنیم.

ساخت شاخه از روی `main` یعنی: اشاره‌گر تازه بساز که همین حالا به همان کامیتی اشاره کند که `main` اشاره می‌کند، و `HEAD` را به اشاره‌گر تازه منتقل کن. تاریخ کپی نمی‌شود. دو نام، یک کامیت، تا وقتی روی یکی از آن‌ها کامیت جدید بسازید.

## چرا استفاده می‌شود؟

`main` در این تیم باید همیشه قابل ساخت باشد. اگر تغییر نیمه‌کاره را مستقیم آنجا کامیت کنید، یا سرور همان نیمه‌کاره را می‌گیرد یا مجبورید کامیت را عقب بکشید. عقب کشیدن `main` همان حادثه‌ای است که محافظ شاخه باید جلویش را بگیرد.

شاخهٔ feature این دو را جدا می‌کند. شما از همان کامیتی که Production می‌شناسد شروع می‌کنید، دو یا سه کامیت محلی دارید، و تا merge request تمام نشده `main` تکان نمی‌خورد. همکارتان می‌تواند همان شاخه را fetch کند و لازم نیست پوشهٔ زیپ‌شده رد و بدل کنید.

نام شاخه قرارداد تیم است، محدودیت Git نیست. Git هر نامی را که نویسه‌های ممنوع نداشته باشد قبول می‌کند. قرارداد این فصل:

- `feature/نام-کوتاه` برای کار برنامه‌ریزی‌شده
- `hotfix/نام-کوتاه` برای تعمیر انتشار فعلی
- `main` تنها شاخهٔ بلندعمر

شاخهٔ `develop` مال گردش Git Flow است و در صفحهٔ [گردش‌کار](./workflows.md) هست. در مسیر Production این آزمایشگاه شاخهٔ بلندعمر دوم نداریم.

## Architecture

```text
قبل از شاخهٔ تازه

  HEAD  ->  refs/heads/main  ->  d09aa31
  درخت کاری با درخت d09aa31 یکی است

git switch -c feature/billing-timeout

  HEAD  ->  refs/heads/feature/billing-timeout  ->  d09aa31
  refs/heads/main                               ->  d09aa31
  هر دو نام یک کامیت‌اند

بعد از دو کامیت روی feature

  main                               ->  d09aa31
  feature/billing-timeout            ->  f52cc07
                                         parent e41bb20
                                         parent d09aa31

  origin/main                        ->  هر چه آخرین fetch دیده
  origin/feature/billing-timeout     ->  هر چه push شده باشد
```

remote-tracking branch شاخهٔ دوم شما نیست. `origin/main` را دستی کامیت نمی‌کنید. fetch آن را جابه‌جا می‌کند. اگر `git switch main` بزنید و هفت کامیت عقب باشید، درخت کاری به `main` محلی می‌رود، نه لزوماً به چیزی که همین الان روی GitLab است. اول fetch، بعد تصمیم.

پشتهٔ reflog زیر `.git/logs/HEAD` حرکت‌های `HEAD` را نگه می‌دارد، حتی کامیتی که دیگر نام شاخه ندارد. این تور نجات محلی است و به سرور push نمی‌شود. روی لپ‌تاپ همکار شما reflog شما وجود ندارد.

## Installation

ابزار تازه‌ای نصب نمی‌شود. `switch` از Git 2.23 هست و بستهٔ Ubuntu 26.04 خیلی جلوتر از آن است.

```bash
sudo apt update
sudo apt install -y git
git --version
git switch -h
```

```text
git version 2.53.0
```

اگر `git switch -h` گفت دستور نامعتبر است، باینری شما Git 2.53 نیست. `command -v git` را ببینید. گاهی یک Git قدیمی‌تر در `/usr/local/bin` جلوتر از `/usr/bin/git` است. همان را از `PATH` بردارید. نسخهٔ دوم نصب نکنید.

مخزن باید از قبل وجود داشته باشد و حداقل یک کامیت روی `main` داشته باشد. ساختنش در صفحهٔ مخزن است. بدون کامیت، شاخه هنوز unborn است و «ساختن feature از روی main» معنی ثابتی ندارد.

## Configuration

نام‌ها و رفتار push را صریح کنید تا شاخهٔ تازه بی‌صدا به `main` ریموت نرود.

```bash
cd /home/ops/src/app
git config user.name "Ops"
git config user.email "ops@example.internal"
git config push.default simple
git config --get push.default
```

`simple` پیش‌فرض Git جدید است و یعنی: فقط شاخهٔ جاری را به upstream همنامش push کن، و اگر upstream ندارد خطا بده تا مجبور شوید `-u` را آگاهانه بزنید. حالت `matching` قدیمی، هر شاخهٔ همنام را با هم می‌فرستاد و برای این تیم خطرناک است. آن را روشن نکنید.

قرارداد نام را در مخزن با یک فایل کوتاه سند کنید تا در خود Git قفل نشود. Git شاخه را از روی این فایل محدود نمی‌کند. این یادداشت برای همکار است.

```bash
mkdir -p /home/ops/src/app/docs
printf '%s\n' \
  'feature/short-name from main' \
  'hotfix/short-name from main' \
  'no long-lived develop in this lab' \
  > /home/ops/src/app/docs/branch-names.txt
```

اگر این فایل را به تاریخ اضافه می‌کنید، در همان کامیت پیام بگوید که قرارداد نام است نه رفتار برنامه. فایل را داخل `.git` نگذارید. هر چه داخل `.git` باشد با clone به شکل فایل کاری نمی‌آید.

upstream را موقع اولین push همان شاخه تنظیم کنید، نه با ویرایش دستی `.git/config`:

```bash
git push -u origin feature/billing-timeout
```

بعد از آن، `git status` می‌گوید این شاخه از `origin/feature/billing-timeout` جلوتر است یا نه. `git branch -vv` همین رابطه را برای همهٔ شاخه‌های محلی نشان می‌دهد.

## Production Example

صبح همان روزی که مهلت کلاینت صورتحساب کم است، از `main` تازه شاخه بگیرید. اگر `main` محلی کهنه باشد، شاخهٔ جدید هم کهنه است و تداخل را به آخر کار موکول کرده‌اید.

```bash
cd /home/ops/src/app
git fetch origin
git switch main
git merge --ff-only origin/main
git switch -c feature/billing-timeout
git status
git log --oneline --graph --decorate -n 5
```

`git merge --ff-only` اینجا ادغام خلاق نیست. اگر `main` محلی کامیت اضافه داشته باشد متوقف می‌شود، چون `main` محلی نباید از ریموت جلو باشد. جلو بودن `main` یعنی کسی مستقیم روی آن کامیت ساخته و این با قرار تیم نمی‌خواند.

خروجی سالم:

```text
Switched to a new branch 'feature/billing-timeout'
On branch feature/billing-timeout
nothing to commit, working tree clean
```

```text
* d09aa31 (HEAD -> feature/billing-timeout, origin/main, main) chore: bump pg client to 18
* c88d14a feat: add invoice export endpoint
* b71e902 feat: add healthz endpoint
* a3f1c0d chore: initial service layout
```

هر چهار نام، تا قبل از کامیت جدید، یک کامیت‌اند: `HEAD`، شاخهٔ تازه، `main`، و `origin/main`. این همان «اشاره‌گر» است که در نمودار بود.

حالا تغییر را فقط روی این شاخه بگذارید. جزئیات دو کامیت و ادغام در [ادغام و بازنویسی](./merge-rebase.md) است. برگشتن به `main` برای نگاه کردن، بدون دور ریختن کار:

```bash
git switch main
git switch feature/billing-timeout
```

```text
Switched to branch 'main'
Your branch is up to date with 'origin/main'.
Switched to branch 'feature/billing-timeout'
```

اگر درخت کثیف باشد، switch دوم یا اول متوقف می‌شود. آن توقف موفق است. کار را کامیت کنید یا در مرجع دستور، `stash` را با چشم باز استفاده کنید. روی سرور `app-1` این switchها را نزنید. آنجا شاخهٔ feature checkout نمی‌شود.

حذف شاخهٔ محلی بعد از اینکه merge شد و دیگر به نامش نیاز ندارید:

```bash
git switch main
git branch -d feature/billing-timeout
```

`-d` اگر شاخه در `main` ادغام نشده باشد امتناع می‌کند. این امتناع را دور نزنید. شکل اجباری حذف، کار نرفته به `main` را از فهرست شاخه‌ها پاک می‌کند و فقط تا مدتی در reflog همین لپ‌تاپ می‌ماند. در مرجع دستور، بخش `git branch` همین تفاوت را با خروجی خطا نشان می‌دهد.

## Security Notes

شاخهٔ ریموت یک مرز دسترسی نیست، مگر میزبان این مرز را بسازد. روی bare ساده، هر کسی که کلید SSH کاربر `git` را دارد می‌تواند شاخهٔ تازه push کند و اگر `denyNonFastForwards` نباشد همان را عقب هم بکشد. روی GitLab نقش‌ها این مرز را می‌سازند. Developer روی `feature/*` push می‌کند و روی `main` نه.

نام شاخه را از ورودی کاربرِ بی‌نام نسازید اگر اسکریپتی دور Git نوشته‌اید. نام می‌تواند `..` و نویسه‌های کنترلی را طوری ترکیب کند که اسکریپت ضعیف، مسیر فایل را اشتباه بخواند. خود Git نام را به‌عنوان مسیر `refs/heads` نسبتاً سخت می‌گیرد، ولی پوستهٔ دور آن اغلب نمی‌گیرد.

سرور Production کلید نوشتن روی هیچ شاخه‌ای لازم ندارد. اگر مسیر استقرار checkout است، یک کلید فقط‌خواندنی یا یک deploy token با دامنهٔ read کافی است. کلیدی که می‌تواند شاخه بسازد، اگر روی `app-1` لو برود، تاریخ تیم را هم لو داده است.

حادثه: کسی `main` را روی لپ‌تاپ rebase کرده و برای اینکه push قبول شود به force متوسل شده. اگر محافظ GitLab روشن باشد push رد می‌شود و حادثه همان‌جا تمام است. اگر bare بدون `denyNonFastForwards` باشد، نوک `main` روی سرور عوض می‌شود و بقیهٔ کلون‌ها واگرا می‌شوند. بازیابی، پیدا کردن هش قبلی از reflog یک کلون سالم است، نه تکرار force. این صفحه دستور force ندارد.

## Troubleshooting

کثیف بودن درخت، پرتکرارترین توقف است:

```text
error: Your local changes to the following files would be overwritten by checkout:
	src/billing-client.js
Please commit your changes or stash them before you switch branches.
Aborting
```

متن هنوز کلمهٔ checkout را دارد، حتی وقتی دستور شما `git switch` بوده. فایل را کامیت کنید یا تغییر را واقعاً دور بریزید. دور ریختن با `git restore` است و برگشت ندارد اگر کامیت و stash نشده باشد.

| نشانه | معنی |
| --- | --- |
| `fatal: a branch named 'feature/billing-timeout' already exists` | نام گرفته شده. `git switch` بدون `-c` همان را باز می‌کند، یا نام تازه انتخاب کنید |
| `detached HEAD` در `git status` | روی برچسب یا هش خام هستید. اگر قصد استقرار نبوده `git switch main` یا `git switch -c` تا کار جدید بی‌نام نماند |
| `main` بعد از switch عقب است | fetch نکرده‌اید. عقب‌ماندگی شاخهٔ محلی طبیعی است و با ویرایش فایل درست نمی‌شود |
| همکار شاخه را نمی‌بیند | push نشده، یا او fetch نکرده. شاخهٔ محلی تا push شیء عمومی نیست |
| `branch -d` امتناع می‌کند | کامیت‌هایی روی آن شاخه هست که از `HEAD` فعلی در دسترس نیستند. اول بررسی کنید، حذف اجباری را عادت نکنید |

اگر `git branch` شاخه را نشان می‌دهد ولی `git log` تاریخ عجیب دارد، HEAD جای دیگری است. `git branch --show-current` و خط اول `git status` را با هم بخوانید، نه فقط فهرست شاخه‌ها را.

## Best Practices

- برای عوض کردن شاخه `git switch` بزنید. `git checkout` را برای این کار در اسکریپت تازه ننویسید.
- شاخهٔ feature را از `main`ای بگیرید که همین الان با `origin/main` یکی است.
- `push.default` را `simple` نگه دارید.
- روی `app-1` بین شاخه‌ها گردش نکنید. استقرار یک برچسب است.
- `-d` را محترم بشمارید. اگر Git می‌گوید ادغام نشده، یعنی هنوز فقط روی همین لپ‌تاپ است.
- نام `feature/` و `hotfix/` را به کار کوتاه وصل کنید، نه به نام شخص. شاخهٔ شش‌ماهه دوباره یک `main` سایه می‌شود.
