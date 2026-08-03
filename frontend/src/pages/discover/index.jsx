// frontend/src/pages/discover/index.jsx
import {
    getAllUsers,
    sendConnectionRequest,
    getConnectionsRequest,
    getMyConnectionRequests,
    AcceptConnection,
} from "@/config/redux/action/authAction";
import DashboardLayout from "@/layout/DashboardLayout";
import UserLayout from "@/layout/UserLayout";
import Loader from "@/Components/Loader";
import React, { useEffect, useState, useMemo } from "react";
import { useDispatch, useSelector } from "react-redux";
import styles from "./index.module.css";
import { useRouter } from "next/router";
import { motion } from "framer-motion";
import { useSocket } from "@/context/SocketContext";

const DEFAULT_IMAGE =
    "https://img.freepik.com/free-vector/blue-circle-with-white-user_78370-4707.jpg"; // Or your own uploaded default
// --- Icons ---
const SearchIcon = () => (
    <svg
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth={2}
        width="20"
    >
        <circle cx="11" cy="11" r="8" />
        <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M21 21l-4.35-4.35"
        />
    </svg>
);
const ClearIcon = () => (
    <svg
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth={2}
        width="18"
    >
        <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M6 18L18 6M6 6l12 12"
        />
    </svg>
);
const UserPlusIcon = () => (
    <svg
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth={2}
        width="18"
    >
        <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M19 7.5v3m0 0v3m0-3h3m-3 0h-3m-2.25-4.125a3.375 3.375 0 11-6.75 0 3.375 3.375 0 016.75 0zM3.75 15a6.75 6.75 0 0113.5 0v.75a8.625 8.625 0 01-17.25 0v-.75z"
        />
    </svg>
);
const CheckIcon = () => (
    <svg
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth={3}
        width="18"
    >
        <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M4.5 12.75l6 6 9-13.5"
        />
    </svg>
);
const ClockIcon = () => (
    <svg
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth={2}
        width="18"
    >
        <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z"
        />
    </svg>
);

