import { NextRequest } from "next/server";
import { db } from "@/db";
import { intakeRecords } from "@/db/schema";
import { desc, eq } from "drizzle-orm";
import { resolveUserId } from "@/lib/auth-utils";

export async function POST(request: NextRequest) {
    const userId = await resolveUserId(request);
    if (!userId) {
        return Response.json({ error: "로그인이 필요합니다." }, { status: 401 });
    }

    let body: Record<string, unknown>;
    try {
        body = (await request.json()) as Record<string, unknown>;
    } catch {
        return Response.json({ error: "요청 본문(JSON)을 읽을 수 없습니다." }, { status: 400 });
    }

    const { formData, analysisSections, specialtyCodes, llmContext, followUpAnswers } = body;

    if (!formData || !analysisSections || !specialtyCodes) {
        return Response.json({ error: "필수 데이터가 누락되었습니다." }, { status: 400 });
    }

    try {
        const [record] = await db
            .insert(intakeRecords)
            .values({
                deviceId: userId,
                formData,
                analysisSections,
                specialtyCodes: specialtyCodes as string[],
                llmContext: llmContext ?? null,
                followUpAnswers: followUpAnswers ?? null,
            })
            .returning({ id: intakeRecords.id });

        return Response.json({ ok: true, data: { id: record.id } });
    } catch (error) {
        console.error("Failed to save intake record:", error);
        return Response.json({ error: "문진 기록 저장에 실패했습니다." }, { status: 500 });
    }
}

export async function GET(request: NextRequest) {
    const userId = await resolveUserId(request);
    if (!userId) {
        return Response.json({ error: "로그인이 필요합니다." }, { status: 401 });
    }

    try {
        const records = await db
            .select()
            .from(intakeRecords)
            .where(eq(intakeRecords.deviceId, userId))
            .orderBy(desc(intakeRecords.createdAt));

        return Response.json({ ok: true, data: { records } });
    } catch (error) {
        console.error("Failed to fetch intake records:", error);
        return Response.json({ error: "문진 기록 조회에 실패했습니다." }, { status: 500 });
    }
}
