/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export interface Client {
  id: string;
  name: string;
  phone: string;
  createdAt: string;
  notes?: string;
}

export interface Transaction {
  id: string;
  clientId: string;
  date: string;
  description: string;
  totalAmount: number;
  paidAmount: number; // The initial deposit (acompte)
  remainingBalance: number; // totalAmount - paidAmount
}

export interface Repayment {
  id: string;
  clientId: string;
  date: string;
  amount: number; // The repayment amount
  notes?: string;
}

export interface BackupData {
  version: number;
  clients: Client[];
  transactions: Transaction[];
  repayments: Repayment[];
  exportDate: string;
}
