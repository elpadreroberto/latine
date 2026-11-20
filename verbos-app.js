'use strict';

const $ = function (id) { return document.getElementById(id); };
const MARCAS = 'latine-verbos-marcas-v1';
const AJUSTES = 'latine-ajustes-v1';
const ORDEN = [4, 5, 6, 1, 2, 3];
const LIMITE_LISTA = 40;

const state = {
  verbos: null,
  conjugaciones: {},
  vista: 'menu',
  fase: 1,
  velocidad: 'medio',
  ayudaAbierta: false,
  grupo: 'base',
  sub: 1,
  voz: 'activa',
  modo: 'indicativo',
  tiempo: 'presente',
  mazo: [],
  cola: [],
  ultima: '',
  item: null,
  jugando: false,
  pausa: false,
  motivoPausa: '',
  puntos: 0,
  racha: 0,
  mejorRacha: 0,
  hechas: 0,
  aciertos: 0,
  tiempos: 0,
  fallosTecla: 0,
  vidas: 0,
  vidasMax: 0,
  tamano: 12,
  y: 18,
  inicioY: 18,
  ultimoT: 0,
  frame: 0,
  bucleActivo: false,
  sonido: false,
  reducir: false,
  consultaDesde: 0,
  avisoTimer: 0
};

function leer(clave, defecto) {
  try {
    const raw = localStorage.getItem(clave);
    return raw ? JSON.parse(raw) : defecto;
  } catch (e) {
    return defecto;
  }
}

function escribir(clave, valor) {
  try { localStorage.setItem(clave, JSON.stringify(valor)); } catch (e) { /* el juego sigue sin guardar */ }
}

function guardarAjustes() {
  const previos = leer(AJUSTES, {});
  previos.sonido = state.sonido;
  previos.velocidad = state.velocidad;
  previos.verbFase = state.fase;
  previos.verbVoz = state.voz;
  previos.verbModo = state.modo;
  previos.verbTiempo = state.tiempo;
  escribir(AJUSTES, previos);
}

function recorteTexto() {
  const voz = state.voz === 'pasiva' ? 'pasiva' : 'activa';
  return Verbos.modoPorId(state.modo).name.toLowerCase() + ' ' + Verbos.nombreTiempo(state.tiempo) + ', voz ' + voz;
}

function nombreNivel() {
  if (state.grupo === 'base') return 'Las seis personas';
  const info = Verbos.GRUPOS.filter(function (g) { return g.id === state.grupo; })[0];
  const titulo = info ? info.titulo : 'Verbos';
  const base = titulo + ' · nivel ' + state.sub;
  return state.fase === 2 ? 'Fase 2 · ' + base : base;
}

function claveMarca() {
  if (state.grupo === 'base') return (state.fase === 2 ? '2-' : '') + 'base-1';
  return (state.fase === 2 ? '2-' : '') + [state.grupo, state.sub, state.voz, state.modo, state.tiempo].join('-');
}

function mostrarVista(nombre) {
  state.vista = nombre;
  $('vista-menu').hidden = nombre !== 'menu';
  $('vista-juego').hidden = nombre !== 'juego';
  $('vista-consulta').hidden = nombre !== 'consulta';
  $('vista-resultado').hidden = nombre !== 'resultado';
  $('teclado').hidden = nombre !== 'juego';
  document.body.classList.toggle('jugando', nombre === 'juego');
  if (nombre !== 'juego') $('ayuda').hidden = true;
  pintarControles();
  pintarVidas();
  pintarTecladoModo();
}

function pintarControles() {
  const juego = state.vista === 'juego';
  const enBloque = state.motivoPausa === 'bloque';
  $('btn-pausa').hidden = !juego || enBloque;
  $('btn-reiniciar').hidden = !juego;
  $('btn-tabla').hidden = !(juego && state.grupo !== 'base' && state.fase === 1);
  $('btn-ayuda').hidden = !(juego && state.grupo !== 'base');
  $('btn-menu').hidden = state.vista === 'menu';
  $('btn-pausa').textContent = state.pausa ? 'Continuar' : 'Pausa';
  $('btn-tabla').setAttribute('aria-pressed', state.pausa && state.motivoPausa === 'tabla' ? 'true' : 'false');
  $('btn-ayuda').textContent = state.ayudaAbierta ? 'Ocultar ayuda' : 'Ayuda';
  $('btn-ayuda').setAttribute('aria-pressed', state.ayudaAbierta ? 'true' : 'false');
}

function pintarVelocidad() {
  document.querySelectorAll('[data-vel]').forEach(function (btn) {
    btn.classList.toggle('activo', btn.dataset.vel === state.velocidad);
    btn.setAttribute('aria-pressed', btn.dataset.vel === state.velocidad ? 'true' : 'false');
  });
}

function pintarFases() {
  $('btn-fase-1').classList.toggle('activo', state.fase === 1);
  $('btn-fase-2').classList.toggle('activo', state.fase === 2);
  $('btn-fase-1').setAttribute('aria-pressed', state.fase === 1 ? 'true' : 'false');
  $('btn-fase-2').setAttribute('aria-pressed', state.fase === 2 ? 'true' : 'false');
}

function pintarTecladoModo() {
  const fase2 = state.vista === 'juego' && state.fase === 2;
  $('forma-fase2').hidden = !fase2;
  $('atajos').textContent = fase2
    ? 'Escribe la forma o pulsa 1–6. Espacio pausa. Esc menú.'
    : 'Teclas 1 a 6. Espacio pausa. Esc menú.';
}

