---
sidebar_position: 6
title: Playbook
description: ساختار YAML یک Play، اجرای ansible-playbook، حالت check و diff، و معنی ok و changed.
---

# Playbook

## مقدمه

Playbook فایل YAML است که وضعیت دلخواه یک گروه میزبان را می‌گوید. دستور اجرا `ansible-playbook` است نه `ansible`. این صفحه یک Playbook تخت می‌سازد: منطقهٔ زمانی و چند بسته روی گروه `app`. نقش و قالب را هنوز قاطی نمی‌کند.

## مفهوم اصلی

بالای فایل سه خط تیره است. هر Play یک آیتم فهرست است با `name`، `hosts`، و `tasks`. `hosts: app` یعنی فقط گروه app از اینونتوری. `gather_facts: true` پیش‌فرض است و factهای میزبان را قبل از taskها می‌گیرد. اگر Play فقط کپی یک فایل ثابت است می‌توانید false کنید تا سریع‌تر شود. تا وقتی شرط بر اساس سیستم‌عامل دارید، true بماند.

هر task `name` و یک ماژول دارد. کلید ماژول نام کامل است. مقدارش آرگومان‌های همان ماژول است.

اجرای دوباره اگر هیچ taskای changed ندهد موفقیت است. خلاصهٔ آخر فایل شبیه `failed=0` و `changed=0` می‌شود. این را خراب‌بودن Playbook حساب نکنید.

`ansible-playbook --check` ماژول‌هایی را که check را پشتیبانی می‌کنند بدون اعمال واقعی اجرا می‌کند. `--diff` برای فایل نشان می‌دهد چه خطی عوض می‌شد. هر دو را با هم بزنید: `--check --diff`.

## چرا استفاده می‌شود؟

تک‌باره در تاریخچهٔ shell می‌ماند و روی میزبان جدید فراموش می‌شود. Playbook را می‌شود diff گرفت، review کرد، و روی `app-1` تازه همان را اجرا کرد. این همان چیزی است که فصل استقرار از «دستورهایی که یک نفر یادش مانده» کم دارد.

## Architecture

```text
site-time.yml
    Play روی hosts: app
        gather_facts
        task منطقهٔ زمانی
        task بسته‌ها
            │
            ▼
ansible-playbook --check --diff
            │
            ▼
ansible-playbook
```

## Installation

فایل را در ریشهٔ همان مخزن اینونتوری بگذارید: `~/src/lab-ansible/site-time.yml`. بستهٔ اضافی نمی‌خواهد.

## Configuration

`site-time.yml`:

```yaml
---
- name: Clock and base packages on app servers
  hosts: app
  become: true
  gather_facts: true
  tasks:
    - name: Set timezone to Asia/Tehran
      ansible.builtin.timezone:
        name: "{{ lab_timezone | default('Asia/Tehran') }}"

    - name: Install base packages
      ansible.builtin.apt:
        name:
          - curl
          - ca-certificates
          - htop
        state: present
        update_cache: true
        cache_valid_time: 3600
```

متغیر `lab_timezone` اگر در group_vars نباشد، فیلتر `default` مقدار تهران را می‌گذارد. فیلتر را داخل فایل YAML بنویسید نه در جملهٔ فارسی، چون آکولاد در متن صفحهٔ Docusaurus دردسر می‌سازد و اینجا داخل فنس است.

نحو را قبل از اتصال به سرور چک کنید:

```bash
ansible-playbook site-time.yml --syntax-check
```

بعد بدون تغییر واقعی:

```bash
ansible-playbook site-time.yml --check --diff
```

اگر sudo رمز می‌خواهد:

```bash
ansible-playbook site-time.yml --check --ask-become-pass
```

اعمال:

```bash
ansible-playbook site-time.yml
```

بار دوم را هم بزنید. task منطقهٔ زمانی و apt باید `ok` باشند نه `changed`، مگر مخزن واقعاً بستهٔ تازه‌ای داده باشد. `update_cache` با `cache_valid_time: 3600` یعنی اگر کش apt کمتر از یک ساعت سن داشته باشد دوباره `apt update` نمی‌زند. این جلوی changed دروغین هر اجرا را می‌گیرد.

محدود کردن به یک میزبان، حتی اگر گروه چند عضو داشت:

```bash
ansible-playbook site-time.yml --limit app-1.example.internal
```

## Production Example

روی `app-1` بعد از اجرا:

```bash
ssh ops@10.10.1.10 'timedatectl show -p Timezone --value'
```

باید `Asia/Tehran` باشد. `dpkg -l curl` بسته را نشان می‌دهد. Playbook را در Git commit کنید با پیامی که می‌گوید منطقهٔ زمانی و بسته‌های پایه، نه «آپدیت».

اگر فردا میزبان app دوم اضافه شد، فقط به اینونتوری اضافه می‌شود و همان فایل دوباره اجرا می‌شود. فایل را کپی نکنید.

## Security Notes

`become: true` روی کل Play یعنی هر task با root است، حتی task خواندنی. اگر یک Play هم خواندن دارد هم نوشتن، نوشتن را Play جدا با become کنید یا become را روی همان task بگذارید نه روی کل Play. نمونهٔ بالا هر دو task به root نیاز دارند، پس Play درست است.

Playbook را روی گروه `managed` نگذارید تا پایگاه هم بی‌دلیل `htop` و تغییر ساعت نگیرد، مگر اینکه ساعت پایگاه هم خواستهٔ صریح صفحهٔ پایگاه باشد. ساعت غلط برای گواهی و لاگ بد است و معمولاً روی همه لازم است. اگر جدا کردید، یک Play دوم با `hosts: db` فقط برای timezone بنویسید و بسته‌های برنامه را آنجا نگذارید.

## Troubleshooting

| نشانه | کار |
| --- | --- |
| `ERROR! We were unable to read either as JSON nor YAML` | تورفتگی فاصله است نه تب. خط را در پیام نحو ببینید |
| `lab_timezone is undefined` و default هم نبود | فیلتر default را برنداشته‌اید و group_vars خوانده نشده. اینونتوری را ببینید |
| check می‌گوید changed و اجرای واقعی failed | check همهٔ شرطها را کامل شبیه‌سازی نمی‌کند. متن failed را بخوانید. معمولاً sudo یا apt قفل است |
| همیشه changed روی apt | `cache_valid_time` نیست و update_cache هر بار changed می‌شود |
| میزبان اشتباه تغییر کرد | `hosts:` را با `--list-hosts` ببینید قبل از اجرا |

```bash
ansible-playbook site-time.yml --list-hosts
```

این دستور task را اجرا نمی‌کند. فقط میزبان‌های هدف را چاپ می‌کند. قبل از اولین اجرا روی گروه جدید عادتش کنید.

## Best Practices

- `--syntax-check` سپس `--list-hosts` سپس `--check --diff` سپس اجرا.
- Playbook را کوچک نگه دارید تا وقتی نقش لازم شده.
- نام task را طوری بنویسید که در خروجی، بدون خواندن YAML، معلوم باشد چه شده.
- اجرای دوم باید آرام باشد. اگر هر شب changed می‌دهد، Playbook وضعیت را درست توصیف نکرده.
