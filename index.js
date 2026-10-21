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
  console.error('❌ Falta la variable TOKEN. Agrégala en Railway → Variables.');
  process.exit(1);
}

// ─────────────── PRODUCTOS DE LA SHOP ───────────────
const PRODUCTOS = {
  pve: {
    nombre: 'PvE',
    titulo: '🌌 TOKEN — SHOP GALÁCTICO PvE 🌌',
    color: 0x7b2cbf,
    incluye: [
      '**250M de ámbar**',
      '**Todos los injertos**',
      '**100 dinos OP** *(farmeros)*',
      '**BPs de armadura**',
      '**BPs de armas**',
      '**BPs de TK**',
      '**BPs de armadura para dinos**',
      '**Todas las estaciones con 1M de mezclas** ✨',
      '**ARKETYPOS** *(solo para ventas)*',
    ],
    precios: {
      paypal:    { normal: '2 USD *(comisión no incluida)*', vip: '1 USD *(comisión no incluida)*' },
      nitrado:   { normal: '3 USD',         vip: '2 USD' },
      robux:     { normal: '200 Robux',     vip: '100 Robux' },
      diamantes: { normal: '200 Diamantes', vip: '100 Diamantes' },
    },
    nota: 'Si lo quieres sacar desde mi **server privado**, se cobra **+1 USD extra** por la transferencia.',
  },
  pvp: {
    nombre: 'PvP',
    titulo: '🔥 CONTENIDO TOKEN PvP 🔥',
    color: 0xff4fa3,
    incluye: [
      '**200 dinos para PvP** 🦖',
      '**2B de ámbar** 🟠',
      '**Todas las estaciones con 1M de mezclas** ✨',
      '**BPs Tek importantes** *(Generador, Replicador y Teletransportador Tek)* ⚡',
      '**BP de Rifle Tek** 🔫',
      '**Todos los BPs de monturas** 🐎',
      '**Todos los BPs de armas** *(escopeta, rifle, lanzacohetes)* 💥',
      '**Todos los BPs de armadura** *(Tek, Metal, Riot)* 🛡️',
      '**ARKETYPOS** *(solo para ventas)*',
    ],
    precios: {
      paypal:    { normal: '5 USD *(comisión no incluida)*', vip: '4 USD *(comisión no incluida)*' },
      nitrado:   { normal: '6 USD',         vip: '5 USD' },
      robux:     { normal: '500 Robux',     vip: '400 Robux' },
      diamantes: { normal: '500 Diamantes', vip: '400 Diamantes' },
    },
    nota: null,
  },
  '2b': {
    nombre: '2B',
    titulo: '🖤 CONTENIDO TOKEN 2B 🖤',
    color: 0x555555,
    incluye: [
      '**2B de ámbar** 🟠',
      '**210 dinos OP** 🦖',
      '**Skins** 🎨',
      '**Injertos** 🧬',
      '**Todos los BPs Tek importantes** ⚡',
      '**Todos los BPs de monturas** 🐎',
      '**Todos los BPs de armas** 💥',
      '**BP de Rifle Tek** 🔫',
      '**Todos los BPs de armadura** 🛡️',
      '**Todas las estaciones con 1M de mezclas** ✨',
      '**ARKETYPOS** *(solo para ventas)*',
    ],
    precios: {
      paypal:    { normal: '4 USD *(comisión no incluida)*', vip: '3 USD *(comisión no incluida)*' },
      nitrado:   { normal: '5 USD',         vip: '4 USD' },
      robux:     { normal: '400 Robux',     vip: '300 Robux' },
      diamantes: { normal: '400 Diamantes', vip: '300 Diamantes' },
    },
    nota: null,
  },
};

const METODOS = {
  paypal:    { label: 'PayPal',    emoji: '💳' },
  nitrado:   { label: 'Nitrado',   emoji: '🖥️' },
  robux:     { label: 'Robux',     emoji: '🟢' },
  diamantes: { label: 'Diamantes', emoji: '💎' },
};

const COLOR_ANUNCIO = 0x7b2cbf;
const conSaltos = (t) => t.replace(/\\n/g, '\n');

// ─────────────── EMBEDS Y COMPONENTES ───────────────
const listaIncluye = (prod) =>
  '### 📦 ¿Qué incluye?\n' + prod.incluye.map((i) => `🔹 ${i}`).join('\n');

