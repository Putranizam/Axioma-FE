import React from "react";

interface AxiomaLogoMarkProps {
  className?: string;
  size?: number;
  priority?: boolean;
}

/**
 * Logo resmi Axioma 3D Ribbon "A" dengan deteksi tema real-time berbasis CSS:
 * - Hanya mengunduh 1 aset sesuai tema aktif (`html.dark` vs terang), tanpa double preload `<link rel="preload">`.
 * - Berpindah tema seketika tanpa flicker saat pengguna mengubah mode Terang/Gelap/Sistem.
 */
export function AxiomaLogoMark({ className = "w-full h-full" }: AxiomaLogoMarkProps) {
  return (
    <span
      role="img"
      aria-label="Axioma"
      className={`axioma-logo-mark shrink-0 ${className}`}
    />
  );
}

export default AxiomaLogoMark;
