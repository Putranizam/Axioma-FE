export interface AttachmentItem {
  id: string;
  original_name: string;
  mime_type: string;
  size_bytes: number;
  width?: number | null;
  height?: number | null;
  page_count?: number | null;
  signed_url?: string;
}

export interface PendingAttachment {
  id: string; // client local id
  file: File;
  previewUrl: string; // object URL or data URL
  name: string;
  size: number;
  type: "image" | "pdf";
  status: "compressing" | "uploading" | "ready" | "error";
  progress: number; // 0 to 100
  error?: string;
  serverAttachment?: AttachmentItem;
}

export const MAX_FILE_SIZE_BYTES = 10 * 1024 * 1024; // 10 MB
export const MAX_FILES_PER_MESSAGE = 4;
export const MAX_IMAGE_DIMENSION = 2048;
export const COMPRESSION_QUALITY = 0.85;

export const ALLOWED_IMAGE_TYPES = new Set([
  "image/jpeg",
  "image/jpg",
  "image/png",
  "image/webp",
  "image/heic",
  "image/heif",
]);

export const ALLOWED_DOC_TYPES = new Set([
  "application/pdf",
]);

export function formatFileSize(bytes: number): string {
  if (bytes <= 0) return "0 B";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function validateAttachmentFile(file: File, existingCount = 0): { valid: boolean; error?: string } {
  if (existingCount >= MAX_FILES_PER_MESSAGE) {
    return {
      valid: false,
      error: `Maksimal ${MAX_FILES_PER_MESSAGE} berkas per pesan.`,
    };
  }

  const nameLower = file.name.toLowerCase();
  const ext = nameLower.slice(nameLower.lastIndexOf("."));
  const mime = file.type.toLowerCase();

  const isPdf = mime === "application/pdf" || ext === ".pdf";
  const isImage =
    ALLOWED_IMAGE_TYPES.has(mime) ||
    [".jpg", ".jpeg", ".png", ".webp", ".heic", ".heif"].includes(ext);

  if (!isPdf && !isImage) {
    return {
      valid: false,
      error: `Berkas "${file.name}" tidak didukung. Hanya menerima foto (JPG, PNG, WebP, HEIC) dan dokumen PDF.`,
    };
  }

  if (file.size > MAX_FILE_SIZE_BYTES) {
    return {
      valid: false,
      error: `Ukuran berkas "${file.name}" (${formatFileSize(file.size)}) melebihi batas maksimal 10 MB.`,
    };
  }

  return { valid: true };
}

/**
 * Compresses an image in the browser and strips all EXIF metadata (GPS, camera info).
 * Uses createImageBitmap with { imageOrientation: "from-image" } to preserve visual rotation.
 */
export async function compressAndOrientImage(
  file: File
): Promise<{ blob: Blob; width: number; height: number; fileName: string }> {
  // If not image (e.g. PDF), return original
  if (file.type === "application/pdf" || file.name.toLowerCase().endsWith(".pdf")) {
    return { blob: file, width: 0, height: 0, fileName: file.name };
  }

  let sourceFile: File | Blob = file;
  let sourceFileName = file.name;
  const isHeic =
    file.type === "image/heic" ||
    file.type === "image/heif" ||
    /\.(heic|heif)$/i.test(file.name);

  // Lazy-load heic2any only when a HEIC/HEIF photo (e.g. iPhone) is selected
  if (isHeic) {
    try {
      const heic2any = (await import("heic2any")).default;
      const converted = await heic2any({
        blob: file,
        toType: "image/jpeg",
        quality: COMPRESSION_QUALITY,
      });
      const singleBlob = Array.isArray(converted) ? converted[0] : converted;
      if (singleBlob) {
        sourceFileName = file.name.replace(/\.(heic|heif)$/i, ".jpg");
        sourceFile = new File([singleBlob], sourceFileName, { type: "image/jpeg" });
      }
    } catch (conversionErr) {
      console.warn("HEIC lazy conversion error, falling back to native decoder:", conversionErr);
    }
  }

  let bitmap: ImageBitmap | null = null;
  try {
    if (typeof createImageBitmap === "function") {
      bitmap = await createImageBitmap(sourceFile, { imageOrientation: "from-image" as any });
    }
  } catch {
    // fallback if browser fails with imageOrientation option
    try {
      if (typeof createImageBitmap === "function") {
        bitmap = await createImageBitmap(sourceFile);
      }
    } catch {
      bitmap = null;
    }
  }

  if (!bitmap) {
    // Fallback using HTMLImageElement
    return new Promise((resolve) => {
      const img = new Image();
      const objUrl = URL.createObjectURL(sourceFile);
      img.onload = () => {
        URL.revokeObjectURL(objUrl);
        let { width, height } = img;
        if (width > MAX_IMAGE_DIMENSION || height > MAX_IMAGE_DIMENSION) {
          if (width > height) {
            height = Math.round((height * MAX_IMAGE_DIMENSION) / width);
            width = MAX_IMAGE_DIMENSION;
          } else {
            width = Math.round((width * MAX_IMAGE_DIMENSION) / height);
            height = MAX_IMAGE_DIMENSION;
          }
        }
        const canvas = document.createElement("canvas");
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext("2d");
        if (ctx) {
          ctx.drawImage(img, 0, 0, width, height);
          canvas.toBlob(
            (b) => {
              resolve({
                blob: b || sourceFile,
                width,
                height,
                fileName: sourceFileName.replace(/\.(heic|heif)$/i, ".jpg"),
              });
            },
            "image/jpeg",
            COMPRESSION_QUALITY
          );
        } else {
          resolve({ blob: sourceFile, width: img.width, height: img.height, fileName: sourceFileName });
        }
      };
      img.onerror = () => {
        URL.revokeObjectURL(objUrl);
        resolve({ blob: sourceFile, width: 0, height: 0, fileName: sourceFileName });
      };
      img.src = objUrl;
    });
  }

  let { width, height } = bitmap;
  if (width > MAX_IMAGE_DIMENSION || height > MAX_IMAGE_DIMENSION) {
    if (width > height) {
      height = Math.round((height * MAX_IMAGE_DIMENSION) / width);
      width = MAX_IMAGE_DIMENSION;
    } else {
      width = Math.round((width * MAX_IMAGE_DIMENSION) / height);
      height = MAX_IMAGE_DIMENSION;
    }
  }

  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  if (!ctx) {
    bitmap.close?.();
    return { blob: file, width, height, fileName: file.name };
  }

  ctx.drawImage(bitmap, 0, 0, width, height);
  bitmap.close?.();

  // HEIC/HEIF or other phone formats converted to standard JPEG; PNG stays PNG if small
  const isPng = sourceFile.type === "image/png" && sourceFile.size < 2 * 1024 * 1024;
  const exportType = isPng ? "image/png" : "image/jpeg";
  const newName = sourceFileName.replace(/\.(heic|heif)$/i, ".jpg");

  return new Promise((resolve) => {
    canvas.toBlob(
      (b) => {
        resolve({
          blob: b || sourceFile,
          width,
          height,
          fileName: newName,
        });
      },
      exportType,
      COMPRESSION_QUALITY
    );
  });
}

/**
 * Uploads an attachment to the backend via XMLHttpRequest to provide real-time progress tracking.
 */
export function uploadAttachmentWithProgress(
  fileBlob: Blob,
  fileName: string,
  backendUrl: string,
  authHeaders: Record<string, string>,
  chatId?: string,
  turnstileToken?: string,
  onProgress?: (percent: number) => void
): Promise<AttachmentItem> {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open("POST", `${backendUrl}/api/attachments/upload`);

    for (const [key, val] of Object.entries(authHeaders)) {
      if (key.toLowerCase() !== "content-type") {
        xhr.setRequestHeader(key, val);
      }
    }

    if (turnstileToken) {
      xhr.setRequestHeader("X-Turnstile-Token", turnstileToken);
    }

    xhr.upload.onprogress = (event) => {
      if (event.lengthComputable && onProgress) {
        const percent = Math.min(100, Math.round((event.loaded / event.total) * 100));
        onProgress(percent);
      }
    };

    xhr.onload = () => {
      try {
        const res = JSON.parse(xhr.responseText);
        if (xhr.status >= 200 && xhr.status < 300 && res.success) {
          const item: AttachmentItem = Array.isArray(res.data) ? res.data[0] : res.data?.attachments?.[0];
          if (!item) {
            reject(new Error("Format balasan upload tidak valid."));
          } else {
            resolve(item);
          }
        } else {
          reject(new Error(res.error || `Upload gagal dengan status HTTP ${xhr.status}.`));
        }
      } catch (err: any) {
        reject(new Error("Gagal membaca respons server saat mengunggah berkas."));
      }
    };

    xhr.onerror = () => {
      reject(new Error("Gangguan koneksi saat mengunggah berkas. Periksa jaringan Anda."));
    };

    const formData = new FormData();
    formData.append("files", fileBlob, fileName);
    if (chatId) {
      formData.append("chat_id", chatId);
    }
    if (turnstileToken) {
      formData.append("turnstile_token", turnstileToken);
    }

    xhr.send(formData);
  });
}

/**
 * Refreshes an expired signed URL for an attachment item.
 */
export async function refreshAttachmentSignedUrl(
  backendUrl: string,
  attachmentId: string,
  authHeaders: Record<string, string>
): Promise<string> {
  const res = await fetch(`${backendUrl}/api/attachments/${encodeURIComponent(attachmentId)}/signed-url`, {
    method: "GET",
    headers: authHeaders,
  });

  const body = await res.json().catch(() => null);
  if (!res.ok || !body?.success || !body?.data?.signed_url) {
    throw new Error(body?.error || "Gagal memperbarui tautan berkas.");
  }

  return body.data.signed_url;
}

