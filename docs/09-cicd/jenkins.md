---
title: Jenkins
sidebar_position: 4
description: "نصب LTS از مخزن debian-stable روی pkg.jenkins.io با Java 21، قفل راه‌اندازی، و Jenkinsfile هم‌معنی سناریوی استقرار."
---

# Jenkins

## مقدمه

Jenkins در این آزمایشگاه کنترلر خط لولهٔ سرویس `app` است، فقط اگر تیم همین ابزار را انتخاب کرده باشد. بسته از خط پایدار (LTS) و از مخزن `debian-stable` روی `pkg.jenkins.io` می‌آید. بستهٔ جاوا همانی است که صفحهٔ نصب LTS همان روز می‌گوید. در سپتامبر ۲۰۲۶ آن صفحه `openjdk-21-jre` را نصب می‌کند و سیاست پشتیبانی جاوا برای LTS جاری، Java 21 را پشتیبانی می‌کند. نمونهٔ این صفحه همان را نصب می‌کند.

بعد از نصب، رابط وب قفل است تا رمز فایل `initialAdminPassword` را بدهید. کاربر ادمین انسانی می‌سازید و حساب یونیکس `jenkins` را با آن قاطی نمی‌کنید. پورت `8080` فقط داخلی است: فرایند به `127.0.0.1` گوش می‌دهد و از شبکهٔ آزمایشگاه مستقیم باز نمی‌شود.

Jenkinsfile پایین همان ترتیب سناریو است: تست، ساخت ایمیج، پوش با شناسهٔ git، و استقرار با اجرای یک اسکریپت ازپیش‌موجود. معنای استقرار در [سناریو](/docs/09-cicd/pipeline-scenario) است.

## مفهوم اصلی

کنترلر Jenkins کار زمان‌بندی و UI و نگه‌داشتن اعتبارنامه را می‌کند. خود build اگر روی کنترلر اجرا شود، یعنی Jenkinsfile کد دلخواه روی همان میزبان است. در این آزمایشگاه کنترلر روی `docker-1.example.internal` (`10.10.1.30`) نصب می‌شود تا CLI داکر همان‌جا باشد، ولی UI به `127.0.0.1:8080` چسبیده است. برنامهٔ `app` روی همان میزبان به `10.10.1.30:8080` منتشر می‌شود، نه به loopback. این دو گوش‌دادن با هم قاطی نمی‌شوند، به شرطی که Jenkins را به `0.0.0.0` برنگردانید. اگر برگردانید، قانون فایروال پورت `8080` که برای برنامه از سمت پروکسی باز است، UI جنکینز را هم به پروکسی نشان می‌دهد.

Pipeline یعنی Jenkinsfile داخل مخزن. مرحله‌ها (stage) ترتیب را نشان می‌دهند. شناسهٔ کامیت در متغیر `GIT_COMMIT` است وقتی Jenkins مخزن را با افزونهٔ Git چک‌اوت کرده باشد. استقرار با اعتبارنامهٔ SSH انجام می‌شود، نه با نوشتن کلید داخل Jenkinsfile.

قفل راه‌اندازی (setup wizard) همان رمز یک‌باره است. بعد از ساخت کاربر انسانی، آن فایل دیگر راه ورود روزانه نیست. ورود روزانه کاربر `ops` در خود Jenkins است، با گذرواژه‌ای که در مدیر گذرواژهٔ تیم است، نه در مخزن و نه در این صفحه.

## چرا استفاده می‌شود؟

تیمی که سال‌ها Jenkins دارد، خط لوله را با همان عامل و همان مدل اعتبارنامه جلو می‌برد و ابزار چهارم بالا نمی‌آورد. اگر مخزن روی `gitlab.example.internal` است و تیمی برای نگهداری Jenkins ندارید، Runner ساده‌تر است. این صفحه فرض می‌کند انتخاب انجام شده.

چیزی که Jenkins اینجا عوض نمی‌کند: برچسب ایمیج هنوز شناسهٔ git است، رجیستری هنوز `registry.example.internal` است، و مرحلهٔ آخر هنوز فقط `/opt/apps/app/bin/deploy.sh` را روی `10.10.1.10` صدا می‌زند.

## Architecture

