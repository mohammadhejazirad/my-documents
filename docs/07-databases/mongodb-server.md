---
title: MongoDB روی سرور
sidebar_position: 8
description: "نصب MongoDB Community 8.0 از مخزن رسمی روی Ubuntu 26.04 و روشن کردن authorization."
---

# MongoDB روی سرور

## مقدمه

این صفحه MongoDB Community 8.0 را روی `db-1.example.internal` یعنی `10.10.1.20` نصب می‌کند. بسته در مخزن Ubuntu نیست. منبع `repo.mongodb.org` با suite برابر `resolute/mongodb-org/8.0` و کامپوننت `multiverse` است. سرویس `mongod` است و تا `authorization` روشن نشود، نصب تمام نیست. برنامه از `10.10.1.10` با کاربر `app_user` به دیتابیس `app` وصل می‌شود.

کانتینر در [MongoDB در Docker](./mongodb-docker.md) است. replica set، تراکنش و بکاپ در [Replica و بکاپ MongoDB](./mongodb-replica-backup.md) است. بدون replica set این صفحه را تولید نهایی برای تراکنش چندسندی حساب نکنید.

## مفهوم اصلی

`mongodb-org` بستهٔ رسمی MongoDB است و `mongod`، شل `mongosh`، و ابزار دامپ را با هم می‌آورد. بستهٔ قدیمی به نام `mongodb` در آرشیو Ubuntu را نصب نکنید. آن نام متعلق به این نسخه نیست و با مخزن رسمی قاطی می‌شود.

به‌صورت پیش‌فرض هر کسی که به پورت برسد بدون رمز دستور می‌زند، حتی اگر فقط localhost باشد و یک حساب محلی روی سرور داشته باشد. `security.authorization: enabled` این را می‌بندد. اولین کاربر مدیر را باید قبل از بستن در بسازید، یا از استثنای localhost استفاده کنید: تا وقتی هیچ کاربری ساخته نشده، از خود ماشین می‌شود اولین کاربر را ساخت. به محض ساخت اولین کاربر آن استثنا بسته می‌شود. اگر خودتان را بیرون انداختید، مسیر بازگشت خاموش کردن موقت authorization روی localhost است، نه باز کردن پورت روی شبکه.

کاربر برنامه نقش `readWrite` روی دیتابیس `app` دارد و محدودیت `clientSource` فقط آدرس `10.10.1.10` است. دزدیده شدن رمز از یک میزبان دیگر در همین زیرشبکه برای ورود کافی نیست. کاربر مدیر این محدودیت را ندارد و فقط از سوکت/localhost با دست استفاده می‌شود، نه از برنامه.

شنود پیش‌فرض `127.0.0.1` است. برای `app-1` آدرس `10.10.1.20` را هم به `bindIp` اضافه می‌کنیم. `0.0.0.0` نمی‌نویسیم.

این موتور سند است. سفارش با اسکیما ثابت معمولاً به [PostgreSQL](./postgresql-server.md) تعلق دارد. MongoDB را این‌جا برای سندی می‌گذاریم که شکل فیلدهایش واقعاً بین رکوردها فرق دارد و تیم هزینهٔ replica را در صفحهٔ بعد می‌پذیرد.

## چرا استفاده می‌شود؟

برنامه‌ای که مدلش سند است و قید رابطه‌ای را در خود برنامه نگه می‌دارد، روی MySQL با ستون JSON زورکی و کند می‌شود. MongoDB 8.0 همان مدل را بومی دارد. هزینهٔ عملیاتی‌اش این است که بسته را Ubuntu پشتیبانی نمی‌کند، احراز هویت را خودتان باید روشن کنید، و تراکنش چندسندی و change stream بدون replica set کار نمی‌کنند. اگر این سه را نمی‌خواهید، موتور را عوض کنید نه اینکه authorization را خاموش بگذارید.

نسخهٔ 8.0 خطی است که این دانشنامه روی سرور خودتان نصب می‌کند. نسخه‌های rapid جدیدتر را از یک آموزش کنار این مخزن مخلوط نکنید.

