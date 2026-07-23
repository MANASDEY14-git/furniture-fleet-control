import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export type PerformanceTier = 'Elite Performer' | 'High Performer' | 'Good Performer' | 'Average' | 'Needs Coaching';

export interface ScoreBreakdown {
  revenueScore: number;
  profitScore: number;
  targetScore: number;
  clearanceScore: number;
  csatScore: number;
  productMixScore: number;
  repeatCustomerScore: number;
  totalScore: number;
}

export interface CategoryPerformance {
  category: string;
  revenue: number;
  profit: number;
  units: number;
  avgMargin: number;
}

export interface CoachingRecommendation {
  id: string;
  title: string;
  type: 'cross_selling' | 'discount_control' | 'inventory_clearance' | 'premium_upsell' | 'synergy';
  urgency: 'HIGH' | 'MEDIUM' | 'LOW';
  description: string;
  actionItem: string;
}

export interface SalesHistoryEntry {
  id: string;
  date: string;
  orderNumber: string;
  customerName: string;
  customerType: 'New' | 'Repeat' | 'Corporate' | 'VIP';
  itemName: string;
  category: string;
  quantity: number;
  saleAmount: number;
  costAmount: number;
  grossProfit: number;
  discountPct: number;
  isCoAttended: boolean;
  coAttendedWith?: string;
  mySplitRevenue: number;
  mySplitProfit: number;
  mySplitCommission: number;
  stockAgeDays?: number;
}

export interface DiscountViolation {
  id: string;
  date: string;
  orderNumber: string;
  customerName: string;
  discountPct: number;
  approvedBy?: string;
  revenueLost: number;
  reason: string;
  status: 'Flagged' | 'Approved Exception' | 'Pending Review';
}

export interface CoSellingPartnerInfo {
  partnerId: string;
  partnerName: string;
  partnerAvatar: string;
  coClosedOrders: number;
  sharedRevenue: number;
  sharedProfit: number;
  avgOrderValue: number;
  conversionRatePct: number;
  synergyBoostPct: number;
}

export interface SalespersonPerformance {
  id: string;
  name: string;
  email: string;
  role: string;
  avatarUrl: string;
  branchId: string;
  branchName: string;

  monthlyRevenue: number;
  prevMonthRevenue: number;
  quarterlyRevenue: number;
  yearlyRevenue: number;
  soloRevenue: number;
  sharedRevenue: number;

  monthlyProfit: number;
  prevMonthProfit: number;
  profitMarginPct: number;
  avgMarginPerSale: number;

  ordersClosed: number;
  prevMonthOrders: number;
  unitsSold: number;
  avgOrderValue: number;
  prevMonthAOV: number;
  avgSellingPrice: number;
  conversionRatePct: number;
  prevMonthConversionRatePct: number;

  monthlyTarget: number;
  currentAchievement: number;
  remainingTarget: number;
  forecastAchievement: number;
  achievementPct: number;

  older180DaysValue: number;
  older365DaysValue: number;
  totalValueCleared: number;
  deadStockClearedPct: number;
  itemsClearedCount: number;

  heroProductsSold: number;
  fastMovingSold: number;
  slowMovingCleared: number;
  premiumProductsSold: number;
  categoryBreakdown: CategoryPerformance[];
  topCategory: string;

  repeatCustomersCount: number;
  newCustomersCount: number;
  csatScore: number;
  returnsCount: number;
  refundsAmount: number;
  complaintsCount: number;
  deliveryIssuesCount: number;

  avgDiscountPct: number;
  highestDiscountPct: number;
  revenueLostToDiscounts: number;
  marginImpactPct: number;
  approvalViolationsCount: number;
  discountViolations: DiscountViolation[];

  performanceScore: number;
  scoreTier: PerformanceTier;
  scoreBadgeLabel: string;
  scoreBreakdown: ScoreBreakdown;
  trendVsLastMonth: 'up' | 'down' | 'stable';
  trendPctChange: number;
  badgeStatus: 'Excellent' | 'Good' | 'Needs Attention';

  coSellingPartners: CoSellingPartnerInfo[];
  coSellingDealsCount: number;

  coachingRecommendations: CoachingRecommendation[];
  salesHistory: SalesHistoryEntry[];
  monthlyTrend: Array<{
    month: string;
    revenue: number;
    profit: number;
    orders: number;
    aov: number;
    conversion: number;
  }>;
}

