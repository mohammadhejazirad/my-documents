# README_AGENT.md

نقشه عملیاتی دانشنامه داخلی DevOps. این فایل منبع حقیقت برای هر Agent بعدی است. قبل از نوشتن یا ویرایش هر صفحه، این سند را بخوان و در پایان کار چک‌لیست را به‌روز کن.

تاریخ شروع محتوا: 2026-09-23
وضعیت بستر در شروع: قالب Classic دocusaurus 3.10.2 (TypeScript) از قبل در ریپو وجود داشت.
وضعیت بعد از همین نوبت: هر ۱۴۰ صفحهٔ نقشه نوشته شده، `npm run build` بدون لینک شکسته تمام شده، فونت وزیر در خروجی بیلد است، و `html` با `lang=fa` و `dir=rtl` تولید می‌شود.

---

## Project Vision

این مخزن یک پورتال مستندات داخلی و بلندمدت برای تیم‌های فنی است؛ نه یک آموزش کوتاه و نه ترجمهٔ خشک یک دوره. لحن آن لحن یک مهندس DevOps با سابقهٔ کار در Production است که دانش را طوری می‌نویسد که همکار تازه‌وارد بتواند همان شب روی سرور واقعی اجرا کند و همکار ارشد بتواند به‌عنوان مرجع به آن برگردد.

مخاطب:

- مدیر سرور Ubuntu و Debian
- کسی که سرویس را با Nginx، Docker، دیتابیس و CI/CD به Production می‌رساند
- کسی که نیمهٔ شب باید علت Down شدن، پر شدن دیسک، یا کندی دیتابیس را پیدا کند

هدف‌های غیرقابل مذاکره:

- تمام نثر فارسی، راست‌چین، و قابل اجرا باشد.
- اصطلاح انگلیسی در اولین برخورد کنار معادل فارسی بیاید. بعد از آن همان اصطلاح انگلیسی که در دستور و لاگ دیده می‌شود حفظ شود. مثال: «سرویس (service) را با systemd مدیریت می‌کنیم».
- دستور، فایل پیکربندی، کد و خروجی ترمینال انگلیسی و چپ‌چین بمانند.
- هیچ صفحهٔ جای‌نگهدار (placeholder)، «بعداً تکمیل می‌شود»، یا خلاصهٔ چندخطی پذیرفته نیست.
- اگر موضوع بزرگ است به چند فایل شکسته شود، ولی هر فایل خودش یک فصل قابل استفاده باشد.
- نسخه‌ها اختراع نشوند. اگر نسخه در این سند نیامده، دستور باید نسخه را از منبع رسمی بخواند و همان رویه را به خواننده نشان دهد.

محیط مرجع مستندات (سپتامبر ۲۰۲۶):

| جزء | نسخهٔ مرجع | یادداشت |
| --- | --- | --- |
| Ubuntu Server | 26.04 LTS Resolute Raccoon، نقطهٔ 26.04.1 | LTS جاری. 24.04 Noble هنوز پشتیبانی می‌شود و جایی که فرق دارد باید گفته شود |
| Debian | 13 Trixie، به‌روزرسانی 13.7 | پایدار جاری. 12 Bookworm اکنون oldstable است |
| APT | deb822 در `/etc/apt/sources.list.d/ubuntu.sources` | فرمت تک‌خطی `sources.list` هنوز کار می‌کند |
| Nginx | 1.28.x از مخزن Ubuntu (بستهٔ `nginx`) | nginx.org پایدار شاخهٔ جداست؛ پیش‌فرض این دانشنامه بستهٔ Ubuntu است |
| PHP | 8.5 از مخزن Ubuntu 26.04 | سوکت را با `ls /run/php` تأیید کنید. مثال‌ها: `php8.5-fpm.sock` |
| MySQL | 8.4 LTS از مخزن Ubuntu | MariaDB 11.8 در کامپوننت main هم هست؛ فصل MySQL همان Oracle MySQL است |
| PostgreSQL | 18، کلاستر `18/main` | کاربر سیستم `postgres` |
| Redis | 8.0، بستهٔ `redis-server` در universe | Valkey 9 در main جایگزین پشتیبانی‌شدهٔ Canonical است و پروتکل Redis را حرف می‌زند. فصل Redis حذف نمی‌شود؛ تفاوت Valkey در همان فصل گفته می‌شود |
| MongoDB | Community 8.0 از `repo.mongodb.org` برای codename `resolute` | کامپوننت Ubuntu: `multiverse`. کلید: `https://www.mongodb.org/static/pgp/server-8.0.asc` |
| Docker Engine | مخزن رسمی `download.docker.com` | Compose v2 به‌صورت پلاگین `docker compose`. باینری پایتونی `docker-compose` آموزش داده نمی‌شود |
| OpenSSH | حدود 10.2 در Ubuntu 26.04 | فقط کلید `ed25519`. DSA حذف شده. `PerSourcePenalties` پیش‌فرض روشن است |
| Node.js | 24 LTS (Active LTS در سپتامبر ۲۰۲۶) | 22 هنوز در Maintenance است. نسخهٔ patch اختراع نمی‌شود |
| Certbot | بستهٔ Ubuntu: `certbot` و `python3-certbot-nginx` | تمدید با تایمر systemd |
| Prometheus | 3.13.3 (شاخهٔ LTS) | ایمیج `prom/prometheus:v3.13.3`. 3.14 آخرین انتشار است ولی پنجرهٔ پشتیبانی‌اش کوتاه است |
| Alertmanager | 0.34.1 | ایمیج `prom/alertmanager:v0.34.1` |
| Grafana | 13.2.2 | ایمیج `grafana/grafana:13.2.2` |
| Netdata | 2.11.1 | ایمیج `netdata/netdata:v2.11.1` یا اسکریپت kickstart رسمی |
| Docusaurus | 3.10.2 | Classic preset، TypeScript، React 19 |

