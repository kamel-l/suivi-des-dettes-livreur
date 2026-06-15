/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { BackupData, Client, Repayment, Transaction } from "./types";

const MAX_AMOUNT = 1_000_000_000;

export function hashPinSync(pin: string): string {
  const salted = `livreur-dette-salt-${pin}-secure`;
  let hash = 0;
  for (let i = 0; i < salted.length; i++) {
    const char = salted.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash = hash & hash; // Convert to 32bit integer
  }
  return hash.toString(36);
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function isValidIsoDate(value: unknown): value is string {
  if (typeof value !== "string" || !value.trim()) return false;
  return !Number.isNaN(new Date(value).getTime());
}

function isValidAmount(value: unknown, allowZero = false): value is number {
  return (
    typeof value === "number" &&
    Number.isFinite(value) &&
    value >= (allowZero ? 0 : 0.01) &&
    value <= MAX_AMOUNT
  );
}

export function normalizePhone(phone: string): string {
  return phone.replace(/\D/g, "");
}

export function calculateTransactionBalance(transaction: Pick<Transaction, "totalAmount" | "paidAmount">): number {
  return Math.max(0, transaction.totalAmount - transaction.paidAmount);
}

export function parseAmountInput(value: string): number | null {
  const trimmed = value.trim();
  const normalized = trimmed.replace(",", ".");
  if (!/^\d+(\.\d+)?$/.test(normalized)) return null;

  const parsed = Number(normalized);
  if (!isValidAmount(parsed, true)) return null;
  return parsed;
}

export function readStoredJson<T>(key: string, fallback: T): T {
  const raw = localStorage.getItem(key);
  if (!raw) return fallback;

  try {
    return JSON.parse(raw) as T;
  } catch {
    localStorage.removeItem(key);
    return fallback;
  }
}

export function sanitizeTransactions(transactions: Transaction[]): Transaction[] {
  return transactions.map((transaction) => ({
    ...transaction,
    remainingBalance: calculateTransactionBalance(transaction),
  }));
}

/**
 * Formats an amount with a selected currency symbol.
 */
export function formatCurrency(amount: number, symbol: string = "FCFA"): string {
  const noDecimals = ["DA", "FCFA", "F", "GNF", "MGA"].includes(symbol);
  const formatted = new Intl.NumberFormat("fr-FR", {
    style: "decimal",
    minimumFractionDigits: noDecimals ? 0 : 2,
    maximumFractionDigits: noDecimals ? 0 : 2,
  }).format(amount);

  return `${formatted} ${symbol}`;
}

/**
 * Formats a ISO date string to a human-readable string.
 */
export function formatDate(dateString: string, includeTime: boolean = false): string {
  try {
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return dateString;

    const options: Intl.DateTimeFormatOptions = {
      day: "numeric",
      month: "short",
      year: "numeric",
    };

    if (includeTime) {
      options.hour = "2-digit";
      options.minute = "2-digit";
    }

    return date.toLocaleDateString("fr-FR", options);
  } catch {
    return dateString;
  }
}

/**
 * Generates a WhatsApp share link for debt reminder or invoice.
 */
export function generateWhatsAppLink(phone: string, message: string, currency: string = "DA"): string {
  let cleanedPhone = normalizePhone(phone);
  if (cleanedPhone.startsWith("0")) {
    let countryCode = "213"; // Default Algeria
    if (currency === "FCFA") countryCode = "221"; // Default Senegal
    else if (currency === "€") countryCode = "33"; // France
    else if (currency === "$") countryCode = "1"; // USA/North America
    else if (currency === "DH") countryCode = "212"; // Morocco
    else if (currency === "GNF") countryCode = "224"; // Guinea
    else if (currency === "MGA") countryCode = "261"; // Madagascar
    cleanedPhone = countryCode + cleanedPhone.substring(1);
  }
  return `https://wa.me/${cleanedPhone}?text=${encodeURIComponent(message)}`;
}

/**
 * Validates whether a file upload is a valid BackupData structure.
 */
export function validateBackupData(data: any): data is BackupData {
  if (!isPlainObject(data)) return false;
  if (!Array.isArray(data.clients)) return false;
  if (!Array.isArray(data.transactions)) return false;
  if (!Array.isArray(data.repayments)) return false;
  if (typeof data.version !== "number") return false;
  if (!isValidIsoDate(data.exportDate)) return false;

  const clientIds = new Set<string>();
  const phones = new Set<string>();

  for (const client of data.clients) {
    if (!isPlainObject(client)) return false;
    if (typeof client.id !== "string" || !client.id.trim()) return false;
    if (typeof client.name !== "string" || !client.name.trim()) return false;
    if (typeof client.phone !== "string" || !normalizePhone(client.phone)) return false;
    if (!isValidIsoDate(client.createdAt)) return false;
    if (client.notes !== undefined && typeof client.notes !== "string") return false;
    if (clientIds.has(client.id)) return false;

    const normalizedPhone = normalizePhone(client.phone);
    if (phones.has(normalizedPhone)) return false;

    clientIds.add(client.id);
    phones.add(normalizedPhone);
  }

  const transactionIds = new Set<string>();
  for (const transaction of data.transactions) {
    if (!isPlainObject(transaction)) return false;
    if (typeof transaction.id !== "string" || !transaction.id.trim()) return false;
    if (transactionIds.has(transaction.id)) return false;
    if (typeof transaction.clientId !== "string" || !clientIds.has(transaction.clientId)) return false;
    if (!isValidIsoDate(transaction.date)) return false;
    if (typeof transaction.description !== "string") return false;
    if (!isValidAmount(transaction.totalAmount)) return false;
    if (!isValidAmount(transaction.paidAmount, true)) return false;
    if (transaction.paidAmount > transaction.totalAmount) return false;

    transactionIds.add(transaction.id);
  }

  const repaymentIds = new Set<string>();
  for (const repayment of data.repayments) {
    if (!isPlainObject(repayment)) return false;
    if (typeof repayment.id !== "string" || !repayment.id.trim()) return false;
    if (repaymentIds.has(repayment.id)) return false;
    if (typeof repayment.clientId !== "string" || !clientIds.has(repayment.clientId)) return false;
    if (!isValidIsoDate(repayment.date)) return false;
    if (!isValidAmount(repayment.amount)) return false;
    if (repayment.notes !== undefined && typeof repayment.notes !== "string") return false;

    repaymentIds.add(repayment.id);
  }

  return true;
}

/**
 * Computes debt statistics for a specific client.
 */
export function getClientStats(
  client: Client,
  transactions: Transaction[],
  repayments: Repayment[]
) {
  const clientTransactions = transactions.filter((t) => t.clientId === client.id);
  const clientRepayments = repayments.filter((r) => r.clientId === client.id);

  const totalDelivered = clientTransactions.reduce((acc, t) => acc + t.totalAmount, 0);
  const initialAcomptes = clientTransactions.reduce((acc, t) => acc + t.paidAmount, 0);
  const totalRepayments = clientRepayments.reduce((acc, r) => acc + r.amount, 0);

  const totalPaid = initialAcomptes + totalRepayments;
  const balance = totalDelivered - totalPaid;
  const activityDates = [...clientTransactions, ...clientRepayments]
    .map((item) => item.date)
    .sort((a, b) => new Date(b).getTime() - new Date(a).getTime());

  return {
    totalDelivered,
    totalPaid,
    debt: Math.max(0, balance),
    credit: Math.max(0, -balance),
    transactionCount: clientTransactions.length,
    repaymentCount: clientRepayments.length,
    lastActivityDate: activityDates[0] || client.createdAt,
  };
}
