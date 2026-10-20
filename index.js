// index.js — Bot SHOP GALÁCTICO PvE (ARK Survival Evolved)
// Requiere: discord.js v14  →  npm install discord.js
// Variables de entorno (en Railway → Variables):
//   TOKEN               Token del bot (OBLIGATORIO)
//   OWNER_ID            Tu ID de Discord: el único que puede usar /shop
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

// ─────────────── CONFIGURACIÓN DE LA SHOP ───────────────
const INCLUYE = [
  '**250M de ámbar**',
  '**Todos los injertos**',
  '**100 dinos OP** *(farmeros)*',
  '**BPs de armadura**',
  '**BPs de armas**',
  '**BPs de TK**',
  '**BPs de armadura para dinos**',
  '**Todas las estaciones con 1M de mezclas** ✨',
  '**ARKETYPOS** *(solo para ventas)*',
];

const PRECIOS = {
  paypal:    { label: 'PayPal',    emoji: '💳', normal: '2 USD *(comisión no incluida)*', vip: '1 USD *(comisión no incluida)*' },
  nitrado:   { label: 'Nitrado',   emoji: '🖥️', normal: '3 USD',          vip: '2 USD' },
  robux:     { label: 'Robux',     emoji: '🟢', normal: '200 Robux',      vip: '100 Robux' },
  diamantes: { label: 'Diamantes', emoji: '💎', normal: '200 Diamantes',  vip: '100 Diamantes' },
};

const NOTA_PRIVADO = 'Si lo quieres sacar desde mi **server privado**, se cobra **+1 USD extra** por la transferencia.';
const COLOR = 0x7b2cbf;

// ─────────────── EMBEDS Y COMPONENTES ───────────────
function embedShop() {
  const lista = (tipo) =>
    Object.values(PRECIOS).map((p) => `➜ ${p.emoji} **${p.label}:** ${p[tipo]}`).join('\n');

  return new EmbedBuilder()
    .setColor(COLOR)
    .setTitle('🌌 TOKEN — SHOP GALÁCTICO PvE 🌌')
    .setDescription('### 📦 ¿Qué incluye?\n' + INCLUYE.map((i) => `🔹 ${i}`).join('\n'))
    .addFields(
      { name: '💰 Precio', value: lista('normal') },
      { name: '👑 Precio VIP', value: `<@&${VIP_ROLE_ID}>\n${lista('vip')}` },
      { name: '⚠️ Importante', value: NOTA_PRIVADO },
    )
    .setFooter({ text: 'Pulsa 🛒 Comprar para abrir un ticket' });
}

const filaComprar = () =>
  new ActionRowBuilder().addComponents(
    new ButtonBuilder().setCustomId('shop_comprar').setLabel('Comprar').setEmoji('🛒').setStyle(ButtonStyle.Success),
  );

const filaPago = () =>
  new ActionRowBuilder().addComponents(
    new StringSelectMenuBuilder()
      .setCustomId('shop_pago')
      .setPlaceholder('Elige tu método de pago')
      .addOptions(
        Object.entries(PRECIOS).map(([valor, p]) => ({ label: p.label, value: valor, emoji: p.emoji })),
      ),
  );

const filaCerrar = () =>
  new ActionRowBuilder().addComponents(
    new ButtonBuilder().setCustomId('ticket_cerrar').setLabel('Cerrar ticket').setEmoji('🔒').setStyle(ButtonStyle.Danger),
  );

// ─────────────── CLIENTE ───────────────
const client = new Client({ intents: [GatewayIntentBits.Guilds] });

const comandos = [
  new SlashCommandBuilder()
    .setName('shop')
    .setDescription('Publica la Shop Galáctico PvE en este canal')
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),
].map((c) => c.toJSON());

