"use client";

import React, { useState, useEffect } from "react";
import Image from "next/image";
import { createClient } from "@supabase/supabase-js";
import {
  Plus,
  MessageSquare,
  User,
  Settings,
  X,
  Sparkles,
} from "lucide-react";

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!);

interface SidebarProps {
  activeChatId?: string;
  isMobileSidebarOpen?: boolean;
  setIsMobileSidebarOpen?: (open: boolean) => void;
  handleCreateNewChat?: () => void;
  handleSelectChat?: (chatId: string) => void;
}

export default function Sidebar({
  activeChatId = "new-chat",
  isMobileSidebarOpen = false,
  setIsMobileSidebarOpen = () => {},
  handleCreateNewChat = () => {},
  handleSelectChat = () => {},
}: SidebarProps) {
  const [chatHistory, setChatHistory] = useState<any[]>([]);

  useEffect(() => {
    const fetchChats = async () => {
      const { data, error } = await supabase
        .from("chats")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) {
        console.error(error);
      } else if (data) {
        setChatHistory(data);
      }
    };
    fetchChats();

    const channel = supabase
      .channel("chats-inserts")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "chats" },
        (payload) => {
          setChatHistory((prev) =>
            prev.some((chat) => chat.id === payload.new.id)
              ? prev.map((chat) => (chat.id === payload.new.id ? { ...chat, ...payload.new } : chat))
              : [payload.new, ...prev]
          );
        }
      )
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "chats" },
        (payload) => {
          setChatHistory((prev) =>
            prev.map((chat) => (chat.id === payload.new.id ? { ...chat, ...payload.new } : chat))
          );
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  return (
    <aside
      className={`fixed inset-y-0 left-0 z-40 w-[260px] bg-[#09090b] border-r border-zinc-800/40 flex flex-col transition-transform duration-300 ease-in-out md:static md:translate-x-0 ${
        isMobileSidebarOpen ? "translate-x-0" : "-translate-x-full"
      }`}
    >
      {/* Brand Header */}
      <div className="h-14 flex items-center justify-between px-4 shrink-0">
        <div className="flex items-center gap-2.5">
          <Image
            src="/brand/axioma-logo.png"
            alt="Axioma"
            width={32}
            height={32}
            className="w-7 h-7 sm:w-8 sm:h-8 object-contain rounded-lg shrink-0 dark:ring-1 dark:ring-white/10"
            priority
          />
          <div className="flex items-center gap-1.5">
            <span className="font-semibold text-xs tracking-tight uppercase text-zinc-100">Axioma</span>
            <span className="px-1.5 py-0.5 rounded text-[10px] bg-zinc-900 text-zinc-400 font-mono tracking-tight border border-zinc-800/60">v2.5</span>
          </div>
        </div>
        <button
          type="button"
          onClick={() => setIsMobileSidebarOpen(false)}
          className="md:hidden p-1.5 rounded-lg text-zinc-400 hover:text-zinc-200 hover:bg-zinc-900 transition-colors"
          aria-label="Tutup menu"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* New Chat Button */}
      <div className="px-3 pb-2 shrink-0">
        <button
          type="button"
          onClick={handleCreateNewChat}
          className="w-full flex items-center justify-between px-3 py-2 rounded-lg bg-zinc-900/80 hover:bg-zinc-800 active:scale-[0.98] text-zinc-200 text-xs font-medium tracking-tight transition-all duration-200 border border-zinc-800/60 shadow-sm hover:border-zinc-700/60"
        >
          <span className="flex items-center gap-2">
            <Plus className="w-3.5 h-3.5 text-zinc-400" />
            <span>Percakapan Baru</span>
          </span>
        </button>
      </div>

      {/* History */}
      <div className="flex-1 overflow-y-auto px-2 py-2 space-y-4 [scrollbar-width:thin] [scrollbar-color:#27272a_transparent] [&::-webkit-scrollbar]:w-1 [&::-webkit-scrollbar-track]:bg-transparent [&::-webkit-scrollbar-thumb]:bg-zinc-800 [&::-webkit-scrollbar-thumb]:rounded-full">
        <div className="space-y-1">
          {chatHistory.map((chat) => {
            const isActive = chat.id === activeChatId;
            return (
              <button
                type="button"
                key={chat.id}
                onClick={() => handleSelectChat(chat.id)}
                className={`w-full text-left px-2.5 py-2 rounded-lg text-xs tracking-tight flex items-center gap-2.5 transition-colors ${
                  isActive
                    ? "bg-zinc-900/90 text-zinc-100 font-medium"
                    : "text-zinc-400 hover:text-zinc-200 hover:bg-zinc-900/40"
                }`}
              >
                <MessageSquare className="w-3.5 h-3.5 shrink-0 text-zinc-500" />
                <span className="truncate font-medium">{chat.title}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* User Profile */}
      <div className="p-2 shrink-0">
        <div className="flex items-center justify-between p-2 rounded-xl hover:bg-zinc-900/60 transition-colors cursor-pointer group">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-8 h-8 rounded-full bg-zinc-900 flex items-center justify-center shrink-0 text-zinc-300">
              <User className="w-4 h-4" />
            </div>
            <div className="min-w-0">
              <div className="text-xs font-medium tracking-tight text-zinc-200 truncate">Alex Vance</div>
              <div className="text-xs text-gray-400 truncate">Ruang Kerja Pro</div>
            </div>
          </div>
          <Settings className="w-4 h-4 text-zinc-500 group-hover:text-zinc-300 transition-colors" />
        </div>
      </div>
    </aside>
  );
}

