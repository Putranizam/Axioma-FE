import ChatInterface from "@/components/ChatInterface";

export default function Home() {
  return (
    <main className="axioma-root-shell fixed inset-0 w-full h-full pb-0 overflow-hidden bg-[#fafafa] dark:bg-[#0c0c0e] flex flex-col">
      <ChatInterface />
    </main>
  );
}
