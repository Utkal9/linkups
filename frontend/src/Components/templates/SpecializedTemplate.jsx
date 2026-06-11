import React from "react";

const DEFAULT_ORDER = ["experience", "projects", "achievements", "certificates", "skills", "education"];

/* ─── Font size map — Calibri sizing ───────────────────────────────────── */
const SIZE_MAP = {
    small:   { body: "8pt",   title: "9pt",   name: "16pt", sec: "10pt",  lineH: "11.5px" },
    default: { body: "9pt",   title: "10pt",  name: "18pt", sec: "11pt",  lineH: "13px"   },
    large:   { body: "10pt",  title: "11pt",  name: "20pt", sec: "12pt",  lineH: "14.5px" },
};

const FONT = "Calibri, 'Trebuchet MS', sans-serif";

/* ─── Date helpers ─────────────────────────────────────────────────────── */
const fmtFull = (d) => {
    if (!d) return "";
    const p = d.split("-");
    if (p.length < 2) return d;
    const abbr = new Date(+p[0], +p[1] - 1).toLocaleString("en-US", { month: "short" });
    return `${abbr} ${p[0]}`;
};
const fmtRange = (s, e, cur, fb) => {
    const sf = fmtFull(s), ef = cur ? "Present" : fmtFull(e);
    if (sf && ef) return `${sf}  -  ${ef}`;
    return sf || ef || fb || "";
};
const cleanGpa = (v = "") => v.replace(/^(cgpa|gpa|percentage|%)\s*:?\s*/i, "").trim();
const trimUrl  = (u = "") => u.replace(/^https?:\/\/(www\.)?/, "").replace(/\/$/, "");

/* ─── Section header ───────────────────────────────────────────────────── */
const Hdr = ({ title, sz }) => (
    <div style={{ borderBottom: "1.5px solid #000", marginTop: "8px",
                  paddingBottom: "5px", marginBottom: "2px" }}>
        <span style={{ fontFamily: FONT, fontSize: sz.sec, fontWeight: "bold", color: "#000" }}>
            {title}
        </span>
    </div>
);

/* ─── Right-date row ───────────────────────────────────────────────────── */
const DR = ({ left, right, sz, bold = true }) => (
    <div style={{ display: "flex", justifyContent: "space-between",
                  alignItems: "flex-start", lineHeight: sz.lineH }}>
        <div style={{ flex: 1, minWidth: 0 }}>{left}</div>
        {right && (
            <div style={{ fontFamily: FONT, fontSize: sz.body, fontWeight: bold ? "bold" : "normal",
                          whiteSpace: "nowrap", marginLeft: "12px", flexShrink: 0, color: "#000" }}>
                {right}
            </div>
        )}
    </div>
);

/* ─── Regular bullet (description lines) ──────────────────────────────── */
const Bullet = ({ text, sz }) => {
    if (!text) return null;
    return (
        <>
            {text.split("\n")
                .map(l => l.replace(/^[-•*]\s*/, "").trim())
                .filter(Boolean)
                .map((l, i) => (
                    <div key={i} style={{ display: "flex", alignItems: "flex-start",
                                          lineHeight: sz.lineH }}>
                        <span style={{ fontFamily: FONT, fontSize: sz.body, flexShrink: 0,
                                       width: "14px", paddingTop: "0.5px", color: "#000" }}>•</span>
                        <span style={{ fontFamily: FONT, fontSize: sz.body, color: "#1a1a1a",
                                       flex: 1, textAlign: "justify" }}>{l}</span>
                    </div>
                ))}
        </>
    );
};

/* ─── Bullet link row — bold black non-underlined URL ─────────────────────
   Used for: Certificate Link / Repository Link / Live Demo               */
