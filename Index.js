// ═══════════════════════════════════════════════════════════════
// 𝙎𝙀𝘾𝙍𝙀𝙏 𝙂𝘼𝙈𝙀 𝙃𝙐𝘽 — SERVIDOR OFICIAL
// DUEÑOS: 1142614761775828993 | 1463342617856311388
// VERSIÓN: 2.5.2
// ═══════════════════════════════════════════════════════════════

const {
  Client,
  GatewayIntentBits,
  Events,
  ChannelType,
  PermissionFlagsBits,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  EmbedBuilder,
} = require('discord.js');
require('dotenv').config();

const config = {
  token: process.env.TOKEN,
  prefix: '!',
  ownerIds: [
    process.env.OWNER_ID_1,
    process.env.OWNER_ID_2
  ],
  staffRoleId: process.env.STAFF_ROLE_ID,
  autoRoleId: process.env.AUTO_ROLE_ID,
  ticketCategoryId: process.env.TICKET_CATEGORY_ID,
  logChannelId: process.env.LOG_CHANNEL_ID
};

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.GuildMembers,
    GatewayIntentBits.GuildMessageReactions,
  ],
});

// ═══════════════════════════ PROTECCIONES ═══════════════════════════
const spamTracker = new Map();
const joinTracker = [];
const PROT = {
  SPAM_LIMIT: 5,
  SPAM_WINDOW: 5000,
  DUPLICATE_LIMIT: 3,
  RAID_JOINS: 7,
  RAID_WINDOW: 10000,
  ALT_DAYS: 7,
  TIMEOUT_DUR: 10 * 60 * 1000
};

// ✅ LISTA BLANCA CON LOS 2 DUEÑOS
const WHITELIST = new Set(config.ownerIds);
const isWhitelisted = id => WHITELIST.has(String(id));

function checkSpam(message) {
  if (isWhitelisted(message.author.id)) return { ok: true };
  const now = Date.now(), userId = String(message.author.id);
  if (!spamTracker.has(userId)) spamTracker.set(userId, { messages: [], lastContent: '' });
  const u = spamTracker.get(userId);
  u.messages.push(now);
  u.messages = u.messages.filter(t => now - t < PROT.SPAM_WINDOW);
  if (u.messages.length > PROT.SPAM_LIMIT) return { ok: false, reason: 'spam_velocidad' };
  if (message.content && message.content === u.lastContent && message.content.length > 10) {
    u.duplicateCount = (u.duplicateCount || 1) + 1;
    if (u.duplicateCount >= PROT.DUPLICATE_LIMIT) return { ok: false, reason: 'spam_duplicado' };
  } else u.duplicateCount = 0;
  u.lastContent = message.content;
  return { ok: true };
}

function checkAlt(member) {
  if (isWhitelisted(member.id)) return { ok: true };
  const age = Date.now() - member.user.createdTimestamp;
  if (age < PROT.ALT_DAYS * 86400000) {
    return { ok: false, reason: 'cuenta_nueva', ageDays: Math.floor(age / 86400000) };
  }
  return { ok: true };
}

function checkRaid(member) {
  const now = Date.now();
  joinTracker.push({ id: String(member.id), time: now });
  while (joinTracker.length && now - joinTracker[0].time > PROT.RAID_WINDOW) joinTracker.shift();
  if (joinTracker.length >= PROT.RAID_JOINS) {
    return { ok: false, reason: 'raid_detectado', count: joinTracker.length };
  }
  return { ok: true };
}

async function logAction(guild, text) {
  try {
    if (!config.logChannelId) return;
    const ch = await guild.channels.fetch(config.logChannelId).catch(() => null);
    if (ch) await ch.send(`🛡️ **𝙎𝙀𝘾𝙍𝙀𝙏 𝙂𝘼𝙈𝙀 𝙃𝙐𝘽 | Protección:** ${text}`);
  } catch {}
}

