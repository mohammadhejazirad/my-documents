---
title: "ساخت ماشین مجازی"
sidebar_position: 3
description: "ساخت VM آزمایشگاه با libvirt یا Proxmox، انتخاب bridge در برابر NAT، و تفاوت ISO با cloud image."
---

# ساخت ماشین مجازی

## مقدمه

میزبان‌های آزمایشگاه اگر فلز جدا ندارند، VM هستند. این صفحه VM برنامه را طوری می‌سازد که بعد از نصب، واقعاً `10.10.1.10` باشد و از `db-1` و `mirror` دیده شود. نصب خود سیستم‌عامل در [نصب Ubuntu Server](/docs/01-linux/ubuntu-server-installation) است. اگر ISO را به دیسک مجازی وصل کردید و نصب‌کننده بالا آمد، بقیهٔ کار این صفحه تمام شده و باید به نصب برگردید.

دو مسیر اینجاست. مسیر اول دیسک خالی به‌علاوهٔ ISO 26.04.1 و نصب تعاملی. این مسیر طرح EFI و `/boot` و LVM را ممکن می‌کند. مسیر دوم cloud image آماده است. سریع‌تر است و طرح دیسک‌ش مال تصویر ابری Canonical است، نه طرح سرور این دانشنامه. برای `app-1` و `db-1` مسیر ISO را استفاده کنید. cloud image را برای VM دورریختنی یا تمرینی نگه دارید.

دستورهای libvirt روی هایپروایزر Ubuntu اجرا می‌شوند. اگر هایپروایزر شما Proxmox است، بلوک `qm` همان کار را می‌کند و `virt-install` را روی گرهٔ Proxmox اجرا نکنید. هر دو مسیر باید به یک مهمان UEFI با دیسک virtio و کارت شبکهٔ virtio روی پل برسند.

## مفهوم اصلی

VM یک فرآیند روی هایپروایزر است به‌علاوهٔ یک فایل دیسک. خاموش شدن فرآیند، دیسک را پاک نمی‌کند. پاک شدن دیسک با `rm` روی فایل qcow2 یا با حذف ولوم Proxmox است. قبل از حذف، نام را با `virsh list --all` یا `qm list` بخوانید.

اندازهٔ آزمایشگاه برای میزبان برنامه: ۲ vCPU، ۴ گیگ RAM، ۴۰ گیگ دیسک. میزبان دیتابیس: ۲ vCPU، ۸ گیگ RAM، ۸۰ گیگ دیسک. میزبان‌های کم‌بار مثل آینهٔ کوچک آزمایشگاهی با ۲ گیگ RAM و ۳۰ گیگ دیسک بالا می‌آیند، ولی آینهٔ واقعی Ubuntu بسیار بزرگ‌تر از ۳۰ گیگ است. صفحهٔ آینه دربارهٔ حجم همگام‌سازی هشدار داده است. این عددها حداقلِ کار روزمره‌اند، نه ظرفیت تولید.

CPU باید virtio یا مدل `host` باشد تا مهمان پرچم‌های CPU را ببیند. RAM را کمتر از ۲ گیگ برای Ubuntu Server 26.04 نگذارید. نصب‌کننده و `apt` در ۱ گیگ به OOM نزدیک می‌شوند. دیسک را thin بگذارید، یعنی qcow2 یا thin LVM، تا ۴۰ گیگ را همان روز از هایپروایزر نبلعد. thin به معنی بی‌نهایت جا نیست. وقتی مهمان پر شود هایپروایزر هم پر می‌شود.

شبکه دو حالت دارد:

- NAT، شبکهٔ پیش‌فرض libvirt اغلب `192.168.122.0/24`. مهمان بیرون را از راه میزبان می‌بیند. میزبان‌های دیگر آزمایشگاه مهمان را با `10.10.1.10` نمی‌بینند. پورت‌فوروارد برای هر سرویس لازم می‌شود و با نقشهٔ این دانشنامه نمی‌خواند.
- Bridge. مهمان مثل یک ماشین فیزیکی روی `10.10.0.0/16` است و آدرس ثابت آزمایشگاه را برمی‌دارد. این حالت انتخاب همهٔ VMهای نام‌دار این دانشنامه است.

