// owo.js — Juego tipo OwO para el bot de la Shop Galáctico
// Se activa desde index.js:  require('./owo').iniciarJuego(client, { ownerId })
// (index.js también llama a guardarDatos() cuando el bot se apaga)
// Prefijo "0w0" (con ceros, para no chocar con el bot OwO)  →  0w0 hunt · 0w0 zoo · 0w0 help
// En el casino (slots, coinflip, blackjack, highlow, snailgarden y lotería) el dueño siempre gana.
// Los datos se guardan en /data/owo.json (volumen de Railway) para que no se borren.
// Necesita "Message Content Intent" activado en el Developer Portal de Discord.

const fs = require('fs');
const path = require('path');
const {
  EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, ComponentType, Events, MessageFlags,
} = require('discord.js');

// ─────────────── AJUSTES ───────────────
const PREFIJO = '0w0';
const ZONA_HORARIA = 'America/Mazatlan';
const COLOR = 0xf5a623;
const M = '💰';                    // símbolo del cowoncy
const SALDO_INICIAL = 1000;
const COSTO_CAZA = 5;
const MAX_APUESTA = 50000;
const COSTO_BOLETO = 100;
const MAX_BOLETOS_DIA = 50;
const BONO_LOTERIA = 2000;
const COSTO_AUTOHUNT = 10;         // cowoncy por animal
const SEG_AUTOHUNT = 12;           // segundos por animal
const MAX_AUTOHUNT = 600;          // animales máximos por viaje
const SIN_PINGS = { parse: [], repliedUser: false };

let OWNER_ID = null;

// ─────────────── DATOS (se guardan en un archivo) ───────────────
const DIR = process.env.RAILWAY_VOLUME_MOUNT_PATH || process.env.DATA_DIR || path.join(__dirname, 'data');
const ARCHIVO = path.join(DIR, 'owo.json');
let db = { usuarios: {}, capturasGlobales: {}, loteria: null };
let datosCargados = false;
let temporizadorGuardado = null;

function cargarDatos() {
  if (datosCargados) return;
  datosCargados = true;
  try {
    fs.mkdirSync(DIR, { recursive: true });
    if (!fs.existsSync(ARCHIVO)) return console.log(`📁 Datos del juego nuevos en ${ARCHIVO}`);
    db = { ...db, ...JSON.parse(fs.readFileSync(ARCHIVO, 'utf8')) };
    console.log(`📁 Datos del juego cargados (${Object.keys(db.usuarios).length} jugadores)`);
  } catch (err) {
    console.error('❌ No pude leer owo.json; lo respaldo y empiezo de cero:', err);
    try { fs.renameSync(ARCHIVO, `${ARCHIVO}.roto-${Date.now()}`); } catch {}
  }
}

function guardar() {
  if (!temporizadorGuardado) temporizadorGuardado = setTimeout(guardarYa, 3000);
}

function guardarYa() {
  clearTimeout(temporizadorGuardado);
  temporizadorGuardado = null;
  try {
    fs.mkdirSync(DIR, { recursive: true });
    fs.writeFileSync(`${ARCHIVO}.tmp`, JSON.stringify(db));
    fs.renameSync(`${ARCHIVO}.tmp`, ARCHIVO);
  } catch (err) {
    console.error('❌ No pude guardar owo.json:', err);
  }
}

// ─────────────── UTILIDADES ───────────────
const fmt = (n) => Math.floor(n).toLocaleString('es-MX');
const rand = (a, b) => a + Math.floor(Math.random() * (b - a + 1));
const elegir = (arr) => arr[Math.floor(Math.random() * arr.length)];
const esperar = (ms) => new Promise((r) => setTimeout(r, ms));
const norm = (s) => String(s || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9]/g, '');

function elegirPeso(pares) {
  const total = pares.reduce((s, [, p]) => s + p, 0);
  let r = Math.random() * total;
  for (const [valor, peso] of pares) { r -= peso; if (r < 0) return valor; }
  return pares[pares.length - 1][0];
}

function barra(actual, max, largo = 8) {
  const llenos = max > 0 ? Math.max(0, Math.min(largo, Math.round((actual / max) * largo))) : 0;
  return '▰'.repeat(llenos) + '▱'.repeat(largo - llenos);
}

const fechaHoy = (d = new Date()) => d.toLocaleDateString('en-CA', { timeZone: ZONA_HORARIA });
const fechaAyer = () => fechaHoy(new Date(Date.now() - 864e5));

function msHastaMedianoche() {
  const partes = new Intl.DateTimeFormat('en-US', {
    timeZone: ZONA_HORARIA, hour: 'numeric', minute: 'numeric', second: 'numeric', hourCycle: 'h23',
  }).formatToParts(new Date());
  const v = (t) => Number(partes.find((p) => p.type === t).value);
  return (86400 - (v('hour') * 3600 + v('minute') * 60 + v('second'))) * 1000;
}

function tiempo(ms) {
  const s = Math.max(1, Math.ceil(ms / 1000));
  const h = Math.floor(s / 3600), m = Math.floor((s % 3600) / 60), seg = s % 60;
  if (h) return `${h}h ${m}m`;
  if (m) return `${m}m ${seg}s`;
  return `${seg}s`;
}

// "100", "2.5k", "1m", "all"  →  número (null si no se entiende)
function leerCantidad(txt, maximo) {
  if (txt === undefined || txt === null || txt === '') return null;
  if (/^(all|todo|todos)$/i.test(txt)) return Math.max(0, Math.floor(maximo));
  const m = String(txt).toLowerCase().replace(/,/g, '').match(/^(\d+(?:\.\d+)?)(k|m)?$/);
  if (!m) return null;
  return Math.floor(parseFloat(m[1]) * (m[2] === 'k' ? 1e3 : m[2] === 'm' ? 1e6 : 1));
}

// ─────────────── ANIMALES ───────────────
const RAREZAS = {
  comun:      { nombre: 'Común',      icono: '⚪', peso: 5500, venta: 1,    esencia: 1,    xp: 1,   hp: 100, atk: 10 },
  pococomun:  { nombre: 'Poco común', icono: '🟢', peso: 2800, venta: 3,    esencia: 3,    xp: 5,   hp: 130, atk: 13 },
  raro:       { nombre: 'Raro',       icono: '🔵', peso: 1200, venta: 10,   esencia: 10,   xp: 10,  hp: 170, atk: 17 },
  epico:      { nombre: 'Épico',      icono: '🟣', peso: 400,  venta: 100,  esencia: 50,   xp: 50,  hp: 220, atk: 22 },
  mitico:     { nombre: 'Mítico',     icono: '🟡', peso: 80,   venta: 500,  esencia: 250,  xp: 200, hp: 300, atk: 30 },
  legendario: { nombre: 'Legendario', icono: '🔴', peso: 20,   venta: 2000, esencia: 1000, xp: 500, hp: 400, atk: 40 },
};
const ORDEN_RAREZAS = Object.keys(RAREZAS);

const LISTA_ANIMALES = {
  comun:      [['perro', '🐶', 'Perro'], ['gato', '🐱', 'Gato'], ['raton', '🐭', 'Ratón'], ['hamster', '🐹', 'Hámster'], ['conejo', '🐰', 'Conejo']],
  pococomun:  [['zorro', '🦊', 'Zorro'], ['oso', '🐻', 'Oso'], ['panda', '🐼', 'Panda'], ['koala', '🐨', 'Koala'], ['gallina', '🐔', 'Gallina']],
  raro:       [['leon', '🦁', 'León'], ['tigre', '🐯', 'Tigre'], ['vaca', '🐮', 'Vaca'], ['cerdo', '🐷', 'Cerdo'], ['rana', '🐸', 'Rana']],
  epico:      [['unicornio', '🦄', 'Unicornio'], ['aguila', '🦅', 'Águila'], ['buho', '🦉', 'Búho'], ['lobo', '🐺', 'Lobo'], ['tiburon', '🦈', 'Tiburón']],
  mitico:     [['dragon', '🐲', 'Dragón'], ['trex', '🦖', 'T-Rex'], ['bronto', '🦕', 'Brontosaurio'], ['pulpo', '🐙', 'Pulpo'], ['escorpion', '🦂', 'Escorpión']],
  legendario: [['wyvern', '🐉', 'Wyvern'], ['mamut', '🦣', 'Mamut'], ['dodo', '🦤', 'Dodo'], ['flamenco', '🦩', 'Flamenco'], ['pavorreal', '🦚', 'Pavorreal']],
};

const ANIMALES = {};
for (const [rareza, lista] of Object.entries(LISTA_ANIMALES)) {
  for (const [id, emoji, nombre] of lista) ANIMALES[id] = { id, emoji, nombre, rareza };
}
const TOTAL_ANIMALES = Object.keys(ANIMALES).length;

function buscarAnimal(txt) {
  if (!txt) return null;
  const n = norm(txt);
  return Object.values(ANIMALES).find(
    (a) => a.id === n || norm(a.nombre) === n || a.emoji === String(txt).trim() || (n.length >= 4 && norm(a.nombre).startsWith(n)),
  ) || null;
}

function buscarRareza(txt) {
  const n = norm(txt);
  const quitarPlural = n.replace(/es$/, '').replace(/s$/, '');
  return ORDEN_RAREZAS.find((r) => r === n || r === quitarPlural || norm(RAREZAS[r].nombre) === n) || null;
}

function animalAleatorio(factor = 1) {
  const pesos = ORDEN_RAREZAS.map((r) => [r, ['comun', 'pococomun'].includes(r) ? RAREZAS[r].peso : RAREZAS[r].peso * factor]);
  const rareza = elegirPeso(pesos);
  const [id] = elegir(LISTA_ANIMALES[rareza]);
  return ANIMALES[id];
}

// ─────────────── ARMAS ───────────────
const TIPOS_ARMA = {
  espada: { nombre: 'Espada',  emoji: '⚔️', stat: 'atk' },
  arco:   { nombre: 'Arco',    emoji: '🏹', stat: 'atk' },
  hacha:  { nombre: 'Hacha',   emoji: '🪓', stat: 'atk' },
  escudo: { nombre: 'Escudo',  emoji: '🛡️', stat: 'hp' },
  baculo: { nombre: 'Báculo',  emoji: '🪄', stat: 'hp' },
};
const RAREZAS_ARMA = {
  comun:      { peso: 5000, rango: [5, 10],  fragmentos: 5 },
  pococomun:  { peso: 2800, rango: [10, 15], fragmentos: 10 },
  raro:       { peso: 1500, rango: [15, 20], fragmentos: 25 },
  epico:      { peso: 550,  rango: [20, 30], fragmentos: 60 },
  mitico:     { peso: 130,  rango: [30, 40], fragmentos: 150 },
  legendario: { peso: 20,   rango: [40, 50], fragmentos: 400 },
};

function crearArma(u) {
  const rareza = elegirPeso(Object.entries(RAREZAS_ARMA).map(([r, d]) => [r, d.peso]));
  const arma = {
    id: u.sigArma++, tipo: elegir(Object.keys(TIPOS_ARMA)), rareza,
    bono: rand(...RAREZAS_ARMA[rareza].rango), mejoras: 0, en: null,
  };
  u.armas.push(arma);
  return arma;
}

function textoArma(w) {
  const t = TIPOS_ARMA[w.tipo];
  return `\`#${w.id}\` ${t.emoji} **${t.nombre}** ${RAREZAS[w.rareza].icono} +${w.bono}% ${t.stat === 'atk' ? 'ATK' : 'HP'}`
    + (w.en ? ` · en ${ANIMALES[w.en].emoji}` : '');
}

function buscarArma(u, txt) {
  const id = parseInt(String(txt || '').replace('#', ''), 10);
  return u.armas.find((w) => w.id === id) || null;
}

// ─────────────── TIENDA ───────────────
const TIENDA = {
  anillo:  { num: 1, nombre: 'Anillo de boda',        emoji: '💍', precio: 5000, desc: 'Lo necesitas para casarte (0w0 marry).' },
  lootbox: { num: 2, nombre: 'Lootbox',               emoji: '🎁', precio: 500,  desc: 'Ábrela con 0w0 lootbox.' },
  crate:   { num: 3, nombre: 'Caja de armas',         emoji: '🧰', precio: 1500, desc: 'Ábrela con 0w0 crate.' },
  amuleto: { num: 4, nombre: 'Amuleto de la suerte',  emoji: '🍀', precio: 2500, desc: '1 hora con más suerte al cazar (se activa al comprarlo).' },
};

function buscarItem(txt) {
  const n = norm(txt);
  return Object.entries(TIENDA).find(([k, it]) => k === n || String(it.num) === n || norm(it.nombre) === n || norm(it.nombre).startsWith(n)) || null;
}

