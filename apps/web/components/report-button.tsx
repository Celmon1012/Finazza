"use client";

import { useState } from "react";
import { Flag } from "lucide-react";
import { api } from "@/lib/api";
import { useI18n } from "@/lib/i18n/provider";
import { Button, Modal } from "./ui";

export function ReportButton({
  targetType,
  targetId,
  label,
}: {
  targetType: "post" | "message" | "proof" | "user";
  targetId: string;
  label?: string;
}) {
  const { t } = useI18n();
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState("misleading");
  const [details, setDetails] = useState("");
  const [done, setDone] = useState("");
  const [error, setError] = useState("");
  const buttonLabel = label === undefined ? t("report.action") : label;

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setError("");
    try {
      await api("/api/reports", {
        method: "POST",
        body: JSON.stringify({ targetType, targetId, reason, details }),
      });
      setDone(t("report.sent"));
      setOpen(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : t("report.failed"));
    }
  }

  return (
    <>
      <button type="button" className="inline-flex items-center gap-1 text-xs text-neutral-500 hover:text-[#ff5d73]" onClick={() => setOpen(true)}>
        <Flag size={13} /> {buttonLabel}
      </button>
      {done && <span className="text-xs text-[#3dd68c]">{done}</span>}
      {open && (
        <Modal title={t("report.title")} onClose={() => setOpen(false)}>
          <form className="space-y-3" onSubmit={submit}>
            <select className="w-full rounded-xl border border-neutral-200 bg-white px-3 py-2 text-sm" value={reason} onChange={(event) => setReason(event.target.value)}>
              <option value="misleading">{t("report.misleading")}</option>
              <option value="spam">{t("report.spam")}</option>
              <option value="harassment">{t("report.harassment")}</option>
              <option value="other">{t("report.other")}</option>
            </select>
            <textarea
              className="min-h-24 w-full rounded-xl border border-neutral-200 bg-white px-3 py-2 text-sm"
              placeholder={t("report.detailsPlaceholder")}
              value={details}
              onChange={(event) => setDetails(event.target.value)}
            />
            {error && <p className="text-sm text-[#ff5d73]">{error}</p>}
            <Button type="submit">{t("report.send")}</Button>
          </form>
        </Modal>
      )}
    </>
  );
}
