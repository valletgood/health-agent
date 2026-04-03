import { NextRequest } from "next/server";
import { db } from "@/db";
import { symptomLogs } from "@/db/schema";
import { and, eq } from "drizzle-orm";
import { resolveUserId } from "@/lib/auth-utils";

export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    const userId = await resolveUserId(request);
    if (!userId) {
        return Response.json({ error: "로그인이 필요합니다." }, { status: 401 });
    }

    const { id } = await params;

    let body: Record<string, unknown>;
    try {
        body = (await request.json()) as Record<string, unknown>;
    } catch {
        return Response.json({ error: "요청 본문(JSON)을 읽을 수 없습니다." }, { status: 400 });
    }

    const { overallScore, symptoms, memo } = body;

    try {
        const result = await db
            .update(symptomLogs)
            .set({
                ...(typeof overallScore === "number" ? { overallScore } : {}),
                ...(Array.isArray(symptoms) ? { symptoms } : {}),
                ...(typeof memo === "string" ? { memo } : {}),
            })
            .where(and(eq(symptomLogs.id, id), eq(symptomLogs.deviceId, userId)));

        if (result.rowCount === 0) {
            return Response.json({ error: "기록을 찾을 수 없습니다." }, { status: 404 });
        }

        return Response.json({ ok: true });
    } catch (error) {
        console.error("Failed to update symptom log:", error);
        return Response.json({ error: "증상 일지 수정에 실패했습니다." }, { status: 500 });
    }
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    const userId = await resolveUserId(request);
    if (!userId) {
        return Response.json({ error: "로그인이 필요합니다." }, { status: 401 });
    }

    const { id } = await params;

    try {
        const result = await db
            .delete(symptomLogs)
            .where(and(eq(symptomLogs.id, id), eq(symptomLogs.deviceId, userId)));

        if (result.rowCount === 0) {
            return Response.json({ error: "기록을 찾을 수 없습니다." }, { status: 404 });
        }

        return Response.json({ ok: true });
    } catch (error) {
        console.error("Failed to delete symptom log:", error);
        return Response.json({ error: "증상 일지 삭제에 실패했습니다." }, { status: 500 });
    }
}
