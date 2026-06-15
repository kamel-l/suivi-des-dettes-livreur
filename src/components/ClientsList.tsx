/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from "react";
import { Client, Transaction, Repayment } from "../types";
import { formatCurrency, getClientStats } from "../utils";
import { Search, Plus, Phone, AlertTriangle, CheckCircle, Smartphone, UserPlus } from "lucide-react";
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

export default function ClientsList({
  clients,
  transactions,
  repayments,
  currency,
  onAddClient,
  onSelectClient,
  lang,
}: ClientsListProps) {
  const t = translations[lang];
  const isRtl = lang === "ar";

  const [searchTerm, setSearchTerm] = useState<string>("");
  const [filter, setFilter] = useState<FilterType>("all");

  // State to manage inline client addition drawer
  const [showAddForm, setShowAddForm] = useState<boolean>(false);
  const [nameInput, setNameInput] = useState<string>("");
  const [phoneInput, setPhoneInput] = useState<string>("");
  const [notesInput, setNotesInput] = useState<string>("");
  const [successMsg, setSuccessMsg] = useState<string>("");
  const [errMsg, setErrMsg] = useState<string>("");

  const handleAddClientSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrMsg("");
    setSuccessMsg("");

    if (!nameInput.trim()) {
      setErrMsg(lang === "ar" ? "الاسم مطلوب." : "Le nom est obligatoire.");
      return;
    }
    if (!phoneInput.trim()) {
      setErrMsg(lang === "ar" ? "رقم الهاتف مطلوب." : "Le numéro de téléphone est obligatoire.");
      return;
    }

    // Check duplicate phone
    const phoneExists = clients.some(c => c.phone.trim() === phoneInput.trim());
    if (phoneExists) {
      setErrMsg(t.duplicatePhoneError);
      return;
    }

    try {
      onAddClient(nameInput.trim(), phoneInput.trim(), notesInput.trim());
      setSuccessMsg(lang === "ar" ? `تم تسجيل الزبون "${nameInput}" بنجاح!` : `Le client "${nameInput}" a bien été créé !`);
      setNameInput("");
      setPhoneInput("");
      setNotesInput("");
      setTimeout(() => {
        setShowAddForm(false);
        setSuccessMsg("");
      }, 1500);
    } catch (err: any) {
      setErrMsg(err.message || "Erreur de création.");
    }
  };

  // Filter & Search computation
  const filteredClients = clients.filter((client) => {
    // Search check
    const matchesSearch =
      client.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      client.phone.includes(searchTerm);

    if (!matchesSearch) return false;

    // Debt check
    const { debt } = getClientStats(client, transactions, repayments);

    if (filter === "indebted") {
      return debt > 0;
    }
    if (filter === "settled") {
      return debt === 0;
    }
    return true; // "all"
  });

  return (
    <motion.div
      id="clients-list-container"
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      transition={{ duration: 0.2 }}
      className="space-y-4"
      dir={isRtl ? "rtl" : "ltr"}
    >
      {/* Search Header and Action Toggle */}
      <div className={`flex items-center justify-between ${isRtl ? "flex-row-reverse" : ""}`}>
        <h2 className="text-base font-bold text-slate-800 uppercase tracking-wide text-left">
          {t.clientDirectory}
        </h2>
        <button
          onClick={() => setShowAddForm(!showAddForm)}
          id="toggle-add-client-drawer-btn"
          className={`bg-amber-500 hover:bg-amber-600 active:bg-amber-700 text-slate-900 font-bold text-xs py-1.5 px-3 rounded-xl flex items-center ${isRtl ? "space-x-reverse" : ""} space-x-1.5 transition shadow-sm cursor-pointer`}
        >
          <UserPlus className="w-4 h-4" />
          <span>{showAddForm ? t.close : t.createClient}</span>
        </button>
      </div>

      {/* Inline quick add form */}
      {showAddForm && (
        <motion.div
          id="inline-add-client-form"
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: "auto" }}
          className="bg-slate-55 border border-slate-200 rounded-xl p-4 space-y-3 overflow-hidden text-left"
        >
          <h3 className="text-xs font-bold text-slate-700 uppercase">
            {t.newClient}
          </h3>
          <form onSubmit={handleAddClientSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-2.5">
              <div className="space-y-1">
                <label htmlFor="client-list-add-name" className="block text-[10px] text-slate-505 font-bold">
                  {lang === "ar" ? "الاسم" : "Nom"} <span className="text-rose-500">*</span>
                </label>
                <input
                  id="client-list-add-name"
                  type="text"
                  placeholder="Ex: Sofiane"
                  value={nameInput}
                  onChange={(e) => setNameInput(e.target.value)}
                  className="w-full bg-white border border-slate-200 text-slate-800 rounded-lg py-1.5 px-2.5 text-xs outline-none focus:ring-1 focus:ring-amber-500 font-medium"
                />
              </div>
              <div className="space-y-1">
                <label htmlFor="client-list-add-phone" className="block text-[10px] text-slate-505 font-bold">
                  {lang === "ar" ? "الهاتف" : "Téléphone"} <span className="text-rose-500">*</span>
                </label>
                <input
                  id="client-list-add-phone"
                  type="tel"
                  placeholder="Ex: 0551..."
                  value={phoneInput}
                  onChange={(e) => setPhoneInput(e.target.value)}
                  className="w-full bg-white border border-slate-200 text-slate-800 rounded-lg py-1.5 px-2.5 text-xs outline-none focus:ring-1 focus:ring-amber-500 font-mono"
                />
              </div>
            </div>
            <div className="space-y-1">
              <label htmlFor="client-list-add-notes" className="block text-[10px] text-slate-505 font-bold">
                {t.notesOptional}
              </label>
              <input
                id="client-list-add-notes"
                type="text"
                placeholder={t.notesPlaceholder}
                value={notesInput}
                onChange={(e) => setNotesInput(e.target.value)}
                className="w-full bg-white border border-slate-200 text-slate-800 rounded-lg py-1.5 px-2.5 text-xs outline-none focus:ring-1 focus:ring-amber-500"
              />
            </div>

            {errMsg && <p id="list-inline-error" className="text-[11px] text-rose-600 font-semibold bg-rose-50 p-2 rounded">{errMsg}</p>}
            {successMsg && <p id="list-inline-success" className="text-[11px] text-emerald-600 font-semibold bg-emerald-50 p-2 rounded">{successMsg}</p>}

            <button
              type="submit"
              id="list-inline-submit-btn"
              className="w-full bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs py-2 rounded-lg cursor-pointer transition"
            >
              {t.saveClient}
            </button>
          </form>
        </motion.div>
      )}

      {/* Search Input Card */}
      <div className="relative">
        <span className={`absolute inset-y-0 ${isRtl ? "right-3.5" : "left-3.5"} flex items-center text-slate-400`}>
          <Search className="w-4 h-4" />
        </span>
        <input
          id="client-search-input"
          type="text"
          placeholder={t.searchPlaceholder}
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className={`w-full bg-white border border-slate-250 text-slate-850 rounded-2xl py-2.5 ${isRtl ? "pr-10 pl-4" : "pl-10 pr-4"} text-sm outline-none focus:ring-1 focus:ring-amber-500 focus:border-amber-500 transition shadow-xs text-left`}
        />
      </div>

      {/* Interactive Filter Pills */}
      <div className={`flex ${isRtl ? "space-x-reverse" : "space-x-1.5"} bg-slate-100 p-1 rounded-xl`}>
        <button
          onClick={() => setFilter("all")}
          id="filter-client-all-btn"
          className={`flex-1 text-[11px] font-bold py-1.5 px-2 rounded-lg uppercase tracking-wider transition ${
            filter === "all" ? "bg-white text-slate-800 shadow-xs" : "text-slate-500 hover:text-slate-700"
          }`}
        >
          {t.filterAll} ({clients.length})
        </button>
        <button
          onClick={() => setFilter("indebted")}
          id="filter-client-indebted-btn"
          className={`flex-1 text-[11px] font-bold py-1.5 px-2 rounded-lg uppercase tracking-wider transition ${
            filter === "indebted" ? "bg-white text-rose-700 shadow-xs font-bold" : "text-slate-500 hover:text-slate-700"
          }`}
        >
          {t.filterIndebted}
        </button>
        <button
          onClick={() => setFilter("settled")}
          id="filter-client-settled-btn"
          className={`flex-1 text-[11px] font-bold py-1.5 px-2 rounded-lg uppercase tracking-wider transition ${
            filter === "settled" ? "bg-white text-emerald-700 shadow-xs font-bold" : "text-slate-500 hover:text-slate-700"
          }`}
        >
          {t.filterSettled}
        </button>
      </div>

      {/* Clients list cards */}
      <div className="space-y-2.5">
        {filteredClients.length === 0 ? (
          <div className="bg-white border border-slate-100 rounded-2xl p-7 text-center">
            <p className="text-sm text-slate-500 font-medium">{t.noClientFound}</p>
            <p className="text-xs text-slate-400 mt-1">
              {t.tryChangeFilter}
            </p>
          </div>
        ) : (
          filteredClients.map((client) => {
            const stats = getClientStats(client, transactions, repayments);
            const isDebtActive = stats.debt > 0;

            return (
              <div
                key={client.id}
                onClick={() => onSelectClient(client)}
                id={`client-card-${client.id}`}
                className={`bg-white border border-slate-150 hover:border-amber-200 transition rounded-2xl p-4 flex items-center justify-between cursor-pointer shadow-xs ${isRtl ? "flex-row-reverse" : ""}`}
              >
                <div className="space-y-1 text-left">
                  <h3 className="font-extrabold text-sm text-slate-800 leading-snug">
                    {client.name}
                  </h3>
                  <div className={`flex items-center ${isRtl ? "space-x-reverse" : ""} space-x-1.5 text-xs text-slate-500`}>
                    <Smartphone className="w-3.5 h-3.5 text-slate-400" />
                    <span className="font-mono">{client.phone}</span>
                  </div>
                  {client.notes && (
                    <span className="inline-block text-[10px] bg-slate-50 text-slate-500 px-2 py-0.5 rounded border border-slate-100 mt-1 max-w-[180px] truncate">
                      📍 {client.notes}
                    </span>
                  )}
                </div>

                <div className="text-right flex flex-col items-end space-y-1.5">
                  <div className="space-y-0.5">
                    <span className="block text-[9px] font-extrabold text-slate-400 uppercase tracking-wide">
                      {lang === "ar" ? "الرصيد المتبقي" : "Solde Restant"}
                    </span>
                    <span
                      className={`text-sm font-bold font-mono ${
                        isDebtActive ? "text-rose-600" : "text-emerald-600"
                      }`}
                    >
                      {formatCurrency(stats.debt, currency)}
                    </span>
                  </div>

                  {isDebtActive ? (
                    <span className={`flex items-center ${isRtl ? "space-x-reverse" : ""} space-x-1 bg-amber-50 text-[9px] font-bold text-amber-700 uppercase tracking-wider py-0.5 px-1.5 rounded-md border border-amber-100`}>
                      <AlertTriangle className="w-3 h-3 text-amber-500" />
                      <span>{t.activeDebt}</span>
                    </span>
                  ) : (
                    <span className={`flex items-center ${isRtl ? "space-x-reverse" : ""} space-x-1 bg-emerald-50 text-[9px] font-bold text-emerald-700 uppercase tracking-wider py-0.5 px-1.5 rounded-md border border-emerald-100`}>
                      <CheckCircle className="w-3 h-3 text-emerald-500" />
                      <span>{t.withoutDebt}</span>
                    </span>
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
