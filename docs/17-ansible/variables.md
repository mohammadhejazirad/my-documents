---
sidebar_position: 7
title: متغیر و fact
description: group_vars، تقدم متغیر، factهای ansible_facts، و شرط when بدون تزریق نامطمئن.
---

# متغیر و fact

## مقدمه

متغیر مقداری است که شما به Playbook می‌دهید. Fact مقداری است که میزبان دربارهٔ خودش می‌گوید. قاطی کردنشان باعث می‌شود منطقهٔ زمانی را از روی اسم توزیع حدس بزنید، یا اسم توزیع را در سه فایل تکراری سخت کنید.

این صفحه همان مخزن `~/src/lab-ansible` را ادامه می‌دهد.

## مفهوم اصلی

تقدم سادهٔ عملی، از کم‌اولویت به پرقدرت، این است: `defaults` نقش، بعد `group_vars`، بعد `host_vars`، بعد متغیر Play (`vars`)، بعد `-e` روی خط فرمان. خط فرمان همه‌چیز را لگد می‌کند. برای همین `-e lab_timezone=UTC` در یک اجرای آزمایشی خطرناک است اگر فراموش کنید برش دارید. در تولید برای غلبهٔ دائمی از `-e` استفاده نکنید. فایل را درست کنید.

Factها در دیکشنری `ansible_facts` هستند. شکل توصیه‌شده در هسته‌های اخیر همین دیکشنری است، نه تکیهٔ دائمی بر متغیر تزریق‌شدهٔ `ansible_distribution`. آن نام کوتاه هنوز در ۲.۲۰ و ۲.۲۱ کار می‌کند، ولی مستند هسته هشدار داده که تزریق fact به متغیر جهانی حذف‌شدنی است. در فایل تازه بنویسید `ansible_facts['distribution']`.

جمع‌آوری fact پیش‌فرض روشن است. `gather_facts: false` را فقط وقتی بگذارید که هیچ taskای به fact نیاز ندارد. وگرنه شرط شما روی مقدار خالی رد می‌شود و فکر می‌کنید توزیع Ubuntu نیست.

## چرا استفاده می‌شود؟

بدون متغیر، نام منطقه و فهرست بسته در ده Playbook کپی می‌شود و یکی تهران می‌ماند و یکی UTC. بدون fact، Playbook روی Debian و Ubuntu یک شاخه را می‌رود و مسیر سوکت PHP را اشتباه می‌نویسد.

## Architecture

```text
group_vars/managed.yml     lab_timezone
group_vars/app.yml         app_packages
        │
        ▼
Play
    when بر اساس ansible_facts
    task از متغیر استفاده می‌کند
```

## Installation

ماژول اضافه لازم نیست. `ansible.builtin.setup` بخشی از هسته است و gather_facts همان را صدا می‌زند.

یک بار fact یک میزبان را ببینید تا اسم کلیدها حدس نماند:

```bash
ansible app-1.example.internal -m ansible.builtin.setup -a 'filter=ansible_distribution*'
```

## Configuration

`inventories/lab/group_vars/app.yml`:

```yaml
app_packages:
  - curl
  - ca-certificates
  - htop
```

task:

```yaml
- name: Install app packages
  ansible.builtin.apt:
    name: "{{ app_packages }}"
    state: present
    update_cache: true
    cache_valid_time: 3600
  when: ansible_facts['os_family'] == 'Debian'
```

روی Ubuntu و Debian هر دو `os_family` برابر Debian است. `distribution` برای Ubuntu مقدار `Ubuntu` است و برای Debian مقدار `Debian`. اگر کاری فقط مال یکی است، distribution را شرط کنید نه os_family را.

ثبت یک متغیر برای taskهای بعدی همان Play، با `register`:

```yaml
- name: Read timezone
  ansible.builtin.command: timedatectl show -p Timezone --value
  register: tz_now
  changed_when: false

- name: Show timezone in output
  ansible.builtin.debug:
    var: tz_now.stdout
```

`changed_when: false` چون command خواندنی است و نباید هر بار changed شود. `debug` در Playbook دائمی تولید نماند. برای ساختن Playbook مفید است و بعد حذف می‌شود، چون خروجی اجرا را شلوغ می‌کند و گاهی مقدار حساس را چاپ می‌کند.

## Production Example

می‌خواهید بستهٔ `jq` فقط روی `app` باشد نه روی `db`. آن را در `app_packages` بگذارید و Play پایگاه فهرست جدا داشته باشد، مثلاً خالی یا فقط `ca-certificates`. شرط `when: inventory_hostname in groups['app']` داخل Playای که از اول `hosts: db` است هیچ‌وقت true نمی‌شود. گروه را در `hosts` جدا کنید. شرط when برای ویژگی میزبان است، نه برای جبران `hosts: all`.

اجرای آزمایشی که متغیر را موقت عوض می‌کند:

```bash
ansible-playbook site-time.yml -e lab_timezone=UTC --check
```

بعد بدون `-e` دوباره `--check` کنید و مطمئن شوید تهران برگشته. اگر میزبان واقعی UTC مانده، یک بار `-e` را بدون `--check` زده‌اید. Playbook را دوباره با مقدار فایل group_vars اجرا کنید.

## Security Notes

`-e` می‌تواند `ansible_user` و حتی مسیر کلید را عوض کند. در اسکریپت CI آرگومان اضافی را از ورودی کاربر نسازید.

`debug: var` روی متغیر Vault مقدار رمزگشایی‌شده را در لاگ می‌نویسد. debug را روی نام متغیر Vault نگذارید.

فایل `host_vars` که رمز روشن دارد ممنوع است. جایش Vault است.

## Troubleshooting

| نشانه | کار |
| --- | --- |
| `ansible_facts is undefined` | `gather_facts` خاموش است |
| شرط when هیچ‌وقت برقرار نیست | کلید fact را با setup filter دیده باشید. املای `os_family` را چک کنید |
| متغیر گروه دیده نمی‌شود | `ansible-inventory --host نام` |
| `-e` اثر دائمی گذاشته | Playbook را بدون `-e` دوباره اجرا کنید |
| register خالی است | task قبلی failed شده و با `ignore_errors` رد شده‌اید |

## Best Practices

- fact را از setup یک بار ببینید، بعد در when کپی کنید.
- فهرست بسته متغیر گروه باشد تا Playbook فقط حلقه نزند روی نام سخت.
- `changed_when: false` برای هر command خواندنی.
- debug موقت است. در commit نماند.
