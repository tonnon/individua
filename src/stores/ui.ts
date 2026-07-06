import { create } from 'zustand'
import { persist } from 'zustand/middleware'

interface UiState {
  /** overlay de scanlines (toggle em /settings) */
  scanlines: boolean
  toggleScanlines: () => void
  /** sidebar aberta no mobile */
  sidebarOpen: boolean
  setSidebarOpen: (open: boolean) => void
}

export const useUiStore = create<UiState>()(
  persist(
    (set) => ({
      scanlines: false,
      toggleScanlines: () => set((s) => ({ scanlines: !s.scanlines })),
      sidebarOpen: false,
      setSidebarOpen: (open) => set({ sidebarOpen: open }),
    }),
    {
      name: 'individua-ui',
      partialize: (s) => ({ scanlines: s.scanlines }),
    },
  ),
)
