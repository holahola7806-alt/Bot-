// ==================================================
// PARTE DE ESTRUCTURA DEL SERVIDOR / SETUP
// ==================================================

const { ChannelType, PermissionFlagsBits, EmbedBuilder } = require('discord.js');

// TOMAMOS TUS VARIABLES DIRECTAMENTE, SIN REPETIR NADA
const OWNER_ID = process.env.OWNER_ID;
const STAFF_ROLE_ID = process.env.STAFF_ROLE_ID;
const COLOR_CABECERA = 0x7b2cbf;

const ESTRUCTURA = [
  {
    nombre: '━━━━━━━━ 「 𝗜𝗡𝗙𝗢 」 ━━━━━━━━━━',
    canales: [
      { nombre: '📢｜Anuncios', desc: 'Avisos importantes del servidor' },
      { nombre: '📝｜Reglas', desc: 'Normas que debes cumplir' },
      { nombre: '😱｜Ofertas', desc: 'Promociones y descuentos activos' },
      { nombre: '⚡｜Vip', desc: 'Beneficios para miembros VIP' },
      { nombre: '💰｜Métodos-De-Pago', desc: 'Formas de pago aceptadas' },
      { nombre: '😱｜TABLA-ADM', desc: 'Información del equipo administrativo' },
      { nombre: '🌹｜Bienvenida', desc: 'Saludo a nuevos miembros' },
      { nombre: '🥀｜Despedida', desc: 'Despedidas de miembros' },
      { nombre: '🌶️｜Baneados', desc: 'Lista de miembros expulsados' },
    ]
  },
  {
    nombre: '━━━━━━━━ 「 𝗖𝗢𝗠𝗨𝗡𝗜𝗗𝗔𝗗 」 ━━━━━━━━━━',
    canales: [
      { nombre: '💥｜Chatear', desc: 'Charla general con la comunidad' },
      { nombre: '🤖｜Comandos', desc: 'Lista de comandos del bot' },
      { nombre: '🗣️｜Sugerencias', desc: 'Da ideas para mejorar el servidor' },
    ]
  },
  {
    nombre: '━━━━━━━━ 「 𝗦𝗨𝗣𝗢𝗥𝗧𝗘 」 ━━━━━━━━━━',
    canales: [
      { nombre: '🏷️｜Ticket', desc: 'Abre un ticket para ayuda o compras' },
      { nombre: '📜｜Logs-Ticket', desc: 'Historial de tickets cerrados' },
    ]
  },
  {
    nombre: '━━━━━━━━ 「 𝗘𝗩𝗘𝗡𝗧𝗢𝗦 」 ━━━━━━━━━━',
    canales: [
      { nombre: '🎉｜Giveaway', desc: 'Sorteos y regalos del servidor' },
      { nombre: '🔮｜Rw-Boost', desc: 'Recompensas por Boost al servidor' },
      { nombre: '🎀｜Rw-Invites', desc: 'Recompensas por invitar gente nueva' },
    ]
  },
  {
    nombre: '━━━━━━━━ 「 𝗦𝗛𝗢𝗣 𝗚𝗔𝗟𝗔𝗖𝗧𝗜𝗖𝗢 」 ━━━━━━━━━━',
    canales: [
      { nombre: '🧊｜Proff-Ventas', desc: 'Ventas y atención al cliente' },
      { nombre: '🧊｜Proff-Sorteos', desc: 'Sorteos oficiales de la tienda' },
      { nombre: '🧊｜Proff-Invites', desc: 'Recompensas por invitaciones' },
      { nombre: '🧊｜Proff-Boost', desc: 'Beneficios por Boost a la tienda' },
      { nombre: '🧊｜Proff-Tradeos', desc: 'Intercambios autorizados' },
    ]
  },
  {
    nombre: '━━━━━━━━ 「 𝗧𝗢𝗞𝗘𝗡𝗦 」 ━━━━━━━━━━',
    canales: [
      { nombre: '🃏｜Plantilla', desc: 'Plantillas de contenido' },
      { nombre: '🤝｜Partners', desc: 'Servidores aliados' },
      { nombre: '🍀｜Token-500M', desc: 'Contenido Token 500M' },
      { nombre: '🍀｜Token-1B', desc: 'Contenido Token 1B' },
      { nombre: '🍀｜Token-2B', desc: 'Contenido Token 2B' },
      { nombre: '🍀｜Token-PvP', desc: 'Contenido Token PvP' },
      { nombre: '🍀｜Token-Crianza', desc: 'Cría y cuidado de dinos' },
      { nombre: '🍀｜Token-Rewards', desc: 'Recompensas y bonificaciones' },
      { nombre: '🍀｜Token-Personal', desc: 'Contenido personalizado' },
    ]
  },
  {
    nombre: '━━━━━━━━ 「 𝗦𝗧𝗔𝗙𝗙 」 ━━━━━━━━━━',
    canales: [
      { nombre: '🔒｜Admin-Chat', desc: 'Solo para el equipo administrativo', privado: true },
    ]
  }
];

async function ejecutarSetup(guild) {
  console.log(`🔨 Iniciando configuración en: ${guild.name}`);

  // BORRAR TODO RÁPIDO
  const todosCanales = await guild.channels.fetch();
  const promesasBorrar = [];
  for (const [, canal] of todosCanales) {
    if ([ChannelType.GuildText, ChannelType.GuildCategory, ChannelType.GuildVoice].includes(canal.type)) {
      promesasBorrar.push(canal.delete().catch(e => console.log(`⚠️ ${canal.name}: ${e.message}`)));
    }
  }
  await Promise.allSettled(promesasBorrar);
  console.log(`🗑️ Canales borrados`);

  // CREAR ESTRUCTURA
  for (const cat of ESTRUCTURA) {
    const categoria = await guild.channels.create({
      name: cat.nombre,
      type: ChannelType.GuildCategory,
      position: 0
    });

    for (const ch of cat.canales) {
      const permisos = [];

      if (ch.privado) {
        permisos.push(
          { id: guild.roles.everyone.id, deny: [PermissionFlagsBits.ViewChannel] },
          { id: OWNER_ID, allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages, PermissionFlagsBits.ReadMessageHistory] }
        );
        if (STAFF_ROLE_ID) {
          permisos.push({ id: STAFF_ROLE_ID, allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages, PermissionFlagsBits.ReadMessageHistory] });
        }
      }

      const canalCreado = await guild.channels.create({
        name: ch.nombre,
        type: ChannelType.GuildText,
        parent: categoria.id,
        topic: ch.desc,
        permissionOverwrites: permisos
      });

      canalCreado.send({
        embeds: [new EmbedBuilder()
          .setColor(COLOR_CABECERA)
          .setTitle(`📌 ${ch.nombre.replace(/^[^\s]+\s/, '')}`)
          .setDescription(ch.desc)
          .setTimestamp()
        ]
      }).catch(() => {});
    }
  }

  console.log(`✅ SERVIDOR CREADO COMPLETAMENTE`);
  return true;
}

// COMANDO SETUP — usa tus variables directamente
const comandoSetup = {
  name: 'setup',
  description: '⚠️ BORRA TODO y crea la estructura',
  options: [
    {
      type: 5,
      name: 'confirmar',
      description: '¿Seguro que quieres borrar todo?',
      required: true
    }
  ],
  defaultMemberPermissions: PermissionFlagsBits.Administrator
};

// AL USARLO:
// if (interaction.commandName === 'setup') {
//   if (interaction.user.id !== OWNER_ID) return ...;
//   await ejecutarSetup(interaction.guild);
// }
