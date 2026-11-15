import React, { useEffect, useState, useMemo } from "react";
import { Link } from "react-router-dom";
import {
  Users,
  Building2,
  PlusCircle,
  Search,
  CheckCircle2,
  Mail,
  Phone,
  MapPin,
  Star,
  RefreshCw,
  X,
  Shield,
  ArrowRight,
  ShieldAlert,
  ArrowRightLeft,
  KeyRound,
  Send,
  AlertTriangle,
  Lock,
  Unlock,
  ClipboardList,
  Compass,
  Droplets,
  Trash2,
  Zap,
  FolderOpen,
  Sliders,
  Check,
} from "lucide-react";
import { toast } from "sonner";
import AdminLayout from "../../components/admin/AdminLayout";
import { Button } from "../../components/ui/Button";
import { Input, Label, Textarea } from "../../components/ui/Input";
import adminService from "../../services/adminService";

const CANONICAL_DEPARTMENTS = [
  { name: "Roads & Infrastructure", id: "roads", icon: Compass, color: "text-amber-600 bg-amber-50 border-amber-200" },
  { name: "Water Supply Department", id: "water", icon: Droplets, color: "text-blue-600 bg-blue-50 border-blue-200" },
  { name: "Sanitation Department", id: "sanitation", icon: Trash2, color: "text-emerald-600 bg-emerald-50 border-emerald-200" },
  { name: "Electricity Department", id: "electricity", icon: Zap, color: "text-amber-500 bg-amber-50 border-amber-200" },
  { name: "Public Safety Department", id: "safety", icon: ShieldAlert, color: "text-rose-600 bg-rose-50 border-rose-200" },
];

function getDeptKey(name = "") {
  const lower = name.toLowerCase();
  if (lower.includes("road") || lower.includes("pothole") || lower.includes("infra")) return "roads";
  if (lower.includes("water") || lower.includes("drain") || lower.includes("jal")) return "water";
  if (lower.includes("sanitation") || lower.includes("garbage") || lower.includes("waste")) return "sanitation";
  if (lower.includes("electric") || lower.includes("power")) return "electricity";
  if (lower.includes("safety") || lower.includes("hazard")) return "safety";
  return "other";
}

