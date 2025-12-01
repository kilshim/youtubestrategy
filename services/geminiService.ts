
import { GoogleGenAI, Type } from "@google/genai";
import { YouTubeChannel, YouTubeVideo, AnalysisReport, OpportunityReport } from "../types";
import { decryptKey } from "../utils";

const getGenAI = () => {
  const storedKey = localStorage.getItem('gemini_api_key');
  if (!storedKey) {
    throw new Error("Gemini API 키가 설정되지 않았습니다. 설정 메뉴에서 키를 등록해주세요.");
  }
  return new GoogleGenAI({ apiKey: decryptKey(storedKey) });
};

const SYSTEM_INSTRUCTION = `
당신은 세계 최고의 유튜브 전략 컨설턴트 'TubeMaster AI'입니다. 
데이터를 기반으로 매우 구체적이고 실현 가능한 전략을 한국어로 제시해야 합니다.
뻔한 조언(예: "꾸준히 올리세요")은 절대 금지입니다. 
데이터에서 발견된 구체적인 패턴(성공한 썸네일 스타일, 제목 패턴, 영상 길이 등)을 바탕으로 통찰력을 제공하세요.
`;

export const validateGeminiApiKey = async (apiKey: string): Promise<boolean> => {
  try {
    const ai = new GoogleGenAI({ apiKey });
    // 가벼운 테스트 요청
    await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: 'ping',
    });
    return true;
  } catch (error) {
    console.error("Gemini Key Validation Error:", error);
    return false;
  }
};

export const analyzeChannelGrowth = async (channel: YouTubeChannel, videos: YouTubeVideo[]): Promise<AnalysisReport> => {
  const genAI = getGenAI();
  const model = "gemini-2.5-flash";
  
  // Sort videos by date
  const sortedVideos = [...videos].sort((a, b) => new Date(a.publishedAt).getTime() - new Date(b.publishedAt).getTime());
  
  // Prepare data summary for prompt to save tokens
  const videoSummary = sortedVideos.map(v => 
    `[${v.publishedAt.split('T')[0]}] ${v.title} (Views: ${v.viewCount}, Likes: ${v.likeCount}, Duration: ${v.duration})`
  ).join('\n');

  const prompt = `
    다음 유튜브 채널을 심층 분석하여 전문가 수준의 컨설팅 보고서를 작성해줘.
    
    [채널 정보]
    이름: ${channel.title}
    구독자: ${channel.subscriberCount}
    총 조회수: ${channel.viewCount}
    국가: ${channel.country || '미확인'}
    
    [최근 영상 50개 데이터]
    ${videoSummary}
    
    각 항목은 매우 구체적이어야 하며, 실질적인 솔루션을 포함해야 합니다.
  `;

  // Define Schema for strict JSON output
  const growthStageSchema = {
    type: Type.OBJECT,
    properties: {
      period: { type: Type.STRING, description: "분석 기간 (예: 2023.01 ~ 2023.06)" },
      summary: { type: Type.STRING, description: "성과 요약 (한줄)" },
      strategy: { type: Type.STRING, description: "주요 전략 및 컨셉 분석" },
      quantitative: { type: Type.STRING, description: "정량적 성과 분석" },
      contentDepth: { type: Type.STRING, description: "콘텐츠 및 시청자 심층 분석" },
    },
    required: ["period", "summary", "strategy", "quantitative", "contentDepth"]
  };

  const diagnosisSchema = {
    type: Type.OBJECT,
    properties: {
      problem: { type: Type.STRING },
      solution: { type: Type.STRING },
    },
    required: ["problem", "solution"]
  };

  const schema = {
    type: Type.OBJECT,
    properties: {
      summary: { type: Type.STRING, description: "채널의 현재 상태와 핵심 문제를 3줄로 요약" },
      growthProcess: {
        type: Type.OBJECT,
        properties: {
          early: growthStageSchema,
          mid: growthStageSchema,
          latest: growthStageSchema,
        },
        required: ["early", "mid", "latest"]
      },
      diagnosis: {
        type: Type.OBJECT,
        properties: {
          content: diagnosisSchema,
          engagement: diagnosisSchema,
          monetization: diagnosisSchema,
          branding: diagnosisSchema,
        },
        required: ["content", "engagement", "monetization", "branding"]
      },
      benchmarking: {
        type: Type.OBJECT,
        properties: {
          concept: { type: Type.STRING, description: "이 채널을 이길 수 있는 새로운 채널 컨셉 제안" },
          direction: { type: Type.STRING, description: "경쟁 우위를 점할 수 있는 콘텐츠 방향성" },
          detailedOperation: { type: Type.STRING, description: "상세 운영 방법 (업로드, 썸네일, 편집 스타일 등)" },
          roadmap: { type: Type.ARRAY, items: { type: Type.STRING }, description: "3개월 집중 성장 로드맵 (월별)" },
          titles: { type: Type.ARRAY, items: { type: Type.STRING }, description: "성공 보장 영상 제목 10선" },
          kpis: { type: Type.ARRAY, items: { type: Type.STRING }, description: "핵심 성과 지표 4가지" },
          risks: { type: Type.STRING, description: "리스크 관리 전략" },
          revenue: { type: Type.STRING, description: "수익 모델 다각화 전략" },
        },
        required: ["concept", "direction", "detailedOperation", "roadmap", "titles", "kpis", "risks", "revenue"]
      }
    },
    required: ["summary", "growthProcess", "diagnosis", "benchmarking"]
  };

  try {
    const response = await genAI.models.generateContent({
      model: model,
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: schema,
        systemInstruction: SYSTEM_INSTRUCTION
      }
    });
    
    // With responseSchema, the output is guaranteed to be valid JSON structure (if the model adheres to it)
    return JSON.parse(response.text) as AnalysisReport;
  } catch (error) {
    console.error("Gemini API Error:", error);
    throw new Error("AI 분석 생성 중 오류가 발생했습니다. 잠시 후 다시 시도해주세요.");
  }
};

