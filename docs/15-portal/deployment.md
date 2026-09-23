---
sidebar_position: 2
title: استقرار پورتال
description: اجرای محلی، بیلد ایستا، کانتینر Docker و Nginx میزبان برای خود دانشنامه.
---

# استقرار پورتال

## مقدمه

دانشنامه وقتی به کار تیم می‌آید که روی یک آدرس داخلی ثابت باشد، نه فقط روی لپ‌تاپ کسی که آخرین بار `npm start` زده است. این صفحه مسیر رساندن همین مخزن به یک سرویس است. سه حالت دارد: توسعه روی لپ‌تاپ، بیلد ایستا و `serve`، و روشی که برای شبکهٔ داخلی توصیه می‌شود یعنی کانتینر Nginx که خروجی بیلد را سرو می‌کند.

خود محتوا داخل کانتینر تولید می‌شود. سرور مقصد لازم نیست Node داشته باشد، به شرطی که ایمیج جای دیگری ساخته و به رجیستری داخلی پوش شده باشد. اگر سرور مقصد به رجیستری دسترسی دارد، فقط Docker کافی است.

## مفهوم اصلی

خروجی `npm run build` یک درخت فایل ایستا در پوشهٔ `build` است. هر صفحه HTML دارد، فونت وزیر داخل assets کپی می‌شود، و ایندکس جستجو کنار همان فایل‌ها قرار می‌گیرد. بعد از آن Node در مسیر درخواست کاربر نیست.

Dockerfile دو مرحله دارد. مرحلهٔ اول `node:22-bookworm-slim` است: وابستگی را با `npm ci` از روی `package-lock.json` نصب می‌کند و `npm run build` می‌گیرد. مرحلهٔ دوم `nginx:1.28-alpine` است و فقط `build` و فایل `deploy/nginx.conf` را برمی‌دارد. ایمیج نهایی کامپایلر و سورس Markdown را ندارد.

`docker-compose.yml` همین ایمیج را با نام `devops-docs:local` می‌سازد و پورت `8080` میزبان را به پورت `80` کانتینر وصل می‌کند. `restart: unless-stopped` یعنی بعد از ریبوت سرور، اگر کسی عمداً سرویس را خاموش نکرده باشد، کانتینر برمی‌گردد.

## چرا استفاده می‌شود؟

`npm start` سرور توسعه است. روی رفرش، حافظه بیشتر می‌گیرد، هشدار توسعه نشان می‌دهد، و با بستن نشست SSH می‌خوابد. برای آدرسی که بقیهٔ تیم بوکمارک می‌کنند مناسب نیست.

کپی کردن دستی پوشهٔ `build` روی یک Nginx هم کار می‌کند و در همین صفحه آمده است. کانتینر این کار را تکرارپذیر می‌کند: همان کانفیگ Nginx، همان نسخهٔ Node بیلد، و همان پورت، بدون اینکه بستهٔ nginx میزبان با سایت دیگری روی سرور تداخل نسخه پیدا کند. اگر سازمان اصلاً Docker روی سرور مستندات نمی‌خواهد، مسیر بیلد ایستا و Nginx میزبان پایین‌تر کامل است و به کانتینر وابسته نیست.

## Architecture

```text
نویسنده                         سرور docs.example.internal
  npm run build                     ┌────────────────────────────┐
  یا docker compose build           │ Nginx میزبان :443          │
        │                           │  گواهی docs.example.internal │
        ▼                           │  proxy_pass 127.0.0.1:8080 │
  ایمیج devops-docs:local           └─────────────┬──────────────┘
        │                                         │
        └──── docker compose up ────► کانتینر nginx:1.28-alpine
                                      فایل‌های /usr/share/nginx/html
```

