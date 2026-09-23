---
sidebar_position: 5
title: ادغام و بازنویسی
description: merge با --no-ff، نشانگر تداخل، و rebase فقط روی شاخهٔ feature که هنوز منتشر نشده.
---

# ادغام و بازنویسی

## مقدمه

دو راه برای سوار کردن کار یک شاخه روی `main` هست. ادغام (merge) یک کامیت تازه می‌سازد که دو والد دارد و تاریخ هر دو طرف را دست نمی‌زند. بازنویسی (rebase) کامیت‌های شاخه را روی پایهٔ جدید از نو می‌سازد و هش‌ها عوض می‌شوند. هر دو در Git 2.53 هستند. انتخاب، سلیقهٔ دستور نیست. انتخاب این است که آن کامیت‌ها را چه کسی دیگر دیده است.

این صفحه روی همان دو کامیت سرویس `app` می‌ایستد: `e41bb20` مهلت را به ۸ ثانیه می‌رساند و `f52cc07` تأخیر بالادست را لاگ می‌کند. `main` هم‌زمان یک کامیت گرفته است، `d09aa31`، که کلاینت PostgreSQL را جلو برده. اعداد را کوتاه می‌نویسیم. هش کامل در شیء است و در `git rev-parse` دیده می‌شود.

ساختن شاخه در [شاخه](./branching.md) است. اینکه کدام را در تیم قفل کنیم در [گردش‌کار](./workflows.md) است.

## مفهوم اصلی

ادغام fast-forward وقتی است که نوک شاخهٔ فعلی، جدّ مستقیم نوک شاخهٔ دیگر باشد. Git می‌تواند فقط اشاره‌گر را جلو بکشد و کامیت ادغام نسازد. تاریخ خطی می‌شود و دیگر معلوم نیست این دو کامیت یک ویژگی جدا بوده‌اند.

`git merge --no-ff` حتی اگر fast-forward ممکن باشد یک کامیت ادغام می‌سازد. در Git 2.53 راهبرد پیش‌فرض، `ort` است. راهبرد قدیمی `recursive` را صدا نزنید مگر به یک باگ مشخص خورده باشید. کامیت ادغام دو parent دارد. اولی شاخه‌ای است که روش ایستاده‌اید، دومی شاخه‌ای است که وارد می‌کنید.

تداخل (conflict) وقتی است که هر دو طرف یک ناحیه از یک فایل را عوض کرده‌اند و ort نمی‌تواند هر دو را نگه دارد. Git فایل را با نشانگر در درخت کاری می‌گذارد، index را برای آن مسیر در stageهای چندگانه می‌گذارد، و کامیت را تا حل تداخل نمی‌سازد. نشانگرها متن معمولی‌اند. اگر فراموششان کنید، همان متن وارد Production می‌شود و برنامه یا نمی‌خواندش یا بدتر، رشته را به کاربر نشان می‌دهد.

rebase یعنی: کامیت‌هایی که روی شاخهٔ شما هست و روی پایه نیست را، به ترتیب، روی پایهٔ تازه اعمال کن. هر اعمال، یک شیء کامیت جدید است. پیام و diff اغلب شبیه‌اند، parent و هش نه. `e41bb20` بعد از rebase دیگر وجود خارجی ندارد. چیزی به جایش هست که در این صفحه `e41bb20'` می‌نویسیم تا معلوم باشد شیء دیگری است.

بازنویسی روی شاخه‌ای که فقط روی لپ‌تاپ شماست ارزان است. بازنویسی `main` که به GitLab رفته، برچسب خورده، یا همکار از آن شاخه گرفته، هویت آن کامیت‌ها را برای بقیه دروغ می‌کند. به همین دلیل rebase روی `main` مشترک در این تیم ممنوع است. اگر شاخهٔ feature را هم یک‌بار push کرده‌اید و دیگری از آن pull کرده، همان ممنوعیت برای آن شاخه هم هست.

## چرا استفاده می‌شود؟

fast-forward خالص، `main` را خطی و کوتاه نگه می‌دارد و ویژگی را در تاریخ قایم می‌کند. برای یک اصلاح یک‌خطی گاهی قابل قبول است. برای کاری که merge request داشته، `--no-ff` بهتر است چون برمی‌گردید و می‌بینید `e41bb20` و `f52cc07` با هم وارد شده‌اند، نه اینکه بین کامیت‌های بی‌ربط `main` حل شوند.

rebase قبل از انتشار، ویژگی را روی آخرین `main` از نو می‌گذارد تا تداخل را نویسنده حل کند، نه کسی که فردا merge می‌کند. این کار را وقتی می‌کنیم که آن دو کامیت هنوز به کس دیگری داده نشده. بعد از push مشترک، به‌جای rebase، `main` را داخل feature ادغام می‌کنیم تا هش‌های منتشرشده ثابت بمانند.