// ─────────────── JUGADORES ───────────────
const baseUsuario = () => ({
  cash: SALDO_INICIAL, xp: 0, zoo: {}, capturados: 0, inv: {}, armas: [], sigArma: 1,
  equipo: [], xpAnimal: {}, vistos: {}, esencia: 0, fragmentos: 0, suerte: 0, galletas: 0,
  racha: 0, ultimoDaily: null, pareja: null, parejaDesde: null, misiones: null,
  dia: {}, autohunt: null, amuletoHasta: 0, victorias: 0, derrotas: 0,
});

function jugador(id) {
  const u = db.usuarios[id] || (db.usuarios[id] = baseUsuario());
  for (const [k, v] of Object.entries(baseUsuario())) if (u[k] === undefined) u[k] = v;
  if (u.dia.fecha !== fechaHoy()) u.dia = { fecha: fechaHoy(), galleta: false, boletos: 0 };
  return u;
}

const nivelDe = (xp) => Math.floor(Math.sqrt(xp / 100)) + 1;
const xpParaNivel = (n) => 100 * (n - 1) ** 2;
const nivelAnimal = (u, id) => Math.min(100, Math.floor(Math.sqrt((u.xpAnimal[id] || 0) / 25)) + 1);

function agregarAnimal(u, id, n = 1) {
  u.zoo[id] = (u.zoo[id] || 0) + n;
  u.vistos[id] = true;
  u.capturados += n;
  db.capturasGlobales[id] = (db.capturasGlobales[id] || 0) + n;
}

function factorSuerte(u) {
  let f = Math.min(2, Math.max(0.8, 1 + u.suerte * 0.02));
  if (u.amuletoHasta > Date.now()) f *= 1.5;
  return f;
}

// ─────────────── MISIONES DIARIAS ───────────────
const TIPOS_MISION = {
  cazar:   { texto: (n) => `Caza ${n} veces`,                  rango: [10, 25], premio: [300, 600] },
  ganar:   { texto: (n) => `Gana ${n} batallas`,               rango: [2, 5],   premio: [400, 800] },
  casino:  { texto: (n) => `Juega ${n} veces en el casino`,    rango: [5, 15],  premio: [300, 600] },
  vender:  { texto: (n) => `Vende o sacrifica ${n} animales`,  rango: [10, 40], premio: [300, 600] },
  galleta: { texto: () => 'Regala 1 galleta (0w0 cookie)',     rango: [1, 1],   premio: [200, 300] },
  rezar:   { texto: (n) => `Reza o maldice ${n} veces`,        rango: [2, 3],   premio: [250, 400] },
};

function misiones(u) {
  if (!u.misiones || u.misiones.fecha !== fechaHoy()) {
    const tipos = Object.keys(TIPOS_MISION).sort(() => Math.random() - 0.5).slice(0, 3);
    u.misiones = {
      fecha: fechaHoy(),
      lista: tipos.map((tipo) => ({
        tipo, meta: rand(...TIPOS_MISION[tipo].rango), progreso: 0,
        premio: Math.round(rand(...TIPOS_MISION[tipo].premio) / 10) * 10, hecha: false,
      })),
    };
  }
  return u.misiones.lista;
}

function avanzar(ctx, tipo, n = 1) {
  for (const m of misiones(ctx.u)) {
    if (m.tipo !== tipo || m.hecha) continue;
    m.progreso = Math.min(m.meta, m.progreso + n);
    if (m.progreso >= m.meta) {
      m.hecha = true;
      ctx.u.cash += m.premio;
      ctx.avisos.push(`📜 | **${ctx.nombre}** completó la misión *${TIPOS_MISION[tipo].texto(m.meta)}* y ganó **${fmt(m.premio)}** ${M}`);
    }
  }
}

// ─────────────── CONTEXTO, MENCIONES Y ENFRIAMIENTOS ───────────────
function crearCtx(msg, cmd) {
  const responder = (c) => {
    const datos = typeof c === 'string' ? { content: c, allowedMentions: SIN_PINGS } : { allowedMentions: SIN_PINGS, ...c };
    return msg.reply(datos).catch(() => msg.channel.send(datos));
  };
  return {
    msg, cmd, id: msg.author.id, u: jugador(msg.author.id), avisos: [], responder,
    nombre: msg.member?.displayName || msg.author.globalName || msg.author.username,
  };
}

async function mencionados(ctx, args) {
  const res = [];
  for (const a of args) {
    const m = a.match(/^<@!?(\d{15,21})>$/);
    if (!m) continue;
    const user = ctx.msg.mentions.users.get(m[1]) || await ctx.msg.client.users.fetch(m[1]).catch(() => null);
    if (user) {
      res.push({
        id: user.id, user,
        nombre: ctx.msg.mentions.members?.get(user.id)?.displayName || user.globalName || user.username,
      });
    }
  }
  return res;
}

// Cambia <@id> por el nombre y <:emoji:id> por :emoji: (para memes y owoify)
function limpiarTexto(ctx, texto) {
  return texto
    .replace(/<@!?(\d+)>/g, (_, id) => {
      const m = ctx.msg.mentions.members?.get(id);
      const u = ctx.msg.mentions.users.get(id);
      return m?.displayName || u?.globalName || u?.username || 'alguien';
    })
    .replace(/<a?:(\w+):\d+>/g, ':$1:');
}

const enfriamientos = new Map();
function enfriamiento(ctx, clave, seg) {
  const k = `${ctx.id}:${clave}`;
  const ahora = Date.now();
  const fin = enfriamientos.get(k) || 0;
  if (fin > ahora) {
    ctx.responder(`⏳ | **${ctx.nombre}**, espera **${tiempo(fin - ahora)}** para volver a usar esto.`);
    return true;
  }
  enfriamientos.set(k, ahora + seg * 1000);
  return false;
}

function leerApuesta(ctx, txt) {
  const n = leerCantidad(txt, Math.min(ctx.u.cash, MAX_APUESTA));
  if (n === null) {
    ctx.responder(`🎲 | Escribe cuánto quieres apostar. Ejemplo: \`0w0 ${ctx.cmd} 100\``);
    return null;
  }
  if (n < 1) { ctx.responder(`🚫 | **${ctx.nombre}**, la apuesta mínima es 1 ${M}.`); return null; }
  if (n > MAX_APUESTA) { ctx.responder(`🚫 | La apuesta máxima es **${fmt(MAX_APUESTA)}** ${M}.`); return null; }
  if (n > ctx.u.cash) { ctx.responder(`🚫 | **${ctx.nombre}**, no tienes suficiente cowoncy (tienes ${fmt(ctx.u.cash)} ${M}).`); return null; }
  return n;
}

const boton = (id, etiqueta, emoji, estilo, desactivado = false) => {
  const b = new ButtonBuilder().setCustomId(id).setLabel(etiqueta).setStyle(estilo).setDisabled(desactivado);
  if (emoji) b.setEmoji(emoji);
  return b;
};

// ─────────────── COMANDOS ───────────────
const COMANDOS = {};
const comando = (nombre, def) => { COMANDOS[nombre] = { nombre, alias: [], ...def }; };

const CATEGORIAS = {
  mascotas: '🐾 Mascotas',
  economia: '💰 Economía',
  casino:   '🎰 Casino',
  batallas: '⚔️ Batallas',
  social:   '💞 Social',
  memes:    '🖼️ Memes',
};

// ═══════════ 🐾 MASCOTAS ═══════════
comando('hunt', {
  alias: ['h', 'cazar'], cat: 'mascotas', uso: '0w0 hunt',
  desc: `Sal a cazar animales. Cuesta ${COSTO_CAZA} ${M} y se puede usar cada 15 segundos.`,
  run: async (ctx) => {
    const u = ctx.u;
    if (u.cash < COSTO_CAZA) {
      return ctx.responder(`🚫 | **${ctx.nombre}**, necesitas ${COSTO_CAZA} ${M} para cazar. Cobra tu \`0w0 daily\`.`);
    }
    if (enfriamiento(ctx, 'hunt', 15)) return;
    u.cash -= COSTO_CAZA;

    const cantidad = 1 + (Math.random() < 0.3 ? 1 : 0) + (Math.random() < 0.1 ? 1 : 0);
    const f = factorSuerte(u);
    const atrapados = [];
    for (let i = 0; i < cantidad; i++) {
      const a = animalAleatorio(f);
      agregarAnimal(u, a.id);
      atrapados.push(a);
    }
    const xp = atrapados.reduce((s, a) => s + RAREZAS[a.rareza].xp, 0) + 5;
    u.xp += xp;
    for (const id of u.equipo) u.xpAnimal[id] = (u.xpAnimal[id] || 0) + xp;

    let extra = '';
    if (Math.random() < 0.04) { u.inv.lootbox = (u.inv.lootbox || 0) + 1; extra += '\n🎁 | ¡También encontraste una **lootbox**!'; }
    if (Math.random() < 0.02) { u.inv.crate = (u.inv.crate || 0) + 1; extra += '\n🧰 | ¡También encontraste una **caja de armas**!'; }
    if (u.amuletoHasta > Date.now()) extra += '\n🍀 | Tu amuleto de la suerte está activo.';
    avanzar(ctx, 'cazar');

    const detalle = atrapados.map((a) => `${a.emoji} ${a.nombre} ${RAREZAS[a.rareza].icono}`).join(' · ');
    return ctx.responder(
      `🌱 | **${ctx.nombre}** gastó ${COSTO_CAZA} ${M} y cazó: ${atrapados.map((a) => a.emoji).join(' ')}\n`
      + `🐾 | ${detalle} · **+${xp} xp**${extra}`,
    );
  },
});

comando('zoo', {
  alias: ['z', 'zoologico'], cat: 'mascotas', uso: '0w0 zoo [@usuario]',
  desc: 'Muestra la colección de animales, separada por rareza.',
  run: async (ctx, args) => {
    const [otro] = await mencionados(ctx, args);
    const u = otro ? jugador(otro.id) : ctx.u;
    const nombre = otro ? otro.nombre : ctx.nombre;

    let total = 0, puntos = 0;
    const lineas = ORDEN_RAREZAS.map((r) => {
      const tiene = LISTA_ANIMALES[r].filter(([id]) => u.zoo[id] > 0);
      for (const [id] of tiene) { total += u.zoo[id]; puntos += u.zoo[id] * RAREZAS[r].xp; }
      const txt = tiene.map(([id, emoji]) => `${emoji}×${fmt(u.zoo[id])}`).join('  ') || '—';
      return `${RAREZAS[r].icono} **${RAREZAS[r].nombre}:** ${txt}`;
    });

    const embed = new EmbedBuilder()
      .setColor(COLOR)
      .setTitle(`🏞️ Zoológico de ${nombre}`)
      .setDescription(lineas.join('\n'))
      .setFooter({ text: `Animales: ${fmt(total)} · Puntos de zoo: ${fmt(puntos)}` });
    return ctx.responder({ embeds: [embed] });
  },
});

comando('inventory', {
  alias: ['inv', 'inventario'], cat: 'mascotas', uso: '0w0 inv',
  desc: 'Muestra tus objetos, recursos y armas.',
  run: async (ctx) => {
    const u = ctx.u;
    const objetos = [
      `🎁 Lootbox ×${u.inv.lootbox || 0}`,
      `🧰 Caja de armas ×${u.inv.crate || 0}`,
      `💍 Anillo ×${u.inv.anillo || 0}`,
      u.amuletoHasta > Date.now() ? `🍀 Amuleto activo (${tiempo(u.amuletoHasta - Date.now())})` : '🍀 Amuleto: no activo',
    ].join('\n');

    const armas = [...u.armas].reverse();
    let txtArmas = armas.slice(0, 15).map(textoArma).join('\n') || 'No tienes armas. Abre una caja con `0w0 crate`.';
    if (armas.length > 15) txtArmas += `\n…y ${armas.length - 15} más`;

    const embed = new EmbedBuilder()
      .setColor(COLOR)
      .setTitle(`🎒 Inventario de ${ctx.nombre}`)
      .addFields(
        { name: 'Objetos', value: objetos, inline: true },
        { name: 'Recursos', value: `${M} ${fmt(u.cash)} cowoncy\n✨ ${fmt(u.esencia)} esencia\n🔩 ${fmt(u.fragmentos)} fragmentos`, inline: true },
        { name: `Armas (${u.armas.length})`, value: txtArmas.slice(0, 1024) },
      );
    return ctx.responder({ embeds: [embed] });
  },
});

