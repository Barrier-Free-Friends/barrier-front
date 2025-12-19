export type MobilityType = "PEDESTRIAN" | "WHEELCHAIR" | "STROLLER" | "ELDERLY";

export type LatLng = { lat: number; lng: number };

export type RouteGeoJson = {
    type: "LineString";
    coordinates: [number, number][]; // [lng,lat]
};

export type RouteEdge = {
    seq: number;
    edgeId: number;
    highway: string;
    surface: string | null;
    lengthMeters: number;
    stairs: boolean;
    passable: boolean;
    notPassableReason: string | null;
};

export interface RouteDetailResult {
    totalDistanceMeters: number;
    route: {
        type: "LineString";
        coordinates: [number, number][];
    };
    edges: RouteEdge[];
    fullyAccessible: boolean;
    accessibleUntilSeq: number | null;
    firstBlockedReason: string | null;
    requestedMobilityType: MobilityType;
}


export type GeoJsonPolygon = {
    type: "Polygon";
    coordinates: number[][][];
};

export type ObstacleArea = {
    id: string;
    type: string;
    geometry: GeoJsonPolygon;
};

export type ObstacleFeature = {
    type: "Feature";
    id: string;
    geometry: {
        type: "Polygon";
        coordinates: number[][][];
    };
    properties?: {
        obstacleId: number;
        type: string;
        createdAt: string | null;
        userId: string | null;
    };
};

export type ObstacleFeatureCollection = {
    type: "FeatureCollection";
    features: ObstacleFeature[];
};
