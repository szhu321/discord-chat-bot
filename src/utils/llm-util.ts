import OpenAI from "openai";
import dotenv from "dotenv";
import { addChatHistory, queryChatHistory } from "./chroma-util";
import flipCoin from "../tools/flip-coin";
import { encodeChat } from "gpt-tokenizer";
import { ChatMessage } from "gpt-tokenizer/esm/GptEncoding";
import { UserData, getAllMemberInfo } from "../tools/user-id";
import { Guild } from "discord.js";

dotenv.config();

type MessageItem =
    { role: "user" | "assistant" | "system", content: string } |
    { role: "tool", content: string, tool_call_id: string };

type MessageMap = { [id: string]: MessageItem[] };

const openAIClient = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
})

const model = process.env.OPENAI_MODEL || 'gpt-4o-mini';
const temperature = 0.75;
const systemMessage = `You are an AI assistant that is speaking with users on discord.
You can be joking at times and upset at times. Otherwise you are mainly friendly and can use emojis.
You are to respond with as few sentences as possible, max 5. No markdown.
If you don't know the answer to a question, say you don't know. Do not make it up.
Do not end your response with a question unless it is absolutely necessary.
The user's message will be formatted as follows, **name**:message.
You can ping other discord users by using the following format: <@[userid]>.
The first user message will contain relevant past conversations.
The seconds user message will contain the users' discord information.
`;

const messageMap: MessageMap = {};

const MAX_MESSAGE_CHAIN_LENGTH = 12;
/** The max number of results that should be retrieved from chromadb. */
const MAX_CHROMA_RESULTS_LENGTH = 10;
const MAX_USER_MESSAGE_CHAR_COUNT = 600;


interface ChatWithBotConfig {
    guild: Guild | null;
    botName: string;
    botId: string;
    userId: string;
    userName: string;
    messageContent: string;
}

