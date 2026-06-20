/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useRef } from "react";
import { Client, Transaction, Repayment, BackupData } from "../types";
import { validateBackupData, formatDate } from "../utils";
import {
  ShieldCheck,
  Download,
  Upload,
  Copy,
  ClipboardCheck,
  Trash2,
  FileCheck,
  AlertTriangle,
  RefreshCw,
} from "lucide-react";
import { motion } from "motion/react";
import { Language, translations } from "../translations";

interface BackupProps {
  clients: Client[];
  transactions: Transaction[];
  repayments: Repayment[];
  onRestore: (data: BackupData) => void;
  onClearAll: () => void;
  lang: Language;
  storedUser: string | null;
  storedPass: string | null;
  onSetCredentials: (user: string | null, pass: string | null) => void;
  reminderOffsetDays: number;
  setReminderOffsetDays: (days: number) => void;
  defaultDueOffsetDays: number;
  setDefaultDueOffsetDays: (days: number) => void;
}

export default function BackupSettings({
  clients,
  transactions,
  repayments,
  onRestore,
  onClearAll,
  lang,
  storedUser,
  storedPass,
  onSetCredentials,
  reminderOffsetDays,
  setReminderOffsetDays,
  defaultDueOffsetDays,
  setDefaultDueOffsetDays,
}: BackupProps) {
  const t = translations[lang];
  const isRtl = lang === "ar";

  const [inputTextCode, setInputTextCode] = useState<string>("");
  const [successMsg, setSuccessMsg] = useState<string>("");
  const [errorMsg, setErrorMsg] = useState<string>("");
  const [copied, setCopied] = useState<boolean>(false);

  const [confirmValue, setConfirmValue] = useState<string>("");
  const [showConfirmReset, setShowConfirmReset] = useState<boolean>(false);

  const [authChangeActive, setAuthChangeActive] = useState<boolean>(false);
  const [newSettingsUser, setNewSettingsUser] = useState<string>("");
  const [newSettingsPass, setNewSettingsPass] = useState<string>("");
  const [confirmSettingsPass, setConfirmSettingsPass] = useState<string>("");

  const handleSaveAuthSettings = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg("");
    setSuccessMsg("");

    const trimmedUser = newSettingsUser.trim();
    if (!trimmedUser || !newSettingsPass || !confirmSettingsPass) {
      setErrorMsg(lang === "ar" ? "يرجى ملء جميع الحقول المطلوبة!" : "Veuillez remplir tous les champs !");
      return;
    }

    if (trimmedUser.length < 3) {
      setErrorMsg(lang === "ar" ? "اسم المستخدم يجب أن يكون 3 أحرف على الأقل." : "Le nom d'utilisateur doit comporter au moins 3 caractères.");
      return;
    }

    if (newSettingsPass.length < 4) {
      setErrorMsg(lang === "ar" ? "كلمة المرور يجب أن تكون 4 أحرف على الأقل." : "Le mot de passe doit comporter au moins 4 caractères.");
      return;
    }

    if (newSettingsPass !== confirmSettingsPass) {
      setErrorMsg(t.passwordsDoNotMatch || "Les mots de passe ne correspondent pas !");
      return;
    }

    onSetCredentials(trimmedUser, newSettingsPass);
    setSuccessMsg(t.authSetSuccess);
    setNewSettingsUser("");
    setNewSettingsPass("");
    setConfirmSettingsPass("");
    setAuthChangeActive(false);
  };

  const handleDisableAuth = () => {
    onSetCredentials(null, null);
    setSuccessMsg(t.authDisabledSuccess);
    setAuthChangeActive(false);
  };

  const fileInputRef = useRef<HTMLInputElement>(null);

  const generateBackupPayload = (): BackupData => {
    return {
      version: 1,
      clients,
      transactions,
      repayments,
      exportDate: new Date().toISOString(),
    };
  };

  const handleDownloadBackup = () => {
    const backup = generateBackupPayload();
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(backup, null, 2));
    const downloadAnchor = document.createElement("a");
    downloadAnchor.setAttribute("href", dataStr);
    downloadAnchor.setAttribute(
      "download",
      `Sauvegarde_Dettes_Livreur_${new Date().toISOString().split("T")[0]}.json`
    );
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();

    setSuccessMsg(lang === "ar" ? "تم تحميل ملف النسخة الاحتياطية بنجاح!" : "Fichier de sauvegarde téléchargé avec succès !");
    setTimeout(() => setSuccessMsg(""), 4000);
  };

  const handleCopyTextCode = () => {
    const backup = generateBackupPayload();
    const serialized = JSON.stringify(backup);
    navigator.clipboard
      .writeText(serialized)
      .then(() => {
        setCopied(true);
        setSuccessMsg(lang === "ar" ? "تم نسخ رمز النسخ الاحتياطي بنجاح!" : "Code de sauvegarde copié !");
        setTimeout(() => {
          setCopied(false);
          setSuccessMsg("");
        }, 4000);
      })
      .catch(() => {
        setErrorMsg(lang === "ar" ? "فشل النسخ التلقائي." : "Impossible de copier automatiquement.");
      });
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    setErrorMsg("");
    setSuccessMsg("");
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const parsed = JSON.parse(event.target?.result as string);
        if (validateBackupData(parsed)) {
          onRestore(parsed);
          setSuccessMsg(
            lang === "ar" ? `تم استرجاع البيانات بنجاح! ${parsed.clients.length} زبون.` :
            `Restauration réussie ! ${parsed.clients.length} clients récupérés.`
          );
          if (fileInputRef.current) fileInputRef.current.value = "";
        } else {
          setErrorMsg(lang === "ar" ? "هيكل ملف النسخ الاحتياطي غير صالح." : "Format de sauvegarde invalide.");
        }
      } catch {
        setErrorMsg(lang === "ar" ? "خطأ في قراءة ملف JSON." : "Erreur de lecture du fichier JSON.");
      }
    };
    reader.readAsText(file);
  };

  const handleRestoreFromTextCode = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg("");
    setSuccessMsg("");

    if (!inputTextCode.trim()) {
      setErrorMsg(lang === "ar" ? "يرجى لصق كود احتياطي صحيح." : "Veuillez coller un code valide.");
      return;
    }

    try {
      const parsed = JSON.parse(inputTextCode.trim());
      if (validateBackupData(parsed)) {
        onRestore(parsed);
        setSuccessMsg(
          lang === "ar" ? `تم الاستيراد بنجاح! ${parsed.clients.length} زبون.` :
          `Restauration réussie ! ${parsed.clients.length} clients importés.`
        );
        setInputTextCode("");
      } else {
        setErrorMsg(lang === "ar" ? "الكود غير صالح." : "Le code collé n'est pas valide.");
      }
    } catch {
      setErrorMsg(lang === "ar" ? "فشل قراءة الرمز." : "Erreur lors de la lecture du code.");
    }
  };

  const handleResetData = () => {
    if (confirmValue.toLowerCase() !== "effacer") {
      setErrorMsg(lang === "ar" ? "يجب كتابة كلمة EFFACER." : "Vous devez saisir le mot correct.");
      return;
    }
    onClearAll();
    setSuccessMsg(lang === "ar" ? "تم مسح كافة البيانات." : "Toutes les données ont été effacées.");
    setConfirmValue("");
    setShowConfirmReset(false);
    setTimeout(() => setSuccessMsg(""), 3000);
  };

  return (
    <motion.div
      id="backup-settings-container"
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      transition={{ duration: 0.3 }}
      className="space-y-5"
      dir={isRtl ? "rtl" : "ltr"}
    >
      {/* Sécurité - bannière */}
      <div className="bg-gradient-to-r from-indigo-50 to-blue-50 border border-indigo-200 rounded-3xl p-4 flex items-start space-x-3 text-left">
        <div className="bg-indigo-100 text-indigo-700 p-2.5 rounded-2xl border border-indigo-200">
          <ShieldCheck className="w-5 h-5 text-indigo-600" />
        </div>
        <div className="space-y-1">
          <h3 className="text-xs font-bold uppercase tracking-wider text-indigo-800">{t.securityTagline}</h3>
          <p className="text-xs text-slate-600 leading-relaxed">{t.securityDesc}</p>
        </div>
      </div>

      {/* Paramètres de rappel et d'échéance */}
      <div className="bg-white border border-slate-100 rounded-3xl p-4.5 space-y-4 shadow-sm text-left">
        <div className="flex items-center space-x-2 border-b border-slate-100 pb-2.5">
          <div className="bg-indigo-100 text-indigo-700 p-1.5 rounded-xl">
            <RefreshCw className="w-4 h-4 text-indigo-600 animate-spin-slow" />
          </div>
          <div>
            <h3 className="text-xs font-extrabold uppercase tracking-wider text-slate-800">{t.reminderSettings}</h3>
            <p className="text-[10px] text-slate-400">{lang === "ar" ? "تعديل مهلة التنبيهات" : "Définir les délais par défaut"}</p>
          </div>
        </div>

        <div className="space-y-3.5">
          <div>
            <label htmlFor="settings-due-offset-select" className="block text-xs font-medium text-slate-600">{t.defaultDueOffsetDays}</label>
            <select
              id="settings-due-offset-select"
              value={defaultDueOffsetDays}
              onChange={(e) => setDefaultDueOffsetDays(parseInt(e.target.value, 10))}
              className="w-full bg-slate-50 border border-slate-200 text-slate-800 rounded-xl py-2 px-3 text-xs outline-none focus:ring-2 focus:ring-indigo-300 font-semibold"
            >
              <option value={0}>{t.noDueDate}</option>
              <option value={3}>3 {t.daysDefaultTerm}</option>
              <option value={7}>7 {t.daysDefaultTerm}</option>
              <option value={14}>14 {t.daysDefaultTerm}</option>
              <option value={30}>30 {t.daysDefaultTerm}</option>
            </select>
          </div>
          <div>
            <label htmlFor="settings-reminder-offset-select" className="block text-xs font-medium text-slate-600">{t.reminderDaysOffset}</label>
            <select
              id="settings-reminder-offset-select"
              value={reminderOffsetDays}
              onChange={(e) => setReminderOffsetDays(parseInt(e.target.value, 10))}
              className="w-full bg-slate-50 border border-slate-200 text-slate-800 rounded-xl py-2 px-3 text-xs outline-none focus:ring-2 focus:ring-indigo-300 font-semibold"
            >
              <option value={1}>1 {t.daysBeforeDue}</option>
              <option value={2}>2 {t.daysBeforeDue}</option>
              <option value={3}>3 {t.daysBeforeDue}</option>
              <option value={5}>5 {t.daysBeforeDue}</option>
            </select>
          </div>
        </div>
      </div>

      {/* Backup - génération */}
      <div className="bg-white border border-slate-100 rounded-3xl p-4.5 space-y-4 shadow-sm">
        <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500">{t.backupTitle}</h3>
        <div className="grid grid-cols-2 gap-2.5">
          <button
            onClick={handleDownloadBackup}
            id="download-backup-json-btn"
            className="flex flex-col items-center justify-center space-y-2 bg-slate-50 border border-slate-200 hover:border-indigo-300 p-4 rounded-2xl transition cursor-pointer"
          >
            <div className="bg-indigo-100 text-indigo-700 p-2.5 rounded-full">
              <Download className="w-5 h-5 text-indigo-600" />
            </div>
            <span className="text-xs font-bold text-slate-700 text-center">{t.backupFileBtn}</span>
            <span className="text-[9px] text-slate-400 text-center">{t.backupFileDesc}</span>
          </button>
          <button
            onClick={handleCopyTextCode}
            id="copy-raw-text-backup-btn"
            className="flex flex-col items-center justify-center space-y-2 bg-slate-50 border border-slate-200 hover:border-indigo-300 p-4 rounded-2xl transition cursor-pointer"
          >
            <div className="bg-indigo-100 text-indigo-700 p-2.5 rounded-full">
              {copied ? <ClipboardCheck className="w-5 h-5 text-emerald-600 animate-bounce" /> : <Copy className="w-5 h-5 text-indigo-600" />}
            </div>
            <span className="text-xs font-bold text-slate-700 text-center">{t.backupCodeBtn}</span>
            <span className="text-[9px] text-slate-400 text-center">{t.backupCodeDesc}</span>
          </button>
        </div>
      </div>

      {/* Restauration */}
      <div className="bg-white border border-slate-100 rounded-3xl p-4.5 space-y-4 shadow-sm">
        <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500">{t.restoreTitle}</h3>

        <div className="space-y-1">
          <label className="block text-[10px] text-slate-400 font-bold uppercase">{t.importJsonLabel}</label>
          <div className="flex items-center space-x-2.5">
            <button
              onClick={() => fileInputRef.current?.click()}
              id="trigger-file-upload-btn"
              className="flex items-center space-x-1.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs py-2 px-3.5 rounded-xl transition"
            >
              <Upload className="w-4 h-4" />
              <span>{t.chooseFileBtn}</span>
            </button>
            <input type="file" ref={fileInputRef} accept=".json" onChange={handleFileUpload} className="hidden" />
            <span className="text-[11px] text-slate-400 truncate">{t.selectJsonHint}</span>
          </div>
        </div>

        <form onSubmit={handleRestoreFromTextCode} className="space-y-2 pt-1 border-t border-slate-100">
          <label htmlFor="restore-code-paste" className="block text-[10px] text-slate-400 font-bold uppercase">{t.restoreCodeLabel}</label>
          <textarea
            id="restore-code-paste"
            placeholder={t.restoreCodePlaceholder}
            value={inputTextCode}
            onChange={(e) => setInputTextCode(e.target.value)}
            className="w-full bg-slate-50 border border-slate-200 rounded-2xl p-2.5 text-[11px] font-mono text-slate-800 outline-none focus:ring-2 focus:ring-indigo-300 h-20 resize-none"
          />
          <button
            type="submit"
            id="restore-pasted-data-btn"
            className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs py-2 rounded-2xl flex items-center justify-center space-x-1 transition"
          >
            <FileCheck className="w-4 h-4 text-indigo-200" />
            <span>{t.restorePastedBtn}</span>
          </button>
        </form>
      </div>

      {/* Authentification */}
      <div className="bg-white border border-slate-100 rounded-3xl p-4.5 space-y-4 shadow-sm">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <div className="bg-indigo-100 text-indigo-700 p-1.5 rounded-xl">
              <ShieldCheck className="w-4 h-4 text-indigo-600" />
            </div>
            <div>
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-800">{t.authInfo}</h3>
              <p className="text-[10px] text-slate-400">{lang === "ar" ? "حماية الدخول" : "Protéger l'accès"}</p>
            </div>
          </div>
          <span className={`text-[10px] font-bold py-0.5 px-2 rounded-md ${(storedUser && storedPass) ? "bg-emerald-100 text-emerald-800" : "bg-slate-100 text-slate-500"}`}>
            {(storedUser && storedPass) ? (lang === "ar" ? "✓ نشط" : "✓ Activé") : (lang === "ar" ? "تعطيل" : "Désactivé")}
          </span>
        </div>

        {(storedUser && storedPass) && !authChangeActive && (
          <div className="flex gap-2 text-xs">
            <button onClick={() => setAuthChangeActive(true)} className="flex-1 bg-slate-100 hover:bg-slate-200 text-slate-700 py-2 rounded-xl font-bold transition text-center">{t.changeAuth}</button>
            <button onClick={handleDisableAuth} className="flex-1 bg-rose-50 hover:bg-rose-100 text-rose-600 py-2 rounded-xl font-bold transition border border-rose-200 text-center">{t.disableAuth}</button>
          </div>
        )}

        {(!(storedUser && storedPass) || authChangeActive) && (
          <form onSubmit={handleSaveAuthSettings} className="space-y-3 pt-2 border-t border-slate-100">
            <div className="flex justify-between">
              <span className="text-xs font-bold text-slate-600">{authChangeActive ? t.changeAuth : t.setupAuthTitle}</span>
              {authChangeActive && (
                <button type="button" onClick={() => { setAuthChangeActive(false); setNewSettingsUser(""); setNewSettingsPass(""); setConfirmSettingsPass(""); }} className="text-xs text-slate-400 hover:text-slate-600">
                  {lang === "ar" ? "إلغاء" : "Annuler"}
                </button>
              )}
            </div>

            <div className="space-y-2.5">
              <div>
                <label htmlFor="settings-new-user-input" className="block text-[9px] text-slate-400 font-bold uppercase">{t.usernameLabel}</label>
                <input id="settings-new-user-input" type="text" placeholder={lang === "ar" ? "مثال: سفيان" : "Ex: slimane"} value={newSettingsUser} onChange={(e) => setNewSettingsUser(e.target.value)} className="w-full bg-slate-50 border border-slate-200 rounded-xl py-1.5 px-3 text-sm font-bold outline-none focus:ring-2 focus:ring-indigo-300" />
              </div>
              <div className="grid grid-cols-2 gap-2.5">
                <div>
                  <label htmlFor="settings-new-pass-input" className="block text-[9px] text-slate-400 font-bold uppercase">{t.passwordLabel}</label>
                  <input id="settings-new-pass-input" type="password" placeholder="••••" value={newSettingsPass} onChange={(e) => setNewSettingsPass(e.target.value)} className="w-full bg-slate-50 border border-slate-200 rounded-xl py-1.5 px-3 text-center text-sm font-bold tracking-widest outline-none focus:ring-2 focus:ring-indigo-300" />
                </div>
                <div>
                  <label htmlFor="settings-confirm-pass-input" className="block text-[9px] text-slate-400 font-bold uppercase">{t.confirmPassword}</label>
                  <input id="settings-confirm-pass-input" type="password" placeholder="••••" value={confirmSettingsPass} onChange={(e) => setConfirmSettingsPass(e.target.value)} className="w-full bg-slate-50 border border-slate-200 rounded-xl py-1.5 px-3 text-center text-sm font-bold tracking-widest outline-none focus:ring-2 focus:ring-indigo-300" />
                </div>
              </div>
            </div>

            <button type="submit" className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs py-2 rounded-xl transition">{t.saveAuth}</button>
          </form>
        )}
      </div>

      {/* Messages de succès/erreur */}
      {successMsg && (
        <p className="text-xs text-emerald-600 font-semibold bg-emerald-50 border border-emerald-200 p-3 rounded-2xl flex items-start space-x-1.5 animate-pulse-slow">
          <span>✅</span>
          <span>{successMsg}</span>
        </p>
      )}
      {errorMsg && (
        <p className="text-xs text-rose-500 font-semibold bg-rose-50 border border-rose-200 p-3 rounded-2xl flex items-start space-x-1.5">
          <span>⚠️</span>
          <span>{errorMsg}</span>
        </p>
      )}

      {/* Zone de danger */}
      <div className="bg-rose-50 border border-rose-200 rounded-3xl p-4.5 space-y-3">
        <h4 className="text-xs font-bold text-rose-800 uppercase flex items-center space-x-1.5">
          <AlertTriangle className="w-4 h-4 text-rose-600" />
          <span>{t.dangerZone}</span>
        </h4>

        {!showConfirmReset ? (
          <button onClick={() => setShowConfirmReset(true)} className="w-full border border-rose-300 bg-white text-rose-700 hover:bg-rose-100 font-bold text-xs py-2 px-3.5 rounded-xl transition">
            {t.clearDatabaseBtn}
          </button>
        ) : (
          <div className="space-y-3 p-3 bg-white border border-rose-200 rounded-2xl">
            <p className="text-[11px] text-rose-700 leading-snug">{t.dangerDesc}</p>
            <div className="space-y-2">
              <label htmlFor="confirm-delete-phrase" className="block text-[10px] text-slate-600 font-bold">{t.confirmResetLabel}</label>
              <div className="flex gap-2 text-xs">
                <input id="confirm-delete-phrase" type="text" placeholder={t.confirmResetPlaceholder} value={confirmValue} onChange={(e) => setConfirmValue(e.target.value)} className="flex-1 bg-slate-50 border border-rose-200 rounded-xl px-2.5 py-1.5 text-xs font-bold text-rose-600 outline-none" />
                <button onClick={handleResetData} className="bg-rose-600 hover:bg-rose-700 text-white font-bold px-3 py-1.5 rounded-xl transition"><Trash2 className="w-4 h-4" /></button>
                <button type="button" onClick={() => { setShowConfirmReset(false); setConfirmValue(""); }} className="bg-slate-100 hover:bg-slate-200 text-slate-600 py-1.5 px-3 rounded-xl">{lang === "ar" ? "إلغاء" : "Annuler"}</button>
              </div>
            </div>
          </div>
        )}
      </div>
    </motion.div>
  );
}