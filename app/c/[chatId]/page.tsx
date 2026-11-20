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
    <main className="fixed top-0 left-0 right-0 w-full h-[var(--app-height)] overflow-hidden bg-[#f9f9f8] dark:bg-[#0e0e10] flex flex-col">
      <Suspense fallback={<div className="h-full w-full bg-[#f9f9f8] dark:bg-[#0e0e10]" />}>
        <ChatRouteResolver params={params} />
      </Suspense>
    </main>
  );
}

