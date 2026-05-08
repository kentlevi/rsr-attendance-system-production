import assert from 'node:assert/strict';
import { calculateLeaveReplenishment } from './LeaveReplenishmentRules';

const noStartDate = calculateLeaveReplenishment(
  {
    vlBalance: 1,
    slBalance: 1,
  },
  '2026-05-08',
);

assert.equal(noStartDate.shouldUpdate, false);

const firstSixMonthGrant = calculateLeaveReplenishment(
  {
    dateHired: '2025-11-08',
    vlBalance: 0,
    slBalance: 0,
  },
  '2026-05-08',
);

assert.deepEqual(firstSixMonthGrant.update, {
  vlBalance: 2,
  slBalance: 2,
  lastLeaveReplenishmentCycle: 1,
  lastLeaveReplenishmentAt: '2026-05-08',
  leaveReplenishmentHistory: [
    {
      cycle: 1,
      date: '2026-05-08',
      vlAdded: 2,
      slAdded: 2,
    },
  ],
});
assert.equal(firstSixMonthGrant.shouldUpdate, true);

const noDuplicateGrant = calculateLeaveReplenishment(
  {
    dateHired: '2025-11-08',
    vlBalance: 2,
    slBalance: 2,
    lastLeaveReplenishmentCycle: 1,
    leaveReplenishmentHistory: [
      {
        cycle: 1,
        date: '2026-05-08',
        vlAdded: 2,
        slAdded: 2,
      },
    ],
  },
  '2026-05-09',
);

assert.equal(noDuplicateGrant.shouldUpdate, false);

const catchUpGrant = calculateLeaveReplenishment(
  {
    dateHired: '2025-05-08',
    vlBalance: 1,
    slBalance: 3,
    lastLeaveReplenishmentCycle: 1,
    leaveReplenishmentHistory: [],
  },
  '2026-05-08',
);

assert.equal(catchUpGrant.shouldUpdate, true);
assert.deepEqual(catchUpGrant.update?.vlBalance, 3);
assert.deepEqual(catchUpGrant.update?.slBalance, 5);
assert.deepEqual(catchUpGrant.update?.lastLeaveReplenishmentCycle, 2);

console.log('LeaveReplenishmentRules tests passed');
