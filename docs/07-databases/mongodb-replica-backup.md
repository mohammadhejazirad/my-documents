---
title: Replica و بکاپ MongoDB
sidebar_position: 10
description: "تبدیل MongoDB 8 به replica تک‌عضوی برای تراکنش، معماری سه عضو، و آزمون mongodump."
---

# Replica و بکاپ MongoDB

## مقدمه

این صفحه `mongod` روی `db-1` را به یک replica set تک‌عضوی به نام `rs0` تبدیل می‌کند تا تراکنش چندسندی و change stream کار کنند، و با `mongodump` از دیتابیس `app` نسخه می‌گیرد و همان را در `app_restore` برمی‌گرداند. نصب و احراز هویت در [MongoDB روی سرور](./mongodb-server.md) است. اگر داده در کانتینر است، بخش Docker پایین خودش دستور دارد و به [MongoDB در Docker](./mongodb-docker.md) فقط برای تفاوت volume ارجاع می‌دهد.

یک عضو replica دسترس‌پذیری بالا نیست. با خاموش شدن `db-1` مجموعه پایین است. سه عضو داده‌دار حداقل شکل تولید است و این آزمایشگاه آن سه ماشین را ندارد. تک‌عضو را جایگزین سه عضو ننامید.

## مفهوم اصلی

replica set چند فرایند `mongod` است که یک مجموعه داده را تکرار می‌کنند. یکی primary است و نوشتن را می‌پذیرد. بقیه secondary هستند و oplog را دنبال می‌کنند. اگر primary از دسترس خارج شود، اعضایی که هنوز اکثریت را تشکیل می‌دهند primary تازه انتخاب می‌کنند. با یک عضو، اکثریتی جز خودش نیست: انتخاب معنا ندارد و خاموشی یعنی قطعی.

تراکنش چندسندی و change stream در MongoDB به oplog نیاز دارند و oplog مال replica set است، حتی وقتی فقط یک عضو دارید. به همین دلیل برنامهٔ واقعی را روی `mongod` مستقل بدون `replSetName` production نکنید، حتی روی یک ماشین. این کار قفل قابلیت است، نه قفل قطعی.

سه عضو داده‌دار یعنی سه دیسک و سه ماشین. از دست رفتن یکی هنوز یک کپی کامل و یک رأی اکثریت (دو از سه) باقی می‌گذارد. داور (arbiter) رأی می‌دهد و داده نگه نمی‌دارد. مجموعهٔ primary به‌علاوهٔ یک secondary به‌علاوهٔ داور، بعد از سوختن secondary دیگر کپی خواندنی ندارد. این صفحه داور نمی‌سازد و دستورش را نمی‌دهد.

اعضای یک مجموعه با کلید مشترک یکدیگر را باور می‌کنند. وقتی `authorization` روشن است، MongoDB بدون `security.keyFile` (یا گواهی) بالا نمی‌آید و خطا می‌دهد که keyFile لازم است. کلیدفایل رمز کاربر برنامه نیست. مجوزش `0400` و مالکش کاربر `mongodb` است. در گیت و در بکاپ عمومی نمی‌رود.

`mongodump` خروجی منطقی می‌سازد، نه یک اسنپ‌شات دیسک از `/var/lib/mongodb`. کپی آن پوشه در حالی که `mongod` روشن است ناسازگار است. دامپ را کاربر با نقش `backup` می‌گیرد. آن نقش داده را برنمی‌گرداند. برگرداندن کار مدیر است تا رمز دامپ به‌تنهایی نتواند داده را بازنویسی کند.

نام میزبانی که در `rs.initiate` می‌نویسید همان آدرسی است که درایور برنامه بعداً کشف می‌کند. اگر `db-1.example.internal` در `/etc/hosts` به `127.0.1.1` اشاره کند و `bindIp` آن آدرس را نداشته باشد، عضو به خودش هم وصل نمی‌شود. در این آزمایشگاه میزبان عضو را `10.10.1.20:27017` می‌گذاریم، همان آدرسی که در `bindIp` هست.

## چرا استفاده می‌شود؟

بدون این صفحه، نصب امن صفحهٔ قبل هنوز تراکنش چندسندی را رد می‌کند و هر تغییری را به برنامهٔ گوش‌دهنده اعلام نمی‌کند. با این صفحه آن دو قابلیت روی همان یک ماشین روشن می‌شوند و همزمان یک بکاپ قابل آزمون دارید. ادعای «کلاستر» را از این کار درنیاوردید. قطع برق `db-1` هنوز داده را تا آخرین بکاپ سالم عقب می‌برد، نه تا آخرین نوشتن روی یک secondary که وجود ندارد.

