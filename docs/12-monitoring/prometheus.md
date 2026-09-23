---
sidebar_position: 5
title: Prometheus و هشدار
description: Prometheus 3.13.3، node_exporter، Alertmanager 0.34.1، و قانون دیسک و down روی شبکهٔ داخلی.
---

# Prometheus و هشدار

## مقدمه

Prometheus متریک را از هدف‌ها می‌کشد، روی دیسک `mon-1` نگه می‌دارد، و قانون را ارزیابی می‌کند. Alertmanager تصمیم می‌گیرد همان هشدار به کجا برسد. node_exporter روی هر میزبان عدد سیستم را روی پورت 9100 می‌گذارد. این سه با هم پایش شبانهٔ آزمایشگاه‌اند. Grafana در صفحهٔ بعد فقط همین داده‌ها را نشان می‌دهد.

نسخهٔ Prometheus در این دانشنامه `3.13.3` است. باینری `prometheus-3.13.3.linux-amd64` از صفحهٔ `https://prometheus.io/download/` است و ایمیج معادل `prom/prometheus:v3.13.3`. روی همان صفحه انتشار `3.14` هم هست و از این نسخه جدیدتر است، ولی پنجرهٔ پشتیبانی‌اش کوتاه است. `3.13.3` خط LTS است و استقرار این دانشنامه عمداً همان است. نامزد انتشار را هم نصب نکنید، حتی اگر بالای جدول دانلود باشد.

Alertmanager را با ایمیج `prom/alertmanager:v0.34.1` قفل می‌کنیم. اگر باینری می‌خواهید، همان نسخه از همان صفحهٔ دانلود است: `alertmanager-0.34.1.linux-amd64`.

## مفهوم اصلی

Prometheus خودش عامل میزبان نیست. یک فرآیند روی `10.10.1.40` است که طبق فایل `/etc/prometheus/prometheus.yml` به هدف‌ها درخواست HTTP می‌زند. اگر هدف جواب ندهد، متریک `up` برای آن هدف صفر می‌شود. این صفر یعنی scrape شکست خورده. همیشه یعنی کرنل خاموش نیست. فایروال، آدرس غلط، و exporter خوابیده هم `up` را صفر می‌کنند.

node_exporter متریک هسته و دیسک و فایل‌سیستم را منتشر می‌کند. نام‌هایی که این صفحه به آن‌ها تکیه می‌کند `up` و `node_filesystem_avail_bytes` و `node_filesystem_size_bytes` هستند. این‌ها سال‌ها پایدار مانده‌اند. قانون دیسک از تقسیم فضای آزاد ریشه بر اندازهٔ ریشه ساخته می‌شود و آستانه‌اش همان سیاست [پایش منبع](./resource-monitoring) است: زیر ۱۵ درصد آزاد، یعنی بالای حدود ۸۵ درصد پر، برای اقدام. آن صفحه از ۸۰ درصد حرف از برنامه‌ریزی می‌زند. هشدار صفحه‌ای این‌جا کمی دیرتر آتش می‌شود تا صندوق را پر نکند، و همچنان قبل از ۹۵ درصد است.

قانون‌ها فایل جدا زیر `/etc/prometheus/rules` هستند. Alertmanager روی `10.10.1.40:9093` است. Prometheus هشدار firing را به آنجا می‌فرستد. گیرندهٔ نامه فقط وقتی واقعی است که سازمان یک relay داده باشد. تا آن روز هشدار را در خود Alertmanager می‌بینید و گیرندهٔ خالی را تولید حساب نمی‌کنید.

## چرا استفاده می‌شود؟

Netdata و `df` کسی را از خواب بیدار نمی‌کنند. قانون `NodeDown` و `RootFilesystemLow` این کار را می‌کنند، به شرطی که از `mon-1` به پورت 9100 راه باشد. نگهداری پیش‌فرض محصول ۱۵ روز است. واحد این صفحه ۳۰ روز می‌گذارد. اگر دیسک `mon-1` کوچک است این عدد را پایین بیاورید تا خود پایش دیسک را پر نکند.

## Architecture

```text
app-1 10.10.1.10:9100     node_exporter ، کاربر nodeexp
db-1  10.10.1.20:9100
mon-1 10.10.1.40:9100
        ▲  scrape فقط از mon-1
Prometheus  10.10.1.40:9090
    /etc/prometheus/prometheus.yml
    /etc/prometheus/rules/*.yml
    /var/lib/prometheus          نگهداری 30d
        ▼
Alertmanager  10.10.1.40:9093
    /etc/alertmanager/alertmanager.yml
        ▼
relay نامهٔ سازمان، اگر واقعاً وجود دارد
```

