---
sidebar_position: 8
title: گردش‌کار Git
description: Git Flow، Feature Branch، و گردش Production با main محافظت‌شده، merge request، برچسب و hotfix.
---

# گردش‌کار Git

## مقدمه

دستورها به‌تنهایی نمی‌گویند چه کسی اجازه دارد `main` را جلو ببرد. گردش‌کار این قرار است. سه مدل در این صفحه هست تا اسم‌ها با هم قاطی نشوند. Git Flow یک مدل با شاخهٔ بلندعمر `develop` است. Feature Branch مدل کوتاه‌تری است که خیلی از تیم‌های کوچک واقعاً اجرا می‌کنند. گردش Production این آزمایشگاه همان Feature Branch است، با قفل‌های مشخص: `main` محافظت‌شده، یک شاخهٔ feature، merge request، برچسب روی `main`، و استقرار همان برچسب.

سرویس نمونه هنوز `app` است. انتشار سالم عصر ۲۳ سپتامبر ۲۰۲۶ برچسب `v1.4.2` و ایمیج `app:1.4.2` است. همان شب یک نقص در خروجی فاکتور دیده می‌شود و `v1.4.3` از راه hotfix می‌آید. جزئیات ادغام در [ادغام و بازنویسی](./merge-rebase.md) و جزئیات نام ایمیج در [برچسب و انتشار](./tags-releases.md) است.

## مفهوم اصلی

Git Flow پنج نوع شاخه دارد. `main` فقط انتشار است. `develop` خط یکپارچه‌سازی روزمره است. `feature/*` از `develop` جدا می‌شود و به `develop` برمی‌گردد. `release/*` از `develop` برای تثبیت یک شماره جدا می‌شود، بعد هم به `main` می‌رود و هم به `develop`، و روی `main` برچسب می‌خورد. `hotfix/*` از `main` جدا می‌شود، چون Production روی `develop` نیست، و در پایان باید به هر دو برگردد وگرنه اصلاح در انتشار بعدی گم می‌شود.

این مدل وقتی به درد می‌خورد که چند نسخهٔ پشتیبانی‌شده هم‌زمان دارید یا تیم انتشار را از توسعهٔ روزانه جدا کرده است. هزینه‌اش شاخهٔ بلندعمر دوم است. `develop` و `main` از هم فاصله می‌گیرند و هر hotfix دو ادغام می‌خواهد. برای یک سرویس که فقط یک نسخه روی `app-1` دارد، این هزینه اغلب فایده ندارد.

Feature Branch فرض دیگری دارد. `main` همیشه قابل ساخت است. شاخهٔ کار کوتاه است، از `main` می‌آید و به `main` برمی‌گردد. شاخهٔ `develop` وجود ندارد. بازبینی داخل merge request انجام می‌شود، نه با زندگی کردن روی یک شاخهٔ موازی.

گردش Production این دانشنامه Feature Branch است، به‌علاوهٔ قاعده‌هایی که Git خودش اجرا نمی‌کند و GitLab یا قرار تیم باید اجرا کند:

1. `main` محافظت شده است. push مستقیم، force، و حذف شاخه بسته است.
2. کار از شاخهٔ `feature/نام` شروع می‌شود که از `main` تازه ساخته شده.
3. ورود به `main` فقط از راه merge request است و روش ادغام، کامیت ادغام است نه squash.
4. بعد از سبز شدن pipeline، روی همان کامیت `main` برچسب annotated می‌خورد.
5. استقرار، همان برچسب است. برای Docker یعنی `app:1.4.2`. برای checkout یعنی همان کامیت در `/opt/apps/app`.

hotfix در این گردش از خود `main` ساخته می‌شود، چون `main` همان چیزی است که برچسب خورده. شاخهٔ دومی برای برگرداندن اصلاح وجود ندارد. اگر روزی Git Flow را انتخاب کردید، همان hotfix را باید به `develop` هم برسانید. در آزمایشگاه فعلی آن قدم عمداً نیست، نه اینکه فراموش شده باشد.

## چرا استفاده می‌شود؟

بدون گردش نوشته‌شده، هر مهندس یک عادت دارد. یکی روی `main` کامیت می‌کند، یکی تاریخ را خطی می‌کند و force می‌زند، یکی ایمیج `latest` را روی سرور عوض می‌کند. هر سه تا صبح حادثه‌اند و هیچ‌کدام در `git status` به‌تنهایی دیده نمی‌شوند.

