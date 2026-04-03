import { NextRequest } from "next/server";
import { db } from "@/db";
import { symptomLogs } from "@/db/schema";
import { and, desc, eq, gte } from "drizzle-orm";
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

    const { date, overallScore, symptoms, memo } = body;

    if (typeof date !== "string" || typeof overallScore !== "number" || !Array.isArray(symptoms)) {
        return Response.json({ error: "필수 데이터가 누락되었습니다." }, { status: 400 });
    }

    if (overallScore < 1 || overallScore > 10) {
        return Response.json({ error: "컨디션 점수는 1~10 사이여야 합니다." }, { status: 400 });
    }

    try {
        // 같은 날짜에 이미 기록이 있으면 업데이트
        const [existing] = await db
            .select({ id: symptomLogs.id })
            .from(symptomLogs)
            .where(and(eq(symptomLogs.deviceId, userId), eq(symptomLogs.date, date)));

        if (existing) {
            await db
                .update(symptomLogs)
                .set({ overallScore, symptoms, memo: (memo as string) ?? "" })
                .where(eq(symptomLogs.id, existing.id));

            return Response.json({ ok: true, data: { id: existing.id, updated: true } });
        }

        const [record] = await db
            .insert(symptomLogs)
            .values({
                deviceId: userId,
                date,
                overallScore,
                symptoms,
                memo: (memo as string) ?? "",
            })
            .returning({ id: symptomLogs.id });

        return Response.json({ ok: true, data: { id: record.id, updated: false } });
    } catch (error) {
        console.error("Failed to save symptom log:", error);
        return Response.json({ error: "증상 일지 저장에 실패했습니다." }, { status: 500 });
    }
}

export async function GET(request: NextRequest) {
    const userId = await resolveUserId(request);
    if (!userId) {
        return Response.json({ error: "로그인이 필요합니다." }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const days = parseInt(searchParams.get("days") ?? "30", 10);
    const since = new Date();
    since.setDate(since.getDate() - days);
    const sinceDate = since.toISOString().split("T")[0];

    try {
        const logs = await db
            .select()
            .from(symptomLogs)
            .where(and(eq(symptomLogs.deviceId, userId), gte(symptomLogs.date, sinceDate)))
            .orderBy(desc(symptomLogs.date));

        return Response.json({ ok: true, data: { logs } });
    } catch (error) {
        console.error("Failed to fetch symptom logs:", error);
        return Response.json({ error: "증상 일지 조회에 실패했습니다." }, { status: 500 });
    }
}
