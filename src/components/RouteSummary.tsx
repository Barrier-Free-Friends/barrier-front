// src/components/RouteSummary.tsx
import React from "react";
import type { RouteDetailResult, MobilityType } from "../types";

interface Props {
    route: RouteDetailResult | null;
    mobilityType: MobilityType;
}

function formatDistance(meters: number): string {
    if (meters < 1000) return `${meters.toFixed(0)} m`;
    return `${(meters / 1000).toFixed(2)} km`;
}

export const RouteSummary: React.FC<Props> = ({ route }) => {
    if (!route) return null;

    const {
        totalDistanceMeters,
        edges,
        fullyAccessible,
        accessibleUntilSeq,
        firstBlockedReason,
        requestedMobilityType,
    } = route;

    const hasStairs = edges.some((e) => e.stairs);

    const isBarrierFree =
        requestedMobilityType === "WHEELCHAIR" ||
        requestedMobilityType === "STROLLER" ||
        requestedMobilityType === "ELDERLY";

    return (
        <div style={{ padding: "8px 10px", borderTop: "1px solid #eee", fontSize: 13 }}>
            <div>
                총 거리: <strong>{formatDistance(totalDistanceMeters)}</strong>
            </div>

            <div style={{ marginTop: 4 }}>
                {fullyAccessible ? (
                    isBarrierFree ? (
                        <span style={{ color: "#2f855a" }}>
                            ✅ {requestedMobilityType} 기준으로 장애물을 회피한 경로입니다.
                        </span>
                    ) : hasStairs ? (
                        <span style={{ color: "#dd6b20" }}>
                            ⚠ 계단 구간이 포함된 경로입니다.
                        </span>
                    ) : (
                        <span style={{ color: "#3182ce" }}>
                            ✅ 일반 보행 경로입니다.
                        </span>
                    )
                ) : (
                    <span style={{ color: "#e53e3e" }}>
                        ❌ {requestedMobilityType} 기준으로 전체 이동이 불가능합니다.
                        {firstBlockedReason && ` (${firstBlockedReason})`}
                        {accessibleUntilSeq && ` — ${accessibleUntilSeq}번째 구간까지 가능`}
                    </span>
                )}
            </div>
        </div>
    );
};
