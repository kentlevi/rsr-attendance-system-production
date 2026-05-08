import assert from 'node:assert/strict';
import { calculateAbsenceStreak, isDateCoveredByApprovedLeave } from './AbsenceRules';

const attendanceLogs = [
  {
    employeeId: 'emp-1',
    date: 'May 5, 2026',
    timeIn: '08:00 AM',
    timeOut: '05:00 PM',
  },
  {
    employeeId: 'emp-2',
    date: 'May 7, 2026',
    timeIn: '08:00 AM',
    timeOut: '05:00 PM',
  },
];

const leaveRequests = [
  {
    employeeId: 'emp-1',
    startDate: '2026-05-06',
    endDate: '2026-05-06',
    type: 'unpaid',
    status: 'Approved',
  },
  {
    employeeId: 'emp-2',
    startDate: '2026-05-08',
    endDate: '2026-05-08',
    type: 'vacation',
    status: 'Approved',
  },
];

assert.equal(
  isDateCoveredByApprovedLeave('emp-1', '2026-05-06', leaveRequests),
  true,
);

const twoDayAbsence = calculateAbsenceStreak({
  employeeId: 'emp-1',
  today: '2026-05-08',
  attendanceLogs,
  leaveRequests,
});

assert.equal(twoDayAbsence.absentDays, 2);
assert.equal(twoDayAbsence.shouldSendSms, true);
assert.equal(twoDayAbsence.shouldSuspend, false);
assert.equal(twoDayAbsence.alertDay, 2);

const leaveStopsAbsence = calculateAbsenceStreak({
  employeeId: 'emp-2',
  today: '2026-05-08',
  attendanceLogs,
  leaveRequests,
});

assert.equal(leaveStopsAbsence.absentDays, 0);
assert.equal(leaveStopsAbsence.shouldSendSms, false);

const threeDayAbsence = calculateAbsenceStreak({
  employeeId: 'emp-3',
  today: '2026-05-08',
  attendanceLogs: [],
  leaveRequests: [],
});

assert.equal(threeDayAbsence.absentDays, 3);
assert.equal(threeDayAbsence.shouldSendSms, true);
assert.equal(threeDayAbsence.shouldSuspend, true);
assert.equal(threeDayAbsence.alertDay, 3);

console.log('AbsenceRules tests passed');
