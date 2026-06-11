import mongoose from "mongoose";

const ResumeSchema = new mongoose.Schema({
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        required: true,
    },
    title: { type: String, required: true },
    // Only 2 templates: "general" or "specialized"
    template: { type: String, default: "specialized" },
    accent_color: { type: String, default: "#2E74B5" },
    font_size: { type: String, default: "default" }, // "small" | "default" | "large"
    public: { type: Boolean, default: false },

    // User-controlled section order for both preview and DOCX
    // Possible values: "experience", "projects", "achievements", "certificates", "skills", "education"
    section_order: {
        type: [String],
        default: ["experience", "projects", "achievements", "certificates", "skills", "education"],
    },

    // 1. Personal Info
    personal_info: {
        full_name: { type: String, default: "" },
        email: { type: String, default: "" },
        phone: { type: String, default: "" },
        location: { type: String, default: "" },
        website: { type: String, default: "" },
        linkedin: { type: String, default: "" },
        github: { type: String, default: "" },
        leetcode: { type: String, default: "" },
        profession: { type: String, default: "" },
        image: { type: String, default: "" },
    },

    // 2. Summary
    professional_summary: { type: String, default: "" },

    // 3a. Skills — GENERAL template only (7 rows)
    skillLanguages:    { type: String, default: "" }, // Languages
    skillFrontend:     { type: String, default: "" }, // Frontend
    skillBackend:      { type: String, default: "" }, // Backend
    skillCloudDevOps:  { type: String, default: "" }, // Databases & Cloud
    skillTools:        { type: String, default: "" }, // Tools & Platforms
    skillCoreConcepts: { type: String, default: "" }, // Core Concepts
    skillSoft:         { type: String, default: "" }, // Soft Skills
    skills: [{ type: String }], // kept for profile import backward compatibility

    // 3b. Skills — SPECIALIZED template only (3 rows — completely separate fields)
    specLanguages:      { type: String, default: "" }, // Languages
    specTechFrameworks: { type: String, default: "" }, // Technologies / Frameworks
    specDomainSkills:   { type: String, default: "" }, // Domain Skills

    // 4. Experience / Internship
    experience: [
        {
            company: { type: String, default: "" },
            position: { type: String, default: "" },
            start_date: { type: String, default: "" },
            end_date: { type: String, default: "" },
            description: { type: String, default: "" },
            location: { type: String, default: "" },
            tech_stack: { type: String, default: "" },    // Tech stack used in internship
            cert_link: { type: String, default: "" },     // Certificate link for internship
            is_current: { type: Boolean, default: false },
        },
    ],

    // 5. Education
    education: [
        {
            institution: { type: String, default: "" },
            degree: { type: String, default: "" },
            field: { type: String, default: "" },
            start_date: { type: String, default: "" },    // NEW: separate start date
            graduation_date: { type: String, default: "" },
            gpa: { type: String, default: "" },
            location: { type: String, default: "" },
        },
    ],

    // 6. Projects
    project: [
        {
            name: { type: String, default: "" },
            type: { type: String, default: "" },
            description: { type: String, default: "" },
            tech_stack: { type: String, default: "" },    // "Tech Stack:" line in Specialized
            link: { type: String, default: "" },
            live_link: { type: String, default: "" },
            duration: { type: String, default: "" },      // e.g. "Sep' 25 – Nov' 25"
            proj_start: { type: String, default: "" },   // raw month picker value e.g. "2025-09"
            proj_end: { type: String, default: "" },     // raw month picker value e.g. "2025-11"
        },
    ],

    // 7. Certificates
    certificates: [
        {
            name: { type: String, default: "" },
            issuer: { type: String, default: "" },        // NEW: certificate issuer/provider
            link: { type: String, default: "" },
            date: { type: String, default: "" },
        },
    ],

    // 8. Achievements
    achievements: [
        {
            title: { type: String, default: "" },
            description: { type: String, default: "" },
            link: { type: String, default: "" },
            date: { type: String, default: "" },
        },
    ],

    createdAt: { type: Date, default: Date.now },
    updatedAt: { type: Date, default: Date.now },
});

const Resume = mongoose.model("Resume", ResumeSchema);
export default Resume;
