// src/App.tsx
import React, { useState } from "react";
import { KakaoMap } from "./components/KakaoMap";
import { MobilitySelector } from "./components/MobilitySelector";
import { RouteSummary } from "./components/RouteSummary";
import type {LatLng, MobilityType, RouteDetailResult} from "./types";
import { fetchRouteDetail } from "./services/mapService";

type PickMode = "start" | "end" | null;

const App: React.FC = () => {
    const [start, setStart] = useState<LatLng | null>(null);
    const [end, setEnd] = useState<LatLng | null>(null);
    const [mobilityType, setMobilityType] = useState<MobilityType>("PEDESTRIAN");
    const [pickMode, setPickMode] = useState<PickMode>(null);
    const [route, setRoute] = useState<RouteDetailResult | null>(null);
    const [loading, setLoading] = useState(false);
    const [errorMsg, setErrorMsg] = useState<string | null>(null);

    const handlePickPoint = (point: LatLng, mode: PickMode) => {
        if (mode === "start") {
            setStart(point);
        } else if (mode === "end") {
            setEnd(point);
        }
    };

    const handleSearchRoute = async () => {
        if (!start || !end) return;
        setLoading(true);
        setErrorMsg(null);
        setRoute(null);

        try {
            const res = await fetchRouteDetail({
                startLatitude: start.lat,
                startLongitude: start.lng,
                endLatitude: end.lat,
                endLongitude: end.lng,
                mobilityType,
            });

            setRoute(res.result);
        } catch (err: any) {
            console.error("routes/detail error:", err);  // 👈 추가

            const code = err?.response?.data?.code;
            if (code === "ROUTE_NOT_FOUND") {
                setErrorMsg("이 출발점과 도착점 사이에는 경로가 없습니다.");
            } else if (code === "ROUTE_NOT_SUITABLE_MOBILITY") {
                setErrorMsg(
                    "현재 선택한 이동 유형으로는 이동 가능한 경로가 없습니다. 다른 이동 유형을 선택해보세요."
                );
            } else {
                setErrorMsg("잠시 후 다시 시도해주세요.");
            }
        } finally {
            setLoading(false);
        }
    };

    const canSearch = !!start && !!end && !loading;

    return (
        <div
            style={{
                height: "100vh",
                display: "flex",
                flexDirection: "column",
                padding: 12,
                boxSizing: "border-box",
                gap: 8,
            }}
        >
            {/* 상단: Mobility 선택 + 설명 */}
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                <MobilitySelector value={mobilityType} onChange={setMobilityType} />
                <div style={{ fontSize: 12, color: "#555" }}>
                    <div>• 출발/도착 버튼을 누르고 지도를 클릭해서 위치를 선택하세요.</div>
                    <div>
                        현재 선택 모드:{" "}
                        {pickMode === "start"
                            ? "출발 지점 선택 중"
                            : pickMode === "end"
                                ? "도착 지점 선택 중"
                                : "선택 안 함"}
                    </div>
                </div>
            </div>

            {/* 지도 영역 */}
            <div style={{ flex: 1, minHeight: 0 }}>
                <div style={{ width: "180%", height: "60vh" }}>
                    <KakaoMap
                        start={start}
                        end={end}
                        pickMode={pickMode}
                        onPickPoint={handlePickPoint}
                        route={route}
                        mobilityType={mobilityType}
                    />
                </div>
            </div>

            {/* 하단 패널 */}
            <div
                style={{
                    borderTop: "1px solid #eee",
                    paddingTop: 8,
                    display: "flex",
                    flexDirection: "column",
                    gap: 8,
                }}
            >
                <div style={{ display: "flex", gap: 8 }}>
                    <button
                        onClick={() => setPickMode("start")}
                        style={{
                            flex: 1,
                            padding: "8px 0",
                            borderRadius: 6,
                            border: pickMode === "start" ? "2px solid #2b6cb0" : "1px solid #ccc",
                            backgroundColor: "#fff",
                            cursor: "pointer",
                        }}
                    >
                        출발 선택
                    </button>
                    <button
                        onClick={() => setPickMode("end")}
                        style={{
                            flex: 1,
                            padding: "8px 0",
                            borderRadius: 6,
                            border: pickMode === "end" ? "2px solid #2b6cb0" : "1px solid #ccc",
                            backgroundColor: "#fff",
                            cursor: "pointer",
                        }}
                    >
                        도착 선택
                    </button>
                </div>

                <div style={{ fontSize: 12, color: "#333" }}>
                    <div>
                        출발:{" "}
                        {start ? `${start.lat.toFixed(6)}, ${start.lng.toFixed(6)}` : "미설정"}
                    </div>
                    <div>
                        도착: {end ? `${end.lat.toFixed(6)}, ${end.lng.toFixed(6)}` : "미설정"}
                    </div>
                </div>

                <button
                    onClick={handleSearchRoute}
                    disabled={!canSearch}
                    style={{
                        padding: "10px 0",
                        borderRadius: 6,
                        border: "none",
                        backgroundColor: canSearch ? "#2b6cb0" : "#a0aec0",
                        color: "#fff",
                        fontWeight: 600,
                        cursor: canSearch ? "pointer" : "default",
                    }}
                >
                    {loading ? "경로 검색 중..." : "경로 찾기"}
                </button>

                {errorMsg && (
                    <div style={{ fontSize: 12, color: "#e53e3e" }}>⚠ {errorMsg}</div>
                )}

                <RouteSummary route={route} mobilityType={mobilityType} />
            </div>
        </div>
    );
};

export default App;
