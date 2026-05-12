import { describe, expect, it } from 'vitest';
import { getEmployeeStatusTransitionUpdate } from '../lib/EmployeeStatusRules';
import { Employee } from '../models/Employee';

describe('Employee Status Transition Rules', () => {
  const mockEmployee: Partial<Employee> = {
    id: 'emp-123',
    status: 'Active',
    notes: 'Initial notes.',
    statusHistory: []
  };

  it('correctly populates suspension fields when deactivating an employee', () => {
    const transition = {
      nextStatus: 'Inactive' as const,
      reason: 'Safety violation',
      actor: 'Admin Jane',
      decidedAt: '2026-05-12T10:00:00Z'
    };

    const update = getEmployeeStatusTransitionUpdate(mockEmployee, transition);

    expect(update.status).toBe('Inactive');
    expect(update.suspensionReason).toBe('Safety violation');
    expect(update.suspendedAt).toBe('2026-05-12T10:00:00Z');
    expect(update.suspendedBy).toBe('Admin Jane');
    expect(update.statusHistory).toHaveLength(1);
    expect(update.statusHistory?.[0].nextStatus).toBe('Inactive');
    expect(update.notes).toContain('Suspended: Safety violation');
  });

  it('correctly populates reinstatement fields when reactivating an employee', () => {
    const inactiveEmployee: Partial<Employee> = {
      ...mockEmployee,
      status: 'Inactive',
      suspendedAt: '2026-05-10T10:00:00Z',
      suspensionReason: 'Safety violation'
    };

    const transition = {
      nextStatus: 'Active' as const,
      reason: 'Training completed',
      actor: 'Admin John',
      decidedAt: '2026-05-12T12:00:00Z'
    };

    const update = getEmployeeStatusTransitionUpdate(inactiveEmployee, transition);

    expect(update.status).toBe('Active');
    expect(update.reinstatementReason).toBe('Training completed');
    expect(update.reinstatedAt).toBe('2026-05-12T12:00:00Z');
    expect(update.reinstatedBy).toBe('Admin John');
    expect(update.notes).toContain('Reinstated: Training completed');
  });

  it('maintains status history across multiple transitions', () => {
    const firstUpdate = getEmployeeStatusTransitionUpdate(mockEmployee, {
      nextStatus: 'Inactive',
      reason: 'First strike',
      actor: 'Admin',
      decidedAt: '2026-01-01T00:00:00Z'
    });

    const secondUpdate = getEmployeeStatusTransitionUpdate({...mockEmployee, ...firstUpdate}, {
      nextStatus: 'Active',
      reason: 'Back to work',
      actor: 'Admin',
      decidedAt: '2026-01-02T00:00:00Z'
    });

    expect(secondUpdate.statusHistory).toHaveLength(2);
    expect(secondUpdate.statusHistory?.[0].nextStatus).toBe('Inactive');
    expect(secondUpdate.statusHistory?.[1].nextStatus).toBe('Active');
  });
});
