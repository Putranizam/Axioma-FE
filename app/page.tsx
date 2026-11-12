import ChatInterface from "@/components/ChatInterface";

export default function Home() {
  return (
    <main className="fixed inset-0 h-[var(--app-height)] max-h-[var(--app-height)] w-full overflow-hidden bg-black flex flex-col">
      <ChatInterface />
    </main>
  );
}