دامپ منطقی را می‌شود روی کانتینر `mongo:8` خالی ریخت. این برای خطای `drop` و برای تمرین بازیابی بهتر از این است که فقط اندازهٔ فایل را در مانیتورینگ ببینید.

## Architecture

شکل تولید، که در این آزمایشگاه ساخته نمی‌شود:

```text
عضو ۱   primary      نوشتن و خواندن
عضو ۲   secondary    کپی داده، رأی
عضو ۳   secondary    کپی داده، رأی
                 │
                 └── از دست رفتن یکی: دو عضو باقی می‌مانند و هنوز اکثریت دارند
```

شکل قابل اجرای این کتاب:

```text
app-1 10.10.1.10
   └── درایور با replicaSet=rs0
         میزبان کشف‌شده: 10.10.1.20:27017

db-1
   └── mongod  تنها عضو rs0
         keyFile /etc/mongodb/keyfile
         oplog روشن است، failover نیست

cron
   └── mongodump --gzip --archive
         /var/backups/mongodb/app-STAMP.archive.gz
         آزمون: mongorestore به app_restore و مقایسهٔ تعداد
```

اگر روزی عضو دوم و سوم اضافه کردید، هر سه باید به پورت یکدیگر برسند، ساعت‌شان نزدیک باشد، و یک کلیدفایل مشترک داشته باشند. آن کار را با کپی کردن داده به‌صورت پوشه انجام ندهید. عضو تازه باید با replication اولیه خودش را پر کند. این صفحه آن گسترش را اجرا نمی‌کند چون ماشین دوم در جدول آزمایشگاه نیست.

## Installation

این بخش فرض می‌کند سرویس `mongod` صفحهٔ سرور بالا است، `authorization` روشن است، و `bindIp` شامل `127.0.0.1` و `10.10.1.20` است. کلید را بسازید.

```bash
sudo install -d -o root -g mongodb -m 0750 /etc/mongodb
openssl rand -base64 756 | sudo tee /etc/mongodb/keyfile >/dev/null
sudo chown mongodb:mongodb /etc/mongodb/keyfile
sudo chmod 0400 /etc/mongodb/keyfile
sudo install -d -o root -g root -m 0750 /var/backups/mongodb
```

خروجی `openssl` را در ترمینال خودتان تکرار نکنید و در تیکت نگذارید. `tee` از طریق `sudo` فایل را می‌سازد. اگر `tee` را بدون `sudo` به مسیر محافظت‌شده بزنید شکست می‌خورد و کلید به صفحهٔ ترمینال برمی‌گردد؛ همان دستور بالا را استفاده کنید.

در `/etc/mongod.conf` کنار `authorization` که از قبل هست، کلیدفایل و نام مجموعه را بگذارید. بخش تکراری `security` نسازید.

```yaml
security:
  authorization: enabled
  keyFile: /etc/mongodb/keyfile
replication:
  replSetName: rs0
```

```bash
sudo systemctl restart mongod
sudo systemctl status mongod --no-pager
```

اگر سرویس بالا نیامد، تقریباً همیشه مجوز کلید یا تورفتگی YAML است. `sudo namei -l /etc/mongodb/keyfile` باید مالک `mongodb` و دسترسی خواندن فقط برای مالک را نشان دهد.

راه‌اندازی مجموعه. فایل زیر را اجرا کنید، نه یک initiate خالی.

```bash
sudo tee /root/rs-init.js >/dev/null <<'EOF'
rs.initiate({
  _id: "rs0",
  members: [
    { _id: 0, host: "10.10.1.20:27017" }
  ]
})
EOF
sudo chmod 0600 /root/rs-init.js
mongosh --host 127.0.0.1 --username root --password --authenticationDatabase admin /root/rs-init.js
```

چند ثانیه صبر کنید و وضعیت را بگیرید.

```bash
mongosh --host 127.0.0.1 --username root --password --authenticationDatabase admin --quiet --eval 'rs.status().members.map(function (m) { return m.name + " " + m.stateStr })'
```

باید یک عضو `10.10.1.20:27017` با حالت `PRIMARY` ببینید. `ok` خود initiate هم باید `1` بوده باشد.

