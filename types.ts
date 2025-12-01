
export interface YouTubeVideo {
  id: string;
  title: string;
  description: string; // Added for AI summarization
  thumbnail: string;
  publishedAt: string;
  channelId: string;
  channelTitle: string;
  viewCount: number;
  likeCount: number;
  commentCount: number;
  duration: string;
  tags: string[];
  popularityScore?: number; // Added for sorting in frontend
}

export interface YouTubeChannel {
  id: string;
  title: string;
  description: string;
  thumbnail: string;
  subscriberCount: number;
  videoCount: number;
  viewCount: number;
  country?: string;
  publishedAt?: string; // Added for finding new channels
}

export interface GrowthStage {
  period: string;
  summary: string;       // 성과 요약
  strategy: string;      // 전략 분석
  quantitative: string;  // 정량적 성과 분석
  contentDepth: string;  // 콘텐츠 전략 심화 분석
}

export interface AnalysisReport {
  summary: string;
  
  // 1. AI Growth Process Analysis
  growthProcess: {
    early: GrowthStage;
    mid: GrowthStage;
    latest: GrowthStage;
  };

  // 2. AI Channel Diagnosis & Consulting
  diagnosis: {
    content: { problem: string; solution: string };
    engagement: { problem: string; solution: string };
    monetization: { problem: string; solution: string };
    branding: { problem: string; solution: string };
  };

  // 3. AI Competitive Strategy (Benchmarking)
  benchmarking: {
    concept: string; // New channel concept
    direction: string; // Content direction
    detailedOperation: string; // New: Detailed operational methods
    roadmap: string[]; // 3-month intensive growth roadmap
    titles: string[]; // 10 video titles
    kpis: string[]; // Key metrics
    risks: string; // Risk management
    revenue: string; // Revenue diversification
  };

  // Legacy/Keyword fields
  strengths?: string[];
  weaknesses?: string[];
  opportunities?: string[];
  actionPlan?: string[];
  marketAnalysis?: string;
}

export interface OpportunityReport {
  type: 'RED_OCEAN' | 'BLUE_OCEAN';
  score: number; // 0 to 100
  summary: string;
  reason: string;
  strategy: string;
  keywords: string[];
  
  // Detailed Analysis Stats
  viewDistribution?: string; // "Top 10% videos have 80% views (Monopoly)"
  channelConcentration?: string; // "Top 50 videos come from 5 channels (High Concentration)"
  channelActivity?: string; // "Top channels upload every 2 days (High Competition)"
}

export interface YouTubeCategory {
  id: string;
  title: string;
}

export enum AppTab {
  CHANNEL_ANALYSIS = 'CHANNEL_ANALYSIS',
  KEYWORD_ANALYSIS = 'KEYWORD_ANALYSIS',
  OPPORTUNITY_FINDER = 'OPPORTUNITY_FINDER'
}

export type RegionCode = 'KR' | 'US' | 'JP' | 'Global';
export type VideoType = 'any' | 'video' | 'short';

export type RisingPeriod = '3m' | '6m' | '1y' | 'all';
export type VideoTypeFilter = 'all' | 'video' | 'shorts';

// New function to find Rising Channels with filters
export interface RisingChannelResult {
  details: YouTubeChannel;
  topVideo: YouTubeVideo; // Changed from string to full object for summarization
  topVideoViews: number;
  score: number;
}
