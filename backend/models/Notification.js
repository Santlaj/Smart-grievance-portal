const mongoose = require("mongoose");

const notificationSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    message: {
      type: String,
      required: true,
    },

    isRead: {
      type: Boolean,
      default: false,
    },

    type: {
      type: String,
      enum: [
        "Complaint",
        "Announcement",
        "System"
      ],
      default: "Complaint",
    },

    announcement: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Announcement",
      default: null,
    },

    expiresAt: {
      type: Date,
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.models.Notification || mongoose.model("Notification", notificationSchema);