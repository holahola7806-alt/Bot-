// index.js — Bot SHOP GALÁCTICO (ARK Survival Evolved)
// Comandos (solo el dueño puede usarlos):
//   /pve  /pvp  /2b        → anuncio de COMPRA (con precios y botón Comprar)
//   /rw pve | pvp | 2b     → anuncio de REWARD (sin precios y botón Reclamar token)
//   /say texto             → el bot escribe tu texto tal cual
//   /anuncio texto         → el bot publica tu texto como anuncio
//   (en /say y /anuncio escribe \n donde quieras un salto de línea)
//   /setup                 → crea las categorías y canales del servidor (no borra nada)
//
// Requiere: discord.js v14  →  npm install discord.js
// Variables de entorno (en Railway → Variables):
//   TOKEN               Token del bot (OBLIGATORIO)
//   OWNER_ID            Tu ID de Discord: el único que puede usar los comandos
//   STAFF_ROLE_ID       Rol que atiende los tickets (opcional)
//   TICKET_CATEGORY_ID  Categoría donde se crean los tickets (opcional)
//   VIP_ROLE_ID         Rol VIP (si no lo pones, usa el de tu anuncio)

try { require('dotenv').config(); } catch {} // solo si usas .env en tu compu

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
// Para agregar otro token, copia uno de estos bloques y cámbiale la clave.
// La clave (pve, pvp, 2b...) es el nombre del comando: /pve, /rw pve...
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
const conSaltos = (t) => t.replace(/\\n/g, '\n'); // "\n" escrito → salto de línea real

// ─────────────── ESTRUCTURA DEL SERVIDOR (/setup) ───────────────
// /setup CREA todas estas categorías y canales, en este orden. No borra nada.
// Cada canal es: [emoji, nombre, cursiva]  (cursiva = true → letras inclinadas)
const ESTRUCTURA = [
  { numero: 1, canales: [['🚨', 'Anuncios'], ['🗒️', 'Reglas'], ['😱', 'Ofertas'], ['⚡', 'Vip', true], ['💰', 'Métodos-De-Pago'], ['😱', 'TABLA-ADM', true]] },
  { numero: 2, canales: [['🌹', 'Bienvenida'], ['🥀', 'Despedida'], ['🎋', 'Baneados']] },
  { numero: 3, canales: [['🗯️', 'Chatear'], ['🤖', 'Comandos'], ['🗣️', 'Sugerencias']] },
  { numero: 4, canales: [['🏷️', 'Ticket'], ['🧾', 'Logs-Ticket']] },
  { numero: 5, canales: [['🎉', 'Giveaway'], ['🔮', 'Rw-Boost'], ['🎊', 'Rw-Invites']] },
  { numero: 6, canales: [['🎴', 'Plantilla'], ['🤝', 'Partners']] },
  { numero: 7, canales: [['☘️', 'Token-500M'], ['☘️', 'Token-1B'], ['☘️', 'Token-2B'], ['☘️', 'Token-PvP'], ['☘️', 'Token-Crianza'], ['☘️', 'Token-Rewards'], ['☘️', 'Token-Personal']] },
  { numero: 8, canales: [['🧊', 'Proff-Ventas'], ['🧊', 'Proff-Sorteos'], ['🧊', 'Proff-Invites'], ['🧊', 'Proff-Boost'], ['🧊', 'Proff-Tradeos']] },
];

// Letras estilizadas para que las mayúsculas se vean como en tus fotos
function estilizar(texto, cursiva = false) {
  const A = cursiva ? 0x1d608 : 0x1d5a0; // 𝖠 / 𝘈
  const a = cursiva ? 0x1d622 : 0x1d5ba; // 𝖺 / 𝘢
  return [...texto.normalize('NFD')].map((ch) => {
    const c = ch.codePointAt(0);
    if (c >= 65 && c <= 90) return String.fromCodePoint(A + c - 65);
    if (c >= 97 && c <= 122) return String.fromCodePoint(a + c - 97);
    if (c >= 48 && c <= 57) return String.fromCodePoint(0x1d7e2 + c - 48); // 𝟢-𝟫
    return ch;
  }).join('');
}
const numeroNegrita = (n) => [...String(n)].map((d) => String.fromCodePoint(0x1d7ce + Number(d))).join(''); // 𝟎-𝟗
const nombreCategoria = (n) => { const d = numeroNegrita(n); return `${d}══════════${d}══════════${d}`; };
const nombreCanal = (emoji, nombre, cursiva) => `➜〖${emoji}〗${estilizar(nombre, cursiva)}`;

