---
sidebar_position: 8
title: قالب و handler
description: قالب Jinja، ماژول template، و handler که فقط بعد از تغییر واقعی سرویس را reload می‌کند.
---

# قالب و handler

## مقدمه

فایل پیکربندی که یک مقدارش بین میزبان‌ها فرق دارد، با ماژول copy و متن ثابت دوبار نگهداری می‌شود. قالب (template) فایل Jinja2 است. Ansible متغیر را می‌گذارد و نتیجه را به مقصد می‌فرستد. اگر نتیجه با فایل فعلی یکی باشد، task تغییر گزارش نمی‌کند و handler اجرا نمی‌شود.

Handler کاری است که فقط وقتی یک task با `notify` تغییر کرده باشد، یک بار در آخر Play اجرا می‌شود. برای reload کردن Nginx درست است. برای هر task یک restart جدا، پنجره‌های قطع پشت سر هم می‌سازد.

## مفهوم اصلی

فایل قالب پسوند `.j2` دارد و معمولاً در `templates/` است. عبارت متغیر داخل قالب با آکولاد دوتایی Jinja نوشته می‌شود. آن فایل را در جملهٔ فارسی این صفحه تکرار نمی‌کنیم. نمونه داخل فنس است.

ماژول `ansible.builtin.template` مقصد، مالک و مجوز را می‌گیرد. `ansible.builtin.copy` برای فایلی است که هیچ متغیری ندارد. اگر متغیر ندارید قالب نسازید.

Handler حتی اگر ده task او را notify کنند یک بار اجرا می‌شود. اگر Play وسط کار fail شود، handlerهای در صف به‌طور پیش‌فرض اجرا نمی‌شوند. این خواسته است: سرویس را با پیکربندی نیمه‌کاره reload نکنید. از Ansible 2.16 به بعد می‌شود با `force_handlers` این را عوض کرد. در این فصل پیش‌فرض را نگه دارید.

`ansible.builtin.meta: flush_handlers` handler را همان وسط Play اجرا می‌کند. فقط وقتی task بعدی به سرویس تازه‌reload‌شده نیاز دارد استفاده کنید، نه از روی عادت.

## چرا استفاده می‌شود؟

یک `server_name` غلط در Nginx سایت را به بلوک پیش‌فرض می‌فرستد. اگر این نام در ده فایل کپی شده باشد، یکی جا می‌ماند. قالب یک منبع دارد و متغیر اینونتوری نام را می‌دهد.

Reload بی‌دلیل Nginx در ترافیک بالا اتصال‌های بلند را می‌بندد. Handler این reload را به «فقط وقتی فایل عوض شد» وصل می‌کند.

## Architecture

```text
templates/app.conf.j2
        │  متغیر server_name
        ▼
task template
        │  اگر محتوا عوض شد notify
        ▼
handler  nginx -t و reload
```

`nginx -t` را قبل از reload می‌خواهیم. اگر قالب نحوش شکسته باشد، reload نباید دستور بعدی باشد. یک task با `validate` بهتر از handler کور است، ولی `nginx -t` فایل کامل را چک می‌کند نه یک تکه را. برای یک فایل `sites-available`، handler این ترتیب را دارد: اول `nginx -t`، اگر شکست خورد Play قرمز می‌شود و reload بعدی را خودتان نزنید. در عمل task قالب را جدا بنویسید و یک task فرمان `nginx -t` با `changed_when: false` بلافاصله بعدش، و notify مربوط به reload فقط اگر هر دو سالم بودند. نمونهٔ پایین همین کار را با یک handler و یک task آزمون انجام می‌دهد.

## Installation

پوشه:

```bash
mkdir -p ~/src/lab-ansible/templates
```

## Configuration

`templates/lab-site.conf.j2`:

```jinja2
server {
    listen 80;
    server_name {{ lab_server_name }};

    location / {
        proxy_pass http://{{ lab_upstream }};
        proxy_set_header Host $host;
    }
}
```

در `group_vars/proxy.yml`:

```yaml
lab_server_name: app.example.com
lab_upstream: 10.10.1.10:8080
```

Play:

