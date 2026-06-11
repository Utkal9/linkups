import {
    Briefcase,
    Globe,
    Linkedin,
    Mail,
    MapPin,
    Phone,
    User,
    Code,
    Github,
} from "lucide-react";
import React from "react";

// Fields shared by BOTH templates
const COMMON_FIELDS = [
    { key: "full_name", label: "Full Name",        icon: User,     type: "text",  required: true },
    { key: "email",     label: "Email Address",    icon: Mail,     type: "email", required: true },
    { key: "phone",     label: "Phone Number",     icon: Phone,    type: "tel"   },
    { key: "location",  label: "Location / City",  icon: MapPin,   type: "text"  },
    { key: "linkedin",  label: "LinkedIn Profile", icon: Linkedin, type: "url"   },
    { key: "github",    label: "GitHub Profile",   icon: Github,   type: "url"   },
];

// Fields only shown in General (LPU) template
const GENERAL_ONLY_FIELDS = [
    { key: "profession", label: "Profession / Job Title", icon: Briefcase, type: "text",
      placeholder: "e.g. Full Stack Developer"  },
    { key: "leetcode",   label: "LeetCode Profile",       icon: Code,      type: "url"   },
    { key: "website",    label: "Portfolio / Website",    icon: Globe,     type: "url"   },
];

const PersonalInfoForm = ({
    data,
    onChange,
    removeBackground,
    setRemoveBackground,
    template = "general",
}) => {
    const isGeneral = template === "general";
    const fields    = isGeneral ? [...COMMON_FIELDS, ...GENERAL_ONLY_FIELDS] : COMMON_FIELDS;

    const handleChange = (field, value) => onChange({ ...data, [field]: value });

    return (
        <div className="animate-fade-in space-y-6">
            {/* ── Photo upload — General (LPU) only (it shows photo in header) ─── */}
            {isGeneral && (
                <div className="flex items-center gap-4">
                    <label className="relative group cursor-pointer">
                        {data.image ? (
                            <img
                                src={
                                    typeof data.image === "string"
                                        ? data.image
                                        : URL.createObjectURL(data.image)
                                }
                                alt="Profile"
                                className="w-20 h-20 rounded-full object-cover ring-4 transition-opacity"
                                style={{ ringColor: "var(--holo-border)" }}
                            />
                        ) : (
                            <div
                                className="w-20 h-20 rounded-full flex items-center justify-center transition-colors border"
                                style={{
                                    backgroundColor: "var(--holo-bg)",
                                    borderColor: "var(--holo-border)",
                                    color: "var(--text-secondary)",
                                }}
                            >
                                <User className="w-8 h-8" />
                            </div>
                        )}
                        <input
                            type="file"
                            accept="image/jpeg, image/png"
                            className="hidden"
                            onChange={(e) => handleChange("image", e.target.files[0])}
                        />
                    </label>

                    {typeof data.image === "object" && (
                        <div className="flex items-center gap-2">
                            <input
                                type="checkbox"
                                id="removeBg"
                                checked={removeBackground}
                                onChange={() => setRemoveBackground((prev) => !prev)}
                                className="w-4 h-4 rounded focus:ring-2"
                                style={{ borderColor: "var(--holo-border)" }}
                            />
                            <label
                                htmlFor="removeBg"
                                className="text-sm cursor-pointer select-none"
                                style={{ color: "var(--text-primary)" }}
                            >
                                Remove Background
                            </label>
                        </div>
                    )}
                </div>
            )}

            {/* ── Text fields ───────────────────────────────────────────────────── */}
            <div className="grid gap-5">
                {fields.map((field) => {
                    const Icon = field.icon;
                    return (
                        <div key={field.key} className="space-y-1.5">
                            <label
                                className="flex items-center gap-2 text-sm font-medium"
                                style={{ color: "var(--text-secondary)" }}
                            >
                                <Icon className="w-4 h-4" />
                                {field.label}
                                {field.required && <span className="text-red-500">*</span>}
                            </label>
                            <input
                                type={field.type}
                                value={data[field.key] || ""}
                                onChange={(e) => handleChange(field.key, e.target.value)}
                                className="w-full px-4 py-2 text-sm border rounded-lg outline-none focus:ring-2 transition-all"
                                style={{
                                    backgroundColor: "var(--holo-bg)",
                                    borderColor: "var(--holo-border)",
                                    color: "var(--text-primary)",
                                }}
                                placeholder={field.placeholder || `Enter your ${field.label.toLowerCase()}`}
                                required={field.required}
                            />
                        </div>
                    );
                })}
            </div>
        </div>
    );
};

export default PersonalInfoForm;