export const chatWithBot = async ({
    guild,
    botName,
    botId,
    userId,
    userName,
    messageContent,
}: ChatWithBotConfig) => {
    const username = userName;
    const assistantName = botName;
    const messageChainId = guild?.id || userId;

    // Gets the message chain for the current user.
    let messageChain = messageMap[messageChainId];
    if (messageChain === undefined) {
        messageChain = [];
        messageMap[messageChainId] = messageChain;
    }

    // --- 1. Prepares the bot's default system message. --- 
    let systemMessageModified = `Your name is ${assistantName}. Your discord tag is <@${botId}>.\n${systemMessage}`;

    const userMessageRaw = (messageContent).slice(0, MAX_USER_MESSAGE_CHAR_COUNT);
    const userMessage = `**${username}**:` + userMessageRaw;


    // --- 2. Add relavant past conversations, queried from chromadb. --- 
    let queryResult = await queryChatHistory({ queryTexts: [userMessage], nResults: MAX_CHROMA_RESULTS_LENGTH });

    let previousContext = "The following context may be useful in the conversation: ";
    queryResult.documents[0].forEach((item) => {
        previousContext += "\n" + item;
    });

    // --- 3. Provide the userid's so the bot can ping the correct user. ---  

    let allUsers: UserData[] = [];
    if(guild) {
        allUsers = await getAllMemberInfo(guild);
    }

    let memberContext = "The following list out each discord user and their id. This can be used to ping them.";
    allUsers.forEach((user) => {
        memberContext += `\nName:${user.name}, Id:${user.id}`;
    });


    // --- 4. Build the message chain. --- 
    const messages: MessageItem[] = [
        { role: "system", content: systemMessageModified },
        { role: "user", content: previousContext },
        { role: "user", content: memberContext },
        ...messageChain,
        { role: "user", content: userMessage }
    ]

    // console.log(messages);
    console.log(`Request with ${countTokens(messages)} tokens.`);

    // --- 5. Call openai ---
    const completion = await openAIClient.chat.completions.create({
        model: model,
        messages: messages,
        tools: [
            {
                type: "function",
                function: {
                    name: "flip-coin",
                    description: `Flips a coin and returns "Heads" or "Tails". Call this when the user wants to flip a coin.`,
                }
            }
        ],
        temperature: temperature,
    });

    let response: string | undefined;
    let replyHeader: string = "";

    // --- 6. Perform tool call if needed. ---
    if (completion.choices[0].finish_reason == "tool_calls") {
        const toolCallResponse = completion.choices[0].message;
        const toolCallResults: MessageItem[] = [];
        if (toolCallResponse.tool_calls) {
            replyHeader = `**${assistantName} used:** \n`
            let flipCoinCallCount = 0;

            // Break if there are more than 10 tool calls.
            if (toolCallResponse.tool_calls.length > 10) {
                // await interaction.editReply("Sorry, I cannot make more than 10 tool calls at once!");
                const errorMessage = "Sorry, I cannot make more than 10 tool calls at once!";
                return {
                    formattedReply: errorMessage,
                    rawReply: errorMessage,
                };
            }

            toolCallResponse.tool_calls.forEach((toolCall) => {
                if (toolCall.function.name === "flip-coin") {
                    const flipCoinResult = flipCoin();
                    // console.log("flipping coin");
                    flipCoinCallCount++;
                    toolCallResults.push({ role: "tool", content: flipCoinResult, tool_call_id: toolCall.id });
                }
            });

            if (flipCoinCallCount > 1) {
                replyHeader += `/flip-coin (${flipCoinCallCount} times)\n`;
            } else if (flipCoinCallCount == 1) {
                replyHeader += `/flip-coin\n`;
            }
            // Call openai
            const afterToolResponse = await openAIClient.chat.completions.create({
                model: model,
                messages: [
                    ...messages,
                    toolCallResponse,
                    ...toolCallResults,
                ],
                temperature: temperature,
            });
            response = afterToolResponse.choices[0].message.content ?? "I do not understand.";
        }
    }

    if (!response) {
        response = completion.choices[0].message.content ?? "I do not understand.";
    }

    // --- 7. Store user's message and openai's response into the messageChain. ---
    messageChain.push({
        role: "user",
        content: userMessage,
    });
    messageChain.push({
        role: "assistant",
        content: response,
    });

    if (messageChain.length > MAX_MESSAGE_CHAIN_LENGTH) {
        messageChain.splice(0, 6);
    }


    // --- 8. Store reply into chromadb and return the reply. --- 
    const reply = `**${username} said:**\n${userMessageRaw}\n${replyHeader}**${assistantName} replied:**\n${response}`;
    const storedReply = `**${username} said:**\n${userMessageRaw}\n**${assistantName} replied:**\n${response}`;

    await addChatHistory({
        ids: [(new Date().toJSON())],
        documents: [storedReply],
    });

    // await interaction.editReply(reply);
    return {
        formattedReply: reply,
        rawReply: response,
    };
}

export const getEasierSynonym = async (word: string) => {
    const completion = await openAIClient.chat.completions.create({
        model: model,
        messages: [
            { role: "system", content: `You are a bot that makes hard words easier. You are to return a synonym of the word provided by the user. Only respond with one word and nothing else.` },
            { role: "user", content: word },
        ],
    });
    return completion.choices[0].message.content;
}


/**
 * Counts the number of tokens inside messages.
 * @param messages A list of MessageItems.
 * @returns Number of tokens inside messages. -1 if failed to count.
 */
export const countTokens = (messages: MessageItem[]) => {
    const chat: ChatMessage[] = [];
    messages.forEach((message) => {
        if (message.role !== "tool") {
            chat.push({
                role: message.role,
                content: message.content,
            });
        }
    });

    try {
        const chatTokens = encodeChat(chat, model as any);
        return chatTokens.length;
    } catch (e) {
        return -1;
    }
}