function pintarSonido() {
  const btn = $('btn-sonido');
  btn.textContent = state.sonido ? 'Sonido' : 'Silencio';
  btn.setAttribute('aria-pressed', state.sonido ? 'true' : 'false');
}

function pintarMarcador() {
  $('puntos').textContent = String(state.puntos);
  $('racha').textContent = String(state.racha);
}

function pintarVidas() {
  const caja = $('caja-vidas');
  caja.hidden = state.vidasMax <= 0 || state.vista !== 'juego';
  $('vidas').textContent = String(Math.max(0, state.vidas));
  caja.classList.toggle('urgente', state.vidasMax > 0 && state.vidas <= 1);
}

function pintarProgreso() {
  if (!state.jugando) return;
  $('estado').textContent = nombreNivel() + ' · ' + (state.hechas + 1) + ' / ' + state.tamano;
}

function aviso(texto, tipo) {
  const el = $('aviso');
  el.textContent = texto;
  el.className = 'aviso' + (tipo ? ' ' + tipo : '');
  clearTimeout(state.avisoTimer);
  const ms = tipo === 'mixto' || tipo === 'tiempo' ? 3200 : 1600;
  state.avisoTimer = setTimeout(function () {
    el.textContent = '';
    el.className = 'aviso';
  }, ms);
}

function tono(tipo) {
  if (!state.sonido) return;
  const AC = window.AudioContext || window.webkitAudioContext;
  if (!AC) return;
  try {
    if (!tono.ctx) tono.ctx = new AC();
    if (tono.ctx.state === 'suspended') tono.ctx.resume();
    const ahora = tono.ctx.currentTime;
    const notas = tipo === 'ok' ? [523.25, 659.25] : [174.61, 146.83];
    notas.forEach(function (freq, i) {
      const o = tono.ctx.createOscillator();
      const g = tono.ctx.createGain();
      o.type = 'triangle';
      o.frequency.value = freq;
      o.connect(g);
      g.connect(tono.ctx.destination);
      const t0 = ahora + i * 0.07;
      g.gain.setValueAtTime(0.0001, t0);
      g.gain.exponentialRampToValueAtTime(0.06, t0 + 0.02);
      g.gain.exponentialRampToValueAtTime(0.0001, t0 + 0.2);
      o.start(t0);
      o.stop(t0 + 0.22);
    });
  } catch (e) {
    state.sonido = false;
    pintarSonido();
  }
}

function personasDe(verbo) {
  if (!verbo) return null;
  return Verbos.celda(verbo, state.voz, state.modo, state.tiempo);
}

function filaPersona(persona, forma, opciones) {
  opciones = opciones || {};
  let texto = '—';
  let marca = '';
  if (forma) {
    if (opciones.ocultar) texto = '•••';
    else {
      texto = Verbos.escapar(forma);
      if (opciones.marcar && forma === opciones.marcar) marca = ' marca';
    }
  }
  return '<tr><th scope="row" class="c' + persona.id + marca + '">' + persona.id + ' ' + Verbos.escapar(persona.corto) + '</th><td class="latin' + marca + '" lang="la">' + texto + '</td></tr>';
}

function tablaSeis(verbo, opciones) {
  const personas = personasDe(verbo) || {};
  const filas = Verbos.PERSONAS.map(function (p) {
    return filaPersona(p, personas[p.key], opciones);
  }).join('');
  return '<div class="tabla-wrap"><table><thead><tr><th>Persona</th><th>' + Verbos.escapar(recorteTexto()) + '</th></tr></thead><tbody>' + filas + '</tbody></table></div>';
}

function valorLegible(valor) {
  if (valor == null || valor === '') return '—';
  if (typeof valor === 'string') return Verbos.escapar(valor);
  if (typeof valor !== 'object') return Verbos.escapar(valor);
  return Object.keys(valor).map(function (clave) {
    const texto = valorLegible(valor[clave]);
    return Verbos.escapar(clave) + ' ' + texto;
  }).join(', ');
}

function tablaVoz(verbo, voz) {
  const bloque = verbo.formas && verbo.formas[voz];
  if (!bloque) return '<p class="nota">Sin ' + (voz === 'pasiva' ? 'pasiva personal' : 'voz activa') + '.</p>';
  let html = '';
  Verbos.MODOS.forEach(function (modo) {
    const tiempos = bloque[modo.id];
    if (!tiempos || typeof tiempos !== 'object') return;
    const columnas = modo.tiempos.filter(function (tiempo) { return tiempos[tiempo] && typeof tiempos[tiempo] === 'object'; });
    if (!columnas.length) return;
    const cabeza = columnas.map(function (tiempo) { return '<th>' + Verbos.escapar(Verbos.nombreTiempo(tiempo)) + '</th>'; }).join('');
    const cuerpo = Verbos.PERSONAS.map(function (persona) {
      const celdas = columnas.map(function (tiempo) {
        const forma = tiempos[tiempo][persona.key];
        return '<td class="latin" lang="la">' + (forma ? Verbos.escapar(forma) : '—') + '</td>';
      }).join('');
      return '<tr><th scope="row">' + persona.id + ' ' + Verbos.escapar(persona.corto) + '</th>' + celdas + '</tr>';
    }).join('');
    html += '<h4>' + Verbos.escapar(modo.name) + '</h4><div class="tabla-wrap"><table><thead><tr><th>Persona</th>' + cabeza + '</tr></thead><tbody>' + cuerpo + '</tbody></table></div>';
  });
  return html || '<p class="nota">Sin formas personales.</p>';
}

