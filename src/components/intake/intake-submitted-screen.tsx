"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { NearbySearchSheet } from "@/components/ui/nearby-search-sheet";
import { SPECIALTY_CODES, type Hospital, type Pharmacy } from "@/lib/hospital-types";
import type { AnalysisSection, IntakeFormData, LlmDiseaseContext } from "@/lib/intake-types";
import type { FollowUpAnswer } from "@/lib/intake-questions";
import { saveChatContext } from "@/lib/chat-storage";
import { getDeviceId } from "@/lib/device-id";
import { cn } from "@/lib/utils";

interface IntakeSubmittedScreenProps {
    form: IntakeFormData;
    analysisSections: AnalysisSection[];
    specialtyCodes: string[];
    llmContext: LlmDiseaseContext | null;
    followUpAnswers?: FollowUpAnswer[];
    readOnly?: boolean;
    onReset?: () => void;
}

type ModalType = "hospital" | "pharmacy" | null;
type LoadState = "idle" | "locating" | "loading" | "done" | "error";

interface ConfidenceInfo {
    score: number;
    label: string;
    labelClass: string;
    barClass: string;
    bgClass: string;
    description: string;
}

function computeConfidence(llmContext: LlmDiseaseContext | null): ConfidenceInfo {
    if (!llmContext) {
        return { score: 0, label: "낮음", labelClass: "text-cs-outline-variant", barClass: "bg-cs-outline-variant", bgClass: "bg-muted", description: "지식 그래프에서 관련 정보를 찾지 못해 분석 정확도가 낮을 수 있어요." };
    }

    const symptoms = llmContext.symptoms ?? [];
    const symptomCount = symptoms.length;
    // 직접 fetch된 Disease 노드 + Symptom에 연결된 relatedDiseases 합산
    const totalRelatedDiseases = symptoms.reduce((sum, s) => sum + (s.relatedDiseases?.length ?? 0), 0);
    const diseaseCount = (llmContext.diseases?.length ?? 0) + totalRelatedDiseases;
    const totalEvidence = symptoms.reduce((sum, s) => sum + (s.evidence?.length ?? 0), 0);

    const symptomScore = Math.min(symptomCount / 2, 1) * 50;
    const diseaseScore = Math.min(diseaseCount / 5, 1) * 30;
    const evidenceScore = Math.min(totalEvidence / 3, 1) * 20;
    const score = Math.round(symptomScore + diseaseScore + evidenceScore);

    if (score >= 70) {
        return { score, label: "높음", labelClass: "text-primary", barClass: "bg-primary", bgClass: "bg-cs-primary-tint", description: "관련 의학 정보가 충분히 수집되어 분석 신뢰도가 높아요." };
    }
    if (score >= 40) {
        return { score, label: "보통", labelClass: "text-cs-tertiary", barClass: "bg-cs-tertiary", bgClass: "bg-cs-tertiary-container", description: "일부 정보가 부족해 분석이 다소 제한될 수 있어요." };
    }
    return { score, label: "낮음", labelClass: "text-cs-outline-variant", barClass: "bg-cs-outline-variant", bgClass: "bg-muted", description: "증상 관련 정보가 적어 분석 정확도가 낮을 수 있어요." };
}

const formatDistance = (meters: number): string => {
    if (meters < 1000) return `${meters}m`;
    return `${(meters / 1000).toFixed(1)}km`;
};

const getCoords = async (): Promise<{ lat: number; lng: number }> => {
    if (!navigator.geolocation) throw new Error("이 브라우저는 위치 정보를 지원하지 않습니다.");
    const position = await new Promise<GeolocationPosition>((resolve, reject) =>
        navigator.geolocation.getCurrentPosition(resolve, reject, {
            timeout: 10000,
            maximumAge: 60000,
        }),
    );
    return { lat: position.coords.latitude, lng: position.coords.longitude };
};

