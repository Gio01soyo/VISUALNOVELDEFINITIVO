/**
 * @class MotorNovelaVisual
 * Gestiona la lógica principal del juego, personajes múltiples y audio.
 */
class MotorNovelaVisual {
    constructor(selectoresDOM) {
        this.guion = []; 
        this.escenaActual = null;
        this.elementosDOM = this.obtenerElementosDOM(selectoresDOM);        
        // Mapeo de elementos de personajes para fácil acceso
        this.elementosPersonajes = {
            izquierda: this.elementosDOM.contenedorPersonajes.querySelector('#personaje-izquierda'),
            centro: this.elementosDOM.contenedorPersonajes.querySelector('#personaje-centro'),
            derecha: this.elementosDOM.contenedorPersonajes.querySelector('#personaje-derecha'),
        };
        // Parámetros para la máquina de escribir
        this.velocidadTexto = 50; 
        this.animacionTextoEnCurso = false;
        this.intervaloTexto = null;
        this.superposicion = document.querySelector('#superposicion-transicion');
        this.manejarAvanceDialogo = this.manejarAvanceDialogo.bind(this);
        // --- NUEVO: Propiedades para estado y guardado ---
        this.modoMenu = null; // 'guardar' o 'cargar'
        this.ranurasGuardado = 5;
        this.prefijoLocalStorage = 'vn_save_slot_';
        this.archivoGuionActual = null;
        this.fondoActual = '';
        this.bgmActual = null;
         // --- NUEVO: Gestor de Variables del Juego ---
        this.variables = {}; // Almacena el estado del juego (afecto, inventario, etc.)

        this.elementosDOM = this.obtenerElementosDOM(selectoresDOM);

        // Conectar los botones de la UI a los métodos del motor
        this.conectarControlesUI();
    }
     // --- NUEVO: Método de Inicialización Principal ---
   inicializar() {
        this.inicializarOpciones();
        this.inicializarMenuPrincipal();
        // Conectamos los controles que están DENTRO del juego
        this.elementosDOM.botonGuardar.addEventListener('click', () => this.abrirMenu('guardar'));
        this.elementosDOM.botonCargar.addEventListener('click', () => this.abrirMenu('cargar'));
        this.elementosDOM.botonCerrarMenu.addEventListener('click', () => this.cerrarMenu());
    }
    
    // --- NUEVO: Lógica del Menú Principal ---
    inicializarMenuPrincipal() {
        const menu = this.elementosDOM.menuPrincipal;
        if (!menu) return;

        menu.addEventListener('click', async (event) => { 
            const boton = event.target.closest('button');
            if (!boton) return;
            const accion = boton.dataset.accion;
            if (!accion) return;

            switch (accion) {
                case 'nueva-partida':
                     // Reiniciamos las variables a su estado inicial
                    this.reiniciarVariables(); 
                    this.reproducirSFX('assets/sfx/inicio_partida.wav');
                    this.superposicion.classList.add('activa');
                    await new Promise(resolve => setTimeout(resolve, 600));
                    
                    menu.classList.add('oculto');
                    this.elementosDOM.juegoContainer.classList.remove('oculto');
                    this.elementosDOM.controlesJuego.classList.remove('oculto');
                    
                    // Llamamos a iniciarJuego, que AHORA se encarga del fade-in
                    this.iniciarJuego('scenes/capitulo1.json');
                    break;
                case 'cargar-partida':
                    this.abrirMenu('cargar');
                    break;
                case 'opciones':
                    this.abrirMenuOpciones();
                    break;
                case 'salir':
                    alert('Gracias por jugar. Puedes cerrar esta pestaña.');
                    break;
            }
        });
    }