export const analyzeKeywordMarket = async (keyword: string, videos: YouTubeVideo[]): Promise<AnalysisReport> => {
  const genAI = getGenAI();
  const model = "gemini-2.5-flash";

  const topVideos = videos.slice(0, 20).map(v => 
    `Title: ${v.title}, Channel: ${v.channelTitle}, Views: ${v.viewCount}, Duration: ${v.duration}`
  ).join('\n');

  const prompt = `
    키워드 '${keyword}'에 대한 유튜브 시장 분석을 수행해줘.
    
    [상위 인기 영상 데이터]
    ${topVideos}
  `;

  const schema = {
    type: Type.OBJECT,
    properties: {
      summary: { type: Type.STRING, description: "시장 트렌드 요약" },
      marketAnalysis: { type: Type.STRING, description: "시장 주도 채널 및 콘텐츠 분석" },
      strengths: { type: Type.ARRAY, items: { type: Type.STRING }, description: "성공 요인/강점" },
      weaknesses: { type: Type.ARRAY, items: { type: Type.STRING }, description: "시장 빈틈/약점" },
      opportunities: { type: Type.ARRAY, items: { type: Type.STRING }, description: "기회 요인" },
      actionPlan: { type: Type.ARRAY, items: { type: Type.STRING }, description: "필승 전략" },
    },
    required: ["summary", "marketAnalysis", "strengths", "weaknesses", "opportunities", "actionPlan"]
  };

  try {
    const response = await genAI.models.generateContent({
      model: model,
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: schema,
        systemInstruction: SYSTEM_INSTRUCTION
      }
    });

    return JSON.parse(response.text) as AnalysisReport;
  } catch (error) {
    console.error("Gemini API Error:", error);
    throw new Error("시장 분석 생성 중 오류가 발생했습니다.");
  }
};

