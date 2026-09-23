---
title: فرایند بوت
sidebar_position: 3
description: Firmware، ESP، GRUB، هسته، initramfs و systemd به‌عنوان PID 1 روی Ubuntu 26.04.
---

# فرایند بوت

## مقدمه

هدف ۱۰۱.۲ و ۱۰۱.۳ و ۱۰۲.۲ این است که از روشن شدن دستگاه تا رسیدن به هدف چندکاربره (multi-user target) را مرحله به مرحله بلد باشید و وقتی منوی بوت خراب شد، از کنسول برش گردانید. این صفحه همان مسیر را روی Ubuntu Server 26.04 و Debian 13 می‌نویسد. دیدن لاگ سرویس به‌طور کلی در [journalctl](/docs/01-linux/journalctl) است. اینجا فقط رویداد بوت و بازیابی در حد LPIC-1 است.

systemd به‌عنوان PID 1 در [معماری](/docs/02-lpic/lpic1-101-architecture) معرفی شد. واحد و `systemctl` روزمره در [systemd](/docs/01-linux/systemd) و [مدیریت سرویس](/docs/01-linux/service-management) است.

## مفهوم اصلی

بوت یک زنجیره است. اگر یک حلقه خراب شود، حلقهٔ بعدی اصلاً شروع نمی‌شود. Firmware دیسک را بوت می‌کند، مدیر بوت (bootloader) هسته و initramfs را در حافظه می‌گذارد، هسته دیسک واقعی را با کمک initramfs سوار می‌کند، و اولیـن فرایند فضای کاربر را اجرا می‌کند. روی این دو توزیع آن فرایند systemd است.

دو نوع firmware را آزمون کنار هم می‌خواهد. BIOS قدیمی سکتور اول دیسک (MBR) را می‌خواند. UEFI یک فایل بوت را از پارتیشن سیستم EFI (ESP) می‌خواند. ESP فایل‌سیستم FAT است و روی Ubuntu معمولاً در `/boot/efi` سوار می‌شود. نصب مرجع این دانشنامه UEFI است. GRUB Legacy و فایل `menu.lst` را فقط بشناسید؛ چیزی که تعمیر می‌کنید GRUB 2 است.

initramfs یک ریشهٔ موقت در حافظه است تا هسته بتواند LVM، RAID یا دیسک را ببیند و به ریشهٔ واقعی سوئیچ کند. سازندهٔ این تصویر روی نصب تازهٔ Ubuntu 26.04 برنامهٔ dracut است. Debian 13 هنوز معمولاً `initramfs-tools` است و دستورش `update-initramfs` است. میزبانی که از 24.04 ارتقا یافته ممکن است هنوز initramfs-tools داشته باشد. نوع را از روی سیستم بخوانید، حفظ نکنید.

## چرا استفاده می‌شود؟

بیشتر قطعی‌هایی که «سرور بالا نمی‌آید» توصیف می‌شوند، یا منوی GRUB است، یا ریشه پیدا نمی‌شود، یا systemd به هدف اضطراری افتاده است. بدون تفکیک این سه، اپراتور هسته را عوض می‌کند در حالی که فقط برچسب ESP غلط است.

دلیل دوم آزمون این است که پارامتر هسته و هدف بوت را از روی خط فرمان GRUB موقتاً عوض کنید، بدون این که `/etc/default/grub` را برای همیشه خراب کنید. تغییر دائمی جداست و باید `update-grub` بخورد.

## Architecture

```text
روشن شدن
   │
   ▼
Firmware  BIOS (MBR)  یا  UEFI (فایل روی ESP، اغلب /boot/efi)
   │
   ▼
GRUB 2    منو، خط هسته، انتخاب تصویر
   │
   ├─ vmlinuz        هسته
   └─ initrd.img     initramfs
          │
          ▼
     dracut یا اسکریپت initramfs-tools
     سوار کردن ریشهٔ واقعی (و LVM اگر باشد)
          │
          ▼
     systemd به‌عنوان PID 1
          │
          ├─ sysinit.target
          ├─ local-fs.target
          ├─ network.target
          └─ multi-user.target     پیش‌فرض سرور
                یا graphical.target   پیش‌فرض دسکتاپ
                یا rescue.target       تعمیر، فایل‌سیستم‌ها تا حد ممکن سوار
                یا emergency.target    حداقل، ممکن است ریشه فقط‌خواندنی باشد
```

