import '@testing-library/jest-dom';
import 'fake-indexeddb/auto';
import { vi } from 'vitest';
import React from 'react';

// Helper: create a forwardRef passthrough for a given HTML tag
const makeMotionComponent = (tag: string) =>
  React.forwardRef(({ children, ...props }: any, ref: any) =>
    React.createElement(tag, { ...props, ref }, children)
  );

// Global mock for framer-motion to avoid animation-related test failures
vi.mock('framer-motion', () => ({
  motion: {
    div: makeMotionComponent('div'),
    span: makeMotionComponent('span'),
    button: makeMotionComponent('button'),
    h1: makeMotionComponent('h1'),
    h2: makeMotionComponent('h2'),
    h3: makeMotionComponent('h3'),
    p: makeMotionComponent('p'),
    nav: makeMotionComponent('nav'),
    header: makeMotionComponent('header'),
    footer: makeMotionComponent('footer'),
    section: makeMotionComponent('section'),
    article: makeMotionComponent('article'),
    li: makeMotionComponent('li'),
    ul: makeMotionComponent('ul'),
    a: makeMotionComponent('a'),
    img: makeMotionComponent('img'),
    input: makeMotionComponent('input'),
    form: makeMotionComponent('form'),
    label: makeMotionComponent('label'),
    table: makeMotionComponent('table'),
    tr: makeMotionComponent('tr'),
    td: makeMotionComponent('td'),
    th: makeMotionComponent('th'),
    tbody: makeMotionComponent('tbody'),
    thead: makeMotionComponent('thead'),
  },
  AnimatePresence: ({ children }: any) => children,
  useAnimation: () => ({
    start: vi.fn(),
    stop: vi.fn(),
  }),
  useInView: () => true,
  useMotionValue: () => ({ set: vi.fn(), get: vi.fn(() => 0) }),
  useTransform: () => ({ set: vi.fn(), get: vi.fn(() => 0) }),
  useSpring: () => ({ set: vi.fn(), get: vi.fn(() => 0) }),
}));

// Global mock for Recharts since it relies on DOM measurements that jsdom doesn't support well
vi.mock('recharts', () => ({
  ResponsiveContainer: ({ children }: any) =>
    React.createElement('div', { style: { width: '100%', height: '100%' } }, children),
  PieChart: ({ children }: any) =>
    React.createElement('div', { 'data-testid': 'pie-chart' }, children),
  AreaChart: ({ children }: any) =>
    React.createElement('div', { 'data-testid': 'area-chart' }, children),
  BarChart: ({ children }: any) =>
    React.createElement('div', { 'data-testid': 'bar-chart' }, children),
  LineChart: ({ children }: any) =>
    React.createElement('div', { 'data-testid': 'line-chart' }, children),
  ComposedChart: ({ children }: any) =>
    React.createElement('div', { 'data-testid': 'composed-chart' }, children),
  XAxis: () => null,
  YAxis: () => null,
  CartesianGrid: () => null,
  Area: () => null,
  Pie: () => null,
  Bar: () => null,
  Line: () => null,
  Cell: () => null,
  Tooltip: () => null,
  Legend: () => null,
}));

// Global mock for Firebase
vi.mock('firebase/app', () => ({
  initializeApp: vi.fn(() => ({})),
  getApp: vi.fn(() => ({})),
}));

vi.mock('firebase/auth', () => ({
  getAuth: vi.fn(() => ({
    currentUser: null,
    onAuthStateChanged: vi.fn((cb) => {
      cb(null);
      return () => {};
    }),
  })),
  // Resolve immediately so the kiosk / employee-portal "ready" gates flip
  // true under test without needing a real Firebase Auth context.
  signInAnonymously: vi.fn(() => Promise.resolve({ user: { uid: 'anon-test' } })),
  signInWithEmailAndPassword: vi.fn(),
  signOut: vi.fn(() => Promise.resolve()),
}));

vi.mock('firebase/firestore', () => ({
  getFirestore: vi.fn(() => ({})),
  initializeFirestore: vi.fn(() => ({})),
  persistentLocalCache: vi.fn(),
  persistentMultipleTabManager: vi.fn(),
  doc: vi.fn(),
  getDoc: vi.fn(),
  getDocs: vi.fn(),
  setDoc: vi.fn(),
  updateDoc: vi.fn(),
  deleteDoc: vi.fn(),
  collection: vi.fn(),
  query: vi.fn(),
  where: vi.fn(),
  onSnapshot: vi.fn(() => () => {}),
  getDocFromServer: vi.fn(),
}));

vi.mock('firebase/storage', () => ({
  getStorage: vi.fn(() => ({})),
  ref: vi.fn(),
  uploadBytes: vi.fn(),
  getDownloadURL: vi.fn(),
}));
