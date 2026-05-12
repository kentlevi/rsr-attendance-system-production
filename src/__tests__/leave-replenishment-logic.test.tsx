import { beforeEach, describe, expect, it, vi } from 'vitest';
import { calculateLeaveReplenishment } from '../lib/LeaveReplenishmentRules';

// Unit Test for the Rules
describe('Leave Replenishment Rules', () => {
  const baseEmployee = {
    dateHired: '2025-01-01',
    vlBalance: 0,
    slBalance: 0,
    lastLeaveReplenishmentCycle: 0,
    lastLeaveReplenishmentAt: '',
    leaveReplenishmentHistory: []
  };

  it('does not grant leave before the first 6-month cycle', () => {
    // 5 months later
    const result = calculateLeaveReplenishment(baseEmployee, '2025-06-01');
    expect(result.shouldUpdate).toBe(false);
  });

  it('grants 2 days each of VL and SL after the first 6 months', () => {
    // Exactly 6 months later
    const result = calculateLeaveReplenishment(baseEmployee, '2025-07-01');
    expect(result.shouldUpdate).toBe(true);
    expect(result.update?.vlBalance).toBe(2);
    expect(result.update?.slBalance).toBe(2);
    expect(result.update?.lastLeaveReplenishmentCycle).toBe(1);
  });

  it('grants catch-up leaves if multiple cycles have passed', () => {
    // 13 months later (2 cycles)
    const result = calculateLeaveReplenishment(baseEmployee, '2026-02-01');
    expect(result.shouldUpdate).toBe(true);
    expect(result.update?.vlBalance).toBe(4); // 2 cycles * 2 days
    expect(result.update?.slBalance).toBe(4);
    expect(result.update?.lastLeaveReplenishmentCycle).toBe(2);
    expect(result.update?.leaveReplenishmentHistory).toHaveLength(1);
    expect(result.update?.leaveReplenishmentHistory?.[0].cycle).toBe(2);
  });

  it('does not double grant leaves for the same cycle', () => {
    const alreadyGranted = {
        ...baseEmployee,
        vlBalance: 2,
        slBalance: 2,
        lastLeaveReplenishmentCycle: 1,
        lastLeaveReplenishmentAt: '2025-07-01'
    };

    // Still in cycle 1
    const result = calculateLeaveReplenishment(alreadyGranted, '2025-08-01');
    expect(result.shouldUpdate).toBe(false);
  });
});