function nominales(verbo) {
  const formas = verbo.formas || {};
  let html = '';
  ['infinitivos', 'participios', 'gerundio', 'supino'].forEach(function (clave) {
    const bloque = formas[clave];
    if (!bloque || typeof bloque !== 'object') return;
    const partes = Object.keys(bloque).map(function (k) {
      return '<li><strong>' + Verbos.escapar(k.replace(/_/g, ' ')) + '</strong> <span class="latin" lang="la">' + valorLegible(bloque[k]) + '</span></li>';
    }).join('');
    html += '<h4>' + Verbos.escapar(clave.charAt(0).toUpperCase() + clave.slice(1)) + '</h4><ul>' + partes + '</ul>';
  });
  return html;
}

function fichaVerbo(verbo) {
  const partes = Verbos.enunciado(verbo);
  const nota = verbo.notas ? '<p class="nota">' + Verbos.escapar(verbo.notas) + '</p>' : '';
  return '<p><span class="latin" lang="la">' + Verbos.escapar(partes) + '</span> · ' + Verbos.escapar(verbo.espanol) + '</p>' + nota;
}

function pintarAyuda() {
  const ayuda = $('ayuda');
  if (state.vista !== 'juego' || state.grupo === 'base' || !state.item || !state.item.verbos.length) {
    ayuda.hidden = true;
    ayuda.innerHTML = '';
    return;
  }
  ayuda.hidden = false;
  const lineas = state.item.verbos.map(fichaVerbo).join('');
  let tablas = '';
  if (state.ayudaAbierta) {
    const opciones = state.fase === 2 ? { ocultar: true } : { marcar: state.item.forma };
    const avisoAyuda = state.fase === 2
      ? '<p class="nota">Las formas quedan ocultas. Las seis teclas sí las muestran.</p>'
      : '<p class="nota">La forma que cae está marcada.</p>';
    tablas = avisoAyuda + state.item.verbos.map(function (verbo) {
      return '<div class="bloque-tabla">' + tablaSeis(verbo, opciones) + '</div>';
    }).join('');
  }
  ayuda.innerHTML = lineas + tablas;
}

function pintarEsquema() {
  $('esquema').innerHTML = Verbos.PERSONAS.map(function (p) {
    return '<li class="c' + p.id + '"><div><span class="num c' + p.id + '">' + p.id + '</span><strong>' + Verbos.escapar(p.name) + '</strong><small class="latin">' + Verbos.escapar(p.pronombre) + '</small></div></li>';
  }).join('');
}

function pintarTeclas(item) {
  $('teclas').innerHTML = ORDEN.map(function (id) {
    const persona = Verbos.personaPorId(id);
    if (state.fase === 2 && item) {
      const opt = (item.opciones || []).filter(function (o) { return o.personaId === id; })[0];
      if (!opt) {
        return '<button type="button" class="tecla" disabled><span class="num c' + id + '">' + id + '</span><span class="nombre">' + Verbos.escapar(persona.corto) + '</span><span class="forma">—</span></button>';
      }
      return '<button type="button" class="tecla" data-accion="persona" data-persona="' + id + '"><span class="num c' + id + '">' + id + '</span><span class="nombre">' + Verbos.escapar(persona.corto) + '</span><span class="forma latin" lang="la">' + Verbos.escapar(opt.forma) + '</span></button>';
    }
    return '<button type="button" class="tecla" data-accion="persona" data-persona="' + id + '"><span class="num c' + id + '">' + id + '</span><span class="nombre">' + Verbos.escapar(persona.name) + '</span><small class="latin">' + Verbos.escapar(persona.pronombre) + '</small></button>';
  }).join('');
}

function llenarTiempos() {
  const modo = Verbos.modoPorId(state.modo);
  state.tiempo = Verbos.tiempoValido(state.modo, state.tiempo);
  $('tiempo').innerHTML = modo.tiempos.map(function (tiempo) {
    const nombre = Verbos.nombreTiempo(tiempo);
    return '<option value="' + tiempo + '"' + (tiempo === state.tiempo ? ' selected' : '') + '>' + nombre.charAt(0).toUpperCase() + nombre.slice(1) + '</option>';
  }).join('');
  $('voz').value = state.voz;
  $('modo').value = state.modo;
}

function marcaDe(grupo, sub) {
  const anterior = state.grupo;
  const anteriorSub = state.sub;
  state.grupo = grupo;
  state.sub = sub;
  const marcas = leer(MARCAS, {});
  const valor = Number(marcas[claveMarca()] || 0);
  state.grupo = anterior;
  state.sub = anteriorSub;
  return valor;
}

