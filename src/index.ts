/// <reference path="./env.d.ts" />

import { Client, GatewayIntentBits } from 'discord.js';
import { descriptors } from './command';
import type { InteractionHandler } from './command/types';
import { generateOAuth2Url, registerCommandsIfNeccessary } from './utils';

process.on('uncaughtException', console.error);
process.on('unhandledRejection', console.error);

const token = process.env.BOT_TOKEN;
const clientId = process.env.CLIENT_ID;
const baseCommand = process.env.BASE_COMMAND || 'reloc';

const commandHandlers = new Map<string, InteractionHandler>(Object.values(descriptors).map(desc => [
  desc.declaration.name, desc.commandHandler
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

  if (!interaction.isChatInputCommand()) {
    return;
  }

  const group = interaction.options.getSubcommandGroup(false);
  const command = interaction.options.getSubcommand();

  const groupOrCommand = (group || command).toLowerCase();

  const handler = commandHandlers.get(groupOrCommand);

  if (!handler) {
    return;
  }

  await handler(interaction);
});
