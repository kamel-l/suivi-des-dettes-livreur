/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useMemo, useRef, useCallback } from "react";
import { Client, Transaction, Repayment } from "../types";
import {
  formatCurrency,
  formatDate,
  getClientStats,
  generateWhatsAppLink,
  getTransactionsWithBalancesForClient,
  normalizePhone,
} from "../utils";
import {
  X,
  Phone,
  Calendar,
  DollarSign,
  MessageSquare,
  TrendingDown,
  Edit,
  Save,
  XCircle,
  User,
} from "lucide-react";
import { motion } from "motion/react";
import { Language, translations } from "../translations";

interface ClientDetailsModalProps {
  client: Client | null;
  onClose: () => void;
  transactions: Transaction[];
  repayments: Repayment[];
  currency: string;
  onAddRepayment: (clientId: string, amount: number, notes?: string) => void;
  onUpdateClient?: (clientId: string, updates: Partial<Client>) => void;
  onDeleteClientData?: (clientId: string) => void;
  lang: Language;
  allClients?: Client[];
}

// Sous‑composant Remboursement
const RepaymentForm: React.FC<{
  clientId: string;
  maxAmount: number;
  currency: string;
  onAddRepayment: (clientId: string, amount: number, notes?: string) => void;
  lang: Language;
  onSuccess: () => void;
}> = ({ clientId, maxAmount, currency, onAddRepayment, lang, onSuccess }) => {
  const t = translations[lang];
  const isRtl = lang === "ar";

  const [amount, setAmount] = useState<string>("");
  const [notes, setNotes] = useState<string>("");
  const [error, setError] = useState<string>("");
  const [success, setSuccess] = useState<boolean>(false);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSuccess(false);

    const numericAmount = parseFloat(amount);
    if (isNaN(numericAmount) || numericAmount <= 0) {
      setError(
        lang === "ar"
          ? "الرجاء إدخال مبلغ أكبر من 0."
          : "Veuillez saisir un montant supérieur à 0."
      );
      return;
    }
    if (numericAmount > maxAmount) {
      setError(
        lang === "ar"
          ? `المبلغ المُدخل أكبر من الديون الحالية (${formatCurrency(maxAmount, currency)})`
          : `Le montant saisi (${formatCurrency(
              numericAmount,
              currency
            )}) est supérieur à la dette actuelle (${formatCurrency(
              maxAmount,
              currency
            )}).`
      );
      return;
    }

    setIsSubmitting(true);
    try {
      onAddRepayment(clientId, numericAmount, notes.trim() || undefined);
      setSuccess(true);
      setAmount("");
      setNotes("");
      onSuccess();
    } catch (err) {
      setError(
        lang === "ar"
          ? "Erreur lors de l'enregistrement."
          : "Erreur lors de l'enregistrement."
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, height: 0 }}
      animate={{ opacity: 1, height: "auto" }}
      className="bg-emerald-50/70 border border-emerald-200 p-4 rounded-2xl space-y-3"
    >
      <h4
        className={`text-xs font-bold uppercase text-emerald-700 flex items-center ${
          isRtl ? "space-x-reverse" : ""
        } space-x-1`}
      >
        <TrendingDown className="w-4 h-4 text-emerald-600" />
        <span>{t.recordRepayment}</span>
      </h4>

      <form onSubmit={handleSubmit} className="space-y-3">
        <div className="grid grid-cols-1 gap-2.5">
          <div className="relative">
            <input
              id="repayment-amount-input"
              type="number"
              inputMode="numeric"
              placeholder={
                lang === "ar"
                  ? `مبلغ التسديد (الأقصى: ${formatCurrency(maxAmount, currency)})`
                  : `Montant du versement (Max: ${formatCurrency(
                      maxAmount,
                      currency
                    )})`
              }
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              disabled={isSubmitting}
              className={`w-full bg-white border border-emerald-200 rounded-xl py-2 text-xs font-bold font-mono text-slate-700 outline-none focus:ring-2 focus:ring-emerald-300 ${
                isRtl ? "pl-12 pr-3" : "pr-12 pl-3"
              }`}
              aria-label={t.recordRepayment}
            />
            <span
              className={`absolute inset-y-0 ${
                isRtl ? "left-3.5" : "right-3.5"
              } flex items-center text-xs font-bold text-slate-400 font-mono`}
            >
              {currency}
            </span>
          </div>
          <div>
            <input
              id="repayment-notes-input"
              type="text"
              placeholder={t.repaymentNotesPlaceholder}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              disabled={isSubmitting}
              className="w-full bg-white border border-emerald-100 rounded-xl py-1.5 px-3 text-xs outline-none focus:ring-2 focus:ring-emerald-300"
              aria-label={t.repaymentNotesPlaceholder}
            />
          </div>
        </div>

        {error && (
          <p id="repay-error-msg" className="text-[11px] text-rose-500 font-semibold">
            {error}
          </p>
        )}
        {success && (
          <p
            id="repay-success-msg"
            className="text-[11px] text-emerald-600 font-semibold bg-emerald-100 p-2 rounded-xl"
          >
            {lang === "ar"
              ? "تم تسجيل الدفعة بنجاح ! 🎉"
              : "Versement enregistré avec succès ! 🎉"}
          </p>
        )}

        <button
          type="submit"
          id="submit-repayment-btn"
          disabled={isSubmitting}
          className="w-full bg-emerald-500 hover:bg-emerald-600 text-white font-bold text-xs py-2 rounded-xl transition disabled:opacity-50"
        >
          {isSubmitting
            ? lang === "ar"
              ? "جاري التسجيل..."
              : "En cours..."
            : t.confirmRepayment}
        </button>
      </form>
    </motion.div>
  );
};

