/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from "react";
import { ShieldCheck, Unlock, User, Lock, KeyRound, Languages, Eye, EyeOff } from "lucide-react";
import { motion } from "motion/react";
import { Language, translations } from "../translations";

interface LoginScreenProps {
  storedUser: string | null;
  storedPass: string | null;
  onLoginSuccess: () => void;
  lang: Language;
  onLanguageChange: (lang: Language) => void;
  onSetCredentials: (user: string | null, pass: string | null) => void;
}

export default function LoginScreen({
  storedUser,
  storedPass,
  onLoginSuccess,
  lang,
  onLanguageChange,
  onSetCredentials,
}: LoginScreenProps) {
  const t = translations[lang];
  const isRtl = lang === "ar";

  const isSetupMode = !storedUser || !storedPass;

  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPass, setShowPass] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  const handleLoginSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage("");
    const trimmedUser = username.trim();
    if (!trimmedUser || !password) {
      setErrorMessage(lang === "ar" ? "يرجى ملء جميع الحقول!" : "Veuillez remplir tous les champs !");
      return;
    }
    if (trimmedUser.toLowerCase() === storedUser?.trim().toLowerCase() && password === storedPass) {
      onLoginSuccess();
    } else {
      setErrorMessage(t.incorrectCredentials || "Identifiants incorrects !");
    }
  };

  const handleSetupSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage("");
    const trimmedUser = username.trim();
    if (!trimmedUser || !password || !confirmPassword) {
      setErrorMessage(lang === "ar" ? "جميع الحقول مطلوبة!" : "Tous les champs sont requis !");
      return;
    }
    if (trimmedUser.length < 3) {
      setErrorMessage(lang === "ar" ? "اسم المستخدم 3 أحرف على الأقل." : "Nom d'utilisateur min. 3 caractères.");
      return;
    }
    if (password.length < 4) {
      setErrorMessage(lang === "ar" ? "كلمة المرور 4 أحرف على الأقل." : "Mot de passe min. 4 caractères.");
      return;
    }
    if (password !== confirmPassword) {
      setErrorMessage(t.passwordsDoNotMatch || "Les mots de passe ne correspondent pas !");
      return;
    }
    onSetCredentials(trimmedUser, password);
    onLoginSuccess();
  };

  return (
    <div className="bg-slate-100 min-h-screen flex items-center justify-center p-4">
      <div className="w-full max-w-sm bg-white rounded-3xl shadow-xl p-6 border border-slate-100">
        <div className="flex justify-between items-center mb-4">
          <div className="flex items-center space-x-1.5 text-xs text-indigo-600 font-bold bg-indigo-50 py-1 px-2.5 rounded-full border border-indigo-100">
            <ShieldCheck className="w-3.5 h-3.5" />
            <span className="uppercase tracking-wider text-[10px]">{t.tagline}</span>
          </div>
          <button onClick={() => onLanguageChange(lang === "ar" ? "fr" : "ar")} className="flex items-center space-x-1 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs py-1 px-3 rounded-full transition">
            <Languages className="w-3.5 h-3.5 text-indigo-500" />
            <span>{lang === "ar" ? "Français" : "العربية"}</span>
          </button>
        </div>

        <div className="text-center my-4">
          <div className="bg-indigo-500 text-white p-3.5 rounded-2xl inline-block mx-auto shadow-lg shadow-indigo-200">
            <Unlock className="w-6 h-6 stroke-[2]" />
          </div>
          <h1 className="text-xl font-extrabold text-slate-800 mt-2">{t.appName}</h1>
          <h2 className="text-sm font-bold text-indigo-600">{isSetupMode ? t.setupAuthTitle : t.loginTitle}</h2>
          <p className="text-[11.5px] text-slate-500 max-w-[270px] mx-auto mt-1">{isSetupMode ? t.setupAuthDesc : (lang === "ar" ? "سجل الدخول للوصول إلى الدفتر" : "Connectez‑vous pour accéder à vos données")}</p>
        </div>

        <form onSubmit={isSetupMode ? handleSetupSubmit : handleLoginSubmit} className="space-y-4">
          {errorMessage && (
            <motion.div initial={{ opacity: 0, y: -5 }} animate={{ opacity: 1, y: 0 }} className="bg-rose-50 border border-rose-200 rounded-xl p-2.5 text-center text-xs text-rose-600 font-semibold">
              ⚠️ {errorMessage}
            </motion.div>
          )}

          <div>
            <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider">{t.usernameLabel}</label>
            <div className="relative">
              <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input type="text" value={username} onChange={(e) => setUsername(e.target.value)} className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2.5 pl-9 pr-3 text-xs outline-none focus:ring-2 focus:ring-indigo-300" placeholder={lang === "ar" ? "أدخل اسم المستخدم" : "Ex: slimane"} />
            </div>
          </div>

          <div>
            <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider">{t.passwordLabel}</label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input type={showPass ? "text" : "password"} value={password} onChange={(e) => setPassword(e.target.value)} className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2.5 pl-9 pr-10 text-xs outline-none focus:ring-2 focus:ring-indigo-300" placeholder="••••••" />
              <button type="button" onClick={() => setShowPass(!showPass)} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
                {showPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          {isSetupMode && (
            <div>
              <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider">{t.confirmPassword}</label>
              <div className="relative">
                <KeyRound className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input type={showPass ? "text" : "password"} value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2.5 pl-9 pr-3 text-xs outline-none focus:ring-2 focus:ring-indigo-300" placeholder="••••••" />
              </div>
            </div>
          )}

          <button type="submit" className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs py-3 rounded-2xl transition shadow-md shadow-indigo-200">
            {isSetupMode ? t.saveAuth : t.unlock}
          </button>
        </form>

        <div className="text-center text-[10px] text-slate-400 mt-4">
          {lang === "ar" ? "جميع البيانات مشفرة ومحفوظة داخلياً" : "Données chiffrées localement"}
        </div>
      </div>
    </div>
  );
}