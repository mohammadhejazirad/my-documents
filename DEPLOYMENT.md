# Deployment

این سند فرآیند انتشار همین مخزن است. ریموت فعلی:

```text
https://github.com/mohammadhejazirad/my-documents.git
```

سایت پروژه، تا وقتی دامنهٔ اختصاصی تنظیم نشده:

```text
https://mohammadhejazirad.github.io/my-documents/
```

دانشنامهٔ فنی سرور جداست و در `docs/` می‌ماند. اینجا فقط خود پورتال مستندات منتشر می‌شود.

# Deployment Architecture

```text
feature branch
    │
    ▼
Pull Request → .github/workflows/ci.yml
    checkout → Node از .nvmrc → npm ci → npm run build
    │
    ▼
Review و merge به main
    │
    ▼
.github/workflows/deploy.yml
    checkout → Node → npm ci → npm run build
    upload-pages-artifact (فقط پوشهٔ build)
    deploy-pages روی environment به نام github-pages
    │
    ▼
GitHub Pages
```

Pull Request سایت تولید را عوض نمی‌کند. فقط push به `main` یا اجرای دستی همین workflow استقرار تولید می‌سازد.

روی لپ‌تاپ و در Docker متغیر `GITHUB_ACTIONS` خالی است، پس `baseUrl` برابر `/` می‌ماند و `npm start` و کانتینر مثل قبل از ریشه سرو می‌شوند. در Actions این متغیر را خود GitHub می‌گذارد و بیلد با این مقدارها ساخته می‌شود:

```text
url: https://mohammadhejazirad.github.io
baseUrl: /my-documents/
```

منطق در `docusaurus.config.ts` تابع `resolveSiteUrl` است. راست‌چین، فونت Vazirmatn، جستجوی محلی، حالت روشن/تیره و Prism همان تنظیم قبلی می‌مانند.

`trailingSlash` عمداً روی پیش‌فرض Docusaurus مانده است. مقدار `true` و `false` هر دو لینک‌های نسبی موجود بین صفحه‌های یک فصل را در بررسی بیلد می‌شکنند. پیش‌فرض با همان لینک‌ها بیلد را رد می‌کند.

# Requirements

- Node.js 24. فایل `.nvmrc` همین را می‌گوید. `package.json` هنوز `>=20` را می‌پذیرد، ولی CI و تصویر Docker مرحلهٔ build روی 24 هستند. Node 20 روی runnerهای GitHub از سپتامبر ۲۰۲۶ حذف شده است.
- npm و `package-lock.json`. CI از `npm ci` استفاده می‌کند، نه `npm install`.
- مخزن عمومی، یا پلنی که GitHub Pages را برای مخزن خصوصی هم بدهد. Pages حتی برای مخزن خصوصی، اگر فعال باشد، سایت را عمومی می‌کند.
- هیچ secretای برای این استقرار لازم نیست. توکن شخصی و کلید SSH استفاده نمی‌شود.

# GitHub Repository Setup

ریموت از قبل به `mohammadhejazirad/my-documents` اشاره می‌کند. اگر مخزن تازه ساخته شد، همان نام را نگه دارید یا در `docusaurus.config.ts` ثابت‌های `organizationName` و `projectName` را با نام واقعی یکی کنید. حدس نزنید.

شاخهٔ پیش‌فرض باید `main` باشد. workflowها فقط به `main` وصل‌اند.

# GitHub Pages Setup

یک بار، توسط صاحب مخزن:

1. Repository → Settings → Pages.
2. بخش Build and deployment.
3. Source را روی GitHub Actions بگذارید، نه روی شاخهٔ `gh-pages` و نه روی پوشهٔ `/docs`.

اگر Source روی شاخه باشد، هم workflow ما و هم Jekyll پیش‌فرض ممکن است با هم منتشر کنند. فقط GitHub Actions باید منبع باشد.

بعد از اولین استقرار موفق، همان صفحه آدرس `https://mohammadhejazirad.github.io/my-documents/` را نشان می‌دهد.

# GitHub Actions

دو فایل، و فقط همین دو، سایت را لمس می‌کنند:

| فایل | کی اجرا می‌شود | منتشر می‌کند؟ |
| --- | --- | --- |
| `.github/workflows/ci.yml` | pull request به `main` | نه |
| `.github/workflows/deploy.yml` | push به `main`، و اجرای دستی | بله |

نسخه‌های Action که روی Node 24 اجرا می‌شوند، چون runtime مبتنی بر Node 20 در runner حذف شده است:

- `actions/checkout@v7`
- `actions/setup-node@v7` با `cache: npm` و `node-version-file: .nvmrc`
- `actions/upload-pages-artifact@v5` با `path: build`
- `actions/deploy-pages@v5`

# CI Workflow

روی هر pull request به `main`:

