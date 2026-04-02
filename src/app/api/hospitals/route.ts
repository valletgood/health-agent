import { NextRequest } from "next/server";
import { searchNearbyHospitals } from "@/lib/hira";

interface HospitalSearchBody {
    lat?: number;
    lng?: number;
    specialtyCodes?: string[];
}

export async function POST(request: NextRequest) {
    let body: HospitalSearchBody;

    try {
        body = (await request.json()) as HospitalSearchBody;
    } catch {
        return Response.json({ error: "요청 본문(JSON)을 읽을 수 없습니다." }, { status: 400 });
    }

    const { lat, lng, specialtyCodes } = body;

    if (typeof lat !== "number" || typeof lng !== "number") {
        return Response.json({ error: "위치 정보(lat, lng)가 필요합니다." }, { status: 400 });
    }

    if (!Array.isArray(specialtyCodes) || specialtyCodes.length === 0) {
        return Response.json({ error: "진료과목 코드(specialtyCodes)가 필요합니다." }, { status: 400 });
    }

    try {
        const result = await searchNearbyHospitals(lat, lng, specialtyCodes);
        return Response.json({
            ok: true,
            message: "주변 병원 조회가 완료되었습니다.",
            data: result,
        });
    } catch (error) {
        console.error("HIRA hospital search failed:", error);
        return Response.json(
            { error: "병원 조회 중 오류가 발생했습니다. 잠시 후 다시 시도해 주세요." },
            { status: 500 }
        );
    }
}
