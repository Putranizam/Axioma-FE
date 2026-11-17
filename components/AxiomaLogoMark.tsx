import React from "react";
import Image from "next/image";

interface AxiomaLogoMarkProps {
  className?: string;
  size?: number;
}

/**
 * Logo resmi Axioma 3D Ribbon "A" dengan deteksi tema real-time:
 * - Mode Terang: `/brand/light/axioma-logo.png`
 * - Mode Gelap: `/brand/dark/axioma-logo.png`
 */
export function AxiomaLogoMark({
  className = "w-full h-full",
  size = 64,
}: AxiomaLogoMarkProps) {
  return (
    <>
      <Image
        src="/brand/light/axioma-logo.png"
        alt="Axioma"
        width={size}
        height={size}
        className={`${className} object-contain dark:hidden`}
        priority
      />
      <Image
        src="/brand/dark/axioma-logo.png"
        alt="Axioma"
        width={size}
        height={size}
        className={`${className} object-contain hidden dark:block`}
        priority
      />
    </>
  );
}

export default AxiomaLogoMark;
