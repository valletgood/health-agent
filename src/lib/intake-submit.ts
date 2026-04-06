import { postProcessAnalysisSections } from "@/lib/intake-analysis";
import { GENDER_LABELS, SYMPTOM_LIST } from "@/lib/intake-constants";
import type { FollowUpAnswer, FollowUpQuestion } from "@/lib/intake-questions";
import type { AnalysisSection, IntakeFormData, LlmDiseaseContext } from "@/lib/intake-types";

function calculateKoreanAge(birthDate: string): number | null {
    if (!birthDate || birthDate.length !== 8) return null;
    const year = Number(birthDate.slice(0, 4));
    const month = Number(birthDate.slice(4, 6));
    const day = Number(birthDate.slice(6, 8));
    if (!year || !month || !day) return null;

    const today = new Date();
    let age = today.getFullYear() - year;
    const hasHadBirthdayThisYear =
        today.getMonth() + 1 > month || (today.getMonth() + 1 === month && today.getDate() >= day);
    if (!hasHadBirthdayThisYear) age -= 1;
    return age >= 0 ? age : null;
}

export function buildUserMessageFromForm(form: IntakeFormData, answers: FollowUpAnswer[] = []): string {
    const selectedSymptoms = SYMPTOM_LIST.filter((s) => form.symptoms[s.key]).map((s) => s.label);
    const age = calculateKoreanAge(form.birthDate);

    const parts = [
        age !== null ? `나이: 만 ${age}세` : "",
        form.gender ? `성별: ${GENDER_LABELS[form.gender] ?? form.gender}` : "",
        selectedSymptoms.length > 0 ? `선택 증상: ${selectedSymptoms.join(", ")}` : "",
        form.otherSymptoms ? `추가 증상: ${form.otherSymptoms}` : "",
        `아픈 정도: ${form.painLevel}/10`,
        form.visitPurpose ? `방문 목적: ${form.visitPurpose}` : "",
    ];

    if (answers.length > 0) {
        const answerLines = answers.map((a) => `- ${a.question}: ${a.answer === "yes" ? "예" : "아니오"}`);
        parts.push(`\n추가 확인 사항:\n${answerLines.join("\n")}`);
    }

    return parts.filter(Boolean).join("\n");
}

const TOP_CANDIDATE_COUNT = 8;

// 1단계+2단계: Neo4j 후보 검색 + 컨텍스트 조회 (백그라운드에서 즉시 시작)
export async function searchAndBuildContext(form: IntakeFormData): Promise<LlmDiseaseContext> {
    const symptoms = Object.entries(form.symptoms)
        .filter(([, checked]) => checked)
        .map(([key]) => key);

    const candidateResponse = await fetch("/api/disease", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
            symptoms,
            otherSymptoms: form.otherSymptoms,
            painLevel: form.painLevel,
            visitPurpose: form.visitPurpose,
        }),
    });

    if (!candidateResponse.ok) {
        const data = (await candidateResponse.json().catch(() => ({}))) as { error?: string };
        throw new Error(data.error ?? "문진표 연관 정보 조회에 실패했습니다.");
    }

    const candidateData = (await candidateResponse.json()) as {
        data?: { candidates?: Array<{ id: string }> };
    };

    const nodeIds = (candidateData.data?.candidates ?? []).slice(0, TOP_CANDIDATE_COUNT).map((c) => c.id);

    if (nodeIds.length === 0) {
        throw new Error("NO_CANDIDATES");
    }

    const contextResponse = await fetch("/api/disease/context", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ nodeIds }),
    });

    if (!contextResponse.ok) {
        const data = (await contextResponse.json().catch(() => ({}))) as { error?: string };
        throw new Error(data.error ?? "질환 상세 컨텍스트 조회에 실패했습니다.");
    }

    const contextData = (await contextResponse.json()) as {
        data?: { llmContext?: LlmDiseaseContext };
    };
    const llmContext = contextData.data?.llmContext;

    if (!llmContext) {
        throw new Error("LLM 컨텍스트 생성에 실패했습니다.");
    }

    return llmContext;
}

// 2.5단계: Gemini가 컨텍스트를 보고 추가 질문 생성
export async function fetchFollowUpQuestions(form: IntakeFormData, llmContext: LlmDiseaseContext): Promise<FollowUpQuestion[]> {
    const res = await fetch("/api/disease/questions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userMessage: buildUserMessageFromForm(form), llmContext }),
    });

    if (!res.ok) return [];

    const data = (await res.json()) as { data?: { questions?: FollowUpQuestion[] } };
    return data.data?.questions ?? [];
}

// 3단계: Gemini 분석 (컨텍스트 + 추가 답변 포함)
export async function runGeminiAnalysis(form: IntakeFormData, llmContext: LlmDiseaseContext, answers: FollowUpAnswer[]): Promise<AnalysisSection[]> {
    const analysisResponse = await fetch("/api/disease/analysis", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
            userMessage: buildUserMessageFromForm(form, answers),
            llmContext,
        }),
    });

    if (!analysisResponse.ok) {
        const data = (await analysisResponse.json().catch(() => ({}))) as { error?: string };
        throw new Error(data.error ?? "Gemini 분석 요청에 실패했습니다.");
    }

    const analysisData = (await analysisResponse.json()) as { data?: { sections?: AnalysisSection[] } };
    const sections = analysisData.data?.sections;
    if (!sections || sections.length === 0) {
        return [{ title: "AI 분석 결과", content: "분석 결과를 생성하지 못했습니다." }];
    }
    return postProcessAnalysisSections(sections);
}
