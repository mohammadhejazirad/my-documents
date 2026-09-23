---
sidebar_position: 8
title: نمونهٔ Node.js
description: سرویس HTTP حداقلی Node 24 روی پورت 3000 با Compose، healthcheck و کاربر غیر root.
---

# نمونهٔ Node.js

## مقدمه

این صفحه همان برنامهٔ کوچک [Dockerfile](./dockerfile.md) را به‌صورت سرویس Compose بالا می‌آورد. داخل کانتینر فقط یک سرور HTTP روی پورت `3000` است. روی میزبان پورت به `127.0.0.1:3000` محدود است تا از LAN مستقیم در دسترس نباشد. اگر باید پشت Nginx دیده شود، Nginx همان میزبان یا کانتینر [نمونهٔ Nginx](./compose-nginx.md) به این آدرس وصل می‌شود.

فایل‌های برنامه را این‌جا داخل متن می‌بینید تا در مخزن دانشنامه پروژهٔ جدا ساخته نشود. جای واقعی آن‌ها `/opt/apps/shop-api` روی میزبان بیلد و بعد روی `docker-1.example.internal` است.

## مفهوم اصلی

Compose برای این سرویس دو کار می‌کند که `docker run` پراکنده فراموش می‌کند: ایمیج را با `build` از همین پوشه می‌سازد و همان را با اسم `shop-api:1.0.0` نگه می‌دارد، و healthcheck را در وضعیت `docker compose ps` نشان می‌دهد. سیاست راهاندازی `unless-stopped` است.

`init: true` یک فرایند کوچک init جلوی Node می‌گذارد تا اگر روزی فرایند فرزند یتیم شد جمع شود. برای این سرور تک‌فرایند ضروری نیست، ولی هزینهٔ محسوسی ندارد و با سیگنال توقف سازگار است. `CMD` ایمیج همچنان خود `node` است.

پورت داخل کانتینر `3000` است و برنامه روی `0.0.0.0` گوش می‌دهد. آزمون سلامت از `127.0.0.1` داخل همان کانتینر زده می‌شود. این دو آدرس را در [Dockerfile](./dockerfile.md) باز کرده‌ایم. تکرار عملی‌اش این است که `curl` از میزبان به `127.0.0.1:3000` می‌رود، چون انتشار پورت loopback میزبان را به پورت کانتینر وصل کرده است.

منطقهٔ زمانی با `TZ` برابر `Asia/Tehran` است. این برنامه ساعت را چاپ نمی‌کند، ولی قرارداد آزمایشگاه برای همهٔ سرویس‌ها یکی است.

## چرا استفاده می‌شود؟

اجرای `node server.js` با systemd روی میزبان هم معتبر است. این نمونه برای وقتی است که بقیهٔ پشته در Docker است و می‌خواهید همان ایمیج `node:24-bookworm-slim` در بیلد و در اجرا یکی باشد. Node 24 را از بستهٔ تصادفی توزیع نصب نمی‌کنیم.

healthcheck جلوی این را می‌گیرد که کانتینر `Up` باشد در حالی که پورت را کسی گوش نمی‌دهد. وابستگی سرویس‌های دیگر به این API باید `condition: service_healthy` باشد، همان‌طور که در [مدل Compose](./compose.md) آمده است.

## Architecture

```text
/opt/apps/shop-api
  Dockerfile
  package.json
  package-lock.json
  server.js
  compose.yaml
        │
        ▼
ایمیج shop-api:1.0.0
  USER node
  شنود 0.0.0.0:3000
        │
        ▼
میزبان 127.0.0.1:3000
        │
        ▼
Nginx میزبان یا کانتینر edge، نه کل LAN
```

شبکهٔ `shop-api` خالی از سرویس دوم است. دیتابیس را به این شبکه اضافه نکنید تا برنامهٔ وب و پایگاه یک تور مشترک داشته باشند، مگر اینکه عمداً پورت دیتابیس را از میزبان بردارید و فقط از داخل شبکه وصل شوید. نمونه‌های دیتابیس این فصل شبکهٔ خودشان را دارند و پورت‌شان loopback است. وصل شدن از این کانتینر به `127.0.0.1:3306` میزبان از داخل شبکهٔ Docker به loopback میزبان نمی‌رسد. آن مسیر را در صفحهٔ MySQL با تونل یا با شبکهٔ مشترک توضیح داده‌ایم. این صفحه دیتابیس ندارد.

