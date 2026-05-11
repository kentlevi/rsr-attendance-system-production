import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render } from '@testing-library/react';
import React from 'react';
import AdminDashboard from '../components/AdminDashboard';
import EmployeePortal from '../components/EmployeePortal';
import TimeClock from '../components/TimeClock';

// Mock the Firebase modules
vi.mock('firebase/app', () => ({
  initializeApp: vi.fn(),
}));

vi.mock('firebase/storage', () => ({
  getStorage: vi.fn(),
  ref: vi.fn(),
  uploadBytes: vi.fn(),
  getDownloadURL: vi.fn(),
}));

vi.mock('firebase/firestore', () => {
  return {
    getFirestore: vi.fn(),
    initializeFirestore: vi.fn(),
    persistentLocalCache: vi.fn(),
    persistentMultipleTabManager: vi.fn(),
    collection: vi.fn(),
    doc: vi.fn(),
    getDoc: vi.fn(() => Promise.resolve({ data: () => ({}), exists: () => false })),
    getDocFromServer: vi.fn(() => Promise.resolve({ data: () => ({}), exists: () => false })),
    getDocs: vi.fn(() => Promise.resolve({ docs: [], empty: true })),
    addDoc: vi.fn(),
    setDoc: vi.fn(),
    updateDoc: vi.fn(),
    deleteDoc: vi.fn(),
    query: vi.fn(),
    where: vi.fn(),
    orderBy: vi.fn(),
    limit: vi.fn(),
    onSnapshot: vi.fn((ref, callback) => {
      callback({ 
        docs: [],
        exists: () => false,
        data: () => ({}),
      });
      return vi.fn();
    }),
  };
});

vi.mock('firebase/auth', () => ({
  getAuth: vi.fn(() => ({
    currentUser: { uid: 'admin-1', email: 'admin@rsrengineering.test.com' }
  })),
  onAuthStateChanged: vi.fn((auth, callback) => {
    callback({ uid: 'admin-1', email: 'admin@test.com' });
    return vi.fn();
  }),
}));

vi.mock('@vladmandic/human', () => {
  class MockHuman {
    load = vi.fn().mockResolvedValue(undefined);
    detect = vi.fn().mockResolvedValue({ face: [] });
    match = {
      similarity: vi.fn(),
      distance: vi.fn()
    };
  }
  return {
    Human: MockHuman
  };
});

// Mock Toast Hook
vi.mock('../context/ToastContext', () => ({
  useToast: () => ({
    showToast: vi.fn(),
  }),
  ToastProvider: ({ children }: any) => <div>{children}</div>,
}));

describe('UI Views Smoke Tests', () => {
  it('renders AdminDashboard', () => {
    const { container } = render(<AdminDashboard onNavigate={() => {}} />);
    expect(container).toBeTruthy();
  });

  it('renders EmployeePortal', () => {
    const { container } = render(<EmployeePortal onNavigate={() => {}} />);
    expect(container).toBeTruthy();
  });

  it('renders TimeClock', () => {
    const { container } = render(<TimeClock onNavigate={() => {}} />);
    expect(container).toBeTruthy();
  });
});
