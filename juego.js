'use strict';

(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  else root.Latine = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  const CASOS = [
    { id: 1, key: 'nominativo', name: 'Nominativo', sign: '=', role: 'Sujeto / atributo' },
    { id: 2, key: 'vocativo', name: 'Vocativo', sign: '!', role: 'Llamada' },
    { id: 3, key: 'acusativo', name: 'Acusativo', sign: '>', role: 'Objeto directo' },
    { id: 4, key: 'genitivo', name: 'Genitivo', sign: '<', role: 'Complemento del nombre' },
    { id: 5, key: 'dativo', name: 'Dativo', sign: '+', role: 'Objeto indirecto' },
    { id: 6, key: 'ablativo', name: 'Ablativo', sign: '-', role: 'Complemento circunstancial' }
  ];

  function escapar(valor) {
    return String(valor == null ? '' : valor).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }

  function plegar(valor) {
    return String(valor == null ? '' : valor)
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLowerCase();
  }

  function generoCorto(genero) {
    if (genero === 'm') return 'm.';
    if (genero === 'f') return 'f.';
    if (genero === 'n') return 'n.';
    return '';
  }

  function generoLargo(genero) {
    if (genero === 'm') return 'masculino';
    if (genero === 'f') return 'femenino';
    if (genero === 'n') return 'neutro';
    return '';
  }

  function palabrasDelNivel(lista, declinacion, subnivel) {
    const deLa = [];
    for (let i = 0; i < lista.length; i += 1) {
      if (lista[i] && lista[i].declinacion === declinacion) deLa.push(lista[i]);
    }
    const n = subnivel === 1 ? 2 : subnivel === 2 ? 10 : deLa.length;
    return deLa.slice(0, n);
  }

  function armarMazo(lista, declinacion, subnivel) {
    if (declinacion === 0) {
      return CASOS.map(function (c) {
        return {
          forma: c.name,
          entradas: [{ casoId: c.id, casoNombre: c.name, numero: 'singular', lema: '' }],
          palabras: [],
          hayPlural: false
        };
      });
    }

    const elegidas = palabrasDelNivel(lista || [], declinacion, subnivel);
    const mapa = new Map();

    elegidas.forEach(function (entrada) {
      if (!entrada || !entrada.formas) return;
      ['singular', 'plural'].forEach(function (numero) {
        const bloque = entrada.formas[numero];
        if (!bloque) return;
        CASOS.forEach(function (caso) {
          const forma = bloque[caso.key];
          if (!forma) return;
          let grupo = mapa.get(forma);
          if (!grupo) {
            grupo = { forma: forma, entradas: [], palabras: [], hayPlural: false, _claves: new Set() };
            mapa.set(forma, grupo);
          }
          const clave = caso.id + '|' + numero + '|' + (entrada.id || entrada.lema);
          if (!grupo._claves.has(clave)) {
            grupo._claves.add(clave);
            grupo.entradas.push({
              casoId: caso.id,
              casoNombre: caso.name,
              numero: numero,
              lema: entrada.lema
            });
          }
          if (numero === 'plural') grupo.hayPlural = true;
          if (!grupo.palabras.some(function (p) { return p.id === entrada.id; })) grupo.palabras.push(entrada);
        });
      });
    });

    const mazo = [];
    mapa.forEach(function (grupo) {
      delete grupo._claves;
      mazo.push(grupo);
    });
    return mazo;
  }

  function juzgar(item, casoId, forzarPlural) {
    const delCaso = item.entradas.filter(function (v) { return v.casoId === casoId; });
    const coincidencias = delCaso.filter(function (v) {
      return !forzarPlural || v.numero === 'plural';
    });
    const otras = [];
    const visto = new Set();
    item.entradas.forEach(function (v) {
      if (v.casoId === casoId) return;
      const clave = v.casoId + '|' + v.numero;
      if (visto.has(clave)) return;
      visto.add(clave);
      otras.push(v);
    });
    return {
      vale: coincidencias.length > 0,
      coincidencias: coincidencias,
      otras: otras,
      soloSingular: forzarPlural && coincidencias.length === 0 && delCaso.some(function (v) { return v.numero === 'singular'; })
    };
  }

  function textoCasos(entradas) {
    const visto = new Set();
    const partes = [];
    (entradas || []).forEach(function (v) {
      const numero = v.numero === 'plural' ? 'plural' : 'singular';
      const texto = v.casoNombre.toLowerCase() + ' ' + numero;
      if (visto.has(texto)) return;
      visto.add(texto);
      partes.push(texto);
    });
    return partes;
  }

  function buscar(lista, consulta, declinacion, genero) {
    const q = plegar(String(consulta || '').trim());
    const decl = Number(declinacion) || 0;
    return (lista || []).filter(function (w) {
      if (decl && w.declinacion !== decl) return false;
      if (genero && w.genero !== genero) return false;
      if (!q) return true;
      if (plegar(w.lema).indexOf(q) !== -1) return true;
      if (plegar(w.genitivo).indexOf(q) !== -1) return true;
      if (plegar(w.espanol).indexOf(q) !== -1) return true;
      if (plegar(w.notas || '').indexOf(q) !== -1) return true;
      const formas = w.formas || {};
      const numeros = ['singular', 'plural'];
      for (let n = 0; n < numeros.length; n += 1) {
        const bloque = formas[numeros[n]];
        if (!bloque) continue;
        for (let c = 0; c < CASOS.length; c += 1) {
          const forma = bloque[CASOS[c].key];
          if (forma && plegar(forma).indexOf(q) !== -1) return true;
        }
      }
      return false;
    });
  }

  function tamanoRonda(declinacion, subnivel) {
    if (declinacion === 0) return 12;
    if (subnivel === 1) return 12;
    if (subnivel === 2) return 18;
    return 24;
  }

  function vidasDe(declinacion) {
    return declinacion === 0 ? 0 : 3;
  }

  function siguienteNivel(declinacion, subnivel) {
    if (declinacion === 0) return { declinacion: 1, subnivel: 1 };
    if (subnivel < 3) return { declinacion: declinacion, subnivel: subnivel + 1 };
    if (declinacion < 5) return { declinacion: declinacion + 1, subnivel: 1 };
    return null;
  }

  function firmaDe(item) {
    if (!item) return '';
    return item.firma || item.forma;
  }

  function barajar(lista, evitar) {
    const arr = lista.slice();
    for (let i = arr.length - 1; i > 0; i -= 1) {
      const j = Math.floor(Math.random() * (i + 1));
      const tmp = arr[i];
      arr[i] = arr[j];
      arr[j] = tmp;
    }
    if (evitar && arr.length > 1 && firmaDe(arr[0]) === evitar) {
      const tmp = arr[0];
      arr[0] = arr[1];
      arr[1] = tmp;
    }
    return arr;
  }

  // 1–6 singular. 7, 8, 9, 0, − y + son el plural, en el mismo orden de casos.
  const RANURAS = [
    { indice: 0, tecla: '1', numero: 'singular', casoId: 1, corto: 'Nom. sg.' },
    { indice: 1, tecla: '2', numero: 'singular', casoId: 2, corto: 'Voc. sg.' },
    { indice: 2, tecla: '3', numero: 'singular', casoId: 3, corto: 'Acus. sg.' },
    { indice: 3, tecla: '4', numero: 'singular', casoId: 4, corto: 'Gen. sg.' },
    { indice: 4, tecla: '5', numero: 'singular', casoId: 5, corto: 'Dat. sg.' },
    { indice: 5, tecla: '6', numero: 'singular', casoId: 6, corto: 'Abl. sg.' },
    { indice: 6, tecla: '7', numero: 'plural', casoId: 1, corto: 'Nom. pl.' },
    { indice: 7, tecla: '8', numero: 'plural', casoId: 2, corto: 'Voc. pl.' },
    { indice: 8, tecla: '9', numero: 'plural', casoId: 3, corto: 'Acus. pl.' },
    { indice: 9, tecla: '0', numero: 'plural', casoId: 4, corto: 'Gen. pl.' },
    { indice: 10, tecla: '−', numero: 'plural', casoId: 5, corto: 'Dat. pl.' },
    { indice: 11, tecla: '+', numero: 'plural', casoId: 6, corto: 'Abl. pl.' }
  ];

  function lemaDiccionario(entrada) {
    const lema = entrada.lema || '';
    const genitivo = entrada.genitivo || '';
    const inicial = lema.charAt(0).toUpperCase() + lema.slice(1);
    let comun = 0;
    while (comun < lema.length && comun < genitivo.length && lema.charAt(comun) === genitivo.charAt(comun)) comun += 1;
    const resto = genitivo.length - comun;
    const genVisible = (comun >= 3 && resto >= 2) ? genitivo.slice(comun) : genitivo;
    return inicial + ', ' + genVisible + '. ' + (entrada.genero || '') + '.';
  }

  function normalizarEscrito(valor) {
    return plegar(valor).replace(/^[-−–—]+/, '').trim();
  }

  // La raíz sale al quitar la desinencia habitual del genitivo singular.
  const SUFIJO_GENITIVO = { 1: 'ae', 2: 'i', 3: 'is', 4: 'us', 5: 'ei' };

  function desinenciasValidas(entrada, forma) {
    const meta = normalizarEscrito(forma);
    const gen = normalizarEscrito(entrada && entrada.genitivo);
    const nom = normalizarEscrito(entrada && entrada.lema);
    const sufijo = SUFIJO_GENITIVO[entrada && entrada.declinacion] || '';
    const raiz = (sufijo && gen.endsWith(sufijo)) ? gen.slice(0, -sufijo.length) : gen;
    const halladas = [];
    function anadir(texto) {
      if (texto && halladas.indexOf(texto) === -1) halladas.push(texto);
    }
    if (raiz && meta.indexOf(raiz) === 0) anadir(meta.slice(raiz.length));
    let comun = 0;
    while (comun < nom.length && comun < meta.length && nom.charAt(comun) === meta.charAt(comun)) comun += 1;
    const cola = meta.slice(comun);
    // La cola respecto al nominativo no debe ser un recorte de la desinencia ya hallada
    // (puellam daría «m» además de «am»). Si no hubo raíz, se admite desde dos letras.
    const yaCubre = halladas.some(function (d) {
      return cola && d.length > cola.length && d.slice(d.length - cola.length) === cola;
    });
    if (comun >= 2 && cola.length >= 2 && !yaCubre) anadir(cola);
    return halladas;
  }

  function opcionesDe(entrada) {
    const opciones = [];
    RANURAS.forEach(function (ranura) {
      const bloque = entrada.formas && entrada.formas[ranura.numero];
      const caso = CASOS[ranura.casoId - 1];
      const forma = bloque && bloque[caso.key];
      if (!forma) return;
      opciones.push({
        indice: ranura.indice,
        tecla: ranura.tecla,
        numero: ranura.numero,
        casoId: ranura.casoId,
        casoNombre: caso.name,
        corto: ranura.corto,
        forma: forma
      });
    });
    return opciones;
  }

  function armarMazoFase2(lista, declinacion, subnivel) {
    if (!declinacion) return [];
    const elegidas = palabrasDelNivel(lista || [], declinacion, subnivel);
    const mazo = [];
    elegidas.forEach(function (entrada) {
      if (!entrada || !entrada.formas) return;
      const opciones = opcionesDe(entrada);
      opciones.forEach(function (opt) {
        const numero = opt.numero === 'plural' ? 'plural' : 'singular';
        mazo.push({
          fase: 2,
          forma: lemaDiccionario(entrada),
          pista: opt.casoNombre + ' · ' + numero,
          objetivo: opt.forma,
          tecla: opt.tecla,
          indice: opt.indice,
          casoId: opt.casoId,
          numero: opt.numero,
          firma: (entrada.id || entrada.lema) + '|' + opt.casoId + '|' + opt.numero,
          opciones: opciones,
          palabras: [entrada],
          entradas: [],
          hayPlural: false
        });
      });
    });
    return mazo;
  }

  function juzgarRanura(item, indice) {
    return !!item && indice === item.indice;
  }

  function juzgarEscrito(item, texto) {
    const limpio = normalizarEscrito(texto);
    const vacio = { vale: false, completo: false, desinencia: '' };
    if (!limpio || !item || !item.palabras || !item.palabras[0]) return vacio;
    const completo = limpio === normalizarEscrito(item.objetivo);
    const desinencias = desinenciasValidas(item.palabras[0], item.objetivo);
    const porDesinencia = !completo && desinencias.indexOf(limpio) !== -1;
    return {
      vale: completo || porDesinencia,
      completo: completo,
      desinencia: desinencias[0] || ''
    };
  }

  function teclaDeIndice(indice) {
    const ranura = RANURAS[indice];
    return ranura ? ranura.tecla : '';
  }

  return {
    CASOS: CASOS,
    RANURAS: RANURAS,
    escapar: escapar,
    plegar: plegar,
    generoCorto: generoCorto,
    generoLargo: generoLargo,
    palabrasDelNivel: palabrasDelNivel,
    armarMazo: armarMazo,
    armarMazoFase2: armarMazoFase2,
    lemaDiccionario: lemaDiccionario,
    normalizarEscrito: normalizarEscrito,
    desinenciasValidas: desinenciasValidas,
    juzgar: juzgar,
    juzgarRanura: juzgarRanura,
    juzgarEscrito: juzgarEscrito,
    teclaDeIndice: teclaDeIndice,
    textoCasos: textoCasos,
    buscar: buscar,
    tamanoRonda: tamanoRonda,
    vidasDe: vidasDe,
    siguienteNivel: siguienteNivel,
    barajar: barajar
  };
});
