import User from "../models/user.model.js";
import Profile from "../models/profile.model.js";
import Post from "../models/posts.model.js";
import Comment from "../models/comments.model.js";
import Message from "../models/message.model.js";
import Notification from "../models/notification.model.js";
import { createAndEmitNotification } from "../utils/notificationHelper.js";
import bcrypt from "bcrypt";
import crypto from "crypto";
import ConnectionRequest from "../models/connections.model.js";
import { v2 as cloudinary } from "cloudinary";
import {
    Document,
    Packer,
    Paragraph,
    TextRun,
    Table,
    TableRow,
    TableCell,
    WidthType,
    BorderStyle,
    AlignmentType,
    HeadingLevel,
    TabStopType,
    ExternalHyperlink,
} from "docx";
import dotenv from "dotenv";
import axios from "axios";
import { emailTemplates } from "../config/emailTemplates.js"; // Ensure this file exists

dotenv.config();

// ================= HELPER FUNCTIONS ================= //

// --- 1. Send Email Helper (Brevo) ---
const sendEmail = async (options) => {
    const apiKey = process.env.BREVO_API_KEY;
    const senderEmail = process.env.EMAIL_USER;

    if (!apiKey || !senderEmail) {
        console.error("❌ Missing Brevo API Key or Sender Email");
        throw new Error("Email service not configured.");
    }

    try {
        await axios.post(
            "https://api.brevo.com/v3/smtp/email",
            {
                sender: { name: "LinkUps Security", email: senderEmail },
                to: [{ email: options.email }],
                subject: options.subject,
                htmlContent: options.html,
                textContent: options.message,
            },
            {
                headers: {
                    "api-key": apiKey,
                    "Content-Type": "application/json",
                    accept: "application/json",
                },
            }
        );
        console.log(`✅ Email sent to ${options.email}`);
    } catch (error) {
        console.error("❌ Email Error:", error.response?.data || error.message);
        throw new Error("Failed to send email.");
    }
};

// --- 2. Cloudinary Delete Helper ---
const deleteFromCloudinary = async (url) => {
    if (
        !url ||
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
            await cloudinary.uploader.destroy(publicId, {
                resource_type: resourceType,
            });
            console.log(`🗑️ Cloudinary Deleted: ${publicId}`);
        }
    } catch (error) {
        console.error("❌ Cloudinary Deletion Error:", error);
    }
};

// --- 3. Resume Docx Helpers ---
const createSmartBullets = (text) => {
    if (!text) return [];
    let points = [];
    // Handle new array format
    if (Array.isArray(text)) {
        points = text.filter((s) => s && s.trim().length > 0).map((s) => s.trim());
    } else if (text.includes("\n")) {
        points = text
            .split("\n")
            .map((line) => line.trim())
            .filter((l) => l.length > 0);
    } else {
        points = text
            .split(". ")
            .map((s) => s.trim())
            .filter((s) => s.length > 2);
    }
    return points.map(
        (point) =>
            new Paragraph({
                text: point.endsWith(".") ? point : point + ".",
                bullet: { level: 0 },
                style: "Normal",
                spacing: { after: 0 },
            })
    );
};

const cleanUrl = (url) => {
    if (!url) return "";
    return url.replace(/^(https?:\/\/)?(www\.)?/, "").replace(/\/$/, "");
};

const createSectionHeader = (title) => {
    return new Paragraph({
        alignment: AlignmentType.LEFT,
        border: {
            bottom: {
                color: "BFBFBF",
                space: 1,
                style: BorderStyle.SINGLE,
                size: 6,
            },
        },
        spacing: { before: 200, after: 100 },
        children: [
            new TextRun({
                text: title,
                font: "Arial",
                size: 22,
                bold: true,
                smallCaps: true,
                color: "2E74B5",
            }),
        ],
    });
};

// ================= AUTH CONTROLLERS ================= //

