import { z } from "zod";

/** Display name collected at signup; stored as Supabase `user_metadata.full_name` for `handle_new_user`. */
export const signupDisplayNameSchema = z
  .string()
  .trim()
  .min(2, "Name must be at least 2 characters.")
  .max(80, "Name is too long.");
