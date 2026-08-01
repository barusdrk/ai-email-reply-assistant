import ApprovalModel,{
type ApprovalDocument,
}from "../models/Approval.js";

class ApprovalRepository{

findAll(userId:string){
return ApprovalModel
.find({reviewerId:userId})
.sort({createdAt:-1});
}

findById(id:string){
return ApprovalModel.findById(id);
}

findPendingByDraft(draftId:string){
return ApprovalModel.findOne({
draftId,
status:"pending",
});
}

create(data:Partial<ApprovalDocument>){
return ApprovalModel.create(data);
}

update(
id:string,
data:Partial<ApprovalDocument>
){
return ApprovalModel.findByIdAndUpdate(
id,
{$set:data},
{new:true}
);
}

delete(id:string){
return ApprovalModel.findByIdAndDelete(id);
}

}

export const approvalRepository=
new ApprovalRepository();