فایل تولیدشدهٔ منو `/boot/grub/grub.cfg` است. آن را دستی ویرایش نکنید. منبع تنظیم `/etc/default/grub` است و `update-grub` در عمل `grub-mkconfig` را صدا می‌زند. GRUB Legacy از `menu.lst` و گاهی `grub.conf` استفاده می‌کرد. اگر آن فایل را روی 26.04 پیدا نکردید، طبیعی است.

systemd-boot بستهٔ جدا در مخزن است و مدیر بوت پیش‌فرض Ubuntu Server نیست. این فصل آن را نصب نمی‌کند. تعمیر آزمایشگاه با GRUB است.

## Installation

GRUB روی نصب استاندارد از قبل هست. اگر ESP خالی شده و بسته هم نیست، بستهٔ EFI را نصب کنید. این دستور به‌تنهایی بوت‌لودر را روی دیسک نمی‌نویسد.

```bash
sudo apt update
sudo apt install grub-efi-amd64 efibootmgr
```

میزبان BIOS قدیمی به‌جای آن `grub-pc` می‌خواهد. هر دو را با هم به‌عنوان «شاید لازم شد» نصب نکنید تا وقتی `lsblk` و `[ -d /sys/firmware/efi ]` نوع firmware را نگفته باشند.

```bash
if [ -d /sys/firmware/efi ]; then
  echo UEFI
else
  echo BIOS
fi
findmnt /boot/efi
ls /boot/vmlinuz-* /boot/initrd.img-*
```

خروجی UEFI سالم، mount شدن ESP و وجود جفت هسته و initrd است.

```text
UEFI
TARGET SOURCE    FSTYPE OPTIONS
/boot/efi /dev/vda1 vfat rw,relatime
/boot/vmlinuz-7.0.0-22-generic
/boot/initrd.img-7.0.0-22-generic
```

شمارهٔ هسته مال میزبان شماست. اگر `initrd.img` متناظر یک `vmlinuz` نبود، آن هسته بوت نمی‌شود.

## Configuration

خط هسته‌ای که همین حالا بوت شده:

```bash
cat /proc/cmdline
systemctl get-default
```

نمونه:

```text
BOOT_IMAGE=/vmlinuz-7.0.0-22-generic root=UUID=... ro quiet splash
multi-user.target
```

تغییر دائمی مهلت منو و یک پارامتر، در `/etc/default/grub` است. برای دیدن بهترِ خرابی بوت در آزمایشگاه، `quiet splash` را برمی‌داریم. روی تولید که کنسول سریال لاگ دارد، این کار سلیقه‌ای است.

```bash
sudo cp -a /etc/default/grub /etc/default/grub.bak.$(date +%Y%m%d)
sudoedit /etc/default/grub
```

مقادیری که برای سرور آزمایشگاه منطقی است: `GRUB_TIMEOUT=5` و `GRUB_CMDLINE_LINUX_DEFAULT=""` بدون quiet. بعد از ذخیره:

```bash
sudo update-grub
```

خروجی باید هسته را پیدا کند و `done` بدهد. اگر `Found linux image` نیامد، `/boot` سوار نیست یا هسته نصب نیست.

بازسازی initramfs را با سازندهٔ واقعی انجام دهید.

```bash
if command -v dracut >/dev/null 2>&1; then
  sudo dracut -f --kver "$(uname -r)"
else
  sudo update-initramfs -u
fi
```

هدف پیش‌فرض سرور باید `multi-user.target` بماند. عوض کردنش به `graphical.target` روی سرور بدون نمایشگر فقط بوت را به واحدهایی وابسته می‌کند که نصب نیستند.

```bash
sudo systemctl set-default multi-user.target
```

خاموش کردن تمیز، با خبر به کاربران واردشده:

```bash
wall "reboot for kernel in 5 minutes"
sudo shutdown -r +5 "kernel reboot"
```

لغو، اگر هنوز مهلت مانده: `sudo shutdown -c`. آزمون `telinit` و `/etc/inittab` را هم نام می‌برد. روی systemd فایل inittab مبنای کار نیست. معادل تعویض هدف: `sudo systemctl isolate rescue.target`. این جلسهٔ SSH را ممکن است قطع کند. فقط از کنسول بزنید.

## Production Example

