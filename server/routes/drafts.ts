import { Router } from "express";
import { auth } from "../middleware/auth.js";
import {
drafts,
draft,
createDraft,
updateDraft,
deleteDraft,
}from "../services/drafts.js";

const router=Router();

router.use(auth);

router.get("/",async(req:any,res)=>{
res.json(
await drafts(req.user.id)
);
});

router.get("/:id",async(req,res)=>{
res.json(
await draft(req.params.id)
);
});

router.post("/",async(req,res)=>{
res.status(201).json(
await createDraft(req.body)
);
});

router.put("/:id",async(req,res)=>{
res.json(
await updateDraft(
req.params.id,
req.body
)
);
});

router.delete("/:id",async(req,res)=>{
await deleteDraft(req.params.id);

res.status(204).end();
});

export default router;
