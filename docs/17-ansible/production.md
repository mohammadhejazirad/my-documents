---
sidebar_position: 11
title: Playbook تولید
description: یک مخزن کامل برای ساعت، بستهٔ پایه، و فایل سایت پروکسی روی آزمایشگاه، با check و limit.
---

# Playbook تولید

## مقدمه

این صفحه تکه‌های فصل را در یک اجرای واقعی جمع می‌کند. هدفش قشنگ بودن YAML نیست. هدفش این است که از `mon-1` بشود گفت `app-1` ساعت تهران و بسته‌های پایه را دارد، و `proxy` همان پایه را دارد به‌علاوهٔ یک فایل سایت که به `10.10.1.10:8080` پروکسی می‌کند. پایگاه در این Playbook تغییر پیکربندی نمی‌گیرد. فقط اگر خواستید ساعتش را جدا اضافه می‌کنید.

اگر Nginx روی پروکسی هنوز نصب نشده، این Playbook نصبش نمی‌کند مگر task نصب را خودتان از فصل Nginx اضافه کنید. فرض این صفحه این است که بستهٔ `nginx` طبق [نصب Nginx](/docs/06-nginx/installation) هست و این Playbook فقط فایل سایت و reload را مالک است. دو ابزار با هم روی یک فایل جنگ نکنند.

## مفهوم اصلی

مخزن یک ریشه دارد، یک اینونتوری، یک نقش `base`، یک نقش `proxy_site`، و `site.yml`. اجرا همیشه از ریشه است. اولین اجرا روی تولید با `--limit` یک میزبان است حتی اگر اینونتوری سه تا داشته باشد. بعد از اینکه آن یکی سالم بود، limit را برمی‌دارید.

`--check` جای تست کامل نیست. apt در check گاهی changed را درست حدس می‌زند و گاهی نه، اگر وابسته به وضعیت زنده باشد. برای فایل template، check و diff قابل‌اعتمادترند. بعد از check، یک اجرای واقعی روی یک میزبان، بعد اجرای دوم که باید changed نداشته باشد.

## چرا استفاده می‌شود؟

صفحه‌های قبلی هر مکانیزم را جدا نشان دادند. در تولید آدم همان‌ها را بد سر هم می‌کند: become را جا می‌اندازد، اینونتوری `all` می‌گذارد، و reload را خارج از handler می‌زند. این صفحه یک ترتیب قابل‌کپی است.

## Architecture

```text
mon-1
  site.yml
    ├─ hosts app    role base
    └─ hosts proxy  role base
                    role proxy_site
                          template → sites-available
                          link → sites-enabled
                          nginx -t
                          handler reload
```

## Installation

اگر نقش `base` را در صفحهٔ نقش ساخته‌اید، همان را نگه دارید. نقش دوم:

```bash
cd ~/src/lab-ansible
ansible-galaxy role init roles/proxy_site
```

`ansible.cfg` باید `roles_path = roles` داشته باشد. اگر در صفحهٔ اینونتوری جا مانده، اضافه کنید.

## Configuration

`roles/proxy_site/defaults/main.yml`:

```yaml
proxy_site_name: app.example.com
proxy_upstream: "10.10.1.10:8080"
```

`roles/proxy_site/templates/lab.conf.j2`:

```jinja2
server {
    listen 80;
    server_name {{ proxy_site_name }};

    location / {
        proxy_pass http://{{ proxy_upstream }};
        proxy_set_header Host $host;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

`roles/proxy_site/handlers/main.yml`:

```yaml
- name: Reload nginx
  ansible.builtin.systemd:
    name: nginx
    state: reloaded
```

`roles/proxy_site/tasks/main.yml`:

```yaml
- name: Install nginx
  ansible.builtin.apt:
    name: nginx
    state: present
    update_cache: true
    cache_valid_time: 3600

- name: Enable nginx
  ansible.builtin.systemd:
    name: nginx
    enabled: true
    state: started

- name: Write site file
  ansible.builtin.template:
    src: lab.conf.j2
    dest: /etc/nginx/sites-available/lab.conf
    owner: root
    group: root
    mode: "0644"
  notify: Reload nginx

