import type { Client, Guild, User } from "discord.js";
import { clamp, random } from "lodash";

type Protection = {
  guildId: string;
  userId: string;
  expires: number;
  credits: number;
}

type ProtectionId = `${Guild['id']}:${User['id']}`;

const protections = new Map<ProtectionId, Protection>();

export function addProtection(client: Client, guildId: Guild['id'], userId: User['id'], maxCredits?: number): Protection {
  const key = `${guildId}:${userId}` satisfies ProtectionId;

  const protection = protections.get(key);

  const timeout = random(1, 12 + 1) * 5;
  const expires = Date.now() + (timeout * 60 * 1000);

  const result = {
    guildId,
    userId,
    expires: Math.max(expires, protection?.expires ?? 0),
    credits: clamp((protection?.credits ?? 0) + 1, 0, maxCredits ?? 10)
  }

  protections.set(key, result);

  return result;
}

export function deleteProtection(guildId: Guild['id'], userId: User['id']) {
  const key = `${guildId}:${userId}` satisfies ProtectionId;

  if (!protections.has(key)) {
    return false;
  }

  protections.delete(key);
  return true;
}

export function isProtected(guildId: Guild['id'], userId: User['id'], useCredit: boolean) {
  const key = `${guildId}:${userId}` satisfies ProtectionId;

  if (protections.has(key)) {
    if (useCredit) {
      const protection = protections.get(key)!
      protection.credits--;

      if (protection.credits <= 0) {
        protections.delete(key);
      } else {
        protections.set(key, protection);
      }
    }

    return true;
  }

  return false;
}

export function cleanProtections() {
  const now = Date.now();
  const expired = Array.from(protections.entries()).filter(([_, { expires }]) => now >= expires);

  for (const [id] of expired) {
    protections.delete(id);
  }
}
