import { z } from "zod";
export const loginSchema = z.object({
  email: z.string().trim().email("Please enter a valid banking email address"),
  password: z.string().min(6, "Password must be at least 6 characters"),
  role: z.enum(["RM", "TEAM_LEAD"]).default("RM")
});
