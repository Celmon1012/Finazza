"use client";

import { LegalDocument } from "@/components/legal-document";
import { useI18n } from "@/lib/i18n/provider";
import { getPrivacy } from "@/lib/legal";

export default function PrivacyPage() {
  const { locale } = useI18n();
  const doc = getPrivacy(locale);
  return (
    <LegalDocument
      title={doc.title}
      meta={doc.meta}
      notice={doc.notice}
      otherHref="/terms"
      otherLabel={doc.otherLabel}
      sections={doc.sections}
    />
  );
}
