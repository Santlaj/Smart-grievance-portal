import React from "react";
import { Link } from "react-router-dom";
import { Logo } from "./Logo";
import { Button } from "./ui/Button";
import { useAuth } from "../context/AuthContext";
import { useLanguage } from "../context/LanguageContext";
import LanguageSelector from "./LanguageSelector";

export function SiteHeader() {
  const { user, isCitizen, isGovernment } = useAuth();
  const { t } = useLanguage();

  const dashboardPath = isGovernment ? "/government/dashboard" : isCitizen ? "/citizen/dashboard" : "/login";

  const links = [
    { href: "#home", label: t("nav_home") },
    { href: "#how", label: t("nav_how_it_works") },
    { href: "#portals", label: t("nav_portals") },
    { href: "#faq", label: t("nav_faq") },
    { href: "#contact", label: t("nav_contact") },
  ];

  return (
    <header className="sticky top-0 z-40 border-b bg-card/90 backdrop-blur-md">
      <div className="mx-auto flex h-20 max-w-7xl items-center justify-between gap-6 px-6 py-3">
        <Logo />
        <nav className="hidden items-center gap-8 text-sm font-semibold text-navy md:flex">
          {links.map((l) => (
            <a key={l.href} href={l.href} className="transition-colors hover:text-primary">
              {l.label}
            </a>
          ))}
        </nav>
        <div className="flex items-center gap-3">
          {/* Universal Language Selector */}
          <LanguageSelector />

          {user ? (
            <Button asChild variant="hero">
              <Link to={dashboardPath}>{t("nav_go_to_dashboard")}</Link>
            </Button>
          ) : (
            <>
              <Button asChild variant="heroOutline" className="rounded-full px-6">
                <Link to="/login">{t("nav_login")}</Link>
              </Button>
              <Button asChild variant="hero" className="rounded-full px-6">
                <Link to="/register">{t("nav_register")}</Link>
              </Button>
            </>
          )}
        </div>
      </div>
    </header>
  );
}

export default SiteHeader;
