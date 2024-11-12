import type { Client, Guild, User } from "discord.js";
import { noop } from "lodash";

type StoreInfo = {
  guildId: string;
  channelId: string;
  userId: string;
  demander: string;
  permissions: {
    manageMessage?: boolean;
    sendMessage?: boolean;
  },
  messageId: string;
  abortController: AbortController;
}

type StoreId = `${Guild['id']}:${User['id']}`;

const store = new Map<StoreId, StoreInfo>();

export async function abortTask(client: Client, guildId: Guild['id'], userId: User['id']) {
  const storeId = `${guildId}:${userId}` satisfies StoreId;
  const task = store.get(storeId);

  if (!task) {
    return false;
  }

  deleteTask(guildId, userId);

  const {
    channelId,
    abortController,
    messageId,
    permissions
  } = task;

  abortController.abort();

  if (permissions.manageMessage) {
    const guild = await client.guilds.fetch(guildId);
    const channel = await guild.channels.fetch(channelId);

    if (channel?.isTextBased() && messageId) {
      channel.messages.delete(messageId).catch(noop);
    }
  }

  return true;
}

export async function saveTask(client: Client, info: StoreInfo) {
  await abortTask(client, info.guildId, info.userId);
  store.set(`${info.guildId}:${info.userId}`, info);
}

export function deleteTask(guildId: Guild['id'], userId: User['id']) {
  store.delete(`${guildId}:${userId}`);
}
