export type UserProfile = {
  name: string;
  email: string;
  role: "picker" | "farmer";
  location?: string;
  createdAt?: string;
  rating?: number;
  reviews?: number;
};
