
import React from 'react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, LineChart, Line, CartesianGrid, PieChart, Pie, Cell, Legend } from 'recharts';
import { YouTubeVideo } from '../types';
import { formatNumber, parseDuration } from '../utils';

interface Props {
  videos: YouTubeVideo[];
  popularityData?: any[];
}

export const ViewsChart: React.FC<Props> = ({ videos }) => {
  // Sort by date for trend line
  const data = [...videos]
    .sort((a, b) => new Date(a.publishedAt).getTime() - new Date(b.publishedAt).getTime())
    .map(v => ({
      name: v.publishedAt.split('T')[0].substring(5), // MM-DD
      views: v.viewCount,
      title: v.title,
      fullDate: v.publishedAt.split('T')[0]
    }));

  return (
    <div className="h-72 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data} margin={{ top: 5, right: 20, bottom: 5, left: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#334155" vertical={false} />
          <XAxis dataKey="name" stroke="#94a3b8" fontSize={12} tickMargin={10} />
          <YAxis stroke="#94a3b8" fontSize={12} tickFormatter={(val) => formatNumber(val)} width={50} />
          <Tooltip 
            contentStyle={{ backgroundColor: '#1e293b', border: '1px solid #475569', borderRadius: '8px', color: '#f1f5f9' }}
            itemStyle={{ color: '#f87171' }}
            labelStyle={{ color: '#94a3b8', marginBottom: '5px' }}
            formatter={(value: number) => [formatNumber(value), '조회수']}
            labelFormatter={(label, payload) => payload[0]?.payload.title || label}
          />
          <Line type="monotone" dataKey="views" stroke="#ef4444" strokeWidth={3} dot={{ r: 3, fill: '#ef4444' }} activeDot={{ r: 6, fill: '#fff' }} />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
};

export const PopularityScoreChart: React.FC<Props> = ({ popularityData }) => {
  if (!popularityData) return null;

  return (
    <div className="h-72 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={popularityData.slice(0, 20)} margin={{ top: 5, right: 0, bottom: 5, left: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#334155" vertical={false} />
          <XAxis dataKey="name" stroke="#94a3b8" fontSize={10} tick={false} />
          <YAxis stroke="#94a3b8" fontSize={12} width={30} />
          <Tooltip 
            cursor={{fill: '#334155', opacity: 0.4}}
            contentStyle={{ backgroundColor: '#1e293b', border: '1px solid #475569', borderRadius: '8px', color: '#f1f5f9' }}
            labelFormatter={(label, payload) => payload[0]?.payload.title || label}
          />
          <Bar dataKey="score" fill="#ef4444" radius={[4, 4, 0, 0]} name="인기 점수" />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
};

export const EngagementChart: React.FC<Props> = ({ videos }) => {
  // Sort by likes
  const data = [...videos]
    .sort((a, b) => b.likeCount - a.likeCount)
    .slice(0, 15)
    .map(v => ({
      name: v.title,
      likes: v.likeCount,
      comments: v.commentCount
    }));

  return (
    <div className="h-72 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ top: 5, right: 0, bottom: 5, left: 0 }}>
           <CartesianGrid strokeDasharray="3 3" stroke="#334155" vertical={false} />
          <XAxis dataKey="name" stroke="#94a3b8" fontSize={10} tick={false} />
          <YAxis stroke="#94a3b8" fontSize={12} tickFormatter={formatNumber} width={50} />
          <Tooltip 
            cursor={{fill: '#334155', opacity: 0.4}}
            contentStyle={{ backgroundColor: '#1e293b', border: '1px solid #475569', borderRadius: '8px', color: '#f1f5f9' }}
          />
          <Bar dataKey="likes" fill="#ef4444" radius={[4, 4, 0, 0]} name="좋아요" stackId="a" />
          <Bar dataKey="comments" fill="#3b82f6" radius={[4, 4, 0, 0]} name="댓글" stackId="a" />
          <Legend />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
};

export const VideoFormatChart: React.FC<Props> = ({ videos }) => {
  const shortsCount = videos.filter(v => parseDuration(v.duration) < 180).length;
  const regularCount = videos.length - shortsCount;
  
  const data = [
    { name: '쇼츠 (3분 미만)', value: shortsCount },
    { name: '일반 영상', value: regularCount },
  ];
  
  const COLORS = ['#8b5cf6', '#ef4444']; 

  return (
    <div className="h-72 w-full relative flex items-center justify-center">
       <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <Pie
            data={data}
            cx="50%"
            cy="50%"
            innerRadius={60}
            outerRadius={90}
            paddingAngle={5}
            dataKey="value"
            stroke="none"
          >
            {data.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
            ))}
          </Pie>
          <Tooltip 
             contentStyle={{ backgroundColor: '#1e293b', border: '1px solid #475569', borderRadius: '8px' }}
          />
          <Legend verticalAlign="bottom" height={36} iconType="circle"/>
        </PieChart>
      </ResponsiveContainer>
      <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 -mt-4 text-center pointer-events-none">
         <div className="text-3xl font-bold text-white">{videos.length}</div>
         <div className="text-xs text-slate-400 uppercase tracking-wider">Total Videos</div>
      </div>
    </div>
  );
};
