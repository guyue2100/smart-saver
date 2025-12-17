import React from 'react';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
// Update import path to be in the same directory
import { Transaction } from './types';

interface StatsChartProps {
  transactions: Transaction[];
}

const StatsChart: React.FC<StatsChartProps> = ({ transactions }) => {
  // Aggregate data for the chart (simplified view)
  const data = transactions.map((t, index) => ({
    name: index + 1,
    amount: t.balanceSnapshot,
    date: new Date(t.date).toLocaleDateString(),
    desc: t.description
  })).reverse().slice(-20); // Show last 20 transactions

  if (data.length === 0) {
    return (
      <div className="h-48 flex items-center justify-center text-gray-400 text-sm bg-white rounded-2xl border border-gray-100 shadow-sm">
        暂无数据，开始你的第一笔存款吧！
      </div>
    );
  }

  return (
    <div className="bg-white p-4 rounded-2xl shadow-sm border border-gray-100">
      <h3 className="text-sm font-bold text-gray-700 mb-4 pl-2 border-l-4 border-emerald-500">资产增长趋势</h3>
      <div className="h-48 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart
            data={data}
            margin={{
              top: 5,
              right: 0,
              left: -20,
              bottom: 0,
            }}
          >
            <defs>
              <linearGradient id="colorAmount" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#10B981" stopOpacity={0.2} />
                <stop offset="95%" stopColor="#10B981" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
            <XAxis 
                dataKey="name" 
                tick={{fontSize: 10, fill: '#94a3b8'}} 
                tickLine={false}
                axisLine={false} 
            />
            <YAxis 
                tick={{fontSize: 10, fill: '#94a3b8'}} 
                tickLine={false}
                axisLine={false}
            />
            <Tooltip 
                contentStyle={{borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)', padding: '8px 12px'}}
                labelStyle={{color: '#64748b', fontSize: '11px', marginBottom: '4px'}}
                itemStyle={{color: '#059669', fontWeight: 'bold', fontSize: '14px'}}
                formatter={(value: number) => [`¥${value.toFixed(2)}`, '']}
            />
            <Area
              type="monotone"
              dataKey="amount"
              stroke="#10B981"
              strokeWidth={3}
              fill="url(#colorAmount)"
              animationDuration={1500}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};

export default StatsChart;