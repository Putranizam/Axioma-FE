import { ImageResponse } from "next/og";
import fs from "node:fs";
import path from "node:path";

export const alt = "Axioma — Ruang Kerja Agen AI Cerdas";
export const size = {
  width: 1200,
  height: 630,
};
export const contentType = "image/png";

function getLogoDataUri(): string {
  try {
    const logoPath = path.join(process.cwd(), "public/brand/axioma-logo.png");
    if (fs.existsSync(logoPath)) {
      const buffer = fs.readFileSync(logoPath);
      return `data:image/png;base64,${buffer.toString("base64")}`;
    }
  } catch {}
  return "";
}

export default function OpenGraphImage() {
  const logoDataUri = getLogoDataUri();

  return new ImageResponse(
    (
      <div
        style={{
          height: "100%",
          width: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          padding: "72px 80px",
          backgroundColor: "#09090b",
          color: "#fafafa",
          fontFamily: "sans-serif",
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "18px",
          }}
        >
          {logoDataUri ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={logoDataUri}
              alt="Axioma"
              width={56}
              height={56}
              style={{
                width: "56px",
                height: "56px",
                borderRadius: "14px",
                border: "1px solid rgba(255, 255, 255, 0.15)",
              }}
            />
          ) : (
            <div
              style={{
                width: "56px",
                height: "56px",
                borderRadius: "14px",
                backgroundColor: "#18181b",
                border: "1px solid #27272a",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: "28px",
                fontWeight: 700,
                color: "#fafafa",
              }}
            >
              A
            </div>
          )}
          <span
            style={{
              fontSize: "26px",
              fontWeight: 700,
              letterSpacing: "0.08em",
              textTransform: "uppercase",
              color: "#fafafa",
            }}
          >
            AXIOMA
          </span>
        </div>

        <div
          style={{
            display: "flex",
            flexDirection: "column",
            gap: "20px",
            maxWidth: "960px",
          }}
        >
          <div
            style={{
              fontSize: "60px",
              fontWeight: 700,
              lineHeight: 1.15,
              letterSpacing: "-0.02em",
              color: "#fafafa",
            }}
          >
            Ruang Kerja Agen AI Cerdas untuk Analisis, Penulisan &amp; Kode
          </div>
          <div
            style={{
              fontSize: "26px",
              lineHeight: 1.45,
              color: "#a1a1aa",
            }}
          >
            Tiga mode spesialis — Axioma Pro, Axioma Omni, dan Axioma Architect — dalam satu
            antarmuka minimalis berbahasa Indonesia.
          </div>
        </div>

        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            borderTop: "1px solid #27272a",
            paddingTop: "24px",
            fontSize: "20px",
            color: "#71717a",
          }}
        >
          <span>Axioma v2.5 · Ruang Kerja Pro</span>
          <span>Bahasa Indonesia</span>
        </div>
      </div>
    ),
    {
      ...size,
    }
  );
}
