
import React, { useState, useEffect } from 'react';
import { LayoutDashboard, Key, BarChart2, Search, Youtube } from 'lucide-react';
import ApiKeyModal from './components/ApiKeyModal';
import ChannelAnalysis from './views/ChannelAnalysis';
import KeywordAnalysis from './views/KeywordAnalysis';
import OpportunityFinder from './views/OpportunityFinder';
import { AppTab } from './types';
import { decryptKey } from './utils';

// Custom YouTube Logo Component for correct branding colors
const YoutubeLogo = ({ size = 24 }: { size?: number }) => (
  <svg viewBox="0 0 24 24" width={size} height={size} className="shrink-0">
    <path fill="#FF0000" d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814z" />
    <path fill="#FFFFFF" d="M9.545 15.568V8.432L15.818 12l-6.273 3.568z" />
  </svg>
);

const App: React.FC = () => {
  const [activeTab, setActiveTab] = useState<AppTab>(AppTab.CHANNEL_ANALYSIS);
  const [isKeyModalOpen, setIsKeyModalOpen] = useState(false);
  const [apiKey, setApiKey] = useState('');
  
  // State to handle cross-tab navigation (Opportunity Finder -> Channel Analysis)
  const [autoSearchChannel, setAutoSearchChannel] = useState<string | null>(null);

  useEffect(() => {
    // Check for stored key on mount
    const stored = localStorage.getItem('yt_api_key');
    if (stored) {
      setApiKey(decryptKey(stored));
    } else {
      setIsKeyModalOpen(true);
    }
  }, []);

  const handleNavigateToAnalysis = (channelName: string) => {
    setAutoSearchChannel(channelName);
    setActiveTab(AppTab.CHANNEL_ANALYSIS);
  };

  return (
    <div className="min-h-screen bg-slate-900 text-slate-100 font-sans selection:bg-red-500 selection:text-white">
      {/* Sidebar / Navigation */}
      <nav className="fixed top-0 left-0 h-full w-64 bg-slate-800 border-r border-slate-700 hidden md:flex flex-col z-20">
        <div className="p-6 border-b border-slate-700">
          <h1 className="text-2xl font-bold flex items-center gap-2 text-white tracking-tight">
            <YoutubeLogo size={32} />
            Tube<span className="text-red-500">Strategy</span>
          </h1>
          <p className="text-xs text-slate-400 mt-2 ml-1">AI 기반 유튜브 컨설팅 도구</p>
        </div>

        <div className="flex-1 py-6 space-y-2 px-3">
          <button 
            onClick={() => setActiveTab(AppTab.CHANNEL_ANALYSIS)}
            className={`w-full text-left px-4 py-3 rounded-lg flex items-center gap-3 transition-all ${
              activeTab === AppTab.CHANNEL_ANALYSIS 
              ? 'bg-red-600 text-white shadow-lg shadow-red-600/20' 
              : 'text-slate-400 hover:bg-slate-700 hover:text-white'
            }`}
          >
            <LayoutDashboard size={20} />
            <span className="font-medium">채널 심층 분석</span>
          </button>
          
          <button 
            onClick={() => setActiveTab(AppTab.KEYWORD_ANALYSIS)}
            className={`w-full text-left px-4 py-3 rounded-lg flex items-center gap-3 transition-all ${
              activeTab === AppTab.KEYWORD_ANALYSIS 
              ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/20' 
              : 'text-slate-400 hover:bg-slate-700 hover:text-white'
            }`}
          >
            <BarChart2 size={20} />
            <span className="font-medium">키워드/트렌드 분석</span>
          </button>

          <button 
            onClick={() => setActiveTab(AppTab.OPPORTUNITY_FINDER)}
            className={`w-full text-left px-4 py-3 rounded-lg flex items-center gap-3 transition-all ${
              activeTab === AppTab.OPPORTUNITY_FINDER 
              ? 'bg-purple-600 text-white shadow-lg shadow-purple-600/20' 
              : 'text-slate-400 hover:bg-slate-700 hover:text-white'
            }`}
          >
            <Search size={20} />
            <span className="font-medium">공략 채널 찾기</span>
          </button>
        </div>

        <div className="p-4 border-t border-slate-700">
          <button 
            onClick={() => setIsKeyModalOpen(true)}
            className="w-full bg-slate-700 hover:bg-slate-600 text-slate-300 py-2 px-4 rounded-lg text-sm flex items-center justify-center gap-2 transition-colors"
          >
            <Key size={14} />
            API 키 관리
          </button>
        </div>
      </nav>

      {/* Mobile Header */}
      <div className="md:hidden bg-slate-800 border-b border-slate-700 p-4 flex justify-between items-center sticky top-0 z-30">
        <h1 className="text-xl font-bold flex items-center gap-2">
            <YoutubeLogo size={28} /> TubeStrategy
        </h1>
        <button onClick={() => setIsKeyModalOpen(true)} className="p-2 bg-slate-700 rounded text-slate-300">
            <Key size={18} />
        </button>
      </div>

      {/* Main Content */}
      <main className="md:pl-64 p-4 md:p-8 min-h-screen">
        <div className="max-w-7xl mx-auto">
            {/* Mobile Nav Tabs */}
            <div className="md:hidden flex gap-2 mb-6 overflow-x-auto pb-2">
                <button 
                    onClick={() => setActiveTab(AppTab.CHANNEL_ANALYSIS)}
                    className={`whitespace-nowrap px-4 py-2 rounded-full text-sm font-bold ${activeTab === AppTab.CHANNEL_ANALYSIS ? 'bg-red-600 text-white' : 'bg-slate-800 text-slate-400'}`}
                >채널 분석</button>
                <button 
                    onClick={() => setActiveTab(AppTab.KEYWORD_ANALYSIS)}
                    className={`whitespace-nowrap px-4 py-2 rounded-full text-sm font-bold ${activeTab === AppTab.KEYWORD_ANALYSIS ? 'bg-blue-600 text-white' : 'bg-slate-800 text-slate-400'}`}
                >키워드 분석</button>
                <button 
                    onClick={() => setActiveTab(AppTab.OPPORTUNITY_FINDER)}
                    className={`whitespace-nowrap px-4 py-2 rounded-full text-sm font-bold ${activeTab === AppTab.OPPORTUNITY_FINDER ? 'bg-purple-600 text-white' : 'bg-slate-800 text-slate-400'}`}
                >공략 채널</button>
            </div>

            {/* View Render */}
            <div className="animate-fade-in">
                {activeTab === AppTab.CHANNEL_ANALYSIS && (
                  <ChannelAnalysis 
                    apiKey={apiKey} 
                    initialQuery={autoSearchChannel} 
                    onSearchComplete={() => setAutoSearchChannel(null)} 
                  />
                )}
                {activeTab === AppTab.KEYWORD_ANALYSIS && (
                  <KeywordAnalysis 
                    apiKey={apiKey} 
                    onAnalyzeChannel={handleNavigateToAnalysis}
                  />
                )}
                {activeTab === AppTab.OPPORTUNITY_FINDER && (
                  <OpportunityFinder 
                    apiKey={apiKey} 
                    onAnalyzeChannel={handleNavigateToAnalysis} 
                  />
                )}
            </div>
        </div>
      </main>

      <ApiKeyModal 
        isOpen={isKeyModalOpen} 
        onClose={() => setIsKeyModalOpen(false)} 
        onKeySet={setApiKey} 
      />
    </div>
  );
};

export default App;
