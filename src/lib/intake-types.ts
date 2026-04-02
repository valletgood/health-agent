export interface SymptomItem {
    key: string;
    label: string;
}

export interface IntakeFormData {
    name: string;
    birthDate: string;
    gender: "" | "male" | "female" | "other";
    symptoms: Record<string, boolean>;
    otherSymptoms: string;
    painLevel: number;
    visitPurpose: string;
}

export interface LlmEvidenceItem {
    paper: string;
    level: string;
    text: string;
}

export interface LlmSymptomContextItem {
    name: string;
    overview: string;
    relatedDiseases: string[];
    tests: string[];
    evidence: LlmEvidenceItem[];
}

export interface LlmDiseaseNodeItem {
    name: string;
    overview: string;
    symptoms: string[];
    tests: string[];
    comorbidities: string[];
    differentials: string[];
    evidence: LlmEvidenceItem[];
}

export interface LlmDiseaseContext {
    symptoms: LlmSymptomContextItem[];
    diseases: LlmDiseaseNodeItem[];
}

export interface AnalysisSection {
    title: string;
    content: string | Array<{ keyword: string; description: string }>;
}
