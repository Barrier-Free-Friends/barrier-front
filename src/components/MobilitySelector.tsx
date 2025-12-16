// src/components/MobilitySelector.tsx
import React from "react";
import type {MobilityType} from "../types";

interface Props {
    value: MobilityType;
    onChange: (value: MobilityType) => void;
}

const labels: Record<MobilityType, string> = {
    PEDESTRIAN: "보행자",
    WHEELCHAIR: "휠체어",
    STROLLER: "유모차",
    ELDERLY: "노인",
};

export const MobilitySelector: React.FC<Props> = ({ value, onChange }) => {
    const options: MobilityType[] = ["PEDESTRIAN", "WHEELCHAIR", "STROLLER", "ELDERLY"];

    return (
        <div style={{ display: "flex", gap: 8 }}>
            {options.map((opt) => (
                <button
                    key={opt}
                    onClick={() => onChange(opt)}
                    style={{
                        padding: "6px 10px",
                        borderRadius: 999,
                        border: value === opt ? "2px solid #2b6cb0" : "1px solid #ccc",
                        backgroundColor: value === opt ? "#2b6cb0" : "#fff",
                        color: value === opt ? "#fff" : "#333",
                        fontSize: 13,
                        cursor: "pointer",
                    }}
                >
                    {labels[opt]}
                </button>
            ))}
        </div>
    );
};
