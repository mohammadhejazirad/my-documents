# دانشنامه DevOps

پورتال مستندات داخلی برای اداره سرور Ubuntu، کانتینر، استقرار، دیتابیس و امنیت. متن فارسی و راست‌چین است، دستورها انگلیسی‌اند، و فونت متن Vazirmatn است.

نقشه کار برای کسی که این مخزن را ادامه می‌دهد در [README_AGENT.md](README_AGENT.md) است.

## پیش‌نیاز

- Node.js 24 (همان `.nvmrc`). موتور پروژه `>=20` را هم قبول می‌کند، ولی CI روی 24 است.
- npm و فایل `package-lock.json`
- برای اجرای کانتینری: Docker Engine و پلاگین Compose v2

## Development

```bash
npm ci
npm run start
```

سایت توسعه از ریشهٔ لوکال بالا می‌آید. تغییر Markdown بلافاصله دیده می‌شود. راست‌چین، وزیرمتن، جستجو و هر دو حالت رنگ در همین حالت قابل دیدن‌اند.

## Local Build

```bash
npm run build
npm run serve
```

این بیلد برای پیش‌نمایش محلی و Docker است و `baseUrl` آن `/` است. خروجی در `build/` است و نباید commit شود.

## Deployment

انتشار عمومی با GitHub Actions انجام می‌شود، نه با دستور دستی روی سرور. جزئیات، DNS، HTTPS و برگشت نسخه در [DEPLOYMENT.md](DEPLOYMENT.md) است.

## GitHub Pages

مخزن `mohammadhejazirad/my-documents` است. تا وقتی دامنهٔ اختصاصی نباشد، آدرس سایت:

```text
https://mohammadhejazirad.github.io/my-documents/
```

هر push به `main` بیلد را می‌سازد و فقط پوشهٔ `build` را به Pages می‌فرستد. Pull request فقط بیلد را امتحان می‌کند و سایت زنده را عوض نمی‌کند.

## Contribution

از `main` شاخه بسازید، pull request بدهید، و بعد از سبز شدن CI و review به `main` merge کنید. همان merge سایت را منتشر می‌کند.

```bash
git checkout -b docs/subject
git commit -m "docs: ..."
git push -u origin docs/subject
```

پیشوندهای commit: `docs`، `fix`، `feat`، `chore`، `ci`، `style`، `refactor`.

## اجرا با Docker

```bash
docker compose up --build
```

پورتال روی پورت `8080` میزبان از ریشه سرو می‌شود. این مسیر جدا از GitHub Pages است. جزئیات Nginx میزبان در فصل «همین پورتال» دانشنامه است.
