import { Link } from "@tanstack/react-router";
import { Moon, Sun } from "lucide-react";
import { useTheme } from "@/lib/theme";
import { Button } from "@/components/ui/button";
import { useLang } from "@/contexts/lang-context";
import { tr } from "@/i18n/translations";
import icon from "@/assets/icon.svg";
import { useAuth } from "@/lib/auth";
import { useEffect, useState } from "react";

export function SiteHeader() {
  const { user, loading } = useAuth();
  const { theme, toggle } = useTheme();
  const { lang, setLang } = useLang();
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 10);
    window.addEventListener("scroll", onScroll);
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <header
      className={`sticky top-0 z-40 transition-all duration-300 ${
        scrolled
          ? "bg-background/80 backdrop-blur-md border-b border-border/40 shadow-sm"
          : "bg-transparent"
      }`}
    >
      <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
        <Link to="/" className="flex items-center gap-2 font-semibold text-lg">
          <span className="w-9 h-9 rounded-xl flex items-center justify-center">
            <img src={icon} alt="Maya icon" className="w-9 h-9" />
          </span>
          Maya
        </Link>

        <nav className="ml-25 hidden md:flex items-center gap-8 text-sm text-muted-foreground">
          <a href="/#features" className="hover:text-foreground transition-colors">{tr("nav_features", lang)}</a>
          <a href="/#how" className="hover:text-foreground transition-colors">{tr("nav_how", lang)}</a>
          <Link to="/dashboard" className="hover:text-foreground transition-colors">{tr("nav_tracker", lang)}</Link>
          <Link to="/emergency" className="hover:text-foreground transition-colors">{tr("nav_emergency", lang)}</Link>
          <a href="/#faq" className="hover:text-foreground transition-colors">{tr("nav_faq", lang)}</a>
        </nav>

        <div className="flex items-center gap-2">
          <Button variant="ghost" size="icon" onClick={toggle} aria-label={tr("toggle_theme", lang)}>
            {theme === "dark" ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
          </Button>
          <Button variant="ghost" size="sm" onClick={() => setLang(lang === "en" ? "bn" : "en")}>
            {tr("toggle_language", lang)}
          </Button>
          {!loading && (
            user ? (
              <Button asChild variant="ghost" className="hidden sm:inline-flex">
                <Link to="/chat">Go to Chat</Link>
              </Button>
            ) : (
              <Button asChild variant="ghost" className="hidden sm:inline-flex">
                <Link to="/login">{tr("nav_signin", lang)}</Link>
              </Button>
            )
          )}
        </div>
      </div>
    </header>
  );
}