function pintarMenu() {
  const niveles = $('menu-niveles');
  const mejorBase = marcaDe('base', 1);
  let html = '';
  if (state.fase === 1) {
    html += '<article class="base"><h3>Las seis personas</h3><p>Doce preguntas, sin vidas. Aprendes el lugar de cada tecla con las desinencias activas y pasivas. Al terminar puedes seguir con otras doce.</p><p><button type="button" class="boton principal" data-accion="empezar" data-grupo="base" data-sub="1">Jugar' + (mejorBase ? ' · mejor ' + mejorBase : '') + '</button></p></article>';
  } else {
    html += '<article class="base"><h3>Conjugar</h3><p>La ficha trae el enunciado y la persona. Escribe la forma, o la desinencia, o pulsa la tecla que la muestra. El recorte de abajo elige voz, modo y tiempo.</p></article>';
  }
  if (!state.verbos) {
    niveles.innerHTML = html;
    return;
  }
  html += Verbos.GRUPOS.map(function (info) {
    const botones = [1, 2, 3].map(function (sub) {
      const lista = Verbos.verbosDelNivel(state.verbos, info.id, sub);
      const mazo = state.fase === 2
        ? Verbos.armarMazoFase2(state.verbos, info.id, sub, state.voz, state.modo, state.tiempo)
        : Verbos.armarMazo(state.verbos, info.id, sub, state.voz, state.modo, state.tiempo);
      const ronda = Verbos.tamanoRonda(info.id, sub);
      const detalle = !mazo.length
        ? 'Sin formas en este recorte'
        : (sub === 1
          ? lista.map(function (v) { return Verbos.escapar(v.lema); }).join(' · ')
          : lista.length + ' verbos · ' + mazo.length + ' formas');
      const mejor = marcaDe(info.id, sub);
      const disabled = mazo.length ? '' : ' disabled';
      return '<button type="button" class="nivel n' + sub + '" data-accion="empezar" data-grupo="' + info.id + '" data-sub="' + sub + '"' + disabled + '><strong>Nivel ' + sub + '</strong><small>' + ronda + ' preguntas</small><small class="latin">' + detalle + '</small>' + (mejor ? '<small>Mejor: ' + mejor + '</small>' : '') + '</button>';
    }).join('');
    return '<article class="decl"><div><h3>' + info.titulo + '</h3><p>' + info.detalle + ' · 3 vidas</p></div><div class="niveles">' + botones + '</div></article>';
  }).join('');
  html += '<article class="consulta-card"><div><h3>Consulta</h3><p>' + state.verbos.length + ' verbos, con enunciado, paradigma y traducción.</p></div><button type="button" class="boton" data-accion="consulta">Abrir la lista</button></article>';
  niveles.innerHTML = html;
}

function factorVelocidad() {
  if (state.velocidad === 'lento') return 0.55;
  if (state.velocidad === 'rapido') return 1.55;
  return 1;
}

function duracionSegundos() {
  let base = 7.5;
  if (state.grupo !== 'base' && state.sub === 1) base = 8.5;
  if (state.grupo !== 'base' && state.sub === 2) base = 6.5;
  if (state.grupo !== 'base' && state.sub === 3) base = 5.2;
  let segundos = base - Math.min(state.racha * 0.18, 2.4);
  if (state.fase === 2) segundos *= 1.25;
  segundos /= factorVelocidad();
  return Math.max(state.velocidad === 'rapido' ? 2.2 : 3.4, segundos);
}

function medidaSuelo() {
  const arena = $('arena');
  const ficha = $('ficha');
  const alto = ficha.offsetHeight || 76;
  let suelo = arena.clientHeight - alto - 12;
  if (!(suelo > state.inicioY + 40)) suelo = state.inicioY + 220;
  return suelo;
}

function pintarTiempo(suelo) {
  const distancia = suelo - state.inicioY;
  const recorrido = distancia > 0 ? (state.y - state.inicioY) / distancia : 0;
  const queda = Math.max(0, Math.min(1, 1 - recorrido));
  const fill = $('tiempo-fill');
  fill.style.width = (queda * 100) + '%';
  fill.classList.toggle('urgente', queda < 0.28);
}

function colocarFicha() {
  $('ficha').style.top = state.reducir ? '18%' : state.y + 'px';
}

function pararBucle() {
  state.bucleActivo = false;
  if (state.frame) cancelAnimationFrame(state.frame);
  state.frame = 0;
}

function reanudarBucle() {
  if (state.bucleActivo || !state.jugando || state.pausa) return;
  state.bucleActivo = true;
  state.ultimoT = 0;
  state.frame = requestAnimationFrame(bucle);
}

function bucle(ts) {
  if (!state.bucleActivo || !state.jugando || state.pausa || !state.item) {
    state.bucleActivo = false;
    return;
  }
  if (!state.ultimoT) {
    state.ultimoT = ts;
    state.frame = requestAnimationFrame(bucle);
    return;
  }
  const dt = Math.min(0.05, (ts - state.ultimoT) / 1000);
  state.ultimoT = ts;
  const suelo = medidaSuelo();
  const distancia = Math.max(40, suelo - state.inicioY);
  state.y += (distancia / duracionSegundos()) * dt;
  colocarFicha();
  pintarTiempo(suelo);
  if (state.y >= suelo) {
    fallarPorTiempo();
    if (!state.bucleActivo || !state.jugando || state.pausa || !state.item) {
      state.bucleActivo = false;
      return;
    }
  }
  state.frame = requestAnimationFrame(bucle);
}

function enfocarEscrito() {
  if (state.fase !== 2 || state.reducir) return;
  if (!window.matchMedia('(min-width: 700px)').matches) return;
  const campo = $('escrito');
  if (campo && !$('forma-fase2').hidden) campo.focus();
}

function soltarSiguiente() {
  if (!state.cola.length) state.cola = Verbos.barajar(state.mazo, state.ultima);
  const item = state.cola.shift();
  state.item = item;
  state.ultima = item.firma || item.forma;
  $('ficha-palabra').textContent = item.forma;
  const pista = $('ficha-pista');
  pista.classList.remove('pedido');
  if (state.fase === 2) {
    pista.hidden = false;
    pista.classList.add('pedido');
    pista.textContent = item.pista + ' · ' + recorteTexto();
    pintarTeclas(item);
    $('escrito').value = '';
  } else if (state.grupo === 'base') {
    pista.hidden = false;
    pista.textContent = '¿Qué persona es?';
    pintarTeclas(null);
  } else {
    pista.hidden = false;
    pista.textContent = recorteTexto();
    pintarTeclas(null);
  }
  state.inicioY = 18;
  state.y = 18;
  colocarFicha();
  pintarAyuda();
  pintarProgreso();
  pintarTiempo(medidaSuelo());
  enfocarEscrito();
}

