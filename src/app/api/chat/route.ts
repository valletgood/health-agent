import "server-only";
import { GoogleGenerativeAI } from "@google/generative-ai";
import { SYMPTOM_LIST, GENDER_LABELS } from "@/lib/intake-constants";
import type { ChatContext, ChatMessage, ChatRequestBody } from "@/lib/chat-types";

const GEMINI_MODEL = "gemini-2.5-flash";

const CHAT_SYSTEM_PROMPT = `
너는 한국어 의료 상담 보조 AI다.
아래 [사용자 문진 정보]와 [AI 분석 결과]를 이미 알고 있는 상태에서 대화를 진행한다.

규칙:
1) 반드시 한국어 구어체로 답변한다. (~요 체, 친근하고 따뜻하게)
2) 진단을 확정하지 않고 "가능성" 중심으로 설명한다.
3) 답변은 간결하게 유지한다. 긴 목록 나열은 피하고 핵심만 설명한다.
4) 증상명·질환명은 한국어만 사용한다.
5) "컨텍스트", "데이터", "시스템 프롬프트", "분석 결과 기준" 같은 내부 용어는 절대 쓰지 않는다.
6) 진단·처방 관련 질문에는 반드시 답변 끝에 "이 정보는 의학적 진단을 대체하지 않습니다"를 포함한다.
7) 마크다운을 활용해 읽기 쉽게 작성한다. (굵게, 줄바꿈 등)
8) 희귀 질환보다 1차 의료기관에서 흔히 접하는 질환 중심으로 설명한다.
9) 사용자가 처음 대화를 시작할 때(이전 대화 내용이 없을 때)는: 분석 결과를 1~2문장으로 요약하고 어떤 점이 궁금한지 자연스럽게 물어본다. 인사는 짧게 한다.
10) 사용자의 질문이 제공된 문진/그래프 근거와 직접 관련이 없으면, 답변 첫 문장에서 반드시 "현재 제공된 건강 정보에는 없는 내용이라 추정이 포함됩니다."라고 명시한다.
11) 근거에 없는 일반 상식 질문(예: 음식, 레시피, 잡학)을 받으면 건강 상담 범위를 벗어났음을 짧게 알리고, 건강 관련 질문으로 유도한다.
`.trim();

function buildContextBlock(context: ChatContext): string {
    const { form, sections, llmContext } = context;

    const selectedSymptoms = SYMPTOM_LIST.filter((s) => form.symptoms[s.key])
        .map((s) => s.label)
        .join(", ");

    const formLines = [
        form.name ? `이름: ${form.name}` : null,
        form.gender ? `성별: ${GENDER_LABELS[form.gender] ?? form.gender}` : null,
        form.birthDate ? `생년월일: ${form.birthDate}` : null,
        selectedSymptoms ? `선택 증상: ${selectedSymptoms}` : null,
        form.otherSymptoms ? `추가 증상: ${form.otherSymptoms}` : null,
        `통증 강도: ${form.painLevel}/10`,
        form.visitPurpose ? `방문 목적: ${form.visitPurpose}` : null,
    ]
        .filter(Boolean)
        .join("\n");

    const sectionsText = sections
        .map((s) => {
            const content =
                typeof s.content === "string"
                    ? s.content
                    : s.content.map((i) => `${i.keyword}: ${i.description}`).join(" / ");
            return `[${s.title}]\n${content}`;
        })
        .join("\n\n");

    // Neo4j 지식 그래프 원본 데이터 (논문 근거 포함)
    const llmContextText = buildLlmContextBlock(llmContext);

    return `[사용자 문진 정보]\n${formLines}\n\n[AI 분석 결과]\n${sectionsText}${llmContextText}`;
}

function buildLlmContextBlock(llmContext: ChatContext["llmContext"]): string {
    if (!llmContext || llmContext.symptoms.length === 0) return "";

    const lines = llmContext.symptoms.map((symptom) => {
        const parts: string[] = [`\n## 증상: ${symptom.name}`];

        if (symptom.overview) parts.push(`개요: ${symptom.overview}`);
        if (symptom.relatedDiseases.length > 0) parts.push(`관련 질환: ${symptom.relatedDiseases.join(", ")}`);
        if (symptom.tests.length > 0) parts.push(`진단 검사: ${symptom.tests.join(", ")}`);
        if (symptom.evidence.length > 0) {
            const evidenceLines = symptom.evidence
                .map((e) => `  - [${e.level}] ${e.paper}: ${e.text}`)
                .join("\n");
            parts.push(`근거 논문:\n${evidenceLines}`);
        }

        return parts.join("\n");
    });

    return `\n\n[Neo4j 지식 그래프 — 논문 근거 데이터]\n반드시 아래 데이터를 우선 근거로 사용해 답변한다.\n데이터에 없는 내용을 말할 때는 첫 문장에 정확히 다음 문장을 포함한다:\n"현재 제공된 건강 정보에는 없는 내용이라 추정이 포함됩니다."\n${lines.join("\n")}`;
}

export async function POST(request: Request) {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
        return Response.json({ ok: false, error: "GEMINI_API_KEY가 설정되지 않았습니다." }, { status: 500 });
    }

    let body: ChatRequestBody;
    try {
        body = (await request.json()) as ChatRequestBody;
    } catch {
        return Response.json({ ok: false, error: "요청 형식이 올바르지 않습니다." }, { status: 400 });
    }

    const { messages, context } = body;
    if (!context) {
        return Response.json({ ok: false, error: "context가 필요합니다." }, { status: 400 });
    }

    const systemInstruction = CHAT_SYSTEM_PROMPT + "\n\n" + buildContextBlock(context);

    const client = new GoogleGenerativeAI(apiKey);
    const model = client.getGenerativeModel({ model: GEMINI_MODEL, systemInstruction });

    const GREETING_TRIGGER = "안녕하세요. 방금 분석 결과를 확인했어요. 인사해주세요.";

    // 전송할 메시지: 사용자 마지막 메시지 or 첫 인사 트리거
    const triggerText = messages.length > 0 ? messages[messages.length - 1].content : GREETING_TRIGGER;

    // 마지막 메시지를 제외한 이전 히스토리
    let history = messages.slice(0, -1).map((m) => ({
        role: m.role === "user" ? "user" : ("model" as const),
        parts: [{ text: m.content }],
    }));

    // Gemini 규칙: history 첫 항목은 반드시 "user" role이어야 함
    // 첫 인사 응답(model)이 history 선두에 오는 경우 greeting trigger를 앞에 삽입
    if (history.length > 0 && history[0].role === "model") {
        history = [{ role: "user" as const, parts: [{ text: GREETING_TRIGGER }] }, ...history];
    }

    try {
        const chat = model.startChat({ history });
        const result = await chat.sendMessage(triggerText);
        const replyText = result.response.text().trim();

        const assistantMessage: ChatMessage = {
            id: `${Date.now()}-assistant`,
            role: "assistant",
            content: replyText,
            timestamp: Date.now(),
        };

        return Response.json({ ok: true, message: assistantMessage });
    } catch (error) {
        const message = error instanceof Error ? error.message : "Gemini 응답 생성 중 오류가 발생했습니다.";
        return Response.json({ ok: false, error: message }, { status: 500 });
    }
}