    // --- NUEVO: Lógica de la Pantalla de Opciones ---
    inicializarOpciones() {
        // Cargar opciones guardadas al inicio
        const opcionesGuardadas = localStorage.getItem('opciones_vn');
        if (opcionesGuardadas) {
            const opciones = JSON.parse(opcionesGuardadas);
            this.elementosDOM.sliderVolumenBGM.value = opciones.volumenBgm;
            this.elementosDOM.sliderVolumenSFX.value = opciones.volumenSfx;
            // El valor del slider se invierte porque un valor más alto (100) debe ser más rápido (intervalo más corto)
            this.elementosDOM.sliderVelocidadTexto.value = 110 - opciones.velocidadTexto;

            this.elementosDOM.audioBGM.volume = opciones.volumenBgm;
            this.elementosDOM.audioSFX.volume = opciones.volumenSfx;
            this.velocidadTexto = opciones.velocidadTexto;
        } else {
            // Si no hay opciones guardadas, aplicar valores por defecto de los sliders
            this.elementosDOM.audioBGM.volume = this.elementosDOM.sliderVolumenBGM.value;
            this.elementosDOM.audioSFX.volume = this.elementosDOM.sliderVolumenSFX.value;
            this.velocidadTexto = 110 - this.elementosDOM.sliderVelocidadTexto.value;
        }

        // Añadir listeners para guardar cambios en tiempo real
        this.elementosDOM.sliderVolumenBGM.addEventListener('input', (e) => {
            this.elementosDOM.audioBGM.volume = e.target.value;
            this.guardarOpciones();
        });
        this.elementosDOM.sliderVolumenSFX.addEventListener('input', (e) => {
            this.elementosDOM.audioSFX.volume = e.target.value;
            this.guardarOpciones();
        });
        this.elementosDOM.sliderVelocidadTexto.addEventListener('input', (e) => {
            // Invertimos el valor: un slider más alto significa un intervalo de tiempo más bajo (más rápido)
            this.velocidadTexto = 110 - e.target.value; 
            this.guardarOpciones();
        });

        this.elementosDOM.botonVolverOpciones.addEventListener('click', () => this.cerrarMenuOpciones());
        this.elementosDOM.botonOpcionesJuego.addEventListener('click', () => this.abrirMenuOpciones());
    }

    guardarOpciones() {
        const opciones = {
            volumenBgm: this.elementosDOM.audioBGM.volume,
            volumenSfx: this.elementosDOM.audioSFX.volume,
            velocidadTexto: this.velocidadTexto
        };
        localStorage.setItem('opciones_vn', JSON.stringify(opciones));
    }

    abrirMenuOpciones() {
        this.elementosDOM.pantallaOpciones.classList.remove('oculta');
    }

    cerrarMenuOpciones() {
        this.elementosDOM.pantallaOpciones.classList.add('oculta');
    }

    // --- Modificación a conectarControlesUI ---
    // La conexión del menú de guardado/carga se mantiene
    conectarControlesUI() {
        this.elementosDOM.botonGuardar.addEventListener('click', () => this.abrirMenu('guardar'));
        this.elementosDOM.botonCargar.addEventListener('click', () => this.abrirMenu('cargar'));
        this.elementosDOM.botonCerrarMenu.addEventListener('click', () => this.cerrarMenu());
    }

     // --- NUEVO: Método para reiniciar las variables del juego ---
    reiniciarVariables() {
        this.variables = {
            afecto_sayori: 0,
            afecto_monika: 0,
            dije_halago: false,
            tiene_poema: false,
        };
        console.log("Variables del juego reiniciadas:", this.variables);
    }
    
