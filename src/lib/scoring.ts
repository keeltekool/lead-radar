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
  if (place.websiteUri) {
    webPresence = 15;
  }

  // Factor 2: Profile Completeness (25 pts max)
  const photoCount = place.photos?.length ?? 0;
  if (photoCount === 0) {
    profileCompleteness += 0;
  } else if (photoCount <= 2) {
    profileCompleteness += 10;
  } else if (photoCount <= 5) {
    profileCompleteness += 5;
  }

  if (!place.regularOpeningHours) {
    profileCompleteness += 5;
  }

  if (!place.editorialSummary) {
    profileCompleteness += 5;
  }

  if (place.nationalPhoneNumber && photoCount <= 3) {
    profileCompleteness += 5;
  }

  profileCompleteness = Math.min(profileCompleteness, 25);

  // Factor 3: Review Health (25 pts max)
  const rating = place.rating ?? 0;
  const reviewCount = place.userRatingCount ?? 0;

  if (reviewCount === 0) {
    reviewHealth = 0;
  } else {
    if (rating >= 3.0 && rating <= 4.2) {
      reviewHealth += 15;
    } else if (rating < 3.0 && rating > 0) {
      reviewHealth += 5;
    }

    if (reviewCount >= 1 && reviewCount <= 15) {
      reviewHealth += 10;
    } else if (reviewCount >= 16 && reviewCount <= 30) {
      reviewHealth += 5;
    }
  }

  reviewHealth = Math.min(reviewHealth, 25);

  // Factor 4: Contactability (15 pts max)
  if (place.nationalPhoneNumber) {
    contactability += 5;
  }
  if (place.websiteUri) {
    contactability += 10;
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

// Brand score colors: Hot = teal, Warm = amber, Cold = slate
export function getScoreColor(score: number): string {
  if (score >= 70) return "text-teal-500";
  if (score >= 40) return "text-amber-600";
  return "text-slate-500";
}

export function getScoreBgColor(score: number): string {
  if (score >= 70) return "bg-teal-100 border-teal-200";
  if (score >= 40) return "bg-amber-100 border-amber-200";
  return "bg-slate-100 border-slate-200";
}

export function getScoreLabel(score: number): string {
  if (score >= 70) return "Hot";
  if (score >= 40) return "Warm";
  return "Cold";
}
