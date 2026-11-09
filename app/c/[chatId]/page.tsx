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
    <main className="h-full w-full overflow-hidden bg-[#09090b]">
      <Suspense fallback={<div className="h-full w-full bg-[#09090b]" />}>
        <ChatRouteResolver params={params} />
      </Suspense>
    </main>
  );
}

