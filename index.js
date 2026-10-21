try { require('dotenv').config(); } catch {}
const {
  Client, GatewayIntentBits, Events, EmbedBuilder, ActionRowBuilder,
  ButtonBuilder, ButtonStyle, StringSelectMenuBuilder, ChannelType,
  PermissionFlagsBits, SlashCommandBuilder, MessageFlags,
} = require('discord.js');

const { TOKEN, STAFF_ROLE_ID, TICKET_CATEGORY_ID } = process.env;
const OWNER_ID = process.env.OWNER_ID || '1463342617856311388';
const VIP_ROLE_ID = process.env.VIP_ROLE_ID || '1382450619297693717';

if (!TOKEN) {
  console.error('❌ Falta TOKEN en Railway → Variables.');
  process.exit(1);
}

// ─────────────── PRODUCTOS ───────────────
const PRODUCTOS = {
  pve: {
    nombre: 'PvE', titulo: '🌌 TOKEN — SHOP GALÁCTICO PvE 🌌', color: 0x7b2cbf,
    incluye: [
      '**250M de ámbar**', '**Todos los injertos**', '**100 dinos OP** *(farmeros)*',
      '**BPs de armadura**', '**BPs de armas**', '**BPs de TK**',
      '**BPs de armadura para dinos**', '**Todas las estaciones con 1M de mezclas** ✨',
      '**ARKETYPOS** *(solo para ventas)*',
    ],
    precios: {
      paypal: { normal: '2 USD *(comisión no incluida)*', vip: '1 USD *(comisión no incluida)*' },
      nitrado: { normal: '3 USD', vip: '2 USD' },
      robux: { normal: '200 Robux', vip: '100 Robux' },
      diamantes: { normal: '200 Diamantes', vip: '100 Diamantes' },
    },
    nota: 'Si lo quieres sacar desde mi **server privado**, se cobra **+1 USD extra** por la transferencia.',
  },
  pvp: {
    nombre: 'PvP', titulo: '🔥 CONTENIDO TOKEN PvP 🔥', color: 0xff4fa3,
    incluye: [
      '**200 dinos para PvP** 🦖', '**2B de ámbar** 🟠',
      '**Todas las estaciones con 1M de mezclas** ✨',
      '**BPs Tek importantes** *(Generador, Replicador y Teletransportador Tek)* ⚡',
      '**BP de Rifle Tek** 🔫', '**Todos los BPs de monturas** 🐎',
      '**Todos los BPs de armas** *(escopeta, rifle, lanzacohetes)* 💥',
      '**Todos los BPs de armadura** *(Tek, Metal, Riot)* 🛡️',
      '**ARKETYPOS** *(solo para ventas)*',
    ],
    precios: {
      paypal: { normal: '5 USD *(comisión no incluida)*', vip: '4 USD *(comisión no incluida)*' },
      nitrado: { normal: '6 USD', vip: '5 USD' },
      robux: { normal: '500 Robux', vip: '400 Robux' },
      diamantes: { normal: '500 Diamantes', vip: '400 Diamantes' },
    },
    nota: null,
  },
  '2b': {
    nombre: '2B', titulo: '🖤 CONTENIDO TOKEN 2B 🖤', color: 0x555555,
    incluye: [
      '**2B de ámbar** 🟠', '**210 dinos OP** 🦖', '**Skins** 🎨', '**Injertos** 🧬',
      '**Todos los BPs Tek importantes** ⚡', '**Todos los BPs de monturas** 🐎',
      '**Todos los BPs de armas** 💥', '**BP de Rifle Tek** 🔫',
      '**Todos los BPs de armadura** 🛡️', '**Todas las estaciones con 1M de mezclas** ✨',
      '**ARKETYPOS** *(solo para ventas)*',
    ],
    precios: {
      paypal: { normal: '4 USD *(comisión no incluida)*', vip: '3 USD *(comisión no incluida)*' },
      nitrado: { normal: '5 USD', vip: '4 USD' },
      robux: { normal: '400 Robux', vip: '300 Robux' },
      diamantes: { normal: '400 Diamantes', vip: '300 Diamantes' },
    },
    nota: null,
  },
};

