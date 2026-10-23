import type { StateCreator } from "zustand";
import type { User } from "@supabase/supabase-js";
import type { AppState } from "./useBoundStore";
import dayjs from "dayjs";
import {
  type ConversationAgentExtra,
  type ConversationRow,
  type MessageRow,
  type TemplateData,
  isIncoming,
  isTeamChat,
} from "@/supabase/client";

export function isArchived(
  extra: ConversationAgentExtra | undefined,
  msg?: MessageRow,
) {
  const archivedTimestamp: string | null | undefined = extra?.archived;

  return +new Date(archivedTimestamp || 0) > +new Date(msg?.timestamp || 0);
}

export const Filters = {
  ALL: "todas",
  UNREAD: "pendientes",
  H24: "24h",
  ARCHIVED: "archivadas",
} as const;

export type Filters = (typeof Filters)[keyof typeof Filters];

export const filters: {
  [key in Filters]: (
    conv: ConversationRow,
    msg?: MessageRow,
    extra?: ConversationAgentExtra,
    // Pending is "someone else spoke last", and in a peerless conversation
    // "someone else" can only be answered relative to the viewer.
    ownAgentId?: string | null,
  ) => boolean;
} = {
  todas: (_conv, msg, extra) => !isArchived(extra, msg),
  pendientes: (conv, msg, extra, ownAgentId) =>
    !isArchived(extra, msg) &&
    !!msg &&
    isIncoming(msg, ownAgentId, isTeamChat(conv)),
  "24h": (_conv, msg, extra) =>
    !isArchived(extra, msg) &&
    dayjs(msg?.timestamp || 0).isAfter(dayjs().subtract(1, "day")),
  archivadas: (_conv, msg, extra) => isArchived(extra, msg),
} as const;

export type TemplateDraft = {
  template: TemplateData;
  bodyVarValues: string[];
  headVarValues: string[];
};

export type Language = "es" | "en" | "pt" | "sw" | "fr" | "hi";

const SUPPORTED_LANGUAGES: Language[] = ["es", "en", "pt", "sw", "fr", "hi"];

export function detectDefaultLanguage(): Language {
  const candidates =
    typeof navigator !== "undefined"
      ? [...(navigator.languages ?? []), navigator.language].filter(Boolean)
      : [];

  for (const tag of candidates) {
    const base = tag.toLowerCase().split("-")[0] as Language;
    if (SUPPORTED_LANGUAGES.includes(base)) return base;
  }

  return "en";
}

export type UIState = {
  templatePicker: boolean;
  tagPicker: boolean; // [crm] P2-09b
  assigneePicker: boolean; // [crm] P2-09c
  contactPanel: boolean; // [crm] P2-09d
  templateDrafts: Map<string, TemplateDraft>;
  activeOrgId: string | null;
  activeConvId: string | null;
  user: User | null;
  filter: keyof typeof filters;
  searchPattern: string;
  isLoading: boolean;
  language: Language;
};

export type UIActions = {
  toggle: (component: keyof UIState, value?: boolean) => void;
  setActiveOrg: (id: string | null) => void;
  setActiveConv: (id: string | null) => void;
  setUser: (user: User | null) => void;
  setFilter: (filter: keyof typeof filters) => void;
  setSearchPattern: (searchPattern: string) => void;
  setTemplateDraft: (convId: string, draft: TemplateDraft | null) => void;
  setLanguage: (lang: Language) => void;
};

export type UISlice = UIState & UIActions;

// @ts-expect-error partializing the slice creator's state type
export const createUISlice: StateCreator<Partial<AppState>> = (
  set: (
    partial:
      | AppState
      | Partial<AppState>
      | ((state: AppState) => AppState | Partial<AppState>),
    replace?: boolean,
  ) => void,
) => ({
  templatePicker: false,
  tagPicker: false,
  assigneePicker: false,
  contactPanel: false,
  templateDrafts: new Map(),
  activeOrgId: null,
  activeConvId: null,
  user: null,
  filter: "todas" as keyof typeof filters,
  searchPattern: "",
  isLoading: false,
  language: detectDefaultLanguage(),
  toggle: (component: keyof UIState, value?: boolean) =>
    set((state) => ({
      ui: {
        ...state.ui,
        [component]: value ?? !state.ui[component],
      },
    })),
  setActiveOrg: (activeOrgId: string | null) =>
    set((state) => ({
      ui: {
        ...state.ui,
        activeOrgId,
      },
    })),
  setActiveConv: (activeConvId: string | null) =>
    set((state) => ({
      ui: {
        ...state.ui,
        activeConvId,
      },
    })),
  setUser: (user: User | null) =>
    set((state) => ({
      ui: {
        ...state.ui,
        user,
      },
    })),
  setFilter: (filter: keyof typeof filters) =>
    set((state) => ({
      ui: {
        ...state.ui,
        filter,
      },
    })),
  setSearchPattern: (searchPattern: string) =>
    set((state) => ({
      ui: {
        ...state.ui,
        searchPattern,
      },
    })),
  setTemplateDraft: (convId: string, draft: TemplateDraft | null) =>
    set((state) => {
      const templateDrafts = new Map(state.ui.templateDrafts);
      if (draft) {
        templateDrafts.set(convId, draft);
      } else {
        templateDrafts.delete(convId);
      }
      return { ui: { ...state.ui, templateDrafts } };
    }),
  setLanguage: (language: Language) =>
    set((state) => ({
      ui: { ...state.ui, language },
    })),
});
