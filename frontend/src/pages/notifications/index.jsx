// frontend/src/pages/notifications/index.jsx
import React, { useEffect, useCallback, useRef, useState } from "react";
import Head from "next/head";
import { useRouter } from "next/router";
import { useDispatch, useSelector } from "react-redux";
import UserLayout from "@/layout/UserLayout";
import DashboardLayout from "@/layout/DashboardLayout";
import Loader from "@/Components/Loader";
import {
    fetchNotifications,
    loadMoreNotifications,
    markRead,
    markAllRead,
    deleteNotification,
    archiveNotification,
    setFilter,
    setSearchQuery,
} from "@/config/redux/reducer/notificationReducer";
import styles from "./index.module.css";

// ─────────────────────────────────────────────────────────────────────────────
// Constants
// ─────────────────────────────────────────────────────────────────────────────

const FILTER_TABS = [
    { key: "all",                 label: "All" },
    { key: "unread",              label: "Unread" },
    { key: "archived",            label: "Archived" },
    { key: "like",                label: "Likes" },
    { key: "comment",             label: "Comments" },
    { key: "connection_request",  label: "Connections" },
    { key: "message",             label: "Messages" },
    { key: "missed_call",         label: "Calls" },
    { key: "system_announcement", label: "System" },
];

// Navigation target per notification type
const getNavigationPath = (notif) => {
    const type = notif.type;
    if (type === "like" || type === "comment" || type === "mention") {
        return notif.post?._id ? `/post/${notif.post._id}` : null;
    }
    if (type === "connection_request" || type === "connection_accepted" || type === "profile_visited") {
        return notif.sender?.username ? `/view_profile/${notif.sender.username}` : null;
    }
    if (type === "message") {
        return notif.sender?.username ? `/messaging?chatWith=${notif.sender.username}` : "/messaging";
    }
    if (type === "missed_call" || type === "video_call") {
        return notif.sender?.username ? `/messaging?chatWith=${notif.sender.username}` : null;
    }
    if (type === "resume_viewed") return "/resume-builder";
    if (type === "portfolio_viewed") return "/profile";
    return null;
};

// Type → icon emoji + CSS class
const TYPE_META = {
    like:                 { emoji: "❤️",  cls: "iconLike" },
    comment:              { emoji: "💬",  cls: "iconComment" },
    mention:              { emoji: "💬",  cls: "iconComment" },
    connection_request:   { emoji: "🤝",  cls: "iconConnection" },
    connection_accepted:  { emoji: "✅",  cls: "iconConnection" },
    message:              { emoji: "✉️",  cls: "iconMessage" },
    missed_call:          { emoji: "📞",  cls: "iconCall" },
    video_call:           { emoji: "📹",  cls: "iconCall" },
    resume_viewed:        { emoji: "📄",  cls: "iconView" },
    profile_visited:      { emoji: "👁️",  cls: "iconView" },
    portfolio_viewed:     { emoji: "🗂️",  cls: "iconView" },
    system_announcement:  { emoji: "📢",  cls: "iconSystem" },
    community_invitation: { emoji: "🏘️",  cls: "iconSystem" },
    interview_scheduled:  { emoji: "🗓️",  cls: "iconSystem" },
    referral_request:     { emoji: "🔗",  cls: "iconConnection" },
    project_liked:        { emoji: "⭐",  cls: "iconLike" },
};

