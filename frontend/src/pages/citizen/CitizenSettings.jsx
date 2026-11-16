import React, { useState, useEffect } from "react";
import CitizenLayout from "../../components/citizen/CitizenLayout";
import { useAuth } from "../../context/AuthContext";
import { useLanguage } from "../../context/LanguageContext";
import {
  Settings,
  Languages,
  Bell,
  Lock,
  Shield,
  MapPin,
  Sliders,
  Check,
  Eye,
  EyeOff,
  Save,
  Download,
  AlertCircle,
  HelpCircle,
  Smartphone,
  Mail,
  Volume2,
} from "lucide-react";
import { Button } from "../../components/ui/Button";
import { Input, Label } from "../../components/ui/Input";
import authService from "../../services/authService";
import { toast } from "sonner";

export function CitizenSettings() {
  const { user, updateUser } = useAuth();
  const { language, setLanguage, languages, t } = useLanguage();

  const [activeTab, setActiveTab] = useState("language"); // "language" | "notifications" | "security" | "privacy"

  // Password Change Form State
  const [passwordForm, setPasswordForm] = useState({
    currentPassword: "",
    newPassword: "",
    confirmPassword: "",
  });
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [passwordSaving, setPasswordSaving] = useState(false);

  // Notification Toggles State (persisted to localStorage)
  const [notificationSettings, setNotificationSettings] = useState(() => {
    try {
      const saved = localStorage.getItem("citizen_notification_settings");
      if (saved) return JSON.parse(saved);
    } catch {
      // ignore
    }
    return {
      smsUpdates: true,
      emailUpdates: true,
      emergencyAlerts: true,
      officerRemarksAlert: true,
      weeklySummary: false,
    };
  });

  // Privacy & Location Settings
  const [privacySettings, setPrivacySettings] = useState(() => {
    try {
      const saved = localStorage.getItem("citizen_privacy_settings");
      if (saved) return JSON.parse(saved);
    } catch {
      // ignore
    }
    return {
      anonymousFiling: false,
      autoTagGps: true,
      preferredWard: "Ward 12 - Central Municipal Division",
      autoReadVoice: false,
    };
  });

  const handleToggleNotification = (key) => {
    setNotificationSettings((prev) => {
      const updated = { ...prev, [key]: !prev[key] };
      localStorage.setItem("citizen_notification_settings", JSON.stringify(updated));
      toast.success(t("msg_settings_saved", "Notification preferences saved"));
      return updated;
    });
  };

  const handleTogglePrivacy = (key) => {
    setPrivacySettings((prev) => {
      const updated = { ...prev, [key]: !prev[key] };
      localStorage.setItem("citizen_privacy_settings", JSON.stringify(updated));
      toast.success(t("msg_settings_saved", "Privacy settings updated"));
      return updated;
    });
  };

  const handlePasswordSubmit = async (e) => {
    e.preventDefault();
    if (!passwordForm.currentPassword) {
      toast.error(t("err_current_pw_required", "Current password is required"));
      return;
    }
    if (passwordForm.newPassword.length < 6) {
      toast.error(t("err_pw_min_len", "New password must be at least 6 characters"));
      return;
    }
    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      toast.error(t("err_pw_mismatch", "New passwords do not match"));
      return;
    }

    setPasswordSaving(true);
    try {
      await authService.changePassword({
        currentPassword: passwordForm.currentPassword,
        newPassword: passwordForm.newPassword,
      });
      toast.success(t("msg_password_changed", "Password updated successfully!"));
      setPasswordForm({
        currentPassword: "",
        newPassword: "",
        confirmPassword: "",
      });
    } catch (err) {
      toast.error(err.response?.data?.message || t("err_password_change_fail", "Failed to update password"));
    } finally {
      setPasswordSaving(false);
    }
  };

  const handleExportData = () => {
    const exportData = {
      user: {
        name: user?.name,
        email: user?.email,
        phone: user?.phone,
        address: user?.address,
      },
      settings: {
        language,
        notifications: notificationSettings,
        privacy: privacySettings,
      },
      exportedAt: new Date().toISOString(),
    };

    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(exportData, null, 2));
    const downloadAnchor = document.createElement("a");
    downloadAnchor.setAttribute("href", dataStr);
    downloadAnchor.setAttribute("download", `citizen_settings_archive_${Date.now()}.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
    toast.success(t("msg_export_success", "Settings archive exported successfully"));
  };

  const tabs = [
    { id: "language", label: t("settings_tab_language", "Language & Voice"), icon: Languages },
    { id: "notifications", label: t("settings_tab_notifications", "Notifications & Alerts"), icon: Bell },
    { id: "security", label: t("settings_tab_security", "Security & Password"), icon: Lock },
    { id: "privacy", label: t("settings_tab_privacy", "Civic Privacy & Location"), icon: Shield },
  ];

  return (
    <CitizenLayout
      title={t("title_citizen_settings", "Citizen Account & Portal Settings")}
      subtitle={t("subtitle_citizen_settings", "Manage your preferred regional language, alert preferences, security and civic privacy options")}
    >
      <div className="mx-auto max-w-5xl space-y-6 pb-12">
        {/* Page Header */}
        <div className="border-b border-slate-200 pb-5">
          <div className="flex items-center gap-2.5">
            <span className="grid h-8 w-8 place-items-center rounded-xl bg-blue-100 text-blue-700">
              <Settings className="h-4 w-4" />
            </span>
            <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
              {t("title_citizen_settings", "Citizen Account & Portal Settings")}
            </h1>
          </div>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            {t("subtitle_citizen_settings", "Manage your preferred regional language, alert preferences, security and civic privacy options")}
          </p>
        </div>

        {/* Navigation Tabs Header */}
        <div className="flex flex-wrap gap-2 rounded-2xl border border-slate-200 bg-white p-2 shadow-xs">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-2 rounded-xl px-4 py-2.5 text-xs font-bold transition-all cursor-pointer ${
                  isActive
                    ? "bg-[#0E1B38] text-white shadow-xs"
                    : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
                }`}
              >
                <Icon className={`h-4 w-4 ${isActive ? "text-blue-300" : "text-slate-500"}`} />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>

        {/* Tab 1: Language & Voice Accessibility */}
        {activeTab === "language" && (
          <div className="rounded-3xl border border-slate-200 bg-white p-6 sm:p-8 shadow-xs space-y-6">
            <div>
              <h3 className="text-base font-extrabold text-[#0E1B38] flex items-center gap-2">
                <Languages className="h-5 w-5 text-blue-600" />
                {t("title_preferred_language", "Preferred Indian Language")}
              </h3>
              <p className="text-xs text-slate-600 mt-1">
                {t("desc_preferred_language", "Select your preferred regional language. Every text across the portal will be translated automatically.")}
              </p>
            </div>

            {/* Grid of 8 Supported Languages */}
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
              {languages.map((lang) => {
                const isSelected = language === lang.code;
                return (
                  <button
                    key={lang.code}
                    type="button"
                    onClick={() => {
                      setLanguage(lang.code);
                      toast.success(t("msg_lang_updated", `Language changed to ${lang.nativeName}`));
                    }}
                    className={`flex flex-col items-start justify-between rounded-2xl p-4 text-left border-2 transition-all cursor-pointer ${
                      isSelected
                        ? "border-[#2563EB] bg-blue-50/70 shadow-sm"
                        : "border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50/60"
                    }`}
                  >
                    <div className="flex items-center justify-between w-full mb-2">
                      <span className="text-xl">{lang.flag || "🇮🇳"}</span>
                      {isSelected ? (
                        <span className="grid h-6 w-6 place-items-center rounded-full bg-[#2563EB] text-white">
                          <Check className="h-3.5 w-3.5" />
                        </span>
                      ) : (
                        <span className="text-[10px] uppercase font-bold text-slate-400">
                          {lang.code}
                        </span>
                      )}
                    </div>
                    <div>
                      <p className="text-base font-bold text-slate-900 leading-tight">
                        {lang.nativeName}
                      </p>
                      <p className="text-xs text-slate-600 font-medium mt-0.5">
                        {lang.name}
                      </p>
                    </div>
                  </button>
                );
              })}
            </div>

            {/* Voice Accessibility Settings */}
            <div className="border-t border-slate-100 pt-6 space-y-4">
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-600 flex items-center gap-2">
                <Volume2 className="h-4 w-4 text-blue-600" />
                {t("title_voice_settings", "Voice & Audio Assistance")}
              </h4>

              <div className="flex items-center justify-between rounded-2xl border border-slate-200 bg-slate-50/60 p-4">
                <div>
                  <p className="text-xs font-bold text-slate-900">
                    {t("label_auto_read_voice", "Auto-read AI Assistant Responses")}
                  </p>
                  <p className="text-[11px] text-slate-600 mt-0.5">
                    {t("desc_auto_read_voice", "Automatically speak CivicSaathi replies aloud in your selected language.")}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => handleTogglePrivacy("autoReadVoice")}
                  className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-hidden ${
                    privacySettings.autoReadVoice ? "bg-[#2563EB]" : "bg-slate-300"
                  }`}
                >
                  <span
                    className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-md ring-0 transition duration-200 ease-in-out ${
                      privacySettings.autoReadVoice ? "translate-x-5" : "translate-x-0"
                    }`}
                  />
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Tab 2: Notifications & Alerts */}
        {activeTab === "notifications" && (
          <div className="rounded-3xl border border-slate-200 bg-white p-6 sm:p-8 shadow-xs space-y-6">
            <div>
              <h3 className="text-base font-extrabold text-[#0E1B38] flex items-center gap-2">
                <Bell className="h-5 w-5 text-blue-600" />
                {t("title_notifications", "Citizen Notification Channels")}
              </h3>
              <p className="text-xs text-slate-600 mt-1">
                {t("desc_notifications", "Control how and when you receive automated municipal alerts for your grievances.")}
              </p>
            </div>

            <div className="space-y-3">
              {[
                {
                  key: "smsUpdates",
                  title: t("notif_sms_title", "SMS Status Updates"),
                  desc: t("notif_sms_desc", "Receive immediate text messages on your mobile when grievance status changes."),
                  icon: Smartphone,
                },
                {
                  key: "emailUpdates",
                  title: t("notif_email_title", "Email Notifications"),
                  desc: t("notif_email_desc", "Receive formal PDF receipts and updates at your registered email address."),
                  icon: Mail,
                },
                {
                  key: "officerRemarksAlert",
                  title: t("notif_officer_title", "Officer Resolution Remarks"),
                  desc: t("notif_officer_desc", "Notify instantly when an authorized field officer posts resolution proofs or remarks."),
                  icon: Shield,
                },
                {
                  key: "emergencyAlerts",
                  title: t("notif_emergency_title", "Municipal Emergency Broadcasts"),
                  desc: t("notif_emergency_desc", "Receive high-priority civil defense alerts, water supply disruptions and road closures."),
                  icon: AlertCircle,
                },
                {
                  key: "weeklySummary",
                  title: t("notif_weekly_title", "Weekly Civic Progress Digest"),
                  desc: t("notif_weekly_desc", "A weekly email digest of all resolved community issues in your civic zone."),
                  icon: Bell,
                },
              ].map((item) => {
                const Icon = item.icon;
                const isEnabled = notificationSettings[item.key];
                return (
                  <div
                    key={item.key}
                    className="flex items-center justify-between rounded-2xl border border-slate-200 bg-white p-4 hover:border-slate-300 transition-all"
                  >
                    <div className="flex items-start gap-3">
                      <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-blue-50 text-blue-600">
                        <Icon className="h-4 w-4" />
                      </span>
                      <div>
                        <p className="text-xs font-bold text-slate-900">{item.title}</p>
                        <p className="text-[11px] text-slate-600 mt-0.5">{item.desc}</p>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => handleToggleNotification(item.key)}
                      className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-hidden ${
                        isEnabled ? "bg-[#2563EB]" : "bg-slate-300"
                      }`}
                    >
                      <span
                        className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-md ring-0 transition duration-200 ease-in-out ${
                          isEnabled ? "translate-x-5" : "translate-x-0"
                        }`}
                      />
                    </button>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Tab 3: Security & Password */}
        {activeTab === "security" && (
          <div className="rounded-3xl border border-slate-200 bg-white p-6 sm:p-8 shadow-xs space-y-6">
            <div>
              <h3 className="text-base font-extrabold text-[#0E1B38] flex items-center gap-2">
                <Lock className="h-5 w-5 text-blue-600" />
                {t("title_security", "Security & Password Management")}
              </h3>
              <p className="text-xs text-slate-600 mt-1">
                {t("desc_security", "Keep your citizen account safe by periodically updating your portal password.")}
              </p>
            </div>

            <form onSubmit={handlePasswordSubmit} className="max-w-md space-y-4">
              <div>
                <Label className="text-xs font-bold text-slate-700">
                  {t("label_current_password", "Current Password")}
                </Label>
                <div className="relative mt-1">
                  <Input
                    type={showCurrentPassword ? "text" : "password"}
                    value={passwordForm.currentPassword}
                    onChange={(e) => setPasswordForm({ ...passwordForm, currentPassword: e.target.value })}
                    required
                    placeholder="••••••••"
                    className="pr-10 text-xs"
                  />
                  <button
                    type="button"
                    onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                  >
                    {showCurrentPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>

              <div>
                <Label className="text-xs font-bold text-slate-700">
                  {t("label_new_password", "New Password (min 6 characters)")}
                </Label>
                <div className="relative mt-1">
                  <Input
                    type={showNewPassword ? "text" : "password"}
                    value={passwordForm.newPassword}
                    onChange={(e) => setPasswordForm({ ...passwordForm, newPassword: e.target.value })}
                    required
                    minLength={6}
                    placeholder="••••••••"
                    className="pr-10 text-xs"
                  />
                  <button
                    type="button"
                    onClick={() => setShowNewPassword(!showNewPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                  >
                    {showNewPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>

              <div>
                <Label className="text-xs font-bold text-slate-700">
                  {t("label_confirm_password", "Confirm New Password")}
                </Label>
                <Input
                  type="password"
                  value={passwordForm.confirmPassword}
                  onChange={(e) => setPasswordForm({ ...passwordForm, confirmPassword: e.target.value })}
                  required
                  placeholder="••••••••"
                  className="mt-1 text-xs"
                />
              </div>

              <div className="pt-2">
                <Button
                  type="submit"
                  disabled={passwordSaving}
                  className="bg-[#0E1B38] hover:bg-[#162544] text-white font-bold text-xs px-6 py-2.5 rounded-xl cursor-pointer"
                >
                  <Save className="h-4 w-4 mr-1.5" />
                  {passwordSaving ? t("btn_saving", "Updating...") : t("btn_update_password", "Update Password")}
                </Button>
              </div>
            </form>
          </div>
        )}

        {/* Tab 4: Civic Privacy & Location */}
        {activeTab === "privacy" && (
          <div className="rounded-3xl border border-slate-200 bg-white p-6 sm:p-8 shadow-xs space-y-6">
            <div>
              <h3 className="text-base font-extrabold text-[#0E1B38] flex items-center gap-2">
                <Shield className="h-5 w-5 text-blue-600" />
                {t("title_privacy", "Civic Privacy & Location Preferences")}
              </h3>
              <p className="text-xs text-slate-600 mt-1">
                {t("desc_privacy", "Configure privacy safeguards and default municipal ward assignments for faster lodging.")}
              </p>
            </div>

            <div className="space-y-4">
              <div className="flex items-center justify-between rounded-2xl border border-slate-200 bg-white p-4">
                <div>
                  <p className="text-xs font-bold text-slate-900">
                    {t("label_anonymous_filing", "Anonymous Grievance Publishing")}
                  </p>
                  <p className="text-[11px] text-slate-600 mt-0.5">
                    {t("desc_anonymous_filing", "Mask your name and contact details when complaints are displayed on community public boards.")}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => handleTogglePrivacy("anonymousFiling")}
                  className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-hidden ${
                    privacySettings.anonymousFiling ? "bg-[#2563EB]" : "bg-slate-300"
                  }`}
                >
                  <span
                    className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-md ring-0 transition duration-200 ease-in-out ${
                      privacySettings.anonymousFiling ? "translate-x-5" : "translate-x-0"
                    }`}
                  />
                </button>
              </div>

              <div className="flex items-center justify-between rounded-2xl border border-slate-200 bg-white p-4">
                <div>
                  <p className="text-xs font-bold text-slate-900">
                    {t("label_auto_gps", "Auto-attach GPS Coordinates to Photos")}
                  </p>
                  <p className="text-[11px] text-slate-600 mt-0.5">
                    {t("desc_auto_gps", "Embed accurate device geotags into photographic evidence for automated ward dispatch.")}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => handleTogglePrivacy("autoTagGps")}
                  className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-hidden ${
                    privacySettings.autoTagGps ? "bg-[#2563EB]" : "bg-slate-300"
                  }`}
                >
                  <span
                    className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-md ring-0 transition duration-200 ease-in-out ${
                      privacySettings.autoTagGps ? "translate-x-5" : "translate-x-0"
                    }`}
                  />
                </button>
              </div>

              {/* Data Export Button */}
              <div className="border-t border-slate-100 pt-5 flex items-center justify-between">
                <div>
                  <p className="text-xs font-bold text-slate-900">{t("title_export_data", "Download Account Archive")}</p>
                  <p className="text-[11px] text-slate-600 mt-0.5">{t("desc_export_data", "Export a machine-readable JSON copy of your preferences and profile.")}</p>
                </div>
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleExportData}
                  className="text-xs font-bold border-slate-200 text-slate-700 hover:bg-slate-50 cursor-pointer"
                >
                  <Download className="h-4 w-4 mr-1.5" />
                  {t("btn_export", "Export Archive")}
                </Button>
              </div>
            </div>
          </div>
        )}
      </div>
    </CitizenLayout>
  );
}

export default CitizenSettings;
