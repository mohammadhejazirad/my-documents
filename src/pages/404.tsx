import type { ReactNode } from "react";
import Link from "@docusaurus/Link";
import Layout from "@theme/Layout";
import Heading from "@theme/Heading";

export default function NotFound(): ReactNode {
  return (
    <Layout
      title="صفحه پیدا نشد"
      description="این آدرس در دانشنامه DevOps وجود ندارد."
    >
      <main className="container margin-vert--xl">
        <Heading as="h1">این صفحه پیدا نشد</Heading>
        <p>
          آدرس را دوباره بررسی کنید، یا از مقدمه و جستجوی بالای سایت جلو بروید.
        </p>
        <Link className="button button--primary" to="/docs/intro">
          بازگشت به مقدمه
        </Link>
      </main>
    </Layout>
  );
}
