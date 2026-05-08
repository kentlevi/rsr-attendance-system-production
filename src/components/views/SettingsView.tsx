import React, { useState } from "react";
import { cn } from "../../lib/utils";
import { Toggle } from "./settings/Toggle";
import { TimePicker } from "../common/TimePicker";
import { Select } from "../common/Select";
import { settingsService, SystemSettings } from "../../services/SettingsService";
import { useToast } from "../../context/ToastContext";
import {
  Save,
  Info,
  X as XIcon,
  ChevronDown,
  Clock,
  Eye,
  EyeOff,
  Send,
  Upload,
  Download,
  Trash2,
  ShieldCheck,
} from "lucide-react";

export function SettingsView() {
  const { showToast } = useToast();
  const [settings, setSettings] = useState<SystemSettings>(settingsService.getSettings());
  const [isSaving, setIsSaving] = useState(false);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [newSite, setNewSite] = useState("");
  const [testSmsStatus, setTestSmsStatus] = useState<
    "idle" | "sending" | "success" | "error"
  >("idle");
  const [testSmsError, setTestSmsError] = useState("");
  const [showApiKey, setShowApiKey] = useState(false);

  React.useEffect(() => {
    const unsubscribe = settingsService.subscribe(setSettings);
    return () => unsubscribe();
  }, []);

  const handleUpdate = (field: keyof SystemSettings, value: any) => {
    setSettings(prev => {
      const updated = { ...prev, [field]: value };
      setHasUnsavedChanges(true);
      return updated;
    });
  };

  const handleSave = async () => {
    if (isSaving) return;
    setIsSaving(true);
    showToast("Saving to database", { loading: true });
    
    await settingsService.updateSettings(settings);
    setHasUnsavedChanges(false);
    
    setTimeout(() => {
      setIsSaving(false);
      showToast("All changes saved successfully");
    }, 800);
  };

  // Auto-save debounced
  React.useEffect(() => {
    if (!hasUnsavedChanges) return;
    const t = setTimeout(() => {
      handleSave();
    }, 1500);
    return () => clearTimeout(t);
  }, [settings, hasUnsavedChanges]);

  const handleTestSms = async () => {
    setTestSmsStatus("sending");
    setTestSmsError("");
    try {
      if (!settings.semaphoreApiKey) {
        // Simulated success when no API key is set for demo purposes
        await new Promise(resolve => setTimeout(resolve, 1500));
        setTestSmsStatus("success");
        showToast("Test SMS sent successfully (Simulated)");
        setTimeout(() => setTestSmsStatus("idle"), 3000);
        return;
      }

      const response = await fetch("/api/send-sms", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          phone: settings.adminMobile,
          message: `This is a test message from the system.`,
          apikey: settings.semaphoreApiKey,
          sendername: settings.senderName
        }),
      });
      const data = await response.json();
      if (data.success || data.data) {
        setTestSmsStatus("success");
        showToast("Test SMS sent successfully");
        setTimeout(() => setTestSmsStatus("idle"), 3000);
      } else {
        setTestSmsStatus("error");
        setTestSmsError(data.error || "Failed to send SMS");
        showToast("Failed to send test SMS", 5000);
        setTimeout(() => setTestSmsStatus("idle"), 5000);
      }
    } catch (err: any) {
      setTestSmsStatus("error");
      setTestSmsError(err.message || "Network error");
      showToast("SMS Network Error", 5000);
      setTimeout(() => setTestSmsStatus("idle"), 5000);
    }
  };

  return (
    <div className="w-full flex flex-col gap-6 animate-in fade-in duration-500">
      {/* Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* 1. Site & Allowance */}
        <div className="bg-white rounded-2xl border border-border shadow-sm flex flex-col p-6">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-6 h-6 rounded-full bg-[#0B7A4B] text-white flex items-center justify-center text-[16px] font-medium">
              1
            </div>
            <h2 className="text-[16px] font-medium text-[#1a1a1a]">
              Site & Allowance
            </h2>
          </div>

          <div className="flex flex-col gap-6">
            <div className="flex flex-col gap-2">
              <label className="text-label">
                Active Site
              </label>
              <div className="relative">
                <Select
                  value={settings.activeSite}
                  onChange={e => handleUpdate("activeSite", e.target.value)}
                  options={settings.sites}
                />
              </div>
            </div>

            <div className="flex flex-col gap-2">
              <label className="text-label">
                Site List
              </label>
              <div className="flex flex-col gap-2 w-full min-h-[44px] p-2 rounded-xl border border-border bg-white">
                <div className="flex flex-wrap gap-2">
                  {settings.sites.map(site => (
                    <div key={site} className="flex items-center gap-1.5 px-2.5 py-1 bg-[#F1F5F9] rounded-lg border border-[#E2E8F0] text-[16px] text-[#1a1a1a]">
                      {site}
                      <XIcon
                        size={14}
                        className="text-[#64748B] hover:text-[#DC2626] cursor-pointer"
                        onClick={() => handleUpdate("sites", settings.sites.filter(s => s !== site))}
                      />
                    </div>
                  ))}
                </div>
                <div className="flex items-center gap-2 mt-1">
                  <input 
                    type="text" 
                    placeholder="Add new site" 
                    className="control-field h-9 rounded-lg text-[14px]"
                    value={newSite}
                    onChange={e => setNewSite(e.target.value)}
                    onKeyDown={e => {
                      if (e.key === 'Enter' && newSite.trim()) {
                        if (!settings.sites.includes(newSite.trim())) {
                          handleUpdate("sites", [...settings.sites, newSite.trim()]);
                        }
                        setNewSite("");
                      }
                    }}
                  />
                  <button 
                    onClick={() => {
                      if (newSite.trim() && !settings.sites.includes(newSite.trim())) {
                        handleUpdate("sites", [...settings.sites, newSite.trim()]);
                        setNewSite("");
                      }
                    }}
                    className="btn-secondary btn-xs bg-[#F1F5F9] hover:bg-[#E2E8F0]"
                  >
                    Add
                  </button>
                </div>
              </div>
            </div>

            <div className="flex flex-col gap-2">
               <label className="text-label">
                 Site Coordinates & Geofences
               </label>
               <div className="flex flex-col gap-3">
                 {settings.sites.map(site => {
                    const coords = settings.siteCoordinates?.[site] || { lat: 0, lng: 0, radius: 100 };
                    return (
                       <div key={site} className="flex gap-2 items-end">
                          <div className="flex-1">
                             <label className="text-[12px] text-text-secondary">Site</label>
                             <input type="text" value={site} disabled className="control-field bg-slate-50 h-9 text-[14px]" />
                          </div>
                          <div className="w-24">
                             <label className="text-[12px] text-text-secondary">Lat</label>
                             <input type="number" step="any"
                                value={coords.lat} 
                                onChange={e => {
                                   const newCoords = { ...settings.siteCoordinates, [site]: { ...coords, lat: parseFloat(e.target.value) || 0 } };
                                   handleUpdate("siteCoordinates", newCoords);
                                }} className="control-field h-9 text-[14px]" />
                          </div>
                          <div className="w-24">
                             <label className="text-[12px] text-text-secondary">Lng</label>
                             <input type="number" step="any"
                                value={coords.lng} 
                                onChange={e => {
                                   const newCoords = { ...settings.siteCoordinates, [site]: { ...coords, lng: parseFloat(e.target.value) || 0 } };
                                   handleUpdate("siteCoordinates", newCoords);
                                }} className="control-field h-9 text-[14px]" />
                          </div>
                          <div className="w-24">
                             <label className="text-[12px] text-text-secondary">Radius (m)</label>
                             <input type="number" 
                                value={coords.radius} 
                                onChange={e => {
                                   const newCoords = { ...settings.siteCoordinates, [site]: { ...coords, radius: parseFloat(e.target.value) || 0 } };
                                   handleUpdate("siteCoordinates", newCoords);
                                }} className="control-field h-9 text-[14px]" />
                          </div>
                       </div>
                    );
                 })}
               </div>
            </div>

            <div className="grid grid-cols-3 gap-4">
              <div className="flex flex-col gap-2">
                <label className="text-label">
                  Daily Allowance (₱)
                </label>
                <input
                  type="text"
                  value={settings.dailyAllowance}
                  onChange={e => handleUpdate("dailyAllowance", parseFloat(e.target.value) || 0)}
                  className="control-field"
                />
              </div>
              <div className="flex flex-col gap-2">
                <label className="text-label">
                  OT Allowance (₱/hour)
                </label>
                <input
                  type="text"
                  value={settings.otAllowance}
                  onChange={e => handleUpdate("otAllowance", parseFloat(e.target.value) || 0)}
                  className="control-field"
                />
              </div>
              <div className="flex flex-col gap-2">
                <label className="text-label">
                  Away-site Allowance (₱)
                </label>
                <input
                  type="text"
                  value={settings.awaySiteAllowance}
                  onChange={e => handleUpdate("awaySiteAllowance", parseFloat(e.target.value) || 0)}
                  className="control-field"
                />
              </div>
            </div>

            <div className="flex flex-col gap-2">
              <label className="text-label">
                Away-site Allowance Rule
              </label>
              <div className="relative">
                <Select
                  value={settings.awaySiteAllowanceRule}
                  onChange={e => handleUpdate("awaySiteAllowanceRule", e.target.value)}
                  options={[
                    "Apply when employee is assigned outside active site",
                    "Always apply for field workers"
                  ]}
                />
              </div>
            </div>

            <div className="flex items-center gap-2 text-[14px] text-[#64748B]">
              <Info size={16} />
              Allowance values will be used in payroll and reports.
            </div>
          </div>
        </div>

        {/* 2. Shift & Time Rules */}
        <div className="bg-white rounded-2xl border border-border shadow-sm flex flex-col p-6">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-6 h-6 rounded-full bg-[#0B7A4B] text-white flex items-center justify-center text-[16px] font-medium">
              2
            </div>
            <h2 className="text-[16px] font-medium text-[#1a1a1a]">
              Shift & Time Rules
            </h2>
          </div>

          <div className="flex flex-col gap-6">
            <div className="grid grid-cols-3 gap-4">
              <div className="flex flex-col gap-2">
                <label className="text-label">
                  Shift Start Time
                </label>
                <div className="relative">
                  <TimePicker
                    value={settings.shiftStartTime}
                    onChange={value => handleUpdate("shiftStartTime", value)}
                  />
                </div>
              </div>
              <div className="flex flex-col gap-2">
                <label className="text-label">
                  Shift End Time
                </label>
                <div className="relative">
                  <TimePicker
                    value={settings.shiftEndTime}
                    onChange={value => handleUpdate("shiftEndTime", value)}
                  />
                </div>
              </div>
              <div className="flex flex-col gap-2">
                <label className="text-label">
                  Grace Period
                </label>
                <div className="relative">
                  <input
                    type="text"
                    value={settings.gracePeriodMins}
                    onChange={e => handleUpdate("gracePeriodMins", parseInt(e.target.value) || 0)}
                    className="control-field pl-10 pr-12 text-right"
                  />
                  <Clock
                    className="absolute left-3 top-1/2 -translate-y-1/2 text-[#64748B]"
                    size={16}
                  />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[#64748B] text-[14px]">
                    mins
                  </span>
                </div>
              </div>
            </div>

            <div className="flex flex-col gap-2 pt-4 border-t border-border mt-2">
              <label className="text-label">Custom Shift Templates</label>
              <div className="flex flex-col gap-3">
                {settings.shiftTemplates?.map(t => (
                  <div key={t.id} className="flex items-center gap-4 bg-slate-50 p-3 rounded-xl border border-border/80">
                     <input type="text" value={t.name} onChange={e => {
                        const newT = settings.shiftTemplates?.map(x => x.id === t.id ? { ...x, name: e.target.value } : x);
                        handleUpdate("shiftTemplates", newT);
                     }} className="control-field flex-1 max-w-[150px] bg-white h-9" />
                     <div className="flex items-center gap-2">
                        <TimePicker value={t.startTime} onChange={v => {
                           const newT = settings.shiftTemplates?.map(x => x.id === t.id ? { ...x, startTime: v } : x);
                           handleUpdate("shiftTemplates", newT);
                        }} />
                        <span className="text-text-secondary">-</span>
                        <TimePicker value={t.endTime} onChange={v => {
                           const newT = settings.shiftTemplates?.map(x => x.id === t.id ? { ...x, endTime: v } : x);
                           handleUpdate("shiftTemplates", newT);
                        }} />
                     </div>
                     <label className="flex items-center gap-2 text-[14px] text-text-secondary whitespace-nowrap ml-2">
                        <input type="checkbox" checked={t.isNightShift} onChange={e => {
                           const newT = settings.shiftTemplates?.map(x => x.id === t.id ? { ...x, isNightShift: e.target.checked } : x);
                           handleUpdate("shiftTemplates", newT);
                        }} className="rounded text-[#0B7A4B] focus:ring-[#0B7A4B] border-slate-300" />
                        Night Shift
                     </label>
                     {t.isNightShift && (
                        <div className="flex items-center gap-2">
                           <span className="text-[12px] text-text-secondary whitespace-nowrap">ND%</span>
                           <input type="number" step="0.05" value={t.nightDifferentialRate || 0} onChange={e => {
                              const newT = settings.shiftTemplates?.map(x => x.id === t.id ? { ...x, nightDifferentialRate: parseFloat(e.target.value) || 0 } : x);
                              handleUpdate("shiftTemplates", newT);
                           }} className="control-field w-16 h-9 bg-white text-center" />
                        </div>
                     )}
                     <div className="flex-1" />
                     <button onClick={() => {
                        handleUpdate("shiftTemplates", settings.shiftTemplates?.filter(x => x.id !== t.id));
                     }} className="text-red-500 hover:text-red-600 p-2">
                        <XIcon size={16} />
                     </button>
                  </div>
                ))}
              </div>
              <button onClick={() => {
                 const newId = 'shift_' + Date.now();
                 handleUpdate("shiftTemplates", [...(settings.shiftTemplates || []), { id: newId, name: 'New Shift', startTime: '18:00', endTime: '02:00', gracePeriodMins: 10, isNightShift: false }]);
              }} className="btn-secondary btn-sm self-start mt-1">
                 + Add Custom Shift
              </button>
            </div>

            <div className="grid grid-cols-1 gap-6 pt-4 border-t border-border mt-2">
              <div className="flex flex-col gap-2">
                <label className="text-label">
                  Lunch Break
                </label>
                <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-2">
                  <TimePicker
                    value={settings.lunchBreakStart}
                    onChange={value => handleUpdate("lunchBreakStart", value)}
                  />
                  <span className="text-[#64748B] font-medium">-</span>
                  <TimePicker
                    value={settings.lunchBreakEnd}
                    onChange={value => handleUpdate("lunchBreakEnd", value)}
                  />
                </div>
              </div>
              <div className="flex flex-col gap-2">
                <label className="text-label">
                  PM Break
                </label>
                <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-2">
                  <TimePicker
                    value={settings.pmBreakStart}
                    onChange={value => handleUpdate("pmBreakStart", value)}
                  />
                  <span className="text-[#64748B] font-medium">-</span>
                  <TimePicker
                    value={settings.pmBreakEnd}
                    onChange={value => handleUpdate("pmBreakEnd", value)}
                  />
                </div>
              </div>
            </div>

            <div className="flex flex-col gap-2">
              <label className="text-label">
                Auto Time-out Rule
              </label>
              <div className="relative">
                <Select
                  value={settings.autoTimeoutRule}
                  onChange={e => handleUpdate("autoTimeoutRule", e.target.value)}
                  options={[
                    "Out automatically after shift end time + grace period",
                    "Do not auto timeout"
                  ]}
                />
              </div>
            </div>

            <div className="flex items-center gap-2 text-[14px] text-[#64748B]">
              <Info size={16} />
              These rules will be applied to all employees unless specified.
            </div>
          </div>
        </div>

        {/* 3. SMS Notification */}
        <div className="bg-white rounded-2xl border border-border shadow-sm flex flex-col p-6">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <div className="w-6 h-6 rounded-full bg-[#0B7A4B] text-white flex items-center justify-center text-[16px] font-medium">
                3
              </div>
              <h2 className="text-[16px] font-medium text-[#1a1a1a]">
                SMS Notification
              </h2>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-[16px] font-medium text-[#1a1a1a]">
                SMS Alerts Enabled
              </span>
              <Toggle enabled={settings.smsEnabled} onChange={v => handleUpdate("smsEnabled", v)} />
            </div>
          </div>

          <div className="flex flex-col gap-5">
            <div className="grid grid-cols-[1fr_2fr] gap-4 items-center">
              <label className="text-label">
                Semaphore API Key
              </label>
              <div className="relative">
                <input
                  type={showApiKey ? "text" : "password"}
                  value={settings.semaphoreApiKey}
                  onChange={e => handleUpdate("semaphoreApiKey", e.target.value)}
                  className={cn("control-field pr-10", !showApiKey && "tracking-[0.25em]")}
                />
                <button
                  type="button"
                  onClick={() => setShowApiKey(!showApiKey)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-[#64748B] hover:text-[#1a1a1a] transition-colors"
                >
                  {showApiKey ? <Eye size={18} /> : <EyeOff size={18} />}
                </button>
              </div>
            </div>

            <div className="grid grid-cols-[1fr_2fr] gap-4 items-center">
              <label className="text-label">
                Sender Name
              </label>
              <input
                type="text"
                value={settings.senderName}
                onChange={e => handleUpdate("senderName", e.target.value)}
                className="control-field"
              />
            </div>

            <div className="grid grid-cols-[1fr_2fr] gap-4 items-center">
              <label className="text-label">
                Admin / Manager Mobile Number
              </label>
              <input
                type="text"
                value={settings.adminMobile}
                onChange={e => handleUpdate("adminMobile", e.target.value)}
                className="control-field"
              />
            </div>

            <div className="grid grid-cols-[1fr_2fr] gap-4 items-center">
              <label className="text-label">
                Notification Group (Optional)
              </label>
              <div className="relative">
                <Select
                  value={settings.notificationGroup}
                  onChange={e => handleUpdate("notificationGroup", e.target.value)}
                  options={[
                    "Attendance Alerts",
                    "All Notifications"
                  ]}
                />
              </div>
            </div>

            <div className="flex flex-col gap-3 mt-2">
              <div className="flex items-center gap-4">
                <button
                  onClick={handleTestSms}
                  disabled={testSmsStatus === "sending"}
                  className="btn-secondary"
                >
                  {testSmsStatus === "sending" ? (
                    <span className="w-4 h-4 border-2 border-primary border-t-transparent rounded-full animate-spin"></span>
                  ) : (
                    <Send size={16} className="text-primary" />
                  )}
                  {testSmsStatus === "sending"
                    ? "Sending"
                    : testSmsStatus === "success"
                      ? "Sent!"
                      : testSmsStatus === "error"
                        ? "Failed"
                        : "Test SMS"}
                </button>
                <button
                  onClick={() => {
                    showToast("Running AWOL Check", { loading: true });
                    import("../../services/AwolService").then(m => {
                      m.awolService.processAwolAlerts().then(() => {
                        showToast("AWOL Check completed!");
                      });
                    });
                  }}
                  className="btn-primary"
                >
                  <ShieldCheck size={16} /> Run AWOL Check
                </button>
              </div>
              <div className="flex flex-col">
                <span className="text-[16px] text-[#64748B]">
                  Send a test message to verify SMS configuration.
                </span>
                {testSmsStatus === "error" && (
                  <span className="text-[14px] text-[#DC2626] font-medium mt-0.5">
                    {testSmsError}
                  </span>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* 4. Telegram Notification */}
        <div className="bg-white rounded-2xl border border-border shadow-sm flex flex-col p-6">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <div className="w-6 h-6 rounded-full bg-[#0B7A4B] text-white flex items-center justify-center text-[16px] font-medium">
                4
              </div>
              <h2 className="text-[16px] font-medium text-[#1a1a1a]">
                Telegram Notification
              </h2>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-[16px] font-medium text-[#1a1a1a]">
                Telegram Alerts Enabled
              </span>
              <Toggle enabled={settings.telegramEnabled} onChange={v => handleUpdate("telegramEnabled", v)} />
            </div>
          </div>

          <div className="flex flex-col gap-5">
            <div className="grid grid-cols-[1fr_2fr] gap-4 items-center">
              <label className="text-label">
                Bot Token
              </label>
              <div className="relative">
                <input
                  type={showApiKey ? "text" : "password"}
                  value={settings.telegramBotToken || ""}
                  onChange={e => handleUpdate("telegramBotToken", e.target.value)}
                  className={cn("control-field pr-10", !showApiKey && "tracking-[0.25em]")}
                />
                <button
                  type="button"
                  onClick={() => setShowApiKey(!showApiKey)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-[#64748B] hover:text-[#1a1a1a] transition-colors"
                >
                  {showApiKey ? <Eye size={18} /> : <EyeOff size={18} />}
                </button>
              </div>
            </div>

            <div className="grid grid-cols-[1fr_2fr] gap-4 items-center">
              <label className="text-label">
                Chat ID
              </label>
              <input
                type="text"
                value={settings.telegramChatId || ""}
                onChange={e => handleUpdate("telegramChatId", e.target.value)}
                className="control-field"
              />
            </div>

            <div className="flex flex-col gap-3 mt-2">
              <div className="flex flex-col">
                <span className="text-[16px] text-[#64748B]">
                  Notifications for approval requests (e.g. leaves) will be sent to this Telegram Chat ID via Bot API.
                </span>
              </div>
            </div>
          </div>
        </div>

      </div>

      {/* Footer Banner */}
      <div className="bg-[#F0FDF4] border border-[#BBF7D0] rounded-xl p-4 flex items-center gap-2">
        <ShieldCheck className="text-[#16A34A]" size={18} />
        <span className="text-[16px] text-[#15803D]">
          <strong className="font-medium">Note:</strong> Changes you make to these
          settings will be applied across the system.
        </span>
      </div>
    </div>
  );
}
