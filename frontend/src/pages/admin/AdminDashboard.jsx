import React, { useEffect, useState, useMemo } from "react";
import { Link } from "react-router-dom";
import {
  Shield,
  Building2,
  Users,
  ClipboardList,
  CheckCircle2,
  Clock,
  AlertTriangle,
  ArrowRight,
  TrendingUp,
  BarChart3,
  Star,
  ExternalLink,
  RefreshCw,
  Droplets,
  Compass,
  Trash2,
  Zap,
  ShieldAlert,
  FolderOpen,
  UserCheck,
  Award,
  Sparkles,
  Megaphone,
} from "lucide-react";
import { toast } from "sonner";
import AdminLayout from "../../components/admin/AdminLayout";
import { Button } from "../../components/ui/Button";
import { Badge } from "../../components/ui/Input";
import adminService from "../../services/adminService";

const DEPARTMENT_ICONS = {
  roads: Compass,
  water: Droplets,
  sanitation: Trash2,
  electricity: Zap,
  safety: ShieldAlert,
  other: FolderOpen,
};

function getDeptKey(name = "") {
  const lower = name.toLowerCase();
  if (lower.includes("road") || lower.includes("pothole")) return "roads";
  if (lower.includes("water") || lower.includes("drain")) return "water";
  if (lower.includes("sanitation") || lower.includes("garbage") || lower.includes("waste")) return "sanitation";
  if (lower.includes("electric") || lower.includes("power")) return "electricity";
  if (lower.includes("safety") || lower.includes("hazard")) return "safety";
  return "other";
}

