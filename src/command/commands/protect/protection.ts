import type { Client, Guild, User } from "discord.js";

type Protection = {
  guildId: string;
  userId: string;
  expires: number;
}

type ProtectionId = `${Guild['id']}:${User['id']}`;

const protections = new Map<ProtectionId, Protection>();

export async function addProtection(client: Client, protection: Protection) {
  protections.set(`${protection.guildId}:${protection.userId}`, protection);
}

export function deleteProtection(guildId: Guild['id'], userId: User['id']) {
  const id = `${guildId}:${userId}` satisfies ProtectionId;

  if (!protections.has(id)) {
    return false;
  }

  protections.delete(id);
  return true;
}

export function isProtected(guildId: Guild['id'], userId: User['id']) {
  return protections.has(`${guildId}:${userId}`);
}

export function cleanProtections() {
  const now = Date.now();
  const expired = Array.from(protections.entries()).filter(([_, { expires }]) => now >= expires);

  for (const [id] of expired) {
    protections.delete(id);
  }
}
