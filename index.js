const Discord = require('discord.js');
const client = new Discord.Client();
const fetch = require('node-fetch');
const config = require('./config.json');
require('dotenv').config();

client.on('ready', async () => {
	const v = validateConfig();
	console.log('Bot is ready.');
	if (v) {
		setInterval(() => {
			updateChannels(config.server_ip, config.server_port);
		}, 300000);
		updateChannels(config.server_ip, config.server_port);
	}
	setInterval(() => {
		setPlayers(config.server_ip, config.server_port);
	}, 300000);
	setPlayers(config.server_ip, config.server_port);
});

function setPlayers(serverIP, serverPort) {
	fetch(`http://mcapi.us/server/status?ip=${serverIP}&port=${serverPort}`)
		.then(r => r.json())
		.then(json => {
			if (json.status == 'error') return console.error('ERROR: Failed to connect to server. Is the bot configured correctly?');
			client.user.setActivity(config.activity_format.replace('{online}', `${json.players.now}`).replace('{max}', `${json.players.max}`), { type: 'PLAYING' });
			console.log('Player count updated successfully.');
		})
		.catch(e => {
			console.error(`Player count failed to update:\n${e}`);
		});
}

function updateChannels(serverIP, serverPort) {
	fetch(`http://mcapi.us/server/status?ip=${serverIP}&port=${serverPort}`)
		.then(r => r.json())
		.then(json => {
			if (process.env.NODE_ENV) console.log(json);
			// {
			//   "status": "success",
			//   "online": true,
			//   "motd": "",
			//   "favicon": "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAEAAAABACAYAAACqaXHeAAACR0lEQVR42u2bsUoEMRCG9wl8AisVwUKw0s7O7kAQxEYrGx/C1xAfQovTQzlQC0vhGls7SwufIbJCdI27m8xkJpnsTjFwsMte/m8m2ZnNpDIvS9WYrVIACiD9n34urxmfDQpAiOBcQESLTgGjKOEcIIoUTgkii3izqLyWCkIy8SGiY2EkBcAtOgYGO4Bc4iEg2ADkFk4NgRRASvEhEMgBSBIeCoIMgGTxMRCKDHvK6TAY72OjYFDiMRCKAfD8sTC7D6dm5WbybfXv6/dHEAQwAEnit+6PfsRb25gddEIIjQIwACnisRCSAbAh6wtVn+3MT/4IPn+9MJdvV/8gkAOICf82r2FA1M9xxdtrLgTsNGDxvus1n6dCn+Ne9wEIiQJyAK7XXINEQZf3rdVAxQFo81pzoJAo8HnYToM2OKHTgNX7dmAh8xUDICYxIgfQtvBBvYUJcTEAmlkaVGiXYaBlA9AMcwrx3LUByxrAXQdsz4/N3tMZOJ8oGkDb2gLNJ4oF0FcHDB6ArwgqBgC0jnfvby6syQBQQqgXrtV60NNJb4rcZ/atggGAygQpAWzeHf4OfIoXTwmAvRrsyubWb/dRwkMqwyQAMBDcOgD7cQSbZaIBcEVB3ycsTI0RIz4ZADcKIG8EVzyl95N+Fe6CgF0QqfYGUPsCsdUdt3iyfQHOvQEIDArxaACj3xssaXeYDcDo+wO0Q0T4dBDTJDWKLjEpELL1CWqnaIZeYQ7h2i2u5wX0xIieGdJTYznODUoQrSdHFYACUADWvgDyS1HOwCZe5wAAAABJRU5ErkJggg==",
			//   "error": null,
			//   "players": {
			//     "max": 20,
			//     "now": 2,
			//     "sample": [{
			//       "name": "GoldenMen21",
			//       "id": "5018898b-086d-4e19-be06-3aa4c4cdc995"
			//     }, {
			//       "name": "Tiltmyno",
			//       "id": "3fe40f53-917c-4b76-89f9-aa9d95c08354"
			//     }]
			//   },
			//   "server": {
			//     "name": "Spigot 1.16.4",
			//     "protocol": 754
			//   },
			//   "last_updated": "1606149701",
			//   "last_online": "1606149701",
			//   "duration": 679676344
			// }

			if (json.status == 'error') console.error('ERROR: ' + json);
			const status = json.online ? 'OUVERT' : 'FERMÉ';
			// set status of pantagor online or dnd

			const channels = require('./channels.json');
			client.channels.cache.get(channels.channel_1_id).setName(`Serveur ${status}`)
				.catch(e => { console.error(`Live channels failed to update:\n${e}`); });
			client.channels.cache.get(channels.channel_2_id).setName(`Joueurs: ${json.players.now}/${json.players.max}`)
				.catch(e => { console.error(`Live channels failed to update:\n${e}`); });
			console.log('Live channels updated successfully.');

			const embed = new Discord.MessageEmbed()
				.setColor(json.online ? '#75B941' : '#7ED321')
				.setTitle(`Le serveur est ${status}!`)
				.setDescription(`Joueurs : ${json.players.now}/${json.players.max}`)
				.setFooter(`${serverIP}:${serverPort}`);
			// .setThumbnail(json.favicon);

			if (json.players.sample.length) {
				let players = '';
				for (let i = 0; i < json.players.sample.length; i++) {
					players += `${json.players.sample[i].name}\n`;
				}
				embed.addField('En ligne en ce moment :', players);
			}

			client.channels.cache.get(channels.channel_3_id).messages.fetch(channels.messageID)
				.then((msg) => msg.edit(embed))
				.catch(console.error);
		})
		.catch(e => {
			console.error(`Live channels failed to update:\n${e}`);
		});
}

function validateConfig() {
	const config = require('./channels.json');
	if (typeof config.enable_channels !== 'boolean') {
		console.error('ERROR: Value of "enable_channels" in channels.json must be true or false.');
		process.exit();
	}
	if (!config.enable_channels) return false;
	if (!client.channels.cache.get(config.channel_1_id)) {
		console.error('ERROR: The ID for channel 1 provided in channels.json is incorrect.');
		process.exit();
	}
	const channel1 = client.channels.cache.get(config.channel_1_id);
	if (!client.channels.cache.get(config.channel_2_id)) {
		console.error('ERROR: The ID for channel 2 provided in channels.json is incorrect.');
		process.exit();
	}
	const channel2 = client.channels.cache.get(config.channel_2_id);
	if (channel1.id == channel2.id) {
		console.error('ERROR: The ID for channel 1 and channel 2 are the same.');
		process.exit();
	}
	if (!channel1.permissionsFor(channel1.guild.me).has('VIEW_CHANNEL')) {
		console.error('ERROR: Bot does not have VIEW_CHANNEL permission for channel 1.');
		process.exit();
	}
	if (!channel2.permissionsFor(channel1.guild.me).has('VIEW_CHANNEL')) {
		console.error('ERROR: Bot does not have VIEW_CHANNEL permission for channel 2.');
		process.exit();
	}
	if (!channel1.permissionsFor(channel1.guild.me).has('MANAGE_CHANNELS')) {
		console.error('ERROR: Bot does not have MANAGE_CHANNELS permission for channel 1.');
		process.exit();
	}
	if (!channel2.permissionsFor(channel1.guild.me).has('MANAGE_CHANNELS')) {
		console.error('ERROR: Bot does not have MANAGE_CHANNELS permission for channel 2.');
		process.exit();
	}
	return true;
}

client.login(process.env.BOT_TOKEN)
	.catch(() => {
		console.error('ERROR: The bot token you provided was incorrect. Please enter a correct bot token in the config file.');
		process.exit();
	});