هیچ‌کدام از این دو، آزمایش را اجرا نمی‌کنند. ادغام تمیز فقط یعنی متن فایل‌ها قابل ترکیب بود. تست مال pipeline است.

## Architecture

نقطهٔ شروع عددی. `main` تا `c88d14a` با feature مشترک است. بعد `main` فقط `d09aa31` را دارد. feature دو کامیت دارد.

```text
قبل

main     a3f1c0d --- b71e902 --- c88d14a --- d09aa31
                                              \
feature                                        e41bb20 --- f52cc07

بعد از git merge --no-ff feature/billing-timeout
روی main. هش e41bb20 و f52cc07 همان می‌مانند.

main     a3f1c0d --- b71e902 --- c88d14a --- d09aa31 --- 0ab77e1
                                              \           /
feature                                        e41bb20 --- f52cc07

0ab77e1  parent اول d09aa31
         parent دوم f52cc07

اگر به‌جای ادغام، feature منتشرنشده را روی main بازنویسی کنید
هش‌های feature عوض می‌شوند. main خودش بازنویسی نمی‌شود.

main     a3f1c0d --- b71e902 --- c88d14a --- d09aa31
                                                      \
feature                                                e41bb20' --- f52cc07'
```

نشانگر داخل فایل، فقط وقتی تداخل متنی باشد. مثال واقعی `src/billing-client.js` اگر هر دو طرف تابع را دست زده باشند:

```text
const timeoutMs = 8000;
<<<<<<< HEAD
const retries = 2;
=======
const retries = 5;
>>>>>>> feature/billing-timeout
```

هنگام merge، `HEAD` شاخه‌ای است که روش هستید. اگر روی `main` ایستاده باشید و feature را وارد کنید، بخش بالا مال `main` است و بخش پایین مال feature. هنگام rebase این معنی برعکس حس می‌شود: پایهٔ جدید نقش «مال ما» را می‌گیرد و کامیتی که دارد اعمال می‌شود نقش «مال آن‌ها» را. به همین دلیل `git checkout --ours` وسط rebase اغلب همان چیزی نیست که نویسنده فکر می‌کند. فایل را خودتان جمع کنید.

تا وقتی نشانگر مانده، این مسیر در `git status` با عنوان unmerged می‌آید. `git add` بعد از ویرایش یعنی «این مرحله را حل شده حساب کن»، نه «نشانگر را جادویی حذف کن». اگر نشانگر را جا بگذارید و add کنید، نشانگر وارد شیء blob می‌شود.

## Installation

همان کلاینت Git. قابلیت تازه‌ای جدا از بستهٔ `git` نیست.

```bash
sudo apt update
sudo apt install -y git
git --version
```

```text
git version 2.53.0
```

ادغام و rebase روی لپ‌تاپ `ops` انجام می‌شود. روی `/opt/apps/app` نه merge می‌زنیم و نه rebase. سرور مصرف‌کنندهٔ یک برچسب است.

هویت باید قبل از کامیت ادغام موجود باشد، چون کامیت ادغام هم نویسنده می‌خواهد:

```bash
cd /home/ops/src/app
git config user.name "Ops"
git config user.email "ops@example.internal"
```

این دو خط سراسری نیستند و روی سرور مشترک به‌جای توضیح «کی کامیت زد» یک نام قلابی نمی‌سازند. اگر پیام `Please tell me who you are` آمد، همین را در همین مخزن بگذارید و `--global` را برای حساب مشترک استفاده نکنید.

## Configuration

سیاست این مخزن را طوری بگذارید که fast-forward خاموشِ بی‌خبر، کامیت ادغام تصادفی روی `main` نسازد، و pull هم بی‌خبر rebase نکند.

```bash
cd /home/ops/src/app
git config merge.ff false
git config pull.rebase false
git config pull.ff only
git config --get merge.ff
git config --get pull.ff
```

`merge.ff false` یعنی `git merge` بدون پرچم هم `--no-ff` رفتار کند. هنوز موقع ادغام، نام شاخه را صریح می‌نویسیم تا معلوم باشد چه چیزی وارد می‌شود.

`pull.ff only` یعنی `git pull` اگر fast-forward ممکن نباشد متوقف شود. این جلوی کامیت ادغام تصادفی روی `main` محلی را می‌گیرد. rebase را به pull خودکار وصل نکنید. `pull.rebase true` روی مخزنی که گاهی شاخهٔ مشترک را باز می‌کنید، بازنویسی را به یک عادت تبدیل می‌کند.

