/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from "react";
import { Client, Transaction, Repayment } from "../types";
import { formatCurrency, formatDate, getClientStats, generateWhatsAppLink, getTransactionsWithBalancesForClient } from "../utils";
import {
  X,
  Phone,
  Calendar,
  DollarSign,
  MessageSquare,
  TrendingDown,
  ShoppingBag,
  Copy,
} from "lucide-react";
import { motion } from "motion/react";
import { Language, translations } from "../translations";
import type { DuplicateSaleData } from "./NewTransactionForm";

interface ClientDetailsModalProps {
  client: Client | null;
  onClose: () => void;
  transactions: Transaction[];
  repayments: Repayment[];
  currency: string;
  onAddRepayment: (clientId: string, amount: number, notes?: string) => void;
  onDeleteClientData?: (clientId: string) => void;
  onDuplicateSale?: (data: DuplicateSaleData) => void;
  lang: Language;
}

export default function ClientDetailsModal({
  client,
  onClose,
  transactions,
  repayments,
  currency,
  onAddRepayment,
  onDuplicateSale,
  lang,
}: ClientDetailsModalProps) {
  if (!client) return null;

  const t = translations[lang];
  const isRtl = lang === "ar";

  // Repayment form state
  const [repayAmount, setRepayAmount] = useState<string>("");
  const [repayNotes, setRepayNotes] = useState<string>("");
  const [showRepayForm, setShowRepayForm] = useState<boolean>(false);
  const [success, setSuccess] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string>("");
  const [copiedMessage, setCopiedMessage] = useState<string>("");

  const stats = getClientStats(client, transactions, repayments);
  const clientTransactions = transactions.filter((t) => t.clientId === client.id);
  const clientRepayments = repayments.filter((r) => r.clientId === client.id);
  const recentPurchases = [...clientTransactions]
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
    .slice(0, 4);
  const averagePurchase = recentPurchases.length
    ? recentPurchases.reduce((sum, tx) => sum + tx.totalAmount, 0) / recentPurchases.length
    : 0;

  // Compute FIFO allocated balances for each transaction
  const transactionsWithBalances = getTransactionsWithBalancesForClient(clientTransactions, clientRepayments);

  // Group all actions in historical chronological order
  const historyItems = [
    ...transactionsWithBalances.map((t) => ({
      type: "sale" as const,
      id: t.id,
      date: t.date,
      dueDate: t.dueDate,
      title: t.description || (lang === "ar" ? "توصيل" : "Livraison"),
      primaryValue: t.totalAmount,
      secondaryValue: t.paidAmount,
      balance: t.allocatedRemainingBalance,
    })),
    ...clientRepayments.map((r) => ({
      type: "payment" as const,
      id: r.id,
      date: r.date,
      dueDate: undefined,
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

    const amount = parseFloat(repayAmount);
    if (isNaN(amount) || amount <= 0) {
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

  const whatsappUrl = generateWhatsAppLink(client.phone, getWhatsAppMessage());

  const handleDuplicateLastSale = () => {
    const lastSale = [...clientTransactions].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())[0];
    if (!lastSale || !onDuplicateSale) return;

    onDuplicateSale({
      clientId: client.id,
      clientName: client.name,
      clientPhone: client.phone,
      description: lastSale.description,
      totalAmount: lastSale.totalAmount,
      paidAmount: lastSale.paidAmount,
      dueDate: lastSale.dueDate,
    });
    onClose();

    const message = lang === "ar"
      ? `تم فتح نموذج جديد مع بيانات آخر بيع هذا الزبون.`
      : `Le formulaire a été ouvert avec les données de la dernière vente.`;

    setCopiedMessage(message);
    setTimeout(() => setCopiedMessage(""), 1400);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-slate-900/50 backdrop-blur-xs">
      {/* Background closer */}
      <div className="absolute inset-0" onClick={onClose} />

      <motion.div
        id={`client-detail-view-${client.id}`}
        initial={{ y: "100%", opacity: 0.5 }}
        animate={{ y: 0, opacity: 1 }}
        exit={{ y: "100%", opacity: 0 }}
        transition={{ type: "spring", damping: 28, stiffness: 380 }}
        className="relative bg-white w-full sm:max-w-md max-h-[92vh] sm:max-h-[85vh] rounded-t-3xl sm:rounded-2xl shadow-xl flex flex-col overflow-hidden z-10"
        dir={isRtl ? "rtl" : "ltr"}
      >
        {/* Grab Handle for mobile swipe feel */}
        <div className="mx-auto w-10 h-1 bg-slate-200 rounded-full my-3 block sm:hidden" />

        {/* Modal Header */}
        <div className={`px-5 pb-3 pt-2 sm:pt-4 flex items-start justify-between border-b border-slate-100 ${isRtl ? "text-right" : "text-left"}`}>
          <div className="text-left">
            <span className="text-[10px] font-semibold text-slate-400">
              {t.clientFile}
            </span>
            <h3 className="text-lg font-bold text-slate-900 leading-tight">
              {client.name}
            </h3>
            <div className={`flex items-center ${isRtl ? "space-x-reverse" : ""} space-x-1 mt-0.5`}>
              <Phone className="w-3 h-3 text-slate-400" />
              <span className="text-xs font-medium text-slate-500">
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

        {/* Modal Content Scrollable Area */}
        <div className="flex-1 overflow-y-auto p-5 space-y-5 text-left">
          {/* Main Debt Gauge */}
          <div className="bg-slate-900 text-white rounded-2xl p-4.5 text-center">
            <span className="text-[10px] text-slate-400 font-semibold">
              {t.dueBalance}
            </span>
            <p
              id="detail-outstanding-debt-display"
              className={`text-2xl font-extrabold mt-1 ${
                stats.debt > 0 ? "text-rose-400" : "text-teal-400"
              }`}
            >
              {formatCurrency(stats.debt, currency)}
            </p>

            <div className={`grid grid-cols-2 gap-2 mt-4 pt-3.5 border-t border-slate-800 text-left`}>
              <div>
                <span className="block text-[9px] text-slate-400">{t.totalDelivered}</span>
                <span className="text-xs font-bold text-slate-200">
                  {formatCurrency(stats.totalDelivered, currency)}
                </span>
              </div>
              <div>
                <span className="block text-[9px] text-slate-400">{t.recovered}</span>
                <span className="text-xs font-bold text-slate-200">
                  {formatCurrency(stats.totalPaid, currency)}
                </span>
              </div>
            </div>
          </div>

          {/* Quick Action Reminders & Payments */}
          <div className={`grid grid-cols-2 gap-2.5`}>
            <button
              id="duplicate-last-sale-btn"
              onClick={handleDuplicateLastSale}
              className="flex items-center justify-center space-x-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-xs py-2.5 px-3 rounded-xl transition cursor-pointer"
            >
              <Copy className="w-4 h-4" />
              <span>{lang === "ar" ? "تكرار آخر بيع" : "Dupliquer dernière vente"}</span>
            </button>
            {stats.debt > 0 ? (
              <button
                id="record-repayment-drawer-btn"
                onClick={() => setShowRepayForm(!showRepayForm)}
                className="flex items-center justify-center space-x-1.5 bg-teal-600 hover:bg-teal-700 text-white font-semibold text-xs py-2.5 px-3 rounded-xl transition cursor-pointer"
              >
                <DollarSign className="w-4 h-4" />
                <span>{t.repayDebt}</span>
              </button>
            ) : (
              <div className="bg-teal-50 text-teal-700 text-[11px] font-semibold py-2.5 px-3 rounded-xl flex items-center justify-center">
                <span>{lang === "ar" ? "الحساب خالص ومسدد !" : "Client en règle !"}</span>
              </div>
            )}

            <a
              href={whatsappUrl}
              target="_blank"
              rel="noreferrer"
              id="send-whatsapp-reminder-btn"
              className="flex items-center justify-center space-x-1.5 bg-slate-900 hover:bg-slate-800 text-white font-semibold text-xs py-2.5 px-3 rounded-xl transition text-center"
            >
              <MessageSquare className="w-4 h-4" />
              <span>{t.whatsappReminder}</span>
            </a>
          </div>

          {copiedMessage && (
            <div className="rounded-xl bg-teal-50 text-teal-700 text-[11px] font-semibold px-3 py-2">
              {copiedMessage}
            </div>
          )}

          {/* Form to log single Repayment */}
          {showRepayForm && (
            <motion.div
              id="repayment-form-block"
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              className="bg-teal-50/60 p-4 rounded-xl space-y-3"
            >
              <h4 className={`text-xs font-bold text-teal-800 flex items-center ${isRtl ? "space-x-reverse" : ""} space-x-1`}>
                <TrendingDown className="w-4 h-4" />
                <span>{t.recordRepayment}</span>
              </h4>

              <form onSubmit={handleRepaySubmit} className="space-y-3">
                <div className="grid grid-cols-1 gap-2.5">
                  <div className="relative">
                    <input
                      id="repayment-amount-input"
                      type="number"
                      inputMode="numeric"
                      placeholder={lang === "ar" ? `مبلغ التسديد (الأقصى: ${stats.debt})` : `Montant du versement (Max: ${stats.debt})`}
                      value={repayAmount}
                      onChange={(e) => setRepayAmount(e.target.value)}
                      className={`w-full bg-white border border-teal-200 rounded-lg py-2 text-xs font-semibold text-slate-800 outline-none focus:ring-1 focus:ring-teal-500 ${isRtl ? "pl-12 pr-3" : "pr-12 pl-3"}`}
                    />
                    <span className={`absolute inset-y-0 ${isRtl ? "left-3.5" : "right-3.5"} flex items-center text-xs font-semibold text-slate-400`}>
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
                      className="w-full bg-white border border-teal-100 rounded-lg py-1.5 px-3 text-xs outline-none focus:ring-1 focus:ring-teal-500"
                    />
                  </div>
                </div>

                {errorMsg && (
                  <p id="repay-error-msg" className="text-[11px] text-rose-600 font-medium">{errorMsg}</p>
                )}

                {success && (
                  <p id="repay-success-msg" className="text-[11px] text-teal-700 font-medium bg-teal-100/60 p-2 rounded">
                    {lang === "ar" ? "تم تسجيل الدفعة بنجاح !" : "Versement enregistré avec succès !"}
                  </p>
                )}

                <button
                  type="submit"
                  id="submit-repayment-btn"
                  className="w-full bg-teal-600 hover:bg-teal-700 text-white font-semibold text-xs py-2 rounded-lg cursor-pointer transition"
                >
                  {t.confirmRepayment}
                </button>
              </form>
            </motion.div>
          )}

          {/* Purchase History / Typical Prices */}
          {recentPurchases.length > 0 && (
            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-3.5 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-1.5">
                  <ShoppingBag className="w-4 h-4 text-slate-600" />
                  <h4 className="text-xs font-bold text-slate-700">
                    {lang === "ar" ? "سجل الأسعار والشراء" : "Historique des prix / habitudes"}
                  </h4>
                </div>
                <span className="text-[10px] font-semibold text-slate-500">
                  {lang === "ar" ? "متوسط آخر 4 مشتريات" : "Moyenne des 4 derniers achats"}
                </span>
              </div>

              <div className="rounded-xl bg-white p-3 text-sm text-slate-700">
                <div className="flex items-center justify-between">
                  <span className="font-semibold">
                    {lang === "ar" ? "متوسط الشراء" : "Achat moyen"}
                  </span>
                  <span className="font-bold text-slate-900">
                    {formatCurrency(Math.round(averagePurchase), currency)}
                  </span>
                </div>
              </div>

              <div className="space-y-2">
                {recentPurchases.map((purchase) => (
                  <div key={purchase.id} className="rounded-xl bg-white px-3 py-2 text-xs text-slate-600">
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-semibold text-slate-800">{purchase.description || (lang === "ar" ? "توصيل" : "Livraison")}</span>
                      <span className="font-bold text-slate-900">{formatCurrency(purchase.totalAmount, currency)}</span>
                    </div>
                    <div className="mt-1 text-[10px] text-slate-500">
                      {formatDate(purchase.date)}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Chronological History Timeline */}
          <div className="space-y-3">
            <h4 className="text-xs font-bold text-slate-500 text-left">
              {t.historyTimeline}
            </h4>

            {historyItems.length === 0 ? (
              <p className="text-xs text-slate-400 text-center py-4 bg-slate-50 rounded-xl">
                {t.noTransactionsYet}
              </p>
            ) : (
              <div className={`relative ${isRtl ? "pr-4 border-r-2" : "pl-4 border-l-2"} border-slate-100 space-y-4`}>
                {historyItems.map((item) => (
                  <div key={item.id} className="relative text-left">
                    {/* Timestamp Dot */}
                    <div
                      className={`absolute ${isRtl ? "-right-[21px]" : "-left-[21px]"} top-1 w-2.5 h-2.5 rounded-full border-2 border-white ${
                        item.type === "sale" ? "bg-slate-400" : "bg-teal-500"
                      }`}
                    />

                    {/* Timeline Event Content */}
                    <div className="space-y-1 text-left">
                      <div className="flex items-center justify-between text-[10px] text-slate-400">
                        <span className={`flex items-center ${isRtl ? "space-x-reverse" : ""} space-x-1 font-medium`}>
                          <Calendar className="w-3 h-3" />
                          <span>{formatDate(item.date)}</span>
                        </span>
                        <span>{item.type === "sale" ? t.delivered : t.repaymentReceived}</span>
                      </div>

                      <div className="flex items-start justify-between">
                        <div>
                          <p className="text-xs font-bold text-slate-800 leading-tight">
                            {item.title}
                          </p>
                          {item.type === "sale" && (
                            <div className="text-[10px] text-slate-500 space-y-0.5 mt-0.5">
                              <div>
                                {lang === "ar" ? "تم توصيل:" : "Livré:"} {formatCurrency(item.primaryValue, currency)} | {lang === "ar" ? "التسبيق:" : "Acompte:"}{" "}
                                {formatCurrency(item.secondaryValue, currency)}
                              </div>
                              {item.dueDate && (
                                <div className="text-slate-400">
                                  {t.dueDate} : {formatDate(item.dueDate)}
                                </div>
                              )}
                            </div>
                          )}
                        </div>

                        <div className="text-right">
                          <span
                            className={`text-xs font-bold ${
                              item.type === "sale" ? "text-slate-800" : "text-teal-600"
                            }`}
                          >
                            {item.type === "sale" ? "+" : "-"}
                            {formatCurrency(item.primaryValue, currency)}
                          </span>

                          {item.type === "sale" && (
                            <span className={`block text-[9px] font-semibold ${
                              item.balance > 0 ? "text-rose-500" : "text-teal-500"
                            }`}>
                              {item.balance > 0 
                                ? `${lang === "ar" ? "دين:" : "Dette:"} ${formatCurrency(item.balance, currency)}`
                                : `${lang === "ar" ? "خالص" : "Payé"}`}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </motion.div>
    </div>
  );
}
