/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from "react";
import { Client, Transaction, Repayment } from "../types";
import { calculateTransactionBalance, formatCurrency, formatDate } from "../utils";
import {
  Calendar,
  TrendingUp,
  DollarSign,
  Briefcase,
  Layers,
  CheckCircle,
  Clock,
  ArrowUpRight,
  ArrowDownLeft,
  ChevronRight,
  Sparkles,
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

  // Compute boundaries
  const getPeriodLimits = (selectedPeriod: PeriodType) => {
    const start = new Date();
    const end = new Date();

    if (selectedPeriod === "day") {
      start.setHours(0, 0, 0, 0);
      end.setHours(23, 59, 59, 999);
    } else if (selectedPeriod === "week") {
      // Monday to Sunday current week
      const day = start.getDay();
      const diff = start.getDate() - day + (day === 0 ? -6 : 1);
      start.setDate(diff);
      start.setHours(0, 0, 0, 0);
      end.setTime(start.getTime());
      end.setDate(start.getDate() + 6);
      end.setHours(23, 59, 59, 999);
    } else if (selectedPeriod === "month") {
      start.setDate(1);
      start.setHours(0, 0, 0, 0);
      end.setMonth(start.getMonth() + 1, 0);
      end.setHours(23, 59, 59, 999);
    }
    return { start, end };
  };

  const { start, end } = getPeriodLimits(period);

  // Filter Transactions and Repayments in this period
  const periodTx = transactions.filter((t) => {
    const tDate = new Date(t.date);
    return tDate >= start && tDate <= end;
  });

  const periodRepayments = repayments.filter((r) => {
    const rDate = new Date(r.date);
    return rDate >= start && rDate <= end;
  });

  // Calculate Metrics
  const totalBilled = periodTx.reduce((acc, t) => acc + t.totalAmount, 0);
  const totalAcomptesAtDelivery = periodTx.reduce((acc, t) => acc + t.paidAmount, 0);
  const totalSubsequentRepayments = periodRepayments.reduce((acc, r) => acc + r.amount, 0);

  // Total cash collected physically by the driver during this period
  const totalCashCollected = totalAcomptesAtDelivery + totalSubsequentRepayments;

  // New remaining balance (credits/debt created in this period)
  const totalNewDebtsCreated = periodTx.reduce((acc, t) => acc + calculateTransactionBalance(t), 0);

  // Chronological Operation Log of this period
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
        debtCreated: calculateTransactionBalance(t),
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

  // Period label translator
  const getPeriodTitle = () => {
    if (period === "day") return t.periodToday;
    if (period === "week") return t.periodWeek;
    return t.periodMonth;
  };

  return (
    <motion.div
      id="reports-tab-container"
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      transition={{ duration: 0.2 }}
      className="space-y-4"
      dir={isRtl ? "rtl" : "ltr"}
    >
      <div className={`flex items-center justify-between ${isRtl ? "flex-row-reverse" : ""}`}>
        <h2 className="text-base font-bold text-slate-800 uppercase tracking-wide">
          {t.financialReports}
        </h2>
        <span className="text-[11px] bg-slate-200 text-slate-705 font-bold py-1 px-2.5 rounded-lg font-mono">
          {getPeriodTitle()}
        </span>
      </div>

      {/* Period Filter Tabs Selector */}
      <div className="flex bg-slate-100 p-1.5 rounded-xl border border-slate-200">
        <button
          onClick={() => setPeriod("day")}
          id="report-period-day-btn"
          className={`flex-1 text-[11px] font-bold py-1.5 rounded-lg uppercase tracking-wider transition ${
            period === "day"
              ? "bg-slate-900 text-white shadow"
              : "text-slate-500 hover:text-slate-850"
          }`}
        >
          {t.periodDayBtn}
        </button>
        <button
          onClick={() => setPeriod("week")}
          id="report-period-week-btn"
          className={`flex-1 text-[11px] font-bold py-1.5 rounded-lg uppercase tracking-wider transition ${
            period === "week"
              ? "bg-slate-900 text-white shadow"
              : "text-slate-500 hover:text-slate-850"
          }`}
        >
          {t.periodWeekBtn}
        </button>
        <button
          onClick={() => setPeriod("month")}
          id="report-period-month-btn"
          className={`flex-1 text-[11px] font-bold py-1.5 rounded-lg uppercase tracking-wider transition ${
            period === "month"
              ? "bg-slate-900 text-white shadow"
              : "text-slate-500 hover:text-slate-850"
          }`}
        >
          {t.periodMonthBtn}
        </button>
      </div>

      {/* Main Stats Bento Grid */}
      <div className="space-y-3">
        {/* Total Collected Cashflow Visual (Big Card) */}
        <div className="bg-gradient-to-br from-emerald-600 to-teal-700 text-white rounded-2xl p-4.5 shadow-md flex items-center justify-between relative overflow-hidden text-left">
          <div className="space-y-1">
            <span className="block text-[10px] text-emerald-100 uppercase tracking-wider font-bold">
              {t.totalCollected}
            </span>
            <h3 className="text-2xl font-black font-mono tracking-tight text-white">
              {formatCurrency(totalCashCollected, currency)}
            </h3>
            <p className="text-[10px] text-emerald-200 font-medium">
              {t.totalCollectedDesc}
            </p>
          </div>
          <div className="bg-white/10 p-3 rounded-xl border border-white/10">
            <ArrowUpRight className="w-6 h-6 text-emerald-300 stroke-[2.5]" />
          </div>
        </div>

        {/* Secondary parameters: Total Billed and Outstanding Debt */}
        <div className="grid grid-cols-2 gap-3 text-left">
          <div className="bg-white border border-slate-150 rounded-xl p-3.5 flex flex-col justify-between">
            <div className={`flex items-center ${isRtl ? "space-x-reverse" : ""} space-x-1.5 text-slate-500`}>
              <Briefcase className="w-3.5 h-3.5" />
              <span className="text-[10px] font-bold uppercase tracking-wider">{lang === "ar" ? "إجمالي المسلّم" : "Total Livré"}</span>
            </div>
            <div className="mt-2 text-left">
              <p className="text-base font-extrabold font-mono text-slate-800">
                {formatCurrency(totalBilled, currency)}
              </p>
              <span className="text-[9px] text-slate-400 font-medium font-mono leading-none block mt-0.5">
                {periodTx.length} {t.deliveriesMade}
              </span>
            </div>
          </div>

          <div className="bg-white border border-slate-150 rounded-xl p-3.5 flex flex-col justify-between">
            <div className={`flex items-center ${isRtl ? "space-x-reverse" : ""} space-x-1.5 text-rose-600`}>
              <Clock className="w-3.5 h-3.5 text-rose-500" />
              <span className="text-[10px] font-bold uppercase tracking-wider text-rose-600">
                {t.newDebtsCreated}
              </span>
            </div>
            <div className="mt-2 text-left">
              <p className="text-base font-extrabold font-mono text-rose-600">
                {formatCurrency(totalNewDebtsCreated, currency)}
              </p>
              <span className="text-[9px] text-slate-400 font-medium font-mono leading-none block mt-0.5">
                {lang === "ar" ? "الديون الجديدة المتولدة" : "Restes à payer créés"}
              </span>
            </div>
          </div>
        </div>

        {/* Cash distribution break-down */}
        <div className="bg-white border border-slate-155 rounded-2xl p-4 space-y-3 text-left">
          <h4 className={`text-[10px] font-bold uppercase tracking-wider text-slate-455 flex items-center ${isRtl ? "space-x-reverse" : ""} space-x-1`}>
            <Layers className="w-3.5 h-3.5 text-slate-400" />
            <span>{t.breakdownTitle}</span>
          </h4>

          <div className="space-y-2 text-xs">
            <div className={`flex items-center justify-between ${isRtl ? "flex-row-reverse" : ""}`}>
              <span className="text-slate-600 font-medium">{t.breakdownSales}</span>
              <span className="font-mono text-slate-850 font-bold">
                {formatCurrency(totalAcomptesAtDelivery, currency)}
              </span>
            </div>
            <div className={`flex items-center justify-between ${isRtl ? "flex-row-reverse" : ""}`}>
              <span className="text-slate-600 font-medium">{t.breakdownRepayments}</span>
              <span className="font-mono text-slate-850 font-bold">
                +{formatCurrency(totalSubsequentRepayments, currency)}
              </span>
            </div>
            <div className={`border-t border-slate-100 pt-2 flex items-center justify-between ${isRtl ? "flex-row-reverse" : ""} font-bold text-slate-850`}>
              <span>{t.breakdownTotal}</span>
              <span className="font-mono text-emerald-600">
                {formatCurrency(totalCashCollected, currency)}
              </span>
            </div>
          </div>

          {/* Simple dynamic progress bar representing collection rate */}
          <div className="space-y-1 pt-1.5">
            <div className={`flex justify-between text-[10px] text-slate-400 ${isRtl ? "flex-row-reverse" : ""}`}>
              <span>{t.billedVsCollected}</span>
              <span className="font-bold font-mono text-emerald-600">
                {totalBilled > 0 ? Math.round((totalCashCollected / totalBilled) * 100) : 100}%
              </span>
            </div>
            <div className="w-full bg-slate-150 h-2 rounded-full overflow-hidden">
              <div
                className="bg-emerald-500 h-full rounded-full transition-all duration-350"
                style={{
                  width: `${
                    totalBilled > 0
                      ? Math.min(100, Math.round((totalCashCollected / totalBilled) * 100))
                      : 100
                  }%`,
                }}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Operations log */}
      <div className="space-y-2.5 text-left">
        <h3 className="text-xs font-bold uppercase tracking-widest text-slate-500">
          {t.movementDetails} ({logItems.length})
        </h3>

        {logItems.length === 0 ? (
          <div className="bg-white border border-slate-100 rounded-xl p-8 text-center text-slate-450">
            <PieChart className="w-8 h-8 text-slate-350 mx-auto mb-2" />
            <p className="text-xs font-semibold">{t.noMovements}</p>
            <p className="text-[11px] text-slate-400 mt-0.5 animate-pulse-slow">
              {t.movementsDesc}
            </p>
          </div>
        ) : (
          <div className="space-y-2">
            {logItems.map((item) => (
              <div
                key={item.id}
                onClick={() => item.client && onSelectClient(item.client)}
                className={`bg-white hover:bg-slate-50 transition border border-slate-150 rounded-xl p-3 flex items-center justify-between cursor-pointer ${isRtl ? "flex-row-reverse" : ""}`}
              >
                <div className="space-y-1 flex-1 pr-3 text-left">
                  <div className={`flex items-center ${isRtl ? "space-x-reverse" : ""} space-x-2`}>
                    <span
                      className={`text-[9px] font-bold px-1.5 py-0.5 rounded-md uppercase whitespace-nowrap ${
                        item.type === "sale"
                          ? "bg-amber-105 text-amber-800"
                          : "bg-emerald-105 text-emerald-800"
                      }`}
                    >
                      {item.type === "sale" ? t.delivered : t.repaymentReceived}
                    </span>
                    <span className="text-[10px] text-slate-450 font-mono">
                      {formatDate(item.date, true)}
                    </span>
                  </div>

                  <h4 className="font-bold text-sm text-slate-800 leading-tight">
                    {item.clientName}
                  </h4>
                  <p className="text-[11px] text-slate-500 italic truncate max-w-[200px]">
                    {item.title}
                  </p>
                </div>

                <div className="text-right">
                  {item.type === "sale" ? (
                    <div className="space-y-0.5">
                      <p className="text-xs font-bold text-slate-800 font-mono text-right">
                        {formatCurrency(item.amountValue, currency)}
                      </p>
                      {item.debtCreated > 0 && (
                        <p className="text-[10px] font-mono text-rose-500 font-bold whitespace-nowrap text-right">
                          {lang === "ar" ? "باقي:" : "Solde du:"} {formatCurrency(item.debtCreated, currency)}
                        </p>
                      )}
                    </div>
                  ) : (
                    <div className="space-y-0.5">
                      <p className="text-xs font-bold text-emerald-600 font-mono text-right">
                        +{formatCurrency(item.amountValue, currency)}
                      </p>
                      <span className="inline-block text-[9px] bg-emerald-50 text-emerald-700 font-bold px-1 py-0.2 rounded">
                        {lang === "ar" ? "تم التحصيل" : "Encaissé"}
                      </span>
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
