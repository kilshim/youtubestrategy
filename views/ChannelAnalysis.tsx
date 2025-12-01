
import React, { useState, useEffect, useMemo } from 'react';
import { Search, TrendingUp, Users, Video, Award, Brain, Download, Copy, Target, History, Lightbulb, CheckSquare, Clock, BarChart, MessageCircle, ThumbsUp, Eye, Calendar, Info, ListFilter, BarChart2, FileText, Zap, ShieldAlert, DollarSign, Settings, Sparkles, Filter, ExternalLink } from 'lucide-react';
import { YouTubeChannel, YouTubeVideo, AnalysisReport } from '../types';
import { searchChannelByName, getChannelVideos } from '../services/youtubeService';
import { analyzeChannelGrowth, summarizeVideo } from '../services/geminiService';
import { ViewsChart, EngagementChart, VideoFormatChart, PopularityScoreChart } from '../components/DashboardCharts';
import { formatNumber, formatDate, downloadJSON, downloadCSV, formatDurationKR, parseDuration, downloadText, formatReportToText } from '../utils';

interface Props {
  apiKey: string;
  initialQuery?: string | null;
  onSearchComplete?: () => void;
}

type ReportTab = 'overview' | 'growth' | 'diagnosis' | 'strategy';
type ChartTab = 'popularity' | 'views' | 'likes' | 'comments' | 'timeline' | 'format';
type SortOption = 'popularity' | 'views' | 'date_desc' | 'date_asc';
type FilterOption = 'all' | 'video' | 'shorts';

// Helper to calculate popularity score (0-100) based on relative performance
const calculateVideoScore = (v: YouTubeVideo, maxViews: number, maxLikes: number, maxComments: number) => {
    // Avoid division by zero
    const viewScore = maxViews ? (v.viewCount / maxViews) * 50 : 0;
    const likeScore = maxLikes ? (v.likeCount / maxLikes) * 30 : 0;
    const commentScore = maxComments ? (v.commentCount / maxComments) * 20 : 0;
    return Math.round(viewScore + likeScore + commentScore);
};

