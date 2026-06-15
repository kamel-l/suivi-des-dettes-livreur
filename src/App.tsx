/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useState } from "react";
import { Client, Transaction, Repayment, BackupData } from "./types";
import Header from "./components/Header";
import Dashboard from "./components/Dashboard";
import ClientsList from "./components/ClientsList";
import NewTransactionForm from "./components/NewTransactionForm";
import ClientDetailsModal from "./components/ClientDetailsModal";
import BackupSettings from "./components/BackupSettings";
import Reports from "./components/Reports";
import LoginScreen from "./components/LoginScreen";
import { LayoutDashboard, Users, PlusCircle, Database, PieChart } from "lucide-react";
import { AnimatePresence } from "motion/react";
import { Language, translations } from "./translations";
import {
  calculateTransactionBalance,
  normalizePhone,
  readStoredJson,
  sanitizeTransactions,
  hashPinSync,
} from "./utils";

const INITIAL_CLIENTS: Client[] = [
  {
    id: "seed-c1",
    name: "Sofiane (Epicerie Bab El Oued)",
    phone: "0551234567",
    createdAt: new Date(Date.now() - 3600 * 24 * 3 * 1000).toISOString(),
    notes: "Pres de la place Bab El Oued, Alger",
  },
  {
    id: "seed-c2",
    name: "Yacine (Grossiste Oran)",
    phone: "0661987654",
    createdAt: new Date(Date.now() - 3600 * 24 * 5 * 1000).toISOString(),
    notes: "Marche couvert, centre-ville Oran",
  },
];

const INITIAL_TRANSACTIONS: Transaction[] = [
  {
    id: "seed-t1",
    clientId: "seed-c1",
    date: new Date(Date.now() - 3600 * 24 * 2 * 1000).toISOString(),
    description: "Boissons Hamoud Boualem et eau minerale",
    totalAmount: 18500,
    paidAmount: 5000,
    remainingBalance: 13500,
  },
  {
    id: "seed-t2",
    clientId: "seed-c2",
    date: new Date(Date.now() - 3600 * 24 * 4 * 1000).toISOString(),
    description: "Sacs de semoule et farine qualite superieure",
    totalAmount: 35000,
    paidAmount: 15000,
    remainingBalance: 20000,
  },
];

const INITIAL_REPAYMENTS: Repayment[] = [
  {
    id: "seed-r1",
    clientId: "seed-c1",
    date: new Date(Date.now() - 3600 * 24 * 1 * 1000).toISOString(),
    amount: 3500,
    notes: "Versement partiel - especes",
  },
  {
    id: "seed-r2",
    clientId: "seed-c2",
    date: new Date(Date.now() - 3600 * 24 * 2 * 1000).toISOString(),
    amount: 15000,
    notes: "Versement via BaridiMob",
  },
];

/** Generates a UUID v4 that works in both secure (HTTPS) and non-secure (HTTP) contexts */
function generateUUID(): string {
  // Prefer crypto.randomUUID when available (secure contexts only)
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }
  // Fallback: use crypto.getRandomValues (works on HTTP too)
  if (typeof crypto !== "undefined" && typeof crypto.getRandomValues === "function") {
    const bytes = new Uint8Array(16);
    crypto.getRandomValues(bytes);
    bytes[6] = (bytes[6] & 0x0f) | 0x40; // version 4
    bytes[8] = (bytes[8] & 0x3f) | 0x80; // variant bits
    return [...bytes]
      .map((b, i) =>
        [4, 6, 8, 10].includes(i) ? "-" + b.toString(16).padStart(2, "0") : b.toString(16).padStart(2, "0")
      )
      .join("");
  }
  // Last resort: Math.random (non-cryptographic, but functional)
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    return (c === "x" ? r : (r & 0x3) | 0x8).toString(16);
  });
}

function makeId(prefix: string): string {
  return `${prefix}-${generateUUID()}`;
}

