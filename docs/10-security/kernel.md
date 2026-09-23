---
title: امنیت کرنل
sidebar_position: 6
description: "sysctl در 99-hardening.conf با دلیل و عارضهٔ هر کلید. روی سرور برنامه ip_forward خاموش است و راه‌اندازی دوباره لازم نیست."
---

# امنیت کرنل

## مقدمه

این صفحه چند کلید sysctl را روی Ubuntu 26.04 تنظیم می‌کند تا رفتار شبکه و افشای آدرس هسته از پیش‌فرض شل‌تر نباشد. فایل `/etc/sysctl.d/99-hardening.conf` است. هر کلید یک دلیل دارد و یک عارضه. کلیدی که رفتار شبکه را می‌شکند، حتی اگر در فهرست‌های «سخت‌سازی کامل» باشد، اینجا نیست.

اعمال با `sysctl --system` است. راه‌اندازی دوباره لازم نیست. همان دستور، مقدار را همین حالا در هستهٔ در حال اجرا می‌گذارد و فایل، آن را بعد از بوت بعدی هم برمی‌گرداند، چون systemd-sysctl هنگام بالا آمدن این پوشه را می‌خواند.

میزبان نمونهٔ توضیح، سرور برنامه `app-1` (`10.10.1.10`) است. آنجا `ip_forward` صفر است. روی `docker-1` این صفر غلط است و پایین جدا آمده. فایل را کورکورانه بین نقش‌ها کپی نکنید.

## مفهوم اصلی

sysctl کلیدهای زمان اجرای هسته است. مقدار داخل فایل تا وقتی `sysctl --system` یا بوت اجرا نشود، فقط متن است. مقدار داخل هسته تا وقتی در فایل نباشد، با بوت بعدی برمی‌گردد. هر دو را با هم می‌خواهیم.

`ip_forward` اگر ۱ باشد، میزبان بسته‌ای را که مال خودش نیست عبور می‌دهد. این کار روتر است و کار میزبان Docker که بین پل کانتینر و کارت شبکه NAT می‌کند. سرور برنامهٔ این آزمایشگاه روتر نیست و موتور کانتینر نیست. صفر یعنی اگر کسی یک مسیر غلط به این میزبان اشاره کند، میزبان آن را به شبکهٔ داخلی بازنمی‌فرستد.

`rp_filter` فیلتر مسیر برگشت است. در حالت سخت (۱)، هسته بسته‌ای را که از رابطی آمده که از آن رابط به مبدأ برنمی‌گشت دور می‌ریزد. این جلوی بعضی جعل مبدأها را می‌گیرد. عارضه‌اش روی میزبان چندمسیره و بعضی VPNهاست که ترافیک نامتقارن سالم دارند. آزمایشگاه ما روی این سرورها یک مسیر پیش‌فرض دارد. حالت ۱ مناسب است. اگر روزی تونل اضافه شد و ترافیک سالم افتاد، اول این کلید را مظنون بدانید نه DNS را.

`tcp_syncookies` وقتی صف SYN پر شود، به جای قطع کامل دست‌دهی، کوکی می‌فرستد تا جعل انبوه SYN حافظه را نخورد. در ترافیک عادی اثری ندارد. عارضه فقط هنگام خود حمله است: بعضی گزینه‌های TCP در آن دست‌دهی شلوغ ممکن است حفظ نشوند و همان اتصال‌ها کمی کندتر شوند. این از مردن سرویس بهتر است.

رد کردن redirect یعنی میزبان، مسیرش را با پیام ICMP یک میزبان دیگر عوض نمی‌کند. در شبکهٔ سالم، مسیر پیش‌فرض را خود مدیر یا DHCP درست گذاشته و redirect لازم نیست. عارضه: اگر یک دروازهٔ بدطراحی‌شده واقعاً با redirect شما را به مسیر بهتر بفرستد، این میزبان آن میانبر را یاد نمی‌گیرد و همان مسیر پیش‌فرض را ادامه می‌دهد. در آزمایشگاه مسیرها ثابت‌اند و این عارضه دیده نمی‌شود. فرستادن redirect را هم خاموش می‌کنیم چون `app-1` روتر نیست و نباید به دیگران مسیر یاد بدهد.

`kptr_restrict` برابر ۲ اشاره‌گرهای هسته را از همه، از جمله کاربرانی که جز این می‌توانستند `kallsyms` بخوانند، پنهان می‌کند مگر امتیاز کافی داشته باشند. این خواندن نقشهٔ هسته را برای اکسپلویت محلی سخت‌تر می‌کند. عارضه: پروفایلر و خواندن oops برای کاربر غیرممتاز بی‌فایده می‌شود. `ops` با `sudo` هنوز می‌تواند عیب‌یابی کند.