## Configuration

رشتهٔ اتصال برنامه روی `app-1` باید نام مجموعه را داشته باشد وگرنه بعضی درایورها به حالت مستقل برمی‌گردند و تراکنش دوباره رد می‌شود.

```text
mongodb://app_user:change-me@10.10.1.20:27017/app?authSource=admin&replicaSet=rs0
```

کاربر دامپ، جدا از `app_user`. نقش `backup` خواندن برای دامپ است نه نوشتن.

```bash
sudo tee /root/mongo-create-backup-user.js >/dev/null <<'EOF'
db = db.getSiblingDB("admin")
db.createUser({
  user: "backup_user",
  pwd: "change-me",
  roles: [ { role: "backup", db: "admin" } ]
})
EOF
sudo chmod 0600 /root/mongo-create-backup-user.js
mongosh --host 127.0.0.1 --username root --password --authenticationDatabase admin /root/mongo-create-backup-user.js
sudo tee /etc/mongodb/backup.pass >/dev/null <<'EOF'
change-me
EOF
sudo chmod 0600 /etc/mongodb/backup.pass
```

:::warning رمز نمونه
رمز فایل و رمز کاربر را با هم عوض کنید. اگر فقط فایل را عوض کنید، اسکریپت با رمز تازه به موتوری می‌رود که هنوز رمز قدیمی دارد.
:::

اسکریپت شبانه به‌عنوان ریشه. رمز در آرگومان فرایند دیده می‌شود برای کسی که روی این میزبان بتواند فهرست فرایند را به‌عنوان ریشه بخواند. `set -x` نگذارید.

```bash
sudo tee /usr/local/sbin/backup-mongo-app.sh >/dev/null <<'EOF'
#!/usr/bin/env bash
set -euo pipefail
umask 077
dest="/var/backups/mongodb"
stamp="$(date +%F-%H%M)"
mkdir -p "$dest"
avail="$(df --output=avail -B1 /var/backups | tail -n 1)"
if [ "$avail" -lt 1073741824 ]; then
  echo "mongo backup: less than 1 GiB free on /var/backups" >&2
  exit 1
fi
pass="$(cat /etc/mongodb/backup.pass)"
mongodump \
  --host 127.0.0.1 \
  --port 27017 \
  --username backup_user \
  --password="$pass" \
  --authenticationDatabase admin \
  --db app \
  --archive="${dest}/app-${stamp}.archive.gz" \
  --gzip
unset pass
find "$dest" -type f -name 'app-*.archive.gz' -mtime +14 -print -delete
echo "mongo backup ok ${stamp}"
EOF
sudo chmod 0750 /usr/local/sbin/backup-mongo-app.sh
sudo tee /etc/cron.d/mongo-app-backup >/dev/null <<'EOF'
SHELL=/bin/bash
PATH=/usr/sbin:/usr/bin:/sbin:/bin
40 2 * * * root /usr/local/sbin/backup-mongo-app.sh >> /var/log/mongo-backup.log 2>&1
EOF
sudo chmod 0644 /etc/cron.d/mongo-app-backup
```

## Production Example

تراکنش را با کاربر مدیر روی خود `db-1` ثابت کنید. برنامه از `app-1` همان کار را با `app_user` می‌کند اگر رشتهٔ اتصال `replicaSet=rs0` داشته باشد.

```bash
mongosh --host 127.0.0.1 --username root --password --authenticationDatabase admin --quiet <<'EOF'
const s = db.getMongo().startSession()
s.startTransaction()
s.getDatabase("app").orders.insertOne({ sku: "C-9", qty: 1 })
s.commitTransaction()
s.endSession()
print(db.getSiblingDB("app").orders.countDocuments())
EOF
```

عدد باید یکی بیشتر از قبل باشد. اگر خطا گفت replica set لازم است، `rs.status` را دوباره ببینید؛ یا initiate نشده یا درایور هنوز به میزبان مستقل وصل است.

change stream را فقط به‌عنوان آزمون کوتاه باز کنید و با Ctrl+C ببندید. این فرمان تا سند جدید بیاید باز می‌ماند.

```bash
mongosh --host 127.0.0.1 --username root --password --authenticationDatabase admin app --eval 'const c = db.orders.watch([], { maxAwaitTimeMS: 2000 }); print(c.hasNext() ? "event" : "no-event-yet")'
```

