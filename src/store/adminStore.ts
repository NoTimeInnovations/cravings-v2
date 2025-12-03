import { create } from 'zustand';

interface AdminStore {
    activeView: string;
    setActiveView: (view: string) => void;
    selectedOrderId: string | null;
    setSelectedOrderId: (id: string | null) => void;
}

export const useAdminStore = create<AdminStore>((set) => ({
    activeView: 'Dashboard',
    setActiveView: (view) => set({ activeView: view }),
    selectedOrderId: null,
    setSelectedOrderId: (id) => set({ selectedOrderId: id }),
}));
