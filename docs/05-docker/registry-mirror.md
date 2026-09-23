---
sidebar_position: 13
title: آینهٔ رجیستری Docker
description: registry-mirrors در daemon، راه‌اندازی مجدد Engine، و کش pull-through با registry:2.
---

# آینهٔ رجیستری Docker

## مقدمه

وقتی `docker pull` از `docker-1.example.internal` به Docker Hub کند است یا اصلاً به `registry-1.docker.io` نمی‌رسد، مسیر استاندارد این آزمایشگاه آینهٔ سازمان است: `mirror.example.internal` روی `10.10.1.60`. کلاینت Engine فقط با کلید `registry-mirrors` در `/etc/docker/daemon.json` به این آینه وصل می‌شود.

آینه باید واقعاً مال سازمان باشد و همان تیم آن را اداره کند. نوشتن یک نام در `daemon.json` ایمیج را خلق نمی‌کند. اگر پشت نام سرویس زنده‌ای نباشد، pull بدتر می‌شود نه بهتر. این صفحه هم پیکربندی کلاینت را کامل می‌گوید و هم سرویسی را که سازمان باید از ایمیج رسمی `registry:2` بالا بیاورد، با همان کلیدهایی که پروژهٔ Distribution برای کش عبوری (pull-through) سند کرده است.

## مفهوم اصلی

`registry-mirrors` فهرست URL است. Engine وقتی می‌خواهد ایمیجی از Docker Hub بکشد، یعنی نامی که رجیستری‌اش `docker.io` است، اول این فهرست را به ترتیب امتحان می‌کند. `docker pull nginx:1.28-alpine` در واقع `docker.io/library/nginx:1.28-alpine` است. درخواست manifest به آینه می‌رود، به شکلی مثل مسیر `/v2/library/nginx/manifests/1.28-alpine`.

این کلید به رجیستری‌های دیگر کاری ندارد. `ghcr.io` و `quay.io` و یک رجیستری خصوصی که اسم میزبانش را در نام ایمیج نوشته‌اید از آینهٔ Hub رد نمی‌شوند. برای آن‌ها یا شبکه باید به خودشان برسد، یا ایمیج را جایی که شبکه هست بسازید و با `docker save` و `docker load` ببرید. آن مسیر در [کار آفلاین](./offline-operations.md) است.

اگر آینه بالا باشد و به‌صورت pull-through پیکربندی شده باشد، ایمیجی را که ندارد از Hub می‌گیرد، در دیسک خودش نگه می‌دارد، و به کلاینت پس می‌دهد. دفعهٔ بعد همان لایه را از دیسک آینه می‌دهد. اگر آینه از نظر شبکه در دسترس نباشد، Engine به Hub برمی‌گردد. این بازگشت وقتی به درد می‌خورد که آینه خراب است و Hub باز است. وقتی سیاست شبکه Hub را بسته، بازگشت هم شکست می‌خورد و تنها راه موفق آینه‌ای است که خودش به Hub می‌رسد یا از قبل لایه‌ها را دارد. قبل از تکیه کردن به آینه، یک بار pull را در حالی که مسیر مستقیم Hub بسته است امتحان کنید.

پوش به آینه‌ای که در حالت proxy است پشتیبانی نمی‌شود. این سرویس جای رجیستری خصوصی برای ایمیج ساختهٔ تیم نیست. ایمیج `shop-api` را یا روی خود `docker-1` می‌سازید، یا به رجیستری خصوصی جدا پوش می‌کنید. آن رجیستری را با اضافه کردن URLاش به `registry-mirrors` قاطی نکنید.

## چرا استفاده می‌شود؟

هر بار کشیدن `node:24-bookworm-slim` و `mysql:8.4` از اینترنت عمومی، هم کند است هم به قطع مسیر حساس است. یک کش داخل `10.10.1.60` لایه‌های مشترک بین میزبان‌ها را یک بار از Hub می‌گیرد. میزبان‌های بعدی از شبکهٔ آزمایشگاه می‌گیرند.

دلیل دوم کنترل است. تیمی که URL آینهٔ ناشناس را از یک پیام عمومی در `daemon.json` می‌گذارد، به آن آدرس اجازه می‌دهد محتوای تگ را تعیین کند. تگ همان اسم است. آینهٔ بد می‌تواند `nginx:1.28-alpine` را به ایمیج دیگری گره بزند. فقط آینه‌ای که سازمان اداره می‌کند و گواهی‌اش را خودتان اعتماد کرده‌اید در این فایل می‌آید. آدرس نمونه `https://mirror.example.internal` است. اگر نام واقعی سازمان فرق دارد، همان نام را بگذارید، نه یک آینهٔ عمومی بی‌نام.

