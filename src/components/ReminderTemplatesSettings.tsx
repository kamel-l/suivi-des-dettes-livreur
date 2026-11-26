/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useState } from "react";
import { motion } from "motion/react";
import { Language, translations } from "../translations";

interface ReminderTemplatesSettingsProps {
  lang: Language;
  defaultWhatsAppTemplate: string;
  defaultSmsTemplate: string;
  whatsappTemplate: string;
  smsTemplate: string;
  onSave: (whatsapp: string, sms: string) => void;
}

export default function ReminderTemplatesSettings({
  lang,
  defaultWhatsAppTemplate,
  defaultSmsTemplate,
  whatsappTemplate,
  smsTemplate,
  onSave,
}: ReminderTemplatesSettingsProps) {
  const t = translations[lang];
  const isRtl = lang === "ar";

  const [whats, setWhats] = useState<string>(whatsappTemplate);
  const [sms, setSms] = useState<string>(smsTemplate);

  useEffect(() => {
    setWhats(whatsappTemplate);
  }, [whatsappTemplate]);

  useEffect(() => {
    setSms(smsTemplate);
  }, [smsTemplate]);

  const save = (e: React.FormEvent) => {
    e.preventDefault();
    onSave(whats, sms);
  };

  const restoreDefaults = () => {
    setWhats(defaultWhatsAppTemplate);
    setSms(defaultSmsTemplate);
  };

  return (
    <motion.div
      id="reminder-templates-settings"
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -8 }}
      transition={{ duration: 0.15 }}
      className="space-y-4"
      dir={isRtl ? "rtl" : "ltr"}
    >
      <div className="bg-white border border-slate-200 rounded-2xl p-4.5 space-y-3 text-left">
        <h3 className="text-xs font-bold text-slate-800">{t.editReminderTemplates}</h3>
        <p className="text-[10px] text-slate-400">
          {t.reminderTemplateHelp}
        </p>

        <div className="rounded-xl border border-slate-200 bg-slate-50 p-3 text-[10px] text-slate-600 space-y-1">
          <p className="font-semibold text-slate-700">
            {lang === "ar" ? "المتغيرات المتاحة" : "Variables disponibles"}
          </p>
          <p>{lang === "ar" ? "{clientName}، {description}، {amountRemaining}، {dueDate}" : "{clientName}, {description}, {amountRemaining}, {dueDate}"}</p>
        </div>

        <form onSubmit={save} className="space-y-3">
          <div className="space-y-1">
            <label className="block text-[10px] font-semibold text-slate-600">{t.sendWhatsappReminder}</label>
            <textarea
              value={whats}
              onChange={(e) => setWhats(e.target.value)}
              placeholder={lang === "ar" ? "اكتب نص رسالة الواتساب..." : "Saisir le texte WhatsApp..."}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-[11px] text-slate-800 outline-none focus:ring-1 focus:ring-teal-500 h-24 resize-none text-left"
            />
          </div>

          <div className="space-y-1">
            <label className="block text-[10px] font-semibold text-slate-600">{t.sendSmsReminder}</label>
            <textarea
              value={sms}
              onChange={(e) => setSms(e.target.value)}
              placeholder={lang === "ar" ? "اكتب نص رسالة SMS..." : "Saisir le texte SMS..."}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-[11px] text-slate-800 outline-none focus:ring-1 focus:ring-teal-500 h-24 resize-none text-left"
            />
          </div>

          <div className="flex gap-2">
            <button
              type="submit"
              className="flex-1 bg-teal-600 hover:bg-teal-700 text-white font-semibold text-xs py-2 rounded-xl transition cursor-pointer"
            >
              {t.saveReminderTemplates}

            </button>

            <button
              type="button"
              onClick={restoreDefaults}
              className="flex-1 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-xs py-2 rounded-xl transition cursor-pointer"
            >
              {lang === "ar" ? "استرجاع الافتراضي" : "Par défaut"}
            </button>
          </div>
        </form>

      </div>
    </motion.div>
  );
}

