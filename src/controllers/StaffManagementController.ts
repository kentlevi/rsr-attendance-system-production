import { useState, useEffect } from "react";
import { deleteField } from "firebase/firestore";
import { auth } from "../lib/firebase";
import { employeeService } from "../services/EmployeeService";
import { Employee } from "../models/Employee";
import { useToast } from "../context/ToastContext";
import { getEmployeeStatusTransitionUpdate } from "../lib/EmployeeStatusRules";
import { ReadOnlyOfflineError } from "../lib/readOnlyMode";

// If a service mutation throws because we're in offline read-only mode, show a
// clear warning instead of a generic failure. Re-throws anything else.
function handleMutationError(error: unknown, showToast: (msg: string, kind?: any) => void): boolean {
  if (error instanceof ReadOnlyOfflineError) {
    showToast(error.message, "warning");
    return true;
  }
  return false;
}

// Controller to manage state and actions for Staff Management view
export function useStaffManagementController() {
  const { showToast } = useToast();
  const [employees, setEmployees] = useState(
    employeeService.getAllEmployeesSync(),
  );
  const [selectedEmployeeId, setSelectedEmployeeId] = useState<string | null>(
    null,
  );
  const [isAddEmployeeModalOpen, setIsAddEmployeeModalOpen] = useState(false);
  const [editingEmployeeId, setEditingEmployeeId] = useState<string | null>(
    null,
  );

  useEffect(() => {
    // Determine admin status from current auth
    const isAdmin = !!(auth.currentUser?.email?.includes('@rsr.com') || 
                      auth.currentUser?.email === 'admin@example.com');

    employeeService.initializeForUser(isAdmin, auth.currentUser?.uid);
    
    // Also initialize facial recognition service for admin if applicable
    import("../services/FacialRecognitionService").then(({ facialRecognitionService }) => {
      facialRecognitionService.initializeForAdmin();
    });

    const unsubscribe = employeeService.subscribe(() => {
      setEmployees(employeeService.getAllEmployeesSync());
    });
    
    return () => {
      employeeService.stopSubscription();
      import("../services/FacialRecognitionService").then(({ facialRecognitionService }) => {
        facialRecognitionService.stopSubscription();
      });
      unsubscribe();
    };
  }, []);

  const refreshEmployees = async () => {
    const loaded = await employeeService.loadEmployees();
    setEmployees(loaded);
  };

  const handleAddEmployee = async (data: Employee) => {
    try {
      await employeeService.addEmployee(data);
    } catch (e) {
      if (handleMutationError(e, showToast)) return;
      throw e;
    }
    refreshEmployees();
    setIsAddEmployeeModalOpen(false);
    setEditingEmployeeId(null);
    showToast("Employee added successfully!");
  };

  const handleDeleteEmployee = async (id: string) => {
    try {
      await employeeService.deleteEmployee(id);
    } catch (e) {
      if (handleMutationError(e, showToast)) return;
      throw e;
    }
    refreshEmployees();
    showToast("Employee deleted.");
  };

  const handleUpdateEmployee = async (
    id: string,
    data: Partial<Employee>,
    options?: { toastMessage?: string },
  ) => {
    try {
      await employeeService.updateEmployee(id, data);
    } catch (e) {
      if (handleMutationError(e, showToast)) return;
      throw e;
    }
    refreshEmployees();
    if (editingEmployeeId === id) {
      setEditingEmployeeId(null);
    }
    showToast(options?.toastMessage || "Employee updated successfully!");
  };

  const handleToggleEmployeeStatus = async (
    id: string,
    currentStatus: Employee["status"],
  ) => {
    const nextStatus = currentStatus === "Active" ? "Inactive" : "Active";
    const employee = employees.find((item) => item.data.id === id)?.data;
    await handleUpdateEmployee(
      id,
      getEmployeeStatusTransitionUpdate(employee || { status: currentStatus }, {
        nextStatus,
        reason: nextStatus === "Active" ? "Admin reinstatement after review." : "Admin manual deactivation.",
        actor: "Admin",
      }),
      { toastMessage: `Employee ${nextStatus === "Active" ? "activated" : "deactivated"} successfully.` },
    );
  };

  const handleResetEmployeeAccess = async (id: string) => {
    const newPin = Math.floor(100000 + Math.random() * 900000).toString();
    try {
      await employeeService.updateEmployee(id, {
        pin: newPin,
        facialRecognitionProfileId: deleteField(),
        facialDataImage: deleteField(),
      } as any);
    } catch (e) {
      if (handleMutationError(e, showToast)) return;
      throw e;
    }
    refreshEmployees();
    showToast(`Access reset. New PIN: ${newPin}`, "warning");
  };

  return {
    employees,
    selectedEmployeeId,
    setSelectedEmployeeId,
    isAddEmployeeModalOpen,
    setIsAddEmployeeModalOpen,
    editingEmployeeId,
    setEditingEmployeeId,
    handleAddEmployee,
    handleUpdateEmployee,
    handleDeleteEmployee,
    handleToggleEmployeeStatus,
    handleResetEmployeeAccess,
  };
}