## Architecture

```text
ops روی db-1
   └── mongosh روی 127.0.0.1
         کاربر root در دیتابیس admin

mongod   unit: mongod.service   کاربر سیستم mongodb
   ├── کانفیگ /etc/mongod.conf
   ├── داده   /var/lib/mongodb
   ├── لاگ    /var/log/mongodb/mongod.log
   ├── 127.0.0.1:27017
   └── 10.10.1.20:27017

app-1 10.10.1.10
   └── app_user  نقش readWrite روی app
       authSource=admin
       clientSource فقط همین IP
```

کلید APT در `/usr/share/keyrings/mongodb-server-8.0.gpg` است و فایل منبع به شکل deb822 در `/etc/apt/sources.list.d/mongodb-org-8.0.sources` است. منبع تک‌خطی قدیمی لازم نیست.

## Installation

کلید و منبع. اگر فایل کلید از تلاش قبلی مانده، `gpg --dearmor` بازنویسی نمی‌کند؛ در عیب‌یابی حذف همان فایل آمده است.

```bash
sudo install -d -m 0755 /usr/share/keyrings
curl -fsSL https://www.mongodb.org/static/pgp/server-8.0.asc | sudo gpg --dearmor -o /usr/share/keyrings/mongodb-server-8.0.gpg
sudo chmod 0644 /usr/share/keyrings/mongodb-server-8.0.gpg
sudo tee /etc/apt/sources.list.d/mongodb-org-8.0.sources >/dev/null <<'EOF'
Types: deb
URIs: https://repo.mongodb.org/apt/ubuntu
Suites: resolute/mongodb-org/8.0
Components: multiverse
Architectures: amd64 arm64
Signed-By: /usr/share/keyrings/mongodb-server-8.0.gpg
EOF
sudo apt update
apt-cache policy mongodb-org
sudo apt install mongodb-org
sudo systemctl enable --now mongod
sudo systemctl status mongod --no-pager
mongod --version
```

`apt-cache policy` باید کاندیدا را از `repo.mongodb.org` و خط `8.0` نشان دهد، نه از آرشیو Ubuntu. `systemctl status` باید `active (running)` باشد. اگر سرویس بلافاصله می‌میرد، قبل از دست زدن به کانفیگ لاگ را بخوانید. روی CPU خیلی قدیمی نبودن پرچم AVX علت شناخته‌شده است.

```bash
grep -m1 ' avx ' /proc/cpuinfo || echo 'no-avx'
sudo tail -n 30 /var/log/mongodb/mongod.log
```

تا وقتی authorization روشن نشده، از localhost بدون رمز وارد می‌شوید. کاربر مدیر را همان حالا بسازید.

```bash
sudo tee /root/mongo-create-root.js >/dev/null <<'EOF'
db = db.getSiblingDB("admin")
db.createUser({
  user: "root",
  pwd: "change-me",
  roles: [ { role: "root", db: "admin" } ]
})
EOF
sudo chmod 0600 /root/mongo-create-root.js
mongosh --quiet --host 127.0.0.1 /root/mongo-create-root.js
```

پاسخ سالم ساخت کاربر، فیلد `ok` با مقدار `1` است. فایل را بعد از عوض کردن رمز واقعی نگه دارید یا اگر دیگر لازم نیست حذف کنید؛ رمز نمونه داخلش است.

## Configuration

در `/etc/mongod.conf` این مقدارها را قرار دهید. تورفتگی YAML با فاصله است نه تب. اگر بخش `security` یا `net` از قبل هست، کلید را همان‌جا عوض کنید و بخش تکراری نسازید. بقیهٔ فایل، از جمله `storage.dbPath` و `systemLog`، همان پیش‌فرض بسته بماند.

```yaml
security:
  authorization: enabled
net:
  port: 27017
  bindIp: 127.0.0.1,10.10.1.20
```

```bash
sudo systemctl restart mongod
sudo systemctl status mongod --no-pager
sudo ss -lptn 'sport = :27017'
```

