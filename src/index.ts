/// <reference path="./env.d.ts" />

import { Client, GatewayIntentBits, PermissionFlagsBits } from "discord.js";
import { descriptors } from "./command";
import type { InteractionHandlers } from "./command/types";
import { generateOAuth2Url, registerCommandsIfNeccessary } from "./utils";

process.on('uncaughtException', console.error);
process.on('unhandledRejection', console.error);

const token = process.env.BOT_TOKEN;
const clientId = process.env.CLIENT_ID;
const baseCommand = process.env.BASE_COMMAND || 'reloc';

const commandHandlers = new Map<string, InteractionHandlers>(Object.values(descriptors).map(desc => [
  desc.declaration.name, desc.handlers
]));

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildVoiceStates
  ]
});

await registerCommandsIfNeccessary({
  token,
  clientId,
  baseCommand
});

console.log('OAuth URL:', generateOAuth2Url(clientId).toString());

client.once('ready', () => console.log('Ready'));

await client.login(token);

client.on('interactionCreate', async (interaction) => {
  if (interaction.user.bot) {
    return;
  }

  if (interaction.isChatInputCommand()) {
    const group = interaction.options.getSubcommandGroup(false);
    const command = interaction.options.getSubcommand();

    const groupOrCommand = (group || command).toLowerCase();

    const handlers = commandHandlers.get(groupOrCommand);

    if (!handlers?.command) {
      return;
    }

    const permitted = interaction.memberPermissions?.any([
      PermissionFlagsBits.Administrator,
      PermissionFlagsBits.ManageChannels,
      PermissionFlagsBits.ManageGuild,
      PermissionFlagsBits.MoveMembers
    ]) === true;

    if (!permitted) {
      interaction.reply('Insufficient permissions');
      return;
    }

    await handlers.command(interaction);
    return;
  }

  if (interaction.isModalSubmit()) {
    const [commandName, customId] = interaction.customId.split(':', 2);

    const handlers = commandHandlers.get(commandName);

    if (!handlers?.modal) {
      return;
    }

    await handlers.modal(interaction, customId);
    return;
  }
});
