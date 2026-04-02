import "server-only";
import { GoogleGenerativeAI } from "@google/generative-ai";

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

export interface GeminiPromptInput {
    userMessage: string;
    llmContext: LlmDiseaseContext;
}

export interface AnalysisSection {
    title: string;
    content: string | Array<{ keyword: string; description: string }>;
}

export const MEDICAL_SYSTEM_PROMPT = `
너는 한국어 의료 상담 보조 AI다.
목표는 사용자의 증상 설명과 제공된 지식 그래프 컨텍스트를 바탕으로, 과도한 단정 없이 안전하고 실용적인 조언을 제공하는 것이다.

규칙:
1) 반드시 한국어로만 답변한다.
2) 진단을 확정하지 말고 "가능성" 중심으로 설명한다.
3) 제공된 llmContext를 최우선 근거로 사용한다. 근거가 없으면 추정임을 명시한다.
4) 약물/치료는 일반적 정보 수준으로만 제안하고, 개인 처방처럼 말하지 않는다.
5) 아래 출력 형식을 정확히 지켜라.
6) 응답 마지막 줄에는 반드시 다음 문구를 포함한다:
"이 정보는 의학적 진단을 대체하지 않습니다"
7) 일반인을 대상으로 설명하듯 쉽고 친절한 말투를 사용한다.
8) 괄호 설명은 한국어 의학 전문용어를 쓸 때만 한국어로 짧게 붙인다. (예: 후비루(콧물이 목 뒤로 넘어가는 현상)) 괄호 안에 영어 표현은 절대 금지한다. 미열·고열·발열·기침·두통·오한·발진·구토·설사처럼 뉴스나 일상에서 흔히 접하는 단어에는 괄호 설명을 달지 않는다.
9) "컨텍스트에 따르면", "제공된 데이터 기준", "근거 문헌상", "지식 그래프 기반" 같은 메타 표현은 사용하지 않는다.
10) 불필요하게 딱딱한 문장, 보고서체 표현을 피하고 자연스러운 상담 문장으로 작성한다.
11) 문어체보다 구어체에 가깝게 작성한다. (예: "~일 수 있습니다"보다 "~일 수 있어요")
12) 답변 시작에 1~2줄 "제 결론이에요."를 먼저 제시한다.
13) "왜 이렇게 생각했냐면요."에는 추론 근거만 작성하고, 다른 질환이 아니라는 반박 내용은 쓰지 않는다.
14) "예상되는 증상이에요."에는 가장 가능성이 높은 질환/상태 1가지만 제시한다. 여러 질환을 나열하지 않는다.
15) "제 결론이에요."는 새로운 내용을 만들지 말고, 아래 항목을 요약만 해서 작성한다.
   - "예상되는 증상이에요."의 핵심 질환/상태
   - "왜 이렇게 생각했냐면요."에서 가장 가능성이 높은 근거 1~2개
   - "이렇게 관리해보세요."에서 우선 관리 방법 1~2개
16) 증상명/질환명은 한국어로만 작성하고, 영어 이름(예: Common Cold, Influenza, Rhinitis)은 쓰지 않는다.
17) 모든 섹션에서 희귀 질환이나 일반 한국 성인 기준 발생 빈도가 낮은 질환은 언급하지 않는다. 반드시 동네 의원·내과·이비인후과 등 1차 의료기관에서 일상적으로 접하는 흔한 질환만 다룬다.

출력 형식:
- 반드시 JSON만 출력한다. 마크다운, 설명 문장, 코드펜스는 금지한다.
- 반드시 아래 형태를 정확히 지킨다.
{
  "sections": [
    { "title": "제 결론이에요.", "content": "예상되는 질환/상태 + 핵심 근거 1~2개 + 우선 관리 방법 1~2개를 1~2줄로 요약(새 정보 추가 금지)" },
    { "title": "예상되는 증상이에요.", "content": "핵심 결론 1~2문장" },
    { "title": "왜 이렇게 생각했냐면요.", "content": [{ "keyword": "...", "description": "..." }] },
    { "title": "이렇게 관리해보세요.", "content": [{ "keyword": "...", "description": "..." }] },
    { "title": "추천 대응", "content": [{ "keyword": "...", "description": "..." }] }
  ]
}
- 아래 3개 섹션의 content는 반드시 배열 형태로 작성한다.
  - "왜 이렇게 생각했냐면요."
  - "이렇게 관리해보세요."
  - "추천 대응"
- "추천 대응" 배열에는 아래 keyword가 반드시 각각 1개 이상 포함되어야 한다.
  - "자연 관찰 가능"
  - "약국/외래 권장"
  - "즉시 진료/응급실"
- 마지막 문장은 반드시 면책 문구로 끝낸다.
`;

