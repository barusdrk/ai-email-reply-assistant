export interface User {
  id: string;
  email: string;
}

export interface AuthResponse {
  token: string;
  user: User;
}
