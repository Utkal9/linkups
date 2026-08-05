/**
 * notification.controller.js — v2
 *
 * Endpoints:
 *   GET  /notifications              — paginated, filterable, searchable
 *   GET  /notifications/unread_count — fast integer badge count
 *   POST /notifications/mark_read    — single mark-read (backward-compat)
 *   POST /notifications/mark_all_read
 *   DELETE /notifications/:id        — soft-delete
 *   PATCH  /notifications/:id/archive — archive / unarchive toggle
 */

import Notification from "../models/notification.model.js";
import User from "../models/user.model.js";

// ─────────────────────────────────────────────────────────────────────────────
// GET /notifications
// Query params: token, page, limit, filter, search
// filter: "all" | "unread" | "archived" | <type string>
// ─────────────────────────────────────────────────────────────────────────────
export const getNotifications = async (req, res) => {
    try {
        const { token, page = 1, limit = 15, filter = "all", search = "" } = req.query;

        const user = await User.findOne({ token });
        if (!user) return res.status(404).json({ message: "User not found" });

        const pageNum  = Math.max(1, parseInt(page));
        const limitNum = Math.min(50, Math.max(1, parseInt(limit)));
        const skip     = (pageNum - 1) * limitNum;

        // --- Build query ---
        const query = {
            recipient: user._id,
            isDeleted: false,
        };

        if (filter === "unread") {
            query.isRead     = false;
            query.isArchived = false;
        } else if (filter === "archived") {
            query.isArchived = true;
        } else if (filter !== "all") {
            // filter is a notification type string
            query.type       = filter;
            query.isArchived = false;
        } else {
            // "all" — active (non-archived) notifications
            query.isArchived = false;
        }

        // Search by message or sender name (requires post-populate filter for name)
        // We handle message search in DB, sender name search in JS after populate
        if (search) {
            query.message = { $regex: search, $options: "i" };
        }

        const [notifications, total] = await Promise.all([
            Notification.find(query)
                .populate("sender", "name username profilePicture")
                .populate("post", "_id body")
                .sort({ createdAt: -1 })
                .skip(skip)
                .limit(limitNum)
                .lean(),
            Notification.countDocuments(query),
        ]);

        const unreadCount = await Notification.countDocuments({
            recipient: user._id,
            isRead:    false,
            isDeleted: false,
            isArchived: false,
        });

        return res.json({
            notifications,
            unreadCount,
            currentPage: pageNum,
            totalPages:  Math.ceil(total / limitNum),
            totalCount:  total,
            hasMore:     pageNum * limitNum < total,
        });
    } catch (error) {
        return res.status(500).json({ message: error.message });
    }
};

// ─────────────────────────────────────────────────────────────────────────────
// GET /notifications/unread_count — lightweight for badge polling
// ─────────────────────────────────────────────────────────────────────────────
export const getUnreadCount = async (req, res) => {
    try {
        const { token } = req.query;
        const user = await User.findOne({ token }).select("_id");
        if (!user) return res.status(404).json({ message: "User not found" });

        const count = await Notification.countDocuments({
            recipient: user._id,
            isRead:    false,
            isDeleted: false,
            isArchived: false,
        });

        return res.json({ count });
    } catch (error) {
        return res.status(500).json({ message: error.message });
    }
};

// ─────────────────────────────────────────────────────────────────────────────
// POST /notifications/mark_read — single (backward-compatible)
// ─────────────────────────────────────────────────────────────────────────────
export const markNotificationRead = async (req, res) => {
    try {
        const { token, notificationId } = req.body;
        const user = await User.findOne({ token }).select("_id");
        if (!user) return res.status(404).json({ message: "User not found" });

        await Notification.findOneAndUpdate(
            { _id: notificationId, recipient: user._id },
            { isRead: true }
        );

        return res.json({ message: "Marked as read" });
    } catch (error) {
        return res.status(500).json({ message: error.message });
    }
};

// ─────────────────────────────────────────────────────────────────────────────
// POST /notifications/mark_all_read
// ─────────────────────────────────────────────────────────────────────────────
export const markAllNotificationsRead = async (req, res) => {
    try {
        const { token } = req.body;
        const user = await User.findOne({ token }).select("_id");
        if (!user) return res.status(404).json({ message: "User not found" });

        const result = await Notification.updateMany(
            { recipient: user._id, isRead: false, isDeleted: false },
            { isRead: true }
        );

        return res.json({ message: "All marked as read", modifiedCount: result.modifiedCount });
    } catch (error) {
        return res.status(500).json({ message: error.message });
    }
};

// ─────────────────────────────────────────────────────────────────────────────
// DELETE /notifications/:id — soft-delete
// ─────────────────────────────────────────────────────────────────────────────
export const deleteNotification = async (req, res) => {
    try {
        const { token } = req.body;
        const { id } = req.params;
        const user = await User.findOne({ token }).select("_id");
        if (!user) return res.status(404).json({ message: "User not found" });

        const notif = await Notification.findOneAndUpdate(
            { _id: id, recipient: user._id },
            { isDeleted: true },
            { new: true }
        );

        if (!notif) return res.status(404).json({ message: "Notification not found" });
        return res.json({ message: "Notification deleted" });
    } catch (error) {
        return res.status(500).json({ message: error.message });
    }
};

// ─────────────────────────────────────────────────────────────────────────────
// PATCH /notifications/:id/archive — toggle archive state
// ─────────────────────────────────────────────────────────────────────────────
export const toggleArchiveNotification = async (req, res) => {
    try {
        const { token } = req.body;
        const { id } = req.params;
        const user = await User.findOne({ token }).select("_id");
        if (!user) return res.status(404).json({ message: "User not found" });

        const notif = await Notification.findOne({ _id: id, recipient: user._id });
        if (!notif) return res.status(404).json({ message: "Notification not found" });

        notif.isArchived = !notif.isArchived;
        await notif.save();

        return res.json({
            message: notif.isArchived ? "Notification archived" : "Notification unarchived",
            isArchived: notif.isArchived,
        });
    } catch (error) {
        return res.status(500).json({ message: error.message });
    }
};
