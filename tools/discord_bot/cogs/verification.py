import os
import aiohttp
import urllib.parse
import discord
from discord import app_commands
from discord.ext import commands

class VerificationCog(commands.Cog):
    def __init__(self, bot):
        self.bot = bot
        self.api_url = os.getenv("MARKETMIND_API_URL", "http://localhost:8000/api/v1")
        self.client_id = os.getenv("GITHUB_CLIENT_ID", "")
        self.repo = os.getenv("GITHUB_REPO", "Savior-Systems/MarketMind")

    @app_commands.command(name="verify", description="Verify your GitHub star to unlock channels!")
    async def verify(self, interaction: discord.Interaction):
        # 1. Check if user is already verified in the backend
        async with aiohttp.ClientSession() as session:
            try:
                status_url = f"{self.api_url}/auth/discord/status?discord_user_id={interaction.user.id}"
                async with session.get(status_url) as resp:
                    if resp.status == 200:
                        data = await resp.json()
                        if data.get("verified"):
                            await self.assign_roles(interaction, data.get("is_founding_member"))
                            await interaction.response.send_message(
                                f"✅ You are already verified as **{data.get('github_username')}**!",
                                ephemeral=True
                            )
                            return
            except Exception as e:
                # Backend status endpoint call failed, continue with OAuth flow
                pass

        # 2. Generate GitHub OAuth URL
        redirect_uri = f"{self.api_url}/auth/github/callback?discord_user_id={interaction.user.id}"
        encoded_redirect = urllib.parse.quote(redirect_uri)
        oauth_url = (
            f"https://github.com/login/oauth/authorize"
            f"?client_id={self.client_id}"
            f"&redirect_uri={encoded_redirect}"
            f"&scope=read:user"
        )

        embed = discord.Embed(
            title="⭐ Star Verification Required",
            description=(
                f"To access stargazers-only channels, please support us by starring our repository!\n\n"
                f"1. Star the repo: [Savior-Systems/MarketMind](https://github.com/{self.repo})\n"
                f"2. Click the authorization link below to verify your star.\n\n"
                f"**[Click Here to Authorize GitHub]({oauth_url})**"
            ),
            color=0x8b5cf6
        )
        embed.set_footer(text="MarketMind Swarm Onboarding")

        # Confirm verification button
        view = discord.ui.View()
        button = discord.ui.Button(label="Confirm Verification", style=discord.ButtonStyle.green)

        async def button_callback(btn_interaction: discord.Interaction):
            async with aiohttp.ClientSession() as session:
                try:
                    async with session.get(status_url) as resp:
                        if resp.status == 200:
                            data = await resp.json()
                            if data.get("verified"):
                                is_founding = data.get("is_founding_member", False)
                                await self.assign_roles(btn_interaction, is_founding)
                                await btn_interaction.response.send_message(
                                    f"🎉 Verification successful! Welcome **{data.get('github_username')}**!",
                                    ephemeral=True
                                )
                            else:
                                await btn_interaction.response.send_message(
                                    "❌ We couldn't verify your star yet. Please make sure you have starred the repository and authorized GitHub.",
                                    ephemeral=True
                                )
                        else:
                            await btn_interaction.response.send_message(
                                "❌ Verification service is temporarily unavailable.",
                                ephemeral=True
                            )
                except Exception as e:
                    await btn_interaction.response.send_message(
                        f"❌ Connection error during verification check.",
                        ephemeral=True
                    )

        button.callback = button_callback
        view.add_item(button)

        await interaction.response.send_message(embed=embed, view=view, ephemeral=True)

    async def assign_roles(self, interaction: discord.Interaction, is_founding: bool):
        guild = interaction.guild
        if not guild:
            return

        # Find or create "Stargazer" role
        stargazer_role = discord.utils.get(guild.roles, name="Stargazer")
        if not stargazer_role:
            try:
                stargazer_role = await guild.create_role(name="Stargazer", color=discord.Color.blue())
            except Exception:
                pass

        if stargazer_role:
            try:
                await interaction.user.add_roles(stargazer_role)
            except Exception:
                pass

        # Find or create "Founding Member" role if applicable
        if is_founding:
            founding_role = discord.utils.get(guild.roles, name="Founding Member")
            if not founding_role:
                try:
                    founding_role = await guild.create_role(name="Founding Member", color=discord.Color.gold())
                except Exception:
                    pass

            if founding_role:
                try:
                    await interaction.user.add_roles(founding_role)
                except Exception:
                    pass

async def setup(bot):
    await bot.add_cog(VerificationCog(bot))