// ─────────────────────────────────────────────────────────────────────────────
// Utility: relative timestamp ("2 min ago")
// ─────────────────────────────────────────────────────────────────────────────
function relativeTime(dateString) {
    const date  = new Date(dateString);
    const now   = new Date();
    const diff  = Math.floor((now - date) / 1000); // seconds

    if (diff < 60)     return "just now";
    if (diff < 3600)   return `${Math.floor(diff / 60)}m ago`;
    if (diff < 86400)  return `${Math.floor(diff / 3600)}h ago`;
    if (diff < 604800) return `${Math.floor(diff / 86400)}d ago`;
    return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

// ─────────────────────────────────────────────────────────────────────────────
// Utility: group notifications by date bucket
// ─────────────────────────────────────────────────────────────────────────────
function groupByDate(notifications) {
    const today     = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    const groups = { Today: [], Yesterday: [], Earlier: [] };

    notifications.forEach((n) => {
        const d = new Date(n.createdAt);
        if (d.toDateString() === today.toDateString()) {
            groups.Today.push(n);
        } else if (d.toDateString() === yesterday.toDateString()) {
            groups.Yesterday.push(n);
        } else {
            groups.Earlier.push(n);
        }
    });

    return Object.entries(groups).filter(([, items]) => items.length > 0);
}

// ─────────────────────────────────────────────────────────────────────────────
// Sub-component: Skeleton Loader
// ─────────────────────────────────────────────────────────────────────────────
function SkeletonList({ count = 6 }) {
    return (
        <div className={styles.skeletonList} aria-label="Loading notifications" aria-busy="true">
            {Array.from({ length: count }).map((_, i) => (
                <div key={i} className={styles.skeletonItem}>
                    <div className={styles.skeletonAvatar} />
                    <div className={styles.skeletonContent}>
                        <div className={styles.skeletonLine} style={{ width: `${60 + (i % 3) * 15}%` }} />
                        <div className={styles.skeletonLineShort} />
                    </div>
                </div>
            ))}
        </div>
    );
}

// ─────────────────────────────────────────────────────────────────────────────
// Sub-component: Single Notification Item
// ─────────────────────────────────────────────────────────────────────────────
function NotificationItem({ notif, onRead, onDelete, onArchive, onNavigate }) {
    const [avatarError, setAvatarError] = useState(false);
    const meta    = TYPE_META[notif.type] || { emoji: "🔔", cls: "iconSystem" };
    const initial = notif.sender?.name?.[0]?.toUpperCase() ?? "?";

    const priorityClass = notif.priority === "critical"
        ? styles.itemPriorityCritical
        : notif.priority === "warning"
        ? styles.itemPriorityWarning
        : "";

    const handleKeyDown = (e) => {
        if (e.key === "Enter" || e.key === " ") { e.preventDefault(); onNavigate(notif); }
        if (e.key === "d" || e.key === "D")     { e.preventDefault(); e.stopPropagation(); onDelete(notif._id); }
        if (e.key === "r" || e.key === "R")     { e.preventDefault(); e.stopPropagation(); onRead(notif._id); }
        if (e.key === "a" || e.key === "A")     { e.preventDefault(); e.stopPropagation(); onArchive(notif._id); }
    };

    return (
        <div
            role="listitem"
            tabIndex={0}
            className={`${styles.item} ${!notif.isRead ? styles.itemUnread : ""} ${priorityClass}`}
            onClick={() => onNavigate(notif)}
            onKeyDown={handleKeyDown}
            aria-label={`${notif.sender?.name}: ${notif.message}. ${notif.isRead ? "Read" : "Unread"}.`}
        >
            {/* Avatar + type icon badge */}
            <div className={styles.avatarWrapper}>
                {notif.sender?.profilePicture && !avatarError ? (
                    <img
                        src={notif.sender.profilePicture}
                        alt={notif.sender.name}
                        className={styles.avatar}
                        onError={() => setAvatarError(true)}
                    />
                ) : (
                    <div className={styles.avatarFallback}>{initial}</div>
                )}
                <span className={`${styles.typeIcon} ${styles[meta.cls]}`} aria-hidden="true">
                    {meta.emoji}
                </span>
            </div>

            {/* Text content */}
            <div className={styles.content}>
                <p className={styles.message}>
                    <strong>{notif.sender?.name ?? "LinkUps"}</strong>{" "}
                    {notif.message}
                </p>
                {notif.post?.body && (
                    <span className={styles.postSnippet}>
                        "{notif.post.body.slice(0, 80)}{notif.post.body.length > 80 ? "…" : ""}"
                    </span>
                )}
                <span className={styles.timestamp}>
                    {relativeTime(notif.createdAt)}
                </span>
            </div>

            {/* Hover actions */}
            <div className={styles.actions} role="group" aria-label="Notification actions">
                {!notif.isRead && (
                    <button
                        className={styles.actionBtn}
                        onClick={(e) => { e.stopPropagation(); onRead(notif._id); }}
                        title="Mark as read (R)"
                        aria-label="Mark as read"
                    >
                        ✓
                    </button>
                )}
                <button
                    className={styles.actionBtn}
                    onClick={(e) => { e.stopPropagation(); onArchive(notif._id); }}
                    title={`${notif.isArchived ? "Unarchive" : "Archive"} (A)`}
                    aria-label={notif.isArchived ? "Unarchive" : "Archive"}
                >
                    {notif.isArchived ? "↩" : "🗂"}
                </button>
                <button
                    className={`${styles.actionBtn} ${styles.actionBtnDelete}`}
                    onClick={(e) => { e.stopPropagation(); onDelete(notif._id); }}
                    title="Delete (D)"
                    aria-label="Delete notification"
                >
                    ✕
                </button>
            </div>

            {/* Unread dot */}
            {!notif.isRead && <div className={styles.unreadDot} aria-hidden="true" />}
        </div>
    );
}

// ─────────────────────────────────────────────────────────────────────────────
// Main Page Component
// ─────────────────────────────────────────────────────────────────────────────
export default function NotificationsPage() {
    const dispatch   = useDispatch();
    const router     = useRouter();
    const {
        notifications,
        unreadCount,
        isLoading,
        isLoadingMore,
        hasMore,
        error,
        filter,
        searchQuery,
    } = useSelector((state) => state.notification);

    // Debounced search
    const [localSearch, setLocalSearch] = useState(searchQuery);
    const searchDebounce = useRef(null);

    // Infinite scroll sentinel ref
    const sentinelRef = useRef(null);

    // ── Initial fetch ──────────────────────────────────────────────────────
    useEffect(() => {
        dispatch(fetchNotifications({ filter, search: searchQuery }));
    }, [dispatch, filter]);  // filter change triggers refetch

    // ── IntersectionObserver for infinite scroll ───────────────────────────
    useEffect(() => {
        if (!sentinelRef.current) return;

        const observer = new IntersectionObserver(
            (entries) => {
                if (entries[0].isIntersecting && hasMore && !isLoadingMore && !isLoading) {
                    dispatch(loadMoreNotifications());
                }
            },
            { threshold: 0.1 }
        );

        observer.observe(sentinelRef.current);
        return () => observer.disconnect();
    }, [hasMore, isLoadingMore, isLoading, dispatch]);

    // ── Handlers ──────────────────────────────────────────────────────────
    const handleFilterChange = useCallback((newFilter) => {
        dispatch(setFilter(newFilter));
        dispatch(fetchNotifications({ filter: newFilter, search: localSearch }));
    }, [dispatch, localSearch]);

    const handleSearch = useCallback((e) => {
        const val = e.target.value;
        setLocalSearch(val);
        clearTimeout(searchDebounce.current);
        searchDebounce.current = setTimeout(() => {
            dispatch(setSearchQuery(val));
            dispatch(fetchNotifications({ filter, search: val }));
        }, 350);
    }, [dispatch, filter]);

    const handleRead = useCallback((id) => {
        dispatch(markRead(id));
    }, [dispatch]);

    const handleMarkAll = useCallback(() => {
        dispatch(markAllRead());
    }, [dispatch]);

    const handleDelete = useCallback((id) => {
        dispatch(deleteNotification(id));
    }, [dispatch]);

    const handleArchive = useCallback((id) => {
        dispatch(archiveNotification(id));
    }, [dispatch]);

    const handleNavigate = useCallback((notif) => {
        // Optimistically mark as read on click
        if (!notif.isRead) dispatch(markRead(notif._id));

        const path = getNavigationPath(notif);
        if (path) router.push(path);
    }, [dispatch, router]);

    const handleRetry = useCallback(() => {
        dispatch(fetchNotifications({ filter, search: localSearch }));
    }, [dispatch, filter, localSearch]);

    // ── Derived: grouped notifications ────────────────────────────────────
    const groups = groupByDate(notifications);

    // ─────────────────────────────────────────────────────────────────────
    // Render
    // ─────────────────────────────────────────────────────────────────────
    return (
        <>
            <Head>
                <title>
                    {unreadCount > 0 ? `(${unreadCount}) ` : ""}Notifications — LinkUps
                </title>
                <meta
                    name="description"
                    content="Your LinkUps notification center — connections, messages, and activity updates."
                />
            </Head>

            <main className={styles.container} aria-label="Notification Center">
                {/* ── Header ── */}
                <div className={styles.header}>
                    <div className={styles.headerLeft}>
                        <h1 className={styles.pageTitle}>Notifications</h1>
                        {unreadCount > 0 && (
                            <span className={styles.unreadBadge} aria-label={`${unreadCount} unread`}>
                                {unreadCount}
                            </span>
                        )}
                    </div>
                    <button
                        className={styles.markAllBtn}
                        onClick={handleMarkAll}
                        disabled={unreadCount === 0}
                        aria-label="Mark all notifications as read"
                    >
                        Mark all read
                    </button>
                </div>

                {/* ── Search ── */}
                <div className={styles.searchBar}>
                    <svg className={styles.searchIcon} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} aria-hidden="true">
                        <circle cx="11" cy="11" r="8" />
                        <line x1="21" y1="21" x2="16.65" y2="16.65" />
                    </svg>
                    <input
                        type="search"
                        className={styles.searchInput}
                        placeholder="Search notifications…"
                        value={localSearch}
                        onChange={handleSearch}
                        aria-label="Search notifications"
                        id="notification-search"
                    />
                </div>

                {/* ── Filter Tabs ── */}
                <nav className={styles.filterTabs} aria-label="Notification filters">
                    {FILTER_TABS.map((tab) => (
                        <button
                            key={tab.key}
                            className={`${styles.filterTab} ${filter === tab.key ? styles.filterTabActive : ""}`}
                            onClick={() => handleFilterChange(tab.key)}
                            aria-pressed={filter === tab.key}
                        >
                            {tab.label}
                        </button>
                    ))}
                </nav>

                {/* ── Content ── */}
                {isLoading ? (
                    <SkeletonList count={6} />
                ) : error ? (
                    <div className={styles.errorState} role="alert">
                        <p className={styles.errorText}>⚠ {error}</p>
                        <button className={styles.retryBtn} onClick={handleRetry}>
                            Try Again
                        </button>
                    </div>
                ) : notifications.length === 0 ? (
                    <div className={styles.emptyState} role="status">
                        <div className={styles.emptyIcon} aria-hidden="true">
                            {filter === "unread"   ? "✅" :
                             filter === "archived" ? "🗂️" : "🔔"}
                        </div>
                        <h2 className={styles.emptyTitle}>
                            {filter === "unread"
                                ? "All caught up!"
                                : filter === "archived"
                                ? "Nothing archived yet"
                                : "No notifications"}
                        </h2>
                        <p className={styles.emptySubtitle}>
                            {filter === "unread"
                                ? "You have no unread notifications right now."
                                : filter === "archived"
                                ? "Notifications you archive will appear here."
                                : localSearch
                                ? `No results for "${localSearch}"`
                                : "When people interact with you, you'll see it here."}
                        </p>
                    </div>
                ) : (
                    <div
                        className={styles.list}
                        role="list"
                        aria-label="Notifications"
                        aria-live="polite"
                    >
                        {groups.map(([label, items]) => (
                            <div key={label} className={styles.group}>
                                <div className={styles.groupLabel} aria-label={`${label}'s notifications`}>
                                    {label}
                                </div>
                                {items.map((notif) => (
                                    <NotificationItem
                                        key={notif._id}
                                        notif={notif}
                                        onRead={handleRead}
                                        onDelete={handleDelete}
                                        onArchive={handleArchive}
                                        onNavigate={handleNavigate}
                                    />
                                ))}
                            </div>
                        ))}
                    </div>
                )}

                {/* ── Infinite Scroll Sentinel ── */}
                <div
                    ref={sentinelRef}
                    className={styles.sentinel}
                    aria-hidden="true"
                >
                    {isLoadingMore && (
                        <Loader variant="inline" neutral label="Loading more…" />
                    )}
                    {!hasMore && notifications.length > 0 && (
                        <span className={styles.endText}>
                            You've seen all notifications
                        </span>
                    )}
                </div>
            </main>
        </>
    );
}

NotificationsPage.getLayout = (page) => (
    <UserLayout>
        <DashboardLayout>{page}</DashboardLayout>
    </UserLayout>
);
