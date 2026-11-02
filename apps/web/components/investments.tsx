"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { Camera, ChevronDown } from "lucide-react";
import { api, mediaUrl } from "@/lib/api";
import { formatComparisonNote, formatProofLabel, formatSnapshotLabel } from "@/lib/i18n/format";
import { useI18n } from "@/lib/i18n/provider";
import type { Investment } from "@/lib/types";
import { dateInput, money, parseBuyPrice, percent } from "@/lib/utils";
import { ProofEditor } from "./proof-editor";
import { ReportButton } from "./report-button";
import { Button, Empty, Field, inputClass } from "./ui";

const classKeys = [
  ["stock", "portfolio.stock"],
  ["etf", "portfolio.etf"],
  ["commodity", "portfolio.commodity"],
  ["collectible", "portfolio.collectible"],
  ["other", "portfolio.other"],
] as const;

const categories = [
  ["trading card", "portfolio.category.tradingCard"],
  ["coin", "portfolio.category.coin"],
  ["watch", "portfolio.category.watch"],
  ["art", "portfolio.category.art"],
  ["other", "portfolio.other"],
] as const;
const units = [
  ["shares", "portfolio.unit.shares"],
  ["kg", "kg"],
  ["g", "g"],
  ["troy oz", "troy oz"],
  ["oz", "oz"],
  ["pieces", "portfolio.unit.pieces"],
  ["units", "portfolio.unit.units"],
] as const;

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
  const { t } = useI18n();
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
      setError(t("portfolio.buyPriceError"));
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
      setError(err instanceof Error ? err.message : t("portfolio.saveFailed"));
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={submit} className="space-y-3 rounded-2xl border border-neutral-200 p-4">
      <div className="grid gap-3 sm:grid-cols-2">
        <Field label={t("portfolio.record")}>
          <select className={inputClass} value={form.recordType} onChange={(event) => set("recordType", event.target.value as Investment["recordType"])}>
            <option value="holding">{t("portfolio.holding")}</option>
            <option value="trade">{t("portfolio.trade")}</option>
          </select>
        </Field>
        <Field label={t("portfolio.assetClass")}>
          <select className={inputClass} value={form.assetClass} onChange={(event) => set("assetClass", event.target.value as Investment["assetClass"])}>
            {classKeys.map(([value, labelKey]) => (
              <option key={value} value={value}>
                {t(labelKey)}
              </option>
            ))}
          </select>
        </Field>
        {form.assetClass === "collectible" && (
          <Field label={t("portfolio.category")}>
            <select className={inputClass} value={form.category} onChange={(event) => set("category", event.target.value)}>
              {categories.map(([value, labelKey]) => (
                <option key={value} value={value}>
                  {t(labelKey)}
                </option>
              ))}
            </select>
          </Field>
        )}
        <Field label={t("portfolio.assetName")}>
          <input className={inputClass} value={form.assetName} onChange={(event) => set("assetName", event.target.value)} placeholder={t("portfolio.assetNamePlaceholder")} required />
        </Field>
        <Field label={t("portfolio.quantity")}>
          <input className={inputClass} inputMode="decimal" value={form.quantity} onChange={(event) => set("quantity", event.target.value)} required />
        </Field>
        <Field label={t("portfolio.quantityUnit")}>
          <input className={inputClass} list="units" value={form.unit} onChange={(event) => set("unit", event.target.value)} required />
        </Field>
        <Field label={t("portfolio.buyPrice")}>
          <input className={inputClass} value={form.buyPrice} onChange={(event) => set("buyPrice", event.target.value)} placeholder={t("portfolio.buyPricePlaceholder")} required />
        </Field>
        <Field label={t("portfolio.priceUnit")}>
          <input className={inputClass} list="units" value={form.priceUnit} onChange={(event) => set("priceUnit", event.target.value)} placeholder={t("portfolio.priceUnitPlaceholder")} required />
        </Field>
        <Field label={t("portfolio.buyDate")}>
          <input className={inputClass} type="date" value={form.buyDate} onChange={(event) => set("buyDate", event.target.value)} required />
        </Field>
        {form.recordType === "trade" && (
          <>
            <Field label={t("portfolio.sellPrice")}>
              <input className={inputClass} inputMode="decimal" value={form.sellPrice} onChange={(event) => set("sellPrice", event.target.value)} required />
            </Field>
            <Field label={t("portfolio.sellDate")}>
              <input className={inputClass} type="date" value={form.sellDate} onChange={(event) => set("sellDate", event.target.value)} required />
            </Field>
          </>
        )}
      </div>
      <datalist id="units">
        {units.map(([value]) => (
          <option key={value} value={value} />
        ))}
      </datalist>
      <Field label={t("portfolio.notes")}>
        <textarea className={inputClass} value={form.notes} maxLength={500} onChange={(event) => set("notes", event.target.value)} />
      </Field>
      <p className="text-xs leading-5 text-neutral-500">{t("portfolio.returnHint")}</p>
      {error && <p className="text-sm text-[#ff5d73]">{error}</p>}
      <div className="flex gap-2">
        <Button type="submit" disabled={busy}>
          {initial ? t("portfolio.saveChanges") : t("portfolio.addRecord")}
        </Button>
        {onCancel && (
          <Button type="button" variant="ghost" onClick={onCancel}>
            {t("portfolio.cancel")}
          </Button>
        )}
      </div>
    </form>
  );
}

