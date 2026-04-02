import { getAllSymptoms } from "@/lib/neo4j";

export async function GET() {
    try {
        const symptoms = await getAllSymptoms();
        return Response.json({ ok: true, data: { symptoms } });
    } catch (error) {
        console.error("Neo4j symptoms fetch failed:", error);
        return Response.json({ error: "증상 목록 조회 중 오류가 발생했습니다." }, { status: 500 });
    }
}
