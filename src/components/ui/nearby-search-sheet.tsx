"use client";

import * as React from "react";
import { useState } from "react";
import { Dialog as DialogPrimitive } from "@base-ui/react/dialog";
import { cn } from "@/lib/utils";
import { Dialog, DialogClose, DialogOverlay, DialogPortal } from "@/components/ui/dialog";
import { NaverMap, type MapMarker } from "@/components/ui/naver-map";

interface NearbySearchSheetProps {
    open: boolean;
    onClose: () => void;
    title: string;
    isLoading: boolean;
    loadingText?: string;
    error?: string | null;
    permissionError?: boolean;
    onRetry?: () => void;
    resultCount?: number;
    emptyText?: string;
    userLocation?: { lat: number; lng: number };
    mapMarkers?: MapMarker[];
    children?: React.ReactNode;
}

export function NearbySearchSheet({
    open,
    onClose,
    title,
    isLoading,
    loadingText = "검색 중...",
    error,
    permissionError = false,
    onRetry,
    resultCount,
    emptyText = "주변 1km 내 결과가 없습니다.",
    userLocation,
    mapMarkers,
    children,
}: NearbySearchSheetProps) {
    const isDone = !isLoading && !error;
    const [viewMode, setViewMode] = useState<"list" | "map">("list");
    const hasMap = !!userLocation && !!mapMarkers && mapMarkers.length > 0;

    return (
        <Dialog open={open} onOpenChange={(isOpen) => { if (!isOpen) onClose(); }}>
            <DialogPortal>
                <DialogOverlay className="bg-black/40 backdrop-blur-[2px]" />
                <DialogPrimitive.Popup
                    className={cn(
                        // 모바일: 하단 시트
                        "fixed bottom-0 left-0 right-0 z-50 flex flex-col bg-white rounded-t-3xl shadow-2xl max-h-[80vh]",
                        // 데스크탑: 중앙 모달
                        "sm:bottom-auto sm:left-1/2 sm:top-1/2 sm:right-auto sm:-translate-x-1/2 sm:-translate-y-1/2 sm:w-full sm:max-w-lg sm:rounded-3xl",
                        "outline-none",
                        "data-[state=open]:animate-in data-[state=open]:fade-in-0 data-[state=closed]:animate-out data-[state=closed]:fade-out-0",
                    )}
                >
                    {/* 핸들 바 (모바일) */}
                    <div className="flex justify-center pt-3 pb-1 sm:hidden">
                        <div className="w-10 h-1 rounded-full bg-muted" />
                    </div>

                    {/* 헤더 */}
                    <div className="flex items-center justify-between px-5 py-4 border-b border-border">
                        <DialogPrimitive.Title className="font-bold text-base text-cs-on-surface-strong">
                            {title}
                        </DialogPrimitive.Title>
                        <div className="flex items-center gap-2">
                            {/* 목록/지도 토글 */}
                            {isDone && hasMap && (
                                <div className="flex bg-muted rounded-full p-0.5">
                                    <button
                                        type="button"
                                        onClick={() => setViewMode("list")}
                                        className={cn(
                                            "px-3 py-1 rounded-full text-xs font-bold transition-all",
                                            viewMode === "list" ? "bg-white text-primary shadow-sm" : "text-muted-foreground",
                                        )}>
                                        목록
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => setViewMode("map")}
                                        className={cn(
                                            "px-3 py-1 rounded-full text-xs font-bold transition-all",
                                            viewMode === "map" ? "bg-white text-primary shadow-sm" : "text-muted-foreground",
                                        )}>
                                        지도
                                    </button>
                                </div>
                            )}
                            <DialogClose
                                className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-cs-primary-tint transition-colors"
                                aria-label="닫기"
                            >
                                <svg viewBox="0 0 24 24" fill="none" className="w-5 h-5 text-muted-foreground" stroke="currentColor" strokeWidth="2">
                                    <path d="M6 18L18 6M6 6l12 12" strokeLinecap="round" strokeLinejoin="round" />
                                </svg>
                            </DialogClose>
                        </div>
                    </div>

                    {/* 콘텐츠 */}
                    <div className="overflow-y-auto flex-1 px-5 py-4">
                        {isLoading && (
                            <div className="flex flex-col items-center gap-3 py-12">
                                <div className="flex gap-1.5">
                                    {[0, 1, 2].map((i) => (
                                        <span
                                            key={i}
                                            className="w-2 h-2 rounded-full bg-primary animate-bounce motion-reduce:animate-none"
                                            style={{ animationDelay: `${i * 0.15}s` }}
                                        />
                                    ))}
                                </div>
                                <p className="text-sm text-muted-foreground">{loadingText}</p>
                            </div>
                        )}

                        {!isLoading && error && (
                            <div className="flex flex-col items-center gap-4 py-10">
                                {permissionError ? (
                                    <>
                                        <div className="w-14 h-14 rounded-2xl bg-cs-primary-tint flex items-center justify-center">
                                            <svg viewBox="0 0 24 24" fill="none" className="w-7 h-7 text-primary" stroke="currentColor" strokeWidth="1.5">
                                                <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z" strokeLinecap="round" strokeLinejoin="round" />
                                            </svg>
                                        </div>
                                        <div className="text-center">
                                            <p className="text-sm font-bold text-cs-on-surface-strong mb-1">위치 권한이 필요합니다</p>
                                            <p className="text-xs text-muted-foreground">주변 검색을 위해 위치 접근을 허용해 주세요.</p>
                                        </div>
                                        {onRetry && (
                                            <button
                                                type="button"
                                                onClick={onRetry}
                                                className="flex items-center gap-2 px-6 py-3 rounded-full bg-primary text-white font-bold text-sm hover:brightness-105 transition-all active:scale-[0.98] shadow-md shadow-primary/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
                                            >
                                                <svg viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4">
                                                    <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z" />
                                                </svg>
                                                위치 권한 허용하기
                                            </button>
                                        )}
                                    </>
                                ) : (
                                    <>
                                        <p className="text-sm text-destructive font-semibold text-center px-2">{error}</p>
                                        {onRetry && (
                                            <button
                                                type="button"
                                                onClick={onRetry}
                                                className="text-sm font-bold text-primary underline underline-offset-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 rounded-sm"
                                            >
                                                다시 시도
                                            </button>
                                        )}
                                    </>
                                )}
                            </div>
                        )}

                        {isDone && (
                            <>
                                {resultCount !== undefined && viewMode === "list" && (
                                    <p className="text-xs text-muted-foreground font-semibold text-center mb-3">
                                        반경 1km 이내 {resultCount}곳
                                    </p>
                                )}
                                {resultCount === 0 ? (
                                    <p className="text-sm text-cs-outline-variant text-center py-8">{emptyText}</p>
                                ) : viewMode === "map" && hasMap ? (
                                    <NaverMap
                                        center={userLocation}
                                        markers={mapMarkers}
                                        className="h-[400px] sm:h-[350px]"
                                    />
                                ) : (
                                    <div className="space-y-3">{children}</div>
                                )}
                            </>
                        )}
                    </div>
                </DialogPrimitive.Popup>
            </DialogPortal>
        </Dialog>
    );
}
