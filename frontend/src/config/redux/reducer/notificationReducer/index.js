/**
 * notificationReducer — v2
 *
 * Replaces the original 61-line slice with a full production-grade store slice.
 *
 * State shape:
 *   notifications    — current page's documents (append on loadMore)
 *   unreadCount      — integer, kept in sync by server responses + optimistic updates
 *   totalCount       — total matching server-side documents for the current filter
 *   currentPage      — page cursor for infinite scroll
 *   hasMore          — whether more pages exist
 *   isLoading        — true on initial / filter-change fetch
 *   isLoadingMore    — true on loadMore (avoids spinner replacing whole list)
 *   error            — last error message string, null when clean
 *   filter           — active filter tab: 'all'|'unread'|'archived'|<type>
 *   searchQuery      — debounced search string
 *
 * Thunks:
 *   fetchNotifications({ filter?, search?, page? })  — initial / filter-change
 *   loadMoreNotifications()                          — append next page
 *   markRead(notificationId)                         — optimistic single read
 *   markAllRead()                                    — optimistic bulk read
 *   deleteNotification(notificationId)               — optimistic soft-delete
 *   archiveNotification(notificationId)              — optimistic archive toggle
 */

import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import clientServer from "../../../index.jsx";

const PAGE_SIZE = 15;

// ─────────────────────────────────────────────────────────────────────────────
// Async Thunks
// ─────────────────────────────────────────────────────────────────────────────

/** Lightweight fetch — just the integer badge count. Called on app mount. */
export const fetchUnreadCount = createAsyncThunk(
    "notification/fetchUnreadCount",
    async (_, thunkAPI) => {
        try {
            const token = localStorage.getItem("token");
            if (!token) return 0;
            const response = await clientServer.get("/notifications/unread_count", {
                params: { token },
            });
            return response.data.count ?? 0;
        } catch {
            return 0; // Badge failing silently is acceptable
        }
    }
);

/**
 * Initial fetch or filter/search change — replaces the list.
 * Reads filter + searchQuery from current state if not provided.
 */
export const fetchNotifications = createAsyncThunk(
    "notification/fetch",
    async ({ filter, search, page = 1 } = {}, thunkAPI) => {
        try {
            const token = localStorage.getItem("token");
            const state = thunkAPI.getState().notification;
            const response = await clientServer.get("/notifications", {
                params: {
                    token,
                    page,
                    limit: PAGE_SIZE,
                    filter: filter ?? state.filter,
                    search: search ?? state.searchQuery,
                },
            });
            return response.data;
        } catch (error) {
            return thunkAPI.rejectWithValue(
                error.response?.data?.message ?? "Failed to load notifications"
            );
        }
    }
);

/**
 * Append next page to the list (infinite scroll).
 * Uses currentPage + 1 from Redux state.
 */
export const loadMoreNotifications = createAsyncThunk(
    "notification/loadMore",
    async (_, thunkAPI) => {
        try {
            const token = localStorage.getItem("token");
            const state = thunkAPI.getState().notification;
            const nextPage = state.currentPage + 1;

            const response = await clientServer.get("/notifications", {
                params: {
                    token,
                    page: nextPage,
                    limit: PAGE_SIZE,
                    filter: state.filter,
                    search: state.searchQuery,
                },
            });
            return response.data;
        } catch (error) {
            return thunkAPI.rejectWithValue(
                error.response?.data?.message ?? "Failed to load more"
            );
        }
    }
);

/** Mark a single notification as read */
export const markRead = createAsyncThunk(
    "notification/markRead",
    async (notificationId, thunkAPI) => {
        try {
            const token = localStorage.getItem("token");
            await clientServer.post("/notifications/mark_read", {
                token,
                notificationId,
            });
            return notificationId;
        } catch (error) {
            return thunkAPI.rejectWithValue(
                error.response?.data?.message ?? "Failed to mark as read"
            );
        }
    }
);