    // --- LÓGICA DE TRANSICIÓN DE ESCENA ACTUALIZADA ---
    async mostrarEscena(id) {
        // 1. Iniciar Fade-out a negro
        if (!this.superposicion.classList.contains('activa')) {
            this.superposicion.classList.add('activa');
            await new Promise(resolve => setTimeout(resolve, 500));
        } // Espera la transición CSS

        // 2. Actualizar todo mientras la pantalla está en negro
        let escena = this.guion.find(escena => escena.id === id);
        if (!escena) {
            console.error(`No se encontró la escena con el id: ${id}`);
            this.superposicion.classList.remove('activa');
            return;
        }
        this.escenaActual = escena;

        if (escena.tipo === 'operacion') {
            this.procesarEfectos(escena.efectos);
            // Saltamos a la siguiente escena sin renderizar nada
            this.mostrarEscena(escena.siguiente); 
            return; // Detenemos la ejecución aquí
        }

        if (escena.tipo === 'condicion') {
            const siguienteEscenaId = this.evaluarCondiciones(escena);
            // Saltamos a la escena resultante de la condición
            this.mostrarEscena(siguienteEscenaId);
            return; // Detenemos la ejecución aquí
        }

        this.gestionarAudio();
        this.renderizar(); // Renderiza la nueva escena OCULTA

        // 3. Iniciar Fade-in para revelar la nueva escena
        this.superposicion.classList.remove('activa');
    }

    /**
     * Inicia el juego cargando un archivo de guion de forma asíncrona.
     * @param {string} urlGuion - La ruta al archivo JSON del guion a cargar.
     */
     // --- CORRECCIÓN: Lógica de INICIAR JUEGO ---
   async iniciarJuego(urlGuion) {
        this.archivoGuionActual = urlGuion;
        try {
            const respuesta = await fetch(urlGuion);
            if (!respuesta.ok) throw new Error(`Error al cargar el guion: ${respuesta.statusText}`);
            this.guion = await respuesta.json();
            
            if (this.guion && this.guion.length > 0) {
                // Preparamos la primera escena SIN mostrarla todavía
                this.escenaActual = this.guion[0];
                this.gestionarAudio();
                this.renderizar(); // Renderiza la escena mientras la pantalla está en negro
                
                // Quitamos la superposición para revelar la primera escena (fade-in)
                this.superposicion.classList.remove('activa');
            } else {
                console.error("El guion está vacío.");
                this.superposicion.classList.remove('activa'); // También quita la pantalla negra en caso de error
            }
        } catch (error) {
            console.error("No se pudo iniciar el juego:", error);
            this.superposicion.classList.remove('activa'); // Y aquí
        }
    }

    // --- NUEVO: Lógica del Menú de Guardado/Carga ---
    abrirMenu(modo) {
        this.modoMenu = modo;
        this.elementosDOM.tituloMenuGuardado.textContent = modo === 'guardar' ? 'Guardar Partida' : 'Cargar Partida';
        this.renderizarSlots();
        this.elementosDOM.pantallaGuardado.classList.remove('oculta');
    }

    cerrarMenu() {
        this.elementosDOM.pantallaGuardado.classList.add('oculta');
        this.modoMenu = null;
    }

    renderizarSlots() {
        this.elementosDOM.slotsContainer.innerHTML = '';
        for (let i = 1; i <= this.ranurasGuardado; i++) {
            const slotEl = document.createElement('div');
            slotEl.classList.add('slot');
            const datosGuardados = localStorage.getItem(this.prefijoLocalStorage + i);

            if (datosGuardados) {
                const datos = JSON.parse(datosGuardados);
                slotEl.innerHTML = `
                    <strong>Ranura ${i}</strong>
                    <div class="slot-info">Escena: ${datos.idEscenaActual}</div>
                    <div class="slot-fecha">${new Date(datos.timestamp).toLocaleString()}</div>
                `;
            } else {
                slotEl.classList.add('vacio');
                slotEl.textContent = `[ Ranura ${i} Vacía ]`;
            }

            slotEl.addEventListener('click', () => {
                if (this.modoMenu === 'guardar') {
                    this.guardarPartida(i);
                } else if (this.modoMenu === 'cargar' && datosGuardados) {
                    this.cargarPartida(i);
                }
            });
            this.elementosDOM.slotsContainer.appendChild(slotEl);
        }
    }

