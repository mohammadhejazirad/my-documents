---
title: معماری Production با Docker
sidebar_position: 6
description: "یک میزبان، شبکهٔ داخلی compose، فقط Nginx روی ۸۰ و ۴۴۳، ایمیج با تگ گیت، و برگشت به تگ قبلی."
---

# معماری Production با Docker

## مقدمه

این صفحه کل پشته را روی یک میزبان جمع می‌کند: `docker-1.example.internal` با نشانی `10.10.1.30`. Nginx، برنامه و دیتابیس هر سه کانتینر همان میزبان‌اند. فقط Nginx پورت ۸۰ و ۴۴۳ را روی میزبان منتشر می‌کند. دیتابیس پورت عمومی ندارد. برنامه هم ندارد. ایمیج برنامه با تگ گیت مشخص می‌شود، نه با `latest`. برگشت یعنی همان فایل compose به تگ قبلی اشاره کند و کانتینر برنامه از نو ساخته شود، به شرطی که آن ایمیج هنوز روی میزبان باشد.

کانفیگ کامل Nginx در [Nginx جلوی کانتینر](/docs/06-nginx/docker) است و اینجا تکرار خط‌به‌خط نمی‌شود. ساخت ایمیج در [Dockerfile فصل Docker](/docs/05-docker/dockerfile) و مدل شبکه در [compose](/docs/05-docker/compose) است. اگر اینترنت آزاد نیست، کشیدن ایمیج از [آینهٔ رجیستری](/docs/05-docker/registry-mirror) می‌آید و آدرس آینه در آزمایشگاه `mirror.example.internal` روی `10.10.1.60` است.

این معماری Swarm و چند میزبان نیست. با از دست رفتن `10.10.1.30` هم سایت می‌خوابد هم دیتابیس محلی. بکاپ را جای دیگری ببرید. این صفحه عمداً سادگی یک جعبه را انتخاب کرده و این محدودیت را پنهان نمی‌کند.

## مفهوم اصلی

شبکهٔ compose به نام `appnet` فقط کانتینرهای همین فایل را به هم وصل می‌کند. برنامه دیتابیس را با نام `db` و پورت ۳۳۰۶ داخل شبکه می‌بیند. از اینترنت آن نام وجود ندارد. کلید `ports` اگر روی سرویس `db` باشد، Docker روی رابط میزبان گوش می‌دهد و «شبکهٔ داخلی» دیگر داخلی نیست. `expose` به‌تنهایی پورت را عمومی نمی‌کند و این صفحه برای برنامه حتی `expose` را لازم نمی‌داند؛ هر سرویسی که به `appnet` وصل است به پورت بازِ کانتینر کناری می‌رسد.

تگ ایمیج برنامه همان تگی است که در گیت برای آن انتشار زده‌اید. نمونهٔ این صفحه `1.8.0` است و تگ قبلی برای برگشت `1.7.2`. این عددها نسخهٔ Nginx یا MySQL نیستند. Nginx روی شاخهٔ `nginx:1.28` می‌ماند تا با بستهٔ Ubuntu هم‌نسل باشد. MySQL ایمیج `mysql:8.4` است، هم‌خوان با MySQL 8.4 LTS همین دانشنامه. هیچ‌کدام `latest` نیستند.

`docker compose up -d --no-deps app` فقط برنامه را عوض می‌کند و کانتینر دیتابیس و حجم `dbdata` را از نو نمی‌سازد. برگشت خوب، برگشتی است که داده را دست نزند. `depends_on` منتظر آماده شدن MySQL برای پذیرش اتصال نمی‌ماند. برنامه باید اتصال را دوباره امتحان کند. این را در ایمیج درست کنید، نه با منتشر کردن پورت دیتابیس «تا از لپ‌تاپ تست شود».

## چرا استفاده می‌شود؟

چند میزبان برای این آزمایشگاه هزینه و سطح حادثه را بالا می‌برد در حالی که هنوز یک نسخه از برنامه بیشتر نداریم. یک compose فایل واحد حقیقت است: چه ایمیجی، چه پورتی، چه حجمی. کسی که `docker run` دستی بزند فردا فراموش می‌کند پورت را بسته باشد.

تگ ثابت یعنی دیروز و امروز را می‌شود با چشم فرق داد. `latest` روی دو سرور دو معنا دارد و برگشت به «هر چه قبل از latest بود» دستور مشخصی ندارد. تگ `1.7.2` دستور دارد.

## Architecture

```text
اینترنت
  app.example.com → 10.10.1.30
        │
        ▼
  میزبان docker-1
  /opt/apps/web/compose.yml
        │
        ├─ nginx:1.28     پورت میزبان 80 و 443
        │       │
        │       ▼  نام app در شبکهٔ appnet
        ├─ app:1.8.0      پورت 3000 فقط داخل appnet
        │       │
        │       ▼  نام db
        └─ mysql:8.4      پورت 3306 فقط داخل appnet
              حجم dbdata

برگشت: خط ایمیج به 1.7.2 و up فقط برای سرویس app
```

