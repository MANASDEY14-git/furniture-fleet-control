import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export type PerformanceTier = 'Elite Performer' | 'High Performer' | 'Good Performer' | 'Average' | 'Needs Coaching';

export interface ScoreBreakdown {
  revenueScore: number;         // Max 25
  profitScore: number;          // Max 25
  targetScore: number;          // Max 15
  clearanceScore: number;       // Max 15
  csatScore: number;            // Max 10
  productMixScore: number;      // Max 5
  repeatCustomerScore: number;  // Max 5
  totalScore: number;           // 0 - 100
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
  synergyBoostPct: number; // e.g. +24% higher AOV together
}

export interface SalespersonPerformance {
  id: string;
  name: string;
  email: string;
  role: string;
  avatarUrl: string;
  branchId: string;
  branchName: string;
  
  // Revenue & Profit metrics (includes 50-50 co-selling splits)
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

  // Sales Activity
  ordersClosed: number;
  prevMonthOrders: number;
  unitsSold: number;
  avgOrderValue: number;
  prevMonthAOV: number;
  avgSellingPrice: number;
  conversionRatePct: number;
  prevMonthConversionRatePct: number;

  // Target Achievement
  monthlyTarget: number;
  currentAchievement: number;
  remainingTarget: number;
  forecastAchievement: number;
  achievementPct: number;

  // Inventory Clearance Contribution (Dead Stock Conversion)
  older180DaysValue: number;
  older365DaysValue: number;
  totalValueCleared: number;
  deadStockClearedPct: number;
  itemsClearedCount: number;

  // Product Mix & Category Performance
  heroProductsSold: number;
  fastMovingSold: number;
  slowMovingCleared: number;
  premiumProductsSold: number;
  categoryBreakdown: CategoryPerformance[];
  topCategory: string;

  // Customer Performance & Satisfaction
  repeatCustomersCount: number;
  newCustomersCount: number;
  csatScore: number; // 0 - 5 or 0 - 100
  returnsCount: number;
  refundsAmount: number;
  complaintsCount: number;
  deliveryIssuesCount: number;

  // Discount Behavior & Violations
  avgDiscountPct: number;
  highestDiscountPct: number;
  revenueLostToDiscounts: number;
  marginImpactPct: number;
  approvalViolationsCount: number;
  discountViolations: DiscountViolation[];

  // Weighted Performance Score (0-100)
  performanceScore: number;
  scoreTier: PerformanceTier;
  scoreBadgeLabel: string; // e.g. "92 — Elite Performer"
  scoreBreakdown: ScoreBreakdown;
  trendVsLastMonth: 'up' | 'down' | 'stable';
  trendPctChange: number;
  badgeStatus: 'Excellent' | 'Good' | 'Needs Attention';

  // Co-Selling Duo Partners
  coSellingPartners: CoSellingPartnerInfo[];
  coSellingDealsCount: number;