آزمایشگاه یکسان در همهٔ فصل‌ها. آدرس و نام را عوض نکنید تا خواننده بین فصل‌ها گم نشود.

| نقش | مقدار |
| --- | --- |
| دامنهٔ عمومی نمونه | `app.example.com` |
| دامنهٔ داخلی | `example.internal` |
| پروکسی | `10.10.1.5` با نام `proxy.example.internal` |
| سرور برنامه | `10.10.1.10` با نام `app-1.example.internal` |
| سرور دیتابیس | `10.10.1.20` با نام `db-1.example.internal` |
| میزبان Docker | `10.10.1.30` با نام `docker-1.example.internal` |
| مانیتورینگ | `10.10.1.40` با نام `mon-1.example.internal` |
| GitLab | `10.10.1.50` با نام `gitlab.example.internal` |
| آینهٔ رجیستری و بسته | `10.10.1.60` با نام `mirror.example.internal` |
| کاربر انسانی مدیر | `ops` (در گروه `sudo`) |
| کاربر اجرای سرویس | `deploy` (بدون shell تعاملی وقتی نقشش فقط سرویس است: `/usr/sbin/nologin`) |
| ریشهٔ برنامه | `/opt/apps/<name>` |
| ریشهٔ بکاپ | `/var/backups` |
| شبکهٔ نمونه | `10.10.0.0/16` |
| منطقهٔ زمانی | `Asia/Tehran` |

عددهای بالا نمونهٔ آموزشی‌اند و روی اینترنت مسیریابی نمی‌شوند. در مثال عمومی که باید به اینترنت برسد فقط از `app.example.com` و مستندات RFC 2606 استفاده شود.

---

## Architecture

```text
my-docs/
├── README.md                  راهنمای اجرا برای انسان
├── README_AGENT.md            همین نقشه
├── Dockerfile                 بیلد چندمرحله‌ای سایت ایستا
├── docker-compose.yml         سرو کردن پورتال روی 8080
├── deploy/nginx.conf          کانفیگ Nginx داخل ایمیج پورتال
├── docusaurus.config.ts       عنوان، RTL، نوار، فوتر، Prism، تم
├── sidebars.ts                سایدبار خودکار از پوشهٔ docs
├── package.json
├── src/
│   ├── css/custom.css         وزیر، رنگ، فاصلهٔ خط، کد LTR
│   ├── pages/index.tsx        صفحهٔ ورود فارسی
│   └── components/HomepageFeatures
├── static/img/logo.svg
├── i18n/fa/                   ترجمهٔ رشته‌های پوسته و جستجو
└── docs/
    ├── intro.md
    ├── 01-linux/
    ├── 02-lpic/
    ├── 03-git/
    ├── 04-server-management/
    ├── 05-docker/
    ├── 06-nginx/
    ├── 07-databases/
    ├── 08-deployment/
    ├── 09-cicd/
    ├── 10-security/
    ├── 11-networking/
    ├── 12-monitoring/
    ├── 13-automation/
    ├── 14-troubleshooting/
    └── 15-portal/
```

تصمیم‌های معماری که نباید بی‌دلیل عوض شوند:

- مستندات در `/docs/...` می‌مانند. صفحهٔ اول سایت جداست و به فصل‌ها لینک می‌دهد.
- بلاگ قالب اولیه حذف و در preset خاموش است. این مخزن دانشنامه است.
- سایدبار از سیستم فایل ساخته می‌شود (`autogenerated`). ترتیب با عدد پوشه و `sidebar_position` جلوگیری از به‌هم‌ریختگی است. برچسب فارسی در `_category_.json` است.
- شناسهٔ سند همان مسیر فایل بدون پسوند است. مثال: `docs/01-linux/sudo.md` می‌شود `01-linux/sudo` و آدرس `/docs/01-linux/sudo`. در کانفیگ `numberPrefixParser: false` است تا Docusaurus پیشوند عددی پوشه را از شناسه و URL حذف نکند. این مقدار را true نکن؛ لینک‌های همه‌ٔ فصل‌ها به مسیر عددی وابسته‌اند.
- فایل `index.md` هر پوشه شناسهٔ `01-linux/index` را دارد ولی آدرس عمومی‌اش `/docs/01-linux` است، نه `/docs/01-linux/index`. لینک را به آدرس پوشه بدهید.
- زبان سایت `fa` و `direction: rtl` است. این کار `dir="rtl"` و `lang="fa"` را روی `<html>` می‌گذارد.
- فونت متن Vazirmatn (وزیرمتن) است و از بستهٔ `@fontsource/vazirmatn` خودمیزبان می‌شود تا پورتال بدون اینترنت خارجی هم حروف فارسی را درست نشان دهد. وزن‌های 400 و 500 و 700، زیرمجموعه‌های `arabic` و `latin` و `latin-ext`.
- کد و ترمینال فونت تک‌فاصلهٔ سیستم می‌مانند و همیشه `direction: ltr` هستند.
- حالت روشن و تیره هر دو فعال‌اند و `respectPrefersColorScheme` روشن است.
- رنگ‌بندی آبی نفتی سازمانی است، نه سبز پیش‌فرض قالب دایناسور.
- برجسته‌سازی Prism برای `bash`، `diff`، `json`، `nginx`، `yaml`، `ini`، `docker`، `systemd`، `sql`، `toml`، `php`، `python`، `javascript`، `markup`، `log`، `properties`، `ignore` فعال است.
- جستجو آفلاین با `@easyops-cn/docusaurus-search-local` است. Lunr استمر فارسی ندارد. پیکربندی عملی: زبان‌های `en` و `ar` (بلوک عربی حروف پ چ ژ گ را هم در بر می‌گیرد)، `removeDefaultStemmer: true` و `removeDefaultStopWordFilter: true` تا واژه‌های فارسی له نشوند و واژه‌های فنی انگلیسی حذف نشوند. این محدودیت در فصل استقرار پورتال صادقانه نوشته می‌شود.
- `onBrokenLinks` برابر `throw` است. لینک مرده بیلد را می‌شکند. لنگر شکسته فقط هشدار است.
- فایل‌ها `.md` هستند ولی Docusaurus آن‌ها را MDX پردازش می‌کند. آکولاد و تگ HTML خارج از بلوک کد صفحه را می‌شکند.

