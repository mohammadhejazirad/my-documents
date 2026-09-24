---
sidebar_position: 4
title: اینونتوری
description: فهرست میزبان‌های آزمایشگاه در Git، گروه، متغیر میزبان، و ansible.cfg پروژه.
---

# اینونتوری

## مقدمه

اینونتوری فهرست میزبان‌هایی است که Ansible حق دارد به آن‌ها وصل شود. پیش‌فرض بستهٔ Ubuntu فایل `/etc/ansible/hosts` است. آن فایل مال ماشین است و در Git نمی‌ماند. اینونتوری این دانشنامه کنار Playbook در مخزن است تا review شود و روی گرهٔ کنترل دیگری هم همان باشد.

نام‌ها همان آزمایشگاه‌اند: `proxy.example.internal`، `app-1.example.internal`، `db-1.example.internal`.

## مفهوم اصلی

هر خط یک میزبان است. کروشه نام گروه است. میزبان می‌تواند در چند گروه باشد. گروه `managed` را از روی گروه‌های فرزند می‌سازیم تا Play «همه» عمدی باشد، نه پیش‌فرض پنهان `all` که Ansible خودش می‌سازد. `all` همیشه هست. استفاده از `all` در Playbook تولید خطرناک است چون میزبان تازه‌ای که اشتباهی به فایل اضافه شود هم داخلش می‌افتد. Playbook این فصل به `app` و `proxy` و `db` جدا خطاب می‌کند.

`ansible_host` آدرسی است که SSH واقعاً می‌زند، اگر نام در DNS داخلی نباشد. در آزمایشگاه هر دو را می‌نویسیم تا اگر DNS داخلی خراب بود، Ansible هنوز به IP برسد، و نام لاگ همان نام میزبان بماند.

## چرا استفاده می‌شود؟

بدون اینونتوری، هر دستور یک لیست IP تازه است و `db-1` یک روز داخل Play برنامه قرار می‌گیرد. گروه، مرز پایگاه و برنامه را در خود فایل نشان می‌دهد.

## Architecture

```text
inventories/lab/hosts.ini
    [proxy] [app] [db]
    [managed:children]
ansible.cfg در ریشهٔ مخزن Playbook
    inventory = inventories/lab/hosts.ini
```

یک مخزن می‌تواند `inventories/lab` و `inventories/prod` داشته باشد. تا وقتی آزمایشگاه و تولید یکی شده‌اند، فقط `lab` را بسازید و اسمش را دروغین `prod` نگذارید.

## Installation

روی گرهٔ کنترل پوشه را بسازید. این کار نصب بسته نیست.

```bash
mkdir -p ~/src/lab-ansible/inventories/lab
cd ~/src/lab-ansible
```

## Configuration

`inventories/lab/hosts.ini`:

```ini
[proxy]
proxy.example.internal ansible_host=10.10.1.5

[app]
app-1.example.internal ansible_host=10.10.1.10

[db]
db-1.example.internal ansible_host=10.10.1.20

[managed:children]
proxy
app
db

[managed:vars]
ansible_user=ops
ansible_python_interpreter=/usr/bin/python3
```

`ansible.cfg` در همان ریشه:

```ini
[defaults]
inventory = inventories/lab/hosts.ini
host_key_checking = True
retry_files_enabled = False
interpreter_python = auto_silent
stdout_callback = yaml

[privilege_escalation]
become = False
become_method = sudo
become_user = root
```

`become = False` در cfg یعنی Playbook باید جایی که root می‌خواهد صریح `become: true` بنویسد. سکوت cfg را به معنی «همیشه root» نگذارید.

اولویت فایل پیکربندی: متغیر محیطی `ANSIBLE_CONFIG`، بعد `ansible.cfg` پوشهٔ جاری، بعد `~/.ansible.cfg`، بعد `/etc/ansible/ansible.cfg`. از ریشهٔ مخزن اجرا کنید تا فایل پروژه برداشته شود. `ansible --version` خط `config file` را نشان می‌دهد. اگر هنوز `/etc/ansible/ansible.cfg` است، در پوشهٔ غلط هستید.

بررسی فهرست:

```bash
ansible-inventory --list
ansible-inventory --graph
```

باید سه میزبان زیر `managed` دیده شوند. اگر میزبان را دو بار دیدید، در دو گروه عضو است و این خواسته است. اگر IP غلط است، Playbook را شروع نکنید.

## Production Example

یک متغیر فقط برای گروه پایگاه، در `inventories/lab/group_vars/db.yml`:

```yaml
db_backup_hour: "2"
```

و برای همه، `inventories/lab/group_vars/managed.yml`:

```yaml
lab_timezone: Asia/Tehran
```

Ansible این فایل‌ها را وقتی اینونتوری همان پوشه است برمی‌دارد، اگر مسیر اینونتوری یک دایرکتوری باشد. چون اینونتوری ما یک فایل `hosts.ini` است، `group_vars` باید کنار آن فایل نباشد بلکه Ansible کنار خود فایل اینونتوری هم نگاه می‌کند: پوشهٔ `inventories/lab/group_vars` کنار `hosts.ini` خوانده می‌شود. این رفتار فعلی هسته است. اگر متغیر را ندید، `ansible-inventory --host app-1.example.internal` را بزنید و ببینید `lab_timezone` هست یا نه.

هیچ رمزی در این فایل‌ها نیست. رمز در صفحهٔ Vault است.

## Security Notes

اینونتوری IP داخلی را لو می‌دهد. مخزن خصوصی بماند. میزبان تولید را در اینونتوری آزمایشگاه کپی نکنید «فقط برای یک دستور». یک `-i` اشتباه کافی است.

`ansible_password` را در اینونتوری روشن ننویسید. کلید SSH کافی است.

## Troubleshooting

| نشانه | کار |
| --- | --- |
| `No inventory was parsed` | cwd غلط است یا مسیر `inventory` در cfg typo دارد |
| میزبان `skipped` به‌خاطر unreachable در فهرست نیست | اصلاً در گروه Play نبوده. `--graph` را ببینید |
| به نام وصل می‌شود نه به IP | `ansible_host` را جا انداخته‌اید و DNS چیز دیگری گفته |
| متغیر گروه نیست | `ansible-inventory --host` همان میزبان |
| config file مال `/etc` است | دستور را از ریشهٔ مخزن بزنید |

## Best Practices

- گروه را بر اساس نقش بسازید نه بر اساس پروژه‌ای که ماه بعد فراموش می‌شود.
- `all` را در Playbook تولید هدف نگیرید.
- اینونتوری را قبل از هر Playbook با `--graph` یک بار ببینید وقتی میزبان تازه اضافه کرده‌اید.
