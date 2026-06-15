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
  onRestore: (data: BackupData, merge: boolean) => void;
  onClearAll: () => void;
  lang: Language;
  storedPin: string | null;
  onSetPin: (pin: string | null) => void;
}

export default function BackupSettings({
  clients,
  transactions,
  repayments,
  onRestore,
  onClearAll,
  lang,
  storedPin,
  onSetPin,
}: BackupProps) {
  const t = translations[lang];
  const isRtl = lang === "ar";

  const [inputTextCode, setInputTextCode] = useState<string>("");
  const [successMsg, setSuccessMsg] = useState<string>("");
  const [errorMsg, setErrorMsg] = useState<string>("");
  const [copied, setCopied] = useState<boolean>(false);
  const [mergeOnRestore, setMergeOnRestore] = useState<boolean>(false);

  // Danger zone confirmation
  const [confirmValue, setConfirmValue] = useState<string>("");
  const [showConfirmReset, setShowConfirmReset] = useState<boolean>(false);

  // PIN security settings states
  const [pinChangeActive, setPinChangeActive] = useState<boolean>(false);
  const [newSettingsPin, setNewSettingsPin] = useState<string>("");
  const [confirmSettingsPin, setConfirmSettingsPin] = useState<string>("");

  const handleSavePinSettings = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg("");
    setSuccessMsg("");

    if (newSettingsPin.length < 4) {
      setErrorMsg(lang === "ar" ? "يجب أن يتكون الرمز الجديد من 4 أرقام للتأمين." : "Le nouveau code PIN doit comporter 4 chiffres.");
      return;
    }

    if (newSettingsPin !== confirmSettingsPin) {
      setErrorMsg(t.pinsDoNotMatch);
      return;
    }

    onSetPin(newSettingsPin);
    setSuccessMsg(t.pinSetSuccess);
    setNewSettingsPin("");
    setConfirmSettingsPin("");
    setPinChangeActive(false);
  };

  const handleDisablePin = () => {
    onSetPin(null);
    setSuccessMsg(t.pinDisabledSuccess);
    setPinChangeActive(false);
  };

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Generate current backup data
  const generateBackupPayload = (): BackupData => {
    return {
      version: 1,
      clients,
      transactions,
      repayments,
      exportDate: new Date().toISOString(),
    };
  };

  // 1. Download Backup as File (using Blob URL — safe and memory-friendly)
  const handleDownloadBackup = () => {
    const backup = generateBackupPayload();
    const blob = new Blob([JSON.stringify(backup, null, 2)], { type: "application/json" });
    const blobUrl = URL.createObjectURL(blob);
    const downloadAnchor = document.createElement("a");
    downloadAnchor.href = blobUrl;
    downloadAnchor.download = `Sauvegarde_Dettes_Livreur_${new Date().toISOString().split("T")[0]}.json`;
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
    // Release object URL to free memory
    setTimeout(() => URL.revokeObjectURL(blobUrl), 1000);

    setSuccessMsg(lang === "ar" ? "تم تحميل ملف النسخة الاحتياطية بنجاح!" : "Fichier de sauvegarde téléchargé avec succès ! Checkez vos téléchargements.");
    setTimeout(() => setSuccessMsg(""), 4000);
  };

  // 2. Copy Backup Code for Easy Msg Sharing (WhatsApp / Notes)
  const handleCopyTextCode = () => {
    const backup = generateBackupPayload();
    const serialized = JSON.stringify(backup);
    navigator.clipboard
      .writeText(serialized)
      .then(() => {
        setCopied(true);
        setSuccessMsg(lang === "ar" ? "تم نسخ رمز النسخ الاحتياطي بنجاح! يمكنك الآن حفظه بمكان آمن." : "Code de sauvegarde copié dans le presse-papiers ! Envoyez-le vous par SMS ou WhatsApp.");
        setTimeout(() => {
          setCopied(false);
          setSuccessMsg("");
        }, 4000);
      })
      .catch(() => {
        setErrorMsg(lang === "ar" ? "فشل النسخ التلقائي." : "Impossible de copier automatiquement. Sélectionnez le texte manuellement.");
      });
  };

  // 3. Import from File Upload
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
          onRestore(parsed, mergeOnRestore);
          setSuccessMsg(
            mergeOnRestore
              ? (lang === "ar" ? `تم دمج البيانات بنجاح! تم العثور على ${parsed.clients.length} زبون.` : `Fusion réussie ! ${parsed.clients.length} clients fusionnés avec vos données locales.`)
              : (lang === "ar" ? `تم استرجاع البيانات بنجاح! تم العثور على ${parsed.clients.length} زبون.` : `Restauration réussie ! ${parsed.clients.length} clients et leurs transactions ont été récupérés.`)
          );
          if (fileInputRef.current) fileInputRef.current.value = "";
        } else {
          setErrorMsg(lang === "ar" ? "هيكل ملف النسخ الاحتياطي غير صالح." : "Le format du fichier de sauvegarde est invalide.");
        }
      } catch {
        setErrorMsg(lang === "ar" ? "خطأ في قراءة ملف JSON." : "Erreur de lecture du fichier JSON. Vérifiez qu'il n'est pas corrompu.");
      }
    };
    reader.readAsText(file);
  };

  // 4. Import from Pasted Text Code
  const handleRestoreFromTextCode = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg("");
    setSuccessMsg("");

    if (!inputTextCode.trim()) {
      setErrorMsg(lang === "ar" ? "يرجى لصق كود احتياطي صحيح أولاً." : "Veuillez coller un code de sauvegarde valide d'abord.");
      return;
    }

    try {
      const parsed = JSON.parse(inputTextCode.trim());
      if (validateBackupData(parsed)) {
        onRestore(parsed, mergeOnRestore);
        setSuccessMsg(
          mergeOnRestore
            ? (lang === "ar" ? `تم دمج البيانات بنجاح! تم استرجاع ${parsed.clients.length} زبون.` : `Fusion réussie ! ${parsed.clients.length} clients fusionnés avec vos données locales.`)
            : (lang === "ar" ? `تم الاستيراد بنجاح! تم استرجاع ${parsed.clients.length} زبون.` : `Restauration réussie ! ${parsed.clients.length} clients et leurs transactions ont été importés.`)
        );
        setInputTextCode("");
      } else {
        setErrorMsg(lang === "ar" ? "الكود الملصق لا يوافق هيكل بيانات صالح للتطبيق." : "Le texte collé ne correspond pas à un format de sauvegarde valide.");
      }
    } catch {
      setErrorMsg(lang === "ar" ? "فشل قراءة الرمز. تأكد من نسخ الكود بدقة وبكافة رموزه." : "Erreur lors de la lecture du code. Assurez-vous d'avoir collé l'entièreté du code.");
    }
  };

  // 5. Handle Reset All
  const handleResetData = () => {
    if (confirmValue.toLowerCase() !== "effacer") {
      setErrorMsg(lang === "ar" ? "يجب كتابة كلمة EFFACER بشكل صحيح لإتمام المسح." : "Vous devez saisir le mot correct pour réinitialiser.");
      return;
    }
    onClearAll();
    setSuccessMsg(lang === "ar" ? "تم مسح كافة البيانات المسجلة بنجاح." : "L'ensemble du registre a été effacé avec succès.");
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
      transition={{ duration: 0.2 }}
      className="space-y-5"
      dir={isRtl ? "rtl" : "ltr"}
    >
      {/* Informative Security Banner */}
      <div className={`bg-slate-900 border border-slate-800 rounded-2xl p-4 flex items-start ${isRtl ? "space-x-reverse" : "space-x-3"} text-white text-left`}>
        <div className="bg-amber-500/10 text-amber-500 p-2.5 rounded-xl border border-amber-550/20">
          <ShieldCheck className="w-5 h-5 text-amber-500" />
        </div>
        <div className="space-y-1">
          <h3 className="text-xs font-bold uppercase tracking-wider text-amber-400">
            {t.securityTagline}
          </h3>
          <p className="text-xs text-slate-300 leading-relaxed text-left">
            {t.securityDesc}
          </p>
        </div>
      </div>

      {/* Backup generation card */}
      <div className="bg-white border border-slate-100 rounded-2xl p-4.5 space-y-4 shadow-xs text-left animate-fade-in">
        <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500">
          {t.backupTitle}
        </h3>

        <div className="grid grid-cols-2 gap-2.5">
          {/* File download trigger */}
          <button
            onClick={handleDownloadBackup}
            id="download-backup-json-btn"
            className="flex flex-col items-center justify-center space-y-2 bg-slate-50 border border-slate-250 hover:border-amber-400 p-4 rounded-xl transition cursor-pointer"
          >
            <div className="bg-amber-100 text-amber-700 p-2.5 rounded-full">
              <Download className="w-5 h-5 text-amber-600" />
            </div>
            <span className="text-xs font-bold text-slate-705 text-center leading-tight">
              {t.backupFileBtn}
            </span>
            <span className="text-[9px] text-slate-400 text-center">{t.backupFileDesc}</span>
          </button>

          {/* Code Clipboard trigger */}
          <button
            onClick={handleCopyTextCode}
            id="copy-raw-text-backup-btn"
            className="flex flex-col items-center justify-center space-y-2 bg-slate-50 border border-slate-255 hover:border-amber-400 p-4 rounded-xl transition cursor-pointer"
          >
            <div className="bg-amber-100 text-amber-700 p-2.5 rounded-full">
              {copied ? <ClipboardCheck className="w-5 h-5 text-emerald-600 animate-bounce" /> : <Copy className="w-5 h-5 text-amber-600" />}
            </div>
            <span className="text-xs font-bold text-slate-705 text-center leading-tight">
              {t.backupCodeBtn}
            </span>
            <span className="text-[9px] text-slate-400 text-center">{t.backupCodeDesc}</span>
          </button>
        </div>
      </div>

      {/* Restore generation card */}
      <div className="bg-white border border-slate-100 rounded-2xl p-4.5 space-y-4 shadow-xs text-left font-sans">
        <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500">
          {t.restoreTitle}
        </h3>

        {/* Merge toggle — shared by both restore methods */}
        <label
          htmlFor="merge-toggle"
          className="flex items-start gap-2.5 cursor-pointer bg-amber-50 border border-amber-100 p-3 rounded-xl"
        >
          <input
            id="merge-toggle"
            type="checkbox"
            checked={mergeOnRestore}
            onChange={(e) => setMergeOnRestore(e.target.checked)}
            className="mt-0.5 accent-amber-500 w-4 h-4 shrink-0"
          />
          <div>
            <p className="text-xs font-bold text-amber-800">{t.mergeDataLabel}</p>
            <p className="text-[10px] text-amber-700 leading-snug mt-0.5">{t.mergeDataDesc}</p>
          </div>
        </label>

        {/* Upload File Input */}
        <div className="space-y-1">
          <label className="block text-[10px] text-slate-400 font-bold uppercase">
            {t.importJsonLabel}
          </label>
          <div className={`flex items-center ${isRtl ? "space-x-reverse" : "space-x-2.5"}`}>
            <button
              onClick={() => fileInputRef.current?.click()}
              id="trigger-file-upload-btn"
              className="flex items-center space-x-1.5 bg-slate-900 text-white font-bold text-xs py-2 px-3.5 rounded-xl transition cursor-pointer"
            >
              <Upload className="w-4 h-4" />
              <span>{t.chooseFileBtn}</span>
            </button>
            <input
              type="file"
              ref={fileInputRef}
              accept=".json"
              onChange={handleFileUpload}
              className="hidden"
            />
            <span className="text-[11px] text-slate-400 truncate">{t.selectJsonHint}</span>
          </div>
        </div>

        {/* Text Area Code Paste Restorer */}
        <form onSubmit={handleRestoreFromTextCode} className="space-y-2 pt-1 border-t border-slate-100">
          <label htmlFor="restore-code-paste" className="block text-[10px] text-slate-400 font-bold uppercase">
            {t.restoreCodeLabel}
          </label>
          <textarea
            id="restore-code-paste"
            placeholder={t.restoreCodePlaceholder}
            value={inputTextCode}
            onChange={(e) => setInputTextCode(e.target.value)}
            className="w-full bg-slate-55 border border-slate-200 rounded-xl p-2.5 text-[11px] font-mono text-slate-800 outline-none focus:ring-1 focus:ring-amber-500 h-20 resize-none text-left"
          />
          <button
            type="submit"
            id="restore-pasted-data-btn"
            className="w-full bg-slate-900 text-white font-bold text-xs py-2 rounded-xl flex items-center justify-center space-x-1 hover:bg-slate-800 cursor-pointer transition text-center"
          >
            <FileCheck className="w-4 h-4 text-amber-400" />
            <span>{t.restorePastedBtn}</span>
          </button>
        </form>
      </div>

      {/* PIN Lock Security Settings Card */}
      <div className="bg-white border border-slate-100 rounded-2xl p-4.5 space-y-4 shadow-xs text-left">
        <div className={`flex items-center justify-between ${isRtl ? "flex-row-reverse" : ""}`}>
          <div className={`flex items-center ${isRtl ? "space-x-reverse" : "space-x-2"}`}>
            <div className="bg-amber-100 text-amber-700 p-1.5 rounded-lg">
              <ShieldCheck className="w-4 h-4 text-amber-600" />
            </div>
            <div>
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-800">
                {t.pinInfo}
              </h3>
              <p className="text-[10px] text-slate-400">
                {lang === "ar" ? "حظر التطفل والدخول غير المصرح" : "Protéger l'accès physique à l'app"}
              </p>
            </div>
          </div>

          <span className={`text-[10px] font-bold py-0.5 px-2 rounded-md ${
            storedPin ? "bg-emerald-100 text-emerald-800" : "bg-slate-100 text-slate-500"
          }`}>
            {storedPin ? (lang === "ar" ? "✓ نشط" : "✓ Activé") : (lang === "ar" ? "تعطيل حماية" : "Désactivé")}
          </span>
        </div>

        {storedPin && !pinChangeActive && (
          <div className="flex gap-2 text-xs">
            <button
              onClick={() => setPinChangeActive(true)}
              id="settings-trigger-modify-pin"
              className="flex-1 bg-slate-100 hover:bg-slate-200 text-slate-700 py-2 rounded-xl font-bold cursor-pointer transition text-center"
            >
              {t.changePin}
            </button>
            <button
              onClick={handleDisablePin}
              id="settings-disable-pin-btn"
              className="flex-1 bg-rose-50 hover:bg-rose-100 text-rose-600 py-2 rounded-xl font-bold cursor-pointer transition border border-rose-100 text-center"
            >
              {t.disablePin}
            </button>
          </div>
        )}

        {(!storedPin || pinChangeActive) && (
          <form onSubmit={handleSavePinSettings} className="space-y-3 pt-2 border-t border-slate-100">
            <div className={`flex items-center justify-between`}>
              <span className="text-xs font-bold text-slate-600">
                {pinChangeActive ? t.changePin : t.setupPinTitle}
              </span>
              {pinChangeActive && (
                <button
                  type="button"
                  onClick={() => {
                    setPinChangeActive(false);
                    setNewSettingsPin("");
                    setConfirmSettingsPin("");
                  }}
                  className="text-xs text-slate-400 hover:text-slate-605"
                >
                  {lang === "ar" ? "إلغاء التغيير" : "Annuler"}
                </button>
              )}
            </div>

            <div className="grid grid-cols-2 gap-2.5">
              <div className="space-y-1">
                <label htmlFor="settings-new-pin-input" className="block text-[9px] text-slate-400 font-bold uppercase">
                  {lang === "ar" ? "الرمز السري الجديد" : "Nouveau code (4 ch.)"}
                </label>
                <input
                  id="settings-new-pin-input"
                  type="password"
                  inputMode="numeric"
                  maxLength={4}
                  placeholder="••••"
                  value={newSettingsPin}
                  onChange={(e) => setNewSettingsPin(e.target.value.replace(/\D/g, ""))}
                  className="w-full bg-slate-50 border border-slate-200 text-center text-sm font-bold tracking-widest py-1.5 px-2 rounded-lg outline-none focus:ring-1 focus:ring-amber-500"
                />
              </div>

              <div className="space-y-1">
                <label htmlFor="settings-confirm-pin-input" className="block text-[9px] text-slate-400 font-bold uppercase">
                  {t.confirmPin}
                </label>
                <input
                  id="settings-confirm-pin-input"
                  type="password"
                  inputMode="numeric"
                  maxLength={4}
                  placeholder="••••"
                  value={confirmSettingsPin}
                  onChange={(e) => setConfirmSettingsPin(e.target.value.replace(/\D/g, ""))}
                  className="w-full bg-slate-50 border border-slate-200 text-center text-sm font-bold tracking-widest py-1.5 px-2 rounded-lg outline-none focus:ring-1 focus:ring-amber-500"
                />
              </div>
            </div>

            <button
              type="submit"
              id="settings-confirm-new-pin-btn"
              className="w-full bg-slate-900 text-white font-bold text-xs py-2 rounded-xl flex items-center justify-center space-x-1 hover:bg-slate-800 transition cursor-pointer"
            >
              <span>{t.savePin}</span>
            </button>
          </form>
        )}
      </div>

      {/* Dynamic Notifications */}
      {successMsg && (
        <p id="backup-success-toast" className={`text-xs text-emerald-600 font-semibold bg-emerald-50 border border-emerald-100 p-3 rounded-xl flex items-start ${isRtl ? "space-x-reverse" : "space-x-1.5"} animate-pulse-slow`}>
          <span>✅</span>
          <span>{successMsg}</span>
        </p>
      )}

      {errorMsg && (
        <p id="backup-error-toast" className={`text-xs text-rose-500 font-semibold bg-rose-50 border border-rose-100 p-3 rounded-xl flex items-start ${isRtl ? "space-x-reverse" : "space-x-1.5"}`}>
          <span>⚠️</span>
          <span>{errorMsg}</span>
        </p>
      )}

      {/* Danger Reset Zone */}
      <div className="bg-rose-50 border border-rose-100 rounded-2xl p-4.5 space-y-3 text-left">
        <h4 className={`text-xs font-bold text-rose-800 uppercase flex items-center ${isRtl ? "space-x-reverse" : ""} space-x-1.5`}>
          <AlertTriangle className="w-4 h-4 text-rose-600" />
          <span>{t.dangerZone}</span>
        </h4>

        {!showConfirmReset ? (
          <button
            onClick={() => setShowConfirmReset(true)}
            id="trigger-confirm-reset-btn"
            className="w-full border border-rose-300 bg-white text-rose-700 hover:bg-rose-100 active:bg-rose-200 font-bold text-xs py-2 px-3.5 rounded-xl transition cursor-pointer"
          >
            {t.clearDatabaseBtn}
          </button>
        ) : (
          <div className="space-y-3 p-3 bg-white border border-rose-200 rounded-xl">
            <p className="text-[11px] text-rose-700 leading-snug">
              {t.dangerDesc}
            </p>
            <div className="space-y-2">
              <label htmlFor="confirm-delete-phrase" className="block text-[10px] text-slate-650 font-bold">
                {t.confirmResetLabel}
              </label>
              <div className={`flex ${isRtl ? "space-x-reverse" : ""} gap-2 text-xs`}>
                <input
                  id="confirm-delete-phrase"
                  type="text"
                  placeholder={t.confirmResetPlaceholder}
                  value={confirmValue}
                  onChange={(e) => setConfirmValue(e.target.value)}
                  className="flex-1 bg-slate-50 border border-rose-200 rounded-lg px-2.5 py-1.5 text-xs font-bold text-rose-600 outline-none text-left"
                />
                <button
                  onClick={handleResetData}
                  id="final-reset-data-btn"
                  className="bg-rose-600 hover:bg-rose-700 text-white font-bold px-3 py-1.5 rounded-lg transition"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowConfirmReset(false);
                    setConfirmValue("");
                  }}
                  className="bg-slate-100 hover:bg-slate-200 text-slate-600 py-1.5 px-3 rounded-lg"
                >
                  {lang === "ar" ? "إلغاء" : "Annuler"}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </motion.div>
  );
}