## Architecture

```text
docker-1  10.10.1.30
  daemon.json  registry-mirrors
        │
        │  HTTPS  mirror.example.internal:443
        ▼
mirror  10.10.1.60
  registry:2  در حالت proxy
  دیسک /var/lib/registry
        │
        │  فقط اگر لایه را ندارد و خروجی باز است
        ▼
registry-1.docker.io
```

کلاینت به پورت `443` نام `mirror.example.internal` وصل می‌شود. داخل میزبان آینه، فرایند `registry` روی پورت `5000` با TLS گوش می‌دهد و Compose آن را به `10.10.1.60:443` منتشر می‌کند. فرایند لازم نیست خودش به پورت `443` بچسبد. گواهی و کلید را سازمان صادر می‌کند. این صفحه کلید خصوصی نمونه نمی‌سازد.

DNS آزمایشگاه باید `mirror.example.internal` را به `10.10.1.60` برگرداند. اگر DNS داخلی هنوز این نام را ندارد، تا وقت اصلاح DNS یک خط در `/etc/hosts` میزبان‌های Docker کافی است. آن خط را جایگزین سرویس نکنید.

## Installation

اول روی `10.10.1.60`، نه روی `docker-1`. Engine آن میزبان هم باید از [نصب](./installation.md) آمده باشد. پوشه:

```bash
sudo install -d -o ops -g ops -m 0750 /opt/apps/registry-mirror
sudo install -d -o root -g ops -m 0750 /opt/apps/registry-mirror/certs
```

گواهی `mirror.example.internal.crt` و کلید `mirror.example.internal.key` را در `certs` بگذارید. کلید باید `0640` یا محدودتر باشد و مالکش root. گواهی باید به نام `mirror.example.internal` باشد. CA صادرکننده باید روی `docker-1` در اعتماد سیستم باشد، وگرنه دیمون TLS را رد می‌کند.

```bash
sudo cp mirror.example.internal.crt /usr/local/share/ca-certificates/mirror.example.internal.crt
sudo update-ca-certificates
```

این دو فرمان را روی هر میزبانی که `docker pull` می‌زند تکرار کنید، از جمله `docker-1`. مسیر دقیق فایل CA همانی است که سازمان به شما داده. اگر گواهی از یک CA عمومی معتبر است، این مرحله لازم نیست.

فایل `/opt/apps/registry-mirror/config.yml` همان پیکربندی سندشدهٔ کش عبوری است. کلید اضافه از خودتان ننویسید.

```yaml
version: 0.1
log:
  fields:
    service: registry
storage:
  cache:
    blobdescriptor: inmemory
  filesystem:
    rootdirectory: /var/lib/registry
  delete:
    enabled: true
http:
  addr: :5000
  tls:
    certificate: /certs/mirror.example.internal.crt
    key: /certs/mirror.example.internal.key
  headers:
    X-Content-Type-Options: [nosniff]
health:
  storagedriver:
    enabled: true
    interval: 10s
    threshold: 3
proxy:
  remoteurl: https://registry-1.docker.io
```

`proxy.remoteurl` فقط Hub است. نام کاربری و رمز Hub را این‌جا نگذارید. اگر بگذارید، هر مخزن خصوصی که آن حساب می‌بیند روی دیسک آینه ذخیره می‌شود و هر کسی که به آینه pull کند ممکن است به آن محتوا برسد، مگر خود آینه را جداگانه قفل کرده باشید. این نمونه برای ایمیج عمومی است و آن دو کلید را عمداً ندارد.

`delete.enabled` همان کلیدی است که سند Distribution برای امکان حذف محتوا می‌خواهد. بدون سیاست نگهداری، دیسک `/var/lib/registry` پر می‌شود. پاک‌سازی را از سند خود Distribution انجام دهید. یک زمان‌بند ساختگی این‌جا اضافه نشده است.

`compose.yaml` روی میزبان آینه:

