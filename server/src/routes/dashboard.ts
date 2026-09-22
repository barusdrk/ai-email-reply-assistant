import {Router,type Request,type Response} from "express";
import {authenticate} from "../middleware/auth.js";
import {getDashboardStats} from "../services/dashboard.js";

const router=Router();

router.get("/",authenticate,async(req:Request,res:Response)=>{
  if(!req.user){
    return res.status(401).json({
      success:false,
      message:"Authentication required.",
    });
  }

  try{
    const stats=await getDashboardStats(req.user.id);

    return res.json({
      success:true,
      stats,
    });
  }catch(error){
    console.error("Failed to get dashboard statistics:",error);

    return res.status(500).json({
      success:false,
      message:error instanceof Error?error.message:"Failed to get dashboard statistics.",
    });
  }
});

export default router;