خروجی `no-event-yet` هم موفقیت است: فرمان watch روی مجموعهٔ تک‌عضوی قبول شده. روی `mongod` بدون replica همین فرمان خطا می‌دهد.

دامپ و بازیابی آزمون:

```bash
sudo /usr/local/sbin/backup-mongo-app.sh
latest="$(sudo ls -1t /var/backups/mongodb/app-*.archive.gz | head -n 1)"
mongorestore --host 127.0.0.1 --username root --password --authenticationDatabase admin \
  --nsFrom='app.*' --nsTo='app_restore.*' \
  --archive="$latest" --gzip
mongosh --host 127.0.0.1 --username root --password --authenticationDatabase admin --quiet --eval 'print("app " + db.getSiblingDB("app").orders.countDocuments()); print("app_restore " + db.getSiblingDB("app_restore").orders.countDocuments())'
```

دو عدد باید برابر باشند. بعد کپی را پاک کنید.

```bash
mongosh --host 127.0.0.1 --username root --password --authenticationDatabase admin --quiet --eval 'db.getSiblingDB("app_restore").dropDatabase()'
```

روی Docker، مجموعهٔ تک‌عضوی جدا از سرویس بدون replica صفحهٔ قبل است. این Compose را با نام volume دیگر بالا بیاورید تا دادهٔ `app-mongodb-data` را قاطی نکنید. کلیدفایل باید مال همان uid داخل ایمیج باشد. عدد را از `docker run --rm --entrypoint id mongo:8` بگیرید. نمونهٔ ایمیج رسمی `999` است.

```bash
sudo install -d -m 0755 /opt/apps/mongodb-rs
openssl rand -base64 756 | sudo tee /opt/apps/mongodb-rs/keyfile >/dev/null
sudo chown 999:999 /opt/apps/mongodb-rs/keyfile
sudo chmod 0400 /opt/apps/mongodb-rs/keyfile
```

اگر `id` عدد دیگری داد، `999` را عوض کنید. فایل محیط و Compose را در همان پوشه بگذارید. پورت میزبان `27018` است تا با نمونهٔ بدون replica روی `27017` تصادم نکند.

```bash
sudo tee /opt/apps/mongodb-rs/.env >/dev/null <<'EOF'
MONGO_INITDB_ROOT_USERNAME=root
MONGO_INITDB_ROOT_PASSWORD=change-me
EOF
sudo chmod 0600 /opt/apps/mongodb-rs/.env
sudo tee /opt/apps/mongodb-rs/compose.yaml >/dev/null <<'EOF'
name: app-mongodb-rs
services:
  mongodb:
    image: mongo:8
    container_name: app-mongodb-rs
    restart: unless-stopped
    env_file:
      - .env
    ports:
      - "127.0.0.1:27018:27017"
    volumes:
      - app-mongodb-rs-data:/data/db
      - ./keyfile:/data/keyfile:ro
    command:
      - "--replSet"
      - "rs0"
      - "--bind_ip_all"
      - "--keyFile"
      - "/data/keyfile"
volumes:
  app-mongodb-rs-data:
    name: app-mongodb-rs-data
EOF
cd /opt/apps/mongodb-rs
sudo docker compose up -d
sudo docker compose logs --tail 30 mongodb
```

رمز `.env` را قبل از `up` عوض کنید. initiate را از داخل کانتینر و با `127.0.0.1:27017` بزنید. پورت منتشرشدهٔ میزبان `27018` است و نباید داخل پیکربندی مجموعه نوشته شود، چون بقیهٔ اعضای آینده و خود `mongod` پورت داخلی را می‌بینند.

```bash
sudo tee /opt/apps/mongodb-rs/rs-init.js >/dev/null <<'EOF'
rs.initiate({
  _id: "rs0",
  members: [
    { _id: 0, host: "127.0.0.1:27017" }
  ]
})
EOF
sudo docker compose -f /opt/apps/mongodb-rs/compose.yaml cp /opt/apps/mongodb-rs/rs-init.js mongodb:/tmp/rs-init.js
sudo docker compose -f /opt/apps/mongodb-rs/compose.yaml exec -it mongodb mongosh --username root --password --authenticationDatabase admin /tmp/rs-init.js
```