پورت 9090 فقط روی `10.10.1.40` است و فایروال فقط شبکهٔ `10.10.0.0/16` را راه می‌دهد.

## Installation

کاربر و پوشه روی `mon-1`:

```bash
sudo useradd --system --home-dir /var/lib/prometheus --shell /usr/sbin/nologin prometheus
sudo useradd --system --home-dir /nonexistent --shell /usr/sbin/nologin alertmanager
sudo install -d -o prometheus -g prometheus -m 0755 /etc/prometheus /etc/prometheus/rules /var/lib/prometheus
sudo install -d -o alertmanager -g alertmanager -m 0755 /etc/alertmanager /var/lib/alertmanager
```

باینری Prometheus را از همان انتشاری بگیرید که صفحهٔ دانلود به آن پیوند می‌دهد. چک SHA256 را با فایل `sha256sums.txt` همان انتشار انجام دهید. عدد هش را از ویکی یا از این صفحه کپی نکنید. اگر خروجی `OK` نبود، نصب را متوقف کنید.

```bash
cd /tmp
curl -fL -o prometheus-3.13.3.linux-amd64.tar.gz https://github.com/prometheus/prometheus/releases/download/v3.13.3/prometheus-3.13.3.linux-amd64.tar.gz
curl -fL -o sha256sums.txt https://github.com/prometheus/prometheus/releases/download/v3.13.3/sha256sums.txt
grep 'prometheus-3.13.3.linux-amd64.tar.gz' sha256sums.txt | sha256sum -c -
```

تنها خروجی قابل قبول خطی است که با `OK` تمام شود. اگر grep خطی چاپ نکرد، آرشیو را باز نکنید.

```bash
tar -C /tmp -xzf prometheus-3.13.3.linux-amd64.tar.gz
sudo install -m 0755 /tmp/prometheus-3.13.3.linux-amd64/prometheus /usr/local/bin/prometheus
sudo install -m 0755 /tmp/prometheus-3.13.3.linux-amd64/promtool /usr/local/bin/promtool
prometheus --version
```

خروجی `prometheus --version` باید `3.13.3` باشد. Alertmanager `0.34.1` را با همین روش چک‌سام از `alertmanager-0.34.1.linux-amd64.tar.gz` نصب کنید. ایمیج معادل `prom/alertmanager:v0.34.1` است. کانفیگ میزبان `/etc/alertmanager` می‌ماند.

node_exporter را روی هر میزبان، از جمله `mon-1`، نصب کنید. شماره را از بخش node_exporter در `https://prometheus.io/download/` از ردیف Latest کپی کنید. روز نوشتن این صفحه آن ردیف `1.12.1` به تاریخ 2026-07-14 بود. اگر صفحه عدد دیگری نشان داد همان را بگذارید. الگو این است.

```bash
VERSION=1.12.1
cd /tmp
curl -fL -o "node_exporter-${VERSION}.linux-amd64.tar.gz" "https://github.com/prometheus/node_exporter/releases/download/v${VERSION}/node_exporter-${VERSION}.linux-amd64.tar.gz"
curl -fL -o sha256sums.txt "https://github.com/prometheus/node_exporter/releases/download/v${VERSION}/sha256sums.txt"
grep "node_exporter-${VERSION}.linux-amd64.tar.gz" sha256sums.txt | sha256sum -c -
tar -C /tmp -xzf "node_exporter-${VERSION}.linux-amd64.tar.gz"
sudo install -m 0755 "/tmp/node_exporter-${VERSION}.linux-amd64/node_exporter" /usr/local/bin/node_exporter
node_exporter --version
```

فهرست انتشار `https://github.com/prometheus/node_exporter/releases` است. بدون `OK` ادامه ندهید. کاربر سرویس `nodeexp` است. اگر سیاست سازمان کاربر تازه را ممنوع کرده، در واحد به‌جای آن `nobody` بگذارید و این `useradd` را نزنید. collector پیش‌فرض با هر دو بالا می‌آید.

```bash
sudo useradd --system --home-dir /nonexistent --shell /usr/sbin/nologin nodeexp
```

## Configuration

فایل `/etc/prometheus/prometheus.yml` روی `mon-1`. هدف‌ها آدرس داخلی‌اند.

