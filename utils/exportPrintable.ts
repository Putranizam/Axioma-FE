"use client";

export interface PrintableDocumentOptions {
  title: string;
  subtitle?: string;
  meta?: string;
  bodyHtml: string;
}

export interface PrintableRoleplayReportParams {
  personaLabel: string;
  scenario: string;
  overallScore: number;
  grade: string;
  summary: string;
  strengths: string[];
  weaknesses: string[];
  actionableTips: string[];
}

export interface PrintableStoryboardParams {
  title: string;
  synopsis: string;
  characters: Array<{ name: string; role: string }>;
  scenes: Array<{
    sceneNumber: number;
    duration: string;
    camera: string;
    visual: string;
    dialogue: string;
    videoPrompt: string;
  }>;
}

export function escapePrintableHtml(raw: string): string {
  return String(raw || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function buildPrintableHtml(opts: PrintableDocumentOptions): string {
  const safeTitle = escapePrintableHtml(opts.title);
  const safeSubtitle = opts.subtitle ? escapePrintableHtml(opts.subtitle) : "";
  const safeMeta = opts.meta ? escapePrintableHtml(opts.meta) : "";
  const generatedDate = new Date().toLocaleDateString("id-ID", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });

  return `<!DOCTYPE html>
<html lang="id">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>${safeTitle} — Axioma</title>
  <style>
    @page {
      size: A4;
      margin: 18mm 16mm 20mm 16mm;
    }
    * {
      box-sizing: border-box;
    }
    html, body {
      margin: 0;
      padding: 0;
      background: #ffffff;
      color: #111111;
      font-family: "Plus Jakarta Sans", ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
      font-size: 12.5px;
      line-height: 1.55;
      -webkit-print-color-adjust: exact;
      print-color-adjust: exact;
    }
    .page {
      max-width: 720px;
      margin: 0 auto;
      padding: 20px 12px 36px 12px;
    }
    .doc-header {
      border-bottom: 1.5px solid #111111;
      padding-bottom: 12px;
      margin-bottom: 18px;
    }
    .doc-brand {
      font-size: 10px;
      font-weight: 600;
      letter-spacing: 0.14em;
      text-transform: uppercase;
      color: #555555;
      margin-bottom: 6px;
    }
    h1 {
      margin: 0;
      font-size: 20px;
      font-weight: 700;
      letter-spacing: -0.02em;
      color: #09090b;
      line-height: 1.25;
    }
    .subtitle {
      margin: 5px 0 0 0;
      font-size: 12.5px;
      color: #3f3f46;
    }
    .meta {
      margin-top: 8px;
      font-size: 11px;
      color: #71717a;
    }
    .section {
      margin-bottom: 16px;
      break-inside: avoid;
    }
    .section-label {
      font-size: 10px;
      font-weight: 600;
      text-transform: uppercase;
      letter-spacing: 0.08em;
      color: #52525b;
      margin: 0 0 6px 0;
    }
    .card {
      border: 1px solid #d4d4d8;
      border-radius: 10px;
      padding: 12px 14px;
      margin-bottom: 12px;
      background: #ffffff;
      break-inside: avoid;
    }
    .score-hero {
      border: 1.5px solid #18181b;
      border-radius: 12px;
      padding: 16px;
      margin-bottom: 16px;
      background: #fafafa;
      break-inside: avoid;
    }
    .score-value {
      font-size: 30px;
      font-weight: 700;
      letter-spacing: -0.03em;
      color: #09090b;
      margin: 4px 0 8px 0;
    }
    .grid-2 {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 12px;
      margin-bottom: 14px;
    }
    @media (max-width: 560px) {
      .grid-2 {
        grid-template-columns: 1fr;
      }
    }
    ul, ol {
      margin: 4px 0 0 0;
      padding-left: 18px;
    }
    li {
      margin-bottom: 4px;
      color: #18181b;
    }
    .scene-head {
      display: flex;
      flex-wrap: wrap;
      justify-content: space-between;
      align-items: baseline;
      gap: 8px;
      border-bottom: 1px solid #e4e4e7;
      padding-bottom: 6px;
      margin-bottom: 8px;
    }
    .scene-title {
      font-size: 13px;
      font-weight: 700;
      color: #09090b;
    }
    .scene-meta {
      font-size: 11px;
      color: #52525b;
    }
    .field-block {
      margin-bottom: 8px;
    }
    .field-block:last-child {
      margin-bottom: 0;
    }
    .mono-box {
      font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
      font-size: 11px;
      line-height: 1.5;
      background: #f4f4f5;
      border: 1px solid #e4e4e7;
      border-radius: 8px;
      padding: 8px 10px;
      color: #27272a;
      word-break: break-word;
    }
    .char-list {
      display: flex;
      flex-wrap: wrap;
      gap: 6px;
    }
    .char-pill {
      border: 1px solid #d4d4d8;
      border-radius: 999px;
      padding: 3px 10px;
      font-size: 11px;
      color: #18181b;
      background: #fafafa;
    }
    .doc-footer {
      margin-top: 28px;
      padding-top: 10px;
      border-top: 1px solid #e4e4e7;
      display: flex;
      justify-content: space-between;
      align-items: center;
      font-size: 10px;
      color: #71717a;
      letter-spacing: 0.02em;
    }
  </style>
</head>
<body>
  <main class="page">
    <header class="doc-header">
      <div class="doc-brand">AXIOMA</div>
      <h1>${safeTitle}</h1>
      ${safeSubtitle ? `<p class="subtitle">${safeSubtitle}</p>` : ""}
      <div class="meta">${safeMeta ? `${safeMeta} · ` : ""}${escapePrintableHtml(generatedDate)}</div>
    </header>
    ${opts.bodyHtml}
    <footer class="doc-footer">
      <span>Disusun dengan Axioma · axioma.my.id</span>
      <span>${escapePrintableHtml(generatedDate)}</span>
    </footer>
  </main>
</body>
</html>`;
}

/**
 * Opens a clean monochrome print view and triggers browser Print / Save as PDF.
 * Falls back to a hidden iframe if popups are blocked.
 */
export function openPrintableDocument(opts: PrintableDocumentOptions): boolean {
  if (typeof window === "undefined") return false;
  const html = buildPrintableHtml(opts);

  const popup = window.open("", "_blank", "width=860,height=920");
  if (popup) {
    popup.document.open();
    popup.document.write(html);
    popup.document.close();
    popup.focus();
    window.setTimeout(() => {
      try {
        popup.print();
      } catch {
        // User may have closed the preview tab early
      }
    }, 220);
    return true;
  }

  // Fallback when popup is blocked: hidden iframe print
  try {
    const iframe = document.createElement("iframe");
    iframe.style.position = "fixed";
    iframe.style.right = "0";
    iframe.style.bottom = "0";
    iframe.style.width = "0";
    iframe.style.height = "0";
    iframe.style.border = "0";
    document.body.appendChild(iframe);
    const frameDoc = iframe.contentDocument || iframe.contentWindow?.document;
    if (frameDoc) {
      frameDoc.open();
      frameDoc.write(html);
      frameDoc.close();
      window.setTimeout(() => {
        iframe.contentWindow?.focus();
        iframe.contentWindow?.print();
        window.setTimeout(() => {
          iframe.remove();
        }, 1200);
      }, 220);
      return true;
    }
    iframe.remove();
  } catch {
    // Ignore print fallback errors
  }

  return false;
}

export function exportRoleplayReportPdf(params: PrintableRoleplayReportParams): boolean {
  const strengthsHtml = params.strengths.length
    ? `<ul>${params.strengths
        .map((s) => `<li>${escapePrintableHtml(s)}</li>`)
        .join("")}</ul>`
    : `<p style="margin:0;color:#71717a;">-</p>`;

  const weaknessesHtml = params.weaknesses.length
    ? `<ul>${params.weaknesses
        .map((w) => `<li>${escapePrintableHtml(w)}</li>`)
        .join("")}</ul>`
    : `<p style="margin:0;color:#71717a;">-</p>`;

  const tipsHtml = params.actionableTips.length
    ? `<section class="card">
        <div class="section-label">Saran Perbaikan</div>
        <ol>${params.actionableTips
          .map((t) => `<li>${escapePrintableHtml(t)}</li>`)
          .join("")}</ol>
      </section>`
    : "";

  const bodyHtml = `
    <section class="score-hero">
      <div class="section-label">Rapor Evaluasi Akhir</div>
      <div class="score-value">${escapePrintableHtml(String(params.overallScore))} &middot; ${escapePrintableHtml(params.grade)}</div>
      ${
        params.summary
          ? `<p style="margin:0;color:#27272a;">${escapePrintableHtml(params.summary)}</p>`
          : ""
      }
    </section>

    <div class="grid-2">
      <section class="card" style="margin-bottom:0;">
        <div class="section-label">Kelebihan</div>
        ${strengthsHtml}
      </section>
      <section class="card" style="margin-bottom:0;">
        <div class="section-label">Celah</div>
        ${weaknessesHtml}
      </section>
    </div>

    ${tipsHtml}
  `;

  return openPrintableDocument({
    title: "Rapor Simulasi Roleplay",
    subtitle: params.scenario,
    meta: `Lawan Simulasi: ${params.personaLabel}`,
    bodyHtml,
  });
}

export function exportStoryboardPdf(params: PrintableStoryboardParams): boolean {
  const charactersHtml =
    params.characters.length > 0
      ? `<section class="card">
          <div class="section-label">Daftar Karakter (${params.characters.length})</div>
          <div class="char-list">
            ${params.characters
              .map(
                (c) =>
                  `<span class="char-pill"><strong>${escapePrintableHtml(c.name)}</strong>${
                    c.role ? ` · ${escapePrintableHtml(c.role)}` : ""
                  }</span>`
              )
              .join("")}
          </div>
        </section>`
      : "";

  const scenesHtml = params.scenes
    .map(
      (scene) => `
      <article class="card">
        <div class="scene-head">
          <span class="scene-title">Adegan #${scene.sceneNumber}</span>
          <span class="scene-meta">${escapePrintableHtml(scene.duration)}${
            scene.camera ? ` · ${escapePrintableHtml(scene.camera)}` : ""
          }</span>
        </div>
        <div class="field-block">
          <div class="section-label">Visual</div>
          <div>${escapePrintableHtml(scene.visual || "-")}</div>
        </div>
        <div class="field-block">
          <div class="section-label">Dialog / Narasi</div>
          <div style="white-space:pre-line;">${escapePrintableHtml(scene.dialogue || "-")}</div>
        </div>
        ${
          scene.videoPrompt
            ? `<div class="field-block">
                <div class="section-label">Video Prompt</div>
                <div class="mono-box">${escapePrintableHtml(scene.videoPrompt)}</div>
              </div>`
            : ""
        }
      </article>`
    )
    .join("");

  const bodyHtml = `
    ${charactersHtml}
    <section>
      <div class="section-label">Daftar Adegan (${params.scenes.length})</div>
      ${scenesHtml}
    </section>
  `;

  return openPrintableDocument({
    title: params.title || "Storyboard Axioma Studio",
    subtitle: params.synopsis,
    meta: `Axioma Studio · ${params.scenes.length} Adegan`,
    bodyHtml,
  });
}
