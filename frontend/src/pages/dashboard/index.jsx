// frontend/src/pages/dashboard/index.jsx
import { getAboutUser, getAllUsers } from "@/config/redux/action/authAction";
import Loader from "@/Components/Loader";
import {
    createPost,
    deletePost,
    updatePost,
    getAllComments,
    getAllPosts,
    toggleLike,
    postComment,
    toggleCommentLike,
} from "@/config/redux/action/postAction";
import DashboardLayout from "@/layout/DashboardLayout";
import UserLayout from "@/layout/UserLayout";
import { useRouter } from "next/router";
import React, { useEffect, useState, useRef, useMemo } from "react";
import { useDispatch, useSelector } from "react-redux";
import styles from "./index.module.css";
import { resetPostId } from "@/config/redux/reducer/postReducer";
import { useSocket } from "@/context/SocketContext";

const MAX_CHAR_COUNT = 3000;

// --- Helpers ---
function getTimeAgo(dateString) {
    if (!dateString) return "";
    const date = new Date(dateString);
    const now = new Date();
    const diffInSeconds = Math.max(0, Math.floor((now - date) / 1000));
    if (diffInSeconds < 60) return "Just now";
    const diffInMinutes = Math.floor(diffInSeconds / 60);
    if (diffInMinutes < 60) return `${diffInMinutes}m`;
    const diffInHours = Math.floor(diffInMinutes / 60);
    if (diffInHours < 24) return `${diffInHours}h`;
    const diffInDays = Math.floor(diffInHours / 24);
    if (diffInDays < 7) return `${diffInDays}d`;
    return `${Math.floor(diffInDays / 7)}w`;
}

const isVideo = (fileType, fileNameOrUrl) => {
    if (fileType && fileType.startsWith("video/")) return true;
    if (fileNameOrUrl) {
        const cleanStr = fileNameOrUrl.split("?")[0].split("#")[0];
        const ext = cleanStr.split(".").pop().toLowerCase();
        return ["mp4", "webm", "ogg", "mov", "avi", "mkv"].includes(ext);
    }
    return false;
};

// --- LINK SHORTENER HELPER (Theme Engine) ---
const generateShortCode = (str) => {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
        hash = (hash << 5) - hash + str.charCodeAt(i);
        hash |= 0;
    }
    return Math.abs(hash).toString(36).substring(0, 8); // Deterministic short code
};

const renderPostBody = (text) => {
    if (!text) return null;

    // Regex to find URLs (http/https)
    const urlRegex = /(https?:\/\/[^\s]+)/g;

    return text.split(urlRegex).map((part, index) => {
        if (part.match(urlRegex)) {
            const shortCode = generateShortCode(part);
            const shortUrlDisplay = `https://lnk.up/${shortCode}`;

            return (
                <a
                    key={index}
                    href={part}
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={(e) => e.stopPropagation()}
                    style={{
                        color: "var(--neon-blue)",
                        fontWeight: "500",
                        textDecoration: "none",
                        backgroundColor: "rgba(59, 130, 246, 0.1)",
                        padding: "0px 4px",
                        borderRadius: "4px",
                        transition: "all 0.2s ease",
                        cursor: "pointer",
                        borderBottom: "1px solid transparent",
                    }}
                    onMouseOver={(e) => {
                        e.currentTarget.style.color = "var(--neon-violet)";
                        e.currentTarget.style.borderBottom =
                            "1px solid var(--neon-violet)";
                        e.currentTarget.style.backgroundColor =
                            "rgba(79, 70, 229, 0.08)";
                    }}
                    onMouseOut={(e) => {
                        e.currentTarget.style.color = "var(--neon-blue)";
                        e.currentTarget.style.borderBottom =
                            "1px solid transparent";
                        e.currentTarget.style.backgroundColor =
                            "rgba(59, 130, 246, 0.1)";
                    }}
                    title={part} // Show full URL on hover
                >
                    {shortUrlDisplay}
                </a>
            );
        }
        return part;
    });
};

const getReactionIcon = (type) => {
    const map = {
        Like: "👍",
        Love: "❤️",
        Celebrate: "👏",
        Insightful: "💡",
        Funny: "😂",
    };
    return map[type] || "👍";
};

const getReactionColor = (type) => {
    const map = {
        Love: "#E74C3C",
        Celebrate: "#27AE60",
        Insightful: "#F1C40F",
        Funny: "#E67E22",
    };
    return map[type] || "var(--neon-violet)"; /* Was #0fffc6 neon-teal — brand unified */
};