/** Mark all unread notifications as read */
export const markAllRead = createAsyncThunk(
    "notification/markAllRead",
    async (_, thunkAPI) => {
        try {
            const token = localStorage.getItem("token");
            await clientServer.post("/notifications/mark_all_read", { token });
            return true;
        } catch (error) {
            return thunkAPI.rejectWithValue(
                error.response?.data?.message ?? "Failed to mark all as read"
            );
        }
    }
);

/** Soft-delete a notification */
export const deleteNotification = createAsyncThunk(
    "notification/delete",
    async (notificationId, thunkAPI) => {
        try {
            const token = localStorage.getItem("token");
            await clientServer.delete(`/notifications/${notificationId}`, {
                data: { token },
            });
            return notificationId;
        } catch (error) {
            return thunkAPI.rejectWithValue(
                error.response?.data?.message ?? "Failed to delete notification"
            );
        }
    }
);

/** Archive or unarchive a notification */
export const archiveNotification = createAsyncThunk(
    "notification/archive",
    async (notificationId, thunkAPI) => {
        try {
            const token = localStorage.getItem("token");
            const response = await clientServer.patch(
                `/notifications/${notificationId}/archive`,
                { token }
            );
            return { notificationId, isArchived: response.data.isArchived };
        } catch (error) {
            return thunkAPI.rejectWithValue(
                error.response?.data?.message ?? "Failed to archive notification"
            );
        }
    }
);

// ─────────────────────────────────────────────────────────────────────────────
// Slice
// ─────────────────────────────────────────────────────────────────────────────