// Composant principal
export default function ClientDetailsModal({
  client,
  onClose,
  transactions,
  repayments,
  currency,
  onAddRepayment,
  onUpdateClient,
  lang,
  allClients = [],
}: ClientDetailsModalProps) {
  if (!client) return null;

  const t = translations[lang];
  const isRtl = lang === "ar";

  // États d'édition
  const [isEditing, setIsEditing] = useState<boolean>(false);
  const [editName, setEditName] = useState<string>(client.name);
  const [editPhone, setEditPhone] = useState<string>(client.phone);
  const [editNotes, setEditNotes] = useState<string>(client.notes || "");
  const [editError, setEditError] = useState<string>("");
  const [editSuccess, setEditSuccess] = useState<boolean>(false);
  const [isSubmittingEdit, setIsSubmittingEdit] = useState<boolean>(false);

  const [showRepayForm, setShowRepayForm] = useState<boolean>(false);
  const [repaymentSuccess, setRepaymentSuccess] = useState<boolean>(false);

  const modalRef = useRef<HTMLDivElement>(null);

  const stats = useMemo(
    () => getClientStats(client, transactions, repayments),
    [client, transactions, repayments]
  );

  const clientTransactions = useMemo(
    () => transactions.filter((t) => t.clientId === client.id),
    [transactions, client.id]
  );

  const clientRepayments = useMemo(
    () => repayments.filter((r) => r.clientId === client.id),
    [repayments, client.id]
  );

  const transactionsWithBalances = useMemo(
    () => getTransactionsWithBalancesForClient(clientTransactions, clientRepayments),
    [clientTransactions, clientRepayments]
  );

  const historyItems = useMemo(() => {
    const items = [
      ...transactionsWithBalances.map((t) => ({
        type: "sale" as const,
        id: t.id,
        date: t.date,
        dueDate: t.dueDate,
        title: t.description || (lang === "ar" ? "توصيل" : "Livraison"),
        primaryValue: t.totalAmount,
        secondaryValue: t.paidAmount,
        balance: t.allocatedRemainingBalance,
      })),
      ...clientRepayments.map((r) => ({
        type: "payment" as const,
        id: r.id,
        date: r.date,
        dueDate: undefined,
        title: r.notes || (lang === "ar" ? "رصيد مسترجع" : "Règlement reçu"),
        primaryValue: r.amount,
        secondaryValue: 0,
        balance: 0,
      })),
    ];
    return items.sort(
      (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
    );
  }, [transactionsWithBalances, clientRepayments, lang]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        if (isEditing) cancelEdit();
        else onClose();
      }
    };
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [isEditing, onClose]);

  useEffect(() => {
    if (modalRef.current) modalRef.current.focus();
  }, []);

  useEffect(() => {
    if (client) {
      setEditName(client.name);
      setEditPhone(client.phone);
      setEditNotes(client.notes || "");
    }
  }, [client]);

  const cancelEdit = () => {
    setIsEditing(false);
    setEditError("");
    setEditSuccess(false);
    if (client) {
      setEditName(client.name);
      setEditPhone(client.phone);
      setEditNotes(client.notes || "");
    }
  };

  const handleEditSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setEditError("");
    setEditSuccess(false);

    const trimmedName = editName.trim();
    const trimmedPhone = editPhone.trim();
    const normalizedPhone = normalizePhone(trimmedPhone);

    if (!trimmedName) {
      setEditError(lang === "ar" ? "الاسم مطلوب." : "Le nom est obligatoire.");
      return;
    }
    if (!trimmedPhone) {
      setEditError(
        lang === "ar" ? "رقم الهاتف مطلوب." : "Le numéro de téléphone est obligatoire."
      );
      return;
    }

    const phoneExists = allClients.some(
      (c) => c.id !== client.id && normalizePhone(c.phone) === normalizedPhone
    );
    if (phoneExists) {
      setEditError(
        lang === "ar"
          ? "هذا الرقم مستخدم من قبل زبون آخر."
          : "Ce numéro est déjà utilisé par un autre client."
      );
      return;
    }

    setIsSubmittingEdit(true);
    try {
      if (onUpdateClient) {
        onUpdateClient(client.id, {
          name: trimmedName,
          phone: trimmedPhone,
          notes: editNotes.trim() || undefined,
        });
        setEditSuccess(true);
        setTimeout(() => {
          setIsEditing(false);
          setEditSuccess(false);
        }, 1200);
      } else {
        setEditError(
          lang === "ar"
            ? "La mise à jour n'est pas disponible."
            : "La mise à jour n'est pas disponible."
        );
      }
    } catch (err: any) {
      setEditError(err.message || "Erreur de mise à jour.");
    } finally {
      setIsSubmittingEdit(false);
    }
  };

  const handleRepaymentSuccess = useCallback(() => {
    setRepaymentSuccess(true);
    setTimeout(() => {
      setShowRepayForm(false);
      setRepaymentSuccess(false);
    }, 1200);
  }, []);

  const getWhatsAppMessage = useCallback(() => {
    if (lang === "ar") {
      return `السلام عليكم ${client.name}، تذكير محترم بخصوص تسيير طلبيات التوصيل، المبلغ المتبقي (رصيد ديونكم) هو ${formatCurrency(
        stats.debt,
        currency
      )}. إذا كنتم تودون تسديد المبلغ أو جزء منه عبر الدفع كاش أو BaridiMob، يرجى التواصل معي. يومك طيب وسعيد !`;
    }
    return `Bonjour ${client.name}, pour rappel concernant notre suivi de livraison, le reste à payer (solde de vos dettes) s'élève à ${formatCurrency(
      stats.debt,
      currency
    )}. Si vous souhaitez faire un versement de régularisation, merci de me contacter. Excellente journée !`;
  }, [client, stats.debt, currency, lang]);

  const whatsappUrl = generateWhatsAppLink(
    normalizePhone(client.phone),
    getWhatsAppMessage()
  );

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-slate-900/50 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-labelledby="client-detail-title"
    >
      <div className="absolute inset-0" onClick={onClose} aria-hidden="true" />

      <motion.div
        ref={modalRef}
        id={`client-detail-view-${client.id}`}
        initial={{ y: "100%", opacity: 0.5 }}
        animate={{ y: 0, opacity: 1 }}
        exit={{ y: "100%", opacity: 0 }}
        transition={{ type: "spring", damping: 25, stiffness: 300 }}
        className="relative bg-white w-full sm:max-w-md max-h-[92vh] sm:max-h-[85vh] rounded-t-3xl sm:rounded-3xl shadow-2xl flex flex-col overflow-hidden z-10 outline-none"
        dir={isRtl ? "rtl" : "ltr"}
        tabIndex={-1}
      >
        <div className="mx-auto w-12 h-1 bg-slate-200 rounded-full my-3 block sm:hidden" aria-hidden="true" />

        {/* En‑tête */}
        <div
          className={`px-5 pb-3 pt-2 sm:pt-4 flex items-start justify-between border-b border-slate-100 ${
            isRtl ? "text-right" : "text-left"
          }`}
        >
          <div className="flex-1">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
              {t.clientFile}
            </span>
            {!isEditing ? (
              <>
                <h3
                  id="client-detail-title"
                  className="text-lg font-bold text-slate-800 leading-tight"
                >
                  {client.name}
                </h3>
                <div
                  className={`flex items-center ${
                    isRtl ? "space-x-reverse" : ""
                  } space-x-1 mt-0.5`}
                >
                  <Phone className="w-3 h-3 text-slate-400" aria-hidden="true" />
                  <span className="text-xs font-semibold text-slate-500 font-mono">
                    {client.phone}
                  </span>
                </div>
                {client.notes && (
                  <p className="text-[10px] text-slate-500 mt-1 italic">
                    📝 {client.notes}
                  </p>
                )}
              </>
            ) : (
              <form onSubmit={handleEditSubmit} className="space-y-2 mt-1">
                <div className="space-y-1.5">
                  <div>
                    <label htmlFor="edit-name" className="text-[10px] font-bold text-slate-500">
                      {lang === "ar" ? "الاسم" : "Nom"} <span className="text-rose-400">*</span>
                    </label>
                    <input
                      id="edit-name"
                      type="text"
                      value={editName}
                      onChange={(e) => setEditName(e.target.value)}
                      disabled={isSubmittingEdit}
                      className="w-full bg-white border border-slate-200 rounded-xl py-1.5 px-3 text-xs outline-none focus:ring-2 focus:ring-indigo-300"
                    />
                  </div>
                  <div>
                    <label htmlFor="edit-phone" className="text-[10px] font-bold text-slate-500">
                      {lang === "ar" ? "الهاتف" : "Téléphone"} <span className="text-rose-400">*</span>
                    </label>
                    <input
                      id="edit-phone"
                      type="tel"
                      value={editPhone}
                      onChange={(e) => setEditPhone(e.target.value)}
                      disabled={isSubmittingEdit}
                      className="w-full bg-white border border-slate-200 rounded-xl py-1.5 px-3 text-xs outline-none focus:ring-2 focus:ring-indigo-300"
                    />
                  </div>
                  <div>
                    <label htmlFor="edit-notes" className="text-[10px] font-bold text-slate-500">
                      {t.notesOptional}
                    </label>
                    <input
                      id="edit-notes"
                      type="text"
                      value={editNotes}
                      onChange={(e) => setEditNotes(e.target.value)}
                      disabled={isSubmittingEdit}
                      placeholder={t.notesPlaceholder}
                      className="w-full bg-white border border-slate-200 rounded-xl py-1.5 px-3 text-xs outline-none focus:ring-2 focus:ring-indigo-300"
                    />
                  </div>
                </div>
                {editError && (
                  <p className="text-[11px] text-rose-500 font-semibold">{editError}</p>
                )}
                {editSuccess && (
                  <p className="text-[11px] text-emerald-600 font-semibold">
                    {lang === "ar" ? "✅ تم التحديث بنجاح !" : "✅ Mis à jour avec succès !"}
                  </p>
                )}
                <div className="flex items-center space-x-2">
                  <button
                    type="submit"
                    disabled={isSubmittingEdit}
                    className="bg-indigo-500 hover:bg-indigo-600 text-white font-bold text-xs py-1.5 px-3 rounded-xl flex items-center space-x-1 transition disabled:opacity-50"
                  >
                    <Save className="w-4 h-4" />
                    <span>{isSubmittingEdit ? (lang === "ar" ? "جاري..." : "En cours...") : t.save}</span>
                  </button>
                  <button
                    type="button"
                    onClick={cancelEdit}
                    disabled={isSubmittingEdit}
                    className="bg-slate-200 hover:bg-slate-300 text-slate-700 font-bold text-xs py-1.5 px-3 rounded-xl flex items-center space-x-1 transition"
                  >
                    <XCircle className="w-4 h-4" />
                    <span>{t.cancel}</span>
                  </button>
                </div>
              </form>
            )}
          </div>

          <div className="flex items-center space-x-1">
            {!isEditing && onUpdateClient && (
              <button
                onClick={() => setIsEditing(true)}
                className="p-1 rounded-full text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition"
                aria-label={t.edit}
              >
                <Edit className="w-5 h-5" />
              </button>
            )}
            <button
              onClick={onClose}
              id="close-details-modal-btn"
              className="p-1 rounded-full text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition"
              aria-label={t.close}
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Contenu défilant */}
        <div className="flex-1 overflow-y-auto p-5 space-y-5 text-left">
          {/* Résumé dette */}
          <div className="bg-gradient-to-br from-indigo-500 to-blue-600 text-white rounded-2xl p-4 text-center">
            <span className="text-[10px] text-indigo-200 font-bold uppercase tracking-wider">
              {t.dueBalance}
            </span>
            <p
              id="detail-outstanding-debt-display"
              className={`text-2xl font-extrabold font-mono mt-1 ${
                stats.debt > 0 ? "text-amber-200 animate-pulse-slow" : "text-emerald-200"
              }`}
            >
              {formatCurrency(stats.debt, currency)}
            </p>

            <div className="grid grid-cols-2 gap-2 mt-4 pt-3.5 border-t border-indigo-400/20 text-left">
              <div>
                <span className="block text-[9px] text-indigo-200 uppercase">{t.totalDelivered}</span>
                <span className="text-xs font-bold font-mono text-white">
                  {formatCurrency(stats.totalDelivered, currency)}
                </span>
              </div>
              <div>
                <span className="block text-[9px] text-indigo-200 uppercase">{t.recovered}</span>
                <span className="text-xs font-bold font-mono text-white">
                  {formatCurrency(stats.totalPaid, currency)}
                </span>
              </div>
            </div>
          </div>

          {/* Actions rapides */}
          <div className={`grid grid-cols-2 gap-2.5 ${isRtl ? "space-x-reverse" : ""}`}>
            {stats.debt > 0 ? (
              <button
                id="record-repayment-drawer-btn"
                onClick={() => setShowRepayForm(!showRepayForm)}
                className="flex items-center justify-center space-x-1.5 bg-emerald-500 hover:bg-emerald-600 text-white font-bold text-xs py-2.5 px-3 rounded-xl transition"
                aria-label={t.repayDebt}
              >
                <DollarSign className="w-4 h-4 text-emerald-200" />
                <span>{t.repayDebt}</span>
              </button>
            ) : (
              <div className="bg-emerald-50 text-emerald-700 text-[11px] font-semibold py-2.5 px-3 rounded-xl flex items-center justify-center border border-emerald-200">
                <span>{lang === "ar" ? "✅ الحساب خالص ومسدد !" : "✅ Client en règle !"}</span>
              </div>
            )}

            <a
              href={whatsappUrl}
              target="_blank"
              rel="noreferrer"
              id="send-whatsapp-reminder-btn"
              className="flex items-center justify-center space-x-1.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs py-2.5 px-3 rounded-xl transition text-center"
              aria-label={t.whatsappReminder}
            >
              <MessageSquare className="w-4 h-4 text-indigo-200" />
              <span>{t.whatsappReminder}</span>
            </a>
          </div>

          {showRepayForm && (
            <RepaymentForm
              clientId={client.id}
              maxAmount={stats.debt}
              currency={currency}
              onAddRepayment={onAddRepayment}
              lang={lang}
              onSuccess={handleRepaymentSuccess}
            />
          )}

          {/* Historique */}
          <div className="space-y-3">
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500">{t.historyTimeline}</h4>
            {historyItems.length === 0 ? (
              <p className="text-xs text-slate-400 italic text-center py-4 bg-slate-50 rounded-2xl">{t.noTransactionsYet}</p>
            ) : (
              <div className={`relative ${isRtl ? "pr-4 border-r-2" : "pl-4 border-l-2"} border-slate-100 space-y-4`}>
                {historyItems.map((item) => (
                  <div key={item.id} className="relative group/item text-left">
                    <div
                      className={`absolute ${
                        isRtl ? "-right-[21px]" : "-left-[21px]"
                      } top-1 w-2.5 h-2.5 rounded-full border-2 border-white ${
                        item.type === "sale" ? "bg-amber-400" : "bg-emerald-400"
                      }`}
                      aria-hidden="true"
                    />
                    <div className="space-y-1">
                      <div className="flex items-center justify-between text-[10px] text-slate-400">
                        <span className={`flex items-center ${isRtl ? "space-x-reverse" : ""} space-x-1 font-mono font-medium`}>
                          <Calendar className="w-3 h-3" aria-hidden="true" />
                          <span>{formatDate(item.date)}</span>
                        </span>
                        <span>{item.type === "sale" ? t.delivered : t.repaymentReceived}</span>
                      </div>
                      <div className="flex items-start justify-between">
                        <div>
                          <p className="text-xs font-bold text-slate-800 leading-tight">{item.title}</p>
                          {item.type === "sale" && (
                            <div className="text-[10px] text-slate-500 font-mono space-y-0.5 mt-0.5">
                              <div>
                                {lang === "ar" ? "تم توصيل:" : "Livré:"}{" "}
                                {formatCurrency(item.primaryValue, currency)} |{" "}
                                {lang === "ar" ? "التسبيق:" : "Acompte:"}{" "}
                                {formatCurrency(item.secondaryValue, currency)}
                              </div>
                              {item.dueDate && (
                                <div className="text-slate-400">
                                  📅 {t.dueDate} : {formatDate(item.dueDate)}
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                        <div className="text-right">
                          <span
                            className={`text-xs font-bold font-mono ${
                              item.type === "sale" ? "text-slate-700" : "text-emerald-600"
                            }`}
                          >
                            {item.type === "sale" ? "+" : "-"}
                            {formatCurrency(item.primaryValue, currency)}
                          </span>
                          {item.type === "sale" && (
                            <span
                              className={`block text-[9px] font-mono font-semibold ${
                                item.balance > 0 ? "text-rose-500" : "text-emerald-500"
                              }`}
                            >
                              {item.balance > 0
                                ? `${lang === "ar" ? "دين:" : "Dette:"} ${formatCurrency(
                                    item.balance,
                                    currency
                                  )}`
                                : `✅ ${lang === "ar" ? "خالص" : "Payé"}`}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </motion.div>
    </div>
  );
}