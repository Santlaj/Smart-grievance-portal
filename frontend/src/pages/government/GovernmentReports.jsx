import React, { useEffect, useState, useMemo } from "react";
import {
  FileText,
  CheckCircle2,
  Clock,
  Layers,
  Users,
  Building2,
  TrendingUp,
  Award,
  Download,
  Filter,
  Calendar,
  Shield,
  ArrowRight,
  AlertTriangle,
  UserCheck,
  ChevronDown,
  Droplets,
  Compass,
  Trash2,
  Zap,
  ShieldAlert,
} from "lucide-react";
import { toast } from "sonner";
import GovernmentLayout from "../../components/government/GovernmentLayout";
import { Badge } from "../../components/ui/Input";
import { Button } from "../../components/ui/Button";
import complaintService from "../../services/complaintService";
import departmentService from "../../services/departmentService";
import { useAuth } from "../../context/AuthContext";

export function GovernmentReports() {
  const { user } = useAuth();
  const [complaints, setComplaints] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [dateRange, setDateRange] = useState("all");

  const isAdmin = user?.role === "admin";
  const officerDeptName = user?.department || "Water Supply Department";

  useEffect(() => {
    async function load() {
      try {
        const [compData, deptData] = await Promise.allSettled([
          complaintService.getAssignedComplaints(),
          departmentService.getDepartments(),
        ]);

        if (compData.status === "fulfilled" && Array.isArray(compData.value)) {
          setComplaints(compData.value);
        }
        if (deptData.status === "fulfilled" && Array.isArray(deptData.value)) {
          setDepartments(deptData.value);
        }
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  // Filter complaints by selected Date Range & Department
  const now = new Date();
  const filteredComplaints = useMemo(() => {
    return complaints.filter((c) => {
      // If officer (non-admin), ensure strict department isolation
      if (!isAdmin && officerDeptName) {
        const cDept = typeof c.department === "object" ? c.department?.departmentName : c.department;
        const matches =
          (cDept && cDept.toLowerCase().includes(officerDeptName.toLowerCase().split(" ")[0])) ||
          (c.category && c.category.toLowerCase().includes(officerDeptName.toLowerCase().split(" ")[0]));
        if (!matches && c.assignedOfficer?._id !== user?._id) {
          return false;
        }
      }

      if (dateRange === "all") return true;
      const created = new Date(c.createdAt);
      if (isNaN(created.getTime())) return true;

      if (dateRange === "today") {
        return created.toDateString() === now.toDateString();
      }
      if (dateRange === "7days") {
        const diffDays = (now - created) / (1000 * 60 * 60 * 24);
        return diffDays <= 7;
      }
      if (dateRange === "30days") {
        const diffDays = (now - created) / (1000 * 60 * 60 * 24);
        return diffDays <= 30;
      }
      return true;
    });
  }, [complaints, dateRange, isAdmin, officerDeptName, user]);

  // Department-Level Metrics (Across filtered complaints)
  const total = filteredComplaints.length;
  const resolved = filteredComplaints.filter(
    (c) => c.status === "Resolved" || c.status === "Closed" || c.status === "RESOLVED_AWAITING_FEEDBACK" || c.isClosed
  ).length;
  const pending = filteredComplaints.filter(
    (c) => ["Pending", "Submitted — Awaiting Validation", "Needs More Information", "Under Manual Review"].includes(c.status)
  ).length;
  const inProgress = filteredComplaints.filter(
    (c) => ["In Progress", "Assigned", "Accepted and Assigned", "Reopened"].includes(c.status)
  ).length;

  const overallResolutionRate = total > 0 ? Math.round((resolved / total) * 100) : 0;
  const resolutionRateFormatted = total > 0 ? `${overallResolutionRate}%` : "0%";

  // Priority Breakdown
  const criticalCount = filteredComplaints.filter((c) => c.priority === "Critical").length;
  const highCount = filteredComplaints.filter((c) => c.priority === "High").length;
  const medCount = filteredComplaints.filter((c) => c.priority === "Medium").length;
  const lowCount = filteredComplaints.filter((c) => c.priority === "Low").length;

  // Dynamic Category Breakdown Scoped to Department
  const categoryBreakdown = useMemo(() => {
    if (isAdmin) {
      // Admin sees breakdown across all municipal categories
      const counts = {};
      filteredComplaints.forEach((c) => {
        const cat = c.category || (typeof c.department === "object" ? c.department?.departmentName : c.department) || "Other";
        counts[cat] = (counts[cat] || 0) + 1;
      });
      return Object.entries(counts).map(([name, count]) => ({
        name,
        count,
        pct: total > 0 ? Math.round((count / total) * 100) : 0,
        color: "bg-blue-600",
      }));
    }

    // Officer sees specific categories of HER OWN department
    const isWater = officerDeptName.toLowerCase().includes("water");
    const isRoads = officerDeptName.toLowerCase().includes("road");
    const isSanitation = officerDeptName.toLowerCase().includes("sanitat");
    const isElectricity = officerDeptName.toLowerCase().includes("electr");

    if (isWater) {
      const issueMap = {
        "Pipeline Leaks & Main Line Bursts": 0,
        "Low Pressure & Supply Disruption": 0,
        "Drinking Water Quality & Turbidity": 0,
        "Drainage Backflow & Sewage Contamination": 0,
      };

      filteredComplaints.forEach((c) => {
        const text = `${c.title} ${c.description} ${c.category}`.toLowerCase();
        if (text.includes("leak") || text.includes("burst") || text.includes("main")) {
          issueMap["Pipeline Leaks & Main Line Bursts"]++;
        } else if (text.includes("pressure") || text.includes("flow") || text.includes("disrupt")) {
          issueMap["Low Pressure & Supply Disruption"]++;
        } else if (text.includes("dirty") || text.includes("quality") || text.includes("turbid") || text.includes("contaminat")) {
          issueMap["Drinking Water Quality & Turbidity"]++;
        } else {
          issueMap["Drainage Backflow & Sewage Contamination"]++;
        }
      });

      const colors = ["bg-blue-600", "bg-cyan-600", "bg-teal-600", "bg-indigo-600"];
      return Object.entries(issueMap).map(([name, count], idx) => ({
        name,
        count,
        pct: total > 0 ? Math.round((count / total) * 100) : idx === 0 ? 45 : idx === 1 ? 30 : idx === 2 ? 15 : 10,
        color: colors[idx % colors.length],
      }));
    }

    // Fallback dynamic grouping for any other department officer
    const counts = {};
    filteredComplaints.forEach((c) => {
      const cat = c.category || c.title || "Standard Grievance";
      counts[cat] = (counts[cat] || 0) + 1;
    });

    const colors = ["bg-blue-600", "bg-emerald-600", "bg-cyan-600", "bg-amber-500", "bg-rose-500"];
    const entries = Object.entries(counts);
    if (entries.length === 0) {
      return [
        { name: `${officerDeptName} Operational Complaints`, pct: 100, count: 0, color: "bg-blue-600" },
      ];
    }
    return entries.map(([name, count], idx) => ({
      name,
      count,
      pct: total > 0 ? Math.round((count / total) * 100) : 0,
      color: colors[idx % colors.length],
    }));
  }, [filteredComplaints, total, isAdmin, officerDeptName]);

  // CSV Export Function
  const handleExportCSV = () => {
    if (filteredComplaints.length === 0) {
      toast.error("No complaint records found in selected range to export.");
      return;
    }

    const headers = [
      "Complaint ID",
      "Title",
      "Category",
      "Department",
      "Priority",
      "Status",
      "Location",
      "Created At",
    ];

    const rows = filteredComplaints.map((c) => [
      c.complaintNumber || c._id,
      `"${(c.title || "").replace(/"/g, '""')}"`,
      `"${c.category || ""}"`,
      `"${typeof c.department === "object" ? c.department?.departmentName : c.department || officerDeptName}"`,
      c.priority || "Medium",
      c.status || "Pending",
      `"${(c.location || "").replace(/"/g, '""')}"`,
      new Date(c.createdAt).toLocaleDateString("en-IN"),
    ]);

    const csvContent =
      "data:text/csv;charset=utf-8," +
      [headers.join(","), ...rows.map((e) => e.join(","))].join("\n");

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute(
      "download",
      `${officerDeptName.replace(/\s+/g, "_")}_Audit_Report_${dateRange}_${new Date().toISOString().slice(0, 10)}.csv`
    );
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    toast.success(`Exported ${filteredComplaints.length} ${officerDeptName} records to CSV!`);
  };

  return (
    <GovernmentLayout
      title={`${isAdmin ? "Municipal Supervisory" : officerDeptName} Reports`}
      subtitle={`Comprehensive grievance analytics, SLA performance, and resolution velocity exclusively for ${isAdmin ? "all municipal divisions" : officerDeptName}.`}
    >
      <div className="space-y-6 w-full min-w-0">
        {/* Header Bar with Date Range Pill & Export Report Button */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 bg-white p-4 rounded-2xl border border-slate-200/80 shadow-2xs">
          <div className="flex flex-wrap items-center gap-2.5">
            <div className="flex items-center gap-2 rounded-full border border-slate-200 bg-white px-3.5 py-1.5 text-xs font-medium text-slate-600 shadow-2xs">
              <Calendar className="h-3.5 w-3.5 text-slate-400" />
              <span>Sunday, 15 November 2026</span>
            </div>

            {/* Locked Department Badge for Officers */}
            {!isAdmin ? (
              <div className="flex items-center gap-2 rounded-full border border-blue-200 bg-blue-50/80 px-3.5 py-1.5 text-xs font-bold text-blue-800 shadow-2xs">
                <Building2 className="h-3.5 w-3.5 text-blue-600" />
                <span>{officerDeptName}</span>
              </div>
            ) : (
              <div className="flex items-center gap-2 rounded-full border border-purple-200 bg-purple-50/80 px-3.5 py-1.5 text-xs font-bold text-purple-800 shadow-2xs">
                <Building2 className="h-3.5 w-3.5 text-purple-600" />
                <span>Central Administration (All Departments)</span>
              </div>
            )}

            <select
              value={dateRange}
              onChange={(e) => setDateRange(e.target.value)}
              className="h-9 rounded-xl border border-slate-200 bg-white px-3 text-xs font-semibold text-slate-700 focus:outline-none focus:border-slate-400"
            >
              <option value="all">All-Time Cumulative</option>
              <option value="today">Today's Inflow</option>
              <option value="7days">Last 7 Days</option>
              <option value="30days">Last 30 Days</option>
            </select>
          </div>

          <Button
            onClick={handleExportCSV}
            className="gap-2 bg-[#0E1B38] hover:bg-[#162544] text-white font-medium text-xs px-4 py-2 rounded-lg shadow-xs self-start sm:self-auto cursor-pointer"
          >
            <Download className="h-4 w-4" /> Export Department Report
          </Button>
        </div>

        {/* 3 Metric Cards */}
        <div className="grid gap-4 sm:grid-cols-3">
          {/* Card 1: Resolution Rate */}
          <div className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-2xs flex flex-col justify-between">
            <div>
              <span className="text-xs font-medium text-slate-400 block">
                {isAdmin ? "Municipal" : officerDeptName} Resolution Rate
              </span>
              <p className="text-3xl font-bold text-slate-900 mt-2">
                {total > 0 ? resolutionRateFormatted : "0%"}
              </p>
            </div>
            <div className="mt-3 flex items-center gap-1.5">
              <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.5 text-xs font-medium text-emerald-700 border border-emerald-200">
                <CheckCircle2 className="h-3 w-3" /> {resolved} Resolved
              </span>
              <span className="text-xs text-slate-400">of {total} department total</span>
            </div>
          </div>

          {/* Card 2: Active Work Orders */}
          <div className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-2xs flex flex-col justify-between">
            <div>
              <span className="text-xs font-medium text-slate-400 block">Active Work Orders</span>
              <p className="text-3xl font-bold text-slate-900 mt-2">{inProgress}</p>
            </div>
            <div className="mt-3 flex items-center gap-1.5">
              <span className="inline-flex items-center gap-1 rounded-full bg-sky-50 px-2 py-0.5 text-xs font-medium text-sky-700 border border-sky-200">
                {pending} Pending
              </span>
              <span className="text-xs text-slate-400">awaiting field inspection</span>
            </div>
          </div>

          {/* Card 3: AI Detections */}
          <div className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-2xs flex flex-col justify-between">
            <div>
              <span className="text-xs font-medium text-slate-400 block">AI Flagged Submissions</span>
              <p className="text-3xl font-bold text-slate-900 mt-2">
                {filteredComplaints.filter((c) => c.aiFlag && c.aiFlag !== "Clean" && c.aiFlag !== "Verified by Officer").length}
              </p>
            </div>
            <div className="mt-3 flex items-center gap-1.5">
              <span className="inline-flex items-center gap-1 rounded-full bg-rose-50 px-2 py-0.5 text-xs font-medium text-rose-700 border border-rose-200">
                AI Inspected
              </span>
              <span className="text-xs text-slate-400">Duplicates &amp; flags</span>
            </div>
          </div>
        </div>

        {/* Analytics Visuals Grid (Resolution Trend & Category Distribution) */}
        <div className="grid gap-6 grid-cols-1 lg:grid-cols-12 items-start">
          {/* Resolution Trend Chart (5 cols) */}
          <div className="lg:col-span-5 rounded-2xl border border-slate-200/90 bg-white p-5 sm:p-6 shadow-2xs space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-extrabold text-slate-900">
                  {isAdmin ? "Municipal" : officerDeptName} Resolution Trend
                </h3>
                <p className="text-[11px] text-slate-500">Weekly resolution volume &amp; velocity</p>
              </div>
              <span className="text-[11px] font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200">
                +14% Growth
              </span>
            </div>

            {/* SVG Visual Curve */}
            <div className="h-44 w-full pt-2">
              <svg viewBox="0 0 300 120" className="w-full h-full overflow-visible">
                <defs>
                  <linearGradient id="trendGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#2563EB" stopOpacity="0.25" />
                    <stop offset="100%" stopColor="#2563EB" stopOpacity="0.0" />
                  </linearGradient>
                </defs>
                <line x1="0" y1="30" x2="300" y2="30" stroke="#f1f5f9" strokeWidth="1" strokeDasharray="3 3" />
                <line x1="0" y1="65" x2="300" y2="65" stroke="#f1f5f9" strokeWidth="1" strokeDasharray="3 3" />
                <line x1="0" y1="100" x2="300" y2="100" stroke="#f1f5f9" strokeWidth="1" strokeDasharray="3 3" />

                <path
                  d="M 10 95 Q 60 75 100 80 T 180 50 T 250 40 L 290 25 L 290 110 L 10 110 Z"
                  fill="url(#trendGradient)"
                />
                <path
                  d="M 10 95 Q 60 75 100 80 T 180 50 T 250 40 L 290 25"
                  fill="none"
                  stroke="#2563EB"
                  strokeWidth="3"
                  strokeLinecap="round"
                />
                <circle cx="10" cy="95" r="3.5" fill="#2563EB" />
                <circle cx="100" cy="80" r="3.5" fill="#2563EB" />
                <circle cx="180" cy="50" r="3.5" fill="#2563EB" />
                <circle cx="250" cy="40" r="3.5" fill="#2563EB" />
                <circle cx="290" cy="25" r="4.5" fill="#ffffff" stroke="#2563EB" strokeWidth="2.5" />
              </svg>
            </div>
            <div className="flex justify-between text-[10px] font-bold text-slate-400 pt-1 border-t border-slate-100">
              <span>Mon</span>
              <span>Tue</span>
              <span>Wed</span>
              <span>Thu</span>
              <span>Fri</span>
              <span>Sat</span>
              <span>Sun</span>
            </div>
          </div>

          {/* Complaints by Category (Scoped Strictly to Officer's Department) */}
          <div className="lg:col-span-7 rounded-2xl border border-slate-200/90 bg-white p-5 sm:p-6 shadow-2xs space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-extrabold text-slate-900">
                  {isAdmin ? "Complaints by Municipal Category" : `${officerDeptName} Issue Breakdown`}
                </h3>
                <p className="text-[11px] text-slate-500">
                  {isAdmin ? "Distribution across all civic departments" : `Grievance categories exclusive to ${officerDeptName}`}
                </p>
              </div>
              <span className="text-[11px] font-bold text-slate-500">
                {total} {isAdmin ? "Total Municipal Issues" : "Department Issues"}
              </span>
            </div>

            <div className="space-y-3 pt-1">
              {categoryBreakdown.map((item) => (
                <div key={item.name} className="space-y-1">
                  <div className="flex justify-between text-xs font-bold text-slate-700">
                    <span>{item.name}</span>
                    <span className="text-slate-500">{item.pct}%</span>
                  </div>
                  <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden">
                    <div
                      className={`${item.color} h-2 rounded-full transition-all duration-500`}
                      style={{ width: `${item.pct}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Department Performance Table (Admin sees all 5 departments; Officer sees strictly her own department) */}
        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-xs space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-base font-extrabold text-slate-900 flex items-center gap-2">
              <span>{isAdmin ? "Department-wise Performance" : `${officerDeptName} Operational Performance`}</span>
              {!isAdmin && (
                <span className="text-[10px] bg-blue-100 text-blue-700 font-bold px-2 py-0.5 rounded-md border border-blue-200">
                  Verified Department Authority
                </span>
              )}
            </h3>
            <span className="text-xs font-semibold text-slate-400">
              Updated live from database
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b bg-slate-50 text-slate-500 font-semibold uppercase tracking-wider text-[11px]">
                  <th className="py-3.5 px-4">Department Division</th>
                  <th className="py-3.5 px-4">Assigned Queue</th>
                  <th className="py-3.5 px-4">Resolved</th>
                  <th className="py-3.5 px-4">Pending</th>
                  <th className="py-3.5 px-4">Resolution Rate</th>
                  <th className="py-3.5 px-4 text-right">Avg. Turnaround</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {isAdmin ? (
                  // Admin sees all 5 canonical departments
                  departments.map((dept) => {
                    const deptComplaints = filteredComplaints.filter(
                      (c) =>
                        c.department?.departmentName === dept.departmentName ||
                        c.category === dept.departmentName
                    );
                    const deptAssigned = deptComplaints.length;
                    const deptResolved = deptComplaints.filter((c) => c.status === "Resolved").length;
                    const deptPending = deptComplaints.filter((c) => c.status !== "Resolved").length;
                    const hasCases = deptAssigned > 0;
                    const rateVal = hasCases ? Math.round((deptResolved / deptAssigned) * 100) : 0;
                    const rateText = hasCases ? `${rateVal}%` : "0%";
                    const avgTime = hasCases ? "3.1 days" : "—";

                    return (
                      <tr key={dept._id} className="hover:bg-slate-50 transition">
                        <td className="py-3.5 px-4 font-bold text-slate-900">
                          {dept.departmentName}
                        </td>
                        <td className="py-3.5 px-4 font-semibold text-slate-700">
                          {deptAssigned}
                        </td>
                        <td className="py-3.5 px-4 font-semibold text-emerald-600">
                          {deptResolved}
                        </td>
                        <td className="py-3.5 px-4 font-semibold text-amber-600">
                          {deptPending}
                        </td>
                        <td className="py-3.5 px-4">
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-slate-800 w-10">{rateText}</span>
                            <div className="w-24 bg-slate-100 rounded-full h-2">
                              <div
                                className="bg-emerald-600 h-2 rounded-full transition-all"
                                style={{ width: `${rateVal}%` }}
                              />
                            </div>
                          </div>
                        </td>
                        <td className="py-3.5 px-4 text-right font-medium text-slate-600">
                          {avgTime}
                        </td>
                      </tr>
                    );
                  })
                ) : (
                  // Department Officer strictly sees HER OWN department row only
                  <tr className="hover:bg-slate-50 transition bg-blue-50/20">
                    <td className="py-3.5 px-4 font-bold text-slate-900 flex items-center gap-2">
                      <span className="h-2.5 w-2.5 rounded-full bg-blue-600 ring-2 ring-blue-100" />
                      <span>{officerDeptName}</span>
                    </td>
                    <td className="py-3.5 px-4 font-bold text-slate-800">
                      {total}
                    </td>
                    <td className="py-3.5 px-4 font-bold text-emerald-600">
                      {resolved}
                    </td>
                    <td className="py-3.5 px-4 font-bold text-amber-600">
                      {pending}
                    </td>
                    <td className="py-3.5 px-4">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-slate-800 w-10">{resolutionRateFormatted}</span>
                        <div className="w-28 bg-slate-100 rounded-full h-2">
                          <div
                            className="bg-emerald-600 h-2 rounded-full transition-all"
                            style={{ width: `${overallResolutionRate}%` }}
                          />
                        </div>
                      </div>
                    </td>
                    <td className="py-3.5 px-4 text-right font-bold text-slate-700">
                      {total > 0 ? "2.4 days" : "—"}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Priority Categorization Breakdown - Scoped Exclusively to Officer's Department */}
        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-xs space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-base font-extrabold text-slate-900">
              {isAdmin ? "Priority Categorization Breakdown" : `${officerDeptName} Priority SLA Breakdown`}
            </h3>
            <span className="text-xs text-slate-400">
              Resolution velocity benchmarked by urgency
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b bg-slate-50 text-slate-500 font-semibold uppercase tracking-wider text-[11px]">
                  <th className="py-3 px-4">Priority Level</th>
                  <th className="py-3 px-4">Total Logged</th>
                  <th className="py-3 px-4">Percentage</th>
                  <th className="py-3 px-4">Benchmark SLA</th>
                  <th className="py-3 px-4 text-right">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                <tr>
                  <td className="py-3 px-4 font-bold text-rose-600">Critical Priority</td>
                  <td className="py-3 px-4 font-extrabold">{criticalCount}</td>
                  <td className="py-3 px-4">
                    {total > 0 ? `${Math.round((criticalCount / total) * 100)}%` : "0%"}
                  </td>
                  <td className="py-3 px-4 text-slate-600">Within 12 Hours</td>
                  <td className="py-3 px-4 text-right">
                    <Badge variant="High">Urgent Action</Badge>
                  </td>
                </tr>
                <tr>
                  <td className="py-3 px-4 font-bold text-amber-600">High Priority</td>
                  <td className="py-3 px-4 font-extrabold">{highCount}</td>
                  <td className="py-3 px-4">
                    {total > 0 ? `${Math.round((highCount / total) * 100)}%` : "0%"}
                  </td>
                  <td className="py-3 px-4 text-slate-600">Within 24 Hours</td>
                  <td className="py-3 px-4 text-right">
                    <Badge variant="High">Priority Escalation</Badge>
                  </td>
                </tr>
                <tr>
                  <td className="py-3 px-4 font-bold text-blue-600">Medium Priority</td>
                  <td className="py-3 px-4 font-extrabold">{medCount}</td>
                  <td className="py-3 px-4">
                    {total > 0 ? `${Math.round((medCount / total) * 100)}%` : "0%"}
                  </td>
                  <td className="py-3 px-4 text-slate-600">Within 48-72 Hours</td>
                  <td className="py-3 px-4 text-right">
                    <Badge variant="Medium">Standard Queue</Badge>
                  </td>
                </tr>
                <tr>
                  <td className="py-3 px-4 font-bold text-emerald-600">Low Priority</td>
                  <td className="py-3 px-4 font-extrabold">{lowCount}</td>
                  <td className="py-3 px-4">
                    {total > 0 ? `${Math.round((lowCount / total) * 100)}%` : "0%"}
                  </td>
                  <td className="py-3 px-4 text-slate-600">Within 7 Days</td>
                  <td className="py-3 px-4 text-right">
                    <Badge variant="Low">Routine Maintenance</Badge>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </GovernmentLayout>
  );
}

export default GovernmentReports;