قرارداد نوشتن هر صفحه:

1. Front matter اجباری: `title`، `sidebar_position`، `description` یک‌خطی فارسی.
2. ده بخش، با همین عنوان‌ها و به همین ترتیب، مگر صفحهٔ مرجع دستور که پایین استثنا شده:
   - `## مقدمه`
   - `## مفهوم اصلی`
   - `## چرا استفاده می‌شود؟`
   - `## Architecture`
   - `## Installation`
   - `## Configuration`
   - `## Production Example`
   - `## Security Notes`
   - `## Troubleshooting`
   - `## Best Practices`
3. صفحهٔ مرجع دستور (مثل `commands-files.md`) مقدمه و Best Practices را دارد و برای هر دستور یک `##` با سه زیربخش اجباری: `### توضیح`، `### مثال واقعی`، `### کاربرد Production`. عیب‌یابی همان دستور داخل کاربرد یا یک زیربخش `### وقتی خراب می‌شود` می‌آید.
4. فصل LPIC علاوه بر ده بخش، `## تمرین` با مسئلهٔ واقعی و `## پاسخ تمرین` دارد.
5. نمودار معماری با بلوک `text` کشیده می‌شود، نه Mermaid، تا بیلد به افزونهٔ اضافه وابسته نباشد.
6. اخطارها با admonition خود Docusaurus: `note`، `tip`، `info`، `warning`، `danger`. عنوان فارسی مجاز است.
7. لینک داخلی نسبی به فایل هم‌پوشه یا مسیر مطلق سایت مثل `/docs/10-security/ufw`. به لنگر فارسی لینک ندهید.
8. خارج از بلوک کد از `{` و `}` و از تگ‌هایی که JSX حساب می‌شوند پرهیز شود. اگر مقایسهٔ پیکربندی لازم است از بلوک `diff` استفاده شود.
9. هر دستور `sudo` فقط جایی که واقعاً لازم است. بعد از نصب، سرویس با `systemctl enable --now` بالا می‌آید و وضعیتش با `systemctl status` و `ss` نشان داده می‌شود.
10. خروجی ترمینال نمونه باید شبیهِ خروجی واقعی همان دستور باشد، نه جملهٔ «خروجی نشان داده می‌شود».
11. صفحهٔ کوتاه‌تر از یک فصل واقعی تحویل داده نمی‌شود. عمق مهم است: مسیر فایل، معنی فلگ، حالت شکست، و کاری که در Production فرق دارد.

---

## Documentation Roadmap

وضعیت هر ردیف را Agent بعد از تمام شدن همان فایل در چک‌لیست پایین منعکس می‌کند. مسیرها نسبت به `docs/` هستند.

### ریشه

| فایل | عنوان | جایگاه |
| --- | --- | --- |
| `intro.md` | معرفی دانشنامه | 1 |

### 01-linux — مدیریت سرور لینوکس

مبنا Ubuntu Server 26.04 و پایهٔ Debian. هر دستور فهرست‌شده باید توضیح، مثال واقعی و کاربرد Production داشته باشد.

