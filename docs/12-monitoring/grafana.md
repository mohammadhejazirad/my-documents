---
sidebar_position: 6
title: Grafana
description: Grafana 13.2.2 با رمز از محیط، datasource پرومتئوس، و داشبورد داخلی روی پورت 3000.
---

# Grafana

## مقدمه

Grafana روی `mon-1.example.internal` نمودار Prometheus را نشان می‌دهد. خودش میزبان را scrape نمی‌کند و هشدار شبانهٔ این دانشنامه نیست. هشدار در [Prometheus](./prometheus) و Alertmanager است. این صفحه فقط خواندن تکرارپذیر را می‌سازد تا شیفت عبارت را در رابط Prometheus از حفظ ننویسد.

ایمیج `grafana/grafana:13.2.2` است. کاربر اولیه `admin` است. رمز از متغیر `GF_SECURITY_ADMIN_PASSWORD` می‌آید و نباید رمز پیش‌فرض محصول سر جایش بماند. پورت `3000` فقط روی `10.10.1.40` و فقط برای شبکهٔ داخلی است.

## مفهوم اصلی

Grafana سه چیز را از هم جدا نگه می‌دارد: کاربر، datasource، و داشبورد. کاربر را محیط کانتینر دفعهٔ اول ساخت پایگاه می‌سازد. datasource می‌گوید نمودارها از کجا عدد می‌گیرند. در آزمایشگاه تنها منبع `http://10.10.1.40:9090` است، یعنی Prometheus روی همان میزبان. داشبورد یک فایل JSON است که با provisioning بالا می‌آید تا با کلیک در UI گم نشود.

متریک‌هایی که این صفحه در پنل می‌گذارد `up` و `node_filesystem_avail_bytes` هستند. هر دو را node_exporter و Prometheus پایدار نگه داشته‌اند. `up` می‌گوید scrape موفق است یا نه. متریک فایل‌سیستم می‌گوید روی ریشه چند بایت آزاد است. اگر کسی پنل حافظه خواست، node_exporter فیلد MemAvailable را با نام `node_memory_MemAvailable_bytes` منتشر می‌کند. پنل رسمی این صفحه به آن وابسته نیست تا یک تغییر نام، داشبورد را بی‌معنی نکند.

رمز ادمین فقط هنگام ساختن پایگاه تازه از متغیر محیط خوانده می‌شود. اگر volume از قبل با رمز دیگری ساخته شده باشد، عوض کردن env به‌تنهایی رمز را عوض نمی‌کند. باید رمز را آگاهانه reset کنید. این همان راهی است که رمز پیش‌فرض `admin` اگر یک بار بالا آمده باشد سر جایش می‌ماند. رویهٔ این صفحه این است که قبل از اولین اجرا env درست باشد، و اگر شک دارید رمز را reset کنید نه این‌که با `admin` وارد شوید.

## چرا استفاده می‌شود؟

رابط Prometheus برای یک نفر که عبارت را می‌داند کافی است و برای شیفت نیست. Grafana همان عبارت را با نام و محور زمان نگه می‌دارد. بدون datasource پایدار، هر کس URL و IP را یک جور ذخیره می‌کند و فردا نمودار خالی را با «Prometheus خراب است» اشتباه می‌گیرد.

بدون قفل کردن برچسب ایمیج، ارتقای ناخواسته داشبورد را با نسخهٔ دیگری باز می‌کند. `13.2.2` همان است که این دانشنامه تست کرده. `latest` نگذارید.

## Architecture

```text
مرورگر شیفت، فقط از 10.10.0.0/16
        │
        ▼
Grafana  10.10.1.40:3000
    ایمیج grafana/grafana:13.2.2
    GF_SECURITY_ADMIN_USER=admin
    رمز از GF_SECURITY_ADMIN_PASSWORD
        │
        │  Grafana سمت سرور به Prometheus وصل می‌شود
        ▼
Prometheus  10.10.1.40:9090
        │
        ▼
node_exporter روی میزبان‌ها

فایل‌ها روی mon-1
    /etc/grafana/admin.env                         حالت 0600
    provisioning/datasources/prometheus.yml
    provisioning/dashboards/provider.yml
    dashboards/lab.json
```

