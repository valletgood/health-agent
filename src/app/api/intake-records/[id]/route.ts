import { NextRequest } from "next/server";
import { db } from "@/db";
import { intakeRecords } from "@/db/schema";
import { and, eq } from "drizzle-orm";
import { resolveUserId } from "@/lib/auth-utils";

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    const userId = await resolveUserId(request);
    if (!userId) {
        return Response.json({ error: "로그인이 필요합니다." }, { status: 401 });
    }

    const { id } = await params;

    try {
        const [record] = await db
            .select()
            .from(intakeRecords)
            .where(and(eq(intakeRecords.id, id), eq(intakeRecords.deviceId, userId)));

        if (!record) {
            return Response.json({ error: "기록을 찾을 수 없습니다." }, { status: 404 });
        }

        return Response.json({ ok: true, data: { record } });
    } catch (error) {
        console.error("Failed to fetch intake record:", error);
        return Response.json({ error: "문진 기록 조회에 실패했습니다." }, { status: 500 });
    }
}
