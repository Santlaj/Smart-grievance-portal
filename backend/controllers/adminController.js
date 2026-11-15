const bcrypt = require("bcryptjs");
const Complaint = require("../models/Complaint");
const User = require("../models/User");
const Department = require("../models/Department");
const Announcement = require("../models/Announcement");
const { getIsConnected } = require("../config/db");
const { inMemoryComplaints } = require("./complaintController");
const { inMemoryUsers } = require("./authController");
const { inMemoryDepartments } = require("./departmentController");
const { createNotification } = require("./notificationController");

// ====================== Get Admin Performance & Department Analytics ======================
const getAdminStats = async (req, res) => {
  try {
    let complaints = [];
    let users = [];
    let departments = [];

    if (getIsConnected()) {
      complaints = await Complaint.find()
        .populate("department", "departmentName")
        .populate("assignedOfficer", "name email department")
        .populate("citizen", "name email")
        .sort({ createdAt: -1 });
      users = await User.find().select("-password").populate("department", "departmentName");
      departments = await Department.find();
    } else {
      complaints = [...inMemoryComplaints];
      users = inMemoryUsers.map(({ passwordHash, ...rest }) => rest);
      departments = inMemoryDepartments && inMemoryDepartments.length > 0 ? [...inMemoryDepartments] : [];
    }

    const totalComplaints = complaints.length;
    const resolvedCount = complaints.filter(
      (c) => ["Resolved", "Closed", "RESOLVED_AWAITING_FEEDBACK"].includes(c.status) || c.isClosed
    ).length;
    const inProgressCount = complaints.filter(
      (c) => ["In Progress", "Assigned", "Accepted and Assigned", "Reopened"].includes(c.status) && !c.isClosed
    ).length;
    const pendingCount = complaints.filter(
      (c) => ["Pending", "Submitted — Awaiting Validation", "Under Manual Review", "Needs More Information"].includes(c.status) && !c.isClosed
    ).length;
    const rejectedCount = complaints.filter((c) => c.status === "Rejected").length;

    // Filter officers
    const officers = users.filter((u) => u.role === "officer");

    // Deduplicate departments by canonical division (Roads, Water, Sanitation, Electricity, Safety)
    const seenDivisions = new Set();
    const uniqueDepartments = [];

    const getDivKey = (name = "") => {
      const lower = name.toLowerCase();
      if (lower.includes("road") || lower.includes("infra") || lower.includes("pothole")) return "roads";
      if (lower.includes("water") || lower.includes("drain") || lower.includes("jal")) return "water";
      if (lower.includes("sanitat") || lower.includes("garbage") || lower.includes("waste")) return "sanitation";
      if (lower.includes("electr") || lower.includes("power") || lower.includes("light")) return "electricity";
      if (lower.includes("safety") || lower.includes("hazard") || lower.includes("danger")) return "safety";
      return lower;
    };

    // Prioritize canonical departments containing '&' or 'Supply'
    const sortedDepts = [...departments].sort((a, b) => {
      const aCanon = a.departmentName.includes("&") || a.departmentName.includes("Supply");
      const bCanon = b.departmentName.includes("&") || b.departmentName.includes("Supply");
      return (bCanon ? 1 : 0) - (aCanon ? 1 : 0);
    });

    for (const d of sortedDepts) {
      const key = getDivKey(d.departmentName);
      if (!seenDivisions.has(key)) {
        seenDivisions.add(key);
        uniqueDepartments.push(d);
      }
    }

    // Per-department stats
    const deptStats = uniqueDepartments.map((d) => {
      const deptName = d.departmentName;
      const deptComplaints = complaints.filter((c) => {
        const cDept = typeof c.department === "object" ? c.department?.departmentName : c.department;
        return cDept && (
          cDept.toLowerCase().includes(deptName.toLowerCase().split(" ")[0]) ||
          deptName.toLowerCase().includes(cDept.toLowerCase().split(" ")[0])
        );
      });

      const resolved = deptComplaints.filter(
        (c) => ["Resolved", "Closed", "RESOLVED_AWAITING_FEEDBACK"].includes(c.status) || c.isClosed
      ).length;
      const inProgress = deptComplaints.filter(
        (c) => ["In Progress", "Assigned", "Accepted and Assigned", "Reopened"].includes(c.status) && !c.isClosed
      ).length;
      const pending = deptComplaints.filter(
        (c) => ["Pending", "Submitted — Awaiting Validation", "Under Manual Review", "Needs More Information"].includes(c.status) && !c.isClosed
      ).length;

      const deptOfficers = officers.filter((o) => {
        const oDept = typeof o.department === "object" ? o.department?.departmentName : o.department;
        return oDept && (
          oDept.toLowerCase().includes(deptName.toLowerCase().split(" ")[0]) ||
          deptName.toLowerCase().includes(oDept.toLowerCase().split(" ")[0])
        );
      });

      return {
        _id: d._id,
        departmentName: deptName,
        description: d.description,
        total: deptComplaints.length,
        resolved,
        inProgress,
        pending,
        resolutionRate: deptComplaints.length > 0 ? Math.round((resolved / deptComplaints.length) * 100) : 100,
        officers: deptOfficers.map((o) => ({ _id: o._id, name: o.name, email: o.email, phone: o.phone || "" })),
      };
    });

    // Officer Performance Leaderboard & Workload
    const officerStats = officers.map((off) => {
      const offId = String(off._id);
      const offDept = typeof off.department === "object" ? off.department?.departmentName : off.department;

      const offComplaints = complaints.filter((c) => {
        const cOffId = c.assignedOfficer?._id ? String(c.assignedOfficer._id) : String(c.assignedOfficer || "");
        if (cOffId === offId) return true;
        const cDept = typeof c.department === "object" ? c.department?.departmentName : c.department;
        return !c.assignedOfficer && offDept && cDept && (
          cDept.toLowerCase().includes(offDept.toLowerCase().split(" ")[0]) ||
          offDept.toLowerCase().includes(cDept.toLowerCase().split(" ")[0])
        );
      });

      const resolved = offComplaints.filter(
        (c) => ["Resolved", "Closed", "RESOLVED_AWAITING_FEEDBACK"].includes(c.status) || c.isClosed
      ).length;
      const inProgress = offComplaints.filter(
        (c) => ["In Progress", "Assigned", "Accepted and Assigned", "Reopened"].includes(c.status) && !c.isClosed
      ).length;
      const pending = offComplaints.filter(
        (c) => ["Pending", "Submitted — Awaiting Validation", "Under Manual Review", "Needs More Information"].includes(c.status) && !c.isClosed
      ).length;

      const rated = offComplaints.filter((c) => c.feedback?.rating || c.citizenSatisfaction?.feedbackRating);
      const totalStars = rated.reduce((acc, c) => acc + (c.feedback?.rating || c.citizenSatisfaction?.feedbackRating || 5), 0);
      const avgRating = rated.length > 0 ? (totalStars / rated.length).toFixed(1) : "4.9";

      return {
        _id: off._id,
        name: off.name,
        email: off.email,
        phone: off.phone || "+91 98111 22334",
        address: off.address || "Zonal Municipal Office",
        department: offDept || "Unassigned",
        isSuspended: !!off.isSuspended,
        totalCases: offComplaints.length,
        resolvedCases: resolved,
        inProgressCases: inProgress,
        pendingCases: pending,
        resolutionRate: offComplaints.length > 0 ? Math.round((resolved / offComplaints.length) * 100) : 100,
        avgRating,
      };
    });

    return res.status(200).json({
      summary: {
        totalComplaints,
        resolvedCount,
        inProgressCount,
        pendingCount,
        rejectedCount,
        overallResolutionRate: totalComplaints > 0 ? Math.round((resolvedCount / totalComplaints) * 100) : 100,
        totalDepartments: departments.length,
        totalOfficers: officers.length,
      },
      departmentBreakdown: deptStats,
      officerPerformance: officerStats,
      recentGrievances: complaints.slice(0, 10),
    });
  } catch (error) {
    console.error("Admin stats error:", error);
    res.status(500).json({ message: error.message });
  }
};