export function InvestmentCard({
  item,
  mine,
  canMoveUp,
  canMoveDown,
  onMove,
  onChange,
  onEdit,
  onUploadProof,
}: {
  item: Investment;
  mine?: boolean;
  canMoveUp?: boolean;
  canMoveDown?: boolean;
  onMove?: (direction: -1 | 1) => void;
  onChange?: (next: Investment | null) => void;
  onEdit?: () => void;
  onUploadProof?: () => void;
}) {
  const { t } = useI18n();
  const [error, setError] = useState("");
  const [proofOpen, setProofOpen] = useState(false);

  async function removeRecord() {
    if (!confirm(t("portfolio.removeConfirm"))) return;
    setError("");
    try {
      await api(`/api/investments/${item.id}`, { method: "DELETE" });
      onChange?.(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : t("portfolio.removeFailed"));
    }
  }

  return (
    <article className="border-b border-neutral-200 px-4 py-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-xs uppercase tracking-[0.14em] text-neutral-500">
            {item.assetClass}
            {item.category ? ` · ${item.category}` : ""} · {item.recordType === "trade" ? t("portfolio.trade") : t("portfolio.holding")}
          </p>
          <h3 className="mt-1 text-lg font-semibold">{formatSnapshotLabel(item, t)}</h3>
        </div>
        {item.returnPercent != null && (
          <span className={item.returnPercent >= 0 ? "text-[#3dd68c]" : "text-[#ff5d73]"}>{percent(item.returnPercent)}</span>
        )}
      </div>
      <dl className="mt-3 grid grid-cols-2 gap-2 text-sm text-neutral-600">
        <div>
          {t("portfolio.quantityLabel")} {item.quantity} {item.unit}
        </div>
        <div>
          {t("portfolio.buyPrice")}: {item.buyPriceApproximate ? "~" : ""}
          {money(item.buyPrice)} / {item.priceUnit}
        </div>
        {item.sellPrice != null && (
          <div>
            {t("portfolio.sellPrice")}: {money(item.sellPrice)} / {item.priceUnit}
          </div>
        )}
        {item.profitPerUnit != null && <div>{t("portfolio.grossPerUnit", { amount: money(item.profitPerUnit) })}</div>}
      </dl>
      {item.notes && <p className="mt-2 text-sm text-neutral-700">{item.notes}</p>}
      {item.returnBasis && <p className="mt-2 text-xs text-neutral-500">{item.returnBasis}</p>}
      {item.comparisonNote && <p className="mt-1 text-xs text-[#c56a00]">{formatComparisonNote(item, t)}</p>}

      <div className="mt-3 rounded-xl border border-[#ffc14d]/30 bg-[#ffc14d]/5 p-3">
        {item.proof ? (
          <>
            <button
              type="button"
              className="flex w-full items-center justify-between gap-3 text-left text-sm font-medium text-[#c56a00]"
              aria-expanded={proofOpen}
              onClick={() => setProofOpen((open) => !open)}
            >
              <span>{proofOpen ? t("portfolio.hideProof") : t("portfolio.viewProof")}</span>
              <ChevronDown size={16} className={proofOpen ? "rotate-180" : ""} />
            </button>
            {proofOpen && (
              <div className="mt-3 space-y-2">
                <p className="text-sm font-medium text-[#c56a00]">{formatProofLabel(item.proof.label, t)}</p>
                {item.proof.mimeType.includes("pdf") ? (
                  <a className="text-sm underline" href={mediaUrl(item.proof.url)} target="_blank" rel="noreferrer">
                    {t("portfolio.viewPdf")}
                  </a>
                ) : (
                  <a href={mediaUrl(item.proof.url)} target="_blank" rel="noreferrer">
                    <img src={mediaUrl(item.proof.url)} alt={t("portfolio.proofAlt")} className="max-h-56 rounded-lg border border-neutral-200" />
                  </a>
                )}
                <ReportButton targetType="proof" targetId={item.proof.id} />
                {mine && (
                  <Button type="button" className="h-10 w-full" onClick={onUploadProof}>
                    <Camera size={16} />
                    {t("portfolio.uploadProof")}
                  </Button>
                )}
              </div>
            )}
          </>
        ) : (
          <>
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[#c56a00]">{t("landing.step2Title")}</p>
            <p className="mt-2 text-sm text-neutral-600">{mine ? t("portfolio.noPhotoMine") : t("portfolio.noPhotoOther")}</p>
            {mine && (
              <div className="mt-3">
                <Button type="button" className="h-10 w-full" onClick={onUploadProof}>
                  <Camera size={16} />
                  {t("portfolio.uploadProof")}
                </Button>
              </div>
            )}
          </>
        )}
      </div>
      {mine && (canMoveUp || canMoveDown) && (
        <div className="mt-3 grid grid-cols-2 gap-2">
          <Button type="button" variant="outline" className="h-10 w-full" disabled={!canMoveUp} onClick={() => onMove?.(-1)}>
            {t("portfolio.moveUp")}
          </Button>
          <Button type="button" variant="outline" className="h-10 w-full" disabled={!canMoveDown} onClick={() => onMove?.(1)}>
            {t("portfolio.moveDown")}
          </Button>
        </div>
      )}
      {mine && (
        <div className="mt-3 grid grid-cols-2 gap-2">
          <Button type="button" variant="outline" className="h-10 w-full" onClick={onEdit}>
            {t("portfolio.editRecord")}
          </Button>
          <Button type="button" variant="outline" className="h-10 w-full border-[#ff5d73]/40 text-[#ff5d73] hover:bg-[#ff5d73]/10" onClick={removeRecord}>
            {t("portfolio.removeRecord")}
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
  const { t } = useI18n();
  const [editing, setEditing] = useState<Investment | null | "new">(null);
  const [proofItem, setProofItem] = useState<Investment | null>(null);
  const [pickingProof, setPickingProof] = useState(false);
  const [attachProofAfterSave, setAttachProofAfterSave] = useState(false);
  const [proofBusy, setProofBusy] = useState(false);
  const [proofError, setProofError] = useState("");
  const [moving, setMoving] = useState(false);

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

  async function move(index: number, direction: -1 | 1) {
    const next = index + direction;
    if (moving || next < 0 || next >= items.length) return;
    const reordered = items.slice();
    const [row] = reordered.splice(index, 1);
    reordered.splice(next, 0, row);
    const previous = items;
    onChange(reordered);
    setMoving(true);
    try {
      const result = await api<{ investments: Investment[] }>("/api/investments/reorder", {
        method: "POST",
        body: JSON.stringify({ ids: reordered.map((item) => item.id) }),
      });
      onChange(result.investments);
    } catch {
      onChange(previous);
    } finally {
      setMoving(false);
    }
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
          <h3 className="font-semibold">{t("portfolio.proofTitle")}</h3>
          <p className="mt-1 text-sm leading-6 text-neutral-600">{t("portfolio.proofHint")}</p>
          <Button type="button" className="mt-3" onClick={startProof}>
            <Camera size={16} />
            {t("portfolio.uploadProof")}
          </Button>
        </div>
      )}
      {mine && (
        <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-3">
          <p className="max-w-md text-xs leading-5 text-neutral-500">
            {t("portfolio.disclaimer")} {items.length > 1 ? t("portfolio.orderHint") : ""}
          </p>
          <Button type="button" variant="outline" onClick={() => { setAttachProofAfterSave(false); setEditing("new"); }}>
            {t("portfolio.addHolding")}
          </Button>
        </div>
      )}
      {mine && pickingProof && (
        <div className="mx-4 mb-4 rounded-2xl border border-neutral-200 p-4">
          <p className="text-sm font-medium">{t("portfolio.pickHolding")}</p>
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
                {formatSnapshotLabel(item, t)}
              </button>
            ))}
          </div>
        </div>
      )}
      {mine && editing && createPortal(
        <div className="fixed inset-0 z-[80] bg-black/70" role="dialog" aria-modal="true" aria-label={editing === "new" ? t("portfolio.addHolding") : t("portfolio.editRecord")}>
          <button type="button" className="absolute inset-0" aria-label={t("common.close")} onClick={closeEditor} />
          <div className="absolute inset-x-0 bottom-0 top-10 z-10 overflow-y-auto overscroll-contain rounded-t-3xl bg-white px-4 pb-[max(1.25rem,env(safe-area-inset-bottom))] pt-4 sm:inset-x-auto sm:bottom-auto sm:left-1/2 sm:top-1/2 sm:max-h-[90vh] sm:w-full sm:max-w-lg sm:-translate-x-1/2 sm:-translate-y-1/2 sm:rounded-2xl">
            <div className="mb-3 flex items-center justify-between gap-3">
              <h2 className="text-lg font-semibold">{editing === "new" ? t("portfolio.addHolding") : t("portfolio.editRecord")}</h2>
              <button type="button" className="text-sm text-neutral-500" onClick={closeEditor}>
                {t("portfolio.close")}
              </button>
            </div>
            {attachProofAfterSave && editing === "new" && (
              <p className="mb-3 text-sm text-neutral-600">{t("portfolio.saveFirst")}</p>
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
          title={t("portfolio.noRecordsTitle")}
          body={mine ? t("portfolio.noRecordsMine") : t("portfolio.noRecordsOther")}
        />
      )}
      {items.map((item, index) => (
        <div key={item.id}>
          <InvestmentCard
            item={item}
            mine={mine}
            canMoveUp={mine && index > 0}
            canMoveDown={mine && index < items.length - 1}
            onMove={(direction) => move(index, direction)}
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
