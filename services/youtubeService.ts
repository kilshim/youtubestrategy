
import { YouTubeChannel, YouTubeVideo, RegionCode, YouTubeCategory, RisingChannelResult, RisingPeriod, VideoTypeFilter } from '../types';
import { parseDuration } from '../utils';

const BASE_URL = 'https://www.googleapis.com/youtube/v3';

export const validateApiKey = async (apiKey: string): Promise<boolean> => {
  try {
    const response = await fetch(`${BASE_URL}/videos?part=id&chart=mostPopular&maxResults=1&key=${apiKey}`);
    return response.ok;
  } catch (error) {
    return false;
  }
};

export const searchChannelByName = async (apiKey: string, query: string): Promise<YouTubeChannel | null> => {
  const searchUrl = `${BASE_URL}/search?part=snippet&q=${encodeURIComponent(query)}&type=channel&maxResults=1&key=${apiKey}`;
  const searchRes = await fetch(searchUrl);
  const searchData = await searchRes.json();

  if (!searchData.items || searchData.items.length === 0) return null;

  const channelId = searchData.items[0].id.channelId;
  return await getChannelDetails(apiKey, channelId);
};

export const getChannelDetails = async (apiKey: string, channelId: string): Promise<YouTubeChannel | null> => {
  const detailsUrl = `${BASE_URL}/channels?part=snippet,statistics,contentDetails&id=${channelId}&key=${apiKey}`;
  const res = await fetch(detailsUrl);
  const data = await res.json();

  if (!data.items || data.items.length === 0) return null;

  const item = data.items[0];
  return {
    id: item.id,
    title: item.snippet.title,
    description: item.snippet.description,
    thumbnail: item.snippet.thumbnails.high?.url || item.snippet.thumbnails.medium?.url,
    subscriberCount: parseInt(item.statistics.subscriberCount),
    videoCount: parseInt(item.statistics.videoCount),
    viewCount: parseInt(item.statistics.viewCount),
    country: item.snippet.country,
    publishedAt: item.snippet.publishedAt // Crucial for identifying new channels
  };
};

export const getChannelVideos = async (apiKey: string, channelId: string, maxResults: number = 50): Promise<YouTubeVideo[]> => {
  const channelUrl = `${BASE_URL}/channels?part=contentDetails&id=${channelId}&key=${apiKey}`;
  const chRes = await fetch(channelUrl);
  const chData = await chRes.json();
  
  if (!chData.items || !chData.items.length) return [];
  const uploadsPlaylistId = chData.items[0].contentDetails.relatedPlaylists.uploads;

  const playlistUrl = `${BASE_URL}/playlistItems?part=snippet,contentDetails&playlistId=${uploadsPlaylistId}&maxResults=${maxResults}&key=${apiKey}`;
  const plRes = await fetch(playlistUrl);
  const plData = await plRes.json();

  if (!plData.items) return [];

  const videoIds = plData.items.map((item: any) => item.contentDetails.videoId).join(',');
  return await getVideoDetails(apiKey, videoIds);
};

export const getVideoCategories = async (apiKey: string, regionCode: string = 'KR'): Promise<YouTubeCategory[]> => {
  // Add hl=ko to force Korean titles regardless of region
  const url = `${BASE_URL}/videoCategories?part=snippet&regionCode=${regionCode}&key=${apiKey}&hl=ko`;
  const res = await fetch(url);
  const data = await res.json();
  
  if (!data.items) return [];

  return data.items.map((item: any) => ({
    id: item.id,
    title: item.snippet.title
  }));
};

export const searchVideosByKeyword = async (
  apiKey: string, 
  query: string, 
  maxResults: number = 50, 
  region: RegionCode, 
  shortsOnly: boolean,
  categoryId?: string
): Promise<YouTubeVideo[]> => {
  
  let url = `${BASE_URL}/search?part=snippet&q=${encodeURIComponent(query)}&type=video&maxResults=${maxResults}&order=viewCount&key=${apiKey}`;
  
  if (region !== 'Global') {
    url += `&regionCode=${region}`;
  }
  
  if (shortsOnly) {
    url += `&videoDuration=short`;
  }

  if (categoryId) {
    url += `&videoCategoryId=${categoryId}`;
  }

  const res = await fetch(url);
  const data = await res.json();

  if (!data.items) return [];

  const videoIds = data.items.map((item: any) => item.id.videoId).join(',');
  let videos = await getVideoDetails(apiKey, videoIds);

  if (shortsOnly) {
    videos = videos.filter(v => parseDuration(v.duration) < 180);
  }

  return videos;
};

