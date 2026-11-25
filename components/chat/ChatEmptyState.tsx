"use client";

import React from "react";
import { AxiomaLogoMark } from "../AxiomaLogoMark";

interface ChatEmptyStateProps {
  variant: "mobile" | "desktop";
  greeting: string;
  isLoading?: boolean;
  isExiting?: boolean;
}

export function ChatEmptyState({
  variant,
  greeting,
  isLoading = false,
  isExiting = false,
}: ChatEmptyStateProps) {
  if (variant === "desktop") {
    return (
      <div className="hidden md:flex flex-col items-center text-center pointer-events-none select-none w-full mb-7">
        <div className="mb-3.5 flex items-center justify-center">
          <AxiomaLogoMark className="w-10 h-10" />
        </div>
        {isLoading ? (
          <div
            role="status"
            aria-label="Memuat ruang kerja"
            className="flex flex-col items-center min-h-[34px] justify-center"
          >
            <div className="h-8 w-[320px] rounded-xl bg-border-subtle animate-pulse" />
          </div>
        ) : (
          <h1 className="font-heading text-[26px] font-medium leading-[1.3] tracking-[-0.02em] text-zinc-900 dark:text-zinc-100 text-center text-balance min-h-[34px] flex items-center justify-center">
            {greeting}
          </h1>
        )}
      </div>
    );
  }

  return (
    <div
      className={`md:hidden flex-1 min-h-0 w-full overflow-hidden flex flex-col items-center justify-center px-5 -mt-6 text-center pointer-events-none transition-opacity duration-200 ${
        isExiting ? "opacity-0" : "opacity-100"
      }`}
    >
      <div className="w-full max-w-[340px] mx-auto flex flex-col items-center">
        <div className="mb-3.5 flex items-center justify-center select-none">
          <AxiomaLogoMark className="w-10 h-10" />
        </div>
        <h1 className="font-heading text-[22px] font-medium leading-[1.3] tracking-[-0.02em] text-zinc-900 dark:text-zinc-100 text-center text-balance min-h-[58px] flex items-center justify-center select-none">
          {greeting}
        </h1>
      </div>
    </div>
  );
}
