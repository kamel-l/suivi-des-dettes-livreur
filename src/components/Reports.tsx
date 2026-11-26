/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from "react";
import { Client, Transaction, Repayment } from "../types";
import { formatCurrency, formatDate } from "../utils";
import {
  Briefcase,
  Clock,
  ArrowUpRight,
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
      end.setHours(23, 59, 59, 999);
    } else if (selectedPeriod === "month") {
      start.setDate(1);
      start.setHours(0, 0, 0, 0);
      end.setHours(23, 59, 59, 999);
    }
    return { start, end };
  };

  const { start, end } = getPeriodLimits(period);

  const getPreviousPeriodLimits = (selectedPeriod: PeriodType) => {
    const current = new Date(start);
    if (selectedPeriod === "day") {
      current.setDate(current.getDate() - 1);
    } else if (selectedPeriod === "week") {
      current.setDate(current.getDate() - 7);
    } else {
      current.setMonth(current.getMonth() - 1);
    }

    const previousStart = new Date(current);
    const previousEnd = new Date(current);

    if (selectedPeriod === "day") {
      previousStart.setHours(0, 0, 0, 0);
      previousEnd.setHours(23, 59, 59, 999);
    } else if (selectedPeriod === "week") {
      previousStart.setHours(0, 0, 0, 0);
      previousEnd.setHours(23, 59, 59, 999);
      previousEnd.setDate(previousStart.getDate() + 6);
    } else {
      previousStart.setDate(1);
      previousStart.setHours(0, 0, 0, 0);
      previousEnd.setMonth(previousStart.getMonth() + 1);
      previousEnd.setDate(0);
      previousEnd.setHours(23, 59, 59, 999);
    }

    return { previousStart, previousEnd };
  };

  const { previousStart, previousEnd } = getPreviousPeriodLimits(period);

  // Filter Transactions and Repayments in this period
  const periodTx = transactions.filter((t) => {
    const tDate = new Date(t.date);
    return tDate >= start && tDate <= end;
  });

  const periodRepayments = repayments.filter((r) => {
    const rDate = new Date(r.date);
    return rDate >= start && rDate <= end;
  });

  const previousPeriodTx = transactions.filter((t) => {
    const tDate = new Date(t.date);
    return tDate >= previousStart && tDate <= previousEnd;
  });

  const previousPeriodRepayments = repayments.filter((r) => {
    const rDate = new Date(r.date);
    return rDate >= previousStart && rDate <= previousEnd;
  });

  // Calculate Metrics
  const totalBilled = periodTx.reduce((acc, t) => acc + t.totalAmount, 0);
  const totalAcomptesAtDelivery = periodTx.reduce((acc, t) => acc + t.paidAmount, 0);
  const totalSubsequentRepayments = periodRepayments.reduce((acc, r) => acc + r.amount, 0);

  // Total cash collected physically by the driver during this period
  const totalCashCollected = totalAcomptesAtDelivery + totalSubsequentRepayments;

  const previousTotalBilled = previousPeriodTx.reduce((acc, t) => acc + t.totalAmount, 0);
  const previousCashCollected = previousPeriodTx.reduce((acc, t) => acc + t.paidAmount, 0) + previousPeriodRepayments.reduce((acc, r) => acc + r.amount, 0);
  const billedDelta = totalBilled - previousTotalBilled;
  const collectedDelta = totalCashCollected - previousCashCollected;

  // New remaining balance (credits/debt created in this period)
  const totalNewDebtsCreated = periodTx.reduce((acc, t) => acc + t.remainingBalance, 0);

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

  // Period label translator
  const getPeriodTitle = () => {
    if (period === "day") return t.periodToday;
    if (period === "week") return t.periodWeek;
    return t.periodMonth;
  };

  const handleExportReport = (format: "json" | "csv") => {
    if (format === "json") {
      const payload = {
        period,
        generatedAt: new Date().toISOString(),
        totalBilled,
        totalCashCollected,
        totalNewDebtsCreated,
        previousTotalBilled,
        previousCashCollected,
        billedDelta,
        collectedDelta,
        logItems,
      };

      const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(payload, null, 2));
      const downloadAnchor = document.createElement("a");
      downloadAnchor.setAttribute("href", dataStr);
      downloadAnchor.setAttribute("download", `rapport-dettes-${period}.json`);
      document.body.appendChild(downloadAnchor);
      downloadAnchor.click();
      downloadAnchor.remove();
      return;
    }

    const rows = [
      ["type", "date", "client", "phone", "title", "amount", "paidAtDelivery", "debtCreated"],
      ...logItems.map((item) => [
        item.type,
        formatDate(item.date, true),
        item.clientName,
        item.clientPhone,
        item.title,
        item.amountValue.toString(),
        item.paidAtDelivery.toString(),
        item.debtCreated.toString(),
      ]),
    ];

    const csvContent = rows.map((row) => row.map((value) => `"${String(value).replace(/"/g, '""')}"`).join(",")).join("\n");
    const dataStr = "data:text/csv;charset=utf-8," + encodeURIComponent(csvContent);
    const downloadAnchor = document.createElement("a");
    downloadAnchor.setAttribute("href", dataStr);
    downloadAnchor.setAttribute("download", `rapport-dettes-${period}.csv`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
  };

  return (
    <motion.div
      id="reports-tab-container"
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -8 }}
      transition={{ duration: 0.15 }}
      className="space-y-4"
      dir={isRtl ? "rtl" : "ltr"}
    >
      <div className={`flex items-center justify-between ${isRtl ? "flex-row-reverse" : ""}`}>
        <h2 className="text-base font-bold text-slate-800">
          {t.financialReports}
        </h2>
        <span className="text-[11px] bg-slate-100 text-slate-600 font-semibold py-1 px-2.5 rounded-lg">
          {getPeriodTitle()}
        </span>
      </div>

      {/* Period Filter Tabs Selector */}
      <div className="flex bg-slate-100 p-1 rounded-lg">
        <button
          onClick={() => setPeriod("day")}
          id="report-period-day-btn"
          className={`flex-1 text-[11px] font-semibold py-1.5 rounded-md transition ${
            period === "day"
              ? "bg-slate-900 text-white"
              : "text-slate-500 hover:text-slate-800"
          }`}
        >
          {t.periodDayBtn}
        </button>
        <button
          onClick={() => setPeriod("week")}
          id="report-period-week-btn"
          className={`flex-1 text-[11px] font-semibold py-1.5 rounded-md transition ${
            period === "week"
              ? "bg-slate-900 text-white"
              : "text-slate-500 hover:text-slate-800"
          }`}
        >
          {t.periodWeekBtn}
        </button>
        <button
          onClick={() => setPeriod("month")}
          id="report-period-month-btn"
          className={`flex-1 text-[11px] font-semibold py-1.5 rounded-md transition ${
            period === "month"
              ? "bg-slate-900 text-white"
              : "text-slate-500 hover:text-slate-800"
          }`}
        >
          {t.periodMonthBtn}
        </button>
      </div>

      <div className="grid grid-cols-2 gap-2">
        <button
          type="button"
          onClick={() => handleExportReport("json")}
          className="w-full bg-slate-900 text-white text-xs font-semibold py-2.5 rounded-xl hover:bg-slate-800 transition"
        >
          {lang === "ar" ? "تصدير JSON" : "Exporter JSON"}
        </button>
        <button
          type="button"
          onClick={() => handleExportReport("csv")}
          className="w-full bg-teal-600 text-white text-xs font-semibold py-2.5 rounded-xl hover:bg-teal-700 transition"
        >
          {lang === "ar" ? "تصدير CSV" : "Exporter CSV"}
        </button>
      </div>

      {/* Main Stats Grid */}
      <div className="space-y-3">
        {/* Total Collected Cashflow Visual (Big Card) */}
        <div className="bg-teal-600 text-white rounded-2xl p-4.5 flex items-center justify-between text-left">
          <div className="space-y-1">
            <span className="block text-[10px] text-teal-100 font-semibold">
              {t.totalCollected}
            </span>
            <h3 className="text-2xl font-extrabold text-white">
              {formatCurrency(totalCashCollected, currency)}
            </h3>
            <p className="text-[10px] text-teal-100">
              {t.totalCollectedDesc}
            </p>
          </div>
          <div className="bg-white/15 p-3 rounded-xl">
            <ArrowUpRight className="w-5 h-5 text-white" />
          </div>
        </div>

        {/* Secondary parameters: Total Billed and Outstanding Debt */}
        <div className="grid grid-cols-2 gap-3 text-left">
          <div className="bg-white border border-slate-200 rounded-xl p-3.5 flex flex-col justify-between">
            <div className={`flex items-center ${isRtl ? "space-x-reverse" : ""} space-x-1.5 text-slate-500`}>
              <Briefcase className="w-3.5 h-3.5" />
              <span className="text-[10px] font-semibold">{lang === "ar" ? "إجمالي المسلّم" : "Total Livré"}</span>
            </div>
            <div className="mt-2 text-left">
              <p className="text-base font-bold text-slate-800">
                {formatCurrency(totalBilled, currency)}
              </p>
              <span className="text-[9px] text-slate-400 block mt-0.5">
                {periodTx.length} {t.deliveriesMade}
              </span>
            </div>
          </div>

          <div className="bg-white border border-slate-200 rounded-xl p-3.5 flex flex-col justify-between">
            <div className={`flex items-center ${isRtl ? "space-x-reverse" : ""} space-x-1.5 text-rose-600`}>
              <Clock className="w-3.5 h-3.5" />
              <span className="text-[10px] font-semibold">
                {t.newDebtsCreated}
              </span>
            </div>
            <div className="mt-2 text-left">
              <p className="text-base font-bold text-rose-600">
                {formatCurrency(totalNewDebtsCreated, currency)}
              </p>
              <span className="text-[9px] text-slate-400 block mt-0.5">
                {lang === "ar" ? "الديون الجديدة المتولدة" : "Restes à payer créés"}
              </span>
            </div>
          </div>
        </div>

        <div className="bg-white border border-slate-200 rounded-2xl p-4 space-y-2 text-left">
          <h4 className="text-[10px] font-bold text-slate-400">
            {lang === "ar" ? "مقارنة مع الفترة السابقة" : "Comparaison avec la période précédente"}
          </h4>
          <div className="grid grid-cols-2 gap-2 text-xs">
            <div className="rounded-lg bg-slate-50 p-2">
              <p className="text-slate-500">{lang === "ar" ? "المسلم" : "Livré"}</p>
              <p className={`font-semibold ${billedDelta >= 0 ? "text-teal-600" : "text-rose-600"}`}>
                {billedDelta >= 0 ? "+" : ""}{formatCurrency(billedDelta, currency)}
              </p>
            </div>
            <div className="rounded-lg bg-slate-50 p-2">
              <p className="text-slate-500">{lang === "ar" ? "المحصّل" : "Collecté"}</p>
              <p className={`font-semibold ${collectedDelta >= 0 ? "text-teal-600" : "text-rose-600"}`}>
                {collectedDelta >= 0 ? "+" : ""}{formatCurrency(collectedDelta, currency)}
              </p>
            </div>
          </div>
        </div>

        {/* Cash distribution break-down */}
        <div className="bg-white border border-slate-200 rounded-2xl p-4 space-y-3 text-left">
          <h4 className="text-[10px] font-bold text-slate-400">
            {t.breakdownTitle}
          </h4>

          <div className="space-y-2 text-xs">
            <div className={`flex items-center justify-between ${isRtl ? "flex-row-reverse" : ""}`}>
              <span className="text-slate-600">{t.breakdownSales}</span>
              <span className="text-slate-800 font-semibold">
                {formatCurrency(totalAcomptesAtDelivery, currency)}
              </span>
            </div>
            <div className={`flex items-center justify-between ${isRtl ? "flex-row-reverse" : ""}`}>
              <span className="text-slate-600">{t.breakdownRepayments}</span>
              <span className="text-slate-800 font-semibold">
                +{formatCurrency(totalSubsequentRepayments, currency)}
              </span>
            </div>
            <div className={`border-t border-slate-100 pt-2 flex items-center justify-between ${isRtl ? "flex-row-reverse" : ""} font-bold text-slate-800`}>
              <span>{t.breakdownTotal}</span>
              <span className="text-teal-600">
                {formatCurrency(totalCashCollected, currency)}
              </span>
            </div>
          </div>

          {/* Simple dynamic progress bar representing collection rate */}
          <div className="space-y-1 pt-1.5">
            <div className={`flex justify-between text-[10px] text-slate-400 ${isRtl ? "flex-row-reverse" : ""}`}>
              <span>{t.billedVsCollected}</span>
              <span className="font-semibold text-teal-600">
                {totalBilled > 0 ? Math.round((totalCashCollected / totalBilled) * 100) : 100}%
              </span>
            </div>
            <div className="w-full bg-slate-100 h-1.5 rounded-full overflow-hidden">
              <div
                className="bg-teal-500 h-full rounded-full transition-all duration-350"
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
        <h3 className="text-xs font-bold text-slate-500">
          {t.movementDetails} ({logItems.length})
        </h3>

        {logItems.length === 0 ? (
          <div className="bg-white border border-slate-200 rounded-xl p-8 text-center text-slate-400">
            <PieChart className="w-8 h-8 mx-auto mb-2 opacity-50" />
            <p className="text-xs font-semibold">{t.noMovements}</p>
            <p className="text-[11px] text-slate-400 mt-0.5">
              {t.movementsDesc}
            </p>
          </div>
        ) : (
          <div className="space-y-2">
            {logItems.map((item) => (
              <div
                key={item.id}
                onClick={() => item.client && onSelectClient(item.client)}
                className={`bg-white hover:bg-slate-50 transition border border-slate-200 rounded-xl p-3 flex items-center justify-between cursor-pointer ${isRtl ? "flex-row-reverse" : ""}`}
              >
                <div className="space-y-1 flex-1 pr-3 text-left">
                  <div className={`flex items-center ${isRtl ? "space-x-reverse" : ""} space-x-2`}>
                    <span
                      className={`text-[9px] font-bold px-1.5 py-0.5 rounded uppercase whitespace-nowrap ${
                        item.type === "sale"
                          ? "bg-slate-100 text-slate-600"
                          : "bg-teal-50 text-teal-700"
                      }`}
                    >
                      {item.type === "sale" ? t.delivered : t.repaymentReceived}
                    </span>
                    <span className="text-[10px] text-slate-400">
                      {formatDate(item.date, true)}
                    </span>
                  </div>

                  <h4 className="font-bold text-sm text-slate-800 leading-tight">
                    {item.clientName}
                  </h4>
                  <p className="text-[11px] text-slate-500 truncate max-w-[200px]">
                    {item.title}
                  </p>
                </div>

                <div className="text-right">
                  {item.type === "sale" ? (
                    <div className="space-y-0.5">
                      <p className="text-xs font-bold text-slate-800 text-right">
                        {formatCurrency(item.amountValue, currency)}
                      </p>
                      {item.debtCreated > 0 && (
                        <p className="text-[10px] text-rose-500 font-semibold whitespace-nowrap text-right">
                          {lang === "ar" ? "باقي:" : "Solde du:"} {formatCurrency(item.debtCreated, currency)}
                        </p>
                      )}
                    </div>
                  ) : (
                    <p className="text-xs font-bold text-teal-600 text-right">
                      +{formatCurrency(item.amountValue, currency)}
                    </p>
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
