import { ChatInputCommandInteraction, SlashCommandBuilder } from "discord.js";
import OpenAI from "openai";
import DiscordClient from "../../DiscordClient";

interface MessageItem {
    role: "user" | "assistant" | "system";
    content: string;
}

type MessageMap = { [userId: string]: MessageItem[] };

const openAIClient = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
})

const model = 'gpt-4o-mini';
const systemMessage = `
You are an AI assistant that is speaking with the user on discord.
You can be joking at times and upset at times, depending on the user's message. 
Otherwise you are mainly friendly.
You are to respond with as few sentences as possible, max 5. No markdown.
If you don't know the answer to a question, say you don't know. Don't make it up.
Do not end your response with a question unless it is absolutely necessary.
`;

const messageMap: MessageMap = {};

module.exports = {
    data: new SlashCommandBuilder()
        .setName("chat")
        .setDescription("Chat with AI.")
        .addStringOption(option =>
            option
                .setName("message")
                .setDescription("Sends a message to bot.")
                .setRequired(true)),
    async execute(interaction: ChatInputCommandInteraction) {
        const userId = interaction.user.id;
        const username = interaction.user.username;
        const assistantName = interaction.client.user.username;
        // Gets the message chain for the current user.
        let userMessageChain = messageMap[userId];
        if (userMessageChain === undefined) {
            userMessageChain = [];
            messageMap[userId] = userMessageChain;
        }

        let systemMessageModified = `
            Your name is ${assistantName}.
            You are speaking with ${username}.
            ${systemMessage}
        `;

        const userMessage = interaction.options.getString("message") ?? "Hi!";

        // Call openai
        const completion = await openAIClient.chat.completions.create({
            model: model,
            messages: [
                { role: "system", content: systemMessageModified },
                ...userMessageChain,
                { role: "user", content: userMessage.slice(0, 1000) },
            ]
        });

        const response = completion.choices[0].message.content ?? "I do not understand.";

        // Store user message and openai response into messageChain.
        userMessageChain.push({
            role: "user",
            content: userMessage.slice(0, 100),
        }, {
            role: "assistant",
            content: response,
        });
        if (userMessageChain.length > 50) {
            userMessageChain.splice(0, 2);
        }

        // console.log(userMessageChain);

        await interaction.deferReply();
        await interaction.editReply(`${response}`);
    },
}