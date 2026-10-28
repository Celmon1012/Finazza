import { ChatView } from "@/components/chat-view";

export default function ChatLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <ChatView />
      {children}
    </>
  );
}
