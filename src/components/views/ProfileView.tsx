import React, { useState } from "react";
import { cn } from "../../lib/utils";
import Modal from "../ui/Modal";
import { Select } from "../common/Select";
import { Button } from "../common/Button";
import { Toggle } from './settings/Toggle';
import { useToast } from "../../context/ToastContext";
import {
  User,
  Mail,
  Phone,
  Shield,
  Calendar,
  Clock,
  MapPin,
  Camera,
  Edit2,
  Lock,
  ChevronRight,
  Save,
  X,
  Eye,
  EyeOff,
} from "lucide-react";

interface ProfileViewProps {
  personalInfo: any;
  setPersonalInfo: (info: any) => void | Promise<void>;
  profileImage: string;
  setProfileImage: (image: string) => void | Promise<void>;
  onChangePassword?: (currentPassword: string, newPassword: string) => void | Promise<void>;
}

export default function ProfileView({ 
  personalInfo, 
  setPersonalInfo, 
  profileImage, 
  setProfileImage,
  onChangePassword,
}: ProfileViewProps) {
  const { showToast } = useToast();
  const [isEditing, setIsEditing] = useState(false);
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  const [editForm, setEditForm] = useState({ ...personalInfo });
  const [isChangePasswordModalOpen, setIsChangePasswordModalOpen] = useState(false);

  const [passwordForm, setPasswordForm] = useState({
    current: "",
    new: "",
    confirm: ""
  });

  const [showPassword, setShowPassword] = useState({
    current: false,
    new: false,
    confirm: false
  });

  React.useEffect(() => {
    if (!isEditing) {
      setEditForm({ ...personalInfo });
    }
  }, [isEditing, personalInfo]);

  const handleSave = async () => {
    try {
      await setPersonalInfo({ ...editForm });
      setIsEditing(false);
      showToast("Profile updated successfully!");
    } catch (error) {
      console.error(error);
      showToast("Failed to update profile.", "error");
    }
  };

  const handleCancel = () => {
    setEditForm({ ...personalInfo });
    setIsEditing(false);
  };

  const handlePhotoUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      showToast("Processing image");
      reader.onloadend = async () => {
        try {
          await setProfileImage(reader.result as string);
          showToast("Profile picture saved!");
        } catch (error) {
          console.error(error);
          showToast("Failed to update profile image.", "error");
        }
      };
      reader.readAsDataURL(file);
    }
  };

  const handleChangePassword = async () => {
    if (!onChangePassword) {
      showToast("Password changes are not configured for this account.", "warning");
      return;
    }

    if (passwordForm.new !== passwordForm.confirm) {
      showToast("New passwords do not match.", "error");
      return;
    }

    try {
      await onChangePassword?.(passwordForm.current, passwordForm.new);
      showToast("Password updated successfully!");
      setIsChangePasswordModalOpen(false);
      setPasswordForm({ current: "", new: "", confirm: "" });
      setShowPassword({ current: false, new: false, confirm: false });
    } catch (error) {
      console.error(error);
      showToast(error instanceof Error ? error.message : "Failed to update password.", "error");
    }
  };

  return (
    <div className="w-full flex flex-col gap-6 animate-in fade-in duration-500">
      <div className="grid grid-cols-1 lg:grid-cols-[350px_1fr] gap-6">
        {/* Left Card: Summary */}
        <div className="flex flex-col gap-6">
          <div className="bg-white rounded-2xl border border-border shadow-sm flex flex-col overflow-hidden">
            {/* Cover Image/Pattern Area */}
            <div className="h-32 bg-gradient-to-br from-[#0B7A4B] to-[#16A34A] relative">
              <div className="absolute inset-0 opacity-20" style={{ backgroundImage: 'radial-gradient(circle at 2px 2px, white 1px, transparent 0)', backgroundSize: '24px 24px' }}></div>
            </div>

            <div className="px-6 pb-6 -mt-16 flex flex-col items-center relative z-10">
              <div className="relative group">
                <div className="w-32 h-32 rounded-full border-4 border-white bg-white overflow-hidden shadow-lg">
                  <img
                    src={profileImage || undefined}
                    alt="Profile"
                    className="w-full h-full object-cover"
                  />
                </div>
                <input 
                  type="file" 
                  ref={fileInputRef} 
                  onChange={handlePhotoUpload} 
                  className="hidden" 
                  accept="image/*"
                />
                <Button 
                  variant="ghost"
                  size="xs"
                  onClick={() => fileInputRef.current?.click()}
                  className="absolute bottom-0 right-0 w-8 h-8 rounded-full bg-white border border-border flex items-center justify-center text-[#1a1a1a] hover:bg-slate-50 transition-all p-0 h-8 w-8 min-w-[32px]"
                >
                  <Camera size={16} />
                </Button>
              </div>

              <div className="mt-4 text-center">
                <h2 className="text-[20px] font-bold text-[#1a1a1a]">{personalInfo.fullName}</h2>
                <span className="text-[16px] font-medium text-[#0B7A4B]">{personalInfo.role}</span>
              </div>

              <div className="w-full mt-8 flex flex-col gap-5">
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 rounded-xl bg-[#F0FDF4] text-[#0B7A4B] flex items-center justify-center shadow-sm">
                    <Mail size={18} />
                  </div>
                  <div className="flex flex-col">
                    <span className="text-[16px] font-medium text-[#64748B] uppercase tracking-wider">Email Address</span>
                    <span className="text-[16px] font-medium text-[#1a1a1a]">{personalInfo.email}</span>
                  </div>
                </div>

                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 rounded-xl bg-[#F0FDF4] text-[#0B7A4B] flex items-center justify-center shadow-sm">
                    <Phone size={18} />
                  </div>
                  <div className="flex flex-col">
                    <span className="text-[16px] font-medium text-[#64748B] uppercase tracking-wider">Mobile Number</span>
                    <span className="text-[16px] font-medium text-[#1a1a1a]">{personalInfo.mobile}</span>
                  </div>
                </div>

                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 rounded-xl bg-[#F0FDF4] text-[#0B7A4B] flex items-center justify-center shadow-sm">
                    <Shield size={18} />
                  </div>
                  <div className="flex flex-col">
                    <span className="text-[16px] font-medium text-[#64748B] uppercase tracking-wider">Role</span>
                    <span className="text-[16px] font-medium text-[#1a1a1a]">{personalInfo.role}</span>
                  </div>
                </div>

                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 rounded-xl bg-[#F0FDF4] text-[#0B7A4B] flex items-center justify-center shadow-sm">
                    <Calendar size={18} />
                  </div>
                  <div className="flex flex-col">
                    <span className="text-[16px] font-medium text-[#64748B] uppercase tracking-wider">Last Login</span>
                    <span className="text-[16px] font-medium text-[#1a1a1a]">{personalInfo.lastLogin}</span>
                  </div>
                </div>

                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 rounded-xl bg-[#F0FDF4] text-[#0B7A4B] flex items-center justify-center shadow-sm">
                    <Clock size={18} />
                  </div>
                  <div className="flex flex-col">
                    <span className="text-[16px] font-medium text-[#64748B] uppercase tracking-wider">Timezone</span>
                    <span className="text-[16px] font-medium text-[#1a1a1a]">{personalInfo.timezone}</span>
                  </div>
                </div>
              </div>

              {onChangePassword && (
                <Button 
                  onClick={() => setIsChangePasswordModalOpen(true)}
                  variant="secondary"
                  fullWidth
                  className="mt-8 text-primary"
                  leftIcon={<Lock size={16} />}
                >
                  Change Password
                </Button>
              )}
            </div>
          </div>
        </div>

        {/* Right Content: Forms */}
        <div className="flex flex-col gap-6">
          {/* Personal Information */}
          <div className="bg-white rounded-2xl border border-border shadow-sm p-6">
            <div className="flex items-center justify-between mb-8">
              <h3 className="text-[20px] font-bold text-[#1a1a1a]">Personal Information</h3>
              {!isEditing ? (
                <Button 
                  onClick={() => setIsEditing(true)}
                  variant="secondary"
                  leftIcon={<Edit2 size={16} />}
                >
                  Edit Profile
                </Button>
              ) : (
                <div className="flex items-center gap-2">
                  <Button 
                    onClick={handleCancel}
                    variant="secondary"
                    className="text-slate-600"
                    leftIcon={<X size={16} />}
                  >
                    Cancel
                  </Button>
                  <Button 
                    onClick={handleSave}
                    variant="primary"
                    leftIcon={<Save size={16} />}
                  >
                    Save Changes
                  </Button>
                </div>
              )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-6">
              <div className="flex flex-col gap-2">
                <label className="text-label">Full Name</label>
                {isEditing ? (
                  <input
                    type="text"
                    value={editForm.fullName}
                    onChange={(e) => setEditForm({ ...editForm, fullName: e.target.value })}
                    className="control-field px-4"
                  />
                ) : (
                  <div className="px-4 h-11 rounded-xl bg-slate-50/50 border border-border flex items-center text-[16px] font-medium text-[#1a1a1a]">
                    {personalInfo.fullName}
                  </div>
                )}
              </div>

              <div className="flex flex-col gap-2">
                <label className="text-label">Username</label>
                {isEditing ? (
                  <input
                    type="text"
                    value={editForm.username}
                    onChange={(e) => setEditForm({ ...editForm, username: e.target.value })}
                    className="control-field px-4"
                  />
                ) : (
                  <div className="px-4 h-11 rounded-xl bg-slate-50/50 border border-border flex items-center text-[16px] font-medium text-[#1a1a1a]">
                    {personalInfo.username}
                  </div>
                )}
              </div>

              <div className="flex flex-col gap-2">
                <label className="text-label">Email Address</label>
                {isEditing ? (
                  <input
                    type="email"
                    value={editForm.email}
                    onChange={(e) => setEditForm({ ...editForm, email: e.target.value })}
                    className="control-field px-4"
                  />
                ) : (
                  <div className="px-4 h-11 rounded-xl bg-slate-50/50 border border-border flex items-center text-[16px] font-medium text-[#1a1a1a]">
                    {personalInfo.email}
                  </div>
                )}
              </div>

              <div className="flex flex-col gap-2">
                <label className="text-label">Department</label>
                {isEditing ? (
                  <Select
                    value={editForm.department}
                    onChange={(e) => setEditForm({ ...editForm, department: e.target.value })}
                  >
                    <option value="Administration">Administration</option>
                    <option value="Engineering">Engineering</option>
                    <option value="Operations">Operations</option>
                    <option value="HR">HR</option>
                  </Select>
                ) : (
                  <div className="px-4 h-11 rounded-xl bg-slate-50/50 border border-border flex items-center text-[16px] font-medium text-[#1a1a1a]">
                    {personalInfo.department}
                  </div>
                )}
              </div>

              <div className="flex flex-col gap-2">
                <label className="text-label">Mobile Number</label>
                {isEditing ? (
                  <input
                    type="text"
                    value={editForm.mobile}
                    onChange={(e) => setEditForm({ ...editForm, mobile: e.target.value })}
                    className="control-field px-4"
                  />
                ) : (
                  <div className="px-4 h-11 rounded-xl bg-slate-50/50 border border-border flex items-center text-[16px] font-medium text-[#1a1a1a]">
                    {personalInfo.mobile}
                  </div>
                )}
              </div>

              <div className="flex flex-col gap-2">
                <label className="text-label">Position</label>
                {isEditing ? (
                  <input
                    type="text"
                    value={editForm.position}
                    onChange={(e) => setEditForm({ ...editForm, position: e.target.value })}
                    className="control-field px-4"
                  />
                ) : (
                  <div className="px-4 h-11 rounded-xl bg-slate-50/50 border border-border flex items-center text-[16px] font-medium text-[#1a1a1a]">
                    {personalInfo.position}
                  </div>
                )}
              </div>

              <div className="flex flex-col gap-2">
                <label className="text-label">Gender</label>
                {isEditing ? (
                  <Select
                    value={editForm.gender}
                    onChange={(e) => setEditForm({ ...editForm, gender: e.target.value })}
                  >
                    <option value="Male">Male</option>
                    <option value="Female">Female</option>
                    <option value="Other">Other</option>
                  </Select>
                ) : (
                  <div className="px-4 h-11 rounded-xl bg-slate-50/50 border border-border flex items-center text-[16px] font-medium text-[#1a1a1a] justify-between">
                    {personalInfo.gender}
                    <ChevronRight size={16} className="text-[#64748B] rotate-90" />
                  </div>
                )}
              </div>

              <div className="flex flex-col gap-2">
                <label className="text-label">Date Registered</label>
                <div className="px-4 h-11 rounded-xl bg-slate-50/50 border border-border flex items-center text-[16px] font-medium text-[#64748B] gap-2 cursor-not-allowed">
                  <Calendar size={16} className="text-[#64748B]" />
                  {personalInfo.dateRegistered}
                </div>
              </div>

              <div className="md:col-span-2 flex flex-col gap-2">
                <label className="text-label">Address</label>
                {isEditing ? (
                  <textarea
                    value={editForm.address}
                    onChange={(e) => setEditForm({ ...editForm, address: e.target.value })}
                    className="control-field min-h-24 px-4 py-3 resize-none"
                  />
                ) : (
                  <div className="px-4 py-3 min-h-24 rounded-xl bg-slate-50/50 border border-border flex text-[16px] font-medium text-[#1a1a1a]">
                    {personalInfo.address}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Account Security */}
          <div className="bg-white rounded-2xl border border-border shadow-sm p-6">
            <h3 className="text-[20px] font-bold text-[#1a1a1a] mb-2">Account Security</h3>
            <p className="text-[16px] text-[#64748B] mb-8">Manage your account security settings and login preferences.</p>

            <div className="p-6 rounded-2xl bg-slate-50 border border-border flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-full bg-[#ecfdf5] text-[#10b981] flex items-center justify-center shadow-sm">
                  <Shield size={24} />
                </div>
              <div className="flex flex-col">
                <span className="text-[16px] font-medium text-[#1a1a1a]">Two-Factor Authentication</span>
                <span className="text-[14px] font-medium text-[#64748B]">Add an extra layer of security to your account</span>
              </div>
              </div>
              
              <Toggle enabled={false} />
            </div>
          </div>
        </div>
      </div>

      {/* Change Password Modal */}
      <Modal
        isOpen={isChangePasswordModalOpen}
        onClose={() => {
          setIsChangePasswordModalOpen(false);
          setShowPassword({ current: false, new: false, confirm: false });
        }}
        title="Change Password"
        maxWidth="max-w-md"
        footer={
          <div className="flex gap-3 w-full">
            <Button
              onClick={() => {
                setIsChangePasswordModalOpen(false);
                setShowPassword({ current: false, new: false, confirm: false });
              }}
              variant="secondary"
              className="flex-1 text-text-secondary"
            >
              Cancel
            </Button>
            <Button
              onClick={handleChangePassword}
              disabled={
                !passwordForm.current ||
                !passwordForm.new ||
                passwordForm.new !== passwordForm.confirm
              }
              variant="primary"
              className="flex-1"
            >
              Update Password
            </Button>
          </div>
        }
      >
        <div className="flex flex-col gap-5">
          <div className="flex flex-col gap-2">
            <label className="text-label">
              Current Password
            </label>
            <div className="relative">
              <input
                type={showPassword.current ? "text" : "password"}
                placeholder="Enter current password"
                value={passwordForm.current}
                onChange={(e) =>
                  setPasswordForm({ ...passwordForm, current: e.target.value })
                }
                className="control-field px-4"
              />
              <div className="absolute right-4 top-1/2 -translate-y-1/2 flex items-center">
                {passwordForm.current ? (
                  <Button
                    variant="ghost"
                    size="xs"
                    onClick={() =>
                      setShowPassword({
                        ...showPassword,
                        current: !showPassword.current,
                      })
                    }
                    className="text-[#64748B] hover:text-[#0B7A4B] transition-colors p-1 h-auto w-auto"
                  >
                    {showPassword.current ? <Eye size={16} /> : <EyeOff size={16} />}
                  </Button>
                ) : (
                  <Lock className="text-[#64748B]" size={16} />
                )}
              </div>
            </div>
          </div>

          <div className="flex flex-col gap-2">
            <label className="text-label">
              New Password
            </label>
            <div className="relative">
              <input
                type={showPassword.new ? "text" : "password"}
                placeholder="Create new password"
                value={passwordForm.new}
                onChange={(e) =>
                  setPasswordForm({ ...passwordForm, new: e.target.value })
                }
                className="control-field px-4"
              />
              <div className="absolute right-4 top-1/2 -translate-y-1/2 flex items-center">
                {passwordForm.new ? (
                  <Button
                    variant="ghost"
                    size="xs"
                    onClick={() =>
                      setShowPassword({
                        ...showPassword,
                        new: !showPassword.new,
                      })
                    }
                    className="text-[#64748B] hover:text-[#0B7A4B] transition-colors p-1 h-auto w-auto"
                  >
                    {showPassword.new ? <Eye size={16} /> : <EyeOff size={16} />}
                  </Button>
                ) : (
                  <Lock className="text-[#64748B]" size={16} />
                )}
              </div>
            </div>
          </div>

          <div className="flex flex-col gap-2">
            <label className="text-label">
              Confirm New Password
            </label>
            <div className="relative">
              <input
                type={showPassword.confirm ? "text" : "password"}
                placeholder="Confirm new password"
                value={passwordForm.confirm}
                onChange={(e) =>
                  setPasswordForm({ ...passwordForm, confirm: e.target.value })
                }
                className="control-field px-4"
              />
              <div className="absolute right-4 top-1/2 -translate-y-1/2 flex items-center">
                {passwordForm.confirm ? (
                  <Button
                    variant="ghost"
                    size="xs"
                    onClick={() =>
                      setShowPassword({
                        ...showPassword,
                        confirm: !showPassword.confirm,
                      })
                    }
                    className="text-[#64748B] hover:text-[#0B7A4B] transition-colors p-1 h-auto w-auto"
                  >
                    {showPassword.confirm ? <Eye size={16} /> : <EyeOff size={16} />}
                  </Button>
                ) : (
                  <Shield className="text-[#64748B]" size={16} />
                )}
              </div>
            </div>
          </div>
        </div>
      </Modal>

    </div>
  );
}
