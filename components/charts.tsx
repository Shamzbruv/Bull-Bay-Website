"use client";

import { Area, AreaChart, Bar, BarChart, CartesianGrid, Cell, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

const BLUE = "#173f89";
const OLIVE = "#6a7e30";
const GOLD = "#c9922b";
const MUTED = "#5c6a80";
const PALETTE = [BLUE, OLIVE, GOLD, "#8a4f9e", "#2b8f9e", "#c1533b"];

function ChartTooltip({ active, payload, label, formatter }: { active?: boolean; payload?: { value: number; name: string }[]; label?: string; formatter?: (v: number) => string }) {
  if (!active || !payload?.length) return null;
  return (
    <div style={{ background: "#fff", border: "1px solid var(--color-border)", borderRadius: 10, padding: "8px 12px", fontSize: ".8rem", boxShadow: "0 6px 18px rgba(23,63,137,.12)" }}>
      <div style={{ fontWeight: 600, marginBottom: 2 }}>{label}</div>
      {payload.map((p, i) => (
        <div key={i} style={{ color: PALETTE[i % PALETTE.length] }}>
          {p.name}: {formatter ? formatter(p.value) : p.value}
        </div>
      ))}
    </div>
  );
}

export function TrendAreaChart({ data, dataKey, label, formatter, height = 220 }: { data: Record<string, string | number>[]; dataKey: string; label: string; formatter?: (v: number) => string; height?: number }) {
  return (
    <ResponsiveContainer width="100%" height={height}>
      <AreaChart data={data} margin={{ top: 8, right: 8, left: -20, bottom: 0 }}>
        <defs>
          <linearGradient id="trendFill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={BLUE} stopOpacity={0.35} />
            <stop offset="100%" stopColor={BLUE} stopOpacity={0.02} />
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="3 3" stroke="#e5e8e1" vertical={false} />
        <XAxis dataKey="label" tick={{ fontSize: 11, fill: MUTED }} axisLine={false} tickLine={false} />
        <YAxis tick={{ fontSize: 11, fill: MUTED }} axisLine={false} tickLine={false} width={48} />
        <Tooltip content={<ChartTooltip formatter={formatter} />} />
        <Area type="monotone" dataKey={dataKey} name={label} stroke={BLUE} strokeWidth={2.5} fill="url(#trendFill)" />
      </AreaChart>
    </ResponsiveContainer>
  );
}

export function ComparisonBarChart({ data, bars, height = 240 }: { data: Record<string, string | number>[]; bars: { key: string; label: string; color?: string }[]; height?: number }) {
  return (
    <ResponsiveContainer width="100%" height={height}>
      <BarChart data={data} margin={{ top: 8, right: 8, left: -20, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#e5e8e1" vertical={false} />
        <XAxis dataKey="label" tick={{ fontSize: 11, fill: MUTED }} axisLine={false} tickLine={false} />
        <YAxis tick={{ fontSize: 11, fill: MUTED }} axisLine={false} tickLine={false} width={48} />
        <Tooltip content={<ChartTooltip />} />
        {bars.map((b, i) => (
          <Bar key={b.key} dataKey={b.key} name={b.label} fill={b.color ?? PALETTE[i % PALETTE.length]} radius={[6, 6, 0, 0]} />
        ))}
      </BarChart>
    </ResponsiveContainer>
  );
}

export function BreakdownPieChart({ data, height = 220 }: { data: { name: string; value: number }[]; height?: number }) {
  return (
    <ResponsiveContainer width="100%" height={height}>
      <PieChart>
        <Tooltip content={<ChartTooltip />} />
        <Pie data={data} dataKey="value" nameKey="name" innerRadius="55%" outerRadius="85%" paddingAngle={2}>
          {data.map((_, i) => (
            <Cell key={i} fill={PALETTE[i % PALETTE.length]} />
          ))}
        </Pie>
      </PieChart>
    </ResponsiveContainer>
  );
}
