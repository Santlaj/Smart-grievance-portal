import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import {
  Users,
  Building2,
  PlusCircle,
  Search,
  Filter,
  CheckCircle2,
  Mail,
  Phone,
  MapPin,
  Star,
  RefreshCw,
  X,
  Shield,
  ArrowRight,
  Briefcase,
} from "lucide-react";
import { toast } from "sonner";
import AdminLayout from "../../components/admin/AdminLayout";
import { Button } from "../../components/ui/Button";
import { Input, Label, Textarea } from "../../components/ui/Input";
import adminService from "../../services/adminService";

const CANONICAL_DEPARTMENTS = [
  "Roads & Infrastructure",
  "Water Supply Department",
  "Sanitation Department",
  "Electricity Department",
  "Public Safety Department",
];

export function AdminOfficers() {
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState(null);
  const [search, setSearch] = useState("");
  const [deptFilter, setDeptFilter] = useState("All");

  // Create Officer Modal State
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [creating, setCreating] = useState(false);
  const [formData, setFormData] = useState({
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

  const filteredOfficers = officers.filter((off) => {
    const matchesSearch =
      off.name.toLowerCase().includes(search.toLowerCase()) ||
      off.email.toLowerCase().includes(search.toLowerCase()) ||
      off.department.toLowerCase().includes(search.toLowerCase());
    const matchesDept = deptFilter === "All" || off.department.toLowerCase().includes(deptFilter.toLowerCase().split(" ")[0]);
    return matchesSearch && matchesDept;
  });

  const handleCreateOfficer = async (e) => {
    e.preventDefault();
    if (!formData.name || !formData.email || !formData.password) {
      toast.error("Please fill in Name, Email, and Password.");
      return;
    }
    setCreating(true);
    try {
      await adminService.createOfficer({
        name: formData.name.trim(),
        email: formData.email.trim().toLowerCase(),
        password: formData.password,
        department: formData.department,
        phone: formData.phone.trim(),
        address: formData.address.trim(),
      });
      toast.success(`Officer ${formData.name} commissioned successfully!`);
      setShowCreateModal(false);
      setFormData({
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
        {/* Header Banner */}
        <div className="rounded-3xl border border-slate-200 bg-white p-6 sm:p-8 shadow-card flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="space-y-1">
            <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight flex items-center gap-2.5">
              <span className="grid h-10 w-10 place-items-center rounded-2xl bg-purple-600 text-white shadow-md">
                <Users className="h-5 w-5" />
              </span>
              <span>Municipal Officers Commission</span>
            </h1>
            <p className="text-xs sm:text-sm text-slate-500 max-w-xl">
              Directory of commissioned municipal officers, active department assignments, resolution quotas, and citizen satisfaction ratings.
            </p>
          </div>

          <div className="flex items-center gap-2.5 shrink-0">
            <Button
              variant="outline"
              size="sm"
              onClick={loadData}
              disabled={loading}
              className="font-bold rounded-xl text-xs"
            >
              <RefreshCw className={`h-3.5 w-3.5 mr-1.5 ${loading ? "animate-spin" : ""}`} />
              <span>Refresh</span>
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

        {/* Filter Bar */}
        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-1.5 overflow-x-auto text-xs pb-1 md:pb-0">
            <button
              type="button"
              onClick={() => setDeptFilter("All")}
              className={`px-3.5 py-1.5 rounded-xl font-bold transition cursor-pointer shrink-0 ${
                deptFilter === "All"
                  ? "bg-purple-600 text-white shadow-xs"
                  : "bg-slate-100 text-slate-600 hover:bg-slate-200"
              }`}
            >
              All Departments ({officers.length})
            </button>
            {CANONICAL_DEPARTMENTS.map((dept) => {
              const shortName = dept.split(" ")[0];
              const count = officers.filter((o) => o.department.toLowerCase().includes(shortName.toLowerCase())).length;
              return (
                <button
                  key={dept}
                  type="button"
                  onClick={() => setDeptFilter(dept)}
                  className={`px-3.5 py-1.5 rounded-xl font-bold transition cursor-pointer shrink-0 ${
                    deptFilter === dept
                      ? "bg-purple-600 text-white shadow-xs"
                      : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                  }`}
                >
                  {shortName} ({count})
                </button>
              );
            })}
          </div>

          <div className="relative w-full md:w-64">
            <Search className="absolute left-3.5 top-2.5 h-4 w-4 text-slate-400" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search officer name, email…"
              className="h-9 w-full pl-9 pr-3 text-xs rounded-xl border border-slate-200 bg-slate-50 placeholder:text-slate-400 focus:outline-none focus:border-purple-500 focus:bg-white transition"
            />
          </div>
        </div>

        {/* Officers Grid Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {filteredOfficers.length === 0 ? (
            <div className="col-span-full rounded-3xl border border-slate-200 bg-white p-12 text-center text-slate-400">
              <Users className="h-8 w-8 mx-auto text-slate-300 mb-2" />
              <p className="text-base font-bold text-slate-700">No officers found</p>
              <p className="text-xs text-slate-400 mt-1">Try adjusting your department filter or search keyword.</p>
            </div>
          ) : (
            filteredOfficers.map((off) => (
              <div
                key={off._id}
                className="rounded-3xl border border-slate-200 bg-white p-6 shadow-card hover:shadow-lg transition-all space-y-4 flex flex-col justify-between"
              >
                <div className="space-y-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <div className="grid h-12 w-12 place-items-center rounded-2xl bg-purple-600 text-white font-extrabold text-base shadow-md">
                        {off.name.charAt(0)}
                      </div>
                      <div>
                        <h3 className="font-extrabold text-base text-slate-900 leading-tight">
                          {off.name}
                        </h3>
                        <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200 mt-0.5">
                          <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" /> Active Commission
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center gap-1 text-amber-500 font-black text-xs bg-amber-50 px-2.5 py-1 rounded-xl border border-amber-200">
                      <Star className="h-3.5 w-3.5 fill-amber-400 text-amber-400" />
                      <span>{off.avgRating}</span>
                    </div>
                  </div>

                  {/* Department Badge */}
                  <div className="p-3 rounded-2xl bg-purple-50/70 border border-purple-100 flex items-center gap-2.5 text-xs text-purple-900 font-bold">
                    <Building2 className="h-4 w-4 text-purple-600 shrink-0" />
                    <span>{off.department}</span>
                  </div>

                  {/* Contact Info */}
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

                  {/* Workload Stats */}
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

                <Button asChild variant="outline" size="sm" className="w-full font-bold text-xs rounded-xl mt-3">
                  <Link to={`/admin/complaints?officer=${encodeURIComponent(off.name)}`}>
                    <span>Inspect Officer Queue</span>
                    <ArrowRight className="h-3.5 w-3.5 ml-1.5" />
                  </Link>
                </Button>
              </div>
            ))
          )}
        </div>

        {/* Modal: Commission New Officer */}
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

              <form onSubmit={handleCreateOfficer} className="space-y-3.5 text-xs">
                <div className="space-y-1">
                  <Label className="text-[11px] font-bold text-slate-700">Full Name *</Label>
                  <Input
                    required
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="e.g. Inspector Meena Joshi"
                    className="text-xs"
                  />
                </div>

                <div className="space-y-1">
                  <Label className="text-[11px] font-bold text-slate-700">Official Gov Email *</Label>
                  <Input
                    type="email"
                    required
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    placeholder="officer.dept@example.com"
                    className="text-xs"
                  />
                </div>

                <div className="space-y-1">
                  <Label className="text-[11px] font-bold text-slate-700">Portal Password *</Label>
                  <Input
                    type="password"
                    required
                    value={formData.password}
                    onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                    placeholder="Minimum 8 characters"
                    className="text-xs"
                  />
                </div>

                <div className="space-y-1">
                  <Label className="text-[11px] font-bold text-slate-700">Assigned Municipal Department *</Label>
                  <select
                    value={formData.department}
                    onChange={(e) => setFormData({ ...formData, department: e.target.value })}
                    className="h-9 w-full rounded-xl border border-slate-200 bg-white px-3 text-xs font-semibold focus:ring-2 focus:ring-purple-600"
                  >
                    {CANONICAL_DEPARTMENTS.map((dept) => (
                      <option key={dept} value={dept}>
                        {dept}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <Label className="text-[11px] font-bold text-slate-700">Phone</Label>
                    <Input
                      value={formData.phone}
                      onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                      placeholder="+91 98111..."
                      className="text-xs"
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-[11px] font-bold text-slate-700">Office Location</Label>
                    <Input
                      value={formData.address}
                      onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                      placeholder="Ward / Division Office"
                      className="text-xs"
                    />
                  </div>
                </div>

                <div className="pt-3 flex justify-end gap-2 border-t">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => setShowCreateModal(false)}
                    className="font-bold rounded-xl"
                  >
                    Cancel
                  </Button>
                  <Button
                    type="submit"
                    size="sm"
                    disabled={creating}
                    className="bg-purple-600 hover:bg-purple-700 text-white font-bold rounded-xl"
                  >
                    {creating ? "Commissioning…" : "Create & Commission"}
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

export default AdminOfficers;
