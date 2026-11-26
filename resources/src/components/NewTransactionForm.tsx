/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from "react";
import { Client } from "../types";
import { PlusCircle, UserPlus, CheckCircle2, UserCheck } from "lucide-react";
import { formatCurrency } from "../utils";
import { motion } from "motion/react";
import { Language, translations } from "../translations";

interface NewTransactionProps {
  clients: Client[];
  onAddClient: (name: string, phone: string, notes?: string) => Client;
  onAddTransaction: (
    clientId: string,
    description: string,
    totalAmount: number,
    paidAmount: number,
    dueDate?: string
  ) => void;
  currency: string;
  onSuccess: () => void;
  lang: Language;
  defaultDueOffsetDays: number;
}

export default function NewTransactionForm({
  clients,
  onAddClient,
  onAddTransaction,
  currency,
  onSuccess,
  lang,
  defaultDueOffsetDays,
}: NewTransactionProps) {
  const t = translations[lang];
  const isRtl = lang === "ar";

  const [isNewClient, setIsNewClient] = useState<boolean>(false);
  const [selectedClientId, setSelectedClientId] = useState<string>("");
  const [newClientName, setNewClientName] = useState<string>("");
  const [newClientPhone, setNewClientPhone] = useState<string>("");
  const [description, setDescription] = useState<string>("");
  const [totalAmount, setTotalAmount] = useState<string>("");
  const [paidAmount, setPaidAmount] = useState<string>("");
  const [dueDate, setDueDate] = useState<string>(() => {
    if (defaultDueOffsetDays > 0) {
      const d = new Date();
      d.setDate(d.getDate() + defaultDueOffsetDays);
      return d.toISOString().split("T")[0];
    }
    return "";
  });
  const [errorMessage, setErrorMessage] = useState<string>("");

  const calculatedTotal = parseFloat(totalAmount) || 0;
  const calculatedPaid = parseFloat(paidAmount) || 0;
  const remainingBalance = Math.max(0, calculatedTotal - calculatedPaid);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage("");

    let targetClientId = selectedClientId;

    if (isNewClient) {
      if (!newClientName.trim()) {
        setErrorMessage(lang === "ar" ? "اسم الزبون الجديد مطلوب." : "Le nom du nouveau client est requis.");
        return;
      }
      if (!newClientPhone.trim()) {
        setErrorMessage(lang === "ar" ? "رقم الهاتف مطلوب." : "Le numéro de téléphone est requis.");
        return;
      }
      const phoneExists = clients.some(c => c.phone.trim() === newClientPhone.trim());
      if (phoneExists) {
        setErrorMessage(t.duplicatePhoneError);
        return;
      }
      try {
        const addedClient = onAddClient(newClientName.trim(), newClientPhone.trim(), "");
        targetClientId = addedClient.id;
      } catch (err: any) {
        setErrorMessage(err.message || "Erreur de création du client.");
        return;
      }
    } else {
      if (!targetClientId) {
        setErrorMessage(lang === "ar" ? "يرجى تحديد زبون مسجل." : "Veuillez sélectionner un client existant.");
        return;
      }
    }

    if (calculatedTotal <= 0) {
      setErrorMessage(lang === "ar" ? "يجب أن يكون مبلغ التوصيل أكبر من 0." : "Le montant total doit être supérieur à 0.");
      return;
    }
    if (calculatedPaid > calculatedTotal) {
      setErrorMessage(lang === "ar" ? "العربون لا يمكن أن يتجاوز المبلغ الإجمالي." : "L'acompte ne peut pas dépasser le total.");
      return;
    }

    const defaultDesc = description.trim() || (lang === "ar" ? "توصيل سلع" : "Livraison de marchandises");

    onAddTransaction(
      targetClientId,
      defaultDesc,
      calculatedTotal,
      calculatedPaid,
      dueDate ? new Date(dueDate).toISOString() : undefined
    );

    // Reset form
    setSelectedClientId("");
    setNewClientName("");
    setNewClientPhone("");
    setDescription("");
    setTotalAmount("");
    setPaidAmount("");
    setDueDate(() => {
      if (defaultDueOffsetDays > 0) {
        const d = new Date();
        d.setDate(d.getDate() + defaultDueOffsetDays);
        return d.toISOString().split("T")[0];
      }
      return "";
    });
    setIsNewClient(false);
    onSuccess();
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      transition={{ duration: 0.3 }}
      className="bg-white border border-slate-100 rounded-3xl p-5 shadow-sm space-y-4"
      dir={isRtl ? "rtl" : "ltr"}
    >
      <div className="flex items-center space-x-2 border-b border-slate-100 pb-3">
        <PlusCircle className="w-5 h-5 text-indigo-500" />
        <h2 className="text-base font-bold text-slate-800">{t.billDelivery}</h2>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4 text-left">
        <div className="flex bg-slate-100 p-1 rounded-xl">
          <button
            type="button"
            onClick={() => setIsNewClient(false)}
            className={`flex-1 flex items-center justify-center space-x-1 py-1.5 rounded-lg text-xs font-semibold uppercase tracking-wider transition ${
              !isNewClient ? "bg-white text-indigo-700 shadow-sm" : "text-slate-500 hover:text-slate-800"
            }`}
          >
            <UserCheck className="w-3.5 h-3.5 text-indigo-400" />
            <span>{t.existingClient}</span>
          </button>
          <button
            type="button"
            onClick={() => setIsNewClient(true)}
            className={`flex-1 flex items-center justify-center space-x-1 py-1.5 rounded-lg text-xs font-semibold uppercase tracking-wider transition ${
              isNewClient ? "bg-white text-indigo-700 shadow-sm" : "text-slate-500 hover:text-slate-800"
            }`}
          >
            <UserPlus className="w-3.5 h-3.5 text-indigo-400" />
            <span>{t.newClient}</span>
          </button>
        </div>

        {!isNewClient ? (
          <div>
            <label htmlFor="client-dropdown" className="block text-xs font-medium text-slate-600">{t.chooseClient}</label>
            <select
              id="client-dropdown"
              value={selectedClientId}
              onChange={(e: { target: { value: any; }; }) => setSelectedClientId(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2.5 px-3 text-sm focus:ring-2 focus:ring-indigo-300 outline-none transition"
            >
              
              {clients.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name} ({c.phone})
                </option>
              ))}
            </select>
            {clients.length === 0 && <p className="text-[11px] text-amber-600 mt-1">{t.emptyClientList}</p>}
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 p-3.5 bg-slate-50 rounded-xl border border-slate-200">
            <div>
              <label htmlFor="new-client-name" className="block text-xs font-medium text-slate-600">{t.fullName} <span className="text-rose-400">*</span></label>
              <input id="new-client-name" type="text" placeholder="Ex: Sofiane" value={newClientName} onChange={(e) => setNewClientName(e.target.value)} className="w-full bg-white border border-slate-200 rounded-xl py-2 px-3 text-sm focus:ring-2 focus:ring-indigo-300 outline-none" />
            </div>
            <div>
              <label htmlFor="new-client-phone" className="block text-xs font-medium text-slate-600">{t.whatsappNumber} <span className="text-rose-400">*</span></label>
              <input id="new-client-phone" type="tel" placeholder="Ex: 0551234567" value={newClientPhone} onChange={(e) => setNewClientPhone(e.target.value)} className="w-full bg-white border border-slate-200 rounded-xl py-2 px-3 text-sm focus:ring-2 focus:ring-indigo-300 outline-none" />
            </div>
          </div>
        )}

        <div className="space-y-3 pt-2">
          <div>
            <label htmlFor="delivery-desc" className="block text-xs font-medium text-slate-600">{t.descOptional}</label>
            <input id="delivery-desc" type="text"  value={description} onChange={(e) => setDescription(e.target.value)} className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2.5 px-3 text-sm focus:ring-2 focus:ring-indigo-300 outline-none" />
          </div>

          <div>
            <label htmlFor="due-date-input" className="block text-xs font-medium text-slate-600">{t.optionalDueDate}</label>
            <input id="due-date-input" type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2 px-3 text-sm focus:ring-2 focus:ring-indigo-300 outline-none" />
            <div className="flex flex-wrap gap-1.5 mt-1">
              {[3, 7, 14, 30].map((days) => (
                <button key={days} type="button" onClick={() => { const d = new Date(); d.setDate(d.getDate() + days); setDueDate(d.toISOString().split("T")[0]); }} className="bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-[10px] py-1 px-2.5 rounded-lg border border-slate-200 transition">
                  {isRtl ? `+${days} ${t.daysCount}` : `+${days} j`}
                </button>
              ))}
              <button type="button" onClick={() => setDueDate("")} className="bg-rose-50 hover:bg-rose-100 text-rose-600 font-semibold text-[10px] py-1 px-2.5 rounded-lg border border-rose-200 transition">{t.noDueDate}</button>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3.5">
            <div>
              <label htmlFor="total-amount-input" className="block text-xs font-medium text-slate-600">{t.deliveryAmount} <span className="text-rose-400">*</span></label>
              <div className="relative">
                <input id="total-amount-input" type="number" inputMode="numeric" placeholder="Ex: 15000" value={totalAmount} onChange={(e) => setTotalAmount(e.target.value)} className={`w-full bg-slate-50 border border-slate-200 rounded-xl py-2.5 text-sm font-mono focus:ring-2 focus:ring-indigo-300 outline-none ${isRtl ? "pl-12 pr-3" : "pr-12 pl-3"}`} />
                <span className={`absolute inset-y-0 ${isRtl ? "left-3" : "right-3"} flex items-center text-xs font-bold text-slate-400`}>{currency}</span>
              </div>
            </div>
            <div>
              <label htmlFor="paid-amount-input" className="block text-xs font-medium text-slate-600">{t.depositPaid}</label>
              <div className="relative">
                <input id="paid-amount-input" type="number" inputMode="numeric" placeholder="Ex: 5000" value={paidAmount} onChange={(e) => setPaidAmount(e.target.value)} className={`w-full bg-slate-50 border border-slate-200 rounded-xl py-2.5 text-sm font-mono focus:ring-2 focus:ring-indigo-300 outline-none ${isRtl ? "pl-12 pr-3" : "pr-12 pl-3"}`} />
                <span className={`absolute inset-y-0 ${isRtl ? "left-3" : "right-3"} flex items-center text-xs font-bold text-slate-400`}>{currency}</span>
              </div>
            </div>
          </div>
        </div>

        {(calculatedTotal > 0 || calculatedPaid > 0) && (
          <div className="p-4 rounded-2xl border flex items-center justify-between bg-indigo-50/50 border-indigo-200">
            <div>
              <span className="block text-[10px] text-slate-500 uppercase font-medium">{t.balanceRemaining}</span>
              <span className="text-xs text-slate-600 font-mono">{totalAmount || 0} - {paidAmount || 0}</span>
            </div>
            <div className="text-right">
              <span className="block text-[10px] text-slate-500 uppercase font-medium">{t.balanceRemaining}</span>
              <span id="remaining-balance-output" className={`text-base font-extrabold font-mono ${remainingBalance > 0 ? "text-rose-500" : "text-emerald-500"}`}>
                {formatCurrency(remainingBalance, currency)}
              </span>
            </div>
          </div>
        )}

        {errorMessage && (
          <p className="text-xs text-rose-500 font-semibold bg-rose-50 border border-rose-200 p-3 rounded-xl">{errorMessage}</p>
        )}

        <button type="submit" id="submit-delivery-btn" className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-sm py-3 px-4 rounded-2xl flex items-center justify-center space-x-2 shadow-sm transition">
          <CheckCircle2 className="w-5 h-5 text-indigo-200" />
          <span>{t.createAndSave}</span>
        </button>
      </form>
    </motion.div>
  );
}