export interface CoSellingPairSynergy {
  pairId: string;
  person1Id: string;
  person1Name: string;
  person1Avatar: string;
  person2Id: string;
  person2Name: string;
  person2Avatar: string;
  totalCoClosedOrders: number;
  totalSharedRevenue: number;
  totalSharedProfit: number;
  totalSharedCommission: number;
  duoAOV: number;
  soloAvgAOV: number;
  aovBoostPct: number;
  duoConversionRate: number;
  synergyScore: number;
  topCategory: string;
  aiInsight: string;
}

export interface ExecutiveKpis {
  totalTeamRevenue: number;
  prevTeamRevenue: number;
  totalGrossProfit: number;
  prevGrossProfit: number;
  totalOrdersClosed: number;
  prevOrdersClosed: number;
  avgOrderValue: number;
  prevAvgOrderValue: number;
  teamConversionRate: number;
  prevTeamConversionRate: number;
  inventoryClearedValue: number;
  prevInventoryClearedValue: number;
  bestPerformer: {
    id: string;
    name: string;
    avatarUrl: string;
    revenue: number;
    profit: number;
    score: number;
  };
  mostImproved: {
    id: string;
    name: string;
    avatarUrl: string;
    improvementPct: number;
    reason: string;
  };
}

export interface AIBusinessInsight {
  id: string;
  title: string;
  description: string;
  type: 'success' | 'warning' | 'info' | 'highlight' | 'synergy';
  salespersonId?: string;
  salespersonName?: string;
  metricBadge?: string;
}

export interface SalesIntelligenceSummary {
  kpis: ExecutiveKpis;
  insights: AIBusinessInsight[];
  salespeople: SalespersonPerformance[];
  coSellingPairs: CoSellingPairSynergy[];
  teamCategoryMix: CategoryPerformance[];
  teamMonthlyTrends: Array<{
    month: string;
    revenue: number;
    profit: number;
    orders: number;
    aov: number;
    conversion: number;
  }>;
}

export interface SalesIntelligenceFilters {
  storeId?: string;
  salespersonId?: string;
  dateRange?: 'this_month' | 'last_month' | 'this_quarter' | 'ytd' | 'custom';
  customStartDate?: string;
  customEndDate?: string;
  categoryId?: string;
  brand?: string;
  customerType?: string;
  minRevenue?: number;
  maxRevenue?: number;
  minMargin?: number;
  maxMargin?: number;
  minTargetPct?: number;
  maxTargetPct?: number;
  searchQuery?: string;
}

// ---------- Date range helpers ----------
function computeRange(filters: SalesIntelligenceFilters): { start: Date | null; end: Date | null; prevStart: Date | null; prevEnd: Date | null } {
  const now = new Date();
  const range = filters.dateRange || 'this_month';
  let start: Date | null = null;
  let end: Date | null = null;

  if (range === 'custom' && filters.customStartDate && filters.customEndDate) {
    start = new Date(filters.customStartDate);
    end = new Date(filters.customEndDate);
  } else if (range === 'this_month') {
    start = new Date(now.getFullYear(), now.getMonth(), 1);
    end = now;
  } else if (range === 'last_month') {
    start = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    end = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59);
  } else if (range === 'this_quarter') {
    const q = Math.floor(now.getMonth() / 3);
    start = new Date(now.getFullYear(), q * 3, 1);
    end = now;
  } else if (range === 'ytd') {
    start = new Date(now.getFullYear(), 0, 1);
    end = now;
  }

  let prevStart: Date | null = null;
  let prevEnd: Date | null = null;
  if (start && end) {
    const durationMs = end.getTime() - start.getTime();
    prevEnd = new Date(start.getTime() - 1);
    prevStart = new Date(prevEnd.getTime() - durationMs);
  }

  return { start, end, prevStart, prevEnd };
}

interface RpcSalesperson {
  name: string;
  revenue: number;
  profit: number;
  ordersClosed: number;
  ordersTouched: number;
  units: number;
  uniqueCustomers: number;
  avgOrderValue: number;
  profitMarginPct: number;
  older180DaysValue?: number;
  older365DaysValue?: number;
  totalValueCleared?: number;
  deadStockClearedPct?: number;
  itemsClearedCount?: number;
  avgDiscountPct?: number;
  highestDiscountPct?: number;
  revenueLostToDiscounts?: number;
  marginImpactPct?: number;
  approvalViolationsCount?: number;
  categoryBreakdown?: CategoryPerformance[];
  monthlyTrend?: Array<{
    month: string;
    revenue: number;
    profit: number;
    orders: number;
    aov: number;
    conversion?: number;
  }>;
  coSellingPartners?: CoSellingPartnerInfo[];
  discountViolations?: DiscountViolation[];
  salesHistory?: SalesHistoryEntry[];
}