`dmesg_restrict` برابر ۱ بافر حلقوی هسته را از کاربر عادی می‌گیرد. عارضه: `dmesg` بدون sudo خالی یا خطای مجوز است. همان را در رویهٔ تیم بنویسید تا کسی فکر نکند دیسک هسته خراب است.

کلیدهایی که اینجا عمداً نیستند: خاموش کردن IPv6، صفر کردن `tcp_timestamps` برای همه، و بستن user namespace. هر کدام در این آزمایشگاه چیز سالمی را می‌شکند. Chromium برای جعبهٔ شنی‌اش و Docker برای حالت‌های غیرممتاز به user namespace حساس‌اند. IPv6 را اگر UFW پوشش می‌دهد نباید از هسته کند تا یک برنامهٔ محلی گیج شود.

## چرا استفاده می‌شود؟

پیش‌فرض Ubuntu برای خیلی از این کلیدها از قبل محتاط است. دلیل نوشتن فایل این است که مقدار، مستند و پایدار باشد و یک بسته یا یک آزمایش موقت آن را بی‌صدا برنگرداند. `sysctl --system` بعد از تغییر، و خواندن دوبارهٔ همان کلید، تنها اثبات است.

دلیل دوم این است که `ip_forward` روی نقش‌ها یکی نیست. اگر فقط به حافظه بسپارید، نفر بعدی فایل `app-1` را روی `docker-1` کپی می‌کند و کانتینر دیگر به رجیستری و به دیتابیس نمی‌رسد. بودن دو فایل، یا بودن یک فایل با یک خط متفاوت، این تفاوت را قابل دیدن می‌کند.

## Architecture

```text
/etc/sysctl.d/99-hardening.conf
        │
        │  sudo sysctl --system
        ▼
هستهٔ در حال اجرا
        │
        ├── app-1، db-1، پروکسی، پایش، GitLab
        │     ip_forward = 0
        │     rp_filter = 1
        │     syncookies = 1
        │     accept_redirects = 0
        │     send_redirects = 0
        │     kptr_restrict = 2
        │     dmesg_restrict = 1
        │
        └── docker-1
              همان‌ها، به‌جز ip_forward
              این کلید را در فایل این میزبان صفر نکنید
              Docker خودش عبور را لازم دارد

بوت بعدی: systemd-sysctl همان پوشه را دوباره می‌خواند
reboot برای اعمال این فایل لازم نیست
```

عدد `99` در نام فایل یعنی دیرتر از فایل‌های بسته خوانده شود و مقدار ما بماند، تا جایی که یک فایل دیگر بعد از آن دوباره همان کلید را ست نکند. اگر `sysctl` مقدار غیرمنتظره نشان داد، `grep` در `/etc/sysctl.d` و `/usr/lib/sysctl.d` کلید را پیدا کنید. آخرین فایل برنده است، برخلاف `sshd` که اولین مقدار برنده است. این فرق را قاطی نکنید.

## Installation

چیزی برای نصب نیست. ابزار `sysctl` در بستهٔ procps از قبل هست. پوشه را چک کنید و فایل را با `sudoedit` بسازید:

```bash
ls /etc/sysctl.d
sudoedit /etc/sysctl.d/99-hardening.conf
```

قبل از تغییر، مقدار فعلی را یادداشت کنید تا اگر عارضه دیدید بدانید به چه برگردید:

```bash
sysctl net.ipv4.ip_forward net.ipv4.conf.all.rp_filter net.ipv4.tcp_syncookies kernel.kptr_restrict kernel.dmesg_restrict
```

## Configuration

این فایل برای `app-1` و برای هر میزبانی است که روتر نیست و Docker Engine ندارد. نظر انگلیسی داخل فایل عمدی است تا کسی که فقط فایل را روی سرور باز می‌کند دلیل را ببیند:

```text
# /etc/sysctl.d/99-hardening.conf
# Role: app server, database, proxy, monitor, GitLab.
# Do not copy ip_forward=0 onto docker-1.

# This host is not a router. Packets that are not for us are not forwarded.
# Side effect: breaks Docker NAT and any VM bridge that relies on forwarding.
net.ipv4.ip_forward = 0

# Drop packets that arrive on an interface we would not use to reach the source.
# Side effect: breaks asymmetric routing and some VPN layouts.
net.ipv4.conf.all.rp_filter = 1
net.ipv4.conf.default.rp_filter = 1

# When the SYN queue overflows, answer with SYN cookies instead of failing open.
# Side effect: during a flood, some TCP options on those handshakes may be lost.
net.ipv4.tcp_syncookies = 1

# Do not learn routes from ICMP redirects. Lab gateways are static.
# Side effect: a legitimate redirect from a sloppy gateway is ignored.
net.ipv4.conf.all.accept_redirects = 0
net.ipv4.conf.default.accept_redirects = 0
net.ipv6.conf.all.accept_redirects = 0
net.ipv6.conf.default.accept_redirects = 0

# This host must not tell other machines to change their routes.
# Side effect: none on a single-homed server that is not a gateway.
net.ipv4.conf.all.send_redirects = 0
net.ipv4.conf.default.send_redirects = 0

# Ignore source-routed packets. The lab does not use source routing.
# Side effect: none here. A network that still source-routes would break.
net.ipv4.conf.all.accept_source_route = 0
net.ipv4.conf.default.accept_source_route = 0

# Log packets refused by reverse-path filtering. Watch disk if this is noisy.
net.ipv4.conf.all.log_martians = 1

# Hide kernel pointers from unprivileged users.
# Side effect: profiling and oops decoding need a privileged account.
kernel.kptr_restrict = 2

# Hide the kernel ring buffer from unprivileged users.
# Side effect: dmesg without sudo fails. That is intended.
kernel.dmesg_restrict = 1
```

روی `docker-1` همین فایل را کپی کنید و فقط خط `ip_forward` را برندارید یا آن را ۱ نگذارید داخل فایلی که فکر می‌کنید «استاندارد امن» است. عمل درست: آن دو خط `ip_forward` را در فایل این میزبان ننویسید تا Docker مقدار لازم خودش را نگه دارد. بقیهٔ کلیدها روی `docker-1` همان عارضه‌های بالا را دارند و قابل قبول‌اند. `rp_filter` سخت روی میزبان داکر تک‌کارته با یک کارت معمولاً مشکل نمی‌سازد. اگر شبکهٔ کانتینر نامتقارن شد، همان کلید اولین مظنون است.

اعمال، بدون reboot:

```bash
sudo sysctl --system
sysctl net.ipv4.ip_forward \
  net.ipv4.conf.all.rp_filter \
  net.ipv4.conf.default.rp_filter \
  net.ipv4.tcp_syncookies \
  net.ipv4.conf.all.accept_redirects \
  net.ipv4.conf.all.send_redirects \
  net.ipv6.conf.all.accept_redirects \
  kernel.kptr_restrict \
  kernel.dmesg_restrict
```

روی `app-1` مقدار `net.ipv4.ip_forward` باید `0` باشد. روی `docker-1` باید `1` بماند اگر کانتینر در حال اجرا مسیر بیرون دارد. اگر آنجا `0` شد، خط را از فایل بردارید، دوباره `sysctl --system` بزنید، و اگر Docker آن را برنمی‌گرداند یک بار `sudo systemctl restart docker` بزنید و دوباره `sysctl net.ipv4.ip_forward` را ببینید. restart داکر کانتینرهایی را که سیاست راه‌اندازی مجدد ندارند می‌خواباند. در ساعت اداری انجام دهید.

`log_martians` اگر لاگ هسته را پر کرد، یعنی واقعاً بستهٔ عجیب می‌رسد یا `rp_filter` ترافیک سالم را دور می‌ریزد. در آن حالت اول مبدأ بسته را بفهمید، بعد اگر لازم بود فقط همین کلید را ۰ کنید. بقیهٔ فایل را به‌خاطر شلوغی لاگ پاک نکنید.

## Production Example

`app-1` فایل بالا را دارد. از خود میزبان، بعد از `sysctl --system`، یک اتصال معمولی را امتحان کنید: SSH برقرار بماند، `getent hosts gitlab.example.internal` جواب بدهد، و برنامه به `db-1` پورت `5432` برسد اگر فایروال اجازه داده. این کلیدها نباید این سه را بشکنند. اگر SSH همان لحظه افتاد، مقصر این فایل نیست. دنبال UFW و `sshd` باشید. sysctl مسیر پیش‌فرض را پاک نمی‌کند.

`docker-1` را جدا امتحان کنید:

```bash
sysctl net.ipv4.ip_forward
sudo -u deploy docker compose -f /opt/apps/app/compose.yml ps
```

کانتینر `app` باید همچنان بالا باشد و از خود `docker-1` بشود رجیستری را حل کرد. اگر `ip_forward` صفر است و کانتینر بیرون را نمی‌بیند، همان خطای کپی فایل `app-1` است.

`dmesg` با کاربر `ops` بدون sudo باید رد شود. با sudo باید بافر را نشان دهد. این را همان روز به تیم بگویید:

```bash
dmesg
sudo dmesg | tail -n 5
```