export const IntakeSubmittedScreen = ({ form, analysisSections, specialtyCodes, llmContext, followUpAnswers, readOnly, onReset }: IntakeSubmittedScreenProps) => {
    const router = useRouter();
    const savedRef = useRef(false);
    const [openModal, setOpenModal] = useState<ModalType>(null);
    const [saveToast, setSaveToast] = useState(false);
    const [loadState, setLoadState] = useState<LoadState>("idle");
    const [loadError, setLoadError] = useState<string | null>(null);
    const [isPermissionError, setIsPermissionError] = useState(false);
    const [hospitals, setHospitals] = useState<Hospital[]>([]);
    const [pharmacies, setPharmacies] = useState<Pharmacy[]>([]);
    const [userCoords, setUserCoords] = useState<{ lat: number; lng: number } | null>(null);

    // 분석 결과 자동 저장 (readOnly 모드가 아닐 때만)
    useEffect(() => {
        if (readOnly || savedRef.current) return;
        savedRef.current = true;

        const headers: Record<string, string> = { "Content-Type": "application/json" };
        // 미로그인 폴백용 디바이스 ID
        const deviceId = getDeviceId();
        if (deviceId) headers["X-Device-Id"] = deviceId;

        void fetch("/api/intake-records", {
            method: "POST",
            headers,
            body: JSON.stringify({ formData: form, analysisSections, specialtyCodes, llmContext, followUpAnswers }),
        }).then(() => {
            setSaveToast(true);
            setTimeout(() => setSaveToast(false), 3000);
        }).catch(() => undefined);
    }, [readOnly, form, analysisSections, specialtyCodes, llmContext, followUpAnswers]);

    const openSearch = async (type: ModalType) => {
        if (!type) return;

        // 캐시된 결과가 있으면 바로 모달 열기 (loadState도 done으로 복원)
        if (type === "hospital" && hospitals.length > 0) {
            setLoadState("done");
            setOpenModal(type);
            return;
        }
        if (type === "pharmacy" && pharmacies.length > 0) {
            setLoadState("done");
            setOpenModal(type);
            return;
        }

        setOpenModal(type);
        setLoadError(null);
        setLoadState("locating");

        let coords: { lat: number; lng: number };
        try {
            coords = await getCoords();
        } catch (err) {
            setLoadState("error");
            const isPermission = (err as GeolocationPositionError)?.code === 1;
            setIsPermissionError(isPermission);
            setLoadError(isPermission ? "위치 권한이 필요합니다." : "위치를 확인할 수 없습니다. 다시 시도해 주세요.");
            return;
        }

        setUserCoords(coords);
        setLoadState("loading");

        try {
            if (type === "hospital") {
                const res = await fetch("/api/hospitals", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ lat: coords.lat, lng: coords.lng, specialtyCodes }),
                });
                const data = (await res.json()) as { data?: { hospitals?: Hospital[] }; error?: string };
                if (!res.ok) throw new Error(data.error ?? "병원 조회에 실패했습니다.");
                setHospitals(data.data?.hospitals ?? []);
            } else {
                const res = await fetch("/api/pharmacies", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ lat: coords.lat, lng: coords.lng }),
                });
                const data = (await res.json()) as { data?: { pharmacies?: Pharmacy[] }; error?: string };
                if (!res.ok) throw new Error(data.error ?? "약국 조회에 실패했습니다.");
                setPharmacies(data.data?.pharmacies ?? []);
            }
            setLoadState("done");
        } catch (error) {
            setLoadState("error");
            setLoadError(error instanceof Error ? error.message : "조회 중 오류가 발생했습니다.");
        }
    };

    const closeModal = () => {
        setOpenModal(null);
        setLoadState("idle");
        setLoadError(null);
        setIsPermissionError(false);
    };

    const retry = async () => {
        const type = openModal;
        if (type === "hospital") setHospitals([]);
        if (type === "pharmacy") setPharmacies([]);
        setLoadState("idle");
        setIsPermissionError(false);
        await openSearch(type);
    };

    const isLoading = loadState === "locating" || loadState === "loading";
    const loadingText = loadState === "locating" ? "위치 확인 중..." : "검색 중...";
    const confidence = computeConfidence(llmContext);

    return (
        <div className="pb-8">
            {/* 저장 완료 토스트 */}
            {saveToast && (
                <div className="fixed bottom-24 left-1/2 -translate-x-1/2 z-50 px-4 py-2.5 bg-cs-on-surface-strong text-white text-xs font-semibold rounded-full shadow-lg animate-fade-in-up whitespace-nowrap">
                    기록이 저장되었습니다
                </div>
            )}

            {/* 타이틀 */}
            <div className="mb-10">
                <h1 className="text-3xl font-extrabold text-cs-on-surface-strong tracking-tight mb-1.5">AI 분석 결과</h1>
                <p className="text-sm text-muted-foreground">{form.name ? `${form.name}님의 증상을 기반으로 분석했습니다.` : "증상을 기반으로 분석했습니다."}</p>
            </div>

            {/* 분석 섹션 카드 — 카드 간 간격을 좁혀 하나의 그룹으로 읽히도록 */}
            {analysisSections.length > 0 && (
                <div className="space-y-3 mb-8">
                    <p className="text-[10px] font-bold text-cs-outline-variant uppercase tracking-widest px-1">분석 내용</p>
                    {analysisSections.map((section) => (
                        <section key={section.title} className="text-left bg-white rounded-2xl p-5 shadow-sm border border-border">
                            <h3 className="font-bold text-sm text-cs-on-surface-strong mb-3">{section.title}</h3>
                            {typeof section.content === "string" ? (
                                <p className="text-sm text-foreground leading-relaxed whitespace-pre-wrap">{section.content}</p>
                            ) : (
                                <div className="space-y-2">
                                    {section.content.map((item) => (
                                        <div key={`${section.title}-${item.keyword}`} className="text-sm leading-relaxed text-foreground">
                                            <span className="font-bold text-cs-on-primary-container mr-1">{item.keyword}</span>
                                            <span>{item.description}</span>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </section>
                    ))}
                </div>
            )}

            {/* 응답 신뢰도 — 분석 내용을 먼저 읽도록 섹션 뒤에 배치, 크기 축소 */}
            <div className={cn("text-left rounded-xl px-4 py-3 mb-8 border border-border", confidence.bgClass)}>
                <div className="flex items-center justify-between mb-1.5">
                    <span className="text-[11px] font-semibold text-muted-foreground">응답 신뢰도</span>
                    <span className={cn("text-[11px] font-bold", confidence.labelClass)}>
                        {confidence.label} · {confidence.score}%
                    </span>
                </div>
                <div className="h-1 w-full bg-muted rounded-full overflow-hidden">
                    <div
                        className={cn("h-full rounded-full transition-all duration-700", confidence.barClass)}
                        style={{ width: `${confidence.score}%` }}
                    />
                </div>
                <p className="text-xs text-cs-outline-variant mt-1.5 leading-relaxed">{confidence.description}</p>
            </div>

            {/* 액션 영역 — 콘텐츠와 명확히 분리 */}
            <div className="space-y-3 pt-6 border-t border-border">
                {/* 병원·약국 찾기 */}
                <div className="grid grid-cols-2 gap-3">
                    <Button type="button" onClick={() => void openSearch("hospital")} className="h-auto flex flex-col items-center gap-2 py-4 px-3 rounded-2xl bg-white border border-border shadow-sm hover:border-primary/40 hover:bg-cs-primary-tint transition-all active:scale-[0.98]">
                        <svg viewBox="0 0 24 24" fill="none" className="w-5 h-5 text-primary" stroke="currentColor" strokeWidth="2">
                            <path d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" strokeLinecap="round" strokeLinejoin="round" />
                        </svg>
                        <span className="text-sm font-bold text-cs-on-surface-strong">병원 찾기</span>
                        <span className="text-[11px] text-cs-outline-variant font-medium">반경 1km 이내</span>
                    </Button>
                    <Button type="button" onClick={() => void openSearch("pharmacy")} className="h-auto flex flex-col items-center gap-2 py-4 px-3 rounded-2xl bg-white border border-border shadow-sm hover:border-primary/40 hover:bg-cs-primary-tint transition-all active:scale-[0.98]">
                        <svg viewBox="0 0 24 24" fill="none" className="w-5 h-5 text-primary" stroke="currentColor" strokeWidth="2">
                            <path d="M12 6v6m0 0v6m0-6h6m-6 0H6" strokeLinecap="round" strokeLinejoin="round" />
                            <rect x="3" y="3" width="18" height="18" rx="3" strokeLinecap="round" strokeLinejoin="round" />
                        </svg>
                        <span className="text-sm font-bold text-cs-on-surface-strong">약국 찾기</span>
                        <span className="text-[11px] text-cs-outline-variant font-medium">반경 1km 이내</span>
                    </Button>
                </div>

                {/* AI 상담 — 주요 CTA */}
                <Button type="button" onClick={() => { saveChatContext({ form, sections: analysisSections, llmContext }); router.push("/chat"); }} className="h-auto w-full flex items-center justify-between gap-3 py-4 px-5 rounded-2xl bg-primary text-primary-foreground shadow-lg shadow-primary/20 hover:brightness-105 active:scale-[0.98] transition-all">
                    <div className="flex items-center gap-3">
                        <span className="w-8 h-8 rounded-full bg-white/15 flex items-center justify-center shrink-0">
                            <svg viewBox="0 0 24 24" fill="none" className="w-4 h-4" stroke="currentColor" strokeWidth="2">
                                <path d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" strokeLinecap="round" strokeLinejoin="round" />
                            </svg>
                        </span>
                        <div className="text-left">
                            <p className="text-sm font-bold leading-tight">AI 상담 시작하기</p>
                            <p className="text-[11px] text-cs-primary-container font-medium mt-0.5">분석 결과를 바탕으로 추가 상담</p>
                        </div>
                    </div>
                    <svg viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4 shrink-0 opacity-70">
                        <path d="M8.59 16.59L13.17 12 8.59 7.41 10 6l6 6-6 6-1.41-1.41z" />
                    </svg>
                </Button>

                {!readOnly && onReset && (
                    <Button type="button" variant="outline" onClick={onReset} className="w-full h-auto rounded-2xl py-3 font-bold text-sm border-border bg-white text-muted-foreground hover:bg-cs-surface-container-highest">
                        처음으로 돌아가기
                    </Button>
                )}

                <Link href="/history" className="block text-center text-sm font-semibold text-primary hover:underline py-2">
                    이전 기록 보기
                </Link>
            </div>

            {/* 병원 찾기 모달 */}
            <NearbySearchSheet
                open={openModal === "hospital"}
                onClose={closeModal}
                title="내 주변 병원"
                isLoading={isLoading}
                loadingText={loadingText}
                error={openModal === "hospital" ? loadError : null}
                permissionError={openModal === "hospital" ? isPermissionError : false}
                onRetry={() => void retry()}
                resultCount={loadState === "done" ? hospitals.length : undefined}
                emptyText="주변 1km 내 해당 진료과 병원이 없습니다."
                userLocation={userCoords ?? undefined}
                mapMarkers={hospitals.map((h) => ({ lat: h.lat, lng: h.lng, name: h.name, detail: `${formatDistance(h.distanceMeters)} · ${h.phone || ""}` }))}>
                {hospitals.map((h) => (
                    <div key={`${h.name}-${h.address}`} className="bg-cs-surface rounded-2xl p-4 border border-border">
                        <div className="flex justify-between items-start mb-1">
                            <span className="font-bold text-sm text-cs-on-surface-strong leading-tight">{h.name}</span>
                            <span className="text-xs text-primary font-bold shrink-0 ml-2">{formatDistance(h.distanceMeters)}</span>
                        </div>
                        <span className="text-[11px] text-cs-outline-variant font-medium">
                            {h.specialtyCodes
                                .map((code) => SPECIALTY_CODES[code])
                                .filter(Boolean)
                                .join(" · ")}
                            {h.type ? ` · ${h.type}` : ""}
                        </span>
                        <p className="text-xs text-muted-foreground mt-1">{h.address}</p>
                        {h.phone && <p className="text-xs text-muted-foreground mt-0.5">{h.phone}</p>}
                    </div>
                ))}
            </NearbySearchSheet>

            {/* 약국 찾기 모달 */}
            <NearbySearchSheet
                open={openModal === "pharmacy"}
                onClose={closeModal}
                title="내 주변 약국"
                isLoading={isLoading}
                loadingText={loadingText}
                error={openModal === "pharmacy" ? loadError : null}
                permissionError={openModal === "pharmacy" ? isPermissionError : false}
                onRetry={() => void retry()}
                resultCount={loadState === "done" ? pharmacies.length : undefined}
                emptyText="주변 1km 내 약국이 없습니다."
                userLocation={userCoords ?? undefined}
                mapMarkers={pharmacies.map((p) => ({ lat: p.lat, lng: p.lng, name: p.name, detail: `${formatDistance(p.distanceMeters)} · ${p.phone || ""}` }))}>
                {pharmacies.map((p) => (
                    <div key={`${p.name}-${p.address}`} className="bg-cs-surface rounded-2xl p-4 border border-border">
                        <div className="flex justify-between items-start mb-1">
                            <span className="font-bold text-sm text-cs-on-surface-strong leading-tight">{p.name}</span>
                            <span className="text-xs text-primary font-bold shrink-0 ml-2">{formatDistance(p.distanceMeters)}</span>
                        </div>
                        <p className="text-xs text-muted-foreground mt-1">{p.address}</p>
                        {p.phone && <p className="text-xs text-muted-foreground mt-0.5">{p.phone}</p>}
                    </div>
                ))}
            </NearbySearchSheet>
        </div>
    );
};
