import User from "../models/User.js";

class UserRepository {
  async findById(id: string) {
    return User.findById(id).lean();
  }

  async findByEmail(email: string) {
    return User.findOne({
      email,
    }).lean();
  }

  async create(data: {
    email: string;
    password: string;
    role: "user" | "reviewer" | "admin";
    signature: string;
    theme: "light" | "dark" | "system";
  }) {
    const user =
      await User.create(data as any);

    return (user as any).toObject();
  }

  async update(
    id: string,
    data: Partial<{
      signature: string;
      theme: string;
      role: string;
    }>
  ) {
    return User.findByIdAndUpdate(
      id,
      data,
      {
        new: true,
        lean: true,
      }
    );
  }

  async delete(id: string) {
    return User.findByIdAndDelete(id);
  }
}

export const userRepository =
  new UserRepository();
