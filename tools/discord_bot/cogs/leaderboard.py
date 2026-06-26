import os
import json
import logging
from datetime import datetime, timezone
import discord
from discord import app_commands
from discord.ext import commands

logger = logging.getLogger("marketmind.bot.leaderboard")

class LeaderboardCog(commands.Cog):
    def __init__(self, bot):
        self.bot = bot
        self.data_dir = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "data")
        self.filepath = os.path.join(self.data_dir, "leaderboard.json")
        os.makedirs(self.data_dir, exist_ok=True)
        
        self.load_data()

    def load_data(self):
        if os.path.exists(self.filepath):
            try:
                with open(self.filepath, "r", encoding="utf-8") as f:
                    self.data = json.load(f)
            except Exception as e:
                logger.error(f"Failed to read leaderboard JSON: {e}")
                self.data = {"month": "", "scores": {}}
        else:
            self.data = {"month": "", "scores": {}}
            self.save_data()

    def save_data(self):
        try:
            with open(self.filepath, "w", encoding="utf-8") as f:
                json.dump(self.data, f, indent=4, ensure_ascii=False)
        except Exception as e:
            logger.error(f"Failed to write leaderboard JSON: {e}")

    def check_monthly_reset(self):
        """Archives and resets the leaderboard if the calendar month has changed."""
        current_month = datetime.now().strftime("%Y-%m")
        last_month = self.data.get("month", "")
        
        if last_month and last_month != current_month:
            # 1. Archive the previous month's score sheet
            archive_filename = f"leaderboard_{last_month}.json"
            archive_filepath = os.path.join(self.data_dir, archive_filename)
            try:
                with open(archive_filepath, "w", encoding="utf-8") as f:
                    json.dump(self.data, f, indent=4, ensure_ascii=False)
            except Exception as e:
                logger.error(f"Failed to write archive leaderboard: {e}")

            # 2. Determine MVP
            scores = self.data.get("scores", {})
            if scores:
                sorted_scores = sorted(scores.items(), key=lambda item: item[1], reverse=True)
                mvp_id, mvp_count = sorted_scores[0]
                
                # Post announcement in #announcements
                self.bot.loop.create_task(self.announce_mvp(mvp_id, mvp_count, last_month))

            # 3. Reset scores
            self.data = {
                "month": current_month,
                "scores": {}
            }
            self.save_data()
            logger.info(f"Leaderboard reset for new month: {current_month}")
        elif not last_month:
            self.data["month"] = current_month
            self.save_data()

    async def announce_mvp(self, user_id: str, count: int, month_str: str):
        await self.bot.wait_until_ready()
        announcements_channel = discord.utils.get(self.bot.get_all_channels(), name="announcements")
        if announcements_channel and isinstance(announcements_channel, discord.TextChannel):
            try:
                # Assign MVP role to the top helper in the server
                for guild in self.bot.guilds:
                    member = guild.get_member(int(user_id))
                    if member:
                        mvp_role = discord.utils.get(guild.roles, name="Community MVP")
                        if not mvp_role:
                            mvp_role = await guild.create_role(name="Community MVP", color=discord.Color.purple())
                        
                        # Remove role from former members and assign to current MVP
                        if mvp_role:
                            for m in mvp_role.members:
                                try:
                                    await m.remove_roles(mvp_role)
                                except Exception:
                                    pass
                            await member.add_roles(mvp_role)
                        
                        await announcements_channel.send(
                            f"🏆 **Community MVP — {month_str}**\n\n"
                            f"Congratulations to {member.mention} for providing the most support in `#help` "
                            f"with **{count}** answered requests! Thank you for helping others self-host MarketMind! 🧠"
                        )
                        break
            except Exception as e:
                logger.error(f"Failed to announce MVP or assign roles: {e}")

    @commands.Cog.listener()
    async def on_message(self, message: discord.Message):
        """Monitors `#help` channel contributions."""
        if message.author.bot:
            return

        if message.channel.name == "help":
            self.check_monthly_reset()
            
            user_id = str(message.author.id)
            scores = self.data.setdefault("scores", {})
            scores[user_id] = scores.get(user_id, 0) + 1
            
            self.save_data()

    @app_commands.command(name="leaderboard", description="Shows the top 10 community support helpers.")
    async def leaderboard(self, interaction: discord.Interaction):
        self.check_monthly_reset()
        scores = self.data.get("scores", {})

        if not scores:
            await interaction.response.send_message(
                "🏆 **Community Support Leaderboard**\nNo responses tracked yet for this month. Get helping!",
                ephemeral=False
            )
            return

        # Sort and take top 10
        sorted_scores = sorted(scores.items(), key=lambda item: item[1], reverse=True)[:10]
        
        embed = discord.Embed(
            title="🏆 Community Support Leaderboard",
            description=f"Top contributors helping in `#help` during **{self.data.get('month')}**",
            color=0x8b5cf6
        )

        leaderboard_lines = []
        for index, (uid, count) in enumerate(sorted_scores, start=1):
            user = interaction.guild.get_member(int(uid))
            username = user.mention if user else f"User ID: {uid}"
            leaderboard_lines.append(f"{index}. {username} — **{count}** answers")

        embed.add_field(name="Leaderboard Standings", value="\n".join(leaderboard_lines), inline=False)
        embed.set_footer(text="Help someone in #help to get on the board!")
        
        await interaction.response.send_message(embed=embed)

async def setup(bot):
    await bot.add_cog(LeaderboardCog(bot))
