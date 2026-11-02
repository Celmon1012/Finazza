"use client";

import { LegalDocument } from "@/components/legal-document";
import { useI18n } from "@/lib/i18n/provider";
import { getTerms } from "@/lib/legal";

export default function TermsPage() {
  const { locale } = useI18n();
  const doc = getTerms(locale);
  return (
    <LegalDocument
      title={doc.title}
      meta={doc.meta}
      notice={doc.notice}
      otherHref="/privacy"
      otherLabel={doc.otherLabel}
      sections={doc.sections}
    />
  );
}
