// src/components/KakaoMap.tsx
import React, { useEffect, useMemo, useRef } from "react";
import type { MobilityType, LatLng, RouteDetailResult } from "../types";
import { getObstacles } from "../services/mapService";

declare global {
    interface Window {
        kakao?: any;
    }
}

export type PickMode = "start" | "end" | null;

interface Props {
    start: LatLng | null;
    end: LatLng | null;
    onPickPoint: (point: LatLng, mode: PickMode) => void;
    pickMode: PickMode;
    route: RouteDetailResult | null;
    mobilityType: MobilityType;
}

/* =========================
 * utils
 * ========================= */
function debounce<T extends (...args: any[]) => void>(fn: T, delay: number): T {
    let timer: number | undefined;
    return function (...args: any[]) {
        if (timer) clearTimeout(timer);
        timer = window.setTimeout(() => fn(...args), delay);
    } as T;
}

function boundsToBBox(bounds: any) {
    const sw = bounds.getSouthWest();
    const ne = bounds.getNorthEast();
    return {
        minLat: sw.getLat(),
        minLon: sw.getLng(),
        maxLat: ne.getLat(),
        maxLon: ne.getLng(),
    };
}

function isBoundsChangedEnough(next: any, prev: any | null) {
    if (!prev) return true;
    const THRESHOLD = 0.0003; // 약 30m
    return (
        Math.abs(next.minLat - prev.minLat) > THRESHOLD ||
        Math.abs(next.minLon - prev.minLon) > THRESHOLD ||
        Math.abs(next.maxLat - prev.maxLat) > THRESHOLD ||
        Math.abs(next.maxLon - prev.maxLon) > THRESHOLD
    );
}

function isContained(inner: any, outer: any) {
    return (
        inner.minLat >= outer.minLat &&
        inner.minLon >= outer.minLon &&
        inner.maxLat <= outer.maxLat &&
        inner.maxLon <= outer.maxLon
    );
}