const METODOS = {
  paypal: { label: 'PayPal', emoji: '💳' },
  nitrado: { label: 'Nitrado', emoji: '🖥️' },
  robux: { label: 'Robux', emoji: '🟢' },
  diamantes: { label: 'Diamantes', emoji: '💎' },
};

const COLOR_ANUNCIO = 0x7b2cbf;
const conSaltos = (t) => t.replace(/\\n/g, '\n');

// ─────────────── EMBEDS ───────────────
const listaIncluye = (prod) => '### 📦 ¿Qué incluye?\n' + prod.incluye.map(i => `🔹 ${i}`).join('\n');

function embedCompra(clave) {
  const prod = PRODUCTOS[clave];
  const lista = tipo => Object.entries(prod.precios).map(([m, p]) => `➜ ${METODOS[m].emoji} **${METODOS[m].label}:** ${p[tipo]}`).join('\n');
  const embed = new EmbedBuilder()
    .setColor(prod.color).setTitle(prod.titulo).setDescription(listaIncluye(prod))
    .addFields({ name: '💰 Precio', value: lista('normal') }, { name: '👑 Precio VIP', value: `<@&${VIP_ROLE_ID}>\n${lista('vip')}` })
    .setFooter({ text: 'Pulsa 🛒 Comprar para abrir un ticket' });
  if (prod.nota) embed.addFields({ name: '⚠️ Importante', value: prod.nota });
  return embed;
}

function embedReward(clave) {
  const prod = PRODUCTOS[clave];
  return new EmbedBuilder()
    .setColor(prod.color).setTitle(`🎁 REWARD — TOKEN ${prod.nombre} 🎁`)
    .setDescription(listaIncluye(prod))
    .setFooter({ text: 'Pulsa 🎁 Reclamar token para abrir un ticket' });
}

const filaComprar = clave => new ActionRowBuilder().addComponents(
  new ButtonBuilder().setCustomId(`comprar:${clave}`).setLabel(`Comprar ${clave.toUpperCase()}`).setEmoji('🛒').setStyle(ButtonStyle.Success)
);
const filaReclamar = clave => new ActionRowBuilder().addComponents(
  new ButtonBuilder().setCustomId(`reclamar:${clave}`).setLabel('Reclamar token').setEmoji('🎁').setStyle(ButtonStyle.Primary)
);
const filaPago = clave => new ActionRowBuilder().addComponents(new StringSelectMenuBuilder()
  .setCustomId(`pago:${clave}`).setPlaceholder('Elige tu método de pago')
  .addOptions(Object.keys(PRODUCTOS[clave].precios).map(m => ({ label: METODOS[m].label, value: m, emoji: METODOS[m].emoji })))
);
const filaCerrar = () => new ActionRowBuilder().addComponents(
  new ButtonBuilder().setCustomId('ticket_cerrar').setLabel('Cerrar ticket').setEmoji('🔒').setStyle(ButtonStyle.Danger)
);