    // --- INTEGRACIÓN CON GUARDADO Y CARGA ---
    guardarPartida(slotId) {
        const estadoJuego = {
            timestamp: Date.now(),
            idEscenaActual: this.escenaActual.id,
            archivoEscena: this.archivoGuionActual,
            personajesEnPantalla: this.escenaActual.personajes || [],
            fondoActual: this.fondoActual,
            bgmActual: this.bgmActual,
            variables: this.variables // Guardamos el estado de las variables
        };
        localStorage.setItem(this.prefijoLocalStorage + slotId, JSON.stringify(estadoJuego));
        this.renderizarSlots();
    }

    // --- CORRECCIÓN 2: Lógica de CARGAR PARTIDA ---
    async cargarPartida(slotId) {
        const datosGuardados = localStorage.getItem(this.prefijoLocalStorage + slotId);
        if (!datosGuardados) return;

        const datos = JSON.parse(datosGuardados);
        
        // Cierra el menú de carga y activa la transición a negro
        this.cerrarMenu();
        this.superposicion.classList.add('activa');
        await new Promise(resolve => setTimeout(resolve, 500));

        try {
            // Carga el guion si es necesario
            if (datos.archivoEscena !== this.archivoGuionActual) {
                const respuesta = await fetch(datos.archivoEscena);
                if (!respuesta.ok) throw new Error(`No se pudo cargar el guion: ${datos.archivoEscena}`);
                this.guion = await respuesta.json();
                this.archivoGuionActual = datos.archivoEscena;
            }

            const escena = this.guion.find(s => s.id === datos.idEscenaActual);
            if (!escena) throw new Error(`Escena con ID ${datos.idEscenaActual} no encontrada.`);
            this.escenaActual = escena;
            
            // --- ¡AQUÍ ESTÁ LA CLAVE! ---
            // Nos aseguramos de que la vista del juego esté activa y el menú principal oculto
            this.elementosDOM.menuPrincipal.classList.add('oculto');
            this.elementosDOM.juegoContainer.classList.remove('oculto');
            this.elementosDOM.controlesJuego.classList.remove('oculto');

            // Aplicamos todos los datos de la partida guardada
            this.aplicarEstadoCargado(datos);

        } catch (error) {
            console.error("Error al cargar la partida:", error);
        } finally {
            // Revela la escena cargada
            this.superposicion.classList.remove('activa');
        }
    }

    aplicarEstadoCargado(datos) {
        // Detener animación de texto
        if (this.intervaloTexto) clearInterval(this.intervaloTexto);
        this.animacionTextoEnCurso = false;

        // Restaurar fondo, BGM, personajes y texto (sin cambios)
        this.fondoActual = datos.fondoActual;
        this.elementosDOM.fondo.style.backgroundImage = `url('${this.fondoActual}')`;
        this.bgmActual = datos.bgmActual;
        if (this.bgmActual) { this.reproducirBGM(this.bgmActual); }
        else { this.detenerBGM(); }
        this.renderizarPersonajes();
        this.elementosDOM.textoDialogo.textContent = this.escenaActual.texto;
        this.elementosDOM.nombrePersonaje.textContent = this.escenaActual.personaje || '';
        
        // Limpiar y gestionar opciones
        this.elementosDOM.opcionesContainer.innerHTML = '';
        this.elementosDOM.cuadroDialogo.classList.remove('decision');
        this.elementosDOM.cuadroDialogo.removeEventListener('click', this.manejarAvanceDialogo);
        this.variables = datos.variables || {};

        if (this.escenaActual.tipo === 'decision') {
           this.elementosDOM.cuadroDialogo.classList.add('decision');
           this.escenaActual.opciones.forEach(opcion => {
                const boton = document.createElement('button');
                boton.textContent = opcion.texto;
                boton.addEventListener('click', () => this.mostrarEscena(opcion.siguiente));
                this.elementosDOM.opcionesContainer.appendChild(boton);
            });
        }
        
        // --- ¡CORRECCIÓN AQUÍ! ---
        // Si la escena cargada es un diálogo, nos aseguramos de que el clic para avanzar funcione.
        if (this.escenaActual.tipo === 'dialogo') {
            this.elementosDOM.cuadroDialogo.addEventListener('click', this.manejarAvanceDialogo);
        }
    }

