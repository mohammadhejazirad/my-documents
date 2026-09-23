import type {ReactNode} from 'react';
import Link from '@docusaurus/Link';
import useDocusaurusContext from '@docusaurus/useDocusaurusContext';
import Layout from '@theme/Layout';
import Heading from '@theme/Heading';

import styles from './index.module.css';

type Chapter = {
  href: string;
  title: string;
  text: string;
};

const chapters: Chapter[] = [
  {href: '/docs/01-linux', title: 'لینوکس', text: 'نصب، کاربر، systemd، APT و دستورهای روزمره سرور'},
  {href: '/docs/02-lpic', title: 'LPIC', text: 'مسیر LPIC-1 و LPIC-2 با تمرین و سناریوی واقعی'},
  {href: '/docs/03-git', title: 'Git', text: 'معماری، شاخه، rebase و گردش‌کار Production'},
  {href: '/docs/04-server-management', title: 'ابزار سرور', text: 'به‌روزرسانی بدون پاک شدن داده، دیسک، Chrome، FFmpeg و ClamAV'},
  {href: '/docs/05-docker', title: 'Docker', text: 'ایمیج، Compose و کار با آینه وقتی اینترنت محدود است'},
  {href: '/docs/06-nginx', title: 'Nginx', text: 'پروکسی، توازن بار، کش و کانفیگ Node و Laravel'},
  {href: '/docs/07-databases', title: 'دیتابیس', text: 'MySQL، PostgreSQL، MongoDB و Redis روی سرور و Docker'},
  {href: '/docs/08-deployment', title: 'استقرار', text: 'مسیر دستی، PM2، PHP-FPM و معماری Docker'},
  {href: '/docs/09-cicd', title: 'CI/CD', text: 'GitHub Actions، GitLab Runner و Jenkins'},
  {href: '/docs/10-security', title: 'امنیت', text: 'SSH، UFW، Fail2ban، کرنل و بکاپ'},
  {href: '/docs/11-networking', title: 'شبکه و SSL', text: 'DNS، دامنه پشت IP، ابرآروان، Cloudflare و گواهی'},
  {href: '/docs/16-object-storage', title: 'فضای ابری', text: 'S3، MinIO روی سرور یا Docker، آروان، R2 و AWS'},
  {href: '/docs/12-monitoring', title: 'پایش', text: 'لاگ، Netdata، Prometheus و Grafana'},
  {href: '/docs/13-automation', title: 'Bash', text: 'اسکریپت بکاپ، سلامت سرور و استقرار'},
  {href: '/docs/14-troubleshooting', title: 'عیب‌یابی', text: 'سرور خاموش، دیسک پر، نشت حافظه و دیتابیس کند'},
];

export default function Home(): ReactNode {
  const {siteConfig} = useDocusaurusContext();
  return (
    <Layout title={siteConfig.title} description={siteConfig.tagline}>
      <header className={styles.heroBanner}>
        <div className="container">
          <Heading as="h1">{siteConfig.title}</Heading>
          <p>{siteConfig.tagline}. نوشته شده برای کسی که سرویس را روی Ubuntu Server نگه می‌دارد، نه برای مرور سطحی یک ابزار.</p>
          <div className={styles.buttons}>
            <Link className="button button--secondary button--lg" to="/docs/intro">
              از مقدمه شروع کنید
            </Link>
            <Link className="button button--outline button--lg button--secondary" to="/docs/01-linux">
              فصل لینوکس
            </Link>
          </div>
        </div>
      </header>
      <main>
        <section className={styles.section}>
          <div className="container">
            <Heading as="h2">فصل‌ها</Heading>
            <p className={styles.lead}>
              هر صفحه مقدمه، معماری، نصب، کانفیگ قابل اجرا، مثال Production، امنیت و عیب‌یابی دارد. دستورها انگلیسی و متن فارسی است.
            </p>
            <div className={styles.grid}>
              {chapters.map((chapter) => (
                <Link key={chapter.href} className={styles.card} to={chapter.href}>
                  <strong>{chapter.title}</strong>
                  <span>{chapter.text}</span>
                </Link>
              ))}
            </div>
          </div>
        </section>
      </main>
    </Layout>
  );
}
