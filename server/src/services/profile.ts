import {
  UserModel,
} from "../models/User.js";

const AVATAR_DATA_URL_PATTERN = /^data:(image\/(?:jpeg|png|gif|webp));base64,([A-Za-z0-9+/]+={0,2})$/;
const MAX_AVATAR_BYTES = 2 * 1024 * 1024;

function validateAvatar(avatar:string){
  if(avatar==="")return;
  const match=AVATAR_DATA_URL_PATTERN.exec(avatar);
  if(!match||match[2].length%4!==0){
    throw new Error("Avatar must be a JPEG, PNG, GIF, or WebP image.");
  }
  const encodedImage=match[2];
  const padding=encodedImage.endsWith("==")?2:encodedImage.endsWith("=")?1:0;
  const sizeInBytes=(encodedImage.length*3)/4-padding;
  if(sizeInBytes>MAX_AVATAR_BYTES){
    throw new Error("Avatar image must be 2 MB or smaller.");
  }
}

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
  if(data.avatar!==undefined){
    validateAvatar(data.avatar);
  }

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
