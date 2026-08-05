// frontend/src/context/SocketContext.jsx
import React, {
    createContext,
    useContext,
    useEffect,
    useState,
    useRef,
} from "react";
import { io } from "socket.io-client";
import { useSelector, useDispatch } from "react-redux";
import clientServer from "@/config"; // Import API client
import { addNewNotification, markRead } from "@/config/redux/reducer/notificationReducer"; // Import actions

const SocketContext = createContext(null);

export const useSocket = () => {
    return useContext(SocketContext);
};

// --- Incoming Call Modal (Kept as is) ---
const IncomingCallHandler = ({ socket }) => {
    const [call, setCall] = useState(null);

    useEffect(() => {
        if (!socket) return;
        socket.on("incoming-call", ({ fromUser, roomUrl }) => {
            setCall({ fromUser, roomUrl });
        });
        return () => {
            socket.off("incoming-call");
        };
    }, [socket]);

    const joinCall = () => {
        window.open(call.roomUrl, "_blank");
        setCall(null);
    };

    const declineCall = () => {
        setCall(null);
    };

    if (!call) return null;

    return (
        <div style={styles.modalOverlay}>
            <div style={styles.holoCard}>
                <div style={styles.avatarWrapper}>
                    <img
                        src={call.fromUser.profilePicture}
                        alt="caller"
                        style={styles.profilePic}
                    />
                    <div style={styles.pulseRing}></div>
                </div>
                <h3 style={styles.callerName}>{call.fromUser.name}</h3>
                <p style={styles.callStatus}>Incoming Secure Transmission...</p>

                <div style={styles.buttonGroup}>
                    <button onClick={declineCall} style={styles.declineButton}>
                        Decline
                    </button>
                    <button onClick={joinCall} style={styles.acceptButton}>
                        Accept Uplink
                    </button>
                </div>
            </div>
        </div>
    );
};

export const SocketProvider = ({ children }) => {
    const [socket, setSocket] = useState(null);
    const [onlineStatuses, setOnlineStatuses] = useState({});
    const [unreadCount, setUnreadCount] = useState(0); // --- NEW STATE ---
    const auth = useSelector((state) => state.auth);
    const socketInstance = useRef(null);
    const dispatch = useDispatch();

    // --- NEW: Function to fetch initial count ---
    const fetchUnreadCount = async () => {
        const token = localStorage.getItem("token");
        if (token) {
            try {
                const res = await clientServer.get("/messages/unread_count", {
                    params: { token },
                });
                setUnreadCount(res.data.count);
            } catch (err) {
                console.error("Failed to fetch unread count", err);
            }
        }
    };

    useEffect(() => {
        if (socketInstance.current) return;

        const newSocket = io(
            process.env.NEXT_PUBLIC_API_URL || "http://localhost:9090",
            {
                transports: ["polling", "websocket"],
                autoConnect: false,
            }
        );

        socketInstance.current = newSocket;
        setSocket(newSocket);
        newSocket.connect();

        newSocket.on("connect", () => {
            if (auth.user?.userId?._id) {
                newSocket.emit("register-user", auth.user.userId._id);
            }
        });

        newSocket.on("user-status-change", ({ userId, isOnline, lastSeen }) => {
            setOnlineStatuses((prev) => ({
                ...prev,
                [userId]: { isOnline, lastSeen },
            }));
        });

        // --- NEW: Listen for messages to increment count ---
        newSocket.on("receive-chat-message", () => {
            // We verify if the user is NOT on the specific chat page in the page component
            // But globally, we can just increment.
            // The Messaging page will correct it if it's open.
            setUnreadCount((prev) => prev + 1);
        });
        newSocket.on("new_notification", (notificationData) => {
            dispatch(addNewNotification(notificationData));
        });
        // Multi-tab sync: when this user marks a notif read on another tab/device
        newSocket.on("notification_read", ({ notificationId }) => {
            dispatch(markRead(notificationId));
        });

        return () => {
            newSocket.disconnect();
            socketInstance.current = null;
        };
    }, []);

    useEffect(() => {
        if (socket && auth.user?.userId?._id) {
            if (!socket.connected) {
                socket.connect();
            }
            socket.emit("register-user", auth.user.userId._id);
            fetchUnreadCount(); // Fetch count on auth load
        }
    }, [socket, auth.user]);

    return (
        <SocketContext.Provider
            value={{
                socket,
                onlineStatuses,
                setOnlineStatuses,
                unreadCount, // Export
                setUnreadCount, // Export
                fetchUnreadCount, // Export
            }}
        >
            <IncomingCallHandler socket={socket} />
            {children}
        </SocketContext.Provider>
    );
};

const styles = {
    modalOverlay: {
        position: "fixed",
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: "rgba(0, 0, 0, 0.85)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 9999,
        backdropFilter: "blur(8px)",
        animation: "fadeIn 0.3s ease-out",
    },
    holoCard: {
        backgroundColor: "#0b0f2a",
        border: "1px solid rgba(139, 92, 246, 0.5)",
        padding: "30px",
        borderRadius: "20px",
        boxShadow: "0 0 60px rgba(139, 92, 246, 0.4)",
        textAlign: "center",
        width: "320px",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        position: "relative",
        overflow: "hidden",
    },
    avatarWrapper: {
        position: "relative",
        marginBottom: "20px",
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
    },
    profilePic: {
        width: "100px",
        height: "100px",
        borderRadius: "50%",
        objectFit: "cover",
        border: "3px solid #0fffc6",
        zIndex: 2,
        background: "#000",
    },
    pulseRing: {
        position: "absolute",
        width: "100%",
        height: "100%",
        borderRadius: "50%",
        border: "2px solid #0fffc6",
        animation: "pulseRing 2s infinite",
        opacity: 0.5,
        zIndex: 1,
    },
    callerName: {
        margin: "0 0 5px 0",
        color: "#fff",
        fontFamily: "'Orbitron', sans-serif",
        fontSize: "1.2rem",
        fontWeight: "600",
        letterSpacing: "1px",
    },
    callStatus: {
        margin: "0 0 25px 0",
        color: "#0fffc6",
        fontSize: "0.9rem",
        fontFamily: "monospace",
        animation: "blink 1.5s infinite",
    },
    buttonGroup: {
        display: "flex",
        gap: "15px",
        width: "100%",
    },
    acceptButton: {
        flex: 1,
        background: "linear-gradient(135deg, #0fffc6, #059669)",
        color: "#000",
        border: "none",
        padding: "12px",
        borderRadius: "30px",
        cursor: "pointer",
        fontSize: "0.95rem",
        fontWeight: "700",
        boxShadow: "0 0 15px rgba(15, 255, 198, 0.4)",
        transition: "transform 0.2s",
    },
    declineButton: {
        flex: 1,
        background: "transparent",
        color: "#ff4d7d",
        border: "1px solid #ff4d7d",
        padding: "12px",
        borderRadius: "30px",
        cursor: "pointer",
        fontSize: "0.95rem",
        fontWeight: "600",
        transition: "background 0.2s",
    },
};

if (typeof document !== "undefined") {
    const styleSheet = document.createElement("style");
    styleSheet.textContent = `
        @keyframes pulseRing {
            0% { transform: scale(1); opacity: 0.8; }
            100% { transform: scale(1.6); opacity: 0; }
        }
        @keyframes blink {
            0%, 100% { opacity: 1; }
            50% { opacity: 0.5; }
        }
        @keyframes fadeIn {
            from { opacity: 0; transform: scale(0.9); }
            to { opacity: 1; transform: scale(1); }
        }
    `;
    document.head.appendChild(styleSheet);
}
