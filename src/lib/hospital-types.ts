export interface Hospital {
    name: string;
    address: string;
    phone: string;
    type: string; // 의원 | 병원 | 종합병원 등
    lat: number;
    lng: number;
    distanceMeters: number;
    specialtyCodes: string[]; // HIRA dgsbjtCd 목록
}

export interface HospitalSearchResult {
    hospitals: Hospital[];
    totalCount: number;
}

export interface Pharmacy {
    name: string;
    address: string;
    phone: string;
    lat: number;
    lng: number;
    distanceMeters: number;
}

export interface PharmacySearchResult {
    pharmacies: Pharmacy[];
    totalCount: number;
}

// 건강보험심사평가원 진료과목 코드 (dgsbjtCd)
export const SPECIALTY_CODES: Record<string, string> = {
    "00": "일반의",
    "01": "내과",
    "02": "신경과",
    "03": "정신건강의학과",
    "04": "외과",
    "05": "정형외과",
    "06": "신경외과",
    "08": "성형외과",
    "10": "산부인과",
    "11": "소아청소년과",
    "12": "안과",
    "13": "이비인후과",
    "14": "피부과",
    "15": "비뇨의학과",
    "20": "재활의학과",
    "23": "가정의학과",
    "24": "응급의학과",
};
