export interface User {
  id: string;
  email: string;
  name?: string;
  role?:
    | "user"
    | "admin";
  createdAt?: string;
  updatedAt?: string;
}

export interface AuthResponse {
  user: User;
  token: string;
}