interface RpcSummary {
  kpis: {
    totalTeamRevenue: number;
    totalGrossProfit: number;
    totalOrdersClosed: number;
    totalUnits: number;
    avgOrderValue: number;
    profitMarginPct: number;
    inventoryClearedValue?: number;
  };
  salespeople: RpcSalesperson[];
  coSellingPairs?: CoSellingPairSynergy[];
  teamCategoryMix?: CategoryPerformance[];
  teamMonthlyTrends?: Array<{
    month: string;
    revenue: number;
    profit: number;
    orders: number;
    aov: number;
    conversion?: number;
  }>;
}

async function fetchSummary(storeId: string | undefined, start: Date | null, end: Date | null): Promise<RpcSummary> {
  const { data, error } = await supabase.rpc('get_sales_intelligence_summary' as any, {
    _store_id: storeId || null,
    _start_date: start ? start.toISOString() : null,
    _end_date: end ? end.toISOString() : null,
  });
  if (error) throw error;
  return (data as unknown as RpcSummary) || { kpis: { totalTeamRevenue: 0, totalGrossProfit: 0, totalOrdersClosed: 0, totalUnits: 0, avgOrderValue: 0, profitMarginPct: 0 }, salespeople: [] };
}

function performanceTier(score: number): PerformanceTier {
  if (score >= 90) return 'Elite Performer';
  if (score >= 80) return 'High Performer';
  if (score >= 70) return 'Good Performer';
  if (score >= 55) return 'Average';
  return 'Needs Coaching';
}

function badgeStatus(score: number): 'Excellent' | 'Good' | 'Needs Attention' {
  if (score >= 80) return 'Excellent';
  if (score >= 55) return 'Good';
  return 'Needs Attention';
}

