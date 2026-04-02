import type { AnalysisSection, IntakeFormData, LlmDiseaseContext } from "@/lib/intake-types";

export type ChatRole = "user" | "assistant";

export interface ChatMessage {
    id: string;
    role: ChatRole;
    content: string;
    timestamp: number;
}

export interface ChatContext {
    form: IntakeFormData;
    sections: AnalysisSection[];
    llmContext: LlmDiseaseContext | null; // Neo4j 지식 그래프 원본 데이터
}

export interface ChatRequestBody {
    messages: ChatMessage[];
    context: ChatContext;
}

export interface ChatResponseBody {
    ok: boolean;
    message: ChatMessage;
    error?: string;
}