خط اول شکست مجوز است. خط دوم باید چند خط هسته نشان دهد. اگر خط دوم هم خالی است، مشکل از restrict نیست. هسته چیزی ننوشته یا شما در گروه sudo نیستید.

## Security Notes

این فایل جلوی ورود SSH با رمز را نمی‌گیرد و جای UFW نیست. کسی که root دارد همهٔ این مقدارها را همان لحظه عوض می‌کند. هدف، سخت‌تر کردن کار یک فرایند محلی بدون امتیاز و یک بستهٔ جعلی ساده است، نه مقاومت در برابر مدیر.

`kptr_restrict=2` و `dmesg_restrict=1` را «مخفی‌کاری» ندانید که دیگر نیازی به به‌روزرسانی هسته نیست. این‌ها فقط خواندن نقشه را برای کاربر عادی سخت‌تر می‌کنند. وصلهٔ هسته هنوز از راه به‌روزرسانی امنیتی می‌آید و گاهی reboot می‌خواهد. آن reboot را این صفحه حذف نمی‌کند. صفحهٔ بوت‌استرپ نشان می‌دهد کی `/var/run/reboot-required` ساخته می‌شود.

`log_martians=1` ممکن است آدرس داخلی را در لاگ بنویسد. لاگ را جهان‌خوانا نکنید. journal به‌طور پیش‌فرض برای کاربر عادی محدود است و با `dmesg_restrict` هم‌جهت است.

روی میزبان چند کارت، `rp_filter=1` را قبل از پنجرهٔ شلوغی اعمال کنید و یک نشست کنسول داشته باشید. اگر تنها راه مدیریت همان مسیری است که فیلتر می‌کند، خودتان را بیرون می‌اندازید. آزمایشگاه تک‌مسیره این خطر را کم دارد، نه صفر، اگر کسی مسیر سیاستی اضافه کرده باشد.

## Troubleshooting

| نشانه | کار |
| --- | --- |
| `sysctl --system` یک خط را نمی‌شناسد | همان خط را بردارید. نام کلید را از آموزش هستهٔ قدیمی کپی کرده‌اید. بقیهٔ فایل را اعمال کنید |
| مقدار بعد از دستور هنوز کهنه است | فایل دیگری دیرتر همان کلید را ست کرده. `grep -R` نام کلید را در `sysctl.d` پیدا کنید |
| کانتینر اینترنت و دیتابیس را از دست داده | `ip_forward` روی `docker-1` صفر شده. خط را حذف کنید و سرویس Docker را در ساعت اداری راه بیندازید |
| VPN تازه یک‌طرفه شده | `rp_filter` سخت. موقتاً همان کلید را روی همان میزبان به ۲ (حالت شل) ببرید و دلیل را بنویسید. آن را روی همهٔ میزبان‌ها شل نکنید |
| `dmesg` برای `ops` خطا می‌دهد | رفتار `dmesg_restrict` است. `sudo dmesg` |
| برنامه به مسیر بهتر نمی‌رود و دروازه redirect می‌فرستد | `accept_redirects` صفر است. مسیر ثابت درست را روی میزبان بگذارید. redirect را روشن نکنید |
| بعد از reboot مقدار برگشته | فایل در `/etc/sysctl.d` نیست یا نامش طوری است که خوانده نمی‌شود. پسوند باید `.conf` باشد |

برای دیدن اینکه هسته همین حالا چه دارد، `sysctl` کافی است. خواندن `/proc/sys/net/ipv4/ip_forward` همان مقدار است اگر بخواهید بدون ابزار نگاه کنید. تغییر دادن `/proc` با دست را عادت نکنید. با reboot فراموش می‌شود و با فایل شما دو منبع حقیقت می‌سازد.

## Best Practices

- هر کلید را با یک جمله دلیل و یک جمله عارضه نگه دارید. کلیدی که عارضه‌اش را نمی‌دانید به فایل اضافه نکنید.
- `ip_forward=0` مال سرور برنامه است. مال `docker-1` نیست.
- reboot را برای این فایل منتظر نمانید و برای وصلهٔ هسته حذفش نکنید. این دو موضوع جدایند.
- IPv6 و user namespace را با این فایل خاموش نکنید. UFW نسخهٔ ۶ را پوشش می‌دهد و Chromium و Docker به namespace حساس‌اند.
- بعد از اعمال، یک اتصال واقعی بزنید: SSH، DNS، و اگر میزبان داکر است یک `docker compose ps`.
- وقتی میزبان پایدار شد، [بکاپ](/docs/10-security/backup) این فایل را هم با `/etc` می‌برد. بدون بکاپ، سخت‌سازی فقط روی دیسکی است که فردا ممکن است عوض شود.
