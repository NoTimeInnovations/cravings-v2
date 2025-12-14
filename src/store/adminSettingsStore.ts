import { create } from 'zustand';

interface AdminSettingsStore {
    saveAction: (() => Promise<void>) | null;
    isSaving: boolean;
    setSaveAction: (action: (() => Promise<void>) | null) => void;
    setIsSaving: (isSaving: boolean) => void;
}

export const useAdminSettingsStore = create<AdminSettingsStore>((set) => ({
    saveAction: null,
    isSaving: false,
    setSaveAction: (action) => set({ saveAction: action }),
    setIsSaving: (isSaving) => set({ isSaving }),
}));
