import { NextRequest, NextResponse } from "next/server";
import nodemailer from "nodemailer";

// Catatan Next.js 16: karena next.config.ts mengaktifkan `cacheComponents: true`,
// Route Handler POST otomatis berjalan dinamis di runtime Node.js (`ƒ /api/feedback`)
// dan compiler SWC melarang ekspor manual `export const runtime` / `export const dynamic`.

interface FeedbackRequestBody {
  category?: unknown;
  message?: unknown;
  userEmail?: unknown;
  userName?: unknown;
  deviceInfo?: unknown;
}

function escapeHtml(raw: string): string {
  return raw
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function formatWibString(date = new Date()): string {
  try {
    return date.toLocaleString("id-ID", { timeZone: "Asia/Jakarta" });
  } catch {
    return date.toISOString();
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json().catch(() => null)) as FeedbackRequestBody | null;
    if (!body) {
      return NextResponse.json(
        { success: false, error: "Payload masukan tidak valid." },
        { status: 400 }
      );
    }

    const cleanCategory =
      typeof body.category === "string" && body.category.trim()
        ? body.category.trim().slice(0, 60)
        : "Lainnya";
    const cleanMessage =
      typeof body.message === "string" ? body.message.trim().slice(0, 4000) : "";
    const cleanEmail =
      typeof body.userEmail === "string" ? body.userEmail.trim().slice(0, 160) : "";
    const cleanName =
      typeof body.userName === "string" && body.userName.trim()
        ? body.userName.trim().slice(0, 80)
        : "Pengguna";
    const cleanDevice =
      typeof body.deviceInfo === "string" && body.deviceInfo.trim()
        ? body.deviceInfo.trim().slice(0, 300)
        : "Unknown";

    if (!cleanMessage || cleanMessage.length < 3) {
      return NextResponse.json(
        {
          success: false,
          error: "Pesan masukan tidak boleh kosong (minimal 3 karakter).",
        },
        { status: 400 }
      );
    }

    const smtpUser = (process.env.SMTP_USER || process.env.GMAIL_USER || "").trim();
    const smtpPass = (process.env.SMTP_PASS || process.env.GMAIL_PASS || "").replace(/\s+/g, "");
    const receiverEmail = (
      process.env.FEEDBACK_RECEIVER_EMAIL ||
      smtpUser ||
      "axiomamyid@gmail.com"
    ).trim();

    const timestamp = formatWibString();
    const replyToAddress =
      cleanEmail && cleanEmail.includes("@") ? cleanEmail : smtpUser || receiverEmail;
    const subject = `[Axioma ${cleanCategory}] Masukan dari ${cleanName || "Pengguna"} — ${timestamp}`;

    const htmlBody = `
      <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 560px; margin: 0 auto; background: #0d0d10; color: #f4f4f5; border-radius: 20px; border: 1px solid #27272a; padding: 28px;">
        <div style="display: flex; align-items: center; justify-content: space-between; border-bottom: 1px solid #27272a; padding-bottom: 16px; margin-bottom: 20px;">
          <div>
            <h2 style="margin: 0; font-size: 18px; color: #ffffff;">Masukan Pengguna Axioma</h2>
            <p style="margin: 4px 0 0; font-size: 12px; color: #a1a1aa;">Diterima pada ${escapeHtml(timestamp)} WIB</p>
          </div>
          <span style="background: #27272a; color: #e4e4e7; padding: 5px 12px; border-radius: 999px; font-size: 12px; font-weight: 600;">${escapeHtml(cleanCategory)}</span>
        </div>
        <div style="background: #16161a; border: 1px solid #27272a; border-radius: 14px; padding: 16px; margin-bottom: 18px;">
          <p style="margin: 0; font-size: 15px; line-height: 1.6; color: #ffffff; white-space: pre-wrap;">${escapeHtml(cleanMessage)}</p>
        </div>
        <table style="width: 100%; font-size: 13px; color: #a1a1aa; border-collapse: collapse;">
          <tr><td style="padding: 6px 0; color: #71717a; width: 110px;">Pengirim:</td><td style="padding: 6px 0; color: #e4e4e7; font-weight: 500;">${escapeHtml(cleanName || "Mode Tamu")}</td></tr>
          <tr><td style="padding: 6px 0; color: #71717a;">Email:</td><td style="padding: 6px 0; color: #e4e4e7;">${cleanEmail ? escapeHtml(cleanEmail) : "Tidak dicantumkan"}</td></tr>
          <tr><td style="padding: 6px 0; color: #71717a;">Perangkat:</td><td style="padding: 6px 0; color: #a1a1aa; font-size: 11.5px; word-break: break-word;">${escapeHtml(cleanDevice)}</td></tr>
        </table>
      </div>
    `;

    let smtpOk = false;

    if (smtpUser && smtpPass) {
      try {
        const transporter = nodemailer.createTransport({
          host: "smtp.gmail.com",
          port: 465,
          secure: true,
          auth: { user: smtpUser, pass: smtpPass },
        });

        await transporter.sendMail({
          from: `"Axioma Feedback Center" <${smtpUser}>`,
          to: receiverEmail,
          replyTo: replyToAddress,
          subject,
          text: [
            `Kategori: ${cleanCategory}`,
            `Pengirim: ${cleanName}`,
            `Email: ${cleanEmail || "Tidak dicantumkan"}`,
            `Waktu: ${timestamp} WIB`,
            `Perangkat: ${cleanDevice}`,
            "",
            "Pesan Masukan:",
            cleanMessage,
          ].join("\n"),
          html: htmlBody,
        });

        smtpOk = true;
      } catch (mailErr) {
        console.error("[/api/feedback] SMTP delivery failed:", mailErr);
      }
    } else {
      console.warn(
        "[/api/feedback] SMTP credentials not configured; skipping SMTP email delivery."
      );
    }

    if (!smtpOk) {
      return NextResponse.json(
        {
          success: false,
          emailDelivered: false,
          error:
            "Layanan pengiriman email masukan sedang tidak tersedia atau belum dikonfigurasi.",
        },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      emailDelivered: true,
      delivery: "smtp",
      message: "Terima kasih! Masukan Anda telah diterima.",
    });
  } catch (err) {
    console.error("[/api/feedback] Unexpected route error:", err);
    return NextResponse.json(
      {
        success: false,
        error: "Terjadi kendala sementara saat memproses masukan. Silakan coba lagi.",
      },
      { status: 500 }
    );
  }
}
