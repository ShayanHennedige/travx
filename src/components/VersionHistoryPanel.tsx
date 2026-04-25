"use client";

import { useState, useEffect } from "react";
import { format, parseISO } from "date-fns";

interface Version {
    id: string;
    version_number: number;
    edited_by: string;
    edit_reason: string;
    created_at: string;
    content: any;
}

interface VersionHistoryPanelProps {
    documentType: string;
    documentId: string;
    isOpen: boolean;
    onClose: () => void;
}

export function VersionHistoryPanel({
    documentType,
    documentId,
    isOpen,
    onClose,
}: VersionHistoryPanelProps) {
    const [versions, setVersions] = useState<Version[]>([]);
    const [loading, setLoading] = useState(false);
    const [selectedVersion, setSelectedVersion] = useState<Version | null>(null);

    useEffect(() => {
        if (isOpen && documentId) {
            fetchVersions();
        }
    }, [isOpen, documentId]);

    const fetchVersions = async () => {
        setLoading(true);
        try {
            const res = await fetch(
                `/api/document-versions?document_type=${documentType}&document_id=${documentId}`
            );
            const data = await res.json();
            setVersions(data.versions || []);
        } catch (err) {
            console.error("Error fetching versions:", err);
        } finally {
            setLoading(false);
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm">
            <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full max-h-[80vh] flex flex-col">
                {/* Header */}
                <div className="px-6 py-4 border-b border-surface-100 flex items-center justify-between">
                    <div>
                        <h3 className="text-lg font-bold text-surface-900">Version History</h3>
                        <p className="text-xs text-surface-500 mt-0.5">
                            {versions.length} version{versions.length !== 1 ? "s" : ""} recorded
                        </p>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-2 hover:bg-surface-100 rounded-xl transition-colors"
                    >
                        <svg className="w-5 h-5 text-surface-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                    </button>
                </div>

                {/* Content */}
                <div className="flex-1 overflow-y-auto p-4">
                    {loading ? (
                        <div className="flex items-center justify-center py-12">
                            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary-600"></div>
                        </div>
                    ) : versions.length === 0 ? (
                        <div className="text-center py-12">
                            <div className="w-12 h-12 mx-auto mb-3 rounded-xl bg-surface-50 flex items-center justify-center">
                                <svg className="w-6 h-6 text-surface-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                                </svg>
                            </div>
                            <p className="text-sm text-surface-500">No previous versions found</p>
                            <p className="text-xs text-surface-400 mt-1">Versions are created when a past document is edited</p>
                        </div>
                    ) : (
                        <div className="space-y-2">
                            {versions.map((version) => (
                                <button
                                    key={version.id}
                                    onClick={() =>
                                        setSelectedVersion(
                                            selectedVersion?.id === version.id ? null : version
                                        )
                                    }
                                    className={`w-full text-left p-3 rounded-xl border transition-all ${
                                        selectedVersion?.id === version.id
                                            ? "border-primary-300 bg-primary-50/50"
                                            : "border-surface-100 hover:border-surface-200 hover:bg-surface-50"
                                    }`}
                                >
                                    <div className="flex items-center justify-between mb-1">
                                        <span className="text-xs font-bold text-surface-900">
                                            Version {version.version_number}
                                        </span>
                                        <span className="text-[10px] text-surface-400">
                                            {format(parseISO(version.created_at), "MMM d, yyyy h:mm a")}
                                        </span>
                                    </div>
                                    <div className="flex items-center gap-2 text-[11px] text-surface-500">
                                        <span>By: {version.edited_by}</span>
                                        {version.edit_reason && (
                                            <>
                                                <span className="w-1 h-1 rounded-full bg-surface-300" />
                                                <span>{version.edit_reason}</span>
                                            </>
                                        )}
                                    </div>

                                    {/* Expanded content */}
                                    {selectedVersion?.id === version.id && (
                                        <div className="mt-3 p-3 bg-surface-50 rounded-lg border border-surface-100">
                                            <p className="text-[10px] font-bold text-surface-500 uppercase tracking-wider mb-2">
                                                Snapshot Data
                                            </p>
                                            <pre className="text-[11px] text-surface-600 whitespace-pre-wrap break-words max-h-48 overflow-y-auto font-mono">
                                                {JSON.stringify(version.content, null, 2)}
                                            </pre>
                                        </div>
                                    )}
                                </button>
                            ))}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