cloud image یک rootfs از پیش نصب‌شده است. اولین بوتش cloud-init را اجرا می‌کند تا نام، کاربر و شبکه را اعمال کند. ISO هیچ سیستم نصب‌شده‌ای ندارد تا وقتی Subiquity تمام شود. قاطی کردن این دو، یعنی وصل کردن ISO به دیسکی که cloud image است، یا بوت `--import` روی دیسک خالی، یا مهمان را به نصب‌کننده می‌برد یا به دیسک بدون بوت.

## چرا استفاده می‌شود؟

هایپروایزر اشتباه را دیر متوجه می‌شوید. NAT تا وقتی فقط از خود هایپروایزر SSH می‌کنید سالم به نظر می‌رسد. روزی که `app-1` باید به `10.10.1.20` وصل شود یا از لپ‌تاپ مدیر دیده شود، اتصال تایم‌اوت می‌شود و مقصر را در sshd جستجو می‌کنید. پل را همان اول بسازید.

cloud image وسوسه‌کننده است چون `virt-install --import` در چند دقیقه بالا می‌آید. هزینهٔ آن طرح دیسک است. تصویر رسمی معمولاً یک پارتیشن ریشه دارد، نه LVM با `/var` جدا. رشد بعدی و پر شدن لاگ همان مشکلی را می‌سازد که صفحهٔ [پارتیشن‌بندی](/docs/01-linux/partitioning) جلویش را می‌گیرد. پس cloud image جایگزین صفحهٔ نصب برای سرور ماندگار نیست.

## Architecture

```text
ایستگاه مدیر
    |
    |  SSH فقط به هایپروایزر، VNC فقط از راه تونل
    v
هایپروایزر (KVM یا Proxmox)
    |
    +-- br0 یا vmbr0  روی شبکهٔ 10.10.0.0/16
    |         |
    |         +-- app-1   10.10.1.10   دیسک ۴۰G   ۲ vCPU   RAM 4G
    |         +-- db-1    10.10.1.20   دیسک ۸۰G   ۲ vCPU   RAM 8G
    |
    +-- NAT پیش‌فرض libvirt (192.168.122.0/24)  فقط برای VM تمرینی
```

هایپروایزر خودش یکی از IPهای جدول میزبان‌های برنامه نیست. اگر لازم است روی همان `/16` آدرس داشته باشد، یک آدرس آزاد خارج از فهرست ثابت‌ها بردارید، مثلاً `10.10.0.2`. آن عدد را با `10.10.1.10` یکی نکنید.

## Installation

روی هایپروایزر Ubuntu این بسته‌ها کافی‌اند:

```bash
lscpu | grep -E 'Virtualization|Hypervisor'
ls -l /dev/kvm
sudo apt update
sudo apt install qemu-kvm libvirt-daemon-system virtinst cloud-image-utils ovmf
sudo usermod -aG libvirt,kvm ops
```

بدون `/dev/kvm` هنوز می‌شود با شبیه‌سازی نرم‌افزار بوت کرد و نصب ساعت‌ها طول می‌کشد. اگر `ls` گفت چنین فایلی نیست، مجازی‌سازی را در BIOS هایپروایزر روشن کنید. گروه را با `-aG` اضافه کنید. `usermod -G` بدون `-a` گروه قبلی را برمی‌دارد. بعد از این دستور یک بار از نو وارد شوید. `id` باید `libvirt` و `kvm` را نشان بدهد.

نوع سیستم‌عامل را از پایگاه همان میزبان بخوانید. نام را از حافظهٔ این صفحه قطعی ندانید:

```bash
osinfo-query os | grep -i ubuntu
```

