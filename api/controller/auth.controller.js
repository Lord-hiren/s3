import {
  createSession,
  deleteSession,
  getUserById,
  updateUserPassword,
  validateUserPassword,
} from "../services/database.service.js";
import { config } from "../../config.js";

const sessionCookie = (token) =>
  `${config.auth.sessionCookieName}=${encodeURIComponent(token)}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${config.auth.sessionDays * 24 * 60 * 60}`;

const clearSessionCookie = () =>
  `${config.auth.sessionCookieName}=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0`;

export const login = (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email?.trim() || !password?.trim()) {
      return res.status(400).json({
        message: "Email and password are required.",
      });
    }

    const user = validateUserPassword(email, password);
    if (!user) {
      return res.status(401).json({
        message: "Invalid email or password.",
      });
    }

    const session = createSession({
      userId: user.id,
      userAgent: req.headers["user-agent"] || "",
    });

    res.setHeader("Set-Cookie", sessionCookie(session.token));

    return res.status(200).json({
      message: "Login successful.",
      data: {
        user,
      },
    });
  } catch (error) {
    console.error("Login error:", error);
    return res.status(500).json({ message: "Internal server error." });
  }
};

export const logout = (req, res) => {
  try {
    if (req.sessionToken) {
      deleteSession(req.sessionToken);
    }

    res.setHeader("Set-Cookie", clearSessionCookie());

    return res.status(200).json({
      message: "Logged out successfully.",
    });
  } catch (error) {
    console.error("Logout error:", error);
    return res.status(500).json({ message: "Internal server error." });
  }
};

export const me = (req, res) => {
  if (!req.sessionUser) {
    return res.status(401).json({ message: "Unauthorized." });
  }

  return res.status(200).json({
    message: "Session user retrieved successfully.",
    data: req.sessionUser,
  });
};

export const changePassword = (req, res) => {
  try {
    const { current_password, new_password } = req.body;

    if (!req.sessionUser) {
      return res.status(401).json({ message: "Unauthorized." });
    }

    if (!current_password?.trim() || !new_password?.trim()) {
      return res.status(400).json({
        message: "Current password and new password are required.",
      });
    }

    if (new_password.length < 6) {
      return res.status(400).json({
        message: "New password must be at least 6 characters.",
      });
    }

    const validUser = validateUserPassword(req.sessionUser.email, current_password);
    if (!validUser) {
      return res.status(400).json({
        message: "Current password is incorrect.",
      });
    }

    const user = updateUserPassword(req.sessionUser.id, new_password);

    return res.status(200).json({
      message: "Password changed successfully.",
      data: user,
    });
  } catch (error) {
    console.error("Change password error:", error);
    return res.status(500).json({ message: "Internal server error." });
  }
};

export const adminResetPassword = (req, res) => {
  try {
    const { id } = req.params;
    const { new_password } = req.body;

    if (!new_password?.trim() || new_password.length < 6) {
      return res.status(400).json({
        message: "New password must be at least 6 characters.",
      });
    }

    const existingUser = getUserById(parseInt(id, 10));
    if (!existingUser) {
      return res.status(404).json({ message: "User not found." });
    }

    const user = updateUserPassword(existingUser.id, new_password);

    return res.status(200).json({
      message: "User password updated successfully.",
      data: user,
    });
  } catch (error) {
    console.error("Admin reset password error:", error);
    return res.status(500).json({ message: "Internal server error." });
  }
};
