---
sidebar_position: 10
title: Ansible Vault
description: رمز کردن متغیر، فایل رمز جدا با مجوز ۶۰۰، و اجرا با ask-vault-pass یا vault-password-file.
---

# Ansible Vault

## مقدمه

Vault رمزنگاری فایل YAML داخل مخزن است. Playbook می‌تواند در Git باشد و رمز پایگاه در همان مخزن، بدون اینکه کسی با خواندن commit رمز را ببیند. کلید رمزگشایی خودش داخل Git نیست.

این صفحه یک رمز نمونه را رمز می‌کند و نشان می‌دهد کجا نگذارید. مقدار `change-me` باید قبل از هر استفادهٔ واقعی عوض شود.

## مفهوم اصلی

`ansible-vault encrypt` فایل را درجا رمز می‌کند. ابتدای فایل دیگر YAML معمولی نیست. سربرگ `$ANSIBLE_VAULT` دارد. `ansible-playbook` اگر رمز Vault را نداشته باشد همان اول می‌ایستد، نه وسط کار روی نصف میزبان‌ها.

دو راه دادن رمز در اجرا: `--ask-vault-pass` که می‌پرسد، و `--vault-password-file` که از فایل می‌خواند. فایل رمز حالت `0600` است و در `.gitignore` است. مسیر پیش‌فرض پیشنهادی این فصل روی گرهٔ کنترل `/home/ops/.vault_pass` است، نه داخل مخزن Playbook.

از Ansible مدرن، شناسهٔ Vault (`vault-id`) هم هست تا چند رمز برای چند محیط داشته باشید، مثلاً `lab` و `prod`. تا وقتی یک محیط دارید، یک رمز کافی است. دو محیط را با یک رمز Vault قاطی نکنید. دزدیدن رمز آزمایشگاه نباید تولید را باز کند.

`ansible-vault view` و `edit` رمزگشایی موقت می‌کنند. `decrypt` فایل را روشن روی دیسک می‌گذارد. بعد از decrypt اگر commit کنید فاجعه است. edit را ترجیح دهید.

## چرا استفاده می‌شود؟

group_vars روشن برای نام منطقهٔ زمانی درست است. همان فایل برای `db_password` غلط است، چون مخزن یا بکاپ گیت یا لاگ review رمز را پخش می‌کند. Vault این دو را جدا می‌کند: ساختار در Git، کلید رمزگشایی فقط روی گرهٔ کنترل و در مدیر رمز تیم.

جایگزین، ندادن رمز به Ansible و خواندن از فایل `0600` روی خود مقصد است. برای رمز پایگاه که از قبل روی سرور است، همان بهتر است و Ansible لازم نیست رمز را بداند. Vault وقتی لازم است که Ansible باید رمز را به فایل مقصد بنویسد یا به ماژول بدهد.

## Architecture

```text
group_vars/db/vault.yml     رمز شده در Git
~/.vault_pass               فقط روی mon-1، gitignore
        │
        ▼
ansible-playbook --vault-password-file
        │
        ▼
ماژول مقدار را در حافظهٔ اجرا می‌بیند
```

## Installation

`ansible-vault` با همان بستهٔ `ansible` نصب شده. ابزار جدا نخواهید.

## Configuration

فایل روشن را اول محلی بسازید و همان لحظه رمز کنید. نمونه:

```yaml
db_app_password: change-me
```

```bash
mkdir -p inventories/lab/group_vars/db
install -m 0600 /dev/null inventories/lab/group_vars/db/vault.yml
# محتوا را با ویرایشگر بنویسید، بعد:
ansible-vault encrypt inventories/lab/group_vars/db/vault.yml
```

رمز Vault را طولانی و جدا از رمز خود پایگاه انتخاب کنید. فایل رمز اجرا:

```bash
install -m 0600 /dev/null /home/ops/.vault_pass
# یک خط، خود رمز Vault، بدون فاصلهٔ اضافه
```

در `.gitignore` مخزن Playbook:

```text
.vault_pass
```

حتماً مطمئن شوید فایل رمز کنار مخزن کپی نشده:

```bash
git status --porcelain
```

