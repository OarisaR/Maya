import { Link, useNavigate, useRouter } from "@tanstack/react-router";
import { Moon, Sun } from "lucide-react";
import { useTheme } from "@/lib/theme";
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
  const navigate = useNavigate();
  const router = useRouter();

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 10);
    window.addEventListener("scroll", onScroll);
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  function goToSection(hash: string) {
    const isHome = router.state.location.pathname === "/";
    if (isHome) {
      // already on home, just update hash without reload
      window.history.pushState(null, "", `/#${hash}`);
    } else {
      navigate({ to: "/", hash });
    }
  }

  return (
    <div className="navbar-float-wrapper">
      <header className={`navbar-glass ${scrolled ? "navbar-glass--scrolled" : ""}`}>
        <div className="navbar-inner">

          <Link to="/" className="navbar-logo">
            <img src={icon} alt="Maya icon" className="navbar-logo-icon" />
            Maya
          </Link>

          <nav className="navbar-links">
            <button className="navbar-link" onClick={() => goToSection("features")}>
              {tr("nav_features", lang)}
            </button>
            <button className="navbar-link" onClick={() => goToSection("how")}>
              {tr("nav_how", lang)}
            </button>
            <Link to="/dashboard" className="navbar-link">
              {tr("nav_tracker", lang)}
            </Link>
            <Link to="/emergency" className="navbar-link">
              {tr("nav_emergency", lang)}
            </Link>
            <button className="navbar-link" onClick={() => goToSection("faq")}>
              {tr("nav_faq", lang)}
            </button>
          </nav>

          <div className="navbar-actions">
            <button className="navbar-icon-btn" onClick={toggle} aria-label={tr("toggle_theme", lang)}>
              {theme === "dark" ? <Sun size={15} /> : <Moon size={15} />}
            </button>
            <button className="navbar-pill-btn" onClick={() => setLang(lang === "en" ? "bn" : "en")}>
              {tr("toggle_language", lang)}
            </button>
            {!loading && (
              user ? (
                <Link to="/chat" className="navbar-cta">Go to Chat</Link>
              ) : (
                <Link to="/login" className="navbar-cta">{tr("nav_signin", lang)}</Link>
              )
            )}
          </div>

        </div>
      </header>
    </div>
  );
}