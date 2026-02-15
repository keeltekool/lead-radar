export interface PlaceResult {
  id: string;
  displayName: { text: string; languageCode: string };
  formattedAddress: string;
  shortFormattedAddress?: string;
  nationalPhoneNumber?: string;
  internationalPhoneNumber?: string;
  websiteUri?: string;
  rating?: number;
  userRatingCount?: number;
  types?: string[];
  primaryType?: string;
  primaryTypeDisplayName?: { text: string; languageCode: string };
  businessStatus?: string;
  pureServiceAreaBusiness?: boolean;
  regularOpeningHours?: {
    openNow?: boolean;
    periods?: Array<{
      open: { day: number; hour: number; minute: number };
      close: { day: number; hour: number; minute: number };
    }>;
    weekdayDescriptions?: string[];
  };
  photos?: Array<{
    name: string;
    widthPx: number;
    heightPx: number;
  }>;
  editorialSummary?: { text: string; languageCode: string };
  reviews?: Review[];
  googleMapsUri?: string;
  location?: { latitude: number; longitude: number };
}

export interface Review {
  name?: string;
  relativePublishTimeDescription?: string;
  text?: { text: string; languageCode: string };
  originalText?: { text: string; languageCode: string };
  rating: number;
  authorAttribution?: {
    displayName: string;
    uri?: string;
    photoUri?: string;
  };
  publishTime?: string;
  googleMapsUri?: string;
}

export interface LeadScoreBreakdown {
  webPresence: number;
  profileCompleteness: number;
  reviewHealth: number;
  contactability: number;
  serviceFit: number;
  total: number;
}

export interface EnrichedLead extends PlaceResult {
  leadScore: LeadScoreBreakdown;
}

export interface PageSpeedResult {
  performance: number;
  seo: number;
  accessibility: number;
  bestPractices: number;
}

export interface WebsiteScrapeResult {
  emails: string[];
  socialLinks: Record<string, string>;
  copyrightYear?: number;
}

export interface LeadAnalysisResult {
  pageSpeed?: PageSpeedResult;
  websiteScrape?: WebsiteScrapeResult;
  reviewSummary?: string;
  aiPitch?: string;
}
