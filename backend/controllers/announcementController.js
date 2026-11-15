const Announcement = require("../models/Announcement");
const Notification = require("../models/Notification");
const User = require("../models/User");
const Department = require("../models/Department");
const { getIsConnected } = require("../config/db");

// Default initial announcements & directives (with 3-day active window for initial samples)
const DEFAULT_ANNOUNCEMENTS = [
  {
    _id: "ann_001",
    title: "Monsoon Preparedness Drainage Cleaning",
    message: "Special desilting and drain unclogging drive active in all wards. Report blockages immediately.",
    category: "Sanitation & Waste Management",
    priority: "High",
    targetAudience: "citizens",
    directiveType: "General Notice",
    expiresAt: new Date(Date.now() + 72 * 60 * 60 * 1000).toISOString(),
    expiryDate: new Date(Date.now() + 72 * 60 * 60 * 1000).toISOString(),
    createdAt: new Date().toISOString(),
  },
  {
    _id: "ann_002",
    title: "Streetlight LED Upgrades",
    message: "Municipal energy conservation drive converting older sodium lamps to smart LEDs in Sectors 11 through 18.",
    category: "Electricity & Power",
    priority: "Medium",
    targetAudience: "citizens",
    directiveType: "General Notice",
    expiresAt: new Date(Date.now() + 96 * 60 * 60 * 1000).toISOString(),
    expiryDate: new Date(Date.now() + 96 * 60 * 60 * 1000).toISOString(),
    createdAt: new Date().toISOString(),
  },
  {
    _id: "ann_003",
    title: "Executive Order: Water Feeder Pipeline Audit",
    message: "Mandatory physical inspection of all main supply feeder lines in Sectors 14 through 22. Submit compliance report by Friday 5 PM.",
    category: "Water Supply Department",
    priority: "Critical",
    targetAudience: "department_officers",
    targetDepartmentName: "Water Supply Department",
    directiveType: "Inspection Order",
    expiresAt: new Date(Date.now() + 120 * 60 * 60 * 1000).toISOString(),
    expiryDate: new Date(Date.now() + 120 * 60 * 60 * 1000).toISOString(),
    createdAt: new Date().toISOString(),
  },
  {
    _id: "ann_004",
    title: "All-Hands Directive: 48-Hour Civic Redressal SLA",
    message: "All department officers must triage new incoming grievances within 2 hours and initiate field dispatch within 24 hours.",
    category: "Executive Administration",
    priority: "High",
    targetAudience: "all_officers",
    directiveType: "SLA Escalation",
    expiresAt: new Date(Date.now() + 168 * 60 * 60 * 1000).toISOString(),
    expiryDate: new Date(Date.now() + 168 * 60 * 60 * 1000).toISOString(),
    createdAt: new Date().toISOString(),
  },
];

let inMemoryAnnouncements = [...DEFAULT_ANNOUNCEMENTS];

// Helper to calculate exact expiration timestamp from duration or direct dates
const computeExpirationDate = (expiresAt, expiryDate, expiresIn, duration) => {
  if (expiresAt) {
    const d = new Date(expiresAt);
    return isNaN(d.getTime()) ? null : d;
  }
  if (expiryDate) {
    const d = new Date(expiryDate);
    return isNaN(d.getTime()) ? null : d;
  }

  const dur = expiresIn || duration;
  if (!dur || dur === "never") return null;

  const now = Date.now();
  const hour = 60 * 60 * 1000;

  switch (dur) {
    case "1_hour":
      return new Date(now + 1 * hour);
    case "6_hours":
      return new Date(now + 6 * hour);
    case "12_hours":
      return new Date(now + 12 * hour);
    case "24_hours":
    case "1_day":
      return new Date(now + 24 * hour);
    case "48_hours":
    case "2_days":
      return new Date(now + 48 * hour);
    case "3_days":
      return new Date(now + 3 * 24 * hour);
    case "7_days":
    case "1_week":
      return new Date(now + 7 * 24 * hour);
    case "30_days":
      return new Date(now + 30 * 24 * hour);
    default:
      // Check if it's a valid date string
      const parsed = new Date(dur);
      return isNaN(parsed.getTime()) ? null : parsed;
  }
};

