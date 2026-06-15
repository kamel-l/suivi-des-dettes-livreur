/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from "react";
import { ShieldCheck, Unlock, Delete, RefreshCw, Languages } from "lucide-react";
import { motion } from "motion/react";
import { Language, translations } from "../translations";
import { hashPinSync } from "../utils";

interface LoginScreenProps {
  storedPin: string | null;
  onLoginSuccess: () => void;
  lang: Language;
  onLanguageChange: (lang: Language) => void;
  onSetPin: (newPin: string) => void;
}

export default function LoginScreen({
  storedPin,
  onLoginSuccess,
  lang,
  onLanguageChange,
  onSetPin,
}: LoginScreenProps) {
  const t = translations[lang];
  const isRtl = lang === "ar";

  // Mode: if storedPin is empty, we are in "SETUP" mode, else "UNLOCK" mode
  const isSetupMode = !storedPin;

  const [pinDigits, setPinDigits] = useState<string>("");
  const [confirmDigits, setConfirmDigits] = useState<string>("");
  const [step, setStep] = useState<number>(1); // 1 = enter pin, 2 = confirm pin (for setup)
  const [errorMessage, setErrorMessage] = useState<string>("");

  const handleNumberClick = (num: string) => {
    setErrorMessage("");
    const maxLen = 4;
    if (step === 1) {
      if (pinDigits.length < maxLen) {
        const nextVal = pinDigits + num;
        setPinDigits(nextVal);
        
        // Auto trigger validation if storedPin is active
        if (!isSetupMode && nextVal.length === maxLen) {
          validateUnlock(nextVal);
        }
      }
    } else {
      if (confirmDigits.length < maxLen) {
        setConfirmDigits(confirmDigits + num);
      }
    }
  };

  const handleBackspace = () => {
    setErrorMessage("");
    if (step === 1) {
      setPinDigits(pinDigits.slice(0, -1));
    } else {
      setConfirmDigits(confirmDigits.slice(0, -1));
    }
  };

  const handleClear = () => {
    setErrorMessage("");
    if (step === 1) {
      setPinDigits("");
    } else {
      setConfirmDigits("");
    }
  };

  const validateUnlock = (input: string) => {
    if (hashPinSync(input) === storedPin || input === storedPin) {
      onLoginSuccess();
    } else {
      setErrorMessage(t.incorrectPin);
      setPinDigits("");
    }
  };

  const handleSetupSubmit = () => {
    if (pinDigits.length < 4) {
      setErrorMessage(lang === "ar" ? "يجب أن يتكون الرمز من 4 أرقام كاملاً." : "Le code PIN doit comporter 4 chiffres.");
      return;
    }

    if (step === 1) {
      setStep(2);
      setErrorMessage("");
    } else {
      if (confirmDigits.length < 4) {
        setErrorMessage(lang === "ar" ? "يرجى تأكيد الرمز المكون من 4 أرقام." : "Veuillez confirmer le code à 4 chiffres.");
        return;
      }

      if (pinDigits !== confirmDigits) {
        setErrorMessage(t.pinsDoNotMatch);
        setConfirmDigits("");
        return;
      }

      // Success
      onSetPin(pinDigits);
      onLoginSuccess();
    }
  };

  const toggleLanguage = () => {
    onLanguageChange(lang === "ar" ? "fr" : "ar");
  };

  const currentDigits = step === 1 ? pinDigits : confirmDigits;

  return (
    <div className="bg-slate-100 min-h-screen flex items-center justify-center selection:bg-amber-100 font-sans p-4">
      {/* Container simulating high-fidelity smartphone / mobile device UI layout */}
      <div className="w-full max-w-sm bg-slate-900 text-white rounded-3xl shadow-2xl flex flex-col justify-between p-6 border border-slate-800 min-h-[600px] relative overflow-hidden">
        
        {/* Abstract Background Accents */}
        <div className="absolute top-0 left-0 w-32 h-32 bg-amber-500/15 rounded-full blur-3xl" />
        <div className="absolute bottom-0 right-0 w-40 h-40 bg-emerald-500/10 rounded-full blur-3xl" />

        {/* Top bar with Language Switcher */}
        <div className={`flex items-center justify-between z-10 ${isRtl ? "flex-row-reverse" : ""}`}>
          <div className="flex items-center space-x-1.5 text-xs text-amber-500 font-bold bg-amber-500/15 py-1 px-2.5 rounded-full border border-amber-500/20">
            <ShieldCheck className="w-3.5 h-3.5" />
            <span className="uppercase tracking-wider text-[10px]">{t.tagline}</span>
          </div>

          <button
            onClick={toggleLanguage}
            className="flex items-center space-x-1 bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-xs py-1 px-3 rounded-full cursor-pointer transition border border-slate-700"
          >
            <Languages className="w-3.5 h-3.5 text-amber-500" />
            <span className="font-mono text-[11px]">{lang === "ar" ? "Français" : "العربية"}</span>
          </button>
        </div>

        {/* Header content */}
        <div className="text-center my-6 z-10 space-y-2">
          <div className="bg-amber-500 text-slate-950 p-4 rounded-2xl inline-block mx-auto shadow-lg shadow-amber-500/20">
            <Unlock className="w-7 h-7 stroke-[2.5]" />
          </div>
          
          <h1 className="text-xl font-extrabold text-white tracking-wide">
            {t.appName}
          </h1>

          {isSetupMode ? (
            <div className="space-y-1">
              <h2 className="text-sm font-bold text-amber-400">
                {step === 1 ? t.setupPinTitle : t.confirmPin}
              </h2>
              <p className="text-[11px] text-slate-400 max-w-[250px] mx-auto leading-relaxed">
                {step === 1 ? t.setupPinDesc : (lang === "ar" ? "يرجى كتابة الرمز نفسه مجدداً للتأكيد." : "Veuillez entrer à nouveau le même code PIN.")}
              </p>
            </div>
          ) : (
            <div className="space-y-1">
              <h2 className="text-sm font-bold text-slate-300">
                {t.loginTitle}
              </h2>
              <p className="text-[11px] text-slate-400">
                {t.enterPin}
              </p>
            </div>
          )}
        </div>

        {/* Dot indicators displaying typed characters */}
        <div className="flex justify-center space-x-4 my-4 z-10" dir="ltr">
          {[0, 1, 2, 3].map((index) => (
            <motion.div
              key={index}
              animate={{
                scale: currentDigits.length > index ? 1.25 : 1,
                backgroundColor: currentDigits.length > index ? "#f59e0b" : "#334155",
              }}
              className="w-4.5 h-4.5 rounded-full border border-slate-700 shadow-inner"
            />
          ))}
        </div>

        {/* Error message indicator */}
        <div className="h-6 text-center z-10 transition">
          {errorMessage && (
            <motion.p
              initial={{ opacity: 0, y: -5 }}
              animate={{ opacity: 1, y: 0 }}
              className="text-xs text-rose-450 font-bold"
            >
              ⚠️ {errorMessage}
            </motion.p>
          )}
        </div>

        {/* Touch-Friendly Phone-style Number Keypad dialer */}
        <div className="grid grid-cols-3 gap-3.5 my-4 mx-auto w-full max-w-[280px] z-10" dir="ltr">
          {["1", "2", "3", "4", "5", "6", "7", "8", "9"].map((num) => (
            <button
              key={num}
              onClick={() => handleNumberClick(num)}
              className="bg-slate-800 hover:bg-slate-750 active:bg-amber-500 active:text-slate-900 border border-slate-700/60 rounded-2xl text-xl font-bold font-mono py-3 cursor-pointer shadow-xs transition duration-75 flex items-center justify-center"
            >
              {num}
            </button>
          ))}
          
          <button
            onClick={handleClear}
            className="text-xs font-bold text-slate-400 hover:text-slate-200 active:text-white cursor-pointer transition flex items-center justify-center font-sans"
          >
            {lang === "ar" ? "مسح الكل" : "Effacer"}
          </button>

          <button
            onClick={() => handleNumberClick("0")}
            className="bg-slate-800 hover:bg-slate-750 active:bg-amber-500 active:text-slate-900 border border-slate-700/60 rounded-2xl text-xl font-bold font-mono py-3 cursor-pointer shadow-xs transition duration-75 flex items-center justify-center"
          >
            0
          </button>

          <button
            onClick={handleBackspace}
            className="text-slate-400 hover:text-slate-200 active:text-amber-500 cursor-pointer transition flex items-center justify-center"
            aria-label="Backspace"
          >
            <Delete className="w-5 h-5" />
          </button>
        </div>

        {/* Controls for setup validations */}
        {isSetupMode && (
          <div className="mt-4 z-10">
            <button
              onClick={handleSetupSubmit}
              disabled={currentDigits.length < 4}
              className="w-full bg-amber-500 hover:bg-amber-600 disabled:opacity-40 disabled:cursor-not-allowed text-slate-950 font-bold text-sm py-3 rounded-2xl transition cursor-pointer flex items-center justify-center space-x-2 shadow-lg shadow-amber-500/20"
            >
              <span>{step === 1 ? (lang === "ar" ? "التالي" : "Suivant") : t.savePin}</span>
            </button>
            {step === 2 && (
              <button
                onClick={() => {
                  setStep(1);
                  setConfirmDigits("");
                  setErrorMessage("");
                }}
                className="w-full text-slate-400 hover:text-slate-200 text-xs font-bold mt-2 py-1 transition cursor-pointer text-center"
              >
                {lang === "ar" ? "رجوع للخطوة السابقة" : "Revenir à l'étape précédente"}
              </button>
            )}
          </div>
        )}

        {/* Subtle Footer */}
        <div className="text-center text-[10px] text-slate-500 mt-2 z-10">
          📍 {lang === "ar" ? "جميع البيانات مشفرة وتخزن محلياً" : "Données sécurisées localement"}
        </div>

      </div>
    </div>
  );
}
