import assert from 'node:assert/strict';
import { getEmployeeStatusTransitionUpdate } from './EmployeeStatusRules';

const suspended = getEmployeeStatusTransitionUpdate(
  {
    status: 'Active',
    notes: 'Existing note.',
  },
  {
    nextStatus: 'Inactive',
    reason: 'AWOL day 3.',
    actor: 'System',
    decidedAt: '2026-05-08T12:00:00.000Z',
  },
);

assert.equal(suspended.status, 'Inactive');
assert.equal(suspended.suspensionReason, 'AWOL day 3.');
assert.equal(suspended.suspendedAt, '2026-05-08T12:00:00.000Z');
assert.equal(suspended.suspendedBy, 'System');
assert.equal(suspended.reinstatedAt, undefined);
assert.equal(suspended.statusHistory?.length, 1);
assert.equal(suspended.statusHistory?.[0].nextStatus, 'Inactive');
assert.equal(suspended.notes?.includes('Suspended: AWOL day 3.'), true);

const reinstated = getEmployeeStatusTransitionUpdate(
  {
    status: 'Inactive',
    suspensionReason: 'AWOL day 3.',
    suspendedAt: '2026-05-08T12:00:00.000Z',
    suspendedBy: 'System',
    statusHistory: suspended.statusHistory,
  },
  {
    nextStatus: 'Active',
    reason: 'Admin review complete.',
    actor: 'Admin',
    decidedAt: '2026-05-09T08:00:00.000Z',
  },
);

assert.equal(reinstated.status, 'Active');
assert.equal(reinstated.reinstatementReason, 'Admin review complete.');
assert.equal(reinstated.reinstatedAt, '2026-05-09T08:00:00.000Z');
assert.equal(reinstated.reinstatedBy, 'Admin');
assert.equal(reinstated.statusHistory?.length, 2);
assert.equal(reinstated.statusHistory?.[1].previousStatus, 'Inactive');
assert.equal(reinstated.statusHistory?.[1].nextStatus, 'Active');

console.log('EmployeeStatusRules tests passed');
