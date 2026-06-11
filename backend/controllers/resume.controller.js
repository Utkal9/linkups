import Resume from "../models/resume.model.js";
import User from "../models/user.model.js";
import Profile from "../models/profile.model.js";
import { v2 as cloudinary } from "cloudinary";

// --- Helper: Delete image from Cloudinary ---
const deleteFromCloudinary = async (url) => {
    if (!url || url.includes("default_") || !url.includes("cloudinary")) return;
    try {
        const regex = /\/upload\/(?:v\d+\/)?(.+)\.[a-zA-Z0-9]+$/;
        const match = url.match(regex);
        if (match && match[1]) {
            await cloudinary.uploader.destroy(match[1]);
        }
    } catch (error) {
        console.error("Cloudinary delete error:", error);
    }
};

// ==========================================
//          CORE CONTROLLERS
// ==========================================

// --- 1. Create Resume (With Smart Profile Auto-Fill) ---
export const createResume = async (req, res) => {
    try {
        const { token, title } = req.body;

        const user = await User.findOne({ token });
        if (!user) return res.status(404).json({ message: "User not found" });

        const userProfile = await Profile.findOne({ userId: user._id });

        let personalInfo = {
            full_name: user.name,
            email: user.email,
            image: user.profilePicture,
        };

        let summary = "";
        let experience = [];
        let education = [];
        let projects = [];
        let certificates = [];
        let achievements = [];
        let skills = [];
        let skillCats = {};

        if (userProfile) {
            personalInfo = {
                ...personalInfo,
                phone: userProfile.phoneNumber || "",
                linkedin: userProfile.linkedin || "",
                github: userProfile.github || "",
                leetcode: userProfile.leetcode || "",
                profession: userProfile.currentPost || "",
                website: "",
                location: "",
            };

            summary = userProfile.bio || "";

            if (userProfile.pastWork && userProfile.pastWork.length > 0) {
                experience = userProfile.pastWork.map((work) => ({
                    company: work.company,
                    position: work.position,
                    description: work.description,
                }));
            }

            if (userProfile.education && userProfile.education.length > 0) {
                education = userProfile.education.map((edu) => ({
                    institution: edu.school,
                    degree: edu.degree,
                    field: edu.fieldOfStudy,
                    gpa: edu.grade,
                    location: edu.location,
                }));
            }

            if (userProfile.projects && userProfile.projects.length > 0) {
                projects = userProfile.projects.map((proj) => ({
                    name: proj.title,
                    link: proj.link,
                    description: proj.description,
                    duration: proj.duration,
                }));
            }

            if (userProfile.certificates && userProfile.certificates.length > 0) {
                certificates = userProfile.certificates.map((cert) => ({
                    name: cert.name,
                    link: cert.link,
                    date: cert.date,
                }));
            }

            if (userProfile.achievements && userProfile.achievements.length > 0) {
                achievements = userProfile.achievements.map((ach) => ({
                    title: ach.title,
                    description: ach.description,
                    date: ach.date,
                }));
            }

            skills = userProfile.skills || [];
            skillCats = {
                skillLanguages:   userProfile.skillLanguages   || "",
                skillFrontend:    userProfile.skillFrontend    || "",
                skillBackend:     userProfile.skillBackend     || "",
                skillCloudDevOps: userProfile.skillCloudDevOps || "",
                skillTools:       userProfile.skillTools       || "",
                skillCoreConcepts:userProfile.skillCoreConcepts|| "",
                skillSoft:        userProfile.skillSoft        || "",
            };
        }

        const newResume = new Resume({
            userId: user._id,
            title: title || "Untitled Resume",
            template: "general",   // default = LPU blue style
            personal_info: personalInfo,
            professional_summary: summary,
            section_order: ["experience", "projects", "achievements", "certificates", "skills", "education"],
            experience,
            education,
            project: projects,
            certificates,
            achievements,
            skills,
            ...skillCats,
        });

        await newResume.save();
        return res.status(200).json({
            message: "Resume Created & Auto-filled!",
            resume: newResume,
            resumeId: newResume._id,
        });
    } catch (error) {
        console.error("Create Resume Error:", error);
        return res.status(500).json({ message: error.message });
    }
};

// --- 2. Get All Resumes ---
export const getAllResumes = async (req, res) => {
    try {
        const { token } = req.query;
        const user = await User.findOne({ token });
        if (!user) return res.status(404).json({ message: "User not found" });

        const resumes = await Resume.find({ userId: user._id }).sort({ updatedAt: -1 });
        return res.json({ resumes });
    } catch (error) {
        return res.status(500).json({ message: error.message });
    }
};

// --- 3. Get Single Resume ---
export const getResumeById = async (req, res) => {
    try {
        const { token, resumeId } = req.query;
        const user = await User.findOne({ token });
        if (!user) return res.status(404).json({ message: "User not found" });

        const resume = await Resume.findOne({ _id: resumeId, userId: user._id });
        if (!resume) return res.status(404).json({ message: "Resume not found" });

        return res.json({ resume });
    } catch (error) {
        return res.status(500).json({ message: error.message });
    }
};

// --- 4. Delete Resume ---
export const deleteResume = async (req, res) => {
    try {
        const { token, resumeId } = req.body;
        const user = await User.findOne({ token });
        if (!user) return res.status(404).json({ message: "User not found" });

        const resume = await Resume.findOne({ _id: resumeId, userId: user._id });
        if (!resume) return res.status(404).json({ message: "Resume not found" });

        if (resume.personal_info?.image && resume.personal_info.image !== user.profilePicture) {
            await deleteFromCloudinary(resume.personal_info.image);
        }

        await Resume.deleteOne({ _id: resumeId });
        return res.json({ message: "Resume deleted" });
    } catch (error) {
        return res.status(500).json({ message: error.message });
    }
};

// --- 5. Update Resume ---
export const updateResume = async (req, res) => {
    try {
        const { token, resumeId, resumeData, removeBackground } = req.body;
        const user = await User.findOne({ token });
        if (!user) return res.status(404).json({ message: "User not found" });

        let parsedData = typeof resumeData === "string" ? JSON.parse(resumeData) : resumeData;

        const resume = await Resume.findOne({ _id: resumeId, userId: user._id });
        if (!resume) return res.status(404).json({ message: "Resume not found" });

        if (req.file) {
            if (
                resume.personal_info?.image &&
                !resume.personal_info.image.includes("default") &&
                !resume.personal_info.image.includes(user.profilePicture)
            ) {
                await deleteFromCloudinary(resume.personal_info.image);
            }
            if (!parsedData.personal_info) parsedData.personal_info = {};
            parsedData.personal_info.image = req.file.path;
        } else if (removeBackground === "yes") {
            if (!parsedData.personal_info) parsedData.personal_info = {};
            parsedData.personal_info.image = "";
        } else {
            if (parsedData.personal_info) {
                parsedData.personal_info.image = resume.personal_info?.image;
            }
        }

        parsedData.updatedAt = Date.now();
        Object.assign(resume, parsedData);

        resume.markModified("experience");
        resume.markModified("education");
        resume.markModified("project");
        resume.markModified("skills");
        resume.markModified("certificates");
        resume.markModified("achievements");
        resume.markModified("personal_info");
        resume.markModified("section_order");

        await resume.save();
        return res.json({ message: "Resume saved", resume });
    } catch (error) {
        console.error("Update Error:", error);
        return res.status(500).json({ message: error.message });
    }
};