هستهٔ تازه بعد از `apt upgrade` بوت نمی‌شود و منوی GRUB هستهٔ قبلی را هنوز دارد. از کنسول، در منو هستهٔ قبلی را انتخاب کنید. بعد از بالا آمدن، تصویر خراب را از لیست پاک نکنید تا وقتی یک بوت سالم با هستهٔ قبلی ثبت شده باشد.

علت را از journal همان بوت شکست‌خورده بخوانید. بوت جاری `-b` است و بوت قبلی `-b -1`.

```bash
journalctl --list-boots
journalctl -b -1 -p err --no-pager
journalctl -b -1 -u dracut-pre-pivot.service --no-pager | tail -n 40
```

اگر واحد dracut نبود، میزبان initramfs-tools است و همان `journalctl -b -1 -p err` کافی است. `dmesg` فقط بافر هستهٔ بوت جاری را نشان می‌دهد و بوت قبلی را ندارد؛ برای بوت قبلی journal ابزار درست است. هدف ۱۰۱.۲ هر دو را نام برده است.

نصب دوبارهٔ GRUB وقتی ورودی UEFI پاک شده، از داخل سیستم سالم، این است. دستگاه دیسک را از `lsblk` بردارید. مثال VM آزمایشگاه `/dev/vda` است.

:::danger نوشتن بوت‌لودر
`grub-install` روی دیسک اشتباه، بوت همان دیسک را عوض می‌کند. اگر مسیر را از این صفحه کپی کنید و دیسک سیستم شما `sda` یا `nvme0n1` باشد، ممکن است دیسک دیگری را هدف بگیرید. اول `lsblk` و `findmnt /boot/efi`.
:::

```bash
lsblk -o NAME,SIZE,FSTYPE,MOUNTPOINT
sudo grub-install --target=x86_64-efi --efi-directory=/boot/efi --bootloader-id=ubuntu
sudo update-grub
```

خروجی سالم `Installation finished. No error reported.` است. روی BIOS، شکل دستور فرق دارد و دیسک را می‌گیرد نه پارتیشن را: `sudo grub-install /dev/vda`. پارتیشن را به این شکل دوم ندهید.

## Security Notes

منوی GRUB اگر رمز نداشته باشد، هر کس با کنسول می‌تواند `init=/bin/bash` بدهد و بدون رمز ریشه به پوسته برسد. قفل GRUB برای آزمایشگاه اجباری نیست و برای سرور اتاق که کنسول فیزیکی در دسترس غریبه است لازم است. رمز GRUB را داخل این صفحه نمونه نمی‌سازیم؛ اگر لازم شد از `grub-mkpasswd-pbkdf2` استفاده کنید و هش را در یک فایل drop-in زیر `/etc/grub.d` بگذارید، نه در یادداشت تیکت.

`rescue.target` و پوستهٔ initramfs یعنی دسترسی ریشه. آن را روی SSH باز نگذارید. پارامتر موقتی مثل `systemd.unit=rescue.target` را در خط GRUB همان یک بوت وارد کنید و در `/etc/default/grub` جا نگذارید.

به‌روزرسانی هسته را حذف نکنید تا منو خلوت شود. هستهٔ قبلی تنها راه برگشت وقتی هستهٔ نو پانیک می‌کند. بستهٔ متای هسته را purge نکنید.

## Troubleshooting

علامت: بعد از reboot، صفحه روی `grub rescue>` مانده است.

معنی: GRUB مرحلهٔ اول بالا آمده و ماژول یا پارتیشن `/boot` را پیدا نکرده است. `ls` در همان اعلان دیسک‌هایی را که GRUB می‌بیند نشان می‌دهد. اگر هیچ دیسکی نیست، مشکل firmware یا مسیر دیسک VM است، نه کانفیگ داخل لینوکس. از مدیا زنده ادامه دهید.

بازیابی در حد LPIC-1، از ایمیج Ubuntu 26.04، وقتی ریشه پارتیشن دوم و ESP پارتیشن اول `vda` است. شماره را با `lsblk` عوض کنید.

```bash
lsblk -f
sudo mount /dev/vda2 /mnt
sudo mount /dev/vda1 /mnt/boot/efi
sudo mount --bind /dev /mnt/dev
sudo mount --bind /proc /mnt/proc
sudo mount --bind /sys /mnt/sys
sudo mount --bind /sys/firmware/efi/efivars /mnt/sys/firmware/efi/efivars
sudo chroot /mnt
grub-install --target=x86_64-efi --efi-directory=/boot/efi --bootloader-id=ubuntu
update-grub
exit
sudo reboot
```