// Registra /shop en cada servidor donde está el bot (aparece al instante)
async function registrarComandos(guild) {
  try {
    await guild.commands.set(comandos);
    console.log(`✅ /shop registrado en ${guild.name}`);
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
    // /shop → publica el anuncio
    if (interaction.isChatInputCommand() && interaction.commandName === 'shop') {
      if (interaction.user.id !== OWNER_ID) {
        return interaction.reply({ content: '❌ Solo el dueño de la shop puede usar este comando.', flags: MessageFlags.Ephemeral });
      }
      await interaction.channel.send({ embeds: [embedShop()], components: [filaComprar()] });
      return interaction.reply({ content: '✅ Shop publicada.', flags: MessageFlags.Ephemeral });
    }

    // Botón Comprar → elegir método de pago
    if (interaction.isButton() && interaction.customId === 'shop_comprar') {
      return interaction.reply({
        content: '💰 ¿Con qué vas a pagar?',
        components: [filaPago()],
        flags: MessageFlags.Ephemeral,
      });
    }

    // Método elegido → crear ticket
    if (interaction.isStringSelectMenu() && interaction.customId === 'shop_pago') {
      const { guild, user, member } = interaction;
      const metodo = PRECIOS[interaction.values[0]];
      const esVip = member.roles.cache.has(VIP_ROLE_ID);

      const existente = guild.channels.cache.find((ch) => ch.topic === `ticket:${user.id}`);
      if (existente) {
        return interaction.update({ content: `⚠️ Ya tienes un ticket abierto: ${existente}`, components: [] });
      }

      const permisos = [
        { id: guild.roles.everyone.id, deny: [PermissionFlagsBits.ViewChannel] },
        {
          id: user.id,
          allow: [
            PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages,
            PermissionFlagsBits.AttachFiles, PermissionFlagsBits.ReadMessageHistory,
          ],
        },
        {
          id: client.user.id,
          allow: [
            PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages,
            PermissionFlagsBits.ManageChannels, PermissionFlagsBits.ReadMessageHistory,
          ],
        },
        {
          id: OWNER_ID,
          allow: [
            PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages,
            PermissionFlagsBits.AttachFiles, PermissionFlagsBits.ReadMessageHistory,
          ],
        },
      ];
      if (STAFF_ROLE_ID) {
        permisos.push({
          id: STAFF_ROLE_ID,
          allow: [
            PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages,
            PermissionFlagsBits.AttachFiles, PermissionFlagsBits.ReadMessageHistory,
          ],
        });
      }

      const nombre = user.username.toLowerCase().replace(/[^a-z0-9_-]/g, '').slice(0, 20) || user.id;
      const canal = await guild.channels.create({
        name: `ticket-${nombre}`,
        type: ChannelType.GuildText,
        topic: `ticket:${user.id}`,
        parent: TICKET_CATEGORY_ID || null,
        permissionOverwrites: permisos,
      });

      const embedTicket = new EmbedBuilder()
        .setColor(COLOR)
        .setTitle('🛒 Nueva compra — Token Shop Galáctico PvE')
        .addFields(
          { name: '👤 Comprador', value: `${user}`, inline: true },
          { name: `${metodo.emoji} Método`, value: metodo.label, inline: true },
          { name: esVip ? '👑 Precio VIP' : '💰 Precio', value: esVip ? metodo.vip : metodo.normal },
          { name: '⚠️ Importante', value: NOTA_PRIVADO },
        )
        .setFooter({ text: 'Espera a que el staff te atienda. Manda aquí tu comprobante de pago.' });

      await canal.send({
        content: `${user} <@${OWNER_ID}>${STAFF_ROLE_ID ? ` <@&${STAFF_ROLE_ID}>` : ''}`,
        embeds: [embedTicket],
        components: [filaCerrar()],
      });

      return interaction.update({ content: `✅ Ticket creado: ${canal}`, components: [] });
    }

    // Cerrar ticket (dueño del ticket, staff o admin)
    if (interaction.isButton() && interaction.customId === 'ticket_cerrar') {
      const esDueno = interaction.channel.topic === `ticket:${interaction.user.id}`;
      const esStaff =
        interaction.user.id === OWNER_ID ||
        (STAFF_ROLE_ID && interaction.member.roles.cache.has(STAFF_ROLE_ID)) ||
        interaction.memberPermissions.has(PermissionFlagsBits.Administrator);

      if (!esDueno && !esStaff) {
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
