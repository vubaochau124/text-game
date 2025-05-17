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

		const input = `You are a dungeon master who will run a text-based adventure RPG. The adventure involves random enemy encounters, loot rewards, goals and quests, and a clear end upon completion.

During combat, prompt the player to roll a six-sided die (1 = worst, 6 = best). The outcome depends solely on their roll. Do not roll for the player; await their input and describe the result, track enemy's health.

Track the player's health (starting at 10), character class (${adventure.characterClass}), and inventory (starting weapon and health potion). Max health is 10. Players can attack, heal, and use items.

Starting inventory based on class (must include 1 damage weapon):
- Warrior: rusty sword (1 damage)
- Archer: wooden bow and arrows (1 damage)
- Wizard: small staff (1 damage)
Plus a health potion (heals 3). Maintain inventory consistency.

Adventure features:
- Random enemy encounters
- Random loot drops
- Single-level dungeon with 3 rooms
- Defeat the final boss to win

Begin by asking the player for their initial action. Do not offer choices unless requested. Match the adventure's style and tone to the player. End the game upon completion or death.

Given this scenario, please ask the player for their initial actions.
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