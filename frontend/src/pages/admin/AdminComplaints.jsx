import React, { useEffect, useState } from "react";
import { useSearchParams, Link } from "react-router-dom";
import {
  Search,
  Filter,
  CheckCircle2,
  Clock,
  AlertTriangle,
  Building2,
  Users,
  UserCheck,
  MapPin,
  Calendar,
  X,
  ExternalLink,
  RefreshCw,
  ArrowRight,
  ShieldAlert,
  ArrowLeft,
  ChevronDown,
} from "lucide-react";
import { toast } from "sonner";
import AdminLayout from "../../components/admin/AdminLayout";
import { Button } from "../../components/ui/Button";
import { Badge, Input, Label } from "../../components/ui/Input";
import { useLanguage } from "../../context/LanguageContext";
import adminService from "../../services/adminService";

export function AdminComplaints() {
  const { t } = useLanguage();
  const [searchParams] = useSearchParams();
  const queryDept = searchParams.get("dept") || "All";
  const queryOfficer = searchParams.get("officer") || "";

  const [loading, setLoading] = useState(true);
  const [complaints, setComplaints] = useState([]);
  const [officers, setOfficers] = useState([]);
  const [search, setSearch] = useState(searchParams.get("id") || queryOfficer || "");
  const [selectedDept, setSelectedDept] = useState(queryDept);
  const [selectedStatus, setSelectedStatus] = useState("All");
  const [selectedPriority, setSelectedPriority] = useState("All");

  // Reassignment Modal State
  const [reassignModal, setReassignModal] = useState(null); // complaint object
  const [targetOfficerId, setTargetOfficerId] = useState("");
  const [reassigning, setReassigning] = useState(false);

  const loadAll = async () => {
    setLoading(true);
    try {
      const [compData, usersData] = await Promise.all([
        adminService.getAllComplaints({ all: "true" }),
        adminService.getUsers(),
      ]);

      if (Array.isArray(compData)) {
        setComplaints(compData);
      }
      if (Array.isArray(usersData)) {
        setOfficers(usersData.filter((u) => u.role === "officer"));
      }
    } catch {
      toast.error("Failed to load grievances.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAll();
  }, []);

  const filteredComplaints = complaints.filter((c) => {
    const code = c.complaintNumber || `#GRV-${String(c._id).slice(-5).toUpperCase()}`;
    const deptName = (typeof c.department === "object" ? c.department?.departmentName : c.department || "").toLowerCase();
    const officerName = (typeof c.assignedOfficer === "object" ? c.assignedOfficer?.name : "").toLowerCase();

    const matchesSearch =
      c.title?.toLowerCase().includes(search.toLowerCase()) ||
      c.location?.toLowerCase().includes(search.toLowerCase()) ||
      c.category?.toLowerCase().includes(search.toLowerCase()) ||
      code.toLowerCase().includes(search.toLowerCase()) ||
      officerName.includes(search.toLowerCase());

    const matchesDept =
      selectedDept === "All" ||
      deptName.includes(selectedDept.toLowerCase().split(" ")[0]);

    const matchesStatus = selectedStatus === "All" || c.status === selectedStatus;
    const matchesPriority = selectedPriority === "All" || c.priority === selectedPriority;

    return matchesSearch && matchesDept && matchesStatus && matchesPriority;
  });

  const handleReassign = async (e) => {
    e.preventDefault();
    if (!reassignModal || !targetOfficerId) return;
    setReassigning(true);
    try {
      await adminService.assignOfficer({
        complaintId: reassignModal._id,
        officerId: targetOfficerId,
      });
      toast.success("Officer reassigned successfully!");
      setReassignModal(null);
      setTargetOfficerId("");
      await loadAll();
    } catch (err) {
      toast.error(err.response?.data?.message || err.message || "Failed to reassign officer.");
    } finally {
      setReassigning(false);
    }
  };

  return (
    <AdminLayout>
      <div className="space-y-6">
        {/* Banner */}
        <div className="rounded-3xl border border-slate-200 bg-white p-6 sm:p-8 shadow-card flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="space-y-1">
            <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight flex items-center gap-2.5">
              <span className="grid h-10 w-10 place-items-center rounded-2xl bg-purple-600 text-white shadow-md">
                <Building2 className="h-5 w-5" />
              </span>
              <span>All Department Grievance Queues</span>
            </h1>
            <p className="text-xs sm:text-sm text-slate-500 max-w-xl">
              Cross-department central repository. Supervise investigation progress, triage unassigned issues, and reassign officers.
            </p>
          </div>

          <Button
            variant="outline"
            size="sm"
            onClick={loadAll}
            disabled={loading}
            className="font-bold rounded-xl text-xs shrink-0"
          >
            <RefreshCw className={`h-3.5 w-3.5 mr-1.5 ${loading ? "animate-spin" : ""}`} />
            <span>Refresh All Queues</span>
          </Button>
        </div>

        {/* Filter Controls */}
        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm space-y-3">
          <div className="flex flex-col md:flex-row items-center justify-between gap-3">
            <div className="relative flex-1 w-full">
              <Search className="absolute left-3.5 top-2.5 h-4 w-4 text-slate-400" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search #GRV code, issue title, citizen name, locality, or officer…"
                className="h-9 w-full pl-9 pr-3 text-xs rounded-xl border border-slate-200 bg-slate-50 placeholder:text-slate-400 focus:outline-none focus:border-purple-500 focus:bg-white transition"
              />
            </div>

            <div className="flex flex-wrap items-center gap-2 text-xs w-full md:w-auto">
              <select
                value={selectedDept}
                onChange={(e) => setSelectedDept(e.target.value)}
                className="h-9 rounded-xl border border-slate-200 bg-white px-3 text-xs font-semibold focus:ring-2 focus:ring-purple-600"
              >
                <option value="All">All Departments</option>
                <option value="Roads">Roads &amp; Infrastructure</option>
                <option value="Water">Water Supply</option>
                <option value="Sanitation">Sanitation</option>
                <option value="Electricity">Electricity</option>
                <option value="Safety">Public Safety</option>
              </select>

              <select
                value={selectedStatus}
                onChange={(e) => setSelectedStatus(e.target.value)}
                className="h-9 rounded-xl border border-slate-200 bg-white px-3 text-xs font-semibold focus:ring-2 focus:ring-purple-600"
              >
                <option value="All">All Statuses</option>
                <option value="Submitted — Awaiting Validation">Awaiting Validation</option>
                <option value="Accepted and Assigned">Accepted &amp; Assigned</option>
                <option value="In Progress">In Progress</option>
                <option value="Under Manual Review">Under Manual Review</option>
                <option value="Needs More Information">Needs Info</option>
                <option value="Resolved">Resolved</option>
                <option value="Closed">Closed</option>
                <option value="Reopened">Reopened</option>
                <option value="Rejected">Rejected</option>
              </select>

              <select
                value={selectedPriority}
                onChange={(e) => setSelectedPriority(e.target.value)}
                className="h-9 rounded-xl border border-slate-200 bg-white px-3 text-xs font-semibold focus:ring-2 focus:ring-purple-600"
              >
                <option value="All">All Priorities</option>
                <option value="Critical">Critical</option>
                <option value="High">High</option>
                <option value="Medium">Medium</option>
                <option value="Low">Low</option>
              </select>
            </div>
          </div>

          <div className="flex items-center justify-between text-xs text-slate-500 pt-1">
            <span>
              Showing <strong className="text-slate-900">{filteredComplaints.length}</strong> of{" "}
              {complaints.length} grievances
            </span>
            {(selectedDept !== "All" || selectedStatus !== "All" || selectedPriority !== "All" || search) && (
              <button
                type="button"
                onClick={() => {
                  setSelectedDept("All");
                  setSelectedStatus("All");
                  setSelectedPriority("All");
                  setSearch("");
                }}
                className="text-purple-600 font-bold hover:underline"
              >
                Reset Filters
              </button>
            )}
          </div>
        </div>

        {/* Complaints Table */}
        <div className="rounded-3xl border border-slate-200 bg-white overflow-hidden shadow-card">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-600">
              <thead className="bg-slate-50 text-[10px] font-extrabold uppercase tracking-wider text-slate-400 border-b">
                <tr>
                  <th className="py-3 px-4">Grievance #</th>
                  <th className="py-3 px-4">Department</th>
                  <th className="py-3 px-4">Title &amp; Locality</th>
                  <th className="py-3 px-4">Citizen</th>
                  <th className="py-3 px-4">Assigned Officer</th>
                  <th className="py-3 px-4 text-center">Priority</th>
                  <th className="py-3 px-4 text-center">Status</th>
                  <th className="py-3 px-4 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredComplaints.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="py-12 text-center text-slate-400">
                      No complaints match the specified filter criteria.
                    </td>
                  </tr>
                ) : (
                  filteredComplaints.map((c) => {
                    const deptName = typeof c.department === "object" ? c.department?.departmentName : c.department || "General";
                    const officerName = typeof c.assignedOfficer === "object" ? c.assignedOfficer?.name : null;
                    const code = c.complaintNumber || `#GRV-${String(c._id).slice(-5).toUpperCase()}`;

                    return (
                      <tr key={c._id} className="hover:bg-slate-50/80 transition">
                        <td className="py-3.5 px-4 font-black text-purple-700 whitespace-nowrap">
                          {code}
                        </td>
                        <td className="py-3.5 px-4 whitespace-nowrap">
                          <span className="font-bold text-slate-800 bg-slate-100 px-2 py-0.5 rounded-md text-[11px]">
                            {deptName}
                          </span>
                        </td>
                        <td className="py-3.5 px-4 max-w-xs">
                          <p className="font-extrabold text-slate-900 truncate">{c.title}</p>
                          <p className="text-[11px] text-slate-400 flex items-center gap-1 mt-0.5">
                            <MapPin className="h-3 w-3 shrink-0" />
                            <span className="truncate">{c.location}</span>
                          </p>
                        </td>
                        <td className="py-3.5 px-4 whitespace-nowrap">
                          <p className="font-semibold text-slate-800">{c.citizen?.name || "Citizen"}</p>
                          <p className="text-[10px] text-slate-400">{c.citizen?.email || ""}</p>
                        </td>
                        <td className="py-3.5 px-4 whitespace-nowrap">
                          {officerName ? (
                            <span className="font-bold text-slate-800 flex items-center gap-1.5">
                              <UserCheck className="h-3.5 w-3.5 text-emerald-600" />
                              <span>{officerName}</span>
                            </span>
                          ) : (
                            <span className="text-amber-600 font-bold bg-amber-50 px-2 py-0.5 rounded-md text-[10px] border border-amber-200">
                              Queue Unassigned
                            </span>
                          )}
                        </td>
                        <td className="py-3.5 px-4 text-center whitespace-nowrap">
                          <Badge variant={c.priority}>{c.priority}</Badge>
                        </td>
                        <td className="py-3.5 px-4 text-center whitespace-nowrap">
                          <Badge variant={c.status}>{c.status}</Badge>
                        </td>
                        <td className="py-3.5 px-4 text-right whitespace-nowrap">
                          <button
                            type="button"
                            onClick={() => {
                              setReassignModal(c);
                              setTargetOfficerId(c.assignedOfficer?._id || "");
                            }}
                            className="font-bold text-xs text-purple-600 hover:text-purple-800 bg-purple-50 hover:bg-purple-100 px-3 py-1 rounded-xl transition cursor-pointer"
                          >
                            Reassign Officer
                          </button>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Modal: Reassign Officer */}
        {reassignModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in">
            <div className="relative max-w-md w-full bg-white rounded-3xl p-6 shadow-2xl border border-slate-200 space-y-4">
              <div className="flex items-center justify-between border-b pb-3">
                <div className="flex items-center gap-2">
                  <UserCheck className="h-5 w-5 text-purple-600" />
                  <h3 className="font-extrabold text-slate-900 text-base">
                    Reassign Grievance Officer
                  </h3>
                </div>
                <button
                  type="button"
                  onClick={() => setReassignModal(null)}
                  className="rounded-full bg-slate-100 p-1.5 text-slate-500 hover:bg-slate-200"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              <div className="p-3 bg-slate-50 rounded-2xl border border-slate-100 text-xs space-y-1">
                <p className="font-extrabold text-slate-900">{reassignModal.title}</p>
                <p className="text-slate-500">
                  {reassignModal.complaintNumber || `#GRV-${reassignModal._id.slice(-5)}`} • Location: {reassignModal.location}
                </p>
              </div>

              <form onSubmit={handleReassign} className="space-y-4 text-xs">
                <div className="space-y-1">
                  <Label className="text-[11px] font-bold text-slate-700">Select Municipal Officer *</Label>
                  <select
                    value={targetOfficerId}
                    onChange={(e) => setTargetOfficerId(e.target.value)}
                    required
                    className="h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-xs font-semibold focus:ring-2 focus:ring-purple-600"
                  >
                    <option value="">Select designated officer</option>
                    {officers.map((off) => {
                      const deptName = typeof off.department === "object" ? off.department?.departmentName : off.department;
                      return (
                        <option key={off._id} value={off._id}>
                          {off.name} ({deptName || "Officer"})
                        </option>
                      );
                    })}
                  </select>
                </div>

                <div className="pt-2 flex justify-end gap-2 border-t">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => setReassignModal(null)}
                    className="font-bold rounded-xl"
                  >
                    Cancel
                  </Button>
                  <Button
                    type="submit"
                    size="sm"
                    disabled={reassigning || !targetOfficerId}
                    className="bg-purple-600 hover:bg-purple-700 text-white font-bold rounded-xl"
                  >
                    {reassigning ? "Assigning…" : "Confirm Reassignment"}
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

export default AdminComplaints;
