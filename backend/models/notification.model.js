import mongoose from "mongoose";

/**
 * Notification Model — v2
 *
 * Backward-compatible with v1: all new fields have defaults so existing
 * documents remain valid without a migration.
 *
 * New fields: priority, isArchived, isDeleted, metadata
 * New types:  message, video_call, mention, resume_viewed, profile_visited,
 *             system_announcement, community_invitation, interview_scheduled,
 *             referral_request, project_liked, portfolio_viewed
 */
const NotificationSchema = new mongoose.Schema(
    {
        recipient: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            required: true,
            index: true,
        },
        sender: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            required: true,
        },
        type: {
            type: String,
            enum: [
                // --- Existing (unchanged) ---
                "like",
                "comment",
                "connection_request",
                "missed_call",
                "connection_accepted",
                // --- New ---
                "message",
                "video_call",
                "mention",
                "resume_viewed",
                "profile_visited",
                "system_announcement",
                "community_invitation",
                "interview_scheduled",
                "referral_request",
                "project_liked",
                "portfolio_viewed",
            ],
            required: true,
        },
        post: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Post",
            default: null,
        },
        message: {
            type: String,
            default: "",
        },
        isRead: {
            type: Boolean,
            default: false,
        },
        // --- v2 additions ---
        priority: {
            type: String,
            enum: ["info", "success", "warning", "critical"],
            default: "info",
        },
        isArchived: {
            type: Boolean,
            default: false,
        },
        isDeleted: {
            type: Boolean,
            default: false,
        },
        // Flexible extra payload (e.g., resumeId, postSnippet, callerName)
        metadata: {
            type: mongoose.Schema.Types.Mixed,
            default: {},
        },
    },
    {
        // Use Mongoose timestamps so we get createdAt + updatedAt automatically
        timestamps: true,
    }
);

// --- Indexes for production query performance ---
// Primary: fetch a user's undeleted notifications, newest first
NotificationSchema.index({ recipient: 1, isDeleted: 1, createdAt: -1 });
// Unread badge count
NotificationSchema.index({ recipient: 1, isRead: 1, isDeleted: 1 });
// Archived view
NotificationSchema.index({ recipient: 1, isArchived: 1, isDeleted: 1, createdAt: -1 });

const Notification = mongoose.model("Notification", NotificationSchema);
export default Notification;
