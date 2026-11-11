export interface Hotel {
  id: string;
  name: string;
  nameAr?: string;
  detailsHref?: string;
  city: string;
  address: string;
  image: string;
  nightlyRate: number;
  currency: "USD";
  rating: number;
  description: string;
  amenities: readonly string[];
  duration?: { nights: number; days: number };
}

export interface HeroContent {
  image: string;
  alt: string;
  width: number;
  height: number;
}

export interface HeroSlide {
  src: string;
  width: number;
  height: number;
  /** CSS object-position for wide viewports; phones use the generated phone crop. */
  position: string;
}