```text
Checkout → Setup Node → npm ci → npm run build
```

اگر لینک شکسته باشد، `onBrokenLinks: throw` بیلد را می‌شکند و PR سبز نمی‌شود. استقرار تولید از این workflow صدا زده نمی‌شود.

کش npm به lockfile وصل است تا نصب تکراری کوتاه شود.

# Production Deployment Workflow

`deploy.yml` دو job دارد. job دوم `needs: build` دارد. اگر بیلد شکست بخورد، artifact ساخته نمی‌شود و deploy اجرا نمی‌شود.

مجوزها:

- کل workflow فقط `contents: read`.
- job استقرار فقط `pages: write` و `id-token: write`.

هم‌زمانی:

```yaml
concurrency:
  group: github-pages
  cancel-in-progress: true
```

اگر چند commit پشت سر هم به `main` برسد، استقرار ناتمام قبلی لغو می‌شود تا نسخهٔ کهنه‌تر بعد از نسخهٔ تازه منتشر نشود.

محیط `github-pages` آدرس نهایی را در `page_url` ثبت می‌کند.

# First Deployment

1. این تغییرات را commit و به `origin` روی `main` push کنید. تا وقتی روی GitHub نباشند، Actions اجرا نمی‌شود.
2. Settings → Pages → Source = GitHub Actions.
3. Actions را اگر برای مخزن غیرفعال است روشن کنید.
4. تب Actions را باز کنید. workflow به نام Deploy GitHub Pages باید روی همان push شروع شده باشد. اگر Source را بعد از push عوض کردید و workflow از قلم افتاد، یک بار Run workflow را بزنید.
5. صبر کنید jobهای Build و Deploy سبز شوند. اولین بار ممکن است چند دقیقه طول بکشد تا گواهی و DNS داخلی `github.io` آماده شود.
6. `https://mohammadhejazirad.github.io/my-documents/` را باز کنید. عنوان باید «دانشنامه DevOps» باشد و صفحه راست‌چین.

# Automatic Deployment

بعد از تنظیم بالا، هر merge یا push به `main` همان مسیر را تکرار می‌کند. کسی روی سرور دستور deploy نمی‌زند.

# Manual Deployment

اگر خواستید بدون commit تازه دوباره همان `main` را منتشر کنید:

```text
GitHub → Actions → Deploy GitHub Pages → Run workflow → Branch: main → Run workflow
```

این همان `workflow_dispatch` است.

# Custom Domain

دامنهٔ اختصاصی الان تنظیم نشده و فایل `static/CNAME` عمداً ساخته نشده است.

وقتی دامنه واقعی داشتید، مثلاً `docs.example.com`:

1. در `docusaurus.config.ts` لازم نیست نام را سخت کنید. در workflow استقرار، یا در Variables مخزن، این دو را با هم بگذارید:

```text
DOCUSAURUS_URL=https://docs.example.com
DOCUSAURUS_BASE_URL=/
```

هر دو باید باشند. اگر یکی خالی باشد، کد به حالت GitHub Pages پروژه برمی‌گردد.

2. فایل `static/CNAME` را فقط همان وقت بسازید و داخلش یک خط دامنه باشد، بدون `https://` و بدون مسیر:

```text
docs.example.com
```

3. در Settings → Pages همان دامنه را وارد کنید و بعد از صدور گواهی، Enforce HTTPS را روشن کنید.

4. یک commit بزنید تا سایت با `baseUrl: /` دوباره ساخته شود. بدون بیلد تازه، لینک‌ها هنوز زیر `/my-documents/` می‌مانند.

# DNS

رکوردها را از مستند رسمی GitHub Pages بردارید، نه از آموزش قدیمی. منبع این بخش صفحهٔ Managing a custom domain در docs.github.com است (بازبینی ۲۳ سپتامبر ۲۰۲۶).

زیردامنه، مثل `docs.example.com`:

| نوع | نام | مقدار |
| --- | --- | --- |
| CNAME | `docs` | `mohammadhejazirad.github.io` |

به نام مخزن (`my-documents`) اشاره نکنید. مقصد CNAME خود `USERNAME.github.io` است.

رأس دامنه، مثل `example.com`، چهار رکورد A و ترجیحاً چهار AAAA. اگر DNS شما ALIAS یا ANAME دارد، به‌جای این IPها به `mohammadhejazirad.github.io` اشاره کنید.

A:

```text
185.199.108.153
185.199.109.153
185.199.110.153
185.199.111.153
```

AAAA:

```text
2606:50c0:8000::153
2606:50c0:8001::153
2606:50c0:8002::153
2606:50c0:8003::153
```

رکورد اضافی A یا CNAME که به جای دیگری برود جلوی صدور HTTPS را می‌گیرد. رکورد wildcard نگذارید. بعد از تغییر:

```bash
dig docs.example.com +short
dig example.com +noall +answer -t A
```

