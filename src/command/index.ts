import {
  ApplicationCommandOptionType,
  ApplicationCommandType,
  type RESTPostAPIChatInputApplicationCommandsJSONBody
} from "discord.js";

import { sortBy } from "lodash";

import kickAll from "./commands/kick-all";
import kickRole from "./commands/kick-role";
import moveAll from "./commands/move-all";
import moveRole from "./commands/move-role";
import annihilate from "./commands/annihilate";
import marshal from "./commands/marshal";
import kick from "./commands/kick";
import move from "./commands/move";
import quit from "./commands/quit";
import protect from "./commands/protect";

export const descriptors = {
  kickAll,
  kickRole,
  moveAll,
  moveRole,
  annihilate,
  marshal,
  kick,
  move,
  ...quit,
  ...protect
}

export const createCommandDeclarations = (baseCommand: string = 'reloc'): RESTPostAPIChatInputApplicationCommandsJSONBody => ({
  name: baseCommand,
  description: 'Reloc',
  type: ApplicationCommandType.ChatInput,
  options: Object.values(descriptors)
    .map(desc => {
      const { declaration } = desc;
      if (declaration.type !== ApplicationCommandOptionType.Subcommand) {
        return declaration;
      }

      const { options } = declaration;

      return {
        ...declaration,
        options: options ? sortBy(options, opt => opt.required ? 0 : 1) : []
      }
    })
})