const getVideoDetails = async (apiKey: string, videoIds: string): Promise<YouTubeVideo[]> => {
  if (!videoIds) return [];
  
  const statsUrl = `${BASE_URL}/videos?part=snippet,statistics,contentDetails&id=${videoIds}&key=${apiKey}`;
  const res = await fetch(statsUrl);
  const data = await res.json();

  if (!data.items) return [];

  return data.items.map((item: any) => ({
    id: item.id,
    title: item.snippet.title,
    description: item.snippet.description || '', // Fetch description
    thumbnail: item.snippet.thumbnails.medium?.url,
    publishedAt: item.snippet.publishedAt,
    channelId: item.snippet.channelId,
    channelTitle: item.snippet.channelTitle,
    viewCount: parseInt(item.statistics.viewCount) || 0,
    likeCount: parseInt(item.statistics.likeCount) || 0,
    commentCount: parseInt(item.statistics.commentCount) || 0,
    duration: item.contentDetails.duration,
    tags: item.snippet.tags || []
  }));
};

export const findRisingChannels = async (
  apiKey: string, 
  query: string,
  categoryId: string = '',
  period: RisingPeriod = '1y',
  region: RegionCode = 'KR',
  videoType: VideoTypeFilter = 'all'
): Promise<RisingChannelResult[]> => {
  
  // 1. Calculate Date Thresholds
  const now = new Date();
  let publishedAfterDate = new Date(); // For Video Search (ensure content is recent)
  let channelCreationCutoff = new Date(); // For Channel Filtering

  switch(period) {
    case '3m':
      channelCreationCutoff.setDate(now.getDate() - 90);
      publishedAfterDate.setDate(now.getDate() - 90);
      break;
    case '6m':
      channelCreationCutoff.setDate(now.getDate() - 180);
      publishedAfterDate.setDate(now.getDate() - 180);
      break;
    case '1y':
      channelCreationCutoff.setDate(now.getDate() - 365);
      publishedAfterDate.setDate(now.getDate() - 365);
      break;
    case 'all':
    default:
      channelCreationCutoff = new Date(0); // No limit on creation date
      publishedAfterDate.setDate(now.getDate() - 365); // Still look for videos in last year for relevance
      break;
  }

  const publishedAfter = publishedAfterDate.toISOString();

  // 2. Build Search URL
  let searchUrl = `${BASE_URL}/search?part=snippet&q=${encodeURIComponent(query)}&type=video&order=viewCount&publishedAfter=${publishedAfter}&maxResults=50&key=${apiKey}`;
  
  if (categoryId) {
    searchUrl += `&videoCategoryId=${categoryId}`;
  }
  
  if (region !== 'Global') {
    searchUrl += `&regionCode=${region}`;
  }

  // Video Duration Filter
  if (videoType === 'shorts') {
    searchUrl += `&videoDuration=short`;
  } else if (videoType === 'video') {
    searchUrl += `&videoDuration=medium`;
  }

  const searchRes = await fetch(searchUrl);
  const searchData = await searchRes.json();

  if (!searchData.items) return [];

  // 3. Extract unique channel IDs and Map Best Video
  const videoMap = new Map<string, string>(); // ChannelId -> VideoId
  const channelIdsSet = new Set<string>();

  searchData.items.forEach((item: any) => {
    const chId = item.snippet.channelId;
    if (!channelIdsSet.has(chId)) {
      channelIdsSet.add(chId);
      videoMap.set(chId, item.id.videoId);
    }
  });

  const channelIds = Array.from(channelIdsSet).slice(0, 40);
  if (channelIds.length === 0) return [];

  // 4. Get Channel Details
  const channelsUrl = `${BASE_URL}/channels?part=snippet,statistics&id=${channelIds.join(',')}&key=${apiKey}`;
  const chRes = await fetch(channelsUrl);
  const chData = await chRes.json();

  if (!chData.items) return [];

  // 5. Get Detailed Video Info (for AI Summary and correct Stats)
  const videoIdsToFetch = Array.from(videoMap.values()).join(',');
  const videoDetails = await getVideoDetails(apiKey, videoIdsToFetch);
  const videoDetailsMap = new Map(videoDetails.map(v => [v.id, v]));

  const risingChannels: RisingChannelResult[] = [];

  chData.items.forEach((item: any) => {
    const publishedAt = new Date(item.snippet.publishedAt);
    
    // 6. Apply Channel Creation Date Filter
    if (publishedAt >= channelCreationCutoff) {
      const videoId = videoMap.get(item.id);
      const fullVideo = videoId ? videoDetailsMap.get(videoId) : null;
      
      if (!fullVideo) return;

      const subCount = parseInt(item.statistics.subscriberCount) || 1;
      
      const channelObj: YouTubeChannel = {
        id: item.id,
        title: item.snippet.title,
        description: item.snippet.description,
        thumbnail: item.snippet.thumbnails.medium?.url,
        subscriberCount: subCount,
        videoCount: parseInt(item.statistics.videoCount),
        viewCount: parseInt(item.statistics.viewCount),
        country: item.snippet.country,
        publishedAt: item.snippet.publishedAt
      };

      // Simple score: Views per Subscriber (Virality of the channel based on its top recent video)
      const ratio = subCount > 0 ? (fullVideo.viewCount / subCount) : 0;

      risingChannels.push({
        details: channelObj,
        topVideo: fullVideo,
        topVideoViews: fullVideo.viewCount,
        score: ratio
      });
    }
  });

  return risingChannels.sort((a, b) => b.score - a.score);
};