| فایل | موضوع | جایگاه |
| --- | --- | --- |
| `01-linux/index.md` | نقشهٔ فصل و ترتیب خواندن | 1 |
| `01-linux/ubuntu-server-installation.md` | نصب Ubuntu Server | 2 |
| `01-linux/virtual-machine.md` | ساخت VM | 3 |
| `01-linux/partitioning.md` | Partition | 4 |
| `01-linux/filesystems.md` | فایل‌سیستم | 5 |
| `01-linux/user-management.md` | کاربر و گروه | 6 |
| `01-linux/permissions.md` | Permission، شامل chmod و chown در بستر مفهوم | 7 |
| `01-linux/acl.md` | ACL | 8 |
| `01-linux/sudo.md` | sudo | 9 |
| `01-linux/systemd.md` | systemd و unit | 10 |
| `01-linux/service-management.md` | مدیریت سرویس و systemctl | 11 |
| `01-linux/journalctl.md` | journalctl | 12 |
| `01-linux/apt-package-management.md` | APT، کش، بسته | 13 |
| `01-linux/apt-repository-mirror.md` | repository، mirror، proxy | 14 |
| `01-linux/commands-files.md` | ls cd cp mv rm find | 15 |
| `01-linux/commands-text.md` | grep awk sed | 16 |
| `01-linux/commands-archive-transfer.md` | tar gzip curl wget ssh scp rsync | 17 |
| `01-linux/commands-process.md` | top htop ps kill | 18 |
| `01-linux/commands-network.md` | netstat ss | 19 |
| `01-linux/commands-disk.md` | mount df du | 20 |

### 02-lpic — دورهٔ LPIC-1 و LPIC-2

هر صفحه مثال عملی، تمرین و سناریوی Production دارد. با فصل لینوکس هم‌پوشانی مفهومی مجاز است؛ زاویهٔ LPIC باید هدف آزمون به‌علاوهٔ کار واقعی باشد، نه کپی صفحهٔ لینوکس.

| فایل | موضوع | جایگاه |
| --- | --- | --- |
| `02-lpic/index.md` | نقشهٔ 101 و 102 و 201 و 202 | 1 |
| `02-lpic/lpic1-101-architecture.md` | 101 معماری لینوکس | 2 |
| `02-lpic/lpic1-101-boot.md` | 101 بوت | 3 |
| `02-lpic/lpic1-101-gnu-commands.md` | 101 دستورهای GNU | 4 |
| `02-lpic/lpic1-101-disk.md` | 101 دیسک | 5 |
| `02-lpic/lpic1-102-shell.md` | 102 شل و Bash | 6 |
| `02-lpic/lpic1-102-networking.md` | 102 شبکه | 7 |
| `02-lpic/lpic1-102-security.md` | 102 امنیت | 8 |
| `02-lpic/lpic2-201-kernel.md` | 201 کرنل | 9 |
| `02-lpic/lpic2-201-storage.md` | 201 ذخیره‌سازی | 10 |
| `02-lpic/lpic2-201-networking.md` | 201 شبکهٔ پیشرفته | 11 |
| `02-lpic/lpic2-201-administration.md` | 201 مدیریت سیستم | 12 |
| `02-lpic/lpic2-202-web.md` | 202 سرویس وب | 13 |
| `02-lpic/lpic2-202-dns.md` | 202 DNS | 14 |
| `02-lpic/lpic2-202-mail.md` | 202 پست | 15 |
| `02-lpic/lpic2-202-security.md` | 202 امنیت | 16 |
| `02-lpic/lpic2-202-troubleshooting.md` | 202 عیب‌یابی | 17 |

### 03-git

دستورهای اجباری داخل `commands.md` با مثال: init، clone، add، commit، push، pull، fetch، branch، checkout، switch، merge، rebase، stash، log.

| فایل | موضوع | جایگاه |
| --- | --- | --- |
| `03-git/index.md` | نقشهٔ فصل | 1 |
| `03-git/architecture.md` | معماری Git | 2 |
| `03-git/repository.md` | Repository | 3 |
| `03-git/branching.md` | Branch | 4 |
| `03-git/merge-rebase.md` | Merge و Rebase | 5 |
| `03-git/tags-releases.md` | Tag و Release | 6 |
| `03-git/commands.md` | مرجع دستورها | 7 |
| `03-git/workflows.md` | Git Flow، Feature Branch، گردش Production | 8 |

### 04-server-management — ابزارهای جانبی سرور

DNS و SSL در فصل شبکه است تا یک مرجع داشته باشند. اینجا ابزارهای عملیاتی سرور است به‌علاوهٔ سی دقیقهٔ اول یک سرور تازه.

| فایل | موضوع | جایگاه |
| --- | --- | --- |
| `04-server-management/index.md` | نقشهٔ فصل | 1 |
| `04-server-management/initial-bootstrap.md` | نام میزبان، زمان، کاربر مدیر، به‌روزرسانی بی‌حضور | 2 |
| `04-server-management/ffmpeg.md` | FFmpeg | 3 |
| `04-server-management/chromium.md` | Chromium headless | 4 |
| `04-server-management/clamav.md` | ClamAV و freshclam | 5 |
| `04-server-management/safe-upgrade.md` | به‌روزرسانی بدون از دست رفتن داده | 6 |
| `04-server-management/disk-grow.md` | بزرگ کردن دیسک | 7 |
| `04-server-management/base-packages.md` | بسته‌های پایه | 8 |
| `04-server-management/swap.md` | فایل swap | 9 |
| `04-server-management/google-chrome.md` | Chrome for Testing از مخزن تیم | 10 |

### 05-docker

شامل فصل تحریم و قطع اینترنت: آینهٔ رجیستری، APT، NPM، pip، Composer، و سناریوی pull و نصب وقتی اینترنت آزاد در دسترس نیست.

