import type { SFSymbolIcon } from "expo-router/native-tabs";

export const TAB_NAMES = ["today", "train", "money", "trends", "chat"] as const;

export type TabName = (typeof TAB_NAMES)[number];

type TabDefinition = {
  route: "index" | Exclude<TabName, "today">;
  path: string;
  label: string;
  sfSymbol: Extract<NonNullable<SFSymbolIcon["sf"]>, string>;
};

export const TABS: Record<TabName, TabDefinition> = {
  today: { route: "index", path: "/", label: "Today", sfSymbol: "sun.max" },
  train: {
    route: "train",
    path: "/train",
    label: "Train",
    sfSymbol: "dumbbell",
  },
  money: {
    route: "money",
    path: "/money",
    label: "Money",
    sfSymbol: "creditcard",
  },
  trends: {
    route: "trends",
    path: "/trends",
    label: "Trends",
    sfSymbol: "chart.xyaxis.line",
  },
  chat: {
    route: "chat",
    path: "/chat",
    label: "Chat",
    sfSymbol: "bubble.left",
  },
};
