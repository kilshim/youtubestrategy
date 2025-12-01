
import React, { useState, useEffect } from 'react';
import { Telescope, TrendingUp, Star, AlertTriangle, ExternalLink, BarChart2, Anchor, Zap, Search, Brain, Sparkles, Download } from 'lucide-react';
import { OpportunityReport, YouTubeCategory, RegionCode, YouTubeVideo, RisingChannelResult, RisingPeriod, VideoTypeFilter } from '../types';
import { findRisingChannels, getVideoCategories } from '../services/youtubeService';
import { analyzeTopicOpportunity, summarizeVideo } from '../services/geminiService';
import { formatNumber, formatDate, downloadText, formatOpportunityReportToText } from '../utils';

interface Props {
  apiKey: string;
  onAnalyzeChannel: (channelName: string) => void;
}

const OpportunityFinder: React.FC<Props> = ({ apiKey, onAnalyzeChannel }) => {
  const [topic, setTopic] = useState('');
  
  // New Filters
  const [categories, setCategories] = useState<YouTubeCategory[]>([]);
  const [selectedCategory, setSelectedCategory] = useState('');
  const [selectedPeriod, setSelectedPeriod] = useState<RisingPeriod>('1y');
  const [selectedRegion, setSelectedRegion] = useState<RegionCode>('KR');
  const [videoType, setVideoType] = useState<VideoTypeFilter>('all');

  const [loading, setLoading] = useState(false);
  const [channels, setChannels] = useState<RisingChannelResult[]>([]);
  const [report, setReport] = useState<OpportunityReport | null>(null);
  const [hasSearched, setHasSearched] = useState(false);

  // Video Summaries
  const [videoSummaries, setVideoSummaries] = useState<Record<string, string>>({});
  const [loadingSummaries, setLoadingSummaries] = useState<Record<string, boolean>>({});

  // Fetch Categories
  useEffect(() => {
    const fetchCategories = async () => {
        if (!apiKey) return;
        try {
            const cats = await getVideoCategories(apiKey, selectedRegion === 'Global' ? 'US' : selectedRegion);
            setCategories(cats);
        } catch (e) {
            console.error("Failed to fetch categories", e);
        }
    };
    fetchCategories();
  }, [apiKey, selectedRegion]);

  const handleSearch = async (e: React.FormEvent | React.KeyboardEvent) => {
    e.preventDefault();
    if (!topic.trim() || !apiKey) return;

    setLoading(true);
    setChannels([]);
    setReport(null);
    setHasSearched(true);
    setVideoSummaries({});

    try {
      // 1. Find Rising Channels with Filters (Data collection)
      const results = await findRisingChannels(
          apiKey, 
          topic, 
          selectedCategory, 
          selectedPeriod, 
          selectedRegion,
          videoType
      );
      setChannels(results);

      // 2. AI Market Opportunity Analysis
      // Map RisingChannelResult to a structure compatible with the analyzer (needs viewCount, channelTitle)
      const videosForAnalysis = results.map(r => r.topVideo);
      
      // Only run analysis if we have enough data
      if (videosForAnalysis.length > 0) {
          const analysis = await analyzeTopicOpportunity(topic, videosForAnalysis);
          setReport(analysis);
      }

    } catch (error) {
      console.error(error);
      alert('검색 및 분석 중 오류가 발생했습니다.');
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

  const handleDownload = () => {
      const text = formatOpportunityReportToText(report, channels, topic);
      downloadText(text, `${topic}_opportunity_report`);
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header & Search */}
      <div className="bg-slate-800 p-8 rounded-2xl shadow-lg border border-slate-700 text-center relative overflow-hidden">
        <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-purple-500 via-pink-500 to-red-500"></div>
        <Telescope size={48} className="mx-auto text-purple-400 mb-4" />
        <h2 className="text-2xl font-bold mb-2">공략 채널 & 빈집 토픽 찾기</h2>
        <p className="text-slate-400 mb-6 max-w-2xl mx-auto">
            급성장하는 떡상 채널을 발굴하여 성공 패턴을 벤치마킹하세요.<br/>
            AI가 키워드 시장이 레드오션인지 블루오션인지 분석해드립니다.
        </p>
        
        <div className="max-w-4xl mx-auto space-y-4">
          <div className="flex flex-wrap gap-2 justify-center">
             <select 
                value={selectedRegion}
                onChange={(e) => setSelectedRegion(e.target.value as RegionCode)}
                className="bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-white focus:ring-2 focus:ring-purple-500 outline-none text-sm"
             >
                <option value="Global">전세계</option>
                <option value="KR">한국</option>
                <option value="US">미국</option>
                <option value="JP">일본</option>
             </select>

             <select 
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value)}
                className="bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-white focus:ring-2 focus:ring-purple-500 outline-none text-sm w-40 truncate"
             >
                <option value="">모든 카테고리</option>
                {categories.map(cat => (
                    <option key={cat.id} value={cat.id}>{cat.title}</option>
                ))}
             </select>

             <select 
                value={selectedPeriod}
                onChange={(e) => setSelectedPeriod(e.target.value as RisingPeriod)}
                className="bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-white focus:ring-2 focus:ring-purple-500 outline-none text-sm"
             >
                <option value="1y">1년 내 (기본)</option>
                <option value="6m">6개월 내</option>
                <option value="3m">3개월 내</option>
                <option value="all">전체 기간</option>
             </select>

             <div className="flex bg-slate-900 rounded-lg p-1 border border-slate-700">
                {[
                    { val: 'all', label: '전체' }, 
                    { val: 'video', label: '일반 영상' }, 
                    { val: 'shorts', label: '쇼츠' }
                ].map(opt => (
                    <button 
                        key={opt.val}
                        onClick={() => setVideoType(opt.val as VideoTypeFilter)}
                        className={`px-3 py-1 text-xs font-bold rounded transition-colors ${videoType === opt.val ? 'bg-purple-600 text-white' : 'text-slate-400 hover:text-white'}`}
                    >
                        {opt.label}
                    </button>
                ))}
            </div>
          </div>

          <div className="flex gap-2">
            <input 
                type="text" 
                value={topic}
                onChange={(e) => setTopic(e.target.value)}
                onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                        handleSearch(e);
                    }
                }}
                placeholder="관심 주제 입력 (예: 정리정돈, 일본여행, 소식좌)" 
                className="flex-1 bg-slate-900 border border-slate-700 rounded-lg px-4 py-3 text-white focus:ring-2 focus:ring-purple-500 outline-none"
            />
          </div>
          
          <div className="flex gap-4 justify-center pt-2">
             <button 
                onClick={handleSearch}
                disabled={loading}
                className="w-full max-w-sm bg-purple-600 hover:bg-purple-700 text-white px-6 py-3 rounded-lg font-bold transition-colors disabled:opacity-50 shadow-lg shadow-purple-600/30 flex items-center justify-center gap-2"
            >
                {loading ? <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div> : <Search size={20} />} 찾기 (분석 및 채널 발굴)
            </button>
          </div>
        </div>
      </div>

      {loading && (
          <div className="text-center py-12">
              <div className="animate-spin w-12 h-12 border-4 border-purple-500 border-t-transparent rounded-full mx-auto mb-4"></div>
              <p className="text-slate-300 font-medium text-lg">데이터를 분석하여 숨겨진 보석을 찾는 중입니다...</p>
              <p className="text-slate-500 text-sm mt-2">채널 발굴 및 시장 AI 분석이 진행됩니다.</p>
          </div>
      )}

      {!loading && (report || channels.length > 0 || hasSearched) && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* AI Analysis Card */}
              {report && (
                <div className="bg-slate-800 rounded-xl border border-slate-700 p-6 flex flex-col h-full relative overflow-hidden lg:col-span-1">
                    <div className={`absolute top-0 right-0 p-4 rounded-bl-2xl text-white font-bold text-lg shadow-lg
                        ${report.type === 'BLUE_OCEAN' ? 'bg-blue-500' : 'bg-red-500'}`}>
                        {report.type === 'BLUE_OCEAN' ? '🌊 BLUE OCEAN' : '🔥 RED OCEAN'}
                    </div>
                    
                    <div className="mb-6 mt-2">
                        <div className="text-sm text-slate-400 font-bold tracking-wider uppercase mb-1">Market Opportunity Score</div>
                        <div className="flex items-end gap-3">
                            <span className={`text-5xl font-black ${report.score >= 70 ? 'text-blue-400' : report.score >= 40 ? 'text-yellow-400' : 'text-red-400'}`}>
                                {report.score}
                            </span>
                            <span className="text-slate-500 mb-2">/ 100</span>
                        </div>
                        <div className="w-full h-2 bg-slate-700 rounded-full mt-3 overflow-hidden">
                            <div className={`h-full rounded-full ${report.score >= 70 ? 'bg-blue-500' : 'bg-red-500'}`} style={{ width: `${report.score}%` }}></div>
                        </div>
                    </div>

                    <div className="space-y-4 flex-1">
                        <div>
                            <h4 className="font-bold text-white mb-2 flex items-center gap-2"><Zap size={16} className="text-yellow-400"/> 요약 분석</h4>
                            <p className="text-slate-300 text-sm leading-relaxed">{report.summary}</p>
                        </div>
                        <div>
                            <h4 className="font-bold text-white mb-2">💡 판단 근거</h4>
                            <p className="text-slate-400 text-sm leading-relaxed">{report.reason}</p>
                        </div>
                        
                        {/* 3-Point Analysis */}
                        <div className="grid gap-2">
                            <div className="bg-slate-900/50 p-3 rounded-lg border border-slate-700/50">
                                <h5 className="font-bold text-slate-400 text-xs mb-1">📊 조회수 분포</h5>
                                <p className="text-slate-300 text-xs">{report.viewDistribution}</p>
                            </div>
                            <div className="bg-slate-900/50 p-3 rounded-lg border border-slate-700/50">
                                <h5 className="font-bold text-slate-400 text-xs mb-1">🎯 채널 집중도</h5>
                                <p className="text-slate-300 text-xs">{report.channelConcentration}</p>
                            </div>
                            <div className="bg-slate-900/50 p-3 rounded-lg border border-slate-700/50">
                                <h5 className="font-bold text-slate-400 text-xs mb-1">⚡ 채널 활성도</h5>
                                <p className="text-slate-300 text-xs">{report.channelActivity}</p>
                            </div>
                        </div>

                        <div className="bg-slate-900/50 p-4 rounded-lg border border-slate-700/50">
                            <h4 className="font-bold text-purple-300 mb-2 text-sm">🚀 진입 전략</h4>
                            <p className="text-slate-300 text-xs leading-relaxed">{report.strategy}</p>
                        </div>
                    </div>
                    
                    <div className="mt-6 pt-4 border-t border-slate-700">
                        <div className="flex flex-wrap gap-2">
                            {report.keywords.map((k, i) => (
                                <span key={i} className="px-2 py-1 bg-slate-700 text-slate-300 text-xs rounded-md">#{k}</span>
                            ))}
                        </div>
                    </div>
                </div>
              )}

              {/* Channel List */}
              <div className={`${report ? 'lg:col-span-2' : 'lg:col-span-3'} space-y-4`}>
                  <div className="flex justify-between items-center mb-2">
                      <div className="flex items-center gap-2">
                          <h3 className="text-xl font-bold flex items-center gap-2">
                              <Star className="text-yellow-400 fill-current" /> 라이징 스타 채널
                          </h3>
                          <span className="text-sm text-slate-400">
                              {selectedPeriod === 'all' ? '전체 기간' : `${selectedPeriod} 내 개설`} ({channels.length}개)
                          </span>
                      </div>
                      <button 
                         onClick={handleDownload}
                         disabled={!report && channels.length === 0}
                         className="flex items-center gap-2 bg-slate-700 hover:bg-slate-600 text-slate-200 px-4 py-2 rounded-lg text-sm font-bold transition-colors disabled:opacity-50"
                      >
                         <Download size={16} /> TXT 다운로드
                      </button>
                  </div>

                  {channels.length === 0 ? (
                      <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-8 text-center">
                          <AlertTriangle className="mx-auto text-slate-500 mb-3" size={32} />
                          <p className="text-slate-400">조건에 맞는 급성장 채널을 찾지 못했습니다.</p>
                          <p className="text-slate-500 text-sm mt-1">기간을 늘리거나 키워드를 변경하여 다시 시도해보세요.</p>
                      </div>
                  ) : (
                      <div className={`grid grid-cols-1 ${report ? 'md:grid-cols-2' : 'md:grid-cols-2 lg:grid-cols-3'} gap-4`}>
                          {channels.map((item, idx) => (
                              <div key={idx} className="bg-slate-800 rounded-xl border border-slate-700 p-5 hover:border-purple-500 transition-all group relative flex flex-col">
                                  <div className="absolute top-3 right-3 bg-slate-900 text-xs text-slate-400 px-2 py-1 rounded">
                                      개설: {formatDate(item.details.publishedAt || '')}
                                  </div>
                                  
                                  <div className="flex items-center gap-4 mb-4 mt-2">
                                      <img src={item.details.thumbnail} alt="" className="w-14 h-14 rounded-full border-2 border-slate-600 group-hover:border-purple-500 transition-colors" />
                                      <div className="min-w-0">
                                          <h4 className="font-bold text-lg text-white truncate">{item.details.title}</h4>
                                          <div className="text-xs text-slate-400">구독자 {formatNumber(item.details.subscriberCount)}명</div>
                                      </div>
                                  </div>

                                  <div className="bg-slate-900/60 rounded-lg p-3 mb-4">
                                      <div className="text-xs text-slate-500 mb-1 flex items-center gap-1"><TrendingUp size={10}/> 터진 영상</div>
                                      <a href={`https://www.youtube.com/watch?v=${item.topVideo.id}`} target="_blank" rel="noreferrer" className="text-sm font-medium text-purple-200 line-clamp-2 leading-tight hover:underline">
                                          "{item.topVideo.title}"
                                      </a>
                                      <div className="mt-1 text-xs text-slate-500 text-right">
                                         {formatNumber(item.topVideo.viewCount)}회
                                      </div>
                                  </div>
                                  
                                  <div className="mt-auto space-y-3">
                                      {videoSummaries[item.topVideo.id] ? (
                                            <div className="text-xs text-slate-300 bg-slate-700/50 p-2 rounded-lg border border-slate-600 animate-fade-in whitespace-pre-wrap max-h-32 overflow-y-auto custom-scrollbar">
                                                <div className="font-bold text-yellow-300 mb-1 flex items-center gap-1"><Sparkles size={10}/> AI 요약</div>
                                                {videoSummaries[item.topVideo.id]}
                                            </div>
                                        ) : (
                                            <button 
                                                onClick={() => handleSummarizeVideo(item.topVideo)}
                                                disabled={loadingSummaries[item.topVideo.id]}
                                                className="w-full text-xs py-1.5 bg-slate-700 hover:bg-slate-600 rounded-lg text-slate-300 flex items-center justify-center gap-1 transition-colors disabled:opacity-50"
                                            >
                                                {loadingSummaries[item.topVideo.id] ? (
                                                    <span className="animate-pulse">분석 중...</span>
                                                ) : (
                                                    <>
                                                        <Brain size={12} /> AI 영상 요약
                                                    </>
                                                )}
                                            </button>
                                        )}

                                      <div className="flex gap-2">
                                          <a 
                                            href={`https://www.youtube.com/channel/${item.details.id}`} 
                                            target="_blank" 
                                            rel="noreferrer"
                                            className="flex-1 bg-slate-700 hover:bg-slate-600 text-slate-200 py-2 rounded-lg text-xs font-bold flex items-center justify-center gap-1 transition-colors"
                                          >
                                              <ExternalLink size={12} /> 바로가기
                                          </a>
                                          <button 
                                            onClick={() => onAnalyzeChannel(item.details.title)}
                                            className="flex-1 bg-purple-600 hover:bg-purple-700 text-white py-2 rounded-lg text-xs font-bold flex items-center justify-center gap-1 transition-colors"
                                          >
                                              <BarChart2 size={12} /> 채널 분석
                                          </button>
                                      </div>
                                  </div>
                              </div>
                          ))}
                      </div>
                  )}
              </div>
          </div>
      )}
    </div>
  );
};

export default OpportunityFinder;
