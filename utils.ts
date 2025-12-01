
import { AnalysisReport, OpportunityReport, RisingChannelResult } from './types';

// Simple obfuscation for local storage (not military grade, but prevents plain text snooping)
export const encryptKey = (key: string): string => {
  try {
    return btoa(key.split('').map((char, i) => String.fromCharCode(char.charCodeAt(0) ^ 123)).join(''));
  } catch (e) {
    return '';
  }
};

export const decryptKey = (cipher: string): string => {
  try {
    return atob(cipher).split('').map((char, i) => String.fromCharCode(char.charCodeAt(0) ^ 123)).join('');
  } catch (e) {
    return '';
  }
};

export const formatNumber = (num: number): string => {
  if (num >= 100000000) return (num / 100000000).toFixed(1) + '억';
  if (num >= 10000) return (num / 10000).toFixed(1) + '만';
  return num.toLocaleString();
};

export const formatDate = (dateStr: string): string => {
  return new Date(dateStr).toLocaleDateString('ko-KR', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
};

export const formatDurationKR = (ms: number): string => {
  const days = Math.floor(ms / (1000 * 60 * 60 * 24));
  const hours = Math.floor((ms % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
  if (days > 0) return `${days}일 ${hours}시간`;
  return `${hours}시간`;
};

export const parseDuration = (duration: string): number => {
  // Simple ISO 8601 parser for duration to seconds
  const match = duration.match(/PT(\d+H)?(\d+M)?(\d+S)?/);
  if (!match) return 0;
  
  const hours = (parseInt(match[1] || '0') || 0);
  const minutes = (parseInt(match[2] || '0') || 0);
  const seconds = (parseInt(match[3] || '0') || 0);
  
  return hours * 3600 + minutes * 60 + seconds;
};

export const downloadCSV = (data: any[], filename: string) => {
  if (!data.length) return;
  const headers = Object.keys(data[0]).join(',');
  const rows = data.map(obj => Object.values(obj).map(v => `"${String(v).replace(/"/g, '""')}"`).join(','));
  const csvContent = [headers, ...rows].join('\n');
  const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `${filename}.csv`;
  link.click();
};

export const downloadJSON = (data: any, filename: string) => {
  const jsonContent = JSON.stringify(data, null, 2);
  const blob = new Blob([jsonContent], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `${filename}.json`;
  link.click();
};

export const downloadText = (data: string, filename: string) => {
    const blob = new Blob([data], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${filename}.txt`;
    link.click();
};

export const formatReportToText = (report: AnalysisReport, channelName: string): string => {
    return `
[TubeStrategy AI 컨설팅 리포트]
분석 대상 채널: ${channelName}
분석 일시: ${new Date().toLocaleString('ko-KR')}

================================================================================
1. 종합 요약
================================================================================
${report.summary}

================================================================================
2. 성장 과정 심층 분석
================================================================================
[초기 단계] (${report.growthProcess.early.period})
- 요약: ${report.growthProcess.early.summary}
- 전략: ${report.growthProcess.early.strategy}
- 성과: ${report.growthProcess.early.quantitative}
- 심층분석: ${report.growthProcess.early.contentDepth}

[중기 단계] (${report.growthProcess.mid.period})
- 요약: ${report.growthProcess.mid.summary}
- 전략: ${report.growthProcess.mid.strategy}
- 성과: ${report.growthProcess.mid.quantitative}
- 심층분석: ${report.growthProcess.mid.contentDepth}

[최근 단계] (${report.growthProcess.latest.period})
- 요약: ${report.growthProcess.latest.summary}
- 전략: ${report.growthProcess.latest.strategy}
- 성과: ${report.growthProcess.latest.quantitative}
- 심층분석: ${report.growthProcess.latest.contentDepth}

================================================================================
3. 채널 진단 및 솔루션
================================================================================
[콘텐츠]
- 문제점: ${report.diagnosis.content.problem}
- 솔루션: ${report.diagnosis.content.solution}

[시청자 참여]
- 문제점: ${report.diagnosis.engagement.problem}
- 솔루션: ${report.diagnosis.engagement.solution}

[수익화]
- 문제점: ${report.diagnosis.monetization.problem}
- 솔루션: ${report.diagnosis.monetization.solution}

[브랜딩]
- 문제점: ${report.diagnosis.branding.problem}
- 솔루션: ${report.diagnosis.branding.solution}

================================================================================
4. AI 경쟁 전략 (로드맵)
================================================================================
[새로운 채널 컨셉]
${report.benchmarking.concept}

[운영 방향성]
${report.benchmarking.direction}

[상세 운영 전략]
${report.benchmarking.detailedOperation}

[3개월 집중 성장 로드맵]
${report.benchmarking.roadmap.map(s => `- ${s}`).join('\n')}

[추천 영상 제목 10선]
${report.benchmarking.titles.map(t => `- ${t}`).join('\n')}

[핵심 성과 지표 (KPI)]
${report.benchmarking.kpis.map(k => `- ${k}`).join('\n')}

[리스크 관리 전략]
${report.benchmarking.risks}

[수익 모델 다각화]
${report.benchmarking.revenue}
    `.trim();
};

export const formatKeywordReportToText = (report: AnalysisReport, keyword: string): string => {
    return `
[TubeStrategy AI 키워드 시장 분석 리포트]
분석 키워드: ${keyword}
분석 일시: ${new Date().toLocaleString('ko-KR')}

================================================================================
1. 시장 트렌드 요약
================================================================================
${report.summary}

================================================================================
2. 시장 분석 (Market Analysis)
================================================================================
${report.marketAnalysis}

================================================================================
3. 기회 및 위협 요인 (SWOT)
================================================================================
[성공 요인 / 강점]
${(report.strengths || []).map(s => `- ${s}`).join('\n')}

[시장 빈틈 / 약점]
${(report.weaknesses || []).map(w => `- ${w}`).join('\n')}

[기회 요인]
${(report.opportunities || []).map(o => `- ${o}`).join('\n')}

================================================================================
4. 필승 전략 (Action Plan)
================================================================================
${(report.actionPlan || []).map(p => `- ${p}`).join('\n')}
    `.trim();
};

export const formatOpportunityReportToText = (
  report: OpportunityReport | null,
  channels: RisingChannelResult[],
  topic: string
): string => {
  const dateStr = new Date().toLocaleString('ko-KR');
  let content = `[TubeStrategy AI 공략 채널 발굴 리포트]\n`;
  content += `주제: ${topic}\n`;
  content += `분석 일시: ${dateStr}\n\n`;

  if (report) {
    content += `================================================================================\n`;
    content += `1. 시장 기회 분석 (AI Analysis)\n`;
    content += `================================================================================\n`;
    content += `판단: ${report.type === 'BLUE_OCEAN' ? '🌊 블루오션 (기회 시장)' : '🔥 레드오션 (경쟁 과열)'}\n`;
    content += `기회 점수: ${report.score} / 100\n\n`;
    content += `[요약]\n${report.summary}\n\n`;
    content += `[판단 근거]\n${report.reason}\n\n`;
    content += `[시장 상세 지표]\n`;
    content += `- 조회수 분포: ${report.viewDistribution}\n`;
    content += `- 채널 집중도: ${report.channelConcentration}\n`;
    content += `- 채널 활성도: ${report.channelActivity}\n\n`;
    content += `[진입 전략]\n${report.strategy}\n\n`;
    content += `[추천 키워드]\n${report.keywords.join(', ')}\n\n`;
  }

  if (channels.length > 0) {
    content += `================================================================================\n`;
    content += `2. 라이징 스타 채널 리스트 (${channels.length}개)\n`;
    content += `================================================================================\n`;
    channels.forEach((item, index) => {
      content += `[${index + 1}] ${item.details.title}\n`;
      content += `- 구독자: ${formatNumber(item.details.subscriberCount)}\n`;
      content += `- 개설일: ${item.details.publishedAt?.split('T')[0]}\n`;
      content += `- 대표 영상: ${item.topVideo.title}\n`;
      content += `- 영상 조회수: ${formatNumber(item.topVideo.viewCount)}회\n`;
      content += `- 채널 URL: https://www.youtube.com/channel/${item.details.id}\n`;
      content += `- 영상 URL: https://www.youtube.com/watch?v=${item.topVideo.id}\n\n`;
    });
  }

  return content;
};
