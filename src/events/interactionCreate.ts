import { Events, Interaction, MessageFlags } from "discord.js";
import DiscordClient from "../DiscordClient";

module.exports = {
    name: Events.InteractionCreate,
    async execute(interaction: Interaction) {
        // Only handle slash commands
        if (!interaction.isChatInputCommand()) {
            return;
        }

        const client = interaction.client as DiscordClient;
        const command = client.commands.get(interaction.commandName);

        if (!command) {
            console.error(`No command matching ${interaction.commandName} was found.`);
            return;
        }

        try {
            await command.execute(interaction);

            
        } catch (error) {
            console.error(error);
            if (interaction.replied || interaction.deferred) {
                await interaction.followUp({ content: 'There was an error while executing this command!', flags: MessageFlags.Ephemeral });
            } else {
                await interaction.reply({ content: 'There was an error while executing this command!', flags: MessageFlags.Ephemeral });
            }
        }
    },
};