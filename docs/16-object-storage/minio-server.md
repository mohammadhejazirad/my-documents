---
sidebar_position: 3
title: MinIO روی سرور
description: نصب دودویی MinIO روی Ubuntu 26.04 با systemd، دیسک /var/lib/minio، و بستن کنسول به localhost.
---

# MinIO روی سرور

## مقدمه

MinIO یک سرویس S3 است که روی دیسک خودتان اجرا می‌شود. وقتی فایل نباید پیش شرکت دیگری برود، یا وقتی می‌خواهید برنامه را قبل از خریدن فضای ابری با همان API بنویسید، همین حالت کافی است. تک‌نود آزمایشگاه و بسیاری از تیم‌های کوچک را راه می‌اندازد. خوشهٔ چندنودی وقتی لازم است که از دست رفتن یک دیسک نباید صندوقچه را بخواباند. آن طرح دیسک و شبکهٔ جدا می‌خواهد و این صفحه جای آن نیست.

داده زیر `/var/lib/minio` می‌ماند. پاک کردن کانتینر یا پوشهٔ `/opt/apps` این مسیر را برنمی‌دارد، به شرطی که خودتان `rm` نزنید.

## مفهوم اصلی

MinIO دو در دارد. API روی پورت ۹۰۰۰ همان S3 است. کنسول وب روی ۹۰۰۱ برای ساختن صندوقچه و کلید است. هر دو را به `127.0.0.1` می‌بندیم. از لپ‌تاپ با تونل SSH به کنسول می‌رسید. برنامه روی همان سرور به `127.0.0.1:9000` وصل می‌شود. اگر برنامه روی سرور دیگری است، پورت ۹۰۰۰ را فقط به آدرس آن سرور در UFW باز کنید، نه به `0.0.0.0/0`.

حساب ریشهٔ MinIO (`MINIO_ROOT_USER` و `MINIO_ROOT_PASSWORD`) فقط برای مدیریت است. برنامه یک access key جدا می‌گیرد که در کنسول یا با `mc` ساخته می‌شود.

نسخهٔ دودویی را از انتشار رسمی MinIO می‌گیرید. مخزن Ubuntu بستهٔ `minio` رسمی این پروژه را به عنوان مسیر اصلی این صفحه ندارد. عدد نسخه را اسکریپت نصب با خود فایل قفل نمی‌کند. بعد از نصب، `minio --version` را در یادداشت سرور بنویسید تا دفعهٔ بعد بدانید چه چیزی بالا بوده.

## چرا استفاده می‌شود؟

سرویس مدیریت‌شده هزینه و یک قرارداد دارد و فایل از شبکهٔ شما خارج می‌شود. دیسک محلی این خروج را ندارد و در عوض تعویض دیسک، پر شدن، و بکاپ با خودتان است. برای فایل داخلی سازمان و برای توسعه، MinIO این معامله را روشن می‌کند.

اگر فقط یک دیسک دارید و همان دیسک ریشه است، خراب شدن دیسک هم سیستم و هم صندوقچه را می‌برد. در تولید جدی مسیر `/var/lib/minio` را روی حجم جدا بگذارید. روش بزرگ کردن آن حجم در [بزرگ کردن دیسک](/docs/04-server-management/disk-grow) است.

## Architecture

```text
برنامه روی همان میزبان
    http://127.0.0.1:9000
            │
            ▼
minio.service   کاربر minio
    API    127.0.0.1:9000
    کنسول  127.0.0.1:9001
            │
            ▼
/var/lib/minio
```

مدیر از لپ‌تاپ:

```text
ssh -L 9001:127.0.0.1:9001 ops@10.10.1.10
```

بعد مرورگر را به `http://127.0.0.1:9001` باز می‌کند. این نشانی مال لپ‌تاپ است که تونل شده، نه انتشار کنسول در اینترنت.

## Installation

کاربر و پوشه:

```bash
sudo useradd --system --home /var/lib/minio --shell /usr/sbin/nologin minio-user
sudo mkdir -p /var/lib/minio
sudo chown minio-user:minio-user /var/lib/minio
sudo chmod 750 /var/lib/minio
```

