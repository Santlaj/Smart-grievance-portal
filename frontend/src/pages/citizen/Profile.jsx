import React, { useEffect, useState } from "react";
import CitizenLayout from "../../components/citizen/CitizenLayout";
import { useAuth } from "../../context/AuthContext";
import { useLanguage } from "../../context/LanguageContext";
import {
  User,
  Mail,
  Phone,
  MapPin,
  FileText,
  Edit2,
  Check,
  X,
  AlertCircle,
  Clock,
  CheckCircle2,
  Hourglass,
} from "lucide-react";
import { Button } from "../../components/ui/Button";
import complaintService from "../../services/complaintService";
import authService from "../../services/authService";

export function Profile() {
  const { user, updateUser, selectedLocation, setSelectedLocation } = useAuth();
  const { t } = useLanguage();
  const [complaints, setComplaints] = useState([]);
  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    phone: "",
    address: "",
  });
  const [saving, setSaving] = useState(false);
  const [statusMessage, setStatusMessage] = useState({ type: "", text: "" });

  useEffect(() => {
    if (user) {
      setFormData({
        name: user.name || "",
        phone: user.phone || "",
        address: user.address || "",
      });
    }
  }, [user]);

  useEffect(() => {
    complaintService
      .getMyComplaints()
      .then((data) => {
        if (Array.isArray(data)) setComplaints(data);
      })
      .catch(() => {});
  }, []);

  const total = complaints.length;
  const pending = complaints.filter(
    (c) => c.status === "Pending" || c.status === "Assigned"
  ).length;
  const inProgress = complaints.filter((c) => c.status === "In Progress").length;
  const resolved = complaints.filter((c) => c.status === "Resolved").length;

  const handleSave = async (e) => {
    e.preventDefault();
    if (!formData.name.trim()) {
      setStatusMessage({ type: "error", text: t("err_name_empty", "Full name cannot be empty.") });
      return;
    }

    setSaving(true);
    setStatusMessage({ type: "", text: "" });
    try {
      const updated = await authService.updateProfile({
        name: formData.name.trim(),
        phone: formData.phone.trim(),
        address: formData.address.trim(),
      });
      if (updateUser) updateUser(updated);
      if (setSelectedLocation && formData.address.trim()) {
        setSelectedLocation(formData.address.trim());
      }
      setIsEditing(false);
      setStatusMessage({
        type: "success",
        text: t("msg_profile_updated", "Your profile details have been successfully updated."),
      });
      setTimeout(() => setStatusMessage({ type: "", text: "" }), 4000);
    } catch (err) {
      setStatusMessage({
        type: "error",
        text: err.response?.data?.message || t("err_profile_update_fail", "Failed to update profile details."),
      });
    } finally {
      setSaving(false);
    }
  };

  const handleCancel = () => {
    setFormData({
      name: user?.name || "",
      phone: user?.phone || "",
      address: user?.address || "",
    });
    setIsEditing(false);
    setStatusMessage({ type: "", text: "" });
  };

  return (
    <CitizenLayout>
      <div className="max-w-4xl mx-auto space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-extrabold text-navy">{t("title_citizen_profile", "Citizen Profile")}</h1>
            <p className="text-sm text-muted-foreground mt-1">
              {t("subtitle_citizen_profile", "Your registered credentials, residential ward, and civic activity record.")}
            </p>
          </div>
          {!isEditing && (
            <Button
              onClick={() => setIsEditing(true)}
              variant="outline"
              className="gap-2 border-primary/20 text-primary hover:bg-primary/5 self-start"
            >
              <Edit2 className="h-4 w-4" /> {t("btn_edit_profile", "Edit Profile")}
            </Button>
          )}
        </div>

        {statusMessage.text && (
          <div
            className={`p-4 rounded-2xl flex items-center gap-3 text-sm font-medium ${
              statusMessage.type === "success"
                ? "bg-emerald-50 text-emerald-800 border border-emerald-200"
                : "bg-red-50 text-red-800 border border-red-200"
            }`}
          >
            {statusMessage.type === "success" ? (
              <Check className="h-5 w-5 text-emerald-600 shrink-0" />
            ) : (
              <AlertCircle className="h-5 w-5 text-red-600 shrink-0" />
            )}
            <span>{statusMessage.text}</span>
          </div>
        )}

        {/* Primary Profile Card */}
        <div className="rounded-3xl border bg-card p-8 shadow-card space-y-8">
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-5 border-b pb-6">
            <div className="grid h-20 w-20 place-items-center rounded-2xl bg-gradient-to-br from-primary to-blue-700 text-primary-foreground text-3xl font-black shadow-md shadow-primary/20">
              {user?.name?.charAt(0).toUpperCase() || "C"}
            </div>
            <div className="space-y-1">
              <h2 className="text-2xl font-extrabold text-navy">{user?.name}</h2>
              <div className="flex flex-wrap items-center gap-2">
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-blue-50 text-primary border border-blue-100">
                  <CheckCircle2 className="h-3 w-3 text-primary" /> {t("badge_verified_citizen", "Verified Citizen")}
                </span>
                <span className="text-xs text-muted-foreground">
                  {t("label_citizen_id", "Citizen ID")}: #{user?._id ? user._id.slice(-6).toUpperCase() : "REG-CITIZEN"}
                </span>
              </div>
            </div>
          </div>

          {isEditing ? (
            <form onSubmit={handleSave} className="space-y-6">
              <div className="grid gap-6 sm:grid-cols-2">
                <div className="space-y-2">
                  <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                    {t("label_full_name", "Full Name")} <span className="text-destructive">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.name}
                    onChange={(e) =>
                      setFormData({ ...formData, name: e.target.value })
                    }
                    className="w-full rounded-xl border border-input bg-background px-4 py-2.5 text-sm font-medium text-navy focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                    placeholder={t("ph_enter_full_name", "Enter your full name")}
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                    {t("label_email_readonly", "Email Address (Read-only)")}
                  </label>
                  <input
                    type="email"
                    disabled
                    value={user?.email || ""}
                    className="w-full rounded-xl border border-input bg-slate-100 px-4 py-2.5 text-sm font-medium text-slate-500 cursor-not-allowed"
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                    {t("label_contact_phone", "Contact Phone Number")}
                  </label>
                  <input
                    type="tel"
                    value={formData.phone}
                    onChange={(e) =>
                      setFormData({ ...formData, phone: e.target.value })
                    }
                    className="w-full rounded-xl border border-input bg-background px-4 py-2.5 text-sm font-medium text-navy focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                    placeholder={t("ph_phone_number", "e.g. +91 98765 43210")}
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                    {t("label_locality_ward", "Locality / Residential Ward")}
                  </label>
                  <input
                    type="text"
                    value={formData.address}
                    onChange={(e) =>
                      setFormData({ ...formData, address: e.target.value })
                    }
                    className="w-full rounded-xl border border-input bg-background px-4 py-2.5 text-sm font-medium text-navy focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                    placeholder={t("ph_locality_ward", "e.g. Indiranagar, Bengaluru or Bandra West, Mumbai")}
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-3 pt-4 border-t">
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleCancel}
                  disabled={saving}
                >
                  <X className="h-4 w-4 mr-1.5" /> {t("btn_cancel", "Cancel")}
                </Button>
                <Button type="submit" disabled={saving} className="gap-2">
                  {saving ? (
                    <>{t("btn_saving_details", "Saving Details…")}</>
                  ) : (
                    <>
                      <Check className="h-4 w-4" /> {t("btn_save_changes", "Save Changes")}
                    </>
                  )}
                </Button>
              </div>
            </form>
          ) : (
            <div className="grid gap-6 sm:grid-cols-2 text-sm">
              <div className="flex items-start gap-3 p-4 rounded-2xl bg-slate-50/60 border border-slate-100">
                <div className="p-2 rounded-xl bg-primary/10 text-primary shrink-0">
                  <User className="h-4 w-4" />
                </div>
                <div>
                  <span className="text-xs text-muted-foreground block font-semibold uppercase tracking-wider">
                    {t("label_full_name", "Full Name")}
                  </span>
                  <p className="font-bold text-navy text-base mt-0.5">{user?.name || "—"}</p>
                </div>
              </div>

              <div className="flex items-start gap-3 p-4 rounded-2xl bg-slate-50/60 border border-slate-100">
                <div className="p-2 rounded-xl bg-primary/10 text-primary shrink-0">
                  <Mail className="h-4 w-4" />
                </div>
                <div>
                  <span className="text-xs text-muted-foreground block font-semibold uppercase tracking-wider">
                    {t("label_registered_email", "Registered Email")}
                  </span>
                  <p className="font-bold text-navy text-base mt-0.5">{user?.email || "—"}</p>
                </div>
              </div>

              <div className="flex items-start gap-3 p-4 rounded-2xl bg-slate-50/60 border border-slate-100">
                <div className="p-2 rounded-xl bg-primary/10 text-primary shrink-0">
                  <Phone className="h-4 w-4" />
                </div>
                <div>
                  <span className="text-xs text-muted-foreground block font-semibold uppercase tracking-wider">
                    {t("label_phone_number", "Phone Number")}
                  </span>
                  <p className="font-bold text-navy text-base mt-0.5">{user?.phone || t("text_not_provided", "Not provided")}</p>
                </div>
              </div>

              <div className="flex items-start gap-3 p-4 rounded-2xl bg-slate-50/60 border border-slate-100">
                <div className="p-2 rounded-xl bg-primary/10 text-primary shrink-0">
                  <MapPin className="h-4 w-4" />
                </div>
                <div>
                  <span className="text-xs text-muted-foreground block font-semibold uppercase tracking-wider">
                    {t("label_residential_ward", "Residential Ward / Locality")}
                  </span>
                  <p className="font-bold text-navy text-base mt-0.5">{user?.address || selectedLocation || t("text_not_specified", "Not specified")}</p>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Activity & Grievance Stats */}
        <div className="rounded-3xl border bg-card p-6 shadow-card space-y-4">
          <h3 className="text-base font-extrabold text-navy">
            {t("title_grievance_activity", "Grievance Redressal Activity")}
          </h3>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div className="p-4 rounded-2xl bg-blue-50/50 border border-blue-100 text-center">
              <FileText className="h-5 w-5 text-primary mx-auto mb-1" />
              <p className="text-2xl font-black text-navy">{total}</p>
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mt-0.5">
                {t("stat_total_submitted", "Total Submitted")}
              </p>
            </div>

            <div className="p-4 rounded-2xl bg-amber-50/50 border border-amber-100 text-center">
              <Clock className="h-5 w-5 text-amber-600 mx-auto mb-1" />
              <p className="text-2xl font-black text-amber-700">{pending}</p>
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mt-0.5">
                {t("stat_under_review", "Under Review")}
              </p>
            </div>

            <div className="p-4 rounded-2xl bg-indigo-50/50 border border-indigo-100 text-center">
              <Hourglass className="h-5 w-5 text-indigo-600 mx-auto mb-1" />
              <p className="text-2xl font-black text-indigo-700">{inProgress}</p>
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mt-0.5">
                {t("stat_in_progress", "In Progress")}
              </p>
            </div>

            <div className="p-4 rounded-2xl bg-emerald-50/50 border border-emerald-100 text-center">
              <CheckCircle2 className="h-5 w-5 text-emerald-600 mx-auto mb-1" />
              <p className="text-2xl font-black text-emerald-700">{resolved}</p>
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mt-0.5">
                {t("stat_resolved", "Resolved")}
              </p>
            </div>
          </div>
        </div>
      </div>
    </CitizenLayout>
  );
}

export default Profile;
