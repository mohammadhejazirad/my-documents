---
sidebar_position: 5
title: Dockerfile
description: ایمیج چندمرحله‌ای Node 24 با کاربر غیر root، HEALTHCHECK، و ممنوعیت تگ latest.
---

# Dockerfile

## مقدمه

برنامهٔ نمونهٔ این صفحه یک سرویس HTTP کوچک روی پورت `3000` است که در [نمونهٔ Node.js](./compose-nodejs.md) با Compose بالا می‌آید. اینجا فقط ساخت ایمیج است: چه فایلی داخل زمینه برود، پایه کدام تگ باشد، فرایند با کدام کاربر اجرا شود، و سلامت را چه کسی بسنجد.

میزبان بیلد می‌تواند لپ‌تاپ اپراتور یا خود `docker-1.example.internal` باشد. ایمیج حاصل باید روی `10.10.1.30` اجرا شود. اگر هنگام بیلد رجیستری پایه یا رجیستری NPM در دسترس نیست، اول [کار آفلاین](./offline-operations.md) را ببینید. `--pull` را به امید معجزه تکرار نکنید.

فایل‌ها را در مخزن دانشنامه نسازید. جای آن‌ها روی میزبان برنامه `/opt/apps/shop-api` است. متن‌ها را از همین صفحه کپی کنید.

## مفهوم اصلی

Dockerfile دستور ساخت لایه‌هاست. هر `RUN` و هر `COPY` که فایل را عوض کند لایهٔ جدید می‌سازد و کش بیلد به ترتیب همین دستورها وابسته است. مرحله (stage) یک `FROM` تازه است. مرحلهٔ اول می‌تواند ابزار ساخت داشته باشد. مرحلهٔ آخر فقط چیزی را برمی‌دارد که برای اجرا لازم است. این را بیلد چندمرحله‌ای (multi-stage) می‌گویند.

پایهٔ این صفحه `node:24-bookworm-slim` است. `24` خط Node است که در سپتامبر ۲۰۲۶ نسخهٔ Active LTS است. `bookworm` یعنی فضای کاربر Debian 12 داخل ایمیج، حتی اگر میزبان Ubuntu 26.04 Resolute یا Debian 13 Trixie باشد. `slim` یعنی ابزار اضافهٔ بیلد در خود پایه نیست. این تگ برای انسان خواناست و در فایل سرویس ثابت می‌ماند.

تگ `latest` در Production ممنوع است. `node:latest` و حتی `node:24` بدون واریانت سیستم‌عامل، اسم‌هایی هستند که صاحب ایمیج جابه‌جا می‌کند. دو میزبان در یک روز می‌توانند دو بایت متفاوت با یک اسم داشته باشند. بازگشت به عقب معنی ندارد، چون معلوم نیست «عقب» کدام digest بوده. گزارش آسیب‌پذیری را هم نمی‌شود به یک اسم متحرک سنجاق کرد. `node:24-bookworm-slim` هنوز با انتشار patch همان خط جلو می‌رود، ولی خانوادهٔ سیستم‌عامل و major را ثابت نگه می‌دارد. برای انتشاری که باید بایت‌به‌بایت همان بماند، digest را همان روز از میزبان بخوانید و کنار تگ در تیکت بنویسید. digest ساختگی این‌جا نوشته نمی‌شود.

```bash
docker pull node:24-bookworm-slim
docker image inspect node:24-bookworm-slim --format '{{index .RepoDigests 0}}'
```

کاربر داخل ایمیج رسمی Node از قبل وجود دارد: `node` با شناسهٔ عددی `1000`. فرایند را با `USER node` اجرا می‌کنیم، نه با root. پورت `3000` زیر `1024` نیست و این کاربر اجازهٔ bind آن را دارد.

راز آرگومان بیلد نیست. `ARG` برای چیزی مثل شمارهٔ نسخهٔ قابل نمایش است. اگر مقدار `ARG` در دستور `RUN` گسترش پیدا کند، `docker history` همان دستور را نشان می‌دهد. اگر `ARG` به `ENV` کپی شود، مقدار در پیکربندی ایمیج می‌ماند و هر کانتینر آن را دارد. توکن NPM و رمز دیتابیس هیچ‌کدام این مسیر را نباید طی کنند. توکن بیلد با mount نوع secret در BuildKit می‌آید و در لایه نمی‌ماند. رمز اجرا در فایل env میزبان می‌ماند، با مجوز `0600`.

## چرا استفاده می‌شود؟

`docker commit` از کانتینر زنده ایمیج می‌سازد که هیچ‌کس نمی‌تواند فردا همان را دوباره بسازد. Dockerfile همان متن را قابل بازخوانی می‌کند: پایه، کاربر، پورت، و آزمون سلامت در گیت برنامه می‌ماند.

