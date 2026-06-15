/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from "react";
import { Client, Transaction } from "../types";
import { PlusCircle, UserPlus, CheckCircle2, UserCheck } from "lucide-react";
import { formatCurrency, normalizePhone, parseAmountInput } from "../utils";
import { motion } from "motion/react";
import { Language, translations } from "../translations";

interface NewTransactionProps {
  clients: Client[];
  onAddClient: (name: string, phone: string, notes?: string) => Client;
  onAddTransaction: (
    clientId: string,
    description: string,
    totalAmount: number,
    paidAmount: number
  ) => void;
  currency: string;
  onSuccess: () => void;
  lang: Language;
}

export default function NewTransactionForm({
  clients,
  onAddClient,
  onAddTransaction,
  currency,
  onSuccess,
  lang,
}: NewTransactionProps) {
  const t = translations[lang];
  const isRtl = lang === "ar";

  const [isNewClient, setIsNewClient] = useState<boolean>(false);

  // Client info
  const [selectedClientId, setSelectedClientId] = useState<string>("");
  const [newClientName, setNewClientName] = useState<string>("");
  const [newClientPhone, setNewClientPhone] = useState<string>("");

  // Transaction info
  const [description, setDescription] = useState<string>("");
  const [totalAmount, setTotalAmount] = useState<string>("");
  const [paidAmount, setPaidAmount] = useState<string>("");

  // Validation feedback
  const [errorMessage, setErrorMessage] = useState<string>("");

  // Derived balance calculation
  const parsedTotal = parseAmountInput(totalAmount);
  const parsedPaid = paidAmount.trim() ? parseAmountInput(paidAmount) : 0;
  const calculatedTotal = parsedTotal ?? 0;
  const calculatedPaid = parsedPaid ?? 0;
  const remainingBalance = Math.max(0, calculatedTotal - calculatedPaid);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage("");

    // Validation
    let targetClientId = selectedClientId;

    if (isNewClient) {
      if (!newClientName.trim()) {
        setErrorMessage(lang === "ar" ? "اسم الزبون الجديد مطلوب." : "Le nom du nouveau client est requis.");
        return;
      }
      if (!newClientPhone.trim()) {
        setErrorMessage(lang === "ar" ? "رقم الهاتف مطلوب لمتابعة الديون والتنبيهات." : "Le numéro de téléphone est requis pour le suivi des alertes.");
        return;
      }

      // Check duplicate
      const phoneExists = clients.some(c => normalizePhone(c.phone) === normalizePhone(newClientPhone));
      if (phoneExists) {
        setErrorMessage(t.duplicatePhoneError);
        return;
      }

      // Perform fast inline addition
      try {
        const addedClient = onAddClient(newClientName.trim(), newClientPhone.trim(), "");
        targetClientId = addedClient.id;
      } catch (err: any) {
        setErrorMessage(err.message || "Erreur de création du client.");
        return;
      }
    } else {
      if (!targetClientId) {
        setErrorMessage(lang === "ar" ? "يرجى تحديد زبون مسجل أو إضافة زبون جديد أولاً." : "Veuillez sélectionner un client existant ou en créer un nouveau.");
        return;
      }
    }

    if (parsedTotal === null || calculatedTotal <= 0) {
      setErrorMessage(lang === "ar" ? "يجب أن يكون مبلغ التوصيل أكبر من 0." : "Le montant total de la livraison doit être supérieur à 0.");
      return;
    }

    if (parsedPaid === null) {
      setErrorMessage(lang === "ar" ? "يرجى إدخال مبلغ تسبيق صحيح." : "Veuillez saisir un acompte valide, en chiffres entiers.");
      return;
    }

    if (calculatedPaid > calculatedTotal) {
      setErrorMessage(lang === "ar" ? "العربون المدفوع لا يمكن أن يتجاوز المبلغ الإجمالي." : "L'acompte payé ne peut pas dépasser le montant total de la livraison.");
      return;
    }

    const defaultDesc = description.trim() || (lang === "ar" ? "توصيل سلع وبضاعة" : "Livraison de marchandises");

    onAddTransaction(targetClientId, defaultDesc, calculatedTotal, calculatedPaid);

    // Clean form states
    setSelectedClientId("");
    setNewClientName("");
    setNewClientPhone("");
    setDescription("");
    setTotalAmount("");
    setPaidAmount("");
    setIsNewClient(false);

    // On Success feedback/navigation callback
    onSuccess();
  };

  return (
    <motion.div
      id="new-transaction-container"
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      transition={{ duration: 0.2 }}
      className="bg-white border border-slate-100 rounded-2xl p-5 shadow-sm space-y-4"
      dir={isRtl ? "rtl" : "ltr"}
    >
      <div className={`flex items-center ${isRtl ? "space-x-reverse" : "space-x-2"} border-b border-slate-100 pb-3 mb-1 text-start`}>
        <PlusCircle className="w-5 h-5 text-amber-500" />
        <h2 className="text-base font-bold text-slate-800">{t.billDelivery}</h2>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4 text-start">
        {/* Toggle Client Selector */}
        <div className="flex bg-slate-100 p-1.5 rounded-xl">
          <button
            type="button"
            id="toggle-exist-client-tab"
            onClick={() => setIsNewClient(false)}
            className={`flex-1 flex items-center justify-center ${isRtl ? "space-x-reverse" : "space-x-1"} py-1.5 rounded-lg text-xs font-semibold uppercase tracking-wider transition-all ${
              !isNewClient ? "bg-white text-slate-800 shadow-xs font-bold" : "text-slate-500 hover:text-slate-800"
            }`}
          >
            <UserCheck className="w-3.5 h-3.5 text-amber-500" />
            <span>{t.existingClient}</span>
          </button>
          <button
            type="button"
            id="toggle-new-client-tab"
            onClick={() => setIsNewClient(true)}
            className={`flex-1 flex items-center justify-center ${isRtl ? "space-x-reverse" : "space-x-1"} py-1.5 rounded-lg text-xs font-semibold uppercase tracking-wider transition-all ${
              isNewClient ? "bg-white text-slate-800 shadow-xs font-bold" : "text-slate-500 hover:text-slate-800"
            }`}
          >
            <UserPlus className="w-3.5 h-3.5 text-amber-500" />
            <span>{t.newClient}</span>
          </button>
        </div>

        {/* Client Inputs */}
        {!isNewClient ? (
          <div className="space-y-1">
            <label htmlFor="client-dropdown" className="block text-xs font-medium text-slate-600">
              {lang === "ar" ? "اختر الزبون" : "Sélectionner le client"}
            </label>
            <select
              id="client-dropdown"
              value={selectedClientId}
              onChange={(e) => setSelectedClientId(e.target.value)}
              className="w-full bg-slate-55 border border-slate-200 text-slate-850 rounded-xl py-2.5 px-3 text-sm focus:ring-1 focus:ring-amber-500 focus:border-amber-500 outline-none transition"
            >
              <option value="">{t.chooseClient}</option>
              {clients.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name} ({c.phone})
                </option>
              ))}
            </select>
            {clients.length === 0 && (
              <p className="text-[11px] text-amber-600 mt-1">
                {t.emptyClientList}
              </p>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 p-3.5 bg-slate-50 border border-slate-150 rounded-xl">
            <div className="space-y-1">
              <label htmlFor="new-client-name" className="block text-xs font-medium text-slate-600">
                {t.fullName} <span className="text-rose-500">*</span>
              </label>
              <input
                id="new-client-name"
                type="text"
                placeholder={lang === "ar" ? "مثال: سفيان باب الواد" : "Ex: Sofiane Bab El Oued"}
                value={newClientName}
                onChange={(e) => setNewClientName(e.target.value)}
                className="w-full bg-white border border-slate-200 text-slate-800 rounded-lg py-2 px-3 text-sm focus:ring-1 focus:ring-amber-500 focus:border-amber-400 outline-none transition"
              />
            </div>
            <div className="space-y-1">
              <label htmlFor="new-client-phone" className="block text-xs font-medium text-slate-600">
                {t.whatsappNumber} <span className="text-rose-500">*</span>
              </label>
              <input
                id="new-client-phone"
                type="tel"
                placeholder={lang === "ar" ? "مثال: 0551234567" : "Ex: 0551234567"}
                value={newClientPhone}
                onChange={(e) => setNewClientPhone(e.target.value)}
                className="w-full bg-white border border-slate-200 text-slate-800 rounded-lg py-2 px-3 text-sm focus:ring-1 focus:ring-amber-500 focus:border-amber-400 outline-none transition"
              />
            </div>
          </div>
        )}

        {/* Transaction Inputs */}
        <div className="space-y-3 pt-2">
          <div className="space-y-1">
            <label htmlFor="delivery-desc" className="block text-xs font-medium text-slate-600">
              {t.descOptional}
            </label>
            <input
              id="delivery-desc"
              type="text"
              placeholder={t.descPlaceholder}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 text-slate-800 rounded-xl py-2.5 px-3 text-sm focus:ring-1 focus:ring-amber-500 focus:border-amber-500 outline-none transition"
            />
          </div>

          <div className="grid grid-cols-2 gap-3.5">
            <div className="space-y-1">
              <label htmlFor="total-amount-input" className="block text-xs font-medium text-slate-600">
                {t.deliveryAmount} <span className="text-rose-500">*</span>
              </label>
              <div className="relative">
                <input
                  id="total-amount-input"
                  type="number"
                  step="any"
                  inputMode="decimal"
                  placeholder="Ex: 15000"
                  value={totalAmount}
                  onChange={(e) => setTotalAmount(e.target.value)}
                  className={`w-full bg-slate-55 border border-slate-250 text-slate-850 font-bold font-mono rounded-xl py-2.5 text-sm focus:ring-1 focus:ring-amber-500 focus:border-amber-500 outline-none transition ${isRtl ? "pl-12 pr-3" : "pr-12 pl-3"}`}
                />
                <span className={`absolute inset-y-0 ${isRtl ? "left-3" : "right-3"} flex items-center text-xs font-bold text-slate-400 font-mono`}>
                  {currency}
                </span>
              </div>
            </div>

            <div className="space-y-1">
              <label htmlFor="paid-amount-input" className="block text-xs font-medium text-slate-600">
                {t.depositPaid}
              </label>
              <div className="relative">
                <input
                  id="paid-amount-input"
                  type="number"
                  step="any"
                  inputMode="decimal"
                  placeholder="Ex: 5000"
                  value={paidAmount}
                  onChange={(e) => setPaidAmount(e.target.value)}
                  className={`w-full bg-slate-55 border border-slate-250 text-slate-850 font-bold font-mono rounded-xl py-2.5 text-sm focus:ring-1 focus:ring-amber-500 focus:border-amber-500 outline-none transition ${isRtl ? "pl-12 pr-3" : "pr-12 pl-3"}`}
                />
                <span className={`absolute inset-y-0 ${isRtl ? "left-3" : "right-3"} flex items-center text-xs font-bold text-slate-400 font-mono`}>
                  {currency}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Dynamic Balance Calculation Box */}
        {(calculatedTotal > 0 || calculatedPaid > 0) && (
          <div className="p-4 rounded-xl border flex items-center justify-between transition bg-slate-900 border-slate-800 text-white">
            <div className="text-start">
              <span className="block text-[10px] text-slate-400 uppercase font-medium">
                {t.balanceRemaining} (Equation)
              </span>
              <span className="text-xs text-slate-300 font-mono">
                {totalAmount || 0} - {paidAmount || 0}
              </span>
            </div>
            <div className="text-end">
              <span className="block text-[10px] text-slate-400 uppercase font-semibold">
                {t.balanceRemaining}
              </span>
              <span
                id="remaining-balance-output"
                className={`text-base font-extrabold font-mono ${
                  remainingBalance > 0 ? "text-rose-450" : "text-emerald-400"
                }`}
              >
                {formatCurrency(remainingBalance, currency)}
              </span>
            </div>
          </div>
        )}

        {/* Error Feedback Messages */}
        {errorMessage && (
          <p id="form-error-msg" className={`text-xs text-rose-600 font-semibold bg-rose-50 border border-rose-100 p-3 rounded-lg flex items-start ${isRtl ? "space-x-reverse" : ""} space-x-1`}>
            <span>⚠️</span>
            <span>{errorMessage}</span>
          </p>
        )}

        {/* Action Button */}
        <button
          type="submit"
          id="submit-delivery-btn"
          className={`w-full bg-slate-900 text-white font-bold text-sm py-3 px-4 rounded-xl flex items-center justify-center ${isRtl ? "space-x-reverse" : "space-x-2"} shadow-sm hover:bg-slate-800 cursor-pointer transition focus:outline-none focus:ring-2 focus:ring-amber-400`}
        >
          <CheckCircle2 className="w-5 h-5 text-amber-400" />
          <span>{t.createAndSave}</span>
        </button>
      </form>
    </motion.div>
  );
}
