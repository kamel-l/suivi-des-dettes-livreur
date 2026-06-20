/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from "react";
import { Client, Transaction, Repayment } from "../types";
import { formatCurrency, formatDate } from "../utils";
import {
  Calendar,
  TrendingUp,
  DollarSign,
  Briefcase,
  Layers,
  ArrowUpRight,
  Clock,
  PieChart,
} from "lucide-react";
import { motion } from "motion/react";
import { Language, translations } from "../translations";

interface ReportsProps {
  clients: Client[];
  transactions: Transaction[];
  repayments: Repayment[];
  currency: string;
  onSelectClient: (client: Client) => void;
  lang: Language;
}

type PeriodType = "day" | "week" | "month";

export default function Reports({
  clients,
  transactions,
  repayments,
  currency,
  onSelectClient,
  lang,
}: ReportsProps) {
  const [period, setPeriod] = useState<PeriodType>("day");
  const t = translations[lang];
  const isRtl = lang === "ar";

  const getPeriodLimits = (selectedPeriod: PeriodType) => {
    const start = new Date();
    const end = new Date();
    if (selectedPeriod === "day") {
      start.setHours(0, 0, 0, 0);
      end.setHours(23, 59, 59, 999);
    } else if (selectedPeriod === "week") {
      const day = start.getDay();
      const diff = start.getDate() - day + (day === 0 ? -6 : 1);
      start.setDate(diff);
      start.setHours(0, 0, 0, 0);
      end.setHours(23, 59, 59, 999);
    } else if (selectedPeriod === "month") {
      start.setDate(1);
      start.setHours(0, 0, 0, 0);
      end.setHours(23, 59, 59, 999);
    }
    return { start, end };
  };

  const { start, end } = getPeriodLimits(period);

  const periodTx = transactions.filter((t) => {
    const tDate = new Date(t.date);
    return tDate >= start && tDate <= end;
  });

  const periodRepayments = repayments.filter((r) => {
    const rDate = new Date(r.date);
    return rDate >= start && rDate <= end;
  });

  const totalBilled = periodTx.reduce((acc, t) => acc + t.totalAmount, 0);
  const totalAcomptesAtDelivery = periodTx.reduce((acc, t) => acc + t.paidAmount, 0);
  const totalSubsequentRepayments = periodRepayments.reduce((acc, r) => acc + r.amount, 0);
  const totalCashCollected = totalAcomptesAtDelivery + totalSubsequentRepayments;
  const totalNewDebtsCreated = periodTx.reduce((acc, t) => acc + t.remainingBalance, 0);

  const logItems = [
    ...periodTx.map((t) => {
      const client = clients.find((c) => c.id === t.clientId);
      return {
        type: "sale" as const,
        id: t.id,
        date: t.date,
        clientName: client ? client.name : (lang === "ar" ? "زبون مجهول" : "Client Inconnu"),
        clientPhone: client ? client.phone : "",
        client,
        title: t.description || (lang === "ar" ? "طلبيّة سلع" : "Livraison"),
        amountValue: t.totalAmount,
        paidAtDelivery: t.paidAmount,
        debtCreated: t.remainingBalance,
      };
    }),
    ...periodRepayments.map((r) => {
      const client = clients.find((c) => c.id === r.clientId);
      return {
        type: "repayment" as const,
        id: r.id,
        date: r.date,
        clientName: client ? client.name : (lang === "ar" ? "زبون مجهول" : "Client Inconnu"),
        clientPhone: client ? client.phone : "",
        client,
        title: r.notes || (lang === "ar" ? "رقم استحقاق مسدد" : "Règlement dette reçu"),
        amountValue: r.amount,
        paidAtDelivery: 0,
        debtCreated: 0,
      };
    }),
  ].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  const getPeriodTitle = () => {
    if (period === "day") return t.periodToday;
    if (period === "week") return t.periodWeek;
    return t.periodMonth;
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      transition={{ duration: 0.3 }}
      className="space-y-4"
      dir={isRtl ? "rtl" : "ltr"}
    >
      <div className="flex items-center justify-between">
        <h2 className="text-base font-bold text-slate-800 uppercase tracking-wide">{t.financialReports}</h2>
        <span className="text-[11px] bg-indigo-100 text-indigo-700 font-bold py-1 px-2.5 rounded-xl font-mono">{getPeriodTitle()}</span>
      </div>

      <div className="flex bg-slate-100 p-1 rounded-xl">
        {(["day", "week", "month"] as PeriodType[]).map((p) => (
          <button
            key={p}
            onClick={() => setPeriod(p)}
            className={`flex-1 text-[11px] font-bold py-1.5 rounded-lg uppercase tracking-wider transition ${
              period === p ? "bg-indigo-600 text-white shadow" : "text-slate-500 hover:text-slate-800"
            }`}
          >
            {p === "day" ? t.periodDayBtn : p === "week" ? t.periodWeekBtn : t.periodMonthBtn}
          </button>
        ))}
      </div>

      <div className="space-y-3">
        <div className="bg-gradient-to-br from-emerald-400 to-teal-500 text-white rounded-3xl p-4.5 shadow-md flex items-center justify-between">
          <div>
            <span className="block text-[10px] text-emerald-100 uppercase tracking-wider font-bold">{t.totalCollected}</span>
            <h3 className="text-2xl font-black font-mono">{formatCurrency(totalCashCollected, currency)}</h3>
            <p className="text-[10px] text-emerald-200 font-medium">{t.totalCollectedDesc}</p>
          </div>
          <div className="bg-white/20 p-3 rounded-2xl border border-white/10">
            <ArrowUpRight className="w-6 h-6 text-emerald-200" />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="bg-white border border-slate-100 rounded-2xl p-3.5">
            <div className="flex items-center space-x-1.5 text-slate-500">
              <Briefcase className="w-3.5 h-3.5" />
              <span className="text-[10px] font-bold uppercase">{lang === "ar" ? "إجمالي المسلّم" : "Total Livré"}</span>
            </div>
            <p className="text-base font-extrabold font-mono text-slate-800 mt-2">{formatCurrency(totalBilled, currency)}</p>
            <span className="text-[9px] text-slate-400">{periodTx.length} {t.deliveriesMade}</span>
          </div>
          <div className="bg-white border border-slate-100 rounded-2xl p-3.5">
            <div className="flex items-center space-x-1.5 text-rose-500">
              <Clock className="w-3.5 h-3.5" />
              <span className="text-[10px] font-bold uppercase">{t.newDebtsCreated}</span>
            </div>
            <p className="text-base font-extrabold font-mono text-rose-500 mt-2">{formatCurrency(totalNewDebtsCreated, currency)}</p>
            <span className="text-[9px] text-slate-400">{lang === "ar" ? "الديون الجديدة" : "Restes à payer créés"}</span>
          </div>
        </div>

        <div className="bg-white border border-slate-100 rounded-2xl p-4 space-y-3">
          <h4 className="text-[10px] font-bold uppercase tracking-wider text-slate-500 flex items-center space-x-1">
            <Layers className="w-3.5 h-3.5" />
            <span>{t.breakdownTitle}</span>
          </h4>
          <div className="space-y-2 text-xs">
            <div className="flex justify-between">
              <span className="text-slate-600">{t.breakdownSales}</span>
              <span className="font-mono font-bold text-slate-800">{formatCurrency(totalAcomptesAtDelivery, currency)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-600">{t.breakdownRepayments}</span>
              <span className="font-mono font-bold text-slate-800">+{formatCurrency(totalSubsequentRepayments, currency)}</span>
            </div>
            <div className="border-t border-slate-100 pt-2 flex justify-between font-bold text-slate-800">
              <span>{t.breakdownTotal}</span>
              <span className="font-mono text-emerald-600">{formatCurrency(totalCashCollected, currency)}</span>
            </div>
          </div>
          <div>
            <div className="flex justify-between text-[10px] text-slate-400">
              <span>{t.billedVsCollected}</span>
              <span className="font-bold font-mono text-emerald-600">{totalBilled > 0 ? Math.round((totalCashCollected / totalBilled) * 100) : 100}%</span>
            </div>
            <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
              <div className="bg-emerald-400 h-full rounded-full transition-all duration-350" style={{ width: `${totalBilled > 0 ? Math.min(100, Math.round((totalCashCollected / totalBilled) * 100)) : 100}%` }} />
            </div>
          </div>
        </div>
      </div>

      <div className="space-y-2.5">
        <h3 className="text-xs font-bold uppercase tracking-widest text-slate-500">{t.movementDetails} ({logItems.length})</h3>
        {logItems.length === 0 ? (
          <div className="bg-white border border-slate-100 rounded-2xl p-8 text-center text-slate-500">
            <PieChart className="w-8 h-8 text-slate-300 mx-auto mb-2" />
            <p className="text-xs font-semibold">{t.noMovements}</p>
            <p className="text-[11px] text-slate-400">{t.movementsDesc}</p>
          </div>
        ) : (
          <div className="space-y-2">
            {logItems.map((item) => (
              <div
                key={item.id}
                onClick={() => item.client && onSelectClient(item.client)}
                className="bg-white hover:bg-slate-50 transition border border-slate-100 rounded-2xl p-3 flex items-center justify-between cursor-pointer"
              >
                <div className="space-y-1 flex-1 pr-3">
                  <div className="flex items-center space-x-2">
                    <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded-md uppercase ${item.type === "sale" ? "bg-amber-100 text-amber-700" : "bg-emerald-100 text-emerald-700"}`}>
                      {item.type === "sale" ? t.delivered : t.repaymentReceived}
                    </span>
                    <span className="text-[10px] text-slate-400 font-mono">{formatDate(item.date, true)}</span>
                  </div>
                  <h4 className="font-bold text-sm text-slate-800">{item.clientName}</h4>
                  <p className="text-[11px] text-slate-500 italic truncate max-w-[200px]">{item.title}</p>
                </div>
                <div className="text-right">
                  {item.type === "sale" ? (
                    <div>
                      <p className="text-xs font-bold text-slate-800 font-mono">{formatCurrency(item.amountValue, currency)}</p>
                      {item.debtCreated > 0 && <p className="text-[10px] font-mono text-rose-500 font-bold">{lang === "ar" ? "باقي:" : "Solde:"} {formatCurrency(item.debtCreated, currency)}</p>}
                    </div>
                  ) : (
                    <div>
                      <p className="text-xs font-bold text-emerald-600 font-mono">+{formatCurrency(item.amountValue, currency)}</p>
                      <span className="inline-block text-[9px] bg-emerald-50 text-emerald-700 font-bold px-1 py-0.2 rounded">{lang === "ar" ? "تم التحصيل" : "Encaissé"}</span>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </motion.div>
  );
}