import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { env } from "../config/env";
import { userRepository } from "../repositories/UserRepository";

export async function register(
  email: string,
  password: string
) {
  if (
    await userRepository.findByEmail(
      email
    )
  )
    throw new Error(
      "Email already exists."
    );

  const hash =
    await bcrypt.hash(password, 10);

  const user =
    await userRepository.create({
      email,
      password: hash,
      role: "user",
      signature:
        "Customer Support",
      theme: "light",
    });

  const token = jwt.sign(
    {
      id: user._id.toString(),
    },
    env.JWT_SECRET,
    {
      expiresIn: "7d",
    }
  );

  const {
    password: _,
    ...safeUser
  } = user;

  return {
    token,
    user: safeUser,
  };
}

export async function login(
  email: string,
  password: string
) {
  const user =
    await userRepository.findByEmail(
      email
    );

  if (!user)
    throw new Error(
      "Invalid credentials."
    );

  const valid =
    await bcrypt.compare(
      password,
      user.password
    );

  if (!valid)
    throw new Error(
      "Invalid credentials."
    );

  const token = jwt.sign(
    {
      id: user._id.toString(),
    },
    env.JWT_SECRET,
    {
      expiresIn: "7d",
    }
  );

  const {
    password: _,
    ...safeUser
  } = user;

  return {
    token,
    user: safeUser,
  };
}

export async function getCurrentUser(
  id: string
) {
  const user =
    await userRepository.findById(id);

  if (!user)
    throw new Error(
      "User not found."
    );

  const {
    password: _,
    ...safeUser
  } = user;

  return safeUser;
}
