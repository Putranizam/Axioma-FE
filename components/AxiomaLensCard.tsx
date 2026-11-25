"use client";

import React from "react";

export interface AxiomaLensData {
  topic: string;
  pros: string[];
  cons: string[];
  blindspots: string[];
  axioma: string;
}

export interface AxiomaLensCardProps {
  data: AxiomaLensData;
}

export const AxiomaLensCard: React.FC<AxiomaLensCardProps> = ({ data }) => {
  return (
    <div className="w-full max-w-2xl space-y-3 my-1">
      {/* Subtle Topic Header */}
      {data.topic && (
        <div className="flex items-center gap-2 text-xs text-zinc-500 dark:text-zinc-400">
          <span className="text-[10px] font-medium uppercase tracking-wider px-2 py-0.5 rounded-full border border-zinc-200 dark:border-white/[0.1] bg-zinc-100 dark:bg-white/[0.05] text-zinc-700 dark:text-zinc-300">
            Axioma Lens
          </span>
          <span className="font-medium text-zinc-900 dark:text-zinc-100 truncate">
            {data.topic}
          </span>
        </div>
      )}

      {/* 2-Column Responsive Grid: Pros vs Cons */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {/* Left Card: Peluang / Pro */}
        <section className="rounded-2xl border border-zinc-200 dark:border-white/[0.08] bg-white dark:bg-white/[0.03] p-4 space-y-2.5">
          <h4 className="text-[10px] font-semibold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
            Peluang / Pro
          </h4>
          {data.pros.length > 0 ? (
            <ul className="space-y-1.5 text-xs leading-relaxed text-zinc-900 dark:text-zinc-100">
              {data.pros.map((item, idx) => (
                <li key={idx} className="flex items-start gap-2">
                  <span
                    aria-hidden="true"
                    className="mt-1.5 w-1 h-1 rounded-full bg-zinc-700 dark:bg-zinc-300 shrink-0"
                  />
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-xs text-zinc-500 dark:text-zinc-400">-</p>
          )}
        </section>

        {/* Right Card: Celah / Kontra */}
        <section className="rounded-2xl border border-zinc-200 dark:border-white/[0.08] bg-white dark:bg-white/[0.03] p-4 space-y-2.5">
          <h4 className="text-[10px] font-semibold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
            Celah / Kontra
          </h4>
          {data.cons.length > 0 ? (
            <ul className="space-y-1.5 text-xs leading-relaxed text-zinc-900 dark:text-zinc-100">
              {data.cons.map((item, idx) => (
                <li key={idx} className="flex items-start gap-2">
                  <span
                    aria-hidden="true"
                    className="mt-1.5 w-1 h-1 rounded-full bg-zinc-400 dark:bg-zinc-500 shrink-0"
                  />
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-xs text-zinc-500 dark:text-zinc-400">-</p>
          )}
        </section>
      </div>

      {/* Bottom Full-Width Block: AKSIOMA & Blindspots */}
      <section className="rounded-2xl border border-zinc-200 dark:border-white/[0.1] bg-zinc-50 dark:bg-white/[0.04] p-4 space-y-2.5">
        <div className="space-y-1">
          <span className="block text-[10px] font-semibold uppercase tracking-widest text-zinc-500 dark:text-zinc-400">
            AKSIOMA
          </span>
          <p className="text-xs sm:text-[13px] font-medium text-zinc-900 dark:text-zinc-100 leading-relaxed">
            {data.axioma ||
              "Pertimbangkan keseimbangan manfaat jangka panjang dan risiko utama sebelum memutuskan."}
          </p>
        </div>

        {data.blindspots.length > 0 && (
          <div className="pt-2 border-t border-zinc-200 dark:border-white/[0.08] text-[11px] text-zinc-700 dark:text-zinc-300 leading-relaxed">
            <span className="font-medium text-zinc-500 dark:text-zinc-400 mr-1.5">
              Asumsi Tersembunyi:
            </span>
            <span>{data.blindspots.join(" · ")}</span>
          </div>
        )}
      </section>
    </div>
  );
};