  // Coaching & History
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
  aovBoostPct: number; // e.g. +32%
  duoConversionRate: number;
  synergyScore: number; // 0 - 100
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

// ───────────────────────────────────────────────────────────────────────────
// Default Furniture Sales Team Data Engine (with 50-50 split & real metrics)
// ───────────────────────────────────────────────────────────────────────────

const INITIAL_SALESPEOPLE: SalespersonPerformance[] = [
  {
    id: 'sp-1',
    name: 'Rahul Sharma',
    email: 'rahul.sharma@furniturefleet.com',
    role: 'Senior Sales Consultant',
    avatarUrl: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&q=80&w=200',
    branchId: '1',
    branchName: 'Downtown Flagship',

    monthlyRevenue: 1840000,
    prevMonthRevenue: 1650000,
    quarterlyRevenue: 5200000,
    yearlyRevenue: 19800000,
    soloRevenue: 1420000,
    sharedRevenue: 420000,

    monthlyProfit: 644000, // 35% margin! Highest profit despite #3 in revenue
    prevMonthProfit: 544500,
    profitMarginPct: 35.0,
    avgMarginPerSale: 24769,

    ordersClosed: 26,
    prevMonthOrders: 23,
    unitsSold: 42,
    avgOrderValue: 70769,
    prevMonthAOV: 71739,
    avgSellingPrice: 43809,
    conversionRatePct: 38.5,
    prevMonthConversionRatePct: 34.0,

    monthlyTarget: 1700000,
    currentAchievement: 1840000,
    remainingTarget: 0,
    forecastAchievement: 1950000,
    achievementPct: 108.2,

    older180DaysValue: 320000,
    older365DaysValue: 480000,
    totalValueCleared: 800000,
    deadStockClearedPct: 28.5,
    itemsClearedCount: 14,

    heroProductsSold: 9,
    fastMovingSold: 18,
    slowMovingCleared: 11,
    premiumProductsSold: 15,
    topCategory: 'Sofa',
    categoryBreakdown: [
      { category: 'Sofa', revenue: 920000, profit: 340000, units: 14, avgMargin: 37.0 },
      { category: 'Dining', revenue: 450000, profit: 160000, units: 8, avgMargin: 35.5 },
      { category: 'Bed', revenue: 270000, profit: 94500, units: 6, avgMargin: 35.0 },
      { category: 'Chairs', revenue: 110000, profit: 34500, units: 10, avgMargin: 31.3 },
      { category: 'Wardrobe', revenue: 50000, profit: 15000, units: 2, avgMargin: 30.0 },
      { category: 'Office Furniture', revenue: 40000, profit: 0, units: 2, avgMargin: 0 },
    ],

    repeatCustomersCount: 16,
    newCustomersCount: 10,
    csatScore: 4.85, // out of 5
    returnsCount: 0,
    refundsAmount: 0,
    complaintsCount: 0,
    deliveryIssuesCount: 1,

    avgDiscountPct: 3.2,
    highestDiscountPct: 7.0,
    revenueLostToDiscounts: 60800,
    marginImpactPct: 1.1,
    approvalViolationsCount: 0,
    discountViolations: [],

    performanceScore: 92,
    scoreTier: 'Elite Performer',
    scoreBadgeLabel: '92 — Elite Performer',
    badgeStatus: 'Excellent',
    trendVsLastMonth: 'up',
    trendPctChange: 11.5,
    scoreBreakdown: {
      revenueScore: 23,
      profitScore: 25, // Max profit!
      targetScore: 15,
      clearanceScore: 12,
      csatScore: 9.7,
      productMixScore: 3.8,
      repeatCustomerScore: 3.5,
      totalScore: 92,
    },

    coSellingPartners: [
      {
        partnerId: 'sp-2',
        partnerName: 'Amit Verma',
        partnerAvatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&q=80&w=200',
        coClosedOrders: 6,
        sharedRevenue: 420000,
        sharedProfit: 147000,
        avgOrderValue: 70000,
        conversionRatePct: 42.0,
        synergyBoostPct: 18.5,
      }
    ],
    coSellingDealsCount: 6,

    coachingRecommendations: [
      {
        id: 'c-1',
        title: 'Cross-Sell Wardrobes & Storage',
        type: 'cross_selling',
        urgency: 'HIGH',
        description: 'Rahul consistently sells premium sofas with excellent profit margins (37%) but has very low wardrobe sales (only ₹50,000).',
        actionItem: 'Recommend cross-selling wardrobes and bedroom storage during living room consultations.',
      },
      {
        id: 'c-2',
        title: 'Share Aged Inventory Tactics',
        type: 'inventory_clearance',
        urgency: 'MEDIUM',
        description: 'Rahul cleared ₹8.0 lakh worth of aged stock maintaining 35% margin.',
        actionItem: 'Invite Rahul to run a 15-min team workshop on value positioning aged stock.',
      }
    ],

    salesHistory: [
      {
        id: 'sh-101',
        date: '2026-07-20',
        orderNumber: 'SO-2026-881',
        customerName: 'Mehta Residences',
        customerType: 'VIP',
        itemName: 'Chesterfield Italian Leather 3-Seater Sofa',
        category: 'Sofa',
        quantity: 2,
        saleAmount: 240000,
        costAmount: 144000,
        grossProfit: 96000,
        discountPct: 4.0,
        isCoAttended: false,
        mySplitRevenue: 240000,
        mySplitProfit: 96000,
        mySplitCommission: 12000,
        stockAgeDays: 210,
      },
      {
        id: 'sh-102',
        date: '2026-07-18',
        orderNumber: 'SO-2026-872',
        customerName: 'Anand Villa (Co-Attended with Amit)',
        customerType: 'Repeat',
        itemName: 'Royal Solid Teak 8-Seater Dining Set',
        category: 'Dining',
        quantity: 1,
        saleAmount: 280000,
        costAmount: 175000,
        grossProfit: 105000,
        discountPct: 2.0,
        isCoAttended: true,
        coAttendedWith: 'Amit Verma',
        mySplitRevenue: 140000, // 50% split!
        mySplitProfit: 52500,  // 50% split!
        mySplitCommission: 7000,
        stockAgeDays: 390,
      }
    ],

    monthlyTrend: [
      { month: 'Feb', revenue: 1400000, profit: 460000, orders: 20, aov: 70000, conversion: 32 },
      { month: 'Mar', revenue: 1550000, profit: 510000, orders: 22, aov: 70454, conversion: 34 },
      { month: 'Apr', revenue: 1600000, profit: 540000, orders: 23, aov: 69565, conversion: 35 },
      { month: 'May', revenue: 1620000, profit: 535000, orders: 22, aov: 73636, conversion: 33 },
      { month: 'Jun', revenue: 1650000, profit: 544500, orders: 23, aov: 71739, conversion: 34 },
      { month: 'Jul', revenue: 1840000, profit: 644000, orders: 26, aov: 70769, conversion: 38.5 },
    ]
  },
  {
    id: 'sp-2',
    name: 'Amit Verma',
    email: 'amit.verma@furniturefleet.com',
    role: 'Key Account Executive',
    avatarUrl: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&q=80&w=200',
    branchId: '1',
    branchName: 'Downtown Flagship',

    monthlyRevenue: 2250000, // Highest revenue, but lower profit due to heavy discounts!
    prevMonthRevenue: 2100000,
    quarterlyRevenue: 6400000,
    yearlyRevenue: 24500000,
    soloRevenue: 1830000,
    sharedRevenue: 420000,

    monthlyProfit: 450000, // 20% margin
    prevMonthProfit: 441000,
    profitMarginPct: 20.0,
    avgMarginPerSale: 10465,

    ordersClosed: 43, // Most units & orders!
    prevMonthOrders: 39,
    unitsSold: 78,
    avgOrderValue: 52325,
    prevMonthAOV: 53846,
    avgSellingPrice: 28846,
    conversionRatePct: 41.2,
    prevMonthConversionRatePct: 39.5,

    monthlyTarget: 2000000,
    currentAchievement: 2250000,
    remainingTarget: 0,
    forecastAchievement: 2400000,
    achievementPct: 112.5,

    older180DaysValue: 150000,
    older365DaysValue: 80000,
    totalValueCleared: 230000,
    deadStockClearedPct: 8.2,
    itemsClearedCount: 5,

    heroProductsSold: 14,
    fastMovingSold: 45,
    slowMovingCleared: 3,
    premiumProductsSold: 8,
    topCategory: 'Dining',
    categoryBreakdown: [
      { category: 'Dining', revenue: 950000, profit: 190000, units: 28, avgMargin: 20.0 },
      { category: 'Sofa', revenue: 650000, profit: 130000, units: 20, avgMargin: 20.0 },
      { category: 'Bed', revenue: 400000, profit: 80000, units: 15, avgMargin: 20.0 },
      { category: 'Chairs', revenue: 150000, profit: 30000, units: 10, avgMargin: 20.0 },
      { category: 'Storage', revenue: 100000, profit: 20000, units: 5, avgMargin: 20.0 },
    ],

    repeatCustomersCount: 12,
    newCustomersCount: 31,
    csatScore: 4.15,
    returnsCount: 2,
    refundsAmount: 45000,
    complaintsCount: 3,
    deliveryIssuesCount: 2,

    avgDiscountPct: 14.8, // Heavy discount reliance!
    highestDiscountPct: 24.0,
    revenueLostToDiscounts: 391000,
    marginImpactPct: 8.5,
    approvalViolationsCount: 4, // Flagged violations
    discountViolations: [
      {
        id: 'dv-1',
        date: '2026-07-15',
        orderNumber: 'SO-2026-845',
        customerName: 'Horizon Tech Corp',
        discountPct: 22.0,
        approvedBy: 'Self-Approved',
        revenueLost: 110000,
        reason: 'Unapproved bulk discount beyond 15% threshold limit.',
        status: 'Flagged',
      },
      {
        id: 'dv-2',
        date: '2026-07-12',
        orderNumber: 'SO-2026-820',
        customerName: 'Skyline Cafe',
        discountPct: 24.0,
        approvedBy: 'Self-Approved',
        revenueLost: 72000,
        reason: 'Exceeded maximum allowable manager discount without signoff.',
        status: 'Flagged',
      }
    ],

    performanceScore: 81,
    scoreTier: 'High Performer',
    scoreBadgeLabel: '81 — High Performer',
    badgeStatus: 'Good',
    trendVsLastMonth: 'stable',
    trendPctChange: 1.2,
    scoreBreakdown: {
      revenueScore: 25, // Top revenue
      profitScore: 14.2, // Deducted due to low 20% margin & discount loss
      targetScore: 15,
      clearanceScore: 4.5,
      csatScore: 8.3,
      productMixScore: 4.0,
      repeatCustomerScore: 2.8,
      totalScore: 81,
    },

    coSellingPartners: [
      {
        partnerId: 'sp-1',
        partnerName: 'Rahul Sharma',
        partnerAvatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&q=80&w=200',
        coClosedOrders: 6,
        sharedRevenue: 420000,
        sharedProfit: 147000,
        avgOrderValue: 70000,
        conversionRatePct: 42.0,
        synergyBoostPct: 24.0,
      },
      {
        partnerId: 'sp-3',
        partnerName: 'Rajiv Patel',
        partnerAvatar: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&q=80&w=200',
        coClosedOrders: 8,
        sharedRevenue: 680000,
        sharedProfit: 170000,
        avgOrderValue: 85000,
        conversionRatePct: 46.5,
        synergyBoostPct: 32.0, // High co-selling synergy!
      }
    ],
    coSellingDealsCount: 14,

    coachingRecommendations: [
      {
        id: 'c-3',
        title: 'Value-Based Selling & Discount Control',
        type: 'discount_control',
        urgency: 'HIGH',
        description: 'Amit sold the most units (78) but relied heavily on discounts (avg 14.8%), giving away ₹3.91 lakh in margin.',
        actionItem: 'Conduct value-based objection handling training and enforce discount threshold approval gates.',
      },
      {
        id: 'c-4',
        title: 'Pair with Rajiv on Enterprise Deals',
        type: 'synergy',
        urgency: 'MEDIUM',
        description: 'Amit & Rajiv co-closed 8 deals generating ₹6.8L at +32% higher AOV than Amit solo.',
        actionItem: 'Pair Amit with Rajiv for corporate & living room combo leads to maintain price discipline.',
      }
    ],

    salesHistory: [
      {
        id: 'sh-201',
        date: '2026-07-21',
        orderNumber: 'SO-2026-890',
        customerName: 'Grand Hotel Suites (Co-Attended with Rajiv)',
        customerType: 'Corporate',
        itemName: 'Executive Ergonomic Mesh Office Chairs (Bulk 20x)',
        category: 'Office Furniture',
        quantity: 20,
        saleAmount: 360000,
        costAmount: 270000,
        grossProfit: 90000,
        discountPct: 15.0,
        isCoAttended: true,
        coAttendedWith: 'Rajiv Patel',
        mySplitRevenue: 180000, // 50% split!
        mySplitProfit: 45000,   // 50% split!
        mySplitCommission: 9000,
        stockAgeDays: 45,
      }
    ],

    monthlyTrend: [
      { month: 'Feb', revenue: 1800000, profit: 360000, orders: 34, aov: 52941, conversion: 38 },
      { month: 'Mar', revenue: 1950000, profit: 390000, orders: 36, aov: 54166, conversion: 39 },
      { month: 'Apr', revenue: 2000000, profit: 400000, orders: 38, aov: 52631, conversion: 40 },
      { month: 'May', revenue: 2050000, profit: 410000, orders: 38, aov: 53947, conversion: 40.5 },
      { month: 'Jun', revenue: 2100000, profit: 441000, orders: 39, aov: 53846, conversion: 39.5 },
      { month: 'Jul', revenue: 2250000, profit: 450000, orders: 43, aov: 52325, conversion: 41.2 },
    ]
  },
  {
    id: 'sp-3',
    name: 'Priya Patel',
    email: 'priya.patel@furniturefleet.com',
    role: 'Inventory & Retail Specialist',
    avatarUrl: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?auto=format&fit=crop&q=80&w=200',
    branchId: '2',
    branchName: 'Suburban Outlet',

    monthlyRevenue: 1920000,
    prevMonthRevenue: 1580000,
    quarterlyRevenue: 5100000,
    yearlyRevenue: 18200000,
    soloRevenue: 1580000,
    sharedRevenue: 340000,

    monthlyProfit: 614400, // 32.0% margin! Champion in clearance!
    prevMonthProfit: 474000,
    profitMarginPct: 32.0,
    avgMarginPerSale: 21942,

    ordersClosed: 28,
    prevMonthOrders: 22,
    unitsSold: 51,
    avgOrderValue: 68571,
    prevMonthAOV: 71818,
    avgSellingPrice: 37647,
    conversionRatePct: 44.0,
    prevMonthConversionRatePct: 36.5,

    monthlyTarget: 1600000,
    currentAchievement: 1920000,
    remainingTarget: 0,
    forecastAchievement: 2050000,
    achievementPct: 120.0,

    older180DaysValue: 420000,
    older365DaysValue: 840000, // ₹8.4 Lakh aged stock cleared! Prompt star!
    totalValueCleared: 1260000,
    deadStockClearedPct: 46.2, // Highest dead stock conversion!
    itemsClearedCount: 22,

    heroProductsSold: 8,
    fastMovingSold: 16,
    slowMovingCleared: 22,
    premiumProductsSold: 12,
    topCategory: 'Wardrobe',
    categoryBreakdown: [
      { category: 'Wardrobe', revenue: 780000, profit: 249600, units: 16, avgMargin: 32.0 },
      { category: 'Bed', revenue: 540000, profit: 172800, units: 14, avgMargin: 32.0 },
      { category: 'Storage', revenue: 320000, profit: 102400, units: 12, avgMargin: 32.0 },
      { category: 'Sofa', revenue: 180000, profit: 57600, units: 5, avgMargin: 32.0 },
      { category: 'Mattress', revenue: 100000, profit: 32000, units: 4, avgMargin: 32.0 },
    ],

    repeatCustomersCount: 18,
    newCustomersCount: 10,
    csatScore: 4.92, // Top CSAT
    returnsCount: 0,
    refundsAmount: 0,
    complaintsCount: 0,
    deliveryIssuesCount: 0,

    avgDiscountPct: 4.5,
    highestDiscountPct: 9.0,
    revenueLostToDiscounts: 86400,
    marginImpactPct: 1.4,
    approvalViolationsCount: 0,
    discountViolations: [],

    performanceScore: 94, // Highest overall score!
    scoreTier: 'Elite Performer',
    scoreBadgeLabel: '94 — Elite Performer',
    badgeStatus: 'Excellent',
    trendVsLastMonth: 'up',
    trendPctChange: 21.5,
    scoreBreakdown: {
      revenueScore: 23.5,
      profitScore: 23.8,
      targetScore: 15,
      clearanceScore: 15, // Max inventory clearance!
      csatScore: 9.8,
      productMixScore: 4.2,
      repeatCustomerScore: 4.2,
      totalScore: 94,
    },

    coSellingPartners: [
      {
        partnerId: 'sp-2',
        partnerName: 'Amit Verma',
        partnerAvatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&q=80&w=200',
        coClosedOrders: 8,
        sharedRevenue: 680000,
        sharedProfit: 170000,
        avgOrderValue: 85000,
        conversionRatePct: 46.5,
        synergyBoostPct: 32.0,
      }
    ],
    coSellingDealsCount: 8,

    coachingRecommendations: [
      {
        id: 'c-5',
        title: 'Masterclass Speaker on Aged Inventory Clearance',
        type: 'inventory_clearance',
        urgency: 'LOW',
        description: 'Priya cleared ₹8.4 lakh worth of inventory older than 365 days while keeping a 32% margin.',
        actionItem: 'Have Priya present her aged inventory bundling techniques at the next regional sales summit.',
      }
    ],

    salesHistory: [
      {
        id: 'sh-301',
        date: '2026-07-19',
        orderNumber: 'SO-2026-860',
        customerName: 'Oberoi Family',
        customerType: 'Repeat',
        itemName: 'Solid Walnut Quad Wardrobe + Matching Dresser',
        category: 'Wardrobe',
        quantity: 1,
        saleAmount: 310000,
        costAmount: 200000,
        grossProfit: 110000,
        discountPct: 3.0,
        isCoAttended: false,
        mySplitRevenue: 310000,
        mySplitProfit: 110000,
        mySplitCommission: 15500,
        stockAgeDays: 410,
      }
    ],

    monthlyTrend: [
      { month: 'Feb', revenue: 1350000, profit: 405000, orders: 19, aov: 71052, conversion: 34 },
      { month: 'Mar', revenue: 1420000, profit: 426000, orders: 20, aov: 71000, conversion: 35 },
      { month: 'Apr', revenue: 1500000, profit: 450000, orders: 21, aov: 71428, conversion: 36 },
      { month: 'May', revenue: 1520000, profit: 456000, orders: 21, aov: 72380, conversion: 36 },
      { month: 'Jun', revenue: 1580000, profit: 474000, orders: 22, aov: 71818, conversion: 36.5 },
      { month: 'Jul', revenue: 1920000, profit: 614400, orders: 28, aov: 68571, conversion: 44.0 },
    ]
  },
  {
    id: 'sp-4',
    name: 'Ananya Sen',
    email: 'ananya.sen@furniturefleet.com',
    role: 'Interior Design Consultant',
    avatarUrl: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?auto=format&fit=crop&q=80&w=200',
    branchId: '1',
    branchName: 'Downtown Flagship',

    monthlyRevenue: 1450000,
    prevMonthRevenue: 1320000,
    quarterlyRevenue: 4100000,
    yearlyRevenue: 15400000,
    soloRevenue: 1250000,
    sharedRevenue: 200000,

    monthlyProfit: 435000, // 30.0% margin
    prevMonthProfit: 396000,
    profitMarginPct: 30.0,
    avgMarginPerSale: 21750,

    ordersClosed: 20,
    prevMonthOrders: 18,
    unitsSold: 32,
    avgOrderValue: 72500,
    prevMonthAOV: 73333,
    avgSellingPrice: 45312,
    conversionRatePct: 36.0,
    prevMonthConversionRatePct: 33.0,

    monthlyTarget: 1400000,
    currentAchievement: 1450000,
    remainingTarget: 0,
    forecastAchievement: 1520000,
    achievementPct: 103.5,

    older180DaysValue: 180000,
    older365DaysValue: 120000,
    totalValueCleared: 300000,
    deadStockClearedPct: 15.0,
    itemsClearedCount: 6,

    heroProductsSold: 7,
    fastMovingSold: 12,
    slowMovingCleared: 6,
    premiumProductsSold: 10,
    topCategory: 'Sofa',
    categoryBreakdown: [
      { category: 'Sofa', revenue: 620000, profit: 186000, units: 10, avgMargin: 30.0 },
      { category: 'Dining', revenue: 410000, profit: 123000, units: 8, avgMargin: 30.0 },
      { category: 'Bed', revenue: 280000, profit: 84000, units: 8, avgMargin: 30.0 },
      { category: 'Chairs', revenue: 140000, profit: 42000, units: 6, avgMargin: 30.0 },
    ],

    repeatCustomersCount: 14,
    newCustomersCount: 6,
    csatScore: 4.75,
    returnsCount: 0,
    refundsAmount: 0,
    complaintsCount: 0,
    deliveryIssuesCount: 0,

    avgDiscountPct: 5.0,
    highestDiscountPct: 10.0,
    revenueLostToDiscounts: 72500,
    marginImpactPct: 1.5,
    approvalViolationsCount: 0,
    discountViolations: [],

    performanceScore: 86,
    scoreTier: 'High Performer',
    scoreBadgeLabel: '86 — High Performer',
    badgeStatus: 'Good',
    trendVsLastMonth: 'up',
    trendPctChange: 9.8,
    scoreBreakdown: {
      revenueScore: 19.5,
      profitScore: 22.0,
      targetScore: 15.0,
      clearanceScore: 7.5,
      csatScore: 9.5,
      productMixScore: 4.5,
      repeatCustomerScore: 4.0,
      totalScore: 86,
    },

    coSellingPartners: [],
    coSellingDealsCount: 3,

    coachingRecommendations: [
      {
        id: 'c-6',
        title: 'Increase Walk-in Foot Traffic Conversions',
        type: 'premium_upsell',
        urgency: 'MEDIUM',
        description: 'Ananya has strong design skills and high CSAT (4.75) but lower overall traffic throughput.',
        actionItem: 'Assign high-intent custom villa leads directly to Ananya for full interior consultations.',
      }
    ],

    salesHistory: [],

    monthlyTrend: [
      { month: 'Feb', revenue: 1150000, profit: 345000, orders: 16, aov: 71875, conversion: 30 },
      { month: 'Mar', revenue: 1200000, profit: 360000, orders: 17, aov: 70588, conversion: 31 },
      { month: 'Apr', revenue: 1280000, profit: 384000, orders: 18, aov: 71111, conversion: 32 },
      { month: 'May', revenue: 1300000, profit: 390000, orders: 18, aov: 72222, conversion: 32.5 },
      { month: 'Jun', revenue: 1320000, profit: 396000, orders: 18, aov: 73333, conversion: 33.0 },
      { month: 'Jul', revenue: 1450000, profit: 435000, orders: 20, aov: 72500, conversion: 36.0 },
    ]
  },
  {
    id: 'sp-5',
    name: 'Vikram Malhotra',
    email: 'vikram.m@furniturefleet.com',
    role: 'Sales Representative',
    avatarUrl: 'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?auto=format&fit=crop&q=80&w=200',
    branchId: '3',
    branchName: 'Mall Experience Center',

    monthlyRevenue: 1100000,
    prevMonthRevenue: 1250000,
    quarterlyRevenue: 3600000,
    yearlyRevenue: 12800000,
    soloRevenue: 950000,
    sharedRevenue: 150000,

    monthlyProfit: 242000, // 22% margin
    prevMonthProfit: 275000,
    profitMarginPct: 22.0,
    avgMarginPerSale: 14235,

    ordersClosed: 17,
    prevMonthOrders: 19,
    unitsSold: 28,
    avgOrderValue: 64705,
    prevMonthAOV: 65789,
    avgSellingPrice: 39285,
    conversionRatePct: 28.0,
    prevMonthConversionRatePct: 31.0,

    monthlyTarget: 1500000,
    currentAchievement: 1100000,
    remainingTarget: 400000,
    forecastAchievement: 1220000,
    achievementPct: 73.3, // Missed target

    older180DaysValue: 90000,
    older365DaysValue: 40000,
    totalValueCleared: 130000,
    deadStockClearedPct: 6.0,
    itemsClearedCount: 3,

    heroProductsSold: 4,
    fastMovingSold: 18,
    slowMovingCleared: 3,
    premiumProductsSold: 4,
    topCategory: 'Office Furniture',
    categoryBreakdown: [
      { category: 'Office Furniture', revenue: 450000, profit: 99000, units: 12, avgMargin: 22.0 },
      { category: 'Chairs', revenue: 300000, profit: 66000, units: 10, avgMargin: 22.0 },
      { category: 'Dining', revenue: 200000, profit: 44000, units: 4, avgMargin: 22.0 },
      { category: 'Storage', revenue: 150000, profit: 33000, units: 2, avgMargin: 22.0 },
    ],

    repeatCustomersCount: 5,
    newCustomersCount: 12,
    csatScore: 3.85,
    returnsCount: 1,
    refundsAmount: 18000,
    complaintsCount: 2,
    deliveryIssuesCount: 1,

    avgDiscountPct: 11.2,
    highestDiscountPct: 18.0,
    revenueLostToDiscounts: 138000,
    marginImpactPct: 4.8,
    approvalViolationsCount: 1,
    discountViolations: [
      {
        id: 'dv-3',
        date: '2026-07-08',
        orderNumber: 'SO-2026-790',
        customerName: 'Alpha Tech Studio',
        discountPct: 18.0,
        approvedBy: 'Self-Approved',
        revenueLost: 36000,
        reason: 'Unapproved discount above 12% limit for office desks.',
        status: 'Flagged',
      }
    ],

    performanceScore: 54, // Below 55 -> Needs Coaching!
    scoreTier: 'Needs Coaching',
    scoreBadgeLabel: '54 — Needs Coaching',
    badgeStatus: 'Needs Attention',
    trendVsLastMonth: 'down',
    trendPctChange: -12.0,
    scoreBreakdown: {
      revenueScore: 15.0,
      profitScore: 14.5,
      targetScore: 8.5,
      clearanceScore: 3.0,
      csatScore: 7.7,
      productMixScore: 3.0,
      repeatCustomerScore: 2.3,
      totalScore: 54,
    },

    coSellingPartners: [],
    coSellingDealsCount: 2,

    coachingRecommendations: [
      {
        id: 'c-7',
        title: 'Closing Techniques & Discount Reduction',
        type: 'discount_control',
        urgency: 'HIGH',
        description: 'Vikram missed target by 26.7% and has declining conversion rates (28%). Office furniture sales declined despite higher footfalls.',
        actionItem: 'Shadow Rahul on sofa/living consultations and complete core negotiation modules.',
      }
    ],

    salesHistory: [],

    monthlyTrend: [
      { month: 'Feb', revenue: 1200000, profit: 288000, orders: 18, aov: 66666, conversion: 32 },
      { month: 'Mar', revenue: 1250000, profit: 300000, orders: 19, aov: 65789, conversion: 33 },
      { month: 'Apr', revenue: 1300000, profit: 312000, orders: 20, aov: 65000, conversion: 33 },
      { month: 'May', revenue: 1280000, profit: 294400, orders: 19, aov: 67368, conversion: 32 },
      { month: 'Jun', revenue: 1250000, profit: 275000, orders: 19, aov: 65789, conversion: 31 },
      { month: 'Jul', revenue: 1100000, profit: 242000, orders: 17, aov: 64705, conversion: 28.0 },
    ]
  }
];

const INITIAL_CO_SELLING_PAIRS: CoSellingPairSynergy[] = [
  {
    pairId: 'pair-1',
    person1Id: 'sp-2',
    person1Name: 'Amit Verma',
    person1Avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&q=80&w=200',
    person2Id: 'sp-3',
    person2Name: 'Priya Patel',
    person2Avatar: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?auto=format&fit=crop&q=80&w=200',
    totalCoClosedOrders: 8,
    totalSharedRevenue: 680000,
    totalSharedProfit: 217600,
    totalSharedCommission: 34000,
    duoAOV: 85000,
    soloAvgAOV: 60448,
    aovBoostPct: 40.6,
    duoConversionRate: 52.0,
    synergyScore: 96,
    topCategory: 'Wardrobe & Living Combos',
    aiInsight: 'Amit & Priya are the #1 sales duo! Amit brings volume traffic while Priya maintains price discipline and clears aged stock, boosting pair AOV by +40.6%.',
  },
  {
    pairId: 'pair-2',
    person1Id: 'sp-1',
    person1Name: 'Rahul Sharma',
    person1Avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&q=80&w=200',
    person2Id: 'sp-2',
    person2Name: 'Amit Verma',
    person2Avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&q=80&w=200',
    totalCoClosedOrders: 6,
    totalSharedRevenue: 420000,
    totalSharedProfit: 147000,
    totalSharedCommission: 21000,
    duoAOV: 70000,
    soloAvgAOV: 61547,
    aovBoostPct: 13.7,
    duoConversionRate: 42.0,
    synergyScore: 84,
    topCategory: 'Teak Dining Sets',
    aiInsight: 'Rahul & Amit close large family dining deals quickly. Rahul holds profit margin at 35% while Amit handles client negotiations.',
  }
];

const INITIAL_AI_INSIGHTS: AIBusinessInsight[] = [
  {
    id: 'ai-1',
    title: 'Profitability Leader Anomaly',
    type: 'highlight',
    salespersonId: 'sp-1',
    salespersonName: 'Rahul Sharma',
    metricBadge: '₹6.44L Profit (35% Margin)',
    description: 'Rahul generated the highest gross profit this month (₹6.44 Lakh) despite ranking third in top-line revenue, driven by premium Italian leather sofa sales.',
  },
  {
    id: 'ai-2',
    title: 'Discount Reliance Alert',
    type: 'warning',
    salespersonId: 'sp-2',
    salespersonName: 'Amit Verma',
    metricBadge: '14.8% Avg Discount',
    description: 'Amit sold the most total units (78) but relied heavily on discounts (avg 14.8%), eroding ₹3.91 lakh in gross margin across 4 flagged violations.',
  },
  {
    id: 'ai-3',
    title: 'Aged Inventory Champion',
    type: 'success',
    salespersonId: 'sp-3',
    salespersonName: 'Priya Patel',
    metricBadge: '₹8.4L Aged Stock Cleared',
    description: 'Priya cleared ₹8.4 lakh worth of inventory older than 365 days while sustaining an extraordinary 32.0% gross profit margin.',
  },
  {
    id: 'ai-4',
    title: 'Team Conversion Improvement',
    type: 'info',
    metricBadge: '+12.4% MoM Gain',
    description: 'Overall team conversion rate increased to 37.5% compared to 33.3% last month, boosted by co-selling consultations.',
  },
  {
    id: 'ai-5',
    title: 'Category Trend Warning',
    type: 'warning',
    metricBadge: 'Office Sales -14%',
    description: 'Office furniture sales have declined by 14% despite a 22% surge in customer inquiries. Review desk & ergonomic chair stock pricing.',
  },
  {
    id: 'ai-6',
    title: 'Co-Selling Duo Synergy',
    type: 'synergy',
    salespersonName: 'Amit & Priya',
    metricBadge: '+40.6% Duo AOV Boost',
    description: 'Amit and Priya close 40.6% higher order values when co-attending customers (₹85,000 Duo AOV vs ₹60,448 Solo).',
  }
];

// ───────────────────────────────────────────────────────────────────────────
// React Query Hook for Sales Performance Intelligence
// ───────────────────────────────────────────────────────────────────────────

export function useSalesIntelligence(filters: SalesIntelligenceFilters = {}) {
  return useQuery<SalesIntelligenceSummary>({
    queryKey: ['sales_intelligence_analytics', filters],
    queryFn: async () => {
      let salespeople = [...INITIAL_SALESPEOPLE];

      // 1. Filter by Branch / Store
      if (filters.storeId && filters.storeId !== 'all') {
        salespeople = salespeople.filter(sp => sp.branchId === filters.storeId);
      }

      // 2. Filter by Salesperson
      if (filters.salespersonId && filters.salespersonId !== 'all') {
        salespeople = salespeople.filter(sp => sp.id === filters.salespersonId);
      }

      // 3. Search Query Filter
      if (filters.searchQuery) {
        const q = filters.searchQuery.toLowerCase();
        salespeople = salespeople.filter(sp =>
          sp.name.toLowerCase().includes(q) ||
          sp.role.toLowerCase().includes(q) ||
          sp.branchName.toLowerCase().includes(q) ||
          sp.topCategory.toLowerCase().includes(q)
        );
      }

      // 4. Numeric Range Filters
      if (filters.minRevenue !== undefined) {
        salespeople = salespeople.filter(sp => sp.monthlyRevenue >= (filters.minRevenue || 0));
      }
      if (filters.maxRevenue !== undefined && filters.maxRevenue > 0) {
        salespeople = salespeople.filter(sp => sp.monthlyRevenue <= (filters.maxRevenue || Infinity));
      }

      if (filters.minMargin !== undefined) {
        salespeople = salespeople.filter(sp => sp.profitMarginPct >= (filters.minMargin || 0));
      }
      if (filters.maxMargin !== undefined && filters.maxMargin > 0) {
        salespeople = salespeople.filter(sp => sp.profitMarginPct <= (filters.maxMargin || 100));
      }

      if (filters.minTargetPct !== undefined) {
        salespeople = salespeople.filter(sp => sp.achievementPct >= (filters.minTargetPct || 0));
      }
      if (filters.maxTargetPct !== undefined && filters.maxTargetPct > 0) {
        salespeople = salespeople.filter(sp => sp.achievementPct <= (filters.maxTargetPct || 500));
      }

      // Compute Team Macro KPI Totals
      const totalTeamRevenue = salespeople.reduce((acc, s) => acc + s.monthlyRevenue, 0);
      const prevTeamRevenue = salespeople.reduce((acc, s) => acc + s.prevMonthRevenue, 0);

      const totalGrossProfit = salespeople.reduce((acc, s) => acc + s.monthlyProfit, 0);
      const prevGrossProfit = salespeople.reduce((acc, s) => acc + s.prevMonthProfit, 0);

      const totalOrdersClosed = salespeople.reduce((acc, s) => acc + s.ordersClosed, 0);
      const prevOrdersClosed = salespeople.reduce((acc, s) => acc + s.prevMonthOrders, 0);

      const avgOrderValue = totalOrdersClosed > 0 ? Math.round(totalTeamRevenue / totalOrdersClosed) : 0;
      const prevAvgOrderValue = prevOrdersClosed > 0 ? Math.round(prevTeamRevenue / prevOrdersClosed) : 0;

      const teamConversionRate = salespeople.length > 0
        ? Number((salespeople.reduce((acc, s) => acc + s.conversionRatePct, 0) / salespeople.length).toFixed(1))
        : 0;
      const prevTeamConversionRate = salespeople.length > 0
        ? Number((salespeople.reduce((acc, s) => acc + s.prevMonthConversionRatePct, 0) / salespeople.length).toFixed(1))
        : 0;

      const inventoryClearedValue = salespeople.reduce((acc, s) => acc + s.totalValueCleared, 0);
      const prevInventoryClearedValue = Math.round(inventoryClearedValue * 0.84);

      // Best Performer
      const sortedByScore = [...salespeople].sort((a, b) => b.performanceScore - a.performanceScore);
      const best = sortedByScore[0] || salespeople[0];

      // Most Improved
      const sortedByImprovement = [...salespeople].sort((a, b) => b.trendPctChange - a.trendPctChange);
      const mostImp = sortedByImprovement[0] || salespeople[0];

      const kpis: ExecutiveKpis = {
        totalTeamRevenue,
        prevTeamRevenue,
        totalGrossProfit,
        prevGrossProfit,
        totalOrdersClosed,
        prevOrdersClosed,
        avgOrderValue,
        prevAvgOrderValue,
        teamConversionRate,
        prevTeamConversionRate,
        inventoryClearedValue,
        prevInventoryClearedValue,
        bestPerformer: {
          id: best.id,
          name: best.name,
          avatarUrl: best.avatarUrl,
          revenue: best.monthlyRevenue,
          profit: best.monthlyProfit,
          score: best.performanceScore,
        },
        mostImproved: {
          id: mostImp.id,
          name: mostImp.name,
          avatarUrl: mostImp.avatarUrl,
          improvementPct: mostImp.trendPctChange,
          reason: `+${mostImp.trendPctChange}% MoM conversion & inventory clearance gain`,
        }
      };

      // Aggregated Team Category Mix
      const catMap: Record<string, { revenue: number, profit: number, units: number }> = {};
      salespeople.forEach(sp => {
        sp.categoryBreakdown.forEach(c => {
          if (!catMap[c.category]) {
            catMap[c.category] = { revenue: 0, profit: 0, units: 0 };
          }
          catMap[c.category].revenue += c.revenue;
          catMap[c.category].profit += c.profit;
          catMap[c.category].units += c.units;
        });
      });

      const teamCategoryMix: CategoryPerformance[] = Object.entries(catMap).map(([category, data]) => ({
        category,
        revenue: data.revenue,
        profit: data.profit,
        units: data.units,
        avgMargin: data.revenue > 0 ? Number(((data.profit / data.revenue) * 100).toFixed(1)) : 0,
      }));

      // Team Monthly Trend Aggregation
      const months = ['Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul'];
      const teamMonthlyTrends = months.map(m => {
        let rev = 0, prof = 0, ord = 0, convSum = 0;
        salespeople.forEach(sp => {
          const item = sp.monthlyTrend.find(t => t.month === m);
          if (item) {
            rev += item.revenue;
            prof += item.profit;
            ord += item.orders;
            convSum += item.conversion;
          }
        });
        return {
          month: m,
          revenue: rev,
          profit: prof,
          orders: ord,
          aov: ord > 0 ? Math.round(rev / ord) : 0,
          conversion: salespeople.length > 0 ? Number((convSum / salespeople.length).toFixed(1)) : 0,
        };
      });

      return {
        kpis,
        insights: INITIAL_AI_INSIGHTS,
        salespeople,
        coSellingPairs: INITIAL_CO_SELLING_PAIRS,
        teamCategoryMix,
        teamMonthlyTrends,
      };
    },
    staleTime: 60 * 1000,
  });
}
