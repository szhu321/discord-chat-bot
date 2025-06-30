import { ChatInputCommandInteraction, SlashCommandBuilder } from "discord.js";
import OpenAI from "openai";

interface MessageItem {
    role: "user" | "assistant" | "system";
    content: string;
}

type MessageMap = { [id: string]: MessageItem[] };

const openAIClient = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
})

const model = 'gpt-4o-mini';
const systemMessage = `
You are an AI assistant that is speaking with users on discord.
You can be joking at times and upset at times. Otherwise you are mainly friendly and can use emojis.
You are to respond with as few sentences as possible, max 5. No markdown.
If you don't know the answer to a question, say you don't know. Do not make it up.
Do not end your response with a question unless it is absolutely necessary.
The user's message will be formatted as follows, **name**:message.
`;

const messageMap: MessageMap = {};

const MAX_MESSAGE_CHAIN_LENGTH = 30;

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
        const guildId = interaction.guildId;
        const userId = interaction.user.id;
        const username = interaction.user.username;
        const assistantName = interaction.client.user.username;
        const messageChainId = guildId || userId;

        // Gets the message chain for the current user.
        let messageChain = messageMap[messageChainId];
        if (messageChain === undefined) {
            messageChain = [];
            messageMap[messageChainId] = messageChain;
        }

        let systemMessageModified = `
            Your name is ${assistantName}.
            ${systemMessage}
        `;

        const userMessageRaw = (interaction.options.getString("message") ?? "Hi!");
        const userMessage = `**${username}**:` + userMessageRaw;

        // Let's discord know that the a message will be sent soon.
        await interaction.deferReply();

        // Call openai
        const completion = await openAIClient.chat.completions.create({
            model: model,
            messages: [
                { role: "system", content: systemMessageModified },
                ...messageChain,
                { role: "user", content: userMessage.slice(0, 1000) },
            ]
        });

        const response = completion.choices[0].message.content ?? "I do not understand.";

        // Store user message and openai response into messageChain.
        messageChain.push({
            role: "user",
            content: userMessage.slice(0, 200),
        }, {
            role: "assistant",
            content: response,
        });
        if (messageChain.length > MAX_MESSAGE_CHAIN_LENGTH) {
            messageChain.splice(0, 10);
        }
        
        await interaction.editReply(`**${username} said:**\n${userMessageRaw}\n**${assistantName} replied:**\n${response}`);
    },
}