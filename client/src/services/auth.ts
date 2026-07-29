import API from "./api.js";

import type {
  User,
  AuthResponse,
} from "../types/user.js";

export async function login(
  email: string,
  password: string
): Promise<AuthResponse> {
  const { data } =
    await API.post<AuthResponse>(
      "/auth/login",
      {
        email,
        password,
      }
    );

  localStorage.setItem(
    "token",
    data.token
  );

  return data;
}

export async function register(
  email: string,
  password: string
): Promise<AuthResponse> {
  const { data } =
    await API.post<AuthResponse>(
      "/auth/register",
      {
        email,
        password,
      }
    );

  localStorage.setItem(
    "token",
    data.token
  );

  return data;
}

export async function getCurrentUser(): Promise<User> {
  const { data } =
    await API.get<User>(
      "/auth/me"
    );

  return data;
}

export function getToken() {
  return localStorage.getItem(
    "token"
  );
}

export function isAuthenticated() {
  return !!getToken();
}

export function logout() {
  localStorage.removeItem(
    "token"
  );
}