`ss` باید `127.0.0.1:27017` و `10.10.1.20:27017` را نشان دهد، نه `0.0.0.0:27017`.

اثبات قفل. این فرمان باید رد شود.

```bash
mongosh --quiet --host 127.0.0.1 --eval 'db.getSiblingDB("admin").getUsers()'
```

انتظار: خطای احراز هویت، نه فهرست کاربران. سپس با رمز وارد شوید. رمز را روی خط فرمان ننویسید؛ `mongosh` می‌پرسد.

```bash
mongosh --host 127.0.0.1 --username root --password --authenticationDatabase admin --quiet --eval 'db.runCommand({ connectionStatus: 1 }).ok'
```

باید `1` چاپ شود.

کاربر برنامه. محدودیت مبدأ فقط `10.10.1.10` است. از خود `db-1` این کاربر نباید قبول شود و این را پایین‌تر امتحان می‌کنیم.

```bash
sudo tee /root/mongo-create-app.js >/dev/null <<'EOF'
db = db.getSiblingDB("admin")
db.createUser({
  user: "app_user",
  pwd: "change-me",
  roles: [ { role: "readWrite", db: "app" } ],
  authenticationRestrictions: [ { clientSource: ["10.10.1.10"] } ]
})
EOF
sudo chmod 0600 /root/mongo-create-app.js
mongosh --host 127.0.0.1 --username root --password --authenticationDatabase admin /root/mongo-create-app.js
```

:::warning رمز نمونه
هر دو رمز `change-me` باید قبل از استفادهٔ واقعی عوض شوند. فایل‌های `/root/mongo-create-*.js` مجوز `0600` دارند و در گیت نمی‌روند. تاریخچهٔ شل `ops` اگر این دستور را چسبانده باشید رمز را دارد؛ آن خط را پاک کنید.
:::

فایروال:

```bash
sudo ufw allow OpenSSH
sudo ufw allow from 10.10.1.10 to any port 27017 proto tcp comment 'app-1 mongodb'
sudo ufw status verbose
```

کل زیرشبکه را باز نکنید. UFW در [صفحهٔ خودش](/docs/10-security/ufw) است.

## Production Example

از `app-1`، نه از `db-1`. اگر `mongosh` آن‌جا نیست، فقط ابزار کلاینت را از همان مخزن و همان کلید نصب کنید و بستهٔ `mongodb-org-server` را روی `app-1` نصب نکنید. ساده‌تر: یک‌بار از `app-1` با `mongosh` موجود، یا برنامهٔ واقعی.

روی `db-1` اول ثابت کنید مبدأ محلی برای `app_user` بسته است.

```bash
mongosh --host 127.0.0.1 --username app_user --password --authenticationDatabase admin --eval 'db.runCommand({ ping: 1 })'
```

باید به‌خاطر `authenticationRestrictions` رد شود، حتی با رمز درست.

روی `app-1` سند نمونه را بگذارید. رمز پرسیده می‌شود.

```bash
mongosh --host 10.10.1.20 --username app_user --password --authenticationDatabase admin app --eval 'db.orders.insertOne({ sku: "A-1", qty: 2 }); db.orders.insertOne({ sku: "B-4", qty: 1 }); print(db.orders.countDocuments())'
```

خروجی `countDocuments` باید `2` باشد. رشتهٔ اتصال برنامه در فایل `0600` روی `app-1`:

```text
mongodb://app_user:change-me@10.10.1.20:27017/app?authSource=admin
```

تراکنش چندسندی روی این تک‌نود بدون replica set خطا می‌دهد. آن خطا را با خاموش کردن authorization حل نکنید. صفحهٔ replica یک نود را به مجموعه تبدیل می‌کند و همان‌جا هشدار می‌دهد که یک عضو، جایگزین سه عضو نیست.

## Security Notes

