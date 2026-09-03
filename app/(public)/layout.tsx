import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";

export default function PublicLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="public-site">
      <a className="skip-link" href="#page-content">
        Skip to content
      </a>
      <SiteHeader />
      <main id="page-content">{children}</main>
      <SiteFooter />
    </div>
  );
}
