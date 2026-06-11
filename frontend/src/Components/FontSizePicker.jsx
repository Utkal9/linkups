import React, { useState } from "react";
import { Type } from "lucide-react";

const SIZE_OPTIONS = [
    { id: "small",   label: "Small",   pt: "8pt",  hint: "Fits more content" },
    { id: "default", label: "Default", pt: "9pt",  hint: "Standard size" },
    { id: "large",   label: "Large",   pt: "10pt", hint: "Spacious layout" },
];

const FontSizePicker = ({ selectedSize = "default", onChange }) => {
    const [open, setOpen] = useState(false);
    const current = SIZE_OPTIONS.find(s => s.id === selectedSize) || SIZE_OPTIONS[1];

    return (
        <div className="relative">
            <button
                onClick={() => setOpen(o => !o)}
                title="Font Size"
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg border transition-all"
                style={{
                    backgroundColor: "var(--holo-panel)",
                    borderColor: "var(--holo-border)",
                    color: "var(--text-primary)",
                }}
            >
                <Type className="w-3.5 h-3.5" />
                <span>Aa</span>
                <span style={{ color: "var(--text-secondary)" }}>{current.pt}</span>
            </button>

            {open && (
                <>
                    {/* Backdrop */}
                    <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
                    {/* Dropdown */}
                    <div
                        className="absolute left-0 top-full mt-1 z-50 rounded-xl overflow-hidden shadow-xl border"
                        style={{
                            backgroundColor: "var(--holo-panel)",
                            borderColor: "var(--holo-border)",
                            minWidth: "160px",
                        }}
                    >
                        {SIZE_OPTIONS.map(opt => (
                            <button
                                key={opt.id}
                                onClick={() => { onChange(opt.id); setOpen(false); }}
                                className="w-full flex items-center justify-between px-3 py-2 text-xs transition-colors hover:bg-white/5"
                                style={{
                                    color: opt.id === selectedSize ? "var(--neon-teal)" : "var(--text-primary)",
                                    backgroundColor: opt.id === selectedSize ? "rgba(0,255,200,0.06)" : "transparent",
                                }}
                            >
                                <div className="flex items-center gap-2">
                                    <span
                                        className="font-bold"
                                        style={{ fontSize: opt.pt, lineHeight: 1 }}
                                    >
                                        Aa
                                    </span>
                                    <span className="font-medium">{opt.label}</span>
                                </div>
                                <span style={{ color: "var(--text-secondary)", fontSize: "10px" }}>
                                    {opt.pt}
                                </span>
                            </button>
                        ))}
                        <div
                            className="px-3 py-2 text-xs border-t"
                            style={{ color: "var(--text-secondary)", borderColor: "var(--holo-border)" }}
                        >
                            💡 Small = more content fits
                        </div>
                    </div>
                </>
            )}
        </div>
    );
};

export default FontSizePicker;
