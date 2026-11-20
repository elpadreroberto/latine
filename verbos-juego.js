'use strict';

(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  else root.Verbos = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  const PERSONAS = [
    { id: 1, key: '1s', name: '1.ª singular', corto: '1.ª sg.', pronombre: 'ego' },
    { id: 2, key: '2s', name: '2.ª singular', corto: '2.ª sg.', pronombre: 'tū' },
    { id: 3, key: '3s', name: '3.ª singular', corto: '3.ª sg.', pronombre: 'is, ea, id' },
    { id: 4, key: '1p', name: '1.ª plural', corto: '1.ª pl.', pronombre: 'nōs' },
    { id: 5, key: '2p', name: '2.ª plural', corto: '2.ª pl.', pronombre: 'vōs' },
    { id: 6, key: '3p', name: '3.ª plural', corto: '3.ª pl.', pronombre: 'iī, eae, ea' }
  ];

  const GRUPOS = [
    { id: 'transitivos_1', titulo: 'Transitivos, 1.ª y 2.ª', detalle: 'Temas en -ā y en -ē' },
    { id: 'transitivos_2', titulo: 'Transitivos, 3.ª, mixta y 4.ª', detalle: 'Consonante, -iō y -ī' },
    { id: 'intransitivos', titulo: 'Intransitivos', detalle: 'Sin pasiva personal' },
    { id: 'irregulares', titulo: 'Irregulares', detalle: 'sum, possum, eō, ferō, volō…' },
    { id: 'deponentes', titulo: 'Deponentes y semideponentes', detalle: 'Desinencias pasivas, sentido activo' }
  ];

  const VOCES = [
    { id: 'activa', name: 'Activa' },
    { id: 'pasiva', name: 'Pasiva' }
  ];

  const MODOS = [
    { id: 'indicativo', name: 'Indicativo', tiempos: ['presente', 'imperfecto', 'futuro', 'perfecto', 'pluscuamperfecto', 'futuro_perfecto'] },
    { id: 'subjuntivo', name: 'Subjuntivo', tiempos: ['presente', 'imperfecto', 'perfecto', 'pluscuamperfecto'] },
    { id: 'imperativo', name: 'Imperativo', tiempos: ['presente', 'futuro'] }
  ];

  const TIEMPO_NOMBRE = {
    presente: 'presente',
    imperfecto: 'imperfecto',
    futuro: 'futuro',
    perfecto: 'perfecto',
    pluscuamperfecto: 'pluscuamperfecto',
    futuro_perfecto: 'futuro perfecto'
  };

  // Desinencias que el juego de verbos acepta al escribir, además de la forma entera.
  const DESINENCIAS = {
    1: ['o', 'm', 'or', 'r'],
    2: ['s', 'as', 'es', 'is', 'ris', 'eris', 'iris'],
    3: ['t', 'at', 'et', 'it', 'tur', 'atur', 'etur', 'itur'],
    4: ['mus', 'amus', 'emus', 'imus', 'mur', 'amur', 'emur', 'imur'],
    5: ['tis', 'atis', 'etis', 'itis', 'mini', 'amini', 'emini', 'imini'],
    6: ['nt', 'ant', 'ent', 'unt', 'iunt', 'ntur', 'antur', 'entur', 'untur', 'iuntur']
  };

  const BASE = [
    { forma: '−ō / −m', personaId: 1 },
    { forma: '−s', personaId: 2 },
    { forma: '−t', personaId: 3 },
    { forma: '−mus', personaId: 4 },
    { forma: '−tis', personaId: 5 },
    { forma: '−nt', personaId: 6 },
    { forma: '−or / −r', personaId: 1 },
    { forma: '−ris', personaId: 2 },
    { forma: '−tur', personaId: 3 },
    { forma: '−mur', personaId: 4 },
    { forma: '−minī', personaId: 5 },
    { forma: '−ntur', personaId: 6 }
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

  function normalizarEscrito(valor) {
    return plegar(valor).replace(/^[-−–—]+/, '').replace(/\s+/g, ' ').trim();
  }

  function personaPorId(id) {
    return PERSONAS[id - 1];
  }

  function grupoDe(verbo) {
    if (!verbo) return '';
    if (verbo.tipo === 'deponente' || verbo.tipo === 'semideponente') return 'deponentes';
    if (verbo.tipo === 'irregular') return 'irregulares';
    if (verbo.transitividad === 'intransitivo') return 'intransitivos';
    if (verbo.conjugacion === 1 || verbo.conjugacion === 2) return 'transitivos_1';
    if (verbo.conjugacion === 3 || verbo.conjugacion === '3io' || verbo.conjugacion === 4) return 'transitivos_2';
    return '';
  }

  function verbosDelGrupo(lista, grupoId) {
    const salida = [];
    (lista || []).forEach(function (verbo) {
      if (grupoDe(verbo) === grupoId) salida.push(verbo);
    });
    return salida;
  }

  function verbosDelNivel(lista, grupoId, subnivel) {
    const deLa = verbosDelGrupo(lista, grupoId);
    const n = subnivel === 1 ? 2 : subnivel === 2 ? 10 : deLa.length;
    return deLa.slice(0, n);
  }

  function modoPorId(modo) {
    for (let i = 0; i < MODOS.length; i += 1) {
      if (MODOS[i].id === modo) return MODOS[i];
    }
    return MODOS[0];
  }

  function tiempoValido(modo, tiempo) {
    const info = modoPorId(modo);
    if (info.tiempos.indexOf(tiempo) !== -1) return tiempo;
    return info.tiempos[0];
  }

  function nombreTiempo(tiempo) {
    return TIEMPO_NOMBRE[tiempo] || tiempo;
  }

  function celda(verbo, voz, modo, tiempo) {
    const formas = verbo && verbo.formas;
    const bloque = formas && formas[voz];
    if (!bloque || typeof bloque !== 'object') return null;
    const porModo = bloque[modo];
    if (!porModo || typeof porModo !== 'object') return null;
    const personas = porModo[tiempo];
    if (!personas || typeof personas !== 'object') return null;
    return personas;
  }

  function enunciado(verbo) {
    const partes = verbo && verbo.partes_principales;
    if (!partes || !partes.length) {
      const lema = verbo && verbo.lema || '';
      return lema.charAt(0).toUpperCase() + lema.slice(1);
    }
    return partes.map(function (parte, i) {
      if (i !== 0) return parte;
      return parte.charAt(0).toUpperCase() + parte.slice(1);
    }).join(', ');
  }

  function armarBase() {
    return BASE.map(function (item) {
      const persona = personaPorId(item.personaId);
      return {
        forma: item.forma,
        entradas: [{ personaId: persona.id, personaNombre: persona.name, lema: '' }],
        verbos: [],
        firma: 'base|' + item.forma
      };
    });
  }

  function armarMazo(lista, grupoId, subnivel, voz, modo, tiempo) {
    if (grupoId === 'base') return armarBase();
    const elegidos = verbosDelNivel(lista || [], grupoId, subnivel);
    const mapa = new Map();
    elegidos.forEach(function (verbo) {
      const personas = celda(verbo, voz, modo, tiempo);
      if (!personas) return;
      PERSONAS.forEach(function (persona) {
        const forma = personas[persona.key];
        if (!forma) return;
        let grupo = mapa.get(forma);
        if (!grupo) {
          grupo = { forma: forma, entradas: [], verbos: [], firma: forma, _claves: new Set() };
          mapa.set(forma, grupo);
        }
        const clave = persona.id + '|' + (verbo.id || verbo.lema);
        if (!grupo._claves.has(clave)) {
          grupo._claves.add(clave);
          grupo.entradas.push({ personaId: persona.id, personaNombre: persona.name, lema: verbo.lema });
        }
        if (!grupo.verbos.some(function (v) { return v.id === verbo.id; })) grupo.verbos.push(verbo);
      });
    });
    const mazo = [];
    mapa.forEach(function (grupo) {
      delete grupo._claves;
      mazo.push(grupo);
    });
    return mazo;
  }

  function armarMazoFase2(lista, grupoId, subnivel, voz, modo, tiempo) {
    if (!grupoId || grupoId === 'base') return [];
    const elegidos = verbosDelNivel(lista || [], grupoId, subnivel);
    const mazo = [];
    elegidos.forEach(function (verbo) {
      const personas = celda(verbo, voz, modo, tiempo);
      if (!personas) return;
      const opciones = [];
      PERSONAS.forEach(function (persona) {
        const forma = personas[persona.key];
        if (!forma) return;
        opciones.push({ personaId: persona.id, forma: forma, nombre: persona.name, corto: persona.corto });
      });
      opciones.forEach(function (opt) {
        mazo.push({
          fase: 2,
          forma: enunciado(verbo),
          pista: opt.nombre,
          objetivo: opt.forma,
          personaId: opt.personaId,
          opciones: opciones,
          verbos: [verbo],
          entradas: [],
          firma: (verbo.id || verbo.lema) + '|' + opt.personaId
        });
      });
    });
    return mazo;
  }

  function juzgar(item, personaId) {
    const coincidencias = (item.entradas || []).filter(function (v) { return v.personaId === personaId; });
    const otras = [];
    const visto = new Set();
    (item.entradas || []).forEach(function (v) {
      if (v.personaId === personaId || visto.has(v.personaId)) return;
      visto.add(v.personaId);
      otras.push(v);
    });
    return { vale: coincidencias.length > 0, coincidencias: coincidencias, otras: otras };
  }

  function juzgarPersona(item, personaId) {
    return !!item && personaId === item.personaId;
  }

  function desinenciasValidas(verbo, forma, personaId) {
    const meta = normalizarEscrito(forma);
    const halladas = [];
    function anadir(texto) {
      if (texto && halladas.indexOf(texto) === -1) halladas.push(texto);
    }
    if (meta.indexOf(' ') === -1) {
      (DESINENCIAS[personaId] || []).forEach(function (sufijo) {
        if (meta.length > sufijo.length && meta.lastIndexOf(sufijo) === meta.length - sufijo.length) anadir(sufijo);
      });
    }
    const lema = normalizarEscrito(verbo && verbo.lema);
    let comun = 0;
    while (comun < lema.length && comun < meta.length && lema.charAt(comun) === meta.charAt(comun)) comun += 1;
    const cola = meta.slice(comun);
    if (comun >= 2 && cola.length >= 2) anadir(cola);
    return halladas;
  }

  function juzgarEscrito(item, texto) {
    const limpio = normalizarEscrito(texto);
    const vacio = { vale: false, completo: false, desinencia: '' };
    if (!limpio || !item || !item.verbos || !item.verbos[0]) return vacio;
    const completo = limpio === normalizarEscrito(item.objetivo);
    const desinencias = desinenciasValidas(item.verbos[0], item.objetivo, item.personaId);
    return {
      vale: completo || desinencias.indexOf(limpio) !== -1,
      completo: completo,
      desinencia: desinencias[0] || ''
    };
  }

  function textoPersonas(entradas) {
    const visto = new Set();
    const partes = [];
    (entradas || []).forEach(function (v) {
      const texto = v.personaNombre;
      if (visto.has(texto)) return;
      visto.add(texto);
      partes.push(texto);
    });
    return partes;
  }

  function buscar(lista, consulta, grupoId, conjugacion, tipo) {
    const q = plegar(String(consulta || '').trim());
    return (lista || []).filter(function (verbo) {
      if (grupoId && grupoDe(verbo) !== grupoId) return false;
      if (conjugacion && String(verbo.conjugacion) !== String(conjugacion)) return false;
      if (tipo && verbo.tipo !== tipo) return false;
      if (!q) return true;
      if (plegar(verbo.lema).indexOf(q) !== -1) return true;
      if (plegar(verbo.espanol).indexOf(q) !== -1) return true;
      if (plegar(verbo.notas || '').indexOf(q) !== -1) return true;
      const partes = verbo.partes_principales || [];
      for (let i = 0; i < partes.length; i += 1) {
        if (plegar(partes[i]).indexOf(q) !== -1) return true;
      }
      const voces = ['activa', 'pasiva'];
      for (let v = 0; v < voces.length; v += 1) {
        const bloque = verbo.formas && verbo.formas[voces[v]];
        if (!bloque) continue;
        const modos = ['indicativo', 'subjuntivo', 'imperativo'];
        for (let m = 0; m < modos.length; m += 1) {
          const tiempos = bloque[modos[m]];
          if (!tiempos) continue;
          const nombres = Object.keys(tiempos);
          for (let t = 0; t < nombres.length; t += 1) {
            const personas = tiempos[nombres[t]];
            if (!personas || typeof personas !== 'object') continue;
            const claves = Object.keys(personas);
            for (let c = 0; c < claves.length; c += 1) {
              const forma = personas[claves[c]];
              if (forma && plegar(forma).indexOf(q) !== -1) return true;
            }
          }
        }
      }
      return false;
    });
  }

  function tamanoRonda(grupoId, subnivel) {
    if (grupoId === 'base') return 12;
    if (subnivel === 1) return 12;
    if (subnivel === 2) return 18;
    return 24;
  }

  function vidasDe(grupoId) {
    return grupoId === 'base' ? 0 : 3;
  }

  function siguienteNivel(grupoId, subnivel) {
    if (grupoId === 'base') return { grupo: GRUPOS[0].id, subnivel: 1 };
    if (subnivel < 3) return { grupo: grupoId, subnivel: subnivel + 1 };
    const ids = GRUPOS.map(function (g) { return g.id; });
    const i = ids.indexOf(grupoId);
    if (i >= 0 && i < ids.length - 1) return { grupo: ids[i + 1], subnivel: 1 };
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

  return {
    PERSONAS: PERSONAS,
    GRUPOS: GRUPOS,
    VOCES: VOCES,
    MODOS: MODOS,
    escapar: escapar,
    plegar: plegar,
    normalizarEscrito: normalizarEscrito,
    personaPorId: personaPorId,
    grupoDe: grupoDe,
    verbosDelGrupo: verbosDelGrupo,
    verbosDelNivel: verbosDelNivel,
    modoPorId: modoPorId,
    tiempoValido: tiempoValido,
    nombreTiempo: nombreTiempo,
    celda: celda,
    enunciado: enunciado,
    armarBase: armarBase,
    armarMazo: armarMazo,
    armarMazoFase2: armarMazoFase2,
    juzgar: juzgar,
    juzgarPersona: juzgarPersona,
    desinenciasValidas: desinenciasValidas,
    juzgarEscrito: juzgarEscrito,
    textoPersonas: textoPersonas,
    buscar: buscar,
    tamanoRonda: tamanoRonda,
    vidasDe: vidasDe,
    siguienteNivel: siguienteNivel,
    barajar: barajar
  };
});
