import { Check, Layout } from "lucide-react";
import React, { useState } from "react";

// "General" = LPU blue-header style (your main format)
// "Specialized" = centered black-header format (alt format)
const templates = [
    {
        id: "general",
        name: "General",
        emoji: "⭐",
        description: "LPU-style — Blue headers, skills table, Tech Stack lines",
    },
    {
        id: "specialized",
        name: "Specialized",
        emoji: "📄",
        description: "Classic centered layout — black headers, traditional style",
    },
];

const TemplateSelector = ({ selectedTemplate, onChange }) => {
    const [isOpen, setIsOpen] = useState(false);
    const selected = templates.find((t) => t.id === selectedTemplate) || templates[0];

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
            >
                <Layout className="w-4 h-4" style={{ color: "var(--neon-blue)" }} />
                <span className="max-sm:hidden">
                    {selected.emoji} {selected.name}
                </span>
            </button>

            {isOpen && (
                <>
                    <div
                        className="fixed inset-0 z-10"
                        onClick={() => setIsOpen(false)}
                    />
                    <div
                        className="absolute top-full left-0 mt-2 w-64 border rounded-xl shadow-xl z-20 p-2 space-y-1"
                        style={{
                            backgroundColor: "var(--holo-panel)",
                            borderColor: "var(--holo-border)",
                        }}
                    >
                        <p
                            className="text-xs font-semibold uppercase px-2 py-1 opacity-60"
                            style={{ color: "var(--text-secondary)" }}
                        >
                            Choose Format
                        </p>
                        {templates.map((t) => (
                            <button
                                key={t.id}
                                onClick={() => {
                                    onChange(t.id);
                                    setIsOpen(false);
                                }}
                                className="w-full text-left px-3 py-2.5 rounded-lg flex items-start gap-3 transition-colors"
                                style={{
                                    backgroundColor:
                                        selectedTemplate === t.id
                                            ? "var(--holo-bg)"
                                            : "transparent",
                                    color:
                                        selectedTemplate === t.id
                                            ? "var(--neon-blue)"
                                            : "var(--text-primary)",
                                    border:
                                        selectedTemplate === t.id
                                            ? "1px solid var(--neon-blue)"
                                            : "1px solid transparent",
                                }}
                            >
                                <span className="text-lg leading-none mt-0.5">{t.emoji}</span>
                                <div className="flex-1 min-w-0">
                                    <div className="flex items-center justify-between">
                                        <span className="font-semibold text-sm">{t.name}</span>
                                        {selectedTemplate === t.id && (
                                            <Check className="w-3.5 h-3.5 flex-shrink-0" />
                                        )}
                                    </div>
                                    <p className="text-xs opacity-60 mt-0.5 leading-tight">
                                        {t.description}
                                    </p>
                                </div>
                            </button>
                        ))}
                    </div>
                </>
            )}
        </div>
    );
};

export default TemplateSelector;