اگر نام عمومی باید موقتاً هنوز به پروکسی `10.10.1.5` برسد، آن پروکسی را به `10.10.1.30:443` بفرستید و پورت را روی میزبان Docker به دنیا باز نکنید جز از همان پروکسی. پیش‌فرض این صفحه این است که خود `10.10.1.30` لبه است تا دو Nginx تو در تو نسازیم. هر دو الگو را همزمان با دو گواهی جدا برای یک نام بالا نیاورید.

## Installation

موتور و `docker compose` از فصل Docker روی میزبان هست. درخت و ورود به رجیستری آینه:

```bash
sudo mkdir -p /opt/apps/web/nginx /opt/apps/web/certs
sudo chown -R deploy:deploy /opt/apps/web
cd /opt/apps/web
docker login mirror.example.internal
```

رمز ورود رجیستری را در سند نمی‌نویسیم. گواهی در `certs/` طبق صفحهٔ Nginx کانتینر است. فایل `db.env` را با دست بسازید، حالت `0600`، و در گیت نگذارید:

```bash
umask 077
cat > /opt/apps/web/db.env <<'EOF'
MYSQL_DATABASE=app
MYSQL_USER=app
MYSQL_PASSWORD=lab-db-password
MYSQL_ROOT_PASSWORD=lab-root-password
EOF
chmod 600 /opt/apps/web/db.env
```

`lab-db-password` و `lab-root-password` فقط برای آزمایشگاه‌اند. در تولید عوضشان کنید و فایل را `0600` نگه دارید. برنامه باید همان رمز کاربر `app` را در محیط خودش داشته باشد، نه رمز ریشه. فایل جدا `app.env` با `DB_HOST=db` و `DB_PASSWORD=lab-db-password` و `PORT=3000` بسازید و در سرویس `app` با `env_file` بخوانید. رمز ریشه را در `app.env` کپی نکنید.

## Configuration

`/opt/apps/web/compose.yml`. کانفیگ Nginx همان مسیر `./nginx/nginx.conf` صفحهٔ کانتینر است و باید قبل از `up` روی دیسک باشد.

```yaml
services:
  nginx:
    image: nginx:1.28
    restart: unless-stopped
    security_opt:
      - no-new-privileges:true
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - ./nginx/nginx.conf:/etc/nginx/nginx.conf:ro
      - ./certs:/etc/nginx/certs:ro
    logging:
      driver: json-file
      options:
        max-size: "20m"
        max-file: "5"
    depends_on:
      - app
    networks:
      - appnet

  app:
    image: mirror.example.internal/team/app:1.8.0
    restart: unless-stopped
    security_opt:
      - no-new-privileges:true
    env_file:
      - ./app.env
    logging:
      driver: json-file
      options:
        max-size: "20m"
        max-file: "5"
    networks:
      - appnet

  db:
    image: mysql:8.4
    restart: unless-stopped
    security_opt:
      - no-new-privileges:true
    env_file:
      - ./db.env
    volumes:
      - dbdata:/var/lib/mysql
    logging:
      driver: json-file
      options:
        max-size: "20m"
        max-file: "5"
    networks:
      - appnet

networks:
  appnet:
    name: appnet

volumes:
  dbdata:
```

سقف لاگ جلوی پر شدن دیسک با درایور پیش‌فرض `json-file` را می‌گیرد. بدون آن، یک برنامهٔ پرگو میزبان را با لاگ Docker از پا درمی‌آورد و علامت اولش پر شدن دیسک است نه خطای برنامه.

کلید `version` در بالای فایل نیست. Compose v2 آن را نمی‌خواهد و فرمان ما `docker compose` با فاصله است، نه باینری `docker-compose`.

## Production Example

بالا آوردن:

```bash
cd /opt/apps/web
docker compose pull
docker compose up -d
docker compose ps --format '{{.Service}} {{.Ports}}'
curl -fsS -o /dev/null -w "%{http_code}\n" https://app.example.com/
```

خروجی پورت باید فقط برای `nginx` نگاشت ۸۰ و ۴۴۳ باشد. `app` و `db` ستون پورت خالی دارند. روی میزبان `ss` نباید `3306` یا `3000` را روی `0.0.0.0` نشان بدهد.

برگشت به تگ قبلی. اول مطمئن شوید ایمیج قبلی هنوز هست:

```bash
docker image ls mirror.example.internal/team/app
```

در `compose.yml` خط ایمیج برنامه را از `mirror.example.internal/team/app:1.8.0` به `mirror.example.internal/team/app:1.7.2` تغییر دهید. سپس فقط همان سرویس:

```bash
docker compose up -d --no-deps app
docker compose ps --format '{{.Service}} {{.Image}}'
curl -fsS -o /dev/null -w "%{http_code}\n" https://app.example.com/
```

