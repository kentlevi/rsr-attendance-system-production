import { Employee } from '../models/Employee';

type ReplenishmentEmployee = Pick<
  Employee,
  | 'dateHired'
  | 'vlBalance'
  | 'slBalance'
  | 'lastLeaveReplenishmentCycle'
  | 'lastLeaveReplenishmentAt'
  | 'leaveReplenishmentHistory'
>;

export function calculateLeaveReplenishment(
  employee: ReplenishmentEmployee,
  today = new Date().toISOString().slice(0, 10),
) {
  if (!employee.dateHired) {
    return { shouldUpdate: false, update: undefined };
  }

  const elapsedCycles = getElapsedSixMonthCycles(employee.dateHired, today);
  const lastCycle = employee.lastLeaveReplenishmentCycle || 0;

  if (elapsedCycles <= lastCycle) {
    return { shouldUpdate: false, update: undefined };
  }

  const cyclesToGrant = elapsedCycles - lastCycle;
  const vlAdded = cyclesToGrant * 2;
  const slAdded = cyclesToGrant * 2;
  const nextCycle = elapsedCycles;
  const historyItem = {
    cycle: nextCycle,
    date: today,
    vlAdded,
    slAdded,
  };

  return {
    shouldUpdate: true,
    update: {
      vlBalance: (employee.vlBalance || 0) + vlAdded,
      slBalance: (employee.slBalance || 0) + slAdded,
      lastLeaveReplenishmentCycle: nextCycle,
      lastLeaveReplenishmentAt: today,
      leaveReplenishmentHistory: [
        ...(employee.leaveReplenishmentHistory || []),
        historyItem,
      ],
    },
  };
}

function getElapsedSixMonthCycles(dateHired: string, today: string) {
  const start = parseDateOnly(dateHired);
  const current = parseDateOnly(today);

  if (!Number.isFinite(start.getTime()) || !Number.isFinite(current.getTime()) || current < start) {
    return 0;
  }

  let months = (current.getFullYear() - start.getFullYear()) * 12;
  months += current.getMonth() - start.getMonth();

  if (current.getDate() < start.getDate()) {
    months -= 1;
  }

  return Math.floor(months / 6);
}

function parseDateOnly(value: string) {
  return new Date(`${value}T00:00:00`);
}
