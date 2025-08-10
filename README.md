# Animated Welcome

`animated-welcome` is an npm package that generates animated welcome GIFs for Discord bots. It uses `canvas`, `gif-encoder-2`, and `sharp` to create high-quality GIFs.

## Installation

Install the package using npm:

```bash
npm install animated-welcome
```

## Usage

Here is an example of how to use the package in a Discord bot:

```javascript
import { generateWelcomeGif } from 'animated-welcome';

// Example usage in a Discord bot event
client.on('guildMemberAdd', async (member) => {
  const welcomeMessage = 'Welcome {user} to {server}!';
  const backgroundURL = 'https://example.com/background.gif';

  try {
    const gifBuffer = await generateWelcomeGif(member.user, member.guild, welcomeMessage, backgroundURL);

    // Send the GIF as an attachment
    const attachment = new MessageAttachment(gifBuffer, 'welcome.gif');
    const channel = member.guild.systemChannel;
    if (channel) {
      channel.send({ content: `Welcome ${member.user.username}!`, files: [attachment] });
    }
  } catch (error) {
    console.error('Failed to generate welcome GIF:', error);
  }
});
```

## Parameters

- `user`: A Discord.js `User` or `GuildMember` object.
- `guild`: A Discord.js `Guild` object.
- `messageTemplate`: A string template for the welcome message. Use `{user}` and `{server}` as placeholders.
- `backgroundURL`: (Optional) A URL to a background GIF. Defaults to a galaxy-themed GIF.

## Example SS

![welcome](https://github.com/NoahCodesPython/animatedwelcome/raw/main/welcome.gif)

## License

This project is licensed under the MIT License.
