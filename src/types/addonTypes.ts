export interface Addon {
  _id: string;
  name: {
    ar: string;
    en: string;
  };
  description: {
    ar: string;
    en: string;
  };
  price: number;
  priceHalala: number;
  category: string;
  currency: string;
  type: "subscription" | "one_time";
  imageUrl: string;
  isActive: boolean;
  sortOrder: number;
  createdAt: string;
  updatedAt: string;
}

export interface AddonsResponse {
  status: boolean;
  data: Addon[];
}
