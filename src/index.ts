import { config } from 'dotenv';
config();

import {
  Client,
  GatewayIntentBits,
  TextChannel,
  ChannelType,
} from 'discord.js';

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMembers,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.GuildMessageReactions,
  ],
});

const token = process.env.DISCORD_BOT_TOKEN || '';
const votingChannelId = process.env.VOTING_CHANNEL_ID || '';
const tempRoleId = process.env.TEMP_ROLE_ID || '';
const successRoleId = process.env.SUCCESS_ROLE_ID || '';
const generalChannelId = process.env.GENERAL_CHANNEL_ID || '';
const requiredVotes = 3; // Hardcoded to 3 votes

interface Vote {
  userId: string;
  votes: Set<string>;
}

const votes: Record<string, Vote> = {};

client.once('ready', () => {
  console.log(`Logged in as ${client.user?.tag}!`);
});

client.on('guildMemberAdd', async (member) => {
  // Assign temporary role
  const tempRole = member.guild.roles.cache.get(tempRoleId);
  if (tempRole) {
    try {
      await member.roles.add(tempRole);
      console.log(`Assigned temporary role to ${member.user.tag}`);
    } catch (error) {
      console.error(`Failed to assign temporary role`, error);
    }
  }

  const channel = member.guild.channels.cache.get(votingChannelId);
  if (channel?.type === ChannelType.GuildText) {
    const message = await (channel as TextChannel).send(
      `A new member, ${member}, has joined. React with 👍 to keep them or 👎 to kick them.`
    );
    await message.react('👍');
    await message.react('👎');
    votes[member.id] = { userId: member.id, votes: new Set() };
    console.log(`Voting started for ${member.user.tag}`);
  }
});

client.on('messageReactionAdd', async (reaction, user) => {
  // Ensure the bot's reactions don't count
  if (user.bot) return;

  if (reaction.message.channel.id === votingChannelId) {
    const member = reaction.message.mentions.members?.first();
    if (!member) return;

    const vote = votes[member.id];
    if (!vote) return;

    if (reaction.emoji.name === '👍') {
      vote.votes.add(user.id);
    } else if (reaction.emoji.name === '👎') {
      vote.votes.delete(user.id);
    }

    if (vote.votes.size >= requiredVotes) {
      const successRole = member.guild.roles.cache.get(successRoleId);
      const tempRole = member.guild.roles.cache.get(tempRoleId);
      if (successRole && tempRole) {
        try {
          await member.roles.remove(tempRole);
          console.log(
            `Removed temporary role from ${member.user.tag}`
          );
          await member.roles.add(successRole);
          console.log(`Assigned success role to ${member.user.tag}`);
          await reaction.message.edit(
            `${member} has been voted to stay and assigned the success role.`
          );

          const generalChannel =
            member.guild.channels.cache.get(generalChannelId);
          if (generalChannel?.type === ChannelType.GuildText) {
            await (generalChannel as TextChannel).send(
              `${member.user.tag} has passed judgement and has been granted entry`
            );
          }
        } catch (error) {
          console.error(
            `Failed to assign success role or remove temporary role`,
            error
          );
        }
      }
      delete votes[member.id];
    }
  }
});

client.on('messageReactionRemove', async (reaction, user) => {
  // Ensure the bot's reactions don't count
  if (user.bot) return;

  if (reaction.message.channel.id === votingChannelId) {
    const member = reaction.message.mentions.members?.first();
    if (!member) return;

    const vote = votes[member.id];
    if (!vote) return;

    if (reaction.emoji.name === '👍') {
      vote.votes.delete(user.id);
    } else if (reaction.emoji.name === '👎') {
      vote.votes.add(user.id);
    }

    if (vote.votes.size >= requiredVotes) {
      const successRole = member.guild.roles.cache.get(successRoleId);
      const tempRole = member.guild.roles.cache.get(tempRoleId);
      if (successRole && tempRole) {
        try {
          await member.roles.remove(tempRole);
          console.log(
            `Removed temporary role from ${member.user.tag}`
          );
          await member.roles.add(successRole);
          console.log(`Assigned success role to ${member.user.tag}`);
          await reaction.message.edit(
            `${member} has been voted to stay and assigned the success role.`
          );

          const generalChannel =
            member.guild.channels.cache.get(generalChannelId);
          if (generalChannel?.type === ChannelType.GuildText) {
            await (generalChannel as TextChannel).send(
              `${member.user.tag} has passed judgement and has been granted entry`
            );
          }
        } catch (error) {
          console.error(
            `Failed to assign success role or remove temporary role`,
            error
          );
        }
      }
      delete votes[member.id];
    } else if (reaction.emoji.name === '👎') {
      try {
        await member.kick('Voted out by members.');
        await reaction.message.edit(
          `${member} has been kicked from the server.`
        );
      } catch (error) {
        console.error(`Failed to kick member`, error);
      }
      delete votes[member.id];
    }
  }
});

client.login(token);
