import {
  ApplicationCommandType,
  type RESTPostAPIChatInputApplicationCommandsJSONBody
} from "discord.js";

import kickAll from "./commands/kick-all";
import kickRole from "./commands/kick-role";

export const descriptors = {
  kickAll,
  kickRole,
}

export const createCommandDeclarations = (baseCommand: string = 'reloc'): RESTPostAPIChatInputApplicationCommandsJSONBody => ({
  name: baseCommand,
  description: 'Reloc',
  type: ApplicationCommandType.ChatInput,
  options: Object.values(descriptors).map(desc => desc.declaration)
})
