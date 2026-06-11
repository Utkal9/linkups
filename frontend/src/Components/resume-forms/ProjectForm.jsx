import {
    Plus,
    Trash2,
    Calendar,
    Sparkles,
    X,
    AlertCircle,
    RefreshCw,
} from "lucide-react";
import React, { useState, useEffect } from "react";
import { createPortal } from "react-dom";

// Adjust this URL if your setup differs
const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:9090";

/**
 * Custom Modal Component (Portal Version)
 */
const CustomAlertModal = ({ isOpen, message, onClose }) => {
    const [mounted, setMounted] = useState(false);

    useEffect(() => {
        setMounted(true);
        return () => setMounted(false);
    }, []);

    useEffect(() => {
        if (isOpen) {
            document.body.style.overflow = "hidden";
        } else {
            document.body.style.overflow = "unset";
        }
        return () => {
            document.body.style.overflow = "unset";
        };
    }, [isOpen]);

    if (!mounted || !isOpen) return null;

    return createPortal(
        <div
            className="fixed inset-0 z-[99999] w-screen h-screen flex items-center justify-center bg-black/60 backdrop-blur-sm animate-fade-in p-4"
            onClick={onClose}
        >
            <div
                className="w-full max-w-sm p-6 rounded-xl border shadow-2xl relative flex flex-col items-center text-center space-y-4 transform transition-all scale-100"
                style={{
                    backgroundColor: "var(--holo-panel)",
                    borderColor: "var(--holo-border)",
                    color: "var(--text-primary)",
                }}
                onClick={(e) => e.stopPropagation()}
            >
                <div
                    className="p-3 rounded-full bg-opacity-10 mb-2"
                    style={{ backgroundColor: "var(--holo-glass)" }}
                >
                    <AlertCircle
                        className="w-8 h-8"
                        style={{ color: "var(--neon-violet)" }}
                    />
                </div>
                <p className="text-sm font-medium leading-relaxed">{message}</p>
                <button
                    onClick={onClose}
                    className="mt-4 px-6 py-2 text-sm font-semibold rounded-lg hover:opacity-90 transition-opacity w-full"
                    style={{
                        backgroundColor: "var(--neon-violet)",
                        color: "#fff",
                        boxShadow: "var(--glow-primary)",
                    }}
                >
                    Okay, got it
                </button>
                <button
                    onClick={onClose}
                    className="absolute top-3 right-3 p-1 rounded-full hover:bg-white/10 transition-colors"
                >
                    <X className="w-4 h-4 text-gray-400" />
                </button>
            </div>
        </div>,
        document.body
    );
};