اگر `ubuntu26.04` در فهرست بود همان را در `--os-variant` بگذارید. اگر نبود، جدیدترین Ubuntu همان فهرست را بگذارید. این مقدار دیسک و بستهٔ مهمان را عوض نمی‌کند. فقط پیش‌فرض سخت‌افزار مجازی را نزدیک سخت‌افزار پشتیبانی‌شده نگه می‌دارد. خطای زیر یعنی نام را حدس زده‌اید:

```text
ERROR    Unknown OS name 'ubuntu26.04'. See `osinfo-query os` for valid values.
```

پل را در Netplan هایپروایزر بسازید. نام رابط فیزیکی را از `ip -br link` بردارید. نمونه:

```yaml
network:
  version: 2
  ethernets:
    enp1s0:
      dhcp4: false
  bridges:
    br0:
      interfaces:
        - enp1s0
      addresses:
        - 10.10.0.2/16
      routes:
        - to: default
          via: 10.10.0.1
      nameservers:
        addresses:
          - 10.10.1.5
      parameters:
        stp: false
        forward-delay: 0
```

قبل از `sudo netplan try` یک نشست کنسول فیزیکی یا بیرون از این SSH داشته باشید. اگر تنها راه شما همین SSH روی `enp1s0` است و پل غلط باشد، ارتباط قطع می‌شود. `stp: false` و `forward-delay: 0` برای پل تک‌لینک آزمایشگاه درست است تا چهل ثانیه یادگیری STP شما را معطل نکند. این تنظیم را روی پل بین چند سوئیچ سازمانی کور کپی نکنید.

ببینید شبکهٔ NAT پیش‌فرض هنوز وجود دارد و با پل قاطی نشده:

```bash
virsh net-list --all
ip -br addr show br0
```

`br0` باید آدرس هایپروایزر را داشته باشد، نه آدرس مهمان را.

## Configuration

ISO را روی هایپروایزر بگذارید، مثلاً زیر `/var/lib/libvirt/boot`. چک‌سام را همان‌طور که صفحهٔ نصب گفته مقایسه کنید. سپس VM برنامه:

```bash
sudo virt-install \
  --name app-1 \
  --memory 4096 \
  --vcpus 2 \
  --cpu host \
  --disk path=/var/lib/libvirt/images/app-1.qcow2,size=40,format=qcow2,bus=virtio \
  --network bridge=br0,model=virtio \
  --os-variant ubuntu26.04 \
  --cdrom /var/lib/libvirt/boot/ubuntu-26.04.1-live-server-amd64.iso \
  --graphics vnc,listen=127.0.0.1 \
  --video virtio \
  --boot uefi
```

`--boot uefi` به بستهٔ `ovmf` نیاز دارد. `--graphics vnc,listen=127.0.0.1` صفحه را فقط روی خود هایپروایزر باز می‌کند. از لپ‌تاپ:

```bash
ssh -L 5900:127.0.0.1:5900 ops@10.10.0.2
```

شمارهٔ نمایش را با `virsh vncdisplay app-1` بخوانید. `:0` یعنی پورت ۵۹۰۰ و `:1` یعنی ۵۹۰۱. کلاینت VNC را به `127.0.0.1` لپ‌تاپ وصل کنید، نه به IP عمومی هایپروایزر.

اگر `--os-variant ubuntu26.04` را پایگاه شما ندارد، همان دستور را با نامی که `osinfo-query` چاپ کرد تکرار کنید. دیسک را دوباره نسازید اگر فایل qcow2 از تلاش قبلی مانده است. `virsh undefine app-1 --remove-all-storage` دیسک را پاک می‌کند. بدون `--remove-all-storage` فقط تعریف VM می‌رود و فایل دیسک می‌ماند.

مسیر cloud image، فقط برای VM تمرینی، این شکل را دارد. نام دقیق فایل را در پوشهٔ `current` ببینید چون Canonical تصویر را جایگزین می‌کند.

