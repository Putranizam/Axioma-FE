import { NextResponse } from "next/server";

export async function GET() {
  const html = `<!DOCTYPE html>
<html lang="id">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Menghubungkan Akun Google...</title>
  <style>
    * { box-sizing: border-box; }
    body {
      margin: 0;
      min-height: 100vh;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      background-color: #000000;
      color: #ffffff;
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
      text-align: center;
      padding: 24px;
    }
    .spinner {
      width: 44px;
      height: 44px;
      border: 3px solid rgba(255, 255, 255, 0.15);
      border-radius: 50%;
      border-top-color: #3b82f6;
      animation: spin 0.8s linear infinite;
      margin-bottom: 20px;
    }
    @keyframes spin {
      to { transform: rotate(360deg); }
    }
    h2 {
      font-size: 17px;
      font-weight: 600;
      letter-spacing: -0.01em;
      margin: 0 0 8px 0;
    }
    p {
      font-size: 13px;
      color: #a1a1aa;
      margin: 0;
      max-width: 320px;
      line-height: 1.5;
    }
  </style>
</head>
<body>
  <div class="spinner"></div>
  <h2>Menghubungkan ke Axioma</h2>
  <p id="status-text">Memproses verifikasi akun Google...</p>

  <script>
    (function() {
      try {
        var hash = window.location.hash ? window.location.hash.substring(1) : "";
        var hashParams = new URLSearchParams(hash);
        var searchParams = new URLSearchParams(window.location.search);

        var idToken = hashParams.get("id_token");
        var error = hashParams.get("error") || searchParams.get("error");
        var errorDescription = hashParams.get("error_description") || searchParams.get("error_description");

        var statusEl = document.getElementById("status-text");

        // Case 1: Google returned an error
        if (error) {
          var errMessage = errorDescription || error;
          if (statusEl) statusEl.textContent = "Autentikasi gagal atau dibatalkan.";

          if (window.opener && !window.opener.closed) {
            try {
              window.opener.postMessage({
                type: "AXIOMA_GOOGLE_AUTH",
                error: errMessage
              }, window.location.origin);
              setTimeout(function() { window.close(); }, 400);
              return;
            } catch (e) {}
          }

          try {
            sessionStorage.setItem("axioma_google_auth_error", errMessage);
            localStorage.setItem("axioma_google_auth_error", errMessage);
          } catch (e) {}

          setTimeout(function() {
            window.location.replace("/?auth=google_error");
          }, 600);
          return;
        }

        // Case 2: ID Token received
        if (idToken) {
          if (statusEl) statusEl.textContent = "Berhasil! Mengalihkan ke aplikasi...";

          // Check if opened as popup
          if (window.opener && !window.opener.closed) {
            try {
              window.opener.postMessage({
                type: "AXIOMA_GOOGLE_AUTH",
                idToken: idToken
              }, window.location.origin);
              setTimeout(function() {
                window.close();
              }, 300);
              return;
            } catch (e) {}
          }

          // Redirect flow (mobile or non-popup)
          try {
            sessionStorage.setItem("axioma_pending_google_id_token", idToken);
            localStorage.setItem("axioma_pending_google_id_token", idToken);
          } catch (e) {}

          window.location.replace("/?auth=google_success");
          return;
        }

        // Case 3: No token or error (e.g. direct load)
        window.location.replace("/");
      } catch (err) {
        window.location.replace("/");
      }
    })();
  </script>
</body>
</html>`;

  return new NextResponse(html, {
    status: 200,
    headers: {
      "Content-Type": "text/html; charset=utf-8",
      "Cache-Control": "no-store, no-cache, must-revalidate, proxy-revalidate, max-age=0",
    },
  });
}