// ═══════════════════════════ COMANDOS ═══════════════════════════
client.on(Events.MessageCreate, async message => {
  if (!message.guild || message.author.bot) return;
  
  const args = message.content.slice(config.prefix.length).trim().split(/ +/);
  const command = args.shift()?.toLowerCase();

  // Anti-Spam
  const spam = checkSpam(message);
  if (!spam.ok) {
    await message.delete().catch(() => {});
    await message.member?.timeout(PROT.TIMEOUT_DUR, `Anti-Spam: ${spam.reason}`).catch(() => {});
    await logAction(message.guild, `${message.author.tag} sancionado por ${spam.reason}`);
    return;
  }

  // !say
  if (command === 'say') {
    if (!message.member.permissions.has(PermissionFlagsBits.ManageMessages)) return;
    const text = args.join(' ');
    if (!text) return message.reply('❌ Uso: !say mensaje');
    await message.delete().catch(() => {});
    return message.channel.send(text);
  }

  // !anuncio
  if (command === 'anuncio') {
    if (!message.member.permissions.has(PermissionFlagsBits.ManageGuild)) return;
    const texto = args.join(' ');
    if (!texto) return message.reply('❌ Uso: !anuncio texto');
    const embed = new EmbedBuilder()
      .setColor('#7B2FFD')
      .setTitle('📢 𝘼𝙉𝙐𝙉𝘾𝙄𝙊 — 𝙎𝙀𝘾𝙍𝙀𝙏 𝙂𝘼𝙈𝙀 𝙃𝙐𝘽')
      .setDescription(texto)
      .setTimestamp();
    await message.delete().catch(() => {});
    return message.channel.send({ content: '@everyone', embeds: [embed] });
  }

  // !lock
  if (command === 'lock') {
    if (!message.member.permissions.has(PermissionFlagsBits.ManageChannels)) {
      return message.reply('❌ No tienes permiso para bloquear canales').catch(() => {});
    }
    await message.channel.permissionOverwrites.edit(message.guild.id, {
      SendMessages: false
    }).catch(() => {});
    const embedLock = new EmbedBuilder()
      .setColor('#e74c3c')
      .setTitle('🔒 𝘾𝘼𝙉𝘼𝙇 𝘽𝙇𝙊𝙌𝙐𝙀𝘼𝘿𝙊')
      .setDescription('Este canal ha sido cerrado. Solo los 𝘼𝘿𝙈𝙄𝙉𝙄𝙎𝙏𝙍𝘼𝘿𝙊𝙍𝙀𝙎 pueden escribir.')
      .setFooter({ text: '𝙎𝙀𝘾𝙍𝙀𝙏 𝙂𝘼𝙈𝙀 𝙃𝙐𝘽' })
      .setTimestamp();
    return message.channel.send({ embeds: [embedLock] });
  }

  // !unlock
  if (command === 'unlock') {
    if (!message.member.permissions.has(PermissionFlagsBits.ManageChannels)) {
      return message.reply('❌ No tienes permiso para desbloquear canales').catch(() => {});
    }
    await message.channel.permissionOverwrites.edit(message.guild.id, {
      SendMessages: null
    }).catch(() => {});
    const embedUnlock = new EmbedBuilder()
      .setColor('#2ecc71')
      .setTitle('🔓 𝘾𝘼𝙉𝘼𝙇 𝘿𝙀𝙎𝘽𝙇𝙊𝙌𝙐𝙀𝘼𝘿𝙊')
      .setDescription('Este canal ha sido abierto. Todos pueden escribir nuevamente.')
      .setFooter({ text: '𝙎𝙀𝘾𝙍𝙀𝙏 𝙂𝘼𝙈𝙀 𝙃𝙐𝘽' })
      .setTimestamp();
    return message.channel.send({ embeds: [embedUnlock] });
  }

  // !ticketpanel
  if (command === 'ticketpanel') {
    if (!message.member.permissions.has(PermissionFlagsBits.ManageGuild)) return;
    const embed = new EmbedBuilder()
      .setColor('#7B2FFD')
      .setTitle('🎫 𝙎𝙄𝙎𝙏𝙀𝙈𝘼 𝘿𝙀 𝙏𝙄𝘾𝙆𝙀𝙏𝙎')
      .setDescription('Presiona el botón para crear un ticket de soporte.\nNo crees más de uno a la vez.')
      .setFooter({ text: '𝙎𝙀𝘾𝙍𝙀𝙏 𝙂𝘼𝙈𝙀 𝙃𝙐𝘽 · 𝙎𝙊𝙋𝙊𝙍𝙏𝙀' });
    const row = new ActionRowBuilder().addComponents(
      new ButtonBuilder().setCustomId('create_ticket').setLabel('🎫 𝘾𝙍𝙀𝘼𝙍 𝙏𝙄𝘾𝙆𝙀𝙏').setStyle(ButtonStyle.Primary)
    );
    return message.channel.send({ embeds: [embed], components: [row] });
  }

  // !setup-sv — SOLO LOS 2 DUEÑOS PUEDEN USARLO
  if (command === 'setup-sv') {
    const autorId = String(message.author.id);
    
    if (!config.ownerIds.includes(autorId)) {
      return message.reply(`❌ No eres dueño.\nTu ID: ${autorId}`).catch(() => {});
    }
    
    await message.reply('🔨 Creando 𝙎𝙀𝘾𝙍𝙀𝙏 𝙂𝘼𝙈𝙀 𝙃𝙐𝘽... ⏳').catch(() => {});
    
    const g = message.guild;
    if (!g) return message.reply('❌ No se detectó el servidor').catch(() => {});

    async function crearCat(nombreCat, pos) {
      return g.channels.create({ name: nombreCat, type: ChannelType.GuildCategory, position: pos });
    }
    async function crearTexto(nombreCanal, categoriaPadre, permisos = {}) {
      const sobreescrituras = Object.entries(permisos).map(([idRol, conf]) => ({
        id: idRol,
        allow: conf.allow?.map(p => PermissionFlagsBits[p]),
        deny: conf.deny?.map(p => PermissionFlagsBits[p])
      }));
      return g.channels.create({
        name: nombreCanal,
        type: ChannelType.GuildText,
        parent: categoriaPadre?.id || null,
        permissionOverwrites: sobreescrituras
      });
    }
    async function crearVoz(nombreCanalVoz, categoriaPadre) {
      return g.channels.create({
        name: nombreCanalVoz,
        type: ChannelType.GuildVoice,
        parent: categoriaPadre?.id || null
      });
    }

    try {
      // ══════════════ FOTO 1: Noticias + Métodos de pago ══════════════
      const cNoticias = await crearCat('𝙉𝙊𝙏𝙄𝘾𝙄𝘼𝙎', 0);
      await crearTexto('📢-𝘼𝙑𝙄𝙎𝙊𝙎', cNoticias, { [g.id]: { deny: ['SendMessages'] } });
      await crearTexto('📝-𝙉𝙊𝙏𝙄𝘾𝙄𝘼𝙎-𝙓𝙀𝙉𝙊', cNoticias, { [g.id]: { deny: ['SendMessages'] } });
      await crearTexto('🎬-𝘾𝙍𝙀𝘼𝙏𝙊𝙍𝙎-𝙍𝙀𝙌𝙐𝙄𝙍𝙀𝙈', cNoticias, { [g.id]: { deny: ['SendMessages'] } });
      await crearTexto('🌐-𝘾𝙊𝙉𝙏𝙀𝙉𝙏-𝙊𝙉𝙇𝙊𝘾𝙆', cNoticias, { [g.id]: { deny: ['SendMessages'] } });
      await crearTexto('🐘-𝙀𝙎𝙏𝘼𝙁𝘼𝘿𝙊𝙍𝙀𝙎', cNoticias, { [g.id]: { deny: ['SendMessages'] } });
      await crearTexto('💎-𝘽𝙊𝙊𝙎𝙏𝙎', cNoticias, { [g.id]: { deny: ['SendMessages'] } });

      const cPagos = await crearCat('𝙈𝙀𝙏𝙊𝘿𝙊𝙎 𝘿𝙀 𝙋𝘼𝙂𝙊', 1);
      await crearTexto('💰-𝙈𝙀𝙏𝙊𝘿𝙊𝙎', cPagos, { [g.id]: { deny: ['SendMessages'] } });
      await crearTexto('💵-𝙋𝙍𝙀𝘾𝙄𝙊𝙎', cPagos, { [g.id]: { deny: ['SendMessages'] } });
      await crearTexto('💲-𝘽𝙄𝙉𝘼𝙉𝘾𝙀', cPagos, { [g.id]: { deny: ['SendMessages'] } });
      await crearTexto('🏛️-𝘽𝘼𝙉𝙀𝙎𝘾𝙊', cPagos, { [g.id]: { deny: ['SendMessages'] } });
      await crearTexto('🏦-𝘽𝘽𝙑𝘼', cPagos, { [g.id]: { deny: ['SendMessages'] } });
      await crearTexto('🏪-𝙊𝙓𝙓𝙊', cPagos, { [g.id]: { deny: ['SendMessages'] } });

      // ══════════════ FOTO 2: Tienda + Chat + Cuentas + Armas ══════════════
      const cTienda = await crearCat('𝙏𝙄𝙀𝙉𝘿𝘼', 2);
      await crearTexto('🎟️-𝙏𝙄𝘾𝙆𝙀𝙏𝙎', cTienda, { [g.id]: { deny: ['SendMessages'] } });
      await crearTexto('🚀-𝙐𝙋𝘿𝘼𝙏𝙀𝙎', cTienda, { [g.id]: { deny: ['SendMessages'] } });
      await crearTexto('🕷️-𝙎𝘾𝙍𝙄𝙋𝙏𝙎', cTienda, { [g.id]: { deny: ['SendMessages'] } });
      await crearTexto('🎮-𝘾𝙊𝙉𝙏𝙍𝙊𝙇𝙀𝙎', cTienda, { [g.id]: { deny: ['SendMessages'] } });
      await crearTexto('⚙️-𝘾𝙊𝙉𝙁𝙄𝙂𝙐𝙍𝘼𝘾𝙄𝙊𝙉𝙀𝙎', cTienda, { [g.id]: { deny: ['SendMessages'] } });

      const cChat = await crearCat('𝘾𝙃𝘼𝙏', 3);
      await crearTexto('🌐-𝙂𝙀𝙉𝙀𝙍𝘼𝙇', cChat);
      await crearTexto('💯-𝙑𝙊𝙐𝘾𝙃𝙀𝙎', cChat);
      await crearTexto('🤝-𝙏𝙍𝘼𝘿𝙀𝙎', cChat);

      const cCuentas = await crearCat('𝘾𝙐𝙀𝙉𝙏𝘼𝙎', 4);
      await crearTexto('👁️-𝘾𝙐𝙀𝙉𝙏𝘼𝙎', cCuentas, { [g.id]: { deny: ['SendMessages'] } });
      await crearTexto('🟢-𝙎𝙏𝙊𝘾𝙆', cCuentas, { [g.id]: { deny: ['SendMessages'] } });

      const cArmas = await crearCat('𝘼𝙍𝙈𝘼𝙎', 5);
      await crearTexto('⚔️-𝘼𝙍𝙈𝘼𝙎', cArmas, { [g.id]: { deny: ['SendMessages'] } });
      await crearTexto('🟢-𝙎𝙏𝙊𝘾𝙆', cArmas, { [g.id]: { deny: ['SendMessages'] } });

      // ══════════════ FOTO 3: Millones + Vcs ══════════════
      const cMillones = await crearCat('𝙈𝙄𝙇𝙇𝙊𝙉𝙀𝙎', 6);
      await crearTexto('💸-𝙈𝙄𝙇𝙇𝙊𝙉𝙀𝙎', cMillones, { [g.id]: { deny: ['SendMessages'] } });
      await crearTexto('🟢-𝙎𝙏𝙊𝘾𝙆', cMillones, { [g.id]: { deny: ['SendMessages'] } });

      const cVcs = await crearCat('𝙑𝘾𝙎', 7);
      await crearVoz('🔊-𝙑𝘾-1', cVcs);
      await crearVoz('🔊-𝙑𝘾-2', cVcs);
      await crearVoz('🔒-𝘼𝘾𝘾𝙀𝙎𝙊', cVcs);

      // ══════════════ Soporte/Tickets ══════════════
      const cSoporte = await crearCat('🎫 𝙎𝙊𝙋𝙊𝙍𝙏𝙀', 8);
      const canalTickets = await crearTexto('𝙘𝙧𝙚𝙖𝙧-𝙩𝙞𝙘𝙠𝙚𝙩', cSoporte, { [g.id]: { deny: ['SendMessages'] } });
      await canalTickets.send({
        embeds: [new EmbedBuilder()
          .setColor('#7B2FFD')
          .setTitle('🎫 𝙎𝙄𝙎𝙏𝙀𝙈𝘼 𝘿𝙀 𝙏𝙄𝘾𝙆𝙀𝙏𝙎')
          .setDescription('Presiona el botón de abajo para crear un ticket de soporte.\nNo crees más de uno a la vez.')
          .setFooter({ text: '𝙎𝙀𝘾𝙍𝙀𝙏 𝙂𝘼𝙈𝙀 𝙃𝙐𝘽 · 𝙎𝙊𝙋𝙊𝙍𝙏𝙀' })],
        components: [new ActionRowBuilder().addComponents(
          new ButtonBuilder().setCustomId('create_ticket').setLabel('🎫 𝘾𝙍𝙀𝘼𝙍 𝙏𝙄𝘾𝙆𝙀𝙏').setStyle(ButtonStyle.Primary)
        )]
      });

      // ══════════════ Staff ══════════════
      const cStaff = await crearCat('🔒 𝙎𝙏𝘼𝙁𝙁', 9);
      await crearTexto('𝙨𝙩𝙖𝙛𝙛-𝙘𝙝𝙖𝙩', cStaff, {
        [g.id]: { deny: ['ViewChannel'] },
        [config.staffRoleId]: { allow: ['ViewChannel', 'SendMessages'] }
      });
      await crearTexto('𝙧𝙚𝙜𝙞𝙨𝙩𝙧𝙤𝙨-𝙥𝙧𝙤𝙩𝙚𝙘𝙘𝙞𝙤𝙣', cStaff, {
        [g.id]: { deny: ['ViewChannel'] },
        [config.staffRoleId]: { allow: ['ViewChannel'] }
      });

      await message.reply('✅ **SERVIDOR 𝙎𝙀𝘾𝙍𝙀𝙏 𝙂𝘼𝙈𝙀 𝙃𝙐𝘽 CREADO COMPLETO** 🎉\nEstructura de las 3 fotos lista.').catch(() => {});
      console.log('✅ TODO CREADO EXITOSAMENTE');
      
    } catch (err) {
      console.error('❌ Error:', err);
      await message.reply('❌ Error: ' + err.message).catch(() => {});
    }
  }
});