نباید `.vault_pass` را نشان دهد. `vault.yml` باید به شکل تغییر فایل دیده شود و محتوایش در `git diff` خوانا نباشد.

اجرا:

```bash
ansible-playbook site.yml --vault-password-file /home/ops/.vault_pass
```

یا برای کار انسان:

```bash
ansible-playbook site.yml --ask-vault-pass
```

در `ansible.cfg` می‌شود `vault_password_file` گذاشت. اگر بگذارید، هر کسی که روی آن ماشین دستور بزند بی‌صدا رمزگشایی می‌کند. برای گرهٔ کنترل اختصاصی قابل قبول است. برای لپ‌تاپ مشترک، `--ask-vault-pass` را نگه دارید و در cfg ننویسید.

ویرایش بعدی:

```bash
ansible-vault edit inventories/lab/group_vars/db/vault.yml
```

## Production Example

Playbook پایگاه رمز را از متغیر Vault به فایل محیط سرویس می‌نویسد، با ماژول copy و mode `0600`، نه با lineinfile روی فایلی که بقیه جهان‌خواناست. بعد از نوشتن، task فرمان `grep` برای دیدن رمز نگذارید. یک task که فقط وجود فایل و مجوز را چک کند کافی است:

```yaml
- name: Check db env file mode
  ansible.builtin.stat:
    path: /etc/app/db.env
  register: db_env

- name: Fail if env file is world-readable
  ansible.builtin.assert:
    that:
      - db_env.stat.exists
      - db_env.stat.mode == '0600'
```

خود نوشتن فایل را این صفحه کامل تکرار نمی‌کند تا دو منبع برای مسیر پایگاه ساخته نشود. مسیر و کاربر پایگاه در [فصل دیتابیس](/docs/07-databases) است. Ansible فقط اگر تیم تصمیم گرفت تحویل فایل با Playbook باشد وارد می‌شود.

اگر رمز لو رفت، هم رمز پایگاه را عوض کنید و هم رمز Vault را. عوض کردن فقط یکی، فایل رمزشدهٔ قدیمی در تاریخچهٔ Git را با رمز Vault قبلی هنوز قابل خواندن نگه می‌دارد. تاریخچه را با force بازنویسی نکنید مگر سیاست تیم و چرخش همهٔ cloneها را بلد باشید. فرض را بگذارید تاریخچه رمز قدیمی را تا ابد دارد و رمز داخلش را باطل کنید.

## Security Notes

فایل رمز Vault را در CI به صورت secret ماشینی بدهید، نه در لاگ. `echo` کردنش در workflow ممنوع است. در GitHub Actions از Secrets استفاده می‌شود و در لاگ ماسک می‌شود اگر درست به step داده شود. این دانشنامه Playbook را به Actions گره نمی‌زند. اگر وصل کردید، رمز را در متغیر مخزن روشن نگذارید.

`ansible-vault view` را در اسکریپت تیکت‌ساز اجرا نکنید.

مجوز `0600` روی `.vault_pass` را `ls -l` نشان می‌دهد. اگر `0644` شد، هر کاربر همان ماشین مخزن را رمزگشایی می‌کند.

## Troubleshooting

| نشانه | کار |
| --- | --- |
| `Decryption failed` | رمز اشتباه، یا فایل با رمز دیگری encrypt شده |
| `Attempted to read vault secrets without a vault password` | فلگ را فراموش کرده‌اید |
| diff در PR محتوا را نشان می‌دهد | encrypt نشده یا decrypt مانده و commit شده. commit را برگردانید و رمز لو رفته را باطل کنید |
| edit فایل موقت را ول کرده | فرآیند edit قطع شده. فایل اصلی اگر encrypt مانده سالم است. موقت `/tmp` را پاک کنید |
| Playbook متغیر را undefined می‌داند | فایل داخل group_vars گروهی است که میزبان عضو آن نیست |

## Best Practices

- یک رمز Vault برای هر محیط.
- decrypt دائمی نکنید. edit کنید.
- فایل رمز را هرگز commit نکنید. یک بار `git status` را قبل از push عادت کنید.
- لو رفتن را با چرخش رمز داخل Vault درمان کنید، نه فقط با پاک کردن آخرین commit.
