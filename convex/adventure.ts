import { v } from "convex/values";
import { action, internalAction, internalQuery, mutation, query } from "./_generated/server";
import OpenAI from 'openai';
import { api } from "./_generated/api";
import { internal } from "./_generated/api";

const openai = new OpenAI();

export const createAdventure = mutation({
  args: {
    character: v.string(),
  },
  handler: async (ctx, args) => {
    const id = await ctx.db.insert("adventures", {
      characterClass: args.character,
    });

    await ctx.scheduler.runAfter(0, internal.adventure.setupAdventureEntries, {
      adventureId: id,
    });

    return id;
  },
});

export const getAdventure = internalQuery({
	args: {
		adventureId: v.id("adventures"),
	},
	handler: async (ctx, args) => {
		return await ctx.db.get(args.adventureId);
	},
});

export const setupAdventureEntries = internalAction({
	args: {
		adventureId: v.id("adventures"),
	},
	handler: async (ctx, args) => {
		const adventure = await ctx.runQuery(internal.adventure.getAdventure, args)

		if (!adventure) {
			throw new Error("Adventure not found");
		}

		const input = `
			You are a dungeon master who is going to run a text-based adventure RPG for me.
			You need to setup an adventure for me which will involve haing me fight random
			enemy encounters, rewarding me with loots after killing enemies.
			Give me goals and quests to complete, and let me know when I have completed them.
			Finally, let me know when the adventure is over.
			
			When fighting a robot, roll a 6-sided die to determine the outcome of the battle,
			with 1 being the worst outcome and 6 being the best outcome.
			Only roll the die when I tell you to roll.

			During the adventure, I will be able to choose my character class which is a ${adventure.characterClass},
			and I will be able to choose my actions in response to the game's prompts.
			My starting health will be 10, and I will be able to attack enemies, 
			heal myself, and use items to help me in battle. I will have a starting 
			inventory matching my character class, which must include a weaponwith base damage of 1 and a health potion that heals for 3.

			The adventure should have some of the following features:
			- Random enemy encounters
			- Random loot drops
			- The dungeon has 5 levels
			- each level has a boss

			Given this scenario, please ask the player for thier initial actions.
			`;
		const completion = await openai.chat.completions.create({
			model: 'gpt-4o',
			messages: [
				{ role: 'user', content: input },
			],
		});
		const response = completion.choices[0].message.content ?? "";

		await ctx.runMutation(api.chat.insertEntry, {
			input,
			response,
			adventureId: args.adventureId,
		});

	}
});