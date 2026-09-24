---
sidebar_position: 12
title: عیب‌یابی Ansible
description: جدا کردن خطای SSH، کلید میزبان، Python، sudo، اینونتوری و ماژول، با دستور واقعی روی آزمایشگاه.
---

# عیب‌یابی Ansible

## مقدمه

خروجی Ansible شلوغ است و اغلب مقصر را یک لایه پایین‌تر از جایی نشان می‌دهد که آدم شروع به ویرایش Playbook می‌کند. ترتیب این صفحه ثابت است: آیا اصلاً به میزبان رسیدید، آیا Python جواب داد، آیا sudo اجازه داد، آیا اینونتوری همان میزبان را هدف گرفته، و تازه بعد نحو ماژول.

نمونهٔ میزبان `app-1` روی `10.10.1.10` و گرهٔ کنترل `mon-1` است.

## مفهوم اصلی

`UNREACHABLE` یعنی نشست SSH ساخته نشد یا وسط کار مرد. Playbook هنوز ماژول را اجرا نکرده. `FAILED` یعنی نشست بوده و ماژول یا دستور کد خطا داده. این دو را با یک درمان جواب ندهید.

verbosity با `-vvv` کانال SSH را نشان می‌دهد. روی تولید همیشه روشن نماند، چون ممکن است آرگومان را بیشتر از حد چاپ کند. برای یک میزبان و یک بار کافی است.

`--syntax-check` به SSH دست نمی‌زند. اگر این شکست بخورد، شبکه را بیهوده متهم نکنید.

## چرا استفاده می‌شود؟

تیم معمولاً اول `hosts:` را عوض می‌کند یا `ignore_errors: true` می‌گذارد. اولی دامنهٔ حادثه را بزرگ می‌کند. دومی خطا را تا handler و تا میزبان بعدی پنهان می‌کند. `ignore_errors` در این فصل ابزار عیب‌یابی نیست. فقط وقتی یک task اختیاری واقعاً حق شکست دارد و دلیلش کنارش نوشته شده.

## Architecture

```text
1 syntax-check
2 list-hosts
3 ssh دستی با همان کلید و کاربر
4 ansible ping روی یک میزبان
5 playbook با --limit همان میزبان و -vv
6 خواندن خط FAILED نه فقط PLAY RECAP
```

## Installation

ابزار اضافه نصب نمی‌شود. `ssh` و `ansible` همان صفحه‌های قبل‌اند.

## Configuration

یک میزبان را از گروه جدا کنید تا بقیه را قرمز نکنید:

```bash
cd ~/src/lab-ansible
ansible-playbook site.yml --syntax-check
ansible-playbook site.yml --limit app-1.example.internal --list-hosts
ssh -o IdentitiesOnly=yes -i ~/.ssh/id_ed25519 ops@10.10.1.10 'python3 --version'
ansible app-1.example.internal -m ansible.builtin.ping -vv
```

`IdentitiesOnly` جلوی پیشنهاد چند کلید را می‌گیرد. اگر OpenSSH مقصد به‌خاطر `PerSourcePenalties` در Ubuntu 26.04 شما را موقتاً بسته باشد، چند بار پشت سر هم Ansible نزنید. چند ثانیه صبر کنید. جزئیات این رفتار در [سخت‌سازی SSH](/docs/10-security/ssh-hardening) است. Ansible با اتصال‌های کوتاه زیاد این جریمه را راحت‌تر از یک نشست تعاملی تحریک می‌کند. `ControlMaster` و `ControlPersist` در `~/.ssh/config` گرهٔ کنترل تعداد دست‌دادن را کم می‌کند:

```text
Host 10.10.1.* *.example.internal
  User ops
  IdentityFile ~/.ssh/id_ed25519
  IdentitiesOnly yes
  ControlMaster auto
  ControlPersist 60s
```

این به معنی خاموش کردن بررسی کلید میزبان نیست.

## Production Example

