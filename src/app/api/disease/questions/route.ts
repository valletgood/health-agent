import { NextRequest } from "next/server";
import { generateDynamicFollowUpQuestions } from "@/lib/gemini";
import type { LlmDiseaseContext } from "@/lib/intake-types";

interface QuestionsBody {
    userMessage?: string;
    llmContext?: LlmDiseaseContext;
}

export async function POST(request: NextRequest) {
    let body: QuestionsBody;
    try {
        body = (await request.json()) as QuestionsBody;
    } catch {
        return Response.json({ error: "요청 본문(JSON)을 읽을 수 없습니다." }, { status: 400 });
    }

    const { userMessage, llmContext } = body;

    if (!userMessage || !llmContext) {
        return Response.json({ error: "userMessage와 llmContext가 필요합니다." }, { status: 400 });
    }

    try {
        const questions = await generateDynamicFollowUpQuestions(userMessage, llmContext);
        return Response.json({ ok: true, data: { questions } });
    } catch (error) {
        console.error("Follow-up question generation failed:", error);
        return Response.json({ data: { questions: [] } }); // 실패해도 빈 질문으로 진행
    }
}
