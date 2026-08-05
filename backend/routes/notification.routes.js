import { Router } from "express";
import {
    getNotifications,
    getUnreadCount,
    markNotificationRead,
    markAllNotificationsRead,
    deleteNotification,
    toggleArchiveNotification,
} from "../controllers/notification.controller.js";

const router = Router();

/**
 * @swagger
 * tags:
 *   name: Notifications
 *   description: Notification management
 */

/**
 * @swagger
 * /notifications:
 *   get:
 *     summary: Get paginated notifications
 *     tags: [Notifications]
 *     parameters:
 *       - in: query
 *         name: token
 *         required: true
 *         schema: { type: string }
 *       - in: query
 *         name: page
 *         schema: { type: integer, default: 1 }
 *       - in: query
 *         name: limit
 *         schema: { type: integer, default: 15 }
 *       - in: query
 *         name: filter
 *         schema: { type: string, enum: [all, unread, archived, like, comment, connection_request, connection_accepted, missed_call, message, mention, resume_viewed, profile_visited, system_announcement] }
 *       - in: query
 *         name: search
 *         schema: { type: string }
 */
router.get("/notifications", getNotifications);

/**
 * @swagger
 * /notifications/unread_count:
 *   get:
 *     summary: Get unread notification count for badge
 *     tags: [Notifications]
 */
router.get("/notifications/unread_count", getUnreadCount);

/**
 * @swagger
 * /notifications/mark_read:
 *   post:
 *     summary: Mark a single notification as read
 *     tags: [Notifications]
 */
router.post("/notifications/mark_read", markNotificationRead);

/**
 * @swagger
 * /notifications/mark_all_read:
 *   post:
 *     summary: Mark all notifications as read
 *     tags: [Notifications]
 */
router.post("/notifications/mark_all_read", markAllNotificationsRead);

/**
 * @swagger
 * /notifications/{id}:
 *   delete:
 *     summary: Soft-delete a notification
 *     tags: [Notifications]
 */
router.delete("/notifications/:id", deleteNotification);

/**
 * @swagger
 * /notifications/{id}/archive:
 *   patch:
 *     summary: Archive or unarchive a notification
 *     tags: [Notifications]
 */
router.patch("/notifications/:id/archive", toggleArchiveNotification);

export default router;
