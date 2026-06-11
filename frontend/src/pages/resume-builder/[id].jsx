import React, { useEffect, useState } from "react";
import { useRouter } from "next/router";
import Link from "next/link";
import { useSelector } from "react-redux";
import clientServer from "@/config";
import toast, { Toaster } from "react-hot-toast";
import {
    ArrowLeft,
    Briefcase,
    ChevronLeft,
    ChevronRight,
    Download,
    Eye,
    EyeOff,
    FileText,
    Folder,
    GraduationCap,
    Lock,
    Share2,
    Sparkles,
    User,
    Award,
    Trophy,
} from "lucide-react";

// Components
import PersonalInfoForm from "@/Components/resume-forms/PersonalInfoForm";
import ProfessionalSummaryForm from "@/Components/resume-forms/ProfessionalSummaryForm";
import ExperienceForm from "@/Components/resume-forms/ExperienceForm";
import EducationForm from "@/Components/resume-forms/EducationForm";
import ProjectForm from "@/Components/resume-forms/ProjectForm";
import SkillsForm from "@/Components/resume-forms/SkillsForm";
import CertificateForm from "@/Components/resume-forms/CertificateForm";
import AchievementForm from "@/Components/resume-forms/AchievementForm";
import ResumePreview from "@/Components/ResumePreview";
import TemplateSelector from "@/Components/TemplateSelector";
import ColorPicker from "@/Components/ColorPicker";
import SectionOrderPanel from "@/Components/SectionOrderPanel";
import FontSizePicker from "@/Components/FontSizePicker";

const DEFAULT_SECTION_ORDER = [
    "experience",
    "projects",
    "achievements",
    "certificates",
    "skills",
    "education",
];

// 8 sections — 5 required + 3 optional bonus
const REQUIRED_SECTIONS = ["personal", "skills", "projects", "education", "experience"];
const OPTIONAL_SECTIONS = ["certificates", "achievements", "summary"];
const TOTAL_SECTIONS = REQUIRED_SECTIONS.length + OPTIONAL_SECTIONS.length; // 8

