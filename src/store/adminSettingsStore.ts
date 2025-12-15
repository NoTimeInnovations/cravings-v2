import { create } from 'zustand';

interface AdminSettingsStore {
    saveAction: (() => Promise<void>) | null;
    isSaving: boolean;
    hasChanges: boolean;
    setSaveAction: (action: (() => Promise<void>) | null) => void;
    setIsSaving: (isSaving: boolean) => void;
    setHasChanges: (hasChanges: boolean) => void;
}

export const useAdminSettingsStore = create<AdminSettingsStore>((set) => ({
    saveAction: null,
    isSaving: false,
    hasChanges: false,
    setSaveAction: (action) => set({ saveAction: action }),
    setIsSaving: (isSaving) => set({ isSaving }),
    setHasChanges: (hasChanges) => set({ hasChanges }),
}));
