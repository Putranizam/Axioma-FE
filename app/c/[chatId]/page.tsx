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
    <main className="fixed inset-0 h-[100dvh] max-h-[100dvh] w-full overflow-hidden bg-black flex flex-col">
      <Suspense fallback={<div className="h-full w-full bg-black" />}>
        <ChatRouteResolver params={params} />
      </Suspense>
    </main>
  );
}

