import React, { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import {
  Bell,
  X,
  CheckCheck,
  Check,
  Clock,
  Search,
  ShieldCheck,
  Megaphone,
  AlertCircle,
  ExternalLink,
  Filter,
  Inbox,
  Sparkles,
} from "lucide-react";
import { toast } from "sonner";
import notificationService from "../../services/notificationService";
import { useLanguage } from "../../context/LanguageContext";

export function NotificationCenterModal({
  isOpen,
  onClose,
  notifications = [],
  onNotificationsChange,
}) {
  const navigate = useNavigate();
  const { t } = useLanguage();
  const [activeTab, setActiveTab] = useState("all"); // "all" | "unread" | "complaint" | "announcement"
  const [searchQuery, setSearchQuery] = useState("");
  const [loadingAction, setLoadingAction] = useState(false);

  // Close on Escape key
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === "Escape" && isOpen) {
        onClose();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  // Lock body scroll when modal is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [isOpen]);

  const unreadCount = useMemo(() => {
    return notifications.filter((n) => !n.isRead).length;
  }, [notifications]);

  // Filtered notifications
  const filteredNotifications = useMemo(() => {
    return notifications.filter((item) => {
      // Tab filter
      if (activeTab === "unread" && item.isRead) return false;
      if (activeTab === "complaint" && item.type !== "Complaint" && !item.message?.includes("grievance") && !item.message?.includes("#GRV")) return false;
      if (activeTab === "announcement" && item.type !== "Announcement" && !item.message?.includes("📢") && !item.message?.toLowerCase().includes("notice")) return false;

      // Search query
      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase();
        const msg = (item.message || "").toLowerCase();
        const type = (item.type || "").toLowerCase();
        return msg.includes(query) || type.includes(query);
      }

      return true;
    });
  }, [notifications, activeTab, searchQuery]);

  // Mark all as read
  const handleMarkAllRead = async () => {
    setLoadingAction(true);
    try {
      await notificationService.markAllAsRead();
      const updated = notifications.map((n) => ({ ...n, isRead: true }));
      if (onNotificationsChange) onNotificationsChange(updated);
      window.dispatchEvent(new Event("notifications_updated"));
      toast.success("All notifications marked as read");
    } catch (err) {
      toast.error("Failed to mark all as read");
    } finally {
      setLoadingAction(false);
    }
  };

  // Mark single as read
  const handleMarkSingleRead = async (notifId, e) => {
    if (e) e.stopPropagation();
    try {
      await notificationService.markAsRead(notifId);
      const updated = notifications.map((n) =>
        n._id === notifId ? { ...n, isRead: true } : n
      );
      if (onNotificationsChange) onNotificationsChange(updated);
      window.dispatchEvent(new Event("notifications_updated"));
    } catch {
      // ignore
    }
  };

  // Extract Grievance ID if present in the message
  const extractGrievanceInfo = (msg = "") => {
    const match = msg.match(/#(GRV\d+|SG\d+|comp_\w+)/i);
    return match ? match[1] : null;
  };

  const handleNavigateToGrievance = (grvNumber) => {
    onClose();
    if (grvNumber) {
      navigate(`/citizen/track?search=${encodeURIComponent(grvNumber)}`);
    } else {
      navigate("/citizen/complaints");
    }
  };

  if (!isOpen) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 animate-in fade-in duration-200"
    >
      {/* Backdrop */}
      <div
        onClick={onClose}
        className="fixed inset-0 bg-slate-950/65 backdrop-blur-xs transition-opacity"
      />

      {/* Modal Window Container */}
      <div className="relative w-full max-w-2xl max-h-[88vh] rounded-3xl bg-white shadow-2xl border border-slate-200 flex flex-col overflow-hidden z-10 animate-in zoom-in-95 duration-200">
        
        {/* ================= MODAL HEADER ================= */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-gradient-to-r from-slate-50/80 via-white to-blue-50/30 shrink-0">
          <div className="flex items-center gap-3">
            <span className="grid h-10 w-10 place-items-center rounded-2xl bg-blue-600 text-white shadow-md shadow-blue-500/20">
              <Bell className="h-5 w-5" />
            </span>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base sm:text-lg font-black text-slate-900 tracking-tight">
                  Notification Center
                </h3>
                {unreadCount > 0 && (
                  <span className="inline-flex items-center rounded-full bg-blue-100 px-2.5 py-0.5 text-[11px] font-bold text-blue-700">
                    {unreadCount} Unread
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-500">
                Official municipal updates, status changes & civic alerts
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {unreadCount > 0 && (
              <button
                type="button"
                onClick={handleMarkAllRead}
                disabled={loadingAction}
                className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold text-blue-600 hover:bg-blue-50 transition cursor-pointer"
              >
                <CheckCheck className="h-3.5 w-3.5" />
                <span>Mark all as read</span>
              </button>
            )}
            <button
              type="button"
              onClick={onClose}
              className="grid h-8 w-8 place-items-center rounded-full text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition cursor-pointer"
              aria-label="Close notifications window"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        {/* ================= SEARCH & TABS BAR ================= */}
        <div className="px-6 py-3 border-b border-slate-100 bg-white space-y-3 shrink-0">
          {/* Quick Search */}
          <div className="relative">
            <Search className="absolute left-3.5 top-2.5 h-3.5 w-3.5 text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search notifications by keyword or grievance number…"
              className="h-8 w-full pl-9 pr-8 text-xs rounded-xl border border-slate-200 bg-slate-50 placeholder:text-slate-400 focus:outline-none focus:border-blue-500 focus:bg-white transition"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery("")}
                className="absolute right-2.5 top-2 text-slate-400 hover:text-slate-600"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            )}
          </div>

          {/* Filter Pills */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-0.5 text-xs">
            <button
              type="button"
              onClick={() => setActiveTab("all")}
              className={`px-3 py-1 rounded-lg font-bold transition cursor-pointer shrink-0 ${
                activeTab === "all"
                  ? "bg-blue-600 text-white shadow-xs"
                  : "bg-slate-100 text-slate-600 hover:bg-slate-200"
              }`}
            >
              All ({notifications.length})
            </button>

            <button
              type="button"
              onClick={() => setActiveTab("unread")}
              className={`px-3 py-1 rounded-lg font-bold transition cursor-pointer shrink-0 ${
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
              className={`px-3 py-1 rounded-lg font-bold transition cursor-pointer shrink-0 ${
                activeTab === "complaint"
                  ? "bg-blue-600 text-white shadow-xs"
                  : "bg-slate-100 text-slate-600 hover:bg-slate-200"
              }`}
            >
              Grievance Updates
            </button>

            <button
              type="button"
              onClick={() => setActiveTab("announcement")}
              className={`px-3 py-1 rounded-lg font-bold transition cursor-pointer shrink-0 ${
                activeTab === "announcement"
                  ? "bg-blue-600 text-white shadow-xs"
                  : "bg-slate-100 text-slate-600 hover:bg-slate-200"
              }`}
            >
              Civic Notices
            </button>
          </div>
        </div>

        {/* ================= NOTIFICATION LIST ================= */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-2.5 bg-slate-50/50">
          {filteredNotifications.length === 0 ? (
            <div className="py-12 text-center text-slate-400 space-y-3">
              <span className="grid h-14 w-14 place-items-center rounded-3xl bg-slate-100 text-slate-400 mx-auto">
                <Inbox className="h-7 w-7" />
              </span>
              <div>
                <p className="text-sm font-bold text-slate-700">No notifications found</p>
                <p className="text-xs text-slate-400 max-w-xs mx-auto mt-1 leading-relaxed">
                  {searchQuery
                    ? `No notifications matching "${searchQuery}". Try a different keyword.`
                    : activeTab === "unread"
                    ? "You have read all recent notifications. You're all caught up!"
                    : "You will receive real-time updates as your grievances progress or municipal notices are broadcasted."}
                </p>
              </div>
            </div>
          ) : (
            filteredNotifications.map((n) => {
              const isNotice = n.type === "Announcement" || n.message?.includes("📢") || n.message?.toLowerCase().includes("notice");
              const grvId = extractGrievanceInfo(n.message);

              return (
                <div
                  key={n._id}
                  className={`relative p-4 rounded-2xl border transition-all ${
                    !n.isRead
                      ? "bg-white border-blue-200 shadow-sm ring-1 ring-blue-500/10"
                      : "bg-white/70 border-slate-200/80 hover:bg-white text-slate-700"
                  }`}
                >
                  <div className="flex items-start gap-3">
                    {/* Icon */}
                    <span
                      className={`grid h-9 w-9 place-items-center rounded-xl shrink-0 mt-0.5 ${
                        isNotice
                          ? "bg-amber-100 text-amber-700"
                          : !n.isRead
                          ? "bg-blue-100 text-blue-700"
                          : "bg-slate-100 text-slate-500"
                      }`}
                    >
                      {isNotice ? (
                        <Megaphone className="h-4 w-4" />
                      ) : (
                        <ShieldCheck className="h-4 w-4" />
                      )}
                    </span>

                    {/* Content */}
                    <div className="flex-1 min-w-0 space-y-1.5">
                      <div className="flex items-center justify-between gap-2">
                        <span
                          className={`text-[10px] font-extrabold uppercase tracking-wider px-2 py-0.5 rounded-md ${
                            isNotice
                              ? "bg-amber-50 text-amber-800 border border-amber-200"
                              : "bg-blue-50 text-blue-800 border border-blue-200"
                          }`}
                        >
                          {isNotice ? "Official Civic Notice" : "Grievance Progress"}
                        </span>

                        <div className="flex items-center gap-2">
                          <span className="text-[11px] text-slate-400 flex items-center gap-1 font-medium">
                            <Clock className="h-3 w-3" />
                            {n.createdAt
                              ? new Date(n.createdAt).toLocaleDateString("en-IN", {
                                  day: "numeric",
                                  month: "short",
                                  hour: "2-digit",
                                  minute: "2-digit",
                                })
                              : "Just now"}
                          </span>
                          {!n.isRead && (
                            <span
                              className="h-2 w-2 rounded-full bg-blue-600 shrink-0"
                              title="Unread notification"
                            />
                          )}
                        </div>
                      </div>

                      <p
                        className={`text-xs sm:text-sm leading-relaxed ${
                          !n.isRead ? "font-semibold text-slate-900" : "text-slate-600"
                        }`}
                      >
                        {n.message}
                      </p>

                      {/* Action Bar */}
                      <div className="flex items-center justify-between pt-1 text-xs">
                        {grvId ? (
                          <button
                            type="button"
                            onClick={() => handleNavigateToGrievance(grvId)}
                            className="inline-flex items-center gap-1.5 text-xs font-bold text-blue-600 hover:text-blue-800 transition cursor-pointer"
                          >
                            <span>Track #{grvId}</span>
                            <ExternalLink className="h-3 w-3" />
                          </button>
                        ) : (
                          <span />
                        )}

                        {!n.isRead && (
                          <button
                            type="button"
                            onClick={(e) => handleMarkSingleRead(n._id, e)}
                            className="inline-flex items-center gap-1 text-[11px] font-semibold text-slate-500 hover:text-blue-700 px-2 py-1 rounded-lg hover:bg-slate-100 transition cursor-pointer"
                          >
                            <Check className="h-3.5 w-3.5 text-slate-400" />
                            <span>Mark read</span>
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* ================= MODAL FOOTER ================= */}
        <div className="px-6 py-3.5 border-t border-slate-100 bg-white flex items-center justify-between shrink-0 text-xs text-slate-500">
          <span>
            Showing <strong className="text-slate-800">{filteredNotifications.length}</strong> of{" "}
            {notifications.length} notifications
          </span>

          <div className="flex items-center gap-2">
            {unreadCount > 0 && (
              <button
                type="button"
                onClick={handleMarkAllRead}
                className="sm:hidden font-bold text-blue-600 hover:underline cursor-pointer"
              >
                Mark all read
              </button>
            )}
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold transition cursor-pointer"
            >
              Close
            </button>
          </div>
        </div>

      </div>
    </div>
  );
}

export default NotificationCenterModal;

