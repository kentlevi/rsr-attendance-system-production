import assert from 'node:assert/strict';
import { getLeavePolicy, validateLeaveRequest } from './LeaveRules';

assert.deepEqual(getLeavePolicy('sick'), {
  label: 'Sick Leave',
  paidHoursPerDay: 8,
  creditLimitDays: 2,
  requiresAdvanceDays: 0,
});

assert.deepEqual(getLeavePolicy('vacation'), {
  label: 'Vacation Leave',
  paidHoursPerDay: 8,
  creditLimitDays: 2,
  requiresAdvanceDays: 3,
});

assert.deepEqual(getLeavePolicy('unpaid'), {
  label: 'Leave Without Pay',
  paidHoursPerDay: 0,
  creditLimitDays: null,
  requiresAdvanceDays: 0,
});

const sameDaySick = validateLeaveRequest({
  type: 'sick',
  startDate: '2026-05-08',
  endDate: '2026-05-08',
  today: '2026-05-08',
});

assert.equal(sameDaySick.valid, true);

const lateVacation = validateLeaveRequest({
  type: 'vacation',
  startDate: '2026-05-10',
  endDate: '2026-05-10',
  today: '2026-05-08',
});

assert.equal(lateVacation.valid, false);
assert.equal(lateVacation.message, 'Vacation Leave must be filed at least 3 days in advance.');

const advancedVacation = validateLeaveRequest({
  type: 'vacation',
  startDate: '2026-05-11',
  endDate: '2026-05-11',
  today: '2026-05-08',
});

assert.equal(advancedVacation.valid, true);

const invalidRange = validateLeaveRequest({
  type: 'unpaid',
  startDate: '2026-05-11',
  endDate: '2026-05-10',
  today: '2026-05-08',
});

assert.equal(invalidRange.valid, false);
assert.equal(invalidRange.message, 'End date cannot be earlier than start date.');

console.log('LeaveRules tests passed');
