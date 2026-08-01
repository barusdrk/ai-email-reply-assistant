import UserModel, {
  type UserDocument,
} from "../models/User.js";

class UserRepository {
  findById(id:string) {
    return UserModel.findById(id);
  }

  findByEmail(email:string) {
    return UserModel.findOne({
      email,
    });
  }

  create(
    data:Partial<UserDocument>
  ) {
    return UserModel.create(data);
  }

  update(
    id:string,
    data:Partial<UserDocument>
  ) {
    return UserModel.findByIdAndUpdate(
      id,
      {
        $set:data,
      },
      {
        new:true,
      }
    );
  }

  delete(id:string) {
    return UserModel.findByIdAndDelete(id);
  }

  activate(id:string) {
    return UserModel.findByIdAndUpdate(
      id,
      {
        active:true,
      },
      {
        new:true,
      }
    );
  }

  deactivate(id:string) {
    return UserModel.findByIdAndUpdate(
      id,
      {
        active:false,
      },
      {
        new:true,
      }
    );
  }
}

export const userRepository =
  new UserRepository();
  