یک گردش ثابت، شیفت شب را هم ممکن می‌کند. کسی که `v1.4.2` را مستقر نکرده باید بتواند از روی نام برچسب بفهمد چه چیزی روی `app-1` است و hotfix را از کجا بزند. اگر مدل، Git Flow باشد و او از `develop` شاخه بگیرد، اصلاح روی سرور نمی‌نشیند یا بدتر، روی نسخه‌ای می‌نشیند که هنوز `main` نشده.

انتخاب Feature Branch برای این آزمایشگاه به‌خاطر کوچکی سطح انتشار است: یک برنامه، یک خط `main`، یک میزبان `app-1.example.internal`. اگر بعداً `1.4` و `1.5` هر دو در رک مشتری زنده باشند، آن وقت شاخهٔ نگهداری جدا معنی دارد و باید این صفحه را با همان واقعیت عوض کنید، نه اینکه بی‌سروصدا develop بسازید.

## Architecture

```text
Git Flow

main      v1.4.0 -------------- v1.4.2 -------- v1.4.3
               \               / \             /
develop         o------o------o---o-----------o
                |\              \
feature         | o----o         \
release         |                 o----o
hotfix          |                      o از main
                                 برمی‌گردد به main و develop


Feature Branch و گردش Production این آزمایشگاه

main      o----o----o-----------o---- v1.4.2
                    \         /
feature              o---o---o
                     feature/billing-timeout
                     ورود فقط با merge request


hotfix همان شب، باز هم بدون develop

main      o---- v1.4.2 ---------------- v1.4.3
                     \                /
hotfix                o--------------o
                      hotfix/invoice-null
```

مسیر باینری و مسیر انسان را قاطی نکنید. انسان با Git حرف می‌زند. سرور ترجیحاً با رجیستری.

```text
لپ‌تاپ ops
  feature یا hotfix
        │ git push
        ▼
gitlab.example.internal     10.10.1.50
  merge request
  محافظت main
  برچسب v1.4.x روی main
        │
        ▼
GitLab Runner
  تست، ساخت ایمیج app:1.4.x
        │
        ▼
app-1.example.internal      10.10.1.10
  /opt/apps/app یا کانتینر
  فقط همان شماره
        │
        ▼
mon-1.example.internal      10.10.1.40
  اگر خطا مال همین شماره است، hotfix از همین برچسب
```

Runner در [GitLab Runner](/docs/09-cicd/gitlab-runner) نصب می‌شود. این صفحه Job را تکرار نمی‌کند. اگر Runner سبز باشد و برچسب نخورده باشد، هنوز انتشار نشده‌اید. سبز بودن تست، مجوز استقرارِ نوکِ متحرک `main` نیست.

## Installation

گردش‌کار بستهٔ جدایی ندارد. کلاینت Git روی لپ‌تاپ و دسترسی به پروژهٔ GitLab کافی است.

```bash
sudo apt update
sudo apt install -y git
git --version
```

```text
git version 2.53.0
```

هویت نویسنده را در مخزن کاری بگذارید. گردش‌کار از روی نام کامیت حسابرسی می‌شود. حساب مشترک روی سرور نباید یک `user.name` سراسری داشته باشد که همهٔ انسان‌ها با آن یکی شوند.

```bash
cd /home/ops/src/app
git config user.name "Ops"
git config user.email "ops@example.internal"
git config pull.ff only
git config merge.ff false
```

`pull.ff only` جلوی این را می‌گیرد که به‌روزرسانی `main` محلی، بی‌خبر یک کامیت ادغام بسازد. `merge.ff false` کامیت ادغام را پیش‌فرض merge می‌کند، هماهنگ با قراری که squash نمی‌کنیم.

روی GitLab، داخل پروژهٔ `ops/app` این سیاست‌ها باید روشن باشند. نام دقیق دکمه در نسخهٔ GitLab شما ممکن است جابه‌جا شده باشد. معنی را پیاده کنید و با یک push آزمایشی از حساب Developer ثابت کنید که رد می‌شود.

- شاخهٔ `main` محافظت شده است.
- push مستقیم برای Developer بسته است. ادغام برای Maintainer باز است.
- force push بسته است.
- حذف `main` بسته است.
- pipeline باید برای merge موفق باشد.

اگر به‌جای GitLab از bare در `/opt/git/app.git` استفاده می‌کنید، merge request ندارید. آن حالت برای این گردش ناقص است. bare فقط انتقال شیء است. بازبینی را جای دیگری نوشته نگه ندارید و فکر کنید معادل است. یا GitLab را برای `app` انتخاب کنید یا بپذیرید که این صفحهٔ گردش را کامل اجرا نمی‌کنید.

