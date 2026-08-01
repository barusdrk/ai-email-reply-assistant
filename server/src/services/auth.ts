import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";

import { env } from "../config/env.js";

import { userRepository } from "../repositories/UserRepository.js";
import { aiSettingsRepository } from "../repositories/AISettingsRepository.js";
import { subscriptionRepository } from "../repositories/SubscriptionRepository.js";

export async function register(
  name:string,
  email:string,
  password:string
) {
  const existing =
    await userRepository.findByEmail(
      email
    );

  if (existing) {
    throw new Error(
      "Email already exists."
    );
  }

  const hash =
    await bcrypt.hash(
      password,
      10
    );

  const user =
    await userRepository.create({
      name,
      email,
      password:hash,
      role:"user",
      plan:"starter",
      subscriptionStatus:"trial",
      active:true,
      emailVerified:false,
    });

  await aiSettingsRepository.create({
    userId:user._id,
    provider:"openai",
    maxDailyReplies:20,
    temperature:0.7,
    defaultTone:"professional",
    defaultLength:"medium",
  });

  await subscriptionRepository.create({
    userId:user._id,
    plan:"free",
    status:"active",
    provider:"none",
  });

  const token =
    jwt.sign(
      {
        id:user._id.toString(),
        email:user.email,
        role:user.role,
      },
      env.JWT_SECRET,
      {
        expiresIn:"7d",
      }
    );

  const {
    password:_password,
    ...safeUser
  } = user.toObject();

  return {
    token,
    user:safeUser,
  };
}

export async function login(
  email:string,
  password:string
) {
  const user =
    await userRepository.findByEmail(
      email
    );

  if (!user) {
    throw new Error(
      "Invalid credentials."
    );
  }

  const valid =
    await bcrypt.compare(
      password,
      user.password
    );

  if (!valid) {
    throw new Error(
      "Invalid credentials."
    );
  }

  const token =
    jwt.sign(
      {
        id:user._id.toString(),
        email:user.email,
        role:user.role,
      },
      env.JWT_SECRET,
      {
        expiresIn:"7d",
      }
    );

  const {
    password:_password,
    ...safeUser
  } = user.toObject();

  return {
    token,
    user:safeUser,
  };
}

export async function getCurrentUser(
  id:string
) {
  const user =
    await userRepository.findById(
      id
    );

  if (!user) {
    throw new Error(
      "User not found."
    );
  }

  const {
    password:_password,
    ...safeUser
  } = user.toObject();

  return safeUser;
}
