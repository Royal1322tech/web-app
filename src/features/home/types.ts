export interface Hotel {
  id: string;
  name: string;
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
