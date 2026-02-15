import type { PlaceResult, LeadScoreBreakdown } from "@/types/lead";

const TARGET_TYPES = [
  "general_contractor", "electrician", "plumber", "roofing_contractor",
  "painter", "moving_company", "locksmith", "hvac_contractor",
  "accounting", "lawyer", "real_estate_agency", "insurance_agency",
  "car_repair", "car_wash", "veterinary_care", "dentist",
  "physiotherapist", "beauty_salon", "hair_care", "spa",
  "laundry", "storage", "travel_agency", "pet_store",
  "cleaning_service",
];

export function calculateLeadScore(place: PlaceResult): LeadScoreBreakdown {
  let webPresence = 0;
  let profileCompleteness = 0;
  let reviewHealth = 0;
  let contactability = 0;
  let serviceFit = 0;

  // Factor 1: Web Presence (25 pts max)
  // Has website = in the game. No website = too cold, skip.
  if (place.websiteUri) {
    webPresence = 15; // Base: they have a site (PageSpeed refines this later in detail view)
  }
  // If no website AND very few reviews — ghost business, score stays 0

  // Factor 2: Profile Completeness (25 pts max)
  // Peaks for incomplete but existing profiles
  const photoCount = place.photos?.length ?? 0;
  if (photoCount === 0) {
    profileCompleteness += 0; // No photos = might be ghost
  } else if (photoCount <= 2) {
    profileCompleteness += 10; // Bare minimum effort
  } else if (photoCount <= 5) {
    profileCompleteness += 5; // Decent but room to improve
  }
  // else: 6+ photos = doing well, 0 pts

  if (!place.regularOpeningHours) {
    profileCompleteness += 5; // Didn't bother listing hours
  }

  if (!place.editorialSummary) {
    profileCompleteness += 5; // No editorial summary = basic profile
  }

  // Phone exists but profile otherwise sparse = they're trying
  if (place.nationalPhoneNumber && photoCount <= 3) {
    profileCompleteness += 5;
  }

  profileCompleteness = Math.min(profileCompleteness, 25);

  // Factor 3: Review Health (25 pts max)
  // Sweet spot: 3.0-4.2 rating with few reviews
  const rating = place.rating ?? 0;
  const reviewCount = place.userRatingCount ?? 0;

  if (reviewCount === 0) {
    reviewHealth = 0; // Ghost — too cold
  } else {
    // Rating sweet spot
    if (rating >= 3.0 && rating <= 4.2) {
      reviewHealth += 15; // Fixable, not hopeless
    } else if (rating < 3.0 && rating > 0) {
      reviewHealth += 5; // Might be lost cause
    }
    // 4.3+ = doing fine, 0 pts

    // Review count — fewer = more opportunity
    if (reviewCount >= 1 && reviewCount <= 15) {
      reviewHealth += 10; // Underperforming
    } else if (reviewCount >= 16 && reviewCount <= 30) {
      reviewHealth += 5; // Moderate
    }
    // 30+ = well-established, 0 pts
  }

  reviewHealth = Math.min(reviewHealth, 25);

  // Factor 4: Contactability (15 pts max)
  if (place.nationalPhoneNumber) {
    contactability += 5;
  }
  // Email check happens later in detail analysis, give base points if website exists
  if (place.websiteUri) {
    contactability += 10; // Likely has email on site
  }

  contactability = Math.min(contactability, 15);

  // Factor 5: Service Business Fit (10 pts max)
  if (place.pureServiceAreaBusiness) {
    serviceFit += 5;
  }
  const types = place.types ?? [];
  const primaryType = place.primaryType ?? "";
  if (TARGET_TYPES.includes(primaryType) || types.some(t => TARGET_TYPES.includes(t))) {
    serviceFit += 5;
  }

  serviceFit = Math.min(serviceFit, 10);

  const total = webPresence + profileCompleteness + reviewHealth + contactability + serviceFit;

  return {
    webPresence,
    profileCompleteness,
    reviewHealth,
    contactability,
    serviceFit,
    total,
  };
}

export function getScoreColor(score: number): string {
  if (score >= 60) return "text-green-600";
  if (score >= 30) return "text-amber-600";
  return "text-slate-400";
}

export function getScoreBgColor(score: number): string {
  if (score >= 60) return "bg-green-50 border-green-200";
  if (score >= 30) return "bg-amber-50 border-amber-200";
  return "bg-slate-50 border-slate-200";
}

export function getScoreLabel(score: number): string {
  if (score >= 60) return "Hot";
  if (score >= 30) return "Warm";
  return "Cold";
}
