"use client";

import { useState } from "react";
import { api, mediaUrl } from "@/lib/api";
import type { Investment } from "@/lib/types";
import { dateInput, money, percent } from "@/lib/utils";
import { ReportButton } from "./report-button";
import { Button, Field, inputClass } from "./ui";

const classes = [
  ["stock", "Stock"],
  ["etf", "ETF"],
  ["commodity", "Commodity"],
  ["collectible", "Collectible"],
  ["other", "Other"],
] as const;

const categories = ["trading card", "coin", "watch", "art", "other"];
const units = ["shares", "kg", "g", "troy oz", "oz", "pieces", "units"];

const empty = {
  assetClass: "stock" as Investment["assetClass"],
  category: "trading card",
  assetName: "",
  recordType: "holding" as Investment["recordType"],
  quantity: "1",
  unit: "shares",
  buyPrice: "",
  sellPrice: "",
  priceUnit: "shares",
  buyDate: "",
  sellDate: "",
  notes: "",
};

export function InvestmentEditor({
  initial,
  onSaved,
  onCancel,
}: {
  initial?: Investment | null;
  onSaved: (investment: Investment) => void;
  onCancel?: () => void;
}) {
  const [form, setForm] = useState(() =>
    initial
      ? {
          assetClass: initial.assetClass,
          category: initial.category || "other",
          assetName: initial.assetName,
          recordType: initial.recordType,
          quantity: String(initial.quantity),
          unit: initial.unit,
          buyPrice: String(initial.buyPrice),
          sellPrice: initial.sellPrice == null ? "" : String(initial.sellPrice),
          priceUnit: initial.priceUnit,
          buyDate: dateInput(initial.buyDate),
          sellDate: dateInput(initial.sellDate),
          notes: initial.notes,
        }
      : empty,
  );
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  function set<K extends keyof typeof form>(key: K, value: (typeof form)[K]) {
    setForm((current) => ({ ...current, [key]: value }));
  }

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError("");
    const payload = {
      assetClass: form.assetClass,
      category: form.assetClass === "collectible" ? form.category : null,
      assetName: form.assetName,
      recordType: form.recordType,
      quantity: Number(form.quantity),
      unit: form.unit,
      buyPrice: Number(form.buyPrice),
      sellPrice: form.recordType === "trade" ? Number(form.sellPrice) : null,
      priceUnit: form.priceUnit || form.unit,
      buyDate: form.buyDate,
      sellDate: form.recordType === "trade" ? form.sellDate : null,
      notes: form.notes,
    };
    try {
      const path = initial ? `/api/investments/${initial.id}` : "/api/investments";
      const result = await api<{ investment: Investment }>(path, {
        method: initial ? "PATCH" : "POST",
        body: JSON.stringify(payload),
      });
      onSaved(result.investment);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not save the record");
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={submit} className="space-y-3 rounded-2xl border border-neutral-200 p-4">
      <div className="grid gap-3 sm:grid-cols-2">
        <Field label="Record">
          <select className={inputClass} value={form.recordType} onChange={(event) => set("recordType", event.target.value as Investment["recordType"])}>
            <option value="holding">Current holding</option>
            <option value="trade">Completed trade</option>
          </select>
        </Field>
        <Field label="Asset class">
          <select className={inputClass} value={form.assetClass} onChange={(event) => set("assetClass", event.target.value as Investment["assetClass"])}>
            {classes.map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
        </Field>
        {form.assetClass === "collectible" && (
          <Field label="Collectible category">
            <select className={inputClass} value={form.category} onChange={(event) => set("category", event.target.value)}>
              {categories.map((category) => (
                <option key={category}>{category}</option>
              ))}
            </select>
          </Field>
        )}
        <Field label="Asset name">
          <input className={inputClass} value={form.assetName} onChange={(event) => set("assetName", event.target.value)} placeholder="AAPL, silver, graded card" required />
        </Field>
        <Field label="Quantity">
          <input className={inputClass} inputMode="decimal" value={form.quantity} onChange={(event) => set("quantity", event.target.value)} required />
        </Field>
        <Field label="Quantity unit">
          <input className={inputClass} list="units" value={form.unit} onChange={(event) => set("unit", event.target.value)} required />
        </Field>
        <Field label="Buy price (USD)">
          <input className={inputClass} inputMode="decimal" value={form.buyPrice} onChange={(event) => set("buyPrice", event.target.value)} required />
        </Field>
        <Field label="Price unit">
          <input className={inputClass} list="units" value={form.priceUnit} onChange={(event) => set("priceUnit", event.target.value)} placeholder="shares, troy oz, pieces" required />
        </Field>
        <Field label="Buy date">
          <input className={inputClass} type="date" value={form.buyDate} onChange={(event) => set("buyDate", event.target.value)} required />
        </Field>
        {form.recordType === "trade" && (
          <>
            <Field label="Sell price (USD)">
              <input className={inputClass} inputMode="decimal" value={form.sellPrice} onChange={(event) => set("sellPrice", event.target.value)} required />
            </Field>
            <Field label="Sell date">
              <input className={inputClass} type="date" value={form.sellDate} onChange={(event) => set("sellDate", event.target.value)} required />
            </Field>
          </>
        )}
      </div>
      <datalist id="units">
        {units.map((unit) => (
          <option key={unit} value={unit} />
        ))}
      </datalist>
      <Field label="Notes">
        <textarea className={inputClass} value={form.notes} maxLength={500} onChange={(event) => set("notes", event.target.value)} />
      </Field>
      <p className="text-xs leading-5 text-neutral-500">
        Completed trades show a simple price return per unit, before fees, taxes, or partial sales. Holdings are not treated as a realized return.
      </p>
      {error && <p className="text-sm text-[#ff5d73]">{error}</p>}
      <div className="flex gap-2">
        <Button type="submit" disabled={busy}>
          {initial ? "Save changes" : "Add record"}
        </Button>
        {onCancel && (
          <Button type="button" variant="ghost" onClick={onCancel}>
            Cancel
          </Button>
        )}
      </div>
    </form>
  );
}

export function InvestmentCard({
  item,
  mine,
  onChange,
}: {
  item: Investment;
  mine?: boolean;
  onChange?: (next: Investment | null) => void;
}) {
  const [checks, setChecks] = useState([false, false, false]);
  const [error, setError] = useState("");
  const ready = checks.every(Boolean);

  async function upload(file: File) {
    const form = new FormData();
    form.append("file", file);
    form.append("redactionConfirmed", "true");
    const result = await api<{ investment: Investment }>(`/api/investments/${item.id}/proof`, { method: "POST", body: form });
    onChange?.(result.investment);
  }

  async function removeProof() {
    const result = await api<{ investment: Investment }>(`/api/investments/${item.id}/proof`, { method: "DELETE" });
    onChange?.(result.investment);
  }

  async function removeRecord() {
    if (!confirm("Delete this investment record?")) return;
    await api(`/api/investments/${item.id}`, { method: "DELETE" });
    onChange?.(null);
  }

  return (
    <article className="border-b border-neutral-200 px-4 py-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-xs uppercase tracking-[0.14em] text-neutral-500">
            {item.assetClass}
            {item.category ? ` · ${item.category}` : ""} · {item.recordType}
          </p>
          <h3 className="mt-1 text-lg font-semibold">{item.snapshotLabel}</h3>
        </div>
        {item.returnPercent != null && (
          <span className={item.returnPercent >= 0 ? "text-[#3dd68c]" : "text-[#ff5d73]"}>{percent(item.returnPercent)}</span>
        )}
      </div>
      <dl className="mt-3 grid grid-cols-2 gap-2 text-sm text-neutral-600">
        <div>Quantity: {item.quantity} {item.unit}</div>
        <div>Buy: {money(item.buyPrice)} / {item.priceUnit}</div>
        {item.sellPrice != null && <div>Sell: {money(item.sellPrice)} / {item.priceUnit}</div>}
        {item.profitPerUnit != null && <div>Gross per unit: {money(item.profitPerUnit)}</div>}
      </dl>
      {item.notes && <p className="mt-2 text-sm text-neutral-700">{item.notes}</p>}
      {item.returnBasis && <p className="mt-2 text-xs text-neutral-500">{item.returnBasis}</p>}
      {item.comparisonNote && <p className="mt-1 text-xs text-[#c56a00]">{item.comparisonNote}</p>}

      <div className="mt-3 rounded-xl border border-[#ffc14d]/30 bg-[#ffc14d]/5 p-3">
        {item.proof ? (
          <div className="space-y-2">
            <p className="text-sm font-medium text-[#c56a00]">{item.proof.label}</p>
            {item.proof.mimeType.includes("pdf") ? (
              <a className="text-sm underline" href={mediaUrl(item.proof.url)} target="_blank" rel="noreferrer">
                View PDF proof
              </a>
            ) : (
              <a href={mediaUrl(item.proof.url)} target="_blank" rel="noreferrer">
                <img src={mediaUrl(item.proof.url)} alt="User-submitted proof" className="max-h-56 rounded-lg border border-neutral-200" />
              </a>
            )}
            <div className="flex gap-3">
              {mine && (
                <button type="button" className="text-xs text-neutral-500" onClick={removeProof}>
                  Remove proof
                </button>
              )}
              <ReportButton targetType="proof" targetId={item.proof.id} />
            </div>
          </div>
        ) : (
          <p className="text-sm text-neutral-600">No proof uploaded.</p>
        )}
        {mine && (
          <div className="mt-3 space-y-2 text-sm">
            <p className="text-neutral-600">Before you upload, remove:</p>
            {["Real names", "Account numbers", "Addresses"].map((label, index) => (
              <label key={label} className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={checks[index]}
                  onChange={(event) =>
                    setChecks((current) => current.map((value, itemIndex) => (itemIndex === index ? event.target.checked : value)))
                  }
                />
                {label}
              </label>
            ))}
            <label className={ready ? "inline-flex cursor-pointer text-[#c56a00]" : "inline-flex cursor-not-allowed text-neutral-500"}>
              {item.proof ? "Replace proof" : "Upload proof"}
              <input
                type="file"
                accept="image/png,image/jpeg,image/webp,application/pdf"
                className="hidden"
                disabled={!ready}
                onChange={(event) => {
                  const file = event.target.files?.[0];
                  if (!file) return;
                  setError("");
                  upload(file).catch((err) => setError(err instanceof Error ? err.message : "Upload failed"));
                }}
              />
            </label>
            {error && <p className="text-[#ff5d73]">{error}</p>}
          </div>
        )}
      </div>
      {mine && (
        <button type="button" className="mt-3 text-xs text-[#ff5d73]" onClick={removeRecord}>
          Delete record
        </button>
      )}
    </article>
  );
}