export function AdminOfficers() {
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState(null);
  const [search, setSearch] = useState("");
  const [selectedDeptFilter, setSelectedDeptFilter] = useState("All");

  // Selected Officer for Action Modals
  const [activeOfficer, setActiveOfficer] = useState(null);
  const [actionType, setActionType] = useState(null); // 'transfer' | 'directive' | 'password' | 'suspend' | null
  const [actionSubmitting, setActionSubmitting] = useState(false);

  // Transfer State
  const [newDepartment, setNewDepartment] = useState("Roads & Infrastructure");

  // Directive State
  const [directiveForm, setDirectiveForm] = useState({
    title: "",
    message: "",
    priority: "High",
    directiveType: "Official Memo",
    deadlineDate: "",
  });

  // Password Reset State
  const [newPassword, setNewPassword] = useState("");

  // Create Officer Modal
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [creating, setCreating] = useState(false);
  const [createForm, setCreateForm] = useState({
    name: "",
    email: "",
    password: "",
    department: "Roads & Infrastructure",
    phone: "",
    address: "",
  });

  const loadData = async () => {
    setLoading(true);
    try {
      const data = await adminService.getStats();
      setStats(data);
    } catch {
      toast.error("Failed to load officers directory.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const officers = stats?.officerPerformance || [];

  // Group officers by canonical department
  const departmentOfficersMap = useMemo(() => {
    const map = {
      roads: [],
      water: [],
      sanitation: [],
      electricity: [],
      safety: [],
      other: [],
    };

    officers.forEach((off) => {
      const key = getDeptKey(off.department);
      if (map[key]) {
        map[key].push(off);
      } else {
        map.other.push(off);
      }
    });

    return map;
  }, [officers]);

  // Filtered officers list
  const filteredOfficers = useMemo(() => {
    return officers.filter((off) => {
      const matchesSearch =
        off.name.toLowerCase().includes(search.toLowerCase()) ||
        off.email.toLowerCase().includes(search.toLowerCase()) ||
        off.department.toLowerCase().includes(search.toLowerCase());

      const matchesDept =
        selectedDeptFilter === "All" ||
        getDeptKey(off.department) === selectedDeptFilter;

      return matchesSearch && matchesDept;
    });
  }, [officers, search, selectedDeptFilter]);

  // POWER 1: TRANSFER DEPARTMENT
  const handleTransferDepartment = async () => {
    if (!activeOfficer) return;
    setActionSubmitting(true);
    try {
      await adminService.updateOfficer(activeOfficer._id, {
        department: newDepartment,
      });
      toast.success(`Transferred ${activeOfficer.name} to ${newDepartment}!`);
      setActionType(null);
      await loadData();
    } catch (err) {
      toast.error(err.response?.data?.message || err.message || "Failed to transfer officer");
    } finally {
      setActionSubmitting(false);
    }
  };

  // POWER 2: TOGGLE SUSPEND / RESTORE
  const handleToggleSuspend = async (officer) => {
    const nextStatus = !officer.isSuspended;
    try {
      await adminService.updateOfficer(officer._id, {
        isSuspended: nextStatus,
      });
      toast.success(
        nextStatus
          ? `Officer ${officer.name} has been SUSPENDED from portal access.`
          : `Officer ${officer.name} commission RESTORED to active service.`
      );
      await loadData();
    } catch (err) {
      toast.error(err.response?.data?.message || err.message || "Status update failed");
    }
  };

  // POWER 3: RESET PASSWORD
  const handleResetPassword = async () => {
    if (!activeOfficer || !newPassword || newPassword.length < 6) {
      toast.error("Password must be at least 6 characters long.");
      return;
    }
    setActionSubmitting(true);
    try {
      await adminService.updateOfficer(activeOfficer._id, {
        newPassword,
      });
      toast.success(`Access password for ${activeOfficer.name} reset successfully!`);
      setActionType(null);
      setNewPassword("");
    } catch (err) {
      toast.error(err.response?.data?.message || err.message || "Password reset failed");
    } finally {
      setActionSubmitting(false);
    }
  };

  // POWER 4: SEND ADMINISTRATIVE DIRECTIVE TO OFFICER
  const handleSendDirective = async () => {
    if (!activeOfficer || !directiveForm.title.trim() || !directiveForm.message.trim()) {
      toast.error("Please provide both directive title and instructions.");
      return;
    }
    setActionSubmitting(true);
    try {
      await adminService.sendDirective({
        title: directiveForm.title.trim(),
        message: directiveForm.message.trim(),
        priority: directiveForm.priority,
        directiveType: directiveForm.directiveType,
        targetAudience: "department_officers",
        targetDepartmentName: activeOfficer.department,
        deadlineDate: directiveForm.deadlineDate,
      });
      toast.success(`Executive Directive issued to ${activeOfficer.name} (${activeOfficer.department})!`);
      setActionType(null);
      setDirectiveForm({
        title: "",
        message: "",
        priority: "High",
        directiveType: "Official Memo",
        deadlineDate: "",
      });
    } catch (err) {
      toast.error(err.response?.data?.message || err.message || "Failed to dispatch directive");
    } finally {
      setActionSubmitting(false);
    }
  };

  // POWER 5: COMMISSION NEW OFFICER
  const handleCreateOfficer = async (e) => {
    e.preventDefault();
    if (!createForm.name || !createForm.email || !createForm.password) {
      toast.error("Please fill in Name, Email, and Password.");
      return;
    }
    setCreating(true);
    try {
      await adminService.createOfficer({
        name: createForm.name.trim(),
        email: createForm.email.trim().toLowerCase(),
        password: createForm.password,
        department: createForm.department,
        phone: createForm.phone.trim(),
        address: createForm.address.trim(),
      });
      toast.success(`Officer ${createForm.name} commissioned successfully!`);
      setShowCreateModal(false);
      setCreateForm({
        name: "",
        email: "",
        password: "",
        department: "Roads & Infrastructure",
        phone: "",
        address: "",
      });
      await loadData();
    } catch (err) {
      toast.error(err.response?.data?.message || err.message || "Failed to create officer");
    } finally {
      setCreating(false);
    }
  };

  return (
    <AdminLayout>
      <div className="space-y-6">
        {/* ================= 1. EXECUTIVE HEADER BANNER ================= */}
        <div className="rounded-3xl border border-purple-200/90 bg-gradient-to-r from-[#0E1528] via-[#1A1942] to-[#2D1B4E] p-6 sm:p-8 text-white shadow-xl relative overflow-hidden">
          <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div className="space-y-2 max-w-2xl">
              <div className="flex flex-wrap items-center gap-2">
                <span className="inline-flex items-center gap-1.5 rounded-full bg-purple-500/20 border border-purple-400/30 px-3 py-1 text-xs font-bold text-purple-200">
                  <Shield className="h-3.5 w-3.5 text-purple-300" />
                  Central Command &amp; Governance
                </span>
                <span className="rounded-full bg-emerald-500/20 border border-emerald-400/30 px-2.5 py-0.5 text-[11px] font-bold text-emerald-300">
                  {officers.length} Commissioned Officers Active
                </span>
              </div>
              <h1 className="text-2xl sm:text-3xl font-black tracking-tight leading-tight">
                Department Officers Command &amp; Supervisory Powers
              </h1>
              <p className="text-xs sm:text-sm text-slate-300 leading-relaxed font-normal">
                Inspect field officers department-wise, transfer jurisdictions, dispatch executive directives, reset credentials, or suspend personnel in real-time.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2.5 shrink-0">
              <Button
                variant="outline"
                size="sm"
                onClick={loadData}
                disabled={loading}
                className="bg-white/10 hover:bg-white/20 text-white border-white/20 font-bold rounded-xl text-xs"
              >
                <RefreshCw className={`h-3.5 w-3.5 mr-1.5 ${loading ? "animate-spin" : ""}`} />
                <span>Refresh Directory</span>
              </Button>
              <Button
                size="sm"
                onClick={() => setShowCreateModal(true)}
                className="bg-purple-600 hover:bg-purple-700 text-white font-bold rounded-xl text-xs shadow-md shadow-purple-600/30"
              >
                <PlusCircle className="h-4 w-4 mr-1.5" />
                <span>Commission New Officer</span>
              </Button>
            </div>
          </div>
        </div>

        {/* ================= 2. DEPARTMENT TABS & SEARCH ================= */}
        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="flex items-center gap-2 overflow-x-auto text-xs pb-1 lg:pb-0">
            <button
              type="button"
              onClick={() => setSelectedDeptFilter("All")}
              className={`px-3.5 py-2 rounded-xl font-bold transition cursor-pointer shrink-0 flex items-center gap-1.5 ${
                selectedDeptFilter === "All"
                  ? "bg-purple-600 text-white shadow-xs"
                  : "bg-slate-100 text-slate-600 hover:bg-slate-200"
              }`}
            >
              <Users className="h-3.5 w-3.5" />
              <span>All Officers ({officers.length})</span>
            </button>

            {CANONICAL_DEPARTMENTS.map((dept) => {
              const Icon = dept.icon;
              const count = departmentOfficersMap[dept.id]?.length || 0;
              return (
                <button
                  key={dept.id}
                  type="button"
                  onClick={() => setSelectedDeptFilter(dept.id)}
                  className={`px-3.5 py-2 rounded-xl font-bold transition cursor-pointer shrink-0 flex items-center gap-1.5 ${
                    selectedDeptFilter === dept.id
                      ? "bg-purple-600 text-white shadow-xs"
                      : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                  }`}
                >
                  <Icon className="h-3.5 w-3.5" />
                  <span>{dept.name.split(" ")[0]} ({count})</span>
                </button>
              );
            })}
          </div>

          <div className="relative w-full lg:w-72">
            <Search className="absolute left-3.5 top-2.5 h-4 w-4 text-slate-400" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search officer name, email, department…"
              className="h-9 w-full pl-9 pr-3 text-xs rounded-xl border border-slate-200 bg-slate-50 placeholder:text-slate-400 focus:outline-none focus:border-purple-500 focus:bg-white transition"
            />
          </div>
        </div>

        {/* ================= 3. DEPARTMENT-WISE OFFICERS SECTIONS ================= */}
        {selectedDeptFilter === "All" ? (
          // View by Department Hierarchy
          <div className="space-y-8">
            {CANONICAL_DEPARTMENTS.map((dept) => {
              const Icon = dept.icon;
              const deptOfficersList = departmentOfficersMap[dept.id] || [];
              const totalCases = deptOfficersList.reduce((acc, o) => acc + (o.totalCases || 0), 0);
              const resolvedCases = deptOfficersList.reduce((acc, o) => acc + (o.resolvedCases || 0), 0);
              const efficiency = totalCases > 0 ? Math.round((resolvedCases / totalCases) * 100) : 100;

              return (
                <div key={dept.id} className="space-y-4">
                  {/* Department Division Header */}
                  <div className="flex flex-wrap items-center justify-between gap-3 p-4 rounded-2xl bg-white border border-slate-200/90 shadow-2xs">
                    <div className="flex items-center gap-3">
                      <div className={`grid h-10 w-10 place-items-center rounded-xl border ${dept.color}`}>
                        <Icon className="h-5 w-5" />
                      </div>
                      <div>
                        <h2 className="text-base font-extrabold text-slate-900 leading-tight">
                          {dept.name}
                        </h2>
                        <p className="text-xs text-slate-500 mt-0.5">
                          {deptOfficersList.length} Commissioned Staff &bull; {totalCases} Total Grievances Handled
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold px-2.5 py-1 rounded-lg bg-emerald-50 text-emerald-700 border border-emerald-200">
                        {efficiency}% Division Efficiency
                      </span>
                      <Button
                        size="xs"
                        variant="outline"
                        onClick={() => {
                          setCreateForm((prev) => ({ ...prev, department: dept.name }));
                          setShowCreateModal(true);
                        }}
                        className="text-xs font-bold rounded-lg border-dashed"
                      >
                        <PlusCircle className="h-3.5 w-3.5 mr-1 text-purple-600" />
                        <span>Add Officer</span>
                      </Button>
                    </div>
                  </div>

                  {/* Officer Cards Grid */}
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                    {deptOfficersList.length === 0 ? (
                      <div className="col-span-full rounded-2xl border border-dashed border-slate-200 p-8 text-center text-slate-400 bg-slate-50/50">
                        <Users className="h-6 w-6 mx-auto text-slate-300 mb-1" />
                        <p className="text-xs font-bold text-slate-600">No officers assigned to {dept.name}</p>
                        <button
                          onClick={() => {
                            setCreateForm((prev) => ({ ...prev, department: dept.name }));
                            setShowCreateModal(true);
                          }}
                          className="text-xs text-purple-600 font-bold hover:underline mt-1 inline-block"
                        >
                          Commission First Officer
                        </button>
                      </div>
                    ) : (
                      deptOfficersList.map((off) => renderOfficerCard(off))
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          // Filtered View for Single Selected Department
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {filteredOfficers.length === 0 ? (
              <div className="col-span-full rounded-3xl border border-slate-200 bg-white p-12 text-center text-slate-400">
                <Users className="h-8 w-8 mx-auto text-slate-300 mb-2" />
                <p className="text-base font-bold text-slate-700">No officers found in this view</p>
                <p className="text-xs text-slate-400 mt-1">Try switching departments or clearing search.</p>
              </div>
            ) : (
              filteredOfficers.map((off) => renderOfficerCard(off))
            )}
          </div>
        )}

        {/* ================= MODAL 1: TRANSFER DEPARTMENT ================= */}
        {actionType === "transfer" && activeOfficer && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in">
            <div className="relative max-w-md w-full bg-white rounded-3xl p-6 shadow-2xl border border-slate-200 space-y-4">
              <div className="flex items-center justify-between border-b pb-3">
                <div className="flex items-center gap-2">
                  <ArrowRightLeft className="h-5 w-5 text-purple-600" />
                  <h3 className="font-extrabold text-slate-900 text-base">
                    Transfer Officer Jurisdiction
                  </h3>
                </div>
                <button
                  type="button"
                  onClick={() => setActionType(null)}
                  className="rounded-full bg-slate-100 p-1.5 text-slate-500 hover:bg-slate-200"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              <div className="p-3 rounded-2xl bg-purple-50/70 border border-purple-100 text-xs text-purple-900 space-y-1">
                <p className="font-bold">Officer: {activeOfficer.name}</p>
                <p className="text-purple-700">Current Assignment: <span className="font-bold">{activeOfficer.department}</span></p>
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-bold text-slate-700">Target Municipal Department</Label>
                <select
                  value={newDepartment}
                  onChange={(e) => setNewDepartment(e.target.value)}
                  className="w-full h-10 px-3 text-xs rounded-xl border border-slate-200 bg-white font-medium focus:outline-none focus:border-purple-600"
                >
                  {CANONICAL_DEPARTMENTS.map((d) => (
                    <option key={d.name} value={d.name}>{d.name}</option>
                  ))}
                </select>
                <p className="text-[11px] text-slate-400">
                  Officer will immediately gain authorization to review and resolve grievances in the target department.
                </p>
              </div>

              <div className="flex items-center justify-end gap-2.5 pt-3 border-t">
                <Button variant="outline" size="sm" onClick={() => setActionType(null)} className="rounded-xl text-xs font-bold">
                  Cancel
                </Button>
                <Button
                  size="sm"
                  onClick={handleTransferDepartment}
                  disabled={actionSubmitting}
                  className="bg-purple-600 hover:bg-purple-700 text-white rounded-xl text-xs font-bold"
                >
                  {actionSubmitting ? "Executing Transfer..." : "Confirm Transfer"}
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* ================= MODAL 2: ISSUE DIRECTIVE / MEMO ================= */}
        {actionType === "directive" && activeOfficer && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in">
            <div className="relative max-w-lg w-full bg-white rounded-3xl p-6 shadow-2xl border border-slate-200 space-y-4">
              <div className="flex items-center justify-between border-b pb-3">
                <div className="flex items-center gap-2">
                  <Send className="h-5 w-5 text-purple-600" />
                  <h3 className="font-extrabold text-slate-900 text-base">
                    Dispatch Executive Directive
                  </h3>
                </div>
                <button
                  type="button"
                  onClick={() => setActionType(null)}
                  className="rounded-full bg-slate-100 p-1.5 text-slate-500 hover:bg-slate-200"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              <div className="p-3 rounded-2xl bg-amber-50/80 border border-amber-200 text-xs text-amber-900 space-y-1">
                <p className="font-bold flex items-center gap-1.5">
                  <AlertTriangle className="h-3.5 w-3.5 text-amber-600" />
                  Official Notice to {activeOfficer.name} ({activeOfficer.department})
                </p>
                <p className="text-amber-800 text-[11px]">
                  This supervisory directive will be delivered straight to this officer's notifications and priority dashboard.
                </p>
              </div>

              <div className="space-y-3 text-xs">
                <div>
                  <Label className="text-xs font-bold text-slate-700">Directive Title</Label>
                  <Input
                    value={directiveForm.title}
                    onChange={(e) => setDirectiveForm((prev) => ({ ...prev, title: e.target.value }))}
                    placeholder="e.g. Mandatory 24-Hour Pipeline Backlog Clearance"
                    className="mt-1 h-9 rounded-xl text-xs"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label className="text-xs font-bold text-slate-700">Directive Classification</Label>
                    <select
                      value={directiveForm.directiveType}
                      onChange={(e) => setDirectiveForm((prev) => ({ ...prev, directiveType: e.target.value }))}
                      className="mt-1 w-full h-9 px-3 text-xs rounded-xl border border-slate-200 bg-white"
                    >
                      <option value="Official Memo">Official Memo</option>
                      <option value="Inspection Order">Inspection Order</option>
                      <option value="SLA Escalation">SLA Escalation</option>
                      <option value="Disciplinary Inquiry">Disciplinary Inquiry</option>
                    </select>
                  </div>

                  <div>
                    <Label className="text-xs font-bold text-slate-700">Urgency Level</Label>
                    <select
                      value={directiveForm.priority}
                      onChange={(e) => setDirectiveForm((prev) => ({ ...prev, priority: e.target.value }))}
                      className="mt-1 w-full h-9 px-3 text-xs rounded-xl border border-slate-200 bg-white"
                    >
                      <option value="High">High Priority</option>
                      <option value="Critical">Critical (Immediate Field Action)</option>
                      <option value="Medium">Standard Advisory</option>
                    </select>
                  </div>
                </div>

                <div>
                  <Label className="text-xs font-bold text-slate-700">Detailed Instructions / Compliance Requirement</Label>
                  <Textarea
                    rows={4}
                    value={directiveForm.message}
                    onChange={(e) => setDirectiveForm((prev) => ({ ...prev, message: e.target.value }))}
                    placeholder="Provide specific instructions, ward boundaries, or audit requirements for the officer…"
                    className="mt-1 rounded-xl text-xs"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-2.5 pt-3 border-t">
                <Button variant="outline" size="sm" onClick={() => setActionType(null)} className="rounded-xl text-xs font-bold">
                  Cancel
                </Button>
                <Button
                  size="sm"
                  onClick={handleSendDirective}
                  disabled={actionSubmitting}
                  className="bg-purple-600 hover:bg-purple-700 text-white rounded-xl text-xs font-bold"
                >
                  {actionSubmitting ? "Dispatching..." : "Send Directive to Officer"}
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* ================= MODAL 3: RESET PASSWORD ================= */}
        {actionType === "password" && activeOfficer && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in">
            <div className="relative max-w-sm w-full bg-white rounded-3xl p-6 shadow-2xl border border-slate-200 space-y-4">
              <div className="flex items-center justify-between border-b pb-3">
                <div className="flex items-center gap-2">
                  <KeyRound className="h-5 w-5 text-purple-600" />
                  <h3 className="font-extrabold text-slate-900 text-base">
                    Reset Officer Credentials
                  </h3>
                </div>
                <button
                  type="button"
                  onClick={() => setActionType(null)}
                  className="rounded-full bg-slate-100 p-1.5 text-slate-500 hover:bg-slate-200"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              <div className="p-3 rounded-2xl bg-purple-50/70 text-xs text-purple-900">
                <p className="font-bold">Officer: {activeOfficer.name}</p>
                <p className="text-purple-700">Email: {activeOfficer.email}</p>
              </div>

              <div className="space-y-1.5 text-xs">
                <Label className="font-bold text-slate-700">New Temporary Password</Label>
                <Input
                  type="text"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="e.g. OfficerPass@2026"
                  className="h-9 rounded-xl text-xs"
                />
                <p className="text-[11px] text-slate-400">Must be at least 6 characters long.</p>
              </div>

              <div className="flex items-center justify-end gap-2.5 pt-3 border-t">
                <Button variant="outline" size="sm" onClick={() => setActionType(null)} className="rounded-xl text-xs font-bold">
                  Cancel
                </Button>
                <Button
                  size="sm"
                  onClick={handleResetPassword}
                  disabled={actionSubmitting}
                  className="bg-purple-600 hover:bg-purple-700 text-white rounded-xl text-xs font-bold"
                >
                  {actionSubmitting ? "Resetting..." : "Set New Password"}
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* ================= MODAL 4: COMMISSION NEW OFFICER ================= */}
        {showCreateModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in">
            <div className="relative max-w-md w-full bg-white rounded-3xl p-6 shadow-2xl border border-slate-200 space-y-4">
              <div className="flex items-center justify-between border-b pb-3">
                <div className="flex items-center gap-2">
                  <Shield className="h-5 w-5 text-purple-600" />
                  <h3 className="font-extrabold text-slate-900 text-base">
                    Commission Municipal Officer
                  </h3>
                </div>
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="rounded-full bg-slate-100 p-1.5 text-slate-500 hover:bg-slate-200"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              <form onSubmit={handleCreateOfficer} className="space-y-3 text-xs">
                <div>
                  <Label className="font-bold text-slate-700">Full Name *</Label>
                  <Input
                    required
                    value={createForm.name}
                    onChange={(e) => setCreateForm((prev) => ({ ...prev, name: e.target.value }))}
                    placeholder="e.g. Priya Verma"
                    className="mt-1 h-9 rounded-xl text-xs"
                  />
                </div>

                <div>
                  <Label className="font-bold text-slate-700">Official Email *</Label>
                  <Input
                    required
                    type="email"
                    value={createForm.email}
                    onChange={(e) => setCreateForm((prev) => ({ ...prev, email: e.target.value }))}
                    placeholder="officer.water@example.com"
                    className="mt-1 h-9 rounded-xl text-xs"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label className="font-bold text-slate-700">Password *</Label>
                    <Input
                      required
                      type="password"
                      value={createForm.password}
                      onChange={(e) => setCreateForm((prev) => ({ ...prev, password: e.target.value }))}
                      placeholder="Min 6 chars"
                      className="mt-1 h-9 rounded-xl text-xs"
                    />
                  </div>

                  <div>
                    <Label className="font-bold text-slate-700">Department *</Label>
                    <select
                      value={createForm.department}
                      onChange={(e) => setCreateForm((prev) => ({ ...prev, department: e.target.value }))}
                      className="mt-1 w-full h-9 px-2.5 text-xs rounded-xl border border-slate-200 bg-white"
                    >
                      {CANONICAL_DEPARTMENTS.map((d) => (
                        <option key={d.name} value={d.name}>{d.name}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div>
                  <Label className="font-bold text-slate-700">Phone</Label>
                  <Input
                    value={createForm.phone}
                    onChange={(e) => setCreateForm((prev) => ({ ...prev, phone: e.target.value }))}
                    placeholder="+91 98111 22334"
                    className="mt-1 h-9 rounded-xl text-xs"
                  />
                </div>

                <div>
                  <Label className="font-bold text-slate-700">Office Location / Ward</Label>
                  <Input
                    value={createForm.address}
                    onChange={(e) => setCreateForm((prev) => ({ ...prev, address: e.target.value }))}
                    placeholder="e.g. Water Works Division, Jal Board HQ"
                    className="mt-1 h-9 rounded-xl text-xs"
                  />
                </div>

                <div className="flex items-center justify-end gap-2.5 pt-3 border-t">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => setShowCreateModal(false)}
                    className="rounded-xl text-xs font-bold"
                  >
                    Cancel
                  </Button>
                  <Button
                    type="submit"
                    size="sm"
                    disabled={creating}
                    className="bg-purple-600 hover:bg-purple-700 text-white rounded-xl text-xs font-bold"
                  >
                    {creating ? "Commissioning..." : "Commission Officer"}
                  </Button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </AdminLayout>
  );

  // Helper renderer for each Officer Card with Admin Powers
  function renderOfficerCard(off) {
    const isSuspended = !!off.isSuspended;

    return (
      <div
        key={off._id}
        className={`rounded-3xl border bg-white p-6 shadow-card hover:shadow-lg transition-all space-y-4 flex flex-col justify-between ${
          isSuspended ? "border-rose-300 bg-rose-50/20" : "border-slate-200"
        }`}
      >
        <div className="space-y-4">
          {/* Header Row */}
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className={`grid h-12 w-12 place-items-center rounded-2xl text-white font-extrabold text-base shadow-md ${
                isSuspended ? "bg-rose-600" : "bg-purple-600"
              }`}>
                {off.name.charAt(0)}
              </div>
              <div>
                <h3 className="font-extrabold text-base text-slate-900 leading-tight">
                  {off.name}
                </h3>
                {isSuspended ? (
                  <span className="inline-flex items-center gap-1 text-[10px] font-bold text-rose-700 bg-rose-50 px-2 py-0.5 rounded-full border border-rose-200 mt-0.5">
                    <Lock className="h-3 w-3" /> Suspended by Admin
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200 mt-0.5">
                    <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" /> Active Commission
                  </span>
                )}
              </div>
            </div>

            <div className="flex items-center gap-1 text-amber-500 font-black text-xs bg-amber-50 px-2.5 py-1 rounded-xl border border-amber-200">
              <Star className="h-3.5 w-3.5 fill-amber-400 text-amber-400" />
              <span>{off.avgRating}</span>
            </div>
          </div>

          {/* Department Badge */}
          <div className="p-3 rounded-2xl bg-slate-50 border border-slate-200/80 flex items-center justify-between text-xs font-bold text-slate-800">
            <div className="flex items-center gap-2 truncate">
              <Building2 className="h-4 w-4 text-purple-600 shrink-0" />
              <span className="truncate">{off.department}</span>
            </div>
            <button
              onClick={() => {
                setActiveOfficer(off);
                setNewDepartment(off.department);
                setActionType("transfer");
              }}
              title="Transfer to different department"
              className="text-[10px] font-bold text-purple-600 hover:text-purple-800 hover:underline shrink-0 cursor-pointer ml-1"
            >
              Transfer &rarr;
            </button>
          </div>

          {/* Contact Details */}
          <div className="space-y-1.5 text-xs text-slate-600">
            <p className="flex items-center gap-2 text-[11px]">
              <Mail className="h-3.5 w-3.5 text-slate-400 shrink-0" />
              <span className="truncate">{off.email}</span>
            </p>
            <p className="flex items-center gap-2 text-[11px]">
              <Phone className="h-3.5 w-3.5 text-slate-400 shrink-0" />
              <span>{off.phone}</span>
            </p>
            <p className="flex items-center gap-2 text-[11px]">
              <MapPin className="h-3.5 w-3.5 text-slate-400 shrink-0" />
              <span className="truncate">{off.address}</span>
            </p>
          </div>

          {/* Live Workload Metrics */}
          <div className="grid grid-cols-3 gap-2 pt-2 border-t text-center text-xs">
            <div className="p-2 rounded-xl bg-slate-50">
              <span className="text-base font-black text-slate-900 block leading-tight">{off.totalCases}</span>
              <span className="text-[10px] font-semibold text-slate-400">Total Cases</span>
            </div>
            <div className="p-2 rounded-xl bg-emerald-50">
              <span className="text-base font-black text-emerald-800 block leading-tight">{off.resolvedCases}</span>
              <span className="text-[10px] font-bold text-emerald-700">Resolved</span>
            </div>
            <div className="p-2 rounded-xl bg-blue-50">
              <span className="text-base font-black text-blue-800 block leading-tight">{off.resolutionRate}%</span>
              <span className="text-[10px] font-bold text-blue-700">Efficiency</span>
            </div>
          </div>
        </div>

        {/* ================= ADMINISTRATIVE POWERS BAR ================= */}
        <div className="pt-3 border-t border-slate-100 space-y-2">
          <p className="text-[10px] font-extrabold uppercase tracking-wider text-purple-900 flex items-center gap-1">
            <Sliders className="h-3 w-3 text-purple-600" />
            <span>Administrative Controls &amp; Powers</span>
          </p>

          <div className="grid grid-cols-2 gap-1.5">
            {/* POWER 1: TRANSFER DEPARTMENT */}
            <Button
              size="xs"
              variant="outline"
              onClick={() => {
                setActiveOfficer(off);
                setNewDepartment(off.department);
                setActionType("transfer");
              }}
              className="text-[11px] font-bold rounded-xl justify-start px-2.5 py-1.5 text-slate-700 hover:text-purple-700 hover:bg-purple-50"
            >
              <ArrowRightLeft className="h-3 w-3 mr-1.5 text-purple-600" />
              <span>Transfer Dept</span>
            </Button>

            {/* POWER 2: DISPATCH DIRECTIVE */}
            <Button
              size="xs"
              variant="outline"
              onClick={() => {
                setActiveOfficer(off);
                setActionType("directive");
              }}
              className="text-[11px] font-bold rounded-xl justify-start px-2.5 py-1.5 text-slate-700 hover:text-amber-700 hover:bg-amber-50"
            >
              <Send className="h-3 w-3 mr-1.5 text-amber-600" />
              <span>Send Directive</span>
            </Button>

            {/* POWER 3: RESET PASSWORD */}
            <Button
              size="xs"
              variant="outline"
              onClick={() => {
                setActiveOfficer(off);
                setActionType("password");
              }}
              className="text-[11px] font-bold rounded-xl justify-start px-2.5 py-1.5 text-slate-700 hover:text-blue-700 hover:bg-blue-50"
            >
              <KeyRound className="h-3 w-3 mr-1.5 text-blue-600" />
              <span>Reset Pass</span>
            </Button>

            {/* POWER 4: SUSPEND / RESTORE */}
            <Button
              size="xs"
              variant="outline"
              onClick={() => handleToggleSuspend(off)}
              className={`text-[11px] font-bold rounded-xl justify-start px-2.5 py-1.5 ${
                isSuspended
                  ? "text-emerald-700 hover:bg-emerald-50 border-emerald-300"
                  : "text-rose-700 hover:bg-rose-50 border-rose-200"
              }`}
            >
              {isSuspended ? (
                <>
                  <Unlock className="h-3 w-3 mr-1.5 text-emerald-600" />
                  <span>Restore</span>
                </>
              ) : (
                <>
                  <Lock className="h-3 w-3 mr-1.5 text-rose-600" />
                  <span>Suspend</span>
                </>
              )}
            </Button>
          </div>

          {/* POWER 5: INSPECT WORK QUEUE */}
          <Button asChild variant="ghost" size="xs" className="w-full font-bold text-[11px] text-purple-700 hover:bg-purple-50 rounded-xl justify-between px-2">
            <Link to={`/admin/complaints?officer=${encodeURIComponent(off.name)}`}>
              <span>Inspect {off.name.split(" ")[0]}'s Full Queue</span>
              <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </Button>
        </div>
      </div>
    );
  }
}

export default AdminOfficers;
