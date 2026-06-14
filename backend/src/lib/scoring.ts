import { prisma } from './prisma.js';

export type TrackEventType =
  | 'VIEW'
  | 'SEARCH'
  | 'WISHLIST_ADD'
  | 'CART_ADD'
  | 'PURCHASE'
  | 'FOLLOW_SELLER'
  | 'SURVEY_CATEGORY';

const POINTS: Record<TrackEventType, number> = {
  SURVEY_CATEGORY: 10,
  SEARCH:           5,
  VIEW:             3,
  WISHLIST_ADD:     8,
  CART_ADD:        10,
  PURCHASE:        20,
  FOLLOW_SELLER:   10,
};

interface TrackMeta {
  productId?:    string;
  categorySlug?: string;
  sellerId?:     string;
}

async function resolveCategorySlug(meta: TrackMeta): Promise<string | null> {
  if (meta.categorySlug) return meta.categorySlug;

  if (meta.productId) {
    const product = await prisma.product.findUnique({
      where:   { id: meta.productId },
      include: { category: true },
    });
    return product?.category?.slug ?? null;
  }

  if (meta.sellerId) {
    const products = await prisma.product.findMany({
      where:   { sellerId: meta.sellerId, isActive: true },
      include: { category: true },
      take:    5,
    });
    const slugs = products.map(p => p.category?.slug).filter(Boolean) as string[];
    if (slugs.length === 0) return null;
    const freq: Record<string, number> = {};
    for (const s of slugs) freq[s] = (freq[s] ?? 0) + 1;
    return Object.entries(freq).sort((a, b) => b[1] - a[1])[0][0];
  }

  return null;
}

export async function trackEvent(
  userId: string,
  eventType: TrackEventType,
  meta: TrackMeta = {},
): Promise<void> {
  try {
    const points = POINTS[eventType] ?? 1;
    const categorySlug = await resolveCategorySlug(meta);
    if (!categorySlug) return;

    await prisma.interestScore.upsert({
      where:  { userId_category: { userId, category: categorySlug } },
      update: { score: { increment: points }, updatedAt: new Date() },
      create: { userId, category: categorySlug, score: points, updatedAt: new Date() },
    });
  } catch (err) {
    console.error('[scoring] trackEvent error:', err);
  }
}

export async function getTopInterests(userId: string, limit = 5): Promise<string[]> {
  const scores = await prisma.interestScore.findMany({
    where:   { userId },
    orderBy: { score: 'desc' },
    take:    limit,
  });
  return scores.map(s => s.category);
}
