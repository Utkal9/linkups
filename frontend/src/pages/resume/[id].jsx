import React, { useEffect, useState } from "react";
import { useRouter } from "next/router";
import Head from "next/head";
import clientServer from "@/config";
import ResumePreview from "@/Components/ResumePreview";
import { Lock, FileWarning } from "lucide-react";

export default function PublicResume() {
    const router = useRouter();
    const { id } = router.query;
    
    const [resumeData, setResumeData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
        if (!id) return;
        
        const loadResume = async () => {
            try {
                setLoading(true);
                const { data } = await clientServer.get(`/resume/public?resumeId=${id}`);
                setResumeData(data.resume);
            } catch (err) {
                if (err.response && err.response.status === 403) {
                    setError("private");
                } else {
                    setError("not_found");
                }
            } finally {
                setLoading(false);
            }
        };
        
        loadResume();
    }, [id]);

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gray-100">
                <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
            </div>
        );
    }

    if (error === "private") {
        return (
            <div className="min-h-screen flex flex-col items-center justify-center bg-gray-100 text-gray-800">
                <Lock size={64} className="mb-4 text-gray-400" />
                <h1 className="text-2xl font-bold mb-2">This Resume is Private</h1>
                <p className="text-gray-500">The owner of this resume has not made it public.</p>
            </div>
        );
    }

    if (error === "not_found" || !resumeData) {
        return (
            <div className="min-h-screen flex flex-col items-center justify-center bg-gray-100 text-gray-800">
                <FileWarning size={64} className="mb-4 text-gray-400" />
                <h1 className="text-2xl font-bold mb-2">Resume Not Found</h1>
                <p className="text-gray-500">The link you followed may be broken or the resume was deleted.</p>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gray-100 py-8 flex flex-col items-center">
            <Head>
                <title>{resumeData.personal_info?.full_name || "Resume"} | Linkups</title>
            </Head>
            
            {/* Download button for recruiter */}
            <div className="w-full max-w-[794px] flex justify-end mb-4 print:hidden">
                <button 
                    onClick={() => window.print()}
                    className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-medium shadow transition-colors"
                >
                    <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="7 10 12 15 17 10"></polyline><line x1="12" y1="15" x2="12" y2="3"></line></svg>
                    Print / Save PDF
                </button>
            </div>

            <div className="w-full max-w-[794px] bg-white shadow-2xl rounded-sm overflow-hidden print:shadow-none print:m-0 print:p-0">
                <ResumePreview 
                    data={resumeData}
                    template={resumeData.template || "general"}
                    accentColor={resumeData.accent_color}
                    fontSize={resumeData.font_size || "default"}
                />
            </div>
            
            <style jsx global>{`
                @media print {
                    body {
                        background: white !important;
                    }
                    @page {
                        margin: 0;
                        size: A4 portrait;
                    }
                }
            `}</style>
        </div>
    );
}
