import {
  UserModel,
} from "../models/User.js";

export async function getProfile(
  userId:string
){
  const user =
    await UserModel.findById(
      userId
    )
    .select(
      "-password"
    );

  if(!user){
    throw new Error(
      "User not found"
    );
  }

  return user;
}

export async function updateProfile(
  userId:string,
  data:{
    name?:string;
    email?:string;
    avatar?:string;
  }
){
  const user =
    await UserModel.findByIdAndUpdate(
      userId,
      {
        $set:data,
      },
      {
        new:true,
      }
    )
    .select(
      "-password"
    );

  if(!user){
    throw new Error(
      "User not found"
    );
  }

  return user;
}
