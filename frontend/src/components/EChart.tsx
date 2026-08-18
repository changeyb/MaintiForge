import { useEffect, useRef } from 'react';
import * as echarts from 'echarts';

export const CHART_COLORS = {
  accent: '#38bdf8', ok: '#34d399', warn: '#fbbf24', bad: '#f87171', dim: '#64748b',
  grid: '#1e2b47', text: '#8b98b3',
};

export default function EChart({ option, height = 220, onClick }: { option: echarts.EChartsOption; height?: number; onClick?: (params: any) => void }) {
  const ref = useRef<HTMLDivElement>(null);
  const chartRef = useRef<echarts.ECharts | null>(null);

  useEffect(() => {
    if (!ref.current) return;
    const chart = echarts.init(ref.current, undefined, { renderer: 'canvas' });
    chartRef.current = chart;
    const ro = new ResizeObserver(() => chart.resize());
    ro.observe(ref.current);
    return () => { ro.disconnect(); chart.dispose(); };
  }, []);

  useEffect(() => {
    const chart = chartRef.current;
    if (!chart) return;
    chart.setOption(option, true);
    if (onClick) { chart.off('click'); chart.on('click', onClick); }
  }, [option, onClick]);

  return <div ref={ref} style={{ height }} />;
}
