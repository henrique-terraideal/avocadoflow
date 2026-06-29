import React from "react";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from "recharts";

export default function ChartsSection({ hoursByOrchard, hoursByActivity }) {
  const renderChart = (data, color, title) => (
    <div className="bg-card rounded-2xl border border-border p-4">
      <h3 className="text-sm font-bold text-foreground mb-3">{title}</h3>
      {data.length === 0 ? (
        <div className="h-[200px] flex items-center justify-center text-muted-foreground text-sm">
          Sem dados
        </div>
      ) : (
        <ResponsiveContainer width="100%" height={200}>
          <BarChart data={data} margin={{ top: 5, right: 5, bottom: 5, left: -20 }}>
            <CartesianGrid strokeDasharray="3 3" className="stroke-border" vertical={false} />
            <XAxis dataKey="name" tick={{ fontSize: 11 }} interval={0} angle={-15} textAnchor="end" height={50} />
            <YAxis tick={{ fontSize: 11 }} />
            <Tooltip
              formatter={(value) => [`${value.toFixed(1)}h`, "Horas"]}
              contentStyle={{ borderRadius: "0.75rem", border: "1px solid hsl(var(--border))", fontSize: "12px" }}
            />
            <Bar dataKey="hours" fill={color} radius={[6, 6, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      )}
    </div>
  );

  return (
    <div className="space-y-3">
      {renderChart(hoursByOrchard, "hsl(var(--primary))", "Horas por Pomar")}
      {renderChart(hoursByActivity, "hsl(var(--accent))", "Horas por Atividade")}
    </div>
  );
}