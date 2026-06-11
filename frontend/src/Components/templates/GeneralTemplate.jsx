import React from "react";

const DEFAULT_ORDER = ["experience","projects","achievements","certificates","skills","education"];

/* ─── Font size map ─────────────────────────────────────────────────────── */
const SIZE_MAP = {
    small:   { body: "8pt",   title: "8.5pt",  name: "16pt", lineH: "11.5px" },
    default: { body: "9pt",   title: "9.5pt",  name: "18pt", lineH: "13px"   },
    large:   { body: "10pt",  title: "10.5pt", name: "20pt", lineH: "14.5px" },
};

/* ─── Date helpers ──────────────────────────────────────────────────────── */
const fmt = (d) => {
    if (!d) return "";
    const p = d.split("-");
    if (p.length < 2) return d;
    const abbr = new Date(+p[0], +p[1] - 1).toLocaleString("en-US", { month: "short" });
    return `${abbr}' ${p[0].slice(2)}`;
};
const fmtRange = (s, e, cur, fb) => {
    const sf = fmt(s), ef = cur ? "Present" : fmt(e);
    if (sf && ef) return `${sf} – ${ef}`;
    return sf || ef || fb || "";
};
const cleanGpa = (v = "") => v.replace(/^(cgpa|gpa|percentage|%)\s*:?\s*/i, "").trim();

/* ─── Link — pure blue underlined text, no icon ────────────────────────── */
const L = ({ href, children }) =>
    href ? (
        <a href={href} target="_blank" rel="noreferrer"
            style={{ color: "#2E74B5", fontWeight: "bold", textDecoration: "underline",
                     fontFamily: "Arial, sans-serif", fontSize: "inherit" }}>
            {children}
        </a>
    ) : <>{children}</>;

/* ─── Section header: border on container = full-width underline ──────────
   marginTop  : breathing space ABOVE the section title
   paddingBottom + borderBottom : the underline itself
   marginBottom: breathing space BELOW the underline, before first item     */
const Hdr = ({ title, sz }) => (
    <div style={{
        borderBottom: "1px solid #BFBFBF",
        marginTop: "6px",
        paddingBottom: "3px",    // ← tiny gap between text and underline
        marginBottom: "1px",    // ← minimal gap after the line (before first item)
    }}>
        <span style={{
            fontFamily: "Arial, sans-serif",
            fontSize: sz.title,
            lineHeight: sz.lineH,
            fontWeight: "bold",
            color: "#2E74B5",
            textTransform: "uppercase",
            letterSpacing: "0.04em",
        }}>
            {title}
        </span>
    </div>
);

/* ─── Right-date row ────────────────────────────────────────────────────── */
// IMPORTANT: Always pass explicit sz.body for font size.
// fontSize:'inherit' does NOT propagate correctly in html2canvas and
// falls back to browser default (16px), making dates/places appear huge.
const DR = ({ left, right, bold = true, lh, fsz }) => (
    <div style={{ display: "flex", justifyContent: "space-between",
                  alignItems: "flex-start", lineHeight: lh || "13px" }}>
        <div style={{ flex: 1, minWidth: 0 }}>{left}</div>
        {right && (
            <div style={{ fontFamily: "Arial, sans-serif",
                          fontSize: fsz || "9pt",   // explicit — never inherit
                          fontWeight: bold ? "bold" : "normal",
                          whiteSpace: "nowrap", marginLeft: "10px",
                          flexShrink: 0, color: "#1a1a1a" }}>
                {right}
            </div>
        )}
    </div>
);

/* ─── Bullet ─────────────────────────────────────────────────────────────
   Flex approach: bullet column (fixed width) + text column (flex:1).
   This guarantees perfect alignment of wrapped lines in BOTH browser
   and html2canvas — no CSS text-indent tricks needed.                     */
const B = ({ text, sz }) => {
    if (!text) return null;
    const lines = text.split("\n")
        .map(l => l.replace(/^[-•*]\s*/, "").trim())
        .filter(Boolean);
    return (
        <>
            {lines.map((l, i) => (
                <div key={i} style={{
                    display: "flex",
                    alignItems: "flex-start",
                    marginBottom: "0",
                    lineHeight: sz.lineH,
                }}>
                    {/* Fixed-width bullet column — width matches one char at this font size */}
                    <span style={{
                        fontFamily: "Arial, sans-serif",
                        fontSize: sz.body,
                        flexShrink: 0,
                        width: "12px",
                        paddingTop: "0.5px",
                        color: "#1a1a1a",
                    }}>•</span>
                    {/* Text column — wraps and stays aligned */}
                    <span style={{
                        fontFamily: "Arial, sans-serif",
                        fontSize: sz.body,
                        color: "#1a1a1a",
                        flex: 1,
                        textAlign: "justify",
                    }}>{l}</span>
                </div>
            ))}
        </>
    );
};

