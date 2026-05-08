import assert from 'node:assert/strict';
import { applyLeaveApprovalDecision, calculateLeaveBalanceUpdate } from './RequestApprovalRules';

const approved = applyLeaveApprovalDecision(
  {
    status: 'Pending',
    approvalHistory: [],
  },
  {
    decision: 'Approved',
    decidedBy: 'Admin',
    decidedAt: '2026-05-08T10:00:00.000Z',
    note: 'Leave credits verified.',
  },
);

assert.equal(approved.status, 'Approved');
assert.equal(approved.reviewedBy, 'Admin');
assert.equal(approved.reviewedAt, '2026-05-08T10:00:00.000Z');
assert.equal(approved.approvalHistory?.length, 1);
assert.equal(approved.approvalHistory?.[0].decision, 'Approved');
assert.equal(approved.approvalHistory?.[0].note, 'Leave credits verified.');
assert.equal(approved.absenceRecalculationRequired, true);
assert.equal(approved.absenceRecalculationReason, 'Leave Approved affects absence streaks.');

const rejected = applyLeaveApprovalDecision(
  {
    status: 'Pending',
  },
  {
    decision: 'Rejected',
    decidedBy: 'Admin',
    decidedAt: '2026-05-08T11:00:00.000Z',
  },
);

assert.equal(rejected.status, 'Rejected');
assert.equal(rejected.reviewedBy, 'Admin');
assert.equal(rejected.approvalHistory?.[0].decision, 'Rejected');
assert.equal(rejected.absenceRecalculationRequired, true);
assert.equal(rejected.absenceRecalculationReason, 'Leave Rejected affects absence streaks.');

const vacationBalance = calculateLeaveBalanceUpdate(
  {
    type: 'vacation',
    startDate: '2026-05-08',
    endDate: '2026-05-09',
  },
  {
    vlBalance: 2,
    slBalance: 2,
  },
);

assert.deepEqual(vacationBalance, { ok: true, update: { vlBalance: 0 } });

const sickBalance = calculateLeaveBalanceUpdate(
  {
    type: 'sick',
    startDate: '2026-05-08',
    endDate: '2026-05-08',
  },
  {
    vlBalance: 2,
    slBalance: 1,
  },
);

assert.deepEqual(sickBalance, { ok: true, update: { slBalance: 0 } });

const insufficientBalance = calculateLeaveBalanceUpdate(
  {
    type: 'vacation',
    startDate: '2026-05-08',
    endDate: '2026-05-10',
  },
  {
    vlBalance: 2,
    slBalance: 2,
  },
);

assert.equal(insufficientBalance.ok, false);
assert.equal(insufficientBalance.message, 'Insufficient Vacation Leave balance. Required 3 day(s), available 2.');

const unpaidBalance = calculateLeaveBalanceUpdate(
  {
    type: 'unpaid',
    startDate: '2026-05-08',
    endDate: '2026-05-20',
  },
  {
    vlBalance: 0,
    slBalance: 0,
  },
);

assert.deepEqual(unpaidBalance, { ok: true, update: {} });

console.log('RequestApprovalRules tests passed');
