import React, { useState } from "react";
import { Link, useLocation } from "react-router-dom";
import {
  ShieldCheck,
  LayoutDashboard,
  Users,
  ClipboardList,
  Megaphone,
  LogOut,
  ExternalLink,
  Building2,
  BarChart3,
  Menu,
  X,
  Sparkles,
  Layers,
  ChevronRight,
  Shield,
  ArrowRight,
} from "lucide-react";
import { useAuth } from "../../context/AuthContext";

const ADMIN_NAV = [
  { to: "/admin/dashboard", label: "Executive Dashboard", icon: LayoutDashboard },
  { to: "/admin/officers", label: "Department Officers & Powers", icon: Users, badge: "Control" },
  { to: "/admin/complaints", label: "All Grievance Queues", icon: ClipboardList },
  { to: "/admin/directives", label: "Officer Directives & Memos", icon: Megaphone },
  { to: "/government/announcements", label: "Public Civic Notices", icon: ExternalLink },
];

export function AdminLayout({ children, title, subtitle }) {
  const location = useLocation();
  const { user, logout } = useAuth();
  const [mobileOpen, setMobileOpen] = useState(false);

  const cleanName = user?.name ? user.name.replace(/\s*\(Admin\)/i, "").trim() : "Anita Deshmukh";

  const sidebarContent = (
    <div className="flex h-full flex-col justify-between bg-[#0B152B] p-5 text-white">
      <div>
        {/* Administrator Authority Header */}
        <div className="flex items-center justify-between border-b border-white/10 pb-5">
          <Link to="/admin/dashboard" className="flex items-center gap-3">
            <span className="grid h-10 w-10 place-items-center rounded-xl bg-purple-600 text-white shadow-lg shadow-purple-600/30">
              <Shield className="h-5 w-5" />
            </span>
            <div className="leading-tight">
              <span className="block text-base font-black tracking-tight text-white">
                Smart Grievance
              </span>
              <span className="inline-flex items-center gap-1 text-[10px] font-extrabold text-purple-300 uppercase tracking-wider">
                <Sparkles className="h-2.5 w-2.5" /> Admin Command
              </span>
            </div>
          </Link>
          <button
            onClick={() => setMobileOpen(false)}
            className="rounded-lg p-1 text-white/70 hover:bg-white/10 lg:hidden"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* System Notice Banner */}
        <div className="mt-4 p-3 rounded-xl bg-purple-950/60 border border-purple-500/20 text-xs text-purple-200 space-y-1">
          <p className="font-bold flex items-center gap-1.5 text-purple-300 text-[11px] uppercase tracking-wider">
            <Building2 className="h-3.5 w-3.5" /> Central Headquarters
          </p>
          <p className="text-[11px] text-purple-200/80 leading-relaxed">
            Full supervisory oversight across 5 municipal departments &amp; active officers.
          </p>
        </div>

        {/* Navigation Menu */}
        <nav className="mt-5 space-y-1.5">
          <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400 px-3 pb-1">
            Administration
          </p>
          {ADMIN_NAV.map((item) => {
            const isActive = location.pathname === item.to;
            const Icon = item.icon;
            return (
              <Link
                key={item.to}
                to={item.to}
                onClick={() => setMobileOpen(false)}
                className={`flex items-center justify-between rounded-xl px-3.5 py-2.5 text-xs font-semibold transition-all ${
                  isActive
                    ? "bg-purple-600/25 text-white border border-purple-400/40 shadow-xs font-bold"
                    : "text-slate-400 hover:text-white hover:bg-white/5"
                }`}
              >
                <div className="flex items-center gap-3">
                  <Icon className={`h-4 w-4 shrink-0 ${isActive ? "text-purple-400" : "text-slate-400"}`} />
                  <span>{item.label}</span>
                </div>
                <div className="flex items-center gap-1.5">
                  {item.badge && (
                    <span className="text-[9px] font-black uppercase px-1.5 py-0.5 rounded-md bg-purple-500/20 text-purple-300 border border-purple-400/30">
                      {item.badge}
                    </span>
                  )}
                  {isActive && <ChevronRight className="h-3.5 w-3.5 text-purple-400" />}
                </div>
              </Link>
            );
          })}

          <div className="pt-3 pb-2">
            <div className="border-t border-white/10" />
          </div>

          <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400 px-3 pb-1">
            Department Operations
          </p>
          <Link
            to="/government/dashboard"
            className="flex items-center justify-between rounded-xl px-3.5 py-2.5 text-xs font-medium text-slate-400 hover:text-white hover:bg-white/5 transition"
          >
            <div className="flex items-center gap-3">
              <Layers className="h-4 w-4 text-blue-400" />
              <span>Officer Operational View</span>
            </div>
            <ExternalLink className="h-3 w-3 text-slate-500" />
          </Link>
        </nav>
      </div>

      {/* Footer Profile & Logout */}
      <div className="border-t border-white/10 pt-4 space-y-3">
        <div className="flex items-center gap-3 px-2 py-1">
          <div className="grid h-9 w-9 place-items-center rounded-full bg-purple-600 text-white font-bold shrink-0 text-xs shadow-md">
            {cleanName.charAt(0) || "A"}
          </div>
          <div className="min-w-0 flex-1 leading-tight">
            <p className="truncate text-xs font-black text-white">{cleanName}</p>
            <p className="text-[10px] font-bold text-purple-300">Chief Administrator</p>
          </div>
        </div>

        <button
          onClick={logout}
          className="w-full flex items-center gap-2 text-xs font-bold text-rose-400 hover:text-rose-300 transition-colors px-2 pt-1 cursor-pointer"
        >
          <LogOut className="h-4 w-4" />
          <span>Exit / Sign Out</span>
        </button>
      </div>
    </div>
  );

  return (
    <div className="flex min-h-screen bg-[#F8FAFC] font-sans text-slate-800 overflow-x-hidden w-full">
      {/* Mobile Top Header */}
      <div className="sticky top-0 z-30 flex items-center justify-between border-b bg-[#0B152B] p-4 text-white lg:hidden w-full">
        <div className="flex items-center gap-2">
          <Shield className="h-6 w-6 text-purple-400" />
          <span className="font-extrabold text-sm">Admin Command HQ</span>
        </div>
        <button
          onClick={() => setMobileOpen(true)}
          className="rounded-lg p-2 text-white hover:bg-white/10"
        >
          <Menu className="h-6 w-6" />
        </button>
      </div>

      {/* Desktop Fixed Sidebar */}
      <aside className="fixed inset-y-0 left-0 hidden w-64 lg:block z-40">
        {sidebarContent}
      </aside>

      {/* Mobile Drawer */}
      {mobileOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div
            className="fixed inset-0 bg-black/60 backdrop-blur-xs"
            onClick={() => setMobileOpen(false)}
          />
          <div className="fixed inset-y-0 left-0 w-72 shadow-2xl">
            {sidebarContent}
          </div>
        </div>
      )}

      {/* Main Viewport Content Area */}
      <div className="flex flex-1 flex-col min-w-0 w-full overflow-x-hidden lg:pl-64">
        {/* Executive Top Header */}
        <header className="sticky top-0 z-20 flex h-16 items-center justify-between border-b border-slate-200 bg-white px-4 sm:px-8 shadow-2xs w-full min-w-0 gap-4">
          <div className="flex items-center gap-3">
            <span className="hidden sm:inline-flex items-center gap-1.5 rounded-full bg-purple-50 border border-purple-200 px-3 py-1 text-xs font-extrabold text-purple-800">
              <Sparkles className="h-3 w-3 text-purple-600" />
              <span>Municipal Central Administration</span>
            </span>
            <span className="text-xs text-slate-400 hidden md:inline">
              Supervising: Jal Board, PWD Roads, Swachhata, Power &amp; Safety
            </span>
          </div>

          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2 pl-2 pr-3 py-1 rounded-full bg-slate-100/80 border border-slate-200/80 text-xs">
              <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
              <span className="font-semibold text-slate-700">Live HQ Status: Online</span>
            </div>

            <Link
              to="/government/dashboard"
              className="hidden md:inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs font-bold text-slate-600 hover:bg-slate-50 transition"
              title="Open Department Officer Interface"
            >
              <span>Officer View</span>
              <ArrowRight className="h-3 w-3 text-slate-400" />
            </Link>
          </div>
        </header>

        {/* Page Content */}
        <main className="flex-1 p-4 sm:p-6 lg:p-8 max-w-[1600px] w-full mx-auto space-y-6">
          {children}
        </main>
      </div>
    </div>
  );
}

export default AdminLayout;