```text
https://cloud-images.ubuntu.com/resolute/current/resolute-server-cloudimg-amd64.img
```

فایل user-data را روی هایپروایزر بسازید. رمز `change-me` نمونه است و `expire: true` کاربر را وادار می‌کند در اولین ورود عوضش کند. خط کلید را با خروجی واقعی `ssh-keygen -t ed25519` عوض کنید. کلید خصوصی را این‌جا نگذارید.

```yaml
#cloud-config
hostname: app-1
fqdn: app-1.example.internal
manage_etc_hosts: true
timezone: Asia/Tehran
ssh_pwauth: true
users:
  - name: ops
    gecos: Lab operator
    groups: sudo
    shell: /bin/bash
    lock_passwd: false
    sudo: ALL=(ALL) ALL
    ssh_authorized_keys:
      - ssh-ed25519 REPLACE_WITH_PUBLIC_KEY ops@admin
chpasswd:
  expire: true
  list: |
    ops:change-me
package_update: true
packages:
  - qemu-guest-agent
```

`ssh_pwauth: true` فقط برای همان ورود اول است. بعد از اینکه کلید کار کرد آن را خاموش کنید. اگر هم کلید را عوض نکنید و هم رمز را فراموش کنید، راه ورود کنسول هایپروایزر است.

```yaml
instance-id: app-1
local-hostname: app-1
```

این دومی فایل meta-data است.

```bash
cloud-localds /var/lib/libvirt/images/app-1-seed.iso user-data meta-data
sudo qemu-img create -f qcow2 -F qcow2 \
  -b /var/lib/libvirt/images/resolute-server-cloudimg-amd64.img \
  /var/lib/libvirt/images/app-1-cloud.qcow2 40G
```

بکینگ‌فایل را پاک نکنید. qcow2 فرزند بدون آن دیسک خالی است. ساخت VM از تصویر:

```bash
sudo virt-install \
  --name app-1-lab \
  --memory 2048 \
  --vcpus 2 \
  --cpu host \
  --disk path=/var/lib/libvirt/images/app-1-cloud.qcow2,format=qcow2,bus=virtio \
  --disk path=/var/lib/libvirt/images/app-1-seed.iso,device=cdrom \
  --network bridge=br0,model=virtio \
  --os-variant ubuntu26.04 \
  --import \
  --graphics vnc,listen=127.0.0.1 \
  --boot uefi \
  --noautoconsole
```

شبکهٔ این تصویر در اولین بوت اغلب DHCP است. برای IP ثابت، بعد از ورود فایل Netplan را با `netplan try` عوض کنید. نام رابط را حدس نزنید. cloud image طرح LVM صفحهٔ پارتیشن را ندارد. آن را به جای `app-1` ماندگار معرفی نکنید.

معادل Proxmox، روی گره، بعد از آپلود ISO به storage فایل. اول storage واقعی را ببینید:

```bash
pvesm status
```

اگر شناسه `local-lvm` نیست، همان شناسه‌ای که `pvesm` چاپ کرده را در خط دیسک بگذارید. نمونه با LVM نازک و UEFI:

```bash
qm create 110 \
  --name app-1 \
  --memory 4096 \
  --cores 2 \
  --cpu host \
  --net0 virtio,bridge=vmbr0 \
  --scsihw virtio-scsi-single \
  --scsi0 local-lvm:40 \
  --ide2 local:iso/ubuntu-26.04.1-live-server-amd64.iso,media=cdrom \
  --ostype l26 \
  --agent enabled=1
qm set 110 --bios ovmf
qm set 110 --efidisk0 local-lvm:1,efitype=4m,pre-enrolled-keys=0
qm set 110 --boot order='ide2;scsi0'
qm start 110
```

`pre-enrolled-keys=0` بررسی کلید Secure Boot را برای آزمایشگاه ساده می‌کند. کنسول را از وب Proxmox باز کنید و صفحهٔ نصب Ubuntu را ادامه دهید. شناسهٔ ۱۱۰ نمونه است. `qm list` نباید از قبل مهمانی با همین id داشته باشد.