- `authorization` بعد از ساخت کاربر مدیر روشن می‌ماند. برای راحتی توسعه خاموشش نکنید.
- `bindIp` شامل `0.0.0.0` نیست.
- `app_user` نقش `root`، `dbAdminAnyDatabase` یا `readWriteAnyDatabase` ندارد.
- `clientSource` کاربر برنامه فقط `10.10.1.10` است. اضافه کردن کل `10.10.1.0/24` محدودیت را بی‌معنی می‌کند.
- پورت ۲۷۰۱۷ در UFW فقط از همان مبدأ.
- فایل JS ساخت کاربر و لاگ اگر سطح لاگ را به دستوری ببرید که سند را چاپ کند، داده لو می‌دهند. سطح پیش‌فرض را پایین نیاورید مگر برای یک عیب‌یابی کوتاه.
- کاربر سیستم `mongodb` مالک `/var/lib/mongodb` است. آن پوشه را با `chown` به `ops` ندهید.
- این صفحه کلید داخلی replica را تنظیم نمی‌کند. تا وقتی replica روشن نکرده‌اید کلیدفایل لازم نیست. با روشن کردن replica در صفحهٔ بعد، بدون کلیدفایل `mongod` بالا نمی‌آید.

## Troubleshooting

| نشانه | علت محتمل | کار |
| --- | --- | --- |
| `apt update` suite را پیدا نمی‌کند | خط `Suites` غلط است یا آینه به آن مسیر نمی‌رسد | فایل sources را با همین چهار مقدار صفحه مقایسه کنید. بسته را از universe جایگزین نکنید |
| `gpg: can't create` | فایل کلید از قبل هست | `sudo rm /usr/share/keyrings/mongodb-server-8.0.gpg` و ساخت دوباره، فقط اگر به کلید همان URL اعتماد دارید |
| `mongod` بلافاصله exit می‌کند | کانفیگ YAML، مجوز داده، یا CPU بدون AVX | `journalctl -u mongod -n 50 --no-pager` و `grep avx /proc/cpuinfo` |
| بعد از روشن کردن auth دیگر وارد نمی‌شوید و هیچ کاربری نساختید | استثنای localhost را از دست داده‌اید چون کاربری هست، یا برعکس کاربر ساخته نشده و اسکریپت خطا داده | اگر هیچ کاربری نیست از localhost کاربر بسازید. اگر کانفیگ مانع بالا آمدن است، authorization را موقتاً بردارید، فقط روی `bindIp: 127.0.0.1`، کاربر را بسازید، دوباره روشن کنید |
| از `app-1` تایم‌اوت | bind یا UFW | `ss` و `ufw status` |
| رمز درست است و `app_user` از `db-1` رد می‌شود | محدودیت مبدأ | این رفتار درست است. از `10.10.1.10` وصل شوید |
| `command insert requires authentication` | برنامه بدون `authSource=admin` آمده | رشتهٔ اتصال بالا |
| تراکنش خطا می‌دهد | replica set نیست | صفحهٔ replica، نه خاموش کردن امنیت |

وضعیت سرویس:

```bash
sudo systemctl status mongod --no-pager
sudo tail -n 20 /var/log/mongodb/mongod.log
```

خط `Waiting for connections` با پورت `27017` حالت سالم بعد از ری‌استارت است.

## Best Practices

- مخزن را deb822 و با همین suite و کلید بنویسید. مخزن تصادفی «MongoDB برای Ubuntu» را کنارش اضافه نکنید.
- اول کاربر مدیر، بعد authorization، بعد اثبات اینکه فرمان بی‌رمز رد می‌شود، بعد کاربر برنامه.
- نقش برنامه فقط `readWrite` روی `app`.
- مبدأ برنامه را در خود MongoDB محدود کنید و در UFW هم همان یک آدرس را باز کنید. یکی جای دیگری نیست.
- رمز در آرگومان `-p` با مقدار، در تاریخچه می‌ماند و در `ps` دیده می‌شود. شکل `--password` بدون مقدار را حفظ کنید.
- تا صفحهٔ replica را اجرا نکرده‌اید، به برنامه نگویید تراکنش چندسندی دارید.
- بکاپ را همان هفته از صفحهٔ replica راه‌اندازی کنید، حتی اگر هنوز تک‌عضوی هستید.
