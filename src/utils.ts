/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { BackupData, Client, Repayment, Transaction } from "./types";

/**
 * Formats an amount with a selected currency symbol.
 */
export function formatCurrency(amount: number, symbol: string = "FCFA"): string {
  const formatted = new Intl.NumberFormat("fr-FR", {
    style: "decimal",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);

  if (symbol === "FCFA" || symbol === "F") {
    return `${formatted} ${symbol}`;
  }
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
export function generateWhatsAppLink(phone: string, message: string): string {
  // Clean phone number: keep only numbers
  const cleanedPhone = phone.replace(/\D/g, "");
  return `https://wa.me/${cleanedPhone}?text=${encodeURIComponent(message)}`;
}

/**
 * Validates whether a file upload is a valid BackupData structure.
 */
export function validateBackupData(data: any): data is BackupData {
  if (!data || typeof data !== "object") return false;
  if (!Array.isArray(data.clients)) return false;
  if (!Array.isArray(data.transactions)) return false;
  if (!Array.isArray(data.repayments)) return false;
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
  const debt = totalDelivered - totalPaid;

  return {
    totalDelivered,
    totalPaid,
    debt: Math.max(0, debt),
    transactionCount: clientTransactions.length,
    repaymentCount: clientRepayments.length,
    lastActivityDate:
      clientTransactions.length > 0
        ? clientTransactions[clientTransactions.length - 1].date
        : client.createdAt,
  };
}
