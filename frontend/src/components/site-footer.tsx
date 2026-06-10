import { Link } from "@tanstack/react-router";
import { useLang } from "@/contexts/lang-context";
import { tr } from "@/i18n/translations";
import icon from "@/assets/icon.svg";

export function SiteFooter() {
  const { lang } = useLang();

  return (
    <footer className="border-t border-border/60 bg-muted/30">
      <div className="max-w-7xl mx-auto px-6 py-14 grid gap-10 md:grid-cols-4">
        <div>
          <Link to="/" className="flex items-center gap-2 font-semibold text-lg">
            <span className="w-10 h-10 rounded-xl flex items-center justify-center text-primary-foreground">
              <img src={icon} alt="Maya icon" className="w-10 h-10" />
            </span>
          </Link>
          <p className="mt-4 text-sm text-muted-foreground max-w-xs">{tr("footer_tagline", lang)}</p>
        </div>
        <FooterCol title={tr("footer_product", lang)} links={[
          [tr("footer_chat", lang), "/chat"],
          ["Docs", "/docs"],
          [tr("nav_signin", lang), "/login"],
        ]} />
        <FooterCol title={tr("footer_company", lang)} links={[
          [tr("footer_about", lang), "/#features"],
          [tr("footer_stories", lang), "/#testimonials"],
          [tr("nav_faq", lang), "/#faq"],
        ]} />
        <FooterCol title={tr("footer_legal", lang)} links={[
          [tr("footer_privacy", lang), "#"],
          [tr("footer_terms", lang), "#"],
          [tr("footer_contact", lang), "#"],
        ]} />
      </div>
      <div className="border-t border-border/60">
        <div className="max-w-7xl mx-auto px-6 py-5 text-xs text-muted-foreground flex flex-col sm:flex-row gap-3 justify-between">
          <span>© {new Date().getFullYear()} {tr("footer_copyright", lang)}</span>
          <span>{tr("footer_emergency", lang)}</span>
        </div>
      </div>
    </footer>
  );
}

function FooterCol({ title, links }: { title: string; links: [string, string][] }) {
  return (
    <div>
      <h4 className="font-medium text-sm mb-3">{title}</h4>
      <ul className="space-y-2 text-sm text-muted-foreground">
        {links.map(([label, href]) => (
          <li key={label}><a href={href} className="hover:text-foreground transition">{label}</a></li>
        ))}
      </ul>
    </div>
  );
}