// --- ICONS ---
const MoreHorizIcon = () => (
    <svg viewBox="0 0 24 24" fill="currentColor" width="24">
        <path
            fillRule="evenodd"
            d="M4.5 12a1.5 1.5 0 1 1 3 0 1.5 1.5 0 0 1-3 0Zm6 0a1.5 1.5 0 1 1 3 0 1.5 1.5 0 0 1-3 0Zm6 0a1.5 1.5 0 1 1 3 0 1.5 1.5 0 0 1-3 0Z"
            clipRule="evenodd"
        />
    </svg>
);
const ImageIcon = () => (
    <svg
        viewBox="0 0 24 24"
        fill="currentColor"
        style={{ color: "currentColor" }} /* Was #0fffc6 hardcoded neon-teal */
        width="22"
    >
        <path d="M19 4H5C3.9 4 3 4.9 3 6v12c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zm0 14H5V6h14v12zm-5-7c0-1.66-1.34-3-3-3s-3 1.34-3 3 1.34 3 3 3 3-1.34 3-3z" />
    </svg>
);
const CommentIcon = () => (
    <svg
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth={1.5}
        width="20"
    >
        <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M12 20.25c4.97 0 9-3.633 9-8.437 0-4.805-4.03-8.437-9-8.437-4.97 0-9 3.632-9 8.437 0 2.093.79 4.02 2.128 5.516.29.325.395.774.27 1.193l-.847 2.935c-.168.583.486 1.07.988.782l3.348-1.91c.355-.203.772-.24 1.158-.102.642.228 1.32.352 2.02.352Z"
        />
    </svg>
);
const ShareIcon = () => (
    <svg
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth={1.5}
        width="20"
    >
        <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M7.217 10.907a2.25 2.25 0 1 0 0 2.186m0-2.186c.18.324.283.696.283 1.093s-.103.77-.283 1.093m0-2.186 9.566-5.314m-9.566 7.5 9.566 5.314m0 0a2.25 2.25 0 1 0 3.935 2.186 2.25 2.25 0 0 0-3.935-2.186Zm0-12.814a2.25 2.25 0 1 0 3.933-2.185 2.25 2.25 0 0 0-3.933 2.185Z"
        />
    </svg>
);
const DeleteIcon = () => (
    <svg
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth={1.5}
        width="18"
    >
        <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="m14.74 9-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 0 1-2.244 2.077H8.084a2.25 2.25 0 0 1-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 0 0-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 0 1 3.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 0 0-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 0 0-7.5 0"
        />
    </svg>
);
const EditIcon = () => (
    <svg
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth={1.5}
        width="18"
    >
        <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="m16.862 4.487 1.687-1.688a1.875 1.875 0 1 1 2.652 2.652L10.582 16.07a4.5 4.5 0 0 1-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 0 1 1.13-1.897l8.932-8.931Zm0 0L19.5 7.125M18 14v4.75A2.25 2.25 0 0 1 15.75 21H5.25A2.25 2.25 0 0 1 3 18.75V8.25A2.25 2.25 0 0 1 5.25 6H10"
        />
    </svg>
);
const LikeIconOutline = () => (
    <svg
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth={1.5}
        width="20"
    >
        <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M6.633 10.5c.806 0 1.533-.446 2.031-1.08a9.041 9.041 0 012.861-2.4c.723-.384 1.35-.956 1.653-1.715a4.498 4.498 0 00.322-1.672V3a.75.75 0 01.75-.75A2.25 2.25 0 0116.5 4.5c0 1.152-.26 2.243-.723 3.218-.266.558.107 1.282.725 1.282h3.126c1.026 0 1.945.694 2.054 1.715.045.422.068.85.068 1.285a11.95 11.95 0 01-2.649 7.521c-.388.482-.987.729-1.605.729H13.48c-.483 0-.964-.078-1.423-.23l-3.114-1.04a4.501 4.501 0 00-1.423-.23H5.904M14.25 9h2.25M5.904 18.75c.083.205.173.405.27.602.197.4-.078.898-.523.898h-.908c-.889 0-1.713-.518-1.972-1.368a12 12 0 01-.521-3.507c0-1.553.295-3.036.831-4.398C3.387 10.203 4.167 9.75 5 9.75h1.053c.472 0 .745.556.5.96a8.958 8.958 0 00-1.302 4.665c0 1.194.232 2.333.654 3.375z"
        />
    </svg>
);
const CloseIcon = () => (
    <svg
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth={2}
        width="20"
    >
        <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M6 18L18 6M6 6l12 12"
        />
    </svg>
);
// --- Status Icons ---
const CheckCircleIcon = () => (
    <svg viewBox="0 0 24 24" fill="currentColor" width="20">
        <path
            fillRule="evenodd"
            d="M2.25 12c0-5.385 4.365-9.75 9.75-9.75s9.75 4.365 9.75 9.75-4.365 9.75-9.75 9.75S2.25 17.385 2.25 12Zm13.36-1.814a.75.75 0 1 0-1.22-.872l-3.236 4.53L9.53 12.22a.75.75 0 0 0-1.06 1.06l2.25 2.25a.75.75 0 0 0 1.14-.094l3.75-5.25Z"
            clipRule="evenodd"
        />
    </svg>
);
const ErrorIcon = () => (
    <svg viewBox="0 0 24 24" fill="currentColor" width="20">
        <path
            fillRule="evenodd"
            d="M12 2.25c-5.385 0-9.75 4.365-9.75 9.75s4.365 9.75 9.75 9.75-4.365 9.75-9.75S17.385 2.25 12 2.25Zm-1.72 6.97a.75.75 0 1 0-1.06 1.06L10.94 12l-1.72 1.72a.75.75 0 1 0 1.06 1.06L12 13.06l1.72 1.72a.75.75 0 1 0 1.06-1.06L13.06 12l1.72-1.72a.75.75 0 1 0-1.06-1.06L12 10.94l-1.72-1.72Z"
            clipRule="evenodd"
        />
    </svg>
);

