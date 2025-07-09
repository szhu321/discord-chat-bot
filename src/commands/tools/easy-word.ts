import { ChatInputCommandInteraction, SlashCommandBuilder } from "discord.js";
import { getEasierSynonym } from "../../utils/llm-util";

module.exports = {
    data: new SlashCommandBuilder()
        .setName("easy-word")
        .setDescription("Finds a easier word.")
        .addStringOption(option =>
            option
                .setName("word")
                .setDescription("Give the bot a word so it can find a easier synonym.")
                .setRequired(true)),
    async execute(interaction: ChatInputCommandInteraction) {
        // Let's discord know that the a message will be sent soon.
        await interaction.deferReply();
        // Run chat bot. A reply will be returned.
        const formattedReply = await getEasierSynonym(
            (interaction.options.getString("word") ?? "Hi!"),
        );
        // Send the reply.
        await interaction.editReply(formattedReply ?? "Error!");
    },
}