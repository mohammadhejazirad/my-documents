---
sidebar_position: 3
title: نصب Ansible
description: نصب بستهٔ ansible روی Ubuntu 26.04، تفاوت با ansible-core، و مسیر pipx برای سری ۱۴.
---

# نصب Ansible

## مقدمه

Ansible فقط روی گرهٔ کنترل نصب می‌شود. در این آزمایشگاه آن ماشین `mon-1` (`10.10.1.40`) است. `app-1` و `db-1` و `proxy` بستهٔ `ansible` نمی‌گیرند.

دو نام بسته هست. `ansible-core` موتور است. `ansible` همان موتور به‌علاوهٔ مجموعه‌های جامعه است. برای Playbookهای این فصل بستهٔ `ansible` را نصب کنید تا از همان روز اول به‌خاطر نبودن یک مجموعه نایستید.

## مفهوم اصلی

روی Ubuntu 26.04 هر دو بسته در کامپوننت universe هستند. نسخهٔ منتشرشدهٔ `ansible-core` در انتشار Resolute، ۲.۲۰.۱ است. بستهٔ `ansible` توزیع در گزارش‌های بسته‌بندی همان دوره ۱۳.۱ است و هستهٔ ۲.۲۰.۱ را همراه دارد. این عدد را با `apt-cache policy` روی میزبان خودتان تأیید کنید. به‌روزرسانی امنیتی ممکن است بازبینی بسته را جلو ببرد بدون اینکه این صفحه همان روز عوض شود.

سری جاری جامعه، جدا از آرشیو Ubuntu، در سپتامبر ۲۰۲۶ سری ۱۴ است. ۱۴.۴.۰ در ۸ سپتامبر ۲۰۲۶ روی PyPI بوده و به هستهٔ ۲.۲۱ وابسته است. هستهٔ پایدار این خط ۲.۲۱.۴ است. هستهٔ ۲.۲۰ هنوز تا مه ۲۰۲۷ در نگهداری امنیتی بالادست است. پس بستهٔ Ubuntu کهنهٔ رهاشده نیست. فقط آخرین مجموعه‌ها را ندارد.

گرهٔ کنترل برای هستهٔ ۲.۲۰ و ۲.۲۱ باید Python بین ۳.۱۲ و ۳.۱۴ داشته باشد. میزبان مقصد برای همین هسته‌ها Python از ۳.۹ تا ۳.۱۴ می‌خواهد. هر دو را `python3 --version` جداگانه نشان می‌دهد.

`pip install ansible` داخل Python سیستم را نزنید. ارتقای بعدی apt و pip سر یک مسیر با هم دعوا می‌کنند. اگر سری ۱۴ را می‌خواهید، `pipx` محیط جدا می‌سازد.

## چرا استفاده می‌شود؟

بدون خود دستور `ansible` بقیهٔ فصل قابل اجرا نیست. انتخاب منبع نصب هم مهم است: مخلوط کردن PPA و بستهٔ Ubuntu و pip در یک سیستم، دو دودویی `ansible` در `PATH` می‌سازد و Playbook یک روز با هستهٔ ۲.۲۰ و روز بعد با ۲.۲۱ رفتار متفاوت می‌دهد.

## Architecture

```text
mon-1
  /usr/bin/ansible          از بستهٔ Ubuntu
        │
        │  SSH
        ▼
مقصدها فقط python3 دارند
```

اگر مسیر `pipx` را انتخاب کردید، دودویی زیر `~/.local/bin` کاربر `ops` است. همان کاربر باید Playbook را اجرا کند، نه root و نه کاربر دیگر که آن PATH را ندارد.

## Installation

اول ببینید کاندید از کجاست:

```bash
sudo apt update
apt-cache policy ansible ansible-core
python3 --version
```

اگر کاندید `ansible` از `resolute/universe` یا `resolute-updates/universe` است، همان را نصب کنید:

```bash
sudo apt install -y ansible
ansible --version
```

خروجی سالم هم نسخهٔ بستهٔ جامعه را نشان می‌دهد و هم هسته را. شبیه این، با شمارهٔ بازبینی که سیاست apt همان روز می‌گوید:

```text
ansible [core 2.20.1]
  config file = None
  executable location = /usr/bin/ansible
```

`config file = None` تا وقتی `ansible.cfg` نساخته‌اید طبیعی است.

روی Debian 13 هم بسته در آرشیو هست، ولی شماره را این صفحه حدس نمی‌زند. `apt-cache policy ansible` را بخوانید. اگر هسته از ۲.۱۶ قدیمی‌تر بود، برای این Playbookها از `pipx` استفاده کنید تا نحو نام کامل ماژول و رفتار فعلی را داشته باشید.

سری ۱۴ با pipx، فقط اگر عمداً از بستهٔ Ubuntu جلوتر می‌روید:

```bash
sudo apt install -y pipx
pipx ensurepath
pipx install --include-deps ansible
ansible --version
```