comando('lootbox', {
  alias: ['lb'], cat: 'mascotas', uso: '0w0 lootbox [cantidad|all]',
  desc: 'Abre lootboxes: dan cowoncy y a veces cajas de armas.',
  run: async (ctx, args) => {
    const u = ctx.u;
    const tiene = u.inv.lootbox || 0;
    if (!tiene) return ctx.responder(`🎁 | **${ctx.nombre}**, no tienes lootboxes. Cómpralas con \`0w0 buy lootbox\`.`);
    const n = Math.min(tiene, leerCantidad(args[0] ?? '1', tiene) ?? 1);
    if (n < 1) return ctx.responder('🚫 | Cantidad no válida.');
    let dinero = 0, cajas = 0;
    for (let i = 0; i < n; i++) {
      dinero += rand(50, 250);
      if (Math.random() < 0.2) cajas++;
    }
    u.inv.lootbox -= n;
    u.cash += dinero;
    u.inv.crate = (u.inv.crate || 0) + cajas;
    return ctx.responder(
      `🎁 | **${ctx.nombre}** abrió **${n}** lootbox${n > 1 ? 'es' : ''} y ganó **${fmt(dinero)}** ${M}`
      + (cajas ? ` y **${cajas}** 🧰 caja${cajas > 1 ? 's' : ''} de armas` : '') + '.',
    );
  },
});

comando('crate', {
  alias: ['wc', 'caja', 'weaponcrate'], cat: 'mascotas', uso: '0w0 crate [cantidad|all]',
  desc: 'Abre cajas de armas para equipar a tus mascotas.',
  run: async (ctx, args) => {
    const u = ctx.u;
    const tiene = u.inv.crate || 0;
    if (!tiene) return ctx.responder(`🧰 | **${ctx.nombre}**, no tienes cajas de armas. Cómpralas con \`0w0 buy crate\`.`);
    const n = Math.min(tiene, leerCantidad(args[0] ?? '1', tiene) ?? 1);
    if (n < 1) return ctx.responder('🚫 | Cantidad no válida.');
    u.inv.crate -= n;
    const nuevas = Array.from({ length: n }, () => crearArma(u));
    let lista = nuevas.slice(0, 10).map(textoArma).join('\n');
    if (nuevas.length > 10) lista += `\n…y ${nuevas.length - 10} más (míralas en \`0w0 inv\`)`;
    return ctx.responder(`🧰 | **${ctx.nombre}** abrió **${n}** caja${n > 1 ? 's' : ''} y obtuvo:\n${lista}\n> Equípalas con \`0w0 equip <#arma> <animal>\``);
  },
});

comando('owodex', {
  alias: ['dex', 'od'], cat: 'mascotas', uso: '0w0 owodex [animal]',
  desc: 'Catálogo de todos los animales y cuántos se han cazado en total.',
  run: async (ctx, args) => {
    const u = ctx.u;
    if (args[0]) {
      const a = buscarAnimal(args.join(' '));
      if (!a) return ctx.responder('❓ | No encontré ese animal. Mira la lista con `0w0 owodex`.');
      const r = RAREZAS[a.rareza];
      const embed = new EmbedBuilder()
        .setColor(COLOR)
        .setTitle(`${a.emoji} ${a.nombre}`)
        .addFields(
          { name: 'Rareza', value: `${r.icono} ${r.nombre}`, inline: true },
          { name: 'Venta', value: `${fmt(r.venta)} ${M}`, inline: true },
          { name: 'Sacrificio', value: `${fmt(r.esencia)} ✨`, inline: true },
          { name: 'Stats base', value: `❤️ ${r.hp} · ⚔️ ${r.atk}`, inline: true },
          { name: 'Tienes', value: fmt(u.zoo[a.id] || 0), inline: true },
          { name: 'Cazados en total', value: fmt(db.capturasGlobales[a.id] || 0), inline: true },
        );
      return ctx.responder({ embeds: [embed] });
    }
    const descubiertos = Object.keys(ANIMALES).filter((id) => u.vistos[id]).length;
    const embed = new EmbedBuilder()
      .setColor(COLOR)
      .setTitle('📖 OwODex')
      .setDescription('✅ = ya lo cazaste · el número es cuántos se han cazado en total en el servidor')
      .addFields(ORDEN_RAREZAS.map((r) => ({
        name: `${RAREZAS[r].icono} ${RAREZAS[r].nombre}`,
        value: LISTA_ANIMALES[r].map(([id, emoji, nombre]) => `${emoji} ${nombre}: ${fmt(db.capturasGlobales[id] || 0)}${u.vistos[id] ? ' ✅' : ''}`).join('\n'),
        inline: true,
      })))
      .setFooter({ text: `Tienes ${descubiertos}/${TOTAL_ANIMALES} animales distintos` });
    return ctx.responder({ embeds: [embed] });
  },
});

function venderOSacrificar(modo) {
  return async (ctx, args) => {
    const u = ctx.u;
    const vender = modo === 'vender';
    const verbo = vender ? 'sell' : 'sacrifice';
    if (!args[0]) {
      return ctx.responder(`📝 | Uso: \`0w0 ${verbo} <animal|rareza|all> [cantidad]\`\nEjemplos: \`0w0 ${verbo} perro\` · \`0w0 ${verbo} comun\` · \`0w0 ${verbo} all\``);
    }
    const disponible = (id) => Math.max(0, (u.zoo[id] || 0) - (u.equipo.includes(id) ? 1 : 0));
    const todo = /^(all|todo|todos)$/i.test(args[0]);
    const rareza = todo ? null : buscarRareza(args[0]);
    const animal = todo || rareza ? null : buscarAnimal(args[0]);

    let lista = [];
    if (animal) {
      const max = disponible(animal.id);
      const n = args[1] ? leerCantidad(args[1], max) : max;
      if (n === null || n < 1) return ctx.responder('🚫 | Cantidad no válida.');
      lista = [[animal.id, Math.min(n, max)]];
    } else if (rareza || todo) {
      lista = Object.values(ANIMALES).filter((a) => todo || a.rareza === rareza).map((a) => [a.id, disponible(a.id)]);
    } else {
      return ctx.responder('❓ | No encontré ese animal o rareza. Mira la lista con `0w0 owodex`.');
    }
    lista = lista.filter(([, n]) => n > 0);
    if (!lista.length) {
      return ctx.responder(`🚫 | **${ctx.nombre}**, no tienes animales para ${vender ? 'vender' : 'sacrificar'} ahí. (Siempre te guardo 1 de cada animal de tu equipo.)`);
    }

    let ganancia = 0, cantidad = 0;
    for (const [id, n] of lista) {
      u.zoo[id] -= n;
      if (u.zoo[id] <= 0) delete u.zoo[id];
      const r = RAREZAS[ANIMALES[id].rareza];
      ganancia += n * (vender ? r.venta : r.esencia);
      cantidad += n;
    }
    if (vender) u.cash += ganancia; else u.esencia += ganancia;
    avanzar(ctx, 'vender', cantidad);

    let detalle = lista.map(([id, n]) => `${ANIMALES[id].emoji}×${n}`).join(' ');
    if (detalle.length > 1500) detalle = `${detalle.slice(0, 1500)}…`;
    return ctx.responder(vender
      ? `💸 | **${ctx.nombre}** vendió ${detalle} y ganó **${fmt(ganancia)}** ${M}`
      : `🔪 | **${ctx.nombre}** sacrificó ${detalle} y obtuvo **${fmt(ganancia)}** ✨ de esencia\n> Úsala con \`0w0 train <animal> <esencia>\``);
  };
}

comando('sell', {
  alias: ['vender'], cat: 'mascotas', uso: '0w0 sell <animal|rareza|all> [cantidad]',
  desc: 'Vende animales por cowoncy. Siempre se guarda 1 de cada animal de tu equipo.',
  run: venderOSacrificar('vender'),
});

comando('sacrifice', {
  alias: ['sac', 'sacrificar'], cat: 'mascotas', uso: '0w0 sacrifice <animal|rareza|all> [cantidad]',
  desc: 'Sacrifica animales a cambio de esencia (sirve para entrenar a tu equipo).',
  run: venderOSacrificar('sacrificar'),
});

comando('autohunt', {
  alias: ['ah', 'huntbot'], cat: 'mascotas', uso: '0w0 autohunt [cowoncy]',
  desc: `Manda a tu robot a cazar por ti. Cada ${COSTO_AUTOHUNT} ${M} = 1 animal y tarda ${SEG_AUTOHUNT}s por animal.`,
  run: async (ctx, args) => {
    const u = ctx.u;
    const ah = u.autohunt;
    if (ah) {
      if (Date.now() < ah.fin) {
        return ctx.responder(`🤖 | El robot de **${ctx.nombre}** sigue cazando **${ah.cantidad}** animales. Vuelve en **${tiempo(ah.fin - Date.now())}**.`);
      }
      const conteo = {};
      let xp = 0;
      for (let i = 0; i < ah.cantidad; i++) {
        const a = animalAleatorio(1);
        agregarAnimal(u, a.id);
        conteo[a.id] = (conteo[a.id] || 0) + 1;
        xp += RAREZAS[a.rareza].xp;
      }
      u.xp += xp;
      u.autohunt = null;
      const detalle = ORDEN_RAREZAS.map((r) => {
        const t = LISTA_ANIMALES[r].filter(([id]) => conteo[id]).map(([id, emoji]) => `${emoji}×${conteo[id]}`).join(' ');
        return t ? `${RAREZAS[r].icono} ${t}` : null;
      }).filter(Boolean).join('\n');
      return ctx.responder(`🤖 | ¡El robot de **${ctx.nombre}** regresó con **${ah.cantidad}** animales! **+${fmt(xp)} xp**\n${detalle}`);
    }

    if (!args[0]) {
      return ctx.responder(`🤖 | Uso: \`0w0 autohunt <cowoncy>\`. Cada ${COSTO_AUTOHUNT} ${M} = 1 animal, tarda ${SEG_AUTOHUNT}s por animal (máximo ${MAX_AUTOHUNT}).`);
    }
    const gasto = leerCantidad(args[0], u.cash);
    if (gasto === null) return ctx.responder('🚫 | Escribe cuánto cowoncy le das al robot. Ejemplo: `0w0 autohunt 500`');
    const cantidad = Math.min(MAX_AUTOHUNT, Math.floor(gasto / COSTO_AUTOHUNT));
    if (cantidad < 1) return ctx.responder(`🚫 | Mínimo ${COSTO_AUTOHUNT} ${M}.`);
    const costo = cantidad * COSTO_AUTOHUNT;
    if (costo > u.cash) return ctx.responder(`🚫 | **${ctx.nombre}**, no tienes suficiente cowoncy (tienes ${fmt(u.cash)} ${M}).`);
    u.cash -= costo;
    u.autohunt = { cantidad, fin: Date.now() + cantidad * SEG_AUTOHUNT * 1000 };
    return ctx.responder(`🤖 | **${ctx.nombre}** pagó **${fmt(costo)}** ${M}. Su robot salió a cazar **${cantidad}** animales y vuelve en **${tiempo(cantidad * SEG_AUTOHUNT * 1000)}**.\n> Cuando termine, escribe \`0w0 autohunt\` para recoger.`);
  },
});

comando('train', {
  alias: ['entrenar'], cat: 'batallas', uso: '0w0 train <animal> <esencia|all>',
  desc: 'Usa esencia para darle experiencia a un animal de tu equipo (1 ✨ = 5 xp).',
  run: async (ctx, args) => {
    const u = ctx.u;
    const a = buscarAnimal(args[0]);
    if (!a || !u.equipo.includes(a.id)) return ctx.responder('🚫 | Ese animal no está en tu equipo. Uso: `0w0 train <animal> <esencia>`');
    const n = leerCantidad(args[1] ?? 'all', u.esencia);
    if (!n || n < 1) return ctx.responder(`🚫 | No tienes esencia. Consíguela con \`0w0 sacrifice\`.`);
    if (n > u.esencia) return ctx.responder(`🚫 | Solo tienes **${fmt(u.esencia)}** ✨.`);
    const antes = nivelAnimal(u, a.id);
    u.esencia -= n;
    u.xpAnimal[a.id] = (u.xpAnimal[a.id] || 0) + n * 5;
    const despues = nivelAnimal(u, a.id);
    return ctx.responder(`✨ | **${ctx.nombre}** entrenó a ${a.emoji} **${a.nombre}** con ${fmt(n)} de esencia (+${fmt(n * 5)} xp).`
      + (despues > antes ? ` ⬆️ ¡Subió a **Lv.${despues}**!` : ` Está en **Lv.${despues}**.`));
  },
});

