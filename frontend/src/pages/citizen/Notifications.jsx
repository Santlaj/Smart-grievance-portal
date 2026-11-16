import React, { useState, useEffect, useMemo } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  Bell,
  CheckCheck,
  Check,
  Clock,
  Search,
  ShieldCheck,
  Megaphone,
  AlertCircle,
  RefreshCw,
  Inbox,
  ArrowRight,
  Filter,
  Sparkles,
} from "lucide-react";
import { toast } from "sonner";
import CitizenLayout from "../../components/citizen/CitizenLayout";
import { Button } from "../../components/ui/Button";
import { useLanguage } from "../../context/LanguageContext";
import notificationService from "../../services/notificationService";

export function Notifications() {
  const { t } = useLanguage();
  const navigate = useNavigate();
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("all"); // "all" | "unread" | "complaint" | "announcement"
  const [searchQuery, setSearchQuery] = useState("");
  const [busyAction, setBusyAction] = useState(false);

  // Fetch notifications
  const loadNotifications = async (quiet = false) => {
    if (!quiet) setLoading(true);
    try {
      const data = await notificationService.getNotifications();
      if (Array.isArray(data)) {
        setNotifications(data);
      } else {
        setNotifications([]);
      }
    } catch (err) {
      if (!quiet) toast.error("Could not load notifications");
      setNotifications([]);
    } finally {
      if (!quiet) setLoading(false);
    }
  };

  useEffect(() => {
    loadNotifications();
    const interval = setInterval(() => loadNotifications(true), 15000);
    const onSync = () => loadNotifications(true);
    window.addEventListener("notifications_updated", onSync);
    return () => {
      clearInterval(interval);
      window.removeEventListener("notifications_updated", onSync);
    };
  }, []);

  const nowMs = Date.now();

  const unreadCount = useMemo(() => {
    return notifications.filter((n) => {
      if (n.isRead) return false;
      if (n.expiresAt && new Date(n.expiresAt).getTime() <= nowMs) return false;
      return true;
    }).length;
  }, [notifications, nowMs]);

  // Filtered notifications (auto-hides expired broadcast announcements from citizens)
  const filteredNotifications = useMemo(() => {
    return notifications.filter((item) => {
      // Expiration check for broadcast notices
      if (item.expiresAt && new Date(item.expiresAt).getTime() <= nowMs) {
        return false;
      }

      if (activeTab === "unread" && item.isRead) return false;
      if (
        activeTab === "complaint" &&
        item.type !== "Complaint" &&
        !item.message?.includes("grievance") &&
        !item.message?.includes("#GRV")
      ) {
        return false;
      }
      if (
        activeTab === "announcement" &&
        item.type !== "Announcement" &&
        !item.message?.includes("📢") &&
        !item.message?.toLowerCase().includes("notice")
      ) {
        return false;
      }

      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase();
        const msg = (item.message || "").toLowerCase();
        const type = (item.type || "").toLowerCase();
        return msg.includes(query) || type.includes(query);
      }

      return true;
    });
  }, [notifications, activeTab, searchQuery, nowMs]);

  // Mark all as read
  const handleMarkAllRead = async () => {
    setBusyAction(true);
    try {
      await notificationService.markAllAsRead();
      setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
      window.dispatchEvent(new Event("notifications_updated"));
      toast.success("All notifications marked as read");
    } catch {
      toast.error("Failed to mark all as read");
    } finally {
      setBusyAction(false);
    }
  };

  // Mark single as read
  const handleMarkSingleRead = async (notifId, e) => {
    if (e) e.stopPropagation();
    try {
      await notificationService.markAsRead(notifId);
      setNotifications((prev) =>
        prev.map((n) => (n._id === notifId ? { ...n, isRead: true } : n))
      );
      window.dispatchEvent(new Event("notifications_updated"));
      toast.success("Notification marked as read");
    } catch {
      toast.error("Failed to update status");
    }
  };

  // Extract Grievance ID from notification message
  const extractGrievanceInfo = (msg = "") => {
    const match = msg.match(/#(GRV\d+|SG\d+|comp_\w+)/i);
    return match ? match[1] : null;
  };

  return (
    <CitizenLayout>
      <div className="space-y-6">
        {/* ================= PAGE HEADER BANNER ================= */}
        <div className="rounded-3xl border border-slate-200 bg-white p-6 sm:p-8 shadow-card flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="flex items-start gap-4">
            <span className="grid h-14 w-14 place-items-center rounded-2xl bg-blue-600 text-white shadow-lg shadow-blue-500/20 shrink-0">
              <Bell className="h-7 w-7" />
            </span>
            <div className="space-y-1">
              <div className="flex flex-wrap items-center gap-2.5">
                <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
                  Notifications
                </h1>
                {unreadCount > 0 ? (
                  <span className="inline-flex items-center gap-1 rounded-full bg-blue-100 px-3 py-1 text-xs font-bold text-blue-700">
                    <span className="h-2 w-2 rounded-full bg-blue-600 animate-pulse" />
                    {unreadCount} Unread
                  </span>
                ) : (
                  <span className="inline-flex items-center rounded-full bg-emerald-100 px-3 py-1 text-xs font-bold text-emerald-700">
                    All Caught Up
                  </span>
                )}
              </div>
              <p className="text-xs sm:text-sm text-slate-500 max-w-xl">
                Stay updated on complaint progress, field officer inspections, and official municipal advisories.
              </p>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-wrap items-center gap-2.5 shrink-0">
            {unreadCount > 0 && (
              <Button
                variant="navy"
                size="sm"
                onClick={handleMarkAllRead}
                disabled={busyAction}
                className="font-bold rounded-xl"
              >
                <CheckCheck className="h-4 w-4" />
                <span>Mark All Read</span>
              </Button>
            )}

            <Button
              variant="outline"
              size="sm"
              onClick={() => loadNotifications()}
              className="font-bold rounded-xl"
              title="Refresh notifications"
            >
              <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
              <span className="hidden sm:inline">Refresh</span>
            </Button>
          </div>
        </div>

        {/* ================= FILTER CONTROLS & SEARCH BAR ================= */}
        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
          {/* Tab Pills */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 md:pb-0 text-xs">
            <button
              type="button"
              onClick={() => setActiveTab("all")}
              className={`px-4 py-2 rounded-xl font-bold transition cursor-pointer shrink-0 ${
                activeTab === "all"
                  ? "bg-blue-600 text-white shadow-xs"
                  : "bg-slate-100 text-slate-600 hover:bg-slate-200"
              }`}
            >
              All Notifications ({notifications.length})
            </button>

            <button
              type="button"
              onClick={() => setActiveTab("unread")}
              className={`px-4 py-2 rounded-xl font-bold transition cursor-pointer shrink-0 ${
                activeTab === "unread"
                  ? "bg-blue-600 text-white shadow-xs"
                  : "bg-slate-100 text-slate-600 hover:bg-slate-200"
              }`}
            >
              Unread ({unreadCount})
            </button>

            <button
              type="button"
              onClick={() => setActiveTab("complaint")}
              className={`px-4 py-2 rounded-xl font-bold transition cursor-pointer shrink-0 ${
                activeTab === "complaint"
                  ? "bg-blue-600 text-white shadow-xs"
                  : "bg-slate-100 text-slate-600 hover:bg-slate-200"
              }`}
            >
              Grievance Progress
            </button>

            <button
              type="button"
              onClick={() => setActiveTab("announcement")}
              className={`px-4 py-2 rounded-xl font-bold transition cursor-pointer shrink-0 ${
                activeTab === "announcement"
                  ? "bg-blue-600 text-white shadow-xs"
                  : "bg-slate-100 text-slate-600 hover:bg-slate-200"
              }`}
            >
              Official Civic Notices
            </button>
          </div>

          {/* Search Box */}
          <div className="relative w-full md:w-72">
            <Search className="absolute left-3.5 top-2.5 h-4 w-4 text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search in notifications…"
              className="h-9 w-full pl-9 pr-8 text-xs rounded-xl border border-slate-200 bg-slate-50 placeholder:text-slate-400 focus:outline-none focus:border-blue-500 focus:bg-white transition"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery("")}
                className="absolute right-2.5 top-2 text-slate-400 hover:text-slate-600"
              >
                ✕
              </button>
            )}
          </div>
        </div>

        {/* ================= NOTIFICATIONS CONTENT LIST ================= */}
        {loading ? (
          <div className="rounded-3xl border border-slate-200 bg-white p-12 text-center text-slate-500 space-y-3">
            <RefreshCw className="h-8 w-8 animate-spin mx-auto text-blue-600" />
            <p className="text-sm font-bold">Loading your notifications…</p>
          </div>
        ) : filteredNotifications.length === 0 ? (
          <div className="rounded-3xl border border-slate-200 bg-white p-12 text-center text-slate-400 space-y-3 shadow-card">
            <span className="grid h-16 w-16 place-items-center rounded-3xl bg-slate-100 text-slate-400 mx-auto">
              <Inbox className="h-8 w-8" />
            </span>
            <div>
              <p className="text-base font-bold text-slate-700">No notifications found</p>
              <p className="text-xs text-slate-400 max-w-sm mx-auto mt-1 leading-relaxed">
                {searchQuery
                  ? `No updates matching "${searchQuery}". Clear your search query to see other notifications.`
                  : activeTab === "unread"
                  ? "Great job! You have read all notifications. No pending unread items."
                  : "You will receive updates here as soon as municipal departments take action on your complaints."}
              </p>
            </div>
          </div>
        ) : (
          <div className="space-y-3">
            {filteredNotifications.map((n) => {
              const isNotice =
                n.type === "Announcement" ||
                n.message?.includes("📢") ||
                n.message?.toLowerCase().includes("notice");
              const grvNumber = extractGrievanceInfo(n.message);

              return (
                <div
                  key={n._id}
                  className={`rounded-2xl border p-5 transition-all shadow-xs ${
                    !n.isRead
                      ? "bg-white border-blue-200 shadow-sm ring-1 ring-blue-500/10"
                      : "bg-white border-slate-200 text-slate-700 hover:border-slate-300"
                  }`}
                >
                  <div className="flex items-start gap-4">
                    {/* Icon */}
                    <span
                      className={`grid h-11 w-11 place-items-center rounded-2xl shrink-0 mt-0.5 ${
                        isNotice
                          ? "bg-amber-100 text-amber-700"
                          : !n.isRead
                          ? "bg-blue-100 text-blue-700"
                          : "bg-slate-100 text-slate-500"
                      }`}
                    >
                      {isNotice ? (
                        <Megaphone className="h-5 w-5" />
                      ) : (
                        <ShieldCheck className="h-5 w-5" />
                      )}
                    </span>

                    {/* Notification Body */}
                    <div className="flex-1 min-w-0 space-y-2">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <div className="flex items-center gap-2">
                          <span
                            className={`text-[10px] font-extrabold uppercase tracking-wider px-2.5 py-1 rounded-md ${
                              isNotice
                                ? "bg-amber-50 text-amber-800 border border-amber-200"
                                : "bg-blue-50 text-blue-800 border border-blue-200"
                            }`}
                          >
                            {isNotice ? "Official Civic Notice" : "Grievance Milestone"}
                          </span>
                          {!n.isRead && (
                            <span className="inline-flex items-center gap-1 text-[10px] font-bold text-blue-700 bg-blue-50 border border-blue-200 px-2 py-0.5 rounded-full">
                              <span className="h-1.5 w-1.5 rounded-full bg-blue-600" />
                              Unread
                            </span>
                          )}
                        </div>

                        <span className="text-xs text-slate-400 font-medium flex items-center gap-1.5">
                          <Clock className="h-3.5 w-3.5" />
                          {n.createdAt
                            ? new Date(n.createdAt).toLocaleDateString("en-IN", {
                                weekday: "short",
                                day: "numeric",
                                month: "short",
                                hour: "2-digit",
                                minute: "2-digit",
                              })
                            : "Just now"}
                        </span>
                      </div>

                      <p
                        className={`text-sm leading-relaxed ${
                          !n.isRead
                            ? "font-semibold text-slate-900"
                            : "font-normal text-slate-700"
                        }`}
                      >
                        {n.message}
                      </p>

                      {/* Card Action Row */}
                      <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-slate-100 mt-2">
                        {grvNumber ? (
                          <Link
                            to={`/citizen/track?search=${encodeURIComponent(grvNumber)}`}
                            className="inline-flex items-center gap-1.5 text-xs font-bold text-blue-600 hover:text-blue-800 hover:underline transition"
                          >
                            <span>Track Status of #{grvNumber}</span>
                            <ArrowRight className="h-3.5 w-3.5" />
                          </Link>
                        ) : (
                          <Link
                            to="/citizen/complaints"
                            className="inline-flex items-center gap-1.5 text-xs font-bold text-blue-600 hover:text-blue-800 hover:underline transition"
                          >
                            <span>View All Grievances</span>
                            <ArrowRight className="h-3.5 w-3.5" />
                          </Link>
                        )}

                        {!n.isRead && (
                          <button
                            type="button"
                            onClick={(e) => handleMarkSingleRead(n._id, e)}
                            className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-600 hover:text-blue-700 bg-slate-100 hover:bg-blue-50 px-3 py-1 rounded-xl transition cursor-pointer"
                          >
                            <Check className="h-3.5 w-3.5" />
                            <span>Mark as read</span>
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* ================= PAGE FOOTER ================= */}
        <div className="flex items-center justify-between text-xs text-slate-500 pt-2 px-1">
          <span>
            Displaying <strong className="text-slate-800">{filteredNotifications.length}</strong>{" "}
            notifications
          </span>
          <button
            type="button"
            onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
            className="font-bold text-blue-600 hover:underline cursor-pointer"
          >
            Back to Top ↑
          </button>
        </div>
      </div>
    </CitizenLayout>
  );
}

export default Notifications;