function guardarMarca() {
  const clave = claveMarca();
  const marcas = leer(MARCAS, {});
  const previa = Number(marcas[clave] || 0);
  const nueva = state.puntos > previa;
  if (nueva) {
    marcas[clave] = state.puntos;
    escribir(MARCAS, marcas);
  }
  return { mejor: Math.max(previa, state.puntos), nueva: nueva };
}

function terminarRonda(motivo) {
  state.jugando = false;
  state.pausa = false;
  state.item = null;
  pararBucle();
  $('velo-pausa').hidden = true;
  const marca = guardarMarca();
  const sig = Verbos.siguienteNivel(state.grupo, state.sub);
  const titulo = motivo === 'vidas' ? 'Se acabaron las vidas' : 'Ronda terminada';
  const detalle = motivo === 'vidas'
    ? 'Tres tiempos agotados. Puedes repetir este nivel con calma.'
    : 'Aciertos: ' + state.aciertos + ' de ' + state.tamano + '. Tiempos agotados: ' + state.tiempos + '.';
  let extra = '<p>' + recorteTexto().charAt(0).toUpperCase() + recorteTexto().slice(1) + '.</p>';
  if (state.fallosTecla > 0) extra += '<p>Teclas equivocadas: ' + state.fallosTecla + '. Mientras la forma baja, puedes corregir.</p>';
  extra += '<p>Mejor racha: ' + state.mejorRacha + '. Puntos: ' + state.puntos + '.</p>';
  extra += '<p>' + (marca.nueva ? 'Nueva mejor marca: ' + marca.mejor + '.' : 'Mejor marca de este nivel: ' + marca.mejor + '.') + '</p>';
  let botones = '<button type="button" class="boton principal" data-accion="reiniciar">Jugar otra vez</button>';
  if (sig) botones += '<button type="button" class="boton" data-accion="siguiente">' + textoSiguiente(sig) + '</button>';
  botones += '<button type="button" class="boton" data-accion="menu">Menú</button>';
  $('resultado-cuerpo').innerHTML = '<h2>' + titulo + '</h2><p>' + nombreNivel() + '</p><p>' + detalle + '</p>' + extra + '<div class="acciones">' + botones + '</div>';
  $('estado').textContent = nombreNivel();
  mostrarVista('resultado');
  pintarMenu();
}

function textoSiguiente(sig) {
  if (state.grupo === 'base') return 'Ir a los transitivos de la 1.ª';
  if (sig.grupo === state.grupo) return 'Siguiente nivel';
  const info = Verbos.GRUPOS.filter(function (g) { return g.id === sig.grupo; })[0];
  return info ? 'Ir a ' + info.titulo.toLowerCase() : 'Siguiente grupo';
}

function cerrarPregunta(porTiempo) {
  state.hechas += 1;
  if (porTiempo) {
    state.tiempos += 1;
    if (state.vidasMax > 0) {
      state.vidas -= 1;
      pintarVidas();
    }
  }
  if (state.vidasMax > 0 && state.vidas <= 0 && state.hechas < state.tamano) {
    terminarRonda('vidas');
    return;
  }
  if (state.grupo === 'base' && state.hechas >= state.tamano && state.hechas % 12 === 0) {
    mostrarBloque();
    return;
  }
  if (state.hechas >= state.tamano) {
    terminarRonda('ronda');
    return;
  }
  soltarSiguiente();
  reanudarBucle();
}

function mostrarBloque() {
  state.pausa = true;
  state.motivoPausa = 'bloque';
  state.item = null;
  pararBucle();
  guardarMarca();
  tono('ok');
  $('estado').textContent = 'Doce preguntas hechas';
  pintarOverlay();
}

function fallarPorTiempo() {
  if (!state.item) return;
  const item = state.item;
  state.item = null;
  state.racha = 0;
  pintarMarcador();
  tono('mal');
  if (state.fase === 2) {
    aviso('Se acabó el tiempo. Era ' + item.objetivo + ' (' + item.pista.toLowerCase() + ', tecla ' + item.personaId + ').', 'tiempo');
  } else {
    aviso('Se acabó el tiempo. Servía: ' + Verbos.textoPersonas(item.entradas).join(', ') + '.', 'tiempo');
  }
  cerrarPregunta(true);
}

function flashTecla(personaId, tipo) {
  const btn = document.querySelector('.tecla[data-persona="' + personaId + '"]');
  if (!btn) return;
  btn.classList.remove('ok', 'mal', 'revelada');
  void btn.offsetWidth;
  btn.classList.add(tipo);
  setTimeout(function () { btn.classList.remove(tipo); }, tipo === 'revelada' ? 800 : 240);
}

function sacudir() {
  if (state.reducir) return;
  const ficha = $('ficha');
  ficha.classList.remove('sacudir');
  void ficha.offsetWidth;
  ficha.classList.add('sacudir');
}

function sumarAcierto(base) {
  state.item = null;
  state.puntos += base;
  state.racha += 1;
  state.aciertos += 1;
  if (state.racha > state.mejorRacha) state.mejorRacha = state.racha;
  let extra = '';
  if (state.racha % 5 === 0) {
    state.puntos += 1;
    extra = ' Racha de ' + state.racha + ': punto extra.';
  }
  pintarMarcador();
  tono('ok');
  return extra;
}

function anotarFallo() {
  state.racha = 0;
  state.fallosTecla += 1;
  pintarMarcador();
  tono('mal');
}

