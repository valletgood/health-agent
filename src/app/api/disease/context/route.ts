import { NextRequest } from "next/server";
import { buildLlmContextFromDiseaseContext, getDiseaseContextByNodeIds, verifyNeo4jConnection } from "@/lib/neo4j";

interface DiseaseContextRequestBody {
    nodeIds?: string[];
}

export async function POST(request: NextRequest) {
    let body: DiseaseContextRequestBody;

    try {
        body = (await request.json()) as DiseaseContextRequestBody;
    } catch {
        return Response.json({ error: "요청 본문(JSON)을 읽을 수 없습니다." }, { status: 400 });
    }

    const nodeIds = body.nodeIds ?? [];
    if (!Array.isArray(nodeIds) || nodeIds.length === 0) {
        return Response.json({ error: "nodeIds 배열이 필요합니다." }, { status: 400 });
    }

    try {
        await verifyNeo4jConnection();
        const context = await getDiseaseContextByNodeIds(nodeIds);
        const llmContext = buildLlmContextFromDiseaseContext(context);

        return Response.json({
            ok: true,
            message: "후보 노드 기반 상세 컨텍스트 조회가 완료되었습니다.",
            data: {
                count: context.length,
                context,
                llmContext,
            },
        });
    } catch (error) {
        console.error("Neo4j disease context fetch failed:", error);
        return Response.json(
            { error: "Neo4j 상세 컨텍스트 조회 중 오류가 발생했습니다." },
            { status: 500 }
        );
    }
}
