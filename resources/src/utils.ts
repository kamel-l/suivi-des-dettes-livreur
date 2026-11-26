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
 * Normalise un numéro de téléphone en supprimant espaces et caractères spéciaux.
 * Conserve le signe '+' s'il est présent.
 */
export const normalizePhone = (phone: string): string => {
  return phone.replace(/\s/g, "").replace(/[^0-9+]/g, "");
};

/**
 * Convertit un numéro de téléphone au format international pour WhatsApp.
 * Gère les cas :
 * - 0XXXXXXXXX (Algérie) → +213XXXXXXXXX
 * - 00XXX → +XXX
 * - 213XXX → +213XXX
 * - +213XXX → conservé
 */
export const toInternationalFormat = (phone: string): string => {
  let cleaned = normalizePhone(phone);

  // Si le numéro commence par 00, on remplace par +
  if (cleaned.startsWith("00")) {
    cleaned = "+" + cleaned.substring(2);
  }
  // Si le numéro commence par 0 et a 10 chiffres (cas algérien), on enlève le 0 et ajoute +213
  else if (cleaned.startsWith("0") && cleaned.length === 10) {
    cleaned = "+213" + cleaned.substring(1);
  }
  // Si le numéro commence par 213 sans +, on ajoute +
  else if (cleaned.startsWith("213") && !cleaned.startsWith("+")) {
    cleaned = "+" + cleaned;
  }
  // Sinon on laisse tel quel (on suppose que l'utilisateur a mis un format international valide)

  return cleaned;
};

/**
 * Generates a WhatsApp share link for debt reminder or invoice.
 * Convertit automatiquement le numéro au format international.
 */
export function generateWhatsAppLink(phone: string, message: string): string {
  const internationalNumber = toInternationalFormat(phone);
  const encodedMessage = encodeURIComponent(message);
  return `https://wa.me/${internationalNumber}?text=${encodedMessage}`;
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

export interface TransactionWithBalance extends Transaction {
  allocatedRemainingBalance: number;
}

/**
 * Calculates remaining balances of transactions by allocating repayments chronologically (FIFO).
 */
export function getTransactionsWithBalancesForClient(
  clientTransactions: Transaction[],
  clientRepayments: Repayment[]
): TransactionWithBalance[] {
  // Sort transactions by date (oldest first)
  const sortedTx = [...clientTransactions].sort(
    (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
  );
  // Sort repayments by date (oldest first)
  const sortedRepayments = [...clientRepayments].sort(
    (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
  );

  let repaymentsPool = sortedRepayments.reduce((sum, r) => sum + r.amount, 0);

  return sortedTx.map((tx) => {
    const initialRemaining = tx.totalAmount - tx.paidAmount;
    if (initialRemaining <= 0) {
      return { ...tx, allocatedRemainingBalance: 0 };
    }

    const allocation = Math.min(initialRemaining, repaymentsPool);
    repaymentsPool -= allocation;

    return {
      ...tx,
      allocatedRemainingBalance: initialRemaining - allocation,
    };
  });
}

/**
 * Generates an SMS link for debt reminder.
 * On conserve le numéro nettoyé (sans conversion internationale).
 */
export function generateSMSLink(phone: string, message: string): string {
  const cleanedPhone = phone.replace(/\D/g, "");
  return `sms:${cleanedPhone}?body=${encodeURIComponent(message)}`;
}