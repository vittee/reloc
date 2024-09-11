import {
  type APIApplicationCommandOption,
  ApplicationCommandOptionType
} from "discord.js";

import type { CommandDescriptor, InteractionHandlers } from "../../types";
import { abortTask } from "./store";

const declaration: APIApplicationCommandOption = {
  name: 'abort-quit',
  description: 'Abort the deferred disconnection for yourself',
  type: ApplicationCommandOptionType.Subcommand,
}

const handlers: InteractionHandlers = {
    command: async (interaction) => {
    if (!interaction.guild) {
      interaction.reply('Not in a guild');
      return;
    }

    const aborted = await abortTask(interaction.client, interaction.user.id);

    interaction.reply(
      aborted ? 'OK, Aborted' : 'Nothing to abort'
    );
  }
}

const descriptor: CommandDescriptor = {
  declaration,
  handlers
}

export default descriptor;
