export type UserRole=
  |"user"
  |"reviewer"
  |"admin";

export type AuthProvider=
  |"local"
  |"google"
  |"microsoft";

export type Theme=
  |"light"
  |"dark"
  |"system";

export interface UserRecord{
  id?:string;
  email:string;
  password?:string;
  name:string;
  avatar?:string;
  role:UserRole;
  provider:AuthProvider;
  signature:string;
  theme:Theme;
  timezone:string;
  language:string;
  emailNotifications:boolean;
  aiAutoDraft:boolean;
  lastLogin?:Date;
  createdAt?:Date;
  updatedAt?:Date;
}

export interface LoginInput{
  email:string;
  password:string;
}

export interface RegisterInput{
  email:string;
  password:string;
  name:string;
}

export interface JwtPayload{
  id:string;
  email:string;
  role:UserRole;
}

export interface AuthResponse{
  token:string;
  user:UserRecord;
}

export interface UpdateUserInput{
  name?:string;
  avatar?:string;
  signature?:string;
  theme?:Theme;
  timezone?:string;
  language?:string;
  emailNotifications?:boolean;
  aiAutoDraft?:boolean;
}
