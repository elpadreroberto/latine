'use strict';

const $ = function (id) { return document.getElementById(id); };
const MARCAS = 'latine-marcas-v1';
const AJUSTES = 'latine-ajustes-v1';
const ORDEN_TECLAS = [4, 5, 6, 1, 2, 3];
const LIMITE_LISTA = 40;

const ATAJOS_FASE1 = 'Teclas 1 a 6. 0 plural. Espacio pausa. Esc menú.';
const ATAJOS_FASE2 = '1–6 singular. 7 8 9 nominativo, vocativo y acusativo plural. 0 genitivo plural. − dativo plural. + ablativo plural. Espacio pausa. Esc menú.';
const TECLAS_FASE2 = { '1': 0, '2': 1, '3': 2, '4': 3, '5': 4, '6': 5, '7': 6, '8': 7, '9': 8, '0': 9, '-': 10, '−': 10, '+': 11, '=': 11 };

const state = {
  palabras: null,
  vista: 'menu',
  fase: 1,
  velocidad: 'medio',
  ayudaAbierta: false,
  decl: 0,
  sub: 1,
  mazo: [],
  cola: [],
  ultima: '',
  item: null,
  jugando: false,
  pausa: false,
  motivoPausa: '',
  plural: false,
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
  y: -80,
  inicioY: -80,
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

function nombreNivel() {
  const base = state.decl === 0 ? 'Los seis casos' : state.decl + '.ª declinación · nivel ' + state.sub;
  if (state.fase === 2) return 'Fase 2 · ' + base;
  return base;
}

function claveMarca(decl, sub) {
  return (state.fase === 2 ? '2-' : '') + decl + '-' + sub;
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
}

function pintarControles() {
  const juego = state.vista === 'juego';
  const enBloque = state.motivoPausa === 'bloque';
  $('btn-pausa').hidden = !juego || enBloque;
  $('btn-reiniciar').hidden = !juego;
  $('btn-tabla').hidden = !(juego && state.decl > 0 && state.fase === 1);
  $('btn-ayuda').hidden = !(juego && state.decl > 0);
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

function guardarAjustes() {
  const previos = leer(AJUSTES, {});
  previos.sonido = state.sonido;
  previos.velocidad = state.velocidad;
  previos.fase = state.fase;
  escribir(AJUSTES, previos);
}

function pintarTecladoModo() {
  const fase2 = state.vista === 'juego' && state.fase === 2;
  $('forma-fase2').hidden = !fase2;
  $('teclas-fase2').hidden = !fase2;
  $('teclas').hidden = fase2;
  $('barra-plural').hidden = fase2 || state.decl === 0 || state.vista !== 'juego';
  $('atajos').textContent = fase2 ? ATAJOS_FASE2 : ATAJOS_FASE1;
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

function celdaForma(forma, opciones) {
  if (!forma) return '—';
  if (opciones.ocultar) return '•••';
  return Latine.escapar(forma);
}

function tablaHTML(palabra, opciones) {
  opciones = opciones || {};
  const sg = palabra.formas && palabra.formas.singular;
  const pl = palabra.formas && palabra.formas.plural;
  const filas = Latine.CASOS.map(function (c) {
    const formaSg = sg && sg[c.key];
    const formaPl = pl && pl[c.key];
    const a = celdaForma(formaSg, opciones);
    const b = celdaForma(formaPl, opciones);
    const marcaFila = opciones.marcar && ((formaSg && formaSg === opciones.marcar) || (formaPl && formaPl === opciones.marcar));
    const teclaPl = Latine.teclaDeIndice(c.id + 5);
    const rotulo = opciones.ocultar
      ? c.id + ' / ' + teclaPl + ' ' + Latine.escapar(c.name)
      : c.id + ' ' + Latine.escapar(c.name);
    const marcaSg = (opciones.marcar && formaSg === opciones.marcar) ? ' marca' : '';
    const marcaPl = (opciones.marcar && formaPl === opciones.marcar) ? ' marca' : '';
    return '<tr data-caso="' + c.id + '"><th scope="row" class="c' + c.id + (marcaFila ? ' marca' : '') + '">' + rotulo + '</th><td class="latin' + marcaSg + '" lang="la">' + a + '</td><td class="latin' + marcaPl + '" lang="la">' + b + '</td></tr>';
  }).join('');
  let extra = '';
  if (!pl) extra += '<p class="nota">Sin plural en el uso clásico.</p>';
  if (!sg) extra += '<p class="nota">Solo se usa en plural.</p>';
  if (palabra.notas) extra += '<p class="nota">' + Latine.escapar(palabra.notas) + '</p>';
  return '<div class="tabla-wrap"><table><thead><tr><th>Caso</th><th>Singular</th><th>Plural</th></tr></thead><tbody>' + filas + '</tbody></table></div>' + extra;
}

function pintarAyuda() {
  const ayuda = $('ayuda');
  if (state.vista !== 'juego' || state.decl === 0 || !state.item || !state.item.palabras.length) {
    ayuda.hidden = true;
    ayuda.innerHTML = '';
    return;
  }
  ayuda.hidden = false;
  const lineas = state.item.palabras.map(function (w) {
    const marcas = [];
    if (w.tema_i) marcas.push('tema en -i');
    if (w.sin_plural || !w.formas || !w.formas.plural) marcas.push('sin plural clásico');
    if (w.sin_singular || !w.formas || !w.formas.singular) marcas.push('solo plural');
    const extra = marcas.length ? ' · ' + marcas.join(' · ') : '';
    const nota = w.notas ? '<br><span class="nota">' + Latine.escapar(w.notas) + '</span>' : '';
    return '<p><span class="latin" lang="la">' + Latine.escapar(w.lema) + ', ' + Latine.escapar(w.genitivo) + '</span> (' + Latine.generoCorto(w.genero) + ') ' + Latine.escapar(w.espanol) + extra + nota + '</p>';
  }).join('');
  let tablas = '';
  if (state.ayudaAbierta) {
    const opciones = state.fase === 2
      ? { ocultar: true }
      : { marcar: state.item.forma };
    const avisoAyuda = state.fase === 2
      ? '<p class="nota">Las formas quedan ocultas. Las doce teclas sí las muestran.</p>'
      : '<p class="nota">La forma que cae está marcada.</p>';
    tablas = avisoAyuda + state.item.palabras.map(function (w) {
      return '<div class="bloque-tabla">' + tablaHTML(w, opciones) + '</div>';
    }).join('');
  }
  ayuda.innerHTML = lineas + tablas;
}

function pintarEsquema() {
  $('esquema').innerHTML = Latine.CASOS.map(function (c) {
    return '<li class="c' + c.id + '"><div><span class="num c' + c.id + '">' + c.id + '</span><strong>' + Latine.escapar(c.name) + '</strong><small>' + Latine.escapar(c.role) + '</small></div><span class="signo c' + c.id + '">' + Latine.escapar(c.sign) + '</span></li>';
  }).join('');
}

function pintarTeclas() {
  $('teclas').innerHTML = ORDEN_TECLAS.map(function (id) {
    const c = Latine.CASOS[id - 1];
    return '<button type="button" class="tecla" data-accion="caso" data-caso="' + c.id + '"><span class="num c' + c.id + '">' + c.id + ' <span class="signo">' + Latine.escapar(c.sign) + '</span></span><span class="nombre">' + Latine.escapar(c.name) + '</span></button>';
  }).join('');
}

function marcaDe(decl, sub) {
  const marcas = leer(MARCAS, {});
  return Number(marcas[claveMarca(decl, sub)] || 0);
}

function pintarMenu() {
  const niveles = $('menu-niveles');
  const mejorBase = marcaDe(0, 1);
  let html = '';
  if (state.fase === 1) {
    html += '<article class="base"><h3>Los seis casos</h3><p>Doce preguntas, sin vidas. Así aprendes el lugar de cada tecla. Arriba van 4, 5 y 6; abajo, 1, 2 y 3. Al terminar puedes seguir con otras doce.</p><p><button type="button" class="boton principal" data-accion="empezar" data-decl="0" data-sub="1">Jugar' + (mejorBase ? ' · mejor ' + mejorBase : '') + '</button></p></article>';
  } else {
    html += '<article class="base"><h3>Declinar</h3><p>La ficha trae la entrada del diccionario y el caso. Escribe la forma, o la desinencia, o pulsa la tecla que la muestra. Escribir suma dos puntos. La tecla suma uno.</p></article>';
  }

  if (!state.palabras) {
    niveles.innerHTML = html;
    return;
  }

  const titulos = [
    { n: 1, t: '1.ª declinación', d: 'Temas en -a' },
    { n: 2, t: '2.ª declinación', d: 'Temas en -o' },
    { n: 3, t: '3.ª declinación', d: 'Consonante y tema en -i' },
    { n: 4, t: '4.ª declinación', d: 'Temas en -u' },
    { n: 5, t: '5.ª declinación', d: 'Temas en -ē' }
  ];

  html += titulos.map(function (info) {
    const botones = [1, 2, 3].map(function (sub) {
      const palabras = Latine.palabrasDelNivel(state.palabras, info.n, sub);
      const mazo = state.fase === 2
        ? Latine.armarMazoFase2(state.palabras, info.n, sub)
        : Latine.armarMazo(state.palabras, info.n, sub);
      const ronda = Latine.tamanoRonda(info.n, sub);
      const detalle = sub === 1
        ? palabras.map(function (w) { return Latine.escapar(w.lema); }).join(' · ')
        : palabras.length + ' palabras · ' + mazo.length + (state.fase === 2 ? ' preguntas' : ' formas');
      const mejor = marcaDe(info.n, sub);
      return '<button type="button" class="nivel n' + sub + '" data-accion="empezar" data-decl="' + info.n + '" data-sub="' + sub + '"><strong>Nivel ' + sub + '</strong><small>' + ronda + ' preguntas</small><small class="latin">' + detalle + '</small>' + (mejor ? '<small>Mejor: ' + mejor + '</small>' : '') + '</button>';
    }).join('');
    return '<article class="decl"><div><h3>' + info.t + '</h3><p>' + info.d + ' · 3 vidas</p></div><div class="niveles">' + botones + '</div></article>';
  }).join('');

  html += '<article class="consulta-card"><div><h3>Consulta</h3><p>' + state.palabras.length + ' sustantivos, con paradigma y traducción.</p></div><button type="button" class="boton" data-accion="consulta">Abrir la lista</button></article>';
  niveles.innerHTML = html;
}

function medidaSuelo() {
  const arena = $('arena');
  const ficha = $('ficha');
  const alto = ficha.offsetHeight || 76;
  let suelo = arena.clientHeight - alto - 12;
  if (!(suelo > state.inicioY + 40)) suelo = state.inicioY + 220;
  return suelo;
}

function factorVelocidad() {
  if (state.velocidad === 'lento') return 0.55;
  if (state.velocidad === 'rapido') return 1.55;
  return 1;
}

function duracionSegundos() {
  let base = 7.5;
  if (state.decl > 0 && state.sub === 1) base = 8.5;
  if (state.decl > 0 && state.sub === 2) base = 6.5;
  if (state.decl > 0 && state.sub === 3) base = 5.2;
  let segundos = base - Math.min(state.racha * 0.18, 2.4);
  if (state.fase === 2) segundos *= 1.25;
  segundos /= factorVelocidad();
  const suelo = state.velocidad === 'rapido' ? 2.2 : 3.4;
  return Math.max(suelo, segundos);
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
  const ficha = $('ficha');
  ficha.style.top = state.reducir ? '18%' : state.y + 'px';
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

function pintarTeclasFase2(item) {
  $('teclas-fase2').innerHTML = Latine.RANURAS.map(function (ranura) {
    const opt = item.opciones.find(function (o) { return o.indice === ranura.indice; });
    const plural = ranura.numero === 'plural' ? ' plural' : '';
    if (!opt) {
      return '<button type="button" class="ranura' + plural + '" disabled><span class="clave">' + Latine.escapar(ranura.tecla) + '</span><span class="corto">' + Latine.escapar(ranura.corto) + '</span><span class="forma">—</span></button>';
    }
    return '<button type="button" class="ranura' + plural + '" data-accion="ranura" data-indice="' + ranura.indice + '"><span class="clave">' + Latine.escapar(ranura.tecla) + '</span><span class="corto">' + Latine.escapar(ranura.corto) + '</span><span class="forma latin" lang="la">' + Latine.escapar(opt.forma) + '</span></button>';
  }).join('');
}

function enfocarEscrito() {
  if (state.fase !== 2 || state.reducir) return;
  if (!window.matchMedia('(min-width: 700px)').matches) return;
  const campo = $('escrito');
  if (campo && !campo.hidden && !$('forma-fase2').hidden) campo.focus();
}

function soltarSiguiente() {
  if (!state.cola.length) state.cola = Latine.barajar(state.mazo, state.ultima);
  const item = state.cola.shift();
  state.item = item;
  state.ultima = item.firma || item.forma;
  state.plural = false;
  pintarPlural();
  $('ficha-palabra').textContent = item.forma;
  const pista = $('ficha-pista');
  pista.classList.remove('pedido');
  if (state.fase === 2) {
    pista.hidden = false;
    pista.classList.add('pedido');
    pista.textContent = item.pista;
    pintarTeclasFase2(item);
    $('escrito').value = '';
  } else if (state.decl === 0) {
    pista.hidden = false;
    pista.textContent = '¿Qué número es?';
  } else {
    pista.hidden = true;
    pista.textContent = '';
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
  const clave = claveMarca(state.decl, state.sub);
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
  const sig = Latine.siguienteNivel(state.decl, state.sub);
  const titulo = motivo === 'vidas' ? 'Se acabaron las vidas' : 'Ronda terminada';
  const detalle = motivo === 'vidas'
    ? 'Tres tiempos agotados. Puedes repetir este nivel con calma.'
    : 'Aciertos: ' + state.aciertos + ' de ' + state.tamano + '. Tiempos agotados: ' + state.tiempos + '.';
  let extra = '';
  if (state.fallosTecla > 0) extra += '<p>Teclas equivocadas: ' + state.fallosTecla + '. Mientras la palabra baja, puedes corregir.</p>';
  extra += '<p>Mejor racha: ' + state.mejorRacha + '. Puntos: ' + state.puntos + '.</p>';
  extra += '<p>' + (marca.nueva ? 'Nueva mejor marca: ' + marca.mejor + '.' : 'Mejor marca de este nivel: ' + marca.mejor + '.') + '</p>';
  let botones = '<button type="button" class="boton principal" data-accion="reiniciar">Jugar otra vez</button>';
  if (sig) {
    const texto = state.decl === 0 ? 'Ir a la 1.ª declinación' : (sig.declinacion === state.decl ? 'Siguiente nivel' : 'Ir a la ' + sig.declinacion + '.ª declinación');
    botones += '<button type="button" class="boton" data-accion="siguiente"> ' + texto + '</button>';
  }
  botones += '<button type="button" class="boton" data-accion="menu">Menú</button>';
  $('resultado-cuerpo').innerHTML = '<h2>' + titulo + '</h2><p>' + nombreNivel() + '</p><p>' + detalle + '</p>' + extra + '<div class="acciones">' + botones + '</div>';
  $('estado').textContent = nombreNivel();
  mostrarVista('resultado');
  pintarMenu();
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
  if (state.decl === 0 && state.hechas >= state.tamano && state.hechas % 12 === 0) {
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
    aviso('Se acabó el tiempo. Era ' + item.objetivo + ' (' + item.pista.toLowerCase() + ', tecla ' + item.tecla + ').', 'tiempo');
  } else {
    const textos = Latine.textoCasos(item.entradas);
    aviso('Se acabó el tiempo. Servía: ' + textos.join(', ') + '.', 'tiempo');
  }
  cerrarPregunta(true);
}

function flashTecla(casoId, tipo) {
  const btn = document.querySelector('.tecla[data-caso="' + casoId + '"]');
  if (!btn) return;
  btn.classList.remove('ok', 'mal');
  void btn.offsetWidth;
  btn.classList.add(tipo);
  setTimeout(function () { btn.classList.remove(tipo); }, 240);
}

function flashRanura(indice, tipo) {
  const btn = document.querySelector('.ranura[data-indice="' + indice + '"]');
  if (!btn) return;
  btn.classList.remove('ok', 'mal', 'revelada');
  void btn.offsetWidth;
  btn.classList.add(tipo);
  setTimeout(function () { btn.classList.remove(tipo); }, tipo === 'revelada' ? 800 : 240);
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

function sacudir() {
  if (state.reducir) return;
  const ficha = $('ficha');
  ficha.classList.remove('sacudir');
  void ficha.offsetWidth;
  ficha.classList.add('sacudir');
}

function responder(casoId) {
  if (!state.jugando || state.pausa || !state.item || state.fase !== 1) return;
  const item = state.item;
  const fallo = Latine.juzgar(item, casoId, state.plural);
  state.plural = false;
  pintarPlural();
  if (fallo.vale) {
    const extra = sumarAcierto(1);
    flashTecla(casoId, 'ok');
    const numeros = new Set(item.entradas.filter(function (v) { return v.casoId === casoId; }).map(function (v) { return v.numero; }));
    let msg = 'Bien. +1.';
    if (numeros.size > 1) msg += ' Vale en singular y en plural.';
    const otras = Latine.textoCasos(fallo.otras);
    if (otras.length) msg += ' También ' + otras.join(', ') + '.';
    aviso(msg + extra, otras.length || numeros.size > 1 ? 'mixto' : 'ok');
    cerrarPregunta(false);
    return;
  }
  anotarFallo();
  flashTecla(casoId, 'mal');
  sacudir();
  const caso = Latine.CASOS[casoId - 1];
  if (fallo.soloSingular) aviso('No. El 0 pide plural, y ese caso aquí es singular.', 'mal');
  else aviso('No. El ' + casoId + ' es el ' + caso.name.toLowerCase() + '.', 'mal');
}

function responderRanura(indice) {
  if (!state.jugando || state.pausa || !state.item || state.fase !== 2) return;
  const item = state.item;
  const elegida = item.opciones.find(function (o) { return o.indice === indice; });
  if (!elegida) return;
  if (Latine.juzgarRanura(item, indice)) {
    const extra = sumarAcierto(1);
    flashRanura(indice, 'ok');
    aviso('Bien. +1. ' + item.objetivo + '.' + extra, 'ok');
    cerrarPregunta(false);
    return;
  }
  anotarFallo();
  flashRanura(indice, 'mal');
  flashRanura(item.indice, 'revelada');
  sacudir();
  aviso('No. Era ' + item.objetivo + ', tecla ' + item.tecla + '.', 'mal');
}

function responderEscrito(texto) {
  if (!state.jugando || state.pausa || !state.item || state.fase !== 2) return;
  const item = state.item;
  const juicio = Latine.juzgarEscrito(item, texto);
  if (!Latine.normalizarEscrito(texto)) return;
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

function pintarPlural() {
  const btn = $('btn-plural');
  btn.textContent = state.plural ? 'Plural: sí' : 'Plural: no';
  btn.setAttribute('aria-pressed', state.plural ? 'true' : 'false');
  $('teclado').classList.toggle('plural', state.plural);
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
    const bloques = state.item.palabras.map(function (w) {
      return '<div class="bloque-tabla"><h3><span class="latin" lang="la">' + Latine.escapar(w.lema) + ', ' + Latine.escapar(w.genitivo) + '</span> (' + Latine.generoCorto(w.genero) + ') — ' + Latine.escapar(w.espanol) + '</h3>' + tablaHTML(w) + '</div>';
    }).join('');
    tabla.innerHTML = '<p class="forma-grande latin" lang="la">' + Latine.escapar(state.item.forma) + '</p><p>Busca esta forma en la tabla. No está marcada. Luego continúa y pulsa el caso.</p>' + bloques + '<button type="button" class="boton principal" data-accion="continuar">Continuar</button>';
  }
  if (esBloque) {
    bloque.innerHTML = '<h2>Doce preguntas hechas</h2><p>Llevas ' + state.puntos + ' puntos. La racha es ' + state.racha + '.</p><p>Puedes seguir con otras doce o pasar a la primera declinación.</p><div class="acciones"><button type="button" class="boton principal" data-accion="seguir">Seguir con doce más</button><button type="button" class="boton" data-accion="siguiente">Ir a la 1.ª declinación</button><button type="button" class="boton" data-accion="menu">Menú</button></div>';
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
  if (!state.jugando || state.decl === 0 || !state.item) return;
  if (state.pausa && state.motivoPausa === 'tabla') {
    reanudar();
    return;
  }
  state.pausa = true;
  state.motivoPausa = 'tabla';
  pararBucle();
  pintarOverlay();
}

function empezar(decl, sub) {
  if (state.fase === 2 && decl === 0) return;
  if (decl > 0 && !state.palabras) return;
  pararBucle();
  state.decl = decl;
  state.sub = sub;
  state.mazo = state.fase === 2
    ? Latine.armarMazoFase2(state.palabras || [], decl, sub)
    : Latine.armarMazo(state.palabras || [], decl, sub);
  if (!state.mazo.length) return;
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
  state.vidasMax = Latine.vidasDe(decl);
  state.vidas = state.vidasMax;
  state.tamano = Latine.tamanoRonda(decl, sub);
  state.jugando = true;
  state.pausa = false;
  state.motivoPausa = '';
  state.plural = false;
  $('velo-pausa').hidden = true;
  $('aviso').textContent = '';
  $('aviso').className = 'aviso';
  mostrarVista('juego');
  pintarTecladoModo();
  pintarMarcador();
  pintarPlural();
  soltarSiguiente();
  reanudarBucle();
  if (!state.reducir) $('arena').scrollIntoView({ block: 'center', behavior: 'smooth' });
}

function seguirPracticando() {
  if (state.motivoPausa !== 'bloque') return;
  state.tamano += 12;
  state.pausa = false;
  state.motivoPausa = '';
  state.jugando = true;
  $('velo-pausa').hidden = true;
  mostrarVista('juego');
  pintarTecladoModo();
  soltarSiguiente();
  reanudarBucle();
}

function irAlMenu() {
  if (state.fase === 1 && state.decl === 0 && state.hechas >= 12) guardarMarca();
  state.jugando = false;
  state.pausa = false;
  state.motivoPausa = '';
  state.item = null;
  pararBucle();
  $('velo-pausa').hidden = true;
  $('estado').textContent = state.palabras
    ? state.palabras.length + ' sustantivos · elige un nivel'
    : 'Elige un nivel';
  mostrarVista('menu');
  pintarVidas();
  pintarMenu();
}

function abrirConsulta() {
  if (!state.palabras) return;
  state.jugando = false;
  state.pausa = false;
  state.motivoPausa = '';
  pararBucle();
  state.consultaDesde = 0;
  mostrarVista('consulta');
  $('estado').textContent = 'Consulta del vocabulario';
  pintarConsulta();
  $('buscar').focus();
}

function pintarConsulta() {
  const q = $('buscar').value;
  const decl = Number($('filtro-decl').value) || 0;
  const genero = $('filtro-gen').value;
  const hallados = Latine.buscar(state.palabras, q, decl, genero);
  const fin = state.consultaDesde + LIMITE_LISTA;
  const trozo = hallados.slice(0, fin);
  $('consulta-cuenta').textContent = hallados.length
    ? 'Mostrando ' + trozo.length + ' de ' + hallados.length
    : 'Ninguna palabra coincide.';
  $('consulta-lista').innerHTML = trozo.map(function (w) {
    const marcas = [];
    if (w.notas) marcas.push('nota');
    if (w.sin_plural || !w.formas || !w.formas.plural) marcas.push('sin plural');
    if (w.sin_singular || !w.formas || !w.formas.singular) marcas.push('solo plural');
    return '<article class="tarjeta"><button type="button" class="tarjeta-abre" data-accion="abrir-tarjeta" aria-expanded="false"><span class="latin" lang="la">' + Latine.escapar(w.lema) + ', ' + Latine.escapar(w.genitivo) + '</span><span>' + Latine.generoCorto(w.genero) + ' · ' + w.declinacion + '.ª · ' + Latine.escapar(w.espanol) + (marcas.length ? ' · ' + marcas.join(' · ') : '') + '</span></button><div class="tarjeta-cuerpo" hidden>' + tablaHTML(w) + '</div></article>';
  }).join('') + (fin < hallados.length ? '<button type="button" class="boton mas" data-accion="mas">Ver más</button>' : '');
}

function alPulsar(accion, btn) {
  if (accion === 'sonido') {
    state.sonido = !state.sonido;
    escribir(AJUSTES, { sonido: state.sonido });
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
    if (!state.jugando || state.decl === 0) return;
    state.ayudaAbierta = !state.ayudaAbierta;
    pintarAyuda();
    pintarControles();
    return;
  }
  if (accion === 'empezar') {
    empezar(Number(btn.dataset.decl), Number(btn.dataset.sub));
    return;
  }
  if (accion === 'pausa') { pausar(); return; }
  if (accion === 'continuar') { reanudar(); return; }
  if (accion === 'seguir') { seguirPracticando(); return; }
  if (accion === 'tabla') { abrirTabla(); return; }
  if (accion === 'ranura') {
    responderRanura(Number(btn.dataset.indice));
    return;
  }
  if (accion === 'reiniciar') { empezar(state.decl, state.sub); return; }
  if (accion === 'siguiente') {
    const sig = Latine.siguienteNivel(state.decl, state.sub);
    if (sig) empezar(sig.declinacion, sig.subnivel);
    return;
  }
  if (accion === 'plural') {
    if (!state.jugando || state.pausa || state.decl === 0) return;
    state.plural = !state.plural;
    pintarPlural();
    return;
  }
  if (accion === 'caso') {
    responder(Number(btn.dataset.caso));
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
  if (state.fase === 2) {
    if (Object.prototype.hasOwnProperty.call(TECLAS_FASE2, e.key)) {
      e.preventDefault();
      responderRanura(TECLAS_FASE2[e.key]);
    }
    return;
  }
  if (e.key === '0' && state.decl > 0) {
    e.preventDefault();
    state.plural = !state.plural;
    pintarPlural();
    return;
  }
  if (e.key >= '1' && e.key <= '6') {
    e.preventDefault();
    responder(Number(e.key));
  }
}

function palabraValida(w) {
  return w && typeof w.lema === 'string' && w.formas && w.declinacion >= 1 && w.declinacion <= 5;
}

function arrancar(palabras) {
  state.palabras = palabras;
  $('carga').hidden = true;
  if (state.vista === 'menu') $('estado').textContent = palabras.length + ' sustantivos · elige un nivel';
  pintarMenu();
}

function fallarCarga(mensaje) {
  $('carga').hidden = false;
  $('carga').textContent = mensaje;
  $('estado').textContent = 'Puedes jugar los seis casos';
  pintarMenu();
}

function iniciar() {
  state.reducir = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const ajustes = leer(AJUSTES, {});
  state.sonido = !!ajustes.sonido;
  if (ajustes.velocidad === 'lento' || ajustes.velocidad === 'medio' || ajustes.velocidad === 'rapido') {
    state.velocidad = ajustes.velocidad;
  }
  if (ajustes.fase === 2) state.fase = 2;
  pintarSonido();
  pintarVelocidad();
  pintarFases();
  pintarEsquema();
  pintarTeclas();
  pintarMenu();
  $('forma-fase2').addEventListener('submit', function (e) {
    e.preventDefault();
    responderEscrito($('escrito').value);
  });
  document.body.addEventListener('click', function (e) {
    const btn = e.target.closest('[data-accion]');
    if (!btn) return;
    alPulsar(btn.dataset.accion, btn);
  });
  document.addEventListener('keydown', alTeclado);
  document.addEventListener('visibilitychange', function () {
    if (document.hidden && state.jugando) pausar({ forzar: true });
  });
  $('buscar').addEventListener('input', function () {
    state.consultaDesde = 0;
    pintarConsulta();
  });
  $('filtro-decl').addEventListener('change', function () {
    state.consultaDesde = 0;
    pintarConsulta();
  });
  $('filtro-gen').addEventListener('change', function () {
    state.consultaDesde = 0;
    pintarConsulta();
  });

  fetch('vocabulario.json', { cache: 'no-cache' })
    .then(function (res) {
      if (!res.ok) throw new Error('http');
      return res.json();
    })
    .then(function (data) {
      const palabras = (data && data.palabras || []).filter(palabraValida);
      if (palabras.length < 400) throw new Error('corto');
      arrancar(palabras);
    })
    .catch(function () {
      fallarCarga('No pude abrir vocabulario.json. Abre Latine desde la página publicada. Si lo abres como archivo suelto, el navegador no deja leer el vocabulario.');
    });
}

iniciar();
