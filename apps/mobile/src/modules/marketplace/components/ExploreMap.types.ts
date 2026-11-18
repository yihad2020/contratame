import type { MarketplaceLocation } from '@/modules/marketplace/types';

export type ExploreMapProps = {
  /** Customer location chosen with "Cerca de mí"; null centres the map on Santa Cruz de la Sierra. */
  location: MarketplaceLocation | null;
  /** Overlay chip copy built from the real result count; null hides the chip (loading / error). */
  countLabel: string | null;
  locating: boolean;
  onLocate(): void;
};

/** Initial geographic focus of the project (Santa Cruz de la Sierra). */
export const exploreMapFallbackCenter: MarketplaceLocation = { latitude: -17.7833, longitude: -63.1821 };