اگر Nginx میزبان نمی‌خواهید و فقط داخل شبکهٔ آزمایشگاه هستید، کاربران مستقیم به `http://10.10.1.40:8080` می‌روند. برای نام `docs.example.internal` با HTTPS، Nginx میزبان یا همان پروکسی `10.10.1.5` جلوی پورت 8080 می‌نشیند. گواهی را از فصل [Let’s Encrypt](/docs/11-networking/ssl-letsencrypt) بگیرید؛ پورتال خودش گواهی صادر نمی‌کند.

## Installation

روی ماشین نویسنده یا روی سرور بیلد، مخزن را بگیرید و وابستگی را نصب کنید.

```bash
git clone <آدرس مخزن تیم> /opt/apps/devops-docs
cd /opt/apps/devops-docs
npm install
```

Node باید 22 یا جدیدتر باشد. با `node -v` ببینید. اگر سازمان Node را از باینری رسمی می‌گذارد، نسخهٔ Active LTS شاخهٔ 24 هم برای بیلد این پورتال قابل قبول است؛ چیزی که نباید استفاده شود Node قدیمی‌تر از 20 است، چون `package.json` همان را در `engines` رد می‌کند.

اجرای حالت توسعه، فقط روی لپ‌تاپ:

```bash
npm start
```

Docusaurus آدرس محلی را در ترمینال چاپ می‌کند. معمولاً `http://127.0.0.1:3000` است. این فرایند را با systemd روی سرور نگه‌دارید؛ برای آن ساخته نشده است.

بیلد و پیش‌نمایش محلی خروجی production:

```bash
npm run build
npm run serve
```

`serve` به‌طور پیش‌فرض پورت 3000 را برای محتوای پوشهٔ `build` باز می‌کند. برای بستن آن Ctrl+C کافی است.

ساخت و اجرای کانتینر از ریشهٔ مخزن:

```bash
docker compose up --build -d
docker compose ps
curl -fsS -o /dev/null -w '%{http_code}\n' http://127.0.0.1:8080/
```

کد 200 یعنی صفحهٔ ورود سرو شده است. لاگ کانتینر:

```bash
docker compose logs -f docs
```

توقف و حذف کانتینر بدون حذف ایمیج:

```bash
docker compose down
```

## Configuration

قبل از بیلدی که قرار است بقیهٔ تیم ببینند، آدرس canonical را در `docusaurus.config.ts` عوض کنید.

```ts
url: 'https://docs.example.internal',
baseUrl: '/',
```

اگر پورتال زیر یک مسیر است و نه روی ریشهٔ دامنه، `baseUrl` را به همان مسیر تنظیم کنید، مثلاً `'/devops/'`. در این حالت هم لینک داخلی Docusaurus و هم `try_files` در Nginx باید با همان پیشوند جور باشند. پیش‌فرض این مخزن ریشهٔ دامنه است و کانفیگ `deploy/nginx.conf` برای همان نوشته شده است.

کانفیگ داخل کانتینر این رفتار را دارد:

- `try_files` اول فایل، بعد پوشه، بعد نسخهٔ `.html`، و در نهایت صفحهٔ ۴۰۴ خود Docusaurus را امتحان می‌کند.
- gzip برای متن، CSS، JS و SVG روشن است.
- سه هدر امنیتی پایه گذاشته شده است: `nosniff`، `SAMEORIGIN` و `Referrer-Policy`.

این Nginx فقط HTTP روی پورت ۸۰ داخل شبکهٔ کانتینر حرف می‌زند. TLS را به پروکسی جلویی بسپارید تا گواهی یک‌جا مدیریت شود.

نمونهٔ سایت روی Nginx میزبان، جلوی کانتینری که روی `127.0.0.1:8080` گوش می‌دهد:

