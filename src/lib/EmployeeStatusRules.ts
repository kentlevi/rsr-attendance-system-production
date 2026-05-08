import { Employee } from '../models/Employee';

interface StatusTransitionInput {
  nextStatus: Employee['status'];
  reason: string;
  actor: string;
  decidedAt?: string;
}

export function getEmployeeStatusTransitionUpdate(
  employee: Partial<Employee>,
  transition: StatusTransitionInput,
): Partial<Employee> {
  const decidedAt = transition.decidedAt || new Date().toISOString();
  const previousStatus = employee.status || 'Active';
  const statusHistory = [
    ...(employee.statusHistory || []),
    {
      previousStatus,
      nextStatus: transition.nextStatus,
      reason: transition.reason,
      actor: transition.actor,
      decidedAt,
    },
  ];
  const notes = appendStatusNote(employee.notes, transition.nextStatus, transition.reason, decidedAt);
  const update: Partial<Employee> = {
    status: transition.nextStatus,
    statusHistory,
    notes,
  };

  if (transition.nextStatus === 'Inactive') {
    return {
      ...update,
      suspensionReason: transition.reason,
      suspendedAt: decidedAt,
      suspendedBy: transition.actor,
      reinstatementReason: undefined,
      reinstatedAt: undefined,
      reinstatedBy: undefined,
    };
  }

  if (previousStatus === 'Inactive' && transition.nextStatus === 'Active') {
    return {
      ...update,
      reinstatementReason: transition.reason,
      reinstatedAt: decidedAt,
      reinstatedBy: transition.actor,
    };
  }

  return update;
}

function appendStatusNote(notes: string | undefined, nextStatus: Employee['status'], reason: string, decidedAt: string) {
  const prefix = nextStatus === 'Inactive' ? 'Suspended' : nextStatus === 'Active' ? 'Reinstated' : 'Status changed';
  return [
    notes || '',
    `${prefix}: ${reason} (${decidedAt}).`,
  ].filter(Boolean).join('\n');
}
