// index.js — Bot SHOP GALÁCTICO PvE (ARK Survival Evolved)
// Requiere: discord.js v14  →  npm install discord.js
// Variables de entorno (en Railway → Variables):
//   TOKEN               Token del bot
//   CLIENT_ID           ID de la aplicación del bot
//   GUILD_ID            ID de tu servidor
//   STAFF_ROLE_ID       Rol que atiende los tickets (opcional pero recomendado)
//   TICKET_CATEGORY_ID  Categoría donde se crean los tickets (opcional)
//   VIP_ROLE_ID         Rol VIP (si no lo pones, usa el de tu anuncio)

try { require('dotenv').config(); } catch {} // solo si usas .env en tu compu

const {
  Client, GatewayIntentBits, Events, EmbedBuilder, ActionRowBuilder,
  ButtonBuilder, ButtonStyle, StringSelectMenuBuilder, ChannelType,
  PermissionFlagsBits, REST, Routes, SlashCommandBuilder, MessageFlags,
} = require('discord.js');

const { TOKEN, CLIENT_ID, GUILD_ID, STAFF_ROLE_ID, TICKET_CATEGORY_ID } = process.env;
const VIP_ROLE_ID = process.env.VIP_ROLE_ID || '1382450619297693717';

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

client.once(Events.ClientReady, async (c) => {
  console.log(`✅ Conectado como ${c.user.tag}`);
  try {
    const rest = new REST({ version: '10' }).setToken(TOKEN);
    await rest.put(Routes.applicationGuildCommands(CLIENT_ID, GUILD_ID), { body: comandos });
    console.log('✅ Comando /shop registrado');
  } catch (err) {
    console.error('❌ Error registrando comandos:', err);
  }
});

// ─────────────── INTERACCIONES ───────────────
client.on(Events.InteractionCreate, async (interaction) => {
  try {
    // /shop → publica el anuncio
    if (interaction.isChatInputCommand() && interaction.commandName === 'shop') {
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
        content: `${user}${STAFF_ROLE_ID ? ` <@&${STAFF_ROLE_ID}>` : ''}`,
        embeds: [embedTicket],
        components: [filaCerrar()],
      });

      return interaction.update({ content: `✅ Ticket creado: ${canal}`, components: [] });
    }

    // Cerrar ticket (dueño del ticket, staff o admin)
    if (interaction.isButton() && interaction.customId === 'ticket_cerrar') {
      const esDueno = interaction.channel.topic === `ticket:${interaction.user.id}`;
      const esStaff =
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
