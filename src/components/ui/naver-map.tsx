"use client";

import { useEffect, useRef } from "react";
import { cn } from "@/lib/utils";

export interface MapMarker {
    lat: number;
    lng: number;
    name: string;
    detail?: string;
}

interface NaverMapProps {
    center: { lat: number; lng: number };
    markers: MapMarker[];
    className?: string;
}

export const NaverMap = ({ center, markers, className }: NaverMapProps) => {
    const containerRef = useRef<HTMLDivElement>(null);
    const mapRef = useRef<naver.maps.Map | null>(null);
    const markersRef = useRef<naver.maps.Marker[]>([]);

    useEffect(() => {
        if (!containerRef.current) return;
        if (typeof naver === "undefined" || !naver.maps) return;

        const map = new naver.maps.Map(containerRef.current, {
            center: new naver.maps.LatLng(center.lat, center.lng),
            zoom: 15,
        });
        mapRef.current = map;

        // 사용자 위치 마커 (파란 점)
        new naver.maps.Marker({
            position: new naver.maps.LatLng(center.lat, center.lng),
            map,
            icon: {
                content: '<div style="width:14px;height:14px;border-radius:50%;background:#006974;border:3px solid #fff;box-shadow:0 2px 6px rgba(0,105,116,0.4);"></div>',
                anchor: new naver.maps.Point(7, 7),
            },
        });

        // 병원/약국 마커
        const bounds = new naver.maps.LatLngBounds(
            new naver.maps.LatLng(center.lat, center.lng),
            new naver.maps.LatLng(center.lat, center.lng),
        );

        markers.forEach((m) => {
            const position = new naver.maps.LatLng(m.lat, m.lng);
            bounds.extend(position);

            const marker = new naver.maps.Marker({ position, map });
            markersRef.current.push(marker);

            naver.maps.Event.addListener(marker, "click", () => {
                const query = encodeURIComponent(m.name);
                window.open(`https://map.naver.com/p/search/${query}`, "_blank");
            });
        });

        if (markers.length > 0) {
            map.fitBounds(bounds, { top: 50, right: 50, bottom: 50, left: 50 });
        }

        return () => {
            markersRef.current.forEach((m) => m.setMap(null));
            markersRef.current = [];
            mapRef.current = null;
        };
    }, [center, markers]);

    return (
        <div
            ref={containerRef}
            className={cn("w-full min-h-[300px] rounded-2xl overflow-hidden bg-muted", className)}
        />
    );
};
