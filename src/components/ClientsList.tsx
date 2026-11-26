/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from "react";
import { Client, Transaction, Repayment } from "../types";
import { formatCurrency, formatDate, getClientStats, assessClientRisk, getTransactionsWithBalancesForClient } from "../utils";
import { Search, Smartphone, UserPlus, X, AlertTriangle } from "lucide-react";
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
type SortType = "debt" | "risk" | "recent" | "due";

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
  const [sortBy, setSortBy] = useState<SortType>("debt");

  const getClientNextDue = (client: Client) => {
    const clientTransactions = transactions.filter((tx) => tx.clientId === client.id);
    const clientRepayments = repayments.filter((rp) => rp.clientId === client.id);
    const pendingTransactions = getTransactionsWithBalancesForClient(clientTransactions, clientRepayments)
      .filter((tx) => tx.allocatedRemainingBalance > 0 && tx.dueDate);

    if (pendingTransactions.length === 0) return null;

    const nextDueTransaction = [...pendingTransactions].sort(
      (a, b) => new Date(a.dueDate!).getTime() - new Date(b.dueDate!).getTime()
    )[0];

    const dueDate = new Date(nextDueTransaction.dueDate!);
    const today = new Date();
    const utcDueDate = Date.UTC(dueDate.getFullYear(), dueDate.getMonth(), dueDate.getDate());
    const utcToday = Date.UTC(today.getFullYear(), today.getMonth(), today.getDate());
    const daysUntilDue = Math.floor((utcDueDate - utcToday) / (1000 * 60 * 60 * 24));

    return {
      formatted: formatDate(nextDueTransaction.dueDate!),
      daysUntilDue,
      isToday: daysUntilDue === 0,
      isOverdue: daysUntilDue < 0,
    };
  };

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
  const atRiskClients = clients.filter((client) => {
    const risk = assessClientRisk(client, transactions, repayments);
    return risk.isAtRisk;
  });

  const filteredClients = clients
    .filter((client) => {
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
    })
    .sort((a, b) => {
      const aStats = getClientStats(a, transactions, repayments);
      const bStats = getClientStats(b, transactions, repayments);

      if (sortBy === "risk") {
        const aRisk = assessClientRisk(a, transactions, repayments);
        const bRisk = assessClientRisk(b, transactions, repayments);

        if (aRisk.isAtRisk !== bRisk.isAtRisk) {
          return aRisk.isAtRisk ? -1 : 1;
        }

        const ageDiff = bRisk.debtAgeDays - aRisk.debtAgeDays;
        if (ageDiff !== 0) return ageDiff;

        const debtDiff = bStats.debt - aStats.debt;
        if (debtDiff !== 0) return debtDiff;

        return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
      }

      if (sortBy === "due") {
        const aDue = getClientNextDue(a);
        const bDue = getClientNextDue(b);

        if (aDue && bDue) {
          const dueDiff = aDue.daysUntilDue - bDue.daysUntilDue;
          if (dueDiff !== 0) return dueDiff;
          return bStats.debt - aStats.debt;
        }

        if (aDue) return -1;
        if (bDue) return 1;

        return bStats.debt - aStats.debt || new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
      }

      if (sortBy === "recent") {
        return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
      }

      const debtDiff = bStats.debt - aStats.debt;
      if (debtDiff !== 0) return debtDiff;

      return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
    });

  return (
    <motion.div
      id="clients-list-container"
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -8 }}
      transition={{ duration: 0.15 }}
      className="space-y-4"
      dir={isRtl ? "rtl" : "ltr"}
    >
      {/* Search Header and Action Toggle */}
      <div className={`flex items-center justify-between ${isRtl ? "flex-row-reverse" : ""}`}>
        <h2 className="text-base font-bold text-slate-800 text-left">
          {t.clientDirectory}
        </h2>
        <button
          onClick={() => setShowAddForm(!showAddForm)}
          id="toggle-add-client-drawer-btn"
          className={`bg-teal-600 hover:bg-teal-700 text-white font-semibold text-xs py-1.5 px-3 rounded-lg flex items-center ${isRtl ? "space-x-reverse" : ""} space-x-1.5 transition cursor-pointer`}
        >
          {showAddForm ? <X className="w-4 h-4" /> : <UserPlus className="w-4 h-4" />}
          <span>{showAddForm ? t.close : t.createClient}</span>
        </button>
      </div>

      {/* Inline quick add form */}
      {showAddForm && (
        <motion.div
          id="inline-add-client-form"
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: "auto" }}
          className="bg-white border border-slate-200 rounded-xl p-4 space-y-3 overflow-hidden text-left"
        >
          <h3 className="text-xs font-bold text-slate-600">
            {t.newClient}
          </h3>
          <form onSubmit={handleAddClientSubmit} className="space-y-3.5">
            <div className="grid grid-cols-2 gap-2.5">
              <div className="space-y-1">
                <label htmlFor="client-list-add-name" className="block text-[10px] text-slate-500 font-medium">
                  {lang === "ar" ? "الاسم" : "Nom"} <span className="text-rose-500">*</span>
                </label>
                <input
                  id="client-list-add-name"
                  type="text"
                  placeholder="Ex: Sofiane"
                  value={nameInput}
                  onChange={(e) => setNameInput(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 text-slate-800 rounded-lg py-1.5 px-2.5 text-xs outline-none focus:ring-1 focus:ring-teal-500 focus:border-teal-500"
                />
              </div>
              <div className="space-y-1">
                <label htmlFor="client-list-add-phone" className="block text-[10px] text-slate-500 font-medium">
                  {lang === "ar" ? "الهاتف" : "Téléphone"} <span className="text-rose-500">*</span>
                </label>
                <input
                  id="client-list-add-phone"
                  type="tel"
                  placeholder="Ex: 0551..."
                  value={phoneInput}
                  onChange={(e) => setPhoneInput(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 text-slate-800 rounded-lg py-1.5 px-2.5 text-xs outline-none focus:ring-1 focus:ring-teal-500 focus:border-teal-500"
                />
              </div>
            </div>
            <div className="space-y-1">
              <label htmlFor="client-list-add-notes" className="block text-[10px] text-slate-500 font-medium">
                {t.notesOptional}
              </label>
              <input
                id="client-list-add-notes"
                type="text"
                placeholder={t.notesPlaceholder}
                value={notesInput}
                onChange={(e) => setNotesInput(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 text-slate-800 rounded-lg py-1.5 px-2.5 text-xs outline-none focus:ring-1 focus:ring-teal-500 focus:border-teal-500"
              />
            </div>

            {errMsg && <p id="list-inline-error" className="text-[11px] text-rose-600 font-medium bg-rose-50 p-2 rounded-lg">{errMsg}</p>}
            {successMsg && <p id="list-inline-success" className="text-[11px] text-teal-700 font-medium bg-teal-50 p-2 rounded-lg">{successMsg}</p>}

            <button
              type="submit"
              id="list-inline-submit-btn"
              className="w-full bg-slate-900 hover:bg-slate-800 text-white font-semibold text-xs py-2 rounded-lg cursor-pointer transition"
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
          className={`w-full bg-white border border-slate-200 text-slate-800 rounded-xl py-2.5 ${isRtl ? "pr-10 pl-4" : "pl-10 pr-4"} text-sm outline-none focus:ring-1 focus:ring-teal-500 focus:border-teal-500 transition text-left`}
        />
      </div>

      {atRiskClients.length > 0 && (
        <div className="bg-rose-50 border border-rose-200 rounded-xl p-3 space-y-2">
          <div className={`flex items-center ${isRtl ? "space-x-reverse" : "space-x-2"}`}>
            <AlertTriangle className="w-4 h-4 text-rose-600" />
            <p className="text-[11px] font-semibold text-rose-700">
              {lang === "ar" ? `يوجد ${atRiskClients.length} زبون يحتاج متابعة` : `${atRiskClients.length} client(s) à surveiller`}
            </p>
          </div>
          <div className="flex flex-wrap gap-1.5">
            {atRiskClients.slice(0, 3).map((client) => (
              <button
                key={client.id}
                onClick={() => onSelectClient(client)}
                className="text-[10px] bg-white text-rose-700 border border-rose-200 rounded-full px-2.5 py-1 font-semibold"
              >
                {client.name}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Interactive Filter Pills */}
      <div className={`space-y-3`}> 
        <div className={`flex ${isRtl ? "flex-row-reverse" : ""} items-center justify-between gap-2`}> 
          <div className={`flex ${isRtl ? "space-x-reverse" : "space-x-1.5"} bg-slate-100 p-1 rounded-lg`}> 
            <button
              onClick={() => setFilter("all")}
              id="filter-client-all-btn"
              className={`flex-1 text-[11px] font-semibold py-1.5 px-2 rounded-md transition ${
                filter === "all" ? "bg-white text-slate-800" : "text-slate-500 hover:text-slate-700"
              }`}
            >
              {t.filterAll} ({clients.length})
            </button>
            <button
              onClick={() => setFilter("indebted")}
              id="filter-client-indebted-btn"
              className={`flex-1 text-[11px] font-semibold py-1.5 px-2 rounded-md transition ${
                filter === "indebted" ? "bg-white text-rose-600" : "text-slate-500 hover:text-slate-700"
              }`}
            >
              {t.filterIndebted}
            </button>
            <button
              onClick={() => setFilter("settled")}
              id="filter-client-settled-btn"
              className={`flex-1 text-[11px] font-semibold py-1.5 px-2 rounded-md transition ${
                filter === "settled" ? "bg-white text-teal-700" : "text-slate-500 hover:text-slate-700"
              }`}
            >
              {t.filterSettled}
            </button>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-[10px] text-slate-500 font-semibold">
              {t.sortBy}:
            </span>
            <button
              type="button"
              onClick={() => setSortBy("debt")}
              className={`text-[10px] font-semibold py-1.5 px-2 rounded-md transition ${
                sortBy === "debt" ? "bg-white text-slate-900" : "bg-slate-100 text-slate-500 hover:text-slate-700"
              }`}
            >
              {t.sortByDebt}
            </button>
            <button
              type="button"
              onClick={() => setSortBy("risk")}
              className={`text-[10px] font-semibold py-1.5 px-2 rounded-md transition ${
                sortBy === "risk" ? "bg-white text-slate-900" : "bg-slate-100 text-slate-500 hover:text-slate-700"
              }`}
            >
              {t.sortByRisk}
            </button>
            <button
              type="button"
              onClick={() => setSortBy("recent")}
              className={`text-[10px] font-semibold py-1.5 px-2 rounded-md transition ${
                sortBy === "recent" ? "bg-white text-slate-900" : "bg-slate-100 text-slate-500 hover:text-slate-700"
              }`}
            >
              {t.sortByRecent}
            </button>
            <button
              type="button"
              onClick={() => setSortBy("due")}
              className={`text-[10px] font-semibold py-1.5 px-2 rounded-md transition ${
                sortBy === "due" ? "bg-white text-slate-900" : "bg-slate-100 text-slate-500 hover:text-slate-700"
              }`}
            >
              {t.sortByDue}
            </button>
          </div>
        </div>
      </div>

      {/* Clients list cards */}
      <div className="space-y-2">
        {filteredClients.length === 0 ? (
          <div className="bg-white border border-slate-200 rounded-xl p-7 text-center">
            <p className="text-sm text-slate-500 font-medium">{t.noClientFound}</p>
            <p className="text-xs text-slate-400 mt-1">
              {t.tryChangeFilter}
            </p>
          </div>
        ) : (
          filteredClients.map((client) => {
            const stats = getClientStats(client, transactions, repayments);
            const risk = assessClientRisk(client, transactions, repayments);
            const isDebtActive = stats.debt > 0;

            return (
              <div
                key={client.id}
                onClick={() => onSelectClient(client)}
                id={`client-card-${client.id}`}
                className={`bg-white border border-slate-200 hover:border-teal-300 transition rounded-xl p-4 flex items-center justify-between cursor-pointer ${isRtl ? "flex-row-reverse" : ""}`}
              >
                <div className="space-y-1 text-left">
                  <h3 className="font-bold text-sm text-slate-800 leading-snug">
                    {client.name}
                  </h3>
                  <div className={`flex items-center ${isRtl ? "space-x-reverse" : ""} space-x-1.5 text-xs text-slate-500`}>
                    <Smartphone className="w-3.5 h-3.5 text-slate-400" />
                    <span>{client.phone}</span>
                  </div>
                  {client.notes && (
                    <span className="inline-block text-[10px] bg-slate-50 text-slate-500 px-2 py-0.5 rounded mt-1 max-w-[180px] truncate">
                      {client.notes}
                    </span>
                  )}
                </div>

                <div className="text-right flex flex-col items-end space-y-1">
                  {risk.isAtRisk && (
                    <span className="inline-flex items-center rounded-full bg-rose-100 px-2 py-0.5 text-[9px] font-semibold text-rose-700">
                      {lang === "ar" ? "مخاطرة" : "À risque"}
                    </span>
                  )}
                  <span className="block text-[9px] font-semibold text-slate-400">
                    {lang === "ar" ? "الرصيد المتبقي" : "Solde Restant"}
                  </span>
                  <span
                    className={`text-sm font-bold ${
                      isDebtActive ? "text-rose-600" : "text-teal-600"
                    }`}
                  >
                    {formatCurrency(stats.debt, currency)}
                  </span>
                  {isDebtActive && risk.debtAgeDays > 0 && (
                    <span className="text-[9px] font-semibold text-amber-600">
                      {lang === "ar"
                        ? `منذ ${risk.debtAgeDays} يوم`
                        : `Depuis ${risk.debtAgeDays} j`}
                    </span>
                  )}
                  {isDebtActive && (() => {
                    const nextDue = getClientNextDue(client);
                    if (!nextDue) {
                      return (
                        <span className="text-[9px] font-semibold text-slate-400">
                          {t.noDueDate}
                        </span>
                      );
                    }

                    if (nextDue.isToday) {
                      return (
                        <span className="text-[9px] font-semibold text-rose-600">
                          {t.dueToday}
                        </span>
                      );
                    }

                    if (nextDue.isOverdue) {
                      return (
                        <span className="text-[9px] font-semibold text-rose-600">
                          {t.overdueByDays.replace("{days}", String(Math.abs(nextDue.daysUntilDue)))}
                        </span>
                      );
                    }

                    return (
                      <span className="text-[9px] font-semibold text-amber-600">
                        {t.dueInDays.replace("{days}", String(nextDue.daysUntilDue))}
                      </span>
                    );
                  })()}
                  <span className={`text-[9px] font-semibold ${isDebtActive ? "text-amber-600" : "text-teal-600"}`}>
                    {isDebtActive
                      ? lang === "ar"
                        ? "في انتظار التسديد"
                        : "À régler"
                      : lang === "ar"
                        ? "تم التسديد"
                        : "Règlementé"}
                  </span>
                  {!isDebtActive && (
                    <span className="text-[9px] font-semibold text-teal-600">{t.withoutDebt}</span>
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
