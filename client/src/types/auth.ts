export interface User {
  id: string;
  email: string;
  name?: string;
  avatar?: string;
}

export interface AuthResponse {
  token: string;
  user: User;
}
