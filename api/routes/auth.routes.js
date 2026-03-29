import express from "express";
import {
  adminResetPassword,
  changePassword,
  login,
  logout,
  me,
} from "../controller/auth.controller.js";
import {
  adminApiOrSessionRequired,
  sessionOptional,
  sessionRequired,
} from "../middleware/auth.middleware.js";

const router = express.Router();

router.post("/login", login);
router.post("/logout", sessionOptional, logout);
router.get("/me", sessionOptional, me);
router.post("/change-password", sessionRequired, changePassword);
router.patch("/users/:id/password", adminApiOrSessionRequired, adminResetPassword);

export default router;