```text
ops  --SSH local forward-->  127.0.0.1:8080 روی docker-1
                                    Jenkins کنترلر
                                    کاربر یونیکس jenkins
                                    │
                                    ├─ stage Test
                                    ├─ stage Docker Build
                                    ├─ stage Push
                                    │     registry.example.internal/app:<GIT_COMMIT>
                                    └─ stage Deploy
                                          ssh deploy@10.10.1.10
                                          فقط اسکریپت موجود
                                                │
                                                ▼
                                          docker compose روی docker-1
                                          از داخل همان اسکریپت

گوش‌دادن‌ها روی docker-1، هر دو پورت 8080، آدرس متفاوت:
  127.0.0.1:8080     UI جنکینز، از شبکه دیده نمی‌شود
  10.10.1.30:8080    کانتینر app، فقط از پروکسی 10.10.1.5
```

پروکسی `10.10.1.5` این UI را منتشر نمی‌کند. `db-1` و `gitlab.example.internal` میزبان کنترلر نیستند.

## Installation

صفحهٔ مخزن منبع حقیقت کلید امضاست:

https://pkg.jenkins.io/debian-stable

در سپتامبر ۲۰۲۶ همان صفحه فایل کلید `jenkins.io-2026.key` را نشان می‌دهد. اگر امروز نام فایل روی آن صفحه فرق دارد، نام صفحه را کپی کنید و نام این دانشنامه را نه. کلید قدیمی‌تری که هنوز در بعضی صفحه‌های راهنمای نصب مانده (`jenkins.io-2023.key`) در برابر صفحهٔ خود مخزن اولویت ندارد. صفحهٔ سیاست جاوا هم منبع پشتیبانی نسخه است:

https://www.jenkins.io/doc/book/platform-information/support-policy-java/

LTS از انتشار ۲.۵۵۵.۱ در آوریل ۲۰۲۶ به Java 21 یا Java 25 نیاز دارد. نمونهٔ نصب، بستهٔ JREای است که خود صفحهٔ debian-stable می‌نویسد: `openjdk-21-jre`. Java 21 انتخاب این آزمایشگاه است چون همان صفحه آن را نصب می‌کند، نه چون یک شمارهٔ دلخواه خوش‌دست بود. اگر صفحهٔ نصب بعدها بستهٔ دیگری نوشت، همان بسته را نصب کنید و این پاراگراف را در مخزن دانشنامه به‌روز کنید.

```bash
sudo apt update
sudo apt install ca-certificates curl fontconfig openjdk-21-jre
java -version
sudo install -d -m 755 /etc/apt/keyrings
sudo curl -fsSL -o /etc/apt/keyrings/jenkins-keyring.asc \
  https://pkg.jenkins.io/debian-stable/jenkins.io-2026.key
echo "deb [signed-by=/etc/apt/keyrings/jenkins-keyring.asc] https://pkg.jenkins.io/debian-stable binary/" \
  | sudo tee /etc/apt/sources.list.d/jenkins.list >/dev/null
sudo apt update
sudo apt install jenkins
sudo systemctl enable --now jenkins
systemctl status jenkins --no-pager
```

`java -version` باید خط Java 21 را نشان دهد قبل از اینکه بستهٔ `jenkins` نصب شود. اگر جاوا را بعد از Jenkins نصب کنید، سرویس گاهی با پیام `failed to find a valid Java installation` بالا نمی‌آید. در آن حالت جاوا را نصب کنید و `sudo systemctl restart jenkins` بزنید.

شمارهٔ دقیق LTS را بستهٔ apt انتخاب می‌کند. بعد از نصب این را یادداشت کنید، نه یک شماره از حافظه:

```bash
apt-cache policy jenkins
```

قفل setup را از این فایل بخوانید. مجوزش باید محدود باشد. خروجی را در تاریخچهٔ عمومی نچسبانید:

```bash
sudo ls -l /var/lib/jenkins/secrets/initialAdminPassword
sudo cat /var/lib/jenkins/secrets/initialAdminPassword
```

UI را از لپ‌تاپ با تونل باز کنید، نه با منتشر کردن پورت:

```bash
ssh -L 8080:127.0.0.1:8080 ops@10.10.1.30
```

