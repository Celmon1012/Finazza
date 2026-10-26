"use client";

import { useParams } from "next/navigation";
import { ChatView } from "@/components/chat-view";

export default function ChatThreadPage() {
  const params = useParams<{ id: string }>();
  return <ChatView activeId={params.id} />;
}
