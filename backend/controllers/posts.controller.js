import Comment from "../models/comments.model.js";
import Post from "../models/posts.model.js";
import User from "../models/user.model.js";
import Notification from "../models/notification.model.js";
import { createAndEmitNotification } from "../utils/notificationHelper.js";
import { v2 as cloudinary } from "cloudinary";

export const activeCheck = async (req, res) => {
    return res.status(200).json({ message: "RUNNING" });
};

export const createPost = async (req, res) => {
    const { token } = req.body;
    try {
        const user = await User.findOne({ token: token });
        if (!user) return res.status(404).json({ message: "User not found" });

        const post = new Post({
            userId: user._id,
            body: req.body.body,
            media: req.file ? req.file.path : "",
            fileType: req.file ? req.file.mimetype : "",
        });

        await post.save();
        return res.status(200).json({ message: "Post Created" });
    } catch (error) {
        return res.status(500).json({ message: error.message });
    }
};

const deleteFromCloudinary = async (url) => {
    if (!url) return;
    if (
        url.includes("default_dlizpg") ||
        url.includes("3d-rendering-hexagonal")
    ) {
        return;
    }
    try {
        const regex = /\/upload\/(?:v\d+\/)?(.+)\.[a-zA-Z0-9]+$/;
        const match = url.match(regex);

        if (match && match[1]) {
            const publicId = match[1];
            const resourceType = url.includes("/video/") ? "video" : "image";
            const result = await cloudinary.uploader.destroy(publicId, {
                resource_type: resourceType,
            });
            console.log(`🗑️ Cloudinary Delete: ${publicId} ->`, result);
        } else {
            console.warn(`⚠️ Could not extract Public ID from URL: ${url}`);
        }
    } catch (error) {
        console.error("❌ Cloudinary Deletion Error:", error);
    }
};

export const getAllPosts = async (req, res) => {
    try {
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 10;
        const skip = (page - 1) * limit;

        const posts = await Post.find()
            .sort({ createdAt: -1 }) // Newest first
            .skip(skip)
            .limit(limit)
            .populate(
                "userId",
                "name username email profilePicture isOnline lastSeen"
            )
            .populate("reactions.userId", "name username profilePicture");

        const totalPosts = await Post.countDocuments();

        return res.json({ 
            posts, 
            currentPage: page, 
            totalPages: Math.ceil(totalPosts / limit),
            hasMore: page * limit < totalPosts
        });
    } catch (error) {
        return res.status(500).json({ message: error.message });
    }
};

export const getPostById = async (req, res) => {
    const { post_id } = req.query;
    try {
        const post = await Post.findOne({ _id: post_id })
            .populate(
                "userId",
                "name username email profilePicture isOnline lastSeen"
            )
            .populate("reactions.userId", "name username profilePicture");
        if (!post) {
            return res.status(404).json({ message: "Post not found" });
        }
        return res.json({ post });
    } catch (error) {
        return res.status(500).json({ message: error.message });
    }
};

export const deletePost = async (req, res) => {
    const { token, post_id } = req.body;
    try {
        const user = await User.findOne({ token: token }).select("_id");
        if (!user) return res.status(404).json({ message: "User not found" });
        const post = await Post.findOne({ _id: post_id });
        if (!post) {
            return res.status(404).json({ message: "Post not found" });
        }
        if (post.userId.toString() !== user._id.toString()) {
            return res.status(404).json({ message: "Unauthorized" });
        }
        if (post.media) {
            await deleteFromCloudinary(post.media);
        }
        await Comment.deleteMany({ postId: post_id });

        // Also delete any notifications related to this post
        await Notification.deleteMany({ post: post_id });

        await Post.deleteOne({ _id: post_id });
        return res.json({ message: "Post and media deleted successfully" });
    } catch (error) {
        return res.status(500).json({ message: error.message });
    }
};

export const updatePost = async (req, res) => {
    const { token, post_id, body } = req.body;
    try {
        const user = await User.findOne({ token: token }).select("_id");
        if (!user) return res.status(404).json({ message: "User not found" });

        const post = await Post.findOne({ _id: post_id });
        if (!post) {
            return res.status(404).json({ message: "Post not found" });
        }

        if (post.userId.toString() !== user._id.toString()) {
            return res
                .status(401)
                .json({ message: "Unauthorized to edit this post" });
        }

        if (body !== undefined) {
            post.body = body;
        }

        if (req.file) {
            if (post.media) {
                await deleteFromCloudinary(post.media);
            }
            post.media = req.file.path;
            post.fileType = req.file.mimetype;
        }

        post.updatedAt = Date.now();

        await post.save();
        return res.status(200).json({ message: "Post Updated", post });
    } catch (error) {
        return res.status(500).json({ message: error.message });
    }
};