// ─────────────── TICKETS ───────────────
async function crearTicket(interaction, { tipo, clave, campos }) {
  const { guild, user } = interaction;
  const prod = PRODUCTOS[clave];
  const existente = guild.channels.cache.find(ch => ch.topic?.startsWith(`ticket:${user.id}`));
  if (existente) return { existente };

  const permisosBase = [
    PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages,
    PermissionFlagsBits.AttachFiles, PermissionFlagsBits.ReadMessageHistory,
  ];
  const permisos = [
    { id: guild.roles.everyone.id, deny: [PermissionFlagsBits.ViewChannel] },
    { id: user.id, allow: permisosBase },
    { id: OWNER_ID, allow: permisosBase },
    { id: client.user.id, allow: permisosBase.concat([PermissionFlagsBits.ManageChannels]) },
  ];
  if (STAFF_ROLE_ID) permisos.push({ id: STAFF_ROLE_ID, allow: permisosBase });

  const etiqueta = `${tipo.toUpperCase()}-${clave.toUpperCase()}`;
  const nombreUsuario = user.username.toLowerCase().replace(/[^a-z0-9_-]/g, '').slice(0, 20) || user.id;

  const canal = await guild.channels.create({
    name: `${etiqueta.toLowerCase()}-${nombreUsuario}`, type: ChannelType.GuildText,
    topic: `ticket:${user.id}:${etiqueta}`, parent: TICKET_CATEGORY_ID || null, permissionOverwrites: permisos,
  });

  const embed = new EmbedBuilder()
    .setColor(prod.color).setTitle(tipo === 'rw' ? `🎁 ${etiqueta}` : `🛒 ${etiqueta}`).addFields(campos)
    .setFooter({ text: tipo === 'rw' ? 'Espera a que te entreguen tu token.' : 'Manda aquí tu comprobante de pago.' });
  if (tipo === 'compra' && prod.nota) embed.addFields({ name: '⚠️ Importante', value: prod.nota });

  await canal.send({
    content: `${user} <@${OWNER_ID}>${STAFF_ROLE_ID ? ` <@&${STAFF_ROLE_ID}>` : ''}`,
    embeds: [embed], components: [filaCerrar()],
  });
  return { canal };
}

// ─────────────── ESTRUCTURA ───────────────
const ESTRUCTURA = [
  { nombre: '━━━━━━━━ 「 𝗜𝗡𝗙𝗢 」 ━━━━━━━━━━', canales: [
    { nombre: '📢｜Anuncios', desc: 'Avisos importantes' },
    { nombre: '📝｜Reglas', desc: 'Normas del servidor' },
    { nombre: '😱｜Ofertas', desc: 'Promociones activas' },
    { nombre: '⚡｜Vip', desc: 'Beneficios VIP' },
    { nombre: '💰｜Métodos-De-Pago', desc: 'Formas de pago aceptadas' },
    { nombre: '😱｜TABLA-ADM', desc: 'Equipo administrativo' },
    { nombre: '🌹｜Bienvenida', desc: 'Saludo a nuevos' },
    { nombre: '🥀｜Despedida', desc: 'Despedidas' },
    { nombre: '🌶️｜Baneados', desc: 'Miembros expulsados' },
  ]},
  { nombre: '━━━━━━━━ 「 𝗖𝗢𝗠𝗨𝗡𝗜𝗗𝗔𝗗 」 ━━━━━━━━━━', canales: [
    { nombre: '💥｜Chatear', desc: 'Charla general' },
    { nombre: '🤖｜Comandos', desc: 'Comandos del bot' },
    { nombre: '🗣️｜Sugerencias', desc: 'Mejoras del servidor' },
  ]},
  { nombre: '━━━━━━━━ 「 𝗦𝗨𝗣𝗢𝗥𝗧𝗘 」 ━━━━━━━━━━', canales: [
    { nombre: '🏷️｜Ticket', desc: 'Abre un ticket' },
    { nombre: '📜｜Logs-Ticket', desc: 'Historial de tickets' },
  ]},
  { nombre: '━━━━━━━━ 「 𝗘𝗩𝗘𝗡𝗧𝗢𝗦 」 ━━━━━━━━━━', canales: [
    { nombre: '🎉｜Giveaway', desc: 'Sorteos y regalos' },
    { nombre: '🔮｜Rw-Boost', desc: 'Recompensas por Boost' },
    { nombre: '🎀｜Rw-Invites', desc: 'Recompensas por invitar' },
  ]},
  { nombre: '━━━━━━━━ 「 𝗦𝗛𝗢𝗣 𝗚𝗔𝗟𝗔𝗖𝗧𝗜𝗖𝗢 」 ━━━━━━━━━━', canales: [
    { nombre: '🧊｜Proff-Ventas', desc: 'Ventas y atención' },
    { nombre: '🧊｜Proff-Sorteos', desc: 'Sorteos oficiales' },
    { nombre: '🧊｜Proff-Invites', desc: 'Recompensas invitaciones' },
    { nombre: '🧊｜Proff-Boost', desc: 'Beneficios por boost' },
    { nombre: '🧊｜Proff-Tradeos', desc: 'Intercambios' },
  ]},
  { nombre: '━━━━━━━━ 「 𝗧𝗢𝗞𝗘𝗡𝗦 」 ━━━━━━━━━━', canales: [
    { nombre: '🃏｜Plantilla', desc: 'Plantillas de contenido' },
    { nombre: '🤝｜Partners', desc: 'Servidores aliados' },
    { nombre: '🍀｜Token-500M', desc: 'Contenido 500M' },
    { nombre: '🍀｜Token-1B', desc: 'Contenido 1B' },
    { nombre: '🍀｜Token-2B', desc: 'Contenido 2B' },
    { nombre: '🍀｜Token-PvP', desc: 'Contenido PvP' },
    { nombre: '🍀｜Token-Crianza', desc: 'Cría y dinos' },
    { nombre: '🍀｜Token-Rewards', desc: 'Bonificaciones' },
    { nombre: '🍀｜Token-Personal', desc: 'Contenido personalizado' },
  ]},
  { nombre: '━━━━━━━━ 「 𝗦𝗧𝗔𝗙𝗙 」 ━━━━━━━━━━', canales: [
    { nombre: '🔒｜Admin-Chat', desc: 'Solo equipo administrativo', privado: true },
  ]},
];

