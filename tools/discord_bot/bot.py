import os
import asyncio
import logging
from dotenv import load_dotenv
import discord
from discord.ext import commands

# Configure Logging
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s"
)
logger = logging.getLogger("marketmind.bot")

load_dotenv()

# Setup bot with required intents (requires gateway settings in developer portal)
intents = discord.Intents.default()
intents.members = True
intents.message_content = True

bot = commands.Bot(command_prefix="!", intents=intents)

@bot.event
async def on_ready():
    logger.info(f"Bot logged in as {bot.user.name} (ID: {bot.user.id})")
    try:
        synced = await bot.tree.sync()
        logger.info(f"Synced {len(synced)} application slash command(s).")
    except Exception as e:
        logger.error(f"Failed to sync slash commands: {e}")

async def load_extensions():
    # Cog list to load on startup
    cogs = [
        "cogs.verification",
        "cogs.welcome",
        "cogs.metrics",
        "cogs.leaderboard"
    ]
    for cog in cogs:
        try:
            await bot.load_extension(cog)
            logger.info(f"Loaded extension: {cog}")
        except Exception as e:
            logger.error(f"Failed to load extension {cog}: {e}")

async def main():
    async with bot:
        await load_extensions()
        token = os.getenv("DISCORD_TOKEN")
        if not token:
            logger.error("DISCORD_TOKEN environment variable not set. Exiting...")
            return
        await bot.start(token)

if __name__ == "__main__":
    try:
        asyncio.run(main())
    except KeyboardInterrupt:
        logger.info("Bot shutting down...")