## Production Example

بعد از نصب ISO، این بررسی‌ها را از هایپروایزر و از خود مهمان انجام دهید.

از هایپروایزر:

```bash
virsh dominfo app-1
virsh domifaddr app-1
```

`domifaddr` فقط وقتی آدرس را نشان می‌دهد که guest agent در مهمان نصب و روشن باشد، یا lease دیده شود. اگر خالی بود، از کنسول مهمان `ip -br addr` را بخوانید. خالی بودن این دستور به‌تنهایی یعنی شبکه خراب است؟ نه. یعنی هایپروایزر هنوز IP را یاد نگرفته.

داخل مهمان، بعد از نصب صفحهٔ قبل:

```bash
ip -br addr
ping -c 2 10.10.0.1
ping -c 2 10.10.1.60
```

پینگ به دروازه ثابت می‌کند پل کار می‌کند. پینگ به `10.10.1.60` ثابت می‌کند به میزبان آینه روی همان شبکه می‌رسید. اگر دروازه جواب داد و آینه نه، یا آینه خاموش است یا IP مهمان روی NAT افتاده و شما دارید شبکهٔ دیگری را می‌بینید.

عامل مهمان را روی سیستم نصب‌شده از ISO هم بگذارید تا خاموش کردن از هایپروایزر تمیز باشد:

```bash
sudo apt install qemu-guest-agent
sudo systemctl enable --now qemu-guest-agent
```

روی Proxmox بدون `--agent enabled=1` این سرویس به کانالی وصل نیست و `qm agent 110 ping` شکست می‌خورد. کانال را روشن کنید و مهمان را یک بار خاموش و روشن کنید. ری‌بوت نرم گاهی برای ظاهر شدن دستگاه عامل کافی نیست.

رشد دیسک از سمت هایپروایزر، وقتی مهمان از قبل LVM دارد:

```bash
sudo qemu-img info /var/lib/libvirt/images/app-1.qcow2
sudo qemu-img resize /var/lib/libvirt/images/app-1.qcow2 60G
```

این دستور فایل را بزرگ می‌کند و فایل‌سیستم مهمان را بزرگ نمی‌کند. اگر VM روشن است، libvirt ممکن است تا ری‌بوت اندازهٔ جدید را نشان ندهد. مسیر امن برای دیسک بوت: VM را خاموش کنید، resize کنید، روشن کنید، بعد داخل مهمان طبق صفحهٔ پارتیشن `growpart` و `pvresize` و `lvextend` را بزنید. `qemu-img resize` روی VM روشن و بدون هماهنگی libvirt می‌تواند تصویر را خراب کند. برای VM روشن از `virsh blockresize app-1 vda 60G` استفاده کنید و باز هم رشد فایل‌سیستم را داخل مهمان جدا انجام دهید.

معادل Proxmox:

```bash
qm resize 110 scsi0 +20G
```

عدد جدید را داخل مهمان با `lsblk` ببینید. اگر اندازهٔ دیسک عوض نشده، یک بار `echo 1 | sudo tee /sys/class/block/sda/device/rescan` با نام دستگاه واقعی همان مهمان. روی virtio-scsi نام اغلب `sda` است نه `vda`. دوباره `lsblk` حرف آخر را می‌زند، نه این صفحه.

## Security Notes

