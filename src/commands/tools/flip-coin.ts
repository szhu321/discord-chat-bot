import { ChatInputCommandInteraction, SlashCommandBuilder } from "discord.js";
import flipCoin from "../../tools/flip-coin";

module.exports = {
    data: new SlashCommandBuilder()
        .setName("flip-coin")
        .setDescription("Flips a coin. 50/50 for heads or tails."),
    async execute(interaction: ChatInputCommandInteraction) {
        let result = flipCoin();
        await interaction.reply(`You got ${result}!`);
    },
}