```yaml
global:
  scrape_interval: 30s
  evaluation_interval: 30s

alerting:
  alertmanagers:
    - static_configs:
        - targets:
            - 10.10.1.40:9093

rule_files:
  - /etc/prometheus/rules/*.yml

scrape_configs:
  - job_name: prometheus
    static_configs:
      - targets: ["10.10.1.40:9090"]
  - job_name: node
    static_configs:
      - targets: ["10.10.1.5:9100", "10.10.1.10:9100", "10.10.1.20:9100", "10.10.1.30:9100", "10.10.1.40:9100"]
```

قانون در `/etc/prometheus/rules/node.yml`. عبارت دیسک همان متریک پایدار فایل‌سیستم است. آستانه `0.15` یعنی ۱۵ درصد آزاد، هم‌خانوادهٔ سیاست منبع، نه پیش‌فرض محصول.

```yaml
groups:
  - name: node
    rules:
      - alert: NodeDown
        expr: up{job="node"} == 0
        for: 5m
        labels:
          severity: page
      - alert: RootFilesystemLow
        expr: (node_filesystem_avail_bytes{job="node",mountpoint="/"} / node_filesystem_size_bytes{job="node",mountpoint="/"}) < 0.15
        for: 10m
        labels:
          severity: page
```

`promtool check config /etc/prometheus/prometheus.yml` باید موفقیت را صریح بگوید. اگر خطا داد واحد را روشن نکنید.

Alertmanager در `/etc/alertmanager/alertmanager.yml`. گیرندهٔ نامه را با relay واقعی عوض کنید. فایل رمز حالت `0600` و مالک `alertmanager` است. تا وقتی relay ندارید، هشدار را در رابط 9093 ببینید و یک گیرندهٔ خالی را «تمام شد» حساب نکنید.

```yaml
route:
  receiver: ops-mail
  group_by: ['alertname', 'instance']
  repeat_interval: 4h

receivers:
  - name: ops-mail
    email_configs:
      - to: ops@example.com
        from: alertmanager@example.internal
        smarthost: 10.10.1.5:587
        auth_username: alertmanager@example.internal
        auth_password_file: /etc/alertmanager/smtp_password
        require_tls: true
```

`amtool check-config /etc/alertmanager/alertmanager.yml` باید موفق باشد. بدون relay واقعی، گیرنده را خالی نگذارید و فراموش نکنید. در یادداشت بنویسید مسیر انسانی هنوز رابط 9093 است.

واحد `/etc/systemd/system/prometheus.service`:

```ini
[Unit]
Description=Prometheus
After=network-online.target
Wants=network-online.target

[Service]
User=prometheus
Group=prometheus
Type=simple
ExecStart=/usr/local/bin/prometheus --config.file=/etc/prometheus/prometheus.yml --storage.tsdb.path=/var/lib/prometheus --storage.tsdb.retention.time=30d --web.listen-address=10.10.1.40:9090
Restart=on-failure
RestartSec=5
ProtectSystem=strict
ReadWritePaths=/var/lib/prometheus

[Install]
WantedBy=multi-user.target
```

واحد node_exporter برای `app-1` است. روی میزبان‌های دیگر فقط IP را عوض کنید. اگر `nobody` می‌خواهید، همان دو خط User و Group را عوض کنید.

```ini
[Unit]
Description=Prometheus node exporter
After=network-online.target
Wants=network-online.target

[Service]
User=nodeexp
Group=nodeexp
Type=simple
ExecStart=/usr/local/bin/node_exporter --web.listen-address=10.10.1.10:9100
Restart=on-failure
RestartSec=5
ProtectSystem=strict
PrivateTmp=true

[Install]
WantedBy=multi-user.target
```

واحد Alertmanager مثل Prometheus است با کاربر `alertmanager`، پورت `10.10.1.40:9093`، و فایل `/etc/alertmanager/alertmanager.yml`. اگر به‌جای باینری از ایمیج استفاده می‌کنید، برچسب‌ها `prom/prometheus:v3.13.3` و `prom/alertmanager:v0.34.1` هستند. همان فایل‌ها را فقط‌خواندنی سوار کنید و شنود را روی همین IP نگه دارید.

```bash
sudo systemctl daemon-reload
sudo systemctl enable --now node_exporter
sudo systemctl enable --now prometheus
sudo systemctl enable --now alertmanager
ss -lnt | grep -E '9090|9093|9100'
curl -fsS --max-time 5 http://10.10.1.10:9100/metrics | grep -m1 node_filesystem_avail_bytes
sudo ufw allow from 10.10.0.0/16 to any port 9090 proto tcp comment 'prometheus lab'
sudo ufw allow from 10.10.0.0/16 to any port 9100 proto tcp comment 'node exporter lab'
```