export const get_comments_by_post = async (req, res) => {
    const { post_id } = req.query;
    try {
        const post = await Post.findOne({ _id: post_id });
        if (!post) {
            return res.status(404).json({ message: "Post not found" });
        }
        const comments = await Comment.find({ postId: post_id }).populate(
            "userId",
            "username name profilePicture isOnline lastSeen"
        );
        return res.json(comments.reverse());
    } catch (error) {
        return res.status(500).json({ message: error.message });
    }
};

export const delete_comment_of_user = async (req, res) => {
    const { token, comment_id } = req.body;
    try {
        const user = await User.findOne({ token: token }).select("_id");
        if (!user) return res.status(404).json({ message: "User not found" });
        const comment = await Comment.findOne({ _id: comment_id });
        if (!comment) {
            return res.status(404).json({ message: "Comment not found" });
        }
        if (comment.userId.toString() !== user._id.toString()) {
            return res.status(404).json({ message: "Unauthorized" });
        }
        await Comment.deleteOne({ _id: comment_id });

        // Optionally remove notification related to this comment (advanced logic would require storing commentId in notification)

        return res.json({ message: "Comment Deleted" });
    } catch (error) {
        return res.status(500).json({ message: error.message });
    }
};

// --- UPDATED: Toggle Reaction Logic with Notifications ---
export const toggleReactionOnPost = async (req, res) => {
    const { post_id, token, reactionType } = req.body;

    try {
        const user = await User.findOne({ token: token }).select(
            "_id name profilePicture"
        );
        if (!user) {
            return res.status(404).json({ message: "User not found" });
        }
        const userId = user._id;

        const post = await Post.findOne({ _id: post_id });
        if (!post) {
            return res.status(404).json({ message: "Post not found" });
        }

        if (!post.reactions) post.reactions = [];

        const existingIndex = post.reactions.findIndex(
            (r) => r.userId.toString() === userId.toString()
        );

        let action = "added";

        if (existingIndex !== -1) {
            const existingReaction = post.reactions[existingIndex];

            // 1. Same reaction clicked -> Remove (Unlike)
            if (existingReaction.type === reactionType) {
                post.reactions.splice(existingIndex, 1);
                action = "removed";

                // Ideally, remove the previous notification here
                await Notification.deleteOne({
                    sender: userId,
                    recipient: post.userId,
                    type: "like",
                    post: post._id,
                });
            }
            // 2. Different reaction clicked -> Update
            else {
                post.reactions[existingIndex].type = reactionType;
                action = "updated";
            }
        } else {
            // 3. New Reaction -> Add
            post.reactions.push({ userId: userId, type: reactionType });

            if (post.userId.toString() !== userId.toString()) {
                await createAndEmitNotification(req.io, req.userSocketMap, {
                    recipient: post.userId,
                    sender:    user,
                    type:      "like",
                    message:   "reacted to your post.",
                    post:      post,
                });
            }
        }

        await post.save();
        return res.json({
            message: `Reaction ${action}`,
            post_id: post._id,
            reactions: post.reactions,
        });
    } catch (error) {
        console.error(error);
        return res.status(500).json({ message: error.message });
    }
};

export const toggleCommentLike = async (req, res) => {
    const { comment_id, token } = req.body;
    try {
        const user = await User.findOne({ token: token }).select("_id");
        if (!user) return res.status(404).json({ message: "User not found" });

        const comment = await Comment.findById(comment_id);
        if (!comment)
            return res.status(404).json({ message: "Comment not found" });

        if (!comment.likes) comment.likes = [];

        const index = comment.likes.indexOf(user._id);
        if (index === -1) {
            comment.likes.push(user._id);
        } else {
            comment.likes.splice(index, 1);
        }
        await comment.save();

        return res.json({
            message: "Success",
            likes: comment.likes,
            comment_id,
        });
    } catch (error) {
        return res.status(500).json({ message: error.message });
    }
};