// ✅ VERSIÓN RÁPIDA: borra en paralelo, sin esperas tontas
async function ejecutarSetup(guild) {
  console.log(`🔨 Iniciando setup en: ${guild.name}`);

  // BORRAR TODO EN PARALELO → mucho más rápido
  const canales = await guild.channels.fetch();
  const borrar = [];
  for (const [, ch] of canales) {
    if ([ChannelType.GuildText, ChannelType.GuildCategory, ChannelType.GuildVoice].includes(ch.type)) {
      borrar.push(ch.delete().catch(e => console.log(`⚠️ ${ch.name}: ${e.message}`)));
    }
  }
  await Promise.allSettled(borrar);
  console.log(`🗑️ Canales borrados`);

  // CREAR TODO SIN DEMORAS
  for (const cat of ESTRUCTURA) {
    const categoria = await guild.channels.create({ name: cat.nombre, type: ChannelType.GuildCategory, position: 0 });
    for (const ch of cat.canales) {
      const permisos = ch.privado ? [
        { id: guild.roles.everyone.id, deny: [PermissionFlagsBits.ViewChannel] },
        { id: OWNER_ID, allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages, PermissionFlagsBits.ReadMessageHistory] },
        ...(STAFF_ROLE_ID ? [{ id: STAFF_ROLE_ID, allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages, PermissionFlagsBits.ReadMessageHistory] }] : []),
      ] : [];

      const canalCreado = await guild.channels.create({
        name: ch.nombre, type: ChannelType.GuildText, parent: categoria.id,
        topic: ch.desc, permissionOverwrites: permisos,
      });

      canalCreado.send({
        embeds: [new EmbedBuilder().setColor(COLOR_ANUNCIO).setTitle(`📌 ${ch.nombre.replace(/^[^\s]+\s/, '')}`).setDescription(ch.desc).setTimestamp()]
      }).catch(() => {});
    }
  }
  console.log(`✅ ESTRUCTURA CREADA COMPLETAMENTE`);
  return true;
}