در مرورگر همان لپ‌تاپ نشانی `http://127.0.0.1:8080` را باز کنید. رمز فایل را بدهید. اگر آزمایشگاه به اینترنت برای پلاگین راه ندارد، نصب پلاگین پیشنهادی را رد کنید و فقط آنچه job واقعاً لازم دارد را بعداً از آینهٔ داخلی بگذارید. کاربر ادمین را `ops` بسازید. ثبت‌نام عمومی (sign-up) را خاموش کنید. دسترسی ناشناس Overall/Read را ندهید. حالت «ادامه با کاربر admin موقت» را به‌عنوان ورود دائمی رها نکنید.

کاربر یونیکس `jenkins` را بسته می‌سازد و خانهٔ آن `/var/lib/jenkins` است. با این کاربر SSH تعاملی به بقیهٔ سرورها نزنید. برای ساخت ایمیج روی همین `docker-1`، این کاربر باید سوکت Docker را ببیند. گروه `docker` معادل root است:

```bash
sudo usermod -aG docker jenkins
sudo systemctl restart jenkins
id jenkins
```

این عضویت را روی `app-1` و `db-1` تکرار نکنید.

## Configuration

گوش‌دادن را با drop-in سیستم‌دی قفل کنید. واحد بسته را دست‌کاری نکنید تا به‌روزرسانی بعدی آن را برنگرداند. دستور `systemctl edit` فایل override را می‌سازد:

```bash
sudo systemctl edit jenkins
```

این محتوا را بگذارید:

```ini
[Service]
Environment="JENKINS_LISTEN_ADDRESS=127.0.0.1"
```

بعد:

```bash
sudo systemctl daemon-reload
sudo systemctl restart jenkins
sudo ss -ltnp | grep 8080
```

خروجی سالم دو خط جدا دارد، یا حداقل خط جنکینز فقط `127.0.0.1:8080` است. خط برنامه، اگر کانتینر بالا باشد، `10.10.1.30:8080` است. اگر `ss` نشان داد جنکینز روی `0.0.0.0:8080` یا روی `*:8080` است، drop-in اعمال نشده. `systemctl cat jenkins` را بخوانید و دنبال `JENKINS_LISTEN_ADDRESS` بگردید. تا وقتی این درست نشده، قانون فایروال پروکسی را برای پورت `8080` باز نکنید.

روی `docker-1` فایروال نباید پورت `8080` را از کل دنیا قبول کند. اگر UFW روشن است، فقط پروکسی به پورت برنامه برسد و منبع loopback برای خود جنکینز کافی است. نمونهٔ قانون برنامه در [UFW](/docs/10-security/ufw) است. قانون جداگانه‌ای به شکل «allow 8080 از همه‌جا» ننویسید.

اعتبارنامه: Manage Jenkins، Credentials، یک SSH Username with private key برای کاربر `deploy` و کلید `ed25519`. شناسهٔ اعتبارنامه در Jenkinsfile پایین `deploy-app-1` است. کلید را داخل مخزن و داخل Jenkinsfile نگذارید. افزونهٔ Credentials Binding برای `withCredentials` و `sshUserPrivateKey` لازم است. اگر مرحلهٔ Jenkinsfile این تابع را نمی‌شناسد، همان افزونه را از به‌روزرسانی افزونه‌ها نصب کنید. نسخهٔ افزونه را این صفحه ثابت نمی‌کند. نسخه‌ای را بگذارید که خود Jenkins در مدیریت افزونه‌ها برای همین LTS پیشنهاد می‌کند.

`Jenkinsfile` در ریشهٔ مخزن `app`:

```groovy
pipeline {
  agent any
  options {
    timestamps()
    disableConcurrentBuilds()
  }
  environment {
    IMAGE = 'registry.example.internal/app'
  }
  stages {
    stage('Test') {
      steps {
        sh 'bash scripts/test.sh'
      }
    }
    stage('Docker Build') {
      steps {
        sh 'docker build -t "$IMAGE:$GIT_COMMIT" .'
      }
    }
    stage('Push') {
      steps {
        withCredentials([string(credentialsId: 'registry-token', variable: 'REGISTRY_TOKEN')]) {
          sh 'printf "%s\n" "$REGISTRY_TOKEN" | docker login registry.example.internal --username deploy --password-stdin'
          sh 'docker push "$IMAGE:$GIT_COMMIT"'
        }
      }
    }
    stage('Deploy') {
      when {
        branch 'main'
      }
      steps {
        withCredentials([sshUserPrivateKey(credentialsId: 'deploy-app-1', keyFileVariable: 'DEPLOY_KEY', usernameVariable: 'DEPLOY_USER')]) {
          sh '''
            test -n "$GIT_COMMIT"
            ssh -i "$DEPLOY_KEY" -o IdentitiesOnly=yes -o StrictHostKeyChecking=yes \
              "$DEPLOY_USER@10.10.1.10" \
              /opt/apps/app/bin/deploy.sh "$GIT_COMMIT"
          '''
        }
      }
    }
  }
}
```

