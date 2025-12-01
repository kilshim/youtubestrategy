
import React, { useState, useMemo, useEffect } from 'react';
import { Search, Globe, Filter, Video, Zap, FileText, Download, Eye, ThumbsUp, MessageCircle, Calendar, Grid, List, BarChart2, ExternalLink, Brain, Sparkles } from 'lucide-react';
import { YouTubeVideo, RegionCode, AnalysisReport, YouTubeCategory, VideoTypeFilter } from '../types';
import { searchVideosByKeyword, getVideoCategories } from '../services/youtubeService';
import { analyzeKeywordMarket, summarizeVideo } from '../services/geminiService';
import { formatNumber, formatDate, parseDuration, downloadCSV, downloadText, formatKeywordReportToText } from '../utils';

interface Props {
  apiKey: string;
  onAnalyzeChannel: (channelName: string) => void;
}

type SortOption = 'popularity' | 'views' | 'date';
type DisplayCount = 10 | 20 | 50;

// Helper to calculate popularity score (0-100)
const calculateVideoScore = (v: YouTubeVideo, maxViews: number, maxLikes: number, maxComments: number) => {
    const viewScore = maxViews ? (v.viewCount / maxViews) * 50 : 0;
    const likeScore = maxLikes ? (v.likeCount / maxLikes) * 30 : 0;
    const commentScore = maxComments ? (v.commentCount / maxComments) * 20 : 0;
    return Math.round(viewScore + likeScore + commentScore);
};

