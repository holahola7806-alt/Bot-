// ==================================================
// PARTE DE ESTRUCTURA DEL SERVIDOR / SETUP
// ==================================================

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

// Ejecutar la creación rápida
async function ejecutarSetup(guild) {
  console.log(`🔨 Iniciando configuración en: ${guild.name}`);

  // BORRAR TODO RÁPIDO — sin esperas innecesarias
  const canales = await guild.channels.fetch();
  const borrarPromesas = [];
  for (const [id, canal] of canales) {
    if ([0, 2, 4].includes(canal.type)) { // Texto, Voz, Categoría
      borrarPromesas.push(
        canal.delete().catch(err => console.log(`⚠️ No se pudo borrar: ${canal.name}`))
      );
    }
  }
  await Promise.allSettled(borrarPromesas);
  console.log(`🗑️ Canales y categorías borrados`);

  // CREAR TODO RÁPIDO
  const COLOR_CABECERA = 0x7b2cbf;
  const ID_DUEÑO = process.env.OWNER_ID || '1463342617856311388';
   const ID_STAFF = process.env.STAFF_ROLE_ID;

  for (const categoria of ESTRUCTURA) {
    const catCreada = await guild.channels.create({
      name: categoria.nombre,
      type: 4, // Categoría
      position: 0
    });

    for (const datosCanal of categoria.canales) {
      const permisos = [];

      if (datosCanal.privado) {
        permisos.push(
          { id: guild.roles.everyone.id, deny: [1024] }, // Quitar ver
          { id: ID_DUEÑO, allow: [1024, 2048, 4096] } // Ver, escribir, leer historial
        );
        if (ID_STAFF) {
          permisos.push({ id: ID_STAFF, allow: [1024, 2048, 4096] });
        }
      }

      const canal = await guild.channels.create({
        name: datosCanal.nombre,
        type: 0, // Texto
        parent: catCreada.id,
        topic: datosCanal.desc,
        permissionOverwrites: permisos
      });

      // Mensaje de bienvenida en cada canal
      canal.send({
        embeds: [{
          color: COLOR_CABECERA,
          title: `📌 ${datosCanal.nombre.replace(/^[^\s]+\s/, '')}`,
          description: datosCanal.desc,
          timestamp: new Date().toISOString()
        }]
      }).catch(() => {});
    }
  }

  console.log(`✅ SERVIDOR CREADO COMPLETAMENTE`);
  return true;
}