const ChannelAnalysis: React.FC<Props> = ({ apiKey, initialQuery, onSearchComplete }) => {
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [channel, setChannel] = useState<YouTubeChannel | null>(null);
  const [videos, setVideos] = useState<YouTubeVideo[]>([]);
  const [report, setReport] = useState<AnalysisReport | null>(null);
  const [analyzing, setAnalyzing] = useState(false);
  
  // Video Summaries State
  const [videoSummaries, setVideoSummaries] = useState<Record<string, string>>({});
  const [loadingSummaries, setLoadingSummaries] = useState<Record<string, boolean>>({});

  // UI States
  const [activeReportTab, setActiveReportTab] = useState<ReportTab>('overview');
  const [activeChartTab, setActiveChartTab] = useState<ChartTab>('popularity');
  const [sortOption, setSortOption] = useState<SortOption>('popularity');
  const [filterOption, setFilterOption] = useState<FilterOption>('all');
  const [displayCount, setDisplayCount] = useState<number>(50);

  // Derived Metrics
  const channelMetrics = useMemo(() => {
    if (!videos.length) return null;
    
    const sortedByDate = [...videos].sort((a, b) => new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime());
    const firstUpload = sortedByDate[sortedByDate.length - 1].publishedAt;
    const lastUpload = sortedByDate[0].publishedAt;
    const totalDuration = new Date(lastUpload).getTime() - new Date(firstUpload).getTime();
    
    // Upload Cycle
    const avgCycle = videos.length > 1 ? totalDuration / (videos.length - 1) : 0;
    
    // Recent Cycle (between last two videos)
    const recentCycle = videos.length > 1 
        ? new Date(sortedByDate[0].publishedAt).getTime() - new Date(sortedByDate[1].publishedAt).getTime()
        : 0;

    return {
        firstUpload,
        avgCycle,
        recentCycle
    };
  }, [videos]);

  const processedVideos = useMemo(() => {
    if (!videos.length) return [];
    
    const maxViews = Math.max(...videos.map(v => v.viewCount));
    const maxLikes = Math.max(...videos.map(v => v.likeCount));
    const maxComments = Math.max(...videos.map(v => v.commentCount));

    return videos.map(v => ({
        ...v,
        popularityScore: calculateVideoScore(v, maxViews, maxLikes, maxComments)
    }));
  }, [videos]);

  const sortedVideos = useMemo(() => {
      let result = [...processedVideos];

      // 1. Filter
      if (filterOption === 'shorts') {
          result = result.filter(v => parseDuration(v.duration) < 180);
      } else if (filterOption === 'video') {
          result = result.filter(v => parseDuration(v.duration) >= 180);
      }

      // 2. Sort
      switch (sortOption) {
          case 'popularity': return result.sort((a, b) => b.popularityScore - a.popularityScore);
          case 'views': return result.sort((a, b) => b.viewCount - a.viewCount);
          case 'date_desc': return result.sort((a, b) => new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime());
          case 'date_asc': return result.sort((a, b) => new Date(a.publishedAt).getTime() - new Date(b.publishedAt).getTime());
          default: return result;
      }
  }, [processedVideos, sortOption, filterOption]);

  // Apply display count limit
  const displayVideos = sortedVideos.slice(0, displayCount);

  const chartData = useMemo(() => {
    return sortedVideos.map(v => ({
        name: v.publishedAt.split('T')[0],
        title: v.title,
        score: v.popularityScore,
        views: v.viewCount,
        likes: v.likeCount,
        comments: v.commentCount
    }));
  }, [sortedVideos]);

  useEffect(() => {
    if (initialQuery) {
      setQuery(initialQuery);
      handleSearch(undefined, initialQuery);
      if (onSearchComplete) onSearchComplete();
    }
  }, [initialQuery]);

  const handleSearch = async (e?: React.FormEvent, overrideQuery?: string) => {
    if (e) e.preventDefault();
    const q = overrideQuery || query;
    if (!q.trim() || !apiKey) return;

    setLoading(true);
    setChannel(null);
    setVideos([]);
    setReport(null);
    setVideoSummaries({});
    setActiveReportTab('overview');

    try {
      const chData = await searchChannelByName(apiKey, q);
      if (chData) {
        setChannel(chData);
        const vData = await getChannelVideos(apiKey, chData.id, 50); // Ensure fetching up to 50
        setVideos(vData);
        
        // Auto start AI analysis
        setAnalyzing(true);
        try {
            const aiReport = await analyzeChannelGrowth(chData, vData);
            setReport(aiReport);
        } catch (err) {
            console.error(err);
        } finally {
            setAnalyzing(false);
        }
      } else {
        alert('채널을 찾을 수 없습니다.');
      }
    } catch (error) {
      console.error(error);
      alert('채널을 찾을 수 없거나 API 한도가 초과되었습니다.');
    } finally {
      setLoading(false);
    }
  };

  const handleSummarizeVideo = async (video: YouTubeVideo) => {
      if (videoSummaries[video.id] || loadingSummaries[video.id]) return;

      setLoadingSummaries(prev => ({ ...prev, [video.id]: true }));
      try {
          const summary = await summarizeVideo(video);
          setVideoSummaries(prev => ({ ...prev, [video.id]: summary }));
      } catch (e) {
          alert('요약 생성 실패');
      } finally {
          setLoadingSummaries(prev => ({ ...prev, [video.id]: false }));
      }
  };

  const handleCopyGrowth = () => {
    if (!report?.growthProcess) return;
    const content = JSON.stringify(report.growthProcess, null, 2);
    navigator.clipboard.writeText(content);
    alert('성장 과정 분석 내용이 복사되었습니다.');
  };

  const handleDownloadGrowth = () => {
    if (!report?.growthProcess) return;
    downloadJSON(report.growthProcess, `${channel?.title}_growth_analysis`);
  };

  const handleDownloadFullText = () => {
      if (!report || !channel) return;
      const textContent = formatReportToText(report, channel.title);
      downloadText(textContent, `${channel.title}_consulting_report`);
  };

  const renderReportContent = () => {
    if (!report) return null;
    switch (activeReportTab) {
      case 'overview':
        return (
          <div className="space-y-6 animate-fade-in">
             <div className="bg-slate-900/50 p-6 rounded-xl border border-slate-700/50">
                <h4 className="font-bold text-blue-300 mb-4 text-lg">📋 종합 요약</h4>
                <p className="text-slate-300 leading-relaxed text-lg">{report.summary}</p>
             </div>
             <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="bg-slate-900/50 p-5 rounded-xl border-l-4 border-green-500">
                    <h4 className="font-bold text-green-400 mb-2">💡 핵심 기회</h4>
                    <p className="text-slate-300 text-sm">경쟁 전략 탭에서 성장 로드맵과 추천 영상 제목을 확인하세요.</p>
                </div>
                <div className="bg-slate-900/50 p-5 rounded-xl border-l-4 border-red-500">
                    <h4 className="font-bold text-red-400 mb-2">⚠️ 주요 문제</h4>
                    <p className="text-slate-300 text-sm">채널 진단 탭에서 분야별 상세 진단을 확인하세요.</p>
                </div>
             </div>
          </div>
        );
      case 'growth':
        return (
          <div className="space-y-6 animate-fade-in">
             <div className="flex justify-between items-center bg-slate-900/50 p-4 rounded-xl border border-slate-700/50">
                <div>
                    <h4 className="font-bold text-slate-200">📈 성장 과정 심층 분석</h4>
                    <p className="text-xs text-slate-400">초기, 중기, 최신 성과 및 전략 변화 분석</p>
                </div>
                <div className="flex gap-2">
                    <button onClick={handleCopyGrowth} className="px-3 py-1.5 bg-slate-700 hover:bg-slate-600 rounded text-xs text-white flex items-center gap-1 transition-colors">
                        <Copy size={12}/> 내용 복사
                    </button>
                    <button onClick={handleDownloadGrowth} className="px-3 py-1.5 bg-slate-700 hover:bg-slate-600 rounded text-xs text-white flex items-center gap-1 transition-colors">
                        <Download size={12}/> JSON 저장
                    </button>
                </div>
             </div>

             <div className="grid gap-6">
                {[
                    { label: 'EARLY STAGE', color: 'blue', title: '🌱 초기 성장 과정', data: report.growthProcess?.early },
                    { label: 'MID STAGE', color: 'purple', title: '🚀 성장 가속/정체기', data: report.growthProcess?.mid },
                    { label: 'LATEST', color: 'green', title: '🔥 최근 성과 분석', data: report.growthProcess?.latest }
                ].map((stage, idx) => (
                    <div key={idx} className="bg-slate-900/50 rounded-xl border border-slate-700/50 overflow-hidden">
                        <div className={`bg-${stage.color}-900/20 border-b border-${stage.color}-500/20 p-4 flex justify-between items-center`}>
                            <h4 className="font-bold text-slate-200 flex items-center gap-2">
                                {stage.title} 
                                <span className={`text-xs px-2 py-0.5 rounded-full bg-${stage.color}-500/20 text-${stage.color}-300`}>{stage.data?.period}</span>
                            </h4>
                            <span className={`text-${stage.color}-400 text-xs font-bold tracking-wider`}>{stage.label}</span>
                        </div>
                        
                        <div className="p-5 grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div className="space-y-4">
                                <div>
                                    <div className="text-xs text-slate-500 font-bold uppercase mb-1 flex items-center gap-1"><Info size={12}/> 성과 요약</div>
                                    <p className="text-slate-300 text-sm">{stage.data?.summary}</p>
                                </div>
                                <div>
                                    <div className="text-xs text-slate-500 font-bold uppercase mb-1 flex items-center gap-1"><Target size={12}/> 전략 분석</div>
                                    <p className="text-slate-300 text-sm">{stage.data?.strategy}</p>
                                </div>
                            </div>
                            <div className="space-y-4 md:border-l md:border-slate-700/50 md:pl-6">
                                <div>
                                    <div className="text-xs text-slate-500 font-bold uppercase mb-1 flex items-center gap-1"><BarChart2 size={12}/> 정량적 성과</div>
                                    <p className="text-slate-300 text-sm">{stage.data?.quantitative}</p>
                                </div>
                                <div>
                                    <div className="text-xs text-slate-500 font-bold uppercase mb-1 flex items-center gap-1"><FileText size={12}/> 콘텐츠 심화 분석</div>
                                    <p className="text-slate-300 text-sm">{stage.data?.contentDepth}</p>
                                </div>
                            </div>
                        </div>
                    </div>
                ))}
             </div>
          </div>
        );
      case 'diagnosis':
        return (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 animate-fade-in">
             {[
               { title: '콘텐츠 기획', icon: <Video size={16}/>, data: report.diagnosis?.content },
               { title: '시청자 참여', icon: <Users size={16}/>, data: report.diagnosis?.engagement },
               { title: '수익화 모델', icon: <TrendingUp size={16}/>, data: report.diagnosis?.monetization },
               { title: '브랜딩', icon: <Award size={16}/>, data: report.diagnosis?.branding },
             ].map((item, idx) => (
               <div key={idx} className="bg-slate-900/50 p-5 rounded-xl border border-slate-700/50">
                  <h4 className="font-bold text-slate-200 mb-3 flex items-center gap-2">
                    {item.icon} {item.title}
                  </h4>
                  <div className="space-y-3">
                    <div className="text-sm">
                      <span className="text-red-400 font-bold text-xs block mb-1">PROBLEM</span>
                      <p className="text-slate-400">{item.data?.problem}</p>
                    </div>
                    <div className="text-sm">
                      <span className="text-green-400 font-bold text-xs block mb-1">SOLUTION</span>
                      <p className="text-slate-300">{item.data?.solution}</p>
                    </div>
                  </div>
               </div>
             ))}
          </div>
        );
      case 'strategy':
        return (
          <div className="space-y-8 animate-fade-in">
             {/* Concept & Direction */}
             <div className="bg-gradient-to-r from-blue-900/40 to-purple-900/40 p-8 rounded-2xl border border-blue-500/30 shadow-lg relative overflow-hidden">
                <div className="absolute top-0 right-0 w-32 h-32 bg-blue-500/10 rounded-full blur-3xl"></div>
                
                <h4 className="font-bold text-blue-300 mb-4 flex items-center gap-2 text-lg">
                  <Target size={24} /> AI 전략 제안: New Winning Concept
                </h4>
                <div className="text-2xl font-bold text-white mb-4 leading-tight">{report.benchmarking?.concept}</div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-6">
                    <div>
                        <div className="text-sm font-bold text-slate-400 mb-2 uppercase tracking-wide">운영 방향성</div>
                        <p className="text-slate-300 text-sm leading-relaxed bg-slate-900/40 p-4 rounded-xl border border-slate-700/50">{report.benchmarking?.direction}</p>
                    </div>
                    <div>
                        <div className="text-sm font-bold text-slate-400 mb-2 uppercase tracking-wide">상세 운영 전략</div>
                        <p className="text-slate-300 text-sm leading-relaxed bg-slate-900/40 p-4 rounded-xl border border-slate-700/50">{report.benchmarking?.detailedOperation}</p>
                    </div>
                </div>
             </div>

             {/* 3-Month Roadmap */}
             <div>
                <h4 className="font-bold text-purple-400 mb-4 flex items-center gap-2 text-lg">
                  <History size={20} /> 3개월 집중 성장 로드맵
                </h4>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    {report.benchmarking?.roadmap?.map((step, i) => (
                      <div key={i} className="bg-slate-900/50 border border-slate-700/50 p-5 rounded-xl relative hover:border-purple-500/50 transition-colors">
                          <div className="absolute -top-3 -left-3 w-8 h-8 bg-purple-600 rounded-lg flex items-center justify-center font-bold text-white shadow-lg shadow-purple-600/30">
                              {i+1}
                          </div>
                          <h5 className="font-bold text-slate-200 mt-2 mb-2">Month {i+1}</h5>
                          <p className="text-slate-300 text-sm leading-relaxed">{step}</p>
                      </div>
                    ))}
                </div>
             </div>

             <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                 {/* Video Titles */}
                 <div className="lg:col-span-2 bg-slate-900/50 p-6 rounded-xl border border-slate-700/50">
                    <h4 className="font-bold text-yellow-400 mb-4 flex items-center gap-2">
                      <Lightbulb size={20} /> 추천 영상 제목 Top 10
                    </h4>
                    <ul className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      {report.benchmarking?.titles?.map((title, i) => (
                        <li key={i} className="flex gap-3 text-sm text-slate-300 items-start bg-slate-800/50 p-3 rounded-lg border border-slate-700/50 hover:border-yellow-500/30 transition-colors">
                           <CheckSquare size={16} className="mt-0.5 text-yellow-600 shrink-0"/>
                           <span>{title}</span>
                        </li>
                      ))}
                    </ul>
                 </div>

                 {/* KPIs */}
                 <div className="bg-slate-900/50 p-6 rounded-xl border border-slate-700/50">
                    <h4 className="font-bold text-green-400 mb-4 flex items-center gap-2">
                      <BarChart size={20} /> 핵심 성과 지표 (KPI)
                    </h4>
                    <ul className="space-y-3">
                        {report.benchmarking?.kpis?.map((kpi, i) => (
                            <li key={i} className="flex items-center gap-3 text-sm text-slate-300">
                                <div className="w-1.5 h-1.5 bg-green-500 rounded-full"></div>
                                {kpi}
                            </li>
                        ))}
                    </ul>
                 </div>
             </div>

             {/* Risks & Revenue */}
             <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                 <div className="bg-slate-900/50 p-6 rounded-xl border border-slate-700/50 border-l-4 border-l-red-500">
                    <h4 className="font-bold text-red-400 mb-3 flex items-center gap-2">
                        <ShieldAlert size={20} /> 리스크 관리 및 대응
                    </h4>
                    <p className="text-slate-300 text-sm leading-relaxed">
                        {report.benchmarking?.risks}
                    </p>
                 </div>
                 <div className="bg-slate-900/50 p-6 rounded-xl border border-slate-700/50 border-l-4 border-l-emerald-500">
                    <h4 className="font-bold text-emerald-400 mb-3 flex items-center gap-2">
                        <DollarSign size={20} /> 수익 모델 다각화 전략
                    </h4>
                    <p className="text-slate-300 text-sm leading-relaxed">
                        {report.benchmarking?.revenue}
                    </p>
                 </div>
             </div>
          </div>
        );
    }
  };

  return (
    <div className="space-y-6">
      {/* Search Bar */}
      <div className="bg-slate-800 p-6 rounded-2xl shadow-lg border border-slate-700">
        <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
            <Search className="text-red-500" /> 채널 검색 및 심층 컨설팅
        </h2>
        <form onSubmit={handleSearch} className="flex gap-2">
          <input 
            type="text" 
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="채널명 입력 (예: 슈카월드)" 
            className="flex-1 bg-slate-900 border border-slate-700 rounded-lg px-4 py-3 text-white focus:ring-2 focus:ring-red-500 outline-none"
          />
          <button 
            type="submit" 
            disabled={loading}
            className="bg-red-600 hover:bg-red-700 text-white px-6 py-3 rounded-lg font-bold transition-colors disabled:opacity-50"
          >
            {loading ? '분석 중...' : '분석 시작'}
          </button>
        </form>
      </div>

      {channel && (
        <>
          {/* Dashboard Header - Channel Info */}
          <div className="bg-slate-800 rounded-2xl border border-slate-700 p-6 shadow-xl">
              <div className="flex flex-col md:flex-row gap-8">
                  {/* Left: Identity & Core Stats */}
                  <div className="flex-1 flex gap-6 items-center">
                      <div className="relative">
                          <img src={channel.thumbnail} alt={channel.title} className="w-24 h-24 rounded-full border-4 border-slate-700 shadow-lg" />
                          <div className="absolute -bottom-2 -right-2 bg-slate-900 text-xs px-2 py-1 rounded-full border border-slate-700">{channel.country || 'Global'}</div>
                      </div>
                      <div>
                          <h1 className="text-3xl font-bold text-white mb-2 hover:text-red-500 transition-colors">
                            <a href={`https://www.youtube.com/channel/${channel.id}`} target="_blank" rel="noreferrer" className="flex items-center gap-2">
                                {channel.title}
                                <ExternalLink size={20} className="text-slate-500" />
                            </a>
                          </h1>
                          <div className="flex gap-6">
                             <div>
                                <div className="text-slate-400 text-xs font-bold uppercase tracking-wider mb-1">구독자 수</div>
                                <div className="text-2xl font-bold text-red-500">{formatNumber(channel.subscriberCount)}</div>
                             </div>
                             <div>
                                <div className="text-slate-400 text-xs font-bold uppercase tracking-wider mb-1">총 조회수</div>
                                <div className="text-2xl font-bold text-white">{formatNumber(channel.viewCount)}</div>
                             </div>
                             <div>
                                <div className="text-slate-400 text-xs font-bold uppercase tracking-wider mb-1">총 영상 수</div>
                                <div className="text-2xl font-bold text-white">{formatNumber(channel.videoCount)}</div>
                             </div>
                          </div>
                      </div>
                  </div>

                  {/* Right: Detailed Dates & Cycles */}
                  <div className="flex-1 bg-slate-900/50 rounded-xl p-5 border border-slate-700/50 grid grid-cols-2 gap-y-4 gap-x-6">
                      <div className="flex justify-between items-center">
                          <span className="text-slate-400 text-sm">채널 개설일:</span>
                          <span className="font-mono text-white">{formatDate(channel.publishedAt || '')}</span>
                      </div>
                      <div className="flex justify-between items-center">
                          <span className="text-slate-400 text-sm">최초 업로드:</span>
                          <span className="font-mono text-white">{channelMetrics ? formatDate(channelMetrics.firstUpload) : '-'}</span>
                      </div>
                      <div className="flex justify-between items-center">
                          <span className="text-slate-400 text-sm flex items-center gap-1"><Clock size={14}/> 평균 업로드 주기:</span>
                          <span className="font-mono text-white">{channelMetrics ? formatDurationKR(channelMetrics.avgCycle) : '-'}</span>
                      </div>
                      <div className="flex justify-between items-center">
                          <span className="text-slate-400 text-sm flex items-center gap-1"><Clock size={14}/> 최근 업로드 주기:</span>
                          <span className="font-mono text-white">{channelMetrics ? formatDurationKR(channelMetrics.recentCycle) : '-'}</span>
                      </div>
                  </div>
              </div>
          </div>

          {/* Charts Section */}
          <div className="bg-slate-800 rounded-2xl border border-slate-700 overflow-hidden shadow-lg">
              {/* Chart Tabs */}
              <div className="flex border-b border-slate-700 bg-slate-900/50 overflow-x-auto">
                  {[
                      { id: 'popularity', label: '인기 점수', icon: <TrendingUp size={16}/>, color: 'text-red-500' },
                      { id: 'views', label: '조회수', icon: <Eye size={16}/>, color: 'text-blue-400' },
                      { id: 'likes', label: '좋아요', icon: <ThumbsUp size={16}/>, color: 'text-pink-400' },
                      { id: 'comments', label: '댓글', icon: <MessageCircle size={16}/>, color: 'text-green-400' },
                      { id: 'timeline', label: '타임라인', icon: <Calendar size={16}/>, color: 'text-purple-400' },
                      { id: 'format', label: '콘텐츠 포맷', icon: <ListFilter size={16}/>, color: 'text-yellow-400' },
                  ].map(tab => (
                      <button 
                        key={tab.id}
                        onClick={() => setActiveChartTab(tab.id as ChartTab)}
                        className={`flex items-center gap-2 px-6 py-4 text-sm font-bold border-b-2 transition-all whitespace-nowrap
                            ${activeChartTab === tab.id ? `${tab.color} border-current bg-slate-800` : 'text-slate-500 border-transparent hover:text-slate-300'}`}
                      >
                          {tab.icon} {tab.label}
                      </button>
                  ))}
              </div>

              {/* Chart Content */}
              <div className="p-6 min-h-[350px]">
                  <h3 className="text-lg font-bold text-white mb-6">
                     {activeChartTab === 'popularity' && '인기 점수 분포 (Top 20)'}
                     {activeChartTab === 'views' && '영상별 조회수 추이'}
                     {activeChartTab === 'likes' && '영상별 좋아요 수'}
                     {activeChartTab === 'comments' && '영상별 댓글 수'}
                     {activeChartTab === 'timeline' && '업로드 타임라인 및 조회수'}
                     {activeChartTab === 'format' && '쇼츠 vs 일반 영상 비율'}
                  </h3>
                  
                  {activeChartTab === 'popularity' && <PopularityScoreChart popularityData={chartData} />}
                  {activeChartTab === 'views' && <ViewsChart videos={videos} />}
                  {activeChartTab === 'timeline' && <ViewsChart videos={videos} />}
                  {activeChartTab === 'likes' && <EngagementChart videos={videos} />}
                  {activeChartTab === 'comments' && <EngagementChart videos={videos} />}
                  {activeChartTab === 'format' && <VideoFormatChart videos={videos} />}
              </div>
          </div>

          {/* Video List Cards */}
          <div className="space-y-4">
              <div className="flex flex-col md:flex-row justify-between items-center gap-4 bg-slate-800 p-4 rounded-xl border border-slate-700">
                  <h3 className="font-bold text-lg flex items-center gap-2">
                      <Video size={20} className="text-red-500"/> 분석 영상 리스트 <span className="text-sm text-slate-500 font-normal">({displayVideos.length}개)</span>
                  </h3>
                  <div className="flex gap-2 items-center flex-wrap justify-end">
                      <div className="flex items-center bg-slate-900 border border-slate-600 rounded-lg p-1 mr-2">
                          <button 
                              onClick={() => setFilterOption('all')}
                              className={`px-3 py-1.5 rounded text-xs font-bold transition-all ${filterOption === 'all' ? 'bg-slate-700 text-white' : 'text-slate-400 hover:text-white'}`}
                          >전체</button>
                          <button 
                              onClick={() => setFilterOption('video')}
                              className={`px-3 py-1.5 rounded text-xs font-bold transition-all ${filterOption === 'video' ? 'bg-slate-700 text-white' : 'text-slate-400 hover:text-white'}`}
                          >일반</button>
                          <button 
                              onClick={() => setFilterOption('shorts')}
                              className={`px-3 py-1.5 rounded text-xs font-bold transition-all ${filterOption === 'shorts' ? 'bg-slate-700 text-white' : 'text-slate-400 hover:text-white'}`}
                          >쇼츠</button>
                      </div>

                      {/* New Display Count Controls */}
                      <div className="flex bg-slate-900 border border-slate-600 rounded-lg p-1 mr-2">
                          {[10, 30, 50].map(num => (
                              <button
                                  key={num}
                                  onClick={() => setDisplayCount(num)}
                                  className={`px-3 py-1.5 rounded text-xs font-bold transition-all ${displayCount === num ? 'bg-slate-700 text-white' : 'text-slate-400 hover:text-white'}`}
                              >
                                  {num}개
                              </button>
                          ))}
                      </div>

                      <select 
                        value={sortOption}
                        onChange={(e) => setSortOption(e.target.value as SortOption)}
                        className="bg-slate-900 border border-slate-600 rounded-lg px-3 py-2 text-sm text-white focus:ring-2 focus:ring-red-500 outline-none"
                      >
                          <option value="popularity">🔥 인기 점수순</option>
                          <option value="views">👁️ 조회수순</option>
                          <option value="date_desc">📅 최신순</option>
                          <option value="date_asc">📅 오래된순</option>
                      </select>
                      <button onClick={() => downloadCSV(processedVideos, `${channel.title}_analysis`)} className="bg-slate-700 hover:bg-slate-600 text-white px-3 py-2 rounded-lg text-sm flex items-center gap-2">
                          <Download size={14} /> CSV 저장
                      </button>
                  </div>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                  {displayVideos.map(video => (
                      <div key={video.id} className="bg-slate-800 rounded-xl border border-slate-700 overflow-hidden hover:border-red-500/50 transition-all group shadow-md hover:shadow-xl flex flex-col">
                          <div className="relative">
                              <img src={video.thumbnail} alt={video.title} className="w-full h-40 object-cover" />
                              <div className="absolute top-2 right-2 bg-black/70 text-white text-xs px-2 py-1 rounded flex items-center gap-1 backdrop-blur-sm">
                                  {video.popularityScore >= 80 ? '🔥' : video.popularityScore >= 50 ? '👍' : ''} {video.popularityScore}점
                              </div>
                              <div className="absolute bottom-2 right-2 bg-black/80 text-white text-[10px] px-1.5 py-0.5 rounded font-mono">
                                  {video.duration.replace('PT','').replace('H',':').replace('M',':').replace('S','')}
                              </div>
                          </div>
                          
                          <div className="p-4 flex-1 flex flex-col">
                              <h4 className="font-bold text-slate-100 text-sm line-clamp-2 mb-2 h-10 leading-snug group-hover:text-red-400 transition-colors">
                                  <a href={`https://www.youtube.com/watch?v=${video.id}`} target="_blank" rel="noreferrer">
                                      {video.title}
                                  </a>
                              </h4>

                              {/* Channel Link */}
                              <div className="flex items-center gap-2 mb-3 text-xs text-slate-400">
                                   <a href={`https://www.youtube.com/channel/${video.channelId}`} target="_blank" rel="noreferrer" className="hover:text-white flex items-center gap-1">
                                       <div className="w-4 h-4 rounded-full bg-slate-600 flex items-center justify-center text-[8px] text-white font-bold shrink-0">
                                            {video.channelTitle ? video.channelTitle.charAt(0) : 'C'}
                                       </div>
                                       <span className="truncate">{video.channelTitle}</span>
                                       <ExternalLink size={10} />
                                   </a>
                              </div>
                              
                              <div className="grid grid-cols-3 gap-2 mb-3 text-xs text-slate-400 bg-slate-900/50 p-2 rounded-lg">
                                  <div className="text-center">
                                      <div className="flex justify-center mb-1"><Eye size={12}/></div>
                                      <div className="font-bold text-slate-200">{formatNumber(video.viewCount)}</div>
                                  </div>
                                  <div className="text-center border-l border-slate-700">
                                      <div className="flex justify-center mb-1"><ThumbsUp size={12}/></div>
                                      <div className="font-bold text-slate-200">{formatNumber(video.likeCount)}</div>
                                  </div>
                                  <div className="text-center border-l border-slate-700">
                                      <div className="flex justify-center mb-1"><MessageCircle size={12}/></div>
                                      <div className="font-bold text-slate-200">{formatNumber(video.commentCount)}</div>
                                  </div>
                              </div>

                              <div className="text-xs text-slate-500 mb-3 flex justify-between items-center">
                                  <span>{formatDate(video.publishedAt)}</span>
                                  <span className={`px-2 py-0.5 rounded-full text-[10px] ${parseDuration(video.duration) < 180 ? 'bg-purple-900/30 text-purple-400' : 'bg-slate-700 text-slate-300'}`}>
                                      {parseDuration(video.duration) < 180 ? 'Shorts' : 'Video'}
                                  </span>
                              </div>
                              
                              <div className="mt-auto">
                                  {videoSummaries[video.id] ? (
                                      <div className="text-xs text-slate-300 bg-slate-700/50 p-3 rounded-lg border border-slate-600 animate-fade-in whitespace-pre-wrap">
                                          <div className="font-bold text-purple-300 mb-1 flex items-center gap-1"><Sparkles size={10}/> AI 분석 요약</div>
                                          {videoSummaries[video.id]}
                                      </div>
                                  ) : (
                                      <button 
                                        onClick={() => handleSummarizeVideo(video)}
                                        disabled={loadingSummaries[video.id]}
                                        className="w-full text-xs py-2 bg-slate-700 hover:bg-slate-600 rounded-lg text-slate-300 flex items-center justify-center gap-1 transition-colors disabled:opacity-50"
                                      >
                                          {loadingSummaries[video.id] ? (
                                              <>
                                                  <div className="w-3 h-3 border-2 border-slate-400 border-t-transparent rounded-full animate-spin"></div>
                                                  분석 중...
                                              </>
                                          ) : (
                                              <>
                                                  <Brain size={12} /> AI 영상 요약
                                              </>
                                          )}
                                      </button>
                                  )}
                              </div>
                          </div>
                      </div>
                  ))}
              </div>
          </div>

          {/* AI Analysis Report */}
          <div className="bg-slate-800 rounded-2xl border border-slate-700 relative overflow-hidden flex flex-col min-h-[600px] mt-8 shadow-xl">
            <div className="p-6 border-b border-slate-700 flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-slate-900/50">
                 <div>
                     <h3 className="text-xl font-bold flex items-center gap-2 text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-purple-400">
                        <Brain className="text-blue-400" /> TubeMaster AI 컨설팅 리포트
                    </h3>
                    <p className="text-xs text-slate-400 mt-1">AI가 데이터를 분석하여 성공 전략을 제안합니다.</p>
                 </div>
                <div className="flex gap-2">
                    <button onClick={() => {if(report) {navigator.clipboard.writeText(JSON.stringify(report,null,2)); alert('리포트 전체가 복사되었습니다.')}}} disabled={!report} className="px-3 py-2 bg-slate-700 hover:bg-slate-600 rounded-lg text-sm transition-colors flex items-center gap-2 disabled:opacity-50">
                        <Copy size={14} /> 전체 복사
                    </button>
                    <button onClick={handleDownloadFullText} disabled={!report} className="px-3 py-2 bg-slate-700 hover:bg-slate-600 rounded-lg text-sm transition-colors flex items-center gap-2 disabled:opacity-50">
                        <FileText size={14} /> TXT 다운로드
                    </button>
                    <button onClick={() => downloadJSON(report, `report_${channel.title}`)} disabled={!report} className="px-3 py-2 bg-slate-700 hover:bg-slate-600 rounded-lg text-sm transition-colors flex items-center gap-2 disabled:opacity-50">
                        <Download size={14} /> JSON 다운로드
                    </button>
                </div>
            </div>

            <div className="flex border-b border-slate-700 bg-slate-800/50 overflow-x-auto">
                {['overview', 'growth', 'diagnosis', 'strategy'].map((tab) => (
                    <button 
                      key={tab}
                      onClick={() => setActiveReportTab(tab as ReportTab)}
                      className={`flex-1 py-4 text-sm font-bold border-b-2 transition-colors whitespace-nowrap px-6
                          ${activeReportTab === tab ? 'border-red-500 text-white bg-slate-800' : 'border-transparent text-slate-400 hover:text-slate-200'}`}
                    >
                      {tab === 'overview' && '종합 요약'}
                      {tab === 'growth' && '성장 과정 분석'}
                      {tab === 'diagnosis' && '채널 진단 & 솔루션'}
                      {tab === 'strategy' && 'AI 경쟁 전략 (로드맵)'}
                    </button>
                ))}
            </div>

            <div className="p-6 flex-1 bg-slate-800">
                {analyzing ? (
                    <div className="flex flex-col items-center justify-center py-20 space-y-4">
                        <div className="w-16 h-16 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
                        <div className="text-center">
                            <h4 className="text-lg font-bold text-white mb-1">AI가 채널을 심층 분석 중입니다...</h4>
                            <p className="text-slate-400 text-sm">영상 {videos.length}개의 데이터를 기반으로 전략을 수립하고 있습니다.</p>
                        </div>
                    </div>
                ) : report ? (
                    renderReportContent()
                ) : (
                    <div className="text-center text-slate-500 py-20">
                        <Brain size={48} className="mx-auto mb-4 opacity-20" />
                        <p>분석할 채널을 검색하면 AI 전략 리포트가 생성됩니다.</p>
                    </div>
                )}
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default ChannelAnalysis;