function responder(personaId) {
  if (!state.jugando || state.pausa || !state.item || state.fase !== 1) return;
  const item = state.item;
  const fallo = Verbos.juzgar(item, personaId);
  if (fallo.vale) {
    const extra = sumarAcierto(1);
    flashTecla(personaId, 'ok');
    let msg = 'Bien. +1.';
    const otras = Verbos.textoPersonas(fallo.otras);
    if (otras.length) msg += ' También ' + otras.join(', ') + '.';
    aviso(msg + extra, otras.length ? 'mixto' : 'ok');
    cerrarPregunta(false);
    return;
  }
  anotarFallo();
  flashTecla(personaId, 'mal');
  sacudir();
  const persona = Verbos.personaPorId(personaId);
  aviso('No. El ' + personaId + ' es la ' + persona.name.toLowerCase() + '.', 'mal');
}

function responderFase2(personaId) {
  if (!state.jugando || state.pausa || !state.item || state.fase !== 2) return;
  const item = state.item;
  const elegida = (item.opciones || []).filter(function (o) { return o.personaId === personaId; })[0];
  if (!elegida) return;
  if (Verbos.juzgarPersona(item, personaId)) {
    const extra = sumarAcierto(1);
    flashTecla(personaId, 'ok');
    aviso('Bien. +1. ' + item.objetivo + '.' + extra, 'ok');
    cerrarPregunta(false);
    return;
  }
  anotarFallo();
  flashTecla(personaId, 'mal');
  flashTecla(item.personaId, 'revelada');
  sacudir();
  aviso('No. Era ' + item.objetivo + ', tecla ' + item.personaId + '.', 'mal');
}

function responderEscrito(texto) {
  if (!state.jugando || state.pausa || !state.item || state.fase !== 2) return;
  if (!Verbos.normalizarEscrito(texto)) return;
  const item = state.item;
  const juicio = Verbos.juzgarEscrito(item, texto);
  if (juicio.vale) {
    const extra = sumarAcierto(2);
    const como = juicio.completo ? 'La forma completa vale.' : 'La desinencia vale: ' + item.objetivo + '.';
    aviso('Bien. +2. ' + como + extra, 'ok');
    $('escrito').value = '';
    cerrarPregunta(false);
    return;
  }
  anotarFallo();
  sacudir();
  const pistaDes = juicio.desinencia ? ' También vale la desinencia ' + juicio.desinencia + '.' : '';
  aviso('No. Era ' + item.objetivo + '.' + pistaDes, 'mal');
  $('escrito').select();
}

function pintarOverlay() {
  const velo = $('velo-pausa');
  const simple = $('pausa-simple');
  const tabla = $('pausa-tabla');
  const bloque = $('pausa-bloque');
  if (!state.pausa) {
    velo.hidden = true;
    pintarControles();
    return;
  }
  velo.hidden = false;
  const esTabla = state.motivoPausa === 'tabla' && state.item;
  const esBloque = state.motivoPausa === 'bloque';
  simple.hidden = esTabla || esBloque;
  tabla.hidden = !esTabla;
  bloque.hidden = !esBloque;
  if (esTabla) {
    const bloques = state.item.verbos.map(function (verbo) {
      return '<div class="bloque-tabla">' + fichaVerbo(verbo) + tablaSeis(verbo) + '</div>';
    }).join('');
    const muestra = state.fase === 2 ? state.item.forma : state.item.forma;
    tabla.innerHTML = '<p class="forma-grande latin" lang="la">' + Verbos.escapar(muestra) + '</p><p>Busca la persona en la tabla. No está marcada. Luego continúa y pulsa la tecla.</p>' + bloques + '<button type="button" class="boton principal" data-accion="continuar">Continuar</button>';
  }
  if (esBloque) {
    bloque.innerHTML = '<h2>Doce preguntas hechas</h2><p>Llevas ' + state.puntos + ' puntos. La racha es ' + state.racha + '.</p><p>Puedes seguir con otras doce o pasar a los transitivos de la primera conjugación.</p><div class="acciones"><button type="button" class="boton principal" data-accion="seguir">Seguir con doce más</button><button type="button" class="boton" data-accion="siguiente">Ir a los transitivos de la 1.ª</button><button type="button" class="boton" data-accion="menu">Menú</button></div>';
  }
  pintarControles();
}

function pausar(opciones) {
  const forzar = opciones && opciones.forzar;
  if (!state.jugando || state.motivoPausa === 'bloque') return;
  if (state.pausa && forzar) return;
  if (state.pausa) {
    reanudar();
    return;
  }
  state.pausa = true;
  state.motivoPausa = 'pausa';
  pararBucle();
  pintarOverlay();
}

function reanudar() {
  if (!state.jugando) return;
  state.pausa = false;
  state.motivoPausa = '';
  state.ultimoT = 0;
  pintarOverlay();
  reanudarBucle();
}

function abrirTabla() {
  if (!state.jugando || state.grupo === 'base' || state.fase !== 1 || !state.item) return;
  if (state.pausa && state.motivoPausa === 'tabla') {
    reanudar();
    return;
  }
  state.pausa = true;
  state.motivoPausa = 'tabla';
  pararBucle();
  pintarOverlay();
}

