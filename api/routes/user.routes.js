import express from "express";
import { addUser, getUser, getUsers } from "../controller/user.controller.js";
import { adminApiOrSessionRequired } from "../middleware/auth.middleware.js";

const router = express.Router();

router.get("/", adminApiOrSessionRequired, getUsers);
router.get("/:id", adminApiOrSessionRequired, getUser);
router.post("/", adminApiOrSessionRequired, addUser);

export default router;
