"use client";

import React from "react";
import {
  ADAPTIVE_ANSWER_ACTIONS,
  type AdaptiveAnswerAction,
} from "@/constants/language";

interface FollowUpChipsProps {
  onSelectAction: (action: AdaptiveAnswerAction) => void;
}

export function FollowUpChips({ onSelectAction }: FollowUpChipsProps) {
  return (
    <div
      role="group"
      aria-label="Tindakan lanjutan cepat"
      className="w-full max-w-full flex flex-nowrap items-center gap-1.5 overflow-x-auto no-scrollbar pt-1.5 pb-0.5"
    >
      {ADAPTIVE_ANSWER_ACTIONS.map((action) => (
        <button
          key={action.id}
          type="button"
          onClick={() => onSelectAction(action)}
          className="shrink-0 whitespace-nowrap px-3 py-1 rounded-full text-[11.5px] font-medium tracking-tight bg-transparent text-zinc-600 hover:text-zinc-950 hover:bg-zinc-200/50 border border-zinc-200/90 dark:bg-transparent dark:text-zinc-400 dark:hover:text-zinc-100 dark:hover:bg-white/[0.06] dark:border-white/[0.09] transition-colors cursor-pointer active:scale-[0.97] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zinc-400/50 dark:focus-visible:ring-zinc-600/60"
        >
          {action.label}
        </button>
      ))}
    </div>
  );
}
