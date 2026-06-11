import React, { useState } from "react";
import { GripVertical, ChevronDown, ChevronUp, ListOrdered, Plus, EyeOff } from "lucide-react";

const SECTION_META = {
    experience:   { label: "Internship / Experience", emoji: "💼" },
    projects:     { label: "Projects",                 emoji: "🗂️" },
    achievements: { label: "Achievements",             emoji: "🏆" },
    certificates: { label: "Certificates",             emoji: "🎓" },
    skills:       { label: "Skills",                   emoji: "✨" },
    education:    { label: "Education",                emoji: "🎓" },
};

const ALL_SECTIONS = ["experience", "projects", "achievements", "certificates", "skills", "education"];
const DEFAULT_ORDER = [...ALL_SECTIONS];

const SectionOrderPanel = ({ sectionOrder = DEFAULT_ORDER, onChange }) => {
    const [isOpen, setIsOpen] = useState(false);
    const [draggedIdx, setDraggedIdx] = useState(null);
    const [dragOverIdx, setDragOverIdx] = useState(null);

    // Active = in sectionOrder | Hidden = in ALL_SECTIONS but not in sectionOrder
    const order  = sectionOrder.length > 0 ? sectionOrder : DEFAULT_ORDER;
    const hidden = ALL_SECTIONS.filter((s) => !order.includes(s));

    /* ─── Drag helpers ─────────────────────────────────────────────── */
    const handleDragStart = (e, idx) => {
        setDraggedIdx(idx);
        e.dataTransfer.effectAllowed = "move";
    };
    const handleDragOver = (e, idx) => {
        e.preventDefault();
        e.dataTransfer.dropEffect = "move";
        setDragOverIdx(idx);
    };
    const handleDrop = (e, dropIdx) => {
        e.preventDefault();
        if (draggedIdx === null || draggedIdx === dropIdx) {
            setDraggedIdx(null);
            setDragOverIdx(null);
            return;
        }
        const newOrder = [...order];
        const [removed] = newOrder.splice(draggedIdx, 1);
        newOrder.splice(dropIdx, 0, removed);
        onChange(newOrder);
        setDraggedIdx(null);
        setDragOverIdx(null);
    };
    const handleDragEnd = () => { setDraggedIdx(null); setDragOverIdx(null); };

    /* ─── Move up / down ───────────────────────────────────────────── */
    const moveUp = (idx) => {
        if (idx === 0) return;
        const newOrder = [...order];
        [newOrder[idx - 1], newOrder[idx]] = [newOrder[idx], newOrder[idx - 1]];
        onChange(newOrder);
    };
    const moveDown = (idx) => {
        if (idx === order.length - 1) return;
        const newOrder = [...order];
        [newOrder[idx], newOrder[idx + 1]] = [newOrder[idx + 1], newOrder[idx]];
        onChange(newOrder);
    };

    /* ─── Hide a section (remove from order) ──────────────────────── */
    const hideSection = (key) => onChange(order.filter((s) => s !== key));

    /* ─── Show a section (add back to end) ────────────────────────── */
    const showSection = (key) => onChange([...order, key]);

    /* ══════════════════════════════════════════════════════════════════ */
    return (
        <div className="relative">
            <button
                onClick={() => setIsOpen(!isOpen)}
                className="flex items-center gap-2 px-3 py-2 text-sm font-medium border rounded-lg transition-all"
                style={{
                    backgroundColor: "var(--holo-bg)",
                    borderColor: "var(--holo-border)",
                    color: "var(--text-primary)",
                }}
                title="Reorder / Show-Hide Sections"
            >
                <ListOrdered className="w-4 h-4" style={{ color: "var(--neon-teal)" }} />
                <span className="max-sm:hidden">Sections</span>
            </button>

            {isOpen && (
                <>
                    {/* backdrop */}
                    <div className="fixed inset-0 z-10" onClick={() => setIsOpen(false)} />

                    <div
                        className="absolute top-full left-0 mt-2 w-72 border rounded-xl shadow-xl z-20 p-3"
                        style={{
                            backgroundColor: "var(--holo-panel)",
                            borderColor: "var(--holo-border)",
                        }}
                    >
                        {/* ── ACTIVE SECTIONS ─── */}
                        <p className="text-xs font-semibold uppercase px-1 pb-2 opacity-60"
                            style={{ color: "var(--text-secondary)" }}>
                            Drag to reorder · ✕ to hide
                        </p>

                        <div className="space-y-1">
                            {order.map((sectionKey, idx) => {
                                const meta = SECTION_META[sectionKey];
                                if (!meta) return null;
                                const isDragging  = draggedIdx === idx;
                                const isDragOver  = dragOverIdx === idx;

                                return (
                                    <div
                                        key={sectionKey}
                                        draggable
                                        onDragStart={(e) => handleDragStart(e, idx)}
                                        onDragOver={(e)  => handleDragOver(e, idx)}
                                        onDrop={(e)      => handleDrop(e, idx)}
                                        onDragEnd={handleDragEnd}
                                        className="flex items-center gap-2 px-2 py-2 rounded-lg cursor-grab active:cursor-grabbing transition-all select-none"
                                        style={{
                                            backgroundColor: isDragOver
                                                ? "var(--holo-glass)"
                                                : isDragging
                                                ? "var(--holo-bg)"
                                                : "transparent",
                                            border: isDragOver
                                                ? "1px dashed var(--neon-teal)"
                                                : "1px solid transparent",
                                            opacity: isDragging ? 0.5 : 1,
                                        }}
                                    >
                                        <GripVertical
                                            className="w-4 h-4 flex-shrink-0"
                                            style={{ color: "var(--text-secondary)" }}
                                        />
                                        <span className="text-base leading-none">{meta.emoji}</span>
                                        <span
                                            className="flex-1 text-sm font-medium"
                                            style={{ color: "var(--text-primary)" }}
                                        >
                                            {meta.label}
                                        </span>

                                        {/* Move up/down */}
                                        <div className="flex flex-col gap-0.5 flex-shrink-0">
                                            <button
                                                onClick={() => moveUp(idx)}
                                                disabled={idx === 0}
                                                className="p-0.5 rounded hover:bg-[var(--holo-glass)] disabled:opacity-20 transition-colors"
                                                style={{ color: "var(--text-secondary)" }}
                                            >
                                                <ChevronUp className="w-3.5 h-3.5" />
                                            </button>
                                            <button
                                                onClick={() => moveDown(idx)}
                                                disabled={idx === order.length - 1}
                                                className="p-0.5 rounded hover:bg-[var(--holo-glass)] disabled:opacity-20 transition-colors"
                                                style={{ color: "var(--text-secondary)" }}
                                            >
                                                <ChevronDown className="w-3.5 h-3.5" />
                                            </button>
                                        </div>

                                        {/* Hide button — removes from order / preview */}
                                        <button
                                            onClick={() => hideSection(sectionKey)}
                                            title="Hide from resume"
                                            className="p-1 rounded hover:bg-red-500/10 transition-colors flex-shrink-0"
                                            style={{ color: "#ef4444" }}
                                        >
                                            <EyeOff className="w-3.5 h-3.5" />
                                        </button>
                                    </div>
                                );
                            })}
                        </div>

                        {/* ── HIDDEN SECTIONS ─── */}
                        {hidden.length > 0 && (
                            <>
                                <div
                                    className="border-t mt-3 pt-3"
                                    style={{ borderColor: "var(--holo-border)" }}
                                >
                                    <p className="text-xs font-semibold uppercase px-1 pb-2 opacity-50"
                                        style={{ color: "var(--text-secondary)" }}>
                                        Hidden — click + to restore
                                    </p>
                                    <div className="space-y-1">
                                        {hidden.map((key) => {
                                            const meta = SECTION_META[key];
                                            if (!meta) return null;
                                            return (
                                                <div
                                                    key={key}
                                                    className="flex items-center gap-2 px-2 py-1.5 rounded-lg opacity-50"
                                                >
                                                    <span className="text-base leading-none">{meta.emoji}</span>
                                                    <span
                                                        className="flex-1 text-sm line-through"
                                                        style={{ color: "var(--text-secondary)" }}
                                                    >
                                                        {meta.label}
                                                    </span>
                                                    <button
                                                        onClick={() => showSection(key)}
                                                        title="Add back to resume"
                                                        className="p-1 rounded hover:bg-[var(--holo-glass)] transition-colors"
                                                        style={{ color: "var(--neon-teal)" }}
                                                    >
                                                        <Plus className="w-3.5 h-3.5" />
                                                    </button>
                                                </div>
                                            );
                                        })}
                                    </div>
                                </div>
                            </>
                        )}

                        <p className="text-xs mt-3 px-1 opacity-50"
                            style={{ color: "var(--text-secondary)" }}>
                            Sections order and visibility reflected in preview & PDF.
                        </p>
                    </div>
                </>
            )}
        </div>
    );
};

export default SectionOrderPanel;