function toSalespersonPerformance(
  rp: RpcSalesperson,
  prev: RpcSalesperson | undefined,
  teamRevenue: number,
  teamProfit: number
): SalespersonPerformance {
  // Weighted score: revenue share (25) + profit share (25) + margin (25) + volume (25)
  const revShare = teamRevenue > 0 ? rp.revenue / teamRevenue : 0;
  const profShare = teamProfit > 0 ? rp.profit / teamProfit : 0;
  const marginNorm = Math.min(1, Math.max(0, rp.profitMarginPct / 40));
  const volumeNorm = Math.min(1, rp.ordersClosed / 20);
  const score = Math.round((revShare * 25) + (profShare * 25) + (marginNorm * 25) + (volumeNorm * 25));

  const prevRev = prev?.revenue ?? 0;
  const trendPct = prevRev > 0 ? Number((((rp.revenue - prevRev) / prevRev) * 100).toFixed(1)) : 0;

  const initials = rp.name
    .split(/[\s,]+/)
    .filter(Boolean)
    .map((n) => n[0]?.toUpperCase() || '')
    .join('')
    .slice(0, 2);

  return {
    id: rp.name,
    name: rp.name,
    email: '',
    role: 'Salesperson',
    avatarUrl: `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(rp.name)}`,
    branchId: '',
    branchName: '',

    monthlyRevenue: Math.round(rp.revenue),
    prevMonthRevenue: Math.round(prevRev),
    quarterlyRevenue: 0,
    yearlyRevenue: 0,
    soloRevenue: Math.round(rp.revenue),
    sharedRevenue: 0,

    monthlyProfit: Math.round(rp.profit),
    prevMonthProfit: Math.round(prev?.profit ?? 0),
    profitMarginPct: rp.profitMarginPct,
    avgMarginPerSale: rp.ordersClosed > 0 ? Math.round(rp.profit / rp.ordersClosed) : 0,

    ordersClosed: Math.round(rp.ordersClosed),
    prevMonthOrders: Math.round(prev?.ordersClosed ?? 0),
    unitsSold: Math.round(rp.units),
    avgOrderValue: rp.avgOrderValue,
    prevMonthAOV: prev?.avgOrderValue ?? 0,
    avgSellingPrice: rp.units > 0 ? Math.round(rp.revenue / rp.units) : 0,
    conversionRatePct: 0,
    prevMonthConversionRatePct: 0,

    monthlyTarget: 0,
    currentAchievement: Math.round(rp.revenue),
    remainingTarget: 0,
    forecastAchievement: 0,
    achievementPct: 0,

    older180DaysValue: Math.round(rp.older180DaysValue ?? 0),
    older365DaysValue: Math.round(rp.older365DaysValue ?? 0),
    totalValueCleared: Math.round(rp.totalValueCleared ?? 0),
    deadStockClearedPct: rp.deadStockClearedPct ?? 0,
    itemsClearedCount: Math.round(rp.itemsClearedCount ?? 0),

    heroProductsSold: 0,
    fastMovingSold: 0,
    slowMovingCleared: 0,
    premiumProductsSold: 0,
    categoryBreakdown: rp.categoryBreakdown || [],
    topCategory: (rp.categoryBreakdown && rp.categoryBreakdown.length > 0)
      ? [...rp.categoryBreakdown].sort((a, b) => b.revenue - a.revenue)[0].category
      : '—',

    repeatCustomersCount: rp.uniqueCustomers,
    newCustomersCount: 0,
    csatScore: 0,
    returnsCount: 0,
    refundsAmount: 0,
    complaintsCount: 0,
    deliveryIssuesCount: 0,

    avgDiscountPct: rp.avgDiscountPct ?? 0,
    highestDiscountPct: rp.highestDiscountPct ?? 0,
    revenueLostToDiscounts: rp.revenueLostToDiscounts ?? 0,
    marginImpactPct: rp.marginImpactPct ?? 0,
    approvalViolationsCount: rp.approvalViolationsCount ?? 0,
    discountViolations: rp.discountViolations || [],

    performanceScore: score,
    scoreTier: performanceTier(score),
    scoreBadgeLabel: `${score} — ${performanceTier(score)}`,
    scoreBreakdown: {
      revenueScore: Math.round(revShare * 25 * 10) / 10,
      profitScore: Math.round(profShare * 25 * 10) / 10,
      targetScore: 0,
      clearanceScore: 0,
      csatScore: 0,
      productMixScore: 0,
      repeatCustomerScore: 0,
      totalScore: score,
    },
    trendVsLastMonth: trendPct > 1 ? 'up' : trendPct < -1 ? 'down' : 'stable',
    trendPctChange: trendPct,
    badgeStatus: badgeStatus(score),

    coSellingPartners: rp.coSellingPartners || [],
    coSellingDealsCount: rp.ordersTouched - Math.round(rp.ordersClosed),

    coachingRecommendations: [],
    salesHistory: rp.salesHistory || [],
    monthlyTrend: rp.monthlyTrend || [],
  };
}