شناسهٔ `registry-token` یک اعتبارنامهٔ از نوع Secret text است و همان توکن رجیستری است. لاگ Jenkins مقدار ماسک‌شده را نشان می‌دهد اگر از `withCredentials` گذشته باشد. باز هم `echo` روی `REGISTRY_TOKEN` یا `DEPLOY_KEY` نگذارید و گزینهٔ verbose شل را دور کلید روشن نکنید.

`known_hosts` کاربر `jenkins` باید کلید `10.10.1.10` را داشته باشد. یک بار با `sudo -u jenkins ssh-keyscan` می‌توانید پیش‌نویس بگیرید، ولی اثر انگشت را با کنسول خود `app-1` مقایسه کنید. `StrictHostKeyChecking=no` را به Jenkinsfile اضافه نکنید.

job چندشاخه‌ای یا Pipeline from SCM را طوری بگذارید که فقط Jenkinsfile همین مخزن بارگذاری شود. اسکریپت Groovy آزاد داخل UI، کنار Jenkinsfile مخزن، دو منبع حقیقت می‌سازد. یکی را نگه دارید: فایل مخزن.

حفاظت CSRF پیش‌فرض Jenkins را خاموش نکنید. کاربر تازه‌ای که حق Administer دارد نسازید جز `ops`. حق Job/Build را به گروه ناشناس ندهید.

## Production Example

کامیت کوچک روی `main`. job را از UI باز کنید. مرحلهٔ Test اگر `scripts/test.sh` را غیرصفر کند، مرحلهٔ Docker Build شروع نمی‌شود و کانتینر تولید سر جایش می‌ماند.

مرحلهٔ Push ایمیج `registry.example.internal/app:` را با `GIT_COMMIT` می‌فرستد. در لاگ مرحله، شناسه را با صفحهٔ کامیت مقایسه کنید. مرحلهٔ Deploy فقط وقتی شاخه `main` است اجرا می‌شود و در لاگ، دستور `ssh` به مسیر اسکریپت ختم می‌شود. آرگومان دوم چیزی جز شناسه نیست.

اگر بخواهید بدون کامیت جدید همان شناسه را دوباره مستقر کنید، Rebuild همان build کافی است، به شرطی که ایمیج هنوز در رجیستری باشد. Rebuild یک build شکست‌خوردهٔ تست، استقرار را اجرا نمی‌کند چون مرحلهٔ آخر نوبتش نمی‌شود.

برگشت نسخه کار Jenkinsfile جدا نیست. شناسهٔ قبلی را می‌دانید و اسکریپت برگشت روی `docker-1` همان را برمی‌گرداند. اگر اصرار دارید برگشت هم از Jenkins دیده شود، همان Jenkinsfile را با پارامتر شناسه گسترش ندهید مگر اسکریپت هنوز فقط شناسهٔ هگز را بپذیرد. پارامتر آزاد، قرار «نه یک رشتهٔ دستور» را می‌شکند.

## Security Notes

رابط ادمین Jenkins اگر به شبکه باز باشد، هدف اول است. پورت `8080` روی `0.0.0.0` یعنی هر کسی که به فایروال برسد فرم ورود را می‌بیند، و یک گذرواژهٔ ضعیف یا یک پلاگین قدیمی کل میزبان ساخت را می‌دهد. چون کاربر `jenkins` در گروه `docker` است، ادمین Jenkins روی این میزبان عملاً root است. این را به همهٔ کسانی که حساب `ops` جنکینز دارند بگویید.

قفل اولیه را بعد از ساخت کاربر رها نکنید. فایل `initialAdminPassword` را در تیکت و در لاگ shell جمعی paste نکنید. اگر لو رفت، کاربر ادمین را عوض کنید. خود فایل بعد از تمام شدن wizard راه میانبر تازه‌ای نمی‌سازد، ولی عادت paste کردن رمز را باید همان روز قطع کرد.