## Installation

```bash
sudo install -d -o ops -g ops -m 0755 /opt/apps/shop-api
cd /opt/apps/shop-api
```

`package.json`:

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

قفل را روی ماشینی که به رجیستری NPM دسترسی دارد بسازید و کنار همین فایل commit کنید.

```bash
npm install --package-lock-only
```

اگر این فرمان به شبکه نرسید، قفل موجود را کپی کنید. بدون `package-lock.json` بیلد باید شکست بخورد.

`server.js`:

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

Dockerfile همان فایل صفحهٔ Dockerfile است:

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

`.dockerignore` را هم از همان صفحه کپی کنید تا `.env` و `node_modules` میزبان وارد زمینه نشود.

## Configuration

`compose.yaml`:

```yaml
name: shop-api

services:
  api:
    build:
      context: .
      dockerfile: Dockerfile
    image: shop-api:1.0.0
    restart: unless-stopped
    init: true
    environment:
      NODE_ENV: production
      TZ: Asia/Tehran
    ports:
      - "127.0.0.1:3000:3000"
    networks:
      - shop-api
    healthcheck:
      test:
        - CMD
        - node
        - -e
        - "fetch('http://127.0.0.1:3000/health').then((r) => process.exit(r.ok ? 0 : 1)).catch(() => process.exit(1))"
      interval: 10s
      timeout: 3s
      retries: 3
      start_period: 15s
    logging:
      driver: json-file
      options:
        max-size: "10m"
        max-file: "5"

networks:
  shop-api:
    name: shop-api
    driver: bridge
```

healthcheck اینجا همان آزمون ایمیج است و فاصله‌اش کوتاه‌تر است تا در آزمایشگاه زودتر `healthy` را ببینید. تعریف Compose تعریف ایمیج را برای همین کانتینر بازنویسی می‌کند.

تگ ایمیج `shop-api:1.0.0` است. با هر انتشار شماره را عوض کنید. `latest` نگذارید. پایه هم `node:24-bookworm-slim` می‌ماند.

اعتبار فایل:

```bash
docker compose config
```

این فرمان بیلد را اجرا نمی‌کند. زمینهٔ `.` را نسبت به پوشهٔ فعلی حل می‌کند. پس حتماً داخل `/opt/apps/shop-api` باشید. اگر `config` مسیر Dockerfile را غلط نشان داد، هنوز `up` نکنید.

## Production Example

```bash
cd /opt/apps/shop-api
docker compose build
docker compose up -d
docker compose ps
curl -fsS http://127.0.0.1:3000/health
curl -fsS http://127.0.0.1:3000/
```

خروجی اول `ok` و خروجی دوم `shop-api` است. وضعیت باید `healthy` شود. اگر هنوز `starting` است، `start_period` را صبر کنید.

لاگ:

```bash
docker compose logs --tail 50 api
```

این برنامه در حالت عادی چیزی چاپ نمی‌کند. خالی بودن لاگ به‌تنهایی خرابی نیست. خرابی را `curl` و وضعیت سلامت می‌گویند.

بازسازی بعد از تغییر `server.js`:

```bash
docker compose build
docker compose up -d
curl -fsS http://127.0.0.1:3000/health
```

`up -d` کانتینر را با ایمیج تازه عوض می‌کند. `restart` به‌تنهایی ایمیج قدیمی را نگه می‌دارد.

اگر بیلد باید جای دیگری انجام شود و `docker-1` شبکه ندارد:

```bash
docker save -o /tmp/shop-api-1.0.0.tar shop-api:1.0.0
rsync -a --partial --progress /tmp/shop-api-1.0.0.tar ops@10.10.1.30:~/incoming/
```

