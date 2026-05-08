import { create } from 'zustand';

interface WorkforceState {
  searchQuery: string;
  siteFilter: string;
  deptFilter: string;
  selectedDate: string;
  setSearchQuery: (query: string) => void;
  setSiteFilter: (site: string) => void;
  setDeptFilter: (dept: string) => void;
  setSelectedDate: (date: string) => void;
  resetFilters: () => void;
}

export const useWorkforceStore = create<WorkforceState>((set) => ({
  searchQuery: '',
  siteFilter: 'All Sites',
  deptFilter: 'All Departments',
  selectedDate: new Date().toISOString().split('T')[0],

  setSearchQuery: (query) => set({ searchQuery: query }),
  setSiteFilter: (site) => set({ siteFilter: site }),
  setDeptFilter: (dept) => set({ deptFilter: dept }),
  setSelectedDate: (date) => set({ selectedDate: date }),
  resetFilters: () => set({
    searchQuery: '',
    siteFilter: 'All Sites',
    deptFilter: 'All Departments',
    selectedDate: new Date().toISOString().split('T')[0]
  })
}));
