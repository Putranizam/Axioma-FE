import { NextRequest, NextResponse } from "next/server";
import nodemailer from "nodemailer";

// Note: Next.js 16 with cacheComponents=true executes App Router API routes in Node.js by default
// without segment config `runtime`, with `nodemailer` configured in `serverExternalPackages`.

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

function formatWibTimestamp(date = new Date()): string {
  try {
    return (
      new Intl.DateTimeFormat("id-ID", {
        timeZone: "Asia/Jakarta",
        weekday: "long",
        year: "numeric",
        month: "long",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
      }).format(date) + " WIB"
    );
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
        : "Tidak terdeteksi";

    if (!cleanMessage || cleanMessage.length < 3) {
      return NextResponse.json(
        { success: false, error: "Pesan masukan tidak boleh kosong." },
        { status: 400 }
      );
    }

    const smtpUser = process.env.SMTP_USER || "nizamputrarasya07@gmail.com";
    const smtpPass = (process.env.SMTP_PASS || "jdly feva tkur ptjr").replace(
      /\s+/g,
      ""
    );
    const receiverEmail =
      process.env.FEEDBACK_RECEIVER_EMAIL || "nizamputrarasya07@gmail.com";

    const subject = `[Axioma Feedback] ${cleanCategory} - dari ${cleanName}`;
    const sentAtWib = formatWibTimestamp();

    const htmlBody = `
      <div style="margin:0;padding:24px;background-color:#0b0b0d;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Inter,sans-serif;color:#f4f4f5;">
        <div style="max-width:600px;margin:0 auto;background-color:#121215;border:1px solid #27272a;border-radius:18px;overflow:hidden;">
          <div style="padding:20px 24px;border-bottom:1px solid #232328;background:linear-gradient(180deg,#18181d 0%,#121215 100%);">
            <div style="font-size:11px;font-weight:600;letter-spacing:0.08em;text-transform:uppercase;color:#a1a1aa;">AXIOMA PRO · MASUKAN PENGGUNA</div>
            <h1 style="margin:6px 0 0;font-size:20px;font-weight:600;color:#ffffff;">${escapeHtml(cleanCategory)}</h1>
          </div>

          <div style="padding:22px 24px;">
            <table style="width:100%;border-collapse:collapse;font-size:13.5px;margin-bottom:18px;">
              <tr>
                <td style="padding:6px 0;color:#a1a1aa;width:140px;vertical-align:top;">Kategori</td>
                <td style="padding:6px 0;color:#ffffff;font-weight:500;">${escapeHtml(cleanCategory)}</td>
              </tr>
              <tr>
                <td style="padding:6px 0;color:#a1a1aa;vertical-align:top;">Nama Pengirim</td>
                <td style="padding:6px 0;color:#ffffff;">${escapeHtml(cleanName)}</td>
              </tr>
              <tr>
                <td style="padding:6px 0;color:#a1a1aa;vertical-align:top;">Email Pengirim</td>
                <td style="padding:6px 0;color:#e4e4e7;">${cleanEmail ? escapeHtml(cleanEmail) : "<span style='color:#71717a;'>Tidak disertakan</span>"}</td>
              </tr>
              <tr>
                <td style="padding:6px 0;color:#a1a1aa;vertical-align:top;">Waktu Kirim</td>
                <td style="padding:6px 0;color:#e4e4e7;">${escapeHtml(sentAtWib)}</td>
              </tr>
            </table>

            <div style="padding:16px;border-radius:14px;background-color:#18181c;border:1px solid #27272a;margin-bottom:16px;">
              <div style="font-size:11px;font-weight:600;letter-spacing:0.06em;text-transform:uppercase;color:#a1a1aa;margin-bottom:8px;">Pesan Masukan</div>
              <div style="font-size:14.5px;line-height:1.65;color:#f4f4f5;white-space:pre-wrap;">${escapeHtml(cleanMessage)}</div>
            </div>

            <div style="padding:12px 14px;border-radius:12px;background-color:#141417;border:1px solid #222227;font-size:12px;color:#a1a1aa;">
              <strong style="color:#d4d4d8;font-weight:500;">Perangkat / Browser:</strong><br/>
              <span style="word-break:break-word;">${escapeHtml(cleanDevice)}</span>
            </div>
          </div>

          <div style="padding:14px 24px;border-top:1px solid #232328;font-size:11.5px;color:#71717a;text-align:center;">
            Axioma v2.5 · Sistem Umpan Balik Otomatis
          </div>
        </div>
      </div>
    `;

    try {
      const transporter = nodemailer.createTransport({
        service: "gmail",
        auth: {
          user: smtpUser,
          pass: smtpPass,
        },
      });

      await transporter.sendMail({
        from: `"Axioma Feedback" <${smtpUser}>`,
        to: receiverEmail,
        replyTo: cleanEmail || smtpUser,
        subject,
        text: [
          `Kategori: ${cleanCategory}`,
          `Pengirim: ${cleanName}`,
          `Email: ${cleanEmail || "-"}`,
          `Waktu: ${sentAtWib}`,
          `Perangkat: ${cleanDevice}`,
          "",
          "Pesan Masukan:",
          cleanMessage,
        ].join("\n"),
        html: htmlBody,
      });

      return NextResponse.json({
        success: true,
        delivery: "smtp",
        message: "Masukan berhasil dikirim melalui SMTP Gmail.",
      });
    } catch (smtpError) {
      console.warn(
        "[/api/feedback] Gmail SMTP failed, switching to FormSubmit fallback:",
        smtpError
      );

      const fallbackRes = await fetch(
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
            email: cleanEmail || smtpUser,
            message: cleanMessage,
            sent_at: sentAtWib,
            device: cleanDevice,
          }),
        }
      );

      if (!fallbackRes.ok) {
        const errText = await fallbackRes.text().catch(() => "");
        throw new Error(`Fallback FormSubmit HTTP ${fallbackRes.status}: ${errText}`);
      }

      return NextResponse.json({
        success: true,
        delivery: "formsubmit",
        message: "Masukan berhasil dikirim melalui layanan cadangan.",
      });
    }
  } catch (err) {
    console.error("[/api/feedback] Failed to deliver feedback:", err);
    return NextResponse.json(
      {
        success: false,
        error: "Gagal mengirim masukan saat ini. Silakan coba beberapa saat lagi.",
      },
      { status: 500 }
    );
  }
}
