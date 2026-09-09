export type GstMode = "NONE" | "ENROLMENT" | "GSTIN";
export type ProductStatus =
  "DRAFT" | "PROCESSING" | "READY" | "PUBLISHING" | "LIVE" | "PAUSED" | "FAILED";
export type Channel = "MICROSTORE" | "WHATSAPP" | "ONDC" | "GEM";
export type ChannelStatus = "eligible" | "blocked" | "publishing" | "live" | "failed";
export type MediaRole = "front" | "back" | "texture" | "scale" | "maker";

export interface Artisan {
  id: string;
  phone: string;
  name: string;
  slug: string;
  language: string;
  craft: string;
  clusterId?: string | null;
  district: string;
  state: string;
  gstMode: GstMode;
  gstin?: string | null;
  enrolmentNumber?: string | null;
  upiId?: string | null;
  verifiedVia?: string | null;
  dayWage: number;
  createdAt: string;
}

export interface ProductAttributes {
  technique?: string;
  material?: string;
  colour?: string;
  dimensions?: string;
  motif?: string;
  region?: string;
  care?: string;
}

export interface Product {
  id: string;
  artisanId: string;
  slug: string;
  titleEn: string;
  titleHi: string;
  descriptionEn: string;
  descriptionHi: string;
  keywords: string[];
  attributes: ProductAttributes;
  hsnCode?: string | null;
  materialCost: number;
  daysOfWork: number;
  floorPrice: number;
  suggestedPrice: number;
  premiumPrice: number;
  publishedPrice: number;
  stock: number;
  status: ProductStatus;
  views: number;
  media: Media[];
  channelStates: ChannelState[];
}

export interface Media {
  id: string;
  productId: string;
  role: MediaRole;
  originalUrl: string;
  enhancedUrl: string;
  renditions: Record<string, string>;
  fidelity: { deltaE: number; ssim: number; edgeIou: number; passed: boolean; mode: string };
}

export interface ChannelState {
  id: string;
  productId: string;
  channel: Channel;
  status: ChannelStatus;
  externalId?: string | null;
  blockers: string[];
  lastSyncedAt?: string | null;
}

export interface Order {
  id: string;
  status: string;
  amount: number;
  channel: Channel;
  items: { productId: string; qty: number }[];
  buyer: { name: string; phone: string; address: string };
  timeline: { status: string; at: string }[];
}

export interface InsightsSummary {
  totalOrders: number;
  totalEarnings: number;
  todayDelta: number;
  views: number;
  ordersByStatus: Record<string, number>;
  earningsByMonth: { month: string; amount: number }[];
  bestProduct?: Product;
}
