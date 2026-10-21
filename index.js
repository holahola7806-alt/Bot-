// index.js — Bot SHOP GALÁCTICO (ARK Survival Evolved)
// Comandos: /pve, /pvp y /2b (solo el dueño puede usarlos)
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
// La clave (pve, pvp...) es el nombre del comando: /pve, /pvp...
const PRODUCTOS = {
  pve: {
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

// ─────────────── EMBEDS Y COMPONENTES ───────────────
function embedShop(clave) {
  const prod = PRODUCTOS[clave];
  const lista = (tipo) =>
    Object.entries(prod.precios)
      .map(([m, p]) => `➜ ${METODOS[m].emoji} **${METODOS[m].label}:** ${p[tipo]}`)
      .join('\n');

  const embed = new EmbedBuilder()
    .setColor(prod.color)
    .setTitle(prod.titulo)
    .setDescription('### 📦 ¿Qué incluye?\n' + prod.incluye.map((i) => `🔹 ${i}`).join('\n'))
    .addFields(
      { name: '💰 Precio', value: lista('normal') },
      { name: '👑 Precio VIP', value: `<@&${VIP_ROLE_ID}>\n${lista('vip')}` },
    )
    .setFooter({ text: 'Pulsa 🛒 Comprar para abrir un ticket' });

  if (prod.nota) embed.addFields({ name: '⚠️ Importante', value: prod.nota });
  return embed;
}

const filaComprar = (clave) =>
  new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId(`comprar:${clave}`)
      .setLabel(`Comprar ${clave.toUpperCase()}`)
      .setEmoji('🛒')
      .setStyle(ButtonStyle.Success),
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

// ─────────────── CLIENTE Y COMANDOS ───────────────
const client = new Client({ intents: [GatewayIntentBits.Guilds] });

const comandos = Object.entries(PRODUCTOS).map(([clave, prod]) =>
  new SlashCommandBuilder()
    .setName(clave)
    .setDescription(`Publica la shop del token ${clave.toUpperCase()} en este canal`)
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
    .toJSON(),
);

// Registra los comandos en cada servidor donde está el bot (aparecen al instante)
async function registrarComandos(guild) {
  try {
    await guild.commands.set(comandos);
    console.log(`✅ Comandos /${Object.keys(PRODUCTOS).join(', /')} registrados en ${guild.name}`);
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
    // /pve, /pvp, /2b → publica el anuncio
    if (interaction.isChatInputCommand() && PRODUCTOS[interaction.commandName]) {
      if (interaction.user.id !== OWNER_ID) {
        return interaction.reply({ content: '❌ Solo el dueño de la shop puede usar este comando.', flags: MessageFlags.Ephemeral });
      }
      const clave = interaction.commandName;
      await interaction.channel.send({ embeds: [embedShop(clave)], components: [filaComprar(clave)] });
      return interaction.reply({ content: `✅ Shop ${clave.toUpperCase()} publicada.`, flags: MessageFlags.Ephemeral });
    }

    // Botón Comprar → elegir método de pago
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

    // Método elegido → crear ticket
    if (interaction.isStringSelectMenu() && interaction.customId.startsWith('pago:')) {
      const { guild, user, member } = interaction;
      const clave = interaction.customId.split(':')[1];
      const prod = PRODUCTOS[clave];
      const metodoId = interaction.values[0];
      const metodo = METODOS[metodoId];
      const precio = prod?.precios[metodoId];
      if (!prod || !metodo || !precio) {
        return interaction.update({ content: '❌ Opción no válida, intenta de nuevo.', components: [] });
      }
      const esVip = member.roles.cache.has(VIP_ROLE_ID);

      const existente = guild.channels.cache.find((ch) => ch.topic?.startsWith(`ticket:${user.id}`));
      if (existente) {
        return interaction.update({ content: `⚠️ Ya tienes un ticket abierto: ${existente}`, components: [] });
      }

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

      const nombre = user.username.toLowerCase().replace(/[^a-z0-9_-]/g, '').slice(0, 20) || user.id;
      const canal = await guild.channels.create({
        name: `${clave}-${nombre}`,
        type: ChannelType.GuildText,
        topic: `ticket:${user.id}:${clave}`,
        parent: TICKET_CATEGORY_ID || null,
        permissionOverwrites: permisos,
      });

      const embedTicket = new EmbedBuilder()
        .setColor(prod.color)
        .setTitle(`🛒 Nueva compra — ${prod.titulo}`)
        .addFields(
          { name: '👤 Comprador', value: `${user}`, inline: true },
          { name: '📦 Token', value: clave.toUpperCase(), inline: true },
          { name: `${metodo.emoji} Método`, value: metodo.label, inline: true },
          { name: esVip ? '👑 Precio VIP' : '💰 Precio', value: esVip ? precio.vip : precio.normal },
        )
        .setFooter({ text: 'Espera a que el staff te atienda. Manda aquí tu comprobante de pago.' });
      if (prod.nota) embedTicket.addFields({ name: '⚠️ Importante', value: prod.nota });

      await canal.send({
        content: `${user} <@${OWNER_ID}>${STAFF_ROLE_ID ? ` <@&${STAFF_ROLE_ID}>` : ''}`,
        embeds: [embedTicket],
        components: [filaCerrar()],
      });

      return interaction.update({ content: `✅ Ticket creado: ${canal}`, components: [] });
    }

    // Cerrar ticket (comprador, dueño, staff o admin)
    if (interaction.isButton() && interaction.customId === 'ticket_cerrar') {
      const esComprador = interaction.channel.topic?.startsWith(`ticket:${interaction.user.id}`);
      const esStaff =
        interaction.user.id === OWNER_ID ||
        (STAFF_ROLE_ID && interaction.member.roles.cache.has(STAFF_ROLE_ID)) ||
        interaction.memberPermissions.has(PermissionFlagsBits.Administrator);

      if (!esComprador && !esStaff) {
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
