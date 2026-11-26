/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useMemo, useRef, useState } from "react";
import { Product } from "../types";
import { Check, Database, Edit2, Trash2, X } from "lucide-react";
import { translations } from "../translations";
import { formatCurrency } from "../utils";

interface Props {
  products: Product[];
  onAddProduct: (name: string, price: number) => Product;
  onUpdateProduct: (id: string, updates: { name?: string; price?: number }) => void;
  onDeleteProduct: (id: string) => void;
  lang: "fr" | "ar";
  currency: string;
}

function parseCSVLine(line: string): string[] {
  const result: string[] = [];
  let cur = "";
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') {
      if (inQuotes && line[i + 1] === '"') {
        cur += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (ch === "," && !inQuotes) {
      result.push(cur);
      cur = "";
    } else {
      cur += ch;
    }
  }
  result.push(cur);
  return result;
}

function exportCSV(products: Product[]) {
  const header = ["id", "name", "price", "createdAt"];
  const rows = products.map((p) => [p.id, p.name.replace(/"/g, '""'), String(p.price), p.createdAt]);
  const csv = [header.join(","), ...rows.map((r) => r.map((cell) => `"${cell}"`).join(","))].join("\n");

  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);

  const a = document.createElement("a");
  a.href = url;
  a.download = `products_${new Date().toISOString().split("T")[0]}.csv`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

function filteredAndSortedProducts(
  products: Product[],
  query: string,
  sortBy: "nameAsc" | "nameDesc" | "priceAsc" | "priceDesc"
) {
  const q = (query || "").trim().toLowerCase();
  let list = products.slice();

  if (q) list = list.filter((p) => p.name.toLowerCase().includes(q));

  switch (sortBy) {
    case "nameAsc":
      list.sort((a, b) => a.name.localeCompare(b.name));
      break;
    case "nameDesc":
      list.sort((a, b) => b.name.localeCompare(a.name));
      break;
    case "priceAsc":
      list.sort((a, b) => a.price - b.price);
      break;
    case "priceDesc":
      list.sort((a, b) => b.price - a.price);
      break;
  }

  return list;
}

export default function ProductsCatalog({
  products,
  onAddProduct,
  onUpdateProduct,
  onDeleteProduct,
  lang,
  currency,
}: Props) {
  const t = translations[lang];
  const isRtl = lang === "ar";

  const [newName, setNewName] = useState("");
  const [newPrice, setNewPrice] = useState("");

  const [searchQuery, setSearchQuery] = useState("");
  const [sortBy, setSortBy] = useState<"nameAsc" | "nameDesc" | "priceAsc" | "priceDesc">("nameAsc");

  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");
  const [editPrice, setEditPrice] = useState("");

  const [msg, setMsg] = useState("");
  const [toast, setToast] = useState<{ message: string; type?: "success" | "error" } | null>(null);

  const [page, setPage] = useState(1);
  const pageSize = 8;

  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const [importPreview, setImportPreview] = useState<string[][] | null>(null);
  const [importHeader, setImportHeader] = useState<string[] | null>(null);
  const [mapNameCol, setMapNameCol] = useState(0);
  const [mapPriceCol, setMapPriceCol] = useState(1);

  const [deleteTarget, setDeleteTarget] = useState<Product | null>(null);

  const showToastLocal = (message: string, type: "success" | "error" = "success") => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  };

  const performImportFromPreview = () => {
    if (!importPreview) return;

    let added = 0;
    let errors = 0;

    for (const cols of importPreview) {
      const name = (cols[mapNameCol] || "").trim();
      const rawPrice = (cols[mapPriceCol] || "").replace(/[^0-9.\-]/g, "");
      const price = parseFloat(rawPrice || "0");

      if (name && Number.isFinite(price) && price > 0) {
        try {
          onAddProduct(name, price);
          added++;
        } catch {
          errors++;
        }
      } else {
        errors++;
      }
    }

    if (added > 0) {
      showToastLocal(
        lang === "ar"
          ? `تم استيراد ${added} منتج${errors ? ` (${errors} échec${errors > 1 ? "s" : ""})` : ""}`
          : `${added} product(s) imported${errors ? ` (${errors} failed)` : ""}`,
        "success"
      );
    } else {
      showToastLocal(lang === "ar" ? "لم يتم استيراد أي منتج." : "No products imported.", "error");
    }

    setImportPreview(null);
    setImportHeader(null);
  };

  const handleAdd = () => {
    setMsg("");

    const name = newName.trim();
    const price = parseFloat(newPrice || "0");

    if (!name) {
      setMsg(lang === "ar" ? "اسم المنتج مطلوب" : "Le nom du produit est requis");
      return;
    }
    if (!Number.isFinite(price) || price <= 0) {
      setMsg(lang === "ar" ? "السعر يجب أن يكون أكبر من 0" : "Le prix doit être supérieur à 0");
      return;
    }

    try {
      onAddProduct(name, price);
      setNewName("");
      setNewPrice("");

      const addedMsg = lang === "ar" ? "تمت إضافة المنتج" : "Produit ajouté";
      setMsg(addedMsg);
      showToastLocal(addedMsg, "success");
      setTimeout(() => setMsg(""), 2000);
    } catch (e: any) {
      setMsg(e?.message || (lang === "ar" ? "خطأ" : "Erreur"));
    }
  };

  const startEdit = (p: Product) => {
    setEditingId(p.id);
    setEditName(p.name);
    setEditPrice(String(p.price));
    setMsg("");
  };

  const confirmEdit = () => {
    if (!editingId) return;

    const name = editName.trim();
    const price = parseFloat(editPrice || "0");

    if (!name) {
      setMsg(lang === "ar" ? "اسم المنتج مطلوب" : "Le nom du produit est requis");
      return;
    }
    if (!Number.isFinite(price) || price <= 0) {
      setMsg(lang === "ar" ? "السعر يجب أن يكون أكبر من 0" : "Le prix doit être supérieur à 0");
      return;
    }

    onUpdateProduct(editingId, { name, price });
    setEditingId(null);

    const upMsg = lang === "ar" ? "تم تحديث المنتج" : "Produit mis à jour";
    setMsg(upMsg);
    showToastLocal(upMsg, "success");
    setTimeout(() => setMsg(""), 2000);
  };

  const confirmDelete = () => {
    if (!deleteTarget) return;
    onDeleteProduct(deleteTarget.id);
    setDeleteTarget(null);

    const delMsg = lang === "ar" ? "تم حذف المنتج" : "Produit supprimé";
    showToastLocal(delMsg, "success");
  };

  const handleImportCSVInternal = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = () => {
      const text = String(reader.result || "");
      const lines = text.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);

      if (lines.length === 0) {
        showToastLocal(lang === "ar" ? "لم يتم العثور على منتجات في CSV." : "No products found in CSV.", "error");
        return;
      }

      const firstCols = parseCSVLine(lines[0]);
      const hasHeader = firstCols.some((c) => /name|nom|price|prix|price/i.test(c));

      const rows: string[][] = lines.map((l) => parseCSVLine(l)).filter(Boolean) as string[][];
      if (rows.length === 0) {
        showToastLocal(lang === "ar" ? "لم يتم العثور على منتجات في CSV." : "No products found in CSV.", "error");
        return;
      }

      if (hasHeader) {
        setImportHeader(rows[0]);
        setImportPreview(rows.slice(1));
      } else {
        setImportHeader(null);
        setImportPreview(rows);
      }

      setMapNameCol(0);
      setMapPriceCol(1);
      setPage(1);
    };

    reader.readAsText(file);
    e.target.value = "";
  };

  const filtered = useMemo(() => filteredAndSortedProducts(products, searchQuery, sortBy), [products, searchQuery, sortBy]);
  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const paginated = filtered.slice((page - 1) * pageSize, page * pageSize);

  return (
    <div className="space-y-4">
      <div className={`bg-white rounded-2xl p-4 flex items-center justify-between ${isRtl ? "space-x-reverse" : ""}`}>
        <div>
          <h3 className="text-sm font-bold text-slate-800">{lang === "ar" ? "الكتالوج" : "Catalogue"}</h3>
          <p className="text-xs text-slate-400">{lang === "ar" ? "قائمة المنتجات المسجلة" : "Registered products list"}</p>
        </div>
        <div className="bg-slate-50 p-2 rounded-lg">
          <Database className="w-5 h-5 text-slate-600" />
        </div>
      </div>

      <div className="bg-white border border-slate-200 rounded-2xl p-4 space-y-3">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
          <input
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            placeholder={lang === "ar" ? "اسم المنتج" : "Nom du produit"}
            className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2 px-3 text-sm outline-none"
          />

          <div className="relative">
            <input
              value={newPrice}
              onChange={(e) => setNewPrice(e.target.value)}
              placeholder={lang === "ar" ? "السعر" : "Prix"}
              type="number"
              step="0.01"
              className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2 px-3 text-sm outline-none"
            />
            <span className="absolute inset-y-0 right-3 flex items-center text-xs text-slate-400">{currency}</span>
          </div>

          <button onClick={handleAdd} className="bg-teal-600 hover:bg-teal-700 text-white font-semibold rounded-xl py-2 px-3">
            {lang === "ar" ? "إضافة" : "Ajouter"}
          </button>
        </div>

        {msg && <p className="text-xs text-slate-600">{msg}</p>}

        <div className="flex items-center gap-2">
          <input
            aria-label={lang === "ar" ? "بحث" : "Search"}
            value={searchQuery}
            onChange={(e) => {
              setSearchQuery(e.target.value);
              setPage(1);
            }}
            placeholder={lang === "ar" ? "بحث عن منتج..." : "Search products..."}
            className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2 px-3 text-sm outline-none"
          />

          <select
            value={sortBy}
            onChange={(e) => {
              setSortBy(e.target.value as any);
              setPage(1);
            }}
            className="bg-slate-50 border border-slate-200 rounded-xl py-2 px-3 text-sm outline-none"
            aria-label={lang === "ar" ? "ترتيب" : "Sort"}
          >
            <option value="nameAsc">{lang === "ar" ? "الاسم ⬆" : "Name ↑"}</option>
            <option value="nameDesc">{lang === "ar" ? "الاسم ⬇" : "Name ↓"}</option>
            <option value="priceAsc">{lang === "ar" ? "السعر ⬆" : "Price ↑"}</option>
            <option value="priceDesc">{lang === "ar" ? "السعر ⬇" : "Price ↓"}</option>
          </select>
        </div>

        <div className="space-y-2">
          {paginated.length === 0 ? (
            <div className="text-sm text-slate-500">{lang === "ar" ? "لا منتجات مسجلة بعد." : "Aucun produit enregistré."}</div>
          ) : (
            paginated.map((p) => (
              <div key={p.id} className="flex items-center justify-between bg-slate-50 p-3 rounded-xl">
                <div>
                  {editingId === p.id ? (
                    <div className="flex items-center gap-2">
                      <input
                        value={editName}
                        onChange={(e) => setEditName(e.target.value)}
                        placeholder={lang === "ar" ? "اسم المنتج" : "Product name"}
                        className="bg-white border border-slate-200 rounded-md py-1 px-2 text-sm"
                      />
                      <input
                        value={editPrice}
                        onChange={(e) => setEditPrice(e.target.value)}
                        type="number"
                        step="0.01"
                        placeholder={lang === "ar" ? "السعر" : "Price"}
                        className="bg-white border border-slate-200 rounded-md py-1 px-2 text-sm w-24"
                      />
                    </div>
                  ) : (
                    <div>
                      <p className="font-semibold text-sm text-slate-800">{p.name}</p>
                      <p className="text-xs text-slate-500">{formatCurrency(p.price, currency)}</p>
                    </div>
                  )}
                </div>

                <div className="flex items-center gap-2">
                  {editingId === p.id ? (
                    <>
                      <button onClick={confirmEdit} aria-label={lang === "ar" ? "تأكيد" : "Confirm"} className="bg-teal-600 text-white p-2 rounded-md">
                        <Check className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => setEditingId(null)}
                        className="bg-slate-100 p-2 rounded-md"
                        aria-label={lang === "ar" ? "إلغاء" : "Cancel"}
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </>
                  ) : (
                    <>
                      <button
                        onClick={() => startEdit(p)}
                        aria-label={lang === "ar" ? "تعديل" : "Edit"}
                        className="bg-white border border-slate-200 p-2 rounded-md"
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => setDeleteTarget(p)}
                        aria-label={lang === "ar" ? "حذف" : "Delete"}
                        className="bg-rose-50 text-rose-600 p-2 rounded-md"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </>
                  )}
                </div>
              </div>
            ))
          )}

          <div className="flex items-center justify-between mt-2">
            <div className="text-xs text-slate-500">
              {lang === "ar" ? "الصفحة" : "Page"} {page} / {totalPages}
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setPage((s) => Math.max(1, s - 1))}
                disabled={page === 1}
                className={`px-3 py-1 rounded-md text-sm ${page === 1 ? "bg-slate-100 text-slate-400 cursor-not-allowed" : "bg-slate-200 hover:bg-slate-300"}`}
              >
                {lang === "ar" ? "سابق" : "Prev"}
              </button>
              <button
                onClick={() => setPage((s) => Math.min(totalPages, s + 1))}
                disabled={page >= totalPages}
                className={`px-3 py-1 rounded-md text-sm ${page >= totalPages ? "bg-slate-100 text-slate-400 cursor-not-allowed" : "bg-slate-200 hover:bg-slate-300"}`}
              >
                {lang === "ar" ? "التالي" : "Next"}
              </button>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button onClick={() => exportCSV(products)} className="bg-slate-900 text-white px-3 py-2 rounded-md text-sm">
              {lang === "ar" ? "تصدير CSV" : "Export CSV"}
            </button>
            <button
              onClick={() => fileInputRef.current?.click()}
              className="bg-white border border-slate-200 px-3 py-2 rounded-md text-sm"
            >
              {lang === "ar" ? "استيراد CSV" : "Import CSV"}
            </button>
            <input ref={fileInputRef} type="file" accept="text/csv,.csv" onChange={handleImportCSVInternal} className="hidden" />
          </div>
        </div>

        {toast && (
          <div
            className={`fixed bottom-6 left-1/2 -translate-x-1/2 z-50 px-4 py-2 rounded-md ${toast.type === "error" ? "bg-rose-600 text-white" : "bg-teal-600 text-white"}`}
          >
            <div className="text-sm">{toast.message}</div>
          </div>
        )}
      </div>

      {importPreview && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl p-4 w-full max-w-2xl">
            <div className="flex items-center justify-between">
              <h4 className="font-semibold text-slate-800">{lang === "ar" ? "معاينة الاستيراد" : "Import preview"}</h4>
              <div className="text-xs text-slate-500">
                {importPreview.length} {lang === "ar" ? "صفوف" : "rows"}
              </div>
            </div>

            <div className="mt-3 grid grid-cols-1 sm:grid-cols-3 gap-2 items-end">
              <div>
                <label className="text-xs text-slate-500">{lang === "ar" ? "عمود الاسم" : "Name column"}</label>
                <select
                  value={mapNameCol}
                  onChange={(e) => setMapNameCol(parseInt(e.target.value, 10))}
                  className="w-full border rounded-md py-1 px-2 text-sm"
                >
                  {Array.from({ length: Math.max(1, importPreview[0]?.length || 1) }).map((_, idx) => (
                    <option key={idx} value={idx}>
                      {importHeader ? importHeader[idx] : `Col ${idx + 1}`}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-xs text-slate-500">{lang === "ar" ? "عمود السعر" : "Price column"}</label>
                <select
                  value={mapPriceCol}
                  onChange={(e) => setMapPriceCol(parseInt(e.target.value, 10))}
                  className="w-full border rounded-md py-1 px-2 text-sm"
                >
                  {Array.from({ length: Math.max(1, importPreview[0]?.length || 1) }).map((_, idx) => (
                    <option key={idx} value={idx}>
                      {importHeader ? importHeader[idx] : `Col ${idx + 1}`}
                    </option>
                  ))}
                </select>
              </div>

              <div className="text-right">
                <button
                  onClick={() => {
                    setImportPreview(null);
                    setImportHeader(null);
                  }}
                  className="bg-slate-100 px-3 py-1 rounded-md text-sm"
                >
                  {lang === "ar" ? "إلغاء" : "Cancel"}
                </button>
                <button onClick={performImportFromPreview} className="bg-teal-600 text-white px-3 py-1 ml-2 rounded-md text-sm">
                  {lang === "ar" ? "استيراد" : "Import"}
                </button>
              </div>
            </div>

            <div className="mt-4 overflow-auto max-h-60">
              <table className="w-full text-sm table-auto border-collapse">
                <thead>
                  <tr>
                    {importPreview[0]?.map((_, idx) => (
                      <th key={idx} className="border-b text-left px-2 py-1">
                        {importHeader ? importHeader[idx] : `Col ${idx + 1}`}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {importPreview.slice(0, 10).map((row, rIdx) => (
                    <tr key={rIdx} className="even:bg-slate-50">
                      {row.map((cell, cIdx) => (
                        <td key={cIdx} className="px-2 py-1 align-top break-words">
                          {cell}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {deleteTarget && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl p-6 w-full max-w-sm">
            <h4 className="text-lg font-semibold text-slate-800">{lang === "ar" ? "تأكيد الحذف" : "Confirm deletion"}</h4>
            <p className="text-sm text-slate-600 mt-2">
              {lang === "ar" ? `هل أنت متأكد من حذف المنتج "${deleteTarget.name}"؟` : `Are you sure you want to delete "${deleteTarget.name}"?`}
            </p>
            <div className="flex justify-end gap-2 mt-4">
              <button onClick={() => setDeleteTarget(null)} className="bg-slate-100 px-4 py-2 rounded-md text-sm">
                {lang === "ar" ? "إلغاء" : "Cancel"}
              </button>
              <button onClick={confirmDelete} className="bg-rose-600 text-white px-4 py-2 rounded-md text-sm">
                {lang === "ar" ? "حذف" : "Delete"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