کانتینر به Prometheus روی آدرس میزبان وصل می‌شود، نه روی `localhost` داخل شبکهٔ داکر. `localhost` داخل کانتینر خود Grafana است و Prometheus آنجا گوش نمی‌دهد.

## Installation

Docker Engine روی `mon-1` طبق [نصب داکر](/docs/05-docker/installation) است. Prometheus باید از قبل روی `10.10.1.40:9090` جواب بدهد. اگر هنوز نیست، این صفحه را شروع نکنید.

فایل رمز را با ویرایشگر بسازید تا در تاریخچهٔ پوسته نماند.

```bash
sudo install -d -m 0755 /etc/grafana
sudo install -m 0600 -o root -g root /dev/null /etc/grafana/admin.env
sudoedit /etc/grafana/admin.env
```

محتوای فایل، با رمزی که خودتان می‌گذارید. رشتهٔ `change-me` یعنی هنوز تمام نشده. آن را در فایل واقعی رها نکنید و این فایل را به گیت نفرستید.

```bash
GF_SECURITY_ADMIN_USER=admin
GF_SECURITY_ADMIN_PASSWORD=change-me
```

قبل از بالا آوردن، وجود رمز غیرپیش‌فرض را چک کنید. خروج صفر یعنی خط رمز هست و مقدارش خالی یا `admin` نیست.

```bash
sudo awk -F= '$1=="GF_SECURITY_ADMIN_PASSWORD" && $2!="" && $2!="admin" && $2!="change-me" {ok=1} END {exit !ok}' /etc/grafana/admin.env
echo $?
```

اگر `1` چاپ شد، `sudoedit` را دوباره باز کنید. با `admin` یا `change-me` کانتینر را استارت نکنید.

پوشهٔ کاری کنار فایل‌های provisioning، مثلاً `/opt/apps/grafana` ، و یک فایل compose. برچسب ایمیج را همین‌جا قفل کنید.

```yaml
services:
  grafana:
    image: grafana/grafana:13.2.2
    restart: unless-stopped
    env_file:
      - /etc/grafana/admin.env
    environment:
      GF_USERS_ALLOW_SIGN_UP: "false"
      GF_SERVER_HTTP_ADDR: "0.0.0.0"
      GF_SERVER_HTTP_PORT: "3000"
    ports:
      - "10.10.1.40:3000:3000"
    volumes:
      - grafana-data:/var/lib/grafana
      - ./provisioning:/etc/grafana/provisioning:ro
      - ./dashboards:/var/lib/grafana/dashboards:ro

volumes:
  grafana-data: {}
```

`ports` به `10.10.1.40` چسبیده است. `0.0.0.0:3000:3000` را جایگزین نکنید. متغیر `GF_SERVER_HTTP_ADDR` داخل کانتینر است و باید روی همهٔ رابط‌های داخل کانتینر گوش بدهد تا port mapping به آن برسد. محدودیت شبکه را میزبان اعمال می‌کند، نه آن متغیر.

```bash
cd /opt/apps/grafana
sudo docker compose up -d
sudo docker compose ps
```

## Configuration

Datasource در `provisioning/datasources/prometheus.yml`.

```yaml
apiVersion: 1
datasources:
  - name: Prometheus
    uid: prometheus
    type: prometheus
    access: proxy
    url: http://10.10.1.40:9090
    isDefault: true
    editable: false
```

`access: proxy` یعنی مرورگر شیفت مستقیم به 9090 نیاز ندارد. Grafana از سمت سرور می‌خواند. با این حال 9090 را طبق صفحهٔ Prometheus باز به اینترنت نگذارید. بستن Grafana جای بستن Prometheus را نمی‌گیرد.

ارائه‌دهندهٔ داشبورد در `provisioning/dashboards/provider.yml`.

```yaml
apiVersion: 1
providers:
  - name: lab
    orgId: 1
    folder: Lab
    type: file
    disableDeletion: false
    updateIntervalSeconds: 30
    options:
      path: /var/lib/grafana/dashboards
```