function embedCompra(clave) {
  const prod = PRODUCTOS[clave];
  const lista = (tipo) =>
    Object.entries(prod.precios)
      .map(([m, p]) => `➜ ${METODOS[m].emoji} **${METODOS[m].label}:** ${p[tipo]}`)
      .join('\n');
  const embed = new EmbedBuilder()
    .setColor(prod.color)
    .setTitle(prod.titulo)
    .setDescription(listaIncluye(prod))
    .addFields(
      { name: '💰 Precio', value: lista('normal') },
      { name: '👑 Precio VIP', value: `<@&${VIP_ROLE_ID}>\n${lista('vip')}` },
    )
    .setFooter({ text: 'Pulsa 🛒 Comprar para abrir un ticket' });
  if (prod.nota) embed.addFields({ name: '⚠️ Importante', value: prod.nota });
  return embed;
}

function embedReward(clave) {
  const prod = PRODUCTOS[clave];
  return new EmbedBuilder()
    .setColor(prod.color)
    .setTitle(`🎁 REWARD — TOKEN ${prod.nombre} 🎁`)
    .setDescription(listaIncluye(prod))
    .setFooter({ text: 'Pulsa 🎁 Reclamar token para abrir un ticket' });
}

const filaComprar = (clave) =>
  new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId(`comprar:${clave}`)
      .setLabel(`Comprar ${clave.toUpperCase()}`)
      .setEmoji('🛒')
      .setStyle(ButtonStyle.Success),
  );

const filaReclamar = (clave) =>
  new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId(`reclamar:${clave}`)
      .setLabel('Reclamar token')
      .setEmoji('🎁')
      .setStyle(ButtonStyle.Primary),
  );

const filaPago = (clave) =>
  new ActionRowBuilder().addComponents(
    new StringSelectMenuBuilder()
      .setCustomId(`pago:${clave}`)
      .setPlaceholder('Elige tu método de pago')
      .addOptions(
        Object.keys(PRODUCTOS[clave].precios).map((m) => ({
          label: METODOS[m].label, value: m, emoji: METODOS[m].emoji,
        })),
      ),
  );

const filaCerrar = () =>
  new ActionRowBuilder().addComponents(
    new ButtonBuilder().setCustomId('ticket_cerrar').setLabel('Cerrar ticket').setEmoji('🔒').setStyle(ButtonStyle.Danger),
  );

// ─────────────── TICKETS ───────────────
async function crearTicket(interaction, { tipo, clave, campos }) {
  const { guild, user } = interaction;
  const prod = PRODUCTOS[clave];
  const existente = guild.channels.cache.find((ch) => ch.topic?.startsWith(`ticket:${user.id}`));
  if (existente) return { existente };

  const permisosLectura = [
    PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages,
    PermissionFlagsBits.AttachFiles, PermissionFlagsBits.ReadMessageHistory,
  ];

  const permisos = [
    { id: guild.roles.everyone.id, deny: [PermissionFlagsBits.ViewChannel] },
    { id: user.id, allow: permisosLectura },
    { id: OWNER_ID, allow: permisosLectura },
    {
      id: client.user.id,
      allow: [
        PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages,
        PermissionFlagsBits.ManageChannels, PermissionFlagsBits.ReadMessageHistory,
      ],
    },
  ];
  if (STAFF_ROLE_ID) permisos.push({ id: STAFF_ROLE_ID, allow: permisosLectura });

  const etiqueta = `${tipo.toUpperCase()}-${clave.toUpperCase()}`;
  const nombreUsuario = user.username.toLowerCase().replace(/[^a-z0-9_-]/g, '').slice(0, 20) || user.id;

  const canal = await guild.channels.create({
    name: `${etiqueta.toLowerCase()}-${nombreUsuario}`,
    type: ChannelType.GuildText,
    topic: `ticket:${user.id}:${etiqueta}`,
    parent: TICKET_CATEGORY_ID || null,
    permissionOverwrites: permisos,
  });

  const embed = new EmbedBuilder()
    .setColor(prod.color)
    .setTitle(tipo === 'rw' ? `🎁 ${etiqueta}` : `🛒 ${etiqueta}`)
    .addFields(campos)
    .setFooter({
      text: tipo === 'rw'
        ? 'Espera a que el staff te entregue tu token.'
        : 'Espera a que el staff te atienda. Manda aquí tu comprobante de pago.',
    });
  if (tipo === 'compra' && prod.nota) embed.addFields({ name: '⚠️ Importante', value: prod.nota });

  await canal.send({
    content: `${user} <@${OWNER_ID}>${STAFF_ROLE_ID ? ` <@&${STAFF_ROLE_ID}>` : ''}`,
    embeds: [embed],
    components: [filaCerrar()],
  });

  return { canal };
}