پورت 9090 باید روی `10.10.1.40` باشد نه روی همهٔ کارت‌ها. پورت 9093 فقط از شبکهٔ عملیات.

## Production Example

### نشانه

یا نامهٔ `NodeDown` آمده، یا صبح فهمیده‌اید کسی خبردار نشده و `df` روی `/` بالای ۹۰ درصد است.

### فرضیه

برای down: exporter مرده، فایروال، یا خود Prometheus. برای دیسک: `for` ده دقیقه‌ای هنوز پر نشده، برچسب mountpoint جور نیست، یا نامه وصل نیست و فقط رابط 9093 هشدار را دارد.

### دستور مشاهده

از `mon-1` و بعد روی `app-1`:

```bash
curl -sv --max-time 5 http://10.10.1.10:9100/metrics -o /dev/null
systemctl is-active prometheus
df -hT /
systemctl is-active node_exporter
```

refused یعنی فرآیند خواب است. timeout یعنی مسیر یا فایروال. کد 200 با `up` صفر یعنی آدرس داخل فایل yml غلط است.

### تصمیم

refused و واحد inactive: همان واحد را بیاورید، reboot نکنید. timeout در حالی که از خود `app-1` به `http://10.10.1.10:9100/metrics` کد 200 می‌دهد: UFW را اصلاح کنید. `df` کم است و هشدار نیست: عبارت قانون را در Prometheus ببینید. اگر عدد هست و `for` نرسیده، صبر رفتار درست قانون است. اگر عدد نیست، mountpoint را بعد از آزاد کردن جا دقیق کنید.

### اصلاح

```bash
sudo systemctl restart node_exporter
systemctl is-active node_exporter
```

از `mon-1` دوباره به پورت 9100 وصل شوید. تا کد 200 نیامده هشدار را حل‌شده ننویسید. فاصلهٔ scrape سی ثانیه است و `for` پنج دقیقه‌ای دیر خاموش می‌شود. دیسک را طبق [دیسک پر](/docs/14-troubleshooting/disk-full) آزاد کنید و آستانه را در لحظهٔ حادثه شل نکنید.

### جلوگیری از تکرار

میزبان تازه یعنی یک خط در job مربوط به node، یک `curl` موفق از `mon-1`، و `up` برابر 1. به 3.14 فقط به‌خاطر جدید بودن نروید.

## Security Notes

رابط 9090 و 9093 احراز هویت این فصل را ندارند. شنود روی `10.10.1.40` و UFW هر دو لازم‌اند. آن‌ها را روی IP عمومی نگذارید. `smtp_password` حالت `0600` و مالک `alertmanager` است و در گیت نیست. node_exporter را به همهٔ کارت‌ها bind نکنید و collector آرگومان پروسه را روشن نکنید چون ممکن است رمز را در متریک بیاورد. باینری فقط بعد از `sha256sum -c` نصب می‌شود.

## Troubleshooting

`prometheus` در حلقهٔ restart است: `journalctl -u prometheus -n 50 --no-pager` و `promtool check config`. مالک `/var/lib/prometheus` باید کاربر `prometheus` باشد. قانون لود نمی‌شود: `promtool check rules /etc/prometheus/rules/node.yml`. همهٔ هدف‌ها با هم down شدند: اول دیسک و واحد خود `mon-1`، نه reboot همهٔ سرورها. پورت 9100 اشغال است: `ss -lntup | grep 9100` و حذف exporter دوم. نامه نمی‌رود ولی رابط 9093 هشدار را نشان می‌دهد: SMTP یا خروجی پورت 587، نه scrape.

## Best Practices

- روی 3.13.3 بمانید تا دانشنامه LTS را عوض کند. 3.14 را به‌خاطر تازگی نگیرید.
- چک‌سام را با `sha256sums.txt` همان انتشار بگیرید. `VERSION` مربوط به node_exporter را روز نصب از صفحهٔ دانلود کپی کنید.
- پورت 9090 فقط روی `10.10.1.40` و فقط شبکهٔ داخلی.
- قانون down و قانون دیسک را از روز اول داشته باشید و آستانه را با صفحهٔ منبع یکی کنید. گیرندهٔ خالی تولید نیست.
- بعد از تغییر YAML اول `promtool`، بعد reload. کانفیگ شکسته را به سرویس ندهید.