// Create Announcement / Executive Directive with Department-wise Targeting & Auto-Disappear Expiration
const createAnnouncement = async (req, res) => {
  try {
    const {
      title,
      message,
      category = "General Notice",
      priority = "High",
      targetAudience = "all_officers", // 'all_officers' | 'department_officers' | 'citizens'
      targetDepartment,
      targetDepartmentName = "",
      directiveType = "Official Memo",
      deadlineDate,
      targetWard = "All Wards",
      expiresAt,
      expiryDate,
      expiresIn,
      duration,
    } = req.body;

    if (!title || !title.trim() || !message || !message.trim()) {
      return res.status(400).json({ message: "Title and message are required." });
    }

    const calculatedExpiresAt = computeExpirationDate(expiresAt, expiryDate, expiresIn, duration);

    let deptId = null;
    let deptName = (targetDepartmentName || "").trim();

    if (getIsConnected()) {
      if (targetAudience === "department_officers" && (targetDepartment || targetDepartmentName)) {
        const queryOr = [];
        if (targetDepartment && String(targetDepartment).match(/^[0-9a-fA-F]{24}$/)) {
          queryOr.push({ _id: targetDepartment });
        }
        if (targetDepartmentName) {
          queryOr.push({
            departmentName: new RegExp(`^${targetDepartmentName.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}`, "i"),
          });
        }
        if (queryOr.length > 0) {
          const dRecord = await Department.findOne({ $or: queryOr });
          if (dRecord) {
            deptId = dRecord._id;
            deptName = dRecord.departmentName;
          }
        }
      }

      const announcement = await Announcement.create({
        title: title.trim(),
        message: message.trim(),
        category: category || deptName || "Official Notice",
        priority,
        targetAudience,
        targetDepartment: deptId,
        targetDepartmentName: deptName,
        directiveType,
        deadlineDate: deadlineDate || null,
        expiresAt: calculatedExpiresAt,
        expiryDate: calculatedExpiresAt,
        targetWard,
        createdBy: req.user?._id,
      });

      // Dispatch in-app notifications with matching expiration timestamp
      try {
        if (targetAudience === "department_officers" && deptId) {
          const officers = await User.find({ role: "officer", department: deptId }).select("_id");
          if (officers.length > 0) {
            const notifs = officers.map((o) => ({
              user: o._id,
              announcement: announcement._id,
              message: `📋 [Admin Directive — ${directiveType}]: "${title.trim()}" issued to ${deptName}.`,
              type: "Announcement",
              expiresAt: calculatedExpiresAt,
              isRead: false,
            }));
            await Notification.insertMany(notifs);
          }
        } else if (targetAudience === "all_officers") {
          const officers = await User.find({ role: "officer" }).select("_id");
          if (officers.length > 0) {
            const notifs = officers.map((o) => ({
              user: o._id,
              announcement: announcement._id,
              message: `🏛️ [All-Hands Admin Directive]: "${title.trim()}". ${message.slice(0, 80)}…`,
              type: "Announcement",
              expiresAt: calculatedExpiresAt,
              isRead: false,
            }));
            await Notification.insertMany(notifs);
          }
        } else if (targetAudience === "citizens") {
          const citizens = await User.find({ role: { $in: ["client", "citizen"] } }).select("_id").limit(100);
          if (citizens.length > 0) {
            const notifs = citizens.map((c) => ({
              user: c._id,
              announcement: announcement._id,
              message: `📢 Official Civic Notice: ${title.trim()} - ${message.slice(0, 90)}...`,
              type: "Announcement",
              expiresAt: calculatedExpiresAt,
              isRead: false,
            }));
            await Notification.insertMany(notifs);
          }
        }
      } catch (notifErr) {
        console.error("Notice notification dispatch error:", notifErr);
      }

      return res.status(201).json(announcement);
    }

    // In-memory fallback
    const ann = {
      _id: `ann-${Date.now()}`,
      title: title.trim(),
      message: message.trim(),
      category: category || deptName || "Official Notice",
      priority,
      targetAudience,
      targetDepartment: deptId,
      targetDepartmentName: deptName,
      directiveType,
      deadlineDate: deadlineDate || null,
      expiresAt: calculatedExpiresAt ? calculatedExpiresAt.toISOString() : null,
      expiryDate: calculatedExpiresAt ? calculatedExpiresAt.toISOString() : null,
      targetWard,
      createdBy: { _id: req.user?._id, name: req.user?.name || "Administrator" },
      createdAt: new Date().toISOString(),
    };
    inMemoryAnnouncements.unshift(ann);

    // Also dispatch in-memory notifications with expiration
    try {
      const { inMemoryUsers } = require("./authController");
      const { inMemoryNotifications } = require("./notificationController");

      if (targetAudience === "citizens") {
        const citizenUsers = inMemoryUsers.filter((u) => u.role === "client" || u.role === "citizen");
        citizenUsers.forEach((c) => {
          inMemoryNotifications.unshift({
            _id: "notif_" + Date.now() + "_" + Math.random().toString(36).substr(2, 5),
            user: c._id,
            announcement: ann._id,
            message: `📢 Official Civic Notice: ${title.trim()} - ${message.slice(0, 90)}...`,
            type: "Announcement",
            expiresAt: calculatedExpiresAt ? calculatedExpiresAt.toISOString() : null,
            isRead: false,
            createdAt: new Date().toISOString(),
          });
        });
      } else if (targetAudience === "all_officers") {
        const officerUsers = inMemoryUsers.filter((u) => u.role === "officer");
        officerUsers.forEach((o) => {
          inMemoryNotifications.unshift({
            _id: "notif_" + Date.now() + "_" + Math.random().toString(36).substr(2, 5),
            user: o._id,
            announcement: ann._id,
            message: `🏛️ [All-Hands Admin Directive]: "${title.trim()}". ${message.slice(0, 80)}…`,
            type: "Announcement",
            expiresAt: calculatedExpiresAt ? calculatedExpiresAt.toISOString() : null,
            isRead: false,
            createdAt: new Date().toISOString(),
          });
        });
      }
    } catch {
      // In-memory notification dispatch fallback
    }

    res.status(201).json(ann);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Get Announcements / Directives with role, department audience isolation & expiration auto-disappear
const getAnnouncements = async (req, res) => {
  try {
    const userRole = req.user?.role;
    const userDept = typeof req.user?.department === "object"
      ? req.user?.department?.departmentName
      : req.user?.department;
    const audienceQuery = req.query.audience; // optional filter
    const statusQuery = req.query.status; // 'active' | 'expired' | 'all'
    const now = new Date();

    if (getIsConnected()) {
      let query = {};

      if (audienceQuery) {
        query.targetAudience = audienceQuery;
      } else if (userRole === "client" || userRole === "citizen") {
        // Citizens ONLY see public citizen announcements that have NOT expired
        query.$and = [
          {
            $or: [
              { targetAudience: "citizens" },
              { targetAudience: "all" },
              { targetAudience: { $exists: false } },
            ],
          },
          {
            $or: [
              { expiresAt: { $exists: false } },
              { expiresAt: null },
              { expiresAt: { $gt: now } },
            ],
          },
          {
            $or: [
              { expiryDate: { $exists: false } },
              { expiryDate: null },
              { expiryDate: { $gt: now } },
            ],
          },
        ];
      } else if (userRole === "officer") {
        // Officers see:
        // 1. All-hands officer directives
        // 2. Directives specifically targeted to their department
        // 3. Public civic notices
        const officerConditions = [
          { targetAudience: "all_officers" },
          { targetAudience: "all" },
          { targetAudience: "citizens" },
          { targetAudience: { $exists: false } },
        ];
        if (userDept) {
          officerConditions.push({
            targetAudience: "department_officers",
            targetDepartmentName: { $regex: new RegExp(userDept.split(" ")[0], "i") },
          });
        }
        query.$or = officerConditions;

        // Apply status filter for officers if requested
        if (statusQuery === "active") {
          query.$and = query.$and || [];
          query.$and.push({
            $or: [
              { expiresAt: { $exists: false } },
              { expiresAt: null },
              { expiresAt: { $gt: now } },
            ],
          });
        } else if (statusQuery === "expired") {
          query.$and = query.$and || [];
          query.$and.push({
            expiresAt: { $lte: now },
          });
        }
      }
      // Admins see all announcements & directives (or filtered by statusQuery)
      if (userRole === "admin") {
        if (statusQuery === "active") {
          query.$or = [
            { expiresAt: { $exists: false } },
            { expiresAt: null },
            { expiresAt: { $gt: now } },
          ];
        } else if (statusQuery === "expired") {
          query.expiresAt = { $lte: now };
        }
      }

      const announcements = await Announcement.find(query)
        .populate("createdBy", "name email")
        .sort({ createdAt: -1 });
      return res.status(200).json(announcements);
    }

    // In-memory fallback
    let items = [...inMemoryAnnouncements];
    const nowMs = Date.now();

    if (audienceQuery) {
      items = items.filter((a) => a.targetAudience === audienceQuery);
    } else if (userRole === "client" || userRole === "citizen") {
      // Hide expired announcements from citizens
      items = items.filter((a) => {
        if (a.targetAudience && a.targetAudience !== "citizens" && a.targetAudience !== "all") {
          return false;
        }
        const exp = a.expiresAt || a.expiryDate;
        if (exp && new Date(exp).getTime() <= nowMs) {
          return false;
        }
        return true;
      });
    } else if (userRole === "officer") {
      items = items.filter((a) => {
        if (!a.targetAudience || a.targetAudience === "all_officers" || a.targetAudience === "all" || a.targetAudience === "citizens") {
          return true;
        }
        if (a.targetAudience === "department_officers" && userDept && a.targetDepartmentName) {
          return (
            a.targetDepartmentName.toLowerCase().includes(userDept.toLowerCase().split(" ")[0]) ||
            userDept.toLowerCase().includes(a.targetDepartmentName.toLowerCase().split(" ")[0])
          );
        }
        return false;
      });
    }

    // Apply status filter for in-memory if specified
    if (statusQuery === "active") {
      items = items.filter((a) => {
        const exp = a.expiresAt || a.expiryDate;
        return !exp || new Date(exp).getTime() > nowMs;
      });
    } else if (statusQuery === "expired") {
      items = items.filter((a) => {
        const exp = a.expiresAt || a.expiryDate;
        return exp && new Date(exp).getTime() <= nowMs;
      });
    }

    res.status(200).json(items);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Update Announcement
const updateAnnouncement = async (req, res) => {
  try {
    const { title, message, priority, expiresAt, expiryDate, expiresIn } = req.body;
    const calculatedExpiresAt = computeExpirationDate(expiresAt, expiryDate, expiresIn);

    if (getIsConnected()) {
      const announcement = await Announcement.findById(req.params.id);
      if (!announcement) {
        return res.status(404).json({ message: "Announcement not found" });
      }
      announcement.title = title || announcement.title;
      announcement.message = message || announcement.message;
      announcement.priority = priority || announcement.priority;
      if (calculatedExpiresAt !== undefined) {
        announcement.expiresAt = calculatedExpiresAt;
        announcement.expiryDate = calculatedExpiresAt;
      }
      await announcement.save();
      return res.status(200).json(announcement);
    }

    const item = inMemoryAnnouncements.find((a) => a._id === req.params.id);
    if (item) {
      item.title = title || item.title;
      item.message = message || item.message;
      if (calculatedExpiresAt !== undefined) {
        item.expiresAt = calculatedExpiresAt ? calculatedExpiresAt.toISOString() : null;
        item.expiryDate = calculatedExpiresAt ? calculatedExpiresAt.toISOString() : null;
      }
      return res.status(200).json(item);
    }
    res.status(404).json({ message: "Announcement not found" });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Delete Announcement
const deleteAnnouncement = async (req, res) => {
  try {
    if (getIsConnected()) {
      const announcement = await Announcement.findById(req.params.id);
      if (!announcement) {
        return res.status(404).json({ message: "Announcement not found" });
      }
      // Also delete related notifications
      await Notification.deleteMany({ announcement: announcement._id });
      await announcement.deleteOne();
      return res.status(200).json({ message: "Announcement deleted successfully" });
    }

    inMemoryAnnouncements = inMemoryAnnouncements.filter((a) => a._id !== req.params.id);
    // Also remove from inMemoryNotifications
    try {
      const { inMemoryNotifications } = require("./notificationController");
      const index = inMemoryNotifications.findIndex((n) => n.announcement === req.params.id);
      if (index !== -1) inMemoryNotifications.splice(index, 1);
    } catch {}

    res.status(200).json({ message: "Announcement deleted successfully" });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

module.exports = {
  createAnnouncement,
  getAnnouncements,
  updateAnnouncement,
  deleteAnnouncement,
  inMemoryAnnouncements,
};
