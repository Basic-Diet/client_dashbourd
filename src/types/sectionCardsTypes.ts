interface SectionCardsData {
  id: number;
  description: string;
  value: string;
  percentage?: string;
  isPositive?: boolean;
  trendText?: string;
  icon: React.ReactNode;
}

export type { SectionCardsData };
