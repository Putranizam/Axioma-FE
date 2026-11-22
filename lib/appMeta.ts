import pkg from "../package.json";

const rawPkgVersion =
  typeof pkg?.version === "string" && pkg.version.trim()
    ? pkg.version.trim()
    : "1.0.0";

const resolvedVersionNumber = (
  process.env.NEXT_PUBLIC_APP_VERSION || rawPkgVersion
)
  .trim()
  .replace(/^v/i, "");

export const APP_VERSION = `v${resolvedVersionNumber || "1.0.0"}`;
export const APP_CHANNEL =
  (process.env.NEXT_PUBLIC_APP_CHANNEL || "Beta").trim() || "Beta";
export const APP_BUILD_SHA = (process.env.NEXT_PUBLIC_BUILD_SHA || "").trim();
export const APP_FULL_VERSION = APP_BUILD_SHA
  ? `${APP_VERSION} (${APP_BUILD_SHA})`
  : APP_VERSION;
export const APP_BADGE_LABEL = `${APP_VERSION} ${APP_CHANNEL}`.trim();