چندمرحله‌ای بودن برای این برنامهٔ کوچک به‌خاطر حجم کامپایلر نیست. برنامه وابستگی بومی ندارد. فایده این است که کش `npm ci` به فایل قفل وابسته بماند و سورس `server.js` که زیاد عوض می‌شود نصب وابستگی را باطل نکند. همان الگو وقتی فردا یک وابستگی واقعی اضافه شود هنوز درست است.

`HEALTHCHECK` داخل ایمیج یعنی خود Engine، بدون ابزار جدا، می‌تواند وضعیت را در `docker ps` نشان بدهد. Compose می‌تواند همان آزمون را بازنویسی کند. تعریف در ایمیج جلوی حالتی را می‌گیرد که کسی کانتینر را با `docker run` تنها بالا بیاورد و هیچ آزمونی نداشته باشد.

## Architecture

```text
زمینهٔ /opt/apps/shop-api
  package.json
  package-lock.json
  server.js
  Dockerfile
  .dockerignore
        │
        ▼
مرحلهٔ deps     node:24-bookworm-slim
  npm ci --omit=dev
        │
        ▼  فقط node_modules
مرحلهٔ runtime  node:24-bookworm-slim
  USER node
  HEALTHCHECK
  CMD node server.js
        │
        ▼
ایمیج shop-api:1.0.0
  شنود 0.0.0.0:3000 داخل کانتینر
```

شنود روی `127.0.0.1` داخل کانتینر برای healthcheck کافی به نظر می‌رسد، ولی انتشار پورت میزبان به رابط اترنت کانتینر وصل است نه به loopback داخل آن. پس برنامه باید روی `0.0.0.0` و پورت `3000` گوش بدهد. آزمون سلامت از داخل کانتینر همچنان `127.0.0.1` را می‌زند، چون شنود روی همهٔ رابط‌ها loopback را هم شامل می‌شود.

## Installation

روی ماشین بیلد Engine باید مطابق [نصب](./installation.md) باشد و `docker buildx version` جواب بدهد. پوشه را `ops` می‌سازد.

```bash
sudo install -d -o ops -g ops -m 0755 /opt/apps/shop-api
cd /opt/apps/shop-api
```

`package.json` این سرویس وابستگی خارجی ندارد. سرور فقط ماژول `node:http` می‌خواهد. فایل قفل را خود `npm` می‌سازد و در گیت برنامه commit می‌شود. بدون قفل، `npm ci` داخل Dockerfile شکست می‌خورد و این شکست عمدی است: بیلد نباید نسخه را خودش حدس بزند.

```json
{
  "name": "shop-api",
  "version": "1.0.0",
  "private": true,
  "engines": {
    "node": ">=24"
  },
  "dependencies": {}
}
```

```bash
npm install --package-lock-only
```

این فرمان به رجیستری NPM وصل می‌شود حتی اگر وابستگی خالی باشد، چون npm متادیتا را چک می‌کند. وقتی اینترنت بسته است، فایل قفلی را که قبلاً ساخته شده کپی کنید و این فرمان را نزنید. شکل قفل نسخهٔ ۳ برای این بستهٔ بدون وابستگی را `npm` باید تولید کرده باشد. قفل را با دست و با hash ساختگی ننویسید.

برنامه:

```text
'use strict';

const http = require('node:http');

const port = 3000;
const host = '0.0.0.0';

const server = http.createServer((req, res) => {
  if (req.url === '/health') {
    res.writeHead(200, { 'content-type': 'text/plain' });
    res.end('ok');
    return;
  }
  res.writeHead(200, { 'content-type': 'text/plain' });
  res.end('shop-api\n');
});

server.listen(port, host);
```

`.dockerignore` زمینه را کوچک می‌کند و جلوی رفتن راز و `node_modules` ماشین بیلد به داخل زمینه را می‌گیرد. `node_modules` میزبان ممکن است مال سیستم‌عامل دیگری باشد. داخل ایمیج باید از نو نصب شود.

```text
.git
.gitignore
node_modules
npm-debug.log
Dockerfile
compose.yaml
docker-compose.yml
.env
.env.*
*.md
coverage
```

خود Dockerfile لازم نیست داخل زمینه کپی شود. نادیده گرفتنش اشکالی ندارد. `package-lock.json` و `server.js` و `package.json` را نادیده نگیرید.

## Configuration

Dockerfile کامل:

