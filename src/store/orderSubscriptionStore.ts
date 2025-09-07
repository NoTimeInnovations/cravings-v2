import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import { Order } from "./orderStore";

interface OrderSubscriptionState {
  orders: Order[];
  loading: boolean;
  totalCount: number;
  currentPage: number;
  limit: number;
  hasNextPage: boolean;
  hasPreviousPage: boolean;
  
  setOrders: (orders: Order[]) => void;
  removeOrder: (orderId: string) => void;
  setLoading: (loading: boolean) => void;
  setTotalCount: (count: number) => void;
  setCurrentPage: (page: number) => void;
  nextPage: () => void;
  previousPage: () => void;
  resetPagination: () => void;
}

export const useOrderSubscriptionStore = create<OrderSubscriptionState>()(
  persist(
    (set, get) => ({
      orders: [],
      loading: true,
      totalCount: 0,
      currentPage: 1,
      limit: 10,
      hasNextPage: false,
      hasPreviousPage: false,
      
      setOrders: (orders) => set({ orders }),
      removeOrder: (orderId) =>
        set((state) => ({
          orders: state.orders.filter((order) => order.id !== orderId),
        })),
      setLoading: (loading) => {
        const stateLoading = get().loading;
        if (!stateLoading) return;
        set({ loading });
      },
      setTotalCount: (totalCount) => {
        const { currentPage, limit } = get();
        const hasNextPage = currentPage * limit < totalCount;
        const hasPreviousPage = currentPage > 1;
        set({ totalCount, hasNextPage, hasPreviousPage });
      },
      setCurrentPage: (currentPage) => {
        const { totalCount, limit } = get();
        const hasNextPage = currentPage * limit < totalCount;
        const hasPreviousPage = currentPage > 1;
        set({ currentPage, hasNextPage, hasPreviousPage });
      },
      nextPage: () => {
        const { currentPage, totalCount, limit } = get();
        if (currentPage * limit < totalCount) {
          const newPage = currentPage + 1;
          const hasNextPage = newPage * limit < totalCount;
          const hasPreviousPage = newPage > 1;
          set({ 
            currentPage: newPage, 
            hasNextPage, 
            hasPreviousPage,
            loading: true 
          });
        }
      },
      previousPage: () => {
        const { currentPage, totalCount, limit } = get();
        if (currentPage > 1) {
          const newPage = currentPage - 1;
          const hasNextPage = newPage * limit < totalCount;
          const hasPreviousPage = newPage > 1;
          set({ 
            currentPage: newPage, 
            hasNextPage, 
            hasPreviousPage,
            loading: true 
          });
        }
      },
      resetPagination: () => {
        set({
          currentPage: 1,
          hasNextPage: false,
          hasPreviousPage: false,
          loading: true
        });
      }
    }),
    {
      name: "order-subscription-storage",
      storage: createJSONStorage(() => localStorage),
    }
  )
);