باید هستهٔ ۲.۲۱ را ببینید، نه ۲.۲۰ را. اگر هنوز `/usr/bin/ansible` اول PATH است، بستهٔ apt را بردارید یا مسیر pipx را جلوتر بگذارید. دو نسخه را با هم روشن نگذارید.

PPA رسمی `ppa:ansible/ansible` برای codename رزولوت بسته دارد، از جمله هستهٔ ۲.۲۱.۴ در مخزن PPA در سپتامبر ۲۰۲۶. این دانشنامه آن را پیش‌فرض نمی‌کند. اگر تیم PPA را انتخاب کرد، کلید را از مستند نصب خود Ansible بردارید و اثر انگشت منتشرشدهٔ همان مستند را با `gpg` ببینید، نه از یک وبلاگ. بعد از افزودن PPA دوباره `apt-cache policy ansible` باید نشان دهد کاندید از PPA است نه از universe.

## Configuration

کاربر `ops` روی مقصدها باید sudo داشته باشد. برای اینکه Playbook تعاملی نماند، یک فایل sudoers محدود بگذارید نه `NOPASSWD: ALL`. نمونه برای کارهایی که Playbook تولید این فصل می‌زند:

```text
ops ALL=(root) NOPASSWD: /usr/bin/apt-get, /usr/bin/systemctl, /usr/bin/timedatectl
```

فایل را با `visudo -f /etc/sudoers.d/ops-ansible` بسازید. اگر Playbook دستور دیگری خواست، همان دودویی را اضافه کنید. مسیر را با `command -v apt-get` تأیید کنید.

کلید را یک بار کپی کنید:

```bash
ssh-keygen -t ed25519 -f ~/.ssh/id_ed25519 -C "ansible@mon-1"
ssh-copy-id -i ~/.ssh/id_ed25519.pub ops@10.10.1.10
```

میزبان‌کلید را با ورود واقعی پر کنید، نه با خاموش کردن بررسی:

```bash
ssh -o StrictHostKeyChecking=accept-new ops@10.10.1.10 true
ssh -o StrictHostKeyChecking=accept-new ops@10.10.1.5 true
ssh -o StrictHostKeyChecking=accept-new ops@10.10.1.20 true
```

اگر Python مقصد نبود، یک بار و فقط همان میزبان:

```bash
ansible all -i 10.10.1.10, -m ansible.builtin.raw -a 'sudo apt-get update && sudo apt-get install -y python3' --user ops
```

ویرگول آخر بعد از IP در اینونتوری خط فرمان عمدی است. به Ansible می‌گوید این یک فهرست میزبان است نه مسیر فایل.

## Production Example

روی `mon-1` بعد از نصب:

```bash
ansible --version
ansible 10.10.1.10 -m ansible.builtin.ping -u ops
```

موفقیت شبیه این است:

```text
10.10.1.10 | SUCCESS => {
    "ping": "pong"
}
```

آکولاد این خروجی مال JSON خود Ansible است. اگر به‌جای pong خطای Python دیدید، بخش عیب‌یابی همین صفحه است.

## Security Notes

بسته را از universe Ubuntu یا از pipx رسمی PyPI بگیرید. اسکریپت نصب شخص ثالث اجرا نکنید.

کلید گرهٔ کنترل را بدون passphrase فقط وقتی بگذارید که دیسک آن ماشین رمز دارد و کلید برای انسان تعاملی نیست. در غیر این صورت عامل ssh یا passphrase را روشن نگه دارید و Playbook شبانه را با کلید جدا و sudo محدود اجرا کنید.

`pip install` با root ممنوع. `pipx` با کاربر `ops` کافی است.

## Troubleshooting

| نشانه | کار |
| --- | --- |
| `ansible: command not found` | بسته نصب نشده یا PATH مربوط به pipx در این نشست نیست. نشست را باز کنید |
| دو نسخه در `type -a ansible` | یکی را حذف کنید. `type -a` هر دو مسیر را نشان می‌دهد |
| `module python was not found` | روی مقصد `python3` نیست. دستور `raw` بالا |
| `Permission denied (publickey)` | کلید کپی نشده یا کاربر `ops` نیست. اول خود `ssh` را امتحان کنید |
| `Missing sudo password` | sudoers محدود را نگذاشته‌اید. موقتاً `ansible-playbook --ask-become-pass` تا فایل sudoers درست شود |
| PPA و universe هر دو کاندیدند | `apt-cache policy` را بخوانید. pin را عمدی کنید، وگرنه ارتقای بعدی منبع را عوض می‌کند |

## Best Practices

- یک منبع نصب برای هر گرهٔ کنترل.
- `ansible --version` را در یادداشت ساخت همان ماشین بنویسید.
- مقصد را با Ansible مدیریت کنید، نه با نصب Ansible روی مقصد.
- بعد از نصب بروید سراغ [اینونتوری](/docs/17-ansible/inventory). ping تک‌میزبان جای اینونتوری دائمی نیست.