`db` باید همان کانتینر قبلی بماند. `docker volume ls` نام `dbdata` را نشان می‌دهد و این حجم در برگشت حذف نمی‌شود. اگر تگ `1.7.2` در خروجی `image ls` نبود، برگشت با کشیدن مجدد همان تگ از رجیستری ممکن است، به شرطی که رجیستری آن را پاک نکرده باشد. `docker image prune -a` را جزو فرمان استقرار نگذارید.

جلو رفتن دوباره یعنی برگرداندن خط به `1.8.0` و همان `up -d --no-deps app`. تگ را در گیتِ همین فایل compose هم commit کنید تا میزبان و مخزن از هم جدا نشوند.

## Security Notes

فایل `db.env` و `app.env` در گیت نمی‌روند و حالت `0600` دارند. `docker compose config` مقدار را باز می‌کند و اگر آن خروجی را به تیکت بچسبانید، رمز آزمایشگاه را پخش کرده‌اید. در تولید رمز `lab-db-password` را عوض کنید.

دیتابیس را با `ports: "3306:3306"` برای یک گزارش لحظه‌ای باز نکنید. از `docker compose exec db mysql` روی خود میزبان استفاده کنید و نشست را ببندید. آن exec هنوز یعنی هر کس روی میزبان به گروه Docker باشد، داده را دارد. گروه `docker` معادل ریشه است. `deploy` را بی‌دلیل به آن گروه اضافه نکنید؛ `ops` با `sudo` فرمان را می‌زند.

`no-new-privileges` جلوی بالا بردن قابلیت داخل کانتینر را می‌گیرد و جای به‌روز کردن ایمیج نیست. حجم `dbdata` را به مسیر وب Nginx سوار نکنید.

اگر لبهٔ واقعی `10.10.1.5` است، فایروال `10.10.1.30` نباید ۴۴۳ را از کل اینترنت باز کند. فقط از `10.10.1.5`. وگرنه دو راه ورود و دو سیاست هدر خواهید داشت.

## Troubleshooting

کانتینر `db` در حلقهٔ restart است و لاگ می‌گوید دیتابیس initialize نمی‌شود: اغلب حجم از یک تلاش قبلی با رمز دیگری مانده است. رمز در `db.env` فقط بار اولِ حجم خالی اعمال می‌شود. یا رمز را به همان مقدار اول برگردانید یا، فقط در آزمایشگاه و با قبول از دست رفتن داده، حجم را پاک کنید و دوباره بسازید. روی دادهٔ واقعی حجم را برای «رفع رمز» پاک نکنید.

برنامه بلافاصله خارج می‌شود و لاگ می‌گوید دیتابیس در دسترس نیست: `depends_on` کافی نبوده. چند ثانیه بعد `docker compose ps` را ببینید. اگر برنامه retry ندارد، ایمیج را درست کنید. پورت ۳۳۰۶ را منتشر نکنید تا retry را دور بزنید.

`manifest unknown` موقع برگشت: تگ `1.7.2` نه روی دیسک است نه در رجیستری. برگشت ممکن نیست تا آن تگ دوباره ساخته شود. برای همین prune بعد از هر استقرار ممنوع است و رجیستری آینه نباید تگ‌های چند انتشار اخیر را پاک کند.

۵۰۲ از Nginx بعد از عوض کردن فقط برنامه: اگر کانفیگ Nginx هنوز نام `app` را هنگام استارت حل می‌کند، صفحهٔ کانتینر را با متغیر و `resolver 127.0.0.11` هم‌خوان کنید. `docker compose exec nginx nginx -t` باید موفق باشد.

پورت اضافی در `ss`: `docker compose ps` همان سرویس را لو می‌دهد. کلید `ports` را بردارید و `docker compose up -d` بزنید. تا وقتی کانتینر قدیمی با همان انتشار زنده است، پورت می‌ماند.

دیسک پر شده و Docker خطا می‌دهد: `docker system df` را ببینید. لاگ json-file اگر قبل از سقف این صفحه ساخته شده، فایل کهنه را با سیاست لاگ جدید بعد از بازسازی کانتینر عوض می‌کنید. حجم `dbdata` را در این پاک‌سازی حذف نکنید.

## Best Practices

- یک میزبان، یک `compose.yml`، شبکهٔ `appnet`، حجم نام‌دار برای داده.
- فقط سرویس Nginx کلید `ports` دارد، آن هم ۸۰ و ۴۴۳.
- ایمیج برنامه تگ گیت است. `latest` را در این فایل ننویسید حتی موقتاً.
- برگشت با `--no-deps app` تا دیتابیس و حجمش دست نخورند. ایمیج قبلی را تا استقرار پایدار بعدی پاک نکنید.
- رمز در `env` با حالت `0600` بیرون از گیت. رمز ریشه را به برنامه ندهید.
- کانفیگ Nginx را از [صفحهٔ کانتینر](/docs/06-nginx/docker) بیاورید و در compose فقط سوار کنید.
