import {
  type ChatInputCommandInteraction,
  type APIApplicationCommandOption,
  ModalSubmitInteraction
} from "discord.js";

export type InteractionHandlers = {
  command: (interaction: ChatInputCommandInteraction, ...args: any) => Promise<any>;
  modal?: (interaction: ModalSubmitInteraction, ...args: any) => Promise<any>;
}

export type CommandDescriptor = {
  declaration: APIApplicationCommandOption,
  handlers: InteractionHandlers;
}
