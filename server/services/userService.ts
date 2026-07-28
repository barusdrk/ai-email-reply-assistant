import { userRepository } from "../repositories/UserRepository.js";

export async function getProfile(userId: string) {
  return userRepository.findById(userId);
}

export async function updateProfile(
  userId: string,
  data: Record<string, any>
) {
  return userRepository.update(userId, data as any);
}

export async function updateSignature(
  userId: string,
  signature: string
) {
  return userRepository.update(userId, { signature });
}

export async function updateTheme(
  userId: string,
  theme: "light" | "dark" | "system"
) {
  return userRepository.update(userId, { theme });
}

export default {};
