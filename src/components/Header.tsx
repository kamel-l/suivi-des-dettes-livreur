/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from "react";
import { Wallet, Globe, ChevronDown, Moon, Sun } from "lucide-react";
import { Language, translations } from "../translations";

interface HeaderProps {
  currency: string;
  setCurrency: (val: string) => void;
  lang: Language;
  setLang: (lang: Language) => void;
  theme: "light" | "dark";
  setTheme: (theme: "light" | "dark") => void;
}

const CURRENCIES = [
  { value: "DA", label: "Dinar Algérien (DA)" },
  { value: "FCFA", label: "FCFA (Franc CFA)" },
  { value: "€", label: "EUR (€)" },
  { value: "$", label: "USD ($)" },
  { value: "DH", label: "MAD (DH)" },
  { value: "GNF", label: "GNF (Franc Guinéen)" },
  { value: "MGA", label: "MGA (Ariary)" },
];

export default function Header({ currency, setCurrency, lang, setLang, theme, setTheme }: HeaderProps) {
  const t = translations[lang];
  const isRtl = lang === "ar";

  return (
    <header className="bg-slate-900 text-white sticky top-0 z-40">
      <div
        className="max-w-md mx-auto px-4 py-3.5 flex items-center justify-between"
        dir={isRtl ? "rtl" : "ltr"}
      >
        <div className={`flex items-center ${isRtl ? "space-x-reverse" : ""} space-x-2.5`}>
          <div className="bg-teal-500 p-2 rounded-xl text-slate-900">
            <Wallet className="w-4.5 h-4.5" strokeWidth={2.25} />
          </div>
          <div>
            <h1 className="text-sm font-bold tracking-tight text-white leading-tight">
              {t.appName}
            </h1>
            <div className={`flex items-center ${isRtl ? "space-x-reverse" : ""} space-x-1.5 mt-0.5`}>
              <span className="w-1.5 h-1.5 rounded-full bg-teal-400" />
              <span className="text-[10px] text-slate-400">{t.tagline}</span>
            </div>
          </div>
        </div>

        <div className={`flex items-center ${isRtl ? "space-x-reverse" : ""} space-x-2`}>
          <button
            type="button"
            onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
            className="bg-white/10 hover:bg-white/15 text-slate-100 text-xs font-medium py-1.5 px-2.5 rounded-lg transition cursor-pointer"
            aria-label={theme === "dark" ? t.lightMode : t.darkMode}
          >
            {theme === "dark" ? <Sun className="w-3.5 h-3.5" /> : <Moon className="w-3.5 h-3.5" />}
          </button>

          <button
            id="lang-toggle-btn"
            type="button"
            onClick={() => setLang(lang === "fr" ? "ar" : "fr")}
            className={`flex items-center ${isRtl ? "space-x-reverse" : ""} space-x-1 bg-white/10 hover:bg-white/15 text-slate-100 text-xs font-medium py-1.5 px-2.5 rounded-lg transition cursor-pointer`}
          >
            <Globe className="w-3.5 h-3.5" />
            <span>{lang === "fr" ? "العربية" : "Français"}</span>
          </button>

          <div className="relative">
            <select
              id="currency-select"
              value={currency}
              onChange={(e) => setCurrency(e.target.value)}
              className={`bg-white/10 hover:bg-white/15 text-slate-100 text-xs font-medium py-1.5 rounded-lg outline-none appearance-none cursor-pointer transition ${
                isRtl ? "pl-5 pr-2.5" : "pr-5 pl-2.5"
              }`}
            >
              {CURRENCIES.map((cur) => (
                <option key={cur.value} value={cur.value} className="text-slate-900">
                  {cur.value}
                </option>
              ))}
            </select>
            <ChevronDown className={`w-3 h-3 text-slate-400 pointer-events-none absolute top-1/2 -translate-y-1/2 ${isRtl ? "left-1.5" : "right-1.5"}`} />
          </div>
        </div>
      </div>
    </header>
  );
}