export const analyzeTopicOpportunity = async (topic: string, videos: any[]): Promise<OpportunityReport> => {
  const genAI = getGenAI();
  const model = "gemini-2.5-flash";

  // Calculate local stats
  const totalViews = videos.reduce((acc, v) => acc + parseInt(v.viewCount || '0'), 0);
  const avgViews = videos.length > 0 ? totalViews / videos.length : 0;
  
  const sortedViews = [...videos].map(v => parseInt(v.viewCount || '0')).sort((a, b) => a - b);
  const medianViews = sortedViews.length > 0 ? sortedViews[Math.floor(sortedViews.length / 2)] : 0;

  const channelCounts: {[key: string]: number} = {};
  videos.forEach(v => {
    channelCounts[v.channelTitle] = (channelCounts[v.channelTitle] || 0) + 1;
  });
  const uniqueChannels = Object.keys(channelCounts).length;
  const topChannels = Object.entries(channelCounts).sort((a, b) => b[1] - a[1]).slice(0, 5);
  
  const statsSummary = `
    - 총 분석 영상 수: ${videos.length}개
    - 평균 조회수: ${Math.round(avgViews)}회
    - 중간값 조회수: ${medianViews}회
    - 참여 채널 수: ${uniqueChannels}개
    - 상위 3개 채널 점유율: ${topChannels.map(c => `${c[0]}(${c[1]}개)`).join(', ')}
  `;

  const prompt = `
    주제 '${topic}'에 대한 유튜브 시장 기회를 분석해줘.
    
    [시장 데이터 통계]
    ${statsSummary}
    
    다음 3가지 관점에서 분석하고 최종적으로 Red Ocean인지 Blue Ocean인지 판단해.
    1. 조회수 분포: 소수 독식 vs 고른 분산
    2. 채널 집중도: 독과점 여부
    3. 채널 활성도: 경쟁 강도
  `;

  const schema = {
    type: Type.OBJECT,
    properties: {
      type: { type: Type.STRING, enum: ["RED_OCEAN", "BLUE_OCEAN"] },
      score: { type: Type.NUMBER, description: "기회 점수 (0-100)" },
      summary: { type: Type.STRING, description: "시장 요약" },
      reason: { type: Type.STRING, description: "판단 근거" },
      viewDistribution: { type: Type.STRING, description: "조회수 분포 분석" },
      channelConcentration: { type: Type.STRING, description: "채널 집중도 분석" },
      channelActivity: { type: Type.STRING, description: "채널 활성도 분석" },
      strategy: { type: Type.STRING, description: "차별화 진입 전략" },
      keywords: { type: Type.ARRAY, items: { type: Type.STRING }, description: "추천 키워드" },
    },
    required: ["type", "score", "summary", "reason", "viewDistribution", "channelConcentration", "channelActivity", "strategy", "keywords"]
  };

  try {
    const response = await genAI.models.generateContent({
      model: model,
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: schema,
        systemInstruction: SYSTEM_INSTRUCTION
      }
    });

    return JSON.parse(response.text) as OpportunityReport;
  } catch (error) {
    console.error("Gemini API Error:", error);
    throw new Error("기회 분석 중 오류가 발생했습니다.");
  }
};

export const summarizeVideo = async (video: YouTubeVideo): Promise<string> => {
  const genAI = getGenAI();
  const model = "gemini-2.5-flash";
  const prompt = `
    다음 유튜브 영상의 메타데이터를 바탕으로 영상을 요약하고 분석해줘.
    
    [영상 정보]
    제목: ${video.title}
    설명: ${video.description || '없음'}
    태그: ${video.tags.join(', ')}
    조회수: ${video.viewCount}
    
    3문장으로 답변해:
    1. 핵심 콘텐츠 내용 요약
    2. 이 영상이 인기 있는(또는 없는) 이유 추론
    3. 벤치마킹 포인트
    
    형식: "- 내용: ...\n- 분석: ...\n- 벤치마킹: ..."
    간결하게 작성해.
  `;

  try {
    const response = await genAI.models.generateContent({
      model: model,
      contents: prompt,
      config: {
        responseMimeType: "text/plain", // Free text for this one
        systemInstruction: SYSTEM_INSTRUCTION
      }
    });
    return response.text;
  } catch (error) {
    return "요약 생성 실패";
  }
};
