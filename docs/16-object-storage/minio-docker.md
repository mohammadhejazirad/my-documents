---
sidebar_position: 4
title: MinIO با Docker
description: اجرای MinIO با docker compose، volume نام‌دار، پورت فقط روی localhost، و ماندن داده بعد از تعویض کانتینر.
---

# MinIO با Docker

## مقدمه

اگر میزبان از قبل Docker دارد و نمی‌خواهید دودویی را در `/usr/local/bin` بگذارید، MinIO را کانتینر کنید. API همان S3 است و برنامه فرق را نمی‌فهمد. فرق در دیسک است: داده باید روی volume بیرون از لایهٔ قابل حذف کانتینر باشد.

مسیر بدون Docker در [MinIO روی سرور](./minio-server) است. مفاهیم در [مفهوم S3](./concepts) است. اینجا فقط حالت کانتینر است.

## مفهوم اصلی

`docker rm` کانتینر را برمی‌دارد و اگر داده فقط داخل کانتینر باشد با آن می‌رود. volume نام‌دار این را جدا می‌کند. تعویض تصویر برای به‌روزرسانی، volume را پاک نمی‌کند. `docker compose down -v` پاک می‌کند. آن `-v` را در عادت روزانه نگذارید.

پورت را `127.0.0.1:9000:9000` منتشر کنید نه `9000:9000`. شکل دوم روی همهٔ کارت‌های شبکه گوش می‌دهد.

تصویر را با برچسب `latest` در تولید رها نکنید. روز استقرار، یک برچسب `RELEASE...` را از فهرست انتشار MinIO انتخاب کنید و همان را در فایل بنویسید. مثال زیر یک برچسب مشخص قدیمی‌تر است تا شکل فایل روشن باشد. اگر `docker pull` آن برچسب را پیدا نکرد، برچسب را از صفحهٔ انتشار همان روز عوض کنید. داده به برچسب تصویر بسته نیست.

## چرا استفاده می‌شود؟

تیمی که بقیهٔ سرویس‌هایش compose است، یک واحد systemd جدا برای MinIO نمی‌خواهد. به‌روزرسانی‌اش عوض کردن برچسب و `compose up -d` است. هزینه‌اش این است که بدون فهم volume، یک `down -v` تمام فایل کاربر را می‌برد. این خطر از خود MinIO نیست. از دستور Docker است.

## Architecture

```text
compose
    سرویس minio
    تصویر pin‌شده
    volume  minio-data  →  /data داخل کانتینر
    پورت 127.0.0.1:9000 و 127.0.0.1:9001
            │
            ▼
برنامهٔ روی همان میزبان به 127.0.0.1:9000
```

## Installation

Docker باید از قبل طبق فصل Docker نصب باشد. پوشهٔ فایل را جدا از `/opt/apps` بگذارید:

```bash
sudo mkdir -p /opt/stacks/minio
sudo chown ops:ops /opt/stacks/minio
cd /opt/stacks/minio
```

رمز را در `.env` بگذارید نه در فایل compose که به گیت می‌رود.

```bash
umask 077
cat > .env <<'EOF'
MINIO_ROOT_USER=minioadmin
MINIO_ROOT_PASSWORD=change-me-use-a-long-random-secret
EOF
chmod 600 .env
```

`compose.yml`:

```yaml
services:
  minio:
    image: minio/minio:RELEASE.2025-04-22T22-12-26Z
    command: server /data --console-address ":9001"
    env_file:
      - .env
    ports:
      - "127.0.0.1:9000:9000"
      - "127.0.0.1:9001:9001"
    volumes:
      - minio-data:/data
    restart: unless-stopped

volumes:
  minio-data:
```

