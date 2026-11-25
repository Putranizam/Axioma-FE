export type DesktopSettingsPageId =
  | "account"
  | "quota"
  | "notifications"
  | "agent"
  | "storage"
  | "shortcuts"
  | "theme"
  | "feedback"
  | "about";

export type SettingsAgentId = "axioma-pro" | "axioma-omni" | "axioma-architect";

export interface SettingsAgentOption {
  id: SettingsAgentId;
  name: string;
  shortName: string;
  tag: string;
  description: string;
}

export type ThemeModeOption = "dark" | "light" | "system";
