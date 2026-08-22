import API from "./api.js";

export interface Profile {
  name:string;

  email:string;

  avatar?:string;
}

export async function getProfile(){
  const {
    data,
  } =
    await API.get<Profile>(
      "/profile"
    );

  return data;
}

export async function updateProfile(
  profile:Partial<Profile>
){
  const {
    data,
  } =
    await API.put<Profile>(
      "/profile",
      profile
    );

  return data;
}
