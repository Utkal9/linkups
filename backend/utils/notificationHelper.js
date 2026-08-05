/**
 * notificationHelper.js
 *
 * Centralized notification creation utility.
 *
 * BEFORE: `new Notification({...}).save()` + manual socket emit duplicated
 * across 4 files (posts.controller, user.controller, server.js).
 *
 * NOW: one function handles DB creation, sender population, and Socket.IO
 * delivery. All existing callers are updated to use this helper.
 *
 * Usage:
 *   import { createAndEmitNotification } from "../utils/notificationHelper.js";
 *
 *   await createAndEmitNotification(req.io, req.userSocketMap, {
 *       recipient:  <ObjectId | string>,
 *       sender:     <User document>,   // must have ._id, .name, .profilePicture
 *       type:       "like" | "comment" | ...,
 *       message:    "reacted to your post.",
 *       post:       <ObjectId | null>,      // optional
 *       priority:   "info" | "success" | "warning" | "critical",  // optional
 *       metadata:   {},                     // optional extra payload
 *   });
 *
 * Returns the saved notification document, or null on error (non-throwing
 * so a notification failure never breaks the primary action).
 */

import Notification from "../models/notification.model.js";

/**
 * @param {import('socket.io').Server} io
 * @param {Map<string,string>} userSocketMap    userId -> socketId
 * @param {Object} opts
 */
export const createAndEmitNotification = async (io, userSocketMap, opts) => {
    const {
        recipient,
        sender,
        type,
        message = "",
        post = null,
        priority = "info",
        metadata = {},
    } = opts;

    try {
        // 1. Persist to MongoDB
        const notif = new Notification({
            recipient,
            sender: sender._id,
            type,
            message,
            post: post || null,
            priority,
            metadata,
        });
        await notif.save();

        // 2. Build the real-time payload (mirrors what getNotifications returns)
        const payload = {
            _id: notif._id,
            recipient: notif.recipient,
            sender: {
                _id: sender._id,
                name: sender.name,
                username: sender.username,
                profilePicture: sender.profilePicture,
            },
            type: notif.type,
            message: notif.message,
            post: post ? { _id: post._id ?? post, body: post.body ?? "" } : null,
            priority: notif.priority,
            isRead: false,
            isArchived: false,
            isDeleted: false,
            metadata: notif.metadata,
            createdAt: notif.createdAt,
        };

        // 3. Emit via Socket.IO if the recipient is online
        if (io && userSocketMap) {
            const recipientSocketId = userSocketMap.get(recipient.toString());
            if (recipientSocketId) {
                io.to(recipientSocketId).emit("new_notification", payload);
            }
        }

        return notif;
    } catch (err) {
        // Non-fatal: log but don't crash the parent request
        console.error("[NotificationHelper] Failed to create notification:", err.message);
        return null;
    }
};