- VNC و کنسول سریال رمز ورود را وسط صفحه نشان می‌دهند. به رابط عمومی هایپروایزر وصل‌شان نکنید.
- فایل user-data که رمز `change-me` دارد بعد از بوت موفق از هایپروایزر پاک شود یا فقط روی دیسک مدیر با حالت `0600` بماند. seed ISO را به VM وصل‌شده رها نکنید. cloud-init هر بوت دوباره به آن نگاه می‌کند و ممکن است کاربر را به حالت اول برگرداند. بعد از موفقیت، دیسک seed را از تعریف VM جدا کنید.
- گروه `libvirt` یعنی توانایی ساخت VM که روی پل شبکهٔ تولید نشسته است. این گروه را به حساب سرویس برنامه ندهید.
- بکینگ‌فایل cloud image را جهان‌نوشتنی نکنید. مهمان فرزند نباید بتواند تصویر پایهٔ بقیهٔ VMها را عوض کند. حالت فایل `0644` مال روت کافی است و نوشتن برای گروه لازم نیست.
- VM آزمایشگاه را با کارت پل به شبکهٔ تولید وصل نکنید تا وقتی `apt upgrade` و ورود با کلید تمام نشده.

## Troubleshooting

| نشانه | علت محتمل | کار |
| --- | --- | --- |
| `virt-install` می‌گوید Unknown OS name | نام variant در osinfo نیست | `osinfo-query os` و نزدیک‌ترین Ubuntu |
| صفحهٔ نصب سیاه است | VNC به جای غلط یا ISO وصل نیست | `virsh vncdisplay` و `virsh domblklist app-1` |
| مهمان IP از `192.168.122.0/24` گرفته | NIC روی شبکهٔ default است نه `br0` | `virsh dumpxml app-1` و دنبال `bridge=` |
| از لپ‌تاپ به `10.10.1.10` راه نیست ولی از هایپروایزر هست | پل به کارت فیزیکی وصل نیست یا دروازه غلط است | `bridge link` و `ip route` روی هایپروایزر |
| cloud image بوت می‌شود و کاربر ندارد | seed جدا مانده یا instance-id تکراری است | کنسول، و لاگ `/var/log/cloud-init.log` داخل مهمان |
| `Permission denied` روی `/dev/kvm` | گروه kvm در این نشست نیست | خروج و ورود دوباره، بعد `id` |
| Proxmox روی OVMF بوت نمی‌شود | efidisk نساخته‌اید | `qm set 110 --bios ovmf` و efidisk |
| `qm resize` داخل مهمان دیده نمی‌شود | هسته دیسک را از نو نخوانده | rescan یا خاموش و روشن، بعد `lsblk` |

برای دیدن اینکه NIC مهمان واقعاً به کدام پل وصل است:

```bash
virsh dumpxml app-1 | grep -A2 "interface type"
```

خروجی سالم برای این آزمایشگاه `bridge='br0'` و `model type='virtio'` است. اگر `network` و `default` دیدید، NAT است. اصلاح، با VM خاموش:

```bash
virsh detach-interface app-1 network --config
virsh attach-interface app-1 bridge br0 --model virtio --config
```

اگر `--config` را جا بگذارید تغییر با ری‌بوت بعدی برمی‌گردد. بعد از اصلاح یک بار VM را کاملاً خاموش و روشن کنید، نه فقط ری‌بوت، اگر رابط هنوز آدرس قدیمی دارد.

## Best Practices

- سرور نام‌دار آزمایشگاه را روی پل بگذارید و IP جدول دانشنامه را داخل مهمان ثابت کنید. NAT را برای این نقش‌ها استفاده نکنید.
- `app-1` و `db-1` را از ISO و با طرح LVM بسازید. cloud image را با اسم دیگری مثل `app-1-lab` بسازید تا کسی آن را با سرور ماندگار اشتباه نگیرد.
- `--os-variant` را از `osinfo-query` همان هایپروایزر بگیرید.
- دیسک، CPU و RAM را در تعریف VM بنویسید نه فقط در تیکت. `virsh dominfo` یا `qm config 110` باید همان عدد صفحه را نشان بدهد.
- رشد دیسک هایپروایزر را با رشد LVM داخل مهمان یکی بدانید فقط وقتی هر دو را انجام داده‌اید و `df -h` اندازهٔ جدید را نشان می‌دهد.
- VNC را روی localhost نگه دارید و ISO رسمی را با چک‌سام صفحهٔ نصب تطبیق دهید.