function empezar(grupo, sub) {
  if (state.fase === 2 && grupo === 'base') return false;
  if (grupo !== 'base' && !state.verbos) return false;
  pararBucle();
  const mazo = state.fase === 2
    ? Verbos.armarMazoFase2(state.verbos || [], grupo, sub, state.voz, state.modo, state.tiempo)
    : Verbos.armarMazo(state.verbos || [], grupo, sub, state.voz, state.modo, state.tiempo);
  if (!mazo.length) {
    aviso('Este recorte no tiene formas.', 'mal');
    return false;
  }
  state.grupo = grupo;
  state.sub = sub;
  state.mazo = mazo;
  state.cola = [];
  state.ultima = '';
  state.item = null;
  state.puntos = 0;
  state.racha = 0;
  state.mejorRacha = 0;
  state.hechas = 0;
  state.aciertos = 0;
  state.tiempos = 0;
  state.fallosTecla = 0;
  state.vidasMax = Verbos.vidasDe(grupo);
  state.vidas = state.vidasMax;
  state.tamano = Verbos.tamanoRonda(grupo, sub);
  state.jugando = true;
  state.pausa = false;
  state.motivoPausa = '';
  $('velo-pausa').hidden = true;
  $('aviso').textContent = '';
  $('aviso').className = 'aviso';
  mostrarVista('juego');
  pintarMarcador();
  soltarSiguiente();
  reanudarBucle();
  if (!state.reducir) $('arena').scrollIntoView({ block: 'center', behavior: 'smooth' });
  return true;
}

function seguirPracticando() {
  if (state.motivoPausa !== 'bloque') return;
  state.tamano += 12;
  state.pausa = false;
  state.motivoPausa = '';
  state.jugando = true;
  $('velo-pausa').hidden = true;
  mostrarVista('juego');
  soltarSiguiente();
  reanudarBucle();
}

function irAlMenu() {
  if (state.grupo === 'base' && state.fase === 1 && state.hechas >= 12) guardarMarca();
  state.jugando = false;
  state.pausa = false;
  state.motivoPausa = '';
  state.item = null;
  pararBucle();
  $('velo-pausa').hidden = true;
  $('estado').textContent = state.verbos
    ? state.verbos.length + ' verbos · elige un nivel'
    : 'Elige un nivel';
  mostrarVista('menu');
  pintarVidas();
  pintarMenu();
}

function abrirConsulta() {
  if (!state.verbos) return;
  state.jugando = false;
  state.pausa = false;
  state.motivoPausa = '';
  pararBucle();
  state.consultaDesde = 0;
  mostrarVista('consulta');
  $('estado').textContent = 'Consulta de los verbos';
  pintarConsulta();
  $('buscar').focus();
}

function conjugacionNombre(id) {
  const info = state.conjugaciones[String(id)];
  if (info && info.nombre) return info.nombre;
  if (id === 'irregular') return 'irregular';
  return String(id);
}

function pintarConsulta() {
  const q = $('buscar').value;
  const grupo = $('filtro-grupo').value;
  const conjugacion = $('filtro-conj').value;
  const tipo = $('filtro-tipo').value;
  const hallados = Verbos.buscar(state.verbos, q, grupo, conjugacion, tipo);
  const fin = state.consultaDesde + LIMITE_LISTA;
  const trozo = hallados.slice(0, fin);
  $('consulta-cuenta').textContent = hallados.length
    ? 'Mostrando ' + trozo.length + ' de ' + hallados.length
    : 'Ningún verbo coincide.';
  $('consulta-lista').innerHTML = trozo.map(function (verbo) {
    const marca = verbo.notas ? ' · nota' : '';
    return '<article class="tarjeta"><button type="button" class="tarjeta-abre" data-accion="abrir-tarjeta" aria-expanded="false"><span class="latin" lang="la">' + Verbos.escapar(Verbos.enunciado(verbo)) + '</span><span>' + Verbos.escapar(conjugacionNombre(verbo.conjugacion)) + ' · ' + Verbos.escapar(verbo.tipo) + ' · ' + Verbos.escapar(verbo.espanol) + marca + '</span></button><div class="tarjeta-cuerpo" hidden><h3>Voz activa</h3>' + tablaVoz(verbo, 'activa') + '<h3>Voz pasiva</h3>' + tablaVoz(verbo, 'pasiva') + nominales(verbo) + '</div></article>';
  }).join('') + (fin < hallados.length ? '<button type="button" class="boton mas" data-accion="mas">Ver más</button>' : '');
}

function alPulsar(accion, btn) {
  if (accion === 'sonido') {
    state.sonido = !state.sonido;
    guardarAjustes();
    pintarSonido();
    if (state.sonido) tono('ok');
    return;
  }
  if (accion === 'menu') { irAlMenu(); return; }
  if (accion === 'consulta') { abrirConsulta(); return; }
  if (accion === 'fase') {
    if (state.jugando) return;
    state.fase = Number(btn.dataset.fase) === 2 ? 2 : 1;
    guardarAjustes();
    pintarFases();
    pintarMenu();
    return;
  }
  if (accion === 'velocidad') {
    const vel = btn.dataset.vel;
    if (vel !== 'lento' && vel !== 'medio' && vel !== 'rapido') return;
    state.velocidad = vel;
    guardarAjustes();
    pintarVelocidad();
    return;
  }
  if (accion === 'ayuda') {
    if (!state.jugando || state.grupo === 'base') return;
    state.ayudaAbierta = !state.ayudaAbierta;
    pintarAyuda();
    pintarControles();
    return;
  }
  if (accion === 'empezar') {
    if (btn.disabled) return;
    empezar(btn.dataset.grupo, Number(btn.dataset.sub));
    return;
  }
  if (accion === 'pausa') { pausar(); return; }
  if (accion === 'continuar') { reanudar(); return; }
  if (accion === 'seguir') { seguirPracticando(); return; }
  if (accion === 'tabla') { abrirTabla(); return; }
  if (accion === 'reiniciar') { empezar(state.grupo, state.sub); return; }
  if (accion === 'siguiente') {
    const sig = Verbos.siguienteNivel(state.grupo, state.sub);
    if (sig) empezar(sig.grupo, sig.subnivel);
    return;
  }
  if (accion === 'persona') {
    const id = Number(btn.dataset.persona);
    if (state.fase === 2) responderFase2(id);
    else responder(id);
    return;
  }
  if (accion === 'abrir-tarjeta') {
    const cuerpo = btn.parentElement.querySelector('.tarjeta-cuerpo');
    cuerpo.hidden = !cuerpo.hidden;
    btn.setAttribute('aria-expanded', cuerpo.hidden ? 'false' : 'true');
    return;
  }
  if (accion === 'mas') {
    state.consultaDesde += LIMITE_LISTA;
    pintarConsulta();
  }
}

