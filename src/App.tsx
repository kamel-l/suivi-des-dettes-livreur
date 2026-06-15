/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from "react";
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

// SEED INITIAL DATA (Used only on the very first visit to populate visual preview with Algerian theme)
const INITIAL_CLIENTS: Client[] = [
  {
    id: "seed-c1",
    name: "سفيان (محل بقالة باب الواد)",
    phone: "0551234567",
    createdAt: new Date(Date.now() - 3600 * 24 * 3 * 1000).toISOString(),
    notes: "مقابل ساحة باب الواد، الجزائر العاصمة",
  },
  {
    id: "seed-c2",
    name: "ياسين (تاجر جملة وهران)",
    phone: "0661987654",
    createdAt: new Date(Date.now() - 3600 * 24 * 5 * 1000).toISOString(),
    notes: "السوق المغطى، وسط المدينة وهران",
  },
];

const INITIAL_TRANSACTIONS: Transaction[] = [
  {
    id: "seed-t1",
    clientId: "seed-c1",
    date: new Date(Date.now() - 3600 * 24 * 2 * 1000).toISOString(),
    description: "مشروبات حمود بوعلام ومياه معدنية",
    totalAmount: 18500,
    paidAmount: 5000,
    remainingBalance: 13500,
  },
  {
    id: "seed-t2",
    clientId: "seed-c2",
    date: new Date(Date.now() - 3600 * 24 * 4 * 1000).toISOString(),
    description: "أكياس سمولينة وفرينة نوعية ممتازة",
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
    notes: "تسديد جزئي - كاش نقداً كود حمود",
  },
  {
    id: "seed-r2",
    clientId: "seed-c2",
    date: new Date(Date.now() - 3600 * 24 * 2 * 1000).toISOString(),
    amount: 15000,
    notes: "تسديد عبر تطبيق بريدي موب BaridiMob",
  },
];