Jenkinsfile را مثل اسکریپت root مرور کنید. `agent any` روی این صفحه یعنی همان کنترلر. عامل دوم را به `db-1` وصل نکنید. پورت عامل ورودی (معمولاً `50000`) را باز نکنید وقتی همهٔ مرحله‌ها روی خود کنترلر اجرا می‌شوند.

کلید خصوصی فقط در انبار اعتبارنامه است. بکاپ `/var/lib/jenkins` شامل همان کلید و گذرواژهٔ کاربران Jenkins است. آن بکاپ را کنار بکاپ عمومی جهان‌خوانا نگذارید. مسیر بکاپ میزبان در فصل امنیت است و آنجا هم رازها باید روی مقصد محدود بمانند.

## Troubleshooting

| نشانه | معنی | کار |
| --- | --- | --- |
| `failed to find a valid Java installation` | جاوا بعد از بستهٔ Jenkins آمده یا JRE دیگری پیش‌فرض است | `java -version` باید 21 باشد، بعد `systemctl restart jenkins` |
| `apt update` خطای NO_PUBKEY برای Jenkins | فایل کلید با صفحهٔ مخزن یکی نیست یا تاریخ کلید گذشته | کلید را دوباره از `pkg.jenkins.io/debian-stable` بردارید |
| مرورگر آزمایشگاه به `10.10.1.30:8080` می‌رود و برنامه را می‌بیند نه Jenkins | این رفتار درست است | UI فقط از تونل به `127.0.0.1:8080` |
| مرورگر از بیرون خود Jenkins را باز می‌کند | `JENKINS_LISTEN_ADDRESS` اعمال نشده | `ss -ltnp` و drop-in را دوباره چک کنید |
| `groovy.lang.MissingMethodException` برای `sshUserPrivateKey` | Credentials Binding نصب نیست | افزونه را از مدیریت افزونه‌های خود Jenkins نصب کنید، نه از یک فایل jar ناشناس |
| `Host key verification failed` | `known_hosts` کاربر `jenkins` خالی است | اثر انگشت را مقایسه کنید و همان را اضافه کنید |
| مرحلهٔ Deploy روی شاخهٔ ویژگی اجرا شد | شرط `branch 'main'` حذف شده | Jenkinsfile را به نمونهٔ همین صفحه برگردانید |
| لاگ مرحله کلید را نشان می‌دهد | یک `sh` آن را چاپ کرده | مرحله را حذف کنید، کلید `deploy` را بچرخانید، اعتبارنامه را عوض کنید |

لاگ سرویس وقتی خود Jenkins بالا نمی‌آید:

```bash
sudo journalctl -u jenkins -n 80 --no-pager
```

اگر UI بالا است و فقط pipeline قرمز است، لاگ مرحله داخل UI دقیق‌تر از journal است.

## Best Practices

- مخزن `debian-stable` را نگه دارید و مخزن weekly را کنارش اضافه نکنید. دو خط بسته، دو نسخه، و یک سرویس است.
- هر بار صفحهٔ کلید را با فایل روی دیسک مقایسه کنید، مخصوصاً وقتی `apt update` ناگهان امضا را رد کرد. تاریخ انقضای کلید واقعی است.
- Java 21 را با یک JRE تصادفی از یک سایت شخص ثالث عوض نکنید تا وقتی صفحهٔ نصب LTS همان را گفته. Java 25 هم در سیاست فعلی پشتیبانی می‌شود. تا وقتی صفحهٔ debian-stable آن را به‌عنوان بستهٔ Ubuntu ننوشته، نمونهٔ آزمایشگاه روی `openjdk-21-jre` می‌ماند.
- پورت `8080` جنکینز را در Nginx پروکسی به‌عنوان یک `server_name` عمومی نگذارید. تونل SSH برای تیم کوچک آزمایشگاه کافی است.
- ثبت‌نام آزاد و دسترسی ناشناس را بعد از هر به‌روزرسانی بزرگ یک بار در Authorization دوباره نگاه کنید. بعضی آموزش‌ها این دو را روشن می‌کنند.
- Jenkinsfile را با [سناریو](/docs/09-cicd/pipeline-scenario) هم‌معنی نگه دارید. اگر اسکریپت مسیرش عوض شد، فقط رشتهٔ مسیر در مرحلهٔ Deploy عوض می‌شود، نه یک بلوک shell تازه.
