const Discord = require('discord.js');
const client = new Discord.Client();
const fetch = require('node-fetch');
const config = require('./config.json');
require('dotenv').config();

client.on('ready', async () => {
	console.log('Bot is ready.');

	setInterval(() => updateChannels(), config.update_interval * 6e4);
	updateChannels();
});

function updateChannels() {
	fetch(`http://mcapi.us/server/status?ip=${config.server_ip}&port=${config.server_port}`)
		.then(r => r.json())
		.then(json => {
			if (process.env.NODE_ENV == 'development') console.log(json);
			if (!json.online && json.error) {
				console.error('An error occured while fetching server\'s status : ' + json.error);
				if (json.error.indexOf('failed to lookup address information') != -1) config.server_port = 1;
			}

			client.user.setPresence({
				activity: {
					name: config.activity_format.replace('{online}', `${json.players.now}`).replace('{max}', `${json.players.max}`),
				},
				status: json.online ? 'online' : 'dnd',
				type:  'WATCHING',
			})
				.catch(console.error);

			const status = json.online ? 'ouvert' : 'fermé';

			const channels = require('./channels.json');
			client.channels.cache.get(channels.channel_1_id).setName(`Serveur ${status}`)
				.catch(e => { console.error(`Live channels failed to update:\n${e}`); });
			client.channels.cache.get(channels.channel_2_id).setName(`Joueurs: ${json.players.now}/${json.players.max}`)
				.catch(e => { console.error(`Live channels failed to update:\n${e}`); });
			console.log('Live channels updated successfully.');

			const embed = new Discord.MessageEmbed()
				.setColor(json.online ? '#75B941' : '#F34444')
				.setTitle(`Le serveur est ${status} !`)
				.setDescription(`Joueurs : ${json.players.now}/${json.players.max}`)
				.setFooter(`${config.server_ip}:${config.server_port}`)
				.setThumbnail('https://i.imgur.com/8my8Jva.png');

			if (json.players.sample.length) {
				json.players.sample = json.players.sample.map((player) => player.name).sort();
				embed.addField('En ligne en ce moment :', json.players.sample.join('\n'));
			}

			if (json.error) embed.addField('Message d\'erreur', json.error);
			const lastUpdate = new Date(parseInt(json.last_updated * 1000));
			embed.addField('Dernière vérification le', `${lastUpdate.toLocaleDateString('fr-FR')} à ${lastUpdate.toLocaleTimeString('fr-FR')}`);

			client.channels.cache.get(channels.channel_3_id).messages.fetch(channels.messageID)
				.then((msg) => msg.edit(embed))
				.catch(console.error);
		})
		.catch(e => {
			console.error(`Live channels failed to update:\n${e}`);
		});
}

process.on('unhandledRejection', error => {
	console.error('Unhandled promise rejection:', error);
});

client.login(process.env.BOT_TOKEN)
	.catch((e) => {
		console.error(`Client.login() failed with message : ${e.message}`);
		process.exit();
	});
