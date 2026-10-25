export type FavoriteCursor = { createdAt: string; workerId: string };

export type FavoriteListItem = {
  worker_id: string;
  favorite_created_at: string;
  available: boolean;
  display_name: string | null;
  professional_bio: string | null;
  years_experience: number | null;
  public_area_label: string | null;
  city: string | null;
  department: string | null;
  service_title: string | null;
  category_name: string | null;
};

export type FavoriteMutation = {
  workerId: string;
  isFavorite: boolean;
  createdAt: string | null;
};
