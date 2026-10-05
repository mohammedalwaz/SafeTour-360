import type { UserRole } from "../../models/User";

export interface PublicUser {
  id: string;
  name: string;
  email: string;
  phone?: string;
  role: UserRole;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface AuthenticatedUser {
  userId: string;
  role: UserRole;
  user: PublicUser;
}