export const KakaoMap: React.FC<Props> = ({
                                              start,
                                              end,
                                              onPickPoint,
                                              pickMode,
                                              route,
                                          }) => {
    const mapElRef = useRef<HTMLDivElement | null>(null);
    const mapInstanceRef = useRef<any>(null);

    const markersRef = useRef<any[]>([]);
    const polylinesRef = useRef<any[]>([]);
    const obstaclePolygonsRef = useRef<any[]>([]);

    const pickModeRef = useRef<PickMode>(pickMode);
    useEffect(() => {
        pickModeRef.current = pickMode;
    }, [pickMode]);

    // bounds 캐시
    const lastFetchedBoundsRef = useRef<any | null>(null);
    const lastDrawBoundsRef = useRef<any | null>(null);

    const clearMarkers = () => {
        markersRef.current.forEach((m) => m.setMap(null));
        markersRef.current = [];
    };

    const clearPolylines = () => {
        polylinesRef.current.forEach((p) => p.setMap(null));
        polylinesRef.current = [];
    };

    const clearObstaclePolygons = () => {
        obstaclePolygonsRef.current.forEach((p) => p.setMap(null));
        obstaclePolygonsRef.current = [];
    };

    // 장애물 폴리곤 fetch + draw
    const drawObstaclePolygonsByCurrentBounds = async () => {
        const { kakao } = window;
        const map = mapInstanceRef.current;
        if (!kakao || !map) return;

        const bounds = map.getBounds();
        if (!bounds) return;

        const bbox = boundsToBBox(bounds);

        // 1) 작은 변화면 skip
        if (!isBoundsChangedEnough(bbox, lastDrawBoundsRef.current)) return;
        lastDrawBoundsRef.current = bbox;

        // 2) 이미 fetch한 bbox 안이면 skip
        if (
            lastFetchedBoundsRef.current &&
            isContained(bbox, lastFetchedBoundsRef.current)
        ) {
            return;
        }

        try {
            const fc = await getObstacles(bbox);

            clearObstaclePolygons();

            fc.features?.forEach((f: any) => {
                if (!f?.geometry || f.geometry.type !== "Polygon") return;
                const outer: number[][] = f.geometry.coordinates?.[0];
                if (!outer || outer.length < 3) return;

                const path = outer.map(([lng, lat]) => new kakao.maps.LatLng(lat, lng));

                const polygon = new kakao.maps.Polygon({
                    path,
                    strokeWeight: 2,
                    strokeColor: "#e53e3e",
                    strokeOpacity: 0.9,
                    fillColor: "#e53e3e",
                    fillOpacity: 0.22,
                });

                polygon.setMap(map);
                obstaclePolygonsRef.current.push(polygon);
            });

            lastFetchedBoundsRef.current = bbox;
        } catch (e) {
            console.error("[obstacles] fetch failed", e);
        }
    };

    const debouncedDrawObstacles = useMemo(
        () => debounce(drawObstaclePolygonsByCurrentBounds, 400),
        []
    );

    // 지도 초기화 + 클릭으로 출발/도착 찍기 복구
    useEffect(() => {
        const appKey = import.meta.env.VITE_KAKAO_MAP_KEY as string | undefined;
        if (!appKey) {
            console.error("VITE_KAKAO_MAP_KEY가 .env에 설정되지 않았습니다.");
            return;
        }

        const init = () => {
            const { kakao } = window;
            if (!kakao?.maps || !mapElRef.current) return;

            const map = new kakao.maps.Map(mapElRef.current, {
                center: new kakao.maps.LatLng(37.4893, 127.03525),
                level: 4,
            });

            mapInstanceRef.current = map;

            // 클릭해서 출발/도착 선택
            kakao.maps.event.addListener(map, "click", (mouseEvent: any) => {
                const mode = pickModeRef.current;
                if (!mode) return;

                const latlng = mouseEvent.latLng;
                onPickPoint(
                    { lat: latlng.getLat(), lng: latlng.getLng() },
                    mode
                );
            });

            // 장애물: idle에서만 호출 (폭주 방지)
            kakao.maps.event.addListener(map, "idle", debouncedDrawObstacles);

            // 최초 1회
            debouncedDrawObstacles();
        };

        const existingScript = document.querySelector<HTMLScriptElement>(
            'script[src^="https://dapi.kakao.com/v2/maps/sdk.js"]'
        );

        const handleLoad = () => window.kakao?.maps?.load(init);

        if (existingScript) {
            if (window.kakao?.maps) window.kakao.maps.load(init);
            else existingScript.addEventListener("load", handleLoad);
        } else {
            const script = document.createElement("script");
            script.src = `https://dapi.kakao.com/v2/maps/sdk.js?appkey=${appKey}&libraries=services&autoload=false`;
            script.async = true;
            script.addEventListener("load", handleLoad);
            document.head.appendChild(script);
        }

        return () => {
            if (existingScript) existingScript.removeEventListener("load", handleLoad);
            clearMarkers();
            clearPolylines();
            clearObstaclePolygons();
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    // 마커 업데이트
    useEffect(() => {
        const { kakao } = window;
        const map = mapInstanceRef.current;
        if (!kakao || !map) return;

        clearMarkers();

        if (start) {
            const m = new kakao.maps.Marker({
                position: new kakao.maps.LatLng(start.lat, start.lng),
            });
            m.setMap(map);
            markersRef.current.push(m);
        }

        if (end) {
            const m = new kakao.maps.Marker({
                position: new kakao.maps.LatLng(end.lat, end.lng),
            });
            m.setMap(map);
            markersRef.current.push(m);
        }
    }, [start, end]);

    // 경로 Polyline 업데이트
    useEffect(() => {
        const { kakao } = window;
        const map = mapInstanceRef.current;
        if (!kakao || !map) return;

        clearPolylines();

        if (!route) return;

        const path = route.route.coordinates.map(([lng, lat]) => {
            return new kakao.maps.LatLng(lat, lng);
        });

        const hasStairs = route.edges.some((e) => e.stairs);
        const hasBlocked = !route.fullyAccessible;

        const isBarrierFree =
            route.requestedMobilityType === "WHEELCHAIR" ||
            route.requestedMobilityType === "STROLLER" ||
            route.requestedMobilityType === "ELDERLY";

        const strokeColor = isBarrierFree
            ? hasBlocked
                ? "#e53e3e"
                : "#2f855a"
            : hasStairs
                ? "#dd6b20"
                : "#3182ce";

        const polyline = new kakao.maps.Polyline({
            path,
            strokeWeight: 5,
            strokeColor,
            strokeOpacity: 0.9,
            strokeStyle: "solid",
        });

        polyline.setMap(map);
        polylinesRef.current.push(polyline);

        // 경로에 맞춰 bounds 이동
        const bounds = new kakao.maps.LatLngBounds();
        path.forEach((latlng) => bounds.extend(latlng));
        map.setBounds(bounds);

        // bounds 바뀐 후 장애물도 갱신
        setTimeout(() => debouncedDrawObstacles(), 0);
    }, [route, debouncedDrawObstacles]);

    return (
        <div
            ref={mapElRef}
            style={{
                width: "100%",
                height: "85%",
                borderRadius: 8,
                overflow: "hidden",
                border: "1px solid #eee",
            }}
        />
    );
};
