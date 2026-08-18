import { useEffect, useRef } from 'react';
import * as echarts from 'echarts';

export const CHART_COLORS = {
  accent: '#128984', primary: '#1e3a5a', ok: '#16a34a', warn: '#ed9f18', bad: '#dc2626', dim: '#94a3b8',
  grid: '#e2e8f0', text: '#64748b',
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
