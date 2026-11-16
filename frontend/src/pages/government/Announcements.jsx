import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import {
  Megaphone,
  Plus,
  Trash2,
  Calendar,
  AlertTriangle,
  Building2,
  Send,
  Bell,
  CheckCircle2,
  Clock,
  Sparkles,
  Users,
  ShieldAlert,
  FileText,
  ArrowRight,
  ShieldCheck,
  ChevronRight,
  Timer,
  EyeOff,
  Check,
} from "lucide-react";
import { toast } from "sonner";
import GovernmentLayout from "../../components/government/GovernmentLayout";
import { Button } from "../../components/ui/Button";
import { Input, Textarea, Label, Badge } from "../../components/ui/Input";
import announcementService from "../../services/announcementService";
import { useAuth } from "../../context/AuthContext";
import { useLanguage } from "../../context/LanguageContext";

export function Announcements() {
  const { user } = useAuth();
  const { t } = useLanguage();
  const [announcements, setAnnouncements] = useState([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  // Channel: "directives" (from Admin to Officers) vs "civic" (from Officers to Citizens)
  const [channel, setChannel] = useState("civic");
  const [showCreateModal, setShowCreateModal] = useState(false);

  // Civic Sub-Filter: "all" | "active" | "expired"
  const [civicFilter, setCivicFilter] = useState("all");

  // Form State for Civic Broadcast with Auto-Disappear Expiration Time
  const [form, setForm] = useState({
    title: "",
    message: "",
    category: "Roads & Infrastructure",
    priority: "Medium",
    targetWard: "All Wards",
    expiresIn: "24_hours", // "1_hour" | "6_hours" | "12_hours" | "24_hours" | "48_hours" | "3_days" | "7_days" | "custom" | "never"
    customExpiresAt: "",
  });

  const categories = [
    "Roads & Infrastructure",
    "Water Supply & Drainage",
    "Sanitation & Waste Management",
    "Electricity & Power",
    "Public Health & Safety",
    "General Civic Notice",
  ];

  const fetchAnnouncements = async () => {
    try {
      const data = await announcementService.getAnnouncements();
      if (Array.isArray(data)) {
        setAnnouncements(data);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAnnouncements();
  }, []);

  const handleCreateAnnouncement = async (e) => {
    e.preventDefault();
    if (!form.title.trim() || !form.message.trim()) {
      toast.error("Please provide both an announcement title and message.");
      return;
    }

    if (form.expiresIn === "custom" && !form.customExpiresAt) {
      toast.error("Please specify a custom expiration date and time.");
      return;
    }

    setSubmitting(true);
    try {
      const payload = {
        title: form.title.trim(),
        message: form.message.trim(),
        category: form.category,
        priority: form.priority,
        targetWard: form.targetWard,
        targetAudience: "citizens",
        expiresIn: form.expiresIn === "custom" ? null : form.expiresIn,
        expiresAt:
          form.expiresIn === "custom" && form.customExpiresAt
            ? new Date(form.customExpiresAt).toISOString()
            : null,
      };

      await announcementService.createAnnouncement(payload);

      toast.success(
        form.expiresIn === "never"
          ? "Civic announcement broadcasted to citizens!"
          : "Civic announcement broadcasted! It will automatically disappear after the set expiration time."
      );

      setForm({
        title: "",
        message: "",
        category: "Roads & Infrastructure",
        priority: "Medium",
        targetWard: "All Wards",
        expiresIn: "24_hours",
        customExpiresAt: "",
      });
      setShowCreateModal(false);
      fetchAnnouncements();
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to broadcast announcement.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteAnnouncement = async (id) => {
    try {
      await announcementService.deleteAnnouncement(id);
      toast.success("Notice removed successfully.");
      setAnnouncements((prev) => prev.filter((a) => a._id !== id));
    } catch (err) {
      toast.error("Failed to delete announcement.");
    }
  };

  // Helper to calculate expiration status
  const getExpirationBadge = (a) => {
    const exp = a.expiresAt || a.expiryDate;
    if (!exp) {
      return (
        <span className="inline-flex items-center gap-1 text-[10px] font-semibold bg-slate-100 text-slate-600 px-2 py-0.5 rounded-md">
          Permanent (No Auto-Expire)
        </span>
      );
    }

    const expTime = new Date(exp).getTime();
    const nowTime = Date.now();

    if (expTime <= nowTime) {
      return (
        <span className="inline-flex items-center gap-1 text-[10px] font-bold bg-rose-50 text-rose-700 px-2 py-0.5 rounded-md border border-rose-200">
          <EyeOff className="h-3 w-3" />
          Expired &amp; Hidden from Citizens
        </span>
      );
    }

    const diffMs = expTime - nowTime;
    const diffHrs = Math.floor(diffMs / (1000 * 60 * 60));

    if (diffHrs < 1) {
      const diffMins = Math.max(1, Math.floor(diffMs / (1000 * 60)));
      return (
        <span className="inline-flex items-center gap-1 text-[10px] font-bold bg-amber-50 text-amber-800 px-2 py-0.5 rounded-md border border-amber-200">
          <Timer className="h-3 w-3 text-amber-600" />
          Disappears in {diffMins} min{diffMins > 1 ? "s" : ""}
        </span>
      );
    }

    if (diffHrs < 24) {
      return (
        <span className="inline-flex items-center gap-1 text-[10px] font-bold bg-amber-50 text-amber-800 px-2 py-0.5 rounded-md border border-amber-200">
          <Timer className="h-3 w-3 text-amber-600" />
          Disappears in {diffHrs} hour{diffHrs > 1 ? "s" : ""}
        </span>
      );
    }

    const diffDays = Math.floor(diffHrs / 24);
    return (
      <span className="inline-flex items-center gap-1 text-[10px] font-bold bg-emerald-50 text-emerald-800 px-2 py-0.5 rounded-md border border-emerald-200">
        <Timer className="h-3 w-3 text-emerald-600" />
        Disappears in {diffDays} day{diffDays > 1 ? "s" : ""}
      </span>
    );
  };

  // Segregate into Officer Directives (from Admin) vs Public Civic Notices (to Citizens)
  const officerDirectives = announcements.filter(
    (a) => a.targetAudience === "department_officers" || a.targetAudience === "all_officers"
  );

  const civicNotices = announcements.filter(
    (a) => !a.targetAudience || a.targetAudience === "citizens" || a.targetAudience === "all"
  );

  const activeCivicNotices = civicNotices.filter((a) => {
    const exp = a.expiresAt || a.expiryDate;
    return !exp || new Date(exp).getTime() > Date.now();
  });

  const expiredCivicNotices = civicNotices.filter((a) => {
    const exp = a.expiresAt || a.expiryDate;
    return exp && new Date(exp).getTime() <= Date.now();
  });

  let currentList = [];
  if (channel === "directives") {
    currentList = officerDirectives;
  } else {
    if (civicFilter === "active") currentList = activeCivicNotices;
    else if (civicFilter === "expired") currentList = expiredCivicNotices;
    else currentList = civicNotices;
  }

  const isAdmin = user?.role === "admin";
  const userDeptName =
    typeof user?.department === "object"
      ? user.department?.departmentName
      : user?.department || "Municipal Officer";

  return (
    <GovernmentLayout
      title="Broadcast & Directives"
      subtitle="Supervise incoming Admin department directives and broadcast civic alerts with auto-disappear timers."
    >
      <div className="space-y-6 w-full min-w-0">
        {/* Administrator Fast-Action Banner */}
        {isAdmin && (
          <div className="rounded-2xl bg-gradient-to-r from-purple-900 to-indigo-900 p-4 text-white shadow-md flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div className="flex items-center gap-3">
              <span className="grid h-10 w-10 place-items-center rounded-xl bg-purple-500/30 border border-purple-300/40 text-purple-200 shrink-0">
                <ShieldCheck className="h-5 w-5" />
              </span>
              <div>
                <p className="text-xs font-black uppercase tracking-wider text-purple-300">
                  Administrator Privileges Active
                </p>
                <p className="text-xs text-purple-100">
                  You can issue department-targeted orders and all-hands memos from the Admin Directives HQ.
                </p>
              </div>
            </div>
            <Link
              to="/admin/directives"
              className="inline-flex items-center gap-2 rounded-xl bg-white px-4 py-2 text-xs font-extrabold text-purple-900 shadow-sm hover:bg-purple-50 transition shrink-0"
            >
              <span>Admin Directives HQ</span>
              <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </div>
        )}

        {/* Primary Channel Selector Tabs */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <button
            type="button"
            onClick={() => {
              setChannel("civic");
              setShowCreateModal(false);
            }}
            className={`p-4 rounded-2xl border text-left transition flex items-center justify-between cursor-pointer ${
              channel === "civic"
                ? "bg-blue-950/10 border-blue-600 shadow-xs ring-2 ring-blue-600/20"
                : "bg-white border-slate-200 hover:bg-slate-50"
            }`}
          >
            <div className="flex items-center gap-3">
              <span
                className={`grid h-10 w-10 place-items-center rounded-xl ${
                  channel === "civic"
                    ? "bg-blue-600 text-white"
                    : "bg-slate-100 text-slate-600"
                }`}
              >
                <Megaphone className="h-5 w-5" />
              </span>
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-extrabold text-sm text-slate-900">
                    Public Civic Broadcasts
                  </span>
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-blue-100 text-blue-700">
                    {activeCivicNotices.length} Live
                  </span>
                </div>
                <p className="text-[11px] text-slate-500">
                  Advisories and maintenance notices broadcast to citizens
                </p>
              </div>
            </div>
            {channel === "civic" && (
              <span className="h-2 w-2 rounded-full bg-blue-600" />
            )}
          </button>

          <button
            type="button"
            onClick={() => {
              setChannel("directives");
              setShowCreateModal(false);
            }}
            className={`p-4 rounded-2xl border text-left transition flex items-center justify-between cursor-pointer ${
              channel === "directives"
                ? "bg-purple-950/10 border-purple-600 shadow-xs ring-2 ring-purple-600/20"
                : "bg-white border-slate-200 hover:bg-slate-50"
            }`}
          >
            <div className="flex items-center gap-3">
              <span
                className={`grid h-10 w-10 place-items-center rounded-xl ${
                  channel === "directives"
                    ? "bg-purple-600 text-white"
                    : "bg-slate-100 text-slate-600"
                }`}
              >
                <FileText className="h-5 w-5" />
              </span>
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-extrabold text-sm text-slate-900">
                    Official Admin Directives
                  </span>
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-purple-100 text-purple-700">
                    {officerDirectives.length}
                  </span>
                </div>
                <p className="text-[11px] text-slate-500">
                  Orders &amp; memos from Central HQ for {isAdmin ? "all departments" : userDeptName}
                </p>
              </div>
            </div>
            {channel === "directives" && (
              <span className="h-2 w-2 rounded-full bg-purple-600" />
            )}
          </button>
        </div>

        {/* Action Header for Current Channel */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border-b border-slate-200 pb-3">
          <div>
            <h3 className="font-extrabold text-slate-900 text-sm">
              {channel === "directives"
                ? "📋 Incoming Executive Directives for Government Officers"
                : "📢 Public Notices Broadcasted to Citizens"}
            </h3>
            <p className="text-xs text-slate-400">
              {channel === "directives"
                ? "Memos dispatched by Central Administration requiring officer inspection or SLA compliance."
                : "Notices disappear automatically from citizens portal when expiration time elapses."}
            </p>
          </div>

          <div className="flex items-center gap-2">
            {channel === "directives" ? (
              isAdmin && (
                <Link
                  to="/admin/directives"
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-purple-700 hover:bg-purple-800 text-white text-xs font-bold transition shadow-xs"
                >
                  <Plus className="h-3.5 w-3.5" />
                  <span>Issue New Directive</span>
                </Link>
              )
            ) : (
              <Button
                type="button"
                onClick={() => setShowCreateModal(!showCreateModal)}
                className="gap-2 bg-[#0E1B38] hover:bg-[#162544] text-white font-medium text-xs rounded-lg shadow-xs cursor-pointer"
              >
                <Plus className="h-4 w-4" />
                <span>{showCreateModal ? "Close Form" : "New Civic Notice"}</span>
              </Button>
            )}
          </div>
        </div>

        {/* Collapsible Create Civic Notice Form with Disappear Expiration Duration */}
        {channel === "civic" && showCreateModal && (
          <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm space-y-4 animate-in fade-in zoom-in-98">
            <div className="border-b border-slate-100 pb-3 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <span className="grid h-9 w-9 place-items-center rounded-xl bg-blue-50 text-blue-700">
                  <Megaphone className="h-4 w-4" />
                </span>
                <div>
                  <h3 className="font-bold text-slate-900 text-sm">
                    Broadcast Notice to Citizens
                  </h3>
                  <p className="text-[11px] text-slate-400">
                    Notifies citizens instantly and auto-disappears once the set expiry duration passes
                  </p>
                </div>
              </div>
            </div>

            <form onSubmit={handleCreateAnnouncement} className="space-y-4">
              <div className="space-y-1">
                <Label className="text-xs font-bold text-slate-700">Notice Title *</Label>
                <Input
                  required
                  value={form.title}
                  onChange={(e) => setForm({ ...form, title: e.target.value })}
                  placeholder="e.g. Water Pipeline Maintenance Advisory"
                  className="h-10 text-xs font-medium"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="space-y-1">
                  <Label className="text-xs font-bold text-slate-700">Civic Category</Label>
                  <select
                    value={form.category}
                    onChange={(e) => setForm({ ...form, category: e.target.value })}
                    className="h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-xs font-semibold text-slate-700 focus:ring-2 focus:ring-blue-600 focus:outline-none"
                  >
                    {categories.map((c) => (
                      <option key={c} value={c}>
                        {c}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="space-y-1">
                  <Label className="text-xs font-bold text-slate-700">Priority Level</Label>
                  <select
                    value={form.priority}
                    onChange={(e) => setForm({ ...form, priority: e.target.value })}
                    className="h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-xs font-semibold text-slate-700 focus:ring-2 focus:ring-blue-600 focus:outline-none"
                  >
                    <option value="Low">Normal / Informational</option>
                    <option value="Medium">Medium Priority</option>
                    <option value="High">High Priority</option>
                    <option value="Critical">Critical Alert</option>
                  </select>
                </div>

                <div className="space-y-1">
                  <Label className="text-xs font-bold text-slate-700">Target Ward / Zone</Label>
                  <Input
                    value={form.targetWard}
                    onChange={(e) => setForm({ ...form, targetWard: e.target.value })}
                    placeholder="All Wards or e.g. Sector 14"
                    className="h-10 text-xs font-medium"
                  />
                </div>
              </div>

              {/* ================= AUTO-DISAPPEAR EXPIRATION DURATION ================= */}
              <div className="rounded-xl bg-slate-50 border border-slate-200/80 p-3.5 space-y-3">
                <div className="space-y-1">
                  <Label className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                    <Timer className="h-4 w-4 text-blue-600" />
                    Auto-Disappear Expiration Time (Citizens Portal Visibility) *
                  </Label>
                  <select
                    value={form.expiresIn}
                    onChange={(e) => setForm({ ...form, expiresIn: e.target.value })}
                    className="h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-xs font-semibold text-slate-800 focus:ring-2 focus:ring-blue-600 focus:outline-none"
                  >
                    <option value="1_hour">⏳ Disappear after 1 Hour (Urgent Traffic / Spot Advisory)</option>
                    <option value="6_hours">⏳ Disappear after 6 Hours (Half-Day Utility Work)</option>
                    <option value="12_hours">⏳ Disappear after 12 Hours</option>
                    <option value="24_hours">⏳ Disappear after 24 Hours (1 Day) — Recommended</option>
                    <option value="48_hours">⏳ Disappear after 48 Hours (2 Days)</option>
                    <option value="3_days">⏳ Disappear after 3 Days</option>
                    <option value="7_days">⏳ Disappear after 7 Days (1 Week)</option>
                    <option value="custom">📅 Set Custom Disappearance Date &amp; Time…</option>
                    <option value="never">♾️ Permanent (Keep visible until manually deleted)</option>
                  </select>
                  <p className="text-[11px] text-slate-500">
                    Once this duration elapses, the message will automatically disappear from the Citizen Dashboard and Citizen Notifications Center.
                  </p>
                </div>

                {form.expiresIn === "custom" && (
                  <div className="space-y-1 animate-in fade-in">
                    <Label className="text-xs font-bold text-slate-700">Select Expiry Date &amp; Time *</Label>
                    <Input
                      type="datetime-local"
                      required
                      value={form.customExpiresAt}
                      onChange={(e) => setForm({ ...form, customExpiresAt: e.target.value })}
                      className="h-10 text-xs font-medium bg-white"
                    />
                  </div>
                )}
              </div>

              <div className="space-y-1">
                <Label className="text-xs font-bold text-slate-700">Notice Description / Message *</Label>
                <Textarea
                  required
                  rows={3}
                  value={form.message}
                  onChange={(e) => setForm({ ...form, message: e.target.value })}
                  placeholder="Provide timing, affected streets, emergency alternatives, and helpline..."
                  className="text-xs leading-relaxed"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setShowCreateModal(false)}
                  className="rounded-xl text-xs font-bold h-10"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={submitting}
                  className="bg-blue-700 hover:bg-blue-800 text-white font-bold text-xs rounded-xl h-10 px-6 gap-2 shadow-xs cursor-pointer"
                >
                  <Send className="h-4 w-4" />
                  <span>{submitting ? "Broadcasting…" : "Broadcast Announcement"}</span>
                </Button>
              </div>
            </form>
          </div>
        )}

        {/* Sub-Filter for Civic Channel */}
        {channel === "civic" && (
          <div className="flex items-center gap-2 overflow-x-auto pb-1">
            <button
              type="button"
              onClick={() => setCivicFilter("all")}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition cursor-pointer border ${
                civicFilter === "all"
                  ? "bg-[#0E1B38] text-white border-[#0E1B38] shadow-xs"
                  : "bg-white text-slate-600 border-slate-200 hover:bg-slate-50"
              }`}
            >
              All Notices ({civicNotices.length})
            </button>
            <button
              type="button"
              onClick={() => setCivicFilter("active")}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition cursor-pointer border ${
                civicFilter === "active"
                  ? "bg-emerald-700 text-white border-emerald-700 shadow-xs"
                  : "bg-white text-emerald-700 border-emerald-200 hover:bg-emerald-50"
              }`}
            >
              Live for Citizens ({activeCivicNotices.length})
            </button>
            <button
              type="button"
              onClick={() => setCivicFilter("expired")}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition cursor-pointer border ${
                civicFilter === "expired"
                  ? "bg-rose-700 text-white border-rose-700 shadow-xs"
                  : "bg-white text-rose-700 border-rose-200 hover:bg-rose-50"
              }`}
            >
              Expired &amp; Disappeared ({expiredCivicNotices.length})
            </button>
          </div>
        )}

        {/* Feed List */}
        <div className="space-y-3">
          {loading ? (
            <p className="py-16 text-center text-xs text-slate-400">Loading notices…</p>
          ) : currentList.length === 0 ? (
            <div className="rounded-3xl border border-dashed border-slate-200 bg-white p-14 text-center space-y-3">
              <div
                className={`mx-auto grid h-12 w-12 place-items-center rounded-2xl ${
                  channel === "directives" ? "bg-purple-50 text-purple-600" : "bg-blue-50 text-blue-600"
                }`}
              >
                {channel === "directives" ? <FileText className="h-6 w-6" /> : <Megaphone className="h-6 w-6" />}
              </div>
              <p className="text-sm font-extrabold text-slate-800">
                {channel === "directives"
                  ? "No official directives active for your department"
                  : civicFilter === "expired"
                  ? "No expired notices. All broadcast notices are currently active."
                  : "No public civic announcements yet"}
              </p>
              <p className="text-xs text-slate-400 max-w-md mx-auto">
                {channel === "directives"
                  ? "Directives issued by Central Administration to your department or municipal officers will appear here."
                  : "Click '+ New Civic Notice' above to issue municipal advisories with auto-disappear timers."}
              </p>
            </div>
          ) : (
            currentList.map((a) => {
              const isOfficerDirective =
                a.targetAudience === "department_officers" || a.targetAudience === "all_officers";

              return (
                <div
                  key={a._id}
                  className={`p-5 rounded-2xl border transition shadow-2xs space-y-3 ${
                    isOfficerDirective
                      ? "bg-white border-purple-200/90 hover:border-purple-300"
                      : "bg-white border-slate-200 hover:border-slate-300"
                  }`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="space-y-1.5 flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        {isOfficerDirective ? (
                          <>
                            <span className="px-2 py-0.5 rounded-md text-[10px] font-black bg-purple-50 text-purple-700 border border-purple-200 uppercase tracking-wider flex items-center gap-1">
                              <Building2 className="h-3 w-3" />
                              {a.directiveType || "Official Directive"}
                            </span>
                            {a.targetAudience === "department_officers" ? (
                              <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-amber-50 text-amber-800 border border-amber-200">
                                🎯 {a.targetDepartmentName || "Department Specific"}
                              </span>
                            ) : (
                              <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-indigo-50 text-indigo-700 border border-indigo-200">
                                🌐 All Officers
                              </span>
                            )}
                          </>
                        ) : (
                          <span className="px-2 py-0.5 rounded-md text-[10px] font-black bg-blue-50 text-blue-700 border border-blue-200">
                            Public Civic Notice
                          </span>
                        )}

                        <Badge variant={a.priority}>{a.priority} Priority</Badge>

                        {/* Expiration Auto-Disappear Badge */}
                        {!isOfficerDirective && getExpirationBadge(a)}

                        {a.deadlineDate && (
                          <span className="inline-flex items-center gap-1 text-[10px] font-bold bg-rose-50 text-rose-700 px-2 py-0.5 rounded-md border border-rose-200">
                            <Clock className="h-3 w-3" />
                            Due: {new Date(a.deadlineDate).toLocaleDateString("en-IN", {
                              day: "numeric",
                              month: "short",
                            })}
                          </span>
                        )}

                        <span className="text-[11px] text-slate-400">
                          {new Date(a.createdAt).toLocaleDateString("en-IN", {
                            day: "numeric",
                            month: "short",
                            year: "numeric",
                          })}
                        </span>
                      </div>

                      <h4 className="font-extrabold text-slate-900 text-sm leading-snug">
                        {a.title}
                      </h4>
                    </div>

                    {/* Admin or Officer can delete notice */}
                    {(isAdmin || a.targetAudience === "citizens" || !a.targetAudience) && (
                      <button
                        type="button"
                        onClick={() => handleDeleteAnnouncement(a._id)}
                        className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition cursor-pointer"
                        title="Remove announcement"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    )}
                  </div>

                  <p className="text-xs text-slate-600 leading-relaxed font-normal whitespace-pre-line">
                    {a.message}
                  </p>

                  <div className="flex items-center justify-between pt-2.5 border-t border-slate-100 text-[11px] text-slate-400 font-medium">
                    <span>
                      {isOfficerDirective
                        ? `Scope: ${a.targetDepartmentName || "All Municipal Officers"}`
                        : `Target Ward: ${a.targetWard || "All Wards"}`}
                    </span>
                    <span>
                      Issued by:{" "}
                      <strong className="text-slate-600">
                        {a.createdBy?.name || (isOfficerDirective ? "Anita Deshmukh (Admin HQ)" : "Chief Officer")}
                      </strong>
                    </span>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </GovernmentLayout>
  );
}

export default Announcements;