## Configuration

قرارداد را جایی بنویسید که با clone بیاید، نه فقط در حافظهٔ Maintainer. یک فایل کوتاه در مخزن کافی است. این فایل را Git اجرا نمی‌کند.

```text
Protected branch: main
Merge method: merge commit
Feature branch: feature/short-name taken from main
Hotfix branch: hotfix/short-name taken from main
Release: annotated tag vNUMBER on main
Deploy: the same NUMBER, image app:NUMBER
No long-lived develop branch in this lab
```

آن را در `docs/git-workflow.txt` کامیت کنید. اگر URL ریموت مسیر `/opt/git/app.git` است، merge request این صفحه را ندارید. `pull.ff` باید `only` باشد. شاخهٔ آزمایشی شخصی را به `origin` نفرستید و هیچ اسکریپتی حذف `main` را پیشنهاد نکند.

## Production Example

انتشار `v1.4.2`. از لپ‌تاپ، با `main` تازه:

```bash
cd /home/ops/src/app
git fetch origin
git switch main
git merge --ff-only origin/main
git switch -c feature/billing-timeout
```

دو کامیت این ویژگی همان‌هایی است که در صفحهٔ ادغام با عدد آمده‌اند: مهلت ۸ ثانیه، بعد لاگ تأخیر. سپس:

```bash
git push -u origin feature/billing-timeout
```

از اینجا کار در GitLab است. merge request از `feature/billing-timeout` به `main`. روش ادغام، merge commit. حداقل یک نفر غیر از نویسنده تأیید می‌کند. pipeline روی شاخه سبز است و بعد از ادغام روی `main` هم سبز است. سپس روی لپ‌تاپ Maintainer، نه روی `app-1`:

```bash
git fetch origin
git switch main
git merge --ff-only origin/main
git tag -a v1.4.2 -m "release: billing timeout 8s"
git push --follow-tags origin main
```

استقرار `app:1.4.2` است. کانتینر را [Docker در Production](/docs/08-deployment/docker-production) بالا می‌آورد. اگر هنوز ایمیج ندارید، [استقرار دستی](/docs/08-deployment/manual-ssh) فقط همین برچسب را در `/opt/apps/app` می‌گذارد. هر دو باید قبل از اعلام تمام، نسخه را نشان بدهند. نوک `main` اگر بعد از برچسب جلو رفته باشد، سرور حق ندارد آن نوک را بی‌برچسب بگیرد.

ساعت ۲۱ همان روز، فاکتور برای یک سفارش خالی خطای پردازش نداده و پاسخ ناقص داده است. `v1.4.2` روی سرور است و `main` هنوز همان برچسب است. hotfix را از همین جا بگیرید، نه از یک feature نصفه.

```bash
git fetch origin
git switch main
git merge --ff-only origin/main
git switch -c hotfix/invoice-null
```

یک کامیت، با پیام مشخص:

```text
fix: reject empty invoice payload

v1.4.2 returned a partial body when lines were empty.
app-1 saw HTTP 200 and the client stored a blank invoice.
```

```bash
git push -u origin hotfix/invoice-null
```

merge request دوم به `main`، باز هم merge commit، باز هم pipeline. بعد:

```bash
git fetch origin
git switch main
git merge --ff-only origin/main
git tag -a v1.4.3 -m "release: reject empty invoice payload"
git push --follow-tags origin main
```

ایمیج `app:1.4.3` ساخته و روی `app-1` جایگزین `app:1.4.2` می‌شود. `v1.4.2` می‌ماند تا اگر اصلاح بدتر بود، برگشت به همان شماره ممکن باشد. شاخهٔ `feature/*` که هنوز باز است باید قبل از merge request خودش، `main` جدید را بگیرد. اگر آن شاخه را کسی جز نویسنده ندارد و push نشده، rebase روی `main` مجاز است. اگر push شده و همکار دارد، `main` را داخل همان feature ادغام کنید. خود `main` را rebase نکنید.

اگر بین `v1.4.2` و hotfix کسی `main` را جلو برده باشد، hotfix را باز هم از `main` فعلی بگیرید فقط وقتی آن کامیت‌های وسط هم قرار است در `v1.4.3` باشند. اگر `main` کار ناتمام دارد، شما گردش را قبلاً شکسته‌اید. برچسب `v1.4.2` هنوز به کامیت درست اشاره می‌کند و شاخهٔ hotfix را از همان برچسب می‌سازید، بعد فقط همان را به `main` ادغام می‌کنید. کار ناتمام نباید سواری hotfix به Production برسد.