export default function Dashboard() {
    const router = useRouter();
    const dispatch = useDispatch();
    const authState = useSelector((state) => state.auth);
    const postState = useSelector((state) => state.postReducer);
    const { onlineStatuses } = useSocket() || {};

    // Filter State
    const { username: filterUsername } = router.query;

    const [postError, setPostError] = useState("");
    const [postContent, setPostContent] = useState("");
    const [fileContent, setFileContent] = useState(null);
    const [filePreview, setFilePreview] = useState(null);
    const [commentText, setCommentText] = useState("");

    // Editing
    const [openMenuId, setOpenMenuId] = useState(null);
    const [editingPost, setEditingPost] = useState(null);
    const [editBody, setEditBody] = useState("");
    const [editFile, setEditFile] = useState(null);
    const [editFilePreview, setEditFilePreview] = useState(null);

    // Reactions Logic
    const [showReactionListModal, setShowReactionListModal] = useState(false);
    const [currentReactionList, setCurrentReactionList] = useState([]);
    const [activeReactionId, setActiveReactionId] = useState(null); // Track open reaction dock

    // Notification & Confirmation
    const [notification, setNotification] = useState(null);
    const [deleteTargetId, setDeleteTargetId] = useState(null);

    // Timer ref for hover delay
    const reactionTimeoutRef = useRef(null);

    const commentInputRef = useRef(null);

    const [page, setPage] = useState(1);
    const loaderRef = useRef(null);

    useEffect(() => {
        if (authState.isTokenThere) {
            dispatch(getAllPosts(1)); // Initial load
            dispatch(getAboutUser({ token: localStorage.getItem("token") }));
        }
        if (!authState.all_profiles_fetched) {
            dispatch(getAllUsers());
        }
        const closeMenu = () => {
            setOpenMenuId(null);
            setActiveReactionId(null);
        };
        document.addEventListener("click", closeMenu);
        return () => document.removeEventListener("click", closeMenu);
    }, [authState.isTokenThere, dispatch]);

    // IntersectionObserver for Infinite Scroll
    useEffect(() => {
        if (!loaderRef.current) return;
        
        const observer = new IntersectionObserver((entries) => {
            if (entries[0].isIntersecting && postState.hasMore && !postState.isLoading) {
                setPage((prevPage) => {
                    const nextPage = prevPage + 1;
                    dispatch(getAllPosts(nextPage));
                    return nextPage;
                });
            }
        }, {
            threshold: 0.1,
            rootMargin: "0px 0px -100px 0px", // only fire when 100px above bottom of viewport
        });

        observer.observe(loaderRef.current);
        return () => observer.disconnect();
    }, [postState.hasMore, postState.isLoading, dispatch]);

    // --- NOTIFICATION HELPER ---
    const showToast = (msg, type = "success") => {
        setNotification({ message: msg, type });
        setTimeout(() => setNotification(null), 3000);
    };

    // --- REACTION LOGIC START ---

    // Desktop: Hover IN
    const handleMouseEnter = (postId) => {
        if (window.matchMedia("(hover: hover)").matches) {
            // Clear any pending close action
            if (reactionTimeoutRef.current) {
                clearTimeout(reactionTimeoutRef.current);
                reactionTimeoutRef.current = null;
            }
            setActiveReactionId(postId);
        }
    };

    // Desktop: Hover OUT (With Delay)
    const handleMouseLeave = () => {
        if (window.matchMedia("(hover: hover)").matches) {
            // Add a small delay to allow bridging the gap
            reactionTimeoutRef.current = setTimeout(() => {
                setActiveReactionId(null);
            }, 500);
        }
    };

    // Mobile: Click Toggle
    const handleReactionToggle = (e, postId) => {
        e.stopPropagation();
        if (activeReactionId === postId) {
            setActiveReactionId(null);
        } else {
            setActiveReactionId(postId);
        }
    };

    // Handle Selecting a Reaction
    const handleReaction = (postId, type) => {
        const token = localStorage.getItem("token");
        dispatch(toggleLike({ post_id: postId, token, reactionType: type }));
        setActiveReactionId(null); // Close menu immediately after selection
    };
    // --- REACTION LOGIC END ---

    const handleFileChange = (e) => {
        const file = e.target.files[0];
        if (file && file.size > 10 * 1024 * 1024) {
            setPostError("File is too large. Max 10MB.");
            setFileContent(null);
            setFilePreview(null);
            e.target.value = null;
        } else if (file) {
            setFileContent(file);
            setFilePreview(URL.createObjectURL(file));
            setPostError("");
        } else {
            setFileContent(null);
            setFilePreview(null);
            setPostError("");
        }
    };

    const clearMedia = () => {
        setFileContent(null);
        setFilePreview(null);
        const fileInput = document.getElementById("fileUpload");
        if (fileInput) fileInput.value = "";
        setPostError("");
    };

    const handleUpload = async () => {
        if (!postContent.trim()) {
            setPostError(
                "Please write something. Media-only posts are not allowed."
            );
            return;
        }
        if (postContent.length > MAX_CHAR_COUNT) {
            setPostError(
                `Character limit exceeded. Max ${MAX_CHAR_COUNT} characters.`
            );
            return;
        }
        try {
            await dispatch(
                createPost({ file: fileContent, body: postContent })
            );
            setPostContent("");
            clearMedia();
            setPostError("");
            showToast("Post published", "success");
        } catch (error) {
            showToast("Failed to publish post", "error");
        }
    };

    const handleEditFileChange = (e) => {
        const file = e.target.files[0];
        if (file && file.size > 10 * 1024 * 1024) {
            alert("File is too large. Max 10MB.");
            setEditFile(null);
            setEditFilePreview(null);
            e.target.value = null;
        } else if (file) {
            setEditFile(file);
            setEditFilePreview(URL.createObjectURL(file));
        }
    };

    const handleUpdateSubmit = async () => {
        if (!editingPost) return;
        try {
            await dispatch(
                updatePost({
                    post_id: editingPost._id,
                    body: editBody,
                    file: editFile,
                })
            );
            setEditingPost(null);
            setEditBody("");
            setEditFile(null);
            setEditFilePreview(null);
            showToast("Post updated", "success");
        } catch (error) {
            showToast("Update Failed", "error");
        }
    };

    // --- NEW: Delete Confirmation Flow ---
    const handleDeleteClick = (postId) => {
        setDeleteTargetId(postId);
    };

    const confirmDelete = async () => {
        if (deleteTargetId) {
            try {
                await dispatch(deletePost({ post_id: deleteTargetId }));
                dispatch(getAllPosts());
                showToast("Post deleted", "success");
            } catch (error) {
                showToast("Delete Failed", "error");
            }
            setDeleteTargetId(null);
        }
    };

    const handlePostComment = async () => {
        if (!commentText.trim()) return;
        await dispatch(
            postComment({ post_id: postState.postId, body: commentText })
        );
        await dispatch(getAllComments({ post_id: postState.postId }));
        setCommentText("");
    };

    const handleLikeComment = (commentId) => {
        dispatch(
            toggleCommentLike({
                comment_id: commentId,
                token: localStorage.getItem("token"),
                post_id: postState.postId,
            })
        );
    };

    const handleReplyComment = (username) => {
        setCommentText(`@${username} `);
        commentInputRef.current?.focus();
    };

    const handleShare = (postBody) => {
        const text = encodeURIComponent(postBody);
        const url = encodeURIComponent("proconnect.com");
        const twitterUrl = `https://twitter.com/intent/tweet?text=${text}&url=${url}`;
        window.open(twitterUrl, "_blank");
    };

    const displayedPosts = useMemo(() => {
        if (filterUsername) {
            return postState.posts.filter(
                (p) => p.userId.username === filterUsername
            );
        }
        return postState.posts;
    }, [postState.posts, filterUsername]);

    const clearFilter = () => router.push("/dashboard");

    const isUserOnline = (uid) =>
        onlineStatuses && onlineStatuses[uid]?.isOnline;

    const handleShowReactionList = (reactions) => {
        setCurrentReactionList(reactions || []);
        setShowReactionListModal(true);
    };

    const getUserReaction = (post, userId) => {
        return post.reactions?.find(
            (r) => r.userId?._id === userId || r.userId === userId
        );
    };

    const getUniqueReactions = (reactions) => {
        if (!reactions) return [];
        const uniqueTypes = [...new Set(reactions.map((r) => r.type))];
        return uniqueTypes;
    };

    if (!authState.user)
        return <div className={styles.loading}>Loading...</div>;

    return (
        <div className={styles.feedContainer}>
            {/* --- TOAST NOTIFICATION --- */}
            {notification && (
                <div
                    className={`${styles.notificationToast} ${
                        styles[notification.type]
                    }`}
                >
                    {notification.type === "success" ? (
                        <CheckCircleIcon />
                    ) : (
                        <ErrorIcon />
                    )}
                    <span>{notification.message}</span>
                </div>
            )}

            {/* --- DELETE CONFIRMATION MODAL --- */}
            {deleteTargetId && (
                <div
                    className={styles.commentModalBackdrop}
                    onClick={() => setDeleteTargetId(null)}
                >
                    <div
                        className={styles.confirmModalContent}
                        onClick={(e) => e.stopPropagation()}
                    >
                        <h3 className={styles.confirmTitle}>
                            Confirm Deletion
                        </h3>
                        <p className={styles.confirmText}>
                            Are you sure you want to delete this post?
                            This action cannot be undone.
                        </p>
                        <div className={styles.confirmButtons}>
                            <button
                                className={styles.cancelButton}
                                onClick={() => setDeleteTargetId(null)}
                            >
                                Cancel
                            </button>
                            <button
                                className={styles.deleteConfirmBtn}
                                onClick={confirmDelete}
                            >
                                Delete
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {filterUsername ? (
                <div className={styles.filterBanner}>
                    <p>
                        Showing posts from{" "}
                        <strong>@{filterUsername}</strong>
                    </p>
                    <button onClick={clearFilter}>Back to feed</button>
                </div>
            ) : (
                <div className={styles.createPostContainer}>
                    <div className={styles.createPostTop}>
                        <div
                            className={styles.avatarContainer}
                            onClick={() => router.push("/profile")}
                        >
                            <img
                                className={styles.userProfilePic}
                                src={authState.user.userId.profilePicture}
                                alt="Me"
                            />
                        </div>
                        <div className={styles.inputWrapper}>
                            <textarea
                                id="postContent"
                                name="postContent"
                                onChange={(e) => {
                                    setPostContent(e.target.value);
                                    if (e.target.value.trim()) setPostError("");
                                }}
                                value={postContent}
                                className={styles.textAreaOfContent}
                            placeholder="What's on your mind?"
                                maxLength={MAX_CHAR_COUNT}
                            />
                            <div
                                className={styles.charCounter}
                                style={{
                                    color:
                                        postContent.length >= MAX_CHAR_COUNT
                                            ? "#ff4d7d"
                                            : "#94a3b8",
                                }}
                            >
                                {postContent.length} / {MAX_CHAR_COUNT}
                            </div>
                        </div>
                    </div>
                    {postError && (
                        <p className={styles.errorMessage}>{postError}</p>
                    )}
                    {filePreview && (
                        <div className={styles.previewBox}>
                            <div className={styles.previewWrapper}>
                                <img src={filePreview} alt="Preview" />
                                <button
                                    onClick={clearMedia}
                                    className={styles.clearPreviewBtn}
                                    title="Remove media"
                                >
                                    <CloseIcon />
                                </button>
                            </div>
                        </div>
                    )}
                    <div className={styles.createPostBottom}>
                        <label
                            htmlFor="fileUpload"
                            className={styles.mediaButton}
                        >
                            <ImageIcon /> <span>Attach Media</span>
                        </label>
                        <input
                            id="fileUpload"
                            name="fileUpload"
                            onChange={handleFileChange}
                            type="file"
                            hidden
                            accept="image/*,video/*"
                        />
                        <button
                            onClick={handleUpload}
                            className={styles.uploadButton}
                            disabled={!postContent.trim() && !fileContent}
                        >
                            Upload
                        </button>
                    </div>
                </div>
            )}

            <div className={styles.postsContainer}>
                {displayedPosts.length === 0 && filterUsername ? (
                    <p className={styles.noPosts}>
                        No posts from this user yet.
                    </p>
                ) : (
                    displayedPosts.map((post) => (
                        <div key={post._id} className={styles.postCard}>
                            <div className={styles.postCardHeader}>
                                <div
                                    className={styles.avatarContainer}
                                    onClick={() =>
                                        router.push(
                                            `/view_profile/${post.userId.username}`
                                        )
                                    }
                                >
                                    <img
                                        className={styles.userProfilePic}
                                        src={post.userId.profilePicture}
                                        alt=""
                                    />
                                    {isUserOnline(post.userId._id) && (
                                        <span
                                            className={styles.onlineDot}
                                        ></span>
                                    )}
                                </div>
                                <div className={styles.postCardHeaderInfo}>
                                    <p
                                        className={styles.postCardUser}
                                        onClick={() =>
                                            router.push(
                                                `/view_profile/${post.userId.username}`
                                            )
                                        }
                                    >
                                        {post.userId.name}
                                    </p>
                                    <p className={styles.postCardUsername}>
                                        @{post.userId.username} •{" "}
                                        {getTimeAgo(post.createdAt)}
                                    </p>
                                </div>
                                {post.userId._id ===
                                    authState.user.userId._id && (
                                    <div
                                        className={styles.moreOptionsWrapper}
                                        onClick={(e) => e.stopPropagation()}
                                    >
                                        <button
                                            onClick={() =>
                                                setOpenMenuId(
                                                    openMenuId === post._id
                                                        ? null
                                                        : post._id
                                                )
                                            }
                                            className={styles.iconBtn}
                                        >
                                            <MoreHorizIcon />
                                        </button>
                                        {openMenuId === post._id && (
                                            <div
                                                className={
                                                    styles.optionsDropdown
                                                }
                                            >
                                                <button
                                                    className={
                                                        styles.optionItem
                                                    }
                                                    onClick={() => {
                                                        setEditingPost(post);
                                                        setEditBody(post.body);
                                                        setOpenMenuId(null);
                                                    }}
                                                >
                                                    <EditIcon /> Edit
                                                </button>
                                                <button
                                                    className={`${styles.optionItem} ${styles.delete}`}
                                                    onClick={() =>
                                                        handleDeleteClick(
                                                            post._id
                                                        )
                                                    }
                                                >
                                                    <DeleteIcon /> Delete
                                                </button>
                                            </div>
                                        )}
                                    </div>
                                )}
                            </div>

                            {/* --- POST BODY WITH CUSTOM LINKS --- */}
                            <div className={styles.postCardBody}>
                                <p style={{ whiteSpace: "pre-wrap" }}>
                                    {renderPostBody(post.body)}
                                </p>
                                {post.media && (
                                    <div
                                        className={
                                            styles.postCardImageContainer
                                        }
                                    >
                                        {isVideo(post.fileType, post.media) ? (
                                            <video
                                                src={post.media}
                                                controls
                                                style={{ width: "100%" }}
                                            />
                                        ) : (
                                            <img src={post.media} alt="" />
                                        )}
                                    </div>
                                )}
                            </div>

                            <div className={styles.postCardStats}>
                                {post.reactions &&
                                    post.reactions.length > 0 && (
                                        <div
                                            className={
                                                styles.reactionsCountWrapper
                                            }
                                            onClick={() =>
                                                handleShowReactionList(
                                                    post.reactions
                                                )
                                            }
                                        >
                                            <div
                                                className={
                                                    styles.reactionIconsStack
                                                }
                                            >
                                                {getUniqueReactions(
                                                    post.reactions
                                                )
                                                    .slice(0, 3)
                                                    .map((type, idx) => (
                                                        <span
                                                            key={type}
                                                            className={
                                                                styles.miniReactionIcon
                                                            }
                                                            style={{
                                                                zIndex: 3 - idx,
                                                            }}
                                                        >
                                                            {getReactionIcon(
                                                                type
                                                            )}
                                                        </span>
                                                    ))}
                                            </div>
                                            <span
                                                className={
                                                    styles.reactionCountText
                                                }
                                            >
                                                {post.reactions.length}{" "}
                                                Reactions
                                            </span>
                                        </div>
                                    )}
                            </div>

                            <div className={styles.postCardActions}>
                                <div
                                    className={styles.reactionWrapper}
                                    onMouseEnter={() =>
                                        handleMouseEnter(post._id)
                                    }
                                    onMouseLeave={handleMouseLeave}
                                >
                                    {/* Show dock if this post is active */}
                                    {activeReactionId === post._id && (
                                        <div className={styles.reactionPopup}>
                                            {[
                                                "Like",
                                                "Love",
                                                "Celebrate",
                                                "Insightful",
                                                "Funny",
                                            ].map((type) => (
                                                <button
                                                    key={type}
                                                    className={
                                                        styles.reactionBtn
                                                    }
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        handleReaction(
                                                            post._id,
                                                            type
                                                        );
                                                    }}
                                                >
                                                    {getReactionIcon(type)}
                                                </button>
                                            ))}
                                        </div>
                                    )}

                                    {/* Main Button - Toggles Dock on Click (Mobile) */}
                                    <button
                                        className={styles.actionButton}
                                        onClick={(e) =>
                                            handleReactionToggle(e, post._id)
                                        }
                                    >
                                        {(() => {
                                            const myReaction = getUserReaction(
                                                post,
                                                authState.user.userId._id
                                            );
                                            if (myReaction) {
                                                return (
                                                    <>
                                                        <span
                                                            style={{
                                                                fontSize:
                                                                    "1.2rem",
                                                                marginRight: 6,
                                                            }}
                                                        >
                                                            {getReactionIcon(
                                                                myReaction.type
                                                            )}
                                                        </span>
                                                        <span
                                                            style={{
                                                                color: getReactionColor(
                                                                    myReaction.type
                                                                ),
                                                                fontWeight: 600,
                                                            }}
                                                        >
                                                            {myReaction.type}
                                                        </span>
                                                    </>
                                                );
                                            }
                                            return (
                                                <>
                                                    <LikeIconOutline />
                                                    <span>Like</span>
                                                </>
                                            );
                                        })()}
                                    </button>
                                </div>
                                <button
                                    onClick={() =>
                                        dispatch(
                                            getAllComments({
                                                post_id: post._id,
                                            })
                                        )
                                    }
                                    className={styles.actionButton}
                                >
                                    <CommentIcon /> <span>Comment</span>
                                </button>
                                <button
                                    onClick={() => handleShare(post.body)}
                                    className={styles.actionButton}
                                >
                                    <ShareIcon /> <span>Share</span>
                                </button>
                            </div>
                        </div>
                    ))
                )}
                {/* Loader sentinel for Infinite Scroll — always rendered so the observer ref is valid */}
                <div ref={loaderRef} style={{ height: '50px', display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
                    {postState.isLoading && postState.hasMore
                        ? <Loader variant="inline" label="Loading posts..." neutral />
                        : !postState.hasMore
                            ? <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', opacity: 0.5 }}>You're all caught up ✓</span>
                            : null
                    }
                </div>
            </div>

            {/* --- Comments Modal --- */}
            {postState.postId !== "" && (
                <div
                    className={styles.commentModalBackdrop}
                    onClick={() => dispatch(resetPostId())}
                >
                    <div
                        className={styles.commentModalContent}
                        onClick={(e) => e.stopPropagation()}
                    >
                        <div className={styles.commentModalHeader}>
                            <h3>Signal Log</h3>
                            <button
                                onClick={() => dispatch(resetPostId())}
                                className={styles.closeModalButton}
                            >
                                <CloseIcon />
                            </button>
                        </div>
                        <div className={styles.allCommentsContainer}>
                            {postState.comments.map((c) => (
                                <div
                                    key={c._id}
                                    className={styles.singleComment}
                                >
                                    <div
                                        className={
                                            styles.commentAvatarContainer
                                        }
                                        onClick={() =>
                                            router.push(
                                                `/view_profile/${c.userId.username}`
                                            )
                                        }
                                    >
                                        <img
                                            src={c.userId.profilePicture}
                                            alt={c.userId.name}
                                            className={styles.userProfilePic}
                                        />
                                        {isUserOnline(c.userId._id) && (
                                            <span
                                                className={
                                                    styles.onlineDotSmall
                                                }
                                            ></span>
                                        )}
                                    </div>

                                    <div className={styles.singleCommentBody}>
                                        <div className={styles.commentHeader}>
                                            <span
                                                className={styles.commentUser}
                                            >
                                                {c.userId.name}
                                            </span>
                                            <span
                                                className={styles.commentTime}
                                            >
                                                {getTimeAgo(c.createdAt)}
                                            </span>
                                        </div>
                                        <p className={styles.commentText}>
                                            {c.body}
                                        </p>
                                        <div className={styles.commentActions}>
                                            <span
                                                onClick={() =>
                                                    handleLikeComment(c._id)
                                                }
                                                style={{
                                                    color: c.likes?.includes(
                                                        authState.user.userId
                                                            ._id
                                                    )
                                                        ? "var(--neon-teal)"
                                                        : "#666",
                                                }}
                                            >
                                                Like{" "}
                                                {c.likes?.length > 0 &&
                                                    `(${c.likes.length})`}
                                            </span>
                                            <span
                                                onClick={() =>
                                                    handleReplyComment(
                                                        c.userId.username
                                                    )
                                                }
                                            >
                                                Reply
                                            </span>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                        <div className={styles.postCommentContainer}>
                            <div className={styles.commentInputWrapper}>
                                <input
                                    ref={commentInputRef}
                                    id="commentText"
                                    name="commentText"
                                    value={commentText}
                                    onChange={(e) =>
                                        setCommentText(e.target.value)
                                    }
                                    placeholder="Add data packet..."
                                    onKeyDown={(e) =>
                                        e.key === "Enter" && handlePostComment()
                                    }
                                />
                                <button onClick={handlePostComment}>
                                    Transmit
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* --- Edit Modal --- */}
            {editingPost && (
                <div
                    className={styles.commentModalBackdrop}
                    onClick={() => setEditingPost(null)}
                >
                    <div
                        className={styles.commentModalContent}
                        onClick={(e) => e.stopPropagation()}
                        style={{ height: "auto" }}
                    >
                        <div className={styles.commentModalHeader}>
                            <h3>Modify Transmission</h3>
                            <button
                                onClick={() => setEditingPost(null)}
                                className={styles.closeModalButton}
                            >
                                <CloseIcon />
                            </button>
                        </div>
                        <div style={{ padding: 20 }}>
                            <textarea
                                id="editBody"
                                name="editBody"
                                className={styles.textAreaOfContent}
                                value={editBody}
                                onChange={(e) => setEditBody(e.target.value)}
                                style={{ height: 100 }}
                            />
                            <div className={styles.previewContainer}>
                                {editFilePreview ? (
                                    isVideo(editFile?.type, editFile?.name) ? (
                                        <video
                                            src={editFilePreview}
                                            controls
                                            style={{
                                                maxHeight: "250px",
                                                maxWidth: "100%",
                                            }}
                                        />
                                    ) : (
                                        <img
                                            src={editFilePreview}
                                            alt="New Preview"
                                            style={{
                                                maxHeight: "250px",
                                                maxWidth: "100%",
                                                objectFit: "contain",
                                            }}
                                        />
                                    )
                                ) : editingPost.media ? (
                                    isVideo(
                                        editingPost.fileType,
                                        editingPost.media
                                    ) ? (
                                        <video
                                            src={editingPost.media}
                                            controls
                                            style={{
                                                maxHeight: "250px",
                                                maxWidth: "100%",
                                            }}
                                        />
                                    ) : (
                                        <img
                                            src={editingPost.media}
                                            alt="Current"
                                            style={{
                                                maxHeight: "250px",
                                                maxWidth: "100%",
                                                objectFit: "contain",
                                            }}
                                        />
                                    )
                                ) : (
                                    <p style={{ color: "#888" }}>No media</p>
                                )}
                            </div>
                            <div className={styles.createPostBottom}>
                                <label
                                    htmlFor="editFileUpload"
                                    className={styles.mediaButton}
                                >
                                    <ImageIcon /> <span>Change Media</span>
                                </label>
                                <input
                                    id="editFileUpload"
                                    name="editFileUpload"
                                    type="file"
                                    hidden
                                    accept="image/*,video/*"
                                    onChange={handleEditFileChange}
                                />
                            </div>
                            <div
                                style={{
                                    marginTop: 20,
                                    display: "flex",
                                    justifyContent: "flex-end",
                                    gap: 10,
                                }}
                            >
                                <button
                                    className={styles.cancelButton}
                                    onClick={() => setEditingPost(null)}
                                >
                                    Cancel
                                </button>
                                <button
                                    className={styles.uploadButton}
                                    onClick={handleUpdateSubmit}
                                >
                                    Save
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* --- Reaction List Modal --- */}
            {showReactionListModal && (
                <div
                    className={styles.commentModalBackdrop}
                    onClick={() => setShowReactionListModal(false)}
                >
                    <div
                        className={styles.commentModalContent}
                        onClick={(e) => e.stopPropagation()}
                        style={{
                            height: "auto",
                            maxHeight: "60vh",
                            maxWidth: "500px",
                        }}
                    >
                        <div className={styles.commentModalHeader}>
                            <h3>Reactions</h3>
                            <button
                                onClick={() => setShowReactionListModal(false)}
                                className={styles.closeModalButton}
                            >
                                <CloseIcon />
                            </button>
                        </div>
                        <div className={styles.allCommentsContainer}>
                            {currentReactionList.map((reaction, idx) => (
                                <div
                                    className={styles.reactionUserItem}
                                    key={idx}
                                    onClick={() => {
                                        setShowReactionListModal(false);
                                        router.push(
                                            `/view_profile/${reaction.userId.username}`
                                        );
                                    }}
                                >
                                    <div className={styles.avatarContainer}>
                                        <img
                                            src={
                                                reaction.userId?.profilePicture
                                            }
                                            alt={reaction.userId?.name}
                                            className={styles.userProfilePic}
                                        />
                                        <span
                                            className={
                                                styles.reactionTypeIconOnAvatar
                                            }
                                        >
                                            {getReactionIcon(reaction.type)}
                                        </span>
                                    </div>
                                    <div className={styles.userInfo}>
                                        <h4>{reaction.userId?.name}</h4>
                                        <p>@{reaction.userId?.username}</p>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

Dashboard.getLayout = function getLayout(page) {
    return (
        <UserLayout>
            <DashboardLayout>{page}</DashboardLayout>
        </UserLayout>
    );
};
