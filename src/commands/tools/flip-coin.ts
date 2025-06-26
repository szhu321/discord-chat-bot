import { SlashCommandBuilder } from "discord.js";

module.exports = {
    data: new SlashCommandBuilder()
        .setName("flip-coin")
        .setDescription("Flips a coin. 50/50 for heads or tails."),
    async execute(interaction: any) {
        const value = Math.random();
        let result = "Tails";
        if(value > 0.5) {
            result = "Heads";
        }
        await interaction.reply(`You got ${result}!`);
    },
}