export function AdminDashboard() {
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState(null);
  const [activeGraphTab, setActiveGraphTab] = useState("departments"); // "departments" | "officers"

  const loadStats = async () => {
    setLoading(true);
    try {
      const data = await adminService.getStats();
      setStats(data);
    } catch (err) {
      console.error("Admin stats error:", err);
      toast.error("Failed to load live administrative statistics.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadStats();
    const interval = setInterval(() => loadStats(), 30000);
    return () => clearInterval(interval);
  }, []);

  const summary = stats?.summary || {
    totalComplaints: 0,
    resolvedCount: 0,
    inProgressCount: 0,
    pendingCount: 0,
    rejectedCount: 0,
    overallResolutionRate: 100,
    totalDepartments: 5,
    totalOfficers: 5,
  };

  const departments = stats?.departmentBreakdown || [];
  const officers = stats?.officerPerformance || [];
  const recentGrievances = stats?.recentGrievances || [];

  return (
    <AdminLayout>
      <div className="space-y-6">
        {/* ================= 1. EXECUTIVE WELCOME BANNER ================= */}
        <div className="rounded-3xl border border-purple-200/80 bg-gradient-to-r from-[#0B152B] via-[#141B3D] to-[#1E194D] p-6 sm:p-8 text-white shadow-xl relative overflow-hidden">
          {/* Background Decorative Circles */}
          <div className="absolute right-0 top-0 -mr-16 -mt-16 w-80 h-80 rounded-full bg-purple-500/10 blur-3xl pointer-events-none" />
          <div className="absolute right-40 bottom-0 w-60 h-60 rounded-full bg-blue-500/10 blur-2xl pointer-events-none" />

          <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div className="space-y-2 max-w-2xl">
              <div className="flex flex-wrap items-center gap-2">
                <span className="inline-flex items-center gap-1.5 rounded-full bg-purple-500/20 border border-purple-400/30 px-3 py-1 text-xs font-bold text-purple-200">
                  <Award className="h-3.5 w-3.5 text-purple-300" />
                  Central Municipal Supervisory Dashboard
                </span>
                <span className="rounded-full bg-emerald-500/20 border border-emerald-400/30 px-2.5 py-0.5 text-[11px] font-bold text-emerald-300">
                  {summary.overallResolutionRate}% System Efficiency
                </span>
              </div>
              <h1 className="text-2xl sm:text-3xl font-black tracking-tight leading-tight">
                Municipal Command &amp; Officer Performance
              </h1>
              <p className="text-xs sm:text-sm text-slate-300 leading-relaxed font-normal">
                Real-time oversight of all 5 municipal divisions, assigned field officers, live grievance routing, and cross-departmental resolution velocity.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2.5 shrink-0">
              <Button
                variant="outline"
                size="sm"
                onClick={loadStats}
                disabled={loading}
                className="bg-white/10 hover:bg-white/20 text-white border-white/20 font-bold rounded-xl text-xs"
              >
                <RefreshCw className={`h-3.5 w-3.5 mr-1.5 ${loading ? "animate-spin" : ""}`} />
                <span>Refresh Live Metrics</span>
              </Button>

              <Button
                asChild
                size="sm"
                className="bg-purple-600 hover:bg-purple-700 text-white font-bold rounded-xl text-xs shadow-md shadow-purple-600/30"
              >
                <Link to="/admin/officers">
                  <Users className="h-3.5 w-3.5 mr-1.5" />
                  <span>Manage Officers</span>
                </Link>
              </Button>

              <Button
                asChild
                size="sm"
                className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl text-xs shadow-md shadow-indigo-600/30"
              >
                <Link to="/admin/directives">
                  <Megaphone className="h-3.5 w-3.5 mr-1.5" />
                  <span>Officer Directives</span>
                </Link>
              </Button>
            </div>
          </div>
        </div>

        {/* ================= 2. EXECUTIVE KPI CARDS ================= */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3.5 sm:gap-4">
          <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm space-y-1">
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
              Total Grievances
            </span>
            <p className="text-2xl font-black text-slate-900">{summary.totalComplaints}</p>
            <p className="text-[11px] text-slate-500 font-medium">All municipal wards</p>
          </div>

          <div className="rounded-2xl border border-emerald-200/90 bg-emerald-50/50 p-4 shadow-sm space-y-1">
            <span className="text-[11px] font-bold text-emerald-700 uppercase tracking-wider block">
              Resolved Cases
            </span>
            <p className="text-2xl font-black text-emerald-900">{summary.resolvedCount}</p>
            <p className="text-[11px] text-emerald-700 font-bold">
              {summary.overallResolutionRate}% Resolution Rate
            </p>
          </div>

          <div className="rounded-2xl border border-blue-200/90 bg-blue-50/50 p-4 shadow-sm space-y-1">
            <span className="text-[11px] font-bold text-blue-700 uppercase tracking-wider block">
              In Progress Work
            </span>
            <p className="text-2xl font-black text-blue-900">{summary.inProgressCount}</p>
            <p className="text-[11px] text-blue-700 font-medium">Active on-site crews</p>
          </div>

          <div className="rounded-2xl border border-amber-200/90 bg-amber-50/50 p-4 shadow-sm space-y-1">
            <span className="text-[11px] font-bold text-amber-700 uppercase tracking-wider block">
              Pending / Triage
            </span>
            <p className="text-2xl font-black text-amber-900">{summary.pendingCount}</p>
            <p className="text-[11px] text-amber-700 font-medium">Awaiting field action</p>
          </div>

          <div className="rounded-2xl border border-purple-200/90 bg-purple-50/50 p-4 shadow-sm space-y-1">
            <span className="text-[11px] font-bold text-purple-700 uppercase tracking-wider block">
              Departments
            </span>
            <p className="text-2xl font-black text-purple-900">{departments.length || 5}</p>
            <p className="text-[11px] text-purple-700 font-medium">All queues active</p>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm space-y-1">
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
              Active Officers
            </span>
            <p className="text-2xl font-black text-slate-900">{officers.length || 5}</p>
            <p className="text-[11px] text-slate-500 font-medium">Commissioned staff</p>
          </div>
        </div>

        {/* ================= 3. PERFORMANCE GRAPHS & RESOLUTION CHARTS ================= */}
        <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-card space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b pb-4">
            <div>
              <div className="flex items-center gap-2">
                <BarChart3 className="h-5 w-5 text-purple-600" />
                <h2 className="text-lg font-black text-slate-900 tracking-tight">
                  Visual Resolution &amp; Workload Analytics
                </h2>
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                Comparative bar graphs illustrating cases resolved, in progress, and pending across departments and officers.
              </p>
            </div>

            {/* Toggle Graph View */}
            <div className="flex items-center gap-1.5 p-1 rounded-2xl bg-slate-100 text-xs">
              <button
                type="button"
                onClick={() => setActiveGraphTab("departments")}
                className={`px-3.5 py-1.5 rounded-xl font-bold transition cursor-pointer ${
                  activeGraphTab === "departments"
                    ? "bg-white text-purple-900 shadow-xs"
                    : "text-slate-600 hover:text-slate-900"
                }`}
              >
                By Department
              </button>
              <button
                type="button"
                onClick={() => setActiveGraphTab("officers")}
                className={`px-3.5 py-1.5 rounded-xl font-bold transition cursor-pointer ${
                  activeGraphTab === "officers"
                    ? "bg-white text-purple-900 shadow-xs"
                    : "text-slate-600 hover:text-slate-900"
                }`}
              >
                By Officer Performance
              </button>
            </div>
          </div>

          {/* GRAPH A: DEPARTMENT COMPARATIVE RESOLUTION GRAPH */}
          {activeGraphTab === "departments" && (
            <div className="space-y-5 animate-in fade-in duration-200">
              <div className="flex items-center justify-between text-xs text-slate-500 px-1">
                <span className="font-bold uppercase tracking-wider text-slate-400 text-[10px]">
                  Department Name &amp; Resolution Velocity
                </span>
                <div className="flex items-center gap-4 text-xs font-semibold">
                  <span className="flex items-center gap-1.5">
                    <span className="h-2.5 w-2.5 rounded-full bg-emerald-500" />
                    Resolved
                  </span>
                  <span className="flex items-center gap-1.5">
                    <span className="h-2.5 w-2.5 rounded-full bg-blue-500" />
                    In Progress
                  </span>
                  <span className="flex items-center gap-1.5">
                    <span className="h-2.5 w-2.5 rounded-full bg-amber-400" />
                    Pending
                  </span>
                </div>
              </div>

              <div className="space-y-4">
                {departments.map((dept) => {
                  const Icon = DEPARTMENT_ICONS[getDeptKey(dept.departmentName)] || Building2;
                  const total = Math.max(dept.total, 1);
                  const resPct = Math.round((dept.resolved / total) * 100);
                  const progPct = Math.round((dept.inProgress / total) * 100);
                  const pendPct = Math.round((dept.pending / total) * 100);

                  return (
                    <div
                      key={dept._id || dept.departmentName}
                      className="p-4 rounded-2xl border border-slate-100 hover:border-slate-300 bg-slate-50/70 hover:bg-white transition-all space-y-2.5"
                    >
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <div className="flex items-center gap-2.5">
                          <span className="grid h-8 w-8 place-items-center rounded-xl bg-white border border-slate-200 text-slate-700 shadow-2xs">
                            <Icon className="h-4 w-4" />
                          </span>
                          <div>
                            <span className="font-extrabold text-sm text-slate-900 block leading-tight">
                              {dept.departmentName}
                            </span>
                            <span className="text-[11px] text-slate-500 font-medium">
                              {dept.officers?.length > 0
                                ? `Head: ${dept.officers[0].name}`
                                : "Department Officer Assigned"}
                            </span>
                          </div>
                        </div>

                        <div className="flex items-center gap-3 text-xs">
                          <span className="font-black text-slate-900">
                            {dept.total} <span className="font-medium text-slate-500">Cases</span>
                          </span>
                          <span className="inline-flex items-center rounded-full bg-emerald-100 px-2.5 py-0.5 text-[11px] font-extrabold text-emerald-800">
                            {dept.resolutionRate}% Resolved
                          </span>
                        </div>
                      </div>

                      {/* Multi-Segment Comparative Bar Chart */}
                      <div className="h-4 w-full rounded-full bg-slate-200 overflow-hidden flex shadow-inner">
                        <div
                          style={{ width: `${resPct}%` }}
                          className="bg-emerald-500 h-full transition-all duration-500 flex items-center justify-center text-[10px] text-white font-bold"
                          title={`Resolved: ${dept.resolved} (${resPct}%)`}
                        />
                        <div
                          style={{ width: `${progPct}%` }}
                          className="bg-blue-500 h-full transition-all duration-500 flex items-center justify-center text-[10px] text-white font-bold"
                          title={`In Progress: ${dept.inProgress} (${progPct}%)`}
                        />
                        <div
                          style={{ width: `${pendPct}%` }}
                          className="bg-amber-400 h-full transition-all duration-500 flex items-center justify-center text-[10px] text-white font-bold"
                          title={`Pending: ${dept.pending} (${pendPct}%)`}
                        />
                      </div>

                      <div className="flex items-center justify-between text-[11px] text-slate-500 font-medium px-1">
                        <span className="text-emerald-700 font-bold">{dept.resolved} Resolved</span>
                        <span className="text-blue-700 font-bold">{dept.inProgress} In Progress</span>
                        <span className="text-amber-700 font-bold">{dept.pending} Pending</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* GRAPH B: OFFICER RESOLUTION PERFORMANCE & LEADERBOARD */}
          {activeGraphTab === "officers" && (
            <div className="space-y-4 animate-in fade-in duration-200">
              <div className="flex items-center justify-between text-xs text-slate-500 px-1">
                <span className="font-bold uppercase tracking-wider text-slate-400 text-[10px]">
                  Officer Name &amp; Assigned Division
                </span>
                <span className="font-bold uppercase tracking-wider text-slate-400 text-[10px]">
                  Resolved vs Total Assigned
                </span>
              </div>

              <div className="space-y-3">
                {officers.map((off) => {
                  const total = Math.max(off.totalCases, 1);
                  const resPct = Math.round((off.resolvedCases / total) * 100);

                  return (
                    <div
                      key={off._id}
                      className="p-4 rounded-2xl border border-slate-100 hover:border-slate-300 bg-slate-50/70 hover:bg-white transition-all space-y-2"
                    >
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <div className="flex items-center gap-3">
                          <div className="grid h-9 w-9 place-items-center rounded-xl bg-purple-600 text-white font-bold text-xs shadow-xs">
                            {off.name.charAt(0)}
                          </div>
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="font-extrabold text-sm text-slate-900">{off.name}</span>
                              <span className="inline-flex items-center gap-1 text-[11px] font-bold text-amber-600 bg-amber-50 px-2 py-0.5 rounded-md border border-amber-200">
                                <Star className="h-3 w-3 fill-amber-400 text-amber-400" />
                                {off.avgRating}
                              </span>
                            </div>
                            <span className="text-xs text-slate-500 font-medium">
                              {off.department} • {off.email}
                            </span>
                          </div>
                        </div>

                        <div className="text-right">
                          <span className="font-black text-sm text-slate-900 block">
                            {off.resolvedCases} / {off.totalCases} Resolved
                          </span>
                          <span className="text-[11px] font-bold text-emerald-600">
                            {off.resolutionRate}% Efficiency
                          </span>
                        </div>
                      </div>

                      {/* Single Progress Bar */}
                      <div className="h-3 w-full rounded-full bg-slate-200 overflow-hidden shadow-inner">
                        <div
                          style={{ width: `${resPct}%` }}
                          className="h-full bg-gradient-to-r from-purple-600 to-emerald-500 rounded-full transition-all duration-500"
                        />
                      </div>

                      <div className="flex items-center justify-between text-[11px] text-slate-500 font-medium">
                        <span>Workload: {off.inProgressCases} active cases in progress</span>
                        <span>Pending action: {off.pendingCases} cases</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* ================= 4. ALL DEPARTMENTS DIRECTORY GRID ================= */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-black text-slate-900 tracking-tight flex items-center gap-2">
                <Building2 className="h-5 w-5 text-purple-600" />
                <span>All Municipal Departments Directory</span>
              </h2>
              <p className="text-xs text-slate-500">
                Departmental queues, assigned officers, and live resolution status.
              </p>
            </div>
            <Button asChild variant="outline" size="sm" className="font-bold rounded-xl text-xs">
              <Link to="/admin/complaints">View All Queues →</Link>
            </Button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {departments.map((dept) => {
              const Icon = DEPARTMENT_ICONS[getDeptKey(dept.departmentName)] || Building2;
              const officerName = dept.officers?.[0]?.name || "Assigned Officer";
              const officerEmail = dept.officers?.[0]?.email || "officer@portal.gov";

              return (
                <div
                  key={dept._id || dept.departmentName}
                  className="rounded-2xl border border-slate-200 bg-white p-5 shadow-card hover:shadow-md transition-all space-y-4 flex flex-col justify-between"
                >
                  <div className="space-y-3">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-center gap-3">
                        <span className="grid h-10 w-10 place-items-center rounded-xl bg-purple-50 text-purple-700 border border-purple-200 shadow-2xs">
                          <Icon className="h-5 w-5" />
                        </span>
                        <div>
                          <h3 className="font-extrabold text-sm text-slate-900 leading-tight">
                            {dept.departmentName}
                          </h3>
                          <span className="text-[11px] text-slate-400 font-medium">
                            {dept.total} Grievances Filed
                          </span>
                        </div>
                      </div>

                      <span className="rounded-full bg-emerald-50 text-emerald-800 border border-emerald-200 px-2.5 py-0.5 text-[11px] font-black">
                        {dept.resolutionRate}%
                      </span>
                    </div>

                    <p className="text-xs text-slate-500 leading-relaxed line-clamp-2">
                      {dept.description}
                    </p>

                    {/* Assigned Officer Pill */}
                    <div className="p-3 rounded-xl bg-slate-50 border border-slate-100 flex items-center justify-between text-xs">
                      <div className="flex items-center gap-2 min-w-0">
                        <UserCheck className="h-4 w-4 text-purple-600 shrink-0" />
                        <div className="min-w-0 leading-tight">
                          <span className="font-bold text-slate-800 truncate block text-[11px]">
                            {officerName}
                          </span>
                          <span className="text-[10px] text-slate-400 truncate block">
                            {officerEmail}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Metrics 3-Col */}
                    <div className="grid grid-cols-3 gap-2 pt-1 text-center">
                      <div className="p-2 rounded-xl bg-emerald-50/70 border border-emerald-100">
                        <span className="text-base font-black text-emerald-900 block leading-tight">
                          {dept.resolved}
                        </span>
                        <span className="text-[10px] font-bold text-emerald-700">Resolved</span>
                      </div>
                      <div className="p-2 rounded-xl bg-blue-50/70 border border-blue-100">
                        <span className="text-base font-black text-blue-900 block leading-tight">
                          {dept.inProgress}
                        </span>
                        <span className="text-[10px] font-bold text-blue-700">In Progress</span>
                      </div>
                      <div className="p-2 rounded-xl bg-amber-50/70 border border-amber-100">
                        <span className="text-base font-black text-amber-900 block leading-tight">
                          {dept.pending}
                        </span>
                        <span className="text-[10px] font-bold text-amber-700">Pending</span>
                      </div>
                    </div>
                  </div>

                  <Button
                    asChild
                    variant="outline"
                    size="sm"
                    className="w-full font-bold text-xs rounded-xl"
                  >
                    <Link to={`/admin/complaints?dept=${encodeURIComponent(dept.departmentName)}`}>
                      <span>Open Department Queue</span>
                      <ArrowRight className="h-3 w-3 ml-1.5" />
                    </Link>
                  </Button>
                </div>
              );
            })}
          </div>
        </div>

        {/* ================= 5. ALL OFFICERS DIRECTORY TABLE ================= */}
        <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-card space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b pb-4">
            <div>
              <h2 className="text-lg font-black text-slate-900 tracking-tight flex items-center gap-2">
                <Users className="h-5 w-5 text-purple-600" />
                <span>Government Officers Commission Directory</span>
              </h2>
              <p className="text-xs text-slate-500">
                Performance indicators, resolution metrics, and citizen satisfaction ratings.
              </p>
            </div>
            <Button asChild size="sm" className="bg-purple-600 hover:bg-purple-700 text-white font-bold rounded-xl text-xs">
              <Link to="/admin/officers">+ Commission New Officer</Link>
            </Button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-600">
              <thead className="bg-slate-50 text-[10px] font-extrabold uppercase tracking-wider text-slate-400 border-y">
                <tr>
                  <th className="py-3 px-4">Officer Name</th>
                  <th className="py-3 px-4">Department</th>
                  <th className="py-3 px-4">Contact</th>
                  <th className="py-3 px-4 text-center">Cases Handled</th>
                  <th className="py-3 px-4 text-center">Resolved</th>
                  <th className="py-3 px-4 text-center">Efficiency</th>
                  <th className="py-3 px-4 text-center">Citizen Rating</th>
                  <th className="py-3 px-4 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {officers.map((off) => (
                  <tr key={off._id} className="hover:bg-slate-50/80 transition">
                    <td className="py-3.5 px-4 font-extrabold text-slate-900">
                      <div className="flex items-center gap-2.5">
                        <span className="grid h-8 w-8 place-items-center rounded-xl bg-purple-100 text-purple-800 font-bold text-xs">
                          {off.name.charAt(0)}
                        </span>
                        <span>{off.name}</span>
                      </div>
                    </td>
                    <td className="py-3.5 px-4">
                      <span className="font-semibold text-slate-700 bg-slate-100 px-2.5 py-1 rounded-lg">
                        {off.department}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 font-medium text-slate-500">
                      <div>{off.email}</div>
                      <div className="text-[10px] text-slate-400">{off.phone}</div>
                    </td>
                    <td className="py-3.5 px-4 text-center font-bold text-slate-900">
                      {off.totalCases}
                    </td>
                    <td className="py-3.5 px-4 text-center font-bold text-emerald-700">
                      {off.resolvedCases}
                    </td>
                    <td className="py-3.5 px-4 text-center">
                      <span className="font-extrabold text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200">
                        {off.resolutionRate}%
                      </span>
                    </td>
                    <td className="py-3.5 px-4 text-center">
                      <span className="inline-flex items-center gap-1 font-bold text-amber-600">
                        <Star className="h-3.5 w-3.5 fill-amber-400 text-amber-400" />
                        {off.avgRating}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 text-right">
                      <Button asChild variant="ghost" size="sm" className="font-bold text-xs text-purple-600 hover:text-purple-800">
                        <Link to={`/admin/complaints?officer=${encodeURIComponent(off.name)}`}>
                          View Queue →
                        </Link>
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* ================= 6. RECENT CIVIC GRIEVANCES STREAM ================= */}
        <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-card space-y-4">
          <div className="flex items-center justify-between border-b pb-3">
            <div>
              <h2 className="text-lg font-black text-slate-900 tracking-tight flex items-center gap-2">
                <ClipboardList className="h-5 w-5 text-purple-600" />
                <span>Live Cross-Department Grievance Stream</span>
              </h2>
              <p className="text-xs text-slate-500">
                Latest citizen submissions received across all municipal departments.
              </p>
            </div>
            <Button asChild variant="outline" size="sm" className="font-bold rounded-xl text-xs">
              <Link to="/admin/complaints">Manage All Grievances →</Link>
            </Button>
          </div>

          <div className="divide-y divide-slate-100">
            {recentGrievances.length === 0 ? (
              <p className="text-center text-xs text-slate-400 py-6">No recent grievances recorded.</p>
            ) : (
              recentGrievances.map((c) => {
                const deptName = typeof c.department === "object" ? c.department?.departmentName : c.department || "General";
                const officerName = typeof c.assignedOfficer === "object" ? c.assignedOfficer?.name : "Department Queue";

                return (
                  <div key={c._id} className="py-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
                    <div className="space-y-1 max-w-xl">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="font-black text-purple-700">
                          {c.complaintNumber || `#GRV-${c._id.slice(-5).toUpperCase()}`}
                        </span>
                        <span className="rounded-md bg-slate-100 px-2 py-0.5 text-[10px] font-bold text-slate-600">
                          {deptName}
                        </span>
                        <Badge variant={c.priority}>{c.priority}</Badge>
                        <Badge variant={c.status}>{c.status}</Badge>
                      </div>
                      <p className="font-bold text-slate-900 line-clamp-1">{c.title}</p>
                      <p className="text-[11px] text-slate-500">
                        Citizen: <strong>{c.citizen?.name || "Citizen"}</strong> • Location: {c.location} • Assigned Officer: <strong>{officerName}</strong>
                      </p>
                    </div>

                    <Button asChild variant="outline" size="sm" className="font-bold text-xs rounded-xl shrink-0">
                      <Link to={`/admin/complaints?id=${c.complaintNumber || c._id}`}>
                        Inspect &amp; Supervise →
                      </Link>
                    </Button>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>
    </AdminLayout>
  );
}

export default AdminDashboard;