```nginx
server {
    listen 80;
    server_name docs.example.internal;
    return 301 https://$host$request_uri;
}

server {
    listen 443 ssl;
    http2 on;
    server_name docs.example.internal;

    ssl_certificate     /etc/letsencrypt/live/docs.example.internal/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/docs.example.internal/privkey.pem;

    location / {
        proxy_pass http://127.0.0.1:8080;
        proxy_set_header Host $host;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

اگر Docker روی آن سرور ممنوع است، به‌جای `proxy_pass` ریشه را خود پوشهٔ بیلد بگذارید. کاربر `deploy` مخزن را در `/opt/apps/devops-docs` دارد و بیلد را همان‌جا می‌گیرد:

```bash
cd /opt/apps/devops-docs
git pull
npm ci
npm run build
```

```nginx
server {
    listen 443 ssl;
    http2 on;
    server_name docs.example.internal;

    root /opt/apps/devops-docs/build;
    index index.html;

    ssl_certificate     /etc/letsencrypt/live/docs.example.internal/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/docs.example.internal/privkey.pem;

    location / {
        try_files $uri $uri/ $uri.html /404.html;
    }
}
```

بعد از هر `git pull` باید دوباره `npm ci` و `npm run build` اجرا شود. فایل Markdown به‌تنهایی روی سرور Nginx خوانده نمی‌شود. یک واحد systemd می‌تواند این را سرویس نکند، چون کار یک‌بار در هر انتشار است. اگر انتشار زیاد است، همان اسکریپت را در CI فصل [GitHub Actions](/docs/09-cicd/github-actions) الگو بگیرید: job آخر به‌جای برنامه، همین مخزن را بیلد و ایمیج را عوض کند.

برای عوض کردن ایمیج در حال اجرا:

```bash
cd /opt/apps/devops-docs
git pull
docker compose up --build -d
```

`compose` کانتینر را با ایمیج تازه جایگزین می‌کند. حجم دادهٔ کاربری ندارد؛ حالت پورتال داخل ایمیج است. وقفه به اندازهٔ چند ثانیهٔ تعویض کانتینر است.

## Production Example

فرض کنید سرور پایش `10.10.1.40` نقش میزبان دانشنامه را هم دارد و نام `docs.example.internal` به همان آدرس اشاره می‌کند. کاربر `ops` در گروه `docker` است.

```bash
ssh ops@10.10.1.40
sudo mkdir -p /opt/apps
sudo chown ops:ops /opt/apps
git clone <آدرس مخزن تیم> /opt/apps/devops-docs
cd /opt/apps/devops-docs
docker compose up --build -d
ss -ltnp | grep 8080
```

خروجی `ss` باید نشان دهد `docker-proxy` یا خود `nginx` کانتینر روی `0.0.0.0:8080` یا `*:8080` گوش می‌دهد. سپس از لپ‌تاپ:

```bash
curl -I http://10.10.1.40:8080/
```

باید `HTTP/1.1 200 OK` و `Content-Type: text/html` ببینید. بعد DNS و گواهی را وصل کنید و از آن به بعد تیم فقط `https://docs.example.internal` را باز می‌کند.

به‌روزرسانی ماه بعد:

```bash
cd /opt/apps/devops-docs
git pull
docker compose up --build -d
curl -fsS -o /dev/null -w '%{http_code}\n' http://127.0.0.1:8080/docs/intro
```

کد ۲۰۰ روی `/docs/intro` یعنی بیلد تازه صفحهٔ مقدمه را هم شامل شده است.

## Security Notes

پورتال سطح محرمانگی برابر با صریح‌ترین مثالی است که داخلش گذاشته‌اید. فرض این مخزن این است که مثال‌ها آموزشی‌اند. اگر کسی خروجی واقعی `ip a` یا فایل inventory را داخل صفحه paste کند، با خواندن دانشنامه به شبکهٔ واقعی می‌رسد. بازبینی قبل از merge همین را باید بگیرد.

پورت 8080 را روی اینترفیس عمومی اینترنت باز نگذارید. اگر سرور IP عمومی دارد، UFW فقط SSH و ۴۴۳ پروکسی را بگذارد و 8080 فقط از `127.0.0.1` در دسترس باشد. برای این کار در `docker-compose.yml` نگاشت پورت را محدود کنید:

```yaml
ports:
  - "127.0.0.1:8080:80"
```