| فایل | موضوع | جایگاه |
| --- | --- | --- |
| `05-docker/index.md` | نقشهٔ فصل | 1 |
| `05-docker/concepts.md` | Container، Image، Registry، Volume، Network، Layer | 2 |
| `05-docker/installation.md` | نصب روی Ubuntu و Debian | 3 |
| `05-docker/commands.md` | ps images build run exec logs volume network | 4 |
| `05-docker/dockerfile.md` | Best practice، multi-stage، امنیت | 5 |
| `05-docker/compose.md` | مدل Compose و شبکه و volume مشترک | 6 |
| `05-docker/compose-nginx.md` | نمونهٔ nginx | 7 |
| `05-docker/compose-nodejs.md` | نمونهٔ nodejs | 8 |
| `05-docker/compose-mysql.md` | نمونهٔ mysql | 9 |
| `05-docker/compose-redis.md` | نمونهٔ redis | 10 |
| `05-docker/compose-mongodb.md` | نمونهٔ mongodb | 11 |
| `05-docker/compose-postgres.md` | نمونهٔ postgres | 12 |
| `05-docker/registry-mirror.md` | Docker registry mirror | 13 |
| `05-docker/package-mirrors.md` | آینهٔ APT و NPM و pip و Composer | 14 |
| `05-docker/offline-operations.md` | کار وقتی اینترنت قطع یا محدود است | 15 |

### 06-nginx

| فایل | موضوع | جایگاه |
| --- | --- | --- |
| `06-nginx/index.md` | نقشهٔ فصل | 1 |
| `06-nginx/installation.md` | نصب | 2 |
| `06-nginx/configuration.md` | ساختار کانفیگ | 3 |
| `06-nginx/reverse-proxy.md` | Reverse proxy | 4 |
| `06-nginx/load-balancing.md` | Load balancing | 5 |
| `06-nginx/static-cache-compression.md` | فایل ثابت، cache، compression | 6 |
| `06-nginx/security-rate-limit.md` | Security header و rate limit | 7 |
| `06-nginx/nodejs.md` | پروکسی Node.js | 8 |
| `06-nginx/php-fpm.md` | PHP-FPM | 9 |
| `06-nginx/laravel.md` | Laravel | 10 |
| `06-nginx/docker.md` | Nginx جلوی کانتینر | 11 |

### 07-databases

هر موتور هم روی سرور مستقیم هم با Docker. مسیر Docker اگر در فصل 05 نمونهٔ Compose دارد، اینجا تکرار کانفیگ کامل سرویس به‌علاوهٔ عملیات دیتابیس (کاربر، بکاپ، بازیابی) است؛ به فصل 05 لینک بدهید ولی دستور اجرایی را حذف نکنید.

| فایل | موضوع | جایگاه |
| --- | --- | --- |
| `07-databases/index.md` | نقشهٔ فصل | 1 |
| `07-databases/mysql-server.md` | نصب، کانفیگ، کاربر، بهینه‌سازی | 2 |
| `07-databases/mysql-docker.md` | MySQL در Docker | 3 |
| `07-databases/mysql-backup-restore.md` | بکاپ و بازیابی | 4 |
| `07-databases/postgresql-server.md` | نصب و کانفیگ | 5 |
| `07-databases/postgresql-docker.md` | PostgreSQL در Docker | 6 |
| `07-databases/postgresql-backup-performance.md` | بکاپ و کارایی | 7 |
| `07-databases/mongodb-server.md` | نصب و امنیت | 8 |
| `07-databases/mongodb-docker.md` | MongoDB در Docker | 9 |
| `07-databases/mongodb-replica-backup.md` | Replica و بکاپ | 10 |
| `07-databases/redis-server.md` | نصب، persistence، حافظه | 11 |
| `07-databases/redis-docker.md` | Redis در Docker | 12 |

### 08-deployment

| فایل | موضوع | جایگاه |
| --- | --- | --- |
| `08-deployment/index.md` | نقشهٔ فصل | 1 |
| `08-deployment/manual-ssh.md` | مسیر دستی: SSH، clone، install، build، run | 2 |
| `08-deployment/nodejs-pm2-systemd.md` | Node.js با PM2 و systemd | 3 |
| `08-deployment/php-apache-nginx.md` | PHP با Apache و Nginx و PHP-FPM | 4 |
| `08-deployment/laravel.md` | Queue worker، Supervisor، Scheduler | 5 |
| `08-deployment/docker-production.md` | معماری Production با Docker | 6 |

### 09-cicd

سناریوی مشترک: Commit، Build، Test، Docker Build، Push، Deploy.

| فایل | موضوع | جایگاه |
| --- | --- | --- |
| `09-cicd/index.md` | نقشهٔ فصل | 1 |
| `09-cicd/github-actions.md` | Workflow، Secrets، Deploy | 2 |
| `09-cicd/gitlab-runner.md` | نصب، ثبت Runner، Pipeline | 3 |
| `09-cicd/jenkins.md` | Jenkins | 4 |
| `09-cicd/pipeline-scenario.md` | سناریوی سرهم از کامیت تا استقرار | 5 |

### 10-security

| فایل | موضوع | جایگاه |
| --- | --- | --- |
| `10-security/index.md` | نقشهٔ فصل | 1 |
| `10-security/ssh-hardening.md` | سخت‌سازی SSH | 2 |
| `10-security/ufw.md` | UFW | 3 |
| `10-security/fail2ban.md` | Fail2ban | 4 |
| `10-security/users-and-files.md` | امنیت کاربر و permission فایل | 5 |
| `10-security/kernel.md` | امنیت کرنل: sysctl | 6 |
| `10-security/backup.md` | بکاپ سرور | 7 |

