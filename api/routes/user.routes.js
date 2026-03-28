import express from "express";
import { addUser, getUser, getUsers } from "../controller/user.controller.js";
import { adminSessionRequired } from "../middleware/auth.middleware.js";

const router = express.Router();

router.get("/", adminSessionRequired, getUsers);
router.get("/:id", adminSessionRequired, getUser);
router.post("/", adminSessionRequired, addUser);

export default router;