# HTTPS

برای `https://mohammadhejazirad.github.io/my-documents/` گواهی را خود GitHub می‌دهد. کاری لازم نیست.

برای دامنهٔ اختصاصی، بعد از اینکه DNS درست به Pages رسید، در Settings → Pages گزینهٔ Enforce HTTPS را روشن کنید. تا گواهی صادر شود ممکن است چند دقیقه تا چند ساعت طول بکشد. قبل از آماده شدن گواهی، اجباری کردن HTTPS سایت را موقتاً باز نمی‌کند. صبر کنید، رکورد را عوض‌به‌عوض نکنید.

# Rollback

روش عادی، revert است نه force push.

```bash
git log --oneline
git revert <commit>
git push origin main
```

push به `main` دوباره workflow استقرار را اجرا می‌کند و artifact تازه، که محتوای commit برگشتی است، جایگزین سایت می‌شود.

اگر خود workflow خراب بود، revert همان commit مربوط به `.github/workflows` کافی است. استقرار در حال اجرا با concurrency لغو می‌شود و اجرای commit سالم بعدی منتشر می‌شود.

Force push به `main` روش بازگشت این پروژه نیست. تاریخ را بازنویسی می‌کند و review را دور می‌زند.

# Troubleshooting

| نشانه | کار |
| --- | --- |
| تب Pages می‌گوید سایت از یک شاخه منتشر می‌شود | Source را GitHub Actions کنید |
| Actions اصلاً فهرست نمی‌شود | Actions برای مخزن غیرفعال است، یا فایل YAML روی `main` نیست |
| Build قرمز با Broken link | لینک را در همان PR درست کنید. استقرار تولید اجرا نمی‌شود |
| سایت 404 و README مخزن را نشان می‌دهد | Source هنوز شاخه است، یا `baseUrl` با مسیر سایت یکی نیست |
| CSS و JS 404 اند | بیلد با `baseUrl` غلط بوده. در artifact، `index.html` باید به `/my-documents/assets` اشاره کند مگر دامنهٔ اختصاصی فعال باشد |
| فونت فارسی نیست | بیلد ناقص است. `@fontsource/vazirmatn` باید از `npm ci` آمده باشد. کش CDN مرورگر را خالی کنید |
| دو استقرار با هم تداخل دارند | concurrency گروه `github-pages` اجرای قبلی را لغو می‌کند. لاگ را برای cancelled ببینید |
| `npm ci` در CI شکست می‌خورد | `package-lock.json` با `package.json` یکی نیست. قفل را در همان PR به‌روز کنید |

# Security

این مخزن عمومی خواهد بود. قبل از push این‌ها را دوباره بگردید: رمز، توکن، کلید خصوصی، `.env` واقعی. نمونهٔ مجاز فقط `.env.example` است و راز ندارد.

جستجوی محلی Lunr است و کلید Algolia ندارد. چیزی برای Secrets لازم نیست.

workflow به محتوای مخزن نوشتن ندارد. PAT داخل YAML نیست.

Dependabot برای npm ماهانه و برای Actions هفتگی pull request می‌سازد. سقف PR باز دارد تا صف بی‌پایان نسازد. merge هر کدام هنوز از مسیر CI می‌گذرد.

# Maintenance

حفاظت شاخه را خود صاحب مخزن در GitHub تنظیم می‌کند. این Agent به Settings دسترسی ندارد.

برای `main` پیشنهاد تولید:

- Ruleset یا Branch protection که push مستقیم را محدود کند.
- Pull Request اجباری.
- status check اجباری: job به نام `Validate production build` از workflow به نام `CI`.
- merge وقتی این check شکست خورده ممنوع.

تا وقتی این قانون را نگذارید، push مستقیم به `main` هم سایت را منتشر می‌کند. CI فقط روی pull request اجرا می‌شود.

قرارداد commit پیشنهادی:

```text
docs:     تغییر دانشنامه
fix:      اصلاح دستور یا لینک
feat:     قابلیت تازه در خود پورتال
ci:       workflow
chore:    وابستگی و ابزار
style:    ظاهر بدون تغییر رفتار
refactor: جابه‌جایی بدون تغییر رفتار
```

جریان مشارکت:

```bash
git checkout -b docs/subject
git add .
git commit -m "docs: ..."
git push -u origin docs/subject
```

بعد pull request، سبز شدن CI، review، merge به `main`، و استقرار خودکار.

# Local check

قبل از push، همان بیلدی که Actions می‌سازد:

```bash
npm ci
GITHUB_ACTIONS=true npm run build
```

خروجی `build/index.html` باید `base href` یا مسیر asset را با `/my-documents/` نشان دهد. بیلد معمولی بدون آن متغیر برای Docker و پیش‌نمایش محلی از ریشه است و به Pages نمی‌رود.
