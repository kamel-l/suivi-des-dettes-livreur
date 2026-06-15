/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from "react";
import { ShieldCheck, Coins, Database, Globe } from "lucide-react";
import { Language, translations } from "../translations";

interface HeaderProps {
  currency: string;
  setCurrency: (val: string) => void;
  lang: Language;
  setLang: (lang: Language) => void;
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

export default function Header({ currency, setCurrency, lang, setLang }: HeaderProps) {
  const t = translations[lang];

  return (
    <header className="bg-slate-900 text-white shadow-md border-b border-slate-800 sticky top-0 z-40">
      <div 
        className="max-w-md mx-auto px-4 py-3 flex items-center justify-between"
        dir={lang === "ar" ? "rtl" : "ltr"}
      >
        <div className="flex items-center space-x-2 space-x-reverse">
          <div className="bg-amber-500 p-2 rounded-xl text-slate-900 shadow-md shadow-amber-500/10">
            <Coins className="w-5 h-5 stroke-[2.5]" />
          </div>
          <div>
            <h1 className="text-base font-bold tracking-tight text-white leading-tight">
              {t.appName}
            </h1>
            <div className="flex items-center space-x-1.5 space-x-reverse mt-0.5">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
              </span>
              <span className="text-[10px] font-mono text-slate-400">
                {t.tagline}
              </span>
            </div>
          </div>
        </div>

        <div className="flex items-center space-x-2 space-x-reverse">
          {/* Language Switch Button */}
          <button
            id="lang-toggle-btn"
            onClick={() => setLang(lang === "fr" ? "ar" : "fr")}
            className="flex items-center space-x-1 space-x-reverse bg-slate-800 hover:bg-slate-755 border border-slate-705 text-slate-200 text-xs font-bold py-1.5 px-2.5 rounded-lg active:scale-95 transition"
          >
            <Globe className="w-3.5 h-3.5 text-amber-500" />
            <span>{lang === "fr" ? "العربية" : "Français"}</span>
          </button>

          {/* Currency Dropdown selector */}
          <div className="relative">
            <select
              id="currency-select"
              value={currency}
              onChange={(e) => setCurrency(e.target.value)}
              className="bg-slate-800 text-slate-200 text-xs font-semibold py-1.5 px-2.5 rounded-lg border border-slate-700 outline-none focus:ring-1 focus:ring-amber-500 focus:border-amber-500 appearance-none pr-6 pl-2.5"
            >
              {CURRENCIES.map((cur) => (
                <option key={cur.value} value={cur.value}>
                  {cur.value}
                </option>
              ))}
            </select>
            <div className={`pointer-events-none absolute inset-y-0 ${lang === "ar" ? "left-2" : "right-2"} flex items-center text-slate-400`}>
              <span className="text-[9px]">▼</span>
            </div>
          </div>
        </div>
      </div>
    </header>
  );
}
