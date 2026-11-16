import React from "react";
import { Logo } from "./Logo";
import { useLanguage } from "../context/LanguageContext";

export function Footer() {
  const { t } = useLanguage();

  return (
    <footer className="border-t bg-card py-8">
      <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-6 px-6">
        <Logo />
        <div className="flex flex-wrap gap-6 text-sm text-muted-foreground">
          <a href="#home" className="hover:text-primary">{t("nav_home")}</a>
          <a href="#how" className="hover:text-primary">{t("nav_how_it_works")}</a>
          <a href="#portals" className="hover:text-primary">{t("nav_portals")}</a>
          <a href="#faq" className="hover:text-primary">{t("nav_faq")}</a>
          <a href="#contact" className="hover:text-primary">{t("nav_contact")}</a>
        </div>
        <p className="text-xs text-muted-foreground">
          © {new Date().getFullYear()} Smart Grievance. {t("All rights reserved.")}
        </p>
      </div>
    </footer>
  );
}

export default Footer;
