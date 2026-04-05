export type UserRole = 'admin' | 'corporate' | 'individual';

export interface User {
  id: number;
  email: string;
  name: string;
  role: UserRole;
  avatar?: string;
}