const ProjectForm = ({ data, onChange, template = "general" }) => {
    const isGeneral = template === "general";
    const [loadingIndex, setLoadingIndex] = useState(null);
    const [alertState, setAlertState] = useState({
        isOpen: false,
        message: "",
    });

    const showAlert = (msg) => {
        setAlertState({ isOpen: true, message: msg });
    };

    const closeAlert = () => {
        setAlertState({ ...alertState, isOpen: false });
    };

    // Format "2025-09" → "Sep' 25"
    const formatMonthYear = (dateStr) => {
        if (!dateStr) return "";
        const parts = dateStr.split("-");
        if (parts.length < 2) return dateStr;
        const [year, month] = parts;
        const monthAbbr = new Date(parseInt(year), parseInt(month) - 1).toLocaleString(
            "en-US",
            { month: "short" }
        );
        return `${monthAbbr}' ${year.slice(2)}`;
    };

    const updateProjectDates = (index, field, value) => {
        const updated = [...data];
        updated[index] = { ...updated[index], [field]: value };
        // Auto-compute duration string from start + end dates
        const start = field === "proj_start" ? value : updated[index].proj_start || "";
        const end = field === "proj_end" ? value : updated[index].proj_end || "";
        const startFmt = formatMonthYear(start);
        const endFmt = formatMonthYear(end);
        if (startFmt && endFmt) {
            updated[index].duration = `${startFmt} – ${endFmt}`;
        } else if (startFmt) {
            updated[index].duration = startFmt;
        } else if (endFmt) {
            updated[index].duration = endFmt;
        }
        onChange(updated);
    };

    const addProject = () =>
        onChange([
            ...data,
            {
                name: "",
                type: "",
                description: "",
                tech_stack: "",
                link: "",
                live_link: "",
                duration: "",
                proj_start: "",
                proj_end: "",
            },
        ]);

    const removeProject = (index) =>
        onChange(data.filter((_, i) => i !== index));

    const updateProject = (index, field, value) => {
        const updated = [...data];
        updated[index] = { ...updated[index], [field]: value };
        onChange(updated);
    };

    const handleAIEnhance = async (index, project) => {
        if (!project.name) {
            showAlert(
                "Please enter a Project Name first so the AI knows what to focus on."
            );
            return;
        }

        if (!project.link && !project.description) {
            showAlert(
                "Please provide a GitHub link (recommended) OR a rough description for the AI to work with."
            );
            return;
        }

        setLoadingIndex(index);

        try {
            const res = await fetch(
                `${API_BASE_URL}/resume/ai/enhance-project`,
                {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                        projectName: project.name,
                        projectDescription: project.description, // Sending current description for regeneration
                        githubLink: project.link,
                    }),
                }
            );

            const responseData = await res.json();

            if (res.ok) {
                updateProject(
                    index,
                    "description",
                    responseData.enhancedContent
                );
            } else {
                showAlert(
                    responseData.message ||
                        "AI enhancement failed. Please try again."
                );
            }
        } catch (error) {
            console.error(error);
            showAlert("Something went wrong connecting to the AI service.");
        } finally {
            setLoadingIndex(null);
        }
    };

    return (
        <div className="space-y-6 animate-fade-in relative">
            <CustomAlertModal
                isOpen={alertState.isOpen}
                message={alertState.message}
                onClose={closeAlert}
            />

            <div className="flex items-center justify-between">
                <h3
                    className="text-lg font-semibold"
                    style={{ color: "var(--text-primary)" }}
                >
                    Projects
                </h3>
                <button
                    onClick={addProject}
                    className="flex items-center gap-1 px-3 py-1.5 text-sm border rounded-lg hover:brightness-110 transition-all"
                    style={{
                        borderColor: "var(--holo-border)",
                        color: "var(--neon-teal)",
                        backgroundColor: "var(--holo-glass)",
                    }}
                >
                    <Plus className="w-4 h-4" /> Add
                </button>
            </div>

            {data.map((project, index) => (
                <div
                    key={index}
                    className="p-5 border rounded-xl shadow-sm space-y-4"
                    style={{
                        backgroundColor: "var(--holo-panel)",
                        borderColor: "var(--holo-border)",
                    }}
                >
                    <div className="flex justify-between items-center">
                        <h4
                            className="font-medium"
                            style={{ color: "var(--text-primary)" }}
                        >
                            Project #{index + 1}
                        </h4>
                        <button
                            onClick={() => removeProject(index)}
                            className="text-red-500 hover:text-red-600 transition-colors"
                        >
                            <Trash2 className="w-4 h-4" />
                        </button>
                    </div>

                    <div className="grid md:grid-cols-2 gap-4">
                        <input
                            value={project.name || ""}
                            onChange={(e) =>
                                updateProject(index, "name", e.target.value)
                            }
                            placeholder="Project Name"
                            className="p-2 text-sm border rounded outline-none focus:ring-2"
                            style={{
                                backgroundColor: "var(--holo-bg)",
                                borderColor: "var(--holo-border)",
                                color: "var(--text-primary)",
                            }}
                        />

                        {/* General only: shows as second label on the project header line */}
                        {isGeneral && (
                            <input
                                value={project.type || ""}
                                onChange={(e) =>
                                    updateProject(index, "type", e.target.value)
                                }
                                placeholder="Project Type (e.g. Personal, Team)"
                                className="p-2 text-sm border rounded outline-none focus:ring-2"
                                style={{
                                    backgroundColor: "var(--holo-bg)",
                                    borderColor: "var(--holo-border)",
                                    color: "var(--text-primary)",
                                }}
                            />
                        )}
                    </div>

                    <div className="grid md:grid-cols-2 gap-4">
                        <input
                            value={project.link || ""}
                            onChange={(e) =>
                                updateProject(index, "link", e.target.value)
                            }
                            placeholder="GitHub Link"
                            className="p-2 text-sm border rounded outline-none focus:ring-2"
                            style={{
                                backgroundColor: "var(--holo-bg)",
                                borderColor: "var(--holo-border)",
                                color: "var(--text-primary)",
                            }}
                        />

                        <input
                            value={project.live_link || ""}
                            onChange={(e) =>
                                updateProject(index, "live_link", e.target.value)
                            }
                            placeholder="Live Demo Link"
                            className="p-2 text-sm border rounded outline-none focus:ring-2"
                            style={{
                                backgroundColor: "var(--holo-bg)",
                                borderColor: "var(--holo-border)",
                                color: "var(--text-primary)",
                            }}
                        />
                    </div>

                    {/* Duration — two month pickers auto-formatting to "Sep' 25 – Nov' 25" */}
                    <div>
                        <label className="text-xs font-medium mb-1.5 block" style={{ color: "var(--text-secondary)" }}>
                            Duration
                            {project.duration && (
                                <span className="ml-2 font-semibold" style={{ color: "var(--neon-teal)" }}>
                                    {project.duration}
                                </span>
                            )}
                        </label>
                        <div className="grid grid-cols-2 gap-3">
                            <div className="relative">
                                <Calendar className="absolute left-3 top-2.5 w-4 h-4 text-gray-400 pointer-events-none" />
                                <input
                                    type="month"
                                    value={project.proj_start || ""}
                                    onChange={(e) =>
                                        updateProjectDates(index, "proj_start", e.target.value)
                                    }
                                    className="w-full pl-10 py-2 text-sm border rounded outline-none focus:ring-2"
                                    style={{
                                        backgroundColor: "var(--holo-bg)",
                                        borderColor: "var(--holo-border)",
                                        color: "var(--text-primary)",
                                    }}
                                    title="Start Month"
                                />
                                <span className="text-xs block mt-0.5 pl-1" style={{ color: "var(--text-secondary)" }}>Start Month</span>
                            </div>
                            <div className="relative">
                                <Calendar className="absolute left-3 top-2.5 w-4 h-4 text-gray-400 pointer-events-none" />
                                <input
                                    type="month"
                                    value={project.proj_end || ""}
                                    onChange={(e) =>
                                        updateProjectDates(index, "proj_end", e.target.value)
                                    }
                                    className="w-full pl-10 py-2 text-sm border rounded outline-none focus:ring-2"
                                    style={{
                                        backgroundColor: "var(--holo-bg)",
                                        borderColor: "var(--holo-border)",
                                        color: "var(--text-primary)",
                                    }}
                                    title="End Month"
                                />
                                <span className="text-xs block mt-0.5 pl-1" style={{ color: "var(--text-secondary)" }}>End Month</span>
                            </div>
                        </div>
                    </div>

                    {/* AI Enhancement Section */}
                    <div className="relative space-y-2">
                        <div className="flex justify-between items-end">
                            <span className="text-xs text-gray-500 italic pb-1">
                                {project.link &&
                                project.link.toLowerCase().includes("github")
                                    ? "✨ AI will analyze your GitHub code to generate description."
                                    : "💡 For best results, add a GitHub link so AI can read your code."}
                            </span>

                            <button
                                onClick={() => handleAIEnhance(index, project)}
                                disabled={loadingIndex === index}
                                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-full transition-all hover:shadow-md hover:scale-105 active:scale-95"
                                style={{
                                    background:
                                        project.description &&
                                        project.description.length > 10
                                            ? "var(--holo-glass)" // Subtler style for Regenerate
                                            : "linear-gradient(90deg, #6366f1 0%, #a855f7 100%)",
                                    border:
                                        project.description &&
                                        project.description.length > 10
                                            ? "1px solid var(--neon-teal)"
                                            : "none",
                                    color:
                                        project.description &&
                                        project.description.length > 10
                                            ? "var(--neon-teal)"
                                            : "white",
                                    opacity: loadingIndex === index ? 0.7 : 1,
                                    cursor:
                                        loadingIndex === index
                                            ? "wait"
                                            : "pointer",
                                }}
                            >
                                {loadingIndex === index ? (
                                    "Generating..."
                                ) : (
                                    <>
                                        {/* Toggle Icon based on State */}
                                        {project.description &&
                                        project.description.length > 10 ? (
                                            <>
                                                <RefreshCw className="w-3 h-3" />{" "}
                                                Regenerate
                                            </>
                                        ) : (
                                            <>
                                                <Sparkles className="w-3 h-3" />{" "}
                                                AI Generate
                                            </>
                                        )}
                                    </>
                                )}
                            </button>
                        </div>

                        <textarea
                            rows={4}
                            value={project.description || ""}
                            onChange={(e) =>
                                updateProject(index, "description", e.target.value)
                            }
                            placeholder="Description (Bullet points — one per line)"
                            className="w-full p-2 text-sm border rounded resize-none outline-none focus:ring-2"
                            style={{
                                backgroundColor: "var(--holo-bg)",
                                borderColor: "var(--holo-border)",
                                color: "var(--text-primary)",
                            }}
                        />

                        {/* Tech Stack — shows as 'Tech Stack: ...' line in Specialized template */}
                        <input
                            value={project.tech_stack || ""}
                            onChange={(e) =>
                                updateProject(index, "tech_stack", e.target.value)
                            }
                            placeholder="Tech Stack (e.g. React.js, Node.js, MongoDB)"
                            className="w-full p-2 text-sm border rounded outline-none focus:ring-2"
                            style={{
                                backgroundColor: "var(--holo-bg)",
                                borderColor: "var(--holo-border)",
                                color: "var(--text-primary)",
                            }}
                        />
                    </div>
                </div>
            ))}
        </div>
    );
};
export default ProjectForm;