// ═══════════ 💰 ECONOMÍA ═══════════
comando('cowoncy', {
  alias: ['cash', 'money', 'dinero', 'bal'], cat: 'economia', uso: '0w0 cash [@usuario]',
  desc: 'Muestra cuánto cowoncy tienes.',
  run: async (ctx, args) => {
    const [otro] = await mencionados(ctx, args);
    const u = otro ? jugador(otro.id) : ctx.u;
    return ctx.responder(`${M} | **${otro ? otro.nombre : ctx.nombre}** tiene **${fmt(u.cash)} cowoncy**`);
  },
});

comando('daily', {
  alias: ['diario'], cat: 'economia', uso: '0w0 daily',
  desc: 'Cobra tu recompensa diaria. Si cobras días seguidos, ganas más.',
  run: async (ctx) => {
    const u = ctx.u;
    if (u.ultimoDaily === fechaHoy()) {
      return ctx.responder(`⏳ | **${ctx.nombre}**, ya cobraste tu daily. El siguiente está listo en **${tiempo(msHastaMedianoche())}**.`);
    }
    u.racha = u.ultimoDaily === fechaAyer() ? u.racha + 1 : 1;
    u.ultimoDaily = fechaHoy();
    const premio = 500 + Math.min(u.racha - 1, 30) * 50;
    u.cash += premio;
    let extra = '';
    if (Math.random() < 0.25) { u.inv.lootbox = (u.inv.lootbox || 0) + 1; extra = '\n🎁 | ¡Y te tocó una **lootbox**!'; }
    return ctx.responder(`${M} | **${ctx.nombre}** cobró su daily de **${fmt(premio)}** cowoncy. 🔥 Racha: **${u.racha}** día${u.racha > 1 ? 's' : ''}${extra}\n⏱️ | El siguiente en ${tiempo(msHastaMedianoche())}`);
  },
});

comando('quest', {
  alias: ['q', 'misiones', 'mision'], cat: 'economia', uso: '0w0 quest',
  desc: 'Muestra tus 3 misiones del día. Al completarlas ganas cowoncy.',
  run: async (ctx) => {
    const lineas = misiones(ctx.u).map((m) => {
      const t = TIPOS_MISION[m.tipo].texto(m.meta);
      return m.hecha
        ? `✅ ~~${t}~~ · ${fmt(m.premio)} ${M}`
        : `📌 **${t}** · ${fmt(m.premio)} ${M}\n${barra(m.progreso, m.meta, 10)} ${m.progreso}/${m.meta}`;
    });
    const embed = new EmbedBuilder()
      .setColor(COLOR)
      .setTitle(`📜 Misiones de ${ctx.nombre}`)
      .setDescription(lineas.join('\n\n'))
      .setFooter({ text: `Nuevas misiones en ${tiempo(msHastaMedianoche())}` });
    return ctx.responder({ embeds: [embed] });
  },
});

comando('checklist', {
  alias: ['cl', 'pendientes'], cat: 'economia', uso: '0w0 checklist',
  desc: 'Revisa qué actividades diarias te faltan.',
  run: async (ctx) => {
    const u = ctx.u;
    const ok = (b) => (b ? '✅' : '⬜');
    const hechas = misiones(u).filter((m) => m.hecha).length;
    const rezo = (enfriamientos.get(`${ctx.id}:pray`) || 0) - Date.now();
    const ah = u.autohunt;
    const lineas = [
      `${ok(u.ultimoDaily === fechaHoy())} Daily (\`0w0 daily\`)`,
      `${ok(u.dia.galleta)} Regalar una galleta (\`0w0 cookie @alguien\`)`,
      `${ok(hechas === 3)} Misiones ${hechas}/3 (\`0w0 quest\`)`,
      `${ok(u.dia.boletos > 0)} Boleto de lotería (\`0w0 lottery buy\`)`,
      rezo > 0 ? `⏳ Rezar/maldecir disponible en ${tiempo(rezo)}` : '⬜ Rezar o maldecir (`0w0 pray`)',
      !ah ? '⬜ Autohunt (`0w0 autohunt`)' : Date.now() >= ah.fin ? '🎉 ¡Tu robot ya volvió! (`0w0 autohunt`)' : `⏳ Robot cazando, vuelve en ${tiempo(ah.fin - Date.now())}`,
    ];
    const embed = new EmbedBuilder().setColor(COLOR).setTitle(`☑️ Pendientes de ${ctx.nombre}`).setDescription(lineas.join('\n'));
    return ctx.responder({ embeds: [embed] });
  },
});

comando('shop', {
  alias: ['tienda'], cat: 'economia', uso: '0w0 shop',
  desc: 'Muestra la tienda del juego.',
  run: async (ctx) => {
    const embed = new EmbedBuilder()
      .setColor(COLOR)
      .setTitle('🏪 Tienda')
      .setDescription(Object.values(TIENDA).map((it) => `\`${it.num}\` ${it.emoji} **${it.nombre}** — ${fmt(it.precio)} ${M}\n> ${it.desc}`).join('\n'))
      .setFooter({ text: 'Compra con: 0w0 buy <número o nombre> [cantidad]' });
    return ctx.responder({ embeds: [embed] });
  },
});

comando('buy', {
  alias: ['comprar'], cat: 'economia', uso: '0w0 buy <número|nombre> [cantidad]',
  desc: 'Compra algo de la tienda. Ejemplo: 0w0 buy anillo',
  run: async (ctx, args) => {
    const u = ctx.u;
    const encontrado = args[0] && buscarItem(args[0]);
    if (!encontrado) return ctx.responder('❓ | No encontré ese artículo. Mira la tienda con `0w0 shop`.');
    const [clave, it] = encontrado;
    const n = leerCantidad(args[1] ?? '1', Math.floor(u.cash / it.precio));
    if (n === null || n < 1) return ctx.responder(`🚫 | **${ctx.nombre}**, no te alcanza para ${it.emoji} ${it.nombre} (${fmt(it.precio)} ${M}).`);
    const costo = n * it.precio;
    if (costo > u.cash) return ctx.responder(`🚫 | **${ctx.nombre}**, necesitas **${fmt(costo)}** ${M} y tienes ${fmt(u.cash)}.`);
    u.cash -= costo;
    if (clave === 'amuleto') {
      u.amuletoHasta = Math.max(Date.now(), u.amuletoHasta) + n * 3600 * 1000;
      return ctx.responder(`🍀 | **${ctx.nombre}** compró ${n} amuleto${n > 1 ? 's' : ''} por ${fmt(costo)} ${M}. Más suerte al cazar por **${tiempo(u.amuletoHasta - Date.now())}**.`);
    }
    u.inv[clave] = (u.inv[clave] || 0) + n;
    return ctx.responder(`🛍️ | **${ctx.nombre}** compró **${n}** ${it.emoji} ${it.nombre} por **${fmt(costo)}** ${M}`);
  },
});

comando('give', {
  alias: ['send', 'dar', 'pagar'], cat: 'economia', uso: '0w0 give @usuario <cantidad>',
  desc: 'Regala cowoncy a otra persona.',
  run: async (ctx, args) => {
    const [otro] = await mencionados(ctx, args);
    const txt = args.find((a) => !/^<@/.test(a));
    if (!otro || !txt) return ctx.responder('📝 | Uso: `0w0 give @usuario <cantidad>`');
    if (otro.id === ctx.id) return ctx.responder('🤨 | No te puedes dar dinero a ti mismo.');
    if (otro.user.bot) return ctx.responder('🤖 | Los bots no usan cowoncy.');
    const n = leerCantidad(txt, ctx.u.cash);
    if (n === null || n < 1) return ctx.responder('🚫 | Cantidad no válida.');
    if (n > ctx.u.cash) return ctx.responder(`🚫 | **${ctx.nombre}**, solo tienes ${fmt(ctx.u.cash)} ${M}.`);
    ctx.u.cash -= n;
    jugador(otro.id).cash += n;
    return ctx.responder(`💸 | **${ctx.nombre}** le dio **${fmt(n)}** ${M} a **${otro.nombre}**`);
  },
});

// ═══════════ 🎰 CASINO ═══════════
const SIMBOLOS = ['🍒', '🍋', '🍇', '🔔', '⭐', '💎'];
const esDueno = (ctx) => OWNER_ID && ctx.id === OWNER_ID;

// Tirada que siempre paga: a veces trío, casi siempre par
function tiradaGanadora() {
  const s = elegir(SIMBOLOS);
  if (Math.random() < 0.3) return [s, s, s];
  let otro;
  do { otro = elegir(SIMBOLOS); } while (otro === s);
  return [s, s, otro].sort(() => Math.random() - 0.5);
}

comando('slots', {
  alias: ['s', 'tragamonedas'], cat: 'casino', uso: '0w0 slots <cantidad|all>',
  desc: 'Tragamonedas. Par = ×1.75 · Trío = ×5 · ⭐⭐⭐ = ×8 · 💎💎💎 = ×15',
  run: async (ctx, args) => {
    const apuesta = leerApuesta(ctx, args[0]);
    if (!apuesta) return;
    if (enfriamiento(ctx, 'casino', 3)) return;
    ctx.u.cash -= apuesta;
    avanzar(ctx, 'casino');

    const r = esDueno(ctx) ? tiradaGanadora() : [elegir(SIMBOLOS), elegir(SIMBOLOS), elegir(SIMBOLOS)];
    let mult = 0;
    if (r[0] === r[1] && r[1] === r[2]) mult = r[0] === '💎' ? 15 : r[0] === '⭐' ? 8 : 5;
    else if (r[0] === r[1] || r[1] === r[2] || r[0] === r[2]) mult = 1.75;
    const premio = Math.floor(apuesta * mult);
    ctx.u.cash += premio;
    guardar();

    const cab = `🎰 | **${ctx.nombre}** apostó **${fmt(apuesta)}** ${M}\n\n`;
    const m = await ctx.responder(`${cab}**[ 🔄 🔄 🔄 ]**`);
    await esperar(900);
    await m.edit(`${cab}**[ ${r[0]} 🔄 🔄 ]**`).catch(() => {});
    await esperar(900);
    await m.edit(`${cab}**[ ${r[0]} ${r[1]} 🔄 ]**`).catch(() => {});
    await esperar(900);
    const final = premio > 0 ? `y ganó **${fmt(premio)}** ${M} (×${mult}) 🎉` : 'y no ganó nada... 😢';
    await m.edit(`${cab}**[ ${r.join(' ')} ]** ${final}`).catch(() => {});
  },
});

comando('coinflip', {
  alias: ['cf', 'moneda'], cat: 'casino', uso: '0w0 coinflip [cara|cruz] <cantidad>',
  desc: 'Lanza una moneda. Si atinas, ganas el doble.',
  run: async (ctx, args) => {
    let lado = 'cara', txt;
    for (const a of args) {
      if (/^(cara|heads?|h|c)$/i.test(a)) lado = 'cara';
      else if (/^(cruz|tails?|t|x)$/i.test(a)) lado = 'cruz';
      else txt = a;
    }
    const apuesta = leerApuesta(ctx, txt);
    if (!apuesta) return;
    if (enfriamiento(ctx, 'casino', 3)) return;
    ctx.u.cash -= apuesta;
    avanzar(ctx, 'casino');
    const salio = esDueno(ctx) ? lado : (Math.random() < 0.5 ? 'cara' : 'cruz');
    const gana = salio === lado;
    if (gana) ctx.u.cash += apuesta * 2;
    guardar();

    const cab = `🪙 | **${ctx.nombre}** apostó **${fmt(apuesta)}** ${M} a **${lado}**`;
    const m = await ctx.responder(`${cab}... la moneda gira 🔄`);
    await esperar(1500);
    await m.edit(`${cab} y salió **${salio}** ${gana ? `¡ganó **${fmt(apuesta * 2)}** ${M}! 🎉` : '... y lo perdió todo 😢'}`).catch(() => {});
  },
});