// ─────────────── ESTRUCTURA DEL SERVIDOR — /setup ───────────────
const ESTRUCTURA = [
  {
    nombre: '━━━━━━━━ 「 𝗜𝗡𝗙𝗢 」 ━━━━━━━━━━',
    canales: [
      { nombre: '📢｜Anuncios', descripcion: 'Avisos importantes del servidor' },
      { nombre: '📝｜Reglas', descripcion: 'Normas que debes cumplir' },
      { nombre: '😱｜Ofertas', descripcion: 'Promociones y descuentos activos' },
      { nombre: '⚡｜Vip', descripcion: 'Beneficios exclusivos de miembros VIP' },
      { nombre: '💰｜Métodos-De-Pago', descripcion: 'Formas de pago aceptadas' },
      { nombre: '😱｜TABLA-ADM', descripcion: 'Información del equipo administrativo' },
      { nombre: '🌹｜Bienvenida', descripcion: 'Saludo a los nuevos miembros' },
      { nombre: '🥀｜Despedida', descripcion: 'Despedidas de miembros' },
      { nombre: '🌶️｜Baneados', descripcion: 'Lista de expulsados del servidor' },
    ]
  },
  {
    nombre: '━━━━━━━━ 「 𝗖𝗢𝗠𝗨𝗡𝗜𝗗𝗔𝗗 」 ━━━━━━━━━━',
    canales: [
      { nombre: '💥｜Chatear', descripcion: 'Charla general con la comunidad' },
      { nombre: '🤖｜Comandos', descripcion: 'Comandos disponibles del bot' },
      { nombre: '🗣️｜Sugerencias', descripcion: 'Da tus ideas para mejorar' },
    ]
  },
  {
    nombre: '━━━━━━━━ 「 𝗦𝗨𝗣𝗢𝗥𝗧𝗘 」 ━━━━━━━━━━',
    canales: [
      { nombre: '🏷️｜Ticket', descripcion: 'Abre un ticket para ayuda o compras' },
      { nombre: '📜｜Logs-Ticket', descripcion: 'Historial de tickets cerrados' },
    ]
  },
  {
    nombre: '━━━━━━━━ 「 𝗘𝗩𝗘𝗡𝗧𝗢𝗦 」 ━━━━━━━━━━',
    canales: [
      { nombre: '🎉｜Giveaway', descripcion: 'Participa en sorteos y regalos' },
      { nombre: '🔮｜Rw-Boost', descripcion: 'Recompensas por Boost del servidor' },
      { nombre: '🎀｜Rw-Invites', descripcion: 'Recompensas por invitar gente' },
    ]
  },
  {
    nombre: '━━━━━━━━ 「 𝗦𝗛𝗢𝗣 𝗚𝗔𝗟𝗔𝗖𝗧𝗜𝗖𝗢 」 ━━━━━━━━━━',
    canales: [
      { nombre: '🧊｜Proff-Ventas', descripcion: 'Ventas y atención comercial' },
      { nombre: '🧊｜Proff-Sorteos', descripcion: 'Sorteos oficiales de la tienda' },
      { nombre: '🧊｜Proff-Invites', descripcion: 'Recompensas por invitaciones' },
      { nombre: '🧊｜Proff-Boost', descripcion: 'Beneficios por boost' },
      { nombre: '🧊｜Proff-Tradeos', descripcion: 'Intercambios autorizados' },
    ]
  },
  {
    nombre: '━━━━━━━━ 「 𝗧𝗢𝗞𝗘𝗡𝗦 」 ━━━━━━━━━━',
    canales: [
      { nombre: '🃏｜Plantilla', descripcion: 'Plantillas de contenido' },
      { nombre: '🤝｜Partners', descripcion: 'Servidores aliados' },
      { nombre: '🍀｜Token-500M', descripcion: 'Contenido de token 500M' },
      { nombre: '🍀｜Token-1B', descripcion: 'Contenido de token 1B' },
      { nombre: '🍀｜Token-2B', descripcion: 'Contenido de token 2B' },
      { nombre: '🍀｜Token-PvP', descripcion: 'Contenido para PvP' },
      { nombre: '🍀｜Token-Crianza', descripcion: 'Contenido de cría y dinos' },
      { nombre: '🍀｜Token-Rewards', descripcion: 'Recompensas y bonificaciones' },
      { nombre: '🍀｜Token-Personal', descripcion: 'Contenido personalizado' },
    ]
  },
  {
    nombre: '━━━━━━━━ 「 𝗦𝗧𝗔𝗙𝗙 」 ━━━━━━━━━━',
    canales: [
      { nombre: '🔒｜Admin-Chat', descripcion: 'Comunicación exclusiva del equipo administrativo', privado: true },
    ]
  }
];

