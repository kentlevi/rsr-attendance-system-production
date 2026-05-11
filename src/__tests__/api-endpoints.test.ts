import { describe, it, expect, vi, beforeEach } from 'vitest';
import request from 'supertest';
import bcrypt from 'bcrypt';

const verifyIdToken = vi.fn();
const createCustomToken = vi.fn();
const firestore = vi.fn();
const initializeApp = vi.fn();

vi.mock('firebase-admin', () => ({
  default: {
    apps: [],
    initializeApp,
    auth: () => ({
      verifyIdToken,
      createCustomToken,
    }),
    firestore,
  },
}));

vi.mock('@google/genai', () => ({
  GoogleGenAI: vi.fn(function GoogleGenAI() {
    return {
      models: {
        generateContent: vi.fn(),
      },
    };
  }),
  Type: {
    OBJECT: 'OBJECT',
    STRING: 'STRING',
  },
}));

const makeDoc = (id: string, data: Record<string, unknown>) => ({
  id,
  data: () => data,
});

describe('API endpoints', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    verifyIdToken.mockResolvedValue({ uid: 'admin', role: 'admin' });
    createCustomToken.mockResolvedValue('custom-token');
  });

  async function getApp() {
    const { createApp } = await import('../../server');
    return createApp({ useVite: false });
  }

  it('authenticates an employee with a bcrypt PIN and returns a Firebase custom token', async () => {
    const hashedPin = await bcrypt.hash('123456', 4);
    firestore.mockReturnValue({
      collection: vi.fn((name: string) => {
        expect(name).toBe('employees');
        return {
          get: vi.fn().mockResolvedValue({
            docs: [
              makeDoc('EMP-001', {
                id: 'EMP-001',
                email: 'employee@rsr.com',
                pin: hashedPin,
                name: 'Employee One',
              }),
            ],
          }),
        };
      }),
    });

    const response = await request(await getApp())
      .post('/api/login-employee')
      .send({ loginId: 'emp-001', pin: '123456' });

    expect(response.status).toBe(200);
    expect(response.body).toMatchObject({
      success: true,
      token: 'custom-token',
      employee: { id: 'EMP-001', name: 'Employee One' },
    });
    expect(createCustomToken).toHaveBeenCalledWith('EMP-001', { role: 'employee' });
  });

  it('rejects employee login when the PIN is invalid', async () => {
    const hashedPin = await bcrypt.hash('123456', 4);
    firestore.mockReturnValue({
      collection: vi.fn(() => ({
        get: vi.fn().mockResolvedValue({
          docs: [makeDoc('EMP-001', { id: 'EMP-001', pin: hashedPin })],
        }),
      })),
    });

    const response = await request(await getApp())
      .post('/api/login-employee')
      .send({ loginId: 'EMP-001', pin: '000000' });

    expect(response.status).toBe(401);
    expect(response.body).toEqual({
      success: false,
      error: 'Invalid employee credentials.',
    });
    expect(createCustomToken).not.toHaveBeenCalled();
  });

  it('authenticates an admin account by email and returns role claims', async () => {
    const where = vi.fn(() => ({
      get: vi.fn().mockResolvedValue({
        empty: false,
        docs: [
          makeDoc('admin', {
            email: 'admin@rsr.com',
            password: 'masterpass',
            role: 'admin',
            fullName: 'Administrator',
          }),
        ],
      }),
    }));
    firestore.mockReturnValue({
      collection: vi.fn((name: string) => {
        expect(name).toBe('adminAccounts');
        return { where };
      }),
    });

    const response = await request(await getApp())
      .post('/api/login-admin')
      .send({ email: 'admin@rsr.com', password: 'masterpass' });

    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
    expect(createCustomToken).toHaveBeenCalledWith('admin', {
      role: 'admin',
      email: 'admin@rsr.com',
    });
  });

  it('blocks protected sync endpoints without a bearer token', async () => {
    const response = await request(await getApp())
      .post('/api/sync/punches')
      .send({ punches: [{ id: 'offline-1' }] });

    expect(response.status).toBe(401);
    expect(response.body).toEqual({ error: 'Unauthorized' });
  });

  it('accepts an authenticated admin punch sync request and reports synced count', async () => {
    const response = await request(await getApp())
      .post('/api/sync/punches')
      .set('Authorization', 'Bearer admin-token')
      .send({ punches: [{ id: 'offline-1' }, { id: 'offline-2' }] });

    expect(response.status).toBe(200);
    expect(response.body).toEqual({ success: true, synced: 2 });
    expect(verifyIdToken).toHaveBeenCalledWith('admin-token');
  });
});
