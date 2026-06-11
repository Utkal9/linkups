import React from "react";

/* ══════════════════════════════════════════════════════════════════════════
   GENERAL template — 7 completely separate rows
   All read/write from skill* fields (skillLanguages, skillFrontend, etc.)
   ══════════════════════════════════════════════════════════════════════════ */
const GENERAL_FIELDS = [
    {
        key: "skillLanguages",
        label: "Languages",
        placeholder: "C++, JavaScript (ES6+), Python, Java, C, SQL",
    },
    {
        key: "skillFrontend",
        label: "Frontend",
        placeholder: "React.js, Next.js, HTML, CSS, Tailwind CSS, Bootstrap",
    },
    {
        key: "skillBackend",
        label: "Backend",
        placeholder: "Node.js, Express.js, REST APIs, Socket.IO, JWT",
    },
    {
        key: "skillCloudDevOps",
        label: "Databases & Cloud",
        placeholder: "MongoDB Atlas, Firebase, Cloudinary, MySQL",
    },
    {
        key: "skillTools",
        label: "Tools & Platforms",
        placeholder: "Git, GitHub, Docker, Postman, Linux, VS Code",
    },
    {
        key: "skillCoreConcepts",
        label: "Core Concepts",
        placeholder: "Data Structures & Algorithms, OOPs, DBMS, OS, CN",
    },
    {
        key: "skillSoft",
        label: "Soft Skills",
        placeholder: "Problem-Solving, Communication, Collaboration",
    },
];

/* ══════════════════════════════════════════════════════════════════════════
   SPECIALIZED template — 3 completely separate rows
   All read/write from spec* fields (specLanguages, specTechFrameworks, etc.)
   These are DIFFERENT database fields — zero overlap with General.
   ══════════════════════════════════════════════════════════════════════════ */
const SPECIALIZED_FIELDS = [
    {
        key: "specLanguages",
        label: "Languages",
        placeholder: "C++, JavaScript (ES6+), Python, Java, C, SQL",
    },
    {
        key: "specTechFrameworks",
        label: "Technologies / Frameworks",
        placeholder: "Next.js, React.js, Node.js, Express.js, HTML, CSS, Tailwind CSS, Bootstrap, Git/GitHub",
        hint: "Include both frontend & backend frameworks here",
    },
    {
        key: "specDomainSkills",
        label: "Domain Skills",
        placeholder: "Data Structures and Algorithms, Problem-Solving, Responsive Web Design",
    },
];

/* ══════════════════════════════════════════════════════════════════════════ */
const SkillsForm = ({ data, onChange, template = "general" }) => {
    const isGeneral = template === "general";
    const fields    = isGeneral ? GENERAL_FIELDS : SPECIALIZED_FIELDS;

    const handleChange = (key, value) => onChange({ ...data, [key]: value });

    return (
        <div className="space-y-4 animate-fade-in">
            {/* Header */}
            <div>
                <h3 className="text-lg font-semibold mb-1" style={{ color: "var(--text-primary)" }}>
                    Technical Skills
                </h3>
                <p className="text-xs px-2 py-1.5 rounded-md border"
                   style={{
                       color: "var(--text-secondary)",
                       backgroundColor: "var(--holo-glass)",
                       borderColor: "var(--holo-border)",
                   }}>
                    {isGeneral
                        ? "📋 General Template — 7 separate skill rows (Languages, Frontend, Backend, etc.)"
                        : "📋 Specialized Template — 3 rows stored in separate fields (spec*) — not shared with General."}
                </p>
            </div>

            {/* Fields */}
            <div className="grid gap-3">
                {fields.map((field) => (
                    <div key={field.key} className="space-y-1">
                        <div className="flex items-baseline gap-2">
                            <label className="text-sm font-medium" style={{ color: "var(--text-primary)" }}>
                                {field.label}
                            </label>
                            {field.hint && (
                                <span className="text-xs opacity-60" style={{ color: "var(--text-secondary)" }}>
                                    — {field.hint}
                                </span>
                            )}
                        </div>
                        <input
                            type="text"
                            placeholder={field.placeholder}
                            value={data[field.key] || ""}
                            onChange={(e) => handleChange(field.key, e.target.value)}
                            className="w-full px-3 py-2 text-sm border rounded-lg outline-none focus:ring-2"
                            style={{
                                backgroundColor: "var(--holo-bg)",
                                borderColor: "var(--holo-border)",
                                color: "var(--text-primary)",
                            }}
                        />
                    </div>
                ))}
            </div>
        </div>
    );
};

export default SkillsForm;