نام کاربر `minio-user` است تا با نام بسته یا گروه اتفاقی قاطی نشود. اگر `useradd` گفت نام غیرمجاز است، `minio` را بگذارید و در واحد systemd همان را بنویسید.

دودویی رسمی برای amd64. روی ARM نشانی را از مستند انتشار MinIO برای `linux-arm64` بردارید و همان مسیر نصب را نگه دارید.

```bash
curl -fsSL -o /tmp/minio https://dl.min.io/server/minio/release/linux-amd64/minio
sudo install -m 0755 /tmp/minio /usr/local/bin/minio
minio --version
curl -fsSL -o /tmp/mc https://dl.min.io/client/mc/release/linux-amd64/mc
sudo install -m 0755 /tmp/mc /usr/local/bin/mc
mc --version
```

اگر `curl` به `dl.min.io` نرسید، فایل را یک بار روی ماشینی که دسترسی دارد بگیرید و با `scp` به سرور ببرید. دودویی را از منبع ناشناس جایگزین نکنید.

رمز ریشه را بلند و تصادفی بسازید و در `/root/minio-root.txt` با مجوز `0600` بگذارید، نه در تاریخچهٔ shell. نمونهٔ این صفحه کلمهٔ `change-me` است و باید قبل از `systemctl start` عوض شود.

```bash
sudo install -m 0600 /dev/null /etc/default/minio
sudo tee /etc/default/minio >/dev/null <<'EOF'
MINIO_ROOT_USER=minioadmin
MINIO_ROOT_PASSWORD=change-me-use-a-long-random-secret
MINIO_VOLUMES=/var/lib/minio
MINIO_OPTS=--address 127.0.0.1:9000 --console-address 127.0.0.1:9001
EOF
sudo chmod 0600 /etc/default/minio
```

واحد systemd:

```ini
[Unit]
Description=MinIO object storage
After=network-online.target
Wants=network-online.target

[Service]
User=minio-user
Group=minio-user
EnvironmentFile=/etc/default/minio
ExecStart=/usr/local/bin/minio server $MINIO_OPTS $MINIO_VOLUMES
Restart=on-failure
LimitNOFILE=65536

[Install]
WantedBy=multi-user.target
```

فایل را در `/etc/systemd/system/minio.service` بگذارید.

```bash
sudo systemctl daemon-reload
sudo systemctl enable --now minio
systemctl status minio --no-pager
ss -lnt | grep -E '9000|9001'
```

`ss` باید `127.0.0.1:9000` و `127.0.0.1:9001` را نشان دهد، نه `0.0.0.0`.

## Configuration

یک بار با تونل وارد کنسول شوید و صندوقچهٔ `app-uploads` را خصوصی بسازید. یا از خود سرور با `mc`:

```bash
sudo mc alias set local http://127.0.0.1:9000 minioadmin 'change-me-use-a-long-random-secret'
sudo mc mb --ignore-existing local/app-uploads
sudo mc anonymous set none local/app-uploads
```

کلید برنامه را جدا بسازید. در کنسول از بخش Access Keys، یا با `mc admin accesskey create`. خروجی را همان لحظه در `/etc/app/s3.env` کپی کنید. دوباره نشان داده نمی‌شود.

```bash
sudo install -d -o root -g deploy -m 0750 /etc/app
sudo install -m 0640 /dev/null /etc/app/s3.env
sudo chown root:deploy /etc/app/s3.env
```

محتوا:

```text
S3_ENDPOINT=http://127.0.0.1:9000
S3_BUCKET=app-uploads
S3_REGION=us-east-1
S3_ACCESS_KEY=جای کلید تازه‌ساخته
S3_SECRET_KEY=جای راز تازه‌ساخته
S3_USE_PATH_STYLE=true
```

راز واقعی را در این فایل بگذارید و این صفحه را با راز پر نکنید. `S3_REGION=us-east-1` برای MinIO تک‌نود مقدار رایجی است که SDKها بدون منطقهٔ AWS خطا ندهند. endpoint همچنان نشانی محلی است.