export default function App() {
  // Multilingual Configuration with persistent Preference
  const [lang, setLang] = useState<Language>(() => {
    return (localStorage.getItem("livreur-dette-lang") as Language) || "ar";
  });

  const t = translations[lang];

  // Low-retrigger LocalStorage State Hydration
  const [clients, setClients] = useState<Client[]>(() => {
    const raw = localStorage.getItem("livreur-dette-clients");
    return raw ? JSON.parse(raw) : INITIAL_CLIENTS;
  });

  const [transactions, setTransactions] = useState<Transaction[]>(() => {
    const raw = localStorage.getItem("livreur-dette-transactions");
    return raw ? JSON.parse(raw) : INITIAL_TRANSACTIONS;
  });

  const [repayments, setRepayments] = useState<Repayment[]>(() => {
    const raw = localStorage.getItem("livreur-dette-repayments");
    return raw ? JSON.parse(raw) : INITIAL_REPAYMENTS;
  });

  const [currency, setCurrency] = useState<string>(() => {
    return localStorage.getItem("livreur-dette-currency") || "DA";
  });

  const [reminderOffsetDays, setReminderOffsetDays] = useState<number>(() => {
    const val = localStorage.getItem("livreur-dette-reminder-offset");
    return val ? parseInt(val, 10) : 2;
  });

  const [defaultDueOffsetDays, setDefaultDueOffsetDays] = useState<number>(() => {
    const val = localStorage.getItem("livreur-dette-default-due-offset");
    return val ? parseInt(val, 10) : 7;
  });

  const [activeTab, setActiveTab] = useState<string>("dashboard");
  const [selectedClient, setSelectedClient] = useState<Client | null>(null);

  // Secure Local Credentials states (Username and Password)
  const [secureUser, setSecureUser] = useState<string | null>(() => {
    return localStorage.getItem("livreur-dette-username");
  });
  const [securePass, setSecurePass] = useState<string | null>(() => {
    return localStorage.getItem("livreur-dette-password");
  });
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(() => {
    const user = localStorage.getItem("livreur-dette-username");
    const pass = localStorage.getItem("livreur-dette-password");
    return !(user && pass);
  });

  // Synchronizers of credentials state with LocalStorage
  useEffect(() => {
    if (secureUser === null) {
      localStorage.removeItem("livreur-dette-username");
    } else {
      localStorage.setItem("livreur-dette-username", secureUser);
    }
  }, [secureUser]);

  useEffect(() => {
    if (securePass === null) {
      localStorage.removeItem("livreur-dette-password");
    } else {
      localStorage.setItem("livreur-dette-password", securePass);
    }
  }, [securePass]);

  useEffect(() => {
    localStorage.setItem("livreur-dette-clients", JSON.stringify(clients));
  }, [clients]);

  useEffect(() => {
    localStorage.setItem("livreur-dette-transactions", JSON.stringify(transactions));
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

  useEffect(() => {
    localStorage.setItem("livreur-dette-reminder-offset", reminderOffsetDays.toString());
  }, [reminderOffsetDays]);

  useEffect(() => {
    localStorage.setItem("livreur-dette-default-due-offset", defaultDueOffsetDays.toString());
  }, [defaultDueOffsetDays]);

  // Action Handlers
  const handleAddClient = (name: string, phone: string, notes?: string): Client => {
    // Check if duplicate phone exists
    const trimmedPhone = phone.replace(/\s+/g, "");
    const duplicate = clients.find(
      (c) => c.phone.replace(/\s+/g, "") === trimmedPhone
    );
    if (duplicate) {
      throw new Error(
        lang === "ar"
          ? `رقم الهاتف هذا مكرر ومسجل لزبون آخر للتو (${duplicate.name}).`
          : `Un client avec le numéro "${phone}" existe déjà (${duplicate.name}).`
      );
    }

    const newClient: Client = {
      id: "client-" + Math.random().toString(36).substr(2, 9),
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
    paidAmount: number,
    dueDate?: string
  ) => {
    const newTransaction: Transaction = {
      id: "tx-" + Math.random().toString(36).substr(2, 9),
      clientId,
      date: new Date().toISOString(),
      description,
      totalAmount,
      paidAmount,
      remainingBalance: totalAmount - paidAmount,
      dueDate,
    };

    setTransactions((prev) => [...prev, newTransaction]);
  };

  const handleAddRepayment = (clientId: string, amount: number, notes?: string) => {
    const newRepayment: Repayment = {
      id: "repay-" + Math.random().toString(36).substr(2, 9),
      clientId,
      date: new Date().toISOString(),
      amount,
      notes,
    };

    setRepayments((prev) => [...prev, newRepayment]);
  };

  // Import / Restore Handlers
  const handleRestoreData = (data: BackupData) => {
    setClients(data.clients);
    setTransactions(data.transactions);
    setRepayments(data.repayments);
  };

  // Erase All Data handler
  const handleClearAll = () => {
    setClients([]);
    setTransactions([]);
    setRepayments([]);
    localStorage.removeItem("livreur-dette-clients");
    localStorage.removeItem("livreur-dette-transactions");
    localStorage.removeItem("livreur-dette-repayments");
  };

  // Sync details modal client state to keep math updated after repayments
  const currentDetailsClient = selectedClient
    ? clients.find((c) => c.id === selectedClient.id) || null
    : null;

  const isRtl = lang === "ar";

  if (!isAuthenticated) {
    return (
      <LoginScreen
        storedUser={secureUser}
        storedPass={securePass}
        onLoginSuccess={() => setIsAuthenticated(true)}
        lang={lang}
        onLanguageChange={setLang}
        onSetCredentials={(user, pass) => {
          setSecureUser(user);
          setSecurePass(pass);
          if (!user || !pass) {
            setIsAuthenticated(true);
          }
        }}
      />
    );
  }

  return (
    <div className={`bg-slate-100 min-h-screen flex justify-center selection:bg-amber-100 font-sans`} dir={isRtl ? "rtl" : "ltr"}>
      {/* Container simulating high-fidelity smartphone / mobile device UI layout */}
      <div className="w-full max-w-md min-h-screen bg-slate-50 flex flex-col relative shadow-xl border-x border-slate-200 pb-20 overflow-hidden">
        {/* Customized Native Header */}
        <Header currency={currency} setCurrency={setCurrency} lang={lang} setLang={setLang} />

        {/* Dynamic Nav Body content */}
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
              reminderOffsetDays={reminderOffsetDays}
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
              defaultDueOffsetDays={defaultDueOffsetDays}
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
              storedUser={secureUser}
              storedPass={securePass}
              onSetCredentials={(user, pass) => {
                setSecureUser(user);
                setSecurePass(pass);
                if (!user || !pass) {
                  setIsAuthenticated(true);
                }
              }}
              reminderOffsetDays={reminderOffsetDays}
              setReminderOffsetDays={setReminderOffsetDays}
              defaultDueOffsetDays={defaultDueOffsetDays}
              setDefaultDueOffsetDays={setDefaultDueOffsetDays}
            />
          )}
        </main>

        {/* Sleek Floating Bottom Navigation Bar aligned with RTL layout support */}
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

        {/* Client details modal sliding overlays */}
        <AnimatePresence>
          {currentDetailsClient && (
            <ClientDetailsModal
              client={currentDetailsClient}
              onClose={() => setSelectedClient(null)}
              transactions={transactions}
              repayments={repayments}
              currency={currency}
              onAddRepayment={handleAddRepayment}
              lang={lang}
            />
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
