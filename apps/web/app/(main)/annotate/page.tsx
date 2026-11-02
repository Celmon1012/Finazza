"use client";

import { Annotator } from "@/components/annotator";
import { PageHeader } from "@/components/shell";
import { useI18n } from "@/lib/i18n/provider";

export default function AnnotatePage() {
  const { t } = useI18n();
  return (
    <div>
      <PageHeader title={t("annotate.title")} subtitle={t("annotate.subtitle")} />
      <Annotator />
    </div>
  );
}
