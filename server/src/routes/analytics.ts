import {Router} from "express";
import {auth} from "../middleware/auth.js";
import {getSupportAnalyticsFromQuery} from "../services/supportAnalytics.js";

const router=Router();

router.use(auth);

router.get("/",async(req,res)=>{
  try{
    if(!req.user?.id)return res.status(401).json({success:false,message:"Authentication required."});

    const analytics=await getSupportAnalyticsFromQuery(
      req.user.id,
      req.query.from,
      req.query.to,
    );

    return res.json({
      success:true,
      analytics,
    });
  }catch(error){
    console.error("Support analytics retrieval failed:",error);
    return res.status(400).json({
      success:false,
      message:error instanceof Error?error.message:"Failed to load support analytics.",
    });
  }
});

export default router;
