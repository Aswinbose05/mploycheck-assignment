import { User, UserRole } from './user.model';

export interface LoginCredentials {
  userId: string;
  password: string;
  role: UserRole;
}

export interface AuthResponse {
  success: boolean;
  message?: string;
  token?: string;
  user?: User;
}