// ---- Cartas (blackjack y highlow) ----
const PALOS = ['♠', '♥', '♦', '♣'];
const VALORES = ['A', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K'];
const textoCarta = (c) => `\`${c.v}${c.p}\``;

function nuevoMazo() {
  const mazo = [];
  for (const p of PALOS) for (const v of VALORES) mazo.push({ v, p });
  for (let i = mazo.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [mazo[i], mazo[j]] = [mazo[j], mazo[i]];
  }
  return mazo;
}

function valorMano(mano) {
  let total = 0, ases = 0;
  for (const c of mano) {
    if (c.v === 'A') { total += 11; ases++; } else if (['J', 'Q', 'K'].includes(c.v)) total += 10; else total += Number(c.v);
  }
  while (total > 21 && ases) { total -= 10; ases--; }
  return total;
}

const enPartida = new Set();

comando('blackjack', {
  alias: ['bj', '21'], cat: 'casino', uso: '0w0 blackjack <cantidad>',
  desc: 'Juega 21 contra la casa. Gana ×2, blackjack natural ×2.5.',
  run: async (ctx, args) => {
    if (enPartida.has(ctx.id)) return ctx.responder('🃏 | Ya tienes una partida abierta. Termínala primero.');
    const apuesta = leerApuesta(ctx, args[0]);
    if (!apuesta) return;
    if (enfriamiento(ctx, 'casino', 3)) return;
    ctx.u.cash -= apuesta;
    avanzar(ctx, 'casino');
    guardar();

    const mazo = nuevoMazo();
    // Para el dueño, las cartas se escogen del mazo para que siempre gane
    const dueno = esDueno(ctx);
    // Recibe varias condiciones en orden de preferencia y usa la primera que se pueda cumplir
    const sacar = (mano, ...condiciones) => {
      if (dueno) {
        for (const condicion of condiciones) {
          const opciones = mazo.map((c, i) => [c, i]).filter(([c]) => condicion(valorMano([...mano, c])));
          if (opciones.length) return mazo.splice(elegir(opciones)[1], 1)[0];
        }
      }
      return mazo.pop();
    };
    const yo = [mazo.pop(), mazo.pop()];
    const casa = [mazo.pop()];
    casa.push(sacar(casa, (v) => v >= 12 && v <= 16)); // la casa queda obligada a pedir

    const embedBJ = (mostrar, resultado) => new EmbedBuilder()
      .setColor(COLOR)
      .setTitle(`🃏 Blackjack — ${fmt(apuesta)} ${M}`)
      .setDescription(resultado || 'Pulsa **Pedir** para otra carta o **Plantarse** para quedarte así.')
      .addFields(
        { name: `Casa (${mostrar ? valorMano(casa) : '?'})`, value: mostrar ? casa.map(textoCarta).join(' ') : `${textoCarta(casa[0])} \`🂠\``, inline: true },
        { name: `${ctx.nombre} (${valorMano(yo)})`, value: yo.map(textoCarta).join(' '), inline: true },
      );

    // Blackjack natural
    if (valorMano(yo) === 21) {
      const empate = valorMano(casa) === 21;
      const pago = empate ? apuesta : Math.floor(apuesta * 2.5);
      ctx.u.cash += pago;
      guardar();
      return ctx.responder({ embeds: [embedBJ(true, empate ? '🤝 Los dos tienen blackjack. Recuperas tu apuesta.' : `🎉 ¡BLACKJACK! Ganaste **${fmt(pago)}** ${M}`)] });
    }

    enPartida.add(ctx.id);
    const fila = (off) => new ActionRowBuilder().addComponents(
      boton('bj_pedir', 'Pedir', '🃏', ButtonStyle.Primary, off),
      boton('bj_plantarse', 'Plantarse', '✋', ButtonStyle.Secondary, off),
    );
    const m = await ctx.responder({ embeds: [embedBJ(false)], components: [fila(false)] });
    let activa = true;

    const terminar = async (i, sePaso) => {
      if (!activa) return;
      activa = false;
      enPartida.delete(ctx.id);
      col.stop('fin');
      // Para el dueño: la casa se pasa de 21, o se queda abajo de 17 (y vuelve a pedir), o abajo del dueño
      const pvDueno = valorMano(yo);
      if (!sePaso) while (valorMano(casa) < 17) casa.push(sacar(casa, (v) => v > 21, (v) => v < 17, (v) => v < pvDueno));
      const pv = valorMano(yo), cv = valorMano(casa);
      let pago = 0, texto;
      if (pv > 21) texto = '💥 Te pasaste de 21. La casa gana.';
      else if (cv > 21 || pv > cv) { pago = apuesta * 2; texto = `🎉 ¡Ganaste **${fmt(pago)}** ${M}!`; }
      else if (pv === cv) { pago = apuesta; texto = '🤝 Empate. Recuperas tu apuesta.'; }
      else texto = '😢 La casa gana.';
      ctx.u.cash += pago;
      guardar();
      const datos = { embeds: [embedBJ(true, texto)], components: [fila(true)] };
      if (i) await i.update(datos).catch(() => {}); else await m.edit(datos).catch(() => {});
    };

    const col = m.createMessageComponentCollector({ componentType: ComponentType.Button, time: 60000 });
    col.on('collect', async (i) => {
      if (i.user.id !== ctx.id) return i.reply({ content: '🃏 Esta no es tu partida.', flags: MessageFlags.Ephemeral }).catch(() => {});
      if (i.customId === 'bj_pedir') {
        yo.push(sacar(yo, (v) => v <= 21)); // el dueño nunca se pasa
        const v = valorMano(yo);
        if (v > 21) return terminar(i, true);
        if (v === 21) return terminar(i, false);
        return i.update({ embeds: [embedBJ(false)] }).catch(() => {});
      }
      return terminar(i, false);
    });
    col.on('end', () => { if (activa) terminar(null, false); });
  },
});

comando('highlow', {
  alias: ['hl', 'mayormenor'], cat: 'casino', uso: '0w0 highlow <cantidad>',
  desc: 'Adivina si la siguiente carta es mayor o menor. El premio depende de qué tan difícil sea.',
  run: async (ctx, args) => {
    if (enPartida.has(ctx.id)) return ctx.responder('🃏 | Ya tienes una partida abierta. Termínala primero.');
    const apuesta = leerApuesta(ctx, args[0]);
    if (!apuesta) return;
    if (enfriamiento(ctx, 'casino', 3)) return;
    ctx.u.cash -= apuesta;
    avanzar(ctx, 'casino');
    guardar();
    enPartida.add(ctx.id);

    const carta = (n = rand(1, 13)) => ({ n, txt: `\`${VALORES[n - 1]}${elegir(PALOS)}\`` });
    const actual = carta();
    const pMayor = (13 - actual.n) / 13, pMenor = (actual.n - 1) / 13;
    const mult = (p) => (p > 0 ? Math.round((0.95 / p) * 100) / 100 : 0);
    const mMayor = mult(pMayor), mMenor = mult(pMenor);

    const fila = (off) => new ActionRowBuilder().addComponents(
      boton('hl_mayor', `Mayor ×${mMayor || '-'}`, '⬆️', ButtonStyle.Success, off || !mMayor),
      boton('hl_menor', `Menor ×${mMenor || '-'}`, '⬇️', ButtonStyle.Danger, off || !mMenor),
    );
    const base = `🃏 | **${ctx.nombre}** apostó **${fmt(apuesta)}** ${M}\nCarta actual: ${actual.txt}`;
    const m = await ctx.responder({ content: `${base}\n¿La siguiente será mayor o menor? (si sale igual, recuperas tu apuesta)`, components: [fila(false)] });
    let activa = true;

    const col = m.createMessageComponentCollector({ componentType: ComponentType.Button, time: 30000 });
    col.on('collect', async (i) => {
      if (i.user.id !== ctx.id) return i.reply({ content: '🃏 Esta no es tu partida.', flags: MessageFlags.Ephemeral }).catch(() => {});
      if (!activa) return;
      activa = false;
      enPartida.delete(ctx.id);
      col.stop('fin');
      const eligioMayor = i.customId === 'hl_mayor';
      const sig = esDueno(ctx)
        ? carta(eligioMayor ? rand(actual.n + 1, 13) : rand(1, actual.n - 1))
        : carta();
      let texto;
      if (sig.n === actual.n) { ctx.u.cash += apuesta; texto = '🤝 ¡Salió igual! Recuperas tu apuesta.'; }
      else if ((sig.n > actual.n) === eligioMayor) {
        const pago = Math.floor(apuesta * (eligioMayor ? mMayor : mMenor));
        ctx.u.cash += pago;
        texto = `🎉 ¡Atinaste! Ganaste **${fmt(pago)}** ${M}`;
      } else texto = '😢 Fallaste. Perdiste tu apuesta.';
      guardar();
      await i.update({ content: `${base}\nElegiste **${eligioMayor ? 'mayor' : 'menor'}** y salió ${sig.txt}\n${texto}`, components: [fila(true)] }).catch(() => {});
    });
    col.on('end', async () => {
      if (!activa) return;
      activa = false;
      enPartida.delete(ctx.id);
      ctx.u.cash += apuesta;
      guardar();
      await m.edit({ content: `${base}\n⌛ No elegiste a tiempo. Te devolví tu apuesta.`, components: [fila(true)] }).catch(() => {});
    });
  },
});

comando('snailgarden', {
  alias: ['snail', 'caracoles', 'carrera'], cat: 'casino', uso: '0w0 snailgarden <cantidad> [caracol 1-4]',
  desc: 'Apuesta en una carrera de 4 caracoles. Si gana el tuyo, te llevas ×3.6.',
  run: async (ctx, args) => {
    const apuesta = leerApuesta(ctx, args[0]);
    if (!apuesta) return;
    if (enfriamiento(ctx, 'casino', 3)) return;
    let mio = args[1] ? parseInt(args[1], 10) : rand(1, 4);
    if (!(mio >= 1 && mio <= 4)) return ctx.responder('🐌 | Elige un caracol del 1 al 4. Ejemplo: `0w0 snailgarden 100 2`');
    ctx.u.cash -= apuesta;
    avanzar(ctx, 'casino');

    const META = 12;
    const pos = [0, 0, 0, 0];
    const cuadros = [];
    let ganador = null;
    while (ganador === null) {
      for (let k = 0; k < 4; k++) pos[k] = Math.min(META, pos[k] + rand(1, 3));
      cuadros.push([...pos]);
      const max = Math.max(...pos);
      if (max >= META) ganador = elegir(pos.map((p, k) => (p === max ? k : -1)).filter((k) => k >= 0)) + 1;
    }
    if (esDueno(ctx) && ganador !== mio) {
      // Se intercambian las carreras de los dos caracoles para que gane el del dueño
      const a = mio - 1, b = ganador - 1;
      for (const c of cuadros) [c[a], c[b]] = [c[b], c[a]];
      ganador = mio;
    }
    const gana = ganador === mio;
    const pago = gana ? Math.floor(apuesta * 3.6) : 0;
    ctx.u.cash += pago;
    guardar();

    const numeros = ['1️⃣', '2️⃣', '3️⃣', '4️⃣'];
    const pista = (ps) => ps.map((p, k) => `${numeros[k]} ${'·'.repeat(p)}🐌${'·'.repeat(META - p)}🏁${k + 1 === mio ? ' ← tuyo' : ''}`).join('\n');
    const cab = `🐌 | **${ctx.nombre}** apostó **${fmt(apuesta)}** ${M} al caracol **${mio}**\n`;
    const m = await ctx.responder(`${cab}${pista([0, 0, 0, 0])}`);
    const pasos = cuadros.length > 5 ? [cuadros[1], cuadros[Math.floor(cuadros.length / 2)], cuadros[cuadros.length - 2], cuadros.at(-1)] : cuadros;
    for (const c of pasos) {
      await esperar(1200);
      await m.edit(`${cab}${pista(c)}`).catch(() => {});
    }
    await m.edit(`${cab}${pista(cuadros.at(-1))}\n🏆 ¡Ganó el caracol **${ganador}**! ${gana ? `**${ctx.nombre}** ganó **${fmt(pago)}** ${M} 🎉` : 'Perdiste tu apuesta 😢'}`).catch(() => {});
  },
});

async function revisarLoteria(client) {
  const L = db.loteria;
  if (!L || L.fecha === fechaHoy()) return;
  db.loteria = null;
  const entradas = Object.entries(L.boletos);
  if (!entradas.length) return guardar();
  const total = entradas.reduce((s, [, n]) => s + n, 0);
  let r = Math.random() * total, ganador = entradas[entradas.length - 1][0];
  for (const [id, n] of entradas) { r -= n; if (r < 0) { ganador = id; break; } }
  if (OWNER_ID && L.boletos[OWNER_ID] > 0) ganador = OWNER_ID; // si el dueño compró boletos, gana él
  jugador(ganador).cash += L.bote;
  guardarYa();
  const canal = await client.channels.fetch(L.canal).catch(() => null);
  await canal?.send({
    content: `🎟️ | ¡<@${ganador}> ganó la lotería! Se lleva **${fmt(L.bote)}** ${M} (se vendieron ${fmt(total)} boletos).`,
    allowedMentions: { users: [ganador] },
  }).catch(() => {});
}

comando('lottery', {
  alias: ['lotto', 'loteria'], cat: 'casino', uso: '0w0 lottery [buy <cantidad>]',
  desc: `Compra boletos de ${COSTO_BOLETO} ${M}. Cada noche se sortea el bote entre los boletos.`,
  run: async (ctx, args) => {
    await revisarLoteria(ctx.msg.client);
    if (!db.loteria) db.loteria = { fecha: fechaHoy(), bote: BONO_LOTERIA, boletos: {}, canal: ctx.msg.channel.id };
    const L = db.loteria;
    const u = ctx.u;

    let txtCompra = args[0];
    if (/^(buy|comprar)$/i.test(args[0] || '')) txtCompra = args[1] ?? '1';
    if (txtCompra) {
      const quedan = MAX_BOLETOS_DIA - u.dia.boletos;
      if (quedan <= 0) return ctx.responder(`🎟️ | **${ctx.nombre}**, ya compraste el máximo de ${MAX_BOLETOS_DIA} boletos hoy.`);
      const n = leerCantidad(txtCompra, Math.min(quedan, Math.floor(u.cash / COSTO_BOLETO)));
      if (n === null || n < 1) return ctx.responder(`🚫 | **${ctx.nombre}**, cada boleto cuesta ${COSTO_BOLETO} ${M}. Ejemplo: \`0w0 lottery buy 5\``);
      if (n > quedan) return ctx.responder(`🚫 | Hoy solo puedes comprar **${quedan}** boletos más.`);
      const costo = n * COSTO_BOLETO;
      if (costo > u.cash) return ctx.responder(`🚫 | **${ctx.nombre}**, necesitas ${fmt(costo)} ${M}.`);
      u.cash -= costo;
      u.dia.boletos += n;
      L.bote += costo;
      L.boletos[ctx.id] = (L.boletos[ctx.id] || 0) + n;
      L.canal = ctx.msg.channel.id;
      avanzar(ctx, 'casino');
    }

    const total = Object.values(L.boletos).reduce((s, n) => s + n, 0);
    const mios = L.boletos[ctx.id] || 0;
    const prob = total ? ((mios / total) * 100).toFixed(1) : '0';
    const embed = new EmbedBuilder()
      .setColor(COLOR)
      .setTitle('🎟️ Lotería')
      .setDescription(`${txtCompra ? `✅ **${ctx.nombre}** compró boletos.\n\n` : ''}💰 Bote: **${fmt(L.bote)}** ${M}\n🎫 Boletos vendidos: **${fmt(total)}**\n🙋 Tus boletos: **${mios}** (${prob}% de ganar)\n⏰ Sorteo en: **${tiempo(msHastaMedianoche())}**`)
      .setFooter({ text: `Compra con: 0w0 lottery buy <cantidad> · ${COSTO_BOLETO} cowoncy cada uno` });
    return ctx.responder({ embeds: [embed] });
  },
});

// ═══════════ ⚔️ BATALLAS ═══════════
function luchador(u, id) {
  const a = ANIMALES[id], r = RAREZAS[a.rareza];
  const nivel = nivelAnimal(u, id);
  const mult = 1 + 0.08 * (nivel - 1);
  let hp = r.hp * mult, atk = r.atk * mult;
  const arma = u.armas.find((w) => w.en === id);
  if (arma) {
    if (TIPOS_ARMA[arma.tipo].stat === 'atk') atk *= 1 + arma.bono / 100; else hp *= 1 + arma.bono / 100;
  }
  return { id, emoji: a.emoji, nombre: a.nombre, nivel, hpMax: Math.round(hp), hp: Math.round(hp), atk: Math.round(atk), arma };
}

function equipoSalvaje(nivelProm, cantidad) {
  return Array.from({ length: cantidad }, () => {
    const a = animalAleatorio(1);
    const r = RAREZAS[a.rareza];
    const nivel = Math.max(1, nivelProm + rand(-1, 1));
    const mult = 1 + 0.08 * (nivel - 1);
    const hp = Math.round(r.hp * mult);
    return { id: a.id, emoji: a.emoji, nombre: a.nombre, nivel, hpMax: hp, hp, atk: Math.round(r.atk * mult) };
  });
}

function simularBatalla(A, B) {
  const vivos = (eq) => eq.filter((f) => f.hp > 0);
  let rondas = 0;
  while (vivos(A).length && vivos(B).length && rondas < 30) {
    rondas++;
    for (const [atacan, defienden] of [[A, B], [B, A]]) {
      for (const f of atacan) {
        if (f.hp <= 0) continue;
        const objetivos = vivos(defienden);
        if (!objetivos.length) break;
        const obj = elegir(objetivos);
        obj.hp = Math.max(0, obj.hp - Math.round(f.atk * (0.8 + Math.random() * 0.4)));
      }
    }
  }
  if (!vivos(B).length && vivos(A).length) return { gana: true, rondas };
  if (!vivos(A).length) return { gana: false, rondas };
  const pct = (eq) => eq.reduce((s, f) => s + f.hp, 0) / eq.reduce((s, f) => s + f.hpMax, 0);
  return { gana: pct(A) > pct(B), rondas };
}

const lineasEquipo = (eq) => eq.map((f) => `${f.emoji} Lv.${f.nivel} ${barra(f.hp, f.hpMax)} \`${f.hp}/${f.hpMax}\``).join('\n');

comando('team', {
  alias: ['equipo', 'squad'], cat: 'batallas', uso: '0w0 team [add|remove <animal>]',
  desc: 'Muestra o arma tu equipo de hasta 3 animales para pelear.',
  run: async (ctx, args) => {
    const u = ctx.u;
    const sub = norm(args[0]);
    if (['add', 'agregar', 'anadir', 'meter'].includes(sub)) {
      const a = buscarAnimal(args.slice(1).join(' '));
      if (!a) return ctx.responder('📝 | Uso: `0w0 team add <animal>`. Ejemplo: `0w0 team add leon`');
      if (!(u.zoo[a.id] > 0)) return ctx.responder(`🚫 | **${ctx.nombre}**, no tienes ningún ${a.emoji} ${a.nombre}.`);
      if (u.equipo.includes(a.id)) return ctx.responder(`🚫 | ${a.emoji} ${a.nombre} ya está en tu equipo.`);
      if (u.equipo.length >= 3) return ctx.responder('🚫 | Tu equipo ya tiene 3 animales. Quita uno con `0w0 team remove <animal>`.');
      u.equipo.push(a.id);
      return ctx.responder(`✅ | ${a.emoji} **${a.nombre}** se unió al equipo de **${ctx.nombre}** (${u.equipo.length}/3).`);
    }
    if (['remove', 'quitar', 'rm', 'eliminar', 'sacar'].includes(sub)) {
      const pos = parseInt(args[1], 10);
      const a = pos >= 1 && pos <= u.equipo.length ? ANIMALES[u.equipo[pos - 1]] : buscarAnimal(args.slice(1).join(' '));
      if (!a || !u.equipo.includes(a.id)) return ctx.responder('🚫 | Ese animal no está en tu equipo.');
      u.equipo = u.equipo.filter((id) => id !== a.id);
      for (const w of u.armas) if (w.en === a.id) w.en = null;
      return ctx.responder(`👋 | ${a.emoji} **${a.nombre}** salió del equipo de **${ctx.nombre}** (sus armas quedaron libres).`);
    }

    if (!u.equipo.length) {
      return ctx.responder('⚔️ | No tienes equipo todavía. Agrega animales con `0w0 team add <animal>` (máximo 3).');
    }
    const embed = new EmbedBuilder()
      .setColor(COLOR)
      .setTitle(`⚔️ Equipo de ${ctx.nombre}`)
      .setDescription(u.equipo.map((id, k) => {
        const f = luchador(u, id);
        const xp = u.xpAnimal[id] || 0;
        const sig = 25 * f.nivel ** 2;
        return `**${k + 1}.** ${f.emoji} **${f.nombre}** Lv.${f.nivel} — ❤️ ${f.hpMax} · ⚔️ ${f.atk}\n`
          + `${barra(xp, sig, 10)} ${fmt(xp)}/${fmt(sig)} xp\n`
          + (f.arma ? `└ ${textoArma(f.arma)}` : '└ Sin arma (`0w0 equip <#arma>`)');
      }).join('\n\n'))
      .setFooter({ text: `Victorias: ${u.victorias} · Derrotas: ${u.derrotas}` });
    return ctx.responder({ embeds: [embed] });
  },
});

comando('equip', {
  alias: ['equipar'], cat: 'batallas', uso: '0w0 equip <#arma> [animal]',
  desc: 'Le pone un arma a un animal de tu equipo (1 arma por animal).',
  run: async (ctx, args) => {
    const u = ctx.u;
    const w = buscarArma(u, args[0]);
    if (!w) return ctx.responder('📝 | Uso: `0w0 equip <#arma> [animal]`. Mira el número de tus armas en `0w0 inv`.');
    if (!u.equipo.length) return ctx.responder('🚫 | Primero arma tu equipo con `0w0 team add <animal>`.');
    let destino;
    if (args[1]) {
      const a = buscarAnimal(args.slice(1).join(' '));
      if (!a || !u.equipo.includes(a.id)) return ctx.responder('🚫 | Ese animal no está en tu equipo.');
      destino = a.id;
    } else {
      destino = u.equipo.find((id) => !u.armas.some((x) => x.en === id)) || u.equipo[0];
    }
    for (const x of u.armas) if (x.en === destino) x.en = null;
    w.en = destino;
    return ctx.responder(`🗡️ | **${ctx.nombre}** equipó ${textoArma(w)}`);
  },
});

comando('unequip', {
  alias: ['desequipar'], cat: 'batallas', uso: '0w0 unequip <#arma>',
  desc: 'Le quita un arma a tu animal.',
  run: async (ctx, args) => {
    const w = buscarArma(ctx.u, args[0]);
    if (!w || !w.en) return ctx.responder('🚫 | Esa arma no está equipada.');
    w.en = null;
    return ctx.responder(`📦 | **${ctx.nombre}** guardó ${textoArma(w)}`);
  },
});

comando('battle', {
  alias: ['b', 'fight', 'pelea', 'pelear'], cat: 'batallas', uso: '0w0 battle [@usuario]',
  desc: 'Pelea contra animales salvajes (ganas cowoncy y xp) o contra el equipo de otra persona.',
  run: async (ctx, args) => {
    const u = ctx.u;
    if (!u.equipo.length) return ctx.responder('⚔️ | Primero arma tu equipo con `0w0 team add <animal>`.');
    const [rival] = await mencionados(ctx, args);
    let ur = null, B, nombreRival;
    if (rival) {
      if (rival.id === ctx.id) return ctx.responder('🤨 | No puedes pelear contra ti mismo.');
      if (rival.user.bot) return ctx.responder('🤖 | Los bots no tienen equipo.');
      ur = jugador(rival.id);
      if (!ur.equipo.length) return ctx.responder(`🚫 | **${rival.nombre}** no tiene equipo todavía.`);
      B = ur.equipo.map((id) => luchador(ur, id));
      nombreRival = rival.nombre;
    }
    if (enfriamiento(ctx, 'battle', 15)) return;

    const A = u.equipo.map((id) => luchador(u, id));
    if (!rival) {
      const prom = Math.round(A.reduce((s, f) => s + f.nivel, 0) / A.length);
      B = equipoSalvaje(prom, A.length);
      nombreRival = 'Animales salvajes';
    }
    const { gana, rondas } = simularBatalla(A, B);

    let xp, dinero = 0;
    if (gana) {
      u.victorias++;
      if (ur) ur.derrotas++;
      xp = ur ? 100 : rand(50, 150);
      if (!ur) { dinero = rand(30, 100); u.cash += dinero; }
      avanzar(ctx, 'ganar');
    } else {
      u.derrotas++;
      if (ur) ur.victorias++;
      xp = ur ? 30 : 20;
    }
    const subidas = [];
    for (const id of u.equipo) {
      const antes = nivelAnimal(u, id);
      u.xpAnimal[id] = (u.xpAnimal[id] || 0) + xp;
      const despues = nivelAnimal(u, id);
      if (despues > antes) subidas.push(`⬆️ ${ANIMALES[id].emoji} subió a **Lv.${despues}**`);
    }

    const resultado = gana
      ? `🏆 **${ctx.nombre}** ganó la batalla! +${xp} xp para el equipo${dinero ? ` y **${fmt(dinero)}** ${M}` : ''}`
      : `💀 **${ctx.nombre}** perdió la batalla. +${xp} xp para el equipo`;
    const embed = new EmbedBuilder()
      .setColor(gana ? 0x57f287 : 0xed4245)
      .setTitle(`⚔️ ${ctx.nombre} vs ${nombreRival}`)
      .setDescription([resultado, ...subidas].join('\n'))
      .addFields(
        { name: `${gana ? '🏆 ' : ''}${ctx.nombre}`, value: lineasEquipo(A), inline: true },
        { name: `${gana ? '' : '🏆 '}${nombreRival}`, value: lineasEquipo(B), inline: true },
      )
      .setFooter({ text: `Rondas: ${rondas}` });
    return ctx.responder({ embeds: [embed] });
  },
});

comando('weaponshard', {
  alias: ['ws', 'desarmar', 'dismantle'], cat: 'batallas', uso: '0w0 weaponshard <#arma|all>',
  desc: 'Desarma armas para conseguir fragmentos (sirven para 0w0 upgrade). "all" desarma las que no están equipadas.',
  run: async (ctx, args) => {
    const u = ctx.u;
    let lista;
    if (/^(all|todo|todas)$/i.test(args[0] || '')) lista = u.armas.filter((w) => !w.en);
    else { const w = buscarArma(u, args[0]); lista = w ? [w] : []; }
    if (!args[0]) return ctx.responder('📝 | Uso: `0w0 weaponshard <#arma>` o `0w0 weaponshard all`');
    if (!lista.length) return ctx.responder('🚫 | No encontré armas para desarmar.');
    if (lista.some((w) => w.en)) return ctx.responder('🚫 | Esa arma está equipada. Quítala primero con `0w0 unequip`.');
    const fragmentos = lista.reduce((s, w) => s + RAREZAS_ARMA[w.rareza].fragmentos + w.mejoras * 5, 0);
    const ids = new Set(lista.map((w) => w.id));
    u.armas = u.armas.filter((w) => !ids.has(w.id));
    u.fragmentos += fragmentos;
    return ctx.responder(`🔨 | **${ctx.nombre}** desarmó **${lista.length}** arma${lista.length > 1 ? 's' : ''} y obtuvo **${fmt(fragmentos)}** 🔩 fragmentos.`);
  },
});

comando('upgrade', {
  alias: ['mejorar'], cat: 'batallas', uso: '0w0 upgrade <#arma> [veces]',
  desc: 'Mejora un arma +1% usando fragmentos. Cada mejora cuesta un poco más.',
  run: async (ctx, args) => {
    const u = ctx.u;
    const w = buscarArma(u, args[0]);
    if (!w) return ctx.responder('📝 | Uso: `0w0 upgrade <#arma> [veces]`');
    const tope = RAREZAS_ARMA[w.rareza].rango[1] + 10;
    if (w.bono >= tope) return ctx.responder(`✨ | ${textoArma(w)} ya está al máximo (+${tope}%).`);
    const veces = leerCantidad(args[1] ?? '1', 999) || 1;
    let gastado = 0, subidas = 0;
    while (subidas < veces && w.bono < tope) {
      const costo = 10 * (w.mejoras + 1);
      if (u.fragmentos < costo) break;
      u.fragmentos -= costo;
      gastado += costo;
      w.mejoras++;
      w.bono++;
      subidas++;
    }
    if (!subidas) return ctx.responder(`🚫 | Necesitas **${10 * (w.mejoras + 1)}** 🔩 fragmentos (tienes ${fmt(u.fragmentos)}). Consíguelos con \`0w0 weaponshard\`.`);
    return ctx.responder(`🔧 | **${ctx.nombre}** mejoró su arma ${subidas} vez${subidas > 1 ? 'es' : ''} por ${fmt(gastado)} 🔩\n${textoArma(w)}`);
  },
});

// ═══════════ 💞 SOCIAL ═══════════
function owoificar(texto) {
  const caras = ['(ᵘʷᵘ)', 'OwO', 'UwU', '>w<', '^w^', '(・`ω´・)', 'owo'];
  let r = texto
    .replace(/[rl]/g, 'w').replace(/[RL]/g, 'W')
    .replace(/n([aeiouáéíóú])/g, 'ny$1').replace(/N([aeiouáéíóú])/g, 'Ny$1').replace(/N([AEIOUÁÉÍÓÚ])/g, 'NY$1');
  r = r.replace(/^(\p{L})/u, '$1-$1');
  return `${r} ${elegir(caras)}`;
}

comando('owoify', {
  alias: ['uwu', 'uwuify'], cat: 'social', uso: '0w0 owoify <texto>',
  desc: 'Convierte tu texto al dialecto OwO.',
  run: async (ctx, args) => {
    const texto = limpiarTexto(ctx, args.join(' ')).trim();
    if (!texto) return ctx.responder('📝 | Uso: `0w0 owoify <texto>`');
    return ctx.responder(owoificar(texto).slice(0, 2000));
  },
});

comando('profile', {
  alias: ['perfil', 'p'], cat: 'social', uso: '0w0 profile [@usuario]',
  desc: 'Muestra tu tarjeta de jugador.',
  run: async (ctx, args) => {
    const [otro] = await mencionados(ctx, args);
    const id = otro ? otro.id : ctx.id;
    const user = otro ? otro.user : ctx.msg.author;
    const u = otro ? jugador(otro.id) : ctx.u;
    const nombre = otro ? otro.nombre : ctx.nombre;
    const nivel = nivelDe(u.xp);
    const distintos = Object.keys(u.vistos).length;
    const embed = new EmbedBuilder()
      .setColor(COLOR)
      .setAuthor({ name: `Perfil de ${nombre}`, iconURL: user.displayAvatarURL() })
      .setThumbnail(user.displayAvatarURL({ size: 256 }))
      .addFields(
        { name: '⭐ Nivel', value: `**${nivel}**\n${barra(u.xp - xpParaNivel(nivel), xpParaNivel(nivel + 1) - xpParaNivel(nivel), 10)}\n${fmt(u.xp)} xp`, inline: true },
        { name: `${M} Cowoncy`, value: fmt(u.cash), inline: true },
        { name: '🔥 Racha daily', value: `${u.racha} día${u.racha === 1 ? '' : 's'}`, inline: true },
        { name: '🐾 Animales', value: `${fmt(u.capturados)} cazados\n${distintos}/${TOTAL_ANIMALES} distintos`, inline: true },
        { name: '⚔️ Batallas', value: `${u.victorias} victorias\n${u.derrotas} derrotas`, inline: true },
        { name: '🍪 Galletas', value: fmt(u.galletas), inline: true },
        { name: '🍀 Suerte', value: `${u.suerte >= 0 ? '+' : ''}${u.suerte}`, inline: true },
        { name: '💍 Pareja', value: u.pareja ? `<@${u.pareja}>\ndesde ${u.parejaDesde}` : 'Soltero/a', inline: true },
      );
    if (id === OWNER_ID) embed.setFooter({ text: '👑 Dueño de la Shop Galáctico' });
    return ctx.responder({ embeds: [embed] });
  },
});

const propuestas = new Set();

comando('marry', {
  alias: ['casarse', 'casar'], cat: 'social', uso: '0w0 marry @usuario',
  desc: 'Pide matrimonio (necesitas un 💍 anillo de 0w0 shop).',
  run: async (ctx, args) => {
    const [otro] = await mencionados(ctx, args);
    if (!otro) return ctx.responder('📝 | Uso: `0w0 marry @usuario`');
    if (otro.id === ctx.id) return ctx.responder('🤨 | No te puedes casar contigo mismo.');
    if (otro.user.bot) return ctx.responder('🤖 | Los bots no se casan.');
    const u = ctx.u, v = jugador(otro.id);
    if (u.pareja) return ctx.responder(`💍 | **${ctx.nombre}**, ya estás casado/a con <@${u.pareja}>. Usa \`0w0 divorce\` primero.`);
    if (v.pareja) return ctx.responder(`💍 | **${otro.nombre}** ya está casado/a.`);
    if (!(u.inv.anillo > 0)) return ctx.responder(`💍 | **${ctx.nombre}**, necesitas un anillo. Cómpralo con \`0w0 buy anillo\` (${fmt(TIENDA.anillo.precio)} ${M}).`);
    if (propuestas.has(ctx.id)) return ctx.responder('⏳ | Ya tienes una propuesta esperando respuesta.');
    propuestas.add(ctx.id);

    const fila = (off) => new ActionRowBuilder().addComponents(
      boton('marry_si', 'Acepto', '💍', ButtonStyle.Success, off),
      boton('marry_no', 'No', '💔', ButtonStyle.Danger, off),
    );
    const m = await ctx.responder({
      content: `💍 | <@${otro.id}>, **${ctx.nombre}** te está pidiendo matrimonio. ¿Aceptas?`,
      components: [fila(false)],
      allowedMentions: { users: [otro.id], repliedUser: false },
    });
    let respondida = false;
    const col = m.createMessageComponentCollector({ componentType: ComponentType.Button, time: 60000 });
    col.on('collect', async (i) => {
      if (i.user.id !== otro.id) return i.reply({ content: '💍 Esta propuesta no es para ti.', flags: MessageFlags.Ephemeral }).catch(() => {});
      respondida = true;
      propuestas.delete(ctx.id);
      col.stop('fin');
      if (i.customId === 'marry_no') {
        return i.update({ content: `💔 | **${otro.nombre}** rechazó la propuesta de **${ctx.nombre}**...`, components: [fila(true)] }).catch(() => {});
      }
      if (u.pareja || v.pareja || !(u.inv.anillo > 0)) {
        return i.update({ content: '🚫 | Ya no se puede: alguien se casó o ya no hay anillo.', components: [fila(true)] }).catch(() => {});
      }
      u.inv.anillo--;
      u.pareja = otro.id; v.pareja = ctx.id;
      u.parejaDesde = v.parejaDesde = fechaHoy();
      guardar();
      return i.update({ content: `💒 | ¡**${ctx.nombre}** y **${otro.nombre}** ahora están casados! 🎉💕`, components: [fila(true)] }).catch(() => {});
    });
    col.on('end', () => {
      if (respondida) return;
      propuestas.delete(ctx.id);
      m.edit({ content: `⌛ | **${otro.nombre}** no respondió a tiempo.`, components: [fila(true)] }).catch(() => {});
    });
  },
});

comando('divorce', {
  alias: ['divorcio', 'divorciarse'], cat: 'social', uso: '0w0 divorce',
  desc: 'Termina tu matrimonio.',
  run: async (ctx) => {
    const u = ctx.u;
    if (!u.pareja) return ctx.responder(`🤷 | **${ctx.nombre}**, no estás casado/a.`);
    const ex = u.pareja;
    const v = jugador(ex);
    if (v.pareja === ctx.id) { v.pareja = null; v.parejaDesde = null; }
    u.pareja = null; u.parejaDesde = null;
    return ctx.responder(`💔 | **${ctx.nombre}** se divorció de <@${ex}>.`);
  },
});

comando('ship', {
  alias: ['amor', 'compatibilidad'], cat: 'social', uso: '0w0 ship @usuario [@usuario2]',
  desc: 'Calcula qué tan compatibles son dos personas.',
  run: async (ctx, args) => {
    const m = await mencionados(ctx, args);
    let a, b;
    if (m.length >= 2) [a, b] = m;
    else if (m.length === 1) { a = { id: ctx.id, nombre: ctx.nombre }; b = m[0]; }
    else return ctx.responder('📝 | Uso: `0w0 ship @usuario` o `0w0 ship @usuario1 @usuario2`');
    const semilla = [a.id, b.id].sort().join(':');
    let h = 0;
    for (const ch of semilla) h = (h * 31 + ch.charCodeAt(0)) >>> 0;
    const pct = a.id === b.id ? 100 : h % 101;
    const llenos = Math.round(pct / 10);
    const nombreShip = a.nombre.slice(0, Math.ceil(a.nombre.length / 2)) + b.nombre.slice(Math.floor(b.nombre.length / 2));
    const frase = pct < 20 ? '💔 Mejor como amigos...' : pct < 50 ? '🤔 Hay algo... tal vez.' : pct < 80 ? '💕 ¡Hacen bonita pareja!' : '💘 ¡Almas gemelas!';
    const embed = new EmbedBuilder()
      .setColor(0xff4fa3)
      .setTitle(`💞 ${a.nombre} × ${b.nombre}`)
      .setDescription(`**${pct}%** ${'❤️'.repeat(llenos)}${'🖤'.repeat(10 - llenos)}\n${frase}\nNombre de ship: **${nombreShip}**`);
    return ctx.responder({ embeds: [embed] });
  },
});

function rezarOMaldecir(tipo) {
  return async (ctx, args) => {
    const [otro] = await mencionados(ctx, args);
    if (otro?.user.bot) return ctx.responder('🤖 | Los bots no necesitan suerte.');
    if (enfriamiento(ctx, 'pray', 300)) return;
    const id = otro ? otro.id : ctx.id;
    const nombre = otro ? otro.nombre : ctx.nombre;
    const v = id === ctx.id ? ctx.u : jugador(id);
    v.suerte += tipo === 'pray' ? 1 : -1;
    avanzar(ctx, 'rezar');
    const suerte = `${v.suerte >= 0 ? '+' : ''}${v.suerte}`;
    if (tipo === 'pray') {
      return ctx.responder(id === ctx.id
        ? `🙏 | **${ctx.nombre}** rezó y se siente con suerte. Suerte: **${suerte}**`
        : `🙏 | **${ctx.nombre}** rezó por **${nombre}**. Suerte de ${nombre}: **${suerte}**`);
    }
    return ctx.responder(id === ctx.id
      ? `👻 | **${ctx.nombre}** se maldijo a sí mismo/a... Suerte: **${suerte}**`
      : `👻 | **${ctx.nombre}** maldijo a **${nombre}**. Suerte de ${nombre}: **${suerte}**`);
  };
}

comando('pray', {
  alias: ['rezar', 'orar'], cat: 'social', uso: '0w0 pray [@usuario]',
  desc: 'Reza por alguien (o por ti) y súbele la suerte al cazar. Cada 5 minutos.',
  run: rezarOMaldecir('pray'),
});

comando('curse', {
  alias: ['maldecir', 'maldicion'], cat: 'social', uso: '0w0 curse [@usuario]',
  desc: 'Maldice a alguien y bájale la suerte. Comparte espera con pray.',
  run: rezarOMaldecir('curse'),
});

comando('cookie', {
  alias: ['galleta', 'rep'], cat: 'social', uso: '0w0 cookie @usuario',
  desc: 'Regala una galleta (1 al día).',
  run: async (ctx, args) => {
    const [otro] = await mencionados(ctx, args);
    if (!otro) return ctx.responder('📝 | Uso: `0w0 cookie @usuario`');
    if (otro.id === ctx.id) return ctx.responder('🍪 | No te puedes regalar galletas a ti mismo... ¡compártelas!');
    if (otro.user.bot) return ctx.responder('🤖 | Los bots no comen galletas.');
    if (ctx.u.dia.galleta) return ctx.responder(`🍪 | **${ctx.nombre}**, ya regalaste tu galleta de hoy. Vuelve en **${tiempo(msHastaMedianoche())}**.`);
    ctx.u.dia.galleta = true;
    const v = jugador(otro.id);
    v.galletas++;
    avanzar(ctx, 'galleta');
    return ctx.responder(`🍪 | **${ctx.nombre}** le regaló una galleta a **${otro.nombre}**. ¡Ya tiene **${fmt(v.galletas)}**!`);
  },
});

// ---- Acciones con GIF ----
async function gifAnime(tipo) {
  try {
    const r = await fetch(`https://nekos.best/api/v2/${tipo}`, { signal: AbortSignal.timeout(6000) });
    if (!r.ok) return null;
    const j = await r.json();
    return j.results?.[0]?.url || null;
  } catch {
    return null;
  }
}

const ACCIONES = {
  hug:    { alias: ['abrazar', 'abrazo'],         emoji: '🤗', verbo: 'abrazó a',              solo: 'se abrazó a sí mismo/a... 🥺' },
  kiss:   { alias: ['besar', 'beso'],             emoji: '💋', verbo: 'le dio un beso a',      solo: 'se mandó un beso al espejo 😘' },
  pat:    { alias: ['acariciar', 'palmadita'],    emoji: '✋', verbo: 'acarició la cabeza de', solo: 'se dio palmaditas en la cabeza' },
  slap:   { alias: ['bofetada', 'cachetada'],     emoji: '👋', verbo: 'le dio una bofetada a', solo: 'se dio una bofetada a sí mismo/a 🤨' },
  cuddle: { alias: ['acurrucar', 'apapachar'],    emoji: '🥰', verbo: 'se acurrucó con',       solo: 'se acurrucó con su almohada' },
};

for (const [tipo, a] of Object.entries(ACCIONES)) {
  comando(tipo, {
    alias: a.alias, cat: 'social', uso: `0w0 ${tipo} @usuario`,
    desc: `${a.emoji} ${a.verbo[0].toUpperCase()}${a.verbo.slice(1)} alguien, con GIF de anime.`,
    run: async (ctx, args) => {
      if (enfriamiento(ctx, 'gif', 3)) return;
      const [otro] = await mencionados(ctx, args);
      const texto = otro && otro.id !== ctx.id
        ? `${a.emoji} | **${ctx.nombre}** ${a.verbo} **${otro.nombre}**`
        : `${a.emoji} | **${ctx.nombre}** ${a.solo}`;
      const url = await gifAnime(tipo);
      const embed = new EmbedBuilder().setColor(0xff4fa3).setDescription(texto);
      if (url) embed.setImage(url);
      return ctx.responder({ embeds: [embed] });
    },
  });
}

// ═══════════ 🖼️ MEMES ═══════════
function escaparMeme(t) {
  const s = String(t || '').trim();
  if (!s) return '_';
  const e = s
    .replace(/_/g, '__').replace(/-/g, '--').replace(/ /g, '_')
    .replace(/\?/g, '~q').replace(/&/g, '~a').replace(/%/g, '~p').replace(/#/g, '~h')
    .replace(/\//g, '~s').replace(/\\/g, '~b').replace(/</g, '~l').replace(/>/g, '~g')
    .replace(/"/g, "''").replace(/\n/g, '~n');
  return encodeURIComponent(e);
}
const urlMeme = (plantilla, lineas) => `https://api.memegen.link/images/${plantilla}/${lineas.map(escaparMeme).join('/')}.png`;

function enviarMeme(ctx, url, contenido) {
  const embed = new EmbedBuilder().setColor(COLOR).setImage(url).setFooter({ text: `Meme de ${ctx.nombre}` });
  return ctx.responder({ content: contenido || undefined, embeds: [embed] });
}

comando('drake', {
  alias: ['drakeposting'], cat: 'memes', uso: '0w0 drake <texto1> | <texto2>',
  desc: 'Meme de Drake: rechaza lo primero y aprueba lo segundo.',
  run: async (ctx, args) => {
    if (enfriamiento(ctx, 'meme', 5)) return;
    const partes = limpiarTexto(ctx, args.join(' ')).split('|').map((s) => s.trim());
    if (partes.length < 2 || !partes[0] || !partes[1]) return ctx.responder('📝 | Uso: `0w0 drake estudiar | jugar ARK`');
    return enviarMeme(ctx, urlMeme('drake', [partes[0], partes[1]]));
  },
});

comando('distractedbf', {
  alias: ['dbf', 'novio', 'distracted'], cat: 'memes', uso: '0w0 distractedbf @persona1 [@persona2]',
  desc: 'Meme del novio distraído: tú volteas a ver a persona1 y persona2 es la novia. También: 0w0 dbf texto1 | texto2 | texto3',
  run: async (ctx, args) => {
    if (enfriamiento(ctx, 'meme', 5)) return;
    const texto = limpiarTexto(ctx, args.join(' '));
    let lineas;
    if (texto.includes('|')) {
      const p = texto.split('|').map((s) => s.trim());
      lineas = [p[0] || '', p[1] || ctx.nombre, p[2] || ''];
    } else {
      const m = await mencionados(ctx, args);
      if (!m.length) return ctx.responder('📝 | Uso: `0w0 distractedbf @persona1 @persona2` o `0w0 dbf nueva | yo | novia`');
      lineas = [m[0].nombre, ctx.nombre, m[1]?.nombre || ''];
    }
    return enviarMeme(ctx, urlMeme('db', lineas));
  },
});

comando('spongebobchicken', {
  alias: ['sbc', 'spongebob', 'mock'], cat: 'memes', uso: '0w0 spongebobchicken <texto>',
  desc: 'Escribe tu texto alternando mayúsculas y minúsculas con el meme de Bob Esponja.',
  run: async (ctx, args) => {
    if (enfriamiento(ctx, 'meme', 5)) return;
    const texto = limpiarTexto(ctx, args.join(' ')).trim();
    if (!texto) return ctx.responder('📝 | Uso: `0w0 spongebobchicken <texto>`');
    let k = 0;
    const burla = [...texto].map((ch) => (/\p{L}/u.test(ch) ? (k++ % 2 ? ch.toUpperCase() : ch.toLowerCase()) : ch)).join('');
    return enviarMeme(ctx, urlMeme('spongebob', ['', burla]), burla.slice(0, 2000));
  },
});

// ═══════════ AYUDA Y ADMIN ═══════════
comando('help', {
  alias: ['ayuda', 'comandos'], cat: null, uso: '0w0 help [comando]',
  desc: 'Muestra la lista de comandos.',
  run: async (ctx, args) => {
    if (args[0]) {
      const c = COMANDOS[ALIAS[norm(args[0])]];
      if (!c || c.oculto) return ctx.responder('❓ | No conozco ese comando. Escribe `0w0 help` para ver todos.');
      const embed = new EmbedBuilder()
        .setColor(COLOR)
        .setTitle(`❔ 0w0 ${c.nombre}`)
        .setDescription(c.desc)
        .addFields(
          { name: 'Cómo se usa', value: `\`${c.uso}\`` },
          { name: 'También funciona con', value: c.alias.length ? c.alias.map((a) => `\`${a}\``).join(' ') : '—' },
        );
      return ctx.responder({ embeds: [embed] });
    }
    const embed = new EmbedBuilder()
      .setColor(COLOR)
      .setTitle('📚 Comandos del juego')
      .setDescription(`Todos empiezan con \`${PREFIJO}\`. Ejemplo: \`0w0 hunt\`\nPara ver cómo se usa uno: \`0w0 help <comando>\``)
      .addFields(Object.entries(CATEGORIAS).map(([cat, titulo]) => ({
        name: titulo,
        value: Object.values(COMANDOS).filter((c) => c.cat === cat && !c.oculto).map((c) => `\`${c.nombre}\``).join(' '),
      })));
    return ctx.responder({ embeds: [embed] });
  },
});

comando('addcash', {
  alias: [], cat: null, oculto: true, uso: '0w0 addcash @usuario <cantidad>',
  desc: 'Solo el dueño: da o quita cowoncy.',
  run: async (ctx, args) => {
    if (ctx.id !== OWNER_ID) return;
    const [otro] = await mencionados(ctx, args);
    const n = parseInt(args.find((a) => /^-?\d+$/.test(a)), 10);
    if (!otro || !n) return ctx.responder('📝 | Uso: `0w0 addcash @usuario <cantidad>` (puede ser negativa)');
    const v = jugador(otro.id);
    v.cash = Math.max(0, v.cash + n);
    return ctx.responder(`👑 | Listo. **${otro.nombre}** ahora tiene **${fmt(v.cash)}** ${M}`);
  },
});

// Tabla de nombres y alias → comando
const ALIAS = {};
for (const c of Object.values(COMANDOS)) {
  ALIAS[norm(c.nombre)] = c.nombre;
  for (const a of c.alias) ALIAS[norm(a)] = c.nombre;
}

// ─────────────── MENSAJES ───────────────
async function manejarMensaje(msg) {
  if (msg.author.bot || !msg.guild) return;
  const texto = msg.content.trim();
  if (texto.slice(0, PREFIJO.length).toLowerCase() !== PREFIJO) return;
  const resto = texto.slice(PREFIJO.length);
  if (resto && !/^\s/.test(resto)) return; // "owoo" o "owos" no cuentan
  const args = resto.trim().split(/\s+/).filter(Boolean);
  if (!args.length) {
    return msg.reply({ content: 'OwO 👀 Escribe `0w0 help` para ver los comandos.', allowedMentions: SIN_PINGS }).catch(() => {});
  }
  const nombre = ALIAS[norm(args.shift())];
  if (!nombre) return;

  const ctx = crearCtx(msg, nombre);
  try {
    await COMANDOS[nombre].run(ctx, args);
  } catch (err) {
    console.error(`❌ Error en 0w0 ${nombre}:`, err);
    await ctx.responder('❌ | Ocurrió un error con ese comando. Intenta de nuevo.').catch(() => {});
  }
  if (ctx.avisos.length) {
    await msg.channel.send({ content: ctx.avisos.join('\n'), allowedMentions: SIN_PINGS }).catch(() => {});
  }
  guardar();
}

// ─────────────── ARRANQUE ───────────────
function iniciarJuego(client, opciones = {}) {
  OWNER_ID = opciones.ownerId || null;
  cargarDatos();
  client.on(Events.MessageCreate, (msg) => {
    manejarMensaje(msg).catch((err) => console.error('❌ Error en el juego owo:', err));
  });
  client.once(Events.ClientReady, () => {
    setInterval(() => revisarLoteria(client).catch(() => {}), 60 * 1000);
    console.log(`🎮 Juego 0w0 listo (${Object.keys(COMANDOS).length} comandos, prefijo "${PREFIJO}")`);
  });
}

module.exports = { iniciarJuego, guardarDatos: guardarYa };
