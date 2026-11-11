import ChatInterface from "@/components/ChatInterface";

export default function Home() {
  return (
    <main className="fixed inset-0 h-[100dvh] max-h-[100dvh] w-full overflow-hidden bg-black flex flex-col">
      <ChatInterface />
    </main>
  );
}
