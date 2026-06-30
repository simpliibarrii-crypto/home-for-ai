interface SparklineProps {
  data: number[];
  width?: number;
  height?: number;
  color?: string;
  positive?: boolean;
}

export default function Sparkline({ data, width = 80, height = 28, positive = true }: SparklineProps) {
  if (!data || data.length < 2) return null;

  const min = Math.min(...data);
  const max = Math.max(...data);
  const range = max - min || 1;

  const points = data.map((v, i) => {
    const x = (i / (data.length - 1)) * width;
    const y = height - ((v - min) / range) * (height - 4) - 2;
    return `${x},${y}`;
  });

  const polyline = points.join(" ");
  const color = positive ? "#10B981" : "#EF4444";
  const fillColor = positive ? "rgba(16,185,129,0.1)" : "rgba(239,68,68,0.1)";

  // Create fill path
  const firstX = 0;
  const lastX = width;
  const fillPath = `M${firstX},${height} L${points[0]} L${polyline.replace(/^\S+\s/, "")} L${lastX},${height} Z`;

  return (
    <svg
      width={width}
      height={height}
      viewBox={`0 0 ${width} ${height}`}
      fill="none"
      className="sparkline"
    >
      <path d={fillPath} fill={fillColor} />
      <polyline
        points={polyline}
        stroke={color}
        strokeWidth="1.5"
        fill="none"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
