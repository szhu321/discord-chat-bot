import { ChatInputCommandInteraction, SlashCommandBuilder } from "discord.js";
import { chatWithBot } from "../../utils/llm-util";

module.exports = {
    cooldown: 5,
    data: new SlashCommandBuilder()
        .setName("chat")
        .setDescription("Chat with AI.")
        .addStringOption(option =>
            option
                .setName("message")
                .setDescription("Sends a message to bot.")
                .setRequired(true)),
    async execute(interaction: ChatInputCommandInteraction) {
        // Let's discord know that the a message will be sent soon.
        await interaction.deferReply();
        // Run chat bot. A reply will be returned.
        const { formattedReply } = await chatWithBot({
            guildId: interaction.guildId,
            botName: interaction.client.user.displayName,
            botId: interaction.client.user.id,
            userId: interaction.user.id,
            userName: interaction.user.displayName,
            messageContent: (interaction.options.getString("message") ?? "Hi!"),
        });
        // Send the reply.
        await interaction.editReply(formattedReply);
    }
}
