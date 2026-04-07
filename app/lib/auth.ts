import "server-only";
import { scrypt, randomBytes, timingSafeEqual } from "crypto";
import { promisify } from "util";
import { supabase } from "@/lib/supabase";

const scryptAsync = promisify(scrypt);

export async function hashPassword(password: string): Promise<string> {
  const salt = randomBytes(16).toString("hex");
  const derivedKey = (await scryptAsync(password, salt, 64)) as Buffer;
  return `${salt}:${derivedKey.toString("hex")}`;
}

export async function verifyPassword(
  password: string,
  hash: string
): Promise<boolean> {
  const [salt, key] = hash.split(":");
  const derivedKey = (await scryptAsync(password, salt, 64)) as Buffer;
  const keyBuffer = Buffer.from(key, "hex");
  return timingSafeEqual(derivedKey, keyBuffer);
}

export async function findUserByEmail(
  email: string
): Promise<{ data: Record<string, unknown> } | null> {
  const { data, error } = await supabase
    .from("subscribers")
    .select("*")
    .ilike("email", email)
    .single();

  if (error || !data) return null;
  return { data };
}

export async function getUserById(
  id: string
): Promise<{ data: Record<string, unknown> } | null> {
  const { data, error } = await supabase
    .from("subscribers")
    .select("*")
    .eq("id", id)
    .single();

  if (error || !data) return null;
  return { data };
}
