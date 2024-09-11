import { Client, User } from "discord.js";
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
  quitTime: number;
  abortController: AbortController;
}

const store = new Map<User['id'], StoreInfo>();

export async function abortTask(client: Client, userId: string) {
  const task = store.get(userId);

  if (!task) {
    return false;
  }

  deleteTask(userId);

  const {
    guildId,
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
  await abortTask(client, info.userId);
  store.set(info.userId, info);
}

export function deleteTask(userId: string) {
  store.delete(userId);
}
