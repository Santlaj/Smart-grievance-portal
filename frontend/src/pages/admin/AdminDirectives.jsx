import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import {
  Megaphone,
  Shield,
  Building2,
  Users,
  Send,
  Calendar,
  AlertTriangle,
  Clock,
  Trash2,
  CheckCircle2,
  RefreshCw,
  Plus,
  Filter,
  FileText,
  AlertCircle,
  Sparkles,
  Droplets,
  Compass,
  Zap,
  ShieldAlert,
} from "lucide-react";
import { toast } from "sonner";
import AdminLayout from "../../components/admin/AdminLayout";
import { Button } from "../../components/ui/Button";
import { Input, Textarea, Label, Badge } from "../../components/ui/Input";
import announcementService from "../../services/announcementService";
import { useLanguage } from "../../context/LanguageContext";

const CANONICAL_DEPARTMENTS = [
  { name: "Water Supply Department", label: "💧 Water Supply Department (Priya Verma)", officer: "Priya Verma" },
  { name: "Roads & Infrastructure", label: "🛣️ Roads & Infrastructure (Rajesh Sharma)", officer: "Rajesh Sharma" },
  { name: "Sanitation Department", label: "🗑️ Sanitation Department (Amit Kumar)", officer: "Amit Kumar" },
  { name: "Electricity Department", label: "⚡ Electricity Department (Sunita Rao)", officer: "Sunita Rao" },
  { name: "Public Safety Department", label: "🛡️ Public Safety Department (Meena Joshi)", officer: "Meena Joshi" },
];