اگر `chroot` گفت هسته یا `grub-install` نیست، یا ریشه را اشتباه سوار کرده‌اید یا `/usr` پارتیشن جدا بوده و سوار نشده. `findmnt` را قبل از chroot دوباره ببینید. سناریوی کلی‌تر بالا نیامدن در [سرور بالا نمی‌آید](/docs/14-troubleshooting/server-down) است.

علامت دوم: سیستم بالا می‌آید ولی فقط حالت اضطراری است و ریشه فقط‌خواندنی است. `journalctl -b -p err` را بخوانید. خطای رایج، ورودی خراب `/etc/fstab` است. تا اصلاحش نکرده‌اید `mount -o remount,rw /` فقط برای ویرایش همان فایل است.

## Best Practices

- پیش‌فرض سرور `multi-user.target` بماند. `graphical.target` را برای آزمون بشناسید و روی سرور ست نکنید.
- `grub.cfg` را دستی ویرایش نکنید. تغییر در `/etc/default/grub` و سپس `update-grub`.
- قبل از `grub-install` نوع firmware و نقطهٔ سوار شدن ESP را بنویسید. یک دستور برای UEFI و BIOS وجود ندارد.
- initramfs را با ابزاری بسازید که همان میزبان استفاده می‌کند: dracut روی نصب تازهٔ 26.04، `update-initramfs` روی Debian 13 و روی ارتقاهای قدیمی.
- هستهٔ قبلی را تا یک دورهٔ به‌روزرسانی نگه دارید. بوت شکست‌خورده را با `journalctl -b -1` بخوانید نه با حدس.

## تمرین

این تمرین را فقط روی VM آزمایشگاه و با کنسول باز انجام دهید. SSH را تنها مسیر خودتان نکنید.

1. نوع firmware، هدف پیش‌فرض، و این که initramfs را dracut می‌سازد یا `update-initramfs`، را با دستور ثابت کنید.
2. یک reboot تمیز با پنج دقیقه خبر انجام دهید و بعد از بالا آمدن خطاهای بوت جاری را ببینید.
3. به این سؤال‌ها جواب دهید: فرق `rescue.target` با `emergency.target` چیست؟ چرا `menu.lst` روی این سرور نیست؟ اگر `grub-install /dev/vda1` را روی سیستم BIOS بزنید چه اشتباهی کرده‌اید؟

```bash
if [ -d /sys/firmware/efi ]; then echo UEFI; else echo BIOS; fi
systemctl get-default
command -v dracut || command -v update-initramfs
sudo shutdown -r +5 "lab boot exercise"
```

بعد از بازگشت:

```bash
journalctl -b -p err --no-pager
```

## پاسخ تمرین

خروجی اول باید `UEFI` یا `BIOS` باشد، نه هر دو. سرور آزمایشگاه `multi-user.target` است. روی نصب تازهٔ Ubuntu 26.04 مسیر `dracut` پیدا می‌شود. روی Debian 13 مسیر `update-initramfs` پیدا می‌شود. `journalctl -b -p err` ممکن است خالی باشد؛ خالی یعنی این بوت خطای ثبت‌شده با آن اولویت نداشته، نه این که دستور غلط است. اگر `Failed to start` دیدید، واحد را با `journalctl -b -u نام-واحد` باز کنید و به صفحهٔ همان سرویس برگردید.

فرق هدف‌ها: `rescue.target` برای تعمیر است و تا جایی که fstab سالم باشد فایل‌سیستم‌ها را سوار می‌کند و چند سرویس پایه را بالا می‌آورد. `emergency.target` زودتر است، ممکن است ریشه فقط‌خواندنی بماند، و برای وقتی است که خود سوار کردن فایل‌سیستم شکست خورده. هر دو را از راه SSH آزمایش نکنید.

`menu.lst` مال GRUB Legacy است. GRUB 2 منو را در `grub.cfg` تولید می‌کند.

`grub-install /dev/vda1` روی BIOS اشتباه است چون آن شکل دستور دیسک کامل را می‌خواهد (`/dev/vda`) تا کد مرحلهٔ اول در MBR بنشیند، نه یک پارتیشن. روی UEFI اصلاً از آن شکل استفاده نکنید؛ هدف `x86_64-efi` و مسیر `--efi-directory` لازم است.
