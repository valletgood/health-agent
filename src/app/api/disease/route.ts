import { NextRequest } from "next/server";
import { searchDiseaseCandidates, verifyNeo4jConnection, type DiseaseIntakePayload } from "@/lib/neo4j";

export async function POST(request: NextRequest) {
    let payload: DiseaseIntakePayload;

    try {
        payload = (await request.json()) as DiseaseIntakePayload;
    } catch {
        return Response.json({ error: "요청 본문(JSON)을 읽을 수 없습니다." }, { status: 400 });
    }

    const hasAnyInput = (payload.symptoms?.length ?? 0) > 0 || (payload.conditions?.length ?? 0) > 0 || Boolean(payload.otherSymptoms?.trim()) || Boolean(payload.visitPurpose?.trim());

    if (!hasAnyInput) {
        return Response.json({ error: "문진표 정보가 비어 있습니다. 증상 또는 병력 정보를 포함해 주세요." }, { status: 400 });
    }

    try {
        await verifyNeo4jConnection();
        const data = await searchDiseaseCandidates(payload);

        return Response.json({
            ok: true,
            message: "문진표 기반 Neo4j 후보 노드 조회가 완료되었습니다.",
            data,
        });
    } catch (error) {
        console.error("Neo4j disease search failed:", error);
        return Response.json({ error: "Neo4j 조회 중 오류가 발생했습니다. 연결 정보 및 그래프 데이터를 확인해 주세요." }, { status: 500 });
    }
}