## Security Notes

محافظت `main` بخش امنیتی این گردش است، نه تزئین رابط. بدون آن، بقیهٔ قرارها توصیهٔ نوشتاری‌اند. یک‌بار با حساب Developer ثابت کنید push مستقیم رد می‌شود و نتیجه را در یادداشت تغییر GitLab نگه دارید.

force به `main` حادثه است. سناریوی واقعی: کسی برای تمیز کردن لاگ، hotfix را rebase کرده و چون push معمولی رد شده، محافظت را برداشته و تاریخ `main` را با force عوض کرده. برچسب `v1.4.2` هنوز به کامیت قبلی است، `main` دیگر همان مسیر را ندارد، و همکار بعدی `git pull` را واگرا می‌بیند. کار درست بعد از حادثه: محافظت را برگردانید، از یک کلون که reflog سالم دارد هش قبلی `main` را بردارید، و فقط از راه تصمیم Maintainer نوک را به وضعیت شناخته‌شده برسانید. این دانشنامه آن فرمان force را به‌عنوان رویه چاپ نمی‌کند، چون همان متن فردا به اسکریپت «تعمیر» کپی می‌شود.

کلید Deploy روی `app-1` نباید اجازهٔ push به `main` داشته باشد. لو رفتن کلید استقرار نباید اجازهٔ انتشار سورس تازه بدهد. خواندن ایمیج از رجیستری برای آن میزبان کافی است.

در hotfix عجله، راز را داخل پیام کامیت ننویسید. لاگ سفارش مشتری هم مال مخزن نیست. پیام باید علت فنی باشد، نه دادهٔ کاربر.

شاخهٔ feature فراموش‌شده روی ریموت گاهی توکن آزمایشی داخل تاریخ دارد. حفاظت `main` آن شاخه را خصوصی نمی‌کند. هر کسی که نقش خواندن پروژه را دارد آن را clone می‌کند. راز را به شاخهٔ «موقت» نسپارید.

## Troubleshooting

| نشانه | تفسیر در این گردش |
| --- | --- |
| push به `main` رد شد | اگر حساب Developer است، این موفقیت محافظت است. کار را به شاخهٔ feature ببرید |
| merge request هست ولی دکمهٔ ادغام خاموش است | pipeline قرمز است یا تأیید مانده. از Maintainer نخواهید محافظت را لحظه‌ای بردارد |
| سرور رفتاری دارد که روی `main` نیست | یا برچسب قدیمی است، یا کسی روی دیسک `app-1` ویرایش کرده. `git status` آنجا باید تمیز باشد. اگر کثیف است، درخت سرور منبع حقیقت نیست |
| hotfix روی `develop` رفته و سرور عوض نشده | مدل را قاطی کرده‌اید. در این آزمایشگاه `develop` خط استقرار نیست |
| دو merge request یک فایل را گرفته‌اند | دومی را بعد از ادغام اولی به‌روز کنید. حل تداخل مال نویسندهٔ دومی است |
| `git pull` روی `main` محلی واگرا شد | روی `main` محلی کامیت دارید که روی origin نیست. آن کامیت‌ها نباید آنجا باشند. با یک کلون تازه و `git fetch` ببینید مال شما هستند یا حادثهٔ بازنویسی است |

اگر شب hotfix، تست محلی سبز است و pipeline قرمز، سرور را با کپی فایل از لپ‌تاپ جلو نبرید. قرمز بودن pipeline یعنی همان چیز سبز محلی، در محیط تمیز تکرار نشده. یا تست محلی ناقص است یا Job. هر دو قابل بررسی‌اند. دور زدن Job، همان نسخهٔ بی‌نامی است که این گردش جلویش را گرفته.

## Best Practices

- یک مدل را انتخاب کنید و در مخزن بنویسید. آزمایشگاه، Feature Branch با برچسب است، نه Git Flow نصفه.
- `main` را مستقیم کامیت نکنید، حتی برای «یک خط».
- انتشار یعنی برچسب annotated و استقرار همان شماره. بین این دو نام دوم نگذارید.
- hotfix از همان چیزی جدا می‌شود که Production اجرا می‌کند، بعد با merge request به `main` برمی‌گردد.
- squash نکنید. کامیت ادغام، مرز ویژگی و مرز hotfix را در `git log` نگه می‌دارد.
- force به `main` ابزار این گردش نیست. اگر رخ داد، حادثه است و محافظ شاخه باید جلوی تکرارش را بگیرد.