```yaml
- name: Proxy site file
  hosts: proxy
  become: true
  tasks:
    - name: Render site file
      ansible.builtin.template:
        src: lab-site.conf.j2
        dest: /etc/nginx/sites-available/lab.conf
        owner: root
        group: root
        mode: "0644"
      notify: Reload nginx

    - name: Test nginx configuration
      ansible.builtin.command: nginx -t
      changed_when: false

  handlers:
    - name: Reload nginx
      ansible.builtin.systemd:
        name: nginx
        state: reloaded
```

ترتیب پیش‌فرض این است که handler آخر Play اجرا می‌شود، یعنی بعد از `nginx -t`. اگر آزمون شکست بخورد handler اجرا نمی‌شود. این همان ترتیبی است که می‌خواهیم. لینک `sites-enabled` را این قطعه نمی‌سازد. اگر سایت را واقعاً منتشر می‌کنید، یک task `ansible.builtin.file` با `state: link` به `sites-enabled/lab.conf` اضافه کنید و آن را هم notify کنید. جزئیات خود Nginx در [پیکربندی Nginx](/docs/06-nginx/configuration) است. این صفحه فقط مکانیزم قالب است.

`mode: "0644"` را رشته بنویسید. اگر عدد YAML بدون نقل‌قول باشد ممکن است هشت‌هشتی تفسیر شود و مجوز چیز دیگری شود.

## Production Example

اولین اجرا فایل را می‌سازد، `nginx -t` سبز است، handler reload می‌کند. اجرای دوم template وضعیت ok دارد، notify نمی‌شود، handler در خلاصه نیست. این را در خروجی ببینید: بخشی به نام `RUNNING HANDLER` بار دوم نباید بیاید.

اگر `lab_server_name` را عوض کنید، بار بعد template تغییر می‌کند، آزمون نحو دوباره اجرا می‌شود، و فقط در صورت موفقیت reload می‌شود.

## Security Notes

قالب را از ورودی کاربر نسازید. Jinja اگر به دادهٔ مهاجم برسد می‌تواند بیشتر از یک نام میزبان تولید کند. متغیر قالب از group_vars مخزن خصوصی است.

مجوز `0644` برای فایل سایت Nginx مناسب است چون رمز ندارد. برای فایلی که رمز دیتابیس دارد `0600` و مالک کاربر سرویس. آن فایل را قالب جهان‌خوانا نکنید.

`proxy_pass` را به نام عمومی دامنه ندهید. مقدار `lab_upstream` آدرس داخلی است تا حلقهٔ پروکسی ساخته نشود. این را صفحهٔ شبکه هم گفته است.

## Troubleshooting

| نشانه | کار |
| --- | --- |
| `Undefined variable` در قالب | اسم متغیر را در `ansible-inventory --host` ببینید |
| هر اجرا handler اجرا می‌شود | یک جای فایل هر بار فرق می‌کند. تاریخ یا فاصلهٔ ته خط. diff را ببینید |
| `nginx -t` fail و فایل بد روی دیسک مانده | template قبلاً نوشته شده. فایل را از Git برگردانید یا task را با `validate` و کپی به مسیر موقت طراحی کنید. آزمون بعد از نوشتن، جلوی نوشتن را نمی‌گیرد |
| handler اجرا نشد در حالی که فایل عوض شده | نام `notify` با نام handler حرف‌به‌حرف یکی نیست |
| مجوز فایل 644 نشده و 420 شده | mode را بدون نقل‌قول عددی نوشته‌اید |

برای اینکه فایل بد جا نماند، الگوی امن‌تر کپی به مسیر موقت، `nginx -t`، بعد `ansible.builtin.copy` با `remote_src: true` به مسیر نهایی است. اگر این پیچیدگی را نمی‌خواهید، قبل از اولین اجرا روی تولید از `--check` استفاده کنید و فایل فعلی را بکاپ بگیرید.

## Best Practices

- قالب فقط جایی که متغیر واقعی دارید.
- reload در handler، نه در هر task.
- آزمون نحو سرویس را قبل از reload شکست‌خورده تمام کنید.
- mode فایل را رشتهٔ نقل‌قول‌دار بنویسید.
