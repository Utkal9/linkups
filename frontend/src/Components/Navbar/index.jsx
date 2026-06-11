// frontend/src/Components/Navbar/index.jsx
import React, { useState, useEffect, useRef } from "react";
import styles from "./styles.module.css";
import { useRouter } from "next/router";
import { useDispatch, useSelector } from "react-redux";
import { reset, setTokenIsThere } from "@/config/redux/reducer/authReducer";
import { getAboutUser } from "@/config/redux/action/authAction";
import { motion, AnimatePresence } from "framer-motion";
import { useSocket } from "@/context/SocketContext";
import { useTheme } from "@/context/ThemeContext";
import { FileText } from "lucide-react"; // Import icon

// --- SVG Icons ---
const HomeIcon = ({ isActive }) => (
    <svg
        xmlns="http://www.w3.org/2000/svg"
        fill={isActive ? "currentColor" : "none"}
        viewBox="0 0 24 24"
        strokeWidth={2}
        stroke="currentColor"
        className={styles.navIcon}
    >
        <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="m2.25 12 8.955-8.955a1.125 1.125 0 0 1 1.59 0L21.75 12M4.5 9.75v10.125c0 .621.504 1.125 1.125 1.125H9.75v-4.875c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125V21h4.125c.621 0 1.125-.504 1.125-1.125V9.75M8.25 21h8.25"
        />
    </svg>
);
const NetworkIcon = ({ isActive }) => (
    <svg
        xmlns="http://www.w3.org/2000/svg"
        fill={isActive ? "currentColor" : "none"}
        viewBox="0 0 24 24"
        strokeWidth={2}
        stroke="currentColor"
        className={styles.navIcon}
    >
        <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M18 18.72a9.094 9.094 0 0 0 3.741-.479 3 3 0 0 0-4.682-2.72m.244-3.07a3 3 0 0 0-4.681-2.72-3 3 0 0 0-4.682 2.72m.244 3.07a9.094 9.094 0 0 1-3.741-.479 3 3 0 0 1 4.682-2.72m-.244-3.07a3 3 0 0 1 4.681 2.72-3 3 0 0 1 4.682-2.72m-.244 3.07m-12.48-3.07a3 3 0 0 0-4.682 2.72 3 3 0 0 0 4.682-2.72M3 13.5a3 3 0 0 1 6 0m6 0a3 3 0 0 1 6 0m-6 0a3 3 0 0 0-6 0m6 0a3 3 0 0 0 6 0"
        />
    </svg>
);
const DiscoverIcon = ({ isActive }) => (
    <svg
        xmlns="http://www.w3.org/2000/svg"
        fill={isActive ? "currentColor" : "none"}
        viewBox="0 0 24 24"
        strokeWidth={2}
        stroke="currentColor"
        className={styles.navIcon}
    >
        <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="m21 21-5.197-5.197m0 0A7.5 7.5 0 1 0 5.196 5.196a7.5 7.5 0 0 0 10.607 10.607Z"
        />
    </svg>
);
const MeetIcon = ({ isActive }) => (
    <svg
        xmlns="http://www.w3.org/2000/svg"
        fill={isActive ? "currentColor" : "none"}
        viewBox="0 0 24 24"
        strokeWidth={2}
        stroke="currentColor"
        className={styles.navIcon}
    >
        <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="m15.75 10.5 4.72-4.72a.75.75 0 0 1 1.28.53v11.38a.75.75 0 0 1-1.28.53l-4.72-4.72M4.5 18.75h9a2.25 2.25 0 0 0 2.25-2.25v-9A2.25 2.25 0 0 0 13.5 5.25h-9A2.25 2.25 0 0 0 2.25 7.5v9A2.25 2.25 0 0 0 4.5 18.75Z"
        />
    </svg>
);
const MessagingIcon = ({ isActive }) => (
    <svg
        xmlns="http://www.w3.org/2000/svg"
        fill={isActive ? "currentColor" : "none"}
        viewBox="0 0 24 24"
        strokeWidth={2}
        stroke="currentColor"
        className={styles.navIcon}
    >
        <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M8.625 12a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Zm0 0H8.25m4.125 0a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Zm0 0H12m4.125 0a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Zm0 0h-.375M21 12c0 4.556-4.03 8.25-9 8.25a9.764 9.764 0 0 1-2.555-.337A5.972 5.972 0 0 1 5.41 20.97a5.969 5.969 0 0 1-.474-.065 4.48 4.48 0 0 0 .978-2.025c.09-.457-.133-.901-.467-1.226C3.93 16.178 3 14.189 3 12c0-4.556 4.03-8.25 9-8.25s9 3.694 9 8.25Z"
        />
    </svg>
);
// New Bell Icon
const BellIcon = ({ isActive }) => (
    <svg
        xmlns="http://www.w3.org/2000/svg"
        fill={isActive ? "currentColor" : "none"}
        viewBox="0 0 24 24"
        strokeWidth={2}
        stroke="currentColor"
        className={styles.navIcon}
    >
        <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M14.857 17.082a23.848 23.848 0 0 0 5.454-1.31A8.967 8.967 0 0 1 18 9.75V9A6 6 0 0 0 6 9v.75a8.967 8.967 0 0 1-2.312 6.022c1.733.64 3.56 1.085 5.455 1.31m5.714 0a24.255 24.255 0 0 1-5.714 0m5.714 0a3 3 0 1 1-5.714 0"
        />
    </svg>
);

