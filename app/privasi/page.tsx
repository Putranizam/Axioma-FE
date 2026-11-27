import { permanentRedirect } from "next/navigation";

export default function LegacyPrivasiRedirect() {
  permanentRedirect("/privacy-policy");
}
