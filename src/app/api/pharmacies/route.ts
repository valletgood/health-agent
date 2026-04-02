import { NextRequest } from "next/server";
import { searchNearbyPharmacies } from "@/lib/hira";

interface PharmacySearchBody {
    lat?: number;
    lng?: number;
}

export async function POST(request: NextRequest) {
    let body: PharmacySearchBody;

    try {
        body = (await request.json()) as PharmacySearchBody;
    } catch {
        return Response.json({ error: "요청 본문(JSON)을 읽을 수 없습니다." }, { status: 400 });
    }

    const { lat, lng } = body;

    if (typeof lat !== "number" || typeof lng !== "number") {
        return Response.json({ error: "위치 정보(lat, lng)가 필요합니다." }, { status: 400 });
    }

    try {
        const result = await searchNearbyPharmacies(lat, lng);
        return Response.json({
            ok: true,
            message: "주변 약국 조회가 완료되었습니다.",
            data: result,
        });
    } catch (error) {
        console.error("HIRA pharmacy search failed:", error);
        return Response.json(
            { error: "약국 조회 중 오류가 발생했습니다. 잠시 후 다시 시도해 주세요." },
            { status: 500 },
        );
    }
}
