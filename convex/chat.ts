import { v } from "convex/values";
import { action, internalQuery, mutation, query } from "./_generated/server";
import { api, internal } from "./_generated/api";
import OpenAI from "openai";
import { ChatOpenAI } from "@langchain/openai";
import { HumanMessage, SystemMessage } from "@langchain/core/messages";

const openai = new OpenAI();

const chatModel = new ChatOpenAI({
  modelName: "gpt-4o",
  openAIApiKey: process.env.OPENAI_API_KEY, // Ensure this is set in your environment
});

export const getEntriesForAdventure = internalQuery({
  args: {
    adventureId: v.id("adventures"),
  },
  handler: async (ctx, args) => {
    return ctx.db
      .query("entries")
      .filter((q) => q.eq(q.field("adventureId"), args.adventureId))
      .collect();
  },
});

export const handlePlayerAction = action({
  args: {
    message: v.string(),
    adventureId: v.id("adventures"),
  },
  handler: async (ctx, args) => {
    // Fetch previous entries for the adventure
    const entries = await ctx.runQuery(internal.chat.getEntriesForAdventure, {
      adventureId: args.adventureId,
    });

    // Construct the conversation history
    const messages = [
      new SystemMessage("You are a helpful assistant in a text-based adventure game."),
      ...entries.flatMap((entry) => [
        new HumanMessage(entry.input), // User's input
        new SystemMessage(entry.response), // AI's response
      ]),
      new HumanMessage(args.message), // Add the user's current message
    ];

    // Generate a response using LangChain
    const completion = await chatModel.call(messages);

    const input = args.message;
    const response = completion.text ?? "";

    await ctx.runMutation(api.chat.insertEntry, {
      input,
      response,
      adventureId: args.adventureId,
    });

    console.log("Generated response:", response);
  },
});

export const insertEntry = mutation({
  args: {
    input: v.string(),
    response: v.string(),
    adventureId: v.id("adventures"),
  },
  handler: async (ctx, args) => {
    const entryId = await ctx.db.insert("entries", {
      input: args.input,
      response: args.response,
      adventureId: args.adventureId,
      health: 10,
      inventory: [],
    });

    await ctx.scheduler.runAfter(0, internal.visualize.visualizeLatestEntries, {
      adventureId: args.adventureId,
      entryId: entryId,
    });

    await ctx.scheduler.runAfter(0, internal.inventory.summarizeInventory, {
      adventureId: args.adventureId,
      entryId: entryId,
    });
  },
});

export const getAllEntries = query({
  args: {
    adventureId: v.id("adventures"),
  },
  handler: async (ctx, args) => {
    const entries = await ctx.db
      .query("entries")
      .filter((q) => q.eq(q.field("adventureId"), args.adventureId))
      .collect();
    return entries;
  },
});
