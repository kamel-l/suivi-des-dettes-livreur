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
  const t = translations[lang] as any;
  const isRtl = lang === "ar";

  // Check if credentials are set up or if this is the very first setup
  const isSetupMode = !storedUser || !storedPass;

  const [username, setUsername] = useState<string>("");
  const [password, setPassword] = useState<string>("");
  const [confirmPassword, setConfirmPassword] = useState<string>("");
  const [showPass, setShowPass] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string>("");

  const handleLoginSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage("");

    const trimmedUser = username.trim();
    if (!trimmedUser || !password) {
      setErrorMessage(
        lang === "ar"
          ? "يرجى ملء جميع الحقول المطلوبة!"
          : "Veuillez remplir tous les champs de connexion !"
      );
      return;
    }

    if (
      trimmedUser.toLowerCase() === storedUser?.trim().toLowerCase() &&
      password === storedPass
    ) {
      onLoginSuccess();
    } else {
      setErrorMessage(t.incorrectCredentials || "Identifiants incorrects ! Recommencez.");
    }
  };

  const handleSetupSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage("");

    const trimmedUser = username.trim();
    if (!trimmedUser || !password || !confirmPassword) {
      setErrorMessage(
        lang === "ar"
          ? "جميع بيانات الحساب الجديد مطلوبة !"
          : "Tous les champs de création sont requis !"
      );
      return;
    }

    if (trimmedUser.length < 3) {
      setErrorMessage(
        lang === "ar"
          ? "يجب أن يتكون اسم المستخدم من 3 أحرف على الأقل."
          : "Le nom d'utilisateur doit contenir au moins 3 caractères."
      );
      return;
    }

    if (password.length < 4) {
      setErrorMessage(
        lang === "ar"
          ? "يجب أن تتكون كلمة المرور من 4 أحرف على الأقل."
          : "Le mot de passe doit comporter au moins 4 caractères."
      );
      return;
    }

    if (password !== confirmPassword) {
      setErrorMessage(t.passwordsDoNotMatch || "Les mots de passe ne correspondent pas ! Recommencez.");
      return;
    }

    // Save and enter app
    onSetCredentials(trimmedUser, password);
    onLoginSuccess();
  };

  const toggleLanguage = () => {
    onLanguageChange(lang === "ar" ? "fr" : "ar");
  };

  return (
    <div className="bg-slate-50 min-h-screen flex items-center justify-center font-sans p-4">
      {/* Device frame container imitating smartphone layout */}
      <div className="w-full max-w-sm bg-slate-900 text-white rounded-3xl flex flex-col justify-between p-6 min-h-[600px] relative overflow-hidden">
        {/* Header toolbar */}
        <div className={`flex items-center justify-between z-10 ${isRtl ? "flex-row-reverse" : ""}`}>
          <div className="flex items-center space-x-1.5 text-xs text-teal-400 font-semibold bg-teal-500/10 py-1 px-2.5 rounded-full">
            <ShieldCheck className="w-3.5 h-3.5" />
            <span className="text-[10px]">{t.tagline}</span>
          </div>

          <button
            type="button"
            onClick={toggleLanguage}
            className="flex items-center space-x-1 bg-white/10 hover:bg-white/15 text-slate-200 font-medium text-xs py-1 px-3 rounded-full cursor-pointer transition"
          >
            <Languages className="w-3.5 h-3.5 text-teal-400" />
            <span className="text-[11px]">{lang === "ar" ? "Français" : "العربية"}</span>
          </button>
        </div>

        {/* Central Core Logo & Title content */}
        <div className="text-center my-4 z-10 space-y-2">
          <div className="bg-teal-500 text-slate-950 p-3.5 rounded-2xl inline-block mx-auto">
            <Unlock className="w-6 h-6 stroke-[2.5]" />
          </div>

          <h1 className="text-xl font-extrabold text-white tracking-wide">
            {t.appName}
          </h1>

          <div className="space-y-1">
            <h2 className="text-sm font-bold text-teal-400">
              {isSetupMode ? (t.setupAuthTitle || "Créer un compte") : (t.loginTitle || "Connexion")}
            </h2>
            <p className="text-[11.5px] text-slate-400 max-w-[270px] mx-auto leading-relaxed">
              {isSetupMode 
                ? (t.setupAuthDesc || "Renseignez un nom d'utilisateur et pass-phrase.")
                : (lang === "ar" ? "يرجى تسجيل الدخول للوصول إلى الدفتر وعقد المبيعات." : "Entrez vos informations de compte pour déverrouiller l'accès.")}
            </p>
          </div>
        </div>

        {/* Main interactive Form */}
        <div className="z-10 flex-1 flex flex-col justify-center my-2">
          {errorMessage && (
            <motion.div
              initial={{ opacity: 0, y: -5 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-rose-500/10 rounded-xl p-2.5 mb-4 text-center text-xs text-rose-400 font-medium leading-snug"
            >
              {errorMessage}
            </motion.div>
          )}

          <form onSubmit={isSetupMode ? handleSetupSubmit : handleLoginSubmit} className="space-y-4">
            {/* Username Input */}
            <div className="space-y-1">
              <label 
                htmlFor="login-username" 
                className={`block text-[10px] font-semibold text-slate-400 ${isRtl ? "text-right" : "text-left"}`}
              >
                {t.usernameLabel || "Nom d'utilisateur"}
              </label>
              <div className="relative">
                <div className={`absolute inset-y-0 text-slate-500 flex items-center pointer-events-none ${isRtl ? "right-3" : "left-3"}`}>
                  <User className="w-4 h-4" />
                </div>
                <input
                  id="login-username"
                  type="text"
                  placeholder={lang === "ar" ? "أدخل اسم المستخدم" : "Ex: slimane_alger"}
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className={`w-full bg-white/5 border border-white/10 text-slate-100 rounded-xl py-2.5 text-xs outline-none focus:border-teal-500 focus:ring-1 focus:ring-teal-500 transition-all font-medium ${
                    isRtl ? "text-right pr-9 pl-3" : "text-left pl-9 pr-3"
                  }`}
                  autoComplete="username"
                />
              </div>
            </div>

            {/* Password Input */}
            <div className="space-y-1">
              <label 
                htmlFor="login-password" 
                className={`block text-[10px] font-semibold text-slate-400 ${isRtl ? "text-right" : "text-left"}`}
              >
                {t.passwordLabel || "Mot de passe"}
              </label>
              <div className="relative">
                <div className={`absolute inset-y-0 text-slate-500 flex items-center pointer-events-none ${isRtl ? "right-3" : "left-3"}`}>
                  <Lock className="w-4 h-4" />
                </div>
                <input
                  id="login-password"
                  type={showPass ? "text" : "password"}
                  placeholder={lang === "ar" ? "••••••" : "••••••"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className={`w-full bg-white/5 border border-white/10 text-slate-100 rounded-xl py-2.5 text-xs outline-none focus:border-teal-500 focus:ring-1 focus:ring-teal-500 transition-all tracking-widest ${
                    isRtl ? "text-right pr-9 pl-10" : "text-left pl-9 pr-10"
                  }`}
                  autoComplete="current-password"
                />
                <button
                  type="button"
                  onClick={() => setShowPass(!showPass)}
                  className={`absolute inset-y-0 text-slate-400 hover:text-slate-200 flex items-center px-3 cursor-pointer ${isRtl ? "left-0" : "right-0"}`}
                >
                  {showPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {/* Confirm Password (Setup Mode only) */}
            {isSetupMode && (
              <div className="space-y-1">
                <label 
                  htmlFor="login-confirm" 
                  className={`block text-[10px] font-semibold text-slate-400 ${isRtl ? "text-right" : "text-left"}`}
                >
                  {t.confirmPassword || "Confirmer le mot de passe"}
                </label>
                <div className="relative">
                  <div className={`absolute inset-y-0 text-slate-500 flex items-center pointer-events-none ${isRtl ? "right-3" : "left-3"}`}>
                    <KeyRound className="w-4 h-4" />
                  </div>
                  <input
                    id="login-confirm"
                    type={showPass ? "text" : "password"}
                    placeholder={lang === "ar" ? "••••••" : "••••••"}
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className={`w-full bg-white/5 border border-white/10 text-slate-100 rounded-xl py-2.5 text-xs outline-none focus:border-teal-500 focus:ring-1 focus:ring-teal-500 transition-all tracking-widest ${
                      isRtl ? "text-right pr-9 pl-10" : "text-left pl-9 pr-10"
                    }`}
                    autoComplete="new-password"
                  />
                </div>
              </div>
            )}

            {/* Action buttons */}
            <div className="pt-2">
              <button
                type="submit"
                id="login-submit-btn"
                className="w-full bg-teal-500 hover:bg-teal-600 active:scale-[0.98] text-slate-950 font-bold text-xs py-3 rounded-2xl transition cursor-pointer flex items-center justify-center space-x-2"
              >
                <span>
                  {isSetupMode 
                    ? (t.saveAuth || "Activer le Compte") 
                    : (t.unlock || "Déverrouiller")}
                </span>
              </button>
            </div>
          </form>
        </div>

        {/* Footer info text */}
        <div className="text-center text-[10px] text-slate-500 mt-4 z-10 space-y-1">
          <div>{lang === "ar" ? "جميع البيانات مشفرة ومحفوظة داخلياً" : "Identifiants & données chiffrées localement"}</div>
          <div className="text-[9px] text-teal-500/70">{lang === "ar" ? "لا نرسل معلوماتك لأي سيرفر خارجي" : "Zéro communication serveur pour votre vie privée"}</div>
        </div>
      </div>
    </div>
  );
}