اگر ویرایشگر پیش‌فرض سرور برای پیام کامیت ادغام `vim` است و در اسکریپت گیر می‌کنید، در اسکریپت پیام را با `-m` بدهید. روی لپ‌تاپ، باز شدن ویرایشگر برای پیام ادغام مطلوب است چون می‌شود گفت این ادغام کدام درخواست است.

ابزار گرافیکی تداخل را در این دانشنامه پیش‌فرض نمی‌کنیم. `git config merge.tool` اگر خالی باشد، نشانگر متنی تنها ابزار است و همان را باید بلد باشید. نیمه‌شب روی یک VM بدون محیط گرافیکی همان نشانگر منتظرتان است.

## Production Example

اول وضعیت را با عدد ببینید، بعد ادغام کنید. این دستورها فرض می‌کنند دو کامیت feature محلی‌اند و `main` محلی برابر `d09aa31` است.

```bash
cd /home/ops/src/app
git fetch origin
git switch main
git merge --ff-only origin/main
git log --oneline --graph --decorate main feature/billing-timeout
```

```text
* f52cc07 (feature/billing-timeout) chore: log upstream latency
* e41bb20 fix: raise billing client timeout to 8s
| * d09aa31 (HEAD -> main, origin/main) chore: bump pg client to 18
|/
* c88d14a feat: add invoice export endpoint
```

دو کامیت feature از `c88d14a` جدا شده‌اند و `main` یک کامیت دیگر دارد. ادغام با کامیت ادغام:

```bash
git merge --no-ff feature/billing-timeout -m "Merge branch 'feature/billing-timeout'"
git log --oneline --graph --decorate -n 6
```

```text
Merge made by the 'ort' strategy.
 src/billing-client.js | 6 ++++--
 1 file changed, 4 insertions(+), 2 deletions(-)
*   0ab77e1 (HEAD -> main) Merge branch 'feature/billing-timeout'
|\
| * f52cc07 (feature/billing-timeout) chore: log upstream latency
| * e41bb20 fix: raise billing client timeout to 8s
|/
* d09aa31 (origin/main) chore: bump pg client to 18
* c88d14a feat: add invoice export endpoint
```

`origin/main` هنوز روی `d09aa31` است چون push نکرده‌اید. در تیم واقعی این merge را اغلب دکمهٔ GitLab می‌سازد، نه لپ‌تاپ، تا pipeline روی همان کامیت ادغام دیده شود. نتیجهٔ شیء باید همین شکل دو والدی باشد. روش Squash در GitLab این دو کامیت را به یک کامیت تازه له می‌کند و دیگر `e41bb20` و `f52cc07` روی `main` نیستند. برای این سرویس از Squash استفاده نمی‌کنیم.

حالت rebase، فقط اگر این دو کامیت را هنوز push نکرده‌اید و می‌خواهید feature را روی `d09aa31` از نو بگذارید تا نویسنده تداخل را حل کند:

```bash
git switch feature/billing-timeout
git rebase main
git log --oneline --graph --decorate -n 6
```

```text
Successfully rebased and updated refs/heads/feature/billing-timeout.
* f52cc07' (HEAD -> feature/billing-timeout) chore: log upstream latency
* e41bb20' fix: raise billing client timeout to 8s
* d09aa31 (main, origin/main) chore: bump pg client to 18
* c88d14a feat: add invoice export endpoint
```

علامت پریم در خروجی واقعی Git چاپ نمی‌شود. هش کوتاه جدید است و پیام همان است. `git range-diff` اگر خواستید فرق دو نسل را ببینید هست. لازم نیست برای انتشار روزانه. چیزی که لازم است: این rebase را روی `main` اجرا نکنید. `git switch main` و بعد `git rebase` هر چیز دیگری، نوک خط انتشار را عوض می‌کند.

اگر وسط rebase تداخل شد، یا حل کنید و ادامه دهید یا برگردید. برگشت، تاریخ قبل از rebase را از reflog برمی‌گرداند و شیء نیمه‌کاره را رها می‌کند:

```bash
git rebase --abort
```

معادل ادغام نیمه‌کاره `git merge --abort` است. هر دو از ادامهٔ کور بهترند.

## Security Notes

rebase روی `main` مشترک ممنوع است چون هر برچسب، هر کش CI، و هر سروری که آن هش را اجرا کرده به شیء قبلی اشاره دارد. شیء جدید «همان اصلاح» نیست از نظر استقرار. حتی اگر diff یکی باشد، امضا و لاگ حادثه به هش وصل‌اند.

