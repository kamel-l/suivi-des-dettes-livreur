/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from "react";
import { Client, Transaction, Repayment } from "../types";
import { formatCurrency, getClientStats, formatDate, generateWhatsAppLink, generateSMSLink, getTransactionsWithBalancesForClient } from "../utils";
import { Bell, Users, DollarSign, TrendingUp, Plus, Send, Smartphone, Share2, AlertCircle, CheckCircle } from "lucide-react";
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
        const diffDays = Math.ceil((dueTime - nowMs) / (1000 * 60 * 60 * 24));

        let status: "upcoming" | "today" | "overdue" = "upcoming";
        let statusText = "";
        if (diffDays < 0) {
          status = "overdue";
          statusText = t.overdueByDays.replace("{days}", Math.abs(diffDays).toString());
        } else if (diffDays === 0) {
          status = "today";
          statusText = t.dueToday;
        } else {
          status = "upcoming";
          statusText = t.dueInDays.replace("{days}", diffDays.toString());
        }

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
      navigator.share({ title: "Relance LivreurDette", text: message }).catch(() => {});
    } else {
      navigator.clipboard.writeText(message);
      alert(lang === "ar" ? "تم نسخ نص التذكير في الحافظة !" : "Message de relance copié dans le presse-papiers !");
    }
  };

  let totalDues = 0;
  let totalPaid = 0;
  let activeDebtorsCount = 0;
  const clientStatsList = clients.map((client) => {
    const stats = getClientStats(client, transactions, repayments);
    if (stats.debt > 0) activeDebtorsCount++;
    totalDues += stats.totalDelivered;
    totalPaid += stats.totalPaid;
    return { client, stats };
  });
  const totalOutstandingDebt = Math.max(0, totalDues - totalPaid);
  const percentPaid = totalDues > 0 ? Math.round((totalPaid / totalDues) * 100) : 100;

  const topDebtors = [...clientStatsList]
    .filter((item) => item.stats.debt > 0)
    .sort((a, b) => b.stats.debt - a.stats.debt)
    .slice(0, 4);

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      transition={{ duration: 0.3 }}
      className="space-y-5"
      dir={isRtl ? "rtl" : "ltr"}
    >
      {/* Carte principale - solde */}
      <div className="bg-gradient-to-br from-blue-500 to-indigo-600 text-white rounded-3xl p-5 shadow-lg shadow-blue-200/40">
        <p className="text-blue-100 text-xs font-medium uppercase tracking-wider">{t.outstandingDebt}</p>
        <h2 className="text-3xl font-extrabold mt-1 font-mono tracking-tight">
          {formatCurrency(totalOutstandingDebt, currency)}
        </h2>
        <div className="mt-4">
          <div className="flex items-center justify-between text-xs text-blue-200 mb-1.5">
            <span>{t.recoveryRate}</span>
            <span className="font-bold text-white">{percentPaid}%</span>
          </div>
          <div className="w-full bg-blue-400/30 h-2.5 rounded-full overflow-hidden">
            <div className="bg-gradient-to-r from-emerald-300 to-teal-200 h-full rounded-full transition-all duration-500" style={{ width: `${percentPaid}%` }} />
          </div>
        </div>
        <div className="grid grid-cols-2 gap-4 mt-5 pt-4 border-t border-blue-400/20">
          <div>
            <span className="block text-[10px] text-blue-200 uppercase font-medium">{t.alreadyPaid}</span>
            <span className="text-sm font-bold font-mono">{formatCurrency(totalPaid, currency)}</span>
          </div>
          <div>
            <span className="block text-[10px] text-blue-200 uppercase font-medium">{t.turnover}</span>
            <span className="text-sm font-bold font-mono">{formatCurrency(totalDues, currency)}</span>
          </div>
        </div>
      </div>

      {/* Stats rapides */}
      <div className="grid grid-cols-2 gap-3">
        <div className="bg-white rounded-2xl p-3.5 border border-slate-100 shadow-sm flex items-center space-x-3">
          <div className="bg-rose-50 p-2.5 rounded-xl">
            <AlertCircle className="w-5 h-5 text-rose-500" />
          </div>
          <div>
            <span className="block text-[10px] text-slate-400 uppercase font-medium">{t.indebtedClients}</span>
            <span className="text-lg font-extrabold text-slate-800 font-mono">{activeDebtorsCount}</span>
          </div>
        </div>
        <div className="bg-white rounded-2xl p-3.5 border border-slate-100 shadow-sm flex items-center space-x-3">
          <div className="bg-emerald-50 p-2.5 rounded-xl">
            <Users className="w-5 h-5 text-emerald-500" />
          </div>
          <div>
            <span className="block text-[10px] text-slate-400 uppercase font-medium">{t.totalClients}</span>
            <span className="text-lg font-extrabold text-slate-800 font-mono">{clients.length}</span>
          </div>
        </div>
      </div>

      {/* Actions rapides */}
      <div className="bg-indigo-50/60 border border-indigo-100 rounded-2xl p-4">
        <div className="flex items-center text-indigo-800 text-xs font-bold mb-3 space-x-2">
          <TrendingUp className="w-4 h-4 text-indigo-500" />
          <span>{t.shortcuts}</span>
        </div>
        <div className="grid grid-cols-2 gap-2.5">
          <button
            onClick={() => onNavigate("new")}
            className="flex items-center justify-center space-x-2 bg-indigo-600 hover:bg-indigo-700 text-white font-medium text-xs px-3 py-3 rounded-xl transition shadow-sm"
          >
            <Plus className="w-4 h-4" />
            <span>{t.newSale}</span>
          </button>
          <button
            onClick={() => onNavigate("clients")}
            className="flex items-center justify-center space-x-2 bg-white text-slate-700 border border-slate-200 font-medium text-xs px-3 py-3 rounded-xl hover:bg-slate-50 transition shadow-sm"
          >
            <Users className="w-4 h-4 text-slate-500" />
            <span>{t.manageClients}</span>
          </button>
        </div>
      </div>

      {/* Rappels */}
      <div className="space-y-3">
        <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500">{t.remindersTitle}</h3>
        {activeReminders.length === 0 ? (
          <div className="bg-emerald-50/60 border border-emerald-100 rounded-2xl p-5 text-center">
            <p className="text-sm text-emerald-700 font-medium">{t.noReminders}</p>
          </div>
        ) : (
          <div className="space-y-3">
            {activeReminders.map(({ client, transaction, status, statusText, whatsappUrl, smsUrl, message }) => (
              <div key={transaction.id} className="bg-white border border-slate-100 rounded-2xl p-4 shadow-sm hover:shadow-md transition">
                <div className="flex justify-between items-start">
                  <div>
                    <h4 onClick={() => onSelectClient(client)} className="font-bold text-sm text-slate-800 cursor-pointer hover:text-indigo-600 transition">
                      {client.name}
                    </h4>
                    <p className="text-xs text-slate-400 font-mono">{client.phone}</p>
                  </div>
                  <span className={`text-[9px] font-bold px-2 py-0.5 rounded-full uppercase border ${
                    status === "overdue" ? "bg-rose-50 text-rose-600 border-rose-200" :
                    status === "today" ? "bg-amber-50 text-amber-600 border-amber-200" :
                    "bg-blue-50 text-blue-600 border-blue-200"
                  }`}>{statusText}</span>
                </div>
                <div className="mt-3 p-2.5 bg-slate-50 rounded-xl border border-slate-100 text-xs space-y-1">
                  <div className="flex justify-between">
                    <span className="font-semibold text-slate-700">{transaction.description}</span>
                    <span className="font-bold font-mono text-rose-500">{formatCurrency(transaction.allocatedRemainingBalance, currency)}</span>
                  </div>
                  <div className="flex justify-between text-[10px] text-slate-400 font-mono">
                    <span>{t.delivered} : {formatDate(transaction.date)}</span>
                    <span>{t.dueDate} : {formatDate(transaction.dueDate!)}</span>
                  </div>
                </div>
                <div className="flex items-center gap-2 mt-3">
                  <a href={smsUrl} className="flex-1 flex items-center justify-center space-x-1.5 bg-slate-800 hover:bg-slate-700 text-white font-bold text-xs py-2 px-2.5 rounded-xl transition">
                    <Smartphone className="w-3.5 h-3.5 text-indigo-300" />
                    <span>{t.sendSmsReminder}</span>
                  </a>
                  <a href={whatsappUrl} target="_blank" rel="noreferrer" className="flex-1 flex items-center justify-center space-x-1.5 bg-emerald-500 hover:bg-emerald-600 text-white font-bold text-xs py-2 px-2.5 rounded-xl transition">
                    <Send className="w-3.5 h-3.5 text-emerald-200" />
                    <span>{t.sendWhatsappReminder}</span>
                  </a>
                  <button onClick={() => handleShare(message)} className="flex items-center justify-center bg-slate-100 hover:bg-slate-200 text-slate-600 p-2 rounded-xl border border-slate-200 transition">
                    <Share2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Top débiteurs */}
      <div className="space-y-3">
        <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500">{t.highDebtAlerts}</h3>
        {topDebtors.length === 0 ? (
          <div className="bg-emerald-50/60 border border-emerald-100 rounded-2xl p-5 text-center">
            <p className="text-sm text-emerald-700 font-medium">{t.noDebtorsYet}</p>
            <p className="text-xs text-emerald-600">{t.allClientsUpToDate}</p>
          </div>
        ) : (
          <div className="space-y-2.5">
            {topDebtors.map(({ client, stats }) => (
              <div
                key={client.id}
                onClick={() => onSelectClient(client)}
                className="bg-white border border-slate-100 hover:border-indigo-200 rounded-2xl p-3.5 flex items-center justify-between cursor-pointer shadow-sm hover:shadow-md transition"
              >
                <div>
                  <h4 className="font-bold text-sm text-slate-800">{client.name}</h4>
                  <p className="text-xs text-slate-400 font-mono">{client.phone}</p>
                </div>
                <div className="text-right">
                  <p className="text-sm font-bold text-rose-500 font-mono">{formatCurrency(stats.debt, currency)}</p>
                  <span className="inline-block px-1.5 py-0.5 bg-rose-50 text-[10px] font-medium text-rose-500 rounded">{t.activeDebt}</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </motion.div>
  );
}