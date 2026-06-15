/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from "react";
import { Client, Transaction, Repayment } from "../types";
import { formatCurrency, getClientStats } from "../utils";
import { AlertCircle, UserCheck, TrendingUp, Sparkles, PlusCircle } from "lucide-react";
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
}

export default function Dashboard({
  clients,
  transactions,
  repayments,
  currency,
  onNavigate,
  onSelectClient,
  lang,
}: DashboardProps) {
  const t = translations[lang];
  const isRtl = lang === "ar";

  // Compute overall statistics
  let totalDues = 0;
  let totalPaid = 0;
  let activeDebtorsCount = 0;
  let totalOutstandingDebt = 0;

  const clientStatsList = clients.map((client) => {
    const stats = getClientStats(client, transactions, repayments);
    if (stats.debt > 0) {
      activeDebtorsCount++;
    }
    totalDues += stats.totalDelivered;
    totalPaid += stats.totalPaid;
    totalOutstandingDebt += stats.debt;
    return { client, stats };
  });

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

        <p className="text-slate-400 text-xs font-medium uppercase tracking-wider text-start">
          {t.outstandingDebt}
        </p>
        <h2 className="text-3xl font-extrabold text-amber-400 mt-1 font-mono tracking-tight text-start">
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
              style={{ width: `${Math.min(100, percentPaid)}%` }}
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4 mt-5 pt-4 border-t border-slate-800 text-start">
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
          <div className="text-start">
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
          <div className="text-start">
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

      {/* High Alert List (Top Debtors) */}
      <div className="space-y-3">
        <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 text-start">
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
                <div className="space-y-0.5 text-start">
                  <h4 className="font-bold text-sm text-slate-800">{client.name}</h4>
                  <p className="text-xs text-slate-500 font-mono">{client.phone}</p>
                </div>
                <div className="text-end">
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