// ═══════════════════════════ TICKETS ═══════════════════════════
client.on(Events.InteractionCreate, async interaction => {
  if (!interaction.isButton()) return;

  if (interaction.customId === 'create_ticket') {
    const { guild, user } = interaction;
    try {
      const categoriaId = config.ticketCategoryId;
      if (!categoriaId) {
        return interaction.reply({ content: '❌ Falta TICKET_CATEGORY_ID en .env', ephemeral: true });
      }
      const categoria = guild.channels.cache.get(categoriaId);
      if (!categoria) {
        return interaction.reply({ content: '❌ Categoría de tickets no encontrada', ephemeral: true });
      }
      const nombreCanal = `ticket-${user.username.toLowerCase().replace(/\s+/g, '-')}`;
      const existente = guild.channels.cache.find(c => c.name === nombreCanal);
      if (existente) {
        return interaction.reply({ content: `❌ Ya tienes un ticket abierto: ${existente}`, ephemeral: true });
      }
      const rolStaff = await guild.roles.fetch(config.staffRoleId).catch(() => null);
      if (!rolStaff) {
        return interaction.reply({ content: '❌ Rol de Staff no encontrado', ephemeral: true });
      }
      const ticketChannel = await guild.channels.create({
        name: nombreCanal,
        type: ChannelType.GuildText,
        parent: categoria.id,
        permissionOverwrites: [
          { id: guild.id, deny: [PermissionFlagsBits.ViewChannel] },
          { id: user.id, allow: [
            PermissionFlagsBits.ViewChannel,
            PermissionFlagsBits.SendMessages,
            PermissionFlagsBits.ReadMessageHistory
          ]},
          { id: rolStaff.id, allow: [
            PermissionFlagsBits.ViewChannel,
            PermissionFlagsBits.SendMessages,
            PermissionFlagsBits.ReadMessageHistory
          ]}
        ]
      });
      const closeRow = new ActionRowBuilder().addComponents(
        new ButtonBuilder().setCustomId('close_ticket').setLabel('🔒 𝘾𝙀𝙍𝙍𝘼𝙍 𝙏𝙄𝘾𝙆𝙀𝙏').setStyle(ButtonStyle.Danger)
      );
      await ticketChannel.send({
        content: `<@${user.id}> ¡Hola! Bienvenido a tu ticket. Explica tu problema y te atenderemos pronto.\n\n— 𝙎𝙀𝘾𝙍𝙀𝙏 𝙂𝘼𝙈𝙀 𝙃𝙐𝘽`,
        components: [closeRow]
      });
      await interaction.reply({ content: `✅ Ticket creado: ${ticketChannel}`, ephemeral: true });
    } catch (error) {
      console.error('Error ticket:', error);
      await interaction.reply({ content: '❌ Error: ' + error.message, ephemeral: true }).catch(() => {});
    }
  }

  if (interaction.customId === 'close_ticket') {
    await interaction.reply('🔒 Cerrando ticket en 3 segundos...');
    setTimeout(() => interaction.channel.delete().catch(() => {}), 3000);
  }
});

