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

  function barajar(lista, evitarForma) {
    const arr = lista.slice();
    for (let i = arr.length - 1; i > 0; i -= 1) {
      const j = Math.floor(Math.random() * (i + 1));
      const tmp = arr[i];
      arr[i] = arr[j];
      arr[j] = tmp;
    }
    if (evitarForma && arr.length > 1 && arr[0].forma === evitarForma) {
      const tmp = arr[0];
      arr[0] = arr[1];
      arr[1] = tmp;
    }
    return arr;
  }

  return {
    CASOS: CASOS,
    escapar: escapar,
    plegar: plegar,
    generoCorto: generoCorto,
    generoLargo: generoLargo,
    palabrasDelNivel: palabrasDelNivel,
    armarMazo: armarMazo,
    juzgar: juzgar,
    textoCasos: textoCasos,
    buscar: buscar,
    tamanoRonda: tamanoRonda,
    vidasDe: vidasDe,
    siguienteNivel: siguienteNivel,
    barajar: barajar
  };
});