اگر شاخهٔ feature فقط مال شماست، هنوز push نشده، و rebase کرده‌اید، چیزی برای force وجود ندارد. اگر push شده و مطمئن هستید هیچ کلون دیگری آن را پایه نگرفته، به‌روزرسانی آن شاخهٔ feature یک استثنا است و باز هم شامل `main` نمی‌شود. این صفحه دستور force ندارد. عادت کردن به آن، هفتهٔ بعد `main` را هم هدف می‌گیرد.

حادثه: Maintainer محافظت `main` را موقتاً برداشته، تاریخ را rebase کرده و با force به `origin` فرستاده تا «لاگ تمیز شود». برچسب `v1.4.2` هنوز به `0ab77e1` اشاره می‌کند ولی `origin/main` دیگر والد آن نیست. Runner ممکن است روی نوک جدید سبز باشد در حالی که سرور برچسب قدیمی را اجرا می‌کند، یا برعکس کسی `main` را به‌جای برچسب مستقر کند. پاسخ حادثه این است که محافظت فوراً برگردد، هش قبلی از reflog یک کلون یا از ثبت حسابرسی GitLab پیدا شود، و استقرار بعدی فقط از برچسب تأییدشده باشد. تکرار force روش ترمیمِ نوشته‌شدهٔ این دانشنامه نیست.

نشانگر تداخل را مثل کامنت بی‌خطر نبینید. اگر وارد ایمیج شود، تغییر رفتار برنامه است. pipeline باید یک جستجوی ساده برای رشتهٔ نشانگر داشته باشد. آن جستجو جای حل درست تداخل را نمی‌گیرد.

امضای کامیت با `-S` وقتی کلید سازمانی دارید مفید است. کلید خصوصی نمونه در این مخزن ساخته نمی‌شود. اگر امضا را روشن کردید، نبودن کلید باید کامیت را متوقف کند، نه اینکه بی‌صدا امضا را حذف کنید.

## Troubleshooting

تداخل متنی این شکل را دارد و دستور موفق نیست:

```text
Auto-merging src/billing-client.js
CONFLICT (content): Merge conflict in src/billing-client.js
Automatic merge failed; fix conflicts and then commit the result.
```

rebase همان فایل را این‌طور متوقف می‌کند. شمارهٔ `1/2` یعنی کامیت اول از همان دو کامیت feature:

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

`git rebase --skip` آن کامیت را دور می‌اندازد. برای «رد شدن از دردسر» نزنید. مهلت ۸ ثانیه اگر skip شود، در نسل جدید تاریخ نیست و شما فکر می‌کنید rebase موفق بوده.

| نشانه | کار درست |
| --- | --- |
| `merge: feature/billing-timeout - not something we can merge` | نام شاخه غلط است یا fetch نشده. `git branch -a` |
| `fatal: refusing to merge unrelated histories` | دو init جدا را به هم وصل کرده‌اید، اغلب به‌خاطر README خودکار GitLab. تاریخ را با پرچم اجبار یکی نکنید. یکی را منبع بگیرید |
| بعد از merge، `git status` هنوز conflict دارد | یک مسیر add نشده، یا داخل فایل نشانگر مانده. `git diff` را ببینید |
| rebase تمام شد و push رد شد | شاخه قبلاً push شده بود. این همان بازنویسی منتشرشده است. اگر کس دیگری آن را دارد، rebase را abort کنید و به‌جایش merge کنید |
| فایل باینری تداخل دارد | ort متن نمی‌سازد. یکی از دو نسخه را آگاهانه انتخاب کنید. دامپ دیتابیس نباید اصلاً در مخزن باشد |

اگر ادغام را نیمه‌کاره رها کنید و سراغ شاخهٔ دیگر بروید، Git تا تمام شدن یا `--abort` اجازهٔ switch نمی‌دهد. این قفل مفید است.

## Best Practices

- روی `main` برای ویژگی‌ای که دو کامیت معنی‌دار دارد `--no-ff` بزنید.
- rebase را به شاخهٔ feature منتشرنشده محدود کنید. پایهٔ rebase می‌تواند `main` باشد. خود `main` موضوع rebase نیست.
- وسط تداخل `--ours` را از عادت نزنید، به‌خصوص وسط rebase که معنی‌اش برعکس انتظار است.
- نشانگر را قبل از `git add` از فایل حذف کنید و یک‌بار برنامه را همان‌جا اجرا کنید.
- `pull.rebase` را روی این مخزن روشن نکنید. pull اگر خطی نیست باید متوقف شود تا تصمیم بگیرید.
- Squash را برای این سرویس روش انتشار نکنید. دو کامیت باید بعد از ادغام هم قابل نامیدن باشند.