const setupEnCurso = new Set();

async function crearEstructura(guild) {
  let categorias = 0, canales = 0, errores = 0;
  for (const bloque of ESTRUCTURA) {
    let categoria;
    try {
      categoria = await guild.channels.create({ name: nombreCategoria(bloque.numero), type: ChannelType.GuildCategory });
      categorias++;
    } catch (err) {
      console.error(`❌ No pude crear la categoría ${bloque.numero}:`, err.message);
      errores += 1 + bloque.canales.length;
      continue;
    }
    for (const [emoji, nombre, cursiva] of bloque.canales) {
      try {
        await guild.channels.create({ name: nombreCanal(emoji, nombre, cursiva), type: ChannelType.GuildText, parent: categoria.id });
        canales++;
      } catch (err) {
        console.error(`❌ No pude crear el canal ${nombre}:`, err.message);
        errores++;
      }
    }
  }
  console.log(`🏗️ /setup en ${guild.name}: ${categorias} categorías y ${canales} canales creados (${errores} errores)`);
  return { categorias, canales, errores };
}

// ─────────────── EMBEDS Y COMPONENTES ───────────────
const listaIncluye = (prod) =>
  '### 📦 ¿Qué incluye?\n' + prod.incluye.map((i) => `🔹 ${i}`).join('\n');

// Anuncio de COMPRA (con precios)
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

// Anuncio de REWARD (sin precios)
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
// tipo: 'compra' o 'rw'  →  canal "compra-pvp-usuario" / "rw-pvp-usuario"
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

  const etiqueta = `${tipo.toUpperCase()}-${clave.toUpperCase()}`; // COMPRA-PVP / RW-PVP
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

// ─────────────── CLIENTE Y COMANDOS ───────────────
const client = new Client({ intents: [GatewayIntentBits.Guilds] });

const soloAdmins = PermissionFlagsBits.Administrator;

const comandos = [
  // /pve, /pvp, /2b
  ...Object.keys(PRODUCTOS).map((clave) =>
    new SlashCommandBuilder()
      .setName(clave)
      .setDescription(`Publica la shop del token ${clave.toUpperCase()} (compra)`)
      .setDefaultMemberPermissions(soloAdmins),
  ),

  // /rw pve, /rw pvp, /rw 2b
  (() => {
    const rw = new SlashCommandBuilder()
      .setName('rw')
      .setDescription('Publica un token de reward (sin precios)')
      .setDefaultMemberPermissions(soloAdmins);
    for (const clave of Object.keys(PRODUCTOS)) {
      rw.addSubcommand((sub) =>
        sub.setName(clave).setDescription(`Reward del token ${clave.toUpperCase()}`),
      );
    }
    return rw;
  })(),

  new SlashCommandBuilder()
    .setName('say')
    .setDescription('El bot escribe tu texto en este canal')
    .setDefaultMemberPermissions(soloAdmins)
    .addStringOption((o) =>
      o.setName('texto').setDescription('Lo que va a escribir el bot (usa \\n para saltos de línea)')
        .setRequired(true).setMaxLength(2000),
    ),

  new SlashCommandBuilder()
    .setName('setup')
    .setDescription('Crea las categorías y canales del servidor (no borra nada)')
    .setDefaultMemberPermissions(soloAdmins),

  new SlashCommandBuilder()
    .setName('anuncio')
    .setDescription('El bot publica tu texto como anuncio en este canal')
    .setDefaultMemberPermissions(soloAdmins)
    .addStringOption((o) =>
      o.setName('texto').setDescription('El texto del anuncio (usa \\n para saltos de línea)')
        .setRequired(true).setMaxLength(4000),
    )
    .addStringOption((o) =>
      o.setName('mencion').setDescription('¿A quién mencionar? (opcional)')
        .addChoices(
          { name: '@everyone', value: '@everyone' },
          { name: '@here', value: '@here' },
          { name: '@everyone y @here', value: '@everyone @here' },
        ),
    ),
].map((c) => c.toJSON());

// Registra los comandos en cada servidor donde está el bot (aparecen al instante)
async function registrarComandos(guild) {
  try {
    await guild.commands.set(comandos);
    console.log(`✅ Comandos registrados en ${guild.name}`);
  } catch (err) {
    console.error(`❌ Error registrando comandos en ${guild.name}:`, err);
  }
}