```yaml
name: registry-mirror

services:
  registry:
    image: registry:2
    restart: unless-stopped
    ports:
      - "10.10.1.60:443:5000"
    volumes:
      - ./config.yml:/etc/docker/registry/config.yml:ro
      - ./certs:/certs:ro
      - registry-data:/var/lib/registry
    logging:
      driver: json-file
      options:
        max-size: "10m"
        max-file: "5"

volumes:
  registry-data:
    name: registry-mirror-data
```

```bash
cd /opt/apps/registry-mirror
docker compose config
docker compose up -d
docker compose ps
```

آزمون از خود آینه و بعد از `docker-1`:

```bash
curl -fsS https://mirror.example.internal/v2/
```

پاسخ موفق این API یک شیء خالی است و کد HTTP برابر `200`. اگر گواهی هنوز اعتماد نشده، `curl` بدون نادیده گرفتن خطا شکست می‌خورد. پرچم نادیده‌گرفتن گواهی را راه موفقیت نکنید. فقط یک بار، برای اینکه بفهمید فرایند بالا است یا TLS از اساس قطع است، می‌توانید خطا را ببینید و بعد CA را درست کنید. حالت دائمی باید `curl` بدون آن پرچم باشد.

## Configuration

روی `docker-1` فایل `/etc/docker/daemon.json` را با کلید آینه کامل کنید. اگر فایل صفحهٔ نصب را قبلاً گذاشته‌اید، کلید را به همان JSON اضافه کنید. دو فایل جدا و JSON شکسته دیمون را پایین می‌آورد.

```json
{
  "log-driver": "json-file",
  "log-opts": {
    "max-size": "10m",
    "max-file": "5"
  },
  "live-restore": true,
  "default-address-pools": [
    {
      "base": "172.30.0.0/16",
      "size": 24
    }
  ],
  "registry-mirrors": [
    "https://mirror.example.internal"
  ]
}
```

URL را با مسیر `/v2` ننویسید. Engine خودش آن مسیر را می‌سازد. طرح باید `https` باشد. آینهٔ HTTP یعنی خاموش کردن بررسی TLS، و آن گزینه در این دانشنامه پیکربندی Production نیست. کلید مربوط به رجیستری ناامن را اضافه نکنید.

اعمال و تأیید:

```bash
python3 -m json.tool /etc/docker/daemon.json > /dev/null
sudo systemctl restart docker.service
sudo systemctl is-active docker.service
docker info
```

در خروجی `docker info` باید بخشی به نام Registry Mirrors باشد و مقدارش `https://mirror.example.internal/` باشد. اگر این بخش نیست، دیمون فایل دیگری را خوانده یا JSON اعمال نشده. `docker info` را در تیکت نگه دارید.

سپس:

```bash
docker pull nginx:1.28-alpine
```

در لاگ آینه باید درخواست همان ایمیج را ببینید.

```bash
docker compose -f /opt/apps/registry-mirror/compose.yaml logs --tail 30 registry
```

اگر میزبان آینه جدا از جایی است که این فرمان را می‌زنید، لاگ را روی `10.10.1.60` بخوانید. pull موفق بدون هیچ خط در لاگ آینه یعنی کلاینت هنوز مستقیم به Hub رفته. آن وقت `docker info` را دوباره بخوانید.

`live-restore` کانتینرهای در حال اجرا را هنگام restart دیمون `docker-1` نگه می‌دارد. خود آینه روی میزبان دیگر است و این restart آن را قطع نمی‌کند. یک پنجرهٔ کوتاه برای restart دیمون `docker-1` اعلام کنید، چون اتصال تازه‌های کلاینت در همان لحظه خطا می‌دهند.

## Production Example

ترتیب تحویل:

```bash
getent hosts mirror.example.internal
curl -fsS -o /dev/null -w '%{http_code}\n' https://mirror.example.internal/v2/
docker info
docker pull node:24-bookworm-slim
docker image inspect node:24-bookworm-slim --format '{{index .RepoDigests 0}}'
```

`getent` باید `10.10.1.60` را چاپ کند. کد HTTP باید `200` باشد. digest را از خروجی واقعی بردارید و در تیکت بنویسید.

یک بار دیگر همان تگ را بکشید. بار دوم باید سریع‌تر باشد و لاگ آینه نشان بدهد لایه از کش آمده، نه اینکه دوباره همهٔ بایت از Hub آمده باشد. اگر آینه هر بار همه چیز را از Hub می‌گیرد، ولوم `registry-mirror-data` سوار نیست.

