"use client";

import { formatPrice } from "@repo/ui/format";
import {
  Area,
  CartesianGrid,
  ComposedChart,
  Line,
  ReferenceLine,
  XAxis,
  YAxis,
} from "recharts";
import {
  type ChartConfig,
  ChartContainer,
  ChartTooltip,
} from "@/components/ui/chart";

export type RevenuePoint = {
  month: string;
  revenue: number;
  orders: number;
};

const chartConfig = {
  revenue: {
    label: "Revenue",
    color: "var(--primary)",
  },
} satisfies ChartConfig;

type TooltipProps = {
  active?: boolean;
  label?: string;
  payload?: Array<{ payload: RevenuePoint }>;
};

function RevenueTooltip({ active, payload, label }: TooltipProps) {
  const point = payload?.[0]?.payload;

  if (!active || !point) {
    return null;
  }

  return (
    <div className="min-w-44 rounded-2xl border border-border bg-popover p-3 text-xs shadow-sm">
      <div className="mb-2 font-medium text-muted-foreground">{label}</div>
      <div className="flex items-center justify-between gap-4">
        <span className="text-muted-foreground">Revenue</span>
        <span className="font-semibold text-popover-foreground">
          {formatPrice(point.revenue)}
        </span>
      </div>
      <div className="mt-1 flex items-center justify-between gap-4">
        <span className="text-muted-foreground">Orders</span>
        <span className="font-semibold text-popover-foreground">
          {point.orders}
        </span>
      </div>
    </div>
  );
}

/*
 * Legend swatch. Lives here rather than in the page so the colour is read
 * from the same chartConfig the series is drawn with, and the two can never
 * drift apart.
 */
export function RevenueChartLegend() {
  return (
    <div className="flex items-center gap-1.5 text-sm">
      <div
        className="size-3.5 rounded-full border-4 bg-background"
        style={{ borderColor: chartConfig.revenue.color }}
      />
      <span className="text-muted-foreground">{chartConfig.revenue.label}</span>
    </div>
  );
}

export function RevenueChart({ data }: { data: RevenuePoint[] }) {
  const currentMonth = data.at(-1)?.month;

  return (
    <ChartContainer
      config={chartConfig}
      className="h-[300px] w-full [&_.recharts-curve.recharts-tooltip-cursor]:stroke-initial"
    >
      <ComposedChart
        data={data}
        margin={{ top: 5, right: 15, left: 5, bottom: 5 }}
      >
        <defs>
          <linearGradient id="revenueGradient" x1="0" y1="0" x2="0" y2="1">
            <stop
              offset="0%"
              stopColor="var(--color-revenue)"
              stopOpacity={0.3}
            />
            <stop
              offset="100%"
              stopColor="var(--color-revenue)"
              stopOpacity={0.03}
            />
          </linearGradient>
        </defs>

        <CartesianGrid
          strokeDasharray="4 4"
          stroke="var(--border)"
          horizontal
          vertical={false}
        />

        <XAxis
          dataKey="month"
          axisLine={false}
          tickLine={false}
          tick={{ fontSize: 11 }}
          tickMargin={12}
        />

        <YAxis
          axisLine={false}
          tickLine={false}
          tick={{ fontSize: 11 }}
          width={70}
          tickMargin={8}
          tickFormatter={(value: number) => formatPrice(value)}
        />

        {currentMonth && (
          <ReferenceLine
            x={currentMonth}
            stroke="var(--color-revenue)"
            strokeWidth={1}
          />
        )}

        <ChartTooltip
          content={<RevenueTooltip />}
          cursor={{ stroke: "var(--border)", strokeWidth: 1 }}
        />

        <Area
          type="linear"
          dataKey="revenue"
          stroke="transparent"
          fill="url(#revenueGradient)"
          strokeWidth={0}
          dot={false}
        />

        <Line
          type="linear"
          dataKey="revenue"
          stroke="var(--color-revenue)"
          strokeWidth={2}
          dot={{
            fill: "var(--background)",
            stroke: "var(--color-revenue)",
            strokeWidth: 2,
            r: 5,
          }}
        />
      </ComposedChart>
    </ChartContainer>
  );
}
