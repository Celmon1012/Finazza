"use client";

import { useState } from "react";
import { Flag } from "lucide-react";
import { api } from "@/lib/api";
import { Button, Modal } from "./ui";

export function ReportButton({
  targetType,
  targetId,
  label = "Report",
}: {
  targetType: "post" | "message" | "proof" | "user";
  targetId: string;
  label?: string;
}) {
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState("misleading");
  const [details, setDetails] = useState("");
  const [done, setDone] = useState("");
  const [error, setError] = useState("");

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setError("");
    try {
      await api("/api/reports", {
        method: "POST",
        body: JSON.stringify({ targetType, targetId, reason, details }),
      });
      setDone("Report sent to moderators.");
      setOpen(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not send the report");
    }
  }

  return (
    <>
      <button type="button" className="inline-flex items-center gap-1 text-xs text-neutral-500 hover:text-[#ff5d73]" onClick={() => setOpen(true)}>
        <Flag size={13} /> {label}
      </button>
      {done && <span className="text-xs text-[#3dd68c]">{done}</span>}
      {open && (
        <Modal title="Report" onClose={() => setOpen(false)}>
          <form className="space-y-3" onSubmit={submit}>
            <select className="w-full rounded-xl border border-neutral-200 bg-white px-3 py-2 text-sm" value={reason} onChange={(event) => setReason(event.target.value)}>
              <option value="misleading">Misleading proof or claim</option>
              <option value="spam">Spam</option>
              <option value="harassment">Harassment</option>
              <option value="other">Something else</option>
            </select>
            <textarea
              className="min-h-24 w-full rounded-xl border border-neutral-200 bg-white px-3 py-2 text-sm"
              placeholder="What should a moderator know?"
              value={details}
              onChange={(event) => setDetails(event.target.value)}
            />
            {error && <p className="text-sm text-[#ff5d73]">{error}</p>}
            <Button type="submit">Send report</Button>
          </form>
        </Modal>
      )}
    </>
  );
}