واحد برنامه این فایل را با `EnvironmentFile=` می‌خواند. کاربر `deploy` باید گروه اجازهٔ خواندن داشته باشد. فرایندهای دیگر نه.

## Production Example

روی `app-1` MinIO بالا است و فقط localhost گوش می‌دهد. برنامهٔ Laravel یا Node فایل جدید را به صندوقچه می‌فرستد و مسیر قدیمی دیسک را برای فایل‌های قبلی هنوز می‌خواند. یک فایل آزمون `hello.txt` با `mc cp` گذاشته می‌شود و از برنامه با همان کلید خوانده می‌شود.

بکاپ این حالت، کپی خود پوشه در حالی که سرویس بالا است نیست. یا سرویس را در پنجرهٔ خلوت متوقف می‌کنید و `/var/lib/minio` را به دیسک دیگر `rsync` می‌کنید، یا از `mc mirror` به یک MinIO یا S3 دوم می‌فرستید. آینهٔ دوم باید جای دیگری باشد. کپی روی همان دیسک فقط جا را دو برابر می‌کند.

به‌روزرسانی دودویی: فایل جدید را در `/usr/local/bin/minio` بگذارید و `systemctl restart minio`. داده در `/var/lib/minio` می‌ماند. قبل از جایگزینی دودویی، `minio --version` قبلی را یادداشت کنید تا اگر نسخهٔ نو بالا نیامد فایل قبلی را برگردانید. سرویس را purge نکنید.

## Security Notes

رمز `change-me` اگر در سرویس مانده باشد، هر کسی که مستند را خوانده و به پورت دسترسی دارد وارد است. قبل از باز کردن فایروال، رمز را عوض کنید و `systemctl restart minio` بزنید.

پورت ۹۰۰۱ را در UFW به دنیا باز نکنید. کنسول یعنی ساختن کلید.

کاربر `minio-user` پوسته ندارد و نباید در `AllowUsers` باشد.

اگر TLS می‌خواهید، Nginx روی همان سرور گواهی را تمام می‌کند و به `127.0.0.1:9000` پروکسی می‌کند. خود MinIO را با گواهی جدا شلوغ نکنید مگر چند سرور بدون Nginx به آن وصل شوند. نمونهٔ پروکسی در فصل Nginx است. `client_max_body_size` را به اندازهٔ بزرگ‌ترین فایل مجاز بالا ببرید وگرنه آپلود بزرگ از راه Nginx با 413 می‌میرد در حالی که MinIO سالم است.

## Troubleshooting

| نشانه | کار |
| --- | --- |
| سرویس بلافاصله می‌میرد | `journalctl -u minio -n 50 --no-pager`. معمولاً رمز کوتاه‌تر از حد MinIO است یا پوشه مال کاربر دیگری است |
| `ss` روی `0.0.0.0` نشان می‌دهد | `MINIO_OPTS` آدرس `127.0.0.1` ندارد. فایل را درست کنید و restart |
| Access Denied در `mc` | alias هنوز رمز نمونه را دارد |
| دیسک پر و سرویس بالا | `df -h /var/lib/minio`. بزرگ کردن حجم، نه حذف تصادفی صندوقچه |
| برنامه timeout | برنامه به IP عمومی وصل می‌شود و فایروال بسته است. endpoint باید `127.0.0.1` باشد اگر هر دو روی یک میزبان‌اند |
| بعد از reboot سرویس نیست | `systemctl enable` نشده |

## Best Practices

- داده را از پوشهٔ release برنامه جدا نگه دارید.
- کنسول و API را به localhost یا به IP مشخص محدود کنید.
- حساب ریشه را به برنامه ندهید.
- قبل از به‌روزرسانی دودویی نسخهٔ قبلی را کنار داشته باشید.
- یک بار خاموشی برنامه‌ریزی‌شده را تمرین کنید تا بدانید `mc mirror` یا rsync شما واقعاً قابل برگشت است.