- name: Enable site
  ansible.builtin.file:
    src: /etc/nginx/sites-available/lab.conf
    dest: /etc/nginx/sites-enabled/lab.conf
    state: link
  notify: Reload nginx

- name: Test nginx
  ansible.builtin.command: nginx -t
  changed_when: false
```

`site.yml` را از صفحهٔ نقش گسترش دهید تا Play پروکسی نقش دوم را هم داشته باشد:

```yaml
- name: Proxy
  hosts: proxy
  become: true
  roles:
    - role: base
    - role: proxy_site
```

سایت پیش‌فرض Ubuntu ممکن است هنوز `sites-enabled/default` باشد و با `listen 80` این فایل تداخل کند. اگر `nginx -t` دربارهٔ duplicate default server هشدار داد یا سایت غلط بالا آمد، یک task جدا با `ansible.builtin.file` و `state: absent` روی `/etc/nginx/sites-enabled/default` بگذارید و notify کنید. خود فایل `sites-available/default` را پاک نکنید. برداشتن لینک کافی است و برگرداندنش آسان است.

## Production Example

```bash
cd ~/src/lab-ansible
ansible-playbook site.yml --syntax-check
ansible-playbook site.yml --list-hosts
ansible-playbook site.yml --limit proxy.example.internal --check --diff
ansible-playbook site.yml --limit proxy.example.internal
ansible-playbook site.yml --limit proxy.example.internal
```

اجرای سوم روی پروکسی باید بدون handler باشد، مگر apt واقعاً بسته را عوض کرده باشد. بعد limit را بردارید تا `app` هم نقش base را بگیرد.

از بیرون پروکسی، اگر پورت ۸۰ باز است:

```bash
curl -sI -H 'Host: app.example.com' http://10.10.1.5/
```

اگر برنامه روی `10.10.1.10:8080` بالا نباشد، Nginx پاسخ 502 می‌دهد. این شکست Playbook نیست. بالادست است. Playbook را برای «درمان 502» دوباره و دوباره اجرا نکنید. [عیب‌یابی Nginx](/docs/06-nginx/configuration) و وضعیت برنامه را ببینید.

commit فقط وقتی اجرای دوم آرام بود:

```bash
git add ansible.cfg inventories site.yml roles
git status
git commit -m "feat: manage lab base and proxy site with Ansible"
```

`git status` باید فایل رمز Vault و `.vault_pass` را نشان ندهد.

## Security Notes

این Playbook پورت ۸۰ را فایل پیکربندی می‌کند ولی فایروال را باز نمی‌کند. باز کردن UFW یک task جدا و یک review جداست. بی‌صدا `ufw allow 80` را به نقش base اضافه نکنید.

حذف `sites-enabled/default` اگر تنها سایت همین فایل نباشد، سایت دیگری را هم قطع می‌کند. روی پروکسی آزمایشگاه که یک سایت دارد این کار درست است. روی سروری که چند سایت دارد اول `ls sites-enabled` را در task نگذارید که کور پاک کند. نام را صریح بگویید.

نقش `proxy_site` را روی گروه `app` صدا نزنید. `hosts` همان قفل است.

## Troubleshooting

| نشانه | کار |
| --- | --- |
| duplicate listen 80 | لینک default هنوز هست |
| 502 | Playbook موفق بوده و برنامه نیست. curl به `10.10.1.10:8080` از خود پروکسی |
| handler هر بار | template هر اجرا فرق دارد. `--diff` فاصله و متغیر خالی را نشان می‌دهد |
| app هم nginx نصب کرد | نقش proxy_site را در Play اپ گذاشته‌اید |
| check روی nginx -t شکست جعلی | command در check اجرا نمی‌شود و ممکن است فایل هنوز نباشد. check را برای اولین ساخت فایل کافی ندانید. یک میزبان را واقعی اجرا کنید |

## Best Practices

- limit، بعد گروه، بعد شب‌ها فقط اگر اجرای دوم آرام شده.
- یک نقش یک مسئولیت.
- وضعیت بالادست را با تکرار Playbook قاطی نکنید.
- مخزن Playbook را مثل کد برنامه review کنید. تغییر `hosts: all` یک خط است و اثرش همهٔ میزبان‌هاست.
