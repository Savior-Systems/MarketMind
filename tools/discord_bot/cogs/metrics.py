import os
import logging
from datetime import datetime, timezone
import aiohttp
import discord
from discord import app_commands
from discord.ext import commands, tasks

logger = logging.getLogger("marketmind.bot.metrics")

MILESTONES = {
    1000: "Live coding session",
    5000: "Developer AMA Session",
    10000: "Interactive live dashboard",
    25000: "Celery task visualizer",
    50000: "Brand Voice Customizer UI",
    100000: "Advanced Analytics Module",
    250000: "Enterprise Multi-brand support",
    500000: "Dedicated AI model fine-tuning",
    1000000: "MarketMind SaaS hosting launch"
}

class MetricsCog(commands.Cog):
    def __init__(self, bot):
        self.bot = bot
        self.repo = os.getenv("GITHUB_REPO", "Savior-Systems/MarketMind")
        if self.repo == "owner/repo" or not self.repo:
            self.repo = "Savior-Systems/MarketMind"
        
        self.last_star_count = 0
        self.star_tracking_loop.start()

    def cog_unload(self):
        self.star_tracking_loop.cancel()

    async def fetch_github_stars(self) -> dict:
        url = f"https://api.github.com/repos/{self.repo}"
        headers = {"User-Agent": "MarketMind-Bot"}
        async with aiohttp.ClientSession() as session:
            try:
                async with session.get(url, headers=headers) as resp:
                    if resp.status == 200:
                        return await resp.json()
            except Exception as e:
                logger.error(f"Failed to fetch GitHub statistics: {e}")
        return {}

    @tasks.loop(hours=6.0)
    async def star_tracking_loop(self):
        """Runs every 6 hours to fetch stargazers count and post tracker logs."""
        await self.bot.wait_until_ready()
        
        data = await self.fetch_github_stars()
        if not data:
            return

        current_stars = data.get("stargazers_count", 0)
        
        if self.last_star_count == 0:
            self.last_star_count = current_stars
            return

        delta = current_stars - self.last_star_count
        timestamp = datetime.now(timezone.utc).strftime("%Y-%m-%d %H:%M:%S UTC")
        
        # Calculate daily rate
        daily_rate = delta * 4  # 6h delta * 4 = 24h estimation
        
        # Determine next milestone
        next_milestone_target = 1000
        next_milestone_reward = "Live coding session"
        
        for target, reward in sorted(MILESTONES.items()):
            if current_stars < target:
                next_milestone_target = target
                next_milestone_reward = reward
                break
        
        percent = min(100.0, (current_stars / next_milestone_target) * 100)

        # Star Tracker message formatting
        tracker_message = (
            f"⭐ **Star Update** — {timestamp}\n"
            f"Current: **{current_stars:,}** stars\n"
            f"Change: **+{delta}** in last 6 hours\n"
            f"Daily rate: **+{daily_rate}** stars/day\n"
            f"Next milestone: **{next_milestone_target:,}** stars ({percent:.1f}% there - *{next_milestone_reward}*)\n"
            f"Track live: https://savior-systems.github.io/MarketMind"
        )

        # Post to #star-tracker channel
        tracker_channel = discord.utils.get(self.bot.get_all_channels(), name="star-tracker")
        if tracker_channel and isinstance(tracker_channel, discord.TextChannel):
            try:
                await tracker_channel.send(tracker_message)
            except Exception as e:
                logger.error(f"Failed to post to #star-tracker: {e}")

        # Check for crossed milestones
        for target, reward in sorted(MILESTONES.items()):
            if self.last_star_count < target <= current_stars:
                milestones_channel = discord.utils.get(self.bot.get_all_channels(), name="milestones")
                if milestones_channel and isinstance(milestones_channel, discord.TextChannel):
                    milestone_message = (
                        f"🎉 **MILESTONE REACHED: {target:,} STARS!**\n"
                        f"Reward unlocked: **{reward}** 🚀\n"
                        f"Thank you to our amazing community! We own this together."
                    )
                    try:
                        await milestones_channel.send(milestone_message)
                    except Exception as e:
                        logger.error(f"Failed to post to #milestones: {e}")

        self.last_star_count = current_stars

    @app_commands.command(name="stats", description="Shows current star counts, growth rate, and milestones.")
    async def stats(self, interaction: discord.Interaction):
        await interaction.response.defer()
        
        data = await self.fetch_github_stars()
        if not data:
            await interaction.followup.send("❌ Failed to query GitHub repository statistics.", ephemeral=True)
            return

        current_stars = data.get("stargazers_count", 0)
        forks = data.get("forks_count", 0)
        open_issues = data.get("open_issues_count", 0)

        next_target = 1000
        reward = "Live coding session"
        for target, r in sorted(MILESTONES.items()):
            if current_stars < target:
                next_target = target
                reward = r
                break

        percent = min(100.0, (current_stars / next_target) * 100)

        embed = discord.Embed(
            title="🧠 MarketMind Star Tracking Statistics",
            color=0x8b5cf6
        )
        embed.add_field(name="⭐ Stars", value=f"**{current_stars:,}**", inline=True)
        embed.add_field(name="🍴 Forks", value=f"**{forks:,}**", inline=True)
        embed.add_field(name="🪲 Open Issues", value=f"**{open_issues:,}**", inline=True)
        
        embed.add_field(
            name="🏁 Next Milestone", 
            value=f"**{next_target:,}** Stars ({percent:.1f}% complete)\nReward: *{reward}*", 
            inline=False
        )
        
        embed.set_footer(text="Built by one. Owned by everyone.")
        
        await interaction.followup.send(embed=embed)

async def setup(bot):
    await bot.add_cog(MetricsCog(bot))