export const register = async (req, res) => {
    try {
        const { name, email, password, username } = req.body;
        if (!name || !email || !password || !username)
            return res.status(400).json({ message: "All fields are required" });

        const user = await User.findOne({ email });
        if (user)
            return res.status(400).json({ message: "User already exists" });

        const hashedPassword = await bcrypt.hash(password, 10);
        const verificationToken = crypto.randomBytes(20).toString("hex");

        const newUser = new User({
            name,
            email,
            password: hashedPassword,
            username,
            active: false,
            verificationToken: verificationToken,
        });

        await newUser.save();
        const profile = new Profile({ userId: newUser._id });
        await profile.save();

        // --- Send Verification Email (Using Template) ---
        const backendUrl = process.env.BACKEND_URL || "http://localhost:9090";
        const verifyUrl = `${backendUrl}/verify/${verificationToken}`;

        const emailContent = emailTemplates.verifyEmail(
            verifyUrl,
            newUser.name
        );

        try {
            await sendEmail({
                email: newUser.email,
                subject: emailContent.subject,
                html: emailContent.html,
                message: emailContent.text,
            });
            return res.json({
                message: "Registration successful! Please check your email.",
            });
        } catch (emailError) {
            await User.deleteOne({ _id: newUser._id });
            await Profile.deleteOne({ userId: newUser._id });
            return res
                .status(500)
                .json({ message: "Email service failed. Please try again." });
        }
    } catch (error) {
        return res.status(500).json({ message: error.message });
    }
};

export const verifyEmail = async (req, res) => {
    try {
        const { token } = req.params;
        const user = await User.findOne({ verificationToken: token });

        if (!user) {
            return res
                .status(400)
                .json({ message: "Invalid or expired token." });
        }

        user.active = true;
        user.verificationToken = undefined;
        await user.save();

        // --- Send Welcome Email (Using Template) ---
        const frontendUrl = process.env.FRONTEND_URL || "http://localhost:3000";
        const dashboardUrl = `${frontendUrl}/login`;

        const emailContent = emailTemplates.welcomeEmail(
            user.name,
            dashboardUrl
        );

        // Send in background
        sendEmail({
            email: user.email,
            subject: emailContent.subject,
            html: emailContent.html,
            message: emailContent.text,
        }).catch((err) => console.error("Welcome email error:", err.message));

        return res.redirect(`${frontendUrl}/login?verified=true`);
    } catch (error) {
        return res.status(500).json({ message: error.message });
    }
};

export const login = async (req, res) => {
    try {
        const { email, password } = req.body;
        if (!email || !password)
            return res.status(400).json({ message: "All fields are required" });

        const user = await User.findOne({ email });
        if (!user)
            return res.status(404).json({ message: "User does not exist" });

        if (user.active === false) {
            return res.status(403).json({
                message:
                    "Please verify your email address to access the network.",
            });
        }

        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch)
            return res.status(400).json({ message: "Invalid Credentials !" });

        const token = crypto.randomBytes(32).toString("hex");
        await User.updateOne({ _id: user._id }, { token });
        return res.json({ token: token });
    } catch (error) {
        return res.status(500).json({ message: error.message });
    }
};

// ================= PASSWORD CONTROLLERS ================= //

