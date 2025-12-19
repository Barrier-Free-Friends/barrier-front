import axios from "axios";
import type { RouteDetailResult, MobilityType, ObstacleArea, ObstacleFeatureCollection  } from "../types";
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL;
const API_POINTSERVICE_URL = import.meta.env.VITE_POINT_SERVICE_URL;

export interface RouteDetailRequest {
    startLatitude: number;
    startLongitude: number;
    endLatitude: number;
    endLongitude: number;
    mobilityType: MobilityType;
}

export interface ApiResponse<T> {
    isSuccess: boolean;
    result: T | null;
    message?: string;
    code?: string;
}

const api = axios.create({
    baseURL: import.meta.env.VITE_API_BASE_URL ?? "http://localhost:8080",
    timeout: 15000,
});

export async function fetchRouteDetail(
    req: RouteDetailRequest
): Promise<ApiResponse<RouteDetailResult>> {
    try {
        const { data } = await api.post<RouteDetailResult>("/routes/detail", req);

        // 백엔드가 wrapper 없이 DTO만 주므로 프론트에서 wrapper로 감싼다
        return { isSuccess: true, result: data };
    } catch (err: any) {
        // 기존 App.tsx에서 err.response.data.code를 읽고 있으니 최대한 유지
        const code = err?.response?.data?.code ?? "UNKNOWN";
        const message = err?.response?.data?.message ?? "경로 검색 중 오류가 발생했습니다.";
        return { isSuccess: false, result: null, code, message };
    }
}

export interface RouteDetailResponse {
    totalDistanceMeters: number;
    route: {
        type: "LineString";
        coordinates: number[][];
    };
    obstacleAreas?: ObstacleArea[];
    warnings?: string[];
}

export async function getObstacles(params: {
    minLon: number;
    minLat: number;
    maxLon: number;
    maxLat: number;
}): Promise<ObstacleFeatureCollection> {
    const qs = new URLSearchParams({
        minLon: String(params.minLon),
        minLat: String(params.minLat),
        maxLon: String(params.maxLon),
        maxLat: String(params.maxLat),
    });

    const res = await fetch( `${API_BASE_URL}/v1/map/obstacles?${qs.toString()}` );
    if (!res.ok) throw new Error("Failed to fetch obstacles");
    return res.json();
}

export async function getUserBadgeUrl(userId: string): Promise<string | null> {
    if (!userId) return null;

    const res = await fetch(`${API_POINTSERVICE_URL}/v1/point/badges/image/${encodeURIComponent(userId)}`);
    if (!res.ok) return null;

    const data = await res.json();
    // 예: { imageUrl: "https://..." }
    return data.imgUrl ?? null;
}