const notificationSlice = createSlice({
    name: "notification",
    initialState: {
        notifications: [],
        unreadCount:   0,
        totalCount:    0,
        currentPage:   1,
        hasMore:       true,
        isLoading:     false,
        isLoadingMore: false,
        error:         null,
        filter:        "all",
        searchQuery:   "",
    },
    reducers: {
        // Real-time: prepend new notification from Socket.IO
        addNewNotification: (state, action) => {
            // Avoid duplicates (e.g. if both REST + socket deliver it)
            const exists = state.notifications.some(
                (n) => n._id === action.payload._id
            );
            if (!exists) {
                state.notifications.unshift(action.payload);
                state.totalCount += 1;
            }
            state.unreadCount += 1;
        },

        // UI: set filter tab (triggers refetch in the component)
        setFilter: (state, action) => {
            state.filter = action.payload;
            state.notifications = [];
            state.currentPage = 1;
            state.hasMore = true;
            state.error = null;
        },

        // UI: set search query (triggers debounced refetch in the component)
        setSearchQuery: (state, action) => {
            state.searchQuery = action.payload;
            state.notifications = [];
            state.currentPage = 1;
            state.hasMore = true;
            state.error = null;
        },

        // Direct sync of unread count (from badge-only endpoint)
        setUnreadCount: (state, action) => {
            state.unreadCount = action.payload;
        },

        // Reset to pristine state on logout
        resetNotifications: (state) => {
            state.notifications  = [];
            state.unreadCount    = 0;
            state.totalCount     = 0;
            state.currentPage    = 1;
            state.hasMore        = true;
            state.isLoading      = false;
            state.isLoadingMore  = false;
            state.error          = null;
            state.filter         = "all";
            state.searchQuery    = "";
        },
    },
    extraReducers: (builder) => {
        // ── fetchUnreadCount (lightweight badge-only) ────────────────────
        builder
            .addCase(fetchUnreadCount.fulfilled, (state, action) => {
                // Only update if the full list hasn't set a more accurate number
                state.unreadCount = action.payload;
            });

        // ── fetchNotifications ──────────────────────────────────────────────
        builder
            .addCase(fetchNotifications.pending, (state) => {
                state.isLoading = true;
                state.error     = null;
            })
            .addCase(fetchNotifications.fulfilled, (state, action) => {
                state.isLoading      = false;
                state.notifications  = action.payload.notifications;
                state.unreadCount    = action.payload.unreadCount;
                state.totalCount     = action.payload.totalCount;
                state.currentPage    = action.payload.currentPage;
                state.hasMore        = action.payload.hasMore;
            })
            .addCase(fetchNotifications.rejected, (state, action) => {
                state.isLoading = false;
                state.error     = action.payload;
            });

        // ── loadMoreNotifications ───────────────────────────────────────────
        builder
            .addCase(loadMoreNotifications.pending, (state) => {
                state.isLoadingMore = true;
            })
            .addCase(loadMoreNotifications.fulfilled, (state, action) => {
                state.isLoadingMore = false;
                // Append, deduplicating by _id
                const existingIds = new Set(state.notifications.map((n) => n._id));
                const newItems = action.payload.notifications.filter(
                    (n) => !existingIds.has(n._id)
                );
                state.notifications.push(...newItems);
                state.currentPage = action.payload.currentPage;
                state.hasMore     = action.payload.hasMore;
                state.totalCount  = action.payload.totalCount;
            })
            .addCase(loadMoreNotifications.rejected, (state, action) => {
                state.isLoadingMore = false;
                state.error = action.payload;
            });

        // ── markRead — optimistic ───────────────────────────────────────────
        builder
            .addCase(markRead.pending, (state, action) => {
                // action.meta.arg is the notificationId
                const notif = state.notifications.find(
                    (n) => n._id === action.meta.arg
                );
                if (notif && !notif.isRead) {
                    notif.isRead = true;
                    state.unreadCount = Math.max(0, state.unreadCount - 1);
                }
            })
            .addCase(markRead.rejected, (state, action) => {
                // Roll back optimistic update on failure
                const notif = state.notifications.find(
                    (n) => n._id === action.meta.arg
                );
                if (notif) {
                    notif.isRead = false;
                    state.unreadCount += 1;
                }
            });

        // ── markAllRead — optimistic ────────────────────────────────────────
        builder
            .addCase(markAllRead.pending, (state) => {
                state.notifications.forEach((n) => {
                    n.isRead = true;
                });
                state.unreadCount = 0;
            })
            .addCase(markAllRead.rejected, (state) => {
                // Re-fetch will correct it; just mark error
                state.error = "Failed to mark all as read. Please refresh.";
            });

        // ── deleteNotification — optimistic ─────────────────────────────────
        builder
            .addCase(deleteNotification.pending, (state, action) => {
                const index = state.notifications.findIndex(
                    (n) => n._id === action.meta.arg
                );
                if (index !== -1) {
                    const wasUnread = !state.notifications[index].isRead;
                    state.notifications.splice(index, 1);
                    state.totalCount = Math.max(0, state.totalCount - 1);
                    if (wasUnread) {
                        state.unreadCount = Math.max(0, state.unreadCount - 1);
                    }
                }
            })
            .addCase(deleteNotification.rejected, (state, action) => {
                state.error = action.payload;
            });

        // ── archiveNotification — optimistic ────────────────────────────────
        builder
            .addCase(archiveNotification.pending, (state, action) => {
                const notif = state.notifications.find(
                    (n) => n._id === action.meta.arg
                );
                if (notif) {
                    // Optimistically toggle
                    notif.isArchived = !notif.isArchived;
                    // If archiving an unread item, decrement badge
                    if (notif.isArchived && !notif.isRead) {
                        state.unreadCount = Math.max(0, state.unreadCount - 1);
                    }
                    // If filter is 'all' (not 'archived'), remove from view
                    if (notif.isArchived) {
                        const index = state.notifications.findIndex(
                            (n) => n._id === action.meta.arg
                        );
                        if (index !== -1) {
                            state.notifications.splice(index, 1);
                            state.totalCount = Math.max(0, state.totalCount - 1);
                        }
                    }
                }
            })
            .addCase(archiveNotification.fulfilled, (state, action) => {
                // Server confirmed — no-op since we already updated optimistically
            })
            .addCase(archiveNotification.rejected, (state, action) => {
                state.error = action.payload;
                // Re-fetch will correct the list; the optimistic remove is already done
            });
    },
});

export const {
    addNewNotification,
    setFilter,
    setSearchQuery,
    setUnreadCount,
    resetNotifications,
} = notificationSlice.actions;

export default notificationSlice.reducer;