```dockerfile
FROM node:24-bookworm-slim AS deps
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci --omit=dev

FROM node:24-bookworm-slim AS runtime
WORKDIR /app
ENV NODE_ENV=production
COPY --from=deps --chown=node:node /app/node_modules ./node_modules
COPY --chown=node:node package.json server.js ./
USER node
EXPOSE 3000
HEALTHCHECK --interval=30s --timeout=3s --start-period=15s --retries=3 \
  CMD node -e "fetch('http://127.0.0.1:3000/health').then((r) => process.exit(r.ok ? 0 : 1)).catch(() => process.exit(1))"
CMD ["node", "server.js"]
```

`EXPOSE` پورت را منتشر نمی‌کند. فقط سند است. انتشار واقعی در Compose است.

`CMD` به شکل exec است تا `node` خودش فرایند شمارهٔ ۱ باشد و سیگنال توقف را بگیرد. `npm start` یک فرایند اضافه بین Engine و برنامه می‌گذارد و توقف نرم را سخت می‌کند. برای این سرویس لازم نیست.

`HEALTHCHECK` از `fetch` خود Node 24 استفاده می‌کند تا به `curl` داخل ایمیج slim وابسته نباشد. `start-period` فرصت بالا آمدن است. بعد از آن سه شکست پشت سر هم وضعیت را `unhealthy` می‌کند.

اگر روزی `npm ci` به رجیستری خصوصی با توکن نیاز داشت، توکن را `ARG` نکنید. فایل `npmrc` موقت روی میزبان، بیرون از زمینه، با مجوز `0600`:

```text
registry=https://mirror.example.internal/npm/
```

و در مرحلهٔ deps، فقط وقتی توکن واقعاً لازم است:

```dockerfile
RUN --mount=type=secret,id=npmrc,target=/root/.npmrc \
    npm ci --omit=dev
```

بیلد متناظر:

```bash
docker build \
  --secret id=npmrc,src=/opt/apps/shop-api.npmrc \
  -t shop-api:1.0.0 \
  /opt/apps/shop-api
```

فایل secret داخل لایه کپی نمی‌شود و در `docker history` مقدار توکن دیده نمی‌شود. این فایل را کنار Dockerfile داخل زمینه‌ای که `.dockerignore` پوشش نمی‌دهد رها نکنید. برای برنامهٔ بدون وابستگی این صفحه، به secret نیازی نیست و همان `RUN npm ci --omit=dev` کافی است.

این کار را نکنید:

```dockerfile
ARG NPM_TOKEN
ENV NPM_TOKEN=$NPM_TOKEN
RUN echo "token=$NPM_TOKEN" > /root/.npmrc && npm ci --omit=dev && rm /root/.npmrc
```

حتی با `rm`، مقدار در تاریخچهٔ لایه یا در `ENV` مانده است. `docker history shop-api:1.0.0` را بعد از هر بیلدی که راز دارد ببینید و اگر چیزی دیدید آن تگ را به رجیستری نفرستید.

## Production Example

روی ماشین بیلد:

```bash
cd /opt/apps/shop-api
docker build --pull -t shop-api:1.0.0 .
docker history shop-api:1.0.0
docker run --rm -d --name shop-api-test -p 127.0.0.1:3000:3000 shop-api:1.0.0
```

چند ثانیه صبر کنید تا `start-period` تمام شود، بعد:

```bash
curl -fsS http://127.0.0.1:3000/health
curl -fsS http://127.0.0.1:3000/
docker ps --filter name=shop-api-test
docker stop shop-api-test
```

خروجی سلامت باید `ok` باشد و خروجی مسیر اصلی `shop-api` با یک خط جدید. ستون وضعیت باید بعد از اولین آزمون موفق به `healthy` برسد. اگر عجله کنید و هنوز `health: starting` ببینید، شکست نیست.

برای ماندن سرویس از این `docker run` استفاده نکنید. فایل Compose در صفحهٔ Node است و `restart: unless-stopped` را آن‌جا دارد.

اگر `docker-1` خودش نباید به Hub وصل شود، ایمیج را روی ماشین متصل بسازید و منتقل کنید.

```bash
docker save -o /var/backups/images/shop-api-1.0.0.tar shop-api:1.0.0
sha256sum /var/backups/images/shop-api-1.0.0.tar > /var/backups/images/shop-api-1.0.0.tar.sha256
rsync -a --partial --progress \
  /var/backups/images/shop-api-1.0.0.tar \
  /var/backups/images/shop-api-1.0.0.tar.sha256 \
  ops@10.10.1.30:~/incoming/
```

روی `10.10.1.30` بعد از تطبیق جمع کنترلی، `docker load` مطابق [کار آفلاین](./offline-operations.md).

## Security Notes