// --- Theme & Menu Icons ---
const SunIcon = () => (
    <svg
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth={2}
        width="18"
    >
        <circle cx="12" cy="12" r="5" />
        <path d="M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42" />
    </svg>
);
const MoonIcon = () => (
    <svg
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth={2}
        width="18"
    >
        <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
    </svg>
);
const UserIcon = () => (
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
            d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z"
        />
    </svg>
);
const LogoutIcon = () => (
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
            d="M15.75 9V5.25A2.25 2.25 0 0013.5 3h-6a2.25 2.25 0 00-2.25 2.25v13.5A2.25 2.25 0 007.5 21h6a2.25 2.25 0 002.25-2.25V15M12 9l-3 3m0 0l3 3m-3-3h12.75"
        />
    </svg>
);

const LogoIcon = () => (
    <div className={styles.holoLogo}>
        <span>Link</span>Ups
    </div>
);

export default function NavbarComponent() {
    const router = useRouter();
    const dispatch = useDispatch();
    const authState = useSelector((state) => state.auth);
    const notificationState = useSelector((state) => state.notification);
    const {
        socket,
        onlineStatuses,
        unreadCount: chatUnreadCount,
    } = useSocket() || {};
    const { theme, toggleTheme, mounted } = useTheme();

    const [dropdownOpen, setDropdownOpen] = useState(false);
    const [hasMounted, setHasMounted] = useState(false);
    const [isTokenFound, setIsTokenFound] = useState(false);

    // Combined unread count logic
    const notifUnreadCount = notificationState?.unreadCount || 0;

    useEffect(() => {
        setHasMounted(true);
    }, []);

    useEffect(() => {
        const token = localStorage.getItem("token");
        if (token) {
            setIsTokenFound(true);
            dispatch(setTokenIsThere());
            if (!authState.profileFetched) {
                dispatch(getAboutUser({ token }));
            }
        } else {
            setIsTokenFound(false);
        }
    }, [dispatch, authState.profileFetched]);

    const dropdownRef = useRef(null);
    useEffect(() => {
        function handleClickOutside(event) {
            if (
                dropdownRef.current &&
                !dropdownRef.current.contains(event.target)
            ) {
                setDropdownOpen(false);
            }
        }
        document.addEventListener("mousedown", handleClickOutside);
        return () =>
            document.removeEventListener("mousedown", handleClickOutside);
    }, [dropdownRef]);

    const handleLogout = () => {
        if (socket) socket.disconnect();
        localStorage.removeItem("token");
        localStorage.removeItem("tokenTimestamp");
        setIsTokenFound(false);
        dispatch(reset());
        setDropdownOpen(false);
        router.push("/login");
    };

    const handleNavigation = (path) => {
        router.push(path);
        setDropdownOpen(false);
    };

    const userName = authState.user?.userId?.name;
    const userFallback = userName ? userName.charAt(0).toUpperCase() : "?";
    const myId = authState.user?.userId?._id;
    const isMyOnline = myId
        ? ((onlineStatuses && onlineStatuses[myId]?.isOnline) ??
          authState.user?.userId?.isOnline ??
          true)
        : false;

    const navItems = [
        { path: "/dashboard", icon: HomeIcon, label: "Feed", protected: true },
        {
            path: "/my_connections",
            icon: NetworkIcon,
            label: "Network",
            protected: true,
        },
        {
            path: "/discover",
            icon: DiscoverIcon,
            label: "Discover",
            protected: false,
        },
        {
            path: "/resume-builder",
            icon: ({ isActive }) => (
                <FileText
                    size={24}
                    color={isActive ? "currentColor" : "currentColor"}
                />
            ),
            label: "Resume",
            protected: true,
        },
        { path: "/meet", icon: MeetIcon, label: "Meet", protected: false },
        {
            path: "/messaging",
            icon: MessagingIcon,
            label: "Chat",
            protected: true,
            hasBadge: true,
            count: chatUnreadCount,
        },
        {
            path: "/notifications",
            icon: BellIcon,
            label: "Notifications",
            protected: true,
            hasBadge: true,
            count: notifUnreadCount,
        },
    ];

    // Profile Dropdown Content - Reusable
    const ProfileDropdownMenu = () => (
        <motion.div
            className={styles.dropdownContent}
            initial={{ opacity: 0, y: 10, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 10, scale: 0.95 }}
        >
            {isTokenFound && authState.user ? (
                <>
                    <div className={styles.dropdownHeader}>
                        <p className={styles.userName}>
                            {authState.user.userId.name}
                        </p>
                        <p className={styles.userHandle}>
                            @{authState.user.userId.username}
                        </p>
                    </div>
                    <div className={styles.dropdownBody}>
                        <button onClick={() => handleNavigation("/profile")}>
                            <span>View Profile</span>
                            <UserIcon />
                        </button>
                        <button onClick={toggleTheme}>
                            <span>Theme</span>
                            {mounted &&
                                (theme === "dark" ? <SunIcon /> : <MoonIcon />)}
                        </button>
                        <button
                            onClick={handleLogout}
                            className={styles.logoutBtn}
                        >
                            <span>Disconnect</span>
                            <LogoutIcon />
                        </button>
                    </div>
                </>
            ) : (
                <>
                    <div className={styles.dropdownHeader}>
                        <p className={styles.userName}>Guest</p>
                        <p className={styles.userHandle}>Welcome!</p>
                    </div>
                    <div className={styles.dropdownBody}>
                        <button onClick={toggleTheme}>
                            <span>Theme</span>
                            {mounted &&
                                (theme === "dark" ? <SunIcon /> : <MoonIcon />)}
                        </button>
                        <button onClick={() => handleNavigation("/login")}>
                            <span>Login / Sign Up</span>
                            <UserIcon />
                        </button>
                    </div>
                </>
            )}
        </motion.div>
    );

    // Profile Picture Component
    const ProfileTrigger = () => (
        <div className={styles.avatarContainer}>
            {authState.user?.userId?.profilePicture ? (
                <img
                    src={authState.user.userId.profilePicture}
                    alt="Profile"
                    className={styles.profilePic}
                />
            ) : (
                <div
                    className={`${styles.profilePic} ${styles.profileFallback}`}
                >
                    {userFallback}
                </div>
            )}
            {isMyOnline && isTokenFound && (
                <span className={styles.onlineDot}></span>
            )}
        </div>
    );

    if (!hasMounted) return <nav className={styles.container} />;

    return (
        <>
            {/* --- TOP NAV (DESKTOP & MOBILE) --- */}
            <nav className={styles.container}>
                <div className={styles.navbar}>
                    {/* 1. MOBILE TOP HEADER */}
                    <div className={styles.mobileHeader}>
                        {/* Left: Profile Dropdown (ALWAYS VISIBLE) */}
                        <div
                            className={styles.mobileProfileWrapper}
                            ref={dropdownRef}
                        >
                            <div onClick={() => setDropdownOpen(!dropdownOpen)}>
                                <ProfileTrigger />
                            </div>
                            <AnimatePresence>
                                {dropdownOpen && <ProfileDropdownMenu />}
                            </AnimatePresence>
                        </div>

                        {/* Center: Logo */}
                        <div
                            className={styles.mobileLogo}
                            onClick={() => handleNavigation("/")}
                        >
                            <LogoIcon />
                        </div>

                        {/* Right: Icons (Chat + Notification) - Only if Logged In */}
                        <div className={styles.mobileRightIcons}>
                            {isTokenFound && (
                                <>
                                    {/* Messaging Icon */}
                                    <div
                                        className={styles.mobileNotif}
                                        onClick={() =>
                                            handleNavigation("/messaging")
                                        }
                                    >
                                        <div className={styles.iconGlow}>
                                            <MessagingIcon
                                                isActive={
                                                    router.pathname ===
                                                    "/messaging"
                                                }
                                            />
                                            {chatUnreadCount > 0 && (
                                                <span className={styles.badge}>
                                                    {chatUnreadCount > 99
                                                        ? "99+"
                                                        : chatUnreadCount}
                                                </span>
                                            )}
                                        </div>
                                    </div>

                                    {/* Notification Icon */}
                                    <div
                                        className={styles.mobileNotif}
                                        onClick={() =>
                                            handleNavigation("/notifications")
                                        }
                                    >
                                        <div className={styles.iconGlow}>
                                            <BellIcon
                                                isActive={
                                                    router.pathname ===
                                                    "/notifications"
                                                }
                                            />
                                            {notifUnreadCount > 0 && (
                                                <span className={styles.badge}>
                                                    {notifUnreadCount > 99
                                                        ? "99+"
                                                        : notifUnreadCount}
                                                </span>
                                            )}
                                        </div>
                                    </div>
                                </>
                            )}
                        </div>
                    </div>

                    {/* 2. DESKTOP LAYOUT (Unchanged) */}
                    <div
                        className={`${styles.desktopNavLeft} ${styles.desktopOnly}`}
                        onClick={() => handleNavigation("/")}
                    >
                        <LogoIcon />
                    </div>

                    <div
                        className={`${styles.navCenter} ${styles.desktopOnly}`}
                    >
                        {isTokenFound &&
                            navItems.map((item) => (
                                <div
                                    key={item.path}
                                    className={`${styles.navLink} ${
                                        router.pathname === item.path
                                            ? styles.active
                                            : ""
                                    }`}
                                    onClick={() => handleNavigation(item.path)}
                                >
                                    <div className={styles.iconGlow}>
                                        <item.icon
                                            isActive={
                                                router.pathname === item.path
                                            }
                                        />
                                    </div>
                                    {item.hasBadge && item.count > 0 && (
                                        <span className={styles.badge}>
                                            {item.count > 99
                                                ? "99+"
                                                : item.count}
                                        </span>
                                    )}
                                    <span className={styles.navLabel}>
                                        {item.label}
                                    </span>
                                    {router.pathname === item.path && (
                                        <div className={styles.activeBar} />
                                    )}
                                </div>
                            ))}
                    </div>

                    <div className={`${styles.navRight} ${styles.desktopOnly}`}>
                        {authState.profileFetched &&
                        authState.user &&
                        isTokenFound ? (
                            <div
                                className={styles.profileMenu}
                                ref={dropdownRef}
                            >
                                <button
                                    onClick={() =>
                                        setDropdownOpen(!dropdownOpen)
                                    }
                                    className={styles.profileButton}
                                >
                                    <ProfileTrigger />
                                </button>
                                <AnimatePresence>
                                    {dropdownOpen && <ProfileDropdownMenu />}
                                </AnimatePresence>
                            </div>
                        ) : (
                            <div style={{ display: "flex", gap: "12px" }}>
                                <button
                                    onClick={() => handleNavigation("/login")}
                                    className={styles.buttonJoin}
                                >
                                    Login
                                </button>
                                <button
                                    // --- FIX: Pass view query param to open Sign Up ---
                                    onClick={() =>
                                        handleNavigation("/login?view=register")
                                    }
                                    className={styles.buttonJoin}
                                >
                                    Sign Up
                                </button>
                            </div>
                        )}
                    </div>
                </div>
            </nav>

            {/* --- BOTTOM NAV (Mobile Only) --- */}
            {isTokenFound && (
                <div className={styles.bottomNav}>
                    {navItems
                        .filter(
                            (item) =>
                                item.path !== "/notifications" &&
                                item.path !== "/messaging",
                        )
                        .map((item) => (
                            <div
                                key={item.path}
                                className={`${styles.bottomNavItem} ${
                                    router.pathname === item.path
                                        ? styles.bottomNavActive
                                        : ""
                                }`}
                                onClick={() => handleNavigation(item.path)}
                            >
                                <div style={{ position: "relative" }}>
                                    <item.icon
                                        isActive={router.pathname === item.path}
                                    />
                                    {item.hasBadge && item.count > 0 && (
                                        <span
                                            className={styles.badge}
                                            style={{
                                                top: "-5px",
                                                right: "-10px",
                                            }}
                                        >
                                            {item.count > 99
                                                ? "99+"
                                                : item.count}
                                        </span>
                                    )}
                                </div>
                                <span className={styles.bottomNavLabel}>
                                    {item.label}
                                </span>
                            </div>
                        ))}
                </div>
            )}
        </>
    );
}