export const forgotPassword = async (req, res) => {
    try {
        const { email } = req.body;
        const user = await User.findOne({ email });

        if (!user) return res.status(404).json({ message: "User not found" });

        const resetToken = crypto.randomBytes(20).toString("hex");
        user.resetPasswordToken = crypto
            .createHash("sha256")
            .update(resetToken)
            .digest("hex");
        user.resetPasswordExpires = Date.now() + 3600000; // 1 hr
        await user.save();

        const frontendUrl = process.env.FRONTEND_URL || "http://localhost:3000";
        const resetUrl = `${frontendUrl}/reset_password/${resetToken}`;

        // --- Use Template ---
        const emailContent = emailTemplates.passwordReset(
            resetUrl,
            resetToken,
            user.name
        );

        try {
            await sendEmail({
                email: user.email,
                subject: emailContent.subject,
                html: emailContent.html,
                message: emailContent.text,
            });
            res.status(200).json({ success: true, message: "Email sent" });
        } catch (error) {
            user.resetPasswordToken = undefined;
            user.resetPasswordExpires = undefined;
            await user.save();
            return res.status(500).json({ message: "Email could not be sent" });
        }
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

export const resetPassword = async (req, res) => {
    try {
        const resetPasswordToken = crypto
            .createHash("sha256")
            .update(req.params.token)
            .digest("hex");
        const user = await User.findOne({
            resetPasswordToken,
            resetPasswordExpires: { $gt: Date.now() },
        });

        if (!user)
            return res
                .status(400)
                .json({ message: "Invalid or expired token" });

        if (req.body.password) {
            const salt = await bcrypt.genSalt(10);
            user.password = await bcrypt.hash(req.body.password, salt);
            user.resetPasswordToken = undefined;
            user.resetPasswordExpires = undefined;
            await user.save();

            // --- Send Confirmation Email ---
            const emailContent = emailTemplates.passwordResetConfirmation(
                user.name
            );
            sendEmail({
                email: user.email,
                subject: emailContent.subject,
                html: emailContent.html,
                message: emailContent.text,
            }).catch((e) =>
                console.error("Confirmation email error:", e.message)
            );

            return res.status(200).json({
                success: true,
                message: "Password updated successfully",
            });
        } else {
            return res.status(400).json({ message: "Password is required" });
        }
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// ================= ACCOUNT DELETION ================= //

export const requestAccountDeletion = async (req, res) => {
    try {
        const { token } = req.body;
        const user = await User.findOne({ token });

        if (!user) return res.status(404).json({ message: "User not found" });

        const deleteToken = crypto.randomBytes(20).toString("hex");
        user.deleteToken = crypto
            .createHash("sha256")
            .update(deleteToken)
            .digest("hex");
        user.deleteTokenExpires = Date.now() + 3600000;
        await user.save();

        const frontendUrl = process.env.FRONTEND_URL || "http://localhost:3000";
        const deleteUrl = `${frontendUrl}/confirm_delete/${deleteToken}`;

        // Inline styled template for deletion (Specific critical action)
        const htmlMessage = `
            <div style="font-family: Arial, sans-serif; padding: 20px; color: #333;">
                <h2 style="color: #ff4d7d;">⚠ Confirm Account Deletion</h2>
                <p>Hello <strong>${user.name}</strong>,</p>
                <p>We received a request to <strong>permanently delete</strong> your LinkUps account.</p>
                <p>If you are sure, click the button below. This action cannot be undone.</p>
                <a href="${deleteUrl}" style="background-color: #ff4d7d; color: white; padding: 12px 24px; text-decoration: none; border-radius: 5px; font-weight: bold; display: inline-block; margin: 20px 0;">Confirm Deletion</a>
                <p style="font-size: 12px; color: #999;">If you did not request this, change your password immediately.</p>
            </div>
        `;

        try {
            await sendEmail({
                email: user.email,
                subject: "LinkUps - Confirm Account Deletion",
                message: `Confirm deletion: ${deleteUrl}`,
                html: htmlMessage,
            });
            return res.json({
                message: "Verification email sent. Check your inbox.",
            });
        } catch (error) {
            user.deleteToken = undefined;
            user.deleteTokenExpires = undefined;
            await user.save();
            return res
                .status(500)
                .json({ message: "Email could not be sent." });
        }
    } catch (error) {
        return res.status(500).json({ message: error.message });
    }
};

export const confirmAccountDeletion = async (req, res) => {
    try {
        const token = req.params.token;
        const hashedToken = crypto
            .createHash("sha256")
            .update(token)
            .digest("hex");

        const user = await User.findOne({
            deleteToken: hashedToken,
            deleteTokenExpires: { $gt: Date.now() },
        });

        if (!user)
            return res
                .status(400)
                .json({ message: "Invalid or expired token" });

        const userId = user._id;

        // 1. Cloudinary Cleanup
        if (user.profilePicture)
            await deleteFromCloudinary(user.profilePicture);
        if (user.backgroundPicture)
            await deleteFromCloudinary(user.backgroundPicture);

        const userPosts = await Post.find({ userId });
        for (const post of userPosts) {
            if (post.media) await deleteFromCloudinary(post.media);
        }

        // 2. Database Cleanup
        await Post.deleteMany({ userId });
        await Comment.deleteMany({ userId });
        await ConnectionRequest.deleteMany({
            $or: [{ userId: userId }, { connectionId: userId }],
        });
        await Message.deleteMany({
            $or: [{ sender: userId }, { receiver: userId }],
        });
        await Notification.deleteMany({
            $or: [{ sender: userId }, { recipient: userId }],
        }); // Clean notifications
        await Profile.deleteOne({ userId });
        await User.deleteOne({ _id: userId });

        return res.json({
            message: "Account and all associated data deleted successfully.",
        });
    } catch (error) {
        console.error("Deletion Error:", error);
        return res
            .status(500)
            .json({ message: "Server error during deletion." });
    }
};

// ================= USER & PROFILE CONTROLLERS ================= //

export const uploadProfilePicture = async (req, res) => {
    try {
        const { token } = req.body;
        const user = await User.findOne({ token });
        if (!user)
            return res.status(404).json({ message: "User does not exist" });
        if (!req.file)
            return res.status(400).json({ message: "No file uploaded." });

        if (user.profilePicture)
            await deleteFromCloudinary(user.profilePicture);

        user.profilePicture = req.file.path;
        await user.save();
        return res.json({
            message: "Profile picture updated",
            url: req.file.path,
        });
    } catch (error) {
        return res.status(500).json({ message: error.message });
    }
};

export const uploadBackgroundPicture = async (req, res) => {
    try {
        const { token } = req.body;
        const user = await User.findOne({ token });
        if (!user)
            return res.status(404).json({ message: "User does not exist" });
        if (!req.file)
            return res.status(400).json({ message: "No file uploaded." });

        if (user.backgroundPicture)
            await deleteFromCloudinary(user.backgroundPicture);

        user.backgroundPicture = req.file.path;
        await user.save();
        return res.json({ message: "Background updated", url: req.file.path });
    } catch (error) {
        return res.status(500).json({ message: error.message });
    }
};

export const updateUserProfile = async (req, res) => {
    try {
        const { token, ...newUserData } = req.body;
        const user = await User.findOne({ token: token });
        if (!user) return res.status(404).json({ message: "User not found" });
        Object.assign(user, newUserData);
        await user.save();
        return res.json({ message: "User Updated", user });
    } catch (error) {
        return res.status(500).json({ message: error.message });
    }
};

export const getUserAndProfile = async (req, res) => {
    try {
        const { token } = req.query;
        const user = await User.findOne({ token: token });
        if (!user) return res.status(404).json({ message: "User not found" });
        const profile = await Profile.findOne({ userId: user._id }).populate(
            "userId",
            "name email username profilePicture backgroundPicture isOnline lastSeen"
        );
        return res.json({ profile });
    } catch (error) {
        return res.status(500).json({ message: error.message });
    }
};

export const updateProfileData = async (req, res) => {
    try {
        const { token, ...newProfileData } = req.body;
        const user = await User.findOne({ token: token });
        if (!user) return res.status(404).json({ message: "User not found" });

        const updatedProfile = await Profile.findOneAndUpdate(
            { userId: user._id },
            { $set: newProfileData },
            { new: true }
        );
        return res.json({
            message: "Profile Updated",
            profile: updatedProfile,
        });
    } catch (error) {
        return res.status(500).json({ message: error.message });
    }
};

export const getAllUserProfile = async (req, res) => {
    try {
        // Populate ONLY users who are 'active: true' (Verified)
        const profiles = await Profile.find().populate({
            path: "userId",
            select: "name username email profilePicture backgroundPicture isOnline lastSeen",
            match: { active: true }, // <--- Filter condition
        });

        // Filter out any profiles where the user document is null (because they weren't active)
        const activeProfiles = profiles.filter(
            (profile) => profile.userId !== null
        );

        return res.json({ profiles: activeProfiles });
    } catch (error) {
        return res.status(500).json({ message: error.message });
    }
};

export const downloadProfile = async (req, res) => {
    try {
        const user_id = req.query.id;
        const userProfile = await Profile.findOne({ userId: user_id }).populate(
            "userId"
        );
        if (!userProfile)
            return res.status(404).json({ message: "Profile not found" });
        const user = userProfile.userId;

        const doc = new Document({
            styles: {
                default: {
                    document: {
                        run: { font: "Arial", size: 20, color: "000000" },
                        paragraph: { spacing: { after: 40 } },
                    },
                },
            },
            sections: [
                {
                    properties: {
                        page: {
                            margin: {
                                top: 500,
                                right: 500,
                                bottom: 500,
                                left: 500,
                            },
                        },
                    },
                    children: [
                        new Paragraph({
                            text: user.name,
                            heading: HeadingLevel.HEADING_1,
                            alignment: AlignmentType.LEFT,
                            spacing: { after: 50 },
                            run: {
                                font: "Arial",
                                size: 36,
                                bold: true,
                                color: "2E74B5",
                            },
                        }),
                        new Table({
                            width: { size: 100, type: WidthType.PERCENTAGE },
                            borders: {
                                top: { style: BorderStyle.NONE },
                                bottom: { style: BorderStyle.NONE },
                                left: { style: BorderStyle.NONE },
                                right: { style: BorderStyle.NONE },
                                insideVertical: { style: BorderStyle.NONE },
                                insideHorizontal: { style: BorderStyle.NONE },
                            },
                            rows: [
                                new TableRow({
                                    children: [
                                        new TableCell({
                                            width: {
                                                size: 60,
                                                type: WidthType.PERCENTAGE,
                                            },
                                            children: [
                                                new Paragraph({
                                                    text: userProfile.linkedin
                                                        ? `LinkedIn: ${cleanUrl(
                                                              userProfile.linkedin
                                                          )}`
                                                        : "",
                                                }),
                                                new Paragraph({
                                                    text: userProfile.github
                                                        ? `GitHub: ${cleanUrl(
                                                              userProfile.github
                                                          )}`
                                                        : "",
                                                }),
                                                new Paragraph({
                                                    text: userProfile.leetcode
                                                        ? `LeetCode: ${cleanUrl(
                                                              userProfile.leetcode
                                                          )}`
                                                        : "",
                                                }),
                                            ],
                                        }),
                                        new TableCell({
                                            width: {
                                                size: 40,
                                                type: WidthType.PERCENTAGE,
                                            },
                                            verticalAlign: AlignmentType.TOP,
                                            children: [
                                                new Paragraph({
                                                    text: `Email: ${user.email}`,
                                                    alignment:
                                                        AlignmentType.RIGHT,
                                                }),
                                                new Paragraph({
                                                    text: `Mobile: ${userProfile.phoneNumber}`,
                                                    alignment:
                                                        AlignmentType.RIGHT,
                                                }),
                                            ],
                                        }),
                                    ],
                                }),
                            ],
                        }),
                        new Paragraph({ text: "" }),
                        createSectionHeader("SKILLS"),
                        new Table({
                            width: { size: 100, type: WidthType.PERCENTAGE },
                            borders: {
                                top: { style: BorderStyle.NONE },
                                bottom: { style: BorderStyle.NONE },
                                left: { style: BorderStyle.NONE },
                                right: { style: BorderStyle.NONE },
                                insideVertical: { style: BorderStyle.NONE },
                                insideHorizontal: { style: BorderStyle.NONE },
                            },
                            rows: [
                                userProfile.skillLanguages &&
                                    new TableRow({
                                        children: [
                                            new TableCell({
                                                width: {
                                                    size: 25,
                                                    type: WidthType.PERCENTAGE,
                                                },
                                                children: [
                                                    new Paragraph({
                                                        text: "Languages:",
                                                        bold: true,
                                                    }),
                                                ],
                                            }),
                                            new TableCell({
                                                children: [
                                                    new Paragraph(
                                                        userProfile.skillLanguages
                                                    ),
                                                ],
                                            }),
                                        ],
                                    }),
                                userProfile.skillCloudDevOps &&
                                    new TableRow({
                                        children: [
                                            new TableCell({
                                                children: [
                                                    new Paragraph({
                                                        text: "Cloud & DevOps:",
                                                        bold: true,
                                                    }),
                                                ],
                                            }),
                                            new TableCell({
                                                children: [
                                                    new Paragraph(
                                                        userProfile.skillCloudDevOps
                                                    ),
                                                ],
                                            }),
                                        ],
                                    }),
                                userProfile.skillFrameworks &&
                                    new TableRow({
                                        children: [
                                            new TableCell({
                                                children: [
                                                    new Paragraph({
                                                        text: "Frameworks:",
                                                        bold: true,
                                                    }),
                                                ],
                                            }),
                                            new TableCell({
                                                children: [
                                                    new Paragraph(
                                                        userProfile.skillFrameworks
                                                    ),
                                                ],
                                            }),
                                        ],
                                    }),
                                userProfile.skillTools &&
                                    new TableRow({
                                        children: [
                                            new TableCell({
                                                children: [
                                                    new Paragraph({
                                                        text: "Tools/Platforms:",
                                                        bold: true,
                                                    }),
                                                ],
                                            }),
                                            new TableCell({
                                                children: [
                                                    new Paragraph(
                                                        userProfile.skillTools
                                                    ),
                                                ],
                                            }),
                                        ],
                                    }),
                                userProfile.skillSoft &&
                                    new TableRow({
                                        children: [
                                            new TableCell({
                                                children: [
                                                    new Paragraph({
                                                        text: "Soft Skills:",
                                                        bold: true,
                                                    }),
                                                ],
                                            }),
                                            new TableCell({
                                                children: [
                                                    new Paragraph(
                                                        userProfile.skillSoft
                                                    ),
                                                ],
                                            }),
                                        ],
                                    }),
                            ].filter(Boolean),
                        }),
                        ...(userProfile.pastWork.length > 0
                            ? [
                                  createSectionHeader("EXPERIENCE"),
                                  ...userProfile.pastWork.flatMap((work) => [
                                      new Paragraph({
                                          children: [
                                              new TextRun({
                                                  text: work.company,
                                                  bold: true,
                                                  size: 22,
                                              }),
                                              new TextRun({
                                                  text: `\t${work.years}`,
                                              }),
                                          ],
                                          tabStops: [
                                              {
                                                  type: TabStopType.RIGHT,
                                                  position: 10500,
                                              },
                                          ],
                                          spacing: { after: 0 },
                                      }),
                                      new Paragraph({
                                          text: work.position,
                                          italics: true,
                                          spacing: { after: 0 },
                                      }),
                                      ...createSmartBullets(work.description),
                                  ]),
                              ]
                            : []),
                        ...(userProfile.projects.length > 0
                            ? [
                                  createSectionHeader("PROJECTS"),
                                  ...userProfile.projects.flatMap((proj) => [
                                      new Paragraph({
                                          children: [
                                              new TextRun({
                                                  text: proj.title,
                                                  bold: true,
                                                  size: 22,
                                              }),
                                              ...(proj.link
                                                  ? [
                                                        new TextRun({
                                                            text: "  :  ",
                                                        }),
                                                        new ExternalHyperlink({
                                                            children: [
                                                                new TextRun({
                                                                    text: "Link",
                                                                    style: "Hyperlink",
                                                                    color: "0563C1",
                                                                    underline: true,
                                                                    bold: true,
                                                                }),
                                                            ],
                                                            link: proj.link,
                                                        }),
                                                    ]
                                                  : []),
                                              new TextRun({
                                                  text: `\t${
                                                      proj.duration || ""
                                                  }`,
                                                  size: 20,
                                              }),
                                          ],
                                          tabStops: [
                                              {
                                                  type: TabStopType.RIGHT,
                                                  position: 10500,
                                              },
                                          ],
                                          spacing: { after: 0 },
                                      }),
                                      ...createSmartBullets(proj.description),
                                  ]),
                              ]
                            : []),
                        ...(userProfile.certificates.length > 0
                            ? [
                                  createSectionHeader("CERTIFICATES"),
                                  ...userProfile.certificates.flatMap(
                                      (cert) => [
                                          new Paragraph({
                                              children: [
                                                  new TextRun({
                                                      text: cert.name,
                                                      bold: true,
                                                  }),
                                                  ...(cert.link
                                                      ? [
                                                            new TextRun({
                                                                text: "  :  ",
                                                            }),
                                                            new ExternalHyperlink(
                                                                {
                                                                    children: [
                                                                        new TextRun(
                                                                            {
                                                                                text: "Link",
                                                                                style: "Hyperlink",
                                                                                color: "0563C1",
                                                                                underline: true,
                                                                                bold: true,
                                                                            }
                                                                        ),
                                                                    ],
                                                                    link: cert.link,
                                                                }
                                                            ),
                                                        ]
                                                      : []),
                                                  new TextRun({
                                                      text: `\t${
                                                          cert.date || ""
                                                      }`,
                                                  }),
                                              ],
                                              tabStops: [
                                                  {
                                                      type: TabStopType.RIGHT,
                                                      position: 10500,
                                                  },
                                              ],
                                              spacing: { after: 0 },
                                          }),
                                      ]
                                  ),
                              ]
                            : []),
                        ...(userProfile.achievements.length > 0
                            ? [
                                  createSectionHeader("ACHIEVEMENTS"),
                                  ...userProfile.achievements.flatMap((ach) => [
                                      new Paragraph({
                                          children: [
                                              new TextRun({
                                                  text: ach.title + ":",
                                                  bold: true,
                                              }),
                                              new TextRun({
                                                  text: `\t${ach.date || ""}`,
                                              }),
                                          ],
                                          tabStops: [
                                              {
                                                  type: TabStopType.RIGHT,
                                                  position: 10500,
                                              },
                                          ],
                                          spacing: { after: 0 },
                                      }),
                                      ...createSmartBullets(ach.description),
                                  ]),
                              ]
                            : []),
                        ...(userProfile.education.length > 0
                            ? [
                                  createSectionHeader("EDUCATION"),
                                  ...userProfile.education.flatMap((edu) => [
                                      new Paragraph({
                                          children: [
                                              new TextRun({
                                                  text: edu.school,
                                                  bold: true,
                                                  size: 22,
                                              }),
                                              new TextRun({
                                                  text: `\t${
                                                      edu.location || ""
                                                  }`,
                                                  bold: true,
                                              }),
                                          ],
                                          tabStops: [
                                              {
                                                  type: TabStopType.RIGHT,
                                                  position: 10500,
                                              },
                                          ],
                                          spacing: { after: 0 },
                                      }),
                                      new Paragraph({
                                          children: [
                                              new TextRun({
                                                  text: `${edu.degree} ${
                                                      edu.grade
                                                          ? "| " + edu.grade
                                                          : ""
                                                  }`,
                                              }),
                                              new TextRun({
                                                  text: `\t${edu.years}`,
                                              }),
                                          ],
                                          tabStops: [
                                              {
                                                  type: TabStopType.RIGHT,
                                                  position: 10500,
                                              },
                                          ],
                                          spacing: { after: 80 },
                                      }),
                                  ]),
                              ]
                            : []),
                    ],
                },
            ],
        });

        const buffer = await Packer.toBuffer(doc);
        res.setHeader(
            "Content-Type",
            "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
        );
        res.setHeader(
            "Content-Disposition",
            `attachment; filename=${user.username}_resume.docx`
        );
        res.send(buffer);
    } catch (error) {
        console.error("Error generating DOCX:", error);
        res.status(500).json({ message: "Failed to generate Resume" });
    }
};

// --- UPDATED: Send Connection Request ---
export const sendConnectionRequest = async (req, res) => {
    const { token, connectionId } = req.body;
    try {
        const user = await User.findOne({ token: token });
        if (!user) return res.status(404).json({ message: "User not found" });
        const connectionUser = await User.findOne({ _id: connectionId });
        if (!connectionUser)
            return res
                .status(404)
                .json({ message: "Connection User not found" });
        if (user._id.toString() === connectionUser._id.toString())
            return res
                .status(400)
                .json({ message: "Cannot connect with yourself." });

        const existingRequest = await ConnectionRequest.findOne({
            $or: [
                { userId: user._id, connectionId: connectionUser._id },
                { userId: connectionUser._id, connectionId: user._id },
            ],
        });
        if (existingRequest)
            return res.status(400).json({ message: "Request already sent" });

        const request = new ConnectionRequest({
            userId: user._id,
            connectionId: connectionUser._id,
        });
        await request.save();

        // Notify the connection recipient
        await createAndEmitNotification(req.io, req.userSocketMap, {
            recipient: connectionUser._id,
            sender:    user,
            type:      "connection_request",
            message:   "sent you a connection request.",
        });
        // --- NOTIFICATION END ---

        return res.json({ message: "Request Sent" });
    } catch (error) {
        return res.status(500).json({ message: error.message });
    }
};

export const getMyConnectionsRequests = async (req, res) => {
    const { token } = req.query;
    try {
        const user = await User.findOne({ token: token });
        if (!user) return res.status(404).json({ message: "User not found" });
        const connections = await ConnectionRequest.find({
            userId: user._id,
        }).populate(
            "connectionId",
            "name username email profilePicture isOnline lastSeen"
        );
        return res.json({ connections });
    } catch (error) {
        return res.status(500).json({ message: error.message });
    }
};

export const whatAreMyConnections = async (req, res) => {
    const { token } = req.query;
    try {
        const user = await User.findOne({ token: token });
        if (!user) return res.status(404).json({ message: "User not found" });
        const connections = await ConnectionRequest.find({
            connectionId: user._id,
        }).populate(
            "userId",
            "name username email profilePicture isOnline lastSeen"
        );
        return res.json({ connections });
    } catch (error) {
        return res.status(500).json({ message: error.message });
    }
};

// --- UPDATED: Accept Connection Request ---
export const acceptConnectionRequest = async (req, res) => {
    const { token, requestId, action_type } = req.body;
    try {
        const user = await User.findOne({ token: token });
        if (!user) return res.status(404).json({ message: "User not found" });
        const connection = await ConnectionRequest.findOne({
            _id: requestId,
            connectionId: user._id,
        });
        if (!connection)
            return res.status(404).json({ message: "Connection not found" });

        if (action_type === "accept") {
            connection.status_accepted = true;
            await connection.save();

            // Notify the person whose request was accepted
            await createAndEmitNotification(req.io, req.userSocketMap, {
                recipient: connection.userId,
                sender:    user,
                type:      "connection_accepted",
                message:   "accepted your connection request.",
            });
            // --- NOTIFICATION END ---

            return res.json({ message: "Request Accepted" });
        } else {
            await ConnectionRequest.deleteOne({ _id: requestId });
            return res.json({ message: "Request Declined" });
        }
    } catch (error) {
        return res.status(500).json({ message: error.message });
    }
};

// --- UPDATED: Comment Post ---
export const commentPost = async (req, res) => {
    const { token, post_id, commentBody } = req.body;
    try {
        const user = await User.findOne({ token: token }).select(
            "_id name profilePicture"
        );
        if (!user) return res.status(404).json({ message: "User not found" });
        const post = await Post.findOne({ _id: post_id });
        if (!post) return res.status(404).json({ message: "Post not found" });

        const comment = new Comment({
            userId: user._id,
            postId: post_id,
            body: commentBody,
        });
        await comment.save();

        if (post.userId.toString() !== user._id.toString()) {
            await createAndEmitNotification(req.io, req.userSocketMap, {
                recipient: post.userId,
                sender:    user,
                type:      "comment",
                message:   "commented on your post.",
                post:      post,
            });
        }
        // --- NOTIFICATION END ---

        return res.status(200).json({ message: "Comment Added" });
    } catch (error) {
        return res.status(500).json({ message: error.message });
    }
};

export const getUserProfileAndUserBasedOnUername = async (req, res) => {
    const { username } = req.query;
    try {
        const user = await User.findOne({ username });
        if (!user) return res.status(404).json({ message: "User not found" });

        const userProfile = await Profile.findOne({
            userId: user._id,
        }).populate(
            "userId",
            "name email username profilePicture backgroundPicture isOnline lastSeen"
        );
        if (!userProfile)
            return res.status(404).json({ message: "Profile not found" });

        const connections = await ConnectionRequest.find({
            $or: [
                { userId: user._id, status_accepted: true },
                { connectionId: user._id, status_accepted: true },
            ],
        }).populate("userId connectionId", "name username profilePicture");

        const connectionList = connections
            .map((conn) => {
                if (!conn.userId || !conn.connectionId) return null;
                if (conn.userId._id.toString() === user._id.toString())
                    return conn.connectionId;
                return conn.userId;
            })
            .filter((conn) => conn !== null);

        const profileData = userProfile.toObject();
        profileData.connectionCount = connectionList.length;
        profileData.connectionList = connectionList;

        return res.json({ profile: profileData });
    } catch (error) {
        console.error("Error fetching profile:", error);
        return res.status(500).json({ message: error.message });
    }
};
