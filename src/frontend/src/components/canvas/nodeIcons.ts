import type { NodeType } from "@/types";
import {
  Clapperboard,
  ImageIcon,
  type LucideIcon,
  MessageCircle,
  Mic,
  Sparkles,
  Type,
} from "lucide-react";

export const NODE_ICONS: Record<NodeType, LucideIcon> = {
  prompt: Type,
  imageRef: ImageIcon,
  chat: MessageCircle,
  imageGen: Sparkles,
  video: Clapperboard,
  voice: Mic,
};