// ─────────────── COMANDOS ───────────────
const soloDueno = PermissionFlagsBits.Administrator;
const comandos = [
  ...Object.keys(PRODUCTOS).map(clave => new SlashCommandBuilder()
    .setName(clave).setDescription(`Shop ${clave.toUpperCase()} (compra)`).setDefaultMemberPermissions(soloDueno)),
  new SlashCommandBuilder().setName('rw').setDescription('Reward sin precios').setDefaultMemberPermissions(soloDueno)
    .addSubcommand(s => s.setName('pve').setDescription('Reward PvE'))
    .addSubcommand(s => s.setName('pvp').setDescription('Reward PvP'))
    .addSubcommand(s => s.setName('2b').setDescription('Reward 2B')),
  new SlashCommandBuilder().setName('say').setDescription('Escribe como bot').setDefaultMemberPermissions(soloDueno)
    .addStringOption(o => o.setName('texto').setDescription('Texto (\\n salto)').setRequired(true)),
  new SlashCommandBuilder().setName('anuncio').setDescription('Publica anuncio').setDefaultMemberPermissions(soloDueno)
    .addStringOption(o => o.setName('texto').setDescription('Contenido').setRequired(true))
    .addStringOption(o => o.setName('mencion').setDescription('Mención')
      .addChoices({name:'@everyone',value:'@everyone'},{name:'@here',value:'@here'})),
  new SlashCommandBuilder().setName('setup').setDescription('⚠️ BORRA TODO y crea estructura').setDefaultMemberPermissions(soloDueno)
    .addBooleanOption(o => o.setName('confirmar').setDescription('¿BORRAR TODO?').setRequired(true)),
].map(c => c.toJSON());

// ─────────────── CLIENTE ───────────────
const client = new Client({ intents: [GatewayIntentBits.Guilds] });

client.once(Events.ClientReady, async c => {
  console.log(`✅ Conectado: ${c.user.tag}`);
  for (const guild of c.guilds.cache.values()) {
    try {
      await guild.commands.set([]);
      await guild.commands.set(comandos);
      console.log(`✅ Comandos cargados: ${guild.name}`);
    } catch (e) { console.error(e); }
  }
});

