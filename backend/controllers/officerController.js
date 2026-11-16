const Complaint = require("../models/Complaint");
const User = require("../models/User");
const Department = require("../models/Department");
const mongoose = require("mongoose");
const { getIsConnected } = require("../config/db");
const { inMemoryComplaints, persistComplaints } = require("../lib/inMemoryStore");
const { createNotification } = require("./notificationController");
const { assertOwnedUpload, isStorageKey } = require("../lib/cloudinaryStorage");
const { translateText } = require("../utils/translationService");

// Helper to resolve Department model ID for a department name or keyword
async function resolveDepartment(deptName) {
  if (!deptName) deptName = "Other/Unclear";

  const cleanName = deptName.trim();
  // 1. Exact or loose substring regex match
  let record = await Department.findOne({
    departmentName: { $regex: new RegExp(cleanName.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i") },
  });

  if (!record) {
    // 2. Keyword fallback matching canonical department names
    let search = null;
    if (/road|pothole|footpath|asphalt|crater/i.test(cleanName)) search = /road/i;
    else if (/water|leak|pipeline|drain|sewer|jal/i.test(cleanName)) search = /water/i;
    else if (/garbage|trash|sanitation|waste|swachh/i.test(cleanName)) search = /sanitat/i;
    else if (/electric|power|light|wire|pole/i.test(cleanName)) search = /electr/i;
    else if (/safety|hazard|danger|collapse/i.test(cleanName)) search = /safety/i;

    if (search) {
      record = await Department.findOne({ departmentName: search });
    }
  }

  if (!record) {
    record = await Department.create({
      departmentName: cleanName === "Other/Unclear" ? "Other Civic Issue" : cleanName,
      description: `${cleanName} Civic Redressal Queue`,
    });
  }

  return record;
}

// Helper to collect all Department ObjectIds matching an officer's division
async function getOfficerDivisionDepartmentIds(officer) {
  if (!officer?.department) return [];
  const deptIds = [officer.department];

  const deptRecord = await Department.findById(officer.department);
  const deptTitle = deptRecord?.departmentName || "";

  let searchRegex = null;
  if (/road|infra|pothole|asphalt/i.test(deptTitle)) searchRegex = /road/i;
  else if (/water|drain|pipeline|jal/i.test(deptTitle)) searchRegex = /water/i;
  else if (/sanitat|waste|garbage/i.test(deptTitle)) searchRegex = /sanitat/i;
  else if (/electr|power|light/i.test(deptTitle)) searchRegex = /electr/i;
  else if (/safety|hazard|danger/i.test(deptTitle)) searchRegex = /safety/i;

  if (searchRegex) {
    const matching = await Department.find({ departmentName: searchRegex }).select("_id");
    matching.forEach((m) => {
      if (!deptIds.some((id) => String(id) === String(m._id))) {
        deptIds.push(m._id);
      }
    });
  }

  return deptIds;
}

// ====================== Get Active Department & Assigned Complaints ======================
const getAssignedComplaints = async (req, res) => {
  try {
    const isSupervisorOrAdmin = req.user.role === "admin";

    if (getIsConnected()) {
      const officer = await User.findById(req.user._id);

      // Base query: Active only (Exclude closed complaints)
      let query = {
        isClosed: { $ne: true },
        status: { $ne: "Closed" },
      };

      // Role & Department-based access control:
      // Supervisors/Admins see all departments.
      // Officers see complaints belonging to any department in their division OR directly assigned to them.
      if (!isSupervisorOrAdmin) {
        const divisionDeptIds = await getOfficerDivisionDepartmentIds(officer);
        query.$or = [
          { department: { $in: divisionDeptIds } },
          { assignedOfficer: req.user._id },
        ];
      }

      const complaints = await Complaint.find(query)
        .populate("citizen", "name email")
        .populate("department", "departmentName")
        .populate("assignedOfficer", "name email")
        .sort({ createdAt: -1 });

      return res.status(200).json(complaints);
    }

    // In-memory fallback
    const officerId = String(req.user._id);
    const officerEmail = String(req.user.email || "").toLowerCase();
    const officerDept = req.user.department;
    const assigned = inMemoryComplaints.filter((c) => {
      if (c.isClosed || c.status === "Closed") return false;
      if (isSupervisorOrAdmin) return true;

      const assignedId = String(c.assignedOfficer?._id || c.assignedOfficer || "");
      const assignedEmail = String(c.assignedOfficer?.email || "").toLowerCase();
      if (assignedId && (assignedId === officerId || assignedEmail === officerEmail)) {
        return true;
      }

      const cDeptName = typeof c.department === "object" ? c.department?.departmentName : c.department;
      if (officerDept && cDeptName) {
        const d1 = String(cDeptName).toLowerCase();
        const d2 = String(officerDept).toLowerCase();
        if (d1.includes(d2.split(" ")[0]) || d2.includes(d1.split(" ")[0])) {
          return true;
        }
      }
      return assignedId === officerId;
    });

    res.status(200).json(assigned);
  } catch (error) {
    console.error("Get Assigned Complaints Error:", error);
    res.status(500).json({ message: error.message });
  }
};

// ====================== Get Closed History / Resolved Archive ======================
const getClosedHistory = async (req, res) => {
  try {
    const isSupervisorOrAdmin = req.user.role === "admin";

    if (getIsConnected()) {
      const officer = await User.findById(req.user._id);

      // Closed complaints query
      let query = {
        $or: [{ isClosed: true }, { status: "Closed" }],
      };

      // Role & Department-based access control:
      // Supervisors/Admins see all departments.
      // Officers see complaints belonging to any department in their division OR directly assigned to them.
      if (!isSupervisorOrAdmin) {
        const divisionDeptIds = await getOfficerDivisionDepartmentIds(officer);
        query.$and = [
          { $or: [{ isClosed: true }, { status: "Closed" }] },
          {
            $or: [
              { department: { $in: divisionDeptIds } },
              { assignedOfficer: req.user._id },
            ],
          },
        ];
        delete query.$or;
      }

      const closedComplaints = await Complaint.find(query)
        .populate("citizen", "name email")
        .populate("department", "departmentName")
        .populate("assignedOfficer", "name email")
        .sort({ closedAt: -1, updatedAt: -1 });

      return res.status(200).json(closedComplaints);
    }

    const officerId = String(req.user._id);
    const officerDept = req.user.department;
    const closed = inMemoryComplaints.filter((c) => {
      if (!c.isClosed && c.status !== "Closed") return false;
      if (isSupervisorOrAdmin) return true;
      const cDeptName = typeof c.department === "object" ? c.department?.departmentName : c.department;
      if (officerDept) {
        return (
          cDeptName &&
          (cDeptName.toLowerCase().includes(officerDept.toLowerCase().split(" ")[0]) ||
            officerDept.toLowerCase().includes(cDeptName.toLowerCase().split(" ")[0]))
        );
      }
      return String(c.assignedOfficer?._id || c.assignedOfficer) === officerId;
    });
    res.status(200).json(closed);
  } catch (error) {
    console.error("Get Closed History Error:", error);
    res.status(500).json({ message: error.message });
  }
};

// ====================== Update Complaint Status & Officer AI Review Actions ======================
const updateComplaintStatus = async (req, res) => {
  try {
    const {
      status,
      remarks,
      resolutionImage,
      aiAction,          // 'confirm' | 'correct_category' | 'request_info' | 'mark_duplicate' | 'reject' | 'resolve'
      correctedCategory,
      correctedDepartment,
      rejectionReason,
      infoRequestReason,
      duplicateNote,
    } = req.body;

    if (resolutionImage && isStorageKey(resolutionImage)) {
      await assertOwnedUpload({
        userId: req.user._id,
        role: req.user.role,
        key: resolutionImage,
        purpose: "resolution",
      });
    } else if (resolutionImage && process.env.NODE_ENV === "production") {
      return res.status(400).json({ message: "Upload resolution images through the evidence upload endpoint." });
    }

    if (getIsConnected() && mongoose.Types.ObjectId.isValid(req.params.id)) {
      const complaint = await Complaint.findById(req.params.id)
        .populate("department", "departmentName")
        .populate("assignedOfficer", "name email");

      if (complaint) {
        if (req.user.role !== "admin") {
          const officer = await User.findById(req.user._id).select("department");
          const assignedOfficerId = complaint.assignedOfficer?._id || complaint.assignedOfficer;
          const complaintDepartmentId = complaint.department?._id || complaint.department;
          const hasDepartmentAccess = officer?.department
            && String(officer.department) === String(complaintDepartmentId);
          if (String(assignedOfficerId || "") !== String(req.user._id) && !hasDepartmentAccess) {
            return res.status(403).json({ message: "You may only update complaints assigned to you or your department." });
          }
        }

      complaint.timeline = complaint.timeline || [];

      // 1. Handle Officer AI Review Center Actions
      if (aiAction === "confirm") {
        // Confirm complaint authenticity & routing
        complaint.status = "Accepted and Assigned";
        complaint.aiFlag = "Verified & Confirmed by Officer";
        complaint.assignedOfficer = req.user._id;
        if (complaint.aiValidation) {
          complaint.aiValidation.recommendedAction = "Confirmed by Officer";
        }
        complaint.timeline.push({
          title: "Officer Confirmed & Assigned",
          timestamp: new Date().toISOString(),
          description: remarks || `Officer verified AI validation and accepted complaint for field resolution.`,
          completed: true,
        });
      } else if (aiAction === "correct_category") {
        // Correct Category and Re-route Department
        const newCat = (correctedCategory || complaint.category || "General").trim();
        const newDeptName = (correctedDepartment || newCat).trim();
        const newDept = await resolveDepartment(newDeptName);

        complaint.category = newCat;
        complaint.department = newDept._id;
        complaint.status = "Accepted and Assigned";
        complaint.aiFlag = `Re-routed to ${newDept.departmentName}`;

        // Find available officer in that department
        const targetOfficer = await User.findOne({ role: "officer", department: newDept._id });
        if (targetOfficer) {
          complaint.assignedOfficer = targetOfficer._id;
        }

        complaint.timeline.push({
          title: `Category Corrected & Re-routed to ${newDept.departmentName}`,
          timestamp: new Date().toISOString(),
          description: remarks || `Officer reclassified category to "${newCat}" and routed complaint to ${newDept.departmentName}.`,
          completed: true,
        });
      } else if (aiAction === "request_info") {
        // Request More Information from citizen
        const reqReason = (infoRequestReason || remarks || "Please provide clearer photographic evidence or more exact location.").trim();
        complaint.status = "Needs More Information";
        complaint.aiFlag = "Needs More Information from Citizen";
        complaint.moreInfoRequested = {
          requested: true,
          requestedAt: new Date(),
          reason: reqReason,
          citizenResponse: "",
          respondedAt: null,
        };
        complaint.timeline.push({
          title: "Officer Requested More Information",
          timestamp: new Date().toISOString(),
          description: reqReason,
          completed: false,
        });
      } else if (aiAction === "mark_duplicate") {
        // Mark Possible Duplicate
        const dupNote = (duplicateNote || remarks || "Officer flagged grievance as a possible duplicate complaint for joint review.").trim();
        complaint.status = "Under Manual Review";
        complaint.aiFlag = "Flagged: Potential Duplicate Under Investigation";
        if (complaint.aiValidation) {
          complaint.aiValidation.isPossibleDuplicate = true;
          complaint.aiValidation.warnings = [...(complaint.aiValidation.warnings || []), dupNote];
        }
        complaint.timeline.push({
          title: "Flagged as Possible Duplicate",
          timestamp: new Date().toISOString(),
          description: dupNote,
          completed: false,
        });
      } else if (aiAction === "reject") {
        // Reject with clear reason
        const reason = (rejectionReason || remarks || "Complaint does not meet actionable civic criteria.").trim();
        complaint.status = "Rejected";
        complaint.rejectionReason = reason;
        complaint.aiFlag = `Rejected: ${reason}`;
        complaint.timeline.push({
          title: "Complaint Rejected with Reason",
          timestamp: new Date().toISOString(),
          description: reason,
          completed: true,
        });
      } else if (status === "Resolved" || aiAction === "resolve") {
        // Resolve Complaint -> prompt citizen satisfaction
        complaint.status = "Resolved";
        complaint.resolutionDetails = {
          remarks: (remarks || "Grievance resolved by department personnel.").trim(),
          resolutionImage: resolutionImage || "",
          resolvedAt: new Date(),
          resolvedBy: req.user._id,
        };
        if (resolutionImage) complaint.resolutionImage = resolutionImage;
        if (remarks) complaint.remarks = remarks;

        complaint.timeline.push({
          title: "Work Completed — Awaiting Citizen Confirmation",
          timestamp: new Date().toISOString(),
          description: remarks || "Officer marked work completed and submitted resolution proof. Awaiting citizen satisfaction sign-off.",
          completed: true,
        });
      } else if (status) {
        // Standard status change (e.g. In Progress)
        complaint.status = status;
        if (remarks !== undefined) complaint.remarks = remarks;
        if (resolutionImage) complaint.resolutionImage = resolutionImage;

        if (!complaint.assignedOfficer) {
          complaint.assignedOfficer = req.user._id;
        }

        complaint.timeline.push({
          title: `Status Updated to "${status}"`,
          timestamp: new Date().toISOString(),
          description: remarks || `Officer status update: ${status}`,
          completed: status === "Resolved",
        });
      }

      // Auto-translate officer remarks into citizen's preferred language
      const effectiveRemarks = remarks || complaint.remarks;
      if (effectiveRemarks && typeof effectiveRemarks === "string" && effectiveRemarks.trim()) {
        const citizenLang = complaint.citizenPreferredLanguage || complaint.originalLanguage || "en";
        if (citizenLang && citizenLang !== "en") {
          try {
            const translatedRemark = await translateText(effectiveRemarks.trim(), citizenLang, "en");
            if (!complaint.remarksTranslations) {
              complaint.remarksTranslations = new Map();
            }
            complaint.remarksTranslations.set(citizenLang, translatedRemark);
          } catch (tErr) {
            console.warn("Auto-translating officer remark failed:", tErr);
          }
        }
      }

      await complaint.save();

      // Notify citizen of the update
      if (complaint.citizen) {
        const citizenId = complaint.citizen._id || complaint.citizen;
        let notifMsg = `Update on grievance #${complaint.complaintNumber}: Status is now "${complaint.status}".`;
        if (complaint.status === "Resolved") {
          notifMsg = `Grievance #${complaint.complaintNumber} has been marked Resolved. Please confirm your satisfaction to close or reopen.`;
        } else if (complaint.status === "Needs More Information") {
          notifMsg = `ACTION NEEDED: Officer requested more details for grievance #${complaint.complaintNumber}. Reason: ${complaint.moreInfoRequested?.reason}`;
        } else if (complaint.status === "Rejected") {
          notifMsg = `Grievance #${complaint.complaintNumber} was rejected. Reason: ${complaint.rejectionReason}`;
        }

        await createNotification({
          userId: citizenId,
          message: notifMsg,
          type: "Complaint",
        });
      }

      return res.status(200).json({
        message: "Complaint updated successfully",
        complaint,
      });
    }
  }

    // In-memory fallback
    const item = inMemoryComplaints.find(
      (c) =>
        String(c._id) === String(req.params.id) ||
        String(c.complaintNumber || "").toLowerCase() === String(req.params.id).toLowerCase()
    );

    if (item) {
      if (status) item.status = status;
      if (remarks !== undefined) {
        item.remarks = remarks;
        const citizenLang = item.citizenPreferredLanguage || item.originalLanguage || "en";
        if (citizenLang && citizenLang !== "en") {
          try {
            const translatedRemark = await translateText(remarks.trim(), citizenLang, "en");
            item.remarksTranslations = item.remarksTranslations || {};
            item.remarksTranslations[citizenLang] = translatedRemark;
          } catch (tErr) {}
        }
      }
      if (resolutionImage) item.resolutionImage = resolutionImage;

      item.timeline = item.timeline || [];

      if (aiAction === "confirm") {
        item.status = "Accepted and Assigned";
        item.aiFlag = "Verified & Confirmed by Officer";
        item.timeline.push({
          title: "Officer Confirmed & Assigned",
          timestamp: new Date().toISOString(),
          description: remarks || "Officer verified AI validation and accepted complaint for field resolution.",
          completed: true,
        });
      } else if (aiAction === "reject") {
        item.status = "Rejected";
        item.rejectionReason = rejectionReason || remarks || "Rejected by officer";
        item.timeline.push({
          title: "Complaint Rejected",
          timestamp: new Date().toISOString(),
          description: item.rejectionReason,
          completed: true,
        });
      } else if (status === "Resolved" || aiAction === "resolve") {
        item.status = "Resolved";
        item.resolutionDetails = {
          remarks: remarks || "Grievance resolved by department personnel.",
          resolutionImage: resolutionImage || "",
          resolvedAt: new Date().toISOString(),
          resolvedBy: req.user._id,
        };
        item.timeline.push({
          title: "Work Completed — Awaiting Citizen Confirmation",
          timestamp: new Date().toISOString(),
          description: remarks || "Officer marked work completed. Awaiting citizen confirmation.",
          completed: true,
        });
      } else if (status === "Needs More Information" || aiAction === "request_info") {
        item.status = "Needs More Information";
        item.aiFlag = "Needs More Information from Citizen";
        item.moreInfoRequested = {
          requested: true,
          requestedAt: new Date().toISOString(),
          reason: infoRequestReason || remarks || "Please provide clearer photographic evidence or more exact location.",
        };
        item.timeline.push({
          title: "Officer Requested More Information",
          timestamp: new Date().toISOString(),
          description: remarks || "Please provide clearer details.",
          completed: false,
        });
      } else if (status) {
        item.status = status;
        item.timeline.push({
          title: `Status Updated to "${status}"`,
          timestamp: new Date().toISOString(),
          description: remarks || `Officer status update: ${status}`,
          completed: status === "Resolved",
        });
      }

      persistComplaints();
      return res.status(200).json({ message: "Complaint updated successfully", complaint: item });
    }

    res.status(404).json({ message: "Complaint not found" });
  } catch (error) {
    console.error("Update Complaint Status Error:", error);
    res.status(500).json({ message: error.message });
  }
};

module.exports = {
  getAssignedComplaints,
  getClosedHistory,
  updateComplaintStatus,
};