### 11-networking — شبکه، DNS و SSL

| فایل | موضوع | جایگاه |
| --- | --- | --- |
| `11-networking/index.md` | نقشهٔ فصل | 1 |
| `11-networking/fundamentals.md` | آدرس، مسیر، پورت، TCP | 2 |
| `11-networking/dns-records.md` | A، AAAA، CNAME، MX، TXT | 3 |
| `11-networking/domain-binding.md` | وصل کردن دامنه به سرور | 4 |
| `11-networking/ssl-letsencrypt.md` | Let's Encrypt، Certbot، تمدید ۹۰روزه | 5 |
| `11-networking/ssl-commercial.md` | گواهی پولی: خرید، نصب، تمدید | 6 |
| `11-networking/cdn-origin.md` | دامنه پشت IP سرور | 7 |
| `11-networking/arvancloud.md` | ابرآروان | 8 |
| `11-networking/cloudflare.md` | Cloudflare | 9 |

### 12-monitoring

| فایل | موضوع | جایگاه |
| --- | --- | --- |
| `12-monitoring/index.md` | نقشهٔ فصل | 1 |
| `12-monitoring/log-management.md` | مدیریت لاگ | 2 |
| `12-monitoring/resource-monitoring.md` | پایش منبع سرور | 3 |
| `12-monitoring/netdata.md` | Netdata | 4 |
| `12-monitoring/prometheus.md` | Prometheus و node_exporter و Alertmanager | 5 |
| `12-monitoring/grafana.md` | Grafana | 6 |

### 13-automation — Bash

اسکریپت‌ها باید واقعاً قابل اجرا باشند: `set -euo pipefail`، لاگ، قفل، و خروج غیرصفر.

| فایل | موضوع | جایگاه |
| --- | --- | --- |
| `13-automation/index.md` | نقشهٔ فصل | 1 |
| `13-automation/bash-basics.md` | مبانی Bash | 2 |
| `13-automation/variables-conditions.md` | متغیر و شرط | 3 |
| `13-automation/loops-functions-arrays.md` | حلقه، تابع، آرایه | 4 |
| `13-automation/error-handling-logging.md` | خطا و لاگ | 5 |
| `13-automation/cron.md` | Cron | 6 |
| `13-automation/script-backup.md` | اسکریپت بکاپ فایل | 7 |
| `13-automation/script-database-backup.md` | بکاپ دیتابیس | 8 |
| `13-automation/script-healthcheck.md` | سلامت سرور | 9 |
| `13-automation/script-log-cleaner.md` | پاک‌سازی لاگ | 10 |
| `13-automation/script-deploy.md` | اسکریپت استقرار | 11 |

### 14-troubleshooting

هر سناریو مرحله‌به‌مرحله است: نشانه، فرضیه، دستور مشاهده، تصمیم، اصلاح، و جلوگیری از تکرار.

| فایل | موضوع | جایگاه |
| --- | --- | --- |
| `14-troubleshooting/index.md` | نقشهٔ فصل و روش عمومی debug | 1 |
| `14-troubleshooting/server-down.md` | سرور بالا نمی‌آید | 2 |
| `14-troubleshooting/high-cpu.md` | CPU بالا | 3 |
| `14-troubleshooting/memory-leak.md` | نشت حافظه | 4 |
| `14-troubleshooting/disk-full.md` | دیسک پر | 5 |
| `14-troubleshooting/docker-crash.md` | سقوط کانتینر | 6 |
| `14-troubleshooting/database-slow.md` | دیتابیس کند | 7 |
| `14-troubleshooting/network-problem.md` | مشکل شبکه | 8 |

### 15-portal — استقرار خود دانشنامه

| فایل | موضوع | جایگاه |
| --- | --- | --- |
| `15-portal/index.md` | این پورتال چیست و چطور توسعه داده می‌شود | 1 |
| `15-portal/deployment.md` | اجرای محلی، بیلد، Docker، Nginx میزبان | 2 |

### 16-object-storage — فضای شیء S3

| فایل | موضوع | جایگاه |
| --- | --- | --- |
| `16-object-storage/index.md` | نقشهٔ فصل | 1 |
| `16-object-storage/concepts.md` | مفهوم S3 | 2 |
| `16-object-storage/minio-server.md` | MinIO روی سرور | 3 |
| `16-object-storage/minio-docker.md` | MinIO با Docker | 4 |
| `16-object-storage/managed-s3.md` | آروان، R2 و AWS | 5 |
| `16-object-storage/clients.md` | کلاینت S3 | 6 |

### 17-ansible

نسخهٔ پیش‌فرض گرهٔ کنترل بستهٔ Ubuntu 26.04 است: `ansible` حدود ۱۳.۱ با `ansible-core` ۲.۲۰.۱. سری جاری جامعه در سپتامبر ۲۰۲۶ سری ۱۴.۴ با هستهٔ ۲.۲۱.۴ است و فقط با `pipx` نصب می‌شود، نه به‌جای بستهٔ توزیع مگر تیم عمداً بخواهد. ۲.۲۲ بتا است و نوشته نمی‌شود.