function escribiendo(e) {
  const tag = e.target && e.target.tagName;
  return tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT';
}

function alTeclado(e) {
  if (e.repeat) return;
  if (escribiendo(e)) {
    if (e.key === 'Escape' && state.vista === 'juego' && state.fase === 2 && $('escrito').value) {
      e.preventDefault();
      $('escrito').value = '';
      return;
    }
    if (e.key !== 'Escape') return;
  }
  if (e.key === 'Escape') {
    if (state.vista === 'consulta' && $('buscar').value) {
      $('buscar').value = '';
      state.consultaDesde = 0;
      pintarConsulta();
      return;
    }
    if (state.vista !== 'menu') {
      e.preventDefault();
      irAlMenu();
    }
    return;
  }
  if (!state.jugando) return;
  if (e.code === 'Space') {
    e.preventDefault();
    pausar();
    return;
  }
  if (state.pausa) return;
  if (e.key >= '1' && e.key <= '6') {
    e.preventDefault();
    const id = Number(e.key);
    if (state.fase === 2) responderFase2(id);
    else responder(id);
  }
}

function verboValido(verbo) {
  return verbo && typeof verbo.lema === 'string' && verbo.formas && verbo.formas.activa && verbo.conjugacion != null;
}

function arrancar(data) {
  state.verbos = data.verbos;
  state.conjugaciones = data.conjugaciones || {};
  $('carga').hidden = true;
  if (state.vista === 'menu') $('estado').textContent = data.verbos.length + ' verbos · elige un nivel';
  pintarMenu();
}

function fallarCarga(mensaje) {
  $('carga').hidden = false;
  $('carga').textContent = mensaje;
  $('estado').textContent = 'Puedes practicar las seis personas';
  pintarMenu();
}

function iniciar() {
  state.reducir = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const ajustes = leer(AJUSTES, {});
  state.sonido = !!ajustes.sonido;
  if (ajustes.velocidad === 'lento' || ajustes.velocidad === 'medio' || ajustes.velocidad === 'rapido') {
    state.velocidad = ajustes.velocidad;
  }
  if (ajustes.verbFase === 2) state.fase = 2;
  if (ajustes.verbVoz === 'pasiva') state.voz = 'pasiva';
  if (ajustes.verbModo === 'indicativo' || ajustes.verbModo === 'subjuntivo' || ajustes.verbModo === 'imperativo') {
    state.modo = ajustes.verbModo;
  }
  if (ajustes.verbTiempo) state.tiempo = Verbos.tiempoValido(state.modo, ajustes.verbTiempo);
  pintarSonido();
  pintarVelocidad();
  pintarFases();
  llenarTiempos();
  pintarEsquema();
  pintarTeclas(null);
  pintarMenu();
  $('forma-fase2').addEventListener('submit', function (e) {
    e.preventDefault();
    responderEscrito($('escrito').value);
  });
  document.body.addEventListener('click', function (e) {
    const btn = e.target.closest('[data-accion]');
    if (!btn || btn.disabled) return;
    alPulsar(btn.dataset.accion, btn);
  });
  document.addEventListener('keydown', alTeclado);
  document.addEventListener('visibilitychange', function () {
    if (document.hidden && state.jugando) pausar({ forzar: true });
  });
  $('voz').addEventListener('change', function () {
    state.voz = $('voz').value === 'pasiva' ? 'pasiva' : 'activa';
    guardarAjustes();
    pintarMenu();
  });
  $('modo').addEventListener('change', function () {
    state.modo = $('modo').value;
    state.tiempo = Verbos.tiempoValido(state.modo, state.tiempo);
    llenarTiempos();
    guardarAjustes();
    pintarMenu();
  });
  $('tiempo').addEventListener('change', function () {
    state.tiempo = Verbos.tiempoValido(state.modo, $('tiempo').value);
    guardarAjustes();
    pintarMenu();
  });
  $('buscar').addEventListener('input', function () {
    state.consultaDesde = 0;
    pintarConsulta();
  });
  ['filtro-grupo', 'filtro-conj', 'filtro-tipo'].forEach(function (id) {
    $(id).addEventListener('change', function () {
      state.consultaDesde = 0;
      pintarConsulta();
    });
  });

  fetch('verbos.json', { cache: 'no-cache' })
    .then(function (res) {
      if (!res.ok) throw new Error('http');
      return res.json();
    })
    .then(function (data) {
      const verbos = (data && data.verbos || []).filter(verboValido);
      if (verbos.length < 900) throw new Error('corto');
      arrancar({ verbos: verbos, conjugaciones: data.conjugaciones || {} });
    })
    .catch(function () {
      fallarCarga('No pude abrir verbos.json. Abre Latine desde la página publicada. Si lo abres como archivo suelto, el navegador no deja leer los verbos.');
    });
}

iniciar();
