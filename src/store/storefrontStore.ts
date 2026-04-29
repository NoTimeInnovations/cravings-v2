import { create } from "zustand";
import {
  StorefrontConfig,
  StorefrontSection,
  StorefrontTheme,
  StorefrontSeo,
  CustomSection,
  DEFAULT_STOREFRONT_CONFIG,
} from "@/types/storefront";

interface StorefrontStore {
  config: StorefrontConfig;
  isSaving: boolean;
  isDirty: boolean;
  activeSectionId: string | null;

  setConfig: (config: StorefrontConfig) => void;
  setEnabled: (val: boolean) => void;
  setIsSaving: (val: boolean) => void;
  setActiveSectionId: (id: string | null) => void;
  markClean: () => void;

  updateSection: (id: string, data: Partial<StorefrontSection>) => void;
  toggleSection: (id: string) => void;
  addCustomSection: () => void;
  removeSection: (id: string) => void;
  moveSectionUp: (id: string) => void;
  moveSectionDown: (id: string) => void;
  updateTheme: (data: Partial<StorefrontTheme>) => void;
  updateSeo: (data: Partial<StorefrontSeo>) => void;
  reset: () => void;
}

export const useStorefrontStore = create<StorefrontStore>((set, get) => ({
  config: DEFAULT_STOREFRONT_CONFIG,
  isSaving: false,
  isDirty: false,
  activeSectionId: null,

  setConfig: (config) => set({ config, isDirty: false }),

  setEnabled: (val) =>
    set({ config: { ...get().config, enabled: val }, isDirty: true }),

  setIsSaving: (val) => set({ isSaving: val }),

  setActiveSectionId: (id) => set({ activeSectionId: id }),

  markClean: () => set({ isDirty: false }),

  updateSection: (id, data) => {
    const sections = get().config.sections.map((s) =>
      s.id === id ? ({ ...s, ...data } as StorefrontSection) : s
    );
    set({ config: { ...get().config, sections }, isDirty: true });
  },

  toggleSection: (id) => {
    const sections = get().config.sections.map((s) =>
      s.id === id ? ({ ...s, enabled: !s.enabled } as StorefrontSection) : s
    );
    set({ config: { ...get().config, sections }, isDirty: true });
  },

  addCustomSection: () => {
    const newSection: CustomSection = {
      id: crypto.randomUUID(),
      type: "custom",
      enabled: true,
      title: "New Section",
      content: "",
    };
    const sections = [...get().config.sections, newSection];
    set({
      config: { ...get().config, sections },
      isDirty: true,
      activeSectionId: newSection.id,
    });
  },

  removeSection: (id) => {
    const sections = get().config.sections.filter((s) => s.id !== id);
    set({
      config: { ...get().config, sections },
      isDirty: true,
      activeSectionId: null,
    });
  },

  moveSectionUp: (id) => {
    const sections = [...get().config.sections];
    const idx = sections.findIndex((s) => s.id === id);
    if (idx <= 0) return;
    [sections[idx - 1], sections[idx]] = [sections[idx], sections[idx - 1]];
    set({ config: { ...get().config, sections }, isDirty: true });
  },

  moveSectionDown: (id) => {
    const sections = [...get().config.sections];
    const idx = sections.findIndex((s) => s.id === id);
    if (idx < 0 || idx >= sections.length - 1) return;
    [sections[idx], sections[idx + 1]] = [sections[idx + 1], sections[idx]];
    set({ config: { ...get().config, sections }, isDirty: true });
  },

  updateTheme: (data) =>
    set({
      config: {
        ...get().config,
        theme: { ...get().config.theme, ...data },
      },
      isDirty: true,
    }),

  updateSeo: (data) =>
    set({
      config: {
        ...get().config,
        seo: { ...(get().config.seo ?? {}), ...data },
      },
      isDirty: true,
    }),

  reset: () =>
    set({
      config: DEFAULT_STOREFRONT_CONFIG,
      isDirty: false,
      activeSectionId: null,
    }),
}));