فایل `dashboards/lab.json` یک داشبورد با دو پنل است. پنل اول `up`. پنل دوم فضای آزاد ریشه. اگر Grafana هنگام وارد کردن شمارهٔ schema را عوض کرد، مهم نیست. عبارت داخل `expr` را دست نزنید.

```json
{
  "uid": "lab-nodes",
  "title": "Lab nodes",
  "timezone": "Asia/Tehran",
  "schemaVersion": 39,
  "version": 1,
  "refresh": "30s",
  "panels": [
    {
      "type": "timeseries",
      "title": "scrape up",
      "datasource": { "type": "prometheus", "uid": "prometheus" },
      "gridPos": { "h": 8, "w": 24, "x": 0, "y": 0 },
      "targets": [
        { "refId": "A", "expr": "up" }
      ]
    },
    {
      "type": "timeseries",
      "title": "root bytes free",
      "datasource": { "type": "prometheus", "uid": "prometheus" },
      "gridPos": { "h": 8, "w": 24, "x": 0, "y": 8 },
      "targets": [
        {
          "refId": "A",
          "expr": "node_filesystem_avail_bytes{mountpoint=\"/\",fstype!~\"tmpfs|overlay\"}"
        }
      ]
    }
  ]
}
```

بعد از بالا آمدن، از داخل شبکه به `http://10.10.1.40:3000` با کاربر `admin` و رمز env وارد شوید. اگر رابط خواست رمز پیش‌فرض را عوض کنید، متغیر اعمال نشده. وارد نشوید. ثبت‌نام عمومی خاموش است.

```bash
sudo ufw allow from 10.10.0.0/16 to any port 3000 proto tcp comment 'grafana lab'
sudo ufw status verbose
```

قانون `Anywhere` برای 3000 نباید باشد.

## Production Example

شیفت می‌گوید داشبورد خالی است و فکر می‌کند همهٔ سرورها down هستند.

### نشانه

ورود به Grafana کار می‌کند. پنل `up` یا خط ندارد یا همه را صفر نشان می‌دهد. دیروز عدد داشت.

### فرضیه

یا Prometheus از داخل کانتینر Grafana در دسترس نیست، یا datasource به `localhost` عوض شده، یا خود Prometheus هدف را از دست داده. خالی بودن پنل به‌تنهایی مرگ میزبان‌ها نیست.

### دستور مشاهده

روی `mon-1`:

```bash
curl -fsS --max-time 5 http://10.10.1.40:9090/-/ready
sudo docker compose -f /opt/apps/grafana/docker-compose.yml exec grafana wget -qO- --timeout=5 http://10.10.1.40:9090/-/ready
```

اگر `wget` داخل ایمیج نبود، از لاگ همان کانتینر خطای datasource را بخوانید و از میزبان Prometheus را جدا بسنجید.

```bash
sudo docker compose -f /opt/apps/grafana/docker-compose.yml logs --tail=40 grafana
```

```bash
curl -fsS --max-time 5 'http://10.10.1.40:9090/api/v1/query?query=up'
```

خروجی سالم در `query` مقدار 1 برای هدف‌هایی است که scrape می‌شوند. اگر این‌جا 1 هست و Grafana خالی است، مشکل داخل Grafana است. اگر این‌جا خالی یا صفر است، مشکل Prometheus است و این صفحه را با عوض کردن پنل کثیف نکنید.

### تصمیم

Prometheus از میزبان آماده است و از کانتینر نه: مسیر شبکه یا URL دیتاسورس. URL باید `http://10.10.1.40:9090` بماند.

هر دو خالی‌اند: بروید به صفحهٔ Prometheus. داشبورد را دوباره import نکنید.

Prometheus مقدار 1 دارد و پنل هنوز خالی است: datasource به uid `prometheus` وصل نیست یا پنل datasource دیگری دارد. فایل provisioning را با چیزی که در UI زیر Connections می‌بینید مقایسه کنید.

### اصلاح