const KeywordAnalysis: React.FC<Props> = ({ apiKey, onAnalyzeChannel }) => {
  const [keyword, setKeyword] = useState('');
  const [region, setRegion] = useState<RegionCode>('KR');
  const [categories, setCategories] = useState<YouTubeCategory[]>([]);
  const [selectedCategoryId, setSelectedCategoryId] = useState<string>('');
  
  // Filters & Sorting
  const [videoType, setVideoType] = useState<VideoTypeFilter>('all');
  const [sortOption, setSortOption] = useState<SortOption>('views');
  const [displayCount, setDisplayCount] = useState<DisplayCount>(50);

  const [loading, setLoading] = useState(false);
  const [videos, setVideos] = useState<YouTubeVideo[]>([]);
  const [report, setReport] = useState<AnalysisReport | null>(null);
  const [analyzing, setAnalyzing] = useState(false);

  // Video Summaries
  const [videoSummaries, setVideoSummaries] = useState<Record<string, string>>({});
  const [loadingSummaries, setLoadingSummaries] = useState<Record<string, boolean>>({});

  // Fetch Categories on mount or region change
  useEffect(() => {
      const fetchCategories = async () => {
          if (!apiKey) return;
          try {
              const cats = await getVideoCategories(apiKey, region === 'Global' ? 'US' : region);
              setCategories(cats);
          } catch (e) {
              console.error("Failed to fetch categories", e);
          }
      };
      fetchCategories();
  }, [apiKey, region]);

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!keyword.trim() || !apiKey) return;

    setLoading(true);
    setVideos([]);
    setReport(null);
    setVideoSummaries({});

    try {
      // Fetch max 50 mixed results initially, filtering is done client-side for smoother UX
      // Pass the selectedCategoryId to the service
      const vData = await searchVideosByKeyword(apiKey, keyword, 50, region, false, selectedCategoryId);
      setVideos(vData);

      setAnalyzing(true);
      try {
        const aiReport = await analyzeKeywordMarket(keyword, vData);
        setReport(aiReport);
      } catch (err) {
        console.error(err);
      } finally {
        setAnalyzing(false);
      }

    } catch (error) {
      console.error(error);
      alert('데이터 조회 중 오류가 발생했습니다.');
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

  const handleDownloadReport = () => {
      if (!report) return;
      const text = formatKeywordReportToText(report, keyword);
      downloadText(text, `${keyword}_market_strategy`);
  };

  // Process and Filter Videos
  const processedVideos = useMemo(() => {
      if (!videos.length) return [];

      const maxViews = Math.max(...videos.map(v => v.viewCount));
      const maxLikes = Math.max(...videos.map(v => v.likeCount));
      const maxComments = Math.max(...videos.map(v => v.commentCount));

      // 1. Add Scores
      const withScores = videos.map(v => ({
          ...v,
          popularityScore: calculateVideoScore(v, maxViews, maxLikes, maxComments)
      }));

      // 2. Filter Type
      const filtered = withScores.filter(v => {
          const isShort = parseDuration(v.duration) < 180;
          if (videoType === 'shorts') return isShort;
          if (videoType === 'video') return !isShort;
          return true;
      });

      // 3. Sort
      const sorted = filtered.sort((a, b) => {
          if (sortOption === 'popularity') return b.popularityScore - a.popularityScore;
          if (sortOption === 'date') return new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime();
          return b.viewCount - a.viewCount; // default views
      });

      return sorted;
  }, [videos, videoType, sortOption]);

  const displayVideos = processedVideos.slice(0, displayCount);

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Search Section */}
      <div className="bg-slate-800 p-6 rounded-2xl shadow-lg border border-slate-700">
        <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
            <Globe className="text-blue-500" /> 키워드 및 트렌드 분석
        </h2>
        <form onSubmit={handleSearch} className="flex flex-col gap-4">
          <div className="flex flex-col md:flex-row gap-2">
              <select 
                value={region} 
                onChange={(e) => setRegion(e.target.value as RegionCode)}
                className="bg-slate-900 border border-slate-700 rounded-lg px-3 py-3 text-white focus:ring-2 focus:ring-blue-500 outline-none w-full md:w-32"
              >
                <option value="Global">전세계</option>
                <option value="KR">한국</option>
                <option value="US">미국</option>
                <option value="JP">일본</option>
              </select>
              <select 
                value={selectedCategoryId} 
                onChange={(e) => setSelectedCategoryId(e.target.value)}
                className="bg-slate-900 border border-slate-700 rounded-lg px-3 py-3 text-white focus:ring-2 focus:ring-blue-500 outline-none w-full md:w-48"
              >
                <option value="">모든 카테고리</option>
                {categories.map(cat => (
                    <option key={cat.id} value={cat.id}>{cat.title}</option>
                ))}
              </select>
              <input 
                type="text" 
                value={keyword}
                onChange={(e) => setKeyword(e.target.value)}
                placeholder="키워드/해시태그 입력 (예: 재테크, 먹방)" 
                className="flex-1 bg-slate-900 border border-slate-700 rounded-lg px-4 py-3 text-white focus:ring-2 focus:ring-blue-500 outline-none"
              />
              <button 
                type="submit" 
                disabled={loading}
                className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg font-bold transition-colors disabled:opacity-50 shadow-lg shadow-blue-600/20 whitespace-nowrap"
              >
                {loading ? '검색 중...' : '트렌드 분석'}
              </button>
          </div>
        </form>
      </div>

      {videos.length > 0 && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Left Column: AI Strategy Report */}
              <div className="lg:col-span-1 space-y-6">
                  <div className="bg-slate-800 p-6 rounded-2xl border border-slate-700 shadow-lg h-full flex flex-col">
                      <div className="flex items-center justify-between mb-6 pb-4 border-b border-slate-700">
                          <div className="flex items-center gap-2">
                             <Zap className="text-yellow-400" />
                             <h3 className="text-xl font-bold">AI 시장 공략 전략</h3>
                          </div>
                          {report && (
                            <button 
                                onClick={handleDownloadReport}
                                className="text-slate-400 hover:text-white transition-colors"
                                title="리포트 TXT 다운로드"
                            >
                                <FileText size={20} />
                            </button>
                          )}
                      </div>

                      {analyzing ? (
                         <div className="space-y-4 animate-pulse">
                             <div className="h-4 bg-slate-700 rounded w-full"></div>
                             <div className="h-4 bg-slate-700 rounded w-5/6"></div>
                             <div className="h-32 bg-slate-700 rounded w-full mt-6"></div>
                             <div className="h-32 bg-slate-700 rounded w-full mt-4"></div>
                         </div>
                      ) : report ? (
                          <div className="space-y-6 h-[calc(100vh-350px)] overflow-y-auto pr-2 custom-scrollbar">
                              <div className="bg-gradient-to-br from-slate-900 to-slate-800 p-5 rounded-xl border border-slate-700 shadow-inner">
                                  <h4 className="font-bold text-blue-300 mb-3 text-lg flex items-center gap-2">📊 시장 트렌드 요약</h4>
                                  <p className="text-slate-300 text-base leading-relaxed">{report.summary}</p>
                                  <div className="mt-4 pt-4 border-t border-slate-700/50">
                                     <p className="text-slate-300 text-sm leading-relaxed">{report.marketAnalysis}</p>
                                  </div>
                              </div>

                              <div className="bg-slate-900/50 p-5 rounded-xl border border-green-500/20">
                                  <h4 className="font-bold text-green-400 mb-4 text-base flex items-center gap-2">
                                      <Zap size={18} /> 기회 & 틈새 시장
                                  </h4>
                                  <div className="space-y-4">
                                      <div>
                                          <span className="text-green-500 text-xs font-bold uppercase block mb-1">Opportunities (기회)</span>
                                          <ul className="list-disc list-inside text-sm text-slate-300 space-y-1">
                                              {(report.opportunities || []).map((o, i) => <li key={i}>{o}</li>)}
                                          </ul>
                                      </div>
                                      <div>
                                          <span className="text-red-400 text-xs font-bold uppercase block mb-1">Weaknesses (시장 약점)</span>
                                          <ul className="list-disc list-inside text-sm text-slate-300 space-y-1">
                                              {(report.weaknesses || []).map((w, i) => <li key={i+10}>{w}</li>)}
                                          </ul>
                                      </div>
                                  </div>
                              </div>
                              
                              <div className="bg-blue-900/20 p-5 rounded-xl border border-blue-500/30">
                                  <h4 className="font-bold text-blue-300 mb-4 text-base flex items-center gap-2">
                                      <FileText size={18} /> 필승 전략 (Action Plan)
                                  </h4>
                                  <ul className="space-y-3">
                                      {report.actionPlan.map((p, i) => (
                                          <li key={i} className="flex gap-3 text-sm text-slate-200">
                                              <span className="flex-shrink-0 w-5 h-5 rounded-full bg-blue-600 flex items-center justify-center text-xs font-bold">{i+1}</span>
                                              <span className="leading-relaxed">{p}</span>
                                          </li>
                                      ))}
                                  </ul>
                              </div>
                          </div>
                      ) : null}
                  </div>
              </div>

              {/* Right Column: Video List */}
              <div className="lg:col-span-2 space-y-4">
                  {/* Controls Toolbar */}
                  <div className="bg-slate-800 p-4 rounded-xl border border-slate-700 flex flex-col md:flex-row gap-4 justify-between items-center shadow-lg">
                       <div className="flex items-center gap-4">
                           <h3 className="font-bold text-lg text-white">Top 영상</h3>
                           <div className="flex bg-slate-900 rounded-lg p-1 border border-slate-700">
                               {[
                                   { val: 'all', label: '전체' }, 
                                   { val: 'video', label: '일반' }, 
                                   { val: 'shorts', label: '쇼츠' }
                               ].map(opt => (
                                   <button 
                                       key={opt.val}
                                       onClick={() => setVideoType(opt.val as VideoTypeFilter)}
                                       className={`px-3 py-1 text-xs font-bold rounded transition-colors ${videoType === opt.val ? 'bg-blue-600 text-white' : 'text-slate-400 hover:text-white'}`}
                                   >
                                       {opt.label}
                                   </button>
                               ))}
                           </div>
                       </div>

                       <div className="flex flex-wrap items-center gap-2 justify-end">
                           <select 
                             value={sortOption}
                             onChange={(e) => setSortOption(e.target.value as SortOption)}
                             className="bg-slate-900 border border-slate-600 rounded-lg px-2 py-1.5 text-xs text-white focus:ring-2 focus:ring-blue-500 outline-none"
                           >
                               <option value="views">👁️ 조회수순</option>
                               <option value="popularity">🔥 인기점수순</option>
                               <option value="date">📅 최신순</option>
                           </select>

                           <div className="flex bg-slate-900 rounded-lg border border-slate-700 overflow-hidden">
                               {[10, 20, 50].map(num => (
                                   <button 
                                       key={num}
                                       onClick={() => setDisplayCount(num as DisplayCount)}
                                       className={`px-3 py-1.5 text-xs font-bold border-r border-slate-700 last:border-0 ${displayCount === num ? 'bg-slate-700 text-white' : 'text-slate-400 hover:text-white hover:bg-slate-800'}`}
                                   >
                                       {num}개
                                   </button>
                               ))}
                           </div>

                           <button 
                             onClick={() => downloadCSV(displayVideos, `${keyword}_trend_analysis`)} 
                             className="bg-slate-700 hover:bg-slate-600 text-white p-2 rounded-lg"
                             title="CSV 다운로드"
                           >
                              <Download size={16} />
                           </button>
                       </div>
                  </div>

                  {/* Video Grid */}
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                       {displayVideos.map(video => (
                           <div key={video.id} className="bg-slate-800 rounded-xl border border-slate-700 overflow-hidden hover:border-blue-500/50 transition-all group shadow-md hover:shadow-xl flex flex-col">
                               <div className="relative">
                                   <img src={video.thumbnail} alt={video.title} className="w-full h-40 object-cover" />
                                   <div className="absolute top-2 right-2 bg-black/70 text-white text-[10px] px-2 py-1 rounded flex items-center gap-1 backdrop-blur-sm">
                                      {video.popularityScore >= 80 ? '🔥' : ''} {video.popularityScore}점
                                   </div>
                                   <div className="absolute bottom-2 right-2 bg-black/80 text-white text-[10px] px-1.5 py-0.5 rounded font-mono">
                                       {video.duration.replace('PT','').replace('H',':').replace('M',':').replace('S','')}
                                   </div>
                               </div>
                               
                               <div className="p-4 flex-1 flex flex-col">
                                   <h4 className="font-bold text-slate-100 text-sm line-clamp-2 mb-3 h-10 leading-snug group-hover:text-blue-400 transition-colors">
                                       <a href={`https://www.youtube.com/watch?v=${video.id}`} target="_blank" rel="noreferrer">
                                           {video.title}
                                       </a>
                                   </h4>
                                   
                                   <div className="flex items-center justify-between text-xs text-slate-400 mb-3 bg-slate-900/50 p-2 rounded-lg">
                                       <div className="flex items-center gap-1"><Eye size={12}/> {formatNumber(video.viewCount)}</div>
                                       <div className="flex items-center gap-1"><ThumbsUp size={12}/> {formatNumber(video.likeCount)}</div>
                                   </div>

                                   {/* Channel Info Row */}
                                   <div className="flex justify-between items-center text-xs text-slate-400 mb-3">
                                        <div className="flex items-center gap-1 truncate max-w-[120px]" title={video.channelTitle}>
                                            <div className="w-4 h-4 rounded-full bg-slate-600 flex items-center justify-center text-[8px] text-white font-bold shrink-0">
                                                {video.channelTitle.charAt(0)}
                                            </div>
                                            <span className="truncate">{video.channelTitle}</span>
                                        </div>
                                        <span className="text-slate-500">{formatDate(video.publishedAt)}</span>
                                   </div>

                                   {/* AI Summary Section */}
                                    <div className="mt-auto mb-3">
                                        {videoSummaries[video.id] ? (
                                            <div className="text-xs text-slate-300 bg-slate-700/50 p-2 rounded-lg border border-slate-600 animate-fade-in whitespace-pre-wrap max-h-32 overflow-y-auto custom-scrollbar">
                                                <div className="font-bold text-yellow-300 mb-1 flex items-center gap-1"><Sparkles size={10}/> AI 요약</div>
                                                {videoSummaries[video.id]}
                                            </div>
                                        ) : (
                                            <button 
                                                onClick={() => handleSummarizeVideo(video)}
                                                disabled={loadingSummaries[video.id]}
                                                className="w-full text-xs py-1.5 bg-slate-700 hover:bg-slate-600 rounded-lg text-slate-300 flex items-center justify-center gap-1 transition-colors disabled:opacity-50"
                                            >
                                                {loadingSummaries[video.id] ? (
                                                    <span className="animate-pulse">분석 중...</span>
                                                ) : (
                                                    <>
                                                        <Brain size={12} /> AI 요약 보기
                                                    </>
                                                )}
                                            </button>
                                        )}
                                    </div>
                                   
                                   {/* Action Buttons */}
                                   <div className="grid grid-cols-2 gap-2 border-t border-slate-700 pt-3">
                                       <button 
                                         onClick={() => onAnalyzeChannel(video.channelTitle)}
                                         className="bg-red-600/10 hover:bg-red-600/20 text-red-400 hover:text-red-300 py-2 rounded-lg text-xs font-bold flex items-center justify-center gap-1 transition-colors border border-red-600/20"
                                       >
                                           <BarChart2 size={12} /> 채널 분석
                                       </button>
                                       <a 
                                         href={`https://www.youtube.com/channel/${video.channelId}`} 
                                         target="_blank" 
                                         rel="noreferrer"
                                         className="bg-slate-700 hover:bg-slate-600 text-slate-300 hover:text-white py-2 rounded-lg text-xs font-bold flex items-center justify-center gap-1 transition-colors"
                                       >
                                           <ExternalLink size={12} /> 채널 이동
                                       </a>
                                   </div>
                               </div>
                           </div>
                       ))}
                  </div>
              </div>
          </div>
      )}
    </div>
  );
};

export default KeywordAnalysis;