| فایل | موضوع | جایگاه |
| --- | --- | --- |
| `17-ansible/index.md` | نقشهٔ فصل | 1 |
| `17-ansible/concepts.md` | مفهوم | 2 |
| `17-ansible/installation.md` | نصب | 3 |
| `17-ansible/inventory.md` | اینونتوری | 4 |
| `17-ansible/ad-hoc.md` | دستور تک‌باره | 5 |
| `17-ansible/playbooks.md` | Playbook | 6 |
| `17-ansible/variables.md` | متغیر و fact | 7 |
| `17-ansible/templates.md` | قالب و handler | 8 |
| `17-ansible/roles.md` | نقش | 9 |
| `17-ansible/vault.md` | Vault | 10 |
| `17-ansible/production.md` | Playbook تولید | 11 |
| `17-ansible/troubleshooting.md` | عیب‌یابی | 12 |

---

## Checklist

علامت `[x]` فقط وقتی مجاز است که فایل وجود دارد، بیلد لینک آن را قبول کرده، و محتوا جای‌نگهدار نیست.

```text
[x] وجود قالب Docusaurus 3.10.2
[x] تنظیم زبان فارسی و RTL
[x] فونت Vazirmatn
[x] تم روشن و تیره و رنگ سازمانی
[x] Prism و زبان‌های اضافه
[x] جستجوی محلی
[x] سایدبار خودکار و _category_.json
[x] صفحهٔ ورود فارسی
[x] حذف بلاگ و آموزش پیش‌فرض قالب
[x] Dockerfile
[x] docker-compose.yml
[x] راهنمای استقرار پورتال
[x] intro
[x] فصل Linux
[x] فصل LPIC
[x] فصل Git
[x] فصل ابزارهای سرور
[x] فصل Docker و آینهٔ تحریم
[x] فصل Nginx
[x] فصل Database
[x] فصل Deployment
[x] فصل CI/CD
[x] فصل Security
[x] فصل شبکه و DNS و SSL
[x] فصل Monitoring
[x] فصل Bash و اتوماسیون
[x] فصل Troubleshooting
[x] دامنه با ابرآروان و Cloudflare
[x] فضای ابری و MinIO
[x] Chrome for Testing و به‌روزرسانی امن سرور
[x] بیلد موفق npm run build
```

## GitHub Deployment

```text
[x] Inspect Docusaurus configuration
[x] Verify package manager
[x] Verify Node.js version
[x] Configure GitHub Pages
[x] Create CI workflow
[x] Create deployment workflow
[x] Configure dependency cache
[x] Configure Pages artifact
[x] Configure permissions
[x] Configure concurrency
[x] Add manual deployment
[x] Update .gitignore
[x] Add DEPLOYMENT.md
[x] Test local production build
[x] Push repository to GitHub
[x] Enable GitHub Pages
[x] Verify first GitHub Actions run
[x] Verify production URL
[ ] Configure custom domain (optional)
```

---

## Agent Continuation Guide

اگر این جلسه قطع شد، از همین‌جا ادامه بده.

### چه چیزی ساخته شده

قبل از ادامه، این سه فرمان را در ریشهٔ مخزن اجرا کن و به خروجی‌شان اعتماد کن، نه به حافظهٔ گفتگو:

```bash
find docs -name '*.md' -o -name '_category_.json' | sort
rg -n "^\[[ x]\]" README_AGENT.md
npm run build
```

چک‌لیست بالای همین فایل را با واقعیت دیسک یکی کن. اگر فایلی در نقشه هست و روی دیسک نیست، ساخته نشده. اگر روی دیسک هست ولی کوتاه، جای‌نگهدار، یا بدون ده بخش است، تمام‌شده حساب نکن.

### چه چیزی باقی مانده

هر ردیف `[ ]` در چک‌لیست. داخل یک فصل، هر فایلی که در جدول Roadmap هست و هنوز نوشته نشده. ترتیب پیشنهادی ادامه:

1. اگر پورتال هنوز RTL یا وزیر یا جستجو ندارد، اول بستر را تمام کن. محتوا روی بستر شکسته نوشته نمی‌شود.
2. فصل‌ها را به ترتیب شماره تمام کن. لینوکس و LPIC و Docker و دیتابیس از بقیه سنگین‌ترند؛ اگر وقت کم است همان‌ها را عمیق بنویس و فصل سبک‌تر را ناقص رها نکن، فقط دیرتر سراغش برو.
3. بعد از هر فصل `npm run build` بگیر. `onBrokenLinks: throw` جلوی لینک مرده را می‌گیرد.
4. در آخر چک‌لیست و این بخش «چه چیزی ساخته شده» را با واقعیت به‌روز کن.

### از کجا ادامه بدهد

- استاندارد نوشتن، آزمایشگاه شبکه، و جدول نسخه‌ها بالاتر در همین فایل است. صفحهٔ جدید باید همان‌ها را رعایت کند.
- فایل جدید فقط داخل پوشهٔ فصل خودش ساخته می‌شود. `sidebars.ts` را برای هر صفحه دست نزن؛ `sidebar_position` و `_category_.json` کافی است.
- شناسهٔ دسته را عوض نکن. لینک‌های بین‌فصلی به مسیرهای جدول Roadmap وابسته‌اند.
- `docusaurus.config.ts`، `src/css/custom.css` و بستهٔ فونت را فقط اگر مشکل راست‌چین، فونت، یا جستجو دیدی تغییر بده.
- بلاگ را دوباره روشن نکن.
- نسخهٔ بسته را در `package.json` بی‌دلیل بالا نبر. Docusaurus روی 3.10.2 پین شده است.

