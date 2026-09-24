---
sidebar_position: 5
title: دستور تک‌باره
description: ansible ping و apt و service از خط فرمان، با تفاوت command و shell و check mode.
---

# دستور تک‌باره

## مقدمه

دستور تک‌باره یک ماژول را بدون Playbook روی یک گروه اجرا می‌کند. برای فهمیدن اینکه اینونتوری و SSH و Python سالم‌اند، و برای یک کار فوری که نباید در تاریخچهٔ پیکربندی بماند. هر چیزی که هفتهٔ بعد هم باید همان باشد، Playbook است نه این صفحه.

از ریشهٔ مخزنی اجرا کنید که `ansible.cfg` پروژه را دارد، وگرنه اینونتوری `/etc/ansible/hosts` خالی است.

## مفهوم اصلی

شکل کلی:

```text
ansible <گروه> -m <ماژول> -a <آرگومان> 
```

`-b` یعنی become، یعنی sudo. بدون `-b` کار با کاربر `ops` است و نصب بسته شکست می‌خورد حتی اگر SSH سالم باشد.

`ansible.builtin.ping` سرویس شبکهٔ ICMP نیست. ماژول Python است که اگر interpreter مقصد جواب بدهد `pong` می‌دهد. سبز بودنش یعنی SSH و Python، نه اینکه `ping` سیستمی از فایروال رد شده.

`ansible.builtin.command` آرگومان را بدون پوسته اجرا می‌کند. لوله و جایگزینی پوسته ندارد. `ansible.builtin.shell` پوسته دارد و خطرناک‌تر است. برای `uptime` از command استفاده کنید.

خروجی هر میزبان یکی از این‌هاست: `SUCCESS`، `CHANGED`، `FAILED`، `UNREACHABLE`. تک‌بارهٔ command معمولاً همیشه changed است چون Ansible نمی‌داند دستور سیستم را عوض کرده یا نه. این یکی از دلیل‌هایی است که command جای ماژول apt نیست.

## چرا استفاده می‌شود؟

قبل از نوشتن صد خط YAML باید بدانید گروه `app` واقعاً یک میزبان زنده است. تک‌باره این را در ده ثانیه می‌گوید. همچنین برای جمع‌آوری یک fact یا یک `systemctl is-active` در حادثه مفید است، به شرطی که خروجی را به Playbook دائمی تبدیل نکنید فقط چون کار کرده.

## Architecture

```text
ansible app -m ansible.builtin.ping
        │
        ▼
inventory گروه app → app-1
        │
        ▼
SSH ops@10.10.1.10
        │
        ▼
ماژول ping با python3
```

## Installation

بسته و اینونتوری باید از صفحه‌های قبل آماده باشند. چیز تازه‌ای نصب نمی‌شود.

## Configuration

بررسی اتصال:

```bash
cd ~/src/lab-ansible
ansible app -m ansible.builtin.ping
ansible proxy -m ansible.builtin.ping
ansible db -m ansible.builtin.ping
```

یک دستور خواندنی:

```bash
ansible app -m ansible.builtin.command -a 'uptime'
```

نصب یک بسته، با sudo، و فقط اگر سیاست sudoers اجازهٔ `apt-get` را داده باشد. خود ماژول apt از `apt-get` استفاده می‌کند:

```bash
ansible app -b -m ansible.builtin.apt -a 'name=htop state=present update_cache=true cache_valid_time=3600'
```

بار دوم همان دستور باید `changed` نباشد.

دیدن سرویس بدون تغییر:

```bash
ansible proxy -m ansible.builtin.command -a 'systemctl is-active nginx'
```

اگر کد خروج غیرصفر باشد Ansible آن میزبان را failed نشان می‌دهد. `is-active` وقتی سرویس خاموش است غیرصفر است. این شکست Ansible نیست. وضعیت سرویس است.

برای اینکه یک command غیرفعال را failed نکند، در تک‌باره سخت است. در Playbook `failed_when` دارید. این هم دلیلی است که تشخیص را به Playbook ببرید.

حالت چک برای ماژولی که پشتیبانی می‌کند:

```bash
ansible app -b -m ansible.builtin.apt -a 'name=curl state=present' --check
```

`--check` نصب نمی‌کند. می‌گوید اگر اجرا می‌شد changed می‌شد یا نه. command و shell معمولاً در check واقعاً اجرا نمی‌شوند و نتیجهٔ قابل‌اعتماد نمی‌دهند.

## Production Example

حادثه: نمی‌دانید روی کدام میزبان دیسک پر است. این جمع‌آوری است، نه پیکربندی.

```bash
ansible managed -m ansible.builtin.command -a 'df -hT /'
```

خروجی را در تیکت بگذارید و بعد راه را از [دیسک پر](/docs/14-troubleshooting/disk-full) بروید. با تک‌باره `shell: rm -rf` چیزی پاک نکنید. Ansible حذف را خیلی یکنواخت روی همهٔ گروه انجام می‌دهد و این دقیقاً همان چیزی است که در حادثه نمی‌خواهید.

## Security Notes

`-b` روی گروه `managed` یعنی هر سه میزبان. گروه را کوچک کنید. `ansible all -b -m ansible.builtin.shell` بدترین ترکیب این صفحه است: پوسته، root، و همهٔ میزبان‌ها.

تاریخچهٔ shell گرهٔ کنترل این دستورها را نگه می‌دارد. رمز را در `-a` نگذارید.

`--become` با کاربری که sudo همه‌چیز دارد، برابر root تعاملی است. sudoers محدود صفحهٔ نصب را عوض نکنید تا تک‌باره راحت‌تر شود.

## Troubleshooting

| نشانه | کار |
| --- | --- |
| `No hosts matched` | اسم گروه غلط است. `ansible-inventory --graph` |
| UNREACHABLE | SSH. خود `ssh ops@10.10.1.10` |
| FAILED با `sudo: a password is required` | `-b` هست و sudo رمز می‌خواهد. `--ask-become-pass` یا sudoers |
| ping سبز است و apt قرمز | Python سالم است، امتیاز نه |
| command همیشه changed است | طبیعی است. برای وضعیت پایدار ماژول مخصوص بخواهید |

## Best Practices

- ping اول، بعد command خواندنی، بعد ماژول تغییردهنده روی یک گروه کوچک.
- `--check` را جایی که ماژول پشتیبانی می‌کند عادت کنید.
- تک‌بارهٔ موفق را اگر باید بماند، همان روز به Playbook منتقل کنید و از تاریخچهٔ shell به عنوان منبع حقیقت استفاده نکنید.
