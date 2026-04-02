import "server-only";
import type { Hospital, HospitalSearchResult, Pharmacy, PharmacySearchResult } from "@/lib/hospital-types";

const HIRA_BASE_URL = "https://apis.data.go.kr/B551182/hospInfoServicev2/getHospBasisList";
const HIRA_PHARM_URL = "https://apis.data.go.kr/B551182/pharmacyInfoService/getParmacyBasisList";
const SEARCH_RADIUS_METERS = 1000;
const MAX_RESULTS_PER_SPECIALTY = 30;

function getHiraApiKey(): string {
    const key = process.env.HIRA_API_KEY;
    if (!key) throw new Error("HIRA_API_KEY 환경 변수가 설정되지 않았습니다.");
    return key;
}

// HIRA API는 결과가 1건이면 item이 배열이 아닌 객체로 내려옴
function toItemArray(item: unknown): unknown[] {
    if (!item) return [];
    if (Array.isArray(item)) return item;
    return [item];
}

function parseHospital(raw: Record<string, unknown>): Hospital {
    return {
        name: String(raw.yadmNm ?? ""),
        address: String(raw.addr ?? ""),
        phone: String(raw.telno ?? ""),
        type: String(raw.clCdNm ?? ""),
        lat: parseFloat(String(raw.YPos ?? "0")), // HIRA 응답은 대문자 YPos
        lng: parseFloat(String(raw.XPos ?? "0")), // HIRA 응답은 대문자 XPos
        distanceMeters: parseInt(String(raw.distance ?? "0"), 10),
        specialtyCodes: String(raw.dgsbjtCd ?? "")
            .trim()
            .split(/\s+/)
            .filter(Boolean),
    };
}

async function fetchBySpecialty(lat: number, lng: number, specialtyCode: string): Promise<Hospital[]> {
    // ServiceKey는 디코딩된 키를 사용 — URLSearchParams이 인코딩 처리
    const params = new URLSearchParams({
        ServiceKey: getHiraApiKey(),
        xPos: String(lng),
        yPos: String(lat),
        radius: String(SEARCH_RADIUS_METERS),
        dgsbjtCd: specialtyCode,
        pageNo: "1",
        numOfRows: String(MAX_RESULTS_PER_SPECIALTY),
        _type: "json",
    });

    const res = await fetch(`${HIRA_BASE_URL}?${params.toString()}`, { cache: "no-store" });

    if (!res.ok) {
        throw new Error(`HIRA API 요청 실패 (${specialtyCode}): HTTP ${res.status}`);
    }

    const data = (await res.json()) as {
        response?: {
            body?: {
                items?: { item?: unknown };
            };
        };
    };

    const rawItems = data?.response?.body?.items?.item;
    return toItemArray(rawItems)
        .filter((item): item is Record<string, unknown> => typeof item === "object" && item !== null)
        .map((raw) => ({ ...parseHospital(raw), specialtyCodes: [specialtyCode] }))
        .filter((h) => h.name !== "" && h.lat !== 0 && h.lng !== 0);
}

export async function searchNearbyHospitals(lat: number, lng: number, specialtyCodes: string[]): Promise<HospitalSearchResult> {
    if (specialtyCodes.length === 0) {
        return { hospitals: [], totalCount: 0 };
    }

    // 진료과목별 병렬 조회
    const settled = await Promise.allSettled(specialtyCodes.map((code) => fetchBySpecialty(lat, lng, code)));

    // 결과 병합 + 병원명 기준 중복 제거
    const seen = new Set<string>();
    const hospitals: Hospital[] = [];

    for (const result of settled) {
        if (result.status !== "fulfilled") continue;
        for (const hospital of result.value) {
            if (seen.has(hospital.name)) continue;
            seen.add(hospital.name);
            hospitals.push(hospital);
        }
    }

    // 거리 오름차순 정렬
    hospitals.sort((a, b) => a.distanceMeters - b.distanceMeters);

    return { hospitals, totalCount: hospitals.length };
}

export async function searchNearbyPharmacies(lat: number, lng: number): Promise<PharmacySearchResult> {
    const params = new URLSearchParams({
        ServiceKey: getHiraApiKey(),
        xPos: String(lng),
        yPos: String(lat),
        radius: String(SEARCH_RADIUS_METERS),
        pageNo: "1",
        numOfRows: String(MAX_RESULTS_PER_SPECIALTY),
        _type: "json",
    });

    const res = await fetch(`${HIRA_PHARM_URL}?${params.toString()}`, { cache: "no-store" });
    if (!res.ok) {
        throw new Error(`HIRA 약국 API 요청 실패: HTTP ${res.status}`);
    }

    const data = (await res.json()) as {
        response?: { body?: { items?: { item?: unknown } } };
    };

    const rawItems = data?.response?.body?.items?.item;
    const pharmacies: Pharmacy[] = toItemArray(rawItems)
        .filter((item): item is Record<string, unknown> => typeof item === "object" && item !== null)
        .map((raw) => ({
            name: String(raw.yadmNm ?? ""),
            address: String(raw.addr ?? ""),
            phone: String(raw.telno ?? ""),
            lat: parseFloat(String(raw.YPos ?? "0")),
            lng: parseFloat(String(raw.XPos ?? "0")),
            distanceMeters: parseInt(String(raw.distance ?? "0"), 10),
        }))
        .filter((p) => p.name !== "" && p.lat !== 0 && p.lng !== 0);

    pharmacies.sort((a, b) => a.distanceMeters - b.distanceMeters);

    return { pharmacies, totalCount: pharmacies.length };
}
