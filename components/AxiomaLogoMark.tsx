import React from "react";

interface AxiomaLogoMarkProps {
  className?: string;
}

/**
 * Logo geometris huruf "A" murni monokrom tanpa aksen bintang/sparkle AI.
 */
export function AxiomaLogoMark({ className = "w-4 h-4" }: AxiomaLogoMarkProps) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      role="img"
      aria-label="Axioma"
      className={className}
    >
      <path
        d="M12 3.5L4.5 20.5M12 3.5L19.5 20.5M7.5 14.25H16.5"
        stroke="currentColor"
        strokeWidth="2.2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export default AxiomaLogoMark;
