/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useMemo, useCallback } from "react";
import { Client, Transaction, Repayment } from "../types";
import { formatCurrency, getClientStats, normalizePhone } from "../utils";
import { Search, UserPlus, Phone, AlertCircle, CheckCircle } from "lucide-react";
import { motion } from "motion/react";
import { Language, translations } from "../translations";

interface ClientsListProps {
  clients: Client[];
  transactions: Transaction[];
  repayments: Repayment[];
  currency: string;
  onAddClient: (name: string, phone: string, notes?: string) => Client;
  onSelectClient: (client: Client) => void;
  lang: Language;
}

type FilterType = "all" | "indebted" | "settled";

const AddClientForm: React.FC<{
  onAddClient: (name: string, phone: string, notes?: string) => Client;
  lang: Language;
  clients: Client[];
  onSuccess: () => void;
}> = ({ onAddClient, lang, clients, onSuccess }) => {
  const t = translations[lang];
  const isRtl = lang === "ar";

  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [notes, setNotes] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSuccess("");

    const trimmedName = name.trim();
    const trimmedPhone = phone.trim();
    const normalizedPhone = normalizePhone(trimmedPhone);

    if (!trimmedName) {
      setError(lang === "ar" ? "الاسم مطلوب." : "Le nom est obligatoire.");
      return;
    }
    if (!trimmedPhone) {
      setError(lang === "ar" ? "رقم الهاتف مطلوب." : "Le numéro de téléphone est obligatoire.");
      return;
    }

    const phoneExists = clients.some((c) => normalizePhone(c.phone) === normalizedPhone);
    if (phoneExists) {
      setError(t.duplicatePhoneError);
      return;
    }

    setIsSubmitting(true);
    try {
      onAddClient(trimmedName, trimmedPhone, notes.trim() || undefined);
      setSuccess(lang === "ar" ? `تم تسجيل الزبون "${trimmedName}" بنجاح!` : `Le client "${trimmedName}" a bien été créé !`);
      setName("");
      setPhone("");
      setNotes("");
      onSuccess();
    } catch (err: any) {
      setError(err.message || "Erreur de création.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} className="bg-indigo-50/60 border border-indigo-100 rounded-2xl p-4 space-y-3 overflow-hidden">
      <h3 className="text-xs font-bold text-indigo-800 uppercase">{t.newClient}</h3>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid grid-cols-2 gap-2.5">
          <div>
            <label htmlFor="client-list-add-name" className="block text-[10px] text-slate-500 font-bold">
              {lang === "ar" ? "الاسم" : "Nom"} <span className="text-rose-400">*</span>
            </label>
            <input id="client-list-add-name" type="text" placeholder="Ex: Sofiane" value={name} onChange={(e) => setName(e.target.value)} disabled={isSubmitting} className="w-full bg-white border border-slate-200 rounded-xl py-1.5 px-3 text-xs outline-none focus:ring-2 focus:ring-indigo-300" />
          </div>
          <div>
            <label htmlFor="client-list-add-phone" className="block text-[10px] text-slate-500 font-bold">
              {lang === "ar" ? "الهاتف" : "Téléphone"} <span className="text-rose-400">*</span>
            </label>
            <input id="client-list-add-phone" type="tel" placeholder="Ex: 0551..." value={phone} onChange={(e) => setPhone(e.target.value)} disabled={isSubmitting} className="w-full bg-white border border-slate-200 rounded-xl py-1.5 px-3 text-xs outline-none focus:ring-2 focus:ring-indigo-300" />
          </div>
        </div>
        <div>
          <label htmlFor="client-list-add-notes" className="block text-[10px] text-slate-500 font-bold">{t.notesOptional}</label>
          <input id="client-list-add-notes" type="text" placeholder={t.notesPlaceholder} value={notes} onChange={(e) => setNotes(e.target.value)} disabled={isSubmitting} className="w-full bg-white border border-slate-200 rounded-xl py-1.5 px-3 text-xs outline-none focus:ring-2 focus:ring-indigo-300" />
        </div>
        {error && <p className="text-[11px] text-rose-500 font-semibold bg-rose-50 p-2 rounded">{error}</p>}
        {success && <p className="text-[11px] text-emerald-600 font-semibold bg-emerald-50 p-2 rounded">{success}</p>}
        <button type="submit" disabled={isSubmitting} className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs py-2 rounded-xl transition disabled:opacity-50">
          {isSubmitting ? (lang === "ar" ? "جاري الحفظ..." : "Enregistrement...") : t.saveClient}
        </button>
      </form>
    </motion.div>
  );
};

export default function ClientsList({ clients, transactions, repayments, currency, onAddClient, onSelectClient, lang }: ClientsListProps) {
  const t = translations[lang];
  const isRtl = lang === "ar";

  const [searchTerm, setSearchTerm] = useState("");
  const [filter, setFilter] = useState<FilterType>("all");
  const [showAddForm, setShowAddForm] = useState(false);

  const handleAddClientSuccess = useCallback(() => {
    setTimeout(() => setShowAddForm(false), 1500);
  }, []);

  const filteredClients = useMemo(() => {
    return clients.filter((client) => {
      const matchesSearch = client.name.toLowerCase().includes(searchTerm.toLowerCase()) || client.phone.includes(searchTerm);
      if (!matchesSearch) return false;
      const { debt } = getClientStats(client, transactions, repayments);
      if (filter === "indebted") return debt > 0;
      if (filter === "settled") return debt === 0;
      return true;
    });
  }, [clients, searchTerm, filter, transactions, repayments]);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLDivElement>, client: Client) => {
    if (e.key === "Enter" || e.key === " ") { e.preventDefault(); onSelectClient(client); }
  };

  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} transition={{ duration: 0.3 }} className="space-y-4" dir={isRtl ? "rtl" : "ltr"}>
      <div className="flex items-center justify-between">
        <h2 className="text-base font-bold text-slate-800 uppercase tracking-wide">{t.clientDirectory}</h2>
        <button onClick={() => setShowAddForm(!showAddForm)} className="bg-indigo-500 hover:bg-indigo-600 text-white font-bold text-xs py-1.5 px-3 rounded-xl flex items-center space-x-1.5 transition shadow-sm">
          <UserPlus className="w-4 h-4" />
          <span>{showAddForm ? t.close : t.createClient}</span>
        </button>
      </div>

      {showAddForm && <AddClientForm onAddClient={onAddClient} lang={lang} clients={clients} onSuccess={handleAddClientSuccess} />}

      <div className="relative">
        <span className={`absolute inset-y-0 ${isRtl ? "right-3.5" : "left-3.5"} flex items-center text-slate-400`}><Search className="w-4 h-4" /></span>
        <input id="client-search-input" type="text" placeholder={t.searchPlaceholder} value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className={`w-full bg-white border border-slate-200 rounded-2xl py-2.5 ${isRtl ? "pr-10 pl-4" : "pl-10 pr-4"} text-sm outline-none focus:ring-2 focus:ring-indigo-300 transition shadow-sm`} />
      </div>

      <div className="flex space-x-1.5 bg-slate-100 p-1 rounded-xl">
        {(["all", "indebted", "settled"] as FilterType[]).map((type) => {
          const label = type === "all" ? `${t.filterAll} (${clients.length})` : type === "indebted" ? t.filterIndebted : t.filterSettled;
          const isActive = filter === type;
          return (
            <button key={type} onClick={() => setFilter(type)} className={`flex-1 text-[11px] font-bold py-1.5 px-2 rounded-lg uppercase tracking-wider transition ${isActive ? "bg-white text-indigo-700 shadow-sm" : "text-slate-500 hover:text-slate-700"}`} aria-pressed={isActive}>
              {label}
            </button>
          );
        })}
      </div>

      <div className="space-y-2.5">
        {filteredClients.length === 0 ? (
          <div className="bg-white border border-slate-100 rounded-2xl p-7 text-center">
            <p className="text-sm text-slate-500 font-medium">{t.noClientFound}</p>
            <p className="text-xs text-slate-400">{t.tryChangeFilter}</p>
          </div>
        ) : (
          filteredClients.map((client) => {
            const stats = getClientStats(client, transactions, repayments);
            const isDebtActive = stats.debt > 0;
            return (
              <div key={client.id} onClick={() => onSelectClient(client)} onKeyDown={(e) => handleKeyDown(e, client)} className="bg-white border border-slate-100 hover:border-indigo-200 rounded-2xl p-4 flex items-center justify-between cursor-pointer shadow-sm hover:shadow-md transition" tabIndex={0} role="button">
                <div>
                  <h3 className="font-bold text-sm text-slate-800">{client.name}</h3>
                  <div className="flex items-center space-x-1.5 text-xs text-slate-400">
                    <Phone className="w-3.5 h-3.5" />
                    <span className="font-mono">{client.phone}</span>
                  </div>
                  {client.notes && <span className="inline-block text-[10px] bg-slate-50 text-slate-500 px-2 py-0.5 rounded border border-slate-100 mt-1 max-w-[180px] truncate">📍 {client.notes}</span>}
                </div>
                <div className="text-right">
                  <span className="block text-[9px] font-bold text-slate-400 uppercase tracking-wide">{lang === "ar" ? "الرصيد المتبقي" : "Solde Restant"}</span>
                  <span className={`text-sm font-bold font-mono ${isDebtActive ? "text-rose-500" : "text-emerald-500"}`}>{formatCurrency(stats.debt, currency)}</span>
                  {isDebtActive ? (
                    <span className="flex items-center space-x-1 bg-amber-50 text-[9px] font-bold text-amber-600 uppercase tracking-wider py-0.5 px-1.5 rounded-md border border-amber-100"><AlertCircle className="w-3 h-3" /><span>{t.activeDebt}</span></span>
                  ) : (
                    <span className="flex items-center space-x-1 bg-emerald-50 text-[9px] font-bold text-emerald-600 uppercase tracking-wider py-0.5 px-1.5 rounded-md border border-emerald-100"><CheckCircle className="w-3 h-3" /><span>{t.withoutDebt}</span></span>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>
    </motion.div>
  );
}