export default function ResumeBuilder() {
    const router = useRouter();
    const { id } = router.query;
    const { token: authReduxToken } = useSelector((state) => state.auth);
    const getToken = () => authReduxToken || localStorage.getItem("token");

    const [resumeData, setResumeData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [activeSectionIndex, setActiveSectionIndex] = useState(0);
    const [removeBackground, setRemoveBackground] = useState(false);
    const [completion, setCompletion] = useState(0);
    const [isDownloading, setIsDownloading] = useState(false);
    const printRef = React.useRef(null);  // hidden A4 target for PDF capture

    const sections = [
        { id: "personal", name: "Personal", icon: User },
        { id: "skills", name: "Skills", icon: Sparkles },
        { id: "experience", name: "Experience", icon: Briefcase },
        { id: "projects", name: "Projects", icon: Folder },
        { id: "achievements", name: "Achievements", icon: Trophy },
        { id: "certificates", name: "Certificates", icon: Award },
        { id: "education", name: "Education", icon: GraduationCap },
        { id: "summary", name: "Summary", icon: FileText },
    ];

    const activeSection = sections[activeSectionIndex];

    // --- COMPLETION CALCULATION ---
    useEffect(() => {
        if (!resumeData) return;

        let filled = 0;

        // Required fields
        if (resumeData.personal_info?.full_name && resumeData.personal_info?.email) filled++;
        if (resumeData.skillLanguages || (resumeData.skills && resumeData.skills.length > 0)) filled++;
        if (resumeData.project?.length > 0) filled++;
        if (resumeData.education?.length > 0) filled++;
        if (resumeData.experience?.length > 0) filled++;

        // Optional bonus
        if (resumeData.certificates?.length > 0) filled++;
        if (resumeData.achievements?.length > 0) filled++;
        if (resumeData.professional_summary) filled++;

        setCompletion(Math.round((filled / TOTAL_SECTIONS) * 100));
    }, [resumeData]);

    // --- LOAD RESUME ---
    useEffect(() => {
        if (!id) return;
        const loadResume = async () => {
            try {
                const token = getToken();
                const { data } = await clientServer.get("/resume/get", {
                    params: { resumeId: id, token },
                });
                if (data.resume) {
                    // Ensure section_order is set
                    if (!data.resume.section_order || data.resume.section_order.length === 0) {
                        data.resume.section_order = [...DEFAULT_SECTION_ORDER];
                    }
                    // Migrate old template names to new 2-template system
                    if (data.resume.template === "lpu" || !data.resume.template) {
                        data.resume.template = "general";   // LPU style = General
                    }
                    if (["modern", "classic", "minimal", "minimal-image"].includes(data.resume.template)) {
                        data.resume.template = "specialized";  // centered = Specialized
                    }
                    setResumeData(data.resume);
                    document.title = data.resume.title;
                }
            } catch (error) {
                console.error(error);
            } finally {
                setLoading(false);
            }
        };
        loadResume();
    }, [id]);

    // --- SAVE RESUME ---
    const saveResume = async () => {
        try {
            const token = getToken();
            let updatedData = { ...resumeData };
            if (updatedData.personal_info) updatedData.personal_info = { ...updatedData.personal_info };

            const formData = new FormData();
            formData.append("resumeId", id);
            formData.append("token", token);

            if (
                updatedData.personal_info?.image &&
                typeof updatedData.personal_info.image === "object"
            ) {
                formData.append("image", updatedData.personal_info.image);
                delete updatedData.personal_info.image;
            }

            formData.append("resumeData", JSON.stringify(updatedData));
            if (removeBackground) formData.append("removeBackground", "yes");

            const { data } = await clientServer.post("/resume/update", formData);
            setResumeData(data.resume);
            toast.success("Saved successfully! ✅");
        } catch (error) {
            console.error("Save error:", error);
            toast.error("Save failed");
        }
    };

    // --- TOGGLE VISIBILITY ---
    const toggleVisibility = async () => {
        const newData = { ...resumeData, public: !resumeData.public };
        setResumeData(newData);
        try {
            const token = getToken();
            const formData = new FormData();
            formData.append("resumeId", id);
            formData.append("token", token);
            formData.append("resumeData", JSON.stringify({ public: newData.public }));
            await clientServer.post("/resume/update", formData);
            toast.success(`Resume is now ${newData.public ? "Public" : "Private"}`);
        } catch (e) {
            setResumeData({ ...resumeData, public: !newData.public });
            toast.error("Update failed");
        }
    };

    // --- DOWNLOAD PDF (pixel-perfect match to live preview) ---
    const downloadPdf = async () => {
        if (completion < 100) {
            toast.error("Fill all sections to reach 100% before downloading!");
            return;
        }
        if (!printRef.current) {
            toast.error("Preview not ready — please wait a moment.");
            return;
        }

        setIsDownloading(true);
        const toastId = toast.loading("Generating PDF...");
        try {
            const html2canvas = (await import("html2canvas")).default;
            const jsPDF = (await import("jspdf")).default;

            // Capture the full content of the hidden div (no height clipping)
            const canvas = await html2canvas(printRef.current, {
                scale: 2,                   // 2× for crisp output
                useCORS: true,
                allowTaint: true,
                logging: false,
                backgroundColor: "#ffffff",
                width: 794,
                // NO fixed height — capture whatever the template naturally produces
            });

            const imgData = canvas.toDataURL("image/jpeg", 0.98);

            const pdf = new jsPDF({
                orientation: "portrait",
                unit: "mm",
                format: "a4",  // 210mm × 297mm
            });

            // Scale to fit A4 width (210mm), preserve aspect ratio
            const pdfW = 210;
            const pdfH = (canvas.height / canvas.width) * pdfW;

            if (pdfH <= 297) {
                // Everything fits on 1 page — place at top
                pdf.addImage(imgData, "JPEG", 0, 0, pdfW, pdfH);
            } else {
                // Content taller than A4 — scale down to fit exactly 1 page
                pdf.addImage(imgData, "JPEG", 0, 0, pdfW, 297);
            }

            const name = (resumeData.personal_info?.full_name || "Resume").replace(/\s+/g, "_");
            pdf.save(`${name}_CV.pdf`);

            toast.success("PDF Downloaded! 🎉", { id: toastId });
        } catch (err) {
            console.error("PDF Error:", err);
            toast.error("PDF generation failed.", { id: toastId });
        } finally {
            setIsDownloading(false);
        }
    };

    // --- SECTION ORDER CHANGE ---
    const handleSectionOrderChange = (newOrder) => {
        setResumeData((prev) => ({ ...prev, section_order: newOrder }));
    };

    // --- COMPLETION COLOR ---
    const getCompletionColor = () => {
        if (completion >= 100) return "var(--neon-teal)";
        if (completion >= 60) return "#f59e0b";
        return "#ef4444";
    };

    if (loading || !resumeData)
        return (
            <div
                className="min-h-screen flex items-center justify-center font-sans"
                style={{ backgroundColor: "var(--holo-bg)", color: "var(--text-primary)" }}
            >
                <div
                    className="animate-spin rounded-full h-12 w-12 border-b-2"
                    style={{ borderColor: "var(--neon-teal)" }}
                ></div>
            </div>
        );

    return (
        <div
            className="min-h-screen font-sans transition-colors duration-300"
            style={{ backgroundColor: "var(--holo-bg)", color: "var(--text-primary)" }}
        >
            <Toaster
                position="bottom-center"
                toastOptions={{
                    style: {
                        background: "var(--holo-panel)",
                        color: "var(--text-primary)",
                        border: "1px solid var(--holo-border)",
                    },
                }}
            />

            <div className="max-w-7xl mx-auto px-4 py-6">
                <Link
                    href="/resume-builder"
                    className="inline-flex gap-2 items-center hover:opacity-80 transition-opacity"
                    style={{ color: "var(--text-secondary)" }}
                >
                    <ArrowLeft className="w-4 h-4" /> Back to Dashboard
                </Link>
            </div>

            <div className="max-w-7xl mx-auto px-4 pb-8">
                <div className="grid lg:grid-cols-12 gap-8">
                    {/* LEFT: EDITOR */}
                    <div className="relative lg:col-span-5 rounded-lg">
                        <div
                            className="rounded-lg shadow-sm border p-6 pt-1 sticky top-4"
                            style={{
                                backgroundColor: "var(--holo-panel)",
                                borderColor: "var(--holo-border)",
                            }}
                        >
                            {/* --- COMPLETION BAR --- */}
                            <div className="mb-6 mt-4">
                                <div className="flex justify-between items-center text-xs mb-1.5 font-medium">
                                    <span style={{ color: getCompletionColor() }}>
                                        Resume Completion
                                    </span>
                                    <span
                                        className="font-bold text-sm"
                                        style={{ color: getCompletionColor() }}
                                    >
                                        {completion}%
                                        {completion >= 100 && " ✅"}
                                    </span>
                                </div>
                                <div
                                    className="relative h-3 rounded-full overflow-hidden"
                                    style={{ backgroundColor: "rgba(128,128,128,0.2)" }}
                                >
                                    <div
                                        className="absolute top-0 left-0 h-full rounded-full transition-all duration-500 ease-out"
                                        style={{
                                            width: `${completion}%`,
                                            backgroundColor: getCompletionColor(),
                                        }}
                                    />
                                </div>

                                {/* Section progress dots */}
                                <div className="flex justify-between mt-2 px-1">
                                    {sections.map((sec, idx) => (
                                        <div
                                            key={sec.id}
                                            onClick={() => setActiveSectionIndex(idx)}
                                            className={`w-2 h-2 rounded-full cursor-pointer transition-all ${
                                                activeSectionIndex === idx ? "scale-150" : ""
                                            }`}
                                            style={{
                                                backgroundColor:
                                                    idx <= (completion / 100) * (sections.length - 1)
                                                        ? getCompletionColor()
                                                        : "var(--text-secondary)",
                                                opacity: activeSectionIndex === idx ? 1 : 0.5,
                                            }}
                                            title={sec.name}
                                        />
                                    ))}
                                </div>

                                {/* Required vs optional hint */}
                                {completion < 100 && (
                                    <p className="text-xs mt-2 opacity-60" style={{ color: "var(--text-secondary)" }}>
                                        {5 - Math.min(5, Math.round((completion / 100) * TOTAL_SECTIONS))} required section(s) remaining •{" "}
                                        {completion < 100 && "Download unlocks at 100%"}
                                    </p>
                                )}
                            </div>

                            {/* --- CONTROLS ROW --- */}
                            <div
                                className="flex justify-between items-center mb-6 border-b pb-4 gap-2 flex-wrap"
                                style={{ borderColor: "var(--holo-border)" }}
                            >
                                <div className="flex items-center gap-2 flex-wrap">
                                    <TemplateSelector
                                        selectedTemplate={resumeData.template || "specialized"}
                                        onChange={(t) =>
                                            setResumeData((p) => ({ ...p, template: t }))
                                        }
                                    />
                                    <ColorPicker
                                        selectedColor={resumeData.accent_color}
                                        onChange={(c) =>
                                            setResumeData((p) => ({ ...p, accent_color: c }))
                                        }
                                    />
                                    <FontSizePicker
                                        selectedSize={resumeData.font_size || "default"}
                                        onChange={(sz) =>
                                            setResumeData((p) => ({ ...p, font_size: sz }))
                                        }
                                    />
                                    <SectionOrderPanel
                                        sectionOrder={resumeData.section_order || DEFAULT_SECTION_ORDER}
                                        onChange={handleSectionOrderChange}
                                    />
                                </div>
                                <div className="flex items-center gap-1">
                                    <button
                                        onClick={() =>
                                            setActiveSectionIndex((p) => Math.max(p - 1, 0))
                                        }
                                        disabled={activeSectionIndex === 0}
                                        className="p-2 rounded-lg hover:bg-[var(--holo-bg)] disabled:opacity-30 transition-all"
                                        style={{ color: "var(--text-secondary)" }}
                                    >
                                        <ChevronLeft className="w-5 h-5" />
                                    </button>
                                    <button
                                        onClick={() =>
                                            setActiveSectionIndex((p) =>
                                                Math.min(p + 1, sections.length - 1)
                                            )
                                        }
                                        disabled={activeSectionIndex === sections.length - 1}
                                        className="p-2 rounded-lg hover:bg-[var(--holo-bg)] disabled:opacity-30 transition-all"
                                        style={{ color: "var(--text-secondary)" }}
                                    >
                                        <ChevronRight className="w-5 h-5" />
                                    </button>
                                </div>
                            </div>

                            {/* --- FORM CONTENT --- */}
                            <div className="min-h-[400px]">
                                <h2
                                    className="text-xl font-bold mb-1 flex items-center gap-2"
                                    style={{ color: "var(--text-primary)" }}
                                >
                                    {React.createElement(activeSection.icon, {
                                        className: "w-5 h-5",
                                        style: { color: "var(--neon-teal)" },
                                    })}
                                    {activeSection.name}
                                </h2>
                                <p className="text-sm mb-6" style={{ color: "var(--text-secondary)" }}>
                                    {REQUIRED_SECTIONS.includes(activeSection.id)
                                        ? "⚡ Required for download"
                                        : "✨ Optional — adds bonus to completion"}
                                </p>

                                {activeSection.id === "personal" && (
                                    <PersonalInfoForm
                                        data={resumeData.personal_info}
                                        onChange={(d) =>
                                            setResumeData((p) => ({ ...p, personal_info: d }))
                                        }
                                        removeBackground={removeBackground}
                                        setRemoveBackground={setRemoveBackground}
                                        template={resumeData.template || "general"}
                                    />
                                )}
                                {activeSection.id === "summary" && (
                                    <ProfessionalSummaryForm
                                        data={resumeData.professional_summary}
                                        onChange={(d) =>
                                            setResumeData((p) => ({
                                                ...p,
                                                professional_summary: d,
                                            }))
                                        }
                                        setResumeData={setResumeData}
                                    />
                                )}
                                {activeSection.id === "skills" && (
                                    <SkillsForm
                                        data={resumeData}
                                        onChange={(newData) => setResumeData(newData)}
                                        template={resumeData.template || "general"}
                                    />
                                )}
                                {activeSection.id === "experience" && (
                                    <ExperienceForm
                                        data={resumeData.experience}
                                        onChange={(d) =>
                                            setResumeData((p) => ({ ...p, experience: d }))
                                        }
                                        template={resumeData.template || "general"}
                                    />
                                )}
                                {activeSection.id === "education" && (
                                    <EducationForm
                                        data={resumeData.education}
                                        onChange={(d) =>
                                            setResumeData((p) => ({ ...p, education: d }))
                                        }
                                    />
                                )}
                                {activeSection.id === "projects" && (
                                    <ProjectForm
                                        data={resumeData.project}
                                        onChange={(d) =>
                                            setResumeData((p) => ({ ...p, project: d }))
                                        }
                                        template={resumeData.template || "general"}
                                    />
                                )}
                                {activeSection.id === "certificates" && (
                                    <CertificateForm
                                        data={resumeData.certificates || []}
                                        onChange={(d) =>
                                            setResumeData((p) => ({ ...p, certificates: d }))
                                        }
                                    />
                                )}
                                {activeSection.id === "achievements" && (
                                    <AchievementForm
                                        data={resumeData.achievements || []}
                                        onChange={(d) =>
                                            setResumeData((p) => ({ ...p, achievements: d }))
                                        }
                                    />
                                )}
                            </div>

                            <button
                                onClick={saveResume}
                                className="w-full mt-8 font-medium py-2.5 rounded-lg hover:shadow-lg transition-all flex items-center justify-center gap-2"
                                style={{ backgroundColor: "var(--neon-teal)", color: "#000" }}
                            >
                                <Share2 className="w-4 h-4" /> Save Changes
                            </button>
                        </div>
                    </div>

                    {/* RIGHT: PREVIEW */}
                    <div className="lg:col-span-7">
                        <div className="sticky top-4">
                            <div
                                className="p-3 rounded-lg shadow-sm border mb-4 flex items-center justify-between"
                                style={{
                                    backgroundColor: "var(--holo-panel)",
                                    borderColor: "var(--holo-border)",
                                }}
                            >
                                <div className="text-sm font-medium" style={{ color: "var(--text-secondary)" }}>
                                    Live Preview
                                </div>
                                <div className="flex gap-2">
                                    <button
                                        onClick={toggleVisibility}
                                        className="flex items-center gap-2 px-3 py-1.5 text-xs font-medium rounded-md border transition-colors"
                                        style={{
                                            borderColor: "var(--holo-border)",
                                            color: resumeData.public
                                                ? "var(--neon-teal)"
                                                : "var(--text-secondary)",
                                        }}
                                    >
                                        {resumeData.public ? (
                                            <Eye className="w-3 h-3" />
                                        ) : (
                                            <EyeOff className="w-3 h-3" />
                                        )}
                                        {resumeData.public ? "Public" : "Private"}
                                    </button>

                                    {/* DOWNLOAD BUTTON — locked until 100% */}
                                    <div className="relative group">
                                        <button
                                            onClick={downloadPdf}
                                            disabled={isDownloading || completion < 100}
                                            className="flex items-center gap-2 px-3 py-1.5 text-xs font-medium rounded-md transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
                                            style={{
                                                backgroundColor:
                                                    completion >= 100
                                                        ? "var(--neon-teal)"
                                                        : "var(--holo-bg)",
                                                color:
                                                    completion >= 100
                                                        ? "#000"
                                                        : "var(--text-secondary)",
                                                border:
                                                    completion < 100
                                                        ? "1px solid var(--holo-border)"
                                                        : "none",
                                            }}
                                        >
                                            {completion < 100 ? (
                                                <Lock className="w-3 h-3" />
                                            ) : (
                                                <Download className="w-3 h-3" />
                                            )}
                                            {isDownloading
                                                ? "Generating PDF..."
                                                : completion >= 100
                                                ? "Download PDF"
                                                : `${completion}% — Fill all sections`}
                                        </button>

                                        {/* Tooltip on hover when locked */}
                                        {completion < 100 && (
                                            <div
                                                className="absolute bottom-full right-0 mb-2 w-56 text-xs rounded-lg px-3 py-2 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-50"
                                                style={{
                                                    backgroundColor: "var(--holo-panel)",
                                                    border: "1px solid var(--holo-border)",
                                                    color: "var(--text-secondary)",
                                                }}
                                            >
                                                🔒 Complete all 8 sections (Personal, Skills, Projects, Education, Experience + 3 bonus) to unlock download.
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>

                            <ResumePreview
                                data={resumeData}
                                template={resumeData.template || "general"}
                                accentColor={resumeData.accent_color}
                                fontSize={resumeData.font_size || "default"}
                                printRef={printRef}
                            />
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
