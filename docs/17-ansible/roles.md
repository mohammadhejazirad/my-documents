---
sidebar_position: 9
title: نقش
description: ساخت نقش base با ansible-galaxy init، defaults و tasks، و صدا زدن آن از Playbook.
---

# نقش

## مقدمه

نقش (role) Playbook را به پوشه‌ای با قرارداد ثابت تبدیل می‌کند. وقتی منطقهٔ زمانی و بسته‌های پایه را هم `app` می‌خواهد و هم `proxy`، کپی کردن taskها دو منبع حقیقت می‌سازد. نقش یکی می‌سازد و هر Play فقط متغیر گروه خودش را می‌دهد.

تا وقتی یک فایل تخت را یک نفر نگه می‌دارد، نقش اجباری نیست. این صفحه از همان taskهای صفحهٔ Playbook نقش می‌سازد تا مرز را ببینید، نه چون فایل کوتاه به نقش نیاز دارد.

## مفهوم اصلی

ساختار استاندارد:

```text
roles/base/
    defaults/main.yml    کم‌اولویت، قابل غلبه با group_vars
    tasks/main.yml
    handlers/main.yml
    templates/           اگر قالب داشت
    meta/main.yml        نویسنده و نسخهٔ نقش
```

`defaults` جایی است که مقدار پیش‌فرض نقش می‌ماند. `vars/main.yml` داخل نقش اولویت بالاتری دارد و غلبه بر آن سخت‌تر است. چیزی که محیط باید بتواند عوض کند در defaults است نه در vars.

Play نقش را با `roles` یا با `ansible.builtin.import_role` صدا می‌زند. فهرست `roles` قبل از `tasks` همان Play اجرا می‌شود. اگر ترتیب برایتان مهم است، `import_role` را مثل یک task بنویسید تا بین taskهای دیگر جایش معلوم باشد.

`ansible-galaxy role init` اسکلت را می‌سازد. محتوا را خودتان می‌نویسید. نقش را از Galaxy عمومی بدون خواندن کد نصب نکنید.

## چرا استفاده می‌شود؟

تیم پایگاه نباید task مربوط به Nginx را در Playbook خودش ببیند، و تیم پروکسی نباید فهرست بستهٔ app را کپی کند. نقش `base` فقط چیز مشترک است: ساعت و بسته‌های واقعاً مشترک. نقش `proxy_site` فقط پروکسی است. قاطی کردن هر دو در یک نقش «common» که مخفیانه Nginx را هم reload می‌کند، حادثهٔ کلاسیک نقش بیش از حد بزرگ است.

## Architecture

```text
site.yml
    Play hosts app  → role base
    Play hosts proxy → role base
                     → role proxy_site
```

## Installation

از ریشهٔ مخزن:

```bash
cd ~/src/lab-ansible
ansible-galaxy role init roles/base
```

دستور پوشه‌ها را می‌سازد. اگر `roles/base` از قبل هست و فایل دارید، init را دوباره نزنید که فایل را عوض کند. اول `ls` کنید.

## Configuration

`roles/base/defaults/main.yml`:

```yaml
base_timezone: Asia/Tehran
base_packages:
  - ca-certificates
  - curl
```

`roles/base/tasks/main.yml`:

```yaml
- name: Set timezone
  ansible.builtin.timezone:
    name: "{{ base_timezone }}"

- name: Install base packages
  ansible.builtin.apt:
    name: "{{ base_packages }}"
    state: present
    update_cache: true
    cache_valid_time: 3600
```

هر دو task به root نیاز دارند. become را روی Play بگذارید نه پنهان داخل نقش، تا خوانندهٔ Playbook ببیند این نقش امتیاز می‌خواهد. اگر نقش را در پروژه‌ای صدا بزنند که become فراموش شده، شکست صریح بهتر از موفقیت نصفه است.

`site.yml`:

```yaml
---
- name: Base on application servers
  hosts: app
  become: true
  roles:
    - role: base

- name: Base on proxy
  hosts: proxy
  become: true
  roles:
    - role: base
```

اگر گروه app باید `htop` هم داشته باشد، آن را در `group_vars/app.yml` با همان نام `base_packages` ننویسید که فهرست پیش‌فرض را کامل عوض کنید مگر عمداً همین را می‌خواهید. غلبهٔ group_vars بر defaults کل فهرست را جایگزین می‌کند، ادغام نمی‌کند. برای اضافه کردن بسته، یا فهرست کامل را در group_vars بگذارید یا متغیر دومی مثل `extra_packages` در نقش بچسبانید. این صفحه دومی را پیشنهاد می‌کند تا غافلگیر نشوید:

```yaml
- name: Install extra packages
  ansible.builtin.apt:
    name: "{{ extra_packages }}"
    state: present
  when: extra_packages | length > 0
```

و در defaults: `extra_packages: []`. در `group_vars/app.yml` فقط `extra_packages: [htop]`.

## Production Example

```bash
ansible-playbook site.yml --list-hosts
ansible-playbook site.yml --check
ansible-playbook site.yml
```

`app-1` و `proxy` هر دو منطقهٔ تهران را می‌گیرند. `db-1` در این Playbook نیست. اگر پایگاه هم باید ساعتش درست باشد، Play سوم با همان نقش و بدون extra_packages اضافه کنید. این تصمیم را بنویسید. سکوت یعنی پایگاه از این نقش بیرون مانده عمدی بوده.

نقش را در Git همراه `site.yml` commit کنید. نقش بدون Playbookای که آن را صدا بزند در تولید اجرا نمی‌شود.

## Security Notes

`ansible-galaxy install` از اینترنت نقش غریبه می‌آورد. در این فصل نقش محلی است. اگر روزی نقشی از Galaxy خواستید، نام و نسخه را pin کنید و کد `tasks` را مثل هر کد دیگری review کنید. نقش می‌تواند `become` و `shell` داشته باشد.

نقش را طوری ننویسید که با `ansible.builtin.shell: curl | bash` چیزی نصب کند. همان ممنوعیتی است که بقیهٔ دانشنامه برای نصب دستی دارد.

## Troubleshooting

| نشانه | کار |
| --- | --- |
| `role base was not found` | `roles_path` یا cwd. از ریشه اجرا کنید. یا در ansible.cfg بنویسید `roles_path = roles` |
| extra_packages خطا می‌دهد که تعریف نشده | defaults را نگذاشته‌اید |
| app بستهٔ curl را از دست داده | group_vars کل `base_packages` را با فهرست کوتاه عوض کرده |
| init فایل‌های شما را نوشته | init را روی نقش موجود دوباره زده‌اید. از Git برگردانید |

## Best Practices

- نقش کوچک و با یک اسم قابل‌فهم.
- پیش‌فرض در defaults، نه در vars، اگر قرار است گروه عوضش کند.
- فهرست را با غلبهٔ کامل جایگزین نکنید مگر تست کرده باشید میزبان چه بسته‌هایی را از دست می‌دهد.
- نقش Galaxy بدون نسخهٔ pin و بدون خواندن task در تولید نرود.
