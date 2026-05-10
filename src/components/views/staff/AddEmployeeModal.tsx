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
import { cn } from "../../../lib/utils";
import Webcam from "react-webcam";
import { facialRecognitionService } from "../../../services/FacialRecognitionService";
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
  const [capturedImages, setCapturedImages] = useState<string[]>([]);
  const [capturedDescriptors, setCapturedDescriptors] = useState<number[][]>([]);
  const webcamRef = React.useRef<Webcam>(null);

  const handleCapture = React.useCallback(async () => {
    if (webcamRef.current) {
      const imageSrc = webcamRef.current.getScreenshot();
      if (imageSrc && capturedImages.length < 5) {
        showToast("Analyzing face model...", "info");
        const descriptor = await facialRecognitionService.extractFaceDescriptor(imageSrc);
        if (descriptor) {
           setCapturedDescriptors(prev => [...prev, descriptor]);
           setCapturedImages((prev) => [...prev, imageSrc]);
           showToast("Face matched and registered!", "success");
        } else {
           showToast("No face detected! Move closer or into better light.", "error");
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
    pin: "",
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
        pin: "",
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

  const handleChange = (
    e: React.ChangeEvent<
      HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement
    >,
  ) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async () => {
    const employeeId = employeeToEdit ? employeeToEdit.id : Date.now().toString();
    let facialRecognitionProfileId = employeeToEdit?.facialRecognitionProfileId;
    
    if (capturedDescriptors.length > 0) {
      facialRecognitionProfileId = await facialRecognitionService.registerFace(employeeId, capturedDescriptors);
    }

    const payload: any = {
      id: employeeId,
      avatar:
        formData.avatar ||
        (employeeToEdit
          ? employeeToEdit.avatar
          : "https://i.pravatar.cc/150?u=" + Date.now()),
      name:
        `${formData.firstName} ${formData.lastName}`.trim() || "New Employee",
      email: formData.email,
      department: formData.department || "Engineering",
      position: formData.position || "Staff",
      status: employeeToEdit ? employeeToEdit.status : "Active",
      lastLogin: employeeToEdit ? employeeToEdit.lastLogin : "-",
      phone: formData.phone,
      dob: formData.dob,
      gender: formData.gender,
      civilStatus: formData.civilStatus,
      address: formData.address,
      rfid: formData.rfid,
      employmentType: formData.employmentType,
      workLocation: formData.workLocation,
      supervisor: formData.supervisor,
      shiftTemplateId: formData.shiftTemplateId,
      dateHired: formData.dateHired,
      dailyRate: formData.dailyRate,
      payPeriodType: formData.payPeriodType,
      taxId: formData.taxId,
      sssNumber: formData.sssNumber,
      pagibigNumber: formData.pagibigNumber,
      philhealthNumber: formData.philhealthNumber,
      allowanceType: formData.allowanceType,
      notes: formData.notes,
      facialRecognitionProfileId,
    };

    if (formData.pin) {
      payload.pin = formData.pin;
    }

    onAdd(payload);
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
    setActiveTab("personal");
  };

  if (!isOpen) return null;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={employeeToEdit ? "Edit Employee" : "Add Employee"}
      maxWidth="max-w-[700px]"
      footer={
        <>
          <button
            onClick={onClose}
            className="btn-secondary btn-sm"
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
            className="btn-primary btn-sm"
          >
            {activeTab === "account" ? "Save Employee" : "Next"}
          </button>
        </>
      }
    >
      <div className="flex flex-col">
        {/* Tabs */}
        <div className="flex items-center border-b border-border/60 px-6 sticky top-0 bg-white z-10">
          <button
            onClick={() => setActiveTab("personal")}
            className={cn(
              "flex-1 text-[16px] font-medium py-4 px-2 border-b-2 transition-colors text-center",
              activeTab === "personal"
                ? "border-[#0B7A4B] text-[#0B7A4B]"
                : "border-transparent text-[#64748B] hover:text-[#1a1a1a]",
            )}
          >
            Personal Information
          </button>
          <button
            onClick={() => setActiveTab("employment")}
            className={cn(
              "flex-1 text-[16px] font-medium py-4 px-4 border-b-2 transition-colors text-center",
              activeTab === "employment"
                ? "border-[#0B7A4B] text-[#0B7A4B]"
                : "border-transparent text-[#64748B] hover:text-[#1a1a1a]",
            )}
          >
            Employment Details
          </button>
          <button
            onClick={() => setActiveTab("financial")}
            className={cn(
              "flex-1 text-[16px] font-medium py-4 px-4 border-b-2 transition-colors text-center",
              activeTab === "financial"
                ? "border-[#0B7A4B] text-[#0B7A4B]"
                : "border-transparent text-[#64748B] hover:text-[#1a1a1a]",
            )}
          >
            Financial Details
          </button>
          <button
            onClick={() => setActiveTab("account")}
            className={cn(
              "flex-1 text-[16px] font-medium py-4 px-4 border-b-2 transition-colors text-center",
              activeTab === "account"
                ? "border-[#0B7A4B] text-[#0B7A4B]"
                : "border-transparent text-[#64748B] hover:text-[#1a1a1a]",
            )}
          >
            Facial Recognition Data
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto max-h-[65vh]">
          {activeTab === "personal" && (
            <div className="flex flex-col gap-6">
              {/* Profile Photo and Basic Info */}
              <div className="flex gap-6">
                {/* Profile Photo */}
                <div className="flex flex-col gap-2 shrink-0">
                  <label className="text-label">
                    Profile Photo
                  </label>
                  <label className="w-[140px] h-[140px] border-2 border-dashed border-[#CBD5E1] rounded-2xl bg-white flex flex-col items-center justify-center cursor-pointer hover:bg-slate-50 transition-colors overflow-hidden relative">
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
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) {
                          const reader = new FileReader();
                          reader.onloadend = () => {
                            setFormData((prev) => ({
                              ...prev,
                              avatar: reader.result as string,
                            }));
                          };
                          reader.readAsDataURL(file);
                        }
                      }}
                    />
                  </label>
                </div>

                {/* Name, Email, Phone */}
                <div className="flex-1 grid grid-cols-2 gap-4">
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
              <div className="grid grid-cols-3 gap-4">
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
              <div className="grid grid-cols-2 gap-4">
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
              <div className="grid grid-cols-2 gap-4">
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

              <div className="grid grid-cols-2 gap-4">
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

              <div className="grid grid-cols-2 gap-4">
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

              <div className="grid grid-cols-2 gap-4">
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
                      Default Shift ({settingsService.getSettings().shiftStartTime} - {settingsService.getSettings().shiftEndTime})
                    </option>
                    {settingsService.getSettings().shiftTemplates?.map(t => (
                      <option key={t.id} value={t.id}>{t.name} ({t.startTime} - {t.endTime})</option>
                    ))}
                  </Select>
                </div>
                <div className="flex flex-col gap-2">
                  <label className="text-label">
                    Date Hired <span className="text-[#DC2626]">*</span>
                  </label>
                  <div className="relative">
                    <input
                      type="text"
                      name="dateHired"
                      value={formData.dateHired}
                      onChange={handleChange}
                      className="control-field pl-4 pr-10"
                      placeholder="Select date"
                    />
                    <Calendar
                      size={18}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-[#64748B] pointer-events-none"
                    />
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
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
              <div className="grid grid-cols-2 gap-4">
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

              <div className="grid grid-cols-2 gap-4">
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

              <div className="grid grid-cols-2 gap-4">
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
              <div className="flex gap-8">
                {/* Left Panel - Capture Box */}
                <div className="relative w-[300px] h-[340px] bg-[#F8FAFC] border-[1.5px] border-dashed border-[#CBD5E1] rounded-2xl p-6 flex flex-col items-center justify-center text-center overflow-hidden">
                  {isCapturing ? (
                    <>
                      {/* @ts-ignore */}
                      <Webcam
                        audio={false}
                        ref={webcamRef}
                        screenshotFormat="image/jpeg"
                        videoConstraints={{ width: 300, height: 340, facingMode: "user" }}
                        className="absolute inset-0 w-full h-full object-cover z-0"
                      />
                      <div className="absolute bottom-4 left-0 right-0 z-10 flex justify-center">
                        <button 
                          onClick={(e) => { e.preventDefault(); handleCapture(); }}
                          className="btn-primary btn-sm px-8"
                        >
                          <Camera size={16} /> Capture ({capturedImages.length}/5)
                        </button>
                      </div>
                    </>
                  ) : (
                    <>
                      <div className="text-[#94A3B8] mb-6">
                        <ScanFace size={72} strokeWidth={1} />
                      </div>
                      <h5 className="text-[16px] font-medium text-[#1a1a1a] mb-2">
                        {capturedImages.length >= 5 ? "Capture complete" : "Ready to capture"}
                      </h5>
                      <p className="text-[16px] text-[#64748B] mb-8">
                        {capturedImages.length >= 5 ? "5 samples captured" : <>Position the employee in front<br />of the camera</>}
                      </p>
                      {capturedImages.length < 5 && (
                        <button 
                          onClick={(e) => { e.preventDefault(); setIsCapturing(true); }}
                          className="btn-primary btn-sm w-[200px] px-8"
                        >
                          <Camera size={16} /> Start Capture
                        </button>
                      )}
                    </>
                  )}
                </div>

                {/* Right Panel - Info */}
                <div className="flex-1 flex flex-col pt-2">
                  <h5 className="text-[16px] font-medium text-[#1a1a1a] mb-4">
                    Capture Requirements
                  </h5>
                  <ul className="flex flex-col gap-3.5 mb-8 text-[16px] text-[#1a1a1a]">
                    <li className="flex items-start gap-3">
                      <CheckCircle2
                        size={16}
                        className="text-[#0B7A4B] shrink-0 mt-0.5"
                      />{" "}
                      Ensure good lighting
                    </li>
                    <li className="flex items-start gap-3">
                      <CheckCircle2
                        size={16}
                        className="text-[#0B7A4B] shrink-0 mt-0.5"
                      />{" "}
                      Face should be clearly visible
                    </li>
                    <li className="flex items-start gap-3">
                      <CheckCircle2
                        size={16}
                        className="text-[#0B7A4B] shrink-0 mt-0.5"
                      />{" "}
                      <span>
                        Remove glasses, mask or anything
                        <br />
                        that covers the face
                      </span>
                    </li>
                    <li className="flex items-start gap-3">
                      <CheckCircle2
                        size={16}
                        className="text-[#0B7A4B] shrink-0 mt-0.5"
                      />{" "}
                      Look directly at the camera
                    </li>
                    <li className="flex items-start gap-3">
                      <CheckCircle2
                        size={16}
                        className="text-[#0B7A4B] shrink-0 mt-0.5"
                      />{" "}
                      Keep a neutral expression
                    </li>
                  </ul>

                  <div>
                    <div className="flex items-center gap-2 mb-2">
                      <h5 className="text-[16px] font-medium text-[#1a1a1a]">
                        Samples to Capture
                      </h5>
                      <Info size={14} className="text-text-muted" />
                    </div>
                    <p className="text-[12px] text-[#64748B] mb-4">
                      {capturedImages.length} / 5 captured
                    </p>
                    <div className="flex gap-3 relative">
                      {[0, 1, 2, 3, 4].map((i) => (
                        <div
                          key={i}
                          className="w-8 h-8 rounded-full border-[1.5px] border-[#E2E8F0] bg-white overflow-hidden flex items-center justify-center"
                        >
                          {capturedImages[i] && (
                            <img src={capturedImages[i]} alt={`Sample ${i + 1}`} className="w-full h-full object-cover" />
                          )}
                        </div>
                      ))}
                      {capturedImages.length > 0 && (
                        <button
                          title="Clear Photos"
                          onClick={(e) => { e.preventDefault(); setCapturedImages([]); setIsCapturing(false); }}
                          className="text-[12px] text-danger hover:underline ml-2"
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
