import { Router, type IRouter } from "express";
import { User } from "../models/User";
import { RegisterBody, LoginBody, UpdateProfileBody } from "@workspace/api-zod";
import { signToken, hashPassword, comparePassword, requireAuth, type AuthRequest } from "../lib/auth";

const router: IRouter = Router();

function formatUser(u: any) {
  return {
    id: u._id.toString(),
    email: u.email,
    name: u.name,
    companyName: u.companyName ?? null,
    jobTitle: u.jobTitle ?? null,
    phone: u.phone ?? null,
    createdAt: u.createdAt.toISOString(),
  };
}

router.post("/auth/register", async (req, res): Promise<void> => {
  const parsed = RegisterBody.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: parsed.error.message }); return; }
  const { email, password, name } = parsed.data;

  const existing = await User.findOne({ email });
  if (existing) { res.status(409).json({ error: "Email already in use" }); return; }

  const passwordHash = await hashPassword(password);
  const user = await User.create({ email, passwordHash, name });
  const token = signToken({ userId: user._id.toString(), email: user.email });

  res.status(201).json({ token, user: formatUser(user) });
});

router.post("/auth/login", async (req, res): Promise<void> => {
  const parsed = LoginBody.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: parsed.error.message }); return; }
  const { email, password } = parsed.data;

  const user = await User.findOne({ email });
  if (!user || !(await comparePassword(password, user.passwordHash))) {
    res.status(401).json({ error: "Invalid email or password" }); return;
  }

  const token = signToken({ userId: user._id.toString(), email: user.email });
  res.json({ token, user: formatUser(user) });
});

router.get("/auth/me", requireAuth, async (req: AuthRequest, res): Promise<void> => {
  const user = await User.findById(req.userId);
  if (!user) { res.status(401).json({ error: "User not found" }); return; }
  res.json(formatUser(user));
});

router.put("/auth/profile", requireAuth, async (req: AuthRequest, res): Promise<void> => {
  const parsed = UpdateProfileBody.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: parsed.error.message }); return; }

  const user = await User.findByIdAndUpdate(
    req.userId,
    { $set: parsed.data },
    { new: true }
  );
  if (!user) { res.status(404).json({ error: "User not found" }); return; }
  res.json(formatUser(user));
});

export default router;
