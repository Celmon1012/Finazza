"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { Camera, ChevronDown } from "lucide-react";
import { api, mediaUrl } from "@/lib/api";
import type { Investment } from "@/lib/types";
import { dateInput, DISCLAIMER, money, parseBuyPrice, percent } from "@/lib/utils";
import { ProofEditor } from "./proof-editor";
import { ReportButton } from "./report-button";
import { Button, Empty, Field, inputClass } from "./ui";

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
          buyPrice: `${initial.buyPriceApproximate ? "~" : ""}${initial.buyPrice}`,
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
    const buy = parseBuyPrice(form.buyPrice);
    if (!buy) {
      setError("Enter a buy price. Put ~ before the number if the amount is approximate.");
      return;
    }
    setBusy(true);
    setError("");
    const payload = {
      assetClass: form.assetClass,
      category: form.assetClass === "collectible" ? form.category : null,
      assetName: form.assetName,
      recordType: form.recordType,
      quantity: Number(form.quantity),
      unit: form.unit,
      buyPrice: buy.amount,
      buyPriceApproximate: buy.approximate,
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
          <input className={inputClass} value={form.buyPrice} onChange={(event) => set("buyPrice", event.target.value)} placeholder="120 or ~120" required />
          <span className="block text-xs leading-5 text-neutral-500">Use ~ before the amount when it is approximate.</span>
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
  onEdit,
  onUploadProof,
}: {
  item: Investment;
  mine?: boolean;
  onChange?: (next: Investment | null) => void;
  onEdit?: () => void;
  onUploadProof?: () => void;
}) {
  const [error, setError] = useState("");
  const [proofOpen, setProofOpen] = useState(false);

  async function removeRecord() {
    if (!confirm("Remove this investment record? The proof photo is removed with it.")) return;
    setError("");
    try {
      await api(`/api/investments/${item.id}`, { method: "DELETE" });
      onChange?.(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not remove the record");
    }
  }

  return (
    <article className="border-b border-neutral-200 px-4 py-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-xs uppercase tracking-[0.14em] text-neutral-500">
            {item.assetClass}
            {item.category ? ` · ${item.category}` : ""} · {item.recordType === "trade" ? "completed trade" : item.recordType}
          </p>
          <h3 className="mt-1 text-lg font-semibold">{item.snapshotLabel}</h3>
        </div>
        {item.returnPercent != null && (
          <span className={item.returnPercent >= 0 ? "text-[#3dd68c]" : "text-[#ff5d73]"}>{percent(item.returnPercent)}</span>
        )}
      </div>
      <dl className="mt-3 grid grid-cols-2 gap-2 text-sm text-neutral-600">
        <div>Quantity: {item.quantity} {item.unit}</div>
        <div>Buy: {item.buyPriceApproximate ? "~" : ""}{money(item.buyPrice)} / {item.priceUnit}</div>
        {item.sellPrice != null && <div>Sell: {money(item.sellPrice)} / {item.priceUnit}</div>}
        {item.profitPerUnit != null && <div>Gross per unit: {money(item.profitPerUnit)}</div>}
      </dl>
      {item.notes && <p className="mt-2 text-sm text-neutral-700">{item.notes}</p>}
      {item.returnBasis && <p className="mt-2 text-xs text-neutral-500">{item.returnBasis}</p>}
      {item.comparisonNote && <p className="mt-1 text-xs text-[#c56a00]">{item.comparisonNote}</p>}

      <div className="mt-3 rounded-xl border border-[#ffc14d]/30 bg-[#ffc14d]/5 p-3">
        {item.proof ? (
          <>
            <button
              type="button"
              className="flex w-full items-center justify-between gap-3 text-left text-sm font-medium text-[#c56a00]"
              aria-expanded={proofOpen}
              onClick={() => setProofOpen((open) => !open)}
            >
              <span>{proofOpen ? "Hide proof" : "Tap to view proof"}</span>
              <ChevronDown size={16} className={proofOpen ? "rotate-180" : ""} />
            </button>
            {proofOpen && (
              <div className="mt-3 space-y-2">
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
                <ReportButton targetType="proof" targetId={item.proof.id} />
                {mine && (
                  <Button type="button" className="h-10 w-full" onClick={onUploadProof}>
                    <Camera size={16} />
                    Replace proof photo
                  </Button>
                )}
              </div>
            )}
          </>
        ) : (
          <>
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[#c56a00]">Proof of investment</p>
            <p className="mt-2 text-sm text-neutral-600">No photo yet. Upload a receipt or photo, then cover the sensitive details.</p>
            {mine && (
              <div className="mt-3">
                <Button type="button" className="h-10 w-full" onClick={onUploadProof}>
                  <Camera size={16} />
                  Upload proof photo
                </Button>
              </div>
            )}
          </>
        )}
      </div>
      {mine && (
        <div className="mt-3 grid grid-cols-2 gap-2">
          <Button type="button" variant="outline" className="h-10 w-full" onClick={onEdit}>
            Edit record
          </Button>
          <Button type="button" variant="outline" className="h-10 w-full border-[#ff5d73]/40 text-[#ff5d73] hover:bg-[#ff5d73]/10" onClick={removeRecord}>
            Remove record
          </Button>
        </div>
      )}
      {error && <p className="mt-2 text-sm text-[#ff5d73]">{error}</p>}
    </article>
  );
}

export function PortfolioBoard({
  items,
  mine,
  onChange,
}: {
  items: Investment[];
  mine: boolean;
  onChange: (items: Investment[]) => void;
}) {
  const [editing, setEditing] = useState<Investment | null | "new">(null);
  const [proofItem, setProofItem] = useState<Investment | null>(null);
  const [pickingProof, setPickingProof] = useState(false);
  const [attachProofAfterSave, setAttachProofAfterSave] = useState(false);
  const [proofBusy, setProofBusy] = useState(false);
  const [proofError, setProofError] = useState("");

  function closeEditor() {
    setAttachProofAfterSave(false);
    setEditing(null);
  }

  useEffect(() => {
    if (!editing) return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previous;
    };
  }, [editing]);

  function startProof() {
    setPickingProof(false);
    if (items.length === 0) {
      setAttachProofAfterSave(true);
      setEditing("new");
      return;
    }
    if (items.length === 1) {
      setProofItem(items[0]);
      return;
    }
    setPickingProof(true);
  }

  async function uploadProof(file: File) {
    if (!proofItem) return;
    setProofBusy(true);
    setProofError("");
    const form = new FormData();
    form.append("file", file);
    form.append("redactionConfirmed", "true");
    try {
      const result = await api<{ investment: Investment }>(`/api/investments/${proofItem.id}/proof`, { method: "POST", body: form });
      onChange(items.map((row) => (row.id === result.investment.id ? result.investment : row)));
      setProofItem(null);
    } catch (err) {
      setProofError(err instanceof Error ? err.message : "Upload failed");
    } finally {
      setProofBusy(false);
    }
  }

  return (
    <div>
      {mine && (
        <div className="mx-4 mt-4 rounded-2xl border border-[#ffc14d]/40 bg-[#ffc14d]/10 p-4">
          <h3 className="font-semibold">Proof of investment</h3>
          <p className="mt-1 text-sm leading-6 text-neutral-600">
            Upload a photo of a receipt or statement. The editor lets you cover names, account numbers, and addresses before the photo is public.
          </p>
          <Button type="button" className="mt-3" onClick={startProof}>
            <Camera size={16} />
            Upload proof photo
          </Button>
        </div>
      )}
      {mine && (
        <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-3">
          <p className="max-w-md text-xs leading-5 text-neutral-500">{DISCLAIMER}</p>
          <Button type="button" variant="outline" onClick={() => { setAttachProofAfterSave(false); setEditing("new"); }}>
            Add holding
          </Button>
        </div>
      )}
      {mine && pickingProof && (
        <div className="mx-4 mb-4 rounded-2xl border border-neutral-200 p-4">
          <p className="text-sm font-medium">Which holding is this proof photo for?</p>
          <div className="mt-3 flex flex-col gap-2">
            {items.map((item) => (
              <button
                key={item.id}
                type="button"
                className="rounded-xl border border-neutral-200 px-3 py-2 text-left text-sm hover:bg-neutral-50"
                onClick={() => {
                  setProofItem(item);
                  setPickingProof(false);
                }}
              >
                {item.snapshotLabel}
              </button>
            ))}
          </div>
        </div>
      )}
      {mine && editing && createPortal(
        <div className="fixed inset-0 z-[80] bg-black/70" role="dialog" aria-modal="true" aria-label={editing === "new" ? "Add holding" : "Edit record"}>
          <button type="button" className="absolute inset-0" aria-label="Close" onClick={closeEditor} />
          <div className="absolute inset-x-0 bottom-0 top-10 z-10 overflow-y-auto overscroll-contain rounded-t-3xl bg-white px-4 pb-[max(1.25rem,env(safe-area-inset-bottom))] pt-4 sm:inset-x-auto sm:bottom-auto sm:left-1/2 sm:top-1/2 sm:max-h-[90vh] sm:w-full sm:max-w-lg sm:-translate-x-1/2 sm:-translate-y-1/2 sm:rounded-2xl">
            <div className="mb-3 flex items-center justify-between gap-3">
              <h2 className="text-lg font-semibold">{editing === "new" ? "Add holding" : "Edit record"}</h2>
              <button type="button" className="text-sm text-neutral-500" onClick={closeEditor}>
                Close
              </button>
            </div>
            {attachProofAfterSave && editing === "new" && (
              <p className="mb-3 text-sm text-neutral-600">Save the holding first. The photo editor opens next so you can cover sensitive details.</p>
            )}
            <InvestmentEditor
              initial={editing === "new" ? null : editing}
              onCancel={closeEditor}
              onSaved={(investment) => {
                onChange([investment, ...items.filter((item) => item.id !== investment.id)]);
                setEditing(null);
                if (attachProofAfterSave) {
                  setAttachProofAfterSave(false);
                  setProofItem(investment);
                }
              }}
            />
          </div>
        </div>,
        document.body,
      )}
      {items.length === 0 && (
        <Empty
          title="No records yet"
          body={mine ? "Add a holding, then upload a photo of the receipt. Cover names, account numbers, and addresses before it is public." : "No investment records shared yet."}
        />
      )}
      {items.map((item) => (
        <div key={item.id}>
          <InvestmentCard
            item={item}
            mine={mine}
            onUploadProof={() => setProofItem(item)}
            onEdit={() => setEditing(item)}
            onChange={(next) => {
              if (!next) onChange(items.filter((row) => row.id !== item.id));
              else onChange(items.map((row) => (row.id === item.id ? next : row)));
            }}
          />
        </div>
      ))}
      {proofItem && (
        <ProofEditor
          busy={proofBusy}
          error={proofError}
          onClose={() => {
            setProofError("");
            setProofItem(null);
          }}
          onSave={uploadProof}
        />
      )}
    </div>
  );
}