این میزبان `127.0.0.1` فقط برای کلاینت داخل همان کانتینر درست است. درایور بیرون از شبکهٔ Compose این مجموعه را درست کشف نمی‌کند. نام `mongodb` به‌درد سرویس هم‌پروژه می‌خورد، نه به‌درد `app-1`. به همین دلیل برنامهٔ `app-1` باید به نصب بسته‌ای `db-1` وصل شود، جایی که میزبان عضو `10.10.1.20:27017` است، نه به این کانتینر.

## Security Notes

- کلیدفایل `0400` است. `0644` باعث می‌شود `mongod` از بالا آمدن امتناع کند، و این رفتار درست است.
- تک‌عضو را در نمودار تولید «کلاستر HA» صدا نکنید.
- `backup_user` نقش `restore` ندارد. آزمون بازیابی با `root` و با دست است.
- آرشیو دامپ دادهٔ واقعی است. `0600` و بیرون از گیت.
- رمز دامپ در خط فرمان اسکریپت برای ریشه قابل دیدن است. اسکریپت را جهان‌خوانا نکنید و `set -x` اضافه نکنید.
- `rs.initiate` را با میزبان `127.0.0.1` روی `db-1` نزنید اگر برنامه از `app-1` وصل می‌شود. درایور بعد از کشف، به localhost خودش می‌رود.
- سه عضو را روی یک دیسک با سه کانتینر تقلید نکنید و اسمش را تولید نگذارید. خرابی همان دیسک هر سه «عضو» را با هم می‌برد.

## Troubleshooting

| نشانه | علت محتمل | کار |
| --- | --- | --- |
| `BadValue: security.keyFile is required` | replica با auth و بدون کلید | کلید را با مالک و `0400` بگذارید و ری‌استارت |
| `permissions are too open` روی keyFile | مجوز شل‌تر از `0400` | `chmod 0400` و مالک `mongodb` |
| `mongod` بالا است ولی `rs.status` می‌گوید no replset config | initiate اجرا نشده | همان فایل `rs-init.js` |
| برنامه تراکنش را رد می‌کند ولی `rs.status` سالم است | رشتهٔ اتصال `replicaSet` ندارد | پارامتر را اضافه کنید |
| درایور به `127.0.0.1` ماشین خودش می‌رود | میزبان عضو اشتباه ثبت شده | `rs.conf()` را ببینید. میزبان باید `10.10.1.20:27017` باشد |
| `not primary` | انتخاب هنوز تمام نشده یا عضو به آدرس خودش نمی‌رسد | ده ثانیه صبر، بعد `rs.status` و تطبیق با `bindIp` |
| `mongodump` خطای دسترسی | با `app_user` دامپ می‌گیرید | `backup_user` و `authSource=admin` |
| تعداد `app_restore` صفر است | آرشیو خالی یا نام فضا غلط است | `mongorestore` را با `--dryRun` یک‌بار ببینید و مسیر `--nsFrom` را با `app.*` نگه دارید |
| از `app-1` به کانتینر Docker نمی‌رسید | طراحی بخش Docker این صفحه | از `db-1` بسته‌ای استفاده کنید |

حالت عضو:

```bash
mongosh --host 127.0.0.1 --username root --password --authenticationDatabase admin --quiet --eval 'rs.isMaster().setName + " primary=" + rs.isMaster().primary'
```

باید `rs0` و `10.10.1.20:27017` باشد.

## Best Practices

- قبل از اینکه برنامه تراکنش را روشن کند، `rs.status` باید `PRIMARY` نشان دهد. ترتیب را برعکس نکنید.
- در مستند داخلی بنویسید این مجموعه یک عضو دارد و failover ندارد.
- سه عضو آینده روی سه میزبان و سه دیسک. داور جای کپی داده نیست.
- میزبان ثبت‌شده در مجموعه همان آدرسی باشد که کلاینت واقعی می‌تواند باز کند.
- دامپ شبانه با نقش `backup`، بازیابی با نقش مدیر، آزمون با مقایسهٔ تعداد و حذف `app_restore`.
- کلیدفایل و `backup.pass` را با خود آرشیو داده در یک باکت عمومی نگذارید.
- کپی آرشیو را از `db-1` خارج کنید. ۱۴ روز روی همان دیسک در برابر خرابی دیسک کافی نیست.
- دستور initiate سه‌عضوی را از حافظه روی این `db-1` اجرا نکنید. میزبان‌هایی که در آزمایشگاه نیستند را وارد `rs.conf` این ماشین نکنید وگرنه مجموعه دنبال عضوی می‌گردد که وجود ندارد و نوشتن متوقف می‌شود.
