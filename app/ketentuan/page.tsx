import { permanentRedirect } from "next/navigation";

export default function LegacyKetentuanRedirect() {
  permanentRedirect("/terms");
}