async function ejecutarSetup(guild) {
  console.log(`🔨 Iniciando configuración en: ${guild.name}`);

  // BORRAR TODO
  const todosCanales = await guild.channels.fetch();
  for (const [id, canal] of todosCanales) {
    if ([ChannelType.GuildText, ChannelType.GuildCategory, ChannelType.GuildVoice].includes(canal.type)) {
      await canal.delete().catch(err => console.log(`⚠️ No se pudo borrar ${canal.name}: ${err.message}`));
      await new Promise(res => setTimeout(res, 300));
    }
  }

  // CREAR ESTRUCTURA
  for (const cat of ESTRUCTURA) {
    const categoria = await guild.channels.create({
      name: cat.nombre,
      type: ChannelType.GuildCategory,
      position: 0,
    });

    for (const ch of cat.canales) {
      const permisos = ch.privado ? [
        { id: guild.roles.everyone.id, deny: [PermissionFlagsBits.ViewChannel] },
        { id: OWNER_ID, allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages, PermissionFlagsBits.ReadMessageHistory] },
        ...(STAFF_ROLE_ID ? [{ id: STAFF_ROLE_ID, allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages, PermissionFlagsBits.ReadMessageHistory] }] : []),
      ] : [];

      const canalCreado = await guild.channels.create({
        name: ch.nombre,
        type: ChannelType.GuildText,
        parent: categoria.id,
        topic: ch.descripcion,
        permissionOverwrites: permisos,
      });

      await canalCreado.send({
        embeds: [new EmbedBuilder()
          .setColor(COLOR_ANUNCIO)
          .setTitle(`📌 ${ch.nombre.replace(/^[^\s]+\s/, '')}`)
          .setDescription(ch.descripcion)
          .setTimestamp()
        ]
      }).catch(() => {});

      await new Promise(res => setTimeout(res, 200));
    }
  }

  console.log(`✅ Estructura creada completamente en: ${guild.name}`);
  return true;
}

// ─────────────── COMANDOS ───────────────
const soloDueno = PermissionFlagsBits.Administrator;

const comandos = [
  ...Object.keys(PRODUCTOS).map((clave) =>
    new SlashCommandBuilder()
      .setName(clave)
      .setDescription(`Publica la shop del token ${clave.toUpperCase()} (compra)`)
      .setDefaultMemberPermissions(soloDueno),
  ),
  new SlashCommandBuilder()
    .setName('rw')
    .setDescription('Publica un token de reward (sin precios)')
    .setDefaultMemberPermissions(soloDueno)
    .addSubcommand(sub => sub.setName('pve').setDescription('Reward del token PvE'))
    .addSubcommand(sub => sub.setName('pvp').setDescription('Reward del token PvP'))
    .addSubcommand(sub => sub.setName('2b').setDescription('Reward del token 2B')),
  new SlashCommandBuilder()
    .setName('say')
    .setDescription('El bot escribe tu texto en este canal')
    .setDefaultMemberPermissions(soloDueno)
    .addStringOption(o => o.setName('texto').setDescription('Lo que va a escribir el bot (usa \\n para saltos de línea)').setRequired(true).setMaxLength(2000)),
  new SlashCommandBuilder()
    .setName('anuncio')
    .setDescription('El bot publica tu texto como anuncio en este canal')
    .setDefaultMemberPermissions(soloDueno)
    .addStringOption(o => o.setName('texto').setDescription('El texto del anuncio (usa \\n para saltos de línea)').setRequired(true).setMaxLength(4000))
    .addStringOption(o => o.setName('mencion').setDescription('¿A quién mencionar? (opcional)')
      .addChoices({ name: '@everyone', value: '@everyone' }, { name: '@here', value: '@here' })),
  new SlashCommandBuilder()
    .setName('setup')
    .setDescription('⚠️ BORRA TODO y crea la estructura del servidor desde cero')
    .setDefaultMemberPermissions(soloDueno)
    .addBooleanOption(o => o.setName('confirmar').setDescription('CONFIRMA que quieres BORRAR todos los canales y categorías').setRequired(true))
].map(c => c.toJSON());

