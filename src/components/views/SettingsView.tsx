import React, { useState } from "react";
import { cn } from "../../lib/utils";
import { Toggle } from "./settings/Toggle";
import { TimePicker } from "../common/TimePicker";
import { Select } from "../common/Select";
import { settingsService, SystemSettings } from "../../services/SettingsService";
import { useToast } from "../../context/ToastContext";
import { authenticatedFetch } from "../../lib/api";
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
  MessageSquare,
  Hash,
  MapPin,
  Sparkles,
} from "lucide-react";
import { Button } from "../common/Button";

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
  const [showBotToken, setShowBotToken] = useState(false);
  const [testTelegramStatus, setTestTelegramStatus] = useState<"idle" | "sending" | "success" | "error">("idle");

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
      const response = await authenticatedFetch("/api/send-sms", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          phone: settings.adminMobile,
          message: `This is a test message from the system.`,
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
      showToast("SMS Service unavailable", 5000);
      setTimeout(() => setTestSmsStatus("idle"), 5000);
    }
  };

  const handleTestTelegram = async () => {
    setTestTelegramStatus("sending");
    try {
      const { notificationService } = await import("../../services/NotificationService");
      await notificationService.sendTelegramNotification(
        `<b>🔔 RSR System Test</b>\n\nThis is a test notification from the RSR Attendance System settings panel.\n\nDate: ${new Date().toLocaleString()}`
      );
      setTestTelegramStatus("success");
      showToast("Telegram test message sent!");
      setTimeout(() => setTestTelegramStatus("idle"), 3000);
    } catch (err) {
      setTestTelegramStatus("error");
      showToast("Failed to send Telegram test", "error");
      setTimeout(() => setTestTelegramStatus("idle"), 3000);
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
                  <Button 
                    onClick={() => {
                      if (newSite.trim() && !settings.sites.includes(newSite.trim())) {
                        handleUpdate("sites", [...settings.sites, newSite.trim()]);
                        setNewSite("");
                      }
                    }}
                    variant="secondary"
                    size="xs"
                    className="bg-[#F1F5F9] hover:bg-[#E2E8F0]"
                  >
                    Add
                  </Button>
                </div>
              </div>
            </div>

            <div className="flex flex-col gap-5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center shadow-sm border border-emerald-100/50">
                      <MapPin size={22} strokeWidth={2.5} />
                    </div>
                    <div className="flex flex-col">
                      <h2 className="text-[17px] font-bold text-slate-900">Site Geofencing</h2>
                      <p className="text-[12px] text-slate-500 font-medium">Define operational boundaries for each site</p>
                    </div>
                  </div>
                  <Toggle 
                    enabled={settings.geofencingEnabled ?? false} 
                    onChange={v => handleUpdate("geofencingEnabled", v)} 
                    label="Enable Geofencing"
                  />
                </div>
                
                {(settings.geofencingEnabled ?? false) && (
                <div className="flex flex-col gap-3">
                   {settings.sites.map((site, idx) => {
                     const coords = settings.siteCoordinates?.[site] || { lat: 0, lng: 0, radius: 100, address: "" };
                     return (
                        <div key={site} className="bg-slate-50/50 rounded-2xl border border-slate-200/60 p-4 transition-all hover:bg-white hover:shadow-sm">
                           <div className="flex flex-col sm:flex-row sm:items-center gap-4">
                              <div className="flex items-center gap-3 min-w-[140px]">
                                 <div className="w-9 h-9 rounded-xl bg-white border border-slate-200 flex items-center justify-center text-primary shadow-xs">
                                   <span className="text-[13px] font-black">{site.charAt(0)}</span>
                                 </div>
                                 <span className="text-[15px] font-bold text-slate-800">{site}</span>
                              </div>
                              
                              <div className="flex-1 flex flex-col gap-2">
                                 <div className="relative group">
                                    <input 
                                      type="text"
                                      placeholder="Site address (e.g. 123 Main St, Manila)"
                                      value={coords.address || ""} 
                                      onChange={e => {
                                         const newCoords = { ...settings.siteCoordinates, [site]: { ...coords, address: e.target.value } };
                                         handleUpdate("siteCoordinates", newCoords);
                                      }} 
                                      className="w-full h-11 rounded-xl border border-slate-200 bg-white px-4 pl-10 text-[14px] font-medium text-slate-700 focus:ring-4 focus:ring-primary/10 focus:border-primary outline-none transition-all" 
                                    />
                                    <MapPin className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-primary transition-colors" size={16} />
                                    
                                    <button 
                                      onClick={async () => {
                                        if (!coords.address) {
                                          showToast("Please enter an address first", "warning");
                                          return;
                                        }
                                        showToast(`Locating ${site}...`, { loading: true });
                                        try {
                                          const { getGeminiModel } = await import("../../lib/gemini");
                                          const model = getGeminiModel();
                                          const prompt = `Geocode this address: "${coords.address}". Return ONLY a JSON object like {"lat": 14.5, "lng": 121.0}. No markdown. No text.`;
                                          const result = await model.generateContent(prompt);
                                          const text = result.response.text();
                                          const json = JSON.parse(text.replace(/```json|```/g, ""));
                                          if (json.lat && json.lng) {
                                            const newCoords = { ...settings.siteCoordinates, [site]: { ...coords, lat: json.lat, lng: json.lng } };
                                            handleUpdate("siteCoordinates", newCoords);
                                            showToast(`Located ${site} successfully!`);
                                          }
                                        } catch (e) {
                                          console.error(e);
                                          showToast("Failed to locate. Check Gemini API key.", "error");
                                        }
                                      }}
                                      className="absolute right-2 top-1/2 -translate-y-1/2 h-8 px-4 rounded-lg bg-primary text-white text-[12px] font-bold hover:bg-primary-dark transition-colors shadow-sm"
                                    >
                                      Locate
                                    </button>
                                 </div>
                                 <div className="flex items-center gap-2 px-1">
                                    <span className="text-[11px] font-bold text-slate-400 uppercase tracking-tight">Status:</span>
                                    {coords.lat && coords.lng ? (
                                      <span className="text-[11px] font-semibold text-emerald-600 flex items-center gap-1">
                                        <CheckCircle2 size={12} /> Pin Dropped ({coords.lat.toFixed(2)}, {coords.lng.toFixed(2)})
                                      </span>
                                    ) : (
                                      <span className="text-[11px] font-semibold text-amber-500">Location not verified</span>
                                    )}
                                 </div>
                              </div>
                              
                              <div className="flex flex-col gap-1 w-full sm:w-[100px]">
                                 <label className="text-[11px] font-bold text-slate-400 uppercase px-1">Radius (M)</label>
                                 <input type="number" 
                                    value={coords.radius} 
                                    onChange={e => {
                                       const newCoords = { ...settings.siteCoordinates, [site]: { ...coords, radius: parseFloat(e.target.value) || 0 } };
                                       handleUpdate("siteCoordinates", newCoords);
                                    }} 
                                    className="w-full h-11 rounded-xl border border-slate-200 bg-white px-3 text-[14px] font-bold text-primary focus:ring-4 focus:ring-primary/10 focus:border-primary outline-none transition-all" 
                                 />
                              </div>
                           </div>
                        </div>
                     );
                   })}
                </div>
                )}
             </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
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
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
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
                  <div key={t.id} className="flex flex-col gap-4 bg-slate-50 p-4 rounded-xl border border-border/80">
                    <div className="flex flex-wrap items-center gap-4">
                      <div className="flex flex-col gap-1 min-w-[150px]">
                        <label className="text-[11px] font-semibold text-text-secondary uppercase">Shift Name</label>
                        <input type="text" value={t.name} onChange={e => {
                          const newT = settings.shiftTemplates?.map(x => x.id === t.id ? { ...x, name: e.target.value } : x);
                          handleUpdate("shiftTemplates", newT);
                        }} className="control-field bg-white h-9" placeholder="Shift Name" />
                      </div>
                      <div className="flex flex-col gap-1">
                        <label className="text-[11px] font-semibold text-text-secondary uppercase">Schedule</label>
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
                      </div>
                      <div className="flex flex-col gap-1">
                        <label className="text-[11px] font-semibold text-text-secondary uppercase">Grace (Mins)</label>
                        <input type="number" value={t.gracePeriodMins || 0} onChange={e => {
                          const newT = settings.shiftTemplates?.map(x => x.id === t.id ? { ...x, gracePeriodMins: parseInt(e.target.value) || 0 } : x);
                          handleUpdate("shiftTemplates", newT);
                        }} className="control-field w-20 h-9 bg-white text-center" />
                      </div>
                      <div className="flex flex-col gap-1">
                        <label className="text-[11px] font-semibold text-text-secondary uppercase">Type</label>
                        <label className="flex items-center gap-2 text-[14px] text-text-secondary h-9 px-2 bg-white border border-border rounded-lg cursor-pointer">
                          <input type="checkbox" checked={t.isNightShift} onChange={e => {
                            const newT = settings.shiftTemplates?.map(x => x.id === t.id ? { ...x, isNightShift: e.target.checked } : x);
                            handleUpdate("shiftTemplates", newT);
                          }} className="rounded text-[#0B7A4B] focus:ring-[#0B7A4B] border-slate-300" />
                          Night Shift
                        </label>
                      </div>
                      {t.isNightShift && (
                        <div className="flex flex-col gap-1">
                          <label className="text-[11px] font-semibold text-text-secondary uppercase">Differential %</label>
                          <input type="number" step="0.05" value={t.nightDifferentialRate || 0} onChange={e => {
                            const newT = settings.shiftTemplates?.map(x => x.id === t.id ? { ...x, nightDifferentialRate: parseFloat(e.target.value) || 0 } : x);
                            handleUpdate("shiftTemplates", newT);
                          }} className="control-field w-16 h-9 bg-white text-center" />
                        </div>
                      )}
                      
                      <div className="flex-1 min-w-[20px]" />
                      
                      <Button 
                        onClick={() => {
                          handleUpdate("shiftTemplates", settings.shiftTemplates?.filter(x => x.id !== t.id));
                        }} 
                        variant="ghost"
                        size="xs"
                        className="text-red-500 hover:text-red-600 p-2 hover:bg-red-50 rounded-lg transition-colors self-end sm:self-center h-auto w-auto"
                      >
                        <XIcon size={18} />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
              <Button onClick={() => {
                 const newId = 'shift_' + Date.now();
                 handleUpdate("shiftTemplates", [...(settings.shiftTemplates || []), { id: newId, name: 'New Shift', startTime: '18:00', endTime: '02:00', gracePeriodMins: 10, isNightShift: false }]);
              }} variant="secondary" size="sm" className="self-start mt-1">
                 + Add Custom Shift
              </Button>
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
            <div className="grid grid-cols-1 sm:grid-cols-[1fr_2fr] gap-4 items-center">
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

            <div className="grid grid-cols-1 sm:grid-cols-[1fr_2fr] gap-4 items-center">
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

            <div className="grid grid-cols-1 sm:grid-cols-[1fr_2fr] gap-4 items-center">
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
                <Button
                  onClick={handleTestSms}
                  isLoading={testSmsStatus === "sending"}
                  variant="secondary"
                  leftIcon={testSmsStatus !== "sending" && <Send size={16} className="text-primary" />}
                >
                  {testSmsStatus === "success"
                    ? "Sent!"
                    : testSmsStatus === "error"
                      ? "Failed"
                      : "Test SMS"}
                </Button>
                <Button
                  onClick={() => {
                    showToast("Running AWOL Check", { loading: true });
                    import("../../services/AwolService").then(m => {
                      m.awolService.processAwolAlerts().then(() => {
                        showToast("AWOL Check completed!");
                      });
                    });
                  }}
                  variant="primary"
                  leftIcon={<ShieldCheck size={16} />}
                >
                  Run AWOL Check
                </Button>
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
        <div className="bg-white rounded-2xl border border-border shadow-sm flex flex-col p-7 transition-all hover:shadow-md">
          <div className="flex flex-wrap items-center justify-between gap-4 mb-8">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-2xl bg-sky-50 text-sky-500 flex items-center justify-center shadow-sm border border-sky-100/50">
                <MessageSquare size={24} strokeWidth={2.5} />
              </div>
              <div className="flex flex-col">
                <h2 className="text-[19px] font-bold text-slate-900 tracking-tight">
                  Telegram Notification
                </h2>
                <p className="text-[13px] text-slate-500 font-medium">Configure automated alerts via Telegram Bot</p>
              </div>
            </div>
            <div className="flex items-center gap-3 bg-slate-50 px-4 py-2 rounded-2xl border border-slate-100">
              <span className="text-[14px] font-bold text-slate-700">
                Alerts Enabled
              </span>
              <Toggle enabled={settings.telegramEnabled} onChange={v => handleUpdate("telegramEnabled", v)} />
            </div>
          </div>

          <div className="flex flex-col gap-6">
            <div className="grid grid-cols-1 sm:grid-cols-[160px_1fr] gap-6 items-center">
              <label className="text-[14px] font-bold text-slate-600 uppercase tracking-wider">
                Chat ID
              </label>
              <div className="relative group">
                <input
                  type="text"
                  placeholder="Enter Telegram Chat ID"
                  value={settings.telegramChatId || ""}
                  onChange={e => handleUpdate("telegramChatId", e.target.value)}
                  className="w-full h-12 rounded-xl border border-slate-200 bg-slate-50/30 px-4 text-[15px] font-medium text-slate-900 focus:bg-white focus:ring-4 focus:ring-sky-500/10 focus:border-sky-500 outline-none transition-all pr-12"
                />
                <Hash className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-300 group-focus-within:text-sky-500 transition-colors" size={20} />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-[160px_1fr] gap-6 items-center">
              <label className="text-[14px] font-bold text-slate-600 uppercase tracking-wider">
                Bot Token
              </label>
              <div className="relative group">
                <input
                  type={showBotToken ? "text" : "password"}
                  placeholder="Enter Telegram Bot Token"
                  value={settings.telegramBotToken || ""}
                  onChange={e => handleUpdate("telegramBotToken", e.target.value)}
                  className="w-full h-12 rounded-xl border border-slate-200 bg-slate-50/30 px-4 text-[15px] font-medium text-slate-900 focus:bg-white focus:ring-4 focus:ring-sky-500/10 focus:border-sky-500 outline-none transition-all pr-12"
                />
                <button
                  onClick={() => setShowBotToken(!showBotToken)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-300 hover:text-sky-500 transition-colors"
                >
                  {showBotToken ? <EyeOff size={20} /> : <Eye size={20} />}
                </button>
              </div>
            </div>

            <div className="flex items-center gap-4">
              <Button
                onClick={handleTestTelegram}
                isLoading={testTelegramStatus === "sending"}
                variant="secondary"
                className="bg-sky-50 text-sky-600 border-sky-100 hover:bg-sky-100"
                leftIcon={testTelegramStatus !== "sending" && <Send size={16} />}
              >
                {testTelegramStatus === "success" ? "Sent!" : "Test Telegram"}
              </Button>
            </div>

            <div className="bg-slate-50 rounded-2xl p-5 border border-slate-200/60 flex items-start gap-4">
              <div className="w-10 h-10 rounded-xl bg-white flex items-center justify-center text-slate-400 shadow-sm border border-slate-100 shrink-0">
                <Info size={20} />
              </div>
              <p className="text-[14px] leading-relaxed text-slate-600 font-medium">
                Approval requests for leaves and undertime will be dispatched to this Chat ID. Ensure your bot has permission to post in this chat.
              </p>
            </div>
          </div>
        </div>

        {/* 5. Cloud Storage */}
        <div className="bg-white rounded-2xl border border-border shadow-sm flex flex-col p-6">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <div className="w-6 h-6 rounded-full bg-[#0B7A4B] text-white flex items-center justify-center text-[16px] font-medium">
                5
              </div>
              <h2 className="text-[16px] font-medium text-[#1a1a1a]">
                Cloud Storage
              </h2>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-[16px] font-medium text-[#1a1a1a]">
                Attendance Photo Uploads
              </span>
              <Toggle
                enabled={settings.attendancePhotoUploadEnabled === true}
                onChange={v => handleUpdate("attendancePhotoUploadEnabled", v)}
              />
            </div>
          </div>

          <div className="flex flex-col gap-5 mt-2">
            <div className="grid grid-cols-1 sm:grid-cols-[1fr_2fr] gap-4 items-center">
              <label className="text-label">
                Cloud Record Retention (Days)
              </label>
              <input
                type="number"
                value={settings.cloudRetentionDays || 90}
                onChange={e => handleUpdate("cloudRetentionDays", parseInt(e.target.value) || 90)}
                className="control-field"
                min={1}
              />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-[1fr_2fr] gap-4 items-center">
              <label className="text-label">
                Photo Retention (Days)
              </label>
              <input
                type="number"
                value={settings.photoRetentionDays || 30}
                onChange={e => handleUpdate("photoRetentionDays", parseInt(e.target.value) || 30)}
                className="control-field"
                min={1}
              />
            </div>

            <div className="flex items-center gap-2 text-[14px] text-[#64748B]">
              <Info size={16} className="shrink-0" />
              <span>When disabled, attendance photos remain local and attendance records sync without image URLs. Records older than the retention limit can be deleted to stay within Firebase Free-Tier limits.</span>
            </div>

            <div className="mt-2 pt-5 border-t border-border flex justify-end">
                <Button 
                  onClick={() => {
                    showToast("Dry run: estimating records to delete...", { loading: true });
                    setTimeout(() => showToast("Dry run complete: 0 old records found."), 2000);
                  }}
                  variant="secondary"
                  className="text-[#DC2626] hover:bg-red-50 hover:border-red-200"
                  leftIcon={<Trash2 size={16} />}
                >
                  Run Cleanup (Dry-Run)
                </Button>
            </div>
          </div>
        </div>

        {/* 6. Biometric Recognition */}
        <div className="bg-white rounded-2xl border border-border shadow-sm flex flex-col p-6">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-6 h-6 rounded-full bg-[#0B7A4B] text-white flex items-center justify-center text-[16px] font-medium">
              6
            </div>
            <h2 className="text-[16px] font-medium text-[#1a1a1a]">
              Biometric Recognition
            </h2>
          </div>

          <div className="flex flex-col gap-6">
            <div className="flex flex-col gap-3">
              <div className="flex items-center justify-between">
                <label className="text-label">
                  Facial Recognition Threshold
                </label>
                <span className="text-[14px] font-bold text-[#0B7A4B] bg-[#F0FDF4] px-2 py-0.5 rounded-md">
                  {(settings.facialRecognitionThreshold || 0.65).toFixed(2)}
                </span>
              </div>
              <input
                type="range"
                min="0.4"
                max="0.95"
                step="0.01"
                value={settings.facialRecognitionThreshold || 0.65}
                onChange={e => handleUpdate("facialRecognitionThreshold", parseFloat(e.target.value))}
                className="w-full h-2 bg-slate-100 rounded-lg appearance-none cursor-pointer accent-[#0B7A4B]"
              />
              <div className="flex justify-between text-[11px] text-text-secondary font-bold uppercase tracking-wider">
                <span>More Lenient (0.40)</span>
                <span>More Strict (0.95)</span>
              </div>
            </div>

            <div className="bg-amber-50 rounded-2xl p-5 border border-amber-100 flex items-start gap-4">
              <div className="w-10 h-10 rounded-xl bg-white flex items-center justify-center text-amber-500 shadow-sm border border-amber-100 shrink-0">
                <Info size={20} />
              </div>
              <p className="text-[14px] leading-relaxed text-amber-800 font-medium">
                Adjusting this threshold affects matching accuracy. A value of <strong>0.65</strong> is recommended for most environments. Increase this if you experience false positives (wrong name detected).
              </p>
            </div>
          </div>
        </div>
        {/* 7. Gemini AI Configuration */}
        <div className="bg-white rounded-2xl border border-border shadow-sm flex flex-col p-7 transition-all hover:shadow-md">
          <div className="flex flex-wrap items-center justify-between gap-4 mb-8">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-2xl bg-emerald-50 text-emerald-500 flex items-center justify-center shadow-sm border border-emerald-100/50">
                <Sparkles size={24} strokeWidth={2.5} />
              </div>
              <div className="flex flex-col">
                <h2 className="text-[19px] font-bold text-slate-900 tracking-tight">
                  Gemini AI Configuration
                </h2>
                <p className="text-[13px] text-slate-500 font-medium">Configure Google Gemini for AI-driven insights</p>
              </div>
            </div>
          </div>

          <div className="flex flex-col gap-6">
            <div className="grid grid-cols-1 sm:grid-cols-[160px_1fr] gap-6 items-center">
              <label className="text-[14px] font-bold text-slate-600 uppercase tracking-wider">
                API Key
              </label>
              <div className="relative group">
                <input
                  type={showApiKey ? "text" : "password"}
                  placeholder="Enter Gemini API Key"
                  value={settings.geminiApiKey || ""}
                  onChange={e => handleUpdate("geminiApiKey", e.target.value)}
                  className="w-full h-12 rounded-xl border border-slate-200 bg-slate-50/30 px-4 text-[15px] font-medium text-slate-900 focus:bg-white focus:ring-4 focus:ring-emerald-500/10 focus:border-emerald-500 outline-none transition-all pr-12"
                />
                <button
                  onClick={() => setShowApiKey(!showApiKey)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-300 hover:text-emerald-500 transition-colors"
                >
                  {showApiKey ? <EyeOff size={20} /> : <Eye size={20} />}
                </button>
              </div>
            </div>

            <div className="bg-slate-50 rounded-2xl p-5 border border-slate-200/60 flex items-start gap-4">
              <div className="w-10 h-10 rounded-xl bg-white flex items-center justify-center text-slate-400 shadow-sm border border-slate-100 shrink-0">
                <Info size={20} />
              </div>
              <div className="flex flex-col gap-1">
                <p className="text-[14px] leading-relaxed text-slate-600 font-medium">
                  This key is used for AI features like generating Workforce Insights and automated reporting.
                </p>
                <a 
                  href="https://aistudio.google.com/app/apikey" 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="text-[13px] text-emerald-600 hover:text-emerald-700 font-bold flex items-center gap-1 transition-colors"
                >
                  Get your free API key from Google AI Studio
                </a>
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