function stringifyContext(llmContext: LlmDiseaseContext): string {
    const hasSymptoms = (llmContext.symptoms ?? []).length > 0;
    const hasDiseases = (llmContext.diseases ?? []).length > 0;
    if (!hasSymptoms && !hasDiseases) {
        return "증상 컨텍스트 없음";
    }
    return JSON.stringify(llmContext, null, 2);
}

export function buildGeminiUserPrompt(input: GeminiPromptInput): string {
    return `
[사용자 증상 입력]
${input.userMessage}

[지식 그래프 기반 LLM 컨텍스트(JSON)]
${stringifyContext(input.llmContext)}

[작성 지시]
- 위 컨텍스트를 근거로만 답변을 구성하되, 정보가 부족하면 부족하다고 명시해.
- 공포를 유발하지 말고, 실천 가능한 순서로 설명해.
- 희귀 질환이나 발생 빈도가 낮은 질환은 모든 섹션에서 제외해. 1차 의료기관에서 일상적으로 접하는 흔한 질환만 언급해.
- "추천 대응" 섹션은 반드시 세 단계(자연 관찰 가능 / 약국·외래 권장 / 즉시 진료·응급실)로 구분해.
- 답변 마지막 줄에 반드시 면책 문구를 넣어.
- 읽는 사람이 의료 지식이 없는 일반인이라고 가정하고 쉽게 설명해.
- 괄호 설명은 한국어 의학 전문용어에만 한국어로만 달아. 영어 표현을 괄호에 넣는 건 절대 금지. 미열·고열·발열·기침·두통·오한처럼 일상에서 흔히 쓰는 말에는 괄호 설명 자체를 달지 마.
- "컨텍스트", "데이터", "모델", "시스템 프롬프트" 같은 내부 용어는 절대 쓰지 마.
- 전반적인 문장을 딱딱한 보고서체가 아니라 상담하듯 부드러운 구어체로 유지해.
- 최종 출력은 JSON 객체 하나만 반환해.
- "예상되는 증상이에요."는 가장 가능성 높은 질환/상태 1가지만 명시하고, 여러 질환을 나열하지 마.
- "제 결론이에요."는 반드시 다른 섹션에서 이미 작성한 내용을 요약만 해. (새로운 판단/새로운 조언 추가 금지)
- 질환명/증상명은 한국어 표현만 사용하고 영어 표기는 제외해.
`.trim();
}

const GEMINI_MODEL = "gemini-2.5-flash";

function getGeminiApiKey(): string {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
        throw new Error("GEMINI_API_KEY 환경 변수가 설정되지 않았습니다.");
    }
    return apiKey;
}

function extractJsonObject(text: string): string {
    // 코드펜스(```json ... ``` 또는 ``` ... ```)가 있으면 첫 번째 블록만 추출
    const fenceMatch = text.match(/```(?:json)?\s*([\s\S]*?)```/);
    const cleaned = fenceMatch ? fenceMatch[1].trim() : text.trim();

    if (cleaned.startsWith("{") && cleaned.endsWith("}")) {
        return cleaned;
    }

    const match = cleaned.match(/\{[\s\S]*\}/);
    return match ? match[0] : cleaned;
}