### استانداردهایی که باید رعایت شود

زبان و ظاهر:

- نثر فارسی. اصطلاح انگلیسی در پرانتز یا کنار معادل، همان‌طور که در Vision آمده.
- دستور و کانفیگ داخل fence با زبان مشخص: `bash`، `nginx`، `yaml`، `ini`، `sql`، `systemd`، `dockerfile`، `diff`، `text`.
- صفحه باید در حالت RTL خوانا بماند. جمله را با واژه‌های انگلیسی طوری نشکن که فعل فارسی گم شود.

صداقت فنی:

- Ubuntu 26.04 و Debian 13 مبنای دستور `apt` هستند. اگر دستوری فقط روی یکی کار می‌کند، همان را بگو.
- OpenSSH 10: پیشنهاد `ssh-rsa`، `diffie-hellman-group1-sha1`، یا ورود روت با رمز عبور ممنوع است.
- Docker Compose فقط دستور `docker compose` (با فاصله).
- پسورد نمونه در مثال یا `change-me` داخل فایل env است و بلافاصله گفته می‌شود که در Production باید از فایل مجوز `0600` یا secret manager بیاید. رمز واقعی و کلید خصوصی نمونه ساخته نکن.
- آینهٔ تحریم باید قابل اجرا باشد: `registry-mirrors` در `/etc/docker/daemon.json`، آینهٔ APT با deb822، رجیستری npm با `.npmrc`، pip با `pip.conf`، Composer با `composer config`. آدرس نمونه `https://mirror.example.internal` است و باید گفته شود که سازمان آدرس آینهٔ واقعی خودش را می‌گذارد. مکانیزم را کامل بنویس.
- اسکریپت Bash بدون `set -euo pipefail` قبول نیست، مگر صفحه در حال آموزش خطای عمدی باشد و همان را توضیح دهد.

شکل صفحه:

- ده عنوان بخش را حذف یا ترجمهٔ دیگر نکن. Agent بعدی با همین عنوان‌ها یکدستی را چک می‌کند.
- از «در این مقاله یاد می‌گیریم» بدون محتوای بعدی استفاده نکن.
- جدول وقتی مقایسه کوتاه است مفید است. پاراگراف وقتی باید تصمیم Production را توضیح بدهد مفید است.
- لینک به فایلی که در Roadmap نیست نساز، مگر همان لحظه فایل را هم بسازی.

بررسی قبل از اعلام تمام‌شدن:

```bash
# صفحهٔ مشکوک به کم‌حجمی
find docs -name '*.md' -print0 | xargs -0 wc -l | sort -n | head

# جای‌نگهدار
rg -n "TODO|FIXME|placeholder|لورم ایپسوم|بعداً تکمیل|به زودی" docs

# بیلد
npm run build
```

صفحهٔ زیر حدود ۱۲۰ خط که فقط عنوان ده بخش را پر کرده باشد ناقص است و باید عمیق شود. عدد خط به‌تنهایی معیار نیست؛ وجود دستور قابل اجرا، مسیر فایل، و حالت شکست معیار است.

کارهایی که Agent نباید بکند:

- بازنویسی فصل تمام‌شده فقط برای یکدست کردن لحن، مگر کاربر خواسته باشد یا بیلد شکسته باشد.
- گذاشتن Mermaid، وبلاگ، یا جستجوی ابری که بدون کلید خارجی کار نمی‌کند.
- ترجمهٔ اصطلاحات داخل خود دستور. `systemctl restart nginx` فارسی نمی‌شود.
- کامیت یا پوش، مگر کاربر صریحاً خواسته باشد.

### فرمان‌های روزمره

```bash
npm install
npm start          # توسعه روی پورت پیش‌فرض Docusaurus
npm run build
npm run serve
docker compose up --build
```

سایت کانتینری روی پورت `8080` میزبان منتشر می‌شود.

## Deployment Continuation State

Last completed task:
`npm ci` و `GITHUB_ACTIONS=true npm run build` سبز شد. خروجی `dir=rtl`، `lang=fa`، فونت Vazirmatn، `baseUrl` برابر `/my-documents/`، و `robots.txt` با نقشهٔ `https://mohammadhejazirad.github.io/my-documents/sitemap.xml` را داشت.

Next task:
اختیاری است: ruleset برای اجبار CI روی `main`، و اگر دامنهٔ واقعی آمد تنظیم Custom Domain طبق `DEPLOYMENT.md`.

Blocked tasks:
ندارد. مخزن عمومی است و Pages با منبع GitHub Actions روشن است.

Manual actions required from owner:
- اختیاری: ruleset تا merge بدون سبز شدن CI ممکن نباشد.
- اختیاری: دامنهٔ اختصاصی. تا آن روز `static/CNAME` نساز.

Production URL:
`https://mohammadhejazirad.github.io/my-documents/` زنده است. صفحهٔ اصلی، مقدمه و فصل لینوکس کد ۲۰۰ می‌دهند و `html` با `lang=fa` و `dir=rtl` است.

Repository:
`https://github.com/mohammadhejazirad/my-documents`