نشانه: فقط `db-1` در RECAP وضعیت `unreachable` دارد و `app-1` سبز است. فرضیه: SSH یا مسیر شبکهٔ همان میزبان، نه Playbook. مشاهده:

```bash
ssh ops@10.10.1.20 'echo ok'
ansible db-1.example.internal -m ansible.builtin.ping -vv
```

اگر ssh هم می‌میرد، Playbook را دست نزنید. فایروال، سرویس ssh، و اینکه `ansible_host` هنوز `10.10.1.20` است را ببینید. اگر ssh کار می‌کند و ping نه، خروجی `-vv` را بخوانید. اغلب Python یا کاربر غلط است.

نشانهٔ دوم: `FAILED` و متن `Failed to set permissions`. ماژول copy به مقصدی نوشته که فایل‌سیستم `noexec` یا مجوز دایرکتوری اجازهٔ chown نمی‌دهد، یا `mode` هشت‌هشتی اشتباه شده. `mode` را رشتهٔ نقل‌قول‌دار کنید و مسیر را `ls -ld` کنید.

نشانهٔ سوم: Play سبز است و سرویس رفتار قدیم را دارد. handler اجرا نشده چون task changed نبوده، یا فایل را جای دیگری نوشته‌اید. `ansible-playbook --check --diff` نشان می‌دهد Ansible فکر می‌کند فایل همان است. بعد مسیر dest را با `nginx -T` مقایسه کنید که واقعاً همان فایل include می‌شود.

## Security Notes

`-vvv` را در تیکت عمومی نچسبانید تا مسیر کلید و متغیر محیطی اضافه نرود. اگر شک دارید رمز چاپ شده، آن اجرا را لو رفتن حساب کنید و رمز را بچرخانید.

`host_key_checking = False` را به عنوان درمان UNREACHABLE دائمی نکنید. درمان، `ssh-keygen -R` برای کلید کهنه و یک بار اتصال با `accept-new` است، وقتی مطمئنید به میزبان درست وصل می‌شوید نه به یک ماشین جایگزین‌شده.

```bash
ssh-keygen -R 10.10.1.10
ssh -o StrictHostKeyChecking=accept-new ops@10.10.1.10 true
```

اگر میزبان را عوض کرده‌اید و هشدار کلید عوض‌شده می‌بینید، این هشدار را نادیده نگیرید تا وقتی دلیل تعویض میزبان را می‌دانید.

## Troubleshooting

| نشانه | لایه | کار |
| --- | --- | --- |
| syntax-check قرمز | YAML | تب و نام کلید |
| list-hosts میزبان را ندارد | اینونتوری | `--graph` و `hosts:` |
| ssh رمز می‌خواهد یا رد می‌شود | SSH | کلید و `AllowUsers` |
| ping می‌گوید interpreter نبود | Python | `python3` روی مقصد، یا `ansible_python_interpreter` |
| Missing sudo password | sudo | `--ask-become-pass` یا sudoers محدود |
| ماژول not found | مجموعه | `ansible-galaxy collection list`. بستهٔ `ansible` نه فقط core، یا نام کامل غلط |
| changed هر اجرا | منطق task | command بدون changed_when، یا template ناپایدار |
| فقط یک میزبان failed | همان میزبان | `--limit` و بقیه را دوباره شکنجه نکنید |
| سرور با اتصال زیاد Ansible را می‌بندد | sshd | صبر و ControlPersist، نه غیرفعال کردن جریمه برای همهٔ دنیا |

`ansible-galaxy collection list` را روی گرهٔ کنترل بزنید اگر خطای `couldn't resolve module` دیدید. هستهٔ تنها، `community.general` را ندارد. یا بستهٔ `ansible` را نصب کنید یا آن task را با `ansible.builtin` بنویسید.

## Best Practices

- یک میزبان، یک لایه، یک تغییر.
- RECAP را آخر بخوانید. خط FAILED بالای آن دلیل را دارد.
- ignore_errors را برای سبز کردن CI اضافه نکنید.
- کلید میزبان عوض‌شده را مثل حادثه امنیت نگاه کنید تا خلافش ثابت شود.