function stripEnglishParentheses(text: string): string {
    return text.replace(/\s*\([A-Za-z][A-Za-z\s\-']*\)/g, "");
}

function toSectionsFromUnknown(raw: unknown): AnalysisSection[] {
    if (!raw || typeof raw !== "object") {
        return [];
    }

    const maybeSections = (raw as { sections?: unknown }).sections;
    if (!Array.isArray(maybeSections)) {
        return [];
    }

    const sections: AnalysisSection[] = maybeSections
        .map((item) => {
            if (!item || typeof item !== "object") {
                return null;
            }
            const title = String((item as { title?: unknown }).title ?? "").trim();
            const rawContent = (item as { content?: unknown }).content;
            let content: AnalysisSection["content"] = "";

            if (typeof rawContent === "string") {
                content = stripEnglishParentheses(rawContent.trim());
            } else if (Array.isArray(rawContent)) {
                const keywordItems = rawContent
                    .map((entry) => {
                        if (!entry || typeof entry !== "object") {
                            return null;
                        }
                        const keyword = stripEnglishParentheses(String((entry as { keyword?: unknown }).keyword ?? "").trim());
                        const description = stripEnglishParentheses(String((entry as { description?: unknown }).description ?? "").trim());
                        if (!keyword || !description) {
                            return null;
                        }
                        return { keyword, description };
                    })
                    .filter((entry): entry is { keyword: string; description: string } => entry !== null);

                if (keywordItems.length > 0) {
                    content = keywordItems;
                }
            }

            if (!title || !content) {
                return null;
            }
            return { title, content };
        })
        .filter((item): item is AnalysisSection => item !== null);

    return sections;
}

export async function generateMedicalGuidance(input: GeminiPromptInput): Promise<AnalysisSection[]> {
    const client = new GoogleGenerativeAI(getGeminiApiKey());
    const model = client.getGenerativeModel({
        model: GEMINI_MODEL,
        systemInstruction: MEDICAL_SYSTEM_PROMPT,
    });

    const prompt = buildGeminiUserPrompt(input);
    const result = await model.generateContent(prompt);
    const rawText = result.response.text().trim();

    try {
        const parsed = JSON.parse(extractJsonObject(rawText)) as unknown;
        const sections = toSectionsFromUnknown(parsed);
        if (sections.length > 0) {
            return sections;
        }
    } catch {
        // fall through
    }

    return [{ title: "AI 분석 결과", content: rawText }];
}

// ─── 동적 추가 질문 생성 ───────────────────────────────────────────────

const FOLLOW_UP_QUESTIONS_SYSTEM_PROMPT = `
너는 한국어 의료 상담 보조 AI다.
환자의 증상과 의학 지식 분석 결과를 보고, 가능성 있는 질환 중 가장 유력한 1가지를 특정하기 위해 필요한 추가 정보를 예/아니오 질문으로 생성해라.

규칙:
1. 반드시 한국어로만 작성한다.
2. 질문은 환자가 예 또는 아니오로만 답할 수 있어야 한다.
3. 의학 용어 없이 환자가 쉽게 이해하는 일상 언어를 사용한다.
4. 감별진단에 결정적인 차이를 묻는 질문만 선택한다. (예: 발병 속도, 발열 여부, 특정 부위 통증 등)
5. 이미 입력된 증상 정보만으로 1가지 질환을 특정할 수 있다면 빈 배열 []을 반환한다.
6. 질문이 필요한 경우에도 최대 7개를 넘지 않는다.
7. 반드시 JSON 배열만 출력한다. 다른 텍스트, 마크다운, 코드펜스는 절대 금지한다.

출력 형식 (JSON 배열, 질문 불필요 시 빈 배열):
[]
또는
[
  { "id": "q1", "text": "질문 내용" }
]
`.trim();

export interface DynamicFollowUpQuestion {
    id: string;
    text: string;
}

function extractJsonArray(text: string): string {
    const trimmed = text.trim();
    if (trimmed.startsWith("[")) return trimmed;
    const match = trimmed.match(/\[[\s\S]*\]/);
    return match ? match[0] : "[]";
}

export async function generateDynamicFollowUpQuestions(
    userMessage: string,
    llmContext: LlmDiseaseContext,
): Promise<DynamicFollowUpQuestion[]> {
    const client = new GoogleGenerativeAI(getGeminiApiKey());
    const model = client.getGenerativeModel({
        model: GEMINI_MODEL,
        systemInstruction: FOLLOW_UP_QUESTIONS_SYSTEM_PROMPT,
    });

    const prompt = `[사용자 증상 입력]\n${userMessage}\n\n[의학 지식 분석 결과(JSON)]\n${stringifyContext(llmContext)}`;

    const result = await model.generateContent(prompt);
    const rawText = result.response.text().trim();

    try {
        const parsed = JSON.parse(extractJsonArray(rawText)) as unknown;
        if (Array.isArray(parsed)) {
            return parsed
                .filter((q): q is Record<string, unknown> => typeof q === "object" && q !== null)
                .map((q, i) => ({
                    id: String(q.id ?? `q${i + 1}`),
                    text: String(q.text ?? "").trim(),
                }))
                .filter((q) => q.text.length > 0)
                .slice(0, 7);
        }
    } catch {
        // fall through
    }

    return [];
}

export { GEMINI_MODEL };
