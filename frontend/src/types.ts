// src/types.ts
export type Venue = {
  id: string;
  name: string;
  lat: number;
  lng: number;
  website?: string | null;
  city?: string | null;
  tags?: string[] | null;
  photos?: string[] | null; // absolute URLs
};

