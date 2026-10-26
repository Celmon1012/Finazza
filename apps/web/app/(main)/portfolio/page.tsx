"use client";

import { useEffect, useState } from "react";
import { InvestmentCard, InvestmentEditor } from "@/components/investments";
import { PageHeader } from "@/components/shell";
import { Button, Empty, Spinner } from "@/components/ui";
import { api } from "@/lib/api";
import type { Investment } from "@/lib/types";
import { DISCLAIMER } from "@/lib/utils";

export default function PortfolioPage() {
  const [items, setItems] = useState<Investment[]>([]);
  const [editing, setEditing] = useState<Investment | null | "new">(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api<{ investments: Investment[] }>("/api/investments/me")
      .then((data) => setItems(data.investments))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div>
      <PageHeader title="Portfolio" subtitle="Manual trades and holdings" />
      <div className="flex items-center justify-between px-4 py-3">
        <p className="max-w-md text-xs leading-5 text-neutral-500">{DISCLAIMER}</p>
        <Button onClick={() => setEditing("new")}>Add</Button>
      </div>
      {editing && (
        <div className="px-4 pb-4">
          <InvestmentEditor
            initial={editing === "new" ? null : editing}
            onCancel={() => setEditing(null)}
            onSaved={(investment) => {
              setItems((current) => {
                const rest = current.filter((item) => item.id !== investment.id);
                return [investment, ...rest];
              });
              setEditing(null);
            }}
          />
        </div>
      )}
      {loading && <Spinner />}
      {!loading && items.length === 0 && <Empty title="No records yet" body="Add a holding or a completed trade. Units can be shares, kilograms, troy ounces, or pieces." />}
      {items.map((item) => (
        <div key={item.id}>
          <InvestmentCard
            item={item}
            mine
            onChange={(next) => {
              if (!next) setItems((current) => current.filter((row) => row.id !== item.id));
              else setItems((current) => current.map((row) => (row.id === item.id ? next : row)));
            }}
          />
          <div className="px-4 pb-3">
            <button type="button" className="text-xs text-[#c56a00]" onClick={() => setEditing(item)}>
              Edit record
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}
