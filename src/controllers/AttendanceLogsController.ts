import { useState, useEffect } from 'react';
import { attendanceService } from '../services/AttendanceService';
import { AttendanceLog } from '../models/AttendanceLog';

export function useAttendanceLogsController() {
  const [logs, setLogs] = useState(attendanceService.getAllLogs());

  useEffect(() => {
    const unsubscribe = attendanceService.subscribe(() => {
      setLogs(attendanceService.getAllLogs());
    });
    return () => unsubscribe();
  }, []);

  const refreshLogs = () => {
    setLogs(attendanceService.getAllLogs());
  };

  return {
    logs,
    refreshLogs
  };
}
