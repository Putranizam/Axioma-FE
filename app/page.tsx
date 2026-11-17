import ChatInterface from "@/components/ChatInterface";

export default function Home() {
  return (
    <main className="fixed inset-0 w-full h-full overflow-hidden bg-bg-primary dark:bg-black flex flex-col">
      <ChatInterface />
    </main>
  );
}
