/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from "react";
import { Client, Transaction, Repayment } from "../types";
import {
  calculateTransactionBalance,
  formatCurrency,
  formatDate,
  generateWhatsAppLink,
  getClientStats,
  parseAmountInput,
} from "../utils";
import {
  X,
  Phone,
  Calendar,
  DollarSign,
  MessageSquare,
  TrendingDown,
  ChevronRight,
  PlusSquare,
  MinusSquare,
  ShieldAlert,
  Save,
  Edit,
  Trash2,
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { Language, translations } from "../translations";

interface ClientDetailsModalProps {
  client: Client | null;
  onClose: () => void;
  transactions: Transaction[];
  repayments: Repayment[];
  currency: string;
  onAddRepayment: (clientId: string, amount: number, notes?: string) => void;
  onUpdateClient: (clientId: string, name: string, phone: string, notes?: string) => void;
  onDeleteClient: (clientId: string) => void;
  onDeleteTransaction: (transactionId: string) => void;
  onDeleteRepayment: (repaymentId: string) => void;
  lang: Language;
}

export default function ClientDetailsModal({
  client,
  onClose,
  transactions,
  repayments,
  currency,
  onAddRepayment,
  onUpdateClient,
  onDeleteClient,
  onDeleteTransaction,
  onDeleteRepayment,
  lang,
}: ClientDetailsModalProps) {
  if (!client) return null;

  const t = translations[lang];
  const isRtl = lang === "ar";

  // Edit client state
  const [isEditingClient, setIsEditingClient] = useState<boolean>(false);
  const [editName, setEditName] = useState<string>(client.name);
  const [editPhone, setEditPhone] = useState<string>(client.phone);
  const [editNotes, setEditNotes] = useState<string>(client.notes || "");
  const [editError, setEditError] = useState<string>("");

  const handleSaveClientEdit = (e: React.FormEvent) => {
    e.preventDefault();
    setEditError("");

    if (!editName.trim()) {
      setEditError(lang === "ar" ? "الاسم مطلوب." : "Le nom est obligatoire.");
      return;
    }
    if (!editPhone.trim()) {
      setEditError(lang === "ar" ? "رقم الهاتف مطلوب." : "Le numéro de téléphone est obligatoire.");
      return;
    }

    onUpdateClient(client.id, editName.trim(), editPhone.trim(), editNotes.trim() || undefined);
    setIsEditingClient(false);
  };

  // Repayment form state
  const [repayAmount, setRepayAmount] = useState<string>("");
  const [repayNotes, setRepayNotes] = useState<string>("");
  const [showRepayForm, setShowRepayForm] = useState<boolean>(false);
  const [success, setSuccess] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string>("");

  const stats = getClientStats(client, transactions, repayments);
  const clientTransactions = transactions.filter((t) => t.clientId === client.id);
  const clientRepayments = repayments.filter((r) => r.clientId === client.id);

  // Group all actions in historical chronological order
  const historyItems = [
    ...clientTransactions.map((t) => ({
      type: "sale" as const,
      id: t.id,
      date: t.date,
      title: t.description || (lang === "ar" ? "توصيل" : "Livraison"),
      primaryValue: t.totalAmount,
      secondaryValue: t.paidAmount,
      balance: calculateTransactionBalance(t),
    })),
    ...clientRepayments.map((r) => ({
      type: "payment" as const,
      id: r.id,
      date: r.date,
      title: r.notes || (lang === "ar" ? "رصيد مسترجع" : "Règlement reçu"),
      primaryValue: r.amount,
      secondaryValue: 0,
      balance: 0,
    })),
  ].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  const handleRepaySubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg("");
    setSuccess(false);

    const amount = parseAmountInput(repayAmount);
    if (amount === null || amount <= 0) {
      setErrorMsg(lang === "ar" ? "الرجاء إدخال مبلغ أكبر من 0." : "Veuillez saisir un montant supérieur à 0.");
      return;
    }

    if (amount > stats.debt) {
      setErrorMsg(
        lang === "ar" ? `المبلغ المُدخل أكبر من الديون الحالية (${formatCurrency(stats.debt, currency)})` :
          `Le montant saisi (${formatCurrency(
            amount,
            currency
          )}) est supérieur à la dette actuelle (${formatCurrency(stats.debt, currency)}).`
      );
      return;
    }

    onAddRepayment(client.id, amount, repayNotes.trim() || undefined);

    setSuccess(true);
    setRepayAmount("");
    setRepayNotes("");

    // Hide payment inputs after short duration
    setTimeout(() => {
      setShowRepayForm(false);
      setSuccess(false);
    }, 1200);
  };

  // Compose lovely polite reminder message for WhatsApp in Arabic or French depending on state
  const getWhatsAppMessage = () => {
    if (lang === "ar") {
      return `السلام عليكم ${client.name}، تذكير محترم بخصوص تسيير طلبيات التوصيل، المبلغ المتبقي (رصيد ديونكم) هو ${formatCurrency(stats.debt, currency)}. إذا كنتم تودون تسديد المبلغ أو جزء منه عبر الدفع كاش أو BaridiMob، يرجى التواصل معي. يومك طيب وسعيد !`;
    }
    return `Bonjour ${client.name}, pour rappel concernant notre suivi de livraison, le reste à payer (solde de vos dettes) s'élève à ${formatCurrency(stats.debt, currency)}. Si vous souhaitez faire un versement de régularisation, merci de me contacter. Excellente journée !`;
  };

  const whatsappUrl = generateWhatsAppLink(client.phone, getWhatsAppMessage(), currency);

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-slate-900/60 backdrop-blur-xs">
      {/* Background closer */}
      <div className="absolute inset-0" onClick={onClose} />

      <motion.div
        id={`client-detail-view-${client.id}`}
        initial={{ y: "100%", opacity: 0.5 }}
        animate={{ y: 0, opacity: 1 }}
        exit={{ y: "100%", opacity: 0 }}
        transition={{ type: "spring", damping: 25, stiffness: 350 }}
        className="relative bg-white w-full sm:max-w-md max-h-[92vh] sm:max-h-[85vh] rounded-t-3xl sm:rounded-2xl shadow-2xl flex flex-col overflow-hidden z-10"
        dir={isRtl ? "rtl" : "ltr"}
      >
        {/* Grab Handle for mobile swipe feel */}
        <div className="mx-auto w-12 h-1 bg-slate-200 rounded-full my-3 block sm:hidden" />

        {/* Modal Header */}
        {/* Modal Header */}
        <div className="px-5 pb-3 pt-2 sm:pt-4 border-b border-slate-100">
          {isEditingClient ? (
            <form onSubmit={handleSaveClientEdit} className="space-y-3">
              <div className="grid grid-cols-2 gap-2 text-start">
                <div>
                  <label className="block text-[9px] font-bold text-slate-400 uppercase">{lang === "ar" ? "الاسم" : "Nom"}</label>
                  <input
                    type="text"
                    value={editName}
                    onChange={(e) => setEditName(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg p-1.5 text-xs font-bold outline-none focus:ring-1 focus:ring-amber-500"
                  />
                </div>
                <div>
                  <label className="block text-[9px] font-bold text-slate-400 uppercase">{lang === "ar" ? "الهاتف" : "Téléphone"}</label>
                  <input
                    type="text"
                    value={editPhone}
                    onChange={(e) => setEditPhone(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg p-1.5 text-xs font-mono font-bold outline-none focus:ring-1 focus:ring-amber-500"
                  />
                </div>
              </div>
              <div className="text-start">
                <label className="block text-[9px] font-bold text-slate-400 uppercase">{t.notesOptional}</label>
                <input
                  type="text"
                  value={editNotes}
                  onChange={(e) => setEditNotes(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg p-1.5 text-xs outline-none focus:ring-1 focus:ring-amber-500"
                />
              </div>
              {editError && <p className="text-[10px] text-rose-500 font-bold">{editError}</p>}
              <div className="flex gap-2">
                <button
                  type="submit"
                  className="flex-1 bg-slate-900 text-white font-bold text-xs py-1.5 rounded-lg transition"
                >
                  {t.saveChanges}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setIsEditingClient(false);
                    setEditName(client.name);
                    setEditPhone(client.phone);
                    setEditNotes(client.notes || "");
                    setEditError("");
                  }}
                  className="flex-1 bg-slate-105 text-slate-700 font-bold text-xs py-1.5 rounded-lg transition"
                >
                  {t.cancel}
                </button>
              </div>
            </form>
          ) : (
            <div className={`flex items-start justify-between ${isRtl ? "text-right" : "text-left"}`}>
              <div className="text-start">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                  {t.clientFile}
                </span>
                <div className={`flex items-center ${isRtl ? "space-x-reverse" : ""} space-x-2`}>
                  <h3 className="text-lg font-bold text-slate-900 leading-tight">
                    {client.name}
                  </h3>
                  <button
                    onClick={() => setIsEditingClient(true)}
                    className="p-1 text-slate-400 hover:text-amber-505 rounded transition cursor-pointer"
                    title={t.editClient}
                  >
                    <Edit className="w-3.5 h-3.5" />
                  </button>
                </div>
                <div className={`flex items-center ${isRtl ? "space-x-reverse" : ""} space-x-1 mt-0.5`}>
                  <Phone className="w-3 h-3 text-slate-400" />
                  <span className="text-xs font-semibold text-slate-505 font-mono">
                    {client.phone}
                  </span>
                </div>
              </div>
              <button
                onClick={onClose}
                id="close-details-modal-btn"
                className="p-1 rounded-full text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          )}
        </div>

        {/* Modal Content Scrollable Area */}
        <div className="flex-1 overflow-y-auto p-5 space-y-5 text-start">
          {/* Main Debt Gauge */}
          <div className="bg-slate-900 text-white rounded-2xl p-4.5 text-center relative overflow-hidden">
            <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">
              {t.dueBalance}
            </span>
            <p
              id="detail-outstanding-debt-display"
              className={`text-2xl font-extrabold font-mono mt-1 ${stats.debt > 0 ? "text-rose-400 animate-pulse-slow font-black text-3xl" : "text-emerald-400"
                }`}
            >
              {formatCurrency(stats.debt, currency)}
            </p>

            <div className="grid grid-cols-2 gap-2 mt-4 pt-3.5 border-t border-slate-800 text-start">
              <div>
                <span className="block text-[9px] text-slate-400 uppercase">{t.totalDelivered}</span>
                <span className="text-xs font-bold font-mono text-slate-200">
                  {formatCurrency(stats.totalDelivered, currency)}
                </span>
              </div>
              <div>
                <span className="block text-[9px] text-slate-400 uppercase">{t.recovered}</span>
                <span className="text-xs font-bold font-mono text-slate-200">
                  {formatCurrency(stats.totalPaid, currency)}
                </span>
              </div>
            </div>
          </div>

          {/* Quick Action Reminders & Payments */}
          <div className={`grid grid-cols-2 gap-2.5 ${isRtl ? "space-x-reverse" : ""}`}>
            {stats.debt > 0 ? (
              <button
                id="record-repayment-drawer-btn"
                onClick={() => setShowRepayForm(!showRepayForm)}
                className="flex items-center justify-center space-x-1.5 bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white font-bold text-xs py-2.5 px-3 rounded-xl transition cursor-pointer"
              >
                <DollarSign className="w-4 h-4 text-emerald-300" />
                <span>{t.repayDebt}</span>
              </button>
            ) : (
              <div className="bg-emerald-50 text-emerald-850 text-[11px] font-semibold py-2.5 px-3 rounded-xl flex items-center justify-center space-x-1 justify-self-stretch border border-emerald-100">
                <span>{lang === "ar" ? "✅ الحساب خالص ومسدد !" : "✅ Client en règle !"}</span>
              </div>
            )}

            <a
              href={whatsappUrl}
              target="_blank"
              rel="noreferrer"
              id="send-whatsapp-reminder-btn"
              className="flex items-center justify-center space-x-1.5 bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs py-2.5 px-3 rounded-xl transition text-center"
            >
              <MessageSquare className="w-4 h-4 text-emerald-400" />
              <span>{t.whatsappReminder}</span>
            </a>
          </div>

          {/* Form to log single Repayment */}
          {showRepayForm && (
            <motion.div
              id="repayment-form-block"
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              className="bg-emerald-50/50 border border-emerald-100 p-4 rounded-xl space-y-3"
            >
              <h4 className={`text-xs font-bold uppercase text-emerald-800 flex items-center ${isRtl ? "space-x-reverse" : ""} space-x-1`}>
                <TrendingDown className="w-4 h-4 text-emerald-600" />
                <span>{t.recordRepayment}</span>
              </h4>

              <form onSubmit={handleRepaySubmit} className="space-y-3">
                <div className="grid grid-cols-1 gap-2.5">
                  <div className="relative">
                    <input
                      id="repayment-amount-input"
                      type="number"
                      step="any"
                      inputMode="decimal"
                      placeholder={lang === "ar" ? `مبلغ التسديد (الأقصى: ${stats.debt})` : `Montant du versement (Max: ${stats.debt})`}
                      value={repayAmount}
                      onChange={(e) => setRepayAmount(e.target.value)}
                      className={`w-full bg-white border border-emerald-200 rounded-lg py-2 text-xs font-bold font-mono text-slate-800 outline-none focus:ring-1 focus:ring-emerald-500 ${isRtl ? "pl-12 pr-3" : "pr-12 pl-3"}`}
                    />
                    <span className={`absolute inset-y-0 ${isRtl ? "left-3.5" : "right-3.5"} flex items-center text-xs font-bold text-slate-405 font-mono`}>
                      {currency}
                    </span>
                  </div>
                  <div>
                    <input
                      id="repayment-notes-input"
                      type="text"
                      placeholder={t.repaymentNotesPlaceholder}
                      value={repayNotes}
                      onChange={(e) => setRepayNotes(e.target.value)}
                      className="w-full bg-white border border-emerald-100 rounded-lg py-1.5 px-3 text-xs outline-none focus:ring-1 focus:ring-emerald-500"
                    />
                  </div>
                </div>

                {errorMsg && (
                  <p id="repay-error-msg" className="text-[11px] text-rose-600 font-semibold">{errorMsg}</p>
                )}

                {success && (
                  <p id="repay-success-msg" className="text-[11px] text-emerald-600 font-semibold bg-emerald-50 p-2 rounded">
                    {lang === "ar" ? "تم تسجيل الدفعة بنجاح ! 🎉" : "Versement enregistré avec succès ! 🎉"}
                  </p>
                )}

                <button
                  type="submit"
                  id="submit-repayment-btn"
                  className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs py-2 rounded-lg cursor-pointer transition"
                >
                  {t.confirmRepayment}
                </button>
              </form>
            </motion.div>
          )}

          {/* Chronological History Timeline */}
          <div className="space-y-3">
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 text-start">
              {t.historyTimeline}
            </h4>

            {historyItems.length === 0 ? (
              <p className="text-xs text-slate-400 italic text-center py-4 bg-slate-55 rounded-xl">
                {t.noTransactionsYet}
              </p>
            ) : (
              <div className={`relative ${isRtl ? "pr-4 border-r-2" : "pl-4 border-l-2"} border-slate-100 space-y-4`}>
                {historyItems.map((item) => (
                  <div key={item.id} className="relative group/item text-start">
                    {/* Timestamp Dot */}
                    <div
                      className={`absolute ${isRtl ? "-right-[21px]" : "-left-[21px]"} top-1 w-2.5 h-2.5 rounded-full border-2 border-white ${item.type === "sale" ? "bg-amber-500" : "bg-emerald-500"
                        }`}
                    />

                    {/* Timeline Event Content */}
                    <div className="space-y-1 text-start">
                      <div className="flex items-center justify-between text-[10px] text-slate-400">
                        <span className={`flex items-center ${isRtl ? "space-x-reverse" : ""} space-x-1 font-mono font-medium`}>
                          <Calendar className="w-3 h-3" />
                          <span>{formatDate(item.date)}</span>
                        </span>
                        <span>{item.type === "sale" ? t.delivered : t.repaymentReceived}</span>
                      </div>

                      <div className="flex items-start justify-between">
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-bold text-slate-800 leading-tight">
                            {item.title}
                          </p>
                          {item.type === "sale" && (
                            <p className="text-[10px] text-slate-505 font-mono">
                              {lang === "ar" ? "تم توصيل:" : "Livré:"} {formatCurrency(item.primaryValue, currency)} | {lang === "ar" ? "التسبيق:" : "Acompte:"}{" "}
                              {formatCurrency(item.secondaryValue, currency)}
                            </p>
                          )}
                        </div>

                        <div className="flex items-center space-x-2 space-x-reverse">
                          <div className="text-end">
                            <span
                              className={`text-xs font-bold font-mono ${item.type === "sale" ? "text-slate-800" : "text-emerald-600"
                                }`}
                            >
                              {item.type === "sale" ? "+" : "-"}
                              {formatCurrency(item.primaryValue, currency)}
                            </span>

                            {item.type === "sale" && item.balance > 0 && (
                              <span className="block text-[9px] font-mono text-rose-500 font-semibold">
                                {lang === "ar" ? "دين:" : "Dette:"} {formatCurrency(item.balance, currency)}
                              </span>
                            )}
                          </div>

                          <button
                            onClick={() => {
                              const confirmMsg = item.type === "sale" ? t.confirmDeleteTransaction : t.confirmDeleteRepayment;
                              if (window.confirm(confirmMsg)) {
                                if (item.type === "sale") {
                                  onDeleteTransaction(item.id);
                                } else {
                                  onDeleteRepayment(item.id);
                                }
                              }
                            }}
                            className="p-1 rounded text-slate-305 hover:text-rose-600 hover:bg-slate-50 transition cursor-pointer"
                            title={lang === "ar" ? "حذف" : "Supprimer"}
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Danger Zone: delete client */}
          <div className="bg-rose-50 border border-rose-100 rounded-2xl p-4.5 space-y-2.5 mt-4 text-start">
            <h5 className="text-xs font-bold text-rose-800 uppercase flex items-center gap-1.5">
              <ShieldAlert className="w-4 h-4 text-rose-600" />
              <span>{t.dangerZone}</span>
            </h5>
            <p className="text-[10px] text-rose-700 leading-snug">
              {t.confirmDeleteClient}
            </p>
            <button
              onClick={() => {
                if (window.confirm(t.confirmDeleteClient)) {
                  onDeleteClient(client.id);
                  onClose();
                }
              }}
              className="w-full bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs py-2 rounded-xl transition cursor-pointer text-center"
            >
              {t.deleteClient}
            </button>
          </div>

        </div>
      </motion.div>
    </div>
  );
}

