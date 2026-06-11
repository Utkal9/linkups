import { GraduationCap, Plus, Trash2, Calendar } from "lucide-react";
import React from "react";

const EducationForm = ({ data, onChange }) => {
    const addEducation = () =>
        onChange([
            ...data,
            {
                institution: "",
                degree: "",
                field: "",
                start_date: "",
                graduation_date: "",
                gpa: "",
                location: "",
            },
        ]);

    const removeEducation = (index) =>
        onChange(data.filter((_, i) => i !== index));

    const updateEducation = (index, field, value) => {
        const updated = [...data];
        updated[index] = { ...updated[index], [field]: value };
        onChange(updated);
    };

    return (
        <div className="space-y-6 animate-fade-in">
            <div className="flex items-center justify-between">
                <div>
                    <h3
                        className="flex items-center gap-2 text-lg font-semibold"
                        style={{ color: "var(--text-primary)" }}
                    >
                        {" "}
                        Education{" "}
                    </h3>
                    <p
                        className="text-sm"
                        style={{ color: "var(--text-secondary)" }}
                    >
                        Add your academic background
                    </p>
                </div>
                <button
                    onClick={addEducation}
                    className="flex items-center gap-2 px-3 py-1.5 text-sm font-medium border rounded-lg transition-colors"
                    style={{
                        borderColor: "var(--holo-border)",
                        color: "var(--neon-teal)",
                        backgroundColor: "var(--holo-glass)",
                    }}
                >
                    <Plus className="w-4 h-4" /> Add Education
                </button>
            </div>

            {data.length === 0 ? (
                <div
                    className="text-center py-12 rounded-lg border-2 border-dashed"
                    style={{
                        borderColor: "var(--holo-border)",
                        backgroundColor: "var(--holo-bg)",
                    }}
                >
                    <GraduationCap
                        className="w-12 h-12 mx-auto mb-3"
                        style={{ color: "var(--text-secondary)" }}
                    />
                    <p style={{ color: "var(--text-secondary)" }}>
                        No education added yet.
                    </p>
                </div>
            ) : (
                <div className="space-y-4">
                    {data.map((education, index) => (
                        <div
                            key={index}
                            className="p-5 border rounded-xl shadow-sm transition-shadow"
                            style={{
                                backgroundColor: "var(--holo-panel)",
                                borderColor: "var(--holo-border)",
                            }}
                        >
                            <div className="flex justify-between items-start mb-4">
                                <h4
                                    className="font-medium"
                                    style={{ color: "var(--text-primary)" }}
                                >
                                    Education #{index + 1}
                                </h4>
                                <button
                                    onClick={() => removeEducation(index)}
                                    className="p-1 hover:text-red-500 transition-colors"
                                    style={{ color: "var(--text-secondary)" }}
                                >
                                    <Trash2 className="w-4 h-4" />
                                </button>
                            </div>

                            <div className="grid md:grid-cols-2 gap-4 mb-4">
                                <input
                                    value={education.institution || ""}
                                    onChange={(e) =>
                                        updateEducation(
                                            index,
                                            "institution",
                                            e.target.value
                                        )
                                    }
                                    type="text"
                                    placeholder="School / University"
                                    className="w-full px-3 py-2 text-sm border rounded-lg outline-none focus:ring-2"
                                    style={{
                                        backgroundColor: "var(--holo-bg)",
                                        borderColor: "var(--holo-border)",
                                        color: "var(--text-primary)",
                                    }}
                                />

                                <input
                                    value={education.location || ""}
                                    onChange={(e) =>
                                        updateEducation(
                                            index,
                                            "location",
                                            e.target.value
                                        )
                                    }
                                    type="text"
                                    placeholder="Location (e.g. Punjab, India)"
                                    className="w-full px-3 py-2 text-sm border rounded-lg outline-none focus:ring-2"
                                    style={{
                                        backgroundColor: "var(--holo-bg)",
                                        borderColor: "var(--holo-border)",
                                        color: "var(--text-primary)",
                                    }}
                                />

                                <input
                                    value={education.degree || ""}
                                    onChange={(e) =>
                                        updateEducation(
                                            index,
                                            "degree",
                                            e.target.value
                                        )
                                    }
                                    type="text"
                                    placeholder="Degree"
                                    className="w-full px-3 py-2 text-sm border rounded-lg outline-none focus:ring-2"
                                    style={{
                                        backgroundColor: "var(--holo-bg)",
                                        borderColor: "var(--holo-border)",
                                        color: "var(--text-primary)",
                                    }}
                                />

                                <input
                                    value={education.field || ""}
                                    onChange={(e) =>
                                        updateEducation(
                                            index,
                                            "field",
                                            e.target.value
                                        )
                                    }
                                    type="text"
                                    placeholder="Field of Study"
                                    className="w-full px-3 py-2 text-sm border rounded-lg outline-none focus:ring-2"
                                    style={{
                                        backgroundColor: "var(--holo-bg)",
                                        borderColor: "var(--holo-border)",
                                        color: "var(--text-primary)",
                                    }}
                                />
                            </div>

                            <div className="grid md:grid-cols-2 gap-4">
                                {/* Start Date */}
                                <div className="relative">
                                    <Calendar className="absolute left-3 top-2.5 w-4 h-4 text-gray-400 pointer-events-none" />
                                    <input
                                        type="text"
                                        placeholder="Start Date (e.g. Aug 2021)"
                                        onFocus={(e) => (e.target.type = "month")}
                                        onBlur={(e) => {
                                            if (!e.target.value) e.target.type = "text";
                                        }}
                                        value={education.start_date || ""}
                                        onChange={(e) =>
                                            updateEducation(index, "start_date", e.target.value)
                                        }
                                        className="w-full pl-10 py-2 text-sm border rounded-lg outline-none focus:ring-2"
                                        style={{
                                            backgroundColor: "var(--holo-bg)",
                                            borderColor: "var(--holo-border)",
                                            color: "var(--text-primary)",
                                        }}
                                    />
                                </div>

                                {/* Graduation / End Date */}
                                <div className="relative">
                                    <Calendar className="absolute left-3 top-2.5 w-4 h-4 text-gray-400 pointer-events-none" />
                                    <input
                                        type="text"
                                        placeholder="Graduation / End Date (e.g. May 2025)"
                                        onFocus={(e) => (e.target.type = "month")}
                                        onBlur={(e) => {
                                            if (!e.target.value) e.target.type = "text";
                                        }}
                                        value={education.graduation_date || ""}
                                        onChange={(e) =>
                                            updateEducation(index, "graduation_date", e.target.value)
                                        }
                                        className="w-full pl-10 py-2 text-sm border rounded-lg outline-none focus:ring-2"
                                        style={{
                                            backgroundColor: "var(--holo-bg)",
                                            borderColor: "var(--holo-border)",
                                            color: "var(--text-primary)",
                                        }}
                                    />
                                </div>

                                <input
                                    value={education.gpa || ""}
                                    onChange={(e) =>
                                        updateEducation(index, "gpa", e.target.value)
                                    }
                                    type="text"
                                    placeholder="GPA / Percentage (e.g. 8.5 or 85%)"
                                    className="w-full px-3 py-2 text-sm border rounded-lg outline-none focus:ring-2 md:col-span-2"
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
            )}
        </div>
    );
};
export default EducationForm;
