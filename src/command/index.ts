import {
  ApplicationCommandType,
  type RESTPostAPIChatInputApplicationCommandsJSONBody
} from "discord.js";

import kickAll from "./commands/kick-all";
import kickRole from "./commands/kick-role";
import moveAll from "./commands/move-all";
import moveRole from "./commands/move-role";
import annihilate from "./commands/annihilate";

export const descriptors = {
  kickAll,
  kickRole,
  moveAll,
  moveRole,
  annihilate,
}

export const createCommandDeclarations = (baseCommand: string = 'reloc'): RESTPostAPIChatInputApplicationCommandsJSONBody => ({
  name: baseCommand,
  description: 'Reloc',
  type: ApplicationCommandType.ChatInput,
  options: Object.values(descriptors).map(desc => desc.declaration)
})