اگر این برچسب روی رجیستری شما نبود، در [فهرست انتشار MinIO](https://github.com/minio/minio/releases) یک `RELEASE` را انتخاب کنید و فقط همان خط `image` را عوض کنید. بعد:

```bash
docker compose config
docker compose up -d
docker compose ps
ss -lnt | grep 9000
```

`compose config` اگر `.env` را نخواند، فایل را از پوشهٔ دیگری اجرا کرده‌اید.

## Configuration

کلاینت `mc` را می‌توانید موقت با کانتینر رسمی بزنید تا روی میزبان دودویی جدا نگذارید:

```bash
docker run --rm --network host minio/mc:RELEASE.2025-04-22T22-12-26Z \
  alias set local http://127.0.0.1:9000 minioadmin 'change-me-use-a-long-random-secret'
```

اگر برچسب `mc` با سرور یکی نبود و دستور راه افتاد، همان را برای ساخت صندوقچه ادامه دهید:

```bash
docker run --rm --network host --entrypoint /bin/sh minio/mc:RELEASE.2025-04-22T22-12-26Z -c \
  "mc alias set local http://127.0.0.1:9000 minioadmin 'change-me-use-a-long-random-secret' && mc mb --ignore-existing local/app-uploads && mc anonymous set none local/app-uploads"
```

شبکهٔ `host` این‌جا فقط چون API روی localhost میزبان است. کانتینر `mc` باید همان localhost را ببیند. رمز را بعد از آزمون عوض کنید و این دستور را در history خالی کنید یا از فایل بخوانید.

متغیر برنامه همان `/etc/app/s3.env` صفحهٔ نصب روی سرور است. endpoint همچنان `http://127.0.0.1:9000` است، نه نام سرویس compose، مگر برنامه هم داخل همان شبکهٔ Docker باشد. اگر هر دو در یک compose هستند، نام میزبان `minio` و پورت `9000` است و پورت منتشرشده به میزبان لازم نیست برای خود برنامه. هنوز برای اینکه از اینترنت دیده نشود، پورت را به localhost محدود کنید یا اصلاً منتشر نکنید.

## Production Example

`docker-1` یا `app-1` استک را بالا می‌آورد. یک فایل آزمون با `mc cp` داخل `app-uploads` می‌رود. سپس `docker compose up -d` با همان برچسب دوباره اجرا می‌شود. `docker volume ls` همان `minio-data` را نشان می‌دهد و شیء هنوز آنجاست.

به‌روزرسانی تصویر: برچسب را عوض می‌کنید، `docker compose up -d`. کانتینر عوض می‌شود، volume نه. اگر تصویر نو بالا نیامد، برچسب قبلی را برمی‌گردانید. `down -v` را برای برگشت استفاده نمی‌کنید.

## Security Notes

فایل `.env` را به گیت نفرستید. در پوشه یک `.gitignore` با خط `.env` بگذارید.

`docker compose down -v` در مستند «تمیز کردن» آموزش‌ها هست و داده را می‌برد. در سرور تولید این پرچم ممنوع است مگر قصدتان واقعاً نابود کردن صندوقچه باشد و بکاپ را جای دیگر دیده باشید.

تصویر `latest` یعنی هفتهٔ بعد بدون خبر نسخه عوض می‌شود. برچسب تاریخ‌دار این را از شما می‌گیرد.

کنسول ۹۰۰۱ حتی روی localhost با رمز ضعیف خطر است اگر کاربر دیگری روی سرور بتواند به localhost وصل شود. رمز بلند، و حساب ریشه خارج از برنامه.

## Troubleshooting

| نشانه | کار |
| --- | --- |
| `pull` برچسب را پیدا نمی‌کند | برچسب را از فهرست انتشار عوض کنید. بقیهٔ فایل را دور نریزید |
| پورت روی `0.0.0.0` است | خط ports را اشتباه نوشته‌اید. `127.0.0.1:` را بگذارید و دوباره `up -d` |
| بعد از `down` داده نیست | `-v` بوده. اگر volume هنوز در `docker volume ls` است، بدون `-v` بالا بیاورید |
| برنامه داخل compose به `127.0.0.1` وصل نمی‌شود | داخل کانتینر، localhost خود کانتینر است نه میزبان. نام سرویس `minio` را بزنید |
| مجوز `.env` شل است | `chmod 600` |

## Best Practices

- volume نام‌دار یا یک bind به `/var/lib/minio`، نه لایهٔ کانتینر.
- برچسب تصویر را بنویسید.
- `down -v` را در alias و در اسکریپت نگهداری نگذارید.
- همان آزمون خواندن و نوشتن صفحهٔ نصب روی سرور را این‌جا هم انجام دهید. بالا بودن کانتینر یعنی داده سالم نیست.
