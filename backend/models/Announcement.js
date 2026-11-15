const mongoose = require("mongoose");

const announcementSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: true,
    },

    message: {
      type: String,
      required: true,
    },

    category: {
      type: String,
      default: 'Notice',
    },

    priority: {
      type: String,
      enum: ['Critical', 'High', 'Medium', 'Low'],
      default: 'High',
    },

    targetAudience: {
      type: String,
      enum: ['all_officers', 'department_officers', 'citizens', 'all'],
      default: 'all_officers',
    },

    targetDepartment: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Department',
      default: null,
    },

    targetDepartmentName: {
      type: String,
      default: '',
    },

    directiveType: {
      type: String,
      default: 'Official Memo',
    },

    deadlineDate: {
      type: Date,
      default: null,
    },

    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },

    expiryDate: {
      type: Date,
      default: null,
    },

    expiresAt: {
      type: Date,
      default: null,
    },

    isActive: {
      type: Boolean,
      default: true,
    },
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.models.Announcement || mongoose.model("Announcement", announcementSchema);