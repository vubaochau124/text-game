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
			You are a dungeon master who is going to run a text based adventure RPG for me.
			You will need to setup an adventure for me which will involve having
			me fight random enemy encounters, reward me with loot after killing enemies,
			give me goals and quests, and finally let me know when I finish the overall adventure.

			When I am fighting enemies, please ask me to roll 6 sided dices, with a 1 being the worst outcome
			of the scenario, and a 6 being the best outcome of the scenario.  Do not roll the dice for me,
			I as the player should input this and you need to describe the outcome with my input.

			During this entire time, please track my health points which will start at 10, 
			my character class which is a ${adventure.characterClass}, 
			and my inventory which will start with a weapon and a health potion.

			My starting health will be 10, and I will be able to attack enemies, 
			heal myself, and use items to help me in battle. 
			I will have a starting inventory matching my character class, 
			which must include a weaponwith base damage of 1: 
			- a rusty sword that does 1 damage if ${adventure.characterClass} is a warrior,
			- a wooden set of bow and arrows that does 1 damage if ${adventure.characterClass} is an archer,
			- a small staff that does 1 damage if ${adventure.characterClass} is a wizard,
			and a health potion that heals for 3.

			The adventure should have the following features:
			- Random enemy encounters
			- Random loot drops
			- The dungeon has 5 levels
			- each level has a boss

			Given this scenario, please ask the player for thier initial actions.

			Don't give the player the choices the choose unless they ask for suggestions.

			PLEASE MAKE SURE TO NEVER ROLL FOR THE PLAYER.  YOU SHOULD ALWAYS ASK THE PLAYER FOR HIS NEXT STEPS.
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