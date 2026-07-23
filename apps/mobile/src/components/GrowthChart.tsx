import React from "react";
import { StyleSheet, Text, View } from "react-native";
import Svg, { Circle, Line, Polyline } from "react-native-svg";
import { colors, font, space } from "../theme";
import type { WeightRecord } from "../core";

interface Props {
  records: WeightRecord[]; // oldest-first
  width: number;
}

// Simple line chart of weight over time. Mirrors the web app's GrowthChart:
// x = record index (evenly spaced), y = weight. Kept intentionally minimal.
export function GrowthChart({ records, width }: Props) {
  const height = 160;
  const pad = 12;
  if (records.length < 2) return null;

  const weights = records.map((r) => Number(r.weight_kg));
  const min = Math.min(...weights);
  const max = Math.max(...weights);
  const span = max - min || 1;
  const innerW = width - pad * 2;
  const innerH = height - pad * 2;

  const points = records.map((r, i) => {
    const x = pad + (innerW * i) / (records.length - 1);
    const y = pad + innerH - (innerH * (Number(r.weight_kg) - min)) / span;
    return { x, y };
  });

  const polyline = points.map((p) => `${p.x},${p.y}`).join(" ");

  return (
    <View>
      <Svg width={width} height={height}>
        <Line x1={pad} y1={pad} x2={pad} y2={height - pad} stroke={colors.border} strokeWidth={1} />
        <Line
          x1={pad}
          y1={height - pad}
          x2={width - pad}
          y2={height - pad}
          stroke={colors.border}
          strokeWidth={1}
        />
        <Polyline points={polyline} fill="none" stroke={colors.primary} strokeWidth={2.5} />
        {points.map((p, i) => (
          <Circle key={i} cx={p.x} cy={p.y} r={3.5} fill={colors.primary} />
        ))}
      </Svg>
      <View style={styles.axis}>
        <Text style={styles.axisText}>
          {min} kg – {max} kg
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  axis: { marginTop: space.xs, alignItems: "flex-end" },
  axisText: { fontSize: font.tiny, color: colors.textFaint },
});
