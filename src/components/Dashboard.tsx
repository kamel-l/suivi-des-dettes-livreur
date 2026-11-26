/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from "react";
import { Client, Transaction, Repayment } from "../types";
import { formatCurrency, getClientStats, formatDate, generateWhatsAppLink, generateSMSLink, getTransactionsWithBalancesForClient, assessClientRisk } from "../utils";
import { AlertCircle, UserCheck, PlusCircle, MessageSquare, Smartphone, Share2, ArrowRight, ArrowLeft, PieChart } from "lucide-react";
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
  whatsappTemplate: string;
  smsTemplate: string;
}

function applyTemplate(template: string, vars: Record<string, string>): string {
  return template.replace(/\{(\w+)\}/g, (_, key) => (vars[key] ?? ""));
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
  whatsappTemplate,
  smsTemplate,
}: DashboardProps) {

  const t = translations[lang];
  const isRtl = lang === "ar";
  const ArrowIcon = isRtl ? ArrowLeft : ArrowRight;

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

        const dueDateLabel = tx.dueDate ? formatDate(tx.dueDate) : "";
        const amountRemainingLabel = formatCurrency(tx.allocatedRemainingBalance, currency);
        const vars = {
          clientName: client.name,
          description: tx.description,
          amountRemaining: amountRemainingLabel,
          dueDate: dueDateLabel,
        };

        const messageWhatsApp = applyTemplate(whatsappTemplate, vars);
        const messageSms = applyTemplate(smsTemplate, vars);

        return {
          client,
          transaction: tx,
          status,
          statusText,
          message: messageWhatsApp,
          whatsappUrl: generateWhatsAppLink(client.phone, messageWhatsApp),
          smsUrl: generateSMSLink(client.phone, messageSms),
        };
      });
  }).sort((a, b) => new Date(a.transaction.dueDate!).getTime() - new Date(b.transaction.dueDate!).getTime());

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
  const dueRemindersCount = activeReminders.length;

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

  const followUpClientsCount = new Set(activeReminders.map((reminder) => reminder.client.id)).size;
  const todayFollowUps = activeReminders.filter((reminder) => reminder.status === "today");
  const riskClients = clients
    .map((client) => ({ client, risk: assessClientRisk(client, transactions, repayments) }))
    .filter((item) => item.risk.isAtRisk)
    .sort((a, b) => b.risk.debtAgeDays - a.risk.debtAgeDays)
    .slice(0, 3);

  const handleBulkReminder = () => {
    if (todayFollowUps.length === 0) return;

    const urls = todayFollowUps.map((reminder) => reminder.whatsappUrl);
    const firstUrl = urls[0];

    if (typeof window !== "undefined") {
      window.open(firstUrl, "_blank", "noopener,noreferrer");
    }

    if (urls.length > 1) {
      urls.slice(1).forEach((url) => {
        if (typeof window !== "undefined") {
          window.open(url, "_blank", "noopener,noreferrer");
        }
      });
    }
  };

  return (
    <motion.div
      id="dashboard-container"
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -8 }}
      transition={{ duration: 0.15 }}
      className="space-y-5"
      dir={isRtl ? "rtl" : "ltr"}
    >
      {/* Hero balance card */}
      <div className="bg-slate-900 text-white rounded-2xl p-5">
        <p className="text-slate-400 text-xs font-medium text-left">
          {t.outstandingDebt}
        </p>
        <h2 className="text-3xl font-extrabold text-white mt-1 tracking-tight text-left">
          {formatCurrency(totalOutstandingDebt, currency)}
        </h2>

        {/* Paid Progress bar */}
        <div className="mt-4">
          <div className="flex items-center justify-between text-xs text-slate-400 mb-1.5" dir="ltr">
            <span>{t.recoveryRate}</span>
            <span className="font-semibold text-teal-400">{percentPaid}%</span>
          </div>
          <div className="w-full bg-slate-800 h-1.5 rounded-full overflow-hidden">
            <div
              className="bg-teal-500 h-full rounded-full transition-all duration-500"
              style={{ width: `${percentPaid}%` }}
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4 mt-5 pt-4 border-t border-slate-800 text-left">
          <div>
            <span className="block text-[10px] text-slate-400 font-medium">
              {t.alreadyPaid}
            </span>
            <span className="text-sm font-bold text-slate-100">
              {formatCurrency(totalPaid, currency)}
            </span>
          </div>
          <div>
            <span className="block text-[10px] text-slate-400 font-medium">
              {t.turnover}
            </span>
            <span className="text-sm font-bold text-slate-100">
              {formatCurrency(totalDues, currency)}
            </span>
          </div>
        </div>
      </div>

      {/* Mini Info-banner */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        <div className={`bg-white rounded-xl p-3.5 border border-slate-200 flex items-center ${isRtl ? "space-x-reverse" : "space-x-3"}`}>
          <div className="bg-rose-50 text-rose-600 p-2 rounded-lg">
            <AlertCircle className="w-4.5 h-4.5" />
          </div>
          <div className="text-left">
            <span className="block text-[10px] text-slate-400 font-medium">
              {t.indebtedClients}
            </span>
            <span className="text-base font-bold text-slate-900">
              {activeDebtorsCount}
            </span>
          </div>
        </div>

        <div className={`bg-white rounded-xl p-3.5 border border-slate-200 flex items-center ${isRtl ? "space-x-reverse" : "space-x-3"}`}>
          <div className="bg-amber-50 text-amber-700 p-2 rounded-lg">
            <MessageSquare className="w-4.5 h-4.5" />
          </div>
          <div className="text-left">
            <span className="block text-[10px] text-slate-400 font-medium">
              {t.followUpClients}
            </span>
            <span className="text-base font-bold text-slate-900">
              {followUpClientsCount}
            </span>
          </div>
        </div>

        <div className={`bg-white rounded-xl p-3.5 border border-slate-200 flex items-center ${isRtl ? "space-x-reverse" : "space-x-3"}`}>
          <div className="bg-teal-50 text-teal-600 p-2 rounded-lg">
            <UserCheck className="w-4.5 h-4.5" />
          </div>
          <div className="text-left">
            <span className="block text-[10px] text-slate-400 font-medium">
              {t.totalClients}
            </span>
            <span className="text-base font-bold text-slate-900">
              {clients.length}
            </span>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-3">
        <div className="bg-white rounded-xl p-3.5 border border-slate-200 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="bg-amber-50 text-amber-700 p-2 rounded-lg">
              <AlertCircle className="w-4.5 h-4.5" />
            </div>
            <div className="text-left">
              <span className="block text-[10px] text-slate-400 font-medium">
                {t.upcomingReminders}
              </span>
              <span className="text-base font-bold text-slate-900">
                {dueRemindersCount}
              </span>
            </div>
          </div>
          <span className="text-[11px] text-amber-700 font-semibold">
            {dueRemindersCount > 0 ? t.dueNow : t.noReminders}
          </span>
        </div>
      </div>

      {riskClients.length > 0 && (
        <div className="bg-rose-50 border border-rose-200 rounded-2xl p-3.5 space-y-2.5">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-wide text-rose-700">
                {lang === "ar" ? "زبائن في خطر" : "Clients à risque"}
              </p>
              <p className="text-xs text-rose-700/80">
                {lang === "ar" ? "أولوية للمتابعة الفورية" : "Priorité de suivi"}
              </p>
            </div>
            <span className="text-[11px] font-bold text-rose-700">{riskClients.length}</span>
          </div>
          <div className="space-y-2">
            {riskClients.map(({ client, risk }) => (
              <div key={client.id} className="bg-white rounded-xl border border-rose-200 p-3 flex items-center justify-between">
                <div className="text-left">
                  <p className="font-semibold text-sm text-slate-800">{client.name}</p>
                  <p className="text-[11px] text-slate-500">{risk.reason}</p>
                </div>
                <div className="text-right">
                  <p className="text-[11px] font-semibold text-rose-600">
                    {risk.debtAgeDays > 0 ? `${risk.debtAgeDays} j` : ""}
                  </p>
                  <p className="text-[10px] text-slate-500">
                    {lang === "ar" ? "متأخر" : "À suivre"}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Quick actions panel */}
      <div className="space-y-2.5">
        <h3 className="text-xs font-bold text-slate-500 text-left">
          {t.shortcuts}
        </h3>
        <div className="grid grid-cols-3 gap-2">
          <button
            id="quick-add-transaction-btn"
            onClick={() => onNavigate("new")}
            className="flex flex-col items-center justify-center bg-teal-600 text-white font-semibold text-[10px] px-2.5 py-3 rounded-xl hover:bg-teal-700 transition cursor-pointer"
          >
            <PlusCircle className="w-4 h-4 mb-1" />
            <span>{t.newSale}</span>
          </button>
          <button
            id="quick-add-client-btn"
            onClick={() => onNavigate("clients")}
            className="flex flex-col items-center justify-center bg-white text-slate-700 border border-slate-200 font-semibold text-[10px] px-2.5 py-3 rounded-xl hover:bg-slate-50 transition cursor-pointer"
          >
            <UserCheck className="w-4 h-4 mb-1 text-slate-500" />
            <span>{t.manageClients}</span>
          </button>
          <button
            id="quick-reports-btn"
            onClick={() => onNavigate("reports")}
            className="flex flex-col items-center justify-center bg-slate-900 text-white font-semibold text-[10px] px-2.5 py-3 rounded-xl hover:bg-slate-800 transition cursor-pointer"
          >
            <PieChart className="w-4 h-4 mb-1" />
            <span>{t.reports}</span>
          </button>
        </div>
      </div>

      {todayFollowUps.length > 0 && (
        <div className="bg-amber-50 border border-amber-200 rounded-2xl p-3.5 space-y-2.5">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-wide text-amber-700">
                {lang === "ar" ? "للتتبع اليوم" : "À relancer aujourd'hui"}
              </p>
              <p className="text-xs text-amber-700/80">
                {lang === "ar" ? "الزبائن الذين يستحقون متابعة فورية" : "Clients à contacter sans attendre"}
              </p>
            </div>
            <button
              onClick={handleBulkReminder}
              className="text-[11px] font-semibold text-amber-700 bg-white border border-amber-200 px-2.5 py-1 rounded-full"
            >
              {lang === "ar" ? "إرسال جماعي" : "Relancer tout"}
            </button>
          </div>
          <div className="space-y-2">
            {todayFollowUps.map(({ client, transaction, whatsappUrl, smsUrl, message }) => (
              <div key={transaction.id} className="bg-white rounded-xl border border-amber-200 p-3 flex items-center justify-between">
                <div className="text-left">
                  <p className="font-semibold text-sm text-slate-800">{client.name}</p>
                  <p className="text-[11px] text-slate-500">{transaction.description}</p>
                </div>
                <div className="flex items-center gap-2">
                  <a href={smsUrl} className="text-[11px] font-semibold text-slate-700 bg-slate-100 px-2 py-1 rounded-md">
                    SMS
                  </a>
                  <a href={whatsappUrl} target="_blank" rel="noreferrer" className="text-[11px] font-semibold text-white bg-teal-600 px-2 py-1 rounded-md">
                    WhatsApp
                  </a>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Reminders & Due Dates list */}
      <div className="space-y-3">
        <h3 className="text-xs font-bold text-slate-500 text-left">
          {t.remindersTitle}
        </h3>

        {activeReminders.length === 0 ? (
          <div className="bg-white border border-slate-200 rounded-xl p-5 text-center">
            <p className="text-sm text-slate-500">
              {t.noReminders}
            </p>
          </div>
        ) : (
          <div className="space-y-2.5">
            {activeReminders.map(({ client, transaction, status, statusText, whatsappUrl, smsUrl, message }) => (
              <div
                key={transaction.id}
                className="bg-white border border-slate-200 rounded-xl p-4 flex flex-col text-left"
              >
                <div className="flex justify-between items-start">
                  <div>
                    <h4
                      onClick={() => onSelectClient(client)}
                      className="font-bold text-sm text-slate-800 cursor-pointer hover:text-teal-600 transition"
                    >
                      {client.name}
                    </h4>
                    <p className="text-xs text-slate-400 mt-0.5">{client.phone}</p>
                  </div>

                  <span
                    className={`text-[9px] font-bold px-2 py-0.5 rounded-full ${
                      status === "overdue"
                        ? "bg-rose-50 text-rose-600"
                        : status === "today"
                        ? "bg-amber-50 text-amber-700"
                        : "bg-slate-100 text-slate-600"
                    }`}
                  >
                    {statusText}
                  </span>
                </div>

                <div className="mt-3 p-2.5 bg-slate-50 rounded-lg text-xs text-slate-700 space-y-1">
                  <div className="flex justify-between items-center gap-3">
                    <div>
                      <p className="font-medium text-slate-800">{transaction.description}</p>
                      <p className="text-[10px] text-slate-500 mt-0.5">
                        {t.delivered} : {formatDate(transaction.date)}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="font-bold text-rose-600 text-sm">
                        {formatCurrency(transaction.allocatedRemainingBalance, currency)}
                      </p>
                      <p className="text-[10px] text-slate-500">
                        {lang === "ar" ? "المتبقي" : "Reste"}
                      </p>
                    </div>
                  </div>
                  <div className="flex justify-between text-[10px] text-slate-500">
                    <span>{t.dueDate} : {formatDate(transaction.dueDate!)}</span>
                  </div>
                </div>

                <div className="flex items-center gap-2 mt-3">
                  <a
                    href={smsUrl}
                    className="flex-1 flex items-center justify-center space-x-1.5 bg-slate-900 hover:bg-slate-800 text-white font-semibold text-xs py-2 px-2.5 rounded-lg transition text-center"

                  >
                    <Smartphone className="w-3.5 h-3.5" />
                    <span>{t.sendSmsReminder}</span>
                  </a>

                  <a
                    href={whatsappUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="flex-1 flex items-center justify-center space-x-1.5 bg-teal-600 hover:bg-teal-700 text-white font-semibold text-xs py-2 px-2.5 rounded-lg transition text-center"
                  >
                    <MessageSquare className="w-3.5 h-3.5" />
                    <span>{t.sendWhatsappReminder}</span>
                  </a>

                  <button
                    onClick={() => handleShare(message)}
                    className="flex items-center justify-center bg-slate-100 hover:bg-slate-200 text-slate-600 p-2 rounded-lg transition cursor-pointer"
                    title={t.shareReminder}
                  >
                    <Share2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* High Alert List (Top Debtors) */}
      <div className="space-y-3">
        <h3 className="text-xs font-bold text-slate-500 text-left">
          {t.highDebtAlerts}
        </h3>
        {topDebtors.length === 0 ? (
          <div className="bg-white border border-slate-200 rounded-xl p-5 text-center">
            <p className="text-sm text-slate-700 font-medium">
              {t.noDebtorsYet}
            </p>
            <p className="text-xs text-slate-400 mt-1">
              {t.allClientsUpToDate}
            </p>
          </div>
        ) : (
          <div className="space-y-2">
            {topDebtors.map(({ client, stats }) => (
              <div
                key={client.id}
                onClick={() => onSelectClient(client)}
                id={`top-debtor-card-${client.id}`}
                className={`bg-white border border-slate-200 hover:border-teal-300 transition rounded-xl p-3.5 flex items-center justify-between cursor-pointer ${isRtl ? "flex-row-reverse" : ""}`}
              >
                <div className="space-y-0.5 text-left">
                  <h4 className="font-bold text-sm text-slate-800">{client.name}</h4>
                  <p className="text-xs text-slate-400">{client.phone}</p>
                </div>
                <div className={`flex items-center ${isRtl ? "space-x-reverse" : ""} space-x-2`}>
                  <p className="text-sm font-bold text-rose-600">
                    {formatCurrency(stats.debt, currency)}
                  </p>
                  <ArrowIcon className="w-3.5 h-3.5 text-slate-300" />
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </motion.div>
  );
}
