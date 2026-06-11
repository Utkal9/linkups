import React, { useRef, useEffect, useState } from "react";
import GeneralTemplate from "./templates/GeneralTemplate";
import SpecializedTemplate from "./templates/SpecializedTemplate";

// "general"     → LPU blue-header (user's main format)
// "specialized" → Centered black-header Calibri
const ResumePreview = ({ data, template, accentColor, fontSize = "default", printRef }) => {
    const wrapperRef = useRef(null);
    const [scale, setScale] = useState(1);

    // A4 at 96 DPI = 794 × 1123px  (210mm × 297mm)
    const A4_W = 794;
    const A4_H = 1123;

    useEffect(() => {
        const update = () => {
            if (wrapperRef.current) {
                const w = wrapperRef.current.offsetWidth;
                setScale(w / A4_W);
            }
        };
        update();
        const ro = new ResizeObserver(update);
        if (wrapperRef.current) ro.observe(wrapperRef.current);
        return () => ro.disconnect();
    }, []);

    const renderTemplate = () => {
        switch (template) {
            case "specialized":
                return <SpecializedTemplate data={data} accentColor={accentColor} fontSize={fontSize} />;
            case "general":
            default:
                return <GeneralTemplate data={data} accentColor={accentColor} fontSize={fontSize} />;
        }
    };

    return (
        <>
            {/* ---- VISIBLE SCALED PREVIEW ---- */}
            <div
                ref={wrapperRef}
                style={{
                    width: "100%",
                    height: `${A4_H * scale}px`,
                    position: "relative",
                    overflow: "hidden",
                    borderRadius: "4px",
                    boxShadow: "0 4px 24px rgba(0,0,0,0.18)",
                }}
            >
                <div
                    id="resume-preview"
                    style={{
                        width: `${A4_W}px`,
                        height: `${A4_H}px`,
                        transformOrigin: "top left",
                        transform: `scale(${scale})`,
                        backgroundColor: "#fff",
                        overflow: "hidden",
                    }}
                >
                    {renderTemplate()}
                </div>
            </div>

            {/* ---- HIDDEN FULL-SIZE TARGET FOR PDF CAPTURE ----
                794px wide, natural height (NO overflow clip).
                html2canvas captures this at full resolution.    */}
            <div
                ref={printRef}
                aria-hidden="true"
                style={{
                    position: "fixed",
                    top: 0,
                    left: "-9999px",
                    width: `${A4_W}px`,
                    // No fixed height — let content flow naturally so nothing is clipped
                    backgroundColor: "#fff",
                    pointerEvents: "none",
                    zIndex: -1,
                }}
            >
                {renderTemplate()}
            </div>
        </>
    );
};

export default ResumePreview;