const BulletLink = ({ label, href, url, sz }) => (
    <div style={{ display: "flex", alignItems: "flex-start", lineHeight: sz.lineH }}>
        <span style={{ fontFamily: FONT, fontSize: sz.body, flexShrink: 0,
                       width: "14px", paddingTop: "0.5px", color: "#000" }}>•</span>
        <span style={{ fontFamily: FONT, fontSize: sz.body, color: "#000" }}>
            {label}{" "}
            <a href={href} target="_blank" rel="noreferrer"
               style={{ fontFamily: FONT, fontSize: sz.body, fontWeight: "bold",
                        color: "#000", textDecoration: "none" }}>
                {url}
            </a>
        </span>
    </div>
);

/* ─── Icon contact item ─────────────────────────────────────────────────── */
const ContactItem = ({ icon, href, text, sz, underline = true }) => {
    const inner = (
        <span style={{ display: "inline-flex", alignItems: "center", gap: "4px",
                       fontFamily: FONT, fontSize: sz.body, color: "#000" }}>
            <span style={{ fontSize: "10pt", fontWeight: "bold", color: "#000" }}>{icon}</span>
            <span style={{ textDecoration: underline ? "underline" : "none" }}>{text}</span>
        </span>
    );
    if (!href) return inner;
    return (
        <a href={href} target="_blank" rel="noreferrer"
           style={{ color: "#000", textDecoration: "none" }}>
            {inner}
        </a>
    );
};

