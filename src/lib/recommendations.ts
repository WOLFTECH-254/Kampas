import { api } from './api';

export interface RecommendableItem {
  id:       string;
  title:    string;
  campus:   string;
  price?:   number;
  category?: { slug: string } | null;
  views?:   number;
  rating?:  number | null;
}

export interface RecommendationScore {
  item:   RecommendableItem;
  score:  number;
  reason: string;
}

export interface InterestScore {
  category: string;
  score:    number;
}

const CAMPUS_WEIGHTS: Record<string, number> = {
  'UoN Main Campus': 1.0,
  'Strathmore':      0.9,
  'JKUAT Main':      0.85,
  'KU Main Campus':  0.85,
  'TU Kenya':        0.8,
  'Mount Kenya Uni': 0.75,
};

export async function fetchInterestScores(): Promise<InterestScore[]> {
  try {
    const res = await api('/api/products/interests', { auth: true });
    return (res.data?.scores ?? []) as InterestScore[];
  } catch {
    return [];
  }
}

export function getRecommendations(
  items:          RecommendableItem[],
  userCampus:     string,
  preferredCats:  string[],
  maxPrice?:      number,
  limit = 6,
  interestScores: InterestScore[] = [],
): RecommendationScore[] {
  const scoreMap: Record<string, number> = {};
  for (const s of interestScores) scoreMap[s.category] = s.score;
  const maxInterest = Math.max(1, ...Object.values(scoreMap));

  const scored = items.map(item => {
    let score  = 0;
    let reason = '';

    const campusMatch = item.campus === userCampus;
    if (campusMatch) { score += 40; reason = 'Near your campus'; }
    else {
      const w = CAMPUS_WEIGHTS[item.campus] ?? 0.5;
      score += w * 15;
    }

    const slug = item.category?.slug ?? '';

    if (scoreMap[slug]) {
      const normalised = (scoreMap[slug] / maxInterest) * 35;
      score += normalised;
      reason = reason || 'Matches your interests';
    } else if (preferredCats.includes(slug)) {
      score += 30;
      reason = reason || 'Matches your interests';
    }

    if (maxPrice && item.price != null && item.price <= maxPrice) {
      score += 15;
      reason = reason || 'Within your budget';
    }

    score += Math.min((item.views ?? 0) / 100, 10);
    if (item.rating) score += item.rating * 2;

    if (!reason) reason = 'Popular nearby';

    return { item, score, reason };
  });

  return scored.sort((a, b) => b.score - a.score).slice(0, limit);
}

export function getTrendingItems(items: RecommendableItem[], limit = 4): RecommendableItem[] {
  return [...items]
    .sort((a, b) => (b.views ?? 0) + (b.rating ?? 0) * 10 - ((a.views ?? 0) + (a.rating ?? 0) * 10))
    .slice(0, limit);
}