    /**
     * Obtiene y almacena las referencias a los elementos del DOM.
     * @param {Object} selectores - El objeto con los selectores.
     * @returns {Object} Un objeto con las referencias a los nodos del DOM.
     */
    obtenerElementosDOM(selectores) {
        const elementos = {};
        for (const key in selectores) {
            elementos[key] = document.querySelector(selectores[key]);
        }
        return elementos;
    }

    /**
     * Busca una escena por su ID y la muestra en pantalla.
     * @param {string|number} id - El ID de la escena a mostrar.
     */
    mostrarEscena(id) {
        const escena = this.guion.find(escena => escena.id === id);
        if (!escena) {
            console.error(`No se encontró la escena con el id: ${id}`);
            return;
        }
        this.escenaActual = escena;

        // --- GESTIÓN DE AUDIO ---
        // Se maneja aquí para que se active una sola vez por escena.
        this.gestionarAudio();
        
        this.renderizar();
    }
    
     gestionarAudio() {
    const nuevaBGM = this.escenaActual.bgm;
    const sfx = this.escenaActual.sfx;

    // Si la propiedad 'bgm' existe en la escena actual
    if (nuevaBGM !== undefined) {
        // Y es diferente a la música que ya está sonando
        if (nuevaBGM !== this.bgmActual) {
            if (nuevaBGM === null || nuevaBGM === "") {
                // Si es nula o vacía, la detenemos
                this.detenerBGM();
            } else {
                // Si es una nueva canción, la reproducimos
                this.reproducirBGM(nuevaBGM);
            }
        }
    }
    // IMPORTANTE: Si la propiedad 'bgm' no existe (es undefined), no se hace nada.
    // Esto permite que la música que ya estaba sonando continúe sin interrupción.

    // La lógica de los efectos de sonido (SFX) no cambia.
    if (sfx) {
        this.reproducirSFX(sfx);
    }
}

    reproducirBGM(ruta) {
        this.bgmActual = ruta; // Guardar estado
        // Solo cambia la música si la ruta es diferente a la actual
        if (this.elementosDOM.audioBGM.src.endsWith(encodeURI(ruta))) return;
        this.elementosDOM.audioBGM.src = ruta;
        // La reproducción de audio puede fallar si el usuario no ha interactuado con la página
        this.elementosDOM.audioBGM.play().catch(e => console.warn("La reproducción de BGM fue bloqueada por el navegador. Se requiere interacción del usuario.", e));
    }

    detenerBGM() {
        this.bgmActual = null; // Guardar estado
        // Implementación simple de fade-out
        let vol = this.elementosDOM.audioBGM.volume;
        if (vol === 0) return;
        const fadeOut = setInterval(() => {
            if (vol > 0.1) {
                vol -= 0.1;
                this.elementosDOM.audioBGM.volume = vol;
            } else {
                clearInterval(fadeOut);
                this.elementosDOM.audioBGM.pause();
                this.elementosDOM.audioBGM.currentTime = 0;
                this.elementosDOM.audioBGM.volume = 1; // Resetea para la próxima vez
            }
        }, 50); // Se ejecuta cada 50ms
    }

    reproducirSFX(ruta) {
        this.elementosDOM.audioSFX.src = ruta;
        this.elementosDOM.audioSFX.play().catch(e => console.warn("La reproducción de SFX fue bloqueada.", e));
    }

