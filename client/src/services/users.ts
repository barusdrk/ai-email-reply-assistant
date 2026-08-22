import API from "./api.js";

export interface UserProfile {
  id: string;
  name: string;
  email: string;
  avatar?: string;
  role?: string;
  plan?: string;
}

export async function getMe(): Promise<UserProfile> {
  const { data } = await API.get<UserProfile>(
    "/users/me"
  );

  return data;
}

export async function updateProfile(
  profile: Partial<
    Pick<UserProfile, "name" | "email" | "avatar">
  >
): Promise<UserProfile> {
  const { data } = await API.put<UserProfile>(
    "/users/me",
    profile
  );

  return data;
}

export async function changePassword(
  currentPassword: string,
  newPassword: string
): Promise<{
  success: boolean;
  message: string;
}> {
  const { data } = await API.put(
    "/users/me/password",
    {
      currentPassword,
      newPassword,
    }
  );

  return data;
}

export async function deleteAccount(): Promise<void> {
  await API.delete("/users/me");
}