نسخهٔ موجود در مخزن روی همهٔ اینترفیس‌ها گوش می‌دهد تا آزمایشگاه داخلی بدون پروکسی هم باز شود. روی سروری که IP عمومی دارد همان خط را به `127.0.0.1` محدود کنید.

ایمیج را از Dockerfile همین مخزن بسازید. تگ `:latest` یک Nginx یا Node ناشناس را از رجیستری عمومی به این نقش نیاورید. مرحلهٔ بیلد `npm ci` است نه `npm install`، تا نسخهٔ قفل‌شده در گیت همانی باشد که بیلد می‌شود.

## Troubleshooting

| نشانه | معنی | کار |
| --- | --- | --- |
| `docker compose` پیدا نمی‌شود | پلاگین v2 نصب نیست، یا دستور قدیمی با خط تیره زده شده | `docker compose version` را ببینید. دستور این کتاب `docker compose` با فاصله است |
| بیلد کانتینر روی `npm ci` می‌میرد | `package-lock.json` با `package.json` یکی نیست یا شبکه به رجیستری npm دسترسی ندارد | لاک را در محیط نویسنده تازه کنید و آینهٔ npm را طبق [آینهٔ بسته](/docs/05-docker/package-mirrors) به مرحلهٔ بیلد اضافه کنید |
| صفحهٔ ورود می‌آید ولی `/docs/intro` چهارصدوچهار است | بیلد قبل از وجود محتوا گرفته شده، یا حجم قدیمی است | `docker compose up --build -d` را دوباره بگیرید |
| CSS نیست و صفحه بی‌شکل است | `baseUrl` با مسیر واقعی یکی نیست | اگر سایت روی ریشه است `baseUrl` باید `'/'` باشد |
| تغییرات Markdown دیده نمی‌شود | فقط سورس عوض شده و بیلد دوباره گرفته نشده | روی سرور `git pull` به‌تنهایی کافی نیست. بیلد را تکرار کنید |
| جستجو نتیجه نمی‌دهد | ایندکس در بیلد خراب شده یا عبارت خیلی طولانی فارسی است | یک واژهٔ انگلیسی از عنوان همان صفحه را جستجو کنید. اگر آن هم نبود، بیلد را تکرار کنید |

اگر کانتینر بلافاصله خارج می‌شود:

```bash
docker compose ps -a
docker compose logs docs
```

Nginx وقتی فایل کانفیگ را نمی‌فهمد همان لحظه خارج می‌شود. `deploy/nginx.conf` را با `nginx -t` داخل یک کانتینر موقت آزمایش کنید قبل از اینکه پورت را باز کنید.

## Best Practices

- انتشار را از گیت انجام دهید، نه از کپی یک پوشهٔ ناشناس. سرور فقط `git pull` و بیلد می‌بیند.
- آدرس `url` را با دامنه‌ای که کاربر واقعاً باز می‌کند یکی نگه دارید.
- پورتال را کنار برنامهٔ محصول روی یک سرور حساس دیتابیس نگذارید. یک VM کوچک یا همان میزبان پایش کافی است.
- بعد از هر انتشار، یک URL عمیق را با curl چک کنید، نه فقط صفحهٔ اول را. شکستن یک لینک داخلی در صفحهٔ اول دیده نمی‌شود.
- حالت روشن و تیره را بعد از دست زدن به `custom.css` یک‌بار در مرورگر ببینید. تغییر متغیر CSS ممکن است کنتراست حالت تیره را خراب کند بدون اینکه بیلد خطا بدهد.
- برای آینهٔ npm و رجیستری Docker در شبکهٔ محدود، مکانیزم را از فصل Docker بردارید و در مرحلهٔ `npm ci` داخل Dockerfile استفاده کنید. راز ورود به رجیستری خصوصی را داخل مخزن ننویسید؛ از secret خود Docker Build یا از لاگین قبلی `docker login` روی سرور بیلد استفاده کنید.
