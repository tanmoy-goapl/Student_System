import type { Workspace } from "@/components/documentspage/DocumentsSidebar";
import type { DocumentItem } from "@/components/documentspage/DocumentsMain";

export type DocumentKPI = {
    id: string;
    value: string;
    label: string;
    color: string;
    iconType: "docs" | "subjects" | "processing" | "ai-ready";
};

export const DOCUMENT_KPIS: DocumentKPI[] = [
    { id: "1", value: "8", label: "Total Documents", color: "blue", iconType: "docs" },
    { id: "2", value: "5", label: "Subjects", color: "violet", iconType: "subjects" },
    { id: "3", value: "1", label: "Processing", color: "amber", iconType: "processing" },
    { id: "4", value: "7/8", label: "AI Ready", color: "emerald", iconType: "ai-ready" },
];

export const WORKSPACES: Workspace[] = [
    {
        id: "1",
        name: "Studies",
        count: 8,
        children: [
            { id: "1-1", name: "Physics", count: 3 },
            { id: "1-2", name: "Chemistry", count: 2 },
            { id: "1-3", name: "Maths", count: 3 },
        ],
    },
    {
        id: "2",
        name: "Resume & Interview",
        count: 4,
        children: [],
    },
    {
        id: "3",
        name: "Personal Learning",
        count: 2,
        children: [],
    },
];

export const DOCUMENTS: DocumentItem[] = [
    {
        id: "1",
        name: "Quantum Physics Notes.pdf",
        type: "PDF",
        subject: "Physics",
        subjectColor: "blue",
        pages: 42,
        sizeMB: 3.2,
        uploadedAt: "2 days ago",
        status: "ready",
    },
    {
        id: "2",
        name: "Calculus Textbook Ch1-5.pdf",
        type: "PDF",
        subject: "Maths",
        subjectColor: "emerald",
        pages: 118,
        sizeMB: 12.4,
        uploadedAt: "3 days ago",
        status: "ready",
    },
    {
        id: "3",
        name: "Chemistry Lab Reports.doc",
        type: "DOC",
        subject: "Chemistry",
        subjectColor: "amber",
        pages: 24,
        sizeMB: 1.8,
        uploadedAt: "5 days ago",
        status: "processing",
    },
    {
        id: "4",
        name: "Wave Mechanics Overview.pdf",
        type: "PDF",
        subject: "Physics",
        subjectColor: "blue",
        pages: 31,
        sizeMB: 2.6,
        uploadedAt: "1 week ago",
        status: "ready",
    },
    {
        id: "5",
        name: "Resume - Software Engineer.pdf",
        type: "PDF",
        subject: "Resume",
        subjectColor: "orange",
        pages: 2,
        sizeMB: 0.4,
        uploadedAt: "1 week ago",
        status: "ready",
    },
    {
        id: "6",
        name: "Interview Prep Guide.pdf",
        type: "PDF",
        subject: "Interview",
        subjectColor: "violet",
        pages: 56,
        sizeMB: 4.1,
        uploadedAt: "2 weeks ago",
        status: "ready",
    },
    {
        id: "7",
        name: "Thermodynamics Cheat Sheet.txt",
        type: "TXT",
        subject: "Physics",
        subjectColor: "blue",
        pages: 4,
        sizeMB: 0.1,
        uploadedAt: "2 weeks ago",
        status: "ready",
    },
    {
        id: "8",
        name: "Organic Chemistry Reactions.pdf",
        type: "PDF",
        subject: "Chemistry",
        subjectColor: "amber",
        pages: 38,
        sizeMB: 5.7,
        uploadedAt: "3 weeks ago",
        status: "ready",
    },
];