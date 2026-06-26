import logging
import discord
from discord.ext import commands

logger = logging.getLogger("marketmind.bot.welcome")

class WelcomeCog(commands.Cog):
    def __init__(self, bot):
        self.bot = bot

    @commands.Cog.listener()
    async def on_member_join(self, member: discord.Member):
        """
        Sends an automatic onboarding Direct Message to new members joining the server.
        """
        welcome_message = (
            f"Welcome to MarketMind, {member.name}! 🧠\n\n"
            f"Quick start:\n"
            f"1. ⭐ Star the repo: https://github.com/Savior-Systems/MarketMind\n"
            f"2. 🔧 Try it: `docker compose up -d` OR check out https://demo.marketmind.ai\n"
            f"3. 💬 Introduce yourself in #introductions\n"
            f"4. ❓ Need help? Ask in #help\n\n"
            f"Run `/verify` in any server channel to prove your star and unlock exclusive channels!\n\n"
            f"*Built by one. Owned by everyone.*"
        )
        try:
            await member.send(welcome_message)
            logger.info(f"Sent onboarding welcome DM to member: {member.name} (ID: {member.id})")
        except discord.Forbidden:
            logger.warning(f"Could not send welcome DM to {member.name} (privacy settings/DMs disabled).")
        except Exception as e:
            logger.error(f"Error sending welcome DM: {e}")

async def setup(bot):
    await bot.add_cog(WelcomeCog(bot))
