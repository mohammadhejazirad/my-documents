---
sidebar_position: 6
title: کلاینت S3
description: aws cli و mc برای MinIO، آروان، R2 و AWS، به‌علاوهٔ متغیر محیطی برنامه.
---

# کلاینت S3

## مقدمه

بعد از آماده شدن endpoint، باید از خود سرور یک شیء بنویسید و بخوانید. تا این کار از SSH انجام نشده، وصل کردن برنامه فقط خطا را به لاگ برنامه منتقل می‌کند. ابزار مشترک `aws` است با `--endpoint-url`. برای خود MinIO، `mc` راحت‌تر است و در صفحهٔ نصب آمده است.

راز را از فایل `/etc/app/s3.env` بخوانید. در خط فرمان پشت سر هم نچسبانید.

## مفهوم اصلی

AWS CLI فرض می‌کند با AWS حرف می‌زند مگر endpoint را بدهید. همان دستور برای آروان و R2 و MinIO کار می‌کند اگر نشانی و سبک مسیر درست باشد. منطقه باید با سرویس بخواند. برای MinIO مقدار `us-east-1` با path-style معمولاً کافی است. برای آروان شناسهٔ منطقه، مثلاً `ir-thr-at1`، را بگذارید. برای R2 مقدار `auto`.

دو کلید در فایل اعتبار CLI قرار می‌گیرد با مجوز `0600`. پروفایل جدا برای تولید و برای آزمایش بسازید تا یک دستور آزمایشی به صندوقچهٔ تولید نرود.

## چرا استفاده می‌شود؟

برنامه خطای SDK را کوتاه نشان می‌دهد. همان درخواست با `aws s3 cp` معلوم می‌کند مشکل از کلید و شبکه است یا از کد. این فرق، ساعت‌ها جست‌وجوی بی‌جهت در Laravel و Node را کم می‌کند.

`mc` برای کار مدیر MinIO است: ساختن صندوقچه، سیاست، آینه. برای آروان و R2 لازم نیست اگر `aws` کار می‌کند، ولی اگر از قبل نصب است می‌تواند alias جدا داشته باشد.

## Architecture

```text
/etc/app/s3.env
        │
        ├── aws cli    --endpoint-url
        ├── mc         alias
        └── برنامه     همان متغیرها
```

## Installation

روی Ubuntu 26.04 بستهٔ `awscli` در مخزن ممکن است از خود AWS عقب باشد و برای کار ساده‌ای مثل `cp` و `ls` کافی است. اگر دستور نبود:

```bash
sudo apt update
sudo apt install -y awscli
aws --version
```

اگر بسته نبود یا خیلی قدیمی بود و یک امکان خاص می‌خواهید، نسخهٔ رسمی AWS CLI v2 را از مستند خود AWS نصب کنید و مسیر `/usr/local/bin/aws` را با `command -v aws` چک کنید تا با بستهٔ apt قاطی نشود. برای آزمون این صفحه، `s3 ls` و `s3 cp` کافی است.

`mc` را فقط برای MinIO لازم دارید و روش گرفتش در صفحهٔ نصب روی سرور است.

## Configuration

فایل اعتبار برای کاربر `deploy`. نمونهٔ آروان:

```bash
sudo install -d -o deploy -g deploy -m 0700 /home/deploy/.aws
sudo install -o deploy -g deploy -m 0600 /dev/null /home/deploy/.aws/credentials
sudo install -o deploy -g deploy -m 0600 /dev/null /home/deploy/.aws/config
```

`credentials`:

```ini
[app]
aws_access_key_id = از فایل محیط
aws_secret_access_key = از فایل محیط
```

`config`:

```ini
[profile app]
region = ir-thr-at1
```

برای R2 منطقه را `auto` بگذارید. برای MinIO:

```ini
[profile app]
region = us-east-1
s3 =
    addressing_style = path
```

آزمایش، با نشانی واقعی محیط. این یکی مال آروان در منطقهٔ نمونه است:

```bash
sudo -u deploy aws --profile app --endpoint-url https://s3.ir-thr-at1.arvanstorage.ir s3 ls
```

برای MinIO:

```bash
sudo -u deploy aws --profile app --endpoint-url http://127.0.0.1:9000 s3 ls
```

برای R2 نشانی حساب خودتان را بگذارید.

نوشتن و خواندن:

```bash
echo ok | sudo -u deploy tee /tmp/s3-ok.txt >/dev/null
sudo -u deploy aws --profile app --endpoint-url https://s3.ir-thr-at1.arvanstorage.ir \
  s3 cp /tmp/s3-ok.txt s3://app-uploads/health/ok.txt
sudo -u deploy aws --profile app --endpoint-url https://s3.ir-thr-at1.arvanstorage.ir \
  s3 cp s3://app-uploads/health/ok.txt -
rm -f /tmp/s3-ok.txt
```

خروجی دستور آخر باید `ok` باشد. فایل آزمون را بعداً پاک کنید اگر نمی‌خواهید بماند:

```bash
sudo -u deploy aws --profile app --endpoint-url https://s3.ir-thr-at1.arvanstorage.ir \
  s3 rm s3://app-uploads/health/ok.txt
```

در برنامه، همان متغیرهای `/etc/app/s3.env` را به فرایند بدهید. برای Node، کلاینت را با endpoint و `forcePathStyle: true` فقط وقتی بسازید که محیط MinIO است. برای آروان این فلگ را true نکنید اگر URL میزبان مجازی می‌خواهید. یک نمونهٔ حداقلی که مقدار را از محیط می‌گیرد کافی است. راز را داخل کد ننویسید.

اگر Laravel از دیسک `s3` استفاده می‌کند، `AWS_ENDPOINT` و `AWS_USE_PATH_STYLE_ENDPOINT` را از مستند همان نسخهٔ Laravel با همین مقدارها پر کنید. نام متغیر فریم‌ورک ممکن است با نام `S3_ENDPOINT` این دانشنامه یکی نباشد. واحد systemd می‌تواند هر دو را از یک فایل محیط بردارد اگر هر دو خط را نوشته باشید. نگاشت را در یادداشت استقرار بیاورید تا نفر بعدی فقط یکی را عوض نکند.

## Production Example

قبل از سوئیچ برنامه، از SSH این سه تا باید سبز باشد: `s3 ls` صندوقچه را نشان دهد، `cp` به `health/ok.txt` برگردد، و `cp` برعکس همان متن را چاپ کند. بعد یک درخواست واقعی آپلود از برنامه، و یک دانلود. سپس فایل قدیمی دیسک را هنوز پاک نکنید. یک دوره هر دو مسیر خوانده شود.

اگر `aws` موفق بود و برنامه نه، تفاوت در متغیر محیطی فرایند است نه در فایروال. `systemctl show app.service -p Environment` را با فایل env مقایسه کنید. گاهی `EnvironmentFile` هست و برنامه فقط `.env` داخل پوشهٔ پروژه را می‌خواند و آن فایل را فراموش کرده‌اید به‌روز کنید.

## Security Notes

پروفایل `app` را در حساب `ops` نگذارید اگر لازم نیست. هر چه کمتر کپی از کلید، بهتر. `ls -l /home/deploy/.aws` باید دایرکتوری `0700` و فایل `0600` باشد.

خروجی `aws` را با `script` یا لاگ اشکال‌زدایی طولانی روشن نکنید که هدر امضا را چاپ کند و همان لاگ را به چت بفرستید.

دستور `s3 rb --force` صندوقچه را با محتوا پاک می‌کند. در مستند آزمون نیاورید و در تاریخچهٔ سرور تولید به عنوان میانبر نگذارید.

## Troubleshooting

| نشانه | کار |
| --- | --- |
| Unable to locate credentials | پروفایل یا کاربر یونیکس غلط است. `sudo -u deploy` را فراموش نکنید |
| InvalidAccessKeyId | کلید را نصفه کپی کرده‌اید |
| RequestTimeTooSkewed | `timedatectl` |
| PermanentRedirect | منطقه با endpoint نمی‌خواند |
| برنامه 403 و cli سالم | فرایند برنامه کلید دیگری دارد یا path-style برعکس است |
| `aws` بستهٔ apt خیلی قدیمی خطای پارامتر می‌دهد | CLI v2 رسمی، و `command -v aws` را چک کنید که همان جدید است |

## Best Practices

- اول CLI، بعد برنامه.
- پروفایل تولید و آزمایش را جدا نگه دارید.
- شیء آزمون `health/ok.txt` را می‌توانید برای پایش نگه دارید، به شرطی که محتوایش عمومی و بی‌اهمیت باشد.
- دستور تخریبی صندوقچه را در اسکریپت بدون پرسش نگذارید.
