import React, { useState } from "react";
import {
  Calendar,
  ChevronDown,
  User,
  Info,
  ScanFace,
  CheckCircle2,
  Camera,
} from "lucide-react";
import { Modal } from "../../common/Modal";
import { Select } from "../../common/Select";
import { DatePicker } from "../../common/DatePicker";
import { cn, formatTimeTo12h, resizeImage } from "../../../lib/utils";
import Webcam from "react-webcam";
import { settingsService } from "../../../services/SettingsService";
import { useToast } from "../../../context/ToastContext";

export function AddEmployeeModal({
  isOpen,
  onClose,
  onAdd,
  employeeToEdit,
}: any) {
  const { showToast } = useToast();
  const [activeTab, setActiveTab] = useState<
    "personal" | "employment" | "financial" | "account"
  >("personal");
  const [isCapturing, setIsCapturing] = useState(false);
  const [isProcessingCapture, setIsProcessingCapture] = useState(false);
  const [isCameraReady, setIsCameraReady] = useState(false);
  const [isModelsLoading, setIsModelsLoading] = useState(false);
  const [capturedImages, setCapturedImages] = useState<string[]>([]);
  const [capturedDescriptors, setCapturedDescriptors] = useState<number[][]>([]);
  const webcamRef = React.useRef<Webcam>(null);
  const scrollContainerRef = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    if (scrollContainerRef.current) {
      const scrollParent = scrollContainerRef.current.closest('.custom-scrollbar');
      const globalOverlay = document.getElementById('global-modal-overlay');
      
      const resetScroll = () => {
        if (scrollParent) scrollParent.scrollTop = 0;
        if (globalOverlay) globalOverlay.scrollTop = 0;
      };

      requestAnimationFrame(resetScroll);
      setTimeout(resetScroll, 50);
    }
  }, [activeTab]);

  React.useEffect(() => {
    if (activeTab === "account") {
      // Pre-import the service to start loading models
      setIsModelsLoading(true);
      import("../../../services/FacialRecognitionService").then(({ facialRecognitionService }) => {
        facialRecognitionService.initModels().finally(() => {
          setIsModelsLoading(false);
        });
      });
    }
  }, [activeTab]);

  const handleCapture = React.useCallback(async () => {
    if (webcamRef.current) {
      const imageSrc = webcamRef.current.getScreenshot();
      if (imageSrc && capturedImages.length < 5) {
        setIsProcessingCapture(true);
        try {
          const { facialRecognitionService } = await import("../../../services/FacialRecognitionService");
          const descriptor = await facialRecognitionService.extractFaceDescriptor(imageSrc);
          if (descriptor) {
             setCapturedDescriptors(prev => [...prev, descriptor]);
             setCapturedImages((prev) => [...prev, imageSrc]);
             showToast("Face matched and registered!", "success");
          } else {
             showToast("No face detected! Move closer or into better light.", "error");
          }
        } catch (error) {
          console.error("Capture Error:", error);
          showToast("Failed to process image", "error");
        } finally {
          setIsProcessingCapture(false);
        }
      }
    }
  }, [webcamRef, capturedImages, showToast]);

  const [formData, setFormData] = useState({
    firstName: employeeToEdit ? employeeToEdit.name.split(" ")[0] : "",
    lastName: employeeToEdit
      ? employeeToEdit.name.split(" ").slice(1).join(" ")
      : "",
    email: employeeToEdit?.email || "",
    phone: employeeToEdit?.phone || "",
    dob: employeeToEdit?.dob || "",
    gender: employeeToEdit?.gender || "",
    civilStatus: employeeToEdit?.civilStatus || "",
    address: employeeToEdit?.address || "",
    pin: employeeToEdit?.pin || "",
    rfid: employeeToEdit?.rfid || "",
    employeeId: employeeToEdit?.employeeId || "",
    department: employeeToEdit?.department || "",
    position: employeeToEdit?.position || "",
    employmentType: employeeToEdit?.employmentType || "",
    workLocation: employeeToEdit?.workLocation || "",
    supervisor: employeeToEdit?.supervisor || "",
    shiftTemplateId: employeeToEdit?.shiftTemplateId || "",
    dateHired: employeeToEdit?.dateHired || "",
    dailyRate: employeeToEdit?.dailyRate || "",
    payPeriodType: employeeToEdit?.payPeriodType || "",
    taxId: employeeToEdit?.taxId || "",
    sssNumber: employeeToEdit?.sssNumber || "",
    pagibigNumber: employeeToEdit?.pagibigNumber || "",
    philhealthNumber: employeeToEdit?.philhealthNumber || "",
    allowanceType: employeeToEdit?.allowanceType || "",
    notes: employeeToEdit?.notes || "",
    avatar: employeeToEdit?.avatar || "",
  });

  React.useEffect(() => {
    if (employeeToEdit) {
      setFormData({
        firstName: employeeToEdit.name.split(" ")[0] || "",
        lastName: employeeToEdit.name.split(" ").slice(1).join(" ") || "",
        email: employeeToEdit.email || "",
        phone: employeeToEdit.phone || "",
        dob: employeeToEdit.dob || "",
        gender: employeeToEdit.gender || "",
        civilStatus: employeeToEdit.civilStatus || "",
        address: employeeToEdit.address || "",
        pin: employeeToEdit.pin || "",
        rfid: employeeToEdit.rfid || "",
        employeeId: employeeToEdit.employeeId || "",
        department: employeeToEdit.department || "",
        position: employeeToEdit.position || "",
        employmentType: employeeToEdit.employmentType || "",
        workLocation: employeeToEdit.workLocation || "",
        supervisor: employeeToEdit.supervisor || "",
        shiftTemplateId: employeeToEdit.shiftTemplateId || "",
        dateHired: employeeToEdit.dateHired || "",
        dailyRate: employeeToEdit.dailyRate || "",
        payPeriodType: employeeToEdit.payPeriodType || "",
        taxId: employeeToEdit.taxId || "",
        sssNumber: employeeToEdit.sssNumber || "",
        pagibigNumber: employeeToEdit.pagibigNumber || "",
        philhealthNumber: employeeToEdit.philhealthNumber || "",
        allowanceType: employeeToEdit.allowanceType || "",
        notes: employeeToEdit.notes || "",
        avatar: employeeToEdit.avatar || "",
      });
    } else {
      setFormData({
        firstName: "",
        lastName: "",
        email: "",
        phone: "",
        dob: "",
        gender: "",
        civilStatus: "",
        address: "",
        pin: "",
        rfid: "",
        employeeId: "",
        department: "",
        position: "",
        employmentType: "",
        workLocation: "",
        supervisor: "",
        shiftTemplateId: "",
        dateHired: "",
        dailyRate: "",
        payPeriodType: "",
        taxId: "",
        sssNumber: "",
        pagibigNumber: "",
        philhealthNumber: "",
        allowanceType: "",
        notes: "",
        avatar: "",
      });
    }
  }, [employeeToEdit]);

  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleChange = (
    e: React.ChangeEvent<
      HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement
    >,
  ) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e?: React.FormEvent | React.MouseEvent) => {
    if (e && 'preventDefault' in e) {
      e.preventDefault();
    }

    if (!formData.firstName || !formData.lastName || !formData.department || !formData.position) {
      showToast("Please fill in all required fields", "warning");
      return;
    }

    setIsSubmitting(true);
    try {
      const employeeId = employeeToEdit ? employeeToEdit.id : Date.now().toString();
      
      // Face registration
      let facialRecognitionProfileId = employeeToEdit?.facialRecognitionProfileId || null;
      if (capturedDescriptors.length > 0) {
        const { facialRecognitionService } = await import("../../../services/FacialRecognitionService");
        // Registration ID should be the human-readable ID or internal ID
        const regId = formData.employeeId || employeeId;
        const newProfileId = await facialRecognitionService.registerFace(regId, capturedDescriptors);
        if (newProfileId) {
          facialRecognitionProfileId = newProfileId;
        }
      }

      // Image processing
      const avatar = formData.avatar && formData.avatar.startsWith('data:')
        ? await resizeImage(formData.avatar)
        : (employeeToEdit ? employeeToEdit.avatar : "https://i.pravatar.cc/150?u=" + Date.now());

      const facialDataImage = capturedImages.length > 0 
        ? await resizeImage(capturedImages[0]) 
        : (employeeToEdit?.facialDataImage || null);

      const payload: any = {
        // Basic Info
        id: employeeId,
        avatar,
        name: `${formData.firstName} ${formData.lastName}`.trim() || "New Employee",
        email: formData.email.trim(),
        phone: formData.phone.trim(),
        dob: formData.dob,
        gender: formData.gender,
        civilStatus: formData.civilStatus,
        address: formData.address.trim(),
        
        // Access Credentials
        employeeId: formData.employeeId.trim(),
        pin: formData.pin.trim(),
        rfid: (formData.rfid || "").trim(),
        facialDataImage,
        facialRecognitionProfileId: facialRecognitionProfileId,
        
        // Employment Info
        department: formData.department,
        position: formData.position,
        status: formData.status || (employeeToEdit?.status || "Active"),
        lastLogin: employeeToEdit ? employeeToEdit.lastLogin : "-",
        employmentType: formData.employmentType,
        workLocation: formData.workLocation,
        supervisor: formData.supervisor,
        shiftTemplateId: formData.shiftTemplateId,
        dateHired: formData.dateHired,
        
        // Financial Info
        dailyRate: formData.dailyRate,
        payPeriodType: formData.payPeriodType,
        taxId: formData.taxId,
        sssNumber: formData.sssNumber,
        pagibigNumber: formData.pagibigNumber,
        philhealthNumber: formData.philhealthNumber,
        allowanceType: formData.allowanceType,
        
        // Meta
        notes: formData.notes?.trim() || "",
        updatedAt: new Date().toISOString(),
      };

      if (!employeeToEdit) {
        payload.createdAt = new Date().toISOString();
      }

      await onAdd(payload);
      showToast(employeeToEdit ? "Employee updated successfully!" : "Employee added successfully!", "success");
      onClose();
    } catch (error) {
      console.error("Submit Error:", error);
      showToast("Failed to save employee. " + (error instanceof Error ? error.message : ""), "error");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={employeeToEdit ? "Edit Employee" : "Add Employee"}
      maxWidth="max-w-[700px]"
      footer={
        <div className="flex flex-row w-full gap-3 sm:justify-end">
          <button
            onClick={onClose}
            className="btn-secondary flex-1 sm:flex-initial sm:btn-sm"
          >
            Cancel
          </button>
          <button
            onClick={
              activeTab === "personal"
                ? () => setActiveTab("employment")
                : activeTab === "employment"
                  ? () => setActiveTab("financial")
                  : activeTab === "financial"
                    ? () => setActiveTab("account")
                    : handleSubmit
            }
            disabled={isSubmitting}
            className="btn-primary flex-1 sm:flex-initial sm:btn-sm flex items-center justify-center gap-2"
          >
            {isSubmitting && <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>}
            {employeeToEdit 
              ? (activeTab === "account" ? "Save Changes" : "Next")
              : (activeTab === "account" ? "Save Employee" : "Next")
            }
          </button>
          {employeeToEdit && activeTab !== "account" && (
            <button
              onClick={handleSubmit}
              disabled={isSubmitting}
              className="flex-1 sm:flex-initial btn-primary sm:btn-sm flex items-center justify-center gap-2"
            >
              {isSubmitting && <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>}
              Save Changes
            </button>
          )}
        </div>
      }
    >
      <div className="flex flex-col">
        {/* Tabs */}
        <div className="flex items-center border-b border-border/60 px-5 sm:px-6 sticky top-0 bg-white z-10 overflow-x-auto whitespace-nowrap hide-scrollbar -mx-5 sm:mx-0">
          <button
            onClick={() => setActiveTab("personal")}
            className={cn(
              "flex-shrink-0 text-[14px] sm:text-[16px] font-medium py-4 px-3 border-b-2 transition-colors text-center",
              activeTab === "personal"
                ? "border-[#0B7A4B] text-[#0B7A4B]"
                : "border-transparent text-[#64748B] hover:text-[#1a1a1a]",
            )}
          >
            Personal
          </button>
          <button
            onClick={() => setActiveTab("employment")}
            className={cn(
              "flex-shrink-0 text-[14px] sm:text-[16px] font-medium py-4 px-3 border-b-2 transition-colors text-center",
              activeTab === "employment"
                ? "border-[#0B7A4B] text-[#0B7A4B]"
                : "border-transparent text-[#64748B] hover:text-[#1a1a1a]",
            )}
          >
            Employment
          </button>
          <button
            onClick={() => setActiveTab("financial")}
            className={cn(
              "flex-shrink-0 text-[14px] sm:text-[16px] font-medium py-4 px-3 border-b-2 transition-colors text-center",
              activeTab === "financial"
                ? "border-[#0B7A4B] text-[#0B7A4B]"
                : "border-transparent text-[#64748B] hover:text-[#1a1a1a]",
            )}
          >
            Financial
          </button>
          <button
            onClick={() => setActiveTab("account")}
            className={cn(
              "flex-shrink-0 text-[14px] sm:text-[16px] font-medium py-4 px-3 border-b-2 transition-colors text-center",
              activeTab === "account"
                ? "border-[#0B7A4B] text-[#0B7A4B]"
                : "border-transparent text-[#64748B] hover:text-[#1a1a1a]",
            )}
          >
            Facial Data
          </button>
        </div>

        {/* Content */}
        <div ref={scrollContainerRef} className="p-5 sm:p-8 pb-12">
          {activeTab === "personal" && (
            <div className="flex flex-col gap-6">
              {/* Profile Photo and Basic Info */}
              <div className="flex flex-col sm:flex-row gap-6">
                {/* Profile Photo */}
                <div className="flex flex-col gap-2 shrink-0">
                  <label className="text-label">
                    Profile Photo
                  </label>
                  <label className="w-full sm:w-[140px] aspect-video sm:aspect-[1/1] sm:h-[140px] border-2 border-dashed border-[#CBD5E1] rounded-2xl bg-white flex flex-col items-center justify-center cursor-pointer hover:bg-slate-50 transition-colors overflow-hidden relative">
                    {formData.avatar ? (
                      <img
                        src={formData.avatar || undefined}
                        alt="Profile preview"
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <>
                        <div className="w-12 h-12 rounded-full bg-[#F1F5F9] flex items-center justify-center text-[#64748B] mb-2">
                          <User size={24} />
                        </div>
                        <span className="text-[14px] font-medium text-[#1a1a1a] mb-1">
                          Upload Photo
                        </span>
                        <span className="text-[14px] text-[#64748B]">
                          JPG, PNG up to 2MB
                        </span>
                      </>
                    )}
                    <input
                      type="file"
                      accept="image/png, image/jpeg, image/jpg"
                      className="hidden"
                      onChange={async (e) => {
                        const file = e.target.files?.[0];
                        if (file) {
                          const reader = new FileReader();
                          reader.onloadend = async () => {
                            const resized = await resizeImage(reader.result as string);
                            setFormData((prev) => ({
                              ...prev,
                              avatar: resized,
                            }));
                          };
                          reader.readAsDataURL(file);
                        }
                      }}
                    />
                  </label>
                </div>

                {/* Name, Email, Phone */}
                <div className="flex-1 grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="flex flex-col gap-2">
                    <label className="text-label">
                      First Name <span className="text-[#DC2626]">*</span>
                    </label>
                    <input
                      type="text"
                      name="firstName"
                      value={formData.firstName}
                      onChange={handleChange}
                      className="control-field px-4"
                      placeholder="Enter first name"
                    />
                  </div>
                  <div className="flex flex-col gap-2">
                    <label className="text-label">
                      Last Name <span className="text-[#DC2626]">*</span>
                    </label>
                    <input
                      type="text"
                      name="lastName"
                      value={formData.lastName}
                      onChange={handleChange}
                      className="control-field px-4"
                      placeholder="Enter last name"
                    />
                  </div>
                  <div className="flex flex-col gap-2">
                    <label className="text-label">
                      Email <span className="text-[#DC2626]">*</span>
                    </label>
                    <input
                      type="email"
                      name="email"
                      value={formData.email}
                      onChange={handleChange}
                      className="control-field px-4"
                      placeholder="Enter email address"
                    />
                  </div>
                  <div className="flex flex-col gap-2">
                    <label className="text-label">
                      Mobile Number <span className="text-[#DC2626]">*</span>
                    </label>
                    <div className="flex h-11 rounded-xl border border-border focus-within:border-primary focus-within:ring-2 focus-within:ring-primary/20 transition-all overflow-hidden bg-white">
                      <div className="flex items-center justify-center px-4 border-r border-border bg-[#F8FAFC]">
                        <span className="text-[14px] font-medium text-[#1a1a1a] block min-w-[32px] text-center">
                          +63
                        </span>
                      </div>
                      <input
                        type="text"
                        name="phone"
                        value={formData.phone}
                        onChange={handleChange}
                        className="flex-1 px-3 outline-none text-[14px]"
                        placeholder="Enter mobile number"
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* Middle Section: DOB, Gender, Civil Status */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="flex flex-col gap-2">
                  <label className="text-label">
                    Date of Birth
                  </label>
                  <div className="relative">
                    <DatePicker 
                      value={formData.dob} 
                      onChange={(date) => setFormData((prev) => ({ ...prev, dob: date }))} 
                      placeholder="Select DOB" 
                    />
                  </div>
                </div>
                <div className="flex flex-col gap-2">
                  <label className="text-label">
                    Gender
                  </label>
                  <Select
                    name="gender"
                    value={formData.gender}
                    onChange={handleChange}
                  >
                    <option value="" disabled>
                      Select gender
                    </option>
                    <option value="Male">Male</option>
                    <option value="Female">Female</option>
                    <option value="Other">Other</option>
                  </Select>
                </div>
                <div className="flex flex-col gap-2">
                  <label className="text-label">
                    Civil Status
                  </label>
                  <Select
                    name="civilStatus"
                    value={formData.civilStatus}
                    onChange={handleChange}
                  >
                    <option value="" disabled>
                      Select civil status
                    </option>
                    <option value="Single">Single</option>
                    <option value="Married">Married</option>
                    <option value="Divorced">Divorced</option>
                    <option value="Annulled">Annulled</option>
                    <option value="Widowed">Widowed</option>
                  </Select>
                </div>
              </div>

              {/* Address */}
              <div className="flex flex-col gap-2">
                <label className="text-label">
                  Address
                </label>
                <textarea
                  name="address"
                  value={formData.address}
                  onChange={handleChange}
                  className="control-field min-h-[80px] p-4 resize-none"
                  placeholder="Enter complete address"
                />
              </div>

              {/* Bottom: PIN, RFID */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="flex flex-col gap-1">
                  <label className="text-label flex items-center justify-between">
                    Fallback PIN (Optional)
                  </label>
                  <span className="text-[16px] text-text-secondary leading-tight mb-1">
                    Used if facial recognition fails or is unavailable on a
                    device.
                  </span>
                  <input
                    type="text"
                    name="pin"
                    value={formData.pin}
                    onChange={handleChange}
                    className="control-field px-4"
                    placeholder="Enter PIN"
                  />
                </div>
                <div className="flex flex-col gap-2 justify-end">
                  <label className="text-label">
                    RFID / Card ID (Optional)
                  </label>
                  <input
                    type="text"
                    name="rfid"
                    value={formData.rfid}
                    onChange={handleChange}
                    className="control-field px-4"
                    placeholder="Enter RFID or Card ID"
                  />
                </div>
              </div>
            </div>
          )}

          {activeTab === "employment" && (
            <div className="flex flex-col gap-6">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="flex flex-col gap-2">
                  <label className="text-label">
                    Employee ID <span className="text-[#DC2626]">*</span>
                  </label>
                  <input
                    type="text"
                    name="employeeId"
                    value={formData.employeeId}
                    onChange={handleChange}
                    className="control-field px-4"
                    placeholder="Enter employee ID"
                  />
                </div>
                <div className="flex flex-col gap-2">
                  <label className="text-label">
                    Department <span className="text-[#DC2626]">*</span>
                  </label>
                  <Select
                    name="department"
                    value={formData.department}
                    onChange={handleChange}
                  >
                    <option value="" disabled>
                      Select department
                    </option>
                    <option value="Engineering">Engineering</option>
                    <option value="HR Department">HR Department</option>
                    <option value="Finance">Finance</option>
                  </Select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="flex flex-col gap-2">
                  <label className="text-label">
                    Position / Job Title{" "}
                    <span className="text-[#DC2626]">*</span>
                  </label>
                  <input
                    type="text"
                    name="position"
                    value={formData.position}
                    onChange={handleChange}
                    className="control-field px-4"
                    placeholder="Enter position or job title"
                  />
                </div>
                <div className="flex flex-col gap-2">
                  <label className="text-label">
                    Employment Type <span className="text-[#DC2626]">*</span>
                  </label>
                  <Select
                    name="employmentType"
                    value={formData.employmentType}
                    onChange={handleChange}
                  >
                    <option value="" disabled>
                      Select employment type
                    </option>
                    <option value="Regular">Regular</option>
                    <option value="Contractual">Contractual</option>
                  </Select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="flex flex-col gap-2">
                  <label className="text-label">
                    Work Location / Site{" "}
                    <span className="text-[#DC2626]">*</span>
                  </label>
                  <Select
                    name="workLocation"
                    value={formData.workLocation}
                    onChange={handleChange}
                  >
                    <option value="" disabled>
                      Select work location
                    </option>
                    {settingsService.getSettings().sites.map((site) => (
                      <option key={site} value={site}>{site}</option>
                    ))}
                  </Select>
                </div>
                <div className="flex flex-col gap-2">
                  <label className="text-label">
                    Supervisor
                  </label>
                  <Select
                    name="supervisor"
                    value={formData.supervisor}
                    onChange={handleChange}
                  >
                    <option value="" disabled>
                      Select supervisor
                    </option>
                    <option value="Robert Johnson">Robert Johnson</option>
                  </Select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="flex flex-col gap-2">
                  <label className="text-label">
                    Shift Template
                  </label>
                  <Select
                    name="shiftTemplateId"
                    value={formData.shiftTemplateId || ""}
                    onChange={handleChange}
                  >
                    <option value="">
                      Default Shift ({formatTimeTo12h(settingsService.getSettings().shiftStartTime)} - {formatTimeTo12h(settingsService.getSettings().shiftEndTime)})
                    </option>
                    {settingsService.getSettings().shiftTemplates?.map(t => (
                      <option key={t.id} value={t.id}>{t.name} ({formatTimeTo12h(t.startTime)} - {formatTimeTo12h(t.endTime)})</option>
                    ))}
                  </Select>
                </div>
                <div className="flex flex-col gap-2">
                  <label className="text-label">
                    Date Hired <span className="text-[#DC2626]">*</span>
                  </label>
                  <div className="relative">
                    <input
                      type="date"
                      name="dateHired"
                      value={formData.dateHired}
                      onChange={handleChange}
                      className="control-field px-4"
                      placeholder="Select date"
                    />
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="flex flex-col gap-2">
                  <label className="text-label">
                    Daily Rate (₱) <span className="text-[#DC2626]">*</span>
                  </label>
                  <input
                    type="text"
                    name="dailyRate"
                    value={formData.dailyRate}
                    onChange={handleChange}
                    className="control-field px-4"
                    placeholder="Enter daily rate"
                  />
                </div>
                <div className="flex flex-col gap-2">
                  <label className="text-label flex items-center gap-1.5">
                    Allowance Type{" "}
                    <Info size={14} className="text-text-muted" />
                  </label>
                  <Select
                    name="allowanceType"
                    value={formData.allowanceType}
                    onChange={handleChange}
                  >
                    <option value="" disabled>
                      Select allowance type
                    </option>
                    <option value="Fixed">Fixed</option>
                    <option value="Variable">Variable</option>
                  </Select>
                </div>
              </div>

              <div className="flex flex-col gap-2">
                <label className="text-label">
                  Additional Information (Optional)
                </label>
                <div className="flex flex-col gap-2">
                  <span className="text-[16px] font-medium text-[#1a1a1a]">
                    Notes
                  </span>
                  <textarea
                    name="notes"
                    value={formData.notes}
                    onChange={handleChange}
                    className="control-field min-h-[80px] p-4 resize-none"
                    placeholder="Enter any additional notes"
                  />
                </div>
              </div>
            </div>
          )}

          {activeTab === "financial" && (
            <div className="flex flex-col gap-6">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="flex flex-col gap-2">
                  <label className="text-label">
                    Pay Period Type <span className="text-[#DC2626]">*</span>
                  </label>
                  <Select
                    name="payPeriodType"
                    value={formData.payPeriodType}
                    onChange={handleChange}
                  >
                    <option value="" disabled>Select pay period type</option>
                    <option value="monthly">Monthly</option>
                    <option value="bi-weekly">Bi-Weekly</option>
                  </Select>
                </div>
                <div className="flex flex-col gap-2">
                  <label className="text-label">
                    TIN / Tax ID
                  </label>
                  <input
                    type="text"
                    name="taxId"
                    value={formData.taxId}
                    onChange={handleChange}
                    className="control-field px-4"
                    placeholder="Enter Tax Identification Number"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="flex flex-col gap-2">
                  <label className="text-label">
                    SSS Number
                  </label>
                  <input
                    type="text"
                    name="sssNumber"
                    value={formData.sssNumber}
                    onChange={handleChange}
                    className="control-field px-4"
                    placeholder="Enter SSS Number"
                  />
                </div>
                <div className="flex flex-col gap-2">
                  <label className="text-label">
                    Pag-IBIG Number
                  </label>
                  <input
                    type="text"
                    name="pagibigNumber"
                    value={formData.pagibigNumber}
                    onChange={handleChange}
                    className="control-field px-4"
                    placeholder="Enter Pag-IBIG Number"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="flex flex-col gap-2">
                  <label className="text-label">
                    PhilHealth Number
                  </label>
                  <input
                    type="text"
                    name="philhealthNumber"
                    value={formData.philhealthNumber}
                    onChange={handleChange}
                    className="control-field px-4"
                    placeholder="Enter PhilHealth Number"
                  />
                </div>
              </div>
            </div>
          )}

          {activeTab === "account" && (
            <div className="flex flex-col gap-5 w-full">
              {isModelsLoading && (
                <div className="bg-amber-50 border border-amber-200 p-3 rounded-xl flex items-center gap-3 animate-pulse">
                  <div className="w-5 h-5 border-2 border-amber-500 border-t-transparent rounded-full animate-spin shrink-0"></div>
                  <span className="text-[14px] font-medium text-amber-700">Loading AI Models... This may take a few seconds.</span>
                </div>
              )}
              {/* Top Alert */}
              <div className="bg-[#E8F3EE] p-4 rounded-xl flex items-start gap-4">
                <div className="w-9 h-9 rounded-full border-[1.5px] border-[#0B7A4B] bg-white flex items-center justify-center text-[#0B7A4B] shrink-0">
                  <ScanFace size={18} />
                </div>
                <div className="flex flex-col">
                  <span className="text-[16px] font-medium text-[#0B7A4B]">
                    Facial Recognition (Access Method)
                  </span>
                  <span className="text-[16px] text-[#09623C] mt-1">
                    This employee will use Facial Recognition as the only access
                    method.
                  </span>
                  <span className="text-[16px] text-[#09623C]">
                    No PIN or password is required.
                  </span>
                </div>
              </div>

              {/* Title */}
              <h4 className="text-[16px] font-medium text-[#1a1a1a]">
                Capture Facial Data
              </h4>

              {/* Main Content */}
              <div className="flex flex-col sm:flex-row gap-6 md:gap-8">
                {/* Left Panel - Capture Box */}
                <div className="relative w-full sm:w-[300px] aspect-[1/1.13] sm:h-[340px] bg-[#F8FAFC] border-[1.5px] border-dashed border-[#CBD5E1] rounded-2xl p-6 flex flex-col items-center justify-center text-center overflow-hidden shrink-0">
                  {isCapturing ? (
                    <>
                      {!isCameraReady && (
                        <div className="absolute inset-0 z-20 bg-[#F8FAFC] flex flex-col items-center justify-center p-6">
                          <div className="w-10 h-10 border-4 border-primary border-t-transparent rounded-full animate-spin mb-4"></div>
                          <p className="text-[14px] font-medium text-slate-600">Initializing Camera...</p>
                          <p className="text-[12px] text-slate-400 mt-2">Please allow camera access if prompted</p>
                        </div>
                      )}
                      {/* @ts-ignore */}
                      <Webcam
                        audio={false}
                        ref={webcamRef}
                        screenshotFormat="image/jpeg"
                        onUserMedia={() => setIsCameraReady(true)}
                        onUserMediaError={(err) => {
                          console.error("Webcam Error:", err);
                          showToast("Failed to access camera", "error");
                          setIsCapturing(false);
                        }}
                        mirrored={true}
                        videoConstraints={{ 
                          width: { ideal: 1280 },
                          height: { ideal: 720 },
                          facingMode: "user" 
                        }}
                        className="absolute inset-0 w-full h-full object-cover z-0"
                      />

                      {/* Scanner corners and line */}
                      <div className="absolute top-4 left-4 w-6 h-6 border-t-4 border-l-4 border-primary rounded-tl-lg z-10"></div>
                      <div className="absolute top-4 right-4 w-6 h-6 border-t-4 border-r-4 border-primary rounded-tr-lg z-10"></div>
                      <div className="absolute bottom-4 left-4 w-6 h-6 border-b-4 border-l-4 border-primary rounded-bl-lg z-10"></div>
                      <div className="absolute bottom-4 right-4 w-6 h-6 border-b-4 border-r-4 border-primary rounded-br-lg z-10"></div>
                      
                      <style>{`
                        @keyframes scan {
                          0% { top: 0%; opacity: 0; }
                          10% { opacity: 1; }
                          90% { opacity: 1; }
                          100% { top: 100%; opacity: 0; }
                        }
                      `}</style>
                      <div className="absolute left-0 right-0 h-1 bg-primary/40 shadow-[0_0_20px_rgba(11,122,75,0.5)] z-20" style={{ animation: 'scan 2.5s ease-in-out infinite' }}></div>

                      {isProcessingCapture && (
                        <div className="absolute inset-0 bg-black/40 flex items-center justify-center z-20 backdrop-blur-[2px]">
                          <div className="flex flex-col items-center gap-3">
                            <div className="w-12 h-12 border-4 border-white/30 border-t-white rounded-full animate-spin"></div>
                            <span className="text-white font-medium text-sm tracking-widest uppercase">Processing Image</span>
                          </div>
                        </div>
                      )}

                      {isCameraReady && (
                        <div className="absolute bottom-4 left-0 right-0 z-10 flex justify-center">
                          <button 
                            onClick={(e) => { e.preventDefault(); handleCapture(); }}
                            className="btn-primary btn-sm px-6 shadow-lg"
                          >
                            <Camera size={16} /> Capture ({capturedImages.length}/5)
                          </button>
                        </div>
                      )}
                    </>
                  ) : (
                    <>
                      <div className="text-[#94A3B8] mb-4 sm:mb-6">
                        <ScanFace size={64} strokeWidth={1} className="sm:w-[72px] sm:h-[72px]" />
                      </div>
                      <h5 className="text-[16px] font-medium text-[#1a1a1a] mb-2">
                        {capturedImages.length >= 5 ? "Capture complete" : "Ready to capture"}
                      </h5>
                      <p className="text-[14px] sm:text-[16px] text-[#64748B] mb-6 sm:mb-8">
                        {capturedImages.length >= 5 ? "5 samples captured" : <>Position the employee in front<br className="hidden sm:block" /> of the camera</>}
                      </p>
                      {capturedImages.length < 5 && (
                        <button 
                          onClick={(e) => { e.preventDefault(); setIsCapturing(true); }}
                          className="btn-primary btn-sm w-full sm:w-[200px] px-8"
                        >
                          <Camera size={16} /> Start Capture
                        </button>
                      )}
                    </>
                  )}
                </div>

                {/* Right Panel - Info */}
                <div className="flex-1 flex flex-col pt-0 sm:pt-2">
                  <h5 className="text-[16px] font-medium text-[#1a1a1a] mb-4">
                    Capture Requirements
                  </h5>
                  <div className="grid grid-cols-1 gap-3 mb-6 sm:mb-8">
                    <div className="flex items-start gap-3 text-[14px] sm:text-[15px] text-[#1a1a1a] bg-white p-3 rounded-xl border border-slate-100 shadow-sm">
                      <div className="w-5 h-5 rounded-full bg-[#E8F3EE] flex items-center justify-center shrink-0 mt-0.5">
                        <CheckCircle2 size={13} className="text-[#0B7A4B]" />
                      </div>
                      <span>Ensure <strong>good lighting</strong> (avoid backlighting)</span>
                    </div>
                    <div className="flex items-start gap-3 text-[14px] sm:text-[15px] text-[#1a1a1a] bg-white p-3 rounded-xl border border-slate-100 shadow-sm">
                      <div className="w-5 h-5 rounded-full bg-[#E8F3EE] flex items-center justify-center shrink-0 mt-0.5">
                        <CheckCircle2 size={13} className="text-[#0B7A4B]" />
                      </div>
                      <span>Face should be <strong>clearly visible</strong> and centered</span>
                    </div>
                    <div className="flex items-start gap-3 text-[14px] sm:text-[15px] text-[#1a1a1a] bg-white p-3 rounded-xl border border-slate-100 shadow-sm">
                      <div className="w-5 h-5 rounded-full bg-[#E8F3EE] flex items-center justify-center shrink-0 mt-0.5">
                        <CheckCircle2 size={13} className="text-[#0B7A4B]" />
                      </div>
                      <span>Remove accessories like <strong>glasses or masks</strong></span>
                    </div>
                    <div className="flex items-start gap-3 text-[14px] sm:text-[15px] text-[#1a1a1a] bg-white p-3 rounded-xl border border-slate-100 shadow-sm">
                      <div className="w-5 h-5 rounded-full bg-[#E8F3EE] flex items-center justify-center shrink-0 mt-0.5">
                        <CheckCircle2 size={13} className="text-[#0B7A4B]" />
                      </div>
                      <span>Look <strong>directly</strong> at the camera</span>
                    </div>
                  </div>

                  <div className="bg-[#F8FAFC] p-4 rounded-xl border border-slate-200">
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-2">
                        <h5 className="text-[14px] font-semibold text-[#64748B] uppercase tracking-wider">
                          Capture Progress
                        </h5>
                        <Info size={14} className="text-text-muted" />
                      </div>
                      <p className="text-[14px] font-medium text-[#1a1a1a]">
                        {capturedImages.length} / 5 
                      </p>
                    </div>
                    
                    <div className="flex flex-wrap gap-2.5">
                      {[0, 1, 2, 3, 4].map((i) => (
                        <div
                          key={i}
                          className="w-10 h-10 rounded-lg border-2 border-[#E2E8F0] bg-white overflow-hidden flex items-center justify-center relative shadow-sm"
                        >
                          {capturedImages[i] ? (
                            <img src={capturedImages[i]} alt={`Sample ${i + 1}`} className="w-full h-full object-cover shadow-inner" />
                          ) : (
                            <span className="text-[12px] font-bold text-slate-300">{i + 1}</span>
                          )}
                        </div>
                      ))}
                      {capturedImages.length > 0 && (
                        <button
                          title="Clear Photos"
                          onClick={(e) => { e.preventDefault(); setCapturedImages([]); setIsCapturing(false); }}
                          className="btn-ghost btn-sm text-red-500 hover:bg-red-50 px-2 h-10 flex items-center transition-colors"
                        >
                          Clear
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              {/* Bottom Alert */}
              <div className="bg-[#EFF6FF] border border-[#BFDBFE] rounded-xl p-3 flex items-start gap-3">
                <Info size={18} className="text-[#2563EB] shrink-0 mt-0.5" />
                <p className="text-[12px] text-[#1D4ED8]">
                  A minimum of 5 clear face samples are required from different
                  angles for accurate recognition.
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    </Modal>
  );
}
