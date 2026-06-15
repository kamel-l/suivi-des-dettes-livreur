/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from "react";
import { Client, Transaction, Repayment } from "../types";
import { formatCurrency, getClientStats, formatDate, generateWhatsAppLink, generateSMSLink, getTransactionsWithBalancesForClient } from "../utils";
import { AlertCircle, UserCheck, TrendingUp, Sparkles, PlusCircle, MessageSquare, Smartphone, Share2 } from "lucide-react";
import { motion } from "motion/react";
import { Language, translations } from "../translations";

interface DashboardProps {
  clients: Client[];
  transactions: Transaction[];
  repayments: Repayment[];
  currency: string;
  onNavigate: (tab: string) => void;
  onSelectClient: (client: Client) => void;
  lang: Language;
  reminderOffsetDays: number;
}

export default function Dashboard({
  clients,
  transactions,
  repayments,
  currency,
  onNavigate,
  onSelectClient,
  lang,
  reminderOffsetDays,
}: DashboardProps) {
  const t = translations[lang];
  const isRtl = lang === "ar";

  const nowMs = Date.now();
  const reminderMs = reminderOffsetDays * 24 * 60 * 60 * 1000;

  const activeReminders = clients.flatMap((client) => {
    const clientTx = transactions.filter((t) => t.clientId === client.id);
    const clientRep = repayments.filter((r) => r.clientId === client.id);
    const txWithBalances = getTransactionsWithBalancesForClient(clientTx, clientRep);

    return txWithBalances
      .filter((tx) => {
        if (!tx.dueDate || tx.allocatedRemainingBalance <= 0) return false;
        const dueTime = new Date(tx.dueDate).getTime();
        return nowMs >= dueTime - reminderMs;
      })
      .map((tx) => {
        const dueTime = new Date(tx.dueDate!).getTime();
        const diffTime = dueTime - nowMs;
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

        let status: "upcoming" | "today" | "overdue" = "upcoming";
        let statusText = "";

        if (diffDays < 0) {
          status = "overdue";
          const absDays = Math.abs(diffDays);
          statusText = t.overdueByDays.replace("{days}", absDays.toString());
        } else if (diffDays === 0) {
          status = "today";
          statusText = t.dueToday;
        } else {
          status = "upcoming";
          statusText = t.dueInDays.replace("{days}", diffDays.toString());
        }

        const stats = getClientStats(client, transactions, repayments);
        const message = lang === "ar"
          ? `السلام عليكم ${client.name}، تذكير لطيف بخصوص طلبيّة التوصيل "${tx.description}" (المبلغ المتبقي: ${formatCurrency(tx.allocatedRemainingBalance, currency)}) المستحقة بتاريخ ${formatDate(tx.dueDate!)}. يرجى التواصل معي لتسوية الحساب. شكرا لتفهمكم ويومكم طيب !`
          : `Bonjour ${client.name}, petit rappel concernant la livraison "${tx.description}" (Reste à payer : ${formatCurrency(tx.allocatedRemainingBalance, currency)}) qui est due le ${formatDate(tx.dueDate!)}. Merci de me contacter pour le règlement. Bonne journée !`;

        return {
          client,
          transaction: tx,
          status,
          statusText,
          message,
          whatsappUrl: generateWhatsAppLink(client.phone, message),
          smsUrl: generateSMSLink(client.phone, message),
        };
      });
  });

  const handleShare = (message: string) => {
    if (navigator.share) {
      navigator.share({
        title: "Relance LivreurDette",
        text: message,
      }).catch(() => {});
    } else {
      navigator.clipboard.writeText(message);
      alert(lang === "ar" ? "تم نسخ نص التذكير في الحافظة !" : "Message de relance copié dans le presse-papiers !");
    }
  };

  // Compute overall statistics
  let totalDues = 0;
  let totalPaid = 0;
  let activeDebtorsCount = 0;

  const clientStatsList = clients.map((client) => {
    const stats = getClientStats(client, transactions, repayments);
    if (stats.debt > 0) {
      activeDebtorsCount++;
    }
    totalDues += stats.totalDelivered;
    totalPaid += stats.totalPaid;
    return { client, stats };
  });

  const totalOutstandingDebt = Math.max(0, totalDues - totalPaid);
  const percentPaid = totalDues > 0 ? Math.round((totalPaid / totalDues) * 100) : 100;

  // Sorting clients by top debt
  const topDebtors = [...clientStatsList]
    .filter((item) => item.stats.debt > 0)
    .sort((a, b) => b.stats.debt - a.stats.debt)
    .slice(0, 4);

  return (
    <motion.div
      id="dashboard-container"
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      transition={{ duration: 0.2 }}
      className="space-y-5"
      dir={isRtl ? "rtl" : "ltr"}
    >
      {/* Dynamic Summary Cards Grid */}
      <div className="bg-slate-900 text-white rounded-2xl p-5 shadow-lg border border-slate-800 relative overflow-hidden">
        {/* Decorative background circle */}
        <div className={`absolute ${isRtl ? "-left-10" : "-right-10"} -top-10 w-32 h-32 bg-amber-500/10 rounded-full blur-xl pointer-events-none`} />

        <p className="text-slate-400 text-xs font-medium uppercase tracking-wider text-left">
          {t.outstandingDebt}
        </p>
        <h2 className="text-3xl font-extrabold text-amber-400 mt-1 font-mono tracking-tight text-left">
          {formatCurrency(totalOutstandingDebt, currency)}
        </h2>

        {/* Paid Progress bar */}
        <div className="mt-4">
          <div className="flex items-center justify-between text-xs text-slate-400 mb-1.5" dir="ltr">
            {isRtl ? (
              <>
                <span className="font-mono font-bold text-emerald-400">{percentPaid}%</span>
                <span>{t.recoveryRate}</span>
              </>
            ) : (
              <>
                <span>{t.recoveryRate}</span>
                <span className="font-mono font-bold text-emerald-400">{percentPaid}%</span>
              </>
            )}
          </div>
          <div className="w-full bg-slate-800 h-2.5 rounded-full overflow-hidden">
            <div
              className={`bg-gradient-to-r from-emerald-500 to-teal-400 h-full rounded-full transition-all duration-500`}
              style={{ width: `${percentPaid}%` }}
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4 mt-5 pt-4 border-t border-slate-800 text-left">
          <div>
            <span className="block text-[10px] text-slate-400 uppercase font-medium">
              {t.alreadyPaid}
            </span>
            <span className="text-sm font-bold text-slate-200 font-mono">
              {formatCurrency(totalPaid, currency)}
            </span>
          </div>
          <div>
            <span className="block text-[10px] text-slate-400 uppercase font-medium">
              {t.turnover}
            </span>
            <span className="text-sm font-bold text-slate-200 font-mono">
              {formatCurrency(totalDues, currency)}
            </span>
          </div>
        </div>
      </div>

      {/* Mini Info-banner */}
      <div className="grid grid-cols-2 gap-3">
        <div className={`bg-white rounded-xl p-3.5 border border-slate-100 flex items-center shadow-xs ${isRtl ? "space-x-reverse" : "space-x-3"}`}>
          <div className="bg-rose-50 text-rose-600 p-2.5 rounded-lg">
            <AlertCircle className="w-5 h-5" />
          </div>
          <div className="text-left">
            <span className="block text-[10px] text-slate-400 uppercase font-medium">
              {t.indebtedClients}
            </span>
            <span className="text-lg font-extrabold text-slate-800 font-mono">
              {activeDebtorsCount}
            </span>
          </div>
        </div>

        <div className={`bg-white rounded-xl p-3.5 border border-slate-100 flex items-center shadow-xs ${isRtl ? "space-x-reverse" : "space-x-3"}`}>
          <div className="bg-emerald-50 text-emerald-600 p-2.5 rounded-lg">
            <UserCheck className="w-5 h-5" />
          </div>
          <div className="text-left">
            <span className="block text-[10px] text-slate-400 uppercase font-medium">
              {t.totalClients}
            </span>
            <span className="text-lg font-extrabold text-slate-800 font-mono">
              {clients.length}
            </span>
          </div>
        </div>
      </div>

      {/* Quick actions panel */}
      <div className="bg-amber-50/70 border border-amber-100 rounded-2xl p-4">
        <div className={`flex items-center text-amber-800 text-xs font-bold mb-3 ${isRtl ? "space-x-reverse" : "space-x-2"}`}>
          <Sparkles className="w-4 h-4 text-amber-600" />
          <span>{t.shortcuts}</span>
        </div>
        <div className="grid grid-cols-2 gap-2.5">
          <button
            id="quick-add-transaction-btn"
            onClick={() => onNavigate("new")}
            className={`flex items-center justify-center ${isRtl ? "space-x-reverse" : "space-x-2"} bg-slate-900 text-white font-medium text-xs px-3 py-3 rounded-xl hover:bg-slate-800 transition shadow-sm`}
          >
            <PlusCircle className="w-4 h-4 text-amber-400 hover:rotate-95 duration-205" />
            <span>{t.newSale}</span>
          </button>
          <button
            id="quick-add-client-btn"
            onClick={() => onNavigate("clients")}
            className={`flex items-center justify-center ${isRtl ? "space-x-reverse" : "space-x-2"} bg-white text-slate-800 border border-slate-200 font-medium text-xs px-3 py-3 rounded-xl hover:bg-slate-50 transition shadow-xs`}
          >
            <TrendingUp className="w-4 h-4 text-slate-500" />
            <span>{t.manageClients}</span>
          </button>
        </div>
      </div>

      {/* Reminders & Due Dates list */}
      <div className="space-y-3">
        <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 text-left">
          {t.remindersTitle}
        </h3>

        {activeReminders.length === 0 ? (
          <div className="bg-emerald-50/50 border border-emerald-100 rounded-xl p-5 text-center">
            <p className="text-sm text-emerald-800 font-medium">
              {t.noReminders}
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {activeReminders.map(({ client, transaction, status, statusText, whatsappUrl, smsUrl, message }) => (
              <div
                key={transaction.id}
                className={`bg-white border border-slate-150 hover:border-amber-200 transition rounded-xl p-4 flex flex-col text-left`}
              >
                <div className="flex justify-between items-start">
                  <div>
                    <h4
                      onClick={() => onSelectClient(client)}
                      className="font-extrabold text-sm text-slate-800 cursor-pointer hover:text-amber-600 transition"
                    >
                      {client.name}
                    </h4>
                    <p className="text-xs text-slate-400 font-mono mt-0.5">{client.phone}</p>
                  </div>
                  
                  {/* Status pill badge */}
                  <span
                    className={`text-[9px] font-bold px-2 py-0.5 rounded-full uppercase border ${
                      status === "overdue"
                        ? "bg-rose-50 text-rose-700 border-rose-100"
                        : status === "today"
                        ? "bg-amber-50 text-amber-700 border-amber-100"
                        : "bg-blue-50 text-blue-700 border-blue-100"
                    }`}
                  >
                    {statusText}
                  </span>
                </div>

                {/* Delivery details info */}
                <div className="mt-3 p-2.5 bg-slate-50 rounded-lg border border-slate-100 text-xs text-slate-700 space-y-1">
                  <div className="flex justify-between">
                    <span className="font-semibold text-slate-800">{transaction.description}</span>
                    <span className="font-extrabold font-mono text-rose-650">
                      {formatCurrency(transaction.allocatedRemainingBalance, currency)}
                    </span>
                  </div>
                  <div className="flex justify-between text-[10px] text-slate-450 font-mono">
                    <span>{t.delivered} : {formatDate(transaction.date)}</span>
                    <span>{t.dueDate} : {formatDate(transaction.dueDate!)}</span>
                  </div>
                </div>

                {/* Quick actions for sending reminder */}
                <div className={`flex items-center gap-2 mt-3`}>
                  {/* SMS Link */}
                  <a
                    href={smsUrl}
                    className="flex-1 flex items-center justify-center space-x-1.5 bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs py-2 px-2.5 rounded-xl transition text-center"
                  >
                    <Smartphone className="w-3.5 h-3.5 text-amber-400" />
                    <span>{t.sendSmsReminder}</span>
                  </a>

                  {/* WhatsApp Link */}
                  <a
                    href={whatsappUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="flex-1 flex items-center justify-center space-x-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs py-2 px-2.5 rounded-xl transition text-center"
                  >
                    <MessageSquare className="w-3.5 h-3.5 text-emerald-200" />
                    <span>{t.sendWhatsappReminder}</span>
                  </a>

                  {/* Copy / Share Button */}
                  <button
                    onClick={() => handleShare(message)}
                    className="flex items-center justify-center bg-slate-105 hover:bg-slate-200 text-slate-700 p-2 rounded-xl border border-slate-200 transition cursor-pointer"
                    title={t.shareReminder}
                  >
                    <Share2 className="w-4 h-4 text-slate-500" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* High Alert List (Top Debtors) */}
      <div className="space-y-3">
        <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 text-left">
          {t.highDebtAlerts}
        </h3>
        {topDebtors.length === 0 ? (
          <div className="bg-emerald-50/50 border border-emerald-100 rounded-xl p-5 text-center">
            <p className="text-sm text-emerald-800 font-medium">
              {t.noDebtorsYet}
            </p>
            <p className="text-xs text-emerald-600 mt-1">
              {t.allClientsUpToDate}
            </p>
          </div>
        ) : (
          <div className="space-y-2.5">
            {topDebtors.map(({ client, stats }) => (
              <div
                key={client.id}
                onClick={() => onSelectClient(client)}
                id={`top-debtor-card-${client.id}`}
                className={`bg-white border border-slate-100 hover:border-amber-200 hover:bg-amber-50/30 transition rounded-xl p-3.5 flex items-center justify-between cursor-pointer shadow-xs ${isRtl ? "flex-row-reverse" : ""}`}
              >
                <div className="space-y-0.5 text-left">
                  <h4 className="font-bold text-sm text-slate-800">{client.name}</h4>
                  <p className="text-xs text-slate-500 font-mono">{client.phone}</p>
                </div>
                <div className="text-right">
                  <p className="text-sm font-bold text-rose-600 font-mono">
                    {formatCurrency(stats.debt, currency)}
                  </p>
                  <span className="inline-block px-1.5 py-0.5 bg-rose-50 text-[10px] font-medium text-rose-600 rounded">
                    {t.activeDebt}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </motion.div>
  );
}
