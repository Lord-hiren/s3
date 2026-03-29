import { createUser, getUserById, listUsers } from "../services/database.service.js";

export const getUsers = async (_req, res) => {
  try {
    return res.status(200).json({
      message: "Users retrieved successfully.",
      data: await listUsers(),
    });
  } catch (error) {
    console.error("Get users error:", error);
    return res.status(500).json({ message: "Internal server error." });
  }
};

export const addUser = async (req, res) => {
  try {
    const { name, email, password, role } = req.body;
    const normalizedRole = role === "admin" ? "admin" : "user";

    if (!name?.trim() || !email?.trim() || !password?.trim()) {
      return res.status(400).json({
        message: "Name, email, and password are required.",
      });
    }

    if (password.length < 6) {
      return res.status(400).json({
        message: "Password must be at least 6 characters.",
      });
    }

    const user = await createUser({
      name,
      email,
      password,
      role: normalizedRole,
    });

    return res.status(201).json({
      message: "User created successfully.",
      data: user,
    });
  } catch (error) {
    if (String(error?.message || "").includes("SQLITE_CONSTRAINT")) {
      return res.status(409).json({ message: "Email already exists." });
    }

    console.error("Add user error:", error);
    return res.status(500).json({ message: "Internal server error." });
  }
};

export const getUser = async (req, res) => {
  try {
    const user = await getUserById(parseInt(req.params.id, 10));
    if (!user) {
      return res.status(404).json({ message: "User not found." });
    }

    return res.status(200).json({
      message: "User retrieved successfully.",
      data: user,
    });
  } catch (error) {
    console.error("Get user error:", error);
    return res.status(500).json({ message: "Internal server error." });
  }
};