/* ══════════════════════════════════════════════════════════════════════════ */
const SpecializedTemplate = ({ data, fontSize = "default" }) => {
    const sz    = SIZE_MAP[fontSize] || SIZE_MAP.default;
    const p     = data.personal_info || {};
    const order = data.section_order?.length ? data.section_order : DEFAULT_ORDER;
    const body  = { fontFamily: FONT, fontSize: sz.body, lineHeight: sz.lineH, color: "#1a1a1a" };

    /* ── Skills — reads from SPECIALIZED-ONLY fields (spec*) ────────────
       specLanguages, specTechFrameworks, specDomainSkills
       These are 100% separate from General's skillLanguages, skillFrontend etc. */
    const rSkills = () => {
        // Fallback to placeholder data if completely empty so the user sees the section
        const useFallback = !data.specLanguages && !data.specTechFrameworks && !data.specDomainSkills;
        
        const rows = useFallback ? [
            ["Languages", "C++, JavaScript (ES6+), Python, Java, C, SQL"],
            ["Technologies/Frameworks", "Next.js, React.js, Node.js, Express.js, HTML, CSS, Tailwind CSS, Bootstrap, Git/GitHub"],
            ["Domain Skills", "Data Structures and Algorithms, Problem-Solving, Responsive Web Design"],
        ] : [
            ["Languages",               data.specLanguages],
            ["Technologies/Frameworks", data.specTechFrameworks],
            ["Domain Skills",           data.specDomainSkills],
        ].filter(r => r[1]);
        if (!rows.length) return null;
        return (
            <div>
                <Hdr title="Skills" sz={sz} />
                {rows.map(([label, val], i) => (
                    <div key={i} style={{ ...body, marginBottom: "1px" }}>
                        <strong style={{ color: "#000" }}>{label}: </strong>{val}
                    </div>
                ))}
            </div>
        );
    };

    /* ── Internship ─────────────────────────────────────────────────────── */
    const rExp = () => {
        if (!data.experience?.length) return null;
        return (
            <div>
                <Hdr title="Internship" sz={sz} />
                {data.experience.map((e, i) => (
                    <div key={i} style={{ marginBottom: i < data.experience.length - 1 ? "5px" : 0 }}>
                        {/* Position | Tech Stack → Date */}
                        <DR sz={sz}
                            left={
                                <span style={{ ...body, fontWeight: "bold", fontSize: sz.title, color: "#000" }}>
                                    {e.position}
                                    {e.tech_stack && (
                                        <span style={{ fontWeight: "normal", fontSize: sz.body }}>
                                            {" | "}{e.tech_stack}
                                        </span>
                                    )}
                                </span>
                            }
                            right={fmtRange(e.start_date, e.end_date, e.is_current, "")}
                        />
                        {/* Company (Location) — italic */}
                        <div style={{ ...body, fontStyle: "italic", color: "#333" }}>
                            {e.company}{e.location ? ` (${e.location})` : ""}
                        </div>
                        {/* Description bullets */}
                        <Bullet text={e.description} sz={sz} />
                        {/* Certificate Link — as bullet, bold black non-underlined */}
                        {e.cert_link && (
                            <BulletLink
                                label="Certificate Link:"
                                href={e.cert_link}
                                url={trimUrl(e.cert_link)}
                                sz={sz}
                            />
                        )}
                    </div>
                ))}
            </div>
        );
    };

    /* ── Projects ───────────────────────────────────────────────────────── */
    const rProj = () => {
        if (!data.project?.length) return null;
        return (
            <div>
                <Hdr title="Projects" sz={sz} />
                {data.project.map((proj, i) => (
                    <div key={i} style={{ marginBottom: i < data.project.length - 1 ? "5px" : 0 }}>
                        {/* Name | tech_stack → Date */}
                        <DR sz={sz}
                            left={
                                <span style={{ ...body, fontWeight: "bold", fontSize: sz.title, color: "#000" }}>
                                    {proj.name}
                                    {proj.tech_stack && (
                                        <span style={{ fontWeight: "normal", fontSize: sz.body }}>
                                            {" | "}{proj.tech_stack}
                                        </span>
                                    )}
                                </span>
                            }
                            right={proj.duration}
                        />
                        {/* Description bullets */}
                        <Bullet text={proj.description} sz={sz} />
                        {/* Repository Link — as bullet, bold black non-underlined */}
                        {proj.link && (
                            <BulletLink
                                label="Repository Link:"
                                href={proj.link}
                                url={trimUrl(proj.link)}
                                sz={sz}
                            />
                        )}
                        {/* Live Demo — as bullet, bold black non-underlined */}
                        {proj.live_link && (
                            <BulletLink
                                label="Live Demo:"
                                href={proj.live_link}
                                url={trimUrl(proj.live_link)}
                                sz={sz}
                            />
                        )}
                    </div>
                ))}
            </div>
        );
    };

    /* ── Achievements ───────────────────────────────────────────────────── */
    const rAch = () => {
        if (!data.achievements?.length) return null;
        return (
            <div>
                <Hdr title="Achievements" sz={sz} />
                {data.achievements.map((a, i) => (
                    <DR key={i} sz={sz}
                        left={
                            <div style={{ display: "flex", alignItems: "flex-start", lineHeight: sz.lineH }}>
                                <span style={{ ...body, flexShrink: 0, width: "14px" }}>•</span>
                                <span style={{ ...body, flex: 1, textAlign: "justify" }}>
                                    <strong>{a.title}</strong>
                                    {a.description && <> — {a.description}</>}
                                    {a.link && (
                                        <> | <a href={a.link} target="_blank" rel="noreferrer"
                                               style={{ fontFamily: FONT, fontSize: sz.body,
                                                        fontWeight: "bold", color: "#000",
                                                        textDecoration: "none" }}>
                                                Link
                                              </a></>
                                    )}
                                </span>
                            </div>
                        }
                        right={fmtFull(a.date) || a.date}
                    />
                ))}
            </div>
        );
    };

    /* ── Certificates ───────────────────────────────────────────────────── */
    const rCert = () => {
        if (!data.certificates?.length) return null;
        return (
            <div>
                <Hdr title="Certificates" sz={sz} />
                {data.certificates.map((c, i) => (
                    <div key={i} style={{ marginBottom: i < data.certificates.length - 1 ? "3px" : 0 }}>
                        {/* Name → Date */}
                        <DR sz={sz}
                            left={<span style={{ ...body, fontWeight: "bold", color: "#000" }}>{c.name}</span>}
                            right={fmtFull(c.date) || c.date}
                        />
                        {/* Issuer — Certificate Link (italic) */}
                        {(c.issuer || c.link) && (
                            <div style={{ ...body, fontStyle: "italic", color: "#333" }}>
                                {c.issuer && <span>{c.issuer}</span>}
                                {c.link && (
                                    <>
                                        {c.issuer && <span> — </span>}
                                        <a href={c.link} target="_blank" rel="noreferrer"
                                           style={{ fontFamily: FONT, fontSize: sz.body,
                                                    color: "#000", textDecoration: "none",
                                                    fontWeight: "bold", fontStyle: "italic" }}>
                                            Certificate Link
                                        </a>
                                    </>
                                )}
                            </div>
                        )}
                    </div>
                ))}
            </div>
        );
    };

    /* ── Education ──────────────────────────────────────────────────────── */
    const rEdu = () => {
        if (!data.education?.length) return null;
        return (
            <div>
                <Hdr title="Education" sz={sz} />
                {data.education.map((e, i) => {
                    const gv    = cleanGpa(e.gpa);
                    const isPct = (e.gpa || "").toLowerCase().includes("percent")
                               || (e.gpa || "").includes("%");
                    const eduDate = (() => {
                        const s = (e.start_date || "").split("-")[0];
                        const g = (e.graduation_date || "").split("-")[0];
                        if (s && g) return `${s} – ${g}`;
                        return g || e.graduation_date || "";
                    })();
                    return (
                        <div key={i} style={{ marginBottom: i < data.education.length - 1 ? "3px" : 0 }}>
                            {/* Institution → Location */}
                            <DR sz={sz}
                                left={<strong style={{ ...body, fontSize: sz.title, color: "#000" }}>{e.institution}</strong>}
                                right={e.location}
                                bold={false}
                            />
                            {/* Degree / Field / GPA → Date (bold) */}
                            <DR sz={sz}
                                left={
                                    <span style={{ ...body, fontStyle: "italic" }}>
                                        {e.degree}{e.field ? ` - ${e.field}` : ""}
                                        {gv && <> — <strong>{isPct ? "Percentage" : "CGPA"}: {gv}</strong></>}
                                    </span>
                                }
                                right={eduDate}
                                bold={true}
                            />
                        </div>
                    );
                })}
            </div>
        );
    };

    const R = { skills: rSkills, experience: rExp, projects: rProj,
                achievements: rAch, certificates: rCert, education: rEdu };

    /* ══════════════════════════════════════════════════════════════════════ */
    return (
        <div style={{ width: "100%", backgroundColor: "#fff", fontFamily: FONT,
                      color: "#1a1a1a", padding: "0.4in 0.45in", boxSizing: "border-box" }}>

            {/* ── HEADER (centred) ──────────────────────────────────────── */}
            <div style={{ textAlign: "center", marginBottom: "5px" }}>
                {/* Name */}
                <div style={{ fontFamily: FONT, fontSize: sz.name, fontWeight: "bold",
                              lineHeight: 1.1, color: "#000", marginBottom: "2px" }}>
                    {p.full_name || "YOUR NAME"}
                </div>
                {/* Location */}
                {p.location && (
                    <div style={{ ...body, color: "#333", marginBottom: "2px" }}>{p.location}</div>
                )}
                {/* Contact row — proper Unicode/text icons for html2canvas */}
                <div style={{ display: "flex", flexWrap: "wrap", justifyContent: "center",
                              gap: "0 14px", fontFamily: FONT, fontSize: sz.body, color: "#000", marginTop: "2px" }}>
                    {p.phone && (
                        <ContactItem icon="📞" text={p.phone} sz={sz} underline={false} />
                    )}
                    {p.email && (
                        <ContactItem icon="✉" href={`mailto:${p.email}`} text={p.email} sz={sz} />
                    )}
                    {p.linkedin && (
                        <ContactItem icon="in" href={p.linkedin} text={trimUrl(p.linkedin)} sz={sz} />
                    )}
                    {p.github && (
                        <ContactItem icon="github" href={p.github} text={trimUrl(p.github)} sz={sz} />
                    )}
                </div>
            </div>

            {/* ── ORDERED SECTIONS ──────────────────────────────────────── */}
            {order.map(key => {
                const fn = R[key];
                return fn ? <div key={key}>{fn()}</div> : null;
            })}
        </div>
    );
};

export default SpecializedTemplate;
