import ChatInterface from "@/components/ChatInterface";

export default function Home() {
  return (
    <main className="axioma-root-shell fixed inset-0 w-full h-full pb-0 overflow-hidden bg-[#f8f9fa] dark:bg-[#09090b] flex flex-col">
      <ChatInterface />
    </main>
  );
}