// ====================== Assign Officer ======================
const assignOfficer = async (req, res) => {
  try {
    const { complaintId, officerId } = req.body;

    if (getIsConnected()) {
      const complaint = await Complaint.findById(complaintId);
      if (complaint) {
        complaint.assignedOfficer = officerId;
        complaint.status = "Assigned";
        await complaint.save();
        return res.status(200).json({
          message: "Officer assigned successfully",
          complaint,
        });
      }
    }

    const item = inMemoryComplaints.find((c) => String(c._id) === String(complaintId));
    if (item) {
      const officer = inMemoryUsers.find((u) => String(u._id) === String(officerId));
      item.assignedOfficer = officer ? { _id: officer._id, name: officer.name, email: officer.email } : null;
      item.status = "Assigned";
      return res.status(200).json({
        message: "Officer assigned successfully",
        complaint: item,
      });
    }

    res.status(404).json({ message: "Complaint not found" });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// ====================== Get All Complaints ======================
const getAllComplaints = async (req, res) => {
  try {
    const { history, active } = req.query;

    if (getIsConnected()) {
      let filter = {};
      if (history === "true") {
        filter.$or = [{ isClosed: true }, { status: "Closed" }];
      } else if (active === "true") {
        filter.isClosed = { $ne: true };
        filter.status = { $ne: "Closed" };
      }

      const complaints = await Complaint.find(filter)
        .populate("citizen", "name email")
        .populate("department", "departmentName")
        .populate("assignedOfficer", "name email")
        .sort({ createdAt: -1 });

      return res.status(200).json(complaints);
    }

    let items = [...inMemoryComplaints];
    if (history === "true") {
      items = items.filter((c) => c.isClosed || c.status === "Closed");
    } else if (active === "true") {
      items = items.filter((c) => !c.isClosed && c.status !== "Closed");
    }

    res.status(200).json(items);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// ====================== Get All Users ======================
const getAllUsers = async (req, res) => {
  try {
    if (getIsConnected()) {
      const users = await User.find().select("-password").populate("department", "departmentName");
      return res.status(200).json(users);
    }

    const sanitized = inMemoryUsers.map(({ passwordHash, ...rest }) => rest);
    res.status(200).json(sanitized);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// ====================== Create Officer ======================
const createOfficer = async (req, res) => {
  try {
    const { name, email, password, phone, address, department } = req.body;
    const cleanEmail = email.trim().toLowerCase();

    if (getIsConnected()) {
      const userExists = await User.findOne({ email: cleanEmail });
      if (userExists) {
        return res.status(400).json({ message: "User already exists" });
      }

      const hashedPassword = await bcrypt.hash(password, 10);
      const officer = await User.create({
        name,
        email: cleanEmail,
        password: hashedPassword,
        phone,
        address,
        department,
        role: "officer",
      });

      return res.status(201).json({
        message: "Officer created successfully",
        officer: {
          _id: officer._id,
          name: officer.name,
          email: officer.email,
          role: officer.role,
          department: officer.department,
        },
      });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const newOfficer = {
      _id: "officer_" + Date.now(),
      name,
      email: cleanEmail,
      passwordHash: hashedPassword,
      phone,
      address,
      department,
      role: "officer",
    };
    inMemoryUsers.push(newOfficer);

    res.status(201).json({
      message: "Officer created successfully",
      officer: {
        _id: newOfficer._id,
        name: newOfficer.name,
        email: newOfficer.email,
        role: newOfficer.role,
        department: newOfficer.department,
      },
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// ====================== Announcements & Officer Directives ======================
const DEFAULT_ANNOUNCEMENTS = [
  {
    _id: "ann_001",
    title: "Monsoon Preparedness Drainage Cleaning",
    message: "Special desilting and drain unclogging drive active in all wards. Report blockages immediately.",
    category: "Sanitation & Waste Management",
    priority: "High",
    targetAudience: "citizens",
    directiveType: "General Notice",
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
    createdAt: new Date().toISOString(),
  },
  {
    _id: "ann_003",
    title: "Executive Order: Water Pipeline Desilting & Audit",
    message: "Mandatory physical inspection of all main supply feeder lines in Sectors 14 through 22. Submit compliance report by Friday 5 PM.",
    category: "Water Supply Department",
    priority: "Critical",
    targetAudience: "department_officers",
    targetDepartmentName: "Water Supply Department",
    directiveType: "Inspection Order",
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
    createdAt: new Date().toISOString(),
  },
];

let inMemoryAnnouncements = [...DEFAULT_ANNOUNCEMENTS];

const createAnnouncement = async (req, res) => {
  try {
    const {
      title,
      message,
      category,
      priority = "High",
      targetAudience = "all_officers", // 'all_officers' | 'department_officers' | 'citizens'
      targetDepartment,
      targetDepartmentName = "",
      directiveType = "Official Memo",
      deadlineDate,
      targetWard = "All Wards",
    } = req.body;

    if (!title || !title.trim() || !message || !message.trim()) {
      return res.status(400).json({ message: "Title and message are required." });
    }

    let deptId = null;
    let deptName = (targetDepartmentName || "").trim();

    if (targetAudience === "department_officers" && (targetDepartment || targetDepartmentName)) {
      if (getIsConnected()) {
        const queryOr = [];
        if (targetDepartment && String(targetDepartment).match(/^[0-9a-fA-F]{24}$/)) {
          queryOr.push({ _id: targetDepartment });
        }
        if (targetDepartmentName) {
          queryOr.push({ departmentName: new RegExp(`^${targetDepartmentName.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}`, "i") });
        }
        if (queryOr.length > 0) {
          const dRecord = await Department.findOne({ $or: queryOr });
          if (dRecord) {
            deptId = dRecord._id;
            deptName = dRecord.departmentName;
          }
        }
      }
    }

    if (getIsConnected()) {
      const announcement = await Announcement.create({
        title: title.trim(),
        message: message.trim(),
        category: category || deptName || "Official Notice",
        priority: priority || "High",
        targetAudience,
        targetDepartment: deptId,
        targetDepartmentName: deptName,
        directiveType,
        deadlineDate: deadlineDate || null,
        targetWard,
        createdBy: req.user._id,
      });

      // Dispatch Notifications to target recipients
      try {
        if (targetAudience === "department_officers" && deptId) {
          const officers = await User.find({ role: "officer", department: deptId });
          for (const off of officers) {
            await createNotification({
              userId: off._id,
              message: `📋 [Admin Directive — ${directiveType}]: "${title.trim()}" issued to ${deptName}.`,
              type: "Announcement",
            });
          }
        } else if (targetAudience === "all_officers") {
          const allOfficers = await User.find({ role: "officer" });
          for (const off of allOfficers) {
            await createNotification({
              userId: off._id,
              message: `🏛️ [All-Hands Admin Directive]: "${title.trim()}". ${message.slice(0, 80)}…`,
              type: "Announcement",
            });
          }
        } else if (targetAudience === "citizens") {
          const citizens = await User.find({ role: "client" }).limit(50);
          for (const c of citizens) {
            await createNotification({
              userId: c._id,
              message: `📢 [Public Civic Notice]: ${title.trim()} - ${message.slice(0, 100)}`,
              type: "Announcement",
            });
          }
        }
      } catch (notifErr) {
        console.error("Notice notification dispatch error:", notifErr);
      }

      return res.status(201).json(announcement);
    }

    // In-Memory Fallback
    const ann = {
      _id: "ann_" + Date.now(),
      title: title.trim(),
      message: message.trim(),
      category: category || deptName || "Official Notice",
      priority: priority || "High",
      targetAudience,
      targetDepartment: deptId,
      targetDepartmentName: deptName,
      directiveType,
      deadlineDate: deadlineDate || null,
      targetWard,
      createdAt: new Date().toISOString(),
    };
    inMemoryAnnouncements.unshift(ann);

    // In-memory notifications dispatch
    try {
      if (targetAudience === "department_officers" && deptName) {
        const officers = inMemoryUsers.filter(
          (u) => u.role === "officer" && u.department && (
            u.department.toLowerCase().includes(deptName.toLowerCase().split(" ")[0]) ||
            deptName.toLowerCase().includes(u.department.toLowerCase().split(" ")[0])
          )
        );
        for (const off of officers) {
          await createNotification({
            userId: off._id,
            message: `📋 [Admin Directive — ${directiveType}]: "${title.trim()}" issued to ${deptName}.`,
            type: "Announcement",
          });
        }
      } else if (targetAudience === "all_officers") {
        const allOfficers = inMemoryUsers.filter((u) => u.role === "officer");
        for (const off of allOfficers) {
          await createNotification({
            userId: off._id,
            message: `🏛️ [All-Hands Admin Directive]: "${title.trim()}".`,
            type: "Announcement",
          });
        }
      }
    } catch {
      // ignore
    }

    res.status(201).json(ann);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const getAnnouncements = async (req, res) => {
  try {
    const userRole = req.user?.role;
    const userDept = req.user?.department;
    const audienceQuery = req.query.audience; // optional filter

    if (getIsConnected()) {
      let query = {};

      if (audienceQuery) {
        query.targetAudience = audienceQuery;
      } else if (userRole === "client") {
        // Citizens ONLY see public citizen announcements
        query.$or = [
          { targetAudience: "citizens" },
          { targetAudience: "all" },
          { targetAudience: { $exists: false } },
        ];
      } else if (userRole === "officer") {
        // Officers see:
        // 1. All-hands officer directives
        // 2. Directives specifically for their department
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
      }
      // Admins (role === 'admin') see ALL announcements & directives without filter!

      const announcements = await Announcement.find(query).sort({ createdAt: -1 });
      return res.status(200).json(announcements);
    }

    // In-memory fallback filtering
    let items = [...inMemoryAnnouncements];
    if (audienceQuery) {
      items = items.filter((a) => a.targetAudience === audienceQuery);
    } else if (userRole === "client") {
      items = items.filter((a) => !a.targetAudience || a.targetAudience === "citizens" || a.targetAudience === "all");
    } else if (userRole === "officer") {
      items = items.filter((a) => {
        if (!a.targetAudience || a.targetAudience === "all_officers" || a.targetAudience === "all" || a.targetAudience === "citizens") return true;
        if (a.targetAudience === "department_officers" && userDept && a.targetDepartmentName) {
          return a.targetDepartmentName.toLowerCase().includes(userDept.toLowerCase().split(" ")[0]) ||
                 userDept.toLowerCase().includes(a.targetDepartmentName.toLowerCase().split(" ")[0]);
        }
        return false;
      });
    }

    res.status(200).json(items);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const updateAnnouncement = async (req, res) => {
  try {
    const { title, message } = req.body;
    if (getIsConnected()) {
      const announcement = await Announcement.findById(req.params.id);
      if (announcement) {
        announcement.title = title || announcement.title;
        announcement.message = message || announcement.message;
        await announcement.save();
        return res.status(200).json({ message: "Announcement updated", announcement });
      }
    }

    const item = inMemoryAnnouncements.find((a) => a._id === req.params.id);
    if (item) {
      item.title = title || item.title;
      item.message = message || item.message;
      return res.status(200).json({ message: "Announcement updated", announcement: item });
    }
    res.status(404).json({ message: "Announcement not found" });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const deleteAnnouncement = async (req, res) => {
  try {
    if (getIsConnected()) {
      const announcement = await Announcement.findById(req.params.id);
      if (announcement) {
        await announcement.deleteOne();
        return res.status(200).json({ message: "Announcement deleted" });
      }
    }

    inMemoryAnnouncements = inMemoryAnnouncements.filter((a) => a._id !== req.params.id);
    res.status(200).json({ message: "Announcement deleted" });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// ====================== Update Officer (Transfer Department, Suspend, Reset Password) ======================
const updateOfficer = async (req, res) => {
  try {
    const officerId = req.params?.id || req.body?.officerId;
    const { department, departmentId, isSuspended, newPassword, name, phone, address } = req.body;

    if (!officerId) {
      return res.status(400).json({ message: "Officer ID is required" });
    }

    if (getIsConnected()) {
      const officer = await User.findById(officerId);
      if (!officer) return res.status(404).json({ message: "Officer not found" });

      if (departmentId) {
        officer.department = departmentId;
      } else if (department) {
        let record = await Department.findOne({
          departmentName: { $regex: new RegExp(department.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i") },
        });
        if (!record) {
          if (/road|pothole|footpath|infra/i.test(department)) record = await Department.findOne({ departmentName: /road/i });
          else if (/water|leak|pipeline|drain/i.test(department)) record = await Department.findOne({ departmentName: /water/i });
          else if (/garbage|trash|sanitation|waste/i.test(department)) record = await Department.findOne({ departmentName: /sanitat/i });
          else if (/electric|power|light|wire/i.test(department)) record = await Department.findOne({ departmentName: /electr/i });
          else if (/safety|hazard|danger|collapse/i.test(department)) record = await Department.findOne({ departmentName: /safety/i });
        }
        if (record) {
          officer.department = record._id;
        }
      }

      if (typeof isSuspended === "boolean") {
        officer.isSuspended = isSuspended;
      }
      if (newPassword && newPassword.length >= 6) {
        officer.password = await bcrypt.hash(newPassword, 10);
      }
      if (name) officer.name = name.trim();
      if (phone !== undefined) officer.phone = phone.trim();
      if (address !== undefined) officer.address = address.trim();

      await officer.save();
      const updated = await User.findById(officerId).select("-password").populate("department", "departmentName");
      return res.status(200).json({ message: "Officer updated successfully", officer: updated });
    }

    // In-memory fallback
    const mem = inMemoryUsers.find((u) => String(u._id) === String(officerId));
    if (!mem) return res.status(404).json({ message: "Officer not found" });

    if (department) mem.department = department;
    if (typeof isSuspended === "boolean") mem.isSuspended = isSuspended;
    if (newPassword && newPassword.length >= 6) {
      mem.passwordHash = await bcrypt.hash(newPassword, 10);
    }
    if (name) mem.name = name.trim();
    if (phone !== undefined) mem.phone = phone.trim();

    res.status(200).json({ message: "Officer updated successfully", officer: mem });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

const deleteOfficer = async (req, res) => {
  try {
    const officerId = req.params?.id;
    if (getIsConnected()) {
      const officer = await User.findById(officerId);
      if (officer) {
        await officer.deleteOne();
        return res.status(200).json({ message: "Officer decommissioned successfully" });
      }
    }
    const idx = inMemoryUsers.findIndex((u) => String(u._id) === String(officerId));
    if (idx !== -1) {
      inMemoryUsers.splice(idx, 1);
      return res.status(200).json({ message: "Officer decommissioned successfully" });
    }
    res.status(404).json({ message: "Officer not found" });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

module.exports = {
  getAdminStats,
  assignOfficer,
  getAllComplaints,
  getAllUsers,
  createOfficer,
  updateOfficer,
  deleteOfficer,
  createAnnouncement,
  getAnnouncements,
  updateAnnouncement,
  deleteAnnouncement,
};
