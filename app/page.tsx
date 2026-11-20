import ChatInterface from "@/components/ChatInterface";

export default function Home() {
  return (
    <main className="axioma-root-shell fixed top-0 left-0 right-0 w-full h-[var(--app-height)] pb-0 overflow-hidden bg-[#f9f9f8] dark:bg-[#0e0e10] flex flex-col">
      <ChatInterface />
    </main>
  );
}