برای ایمیجی که مال Hub نیست این آینه هیچ کاری نمی‌کند. انتظار نداشته باشید `docker pull ghcr.io/...` در لاگ این registry دیده شود.

## Security Notes

آینه یک مرز اعتماد است. هر کس به میزبان `10.10.1.60` و به ولوم رجیستری دسترسی دارد، لایه‌های کش‌شده را دارد. دسترسی را مثل یک رجیستری تولید محدود کنید. گروه `docker` روی آن میزبان هم معادل root است.

گواهی را نادیده نگیرید و رجیستری را HTTP نکنید. دیمون Docker به CA سیستم نگاه می‌کند. کپی کردن گواهی خودامضا داخل `daemon.json` مکانیسم این صفحه نیست.

نام کاربری Hub در بخش `proxy` یعنی مخازن خصوصی آن حساب روی آینه می‌نشینند. این فایل آن را ندارد. اگر روزی لازم شد، آینه باید احراز هویت جدا برای کلاینت‌ها داشته باشد و این صفحه آن پیکربندی را به‌عنوان پیش‌فرض اضافه نمی‌کند، چون یک خطای کوچک محتوا را عمومی می‌کند.

`registry-mirrors` را به دامنه‌ای که سازمان اداره نمی‌کند اشاره ندهید. آدرس نمونه فقط `mirror.example.internal` است.

ایمیج `registry:2` تگ major رسمی است. آن را به یک ایمیج ناشناس «رجیستری بهینه» عوض نکنید. `latest` را در این سرویس نگذارید. تگ `2` همان خط پایدار سند Docker است. اگر سازمان digest را برای انتشار ثبت می‌کند، از `docker image inspect` روی میزبان آینه بخوانید.

## Troubleshooting

| نشانه | علت | کار |
| --- | --- | --- |
| `docker info` آینه را نشان نمی‌دهد | JSON غلط یا restart نشده | `json.tool` و `systemctl status docker` |
| دیمون بعد از ویرایش بالا نمی‌آید | ویرگول یا کلید تکراری | آخرین نسخهٔ سالم فایل را برگردانید |
| `curl` خطای گواهی | CA روی کلاینت نیست یا نام گواهی فرق دارد | `update-ca-certificates` و نام `mirror.example.internal` |
| `curl` زمان تمام می‌کند | DNS، فایروال، یا سرویس پایین | `getent` و `docker compose ps` روی آینه |
| pull کند است و لاگ آینه خالی است | کلاینت مستقیم به Hub می‌رود | بخش Registry Mirrors |
| pull خطای manifest می‌دهد و Hub بسته است | آینه به upstream نرسیده و لایه را ندارد | خروجی آینه به Hub، یا `docker load` |
| push به آینه رد می‌شود | حالت proxy پوش را پشتیبانی نمی‌کند | این رفتار درست است. رجیستری خصوصی جدا می‌خواهید |
| دیسک آینه پر است | کش حد ندارد | ظرفیت `/var/lib/docker` یا مسیر ولوم را ببینید |
| ایمیج `ghcr.io` از آینه نمی‌آید | این کلید فقط Hub است | save و load |

اگر restart دیمون کانتینرهای `docker-1` را خواباند، `live-restore` در همان فایل نیست یا کانتینر قبلاً با سیاست restart غلط ساخته شده. `docker ps -a` و صفحهٔ [دستورها](./commands.md).

## Best Practices

- آینه را فقط روی `10.10.1.60` و فقط با نامی که سازمان کنترل می‌کند راه بیندازید.
- کلاینت را با `registry-mirrors` و URL برابر `https://mirror.example.internal` تنظیم کنید.
- بعد از هر تغییر daemon، `systemctl restart docker` و بعد `docker info`.
- پیکربندی سرور را همان `proxy.remoteurl` سندشده بگذارید و کلید حدسی اضافه نکنید.
- رمز Hub را در کش عمومی نگذارید.
- TLS را با CA قابل اعتماد حل کنید، نه با رجیستری ناامن.
- برای رجیستری غیر از Hub روی save و load یا رجیستری خصوصی حساب کنید.
- پوش را از این آینه انتظار نداشته باشید.
- دیسک ولوم آینه را پایش کنید.
- تگ کلاینت‌ها همچنان صریح بماند. آینه مجوز استفاده از `latest` نیست.
