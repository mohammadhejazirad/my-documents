import fs from 'fs';
import path from 'path';
import {themes as prismThemes} from 'prism-react-renderer';
import type {Config, Plugin} from '@docusaurus/types';
import type * as Preset from '@docusaurus/preset-classic';

const organizationName = 'mohammadhejazirad';
const projectName = 'my-documents';

function withTrailingSlash(value: string): string {
  return value.endsWith('/') ? value : `${value}/`;
}

function resolveSiteUrl(): {url: string; baseUrl: string} {
  const urlOverride = process.env.DOCUSAURUS_URL;
  const baseOverride = process.env.DOCUSAURUS_BASE_URL;
  if (urlOverride && baseOverride) {
    return {url: urlOverride.replace(/\/$/, ''), baseUrl: withTrailingSlash(baseOverride)};
  }
  if (process.env.GITHUB_ACTIONS === 'true') {
    return {
      url: `https://${organizationName}.github.io`,
      baseUrl: `/${projectName}/`,
    };
  }
  return {url: 'https://docs.example.internal', baseUrl: '/'};
}

const {url, baseUrl} = resolveSiteUrl();

function robotsTxtPlugin(): Plugin {
  return {
    name: 'robots-txt',
    async postBuild({outDir, siteConfig}) {
      const sitemap = new URL(
        'sitemap.xml',
        `${siteConfig.url}${withTrailingSlash(siteConfig.baseUrl)}`,
      ).toString();
      const body = `User-agent: *\nAllow: /\nSitemap: ${sitemap}\n`;
      await fs.promises.writeFile(path.join(outDir, 'robots.txt'), body);
    },
  };
}

const config: Config = {
  title: 'دانشنامه DevOps',
  tagline: 'مرجع عملی مدیریت سرور، کانتینر، استقرار و امنیت',
  favicon: 'img/logo.svg',

  future: {
    v4: true,
  },

  url,
  baseUrl,
  organizationName,
  projectName,

  onBrokenLinks: 'throw',
  onBrokenAnchors: 'warn',

  i18n: {
    defaultLocale: 'fa',
    locales: ['fa'],
    localeConfigs: {
      fa: {
        label: 'فارسی',
        direction: 'rtl',
        htmlLang: 'fa',
        calendar: 'persian',
      },
    },
  },

  presets: [
    [
      'classic',
      {
        docs: {
          sidebarPath: './sidebars.ts',
          routeBasePath: 'docs',
          showLastUpdateTime: false,
          // پیشوند عددی پوشه‌ها بخشی از شناسه و URL می‌ماند تا لینک‌های دانشنامه پایدار باشند.
          numberPrefixParser: false,
        },
        blog: false,
        theme: {
          customCss: './src/css/custom.css',
        },
      } satisfies Preset.Options,
    ],
  ],

  plugins: [function robotsTxt() {
    return robotsTxtPlugin();
  }],

  themes: [
    [
      require.resolve('@easyops-cn/docusaurus-search-local'),
      {
        hashed: true,
        language: ['en', 'ar'],
        indexBlog: false,
        docsRouteBasePath: '/docs',
        removeDefaultStemmer: true,
        removeDefaultStopWordFilter: true,
        highlightSearchTermsOnTargetPage: true,
        explicitSearchResultPath: true,
        searchResultLimits: 8,
      },
    ],
  ],

  themeConfig: {
    colorMode: {
      defaultMode: 'light',
      respectPrefersColorScheme: true,
      disableSwitch: false,
    },
    navbar: {
      title: 'دانشنامه DevOps',
      logo: {
        alt: 'نشان دانشنامه DevOps',
        src: 'img/logo.svg',
      },
      items: [
        {
          type: 'docSidebar',
          sidebarId: 'docsSidebar',
          position: 'left',
          label: 'مستندات',
        },
        {
          to: '/docs/15-portal/deployment',
          label: 'استقرار پورتال',
          position: 'left',
        },
      ],
    },
    footer: {
      style: 'dark',
      links: [
        {
          title: 'عملیات روزمره',
          items: [
            {label: 'لینوکس', to: '/docs/01-linux'},
            {label: 'داکر', to: '/docs/05-docker'},
            {label: 'Nginx', to: '/docs/06-nginx'},
            {label: 'دیتابیس', to: '/docs/07-databases'},
            {label: 'فضای ابری', to: '/docs/16-object-storage'},
            {label: 'Ansible', to: '/docs/17-ansible'},
          ],
        },
        {
          title: 'مسیر تا Production',
          items: [
            {label: 'استقرار', to: '/docs/08-deployment'},
            {label: 'CI/CD', to: '/docs/09-cicd'},
            {label: 'امنیت', to: '/docs/10-security'},
            {label: 'عیب‌یابی', to: '/docs/14-troubleshooting'},
          ],
        },
        {
          title: 'همین پورتال',
          items: [
            {label: 'معرفی', to: '/docs/intro'},
            {label: 'اجرا با Docker', to: '/docs/15-portal/deployment'},
          ],
        },
      ],
      copyright: 'دانشنامه داخلی DevOps. نمونهٔ آموزشی برای تیم فنی؛ رمز و آدرس آزمایشگاه را در محیط واقعی جایگزین کنید.',
    },
    prism: {
      theme: prismThemes.github,
      darkTheme: prismThemes.dracula,
      additionalLanguages: [
        'bash',
        'diff',
        'json',
        'nginx',
        'yaml',
        'ini',
        'docker',
        'systemd',
        'sql',
        'toml',
        'php',
        'python',
        'javascript',
        'markup',
        'log',
        'properties',
        'ignore',
      ],
    },
  } satisfies Preset.ThemeConfig,
};

export default config;