فایل datasource همین صفحه را برگردانید، کانتینر را بالا بیاورید، و در UI دکمهٔ Save & test را اگر فایل را نادیده گرفته بود بزنید. provisioning با `editable: false` جلوی drift را می‌گیرد اگر کسی UI را منبع حقیقت نکرده باشد.

```bash
cd /opt/apps/grafana
sudo docker compose up -d
```

شاهد اصلاح: پنل `up` برای `10.10.1.10:9100` مقدار 1 نشان می‌دهد و همان را `curl` روی API پرومتئوس هم نشان می‌دهد.

### جلوگیری از تکرار

داشبورد را فقط از فایل زیر `/opt/apps/grafana/dashboards` عوض کنید. ذخیرهٔ فقط در UI با رفتن volume یا با جایگزینی کانتینر از بین می‌رود، مگر آن‌که Grafana آن را در پایگاه خودش نگه دارد و شما دیگر ندانید کدام نسخه درست است. یک منبع: فایل گیت‌شده، بدون رمز. env بیرون از گیت.

## Security Notes

رمز `admin` و رمز `change-me` هر دو مردودند. فایل `/etc/grafana/admin.env` حالت `0600`. آن را در compose داخل مخزن کپی نکنید. `env_file` به مسیر روی سرور اشاره می‌کند.

اگر یک بار با پیش‌فرض بالا آمده‌اید، reset را انجام دهید و در تیکت بنویسید که رمز قبلی معتبر نیست.

```bash
sudo docker compose -f /opt/apps/grafana/docker-compose.yml exec grafana grafana-cli admin reset-admin-password 'رمز-تازه'
```

اگر پوسته گفت `grafana-cli` نیست، وجود `/usr/bin/grafana-cli` را داخل کانتینر ببینید. رمز را در history گروه نگذارید و همان مقدار را در `GF_SECURITY_ADMIN_PASSWORD` هم تازه کنید تا با پاک شدن volume پیش‌فرض برنگردد. پورت 3000 حتی با رمز قوی روی اینترنت جایی در این دانشنامه ندارد. ثبت‌نام آزاد خاموش می‌ماند.

## Troubleshooting

کانتینر بالا نمی‌آید و لاگ می‌گوید پورت گرفته است: یک Grafana دیگر یا یک پروسه روی 3000. `ss -lnt | grep 3000`. دومی را نصب نکنید.

ورود با `admin` / `admin` هنوز کار می‌کند: env هنگام ساخت پایگاه نبوده یا مقدارش همان پیش‌فرض بوده. reset را بزنید. فقط عوض کردن فایل env بدون reset این در را نمی‌بندد.

datasource می‌گوید bad gateway: از داخل کانتینر به `10.10.1.40:9090` راه نیست. Prometheus را با `--web.listen-address=10.10.1.40:9090` چک کنید. اگر Prometheus فقط روی `127.0.0.1` باشد، کانتینر به آن نمی‌رسد.

پنل دیسک خالی و پنل `up` پر است: برچسب `mountpoint` ریشه جور نیست. نام `node_filesystem_avail_bytes` را عوض نکنید تا خود Prometheus همان نام را نشان بدهد. اختلاف ساعت با journal معمولاً zone مرورگر است، نه scrape.

## Best Practices

- برچسب فقط `grafana/grafana:13.2.2`.
- رمز فقط از `GF_SECURITY_ADMIN_PASSWORD` در فایل `0600`، نه `admin` و نه `change-me`.
- پورت فقط `10.10.1.40:3000` و فقط شبکهٔ داخلی.
- datasource را provisioning کنید و به `http://10.10.1.40:9090` بچسبانید.
- پنل پایه `up` است و پنل دیسک `node_filesystem_avail_bytes` روی ریشه. خالی بودن داشبورد را با `curl` روی API پرومتئوس جدا کنید.
- هشدار را در Grafana تکرار نکنید تا دو مسیر نامه با دو آستانه نداشته باشید. نامه مال Alertmanager است.
- فایل داشبورد در گیت، فایل رمز بیرون از گیت.