export default function App() {
  const [lang, setLang] = useState<Language>(() => {
    const storedLang = localStorage.getItem("livreur-dette-lang");
    return storedLang === "ar" || storedLang === "fr" ? storedLang : "fr";
  });

  const t = translations[lang];

  const [clients, setClients] = useState<Client[]>(() =>
    readStoredJson("livreur-dette-clients", INITIAL_CLIENTS)
  );

  const [transactions, setTransactions] = useState<Transaction[]>(() =>
    sanitizeTransactions(readStoredJson("livreur-dette-transactions", INITIAL_TRANSACTIONS))
  );

  const [repayments, setRepayments] = useState<Repayment[]>(() =>
    readStoredJson("livreur-dette-repayments", INITIAL_REPAYMENTS)
  );

  const [currency, setCurrency] = useState<string>(() => {
    return localStorage.getItem("livreur-dette-currency") || "DA";
  });

  const [activeTab, setActiveTab] = useState<string>("dashboard");
  const [selectedClient, setSelectedClient] = useState<Client | null>(null);

  const [pinCode, setPinCode] = useState<string | null>(() => {
    return localStorage.getItem("livreur-dette-pincode");
  });
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(() => {
    return !localStorage.getItem("livreur-dette-pincode");
  });

  useEffect(() => {
    if (pinCode === null) {
      localStorage.removeItem("livreur-dette-pincode");
    } else {
      localStorage.setItem("livreur-dette-pincode", pinCode);
    }
  }, [pinCode]);

  useEffect(() => {
    localStorage.setItem("livreur-dette-clients", JSON.stringify(clients));
  }, [clients]);

  useEffect(() => {
    localStorage.setItem("livreur-dette-transactions", JSON.stringify(sanitizeTransactions(transactions)));
  }, [transactions]);

  useEffect(() => {
    localStorage.setItem("livreur-dette-repayments", JSON.stringify(repayments));
  }, [repayments]);

  useEffect(() => {
    localStorage.setItem("livreur-dette-currency", currency);
  }, [currency]);

  useEffect(() => {
    localStorage.setItem("livreur-dette-lang", lang);
  }, [lang]);

  const handleAddClient = (name: string, phone: string, notes?: string): Client => {
    const normalizedPhone = normalizePhone(phone);
    const duplicate = clients.find((client) => normalizePhone(client.phone) === normalizedPhone);
    if (duplicate) {
      throw new Error(
        lang === "ar"
          ? `رقم الهاتف هذا مسجل لزبون آخر (${duplicate.name}).`
          : `Un client avec le numero "${phone}" existe deja (${duplicate.name}).`
      );
    }

    const newClient: Client = {
      id: makeId("client"),
      name,
      phone,
      createdAt: new Date().toISOString(),
      notes,
    };

    setClients((prev) => [newClient, ...prev]);
    return newClient;
  };

  const handleAddTransaction = (
    clientId: string,
    description: string,
    totalAmount: number,
    paidAmount: number
  ) => {
    const newTransaction: Transaction = {
      id: makeId("tx"),
      clientId,
      date: new Date().toISOString(),
      description,
      totalAmount,
      paidAmount,
      remainingBalance: calculateTransactionBalance({ totalAmount, paidAmount }),
    };

    setTransactions((prev) => [...prev, newTransaction]);
  };

  const handleAddRepayment = (clientId: string, amount: number, notes?: string) => {
    const newRepayment: Repayment = {
      id: makeId("repay"),
      clientId,
      date: new Date().toISOString(),
      amount,
      notes,
    };

    setRepayments((prev) => [...prev, newRepayment]);
  };

  const handleUpdateClient = (clientId: string, name: string, phone: string, notes?: string) => {
    setClients((prev) =>
      prev.map((c) => (c.id === clientId ? { ...c, name, phone, notes } : c))
    );
  };

  const handleDeleteClient = (clientId: string) => {
    setClients((prev) => prev.filter((c) => c.id !== clientId));
    setTransactions((prev) => prev.filter((t) => t.clientId !== clientId));
    setRepayments((prev) => prev.filter((r) => r.clientId !== clientId));
  };

  const handleDeleteTransaction = (transactionId: string) => {
    setTransactions((prev) => prev.filter((t) => t.id !== transactionId));
  };

  const handleDeleteRepayment = (repaymentId: string) => {
    setRepayments((prev) => prev.filter((r) => r.id !== repaymentId));
  };

  const handleRestoreData = (data: BackupData, merge: boolean = false) => {
    if (!merge) {
      setClients(data.clients);
      setTransactions(sanitizeTransactions(data.transactions));
      setRepayments(data.repayments);
      return;
    }

    setClients((prevClients) => {
      const merged = [...prevClients];
      for (const backupClient of data.clients) {
        const normBackupPhone = normalizePhone(backupClient.phone);
        const existingIndex = merged.findIndex(
          (c) => normalizePhone(c.phone) === normBackupPhone || c.id === backupClient.id
        );
        if (existingIndex > -1) {
          merged[existingIndex] = {
            ...merged[existingIndex],
            name: backupClient.name,
            notes: backupClient.notes || merged[existingIndex].notes,
          };
        } else {
          merged.push(backupClient);
        }
      }
      return merged;
    });

    setTransactions((prevTx) => {
      const merged = [...prevTx];
      for (const backupTx of data.transactions) {
        const existingIndex = merged.findIndex((t) => t.id === backupTx.id);
        if (existingIndex > -1) {
          merged[existingIndex] = backupTx;
        } else {
          merged.push(backupTx);
        }
      }
      return sanitizeTransactions(merged);
    });

    setRepayments((prevRepayments) => {
      const merged = [...prevRepayments];
      for (const backupRepay of data.repayments) {
        const existingIndex = merged.findIndex((r) => r.id === backupRepay.id);
        if (existingIndex > -1) {
          merged[existingIndex] = backupRepay;
        } else {
          merged.push(backupRepay);
        }
      }
      return merged;
    });
  };

  const handleClearAll = () => {
    setClients([]);
    setTransactions([]);
    setRepayments([]);
    localStorage.removeItem("livreur-dette-clients");
    localStorage.removeItem("livreur-dette-transactions");
    localStorage.removeItem("livreur-dette-repayments");
  };

  const currentDetailsClient = selectedClient
    ? clients.find((client) => client.id === selectedClient.id) || null
    : null;

  const isRtl = lang === "ar";

  if (!isAuthenticated) {
    return (
      <LoginScreen
        storedPin={pinCode}
        onLoginSuccess={() => setIsAuthenticated(true)}
        lang={lang}
        onLanguageChange={setLang}
        onSetPin={(newPin) => {
          const hashed = newPin ? hashPinSync(newPin) : null;
          setPinCode(hashed);
          if (!newPin) {
            setIsAuthenticated(true);
          }
        }}
      />
    );
  }

  return (
    <div className="bg-slate-100 min-h-screen flex justify-center selection:bg-amber-100 font-sans" dir={isRtl ? "rtl" : "ltr"}>
      <div className="w-full max-w-md min-h-screen bg-slate-50 flex flex-col relative shadow-xl border-x border-slate-200 pb-20 overflow-hidden">
        <Header currency={currency} setCurrency={setCurrency} lang={lang} setLang={setLang} />

        <main className={`p-4 flex-1 ${isRtl ? "text-right" : "text-left"}`}>
          {activeTab === "dashboard" && (
            <Dashboard
              clients={clients}
              transactions={transactions}
              repayments={repayments}
              currency={currency}
              onNavigate={setActiveTab}
              onSelectClient={setSelectedClient}
              lang={lang}
            />
          )}

          {activeTab === "clients" && (
            <ClientsList
              clients={clients}
              transactions={transactions}
              repayments={repayments}
              currency={currency}
              onAddClient={handleAddClient}
              onSelectClient={setSelectedClient}
              lang={lang}
            />
          )}

          {activeTab === "new" && (
            <NewTransactionForm
              clients={clients}
              onAddClient={handleAddClient}
              onAddTransaction={handleAddTransaction}
              currency={currency}
              onSuccess={() => {
                setActiveTab("dashboard");
              }}
              lang={lang}
            />
          )}

          {activeTab === "reports" && (
            <Reports
              clients={clients}
              transactions={transactions}
              repayments={repayments}
              currency={currency}
              onSelectClient={setSelectedClient}
              lang={lang}
            />
          )}

          {activeTab === "backup" && (
            <BackupSettings
              clients={clients}
              transactions={transactions}
              repayments={repayments}
              onRestore={handleRestoreData}
              onClearAll={handleClearAll}
              lang={lang}
              storedPin={pinCode}
              onSetPin={(newPin) => {
                const hashed = newPin ? hashPinSync(newPin) : null;
                setPinCode(hashed);
                if (!newPin) {
                  setIsAuthenticated(true);
                }
              }}
            />
          )}
        </main>

        <nav className={`fixed bottom-0 max-w-md w-full bg-white border-t border-slate-200 px-2 py-2 flex items-center justify-between z-40 shadow-lg ${isRtl ? "flex-row-reverse" : ""}`}>
          <button
            onClick={() => setActiveTab("dashboard")}
            id="nav-tab-dashboard"
            className={`flex-1 flex flex-col items-center justify-center space-y-1 py-1.5 px-1 rounded-xl transition cursor-pointer ${
              activeTab === "dashboard" ? "text-amber-500 font-bold" : "text-slate-400 hover:text-slate-650"
            }`}
          >
            <LayoutDashboard className="w-4.5 h-4.5 stroke-[2]" />
            <span className="text-[9.5px] leading-none transition-all">{t.dashboard}</span>
          </button>

          <button
            onClick={() => setActiveTab("clients")}
            id="nav-tab-clients"
            className={`flex-1 flex flex-col items-center justify-center space-y-1 py-1.5 px-1 rounded-xl transition cursor-pointer ${
              activeTab === "clients" ? "text-amber-500 font-bold" : "text-slate-400 hover:text-slate-650"
            }`}
          >
            <Users className="w-4.5 h-4.5 stroke-[2]" />
            <span className="text-[9.5px] leading-none transition-all">{t.clients}</span>
          </button>

          <button
            onClick={() => setActiveTab("new")}
            id="nav-tab-new-sale"
            className={`flex-1 flex flex-col items-center justify-center space-y-1 py-1.5 px-1 rounded-xl transition cursor-pointer ${
              activeTab === "new" ? "text-amber-500 font-bold" : "text-slate-400 hover:text-slate-655"
            }`}
          >
            <PlusCircle className="w-4.5 h-4.5 stroke-[2]" />
            <span className="text-[9.5px] leading-none transition-all">{t.bill}</span>
          </button>

          <button
            onClick={() => setActiveTab("reports")}
            id="nav-tab-reports"
            className={`flex-1 flex flex-col items-center justify-center space-y-1 py-1.5 px-1 rounded-xl transition cursor-pointer ${
              activeTab === "reports" ? "text-amber-500 font-bold" : "text-slate-400 hover:text-slate-655"
            }`}
          >
            <PieChart className="w-4.5 h-4.5 stroke-[2]" />
            <span className="text-[9.5px] leading-none transition-all">{t.reports}</span>
          </button>

          <button
            onClick={() => setActiveTab("backup")}
            id="nav-tab-backup"
            className={`flex-1 flex flex-col items-center justify-center space-y-1 py-1.5 px-1 rounded-xl transition cursor-pointer ${
              activeTab === "backup" ? "text-amber-500 font-bold" : "text-slate-400 hover:text-slate-655"
            }`}
          >
            <Database className="w-4.5 h-4.5 stroke-[2]" />
            <span className="text-[9.5px] leading-none transition-all">{t.backup}</span>
          </button>
        </nav>

        <AnimatePresence>
          {currentDetailsClient && (
            <ClientDetailsModal
              client={currentDetailsClient}
              onClose={() => setSelectedClient(null)}
              transactions={transactions}
              repayments={repayments}
              currency={currency}
              onAddRepayment={handleAddRepayment}
              onUpdateClient={handleUpdateClient}
              onDeleteClient={handleDeleteClient}
              onDeleteTransaction={handleDeleteTransaction}
              onDeleteRepayment={handleDeleteRepayment}
              lang={lang}
            />
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