client.once(Events.ClientReady, async (c) => {
  console.log(`✅ Conectado como ${c.user.tag}`);
  for (const guild of c.guilds.cache.values()) await registrarComandos(guild);
});

client.on(Events.GuildCreate, registrarComandos);

// ─────────────── INTERACCIONES ───────────────
client.on(Events.InteractionCreate, async (interaction) => {
  try {
    // ── Comandos (solo el dueño) ──
    if (interaction.isChatInputCommand()) {
      if (interaction.user.id !== OWNER_ID) {
        return interaction.reply({ content: '❌ Solo el dueño de la shop puede usar este comando.', flags: MessageFlags.Ephemeral });
      }
      const cmd = interaction.commandName;

      // /pve, /pvp, /2b → anuncio de compra
      if (PRODUCTOS[cmd]) {
        await interaction.channel.send({ embeds: [embedCompra(cmd)], components: [filaComprar(cmd)] });
        return interaction.reply({ content: `✅ Shop ${cmd.toUpperCase()} publicada.`, flags: MessageFlags.Ephemeral });
      }

      // /rw pve, /rw pvp, /rw 2b → anuncio de reward
      if (cmd === 'rw') {
        const clave = interaction.options.getSubcommand();
        if (!PRODUCTOS[clave]) {
          return interaction.reply({ content: '❌ Ese token no existe.', flags: MessageFlags.Ephemeral });
        }
        await interaction.channel.send({ embeds: [embedReward(clave)], components: [filaReclamar(clave)] });
        return interaction.reply({ content: `✅ Reward ${clave.toUpperCase()} publicado.`, flags: MessageFlags.Ephemeral });
      }

      // /say texto → el bot lo escribe y no queda rastro de tu comando
      if (cmd === 'say') {
        await interaction.deferReply({ flags: MessageFlags.Ephemeral });
        await interaction.channel.send({ content: conSaltos(interaction.options.getString('texto')) });
        return interaction.deleteReply();
      }

      // /setup → pide confirmación antes de crear todo
      if (cmd === 'setup') {
        const total = ESTRUCTURA.reduce((s, b) => s + b.canales.length, 0);
        return interaction.reply({
          content: `🏗️ Voy a crear **${ESTRUCTURA.length} categorías** y **${total} canales** nuevos, como en tus fotos.\nNo borro ni me salto nada: los canales viejos los borras tú. ¿Continuar?`,
          components: [new ActionRowBuilder().addComponents(
            new ButtonBuilder().setCustomId('setup_si').setLabel('Crear todo').setEmoji('🏗️').setStyle(ButtonStyle.Success),
            new ButtonBuilder().setCustomId('setup_no').setLabel('Cancelar').setStyle(ButtonStyle.Secondary),
          )],
          flags: MessageFlags.Ephemeral,
        });
      }

      // /anuncio texto [mencion] → anuncio en embed
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

    // ── Confirmación de /setup ──
    if (interaction.isButton() && (interaction.customId === 'setup_si' || interaction.customId === 'setup_no')) {
      if (interaction.user.id !== OWNER_ID) {
        return interaction.reply({ content: '❌ Solo el dueño puede usar esto.', flags: MessageFlags.Ephemeral });
      }
      if (interaction.customId === 'setup_no') {
        return interaction.update({ content: '❌ Cancelado. No se creó nada.', components: [] });
      }
      if (setupEnCurso.has(interaction.guildId)) {
        return interaction.update({ content: '⏳ Ya estoy creando los canales, espera a que termine.', components: [] });
      }
      setupEnCurso.add(interaction.guildId);
      await interaction.update({ content: '⏳ Creando categorías y canales... tarda unos segundos.', components: [] });
      try {
        const r = await crearEstructura(interaction.guild);
        await interaction.editReply(
          `✅ Listo: se crearon **${r.categorias}** categorías y **${r.canales}** canales.`
          + (r.errores ? `\n⚠️ ${r.errores} no se pudieron crear. Revisa que el bot tenga el permiso **Gestionar canales**.` : ''),
        );
      } finally {
        setupEnCurso.delete(interaction.guildId);
      }
      return;
    }

    // ── Botón Comprar → elegir método de pago ──
    // ('shop_comprar' es el botón de los anuncios viejos de /shop; cuenta como PvE)
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

    // ── Método elegido → ticket COMPRA-<TOKEN> ──
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

    // ── Botón Reclamar token → ticket RW-<TOKEN> ──
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

    // ── Cerrar ticket (quien lo abrió, dueño, staff o admin) ──
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
