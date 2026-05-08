import React from 'react';
import { cn } from '../../lib/utils';
import { Card } from '../common/Card';
import { Area, AreaChart, ResponsiveContainer } from 'recharts';

interface StatsCardProps {
  title: string;
  value: string;
  caption: string;
  icon: any;
  iconBg: string;
  iconColor: string;
  className?: string;
  key?: React.Key;
}

export function StatsCard({ 
  title, 
  value, 
  caption, 
  icon: Icon, 
  iconBg, 
  iconColor,
  className
}: StatsCardProps) {
  return (
    <Card className={cn("p-5 flex items-center gap-4 min-h-[110px] w-full", className)}>
      <div className={cn("w-12 h-12 rounded-2xl flex items-center justify-center flex-shrink-0", iconBg, iconColor)}>
        <Icon size={24} strokeWidth={2} />
      </div>
      <div className="flex flex-col min-w-0">
        <span className="text-sm text-text-secondary font-medium tracking-wide truncate" title={title}>{title}</span>
        <span className="text-2xl font-bold text-[#1a1a1a] leading-none my-1 tracking-tight truncate">{value}</span>
        <span className="text-xs text-text-muted font-medium truncate" title={caption}>{caption}</span>
      </div>
    </Card>
  );
}