     // --- NUEVO: Procesador de Efectos de Variables ---
    procesarEfectos(efectos) {
        if (!efectos || !Array.isArray(efectos)) return;

        efectos.forEach(efecto => {
            const { variable, operacion, valor } = efecto;
            
            // Inicializa la variable si no existe
            if (this.variables[variable] === undefined) {
                this.variables[variable] = 0; // O un valor inicial adecuado
            }

            switch (operacion) {
                case 'sumar':
                    this.variables[variable] += valor;
                    break;
                case 'restar':
                    this.variables[variable] -= valor;
                    break;
                case 'asignar':
                    this.variables[variable] = valor;
                    break;
                default:
                    console.warn(`Operación desconocida: ${operacion}`);
            }
        });
        console.log("Variables actualizadas:", this.variables);
    }
    
    // --- NUEVO: Evaluador de Condiciones ---
    evaluarCondicion(condicionStr) {
        const partes = condicionStr.split(' ');
        if (partes.length !== 3) return false;

        const [nombreVar, operador, valorStr] = partes;
        const valorVar = this.variables[nombreVar];
        
        // Convertir el valor del JSON a su tipo correcto (número, booleano, etc.)
        let valorCondicion;
        if (!isNaN(parseFloat(valorStr))) {
            valorCondicion = parseFloat(valorStr);
        } else if (valorStr === 'true') {
            valorCondicion = true;
        } else if (valorStr === 'false') {
            valorCondicion = false;
        } else {
            valorCondicion = valorStr; // Comparación de strings
        }

        switch (operador) {
            case '>=': return valorVar >= valorCondicion;
            case '<=': return valorVar <= valorCondicion;
            case '>': return valorVar > valorCondicion;
            case '<': return valorVar < valorCondicion;
            case '==': return valorVar == valorCondicion;
            case '!=': return valorVar != valorCondicion;
            default: return false;
        }
    }

    evaluarCondiciones(escena) {
        for (const rama of escena.ramas) {
            if (this.evaluarCondicion(rama.condicion)) {
                return rama.siguiente; // Devuelve el ID de la primera condición que se cumple
            }
        }
        return escena.por_defecto; // Si ninguna se cumple, devuelve la por defecto
    }


renderizar() {
    const { fondo, nombrePersonaje, textoDialogo, opcionesContainer, cuadroDialogo } = this.elementosDOM;
    
    if (this.escenaActual.hasOwnProperty('imagenFondo')) {
        this.fondoActual = this.escenaActual.imagenFondo;
        this.elementosDOM.fondo.style.backgroundImage = `url('${this.fondoActual}')`;
    }
    
    this.renderizarPersonajes();
    nombrePersonaje.textContent = this.escenaActual.personaje || '';
    
    opcionesContainer.innerHTML = '';
    cuadroDialogo.removeEventListener('click', this.manejarAvanceDialogo);
    cuadroDialogo.classList.remove('decision');

    // --- ¡CAMBIO PRINCIPAL AQUÍ! ---

    if (this.escenaActual.tipo === 'dialogo') {
        // Para diálogos normales, solo mostramos el texto.
        this.mostrarTextoAnimado(this.escenaActual.texto);
        cuadroDialogo.addEventListener('click', this.manejarAvanceDialogo);

    } else if (this.escenaActual.tipo === 'decision') {
        cuadroDialogo.classList.add('decision');

        // Creamos una función que contiene la lógica para mostrar los botones.
        const mostrarOpciones = () => {
            this.escenaActual.opciones.forEach(opcion => {
                if (opcion.condicion && !this.evaluarCondicion(opcion.condicion)) {
                    return;
                }
                const boton = document.createElement('button');
                boton.textContent = opcion.texto;
                boton.addEventListener('click', () => {
                    this.procesarEfectos(opcion.efectos); 
                    this.mostrarEscena(opcion.siguiente);
                });
                opcionesContainer.appendChild(boton);
            });
        };

        // Mostramos el texto y le pasamos la función "mostrarOpciones"
        // para que se ejecute al terminar.
        this.mostrarTextoAnimado(this.escenaActual.texto, mostrarOpciones);
    }
}
    
