export type UserRole = 'General User' | 'Admin';
export type UserStatus = 'Active' | 'Inactive';

export interface User {
  id: string;
  userId: string;
  name: string;
  email: string;
  role: UserRole;
  department: string;
  status: UserStatus;
  createdAt?: string;
  password?: string;
}

export interface CreateUserPayload {
  userId: string;
  password?: string;
  name: string;
  email: string;
  role: UserRole;
  department: string;
  status: UserStatus;
}
