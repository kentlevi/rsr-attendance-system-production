import { Employee } from '../models/Employee';

type AccessEmployee = Pick<Employee, 'status' | 'name'>;

export function canEmployeeAccessAttendance(employee: AccessEmployee) {
  if (employee.status === 'Inactive') {
    return {
      allowed: false,
      message: `${employee.name} is inactive and cannot punch time.`,
    };
  }

  return { allowed: true, message: '' };
}

export function canEmployeeAccessPortal(employee: AccessEmployee) {
  if (employee.status === 'Inactive') {
    return {
      allowed: false,
      message: 'This employee account is inactive.',
    };
  }

  return { allowed: true, message: '' };
}