/* ══════════════════════════════════════════════════════════════════════════ */
const LpuTemplate = ({ data, accentColor, fontSize = "default" }) => {
    const tc  = accentColor || "#2E74B5";
    const sz  = SIZE_MAP[fontSize] || SIZE_MAP.default;
    const ord = data.section_order?.length ? data.section_order : DEFAULT_ORDER;
    const FONT = "Arial, sans-serif";
    const body = { fontFamily: FONT, fontSize: sz.body, lineHeight: sz.lineH, color: "#1a1a1a" };
    const trim = u => (u || "").replace(/^https?:\/\/(www\.)?/, "").replace(/\/$/, "");

    /* ── Skills ───────────────────────────────────────────────────────────
       CRITICAL: Use flex rows NOT <table> — html2canvas ignores colgroup.
       Fixed 148px label column prevents "Databases & Cloud :" from wrapping. */
    const rSkills = () => {
        const rows = [
            ["Languages",         data.skillLanguages],
            ["Frontend",          data.skillFrontend  || data.skillFrameworks],
            ["Backend",           data.skillBackend],
            ["Databases & Cloud", data.skillCloudDevOps],
            ["Tools & Platforms", data.skillTools],
            ["Core Concepts",     data.skillCoreConcepts],
            ["Soft Skills",       data.skillSoft],
        ].filter(r => r[1]);
        if (!rows.length) return null;
        return (
            <div>
                <Hdr title="Skills" sz={sz} />
                {rows.map(([label, val], i) => (
                    <div key={i} style={{ display: "flex", alignItems: "flex-start",
                                          lineHeight: sz.lineH }}>
                        <div style={{ ...body, fontWeight: "bold", color: tc,
                                      width: "148px", minWidth: "148px",
                                      flexShrink: 0, whiteSpace: "nowrap" }}>
                            {label} :
                        </div>
                        <div style={{ ...body, flex: 1 }}>{val}</div>
                    </div>
                ))}
            </div>
        );
    };

    /* ── Internship ──────────────────────────────────────────────────────── */
    const rExp = () => {
        if (!data.experience?.length) return null;
        return (
            <div>
                <Hdr title="Internship" sz={sz} />
                {data.experience.map((e, i) => (
                    <div key={i} style={{ marginBottom: i < data.experience.length - 1 ? "4px" : 0 }}>
                        <DR lh={sz.lineH} fsz={sz.body}
                            left={
                                <span style={{ ...body, fontWeight: "bold", color: tc, fontSize: sz.title }}>
                                    {e.company}
                                    {e.cert_link && (
                                        <><span style={{ color: "#1a1a1a", fontWeight: "normal" }}> | </span>
                                        <L href={e.cert_link}>Internship Certificate</L></>
                                    )}
                                </span>
                            }
                            right={fmtRange(e.start_date, e.end_date, e.is_current, "")}
                        />
                        <div style={{ ...body, fontStyle: "italic" }}>{e.position}</div>
                        <B text={e.description} sz={sz} />
                        {e.tech_stack && (
                            <div style={body}>
                                <strong style={{ color: tc }}>Tech Stack: </strong>{e.tech_stack}
                            </div>
                        )}
                    </div>
                ))}
            </div>
        );
    };

    /* ── Projects ─────────────────────────────────────────────────────────── */
    const rProj = () => {
        if (!data.project?.length) return null;
        return (
            <div>
                <Hdr title="Projects" sz={sz} />
                {data.project.map((p, i) => (
                    <div key={i} style={{ marginBottom: i < data.project.length - 1 ? "4px" : 0 }}>
                        <DR lh={sz.lineH} fsz={sz.body}
                            left={
                                <span style={{ ...body, fontWeight: "bold", color: tc, fontSize: sz.title }}>
                                    {p.name}
                                    {p.link && (
                                        <><span style={{ color: "#1a1a1a", fontWeight: "normal" }}> | </span>
                                        <L href={p.link}>GitHub</L></>
                                    )}
                                    {p.live_link && (
                                        <><span style={{ color: "#1a1a1a", fontWeight: "normal" }}> | </span>
                                        <L href={p.live_link}>Live Demo</L></>
                                    )}
                                </span>
                            }
                            right={p.duration}
                        />
                        <B text={p.description} sz={sz} />
                        {p.tech_stack && (
                            <div style={body}>
                                <strong style={{ color: tc }}>Tech Stack: </strong>{p.tech_stack}
                            </div>
                        )}
                    </div>
                ))}
            </div>
        );
    };

    /* ── Achievements ─────────────────────────────────────────────────────── */
    const rAch = () => {
        if (!data.achievements?.length) return null;
        return (
            <div>
                <Hdr title="Achievements" sz={sz} />
                {data.achievements.map((a, i) => {
                    const ll = a.link?.toLowerCase().includes("leetcode") ? "LeetCode"
                        : a.link?.toLowerCase().includes("cert") ? "Certificate" : "Link";
                    return (
                        <DR key={i} lh={sz.lineH} fsz={sz.body}
                            left={
                                <div style={{ display: "flex", alignItems: "flex-start",
                                              lineHeight: sz.lineH }}>
                                    <span style={{ ...body, flexShrink: 0, width: "12px",
                                                   paddingTop: "0.5px" }}>•</span>
                                    <span style={{ ...body, flex: 1, textAlign: "justify" }}>
                                        {a.description || a.title}
                                        {a.link && (
                                            <><span style={{ color: "#1a1a1a" }}> | </span>
                                            <L href={a.link}>{ll}</L></>
                                        )}
                                    </span>
                                </div>
                            }
                            right={fmt(a.date) || a.date}
                        />
                    );
                })}
            </div>
        );
    };

    /* ── Certificates ─────────────────────────────────────────────────────── */
    const rCert = () => {
        if (!data.certificates?.length) return null;
        return (
            <div>
                <Hdr title="Certificates" sz={sz} />
                {data.certificates.map((c, i) => (
                    <DR key={i} lh={sz.lineH} fsz={sz.body}
                        left={
                            <span style={body}>
                                {c.name}
                                {c.link && (
                                    <><span style={{ color: "#1a1a1a" }}> | </span>
                                    <L href={c.link}>{c.issuer || "Certificate"}</L></>
                                )}
                            </span>
                        }
                        right={fmt(c.date) || c.date}
                    />
                ))}
            </div>
        );
    };

    /* ── Education ────────────────────────────────────────────────────────── */
    const rEdu = () => {
        if (!data.education?.length) return null;
        return (
            <div>
                <Hdr title="Education" sz={sz} />
                {data.education.map((e, i) => {
                    const gv = cleanGpa(e.gpa);
                    const isPct = (e.gpa || "").toLowerCase().includes("percent")
                               || (e.gpa || "").includes("%");
                    return (
                        <div key={i} style={{ marginBottom: i < data.education.length - 1 ? "2px" : 0 }}>
                            <DR lh={sz.lineH} fsz={sz.body}
                                left={<span style={{ ...body, fontWeight: "bold", color: tc }}>{e.institution}</span>}
                                right={e.location}
                                bold={false}
                            />
                            <DR lh={sz.lineH} fsz={sz.body}
                                left={
                                    <span style={{ ...body, fontStyle: "italic" }}>
                                        {e.degree}{e.field ? ` in ${e.field}` : ""}
                                        {gv && <> | <strong>{isPct ? "Percentage" : "CGPA"}: {gv}</strong></>}
                                    </span>
                                }
                                right={fmtRange(e.start_date, e.graduation_date, false, e.graduation_date)}
                            />
                        </div>
                    );
                })}
            </div>
        );
    };

    const R = { skills: rSkills, experience: rExp, projects: rProj,
                achievements: rAch, certificates: rCert, education: rEdu };

    /* ════════════════════════════════════════════════════════════════════ */
    return (
        <div style={{
            width: "100%",
            backgroundColor: "#fff",
            fontFamily: FONT,
            color: "#1a1a1a",
            padding: "0.5in 0.5in 0.45in 0.5in",
            boxSizing: "border-box",
        }}>
            {/* ── HEADER ─────────────────────────────────────────────── */}
            <div style={{ marginBottom: "5px" }}>
                <div style={{ fontFamily: FONT, fontSize: sz.name, fontWeight: "bold",
                              lineHeight: 1.1, color: "#000", marginBottom: "2px" }}>
                    {data.personal_info?.full_name || "YOUR NAME"}
                </div>
                <div style={{ display: "flex", justifyContent: "space-between",
                              alignItems: "flex-start" }}>
                    {/* Left: LinkedIn / GitHub / LeetCode */}
                    <div style={body}>
                        {data.personal_info?.linkedin && (
                            <div><strong>LinkedIn:</strong>{" "}<L href={data.personal_info.linkedin}>{trim(data.personal_info.linkedin)}</L></div>
                        )}
                        {data.personal_info?.github && (
                            <div><strong>GitHub:</strong>{" "}<L href={data.personal_info.github}>{trim(data.personal_info.github)}</L></div>
                        )}
                        {data.personal_info?.leetcode && (
                            <div><strong>LeetCode:</strong>{" "}<L href={data.personal_info.leetcode}>{trim(data.personal_info.leetcode)}</L></div>
                        )}
                    </div>
                    {/* Right: Email / Mobile */}
                    <div style={{ ...body, textAlign: "right" }}>
                        {data.personal_info?.email && (
                            <div><strong>Email:</strong>{" "}<L href={`mailto:${data.personal_info.email}`}>{data.personal_info.email}</L></div>
                        )}
                        {data.personal_info?.phone && (
                            <div><strong>Mobile:</strong> {data.personal_info.phone}</div>
                        )}
                    </div>
                </div>
            </div>

            {/* ── ORDERED SECTIONS ───────────────────────────────────── */}
            {ord.map(key => {
                const fn = R[key];
                return fn ? <div key={key}>{fn()}</div> : null;
            })}
        </div>
    );
};

export default LpuTemplate;
