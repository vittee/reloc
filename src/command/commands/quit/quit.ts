import { setTimeout as wait } from 'node:timers/promises';

import {
  ActionRowBuilder,
  type APIApplicationCommandOption,
  ApplicationCommandOptionType,
  time as formatTime,
  GuildMember,
  type ModalActionRowComponentBuilder,
  ModalBuilder,
  PermissionFlagsBits,
  TextInputBuilder,
  TextInputStyle,
  userMention
} from "discord.js";

import type { CommandDescriptor, InteractionHandlers } from "../../types";
import { deleteTask, saveTask } from './store';

const declaration: APIApplicationCommandOption = {
  name: 'quit',
  description: 'Disconnect yourself',
  type: ApplicationCommandOptionType.Subcommand
}

const handlers: InteractionHandlers = {
  command: async (interaction) => {
    if (!interaction.guild) {
      interaction.reply('Not in a guild');
      return;
    }

    const modal = new ModalBuilder()
      .setCustomId('quit:set')
      .setTitle('Quit');

    const timeoutInput = new TextInputBuilder()
        .setCustomId('quit:timeout')
        .setLabel('Timeout (in minutes), specify 0 to disable')
        .setStyle(TextInputStyle.Short)
        .setMinLength(1)
        .setValue('0')

    const reasonInput =
        new TextInputBuilder()
        .setCustomId('quit:reason')
        .setLabel('Reason')
        .setStyle(TextInputStyle.Paragraph)

    modal.addComponents(
      [
        timeoutInput,
        reasonInput
      ].map(c => new ActionRowBuilder<ModalActionRowComponentBuilder>().addComponents(c))
    );

    interaction.showModal(modal);
  },

  modal: async (interaction) => {
    if (!interaction.guild) {
      interaction.reply('Not in a guild');
      return;
    }

    const scene = {
      guildId: interaction.guildId!,
      channelId: interaction.channelId!,
      userId: interaction.user.id,
      demander: interaction.user.username
    }

    const reason = interaction.fields.getTextInputValue('quit:reason');
    const timeout = ((parsed) => !isNaN(parsed) ? parsed : 0)(
      parseFloat(interaction.fields.getTextInputValue('quit:timeout'))
    );

    const disconnect = (member: GuildMember) => member.voice.disconnect(reason ?? `Demanded by ${scene.demander}`).catch(() => false as const);

    if (timeout <= 0) {
      const member = await interaction.guild.members.fetch(scene.userId);

      if (!member) {
        interaction.reply(`Could not find you`);
        return;
      }

      if (!member.voice.channel) {
        interaction.reply(`You are not in a voice channel`);
        return;
      }

      const disconnected = await disconnect(member);

      if (disconnected !== false) {
        interaction.reply(`${userMention(scene.userId)} has quited${reason ? ` (Reason: ${reason})`: ''}`);
      }
    } else {
      const permissions = await interaction.client.guilds.fetch(scene.guildId)
        .then(guild => guild.channels.fetch(scene.channelId))
        .then(channel => channel?.permissionsFor(interaction.client.user))
        .then(perms => ({
          manageMessage: perms?.has(PermissionFlagsBits.ManageMessages),
          sendMessage: perms?.has(PermissionFlagsBits.SendMessages)
        }));

      const millisec = timeout * 60 * 1000;
      const quitTime = Math.ceil((Date.now() + millisec) / 1000);

      const { id: messageId } = await interaction.reply({
        content: (permissions.manageMessage
          ? `${userMention(scene.userId)} will quit ${formatTime(quitTime, 'R')}`
          : `OK, ${userMention(scene.userId)} will quit at ${formatTime(quitTime, 'T')}`
        ),
        fetchReply: true
      });

      const abortController = new AbortController();

      saveTask(interaction.client, {
        ...scene,
        permissions,
        messageId,
        quitTime,
        abortController
      });

      const aborted = await wait(millisec,undefined, { signal: abortController.signal })
        .then(() => false)
        .catch(() => true);

      if (aborted) {
        return;
      }

      deleteTask(scene.userId);

      const guild = await interaction.client.guilds.fetch(scene.guildId);
      const channel = await guild.channels.fetch(scene.channelId);
      const member = await guild.members.fetch(scene.userId);

      if (channel?.isTextBased() && messageId && permissions.manageMessage) {
        channel.messages.delete(messageId).catch((e) => {
          console.log('Could not delete message', e.message);
        });
      }

      if (member.voice.channel) {
        const disconnected = await disconnect(member);

        if (disconnected !== false) {
          if (channel?.isTextBased() && permissions.sendMessage) {
            channel.send(`${userMention(scene.userId)} has quited${reason ? ` (Reason: ${reason})`: ''}`);
          }
        }
      }
    }
  }
}

const descriptor: CommandDescriptor = {
  declaration,
  handlers
}

export default descriptor;
