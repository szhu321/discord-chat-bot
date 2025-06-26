import { ChatInputCommandInteraction, GuildMember, SlashCommandBuilder } from "discord.js";

module.exports = {
    data: new SlashCommandBuilder()
        .setName("user")
        .setDescription("Provides information about the user."),
    async execute(interaction: ChatInputCommandInteraction) {
        // interaction.user is the object representing the User who ran the command
		// interaction.member is the GuildMember object, which represents the user in the specific guild
        let joinedOn = "[Unknown]";
        if(interaction.member instanceof GuildMember) {
            let date = interaction.member.joinedAt;
            if(date) {
                joinedOn = date.toDateString();
            }
        }            
        await interaction.reply(`This command was run by ${interaction.user.username}, who joined on ${joinedOn}.`);
    }
}