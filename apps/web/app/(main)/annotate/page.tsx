"use client";

import { Annotator } from "@/components/annotator";
import { PageHeader } from "@/components/shell";

export default function AnnotatePage() {
  return (
    <div>
      <PageHeader title="Chart annotator" subtitle="Draw on an uploaded image" />
      <Annotator />
    </div>
  );
}
