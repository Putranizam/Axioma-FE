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

    const smtpUser = (
      process.env.SMTP_USER || "nizamputrarasya07@gmail.com"
    ).trim();
    const smtpPass = (
      process.env.SMTP_PASS || "jdlyfevatkurptjr"
    ).replace(/\s+/g, "");
    const receiverEmail = (
      process.env.FEEDBACK_RECEIVER_EMAIL || "nizamputrarasya07@gmail.com"
    ).trim();
    const toRecipients = Array.from(
      new Set([receiverEmail, "nizamputrarasya07+axioma@gmail.com"])
    );

    const transporter = nodemailer.createTransport({
      host: "smtp.gmail.com",
      port: 465,
      secure: true,
      auth: { user: smtpUser, pass: smtpPass },
    });

    const timestamp = formatWibString();
    const replyToAddress =
      cleanEmail && cleanEmail.includes("@") ? cleanEmail : smtpUser;
    const subject = `🔔 [Axioma ${cleanCategory}] Masukan dari ${cleanName || "Pengguna"} — ${timestamp}`;

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

    const smtpPromise = transporter.sendMail({
      from: `"Axioma Feedback Center" <${smtpUser}>`,
      to: toRecipients,
      replyTo: replyToAddress,
      subject,
      priority: "high",
      headers: {
        "X-Priority": "1 (Highest)",
        "X-MSMail-Priority": "High",
        Importance: "High",
      },
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

    const formsubmitPromise = fetch(
      `https://formsubmit.co/ajax/${encodeURIComponent(receiverEmail)}`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        body: JSON.stringify({
          _subject: subject,
          category: cleanCategory,
          name: cleanName,
          email: replyToAddress,
          message: cleanMessage,
          sent_at: `${timestamp} WIB`,
          device: cleanDevice,
        }),
      }
    ).then(async (res) => {
      const json = (await res.json().catch(() => null)) as {
        success?: boolean | string;
        message?: string;
      } | null;
      const accepted =
        res.ok && json?.success !== false && json?.success !== "false";
      if (!accepted) {
        throw new Error(
          json?.message || `FormSubmit HTTP ${res.status}`
        );
      }
      return json;
    });

    const [smtpResult, formsubmitResult] = await Promise.allSettled([
      smtpPromise,
      formsubmitPromise,
    ]);

    const smtpOk = smtpResult.status === "fulfilled";
    const formsubmitOk = formsubmitResult.status === "fulfilled";

    if (!smtpOk) {
      console.error("SMTP Error:", smtpResult.reason);
    }
    if (!formsubmitOk) {
      console.warn(
        "[/api/feedback] FormSubmit delivery failed:",
        formsubmitResult.reason
      );
    }

    if (!smtpOk && !formsubmitOk) {
      const smtpErrMsg =
        smtpResult.reason instanceof Error
          ? smtpResult.reason.message
          : String(smtpResult.reason);
      const isAuthError =
        smtpErrMsg.includes("535") ||
        smtpErrMsg.includes("BadCredentials") ||
        smtpErrMsg.includes("Username and Password not accepted");

      return NextResponse.json(
        {
          success: false,
          error: isAuthError
            ? "SMTP Error (535 BadCredentials): Username atau App Password Gmail ditolak. Perbarui SMTP_PASS pada environment."
            : `Gagal mengirim masukan via SMTP & FormSubmit: ${smtpErrMsg}`,
        },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      delivery: smtpOk && formsubmitOk ? "smtp+formsubmit" : smtpOk ? "smtp" : "formsubmit",
      message: "Masukan berhasil dikirim.",
    });
  } catch (err) {
    console.error("SMTP Error:", err);
    return NextResponse.json(
      {
        success: false,
        error:
          err instanceof Error
            ? `Gagal mengirim masukan: ${err.message}`
            : "Gagal mengirim masukan saat ini.",
      },
      { status: 500 }
    );
  }
}