export default function DiscoverPage() {
    const authState = useSelector((state) => state.auth);
    const dispatch = useDispatch();
    const router = useRouter();
    const { onlineStatuses } = useSocket() || {};
    const [searchQuery, setSearchQuery] = useState("");
    const [isMounted, setIsMounted] = useState(false);

    useEffect(() => {
        setIsMounted(true);
        const token = localStorage.getItem("token");
        if (!authState.all_profiles_fetched) {
            dispatch(getAllUsers());
        }
        if (token) {
            dispatch(getConnectionsRequest({ token }));
            dispatch(getMyConnectionRequests({ token }));
        }
    }, [dispatch, authState.all_profiles_fetched]);

    // --- UPDATED: Handle both Connect and Accept ---
    const handleConnectionAction = (e, targetUserId, status) => {
        e.stopPropagation();
        const token = localStorage.getItem("token");

        if (status === "Connect") {
            // Case 1: Send new request
            dispatch(
                sendConnectionRequest({
                    token,
                    user_id: targetUserId,
                })
            );
        } else if (status === "Accept") {
            // Case 2: Accept existing request
            // We need to find the requestId first from authState.connectionRequest (received requests)
            const requestObj = authState.connectionRequest.find(
                (req) => req.userId._id === targetUserId
            );

            if (requestObj) {
                dispatch(
                    AcceptConnection({
                        token,
                        connectionId: requestObj._id, // Pass the Request Object ID, not User ID
                        action: "accept",
                    })
                );
            } else {
                console.error(
                    "Request object not found for user:",
                    targetUserId
                );
            }
        }
    };

    const getConnectStatus = (targetUserId) => {
        const requestsReceived = Array.isArray(authState.connectionRequest)
            ? authState.connectionRequest
            : [];
        const requestsSent = Array.isArray(authState.connections)
            ? authState.connections
            : [];

        // 1. Connected?
        const connectedReceived = requestsReceived.find(
            (req) =>
                req.userId?._id === targetUserId && req.status_accepted === true
        );
        const connectedSent = requestsSent.find(
            (req) =>
                req.connectionId?._id === targetUserId &&
                req.status_accepted === true
        );
        if (connectedReceived || connectedSent) return "Connected";

        // 2. Pending (Sent by me)?
        const isPending = requestsSent.find(
            (req) =>
                req.connectionId?._id === targetUserId &&
                req.status_accepted === null
        );
        if (isPending) return "Pending";

        // 3. Pending (Received from them)?
        const hasRequested = requestsReceived.find(
            (req) =>
                req.userId?._id === targetUserId && req.status_accepted === null
        );
        if (hasRequested) return "Accept";

        return "Connect";
    };

    const isUserOnline = (uid, defaultStatus) => {
        return onlineStatuses && onlineStatuses[uid]
            ? onlineStatuses[uid].isOnline
            : defaultStatus;
    };

    const filteredUsers = useMemo(() => {
        if (!authState.user || !authState.all_users) return [];

        return authState.all_users
            .filter((profile) => profile && profile.userId)
            .filter(
                (profile) => profile.userId._id !== authState.user.userId._id
            )
            .filter((profile) => {
                const term = searchQuery.toLowerCase().trim();
                if (!term) return true;
                const name = profile.userId.name?.toLowerCase() || "";
                const username = profile.userId.username?.toLowerCase() || "";
                return name.includes(term) || username.includes(term);
            });
    }, [authState.all_users, authState.user, searchQuery]);

    const handleClearSearch = () => {
        setSearchQuery("");
    };

    const containerVariants = {
        hidden: { opacity: 0 },
        visible: { opacity: 1, transition: { staggerChildren: 0.05 } },
    };
    const itemVariants = {
        hidden: { opacity: 0, y: 15 },
        visible: { opacity: 1, y: 0 },
    };

    const isLoading =
        !isMounted ||
        !authState.user ||
        (!authState.all_profiles_fetched &&
            (!authState.all_users || authState.all_users.length === 0));

    return (
        <div className={styles.discoverContainer}>
            <div className={styles.headerSection}>
                <div>
                    <h2 className={styles.pageTitle}>Global Discovery</h2>
                    <p className={styles.pageSubtitle}>
                        Expand your neural network
                    </p>
                </div>
                <div className={styles.searchWrapper}>
                    <SearchIcon />
                    <input
                        type="text"
                        placeholder="Search nodes..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                    />
                    {searchQuery && (
                        <button
                            onClick={handleClearSearch}
                            className={styles.clearBtn}
                        >
                            <ClearIcon />
                        </button>
                    )}
                </div>
            </div>

            {isLoading ? (
                <Loader variant="section" label="Finding people..." />
            ) : (
                <motion.div
                    className={styles.grid}
                    variants={containerVariants}
                    initial="hidden"
                    animate="visible"
                    key={searchQuery}
                >
                    {filteredUsers.length === 0 ? (
                        <div className={styles.emptyState}>
                            <p>
                                No matching signals found for "{searchQuery}".
                            </p>
                            <button onClick={handleClearSearch}>
                                Clear Filter
                            </button>
                        </div>
                    ) : (
                        filteredUsers.map((user) => {
                            const status = getConnectStatus(user.userId._id);

                            return (
                                <motion.div
                                    key={user._id}
                                    className={styles.userCard}
                                    variants={itemVariants}
                                    whileHover={{
                                        y: -5,
                                        boxShadow:
                                            "0 10px 30px rgba(139, 92, 246, 0.2)",
                                    }}
                                    onClick={() =>
                                        router.push(
                                            `/view_profile/${user.userId.username}`
                                        )
                                    }
                                >
                                    <div
                                        className={styles.cardBanner}
                                        style={{
                                            backgroundImage: `url(${
                                                user.userId.backgroundPicture ||
                                                "https://via.placeholder.com/300"
                                            })`,
                                        }}
                                    ></div>

                                    <div className={styles.cardContent}>
                                        <div className={styles.avatarWrapper}>
                                            <img
                                                src={
                                                    user.userId
                                                        .profilePicture ||
                                                    DEFAULT_IMAGE
                                                }
                                                alt={user.userId.name}
                                                onError={(e) => {
                                                    // This replaces the broken image with the default one instantly
                                                    e.target.onerror = null;
                                                    e.target.src =
                                                        DEFAULT_IMAGE;
                                                }}
                                            />
                                            {isUserOnline(
                                                user.userId._id,
                                                user.userId.isOnline
                                            ) && (
                                                <span
                                                    className={styles.onlineDot}
                                                ></span>
                                            )}
                                        </div>

                                        <div className={styles.userInfo}>
                                            <h3>{user.userId.name}</h3>
                                            <p className={styles.userHandle}>
                                                @{user.userId.username}
                                            </p>
                                            <p className={styles.userBio}>
                                                {user.currentPost ||
                                                    (user.bio
                                                        ? user.bio.substring(
                                                              0,
                                                              50
                                                          ) +
                                                          (user.bio.length > 50
                                                              ? "..."
                                                              : "")
                                                        : "Digital Nomad")}
                                            </p>
                                        </div>

                                        <button
                                            className={`${styles.actionBtn} ${
                                                styles[status.toLowerCase()]
                                            }`}
                                            onClick={(e) =>
                                                handleConnectionAction(
                                                    e,
                                                    user.userId._id,
                                                    status
                                                )
                                            }
                                            disabled={
                                                status !== "Connect" &&
                                                status !== "Accept"
                                            }
                                        >
                                            {status === "Connect" && (
                                                <>
                                                    <UserPlusIcon /> Connect
                                                </>
                                            )}
                                            {status === "Pending" && (
                                                <>
                                                    <ClockIcon /> Pending
                                                </>
                                            )}
                                            {status === "Connected" && (
                                                <>
                                                    <CheckIcon /> Connected
                                                </>
                                            )}
                                            {status === "Accept" &&
                                                "Accept Request"}
                                        </button>
                                    </div>
                                </motion.div>
                            );
                        })
                    )}
                </motion.div>
            )}
        </div>
    );
}

DiscoverPage.getLayout = function getLayout(page) {
    return (
        <UserLayout>
            <DashboardLayout>{page}</DashboardLayout>
        </UserLayout>
    );
};