// ═══════════════════════════ AUTO-ROL ═══════════════════════════
client.on(Events.GuildMemberAdd, async member => {
  if (member.user.bot) return;

  try {
    const rolAuto = await member.guild.roles.fetch(config.autoRoleId).catch(() => null);
    if (rolAuto) {
      await member.roles.add(rolAuto).catch(() => {});
      console.log(`✅ Auto-Rol asignado a: ${member.user.tag}`);
    } else {
      console.log(`⚠️ Auto-Rol no encontrado: ${config.autoRoleId}`);
    }
  } catch (err) {
    console.error('Error asignando Auto-Rol:', err.message);
  }

  // Anti-Raid
  const raid = checkRaid(member);
  if (!raid.ok) {
    await member.ban({ reason: `Anti-Raid: ${raid.reason}` }).catch(() => {});
    return logAction(member.guild, `${member.user.tag} BANEADO — ${raid.count} entradas rápidas`);
  }

  // Anti-Alt
  const alt = checkAlt(member);
  if (!alt.ok) {
    await member.timeout(PROT.TIMEOUT_DUR, `Cuenta nueva: ${alt.ageDays} días`).catch(() => {});
    await logAction(member.guild, `${member.user.tag} en espera — cuenta de ${alt.ageDays} días`);
  }
});

// ═══════════════════════════ INICIAR ═══════════════════════════
client.on(Events.ClientReady, () => {
  console.log(`\n✅ BOT CONECTADO — 𝙎𝙀𝘾𝙍𝙀𝙏 𝙂𝘼𝙈𝙀 𝙃𝙐𝘽`);
  console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
  console.log(`🤖 Bot: ${client.user.tag}`);
  console.log(`👑 Dueño 1: ${config.ownerIds[0]}`);
  console.log(`👑 Dueño 2: ${config.ownerIds[1]}`);
  console.log(`🔒 Rol Staff: ${config.staffRoleId}`);
  console.log(`🎁 Auto-Rol: ${config.autoRoleId}`);
  console.log(`🏗️  Comando: !setup-sv`);
  console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n`);
});

client.login(config.token).catch(err => {
  console.error('❌ Error al iniciar:', err.message);
});
