import { NextRequest } from "next/server";
import { generateMedicalGuidance, GEMINI_MODEL, type LlmDiseaseContext } from "@/lib/gemini";

interface DiseaseAnalysisRequestBody {
    userMessage?: string;
    llmContext?: LlmDiseaseContext;
}

export async function POST(request: NextRequest) {
    let body: DiseaseAnalysisRequestBody;

    try {
        body = (await request.json()) as DiseaseAnalysisRequestBody;
    } catch {
        return Response.json({ error: "요청 본문(JSON)을 읽을 수 없습니다." }, { status: 400 });
    }

    const userMessage = body.userMessage?.trim() ?? "";
    if (!userMessage) {
        return Response.json({ error: "userMessage가 필요합니다." }, { status: 400 });
    }

    const llmContext = body.llmContext;
    if (!llmContext || !Array.isArray(llmContext.symptoms)) {
        return Response.json({ error: "llmContext가 필요합니다." }, { status: 400 });
    }

    try {
        const sections = await generateMedicalGuidance({ userMessage, llmContext });
        return Response.json({
            ok: true,
            message: "Gemini 분석이 완료되었습니다.",
            data: {
                model: GEMINI_MODEL,
                sections,
            },
        });
    } catch (error) {
        console.error("Gemini disease analysis failed:", error);
        return Response.json({ error: "Gemini 분석 중 오류가 발생했습니다." }, { status: 500 });
    }
}
