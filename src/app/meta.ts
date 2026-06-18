import { Code, FileText, Globe, Image, KeyRound, Sparkles } from "lucide-react";
import type { FavoriteType } from "./types";

export const TYPE_META: Record<FavoriteType | "all", { label: string; icon: typeof Sparkles }> = {
  all: { label: "全部", icon: Sparkles },
  link: { label: "链接", icon: Globe },
  text: { label: "文本", icon: FileText },
  image: { label: "图片", icon: Image },
  code: { label: "代码", icon: Code },
  json: { label: "JSON", icon: Code },
  account: { label: "账号", icon: KeyRound }
};
export const LLM_CONFIG_SETTING_KEY = "llm-config";
export const PROMPTS_SETTING_KEY = "prompts";