client.on(Events.InteractionCreate, async interaction => {
  try {
    // /setup
    if (interaction.isChatInputCommand() && interaction.commandName === 'setup') {
      if (interaction.user.id !== OWNER_ID) return interaction.reply({ content: '❌ Solo el dueño.', flags: MessageFlags.Ephemeral });
      if (!interaction.options.getBoolean('confirmar')) return interaction.reply({ content: '❌ Marca confirmar = Sí.', flags: MessageFlags.Ephemeral });
      await interaction.reply({ content: '🔥 Borrando y creando estructura... no toques nada.', flags: MessageFlags.Ephemeral });
      await ejecutarSetup(interaction.guild);
      return interaction.editReply({ content: '✅ **LISTO!** Estructura completa creada en segundos.' });
    }

    if (interaction.isChatInputCommand()) {
      if (interaction.user.id !== OWNER_ID) return interaction.reply({ content: '❌ No tienes permiso.', flags: MessageFlags.Ephemeral });
      const cmd = interaction.commandName;

      if (PRODUCTOS[cmd]) {
        await interaction.channel.send({ embeds: [embedCompra(cmd)], components: [filaComprar(cmd)] });
        return interaction.reply({ content: `✅ ${cmd.toUpperCase()} publicada`, flags: MessageFlags.Ephemeral });
      }
      if (cmd === 'rw') {
        const clave = interaction.options.getSubcommand();
        await interaction.channel.send({ embeds: [embedReward(clave)], components: [filaReclamar(clave)] });
        return interaction.reply({ content: `✅ RW ${clave.toUpperCase()}`, flags: MessageFlags.Ephemeral });
      }
      if (cmd === 'say') {
        await interaction.deferReply({ flags: MessageFlags.Ephemeral });
        await interaction.channel.send(conSaltos(interaction.options.getString('texto')));
        return interaction.deleteReply();
      }
      if (cmd === 'anuncio') {
        await interaction.deferReply({ flags: MessageFlags.Ephemeral });
        const m = interaction.options.getString('mencion');
        await interaction.channel.send({ content: m, embeds: [new EmbedBuilder().setColor(COLOR_ANUNCIO).setTitle('📢 ANUNCIO').setDescription(conSaltos(interaction.options.getString('texto'))).setTimestamp()] });
        return interaction.deleteReply();
      }
    }

    // Botones
    if (interaction.isButton() && interaction.customId.startsWith('comprar:')) {
      const clave = interaction.customId.split(':')[1];
      if (!PRODUCTOS[clave]) return interaction.reply({ content: '❌ Producto no existe', flags: MessageFlags.Ephemeral });
      return interaction.reply({ content: `💰 Elige método para ${clave.toUpperCase()}`, components: [filaPago(clave)], flags: MessageFlags.Ephemeral });
    }
    if (interaction.isStringSelectMenu() && interaction.customId.startsWith('pago:')) {
      const clave = interaction.customId.split(':')[1];
      const metodo = interaction.values[0];
      const prod = PRODUCTOS[clave];
      if (!prod?.precios[metodo]) return interaction.update({ content: '❌ Opción inválida', components: [] });
      await interaction.deferUpdate();
      const esVip = interaction.member.roles.cache.has(VIP_ROLE_ID);
      const r = await crearTicket(interaction, {
        tipo: 'compra', clave,
        campos: [
          { name: '👤 Comprador', value: `${interaction.user}`, inline: true },
          { name: '📦 Token', value: clave.toUpperCase(), inline: true },
          { name: `${METODOS[metodo].emoji} Método`, value: METODOS[metodo].label, inline: true },
          { name: esVip ? '👑 Precio VIP' : '💰 Precio', value: esVip ? prod.precios[metodo].vip : prod.precios[metodo].normal },
        ],
      });
      return interaction.editReply({ content: r.existente ? `⚠️ Ya tienes ticket: ${r.existente}` : `✅ Ticket: ${r.canal}`, components: [] });
    }
    if (interaction.isButton() && interaction.customId.startsWith('reclamar:')) {
      const clave = interaction.customId.split(':')[1];
      if (!PRODUCTOS[clave]) return interaction.reply({ content: '❌ No disponible', flags: MessageFlags.Ephemeral });
      await interaction.deferReply({ flags: MessageFlags.Ephemeral });
      const r = await crearTicket(interaction, { tipo: 'rw', clave, campos: [
        { name: '👤 Reclama', value: `${interaction.user}`, inline: true },
        { name: '🎁 Token', value: `RW-${clave.toUpperCase()}`, inline: true },
      ]});
      return interaction.editReply({ content: r.existente ? `⚠️ Ya tienes ticket: ${r.existente}` : `✅ Ticket: ${r.canal}` });
    }
    if (interaction.isButton() && interaction.customId === 'ticket_cerrar') {
      const esDueno = interaction.channel.topic?.startsWith(`ticket:${interaction.user.id}`);
      const esStaff = interaction.user.id === OWNER_ID || (STAFF_ROLE_ID && interaction.member.roles.cache.has(STAFF_ROLE_ID)) || interaction.memberPermissions.has(PermissionFlagsBits.Administrator);
      if (!esDueno && !esStaff) return interaction.reply({ content: '❌ No puedes cerrarlo', flags: MessageFlags.Ephemeral });
      await interaction.reply('🔒 Cerrando en 5s...');
      setTimeout(() => interaction.channel.delete().catch(() => {}), 5000);
    }
  } catch (err) {
    console.error('❌ Error:', err);
    const msg = { content: '❌ Error. Avísale al staff.', flags: MessageFlags.Ephemeral };
    if (interaction.deferred || interaction.replied) interaction.followUp(msg).catch(() => {});
    else interaction.reply(msg).catch(() => {});
  }
});

client.login(TOKEN);
