import ChatInterface from "@/components/ChatInterface";

export default function Home() {
  return (
    <main
      style={{ height: "var(--viewport-height, 100dvh)" }}
      className="w-full overflow-hidden"
    >
      <ChatInterface />
    </main>
  );
}
