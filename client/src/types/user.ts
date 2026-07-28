export interface User {
  id: string;

  email: string;

  name?: string;

  role:
    | "user"
    | "reviewer"
    | "admin";

  createdAt?: string;
}

export interface AuthResponse {
  token: string;

  user: User;
}
