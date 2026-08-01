import ConnectedAccountModel,{
  type ConnectedAccountDocument,
} from "../models/ConnectedAccount.js";

class ConnectedAccountRepository{

  findAll(){
    return ConnectedAccountModel.find({
      connected:true,
    });
  }

  findByUser(
    userId:string
  ){
    return ConnectedAccountModel.find({
      userId,
    });
  }

  findById(
    id:string
  ){
    return ConnectedAccountModel.findById(id);
  }

  create(
    data:Partial<ConnectedAccountDocument>
  ){
    return ConnectedAccountModel.create(data);
  }

  update(
    id:string,
    data:Partial<ConnectedAccountDocument>
  ){
    return ConnectedAccountModel.findByIdAndUpdate(
      id,
      {
        $set:data,
      },
      {
        new:true,
      }
    );
  }

  delete(
    id:string
  ){
    return ConnectedAccountModel.findByIdAndDelete(id);
  }

}

export const connectedAccountRepository=
  new ConnectedAccountRepository();
