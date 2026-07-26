// frontend/src/layout/DashboardLayout/index.jsx
import React, { useEffect, useMemo, useState } from "react";
import styles from "./index.module.css";
import { useRouter } from "next/router";
import { useDispatch, useSelector } from "react-redux";
import { setTokenIsThere } from "@/config/redux/reducer/authReducer";
import {
    getAboutUser,
    getAllUsers,
    sendConnectionRequest,
    getConnectionsRequest,
    getMyConnectionRequests,
} from "@/config/redux/action/authAction";
import { useSocket } from "@/context/SocketContext";

const DEFAULT_BG =
    "https://img.freepik.com/free-photo/3d-rendering-hexagonal-texture-background_23-2150796421.jpg?semt=ais_hybrid&w=740&q=80";

export default function DashboardLayout({ children }) {
    const router = useRouter();
    const dispatch = useDispatch();
    const authState = useSelector((state) => state.auth);
    const { onlineStatuses } = useSocket() || {};

    useEffect(() => {
        const token = localStorage.getItem("token");
        const tokenTimestamp = localStorage.getItem("tokenTimestamp");

        // 12 Hours in milliseconds (12 * 60 * 60 * 1000)
        const TWELVE_HOURS = 43200000;

        const now = Date.now();
        const isExpired =
            !tokenTimestamp || now - parseInt(tokenTimestamp) > TWELVE_HOURS;

        if (!token || isExpired) {
            // --- FIX: Clean up and redirect if expired or no token ---
            localStorage.removeItem("token");
            localStorage.removeItem("tokenTimestamp");
            router.push("/login");
        } else {
            dispatch(setTokenIsThere());

            // Fetch Profile Data with ERROR HANDLING
            if (!authState.profileFetched) {
                dispatch(getAboutUser({ token }))
                    .unwrap()
                    .catch((err) => {
                        // --- FIX: If token is invalid on server, clear and logout to prevent "Initializing" stuck state ---
                        console.error("Session invalid:", err);
                        localStorage.removeItem("token");
                        localStorage.removeItem("tokenTimestamp");
                        router.push("/login");
                    });
            }

            if (!authState.all_profiles_fetched) dispatch(getAllUsers());

            // Fetch Connections
            dispatch(getConnectionsRequest({ token }));
            dispatch(getMyConnectionRequests({ token }));
        }
    }, [
        dispatch,
        authState.profileFetched,
        authState.all_profiles_fetched,
        router,
    ]);

    const user = authState.user?.userId;
    const userFallback = user?.name ? user.name.charAt(0).toUpperCase() : "?";
    const backgroundPic = user?.backgroundPicture || DEFAULT_BG;
    const [imgError, setImgError] = useState(false);

    const isUserOnline = (uid, defaultStatus) => {
        return onlineStatuses && onlineStatuses[uid]
            ? onlineStatuses[uid].isOnline
            : defaultStatus;
    };

    const networkCount = useMemo(() => {
        const sent = Array.isArray(authState.connections)
            ? authState.connections
            : [];
        const received = Array.isArray(authState.connectionRequest)
            ? authState.connectionRequest
            : [];

        // FIX: Check if 'r.connectionId' or 'r.userId' exists before counting
        // If a user is deleted, mongoose populate returns null for these fields.
        const acceptedSent = sent.filter(
            (r) => r.status_accepted === true && r.connectionId
        ).length;

        const acceptedReceived = received.filter(
            (r) => r.status_accepted === true && r.userId
        ).length;

        return acceptedSent + acceptedReceived;
    }, [authState.connections, authState.connectionRequest]);

    const randomProfiles = useMemo(() => {
        if (!authState.all_profiles_fetched || !authState.all_users) return [];
        const excludedIds = new Set();
        if (authState.user?.userId?._id)
            excludedIds.add(authState.user.userId._id);
        if (Array.isArray(authState.connections))
            authState.connections.forEach(
                (req) =>
                    req.connectionId &&
                    excludedIds.add(req.connectionId._id || req.connectionId)
            );
        if (Array.isArray(authState.connectionRequest))
            authState.connectionRequest.forEach(
                (req) =>
                    req.userId && excludedIds.add(req.userId._id || req.userId)
            );

        const filtered = authState.all_users.filter((profile) => {
            if (!profile.userId) return false;
            return !excludedIds.has(profile.userId._id);
        });
        return [...filtered].sort(() => 0.5 - Math.random()).slice(0, 5);
    }, [
        authState.all_users,
        authState.user,
        authState.connections,
        authState.connectionRequest,
    ]);

    const handleConnect = (e, targetId) => {
        e.stopPropagation();
        const token = localStorage.getItem("token");
        if (token)
            dispatch(sendConnectionRequest({ token, user_id: targetId }));
    };

    return (
        <div className={styles.layoutContainer}>
            <div className={styles.bgGlow}></div>
            <div className="container">
                <div className="row g-4">
                    {/* LEFT COLUMN: "Command Node" */}
                    <div className="col-lg-4 d-none d-lg-block">
                        <div className={styles.stickySidebar}>
                            {/* 1. Identity Module */}
                            <div className={`${styles.glassPanel} mb-4`}>
                                <div
                                    className={styles.cardHeader}
                                    style={{
                                        backgroundImage: `url("${backgroundPic}")`,
                                    }}
                                ></div>
                                <div className={styles.avatarWrapper}>
                                    {user?.profilePicture && !imgError ? (
                                        <img
                                            src={user.profilePicture}
                                            alt="Profile"
                                            className={styles.profilePic}
                                            onError={() => setImgError(true)} // <--- Triggers fallback on broken link
                                        />
                                    ) : (
                                        <div className={styles.profileFallback}>
                                            {userFallback}
                                        </div>
                                    )}
                                    {/* Online dot logic... */}
                                    {user && isUserOnline(user._id, true) && (
                                        <span
                                            className={styles.onlineDot}
                                        ></span>
                                    )}
                                </div>
                                <div className="text-center mt-2 px-3 pb-4">
                                    <h3
                                        className={styles.userName}
                                        onClick={() => router.push("/profile")}
                                    >
                                        {user?.name || "User"}
                                    </h3>
                                    <p className={styles.userHandle}>
                                        @{user?.username || "username"}
                                    </p>
                                    {authState.user?.bio && (
                                        <p className={styles.userBio}>
                                            {authState.user.bio.substring(
                                                0,
                                                60
                                            )}
                                            ...
                                        </p>
                                    )}

                                    {/* Stats Container */}
                                    <div className={styles.statsContainer}>
                                        <div className={styles.statBox}>
                                            <span className={styles.statNum}>
                                                {networkCount}
                                            </span>
                                            <span className={styles.statLabel}>
                                                Network Connections
                                            </span>
                                        </div>
                                    </div>

                                    <button
                                        onClick={() => router.push("/profile")}
                                        className={styles.holoBtnFull}
                                    >
                                        View Profile
                                    </button>
                                </div>
                            </div>

                            {/* 2. Discovery Module */}
                            <div className={styles.glassPanel}>
                                <div className="p-3 border-bottom border-white border-opacity-10 d-flex justify-content-between align-items-center">
                                    <h5 className={styles.panelTitle}>
                                        People You May Know
                                    </h5>
                                    <span className={styles.livePulse}></span>
                                </div>
                                <div className="p-2">
                                    {authState.all_profiles_fetched ? (
                                        randomProfiles.length > 0 ? (
                                            randomProfiles.map((profile) => (
                                                <div
                                                    key={profile._id}
                                                    className={
                                                        styles.suggestionItem
                                                    }
                                                    onClick={() =>
                                                        router.push(
                                                            `/view_profile/${profile.userId.username}`
                                                        )
                                                    }
                                                >
                                                    <div className="position-relative">
                                                        <img
                                                            src={
                                                                profile.userId
                                                                    .profilePicture
                                                            }
                                                            alt={
                                                                profile.userId
                                                                    .name
                                                            }
                                                            className={
                                                                styles.suggestionPic
                                                            }
                                                        />
                                                        {isUserOnline(
                                                            profile.userId._id,
                                                            profile.userId
                                                                .isOnline
                                                        ) && (
                                                            <span
                                                                className={
                                                                    styles.onlineDotSmall
                                                                }
                                                            ></span>
                                                        )}
                                                    </div>
                                                    <div className="flex-grow-1 min-width-0">
                                                        <h6
                                                            className={
                                                                styles.suggestionName
                                                            }
                                                        >
                                                            {
                                                                profile.userId
                                                                    .name
                                                            }
                                                        </h6>
                                                        <p
                                                            className={
                                                                styles.suggestionHandle
                                                            }
                                                        >
                                                            @
                                                            {
                                                                profile.userId
                                                                    .username
                                                            }
                                                        </p>
                                                    </div>
                                                    <button
                                                        className={
                                                            styles.plusBtn
                                                        }
                                                        onClick={(e) =>
                                                            handleConnect(
                                                                e,
                                                                profile.userId
                                                                    ._id
                                                            )
                                                        }
                                                    >
                                                        <svg
                                                            viewBox="0 0 24 24"
                                                            fill="currentColor"
                                                            width="16"
                                                            height="16"
                                                        >
                                                            <path d="M11 11V5h2v6h6v2h-6v6h-2v-6H5v-2h6z" />
                                                        </svg>
                                                    </button>
                                                </div>
                                            ))
                                        ) : (
                                            <p className="text-center p-3 text-muted small">
                                                No suggestions yet.
                                            </p>
                                        )
                                    ) : (
                                        <p className="text-center p-3 text-muted small">
                                            Loading...
                                        </p>
                                    )}
                                </div>
                                <div className="p-2 text-center border-top border-white border-opacity-10">
                                    <button
                                        className={styles.textLinkBtn}
                                        onClick={() => router.push("/discover")}
                                    >
                                        Browse All
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* RIGHT COLUMN: Feed */}
                    <div className="col-lg-8 col-12">
                        {/* Mobile Header */}
                        <div
                            className={`d-block d-lg-none mb-4 ${styles.mobileProfileSummary}`}
                        >
                            {authState.profileFetched && user && (
                                <div
                                    className="d-flex align-items-center gap-3"
                                    onClick={() => router.push("/profile")}
                                >
                                    <div className={styles.mobileAvatar}>
                                        <img
                                            src={user.profilePicture}
                                            alt="Me"
                                        />
                                    </div>
                                    <div>
                                        <h4 className={styles.mobileName}>
                                            Welcome, {user.name.split(" ")[0]}
                                        </h4>
                                        <p className={styles.mobileStatus}>
                                            Network: {networkCount}
                                        </p>
                                    </div>
                                </div>
                            )}
                        </div>

                        {children}
                    </div>
                </div>
            </div>
        </div>
    );
}