export function useSalesIntelligence(filters: SalesIntelligenceFilters = {}) {
  return useQuery<SalesIntelligenceSummary>({
    queryKey: ['sales_intelligence_analytics_v2', filters],
    queryFn: async () => {
      const { start, end, prevStart, prevEnd } = computeRange(filters);
      const storeId = filters.storeId && filters.storeId !== 'all' ? filters.storeId : undefined;

      const [current, previous] = await Promise.all([
        fetchSummary(storeId, start, end),
        fetchSummary(storeId, prevStart, prevEnd),
      ]);

      const prevByName = new Map(previous.salespeople.map((p) => [p.name.toUpperCase(), p]));

      let salespeople = current.salespeople.map((rp) =>
        toSalespersonPerformance(rp, prevByName.get(rp.name.toUpperCase()), current.kpis.totalTeamRevenue, current.kpis.totalGrossProfit)
      );

      // Client filters
      if (filters.salespersonId && filters.salespersonId !== 'all') {
        salespeople = salespeople.filter((sp) => sp.id === filters.salespersonId);
      }
      if (filters.searchQuery) {
        const q = filters.searchQuery.toLowerCase();
        salespeople = salespeople.filter((sp) => sp.name.toLowerCase().includes(q));
      }
      if (filters.minRevenue !== undefined) salespeople = salespeople.filter((sp) => sp.monthlyRevenue >= (filters.minRevenue || 0));
      if (filters.maxRevenue !== undefined && filters.maxRevenue > 0) salespeople = salespeople.filter((sp) => sp.monthlyRevenue <= filters.maxRevenue!);
      if (filters.minMargin !== undefined) salespeople = salespeople.filter((sp) => sp.profitMarginPct >= (filters.minMargin || 0));
      if (filters.maxMargin !== undefined && filters.maxMargin > 0) salespeople = salespeople.filter((sp) => sp.profitMarginPct <= filters.maxMargin!);

      // Team KPIs
      const totalTeamRevenue = current.kpis.totalTeamRevenue;
      const prevTeamRevenue = previous.kpis.totalTeamRevenue;
      const totalGrossProfit = current.kpis.totalGrossProfit;
      const prevGrossProfit = previous.kpis.totalGrossProfit;
      const totalOrdersClosed = current.kpis.totalOrdersClosed;
      const prevOrdersClosed = previous.kpis.totalOrdersClosed;
      const avgOrderValue = current.kpis.avgOrderValue;
      const prevAvgOrderValue = previous.kpis.avgOrderValue;

      const sortedByScore = [...salespeople].sort((a, b) => b.performanceScore - a.performanceScore);
      const best = sortedByScore[0];
      const sortedByImprovement = [...salespeople].sort((a, b) => b.trendPctChange - a.trendPctChange);
      const mostImp = sortedByImprovement[0];

      const empty = { id: '', name: '—', avatarUrl: '', revenue: 0, profit: 0, score: 0 };

      const kpis: ExecutiveKpis = {
        totalTeamRevenue,
        prevTeamRevenue,
        totalGrossProfit,
        prevGrossProfit,
        totalOrdersClosed,
        prevOrdersClosed,
        avgOrderValue,
        prevAvgOrderValue,
        teamConversionRate: 0,
        prevTeamConversionRate: 0,
        inventoryClearedValue: current.kpis.inventoryClearedValue ?? 0,
        prevInventoryClearedValue: previous.kpis.inventoryClearedValue ?? 0,
        bestPerformer: best
          ? { id: best.id, name: best.name, avatarUrl: best.avatarUrl, revenue: best.monthlyRevenue, profit: best.monthlyProfit, score: best.performanceScore }
          : empty,
        mostImproved: mostImp
          ? { id: mostImp.id, name: mostImp.name, avatarUrl: mostImp.avatarUrl, improvementPct: mostImp.trendPctChange, reason: `${mostImp.trendPctChange >= 0 ? '+' : ''}${mostImp.trendPctChange}% vs prev period` }
          : { id: '', name: '—', avatarUrl: '', improvementPct: 0, reason: '' },
      };

      // Insights based on real data
      const insights: AIBusinessInsight[] = [];
      if (best && best.monthlyProfit > 0) {
        insights.push({
          id: 'best-profit',
          title: 'Top Profit Contributor',
          type: 'highlight',
          salespersonName: best.name,
          metricBadge: `${best.profitMarginPct}% Margin`,
          description: `${best.name} generated ₹${best.monthlyProfit.toLocaleString('en-IN')} in gross profit this period at ${best.profitMarginPct}% margin.`,
        });
      }
      if (mostImp && mostImp.trendPctChange > 0) {
        insights.push({
          id: 'most-improved',
          title: 'Fastest Growing Salesperson',
          type: 'success',
          salespersonName: mostImp.name,
          metricBadge: `+${mostImp.trendPctChange}% vs prev`,
          description: `${mostImp.name}'s revenue grew ${mostImp.trendPctChange}% compared to the previous period.`,
        });
      }
      const lowMargin = salespeople.find((sp) => sp.profitMarginPct > 0 && sp.profitMarginPct < 10);
      if (lowMargin) {
        insights.push({
          id: 'low-margin',
          title: 'Margin Watch',
          type: 'warning',
          salespersonName: lowMargin.name,
          metricBadge: `${lowMargin.profitMarginPct}% Margin`,
          description: `${lowMargin.name}'s gross margin is below 10%. Review discounts and product mix.`,
        });
      }

      return {
        kpis,
        insights,
        salespeople,
        coSellingPairs: current.coSellingPairs || [],
        teamCategoryMix: current.teamCategoryMix || [],
        teamMonthlyTrends: current.teamMonthlyTrends || [],
      };
    },
    staleTime: 60 * 1000,
  });
}
