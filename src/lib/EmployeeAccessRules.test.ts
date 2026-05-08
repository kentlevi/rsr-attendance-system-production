import assert from 'node:assert/strict';
import { canEmployeeAccessAttendance, canEmployeeAccessPortal } from './EmployeeAccessRules';

assert.deepEqual(
  canEmployeeAccessAttendance({ status: 'Active', name: 'Active User' }),
  { allowed: true, message: '' },
);

assert.deepEqual(
  canEmployeeAccessPortal({ status: 'Active', name: 'Active User' }),
  { allowed: true, message: '' },
);

assert.deepEqual(
  canEmployeeAccessAttendance({ status: 'Inactive', name: 'Suspended User' }),
  {
    allowed: false,
    message: 'Suspended User is inactive and cannot punch time.',
  },
);

assert.deepEqual(
  canEmployeeAccessPortal({ status: 'Inactive', name: 'Suspended User' }),
  {
    allowed: false,
    message: 'This employee account is inactive.',
  },
);

console.log('EmployeeAccessRules tests passed');