روی مقصد `docker load` و بعد `up` بدون `--build`، به شرطی که تگ `shop-api:1.0.0` بعد از load وجود داشته باشد. جزئیات جمع کنترلی در [کار آفلاین](./offline-operations.md) است.

## Security Notes

پورت فقط روی `127.0.0.1` میزبان است. از `app-1` به `10.10.1.30:3000` نباید برسید. اگر رسیدید، کسی انتشار را باز کرده است. برای اینکه پروکسی `10.10.1.5` به این API برسد، یا Nginx روی خود `docker-1` به `127.0.0.1:3000` پروکسی می‌کند، یا عمداً و با دلیل، آدرس bind را به `10.10.1.30` محدود می‌کنید. پیش‌فرض این صفحه همان loopback است.

کاربر فرایند `node` است، نه root. این را Compose با `user` دوباره root نکنید.

این سرویس رمز ندارد. اگر متغیر اتصال دیتابیس اضافه کردید، مقدار را در `.env` با مجوز `0600` بگذارید و در ایمیج `ENV` نکنید. نمونهٔ رمز `change-me` است و باید قبل از استفادهٔ واقعی عوض شود. `ls -l .env` باید `-rw-------` نشان بدهد.

`docker compose config` و `docker inspect` متغیرهای `environment` را نشان می‌دهند. خروجی‌شان را در تیکت عمومی نچسبانید وقتی راز داخلشان است.

تگ پایه را به `latest` عوض نکنید. دلیل در صفحهٔ Dockerfile است.

## Troubleshooting

| نشانه | علت | کار |
| --- | --- | --- |
| `npm ci` داخل بیلد شکست می‌خورد | قفل نیست یا NPM در دسترس نیست | قفل را بیاورید یا آینهٔ NPM |
| `COPY failed` برای lock | `.dockerignore` زیاده‌روی کرده | فایل را از نادیده‌ها دربیاورید |
| `curl` به `127.0.0.1:3000` رد می‌شود | کانتینر نیست یا پورت جای دیگری bind شده | `docker compose ps` و `ss -ltn` |
| از میزبان دیگر timeout | این همان محدودیت loopback است | مسیر Nginx را بسازید، پورت را به روی LAN باز نکنید |
| `Up` ولی `unhealthy` | برنامه روی `127.0.0.1` داخل کانتینر گوش می‌دهد یا مسیر `/health` نیست | `docker compose exec api` و اجرای همان دستور `node` آزمون |
| `EACCES` در لاگ | جایی می‌نویسد که مال کاربر `node` نیست | این برنامه نباید بنویسد. مسیر را پیدا کنید |
| تغییر سورس دیده نمی‌شود | فقط `restart` زده‌اید | `build` و بعد `up -d` |
| `port is already allocated` | `3000` میزبان اشغال است | `ss -ltnp` |

آزمون همان healthcheck:

```bash
docker compose exec api node -e "fetch('http://127.0.0.1:3000/health').then((r) => process.exit(r.ok ? 0 : 1)).catch(() => process.exit(1))"
echo $?
```

کد `0` یعنی برنامه از دید داخل کانتینر سالم است. اگر این موفق است و از میزبان `curl` شکست می‌خورد، مشکل انتشار پورت است نه خود Node.

## Best Practices

- برنامه را در YAML ننویسید. `server.js` و Dockerfile در پوشهٔ سرویس باشند.
- پایه `node:24-bookworm-slim` و تگ حاصل `shop-api` با نسخهٔ صریح.
- پورت میزبان `127.0.0.1:3000` بماند تا وقتی یک پروکسی مشخص لازم دارد.
- healthcheck را هم در ایمیج و هم در Compose نگه دارید.
- `init: true` برای سرویس Node این فصل روشن است.
- `TZ` را `Asia/Tehran` بگذارید.
- بعد از تغییر سورس `build` و `up -d`، نه فقط `restart`.
- راز را در ایمیج و در تاریخچهٔ شل نگذارید. فایل env با `0600`.
- `docker compose config` قبل از `up`.
- وقتی شبکه قطع است از ایمیج load‌شده استفاده کنید و `--build` نزنید.
