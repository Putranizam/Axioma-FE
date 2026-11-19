import { Suspense } from "react";
import ChatInterface from "@/components/ChatInterface";

interface ChatPageProps {
  params: Promise<{ chatId: string }>;
}

async function ChatRouteResolver({ params }: ChatPageProps) {
  const { chatId } = await params;
  return <ChatInterface initialChatId={chatId} />;
}

export default function ChatPage({ params }: ChatPageProps) {
  return (
    <main className="fixed top-0 left-0 right-0 w-full h-[var(--app-height)] overflow-hidden bg-[#fafafa] dark:bg-[#0c0c0e] flex flex-col">
      <Suspense fallback={<div className="h-full w-full bg-[#fafafa] dark:bg-[#0c0c0e]" />}>
        <ChatRouteResolver params={params} />
      </Suspense>
    </main>
  );
}