export function AdminDirectives() {
  const { t } = useLanguage();
  const [directives, setDirectives] = useState([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [selectedAudienceFilter, setSelectedAudienceFilter] = useState("all");

  // Directive Form State
  const [form, setForm] = useState({
    title: "",
    message: "",
    targetAudience: "department_officers", // "department_officers" | "all_officers"
    targetDepartmentName: "Water Supply Department",
    directiveType: "Inspection Order",
    priority: "High",
    deadlineDate: "",
  });

  const loadDirectives = async () => {
    setLoading(true);
    try {
      const data = await announcementService.getAnnouncements();
      if (Array.isArray(data)) {
        // Filter out purely citizen public notices to show officer directives
        setDirectives(data);
      }
    } catch {
      toast.error("Failed to load directives.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadDirectives();
  }, []);

  const handleCreateDirective = async (e) => {
    e.preventDefault();
    if (!form.title.trim() || !form.message.trim()) {
      toast.error("Please provide both directive title and instructions.");
      return;
    }

    setSubmitting(true);
    try {
      const payload = {
        title: form.title.trim(),
        message: form.message.trim(),
        targetAudience: form.targetAudience,
        targetDepartmentName: form.targetAudience === "department_officers" ? form.targetDepartmentName : "",
        category: form.targetAudience === "department_officers" ? form.targetDepartmentName : "Central Administration",
        directiveType: form.directiveType,
        priority: form.priority,
        deadlineDate: form.deadlineDate ? new Date(form.deadlineDate).toISOString() : null,
        expiresAt: form.deadlineDate ? new Date(form.deadlineDate).toISOString() : null,
      };

      await announcementService.createAnnouncement(payload);
      toast.success(
        form.targetAudience === "department_officers"
          ? `Directive dispatched directly to ${form.targetDepartmentName} officers!`
          : "All-Hands Administrative Directive dispatched to all municipal officers!"
      );

      setForm({
        title: "",
        message: "",
        targetAudience: "department_officers",
        targetDepartmentName: "Water Supply Department",
        directiveType: "Inspection Order",
        priority: "High",
        deadlineDate: "",
      });
      setShowModal(false);
      await loadDirectives();
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to issue directive.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id) => {
    try {
      await announcementService.deleteAnnouncement(id);
      toast.success("Directive revoked successfully.");
      setDirectives((prev) => prev.filter((d) => d._id !== id));
    } catch {
      toast.error("Failed to delete directive.");
    }
  };

  const filteredDirectives = directives.filter((d) => {
    if (selectedAudienceFilter === "department") {
      return d.targetAudience === "department_officers";
    }
    if (selectedAudienceFilter === "all_officers") {
      return d.targetAudience === "all_officers";
    }
    return true;
  });

  return (
    <AdminLayout>
      <div className="space-y-6">
        {/* Banner */}
        <div className="rounded-3xl border border-purple-200/90 bg-gradient-to-r from-[#0B152B] via-[#121B3B] to-[#1C1645] p-6 sm:p-8 text-white shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2 max-w-2xl">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-purple-500/20 border border-purple-400/30 px-3 py-1 text-xs font-bold text-purple-200">
              <Megaphone className="h-3.5 w-3.5 text-purple-300" />
              Administrative Officer Broadcast Commander
            </span>
            <h1 className="text-2xl sm:text-3xl font-black tracking-tight leading-tight">
              Executive Directives &amp; Department Memos
            </h1>
            <p className="text-xs sm:text-sm text-slate-300 leading-relaxed font-normal">
              Convey official administrative orders, field inspection mandates, SLA warnings, and policy directives directly to specific department officers.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2.5 shrink-0">
            <Button
              variant="outline"
              size="sm"
              onClick={loadDirectives}
              disabled={loading}
              className="bg-white/10 hover:bg-white/20 text-white border-white/20 font-bold rounded-xl text-xs"
            >
              <RefreshCw className={`h-3.5 w-3.5 mr-1.5 ${loading ? "animate-spin" : ""}`} />
              <span>Refresh</span>
            </Button>

            <Button
              size="sm"
              onClick={() => setShowModal(true)}
              className="bg-purple-600 hover:bg-purple-700 text-white font-bold rounded-xl text-xs shadow-md shadow-purple-600/30 gap-1.5"
            >
              <Plus className="h-4 w-4" />
              <span>Issue New Officer Directive</span>
            </Button>
          </div>
        </div>

        {/* Filter Bar */}
        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-1.5 overflow-x-auto">
            <button
              type="button"
              onClick={() => setSelectedAudienceFilter("all")}
              className={`px-3.5 py-1.5 rounded-xl font-bold transition cursor-pointer shrink-0 ${
                selectedAudienceFilter === "all"
                  ? "bg-purple-600 text-white shadow-xs"
                  : "bg-slate-100 text-slate-600 hover:bg-slate-200"
              }`}
            >
              All Directives ({directives.length})
            </button>
            <button
              type="button"
              onClick={() => setSelectedAudienceFilter("department")}
              className={`px-3.5 py-1.5 rounded-xl font-bold transition cursor-pointer shrink-0 ${
                selectedAudienceFilter === "department"
                  ? "bg-purple-600 text-white shadow-xs"
                  : "bg-slate-100 text-slate-600 hover:bg-slate-200"
              }`}
            >
              Department-Specific Orders
            </button>
            <button
              type="button"
              onClick={() => setSelectedAudienceFilter("all_officers")}
              className={`px-3.5 py-1.5 rounded-xl font-bold transition cursor-pointer shrink-0 ${
                selectedAudienceFilter === "all_officers"
                  ? "bg-purple-600 text-white shadow-xs"
                  : "bg-slate-100 text-slate-600 hover:bg-slate-200"
              }`}
            >
              All-Hands Officer Directives
            </button>
          </div>

          <span className="text-slate-400 text-[11px] font-medium">
            Direct in-app notification alerts dispatched to targeted officers
          </span>
        </div>

        {/* Directives Stream List */}
        <div className="space-y-4">
          {loading ? (
            <div className="rounded-3xl border bg-white p-12 text-center text-slate-400 space-y-2">
              <RefreshCw className="h-6 w-6 animate-spin mx-auto text-purple-600" />
              <p className="text-xs font-bold">Loading executive directives…</p>
            </div>
          ) : filteredDirectives.length === 0 ? (
            <div className="rounded-3xl border bg-white p-12 text-center text-slate-400 space-y-2">
              <Megaphone className="h-8 w-8 mx-auto text-slate-300" />
              <p className="text-sm font-bold text-slate-700">No active directives found</p>
              <p className="text-xs text-slate-400">Click "Issue New Officer Directive" to send a targeted memo.</p>
            </div>
          ) : (
            filteredDirectives.map((d) => {
              const isDeptTargeted = d.targetAudience === "department_officers";
              const isAllOfficers = d.targetAudience === "all_officers";
              const targetTitle = isDeptTargeted
                ? `🏢 Target: ${d.targetDepartmentName || d.category || "Department Officers"}`
                : isAllOfficers
                ? "🏛️ Target: All Municipal Officers (5 Divisions)"
                : "🌐 Target: Public Civic Notice";

              return (
                <div
                  key={d._id}
                  className="rounded-3xl border border-slate-200 bg-white p-6 shadow-card hover:shadow-md transition-all space-y-4"
                >
                  <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                    <div className="space-y-1.5">
                      <div className="flex flex-wrap items-center gap-2">
                        <span
                          className={`text-[10px] font-extrabold uppercase tracking-wider px-2.5 py-0.5 rounded-md border ${
                            isDeptTargeted
                              ? "bg-purple-50 text-purple-800 border-purple-200"
                              : isAllOfficers
                              ? "bg-blue-50 text-blue-800 border-blue-200"
                              : "bg-slate-100 text-slate-700 border-slate-200"
                          }`}
                        >
                          {targetTitle}
                        </span>

                        <span className="text-[10px] font-bold text-slate-600 bg-slate-100 px-2 py-0.5 rounded-md">
                          {d.directiveType || "Official Memo"}
                        </span>

                        <Badge variant={d.priority || "High"}>{d.priority || "High"} Priority</Badge>
                      </div>

                      <h3 className="text-lg font-black text-slate-900 tracking-tight leading-snug">
                        {d.title}
                      </h3>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      <span className="text-xs text-slate-400 font-medium flex items-center gap-1.5">
                        <Clock className="h-3.5 w-3.5" />
                        {d.createdAt ? new Date(d.createdAt).toLocaleDateString("en-IN") : "Recent"}
                      </span>
                      <button
                        type="button"
                        onClick={() => handleDelete(d._id)}
                        className="p-1.5 rounded-xl text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition cursor-pointer"
                        title="Revoke directive"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </div>

                  {/* Message Body */}
                  <div className="p-4 rounded-2xl bg-slate-50 border border-slate-100 text-xs text-slate-700 leading-relaxed whitespace-pre-line">
                    {d.message}
                  </div>

                  {/* Footer metadata */}
                  <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-slate-100 text-xs text-slate-500">
                    <div className="flex items-center gap-4">
                      <span className="font-medium">
                        Issued by: <strong className="text-slate-800">Municipal Central Administration</strong>
                      </span>
                      {d.deadlineDate && (
                        <span className="text-amber-700 font-bold flex items-center gap-1 bg-amber-50 px-2.5 py-0.5 rounded-md border border-amber-200">
                          <AlertTriangle className="h-3 w-3" />
                          Compliance Deadline: {new Date(d.deadlineDate).toLocaleDateString("en-IN")}
                        </span>
                      )}
                    </div>

                    <span className="text-[11px] text-emerald-600 font-bold flex items-center gap-1">
                      <CheckCircle2 className="h-3.5 w-3.5" />
                      In-app alerts dispatched to officers
                    </span>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Modal: Issue New Directive */}
        {showModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in">
            <div className="relative max-w-lg w-full bg-white rounded-3xl p-6 sm:p-7 shadow-2xl border border-slate-200 space-y-5">
              <div className="flex items-center justify-between border-b pb-3">
                <div className="flex items-center gap-2.5">
                  <span className="grid h-9 w-9 place-items-center rounded-xl bg-purple-100 text-purple-700">
                    <Megaphone className="h-5 w-5" />
                  </span>
                  <div>
                    <h3 className="font-extrabold text-slate-900 text-base leading-tight">
                      Issue Officer Administrative Directive
                    </h3>
                    <p className="text-[11px] text-slate-400">
                      Dispatches high-priority internal memos &amp; notifications to government officers.
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="rounded-full bg-slate-100 p-1.5 text-slate-500 hover:bg-slate-200"
                >
                  ✕
                </button>
              </div>

              <form onSubmit={handleCreateDirective} className="space-y-4 text-xs">
                {/* 1. Target Audience Switcher */}
                <div className="space-y-1.5">
                  <Label className="text-[11px] font-bold text-slate-700">Target Recipients *</Label>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => setForm({ ...form, targetAudience: "department_officers" })}
                      className={`p-3 rounded-xl border text-left font-bold transition cursor-pointer ${
                        form.targetAudience === "department_officers"
                          ? "bg-purple-50 border-purple-400 text-purple-900 shadow-xs"
                          : "bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100"
                      }`}
                    >
                      <span className="block text-xs font-black">🏢 Department-Wise Officers</span>
                      <span className="block text-[10px] text-slate-400 font-normal">
                        Specific division (Water, Roads, etc.)
                      </span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setForm({ ...form, targetAudience: "all_officers" })}
                      className={`p-3 rounded-xl border text-left font-bold transition cursor-pointer ${
                        form.targetAudience === "all_officers"
                          ? "bg-purple-50 border-purple-400 text-purple-900 shadow-xs"
                          : "bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100"
                      }`}
                    >
                      <span className="block text-xs font-black">🏛️ All Municipal Officers</span>
                      <span className="block text-[10px] text-slate-400 font-normal">
                        All 5 departments simultaneously
                      </span>
                    </button>
                  </div>
                </div>

                {/* 2. Department Selector if Department-Wise */}
                {form.targetAudience === "department_officers" && (
                  <div className="space-y-1 animate-in fade-in">
                    <Label className="text-[11px] font-bold text-slate-700">Target Department *</Label>
                    <select
                      value={form.targetDepartmentName}
                      onChange={(e) => setForm({ ...form, targetDepartmentName: e.target.value })}
                      className="h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-xs font-semibold text-slate-800 focus:ring-2 focus:ring-purple-600"
                    >
                      {CANONICAL_DEPARTMENTS.map((dept) => (
                        <option key={dept.name} value={dept.name}>
                          {dept.label}
                        </option>
                      ))}
                    </select>
                  </div>
                )}

                {/* 3. Directive Title */}
                <div className="space-y-1">
                  <Label className="text-[11px] font-bold text-slate-700">Directive Title / Order Subject *</Label>
                  <Input
                    required
                    value={form.title}
                    onChange={(e) => setForm({ ...form, title: e.target.value })}
                    placeholder="e.g. Mandatory Inspection of Water Main Line Feeder in Sector 14"
                    className="text-xs font-medium"
                  />
                </div>

                {/* 4. Type & Priority 2-Col */}
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <Label className="text-[11px] font-bold text-slate-700">Directive Type</Label>
                    <select
                      value={form.directiveType}
                      onChange={(e) => setForm({ ...form, directiveType: e.target.value })}
                      className="h-9 w-full rounded-xl border border-slate-200 bg-white px-2.5 text-xs font-semibold text-slate-700"
                    >
                      <option value="Inspection Order">Inspection Order</option>
                      <option value="SLA Escalation">SLA Escalation Warning</option>
                      <option value="Official Memo">Official Administrative Memo</option>
                      <option value="Policy Directive">Policy Directive</option>
                      <option value="Rapid Response Order">Rapid Response Order</option>
                    </select>
                  </div>

                  <div className="space-y-1">
                    <Label className="text-[11px] font-bold text-slate-700">Priority Level</Label>
                    <select
                      value={form.priority}
                      onChange={(e) => setForm({ ...form, priority: e.target.value })}
                      className="h-9 w-full rounded-xl border border-slate-200 bg-white px-2.5 text-xs font-semibold text-slate-700"
                    >
                      <option value="Critical">Critical (Immediate Field Action)</option>
                      <option value="High">High Priority</option>
                      <option value="Medium">Medium Priority</option>
                      <option value="Low">Low / Informational</option>
                    </select>
                  </div>
                </div>

                {/* 5. Instructions Message */}
                <div className="space-y-1">
                  <Label className="text-[11px] font-bold text-slate-700">Directive Instructions &amp; Action Plan *</Label>
                  <Textarea
                    required
                    rows={4}
                    value={form.message}
                    onChange={(e) => setForm({ ...form, message: e.target.value })}
                    placeholder="Provide specific instructions, affected sectors, safety protocols, reporting deadlines, and compliance requirements..."
                    className="text-xs leading-relaxed"
                  />
                </div>

                {/* 6. Deadline */}
                <div className="space-y-1">
                  <Label className="text-[11px] font-bold text-slate-700">Compliance Deadline Date (Optional)</Label>
                  <Input
                    type="date"
                    value={form.deadlineDate}
                    onChange={(e) => setForm({ ...form, deadlineDate: e.target.value })}
                    className="text-xs"
                  />
                </div>

                <div className="pt-3 flex justify-end gap-2 border-t">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => setShowModal(false)}
                    className="font-bold rounded-xl"
                  >
                    Cancel
                  </Button>
                  <Button
                    type="submit"
                    size="sm"
                    disabled={submitting}
                    className="bg-purple-600 hover:bg-purple-700 text-white font-bold rounded-xl gap-1.5 shadow-md shadow-purple-600/30"
                  >
                    <Send className="h-3.5 w-3.5" />
                    <span>{submitting ? "Dispatching…" : "Dispatch Directive to Officers"}</span>
                  </Button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </AdminLayout>
  );
}

export default AdminDirectives;
