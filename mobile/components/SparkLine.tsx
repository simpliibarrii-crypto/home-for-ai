/**
 * SparkLine — Mini SVG sparkline using react-native-svg
 */
import React from 'react';
import { View } from 'react-native';
import Svg, { Polyline, Defs, LinearGradient, Stop, Polygon } from 'react-native-svg';

interface SparkLineProps {
  data: number[];
  color: string;
  width?: number;
  height?: number;
  strokeWidth?: number;
  filled?: boolean;
}

export function SparkLine({
  data,
  color,
  width = 80,
  height = 32,
  strokeWidth = 1.5,
  filled = true,
}: SparkLineProps) {
  if (!data || data.length < 2) return <View style={{ width, height }} />;

  const min = Math.min(...data);
  const max = Math.max(...data);
  const range = max - min || 1;

  const pad = strokeWidth;
  const innerW = width - pad * 2;
  const innerH = height - pad * 2;

  const points = data.map((v, i) => {
    const x = pad + (i / (data.length - 1)) * innerW;
    const y = pad + (1 - (v - min) / range) * innerH;
    return `${x.toFixed(1)},${y.toFixed(1)}`;
  });

  const polylineStr = points.join(' ');

  // Filled area polygon: add bottom-right and bottom-left corners
  const lastX = (pad + innerW).toFixed(1);
  const firstX = pad.toFixed(1);
  const bottomY = (pad + innerH).toFixed(1);
  const fillStr = `${polylineStr} ${lastX},${bottomY} ${firstX},${bottomY}`;

  return (
    <Svg width={width} height={height}>
      <Defs>
        <LinearGradient id={`spark-fill-${color}`} x1="0" y1="0" x2="0" y2="1">
          <Stop offset="0%" stopColor={color} stopOpacity={0.35} />
          <Stop offset="100%" stopColor={color} stopOpacity={0} />
        </LinearGradient>
      </Defs>
      {filled && (
        <Polygon
          points={fillStr}
          fill={`url(#spark-fill-${color})`}
        />
      )}
      <Polyline
        points={polylineStr}
        fill="none"
        stroke={color}
        strokeWidth={strokeWidth}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}