// ─────────────── CLIENTE Y ARRANQUE ───────────────
const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
  ]
});

client.once(Events.ClientReady, async (c) => {
  console.log(`✅ Conectado como ${c.user.tag}`);
  for (const guild of c.guilds.cache.values()) {
    try {
      console.log(`🔄 Recargando comandos en: ${guild.name}`);
      await guild.commands.set([]);
      await new Promise(r => setTimeout(r, 1200));
      await guild.commands.set(comandos);
      console.log(`✅ Comandos listos en: ${guild.name}`);
    } catch (err) {
      console.error(`❌ Error en ${guild.name}:`, err);
    }
  }
});

client.on(Events.GuildCreate, async (guild) => {
  try {
    await guild.commands.set(comandos);
    console.log(`✅ Servidor nuevo detectado, comandos registrados: ${guild.name}`);
  } catch (err) {
    console.error(err);
  }
});

// ─────────────── INTERACCIONES ───────────────
client.on(Events.InteractionCreate, async (interaction) => {
  try {
    // /setup
    if (interaction.isChatInputCommand() && interaction.commandName === 'setup') {
      if (interaction.user.id !== OWNER_ID) {
        return interaction.reply({ content: '❌ SOLO el dueño puede usar /setup.', flags: MessageFlags.Ephemeral });
      }
      const confirmar = interaction.options.getBoolean('confirmar');
      if (!confirmar) {
        return interaction.reply({ content: '❌ Debes confirmar marcando Sí.', flags: MessageFlags.Ephemeral });
      }
      await interaction.reply({
        content: '⚠️ **ATENCIÓN:** Se van a BORRAR TODOS los canales y categorías...\nEsto puede tardar unos segundos, no toques nada.',
        flags: MessageFlags.Ephemeral
      });
      await ejecutarSetup(interaction.guild);
      return interaction.editReply({
        content: '✅ **ESTRUCTURA CREADA COMPLETAMENTE.** Revisa tu servidor, todo está listo con el formato de las fotos + `Admin-Chat` privado.'
      });
    }

    // Resto de comandos
    if (interaction.isChatInputCommand()) {
      if (interaction.user.id !== OWNER_ID) {
        return interaction.reply({ content: '❌ Solo el dueño de la shop puede usar este comando.', flags: MessageFlags.Ephemeral });
      }

      const cmd = interaction.commandName;

      if (PRODUCTOS[cmd]) {
        await interaction.channel.send({ embeds: [embedCompra(cmd)], components: [filaComprar(cmd)] });
        return interaction.reply({ content: `✅ Shop ${cmd.toUpperCase()} publicada.`, flags: MessageFlags.Ephemeral });
      }

      if (cmd === 'rw') {
        const clave = interaction.options.getSubcommand();
        if (!PRODUCTOS[clave]) {
          return interaction.reply({ content: '❌ Ese token no existe.', flags: MessageFlags.Ephemeral });
        }
        await interaction.channel.send({ embeds: [embedReward(clave)], components: [filaReclamar(clave)] });
        return interaction.reply({ content: `✅ Reward ${clave.toUpperCase()} publicado.`, flags: MessageFlags.Ephemeral });
      }

      if (cmd === 'say') {
        await interaction.deferReply({ flags: MessageFlags.Ephemeral });
        await interaction.channel.send({ content: conSaltos(interaction.options.getString('texto')) });
        return interaction.deleteReply();
      }

      if (cmd === 'anuncio') {
        await interaction.deferReply({ flags: MessageFlags.Ephemeral });
        const mencion = interaction.options.getString('mencion');
        const embed = new EmbedBuilder()
          .setColor(COLOR_ANUNCIO)
          .setTitle('📢 ANUNCIO')
          .setDescription(conSaltos(interaction.options.getString('texto')))
          .setTimestamp();
        await interaction.channel.send({ content: mencion || undefined, embeds: [embed] });
        return interaction.deleteReply();
      }
    }

    // Botones y menús
    if (interaction.isButton() && (interaction.customId.startsWith('comprar:') || interaction.customId === 'shop_comprar')) {
      const clave = interaction.customId === 'shop_comprar' ? 'pve' : interaction.customId.split(':')[1];
      if (!PRODUCTOS[clave]) {
        return interaction.reply({ content: '❌ Este producto ya no está disponible.', flags: MessageFlags.Ephemeral });
      }
      return interaction.reply({
        content: `💰 Token **${clave.toUpperCase()}** — ¿con qué vas a pagar?`,
        components: [filaPago(clave)],
        flags: MessageFlags.Ephemeral,
      });
    }

    if (interaction.isStringSelectMenu() && interaction.customId.startsWith('pago:')) {
      const clave = interaction.customId.split(':')[1];
      const prod = PRODUCTOS[clave];
      const metodoId = interaction.values[0];
      const metodo = METODOS[metodoId];
      const precio = prod?.precios[metodoId];
      if (!prod || !metodo || !precio) {
        return interaction.update({ content: '❌ Opción no válida, intenta de nuevo.', components: [] });
      }
      await interaction.deferUpdate();
      const esVip = interaction.member.roles.cache.has(VIP_ROLE_ID);
      const r = await crearTicket(interaction, {
        tipo: 'compra',
        clave,
        campos: [
          { name: '👤 Comprador', value: `${interaction.user}`, inline: true },
          { name: '📦 Token', value: clave.toUpperCase(), inline: true },
          { name: `${metodo.emoji} Método`, value: metodo.label, inline: true },
          { name: esVip ? '👑 Precio VIP' : '💰 Precio', value: esVip ? precio.vip : precio.normal },
        ],
      });
      return interaction.editReply({
        content: r.existente ? `⚠️ Ya tienes un ticket abierto: ${r.existente}` : `✅ Ticket creado: ${r.canal}`,
        components: [],
      });
    }

    if (interaction.isButton() && interaction.customId.startsWith('reclamar:')) {
      const clave = interaction.customId.split(':')[1];
      if (!PRODUCTOS[clave]) {
        return interaction.reply({ content: '❌ Este reward ya no está disponible.', flags: MessageFlags.Ephemeral });
      }
      await interaction.deferReply({ flags: MessageFlags.Ephemeral });
      const r = await crearTicket(interaction, {
        tipo: 'rw',
        clave,
        campos: [
          { name: '👤 Reclama', value: `${interaction.user}`, inline: true },
          { name: '🎁 Token', value: `RW-${clave.toUpperCase()}`, inline: true },
        ],
      });
      return interaction.editReply(
        r.existente ? `⚠️ Ya tienes un ticket abierto: ${r.existente}` : `✅ Ticket creado: ${r.canal}`,
      );
    }

    if (interaction.isButton() && interaction.customId === 'ticket_cerrar') {
      const esQuienLoAbrio = interaction.channel.topic?.startsWith(`ticket:${interaction.user.id}`);
      const esStaff =
        interaction.user.id === OWNER_ID ||
        (STAFF_ROLE_ID && interaction.member.roles.cache.has(STAFF_ROLE_ID)) ||
        interaction.memberPermissions.has(PermissionFlagsBits.Administrator);
      if (!esQuienLoAbrio && !esStaff) {
        return interaction.reply({ content: '❌ No puedes cerrar este ticket.', flags: MessageFlags.Ephemeral });
      }
      await interaction.reply('🔒 El ticket se cerrará en 5 segundos...');
      setTimeout(() => interaction.channel.delete().catch(() => {}), 5000);
    }

  } catch (err) {
    console.error('❌ Error en interacción:', err);
    const msg = { content: '❌ Ocurrió un error. Avísale al staff.', flags: MessageFlags.Ephemeral };
    if (interaction.replied || interaction.deferred) interaction.followUp(msg).catch(() => {});
    else interaction.reply(msg).catch(() => {});
  }
});

client.login(TOKEN);