- فرایند root داخل کانتینر، با یک فرار از محدودیت، به دسترسی میزبان نزدیک‌تر است. `USER node` پیش‌فرض این ایمیج است.
- پورت زیر `1024` با این کاربر بالا نمی‌آید. اگر کسی برنامه را به پورت `80` داخل کانتینر عوض کند، شکست می‌خورد. انتشار `8080` میزبان به `3000` کانتینر نیازی به root ندارد.
- `.env` و هر `npmrc` دارای توکن باید در `.dockerignore` باشند. یک `COPY . .` که بعداً به Dockerfile اضافه شود، فایل نادیده‌گرفته‌نشده را داخل لایه می‌گذارد.
- `docker history` را قبل از پوش به رجیستری ببینید.
- پایه را از `node:24-bookworm-slim` بگیرید که مال تصاویر رسمی Node است، نه از یک Dockerfile که از `latest` شروع می‌شود و ابزار اضافه نصب می‌کند.
- ایمیج را با کاربر `ops` بسازید. عضویت `ops` در گروه `docker` معادل root میزبان است. این خطر در [نصب](./installation.md) است و با `USER node` داخل ایمیج برطرف نمی‌شود. آن دو سطح متفاوت‌اند.

رمز دیتابیس این برنامه را ندارد. روزی که برنامه به MySQL وصل شد، رمز از محیط اجرای کانتینر می‌آید، از فایل env با مجوز `0600`، نه از `ARG` و نه از `ENV` پخته‌شده در ایمیج.

## Troubleshooting

| نشانه | معنی | کار |
| --- | --- | --- |
| `npm ci` می‌گوید lock پیدا نشد | `package-lock.json` در زمینه نیست | فایل را کنار `package.json` بگذارید و `.dockerignore` را چک کنید |
| `COPY failed` برای `server.js` | فایل نیست یا نادیده گرفته شده | `ls` زمینه |
| کشیدن `node:24-bookworm-slim` زمان تمام می‌کند | رجیستری | آینه یا `docker load` از قبل |
| کانتینر بالا است و `curl` از میزبان رد می‌شود | برنامه روی `127.0.0.1` داخل کانتینر گوش می‌دهد | `host` باید `0.0.0.0` باشد |
| `curl` از میزبان جواب دارد و وضعیت `unhealthy` است | healthcheck به آدرس غلط می‌زند یا `node` در PATH کاربر `node` نیست | دستور healthcheck را با `docker exec` همان‌طور که هست اجرا کنید |
| `EACCES` هنگام نوشتن | کاربر `node` به آن مسیر مالکیت ندارد | مسیر نوشتن را ولوم کنید و مالک را در مرحلهٔ root قبل از `USER` درست کنید. این برنامه نباید جایی بنویسد |
| پورت `80` داخل کانتینر `permission denied` | کاربر غیر root | پورت برنامه را `3000` نگه دارید |
| `docker history` توکن نشان می‌دهد | `ARG` یا `ENV` راز بوده | تگ را دور بریزید و با secret دوباره بسازید |
| بیلد هر بار `npm ci` را تکرار می‌کند | `COPY` سورس قبل از نصب بوده | ترتیب همین Dockerfile را حفظ کنید |

آزمون دستی healthcheck:

```bash
docker exec shop-api-test node -e "fetch('http://127.0.0.1:3000/health').then((r) => process.exit(r.ok ? 0 : 1)).catch(() => process.exit(1))"
echo $?
```

خروجی `0` یعنی همان آزمونی که Engine می‌زند موفق است. اگر این موفق است و `docker ps` هنوز `unhealthy` است، فاصلهٔ `interval` را صبر کنید یا تعریف healthcheck کانتینر را با `docker inspect` ببینید. شاید Compose دستور دیگری گذاشته باشد.

## Best Practices

- پایه را `node:24-bookworm-slim` پین کنید. `latest` را در `FROM` ننویسید.
- digest را از `docker image inspect` همان انتشار ثبت کنید، جعل نکنید.
- چندمرحله‌ای بمانید حتی اگر امروز `node_modules` خالی است.
- `npm ci` فقط با lockfile. داخل بیلد `npm install` آزاد نزنید.
- `.dockerignore` باید `.env` و `node_modules` و `.git` را داشته باشد.
- `USER node` قبل از `CMD`. فایل‌ها را با `--chown=node:node` کپی کنید.
- `CMD` به شکل exec و مستقیم `node`، نه `npm start`.
- برنامه روی `0.0.0.0:3000` گوش بدهد و healthcheck از `127.0.0.1` بزند.
- راز را `ARG` دائمی نکنید و به `ENV` کپی نکنید. secret موقت BuildKit یا env زمان اجرا.
- بعد از بیلد `docker history` را ببینید.
- سرویس ماندگار را با Compose بالا بیاورید، نه با یک `docker run` که سیاست restart ندارد.
