import React, { useState, useEffect, useMemo } from 'react';
import { Search, ChevronDown, CheckCircle2, XCircle, ChevronLeft, ChevronRight, Filter, Download, Trash2, User, Calendar, Image as ImageIcon, RefreshCw, MapPin, X, ZoomIn, LogIn, LogOut } from 'lucide-react';
import { attendanceService } from '../../services/AttendanceService';
import { employeeService } from '../../services/EmployeeService';
import { cn } from '../../lib/utils';
import { Select } from '../common/Select';
import { DatePicker } from '../common/DatePicker';
import { motion, AnimatePresence } from 'framer-motion';
import { useToast } from '../../context/ToastContext';

interface PhotoItem {
  id: string;
  image: string;
  name: string;
  employeeId: string;
  tag: string;
  date: string;
  time: string;
  location: string;
}

export function PhotosView() {
  const { showToast } = useToast();
  const [logs, setLogs] = useState(attendanceService.getAllLogs());
  const [employees, setEmployees] = useState(employeeService.getAllEmployeesSync());
  
  const [selectedEmployee, setSelectedEmployee] = useState("");
  const [selectedDate, setSelectedDate] = useState("");
  const [selectedPunchType, setSelectedPunchType] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedPhoto, setSelectedPhoto] = useState<PhotoItem | null>(null);
  const itemsPerPage = 12;

  useEffect(() => {
    const unsubLog = attendanceService.subscribe(() => setLogs(attendanceService.getAllLogs()));
    const unsubEmp = employeeService.subscribe(() => setEmployees(employeeService.getAllEmployeesSync()));
    return () => {
      unsubLog();
      unsubEmp();
    };
  }, []);

  // Flatten logs into distinct photo items
  const allPhotos = useMemo(() => {
    return logs.flatMap(log => {
      const emp = employees.find(e => e.id === log.data.employeeId);
      const result: PhotoItem[] = [];
      
      if (log.data.imageIn) {
        result.push({
          id: `${log.data.id}-in`,
          image: log.data.imageIn,
          name: emp?.data.name || 'Unknown Employee',
          employeeId: log.data.employeeId,
          tag: 'Time In',
          date: log.data.date,
          time: log.data.timeIn,
          location: log.data.location,
        });
      }
      
      if (log.data.imageOut) {
        result.push({
          id: `${log.data.id}-out`,
          image: log.data.imageOut,
          name: emp?.data.name || 'Unknown Employee',
          employeeId: log.data.employeeId,
          tag: 'Time Out',
          date: log.data.date,
          time: log.data.timeOut,
          location: log.data.location,
        });
      }
      
      return result;
    });
  }, [logs, employees]);

  const filteredPhotos = useMemo(() => {
    return allPhotos.filter(photo => {
      const matchEmp = !selectedEmployee || photo.employeeId === selectedEmployee;
      const matchDate = !selectedDate || photo.date === selectedDate;
      const matchPunch = !selectedPunchType || photo.tag === selectedPunchType;
      return matchEmp && matchDate && matchPunch;
    });
  }, [allPhotos, selectedEmployee, selectedDate, selectedPunchType]);

  const totalPages = Math.ceil(filteredPhotos.length / itemsPerPage);
  const paginatedPhotos = filteredPhotos.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  useEffect(() => {
    setCurrentPage(1);
  }, [selectedEmployee, selectedDate, selectedPunchType]);

  const getTagColor = (tag: string) => {
    switch (tag) {
      case 'Time In':
        return 'bg-[#065F46] text-[#A7F3D0]';
      case 'Time Out':
        return 'bg-[#991B1B] text-[#FECACA]';
      case 'Lunch Out':
      case 'Lunch In':
        return 'bg-[#92400E] text-[#FDE68A]';
      default:
        return 'bg-[#1E293B] text-[#CBD5E1]';
    }
  };

  const getTagIcon = (tag: string) => {
    switch (tag) {
      case 'Time In': return <LogIn size={10} />;
      case 'Time Out': return <LogOut size={10} />;
      default: return null;
    }
  };

  const handleExportPhotos = () => {
    if (filteredPhotos.length === 0) {
      showToast("No photos to export.", "warning");
      return;
    }

    const headers = [
      "Photo ID",
      "Employee",
      "Employee ID",
      "Punch Type",
      "Date",
      "Time",
      "Location",
    ];
    const escapeCSV = (value: string) => `"${String(value || "").replace(/"/g, '""')}"`;
    const rows = filteredPhotos.map((photo) =>
      [
        photo.id,
        photo.name,
        photo.employeeId,
        photo.tag,
        photo.date,
        photo.time,
        photo.location,
      ]
        .map(escapeCSV)
        .join(","),
    );
    const csv = [headers.join(","), ...rows].join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `attendance_photos_${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    showToast("Photo list exported.", "success");
  };

  const handleClearPhotos = async () => {
    if (filteredPhotos.length === 0) {
      showToast("No photos to clear.", "warning");
      return;
    }

    if (
      !window.confirm(
        `Clear ${filteredPhotos.length} photo${filteredPhotos.length === 1 ? "" : "s"} from the current filters? Attendance logs will be kept.`,
      )
    ) {
      return;
    }

    const fieldsByLog = filteredPhotos.reduce<Record<string, Set<"imageIn" | "imageOut">>>(
      (acc, photo) => {
        const [logId, punchDirection] = photo.id.split("-");
        if (!acc[logId]) acc[logId] = new Set();
        acc[logId].add(punchDirection === "in" ? "imageIn" : "imageOut");
        return acc;
      },
      {},
    );

    try {
      await Promise.all(
        (Object.entries(fieldsByLog) as Array<
          [string, Set<"imageIn" | "imageOut">]
        >).map(([logId, fields]) =>
          attendanceService.clearLogPhotos(logId, Array.from(fields)),
        ),
      );
      setSelectedPhoto(null);
      showToast("Photos cleared successfully.", "success");
    } catch (error) {
      console.error(error);
      showToast("Failed to clear photos.", "error");
    }
  };

  return (
    <div className="w-full flex flex-col gap-6 animate-in fade-in duration-500">
      <div className="bg-white rounded-2xl border border-border shadow-[0_2px_10px_rgba(0,0,0,0.02)] p-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6 pb-6 border-b border-border/60">
          <div className="flex items-center gap-3">
             <div className="flex items-center gap-2 px-3 py-1 bg-[#F8FAFC] border border-border/60 rounded-lg">
                <ImageIcon size={16} className="text-primary" />
                <span className="text-[#64748B] text-[16px] font-medium">Total photos: {allPhotos.length}</span>
             </div>
             {filteredPhotos.length !== allPhotos.length && (
               <span className="text-[12px] text-text-muted font-medium italic">Filtered: {filteredPhotos.length} found</span>
             )}
          </div>
          <div className="flex items-center gap-3">
            <button className="btn-secondary btn-sm" onClick={handleExportPhotos}>
              <Download size={16} /> Export
            </button>
            <button 
              className="btn-danger btn-sm"
              onClick={handleClearPhotos}
            >
              <Trash2 size={16} /> Clear all
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8 bg-[#F8FAFC] p-4 rounded-2xl border border-border/40 items-end">
          <Select 
            label="Employee"
            icon={User}
            value={selectedEmployee}
            onChange={(e) => setSelectedEmployee(e.target.value)}
          >
            <option value="">All Employees</option>
            {employees.map(emp => (
              <option key={emp.id} value={emp.id}>{emp.data.name}</option>
            ))}
          </Select>

          <div className="flex flex-col gap-1.5 flex-1 relative">
            <label className="text-[16px] font-medium text-text-muted uppercase tracking-wider pl-1 font-mono leading-none">Date</label>
            <DatePicker 
              value={selectedDate}
              onChange={setSelectedDate}
              placeholder="Select Date"
            />
          </div>

          <Select 
            label="Punch Type"
            icon={Filter}
            value={selectedPunchType}
            onChange={(e) => setSelectedPunchType(e.target.value)}
          >
            <option value="">All Punch Types</option>
            <option value="Time In">Time In</option>
            <option value="Time Out">Time Out</option>
            <option value="Lunch In">Lunch In</option>
            <option value="Lunch Out">Lunch Out</option>
          </Select>

          <button 
            onClick={() => {
              setSelectedEmployee("");
              setSelectedDate("");
              setSelectedPunchType("");
            }}
            className="btn-secondary"
          >
            <RefreshCw size={16} className="text-primary" /> Reset
          </button>
        </div>

        {paginatedPhotos.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 mb-8">
            <AnimatePresence mode="popLayout">
              {paginatedPhotos.map((photo) => (
                <motion.div 
                  layout
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.9 }}
                  transition={{ duration: 0.2 }}
                  key={photo.id} 
                  className="relative group rounded-3xl overflow-hidden transition-all duration-300 border border-border bg-[#F8FAFC]"
                >
                  <div className="aspect-[3/4] relative overflow-hidden">
                    <img 
                      src={photo.image || undefined} 
                      alt={photo.name} 
                      className="absolute inset-0 w-full h-full object-cover transition-transform duration-700 group-hover:scale-110" 
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/30 to-transparent opacity-60 group-hover:opacity-80 transition-opacity pointer-events-none" />
                    
                    <button 
                      onClick={() => setSelectedPhoto(photo)}
                      className="absolute top-4 right-4 btn-icon bg-white/20 border-transparent text-white backdrop-blur-md opacity-0 group-hover:opacity-100 hover:bg-white/40 hover:text-white active:scale-90"
                    >
                      <ZoomIn size={20} />
                    </button>

                    <div className="absolute top-4 left-4">
                       <div className={cn("inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[16px] font-bold uppercase tracking-widest shadow-lg", getTagColor(photo.tag))}>
                         {getTagIcon(photo.tag)}
                         {photo.tag}
                       </div>
                    </div>
                  </div>
                  
                  <div className="p-5 flex flex-col gap-3">
                    <div className="flex items-center gap-2.5">
                      <div className="w-2.5 h-2.5 rounded-full bg-success shadow-[0_0_8px_rgba(34,197,94,0.5)]" />
                      <span className="text-[#1a1a1a] font-medium text-[16px] leading-tight truncate">{photo.name}</span>
                    </div>
                    
                    <div className="flex flex-col gap-2">
                      <div className="flex items-center gap-2.5 text-text-secondary">
                        <Calendar size={13} className="text-[#64748B]" />
                        <span className="text-[16px] font-medium">{photo.date} &bull; <span className="text-[#1a1a1a] font-bold">{photo.time}</span></span>
                      </div>
                      <div className="flex items-center gap-2.5 text-text-secondary">
                        <MapPin size={13} className="text-[#64748B]" />
                        <span className="text-[16px] font-medium truncate">{photo.location}</span>
                      </div>
                    </div>
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center py-32 bg-slate-50/50 rounded-3xl border-2 border-dashed border-slate-200 mb-8">
             <div className="w-20 h-20 rounded-full bg-white flex items-center justify-center shadow-sm mb-6 border border-border">
               <ImageIcon size={32} className="text-slate-300" />
             </div>
             <p className="text-[#1a1a1a] font-bold text-lg mb-1">No photos found</p>
             <p className="text-slate-500 text-[16px] font-medium">Try adjusting your filters to find what you're looking for.</p>
          </div>
        )}

        <div className="pt-6 border-t border-border/60 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="text-[16px] text-text-secondary font-medium">
            Showing <span className="text-[#1a1a1a] font-medium">{(currentPage - 1) * itemsPerPage + 1}-{Math.min(currentPage * itemsPerPage, filteredPhotos.length)}</span> of <span className="text-[#1a1a1a] font-medium">{filteredPhotos.length}</span> photos
          </div>
          <div className="flex items-center gap-1.5">
            <button 
              disabled={currentPage === 1}
              onClick={() => setCurrentPage(prev => prev - 1)}
              className="btn-icon text-text-muted hover:text-primary hover:border-primary active:scale-90"
            >
              <ChevronLeft size={20} />
            </button>
            
            {Array.from({ length: Math.min(5, totalPages) }).map((_, i) => {
               const pageNum = i + 1;
               return (
                 <button 
                   key={pageNum}
                   onClick={() => setCurrentPage(pageNum)}
                   className={cn(
                     "btn-icon font-semibold active:scale-90",
                     currentPage === pageNum 
                       ? "bg-primary text-white" 
                       : "border border-border bg-white text-text-secondary hover:border-primary hover:text-primary"
                   )}
                 >
                   {pageNum}
                 </button>
               );
            })}

            <button 
              disabled={currentPage === totalPages || totalPages === 0}
              onClick={() => setCurrentPage(prev => prev + 1)}
              className="btn-icon text-text-muted hover:text-primary hover:border-primary active:scale-90"
            >
              <ChevronRight size={20} />
            </button>
          </div>
        </div>
      </div>

      {/* Photo Modal */}
      <AnimatePresence>
        {selectedPhoto && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 md:p-6">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setSelectedPhoto(null)}
              className="absolute inset-0 bg-black/95 backdrop-blur-sm"
            />
            
            <motion.div 
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="relative bg-white w-full max-w-4xl rounded-[32px] overflow-hidden shadow-2xl flex flex-col md:flex-row h-full max-h-[85vh]"
            >
              <button 
                onClick={() => setSelectedPhoto(null)}
                className="absolute top-6 right-6 z-20 btn-icon bg-black/20 border-transparent text-white backdrop-blur-md hover:bg-black/40 hover:text-white active:scale-90"
              >
                <X size={24} />
              </button>

              <div className="md:w-3/5 h-full bg-black flex items-center justify-center relative overflow-hidden">
                <img 
                  src={selectedPhoto.image || undefined} 
                  alt={selectedPhoto.name} 
                  className="max-w-full max-h-full object-contain"
                />
                <div className="absolute bottom-6 left-6">
                  <div className={cn("px-4 py-1.5 rounded-full text-[16px] font-bold uppercase tracking-[0.1em] shadow-2xl", getTagColor(selectedPhoto.tag))}>
                    {selectedPhoto.tag}
                  </div>
                </div>
              </div>

              <div className="md:w-2/5 p-8 flex flex-col h-full bg-white">
                <div className="flex flex-col gap-6 flex-1">
                  <div>
                    <h2 className="text-[28px] font-bold text-[#1a1a1a] leading-tight mb-2 uppercase tracking-tight">{selectedPhoto.name}</h2>
                    <div className="inline-flex items-center gap-2 px-3 py-1 bg-primary/10 rounded-lg">
                      <User size={14} className="text-primary" />
                      <span className="text-[16px] font-medium text-primary uppercase tracking-wider">Emp ID: {selectedPhoto.employeeId}</span>
                    </div>
                  </div>

                  <div className="flex flex-col gap-6 pt-6 border-t border-border">
                    <div className="flex items-start gap-4">
                      <div className="w-10 h-10 rounded-xl bg-slate-50 border border-border/50 flex items-center justify-center shrink-0">
                        <Calendar className="text-primary" size={18} />
                      </div>
                      <div className="flex flex-col">
                        <span className="text-[16px] font-medium text-text-muted uppercase tracking-[0.1em] mb-0.5">Punch Timestamp</span>
                        <span className="text-[16px] font-bold text-[#1a1a1a]">{selectedPhoto.date} &bull; {selectedPhoto.time}</span>
                      </div>
                    </div>

                    <div className="flex items-start gap-4">
                      <div className="w-10 h-10 rounded-xl bg-slate-50 border border-border/50 flex items-center justify-center shrink-0">
                        <MapPin className="text-primary" size={18} />
                      </div>
                      <div className="flex flex-col">
                        <span className="text-[16px] font-medium text-text-muted uppercase tracking-[0.1em] mb-0.5">Site Location</span>
                        <span className="text-[16px] font-medium text-[#1a1a1a]">{selectedPhoto.location}</span>
                      </div>
                    </div>

                    <div className="flex items-start gap-4">
                      <div className="w-10 h-10 rounded-xl bg-slate-50 border border-border/50 flex items-center justify-center shrink-0">
                        <CheckCircle2 className="text-success" size={18} />
                      </div>
                      <div className="flex flex-col">
                        <span className="text-[16px] font-medium text-text-muted uppercase tracking-[0.1em] mb-0.5">Verification Status</span>
                        <span className="text-[16px] font-bold text-success">VERIFIED BIOMETRIC</span>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="mt-auto grid grid-cols-2 gap-3 pt-8">
                  <button className="btn-secondary w-full">
                    <Download size={18} /> Download
                  </button>
                  <button className="btn-primary w-full">
                    <Search size={18} /> Profile
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