    // --- NUEVO MÉTODO PARA RENDERIZAR PERSONAJES ---
        /**
     * Gestiona la visibilidad, estado y sprites de los personajes en pantalla.
     * Esta función ahora controla:
     * 1. Quién aparece y desaparece.
     * 2. Quién está hablando (.hablando) y quién escucha (.escuchando).
     * 3. El cambio dinámico al sprite "_hablando.png" para el hablante.
     */
    renderizarPersonajes() {
        const hablante = this.escenaActual.personaje;
        const personajesEnEscena = this.escenaActual.personajes || [];
        const posicionesEnEscena = new Set(personajesEnEscena.map(p => p.posicion));

        // Ocultar personajes usando la clase .visible
        for (const pos in this.elementosPersonajes) {
            if (!posicionesEnEscena.has(pos)) {
                this.elementosPersonajes[pos].classList.remove('visible');
            }
        }

        // 2. Procesar cada personaje que debe estar en pantalla
        personajesEnEscena.forEach(personajeData => {
            const el = this.elementosPersonajes[personajeData.posicion];
            if (!el) return; // Salvaguarda por si la posición es inválida

            let spriteFinal = personajeData.sprite; // Por defecto, usa el sprite base del JSON

            // 3. Determinar si el personaje está hablando o escuchando
            if (personajeData.nombre === hablante) {
                // ESTÁ HABLANDO
                el.classList.add('hablando');
                el.classList.remove('escuchando');

                // CONVENCIÓN DE NOMBRES: Construir la ruta del sprite parlante
                // Reemplaza "_estado.png" con "_hablando.png" de forma robusta
                spriteFinal = personajeData.sprite.replace(/_([^_]+)\.(png|webp|jpg)$/, '_hablando.$2');
                
            } else {
                // ESTÁ ESCUCHANDO
                el.classList.add('escuchando');
                el.classList.remove('hablando');
                // Se asegura de usar el sprite base definido en el JSON
            }
            
            // 4. Actualizar la imagen solo si ha cambiado para optimizar
            if (!el.src.endsWith(encodeURI(spriteFinal))) {
                el.src = spriteFinal;
            }
            // Mostrar el personaje usando la clase .visible
            el.classList.add('visible');
            // 5. Asegurarse de que el personaje sea visible
            el.style.opacity = '1';
        });
    }

     // --- LÓGICA DE AVANCE ACTUALIZADA PARA LA MÁQUINA DE ESCRIBIR ---
    manejarAvanceDialogo() {
        // Si la animación está en curso, el primer clic la SALTA.
        if (this.animacionTextoEnCurso) {
            clearInterval(this.intervaloTexto);
            this.animacionTextoEnCurso = false;
            this.elementosDOM.textoDialogo.textContent = this.escenaActual.texto;
            return; // Detiene la ejecución para no pasar de escena
        }
        
        // Si la animación ya terminó, el segundo clic AVANZA de escena.
        if (this.escenaActual.tipo === 'dialogo' && this.escenaActual.siguiente) {
            this.mostrarEscena(this.escenaActual.siguiente);
        }
    }

 // --- NUEVO: MÉTODO PARA EFECTO MÁQUINA DE ESCRIBIR ---
        mostrarTextoAnimado(texto, alTerminar) { // Añadimos el parámetro "alTerminar"
    if (this.intervaloTexto) clearInterval(this.intervaloTexto);
    
    this.elementosDOM.textoDialogo.textContent = '';
    this.animacionTextoEnCurso = true;
    let i = 0;

    this.intervaloTexto = setInterval(() => {
        if (i < texto.length) {
            this.elementosDOM.textoDialogo.textContent += texto.charAt(i);
            i++;
        } else {
            clearInterval(this.intervaloTexto);
            this.animacionTextoEnCurso = false;
            
            // --- ¡CAMBIO AQUÍ! ---
            // Si nos pasaron una función "alTerminar", la ejecutamos ahora.
            if (alTerminar) {
                alTerminar();
            }
        }
        }, this.velocidadTexto);
    }
    }