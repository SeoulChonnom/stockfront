type StatusTone = 'ready' | 'partial' | 'failed' | 'success';

export type MarketIndex = {
  label: string;
  value: string;
  change: string;
  changeRate: string;
  direction: 'up' | 'down';
  high: string;
  low: string;
};

export type ClusterCard = {
  id: string;
  articleCount: number;
  title: string;
  summary: string;
  tags: string[];
};

export type MarketSnapshot = {
  pageId: number;
  businessDate: string;
  versionNo: number;
  generatedAt: string;
  status: StatusTone;
  globalHeadline: string;
  markets: {
    label: string;
    summaryTitle: string;
    summaryBody: string;
    indices: MarketIndex[];
    clusters: ClusterCard[];
  }[];
};

export type ArchiveRecord = {
  pageId: number;
  businessDate: string;
  headline: string;
  status: 'READY' | 'PARTIAL' | 'FAILED';
  generatedAt: string;
  detail: string | null;
};

export type ClusterArticle = {
  id: string;
  source: string;
  publishedAt: string;
  title: string;
  originalUrl: string;
  mirrorUrl: string;
};

export type ClusterDetail = {
  id: string;
  businessDate: string;
  marketLabel: string;
  title: string;
  tags: string[];
  analysis: string[];
  articles: ClusterArticle[];
  representative: ClusterArticle & {
    sourceSummary: string;
  };
  articleCount: number;
  updatedAt: string;
};

export type BatchRun = {
  id: number;
  jobName: string;
  market: string;
  businessDate: string;
  status: 'SUCCESS' | 'PARTIAL' | 'FAILED';
  startedAt: string;
  finishedAt: string;
  duration: string;
  counts: string;
  detail: string;
  pageVersion: string;
};

export type ArchiveListView = {
  rows: ArchiveRecord[];
  page: number;
  size: number;
  totalCount: number;
  totalPages: number;
};

export type BatchSummaryView = {
  successRate: string;
  avgProcessingTime: string;
  marketSyncQuality: string;
  successSupporting: string;
  durationSupporting: string;
  qualitySupporting: string;
};

export type BatchJobsView = {
  rows: BatchRun[];
  page: number;
  size: number;
  totalCount: number;
  totalPages: number;
  summary: BatchSummaryView;
};
