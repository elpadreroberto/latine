# Latine

Juego para reconocer los seis casos latinos y practicar las cinco declinaciones.

Página: https://elpadreroberto.github.io/latine/

## Cómo jugar

1. Elige la fase. **Reconocer**: baja una forma y pulsas el caso. **Declinar**: baja la entrada del diccionario y el caso que te piden.
2. En la fase 1, las teclas son 1 nominativo, 2 vocativo, 3 acusativo, 4 genitivo, 5 dativo, 6 ablativo. Arriba van 4, 5 y 6. Abajo, 1, 2 y 3.
3. En la fase 1, el **0** antes del número pide el plural. Sin el 0, vale el singular o el plural.
4. En la fase 2 escribes la forma completa o solo la desinencia. También puedes pulsar una de las doce teclas: 1–6 singular; 7, 8, 9, 0, − y + plural. Escribir suma dos puntos. La tecla suma uno. Al escribir, el macrón no hace falta.
5. En la fase 1 el macrón cuenta: *gradus* y *gradūs* no son la misma forma.
6. **Lento**, **Medio** y **Rápido** cambian la caída. **Tabla** detiene el tiempo y no marca la respuesta. **Ayuda** muestra el paradigma: en la fase 1 marca la forma; en la fase 2 la oculta.
7. Los seis casos duran doce preguntas, sin vidas. Al terminar puedes seguir con otras doce. En las declinaciones hay 3 vidas. Cada tiempo agotado quita una.

La **consulta** abre las 450 palabras, con búsqueda en latín o en español. Puedes escribir sin macrones y sin tildes.

## Verbos

La página de verbos está en [https://elpadreroberto.github.io/latine/verbos.html](https://elpadreroberto.github.io/latine/verbos.html).

1. Fase 1: baja una forma y pulsas la persona, del 1 al 6. Arriba van 4, 5 y 6. Abajo, 1, 2 y 3.
2. Fase 2: baja el enunciado y la persona. Escribes la forma o la desinencia, o la eliges en las seis teclas.
3. Puedes cambiar la voz, el modo y el tiempo antes de jugar. El presente de indicativo activo es el recorte inicial.
4. Los deponentes están guardados en la voz activa. Los intransitivos no traen pasiva personal.
5. **verbos.json** trae 1000 verbos. Los paradigmas se usan tal como están en el archivo.

## Archivos

- `index.html`, `estilos.css`, `app.js`: la página de los sustantivos.
- `juego.js`: las reglas de los casos (mazo, acierto, búsqueda).
- `vocabulario.json`: 450 sustantivos, 90 por declinación, con el paradigma tal como está en el archivo.
- `verbos.html`, `verbos-app.js`, `verbos-juego.js`: la página de los verbos.
- `verbos.json`: 1000 verbos, con el paradigma tal como está en el archivo.

La página necesita servir esos archivos juntos. En GitHub Pages ya quedan en la misma carpeta.
