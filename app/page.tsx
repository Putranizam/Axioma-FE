import ChatInterface from "@/components/ChatInterface";

export default function Home() {
  return (
    <main className="axioma-root-shell fixed top-0 left-0 right-0 w-full h-[var(--app-height)] pb-0 overflow-hidden bg-[#fafafa] dark:bg-[#0c0c0e] flex flex-col">
      <ChatInterface />
    </main>
  );
}
