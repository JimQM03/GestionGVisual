// ================================================
// SCRIPT.JS - VERSION LOCAL (SIN BACKEND)
// Almacenamiento: localStorage del navegador
// ================================================

// --- UTILIDADES DE ALMACENAMIENTO LOCAL ---

function obtenerGastos() {
    return JSON.parse(localStorage.getItem('gestiong_gastos') || '[]');
}

function guardarGastos(gastos) {
    localStorage.setItem('gestiong_gastos', JSON.stringify(gastos));
}

function obtenerIngresos() {
    return JSON.parse(localStorage.getItem('gestiong_ingresos') || '[]');
}

function guardarIngresos(ingresos) {
    localStorage.setItem('gestiong_ingresos', JSON.stringify(ingresos));
}

function generarId() {
    return Date.now() + Math.floor(Math.random() * 1000);
}

// --- SESIÓN SIMPLIFICADA (SOLO LOCAL) ---
(function() {
    const usuario = localStorage.getItem('usuario_local') || 'Usuario';
    const display = document.getElementById('nombre-usuario-display');
    if (display) display.textContent = usuario;
})();

function cerrarSesion() {
    mostrarNotificacion('👋 Sesión cerrada', 'info');
    setTimeout(() => {
        window.location.href = 'index.html';
    }, 1000);
}

// --- NOTIFICACIONES ---
function mostrarNotificacion(mensaje, tipo = 'success') {
    const notif = document.createElement('div');
    notif.style.cssText = `
        position: fixed; top: 20px; right: 20px;
        padding: 15px 25px; border-radius: 8px;
        color: white; font-weight: bold; z-index: 10000;
        background-color: ${tipo === 'success' ? '#28a745' : tipo === 'info' ? '#007bff' : '#dc3545'};
        box-shadow: 0 4px 6px rgba(0,0,0,0.15);
        transition: opacity 0.3s ease;
    `;
    notif.textContent = mensaje;
    document.body.appendChild(notif);
    setTimeout(() => {
        notif.style.opacity = '0';
        setTimeout(() => notif.remove(), 300);
    }, 3000);
}

// --- FUNCIONES DE CÁLCULO Y VISUALIZACIÓN ---

function actualizarTotales() {
    const gastos   = obtenerGastos();
    const ingresos = obtenerIngresos();

    const totalGastos   = gastos.reduce((acc, g) => acc + parseFloat(g.valor || 0), 0);
    const totalIngresos = ingresos.reduce((acc, i) => acc + parseFloat(i.monto || 0), 0);
    const ahorro        = totalIngresos * 0.1;

    // Resumen superior
    const displaySueldo = document.getElementById('Mostrar-sueldo');
    if (displaySueldo) displaySueldo.textContent = totalIngresos.toLocaleString('es-CO');

    const displayAhorro = document.getElementById('Ahorro-quincenal');
    if (displayAhorro) displayAhorro.textContent = ahorro.toLocaleString('es-CO');

    // Valor por clase (si hay datos guardados)
    const ultimoIngreso = ingresos[ingresos.length - 1];
    const valorClase = document.getElementById('valor-clase');
    if (valorClase && ultimoIngreso && ultimoIngreso.clases > 0) {
        const vClase = ultimoIngreso.monto / ultimoIngreso.clases;
        valorClase.textContent = Math.round(vClase).toLocaleString('es-CO');
    }

    // Total en tabla
    const displayTotal = document.getElementById('total-gastado');
    if (displayTotal) displayTotal.textContent = `$${totalGastos.toLocaleString('es-CO')}`;

    // Actualizar gráfico
    actualizarGrafico(gastos);
}

function cargarHistorial() {
    const gastos = obtenerGastos();
    const tbody  = document.getElementById('cuerpo-historial');
    if (!tbody) return;

    tbody.innerHTML = '';

    if (gastos.length === 0) {
        tbody.innerHTML = '<tr><td colspan="5" style="text-align:center">Aún no hay registros en el historial.</td></tr>';
        return;
    }

    // Ordenar por fecha descendente
    const gastosOrdenados = [...gastos].sort((a, b) => new Date(b.fecha) - new Date(a.fecha));

    gastosOrdenados.forEach(g => {
        const tipo     = g.prioridad || 'Fijo';
        const claseCss = tipo.toLowerCase();
        const fila = `
            <tr>
                <td>${g.fecha}</td>
                <td>${g.nombre}</td>
                <td style="color:#dc3545; font-weight:bold">$${parseFloat(g.valor).toLocaleString('es-CO')}</td>
                <td><span class="badge ${claseCss}">${tipo}</span></td>
                <td><button class="btn-eliminar" onclick="eliminarGasto(${g.id})">🗑️</button></td>
            </tr>`;
        tbody.innerHTML += fila;
    });
}

// --- GRÁFICO DE GASTOS ---
let graficoPie = null;

function actualizarGrafico(gastos) {
    const canvas = document.getElementById('graficoGastos');
    if (!canvas) return;

    // Agrupar por prioridad/tipo
    const grupos = {};
    gastos.forEach(g => {
        const tipo = g.prioridad || 'Fijo';
        grupos[tipo] = (grupos[tipo] || 0) + parseFloat(g.valor || 0);
    });

    const etiquetas = Object.keys(grupos);
    const valores   = Object.values(grupos);

    if (etiquetas.length === 0) {
        if (graficoPie) { graficoPie.destroy(); graficoPie = null; }
        return;
    }

    const colores = ['#0074d9', '#ff851b', '#ff4136', '#2ecc40', '#b10dc9', '#ffdc00'];

    if (graficoPie) graficoPie.destroy();

    graficoPie = new Chart(canvas, {
        type: 'doughnut',
        data: {
            labels: etiquetas,
            datasets: [{
                data: valores,
                backgroundColor: colores.slice(0, etiquetas.length),
                borderWidth: 2,
                borderColor: '#fff'
            }]
        },
        options: {
            responsive: true,
            plugins: {
                legend: { position: 'bottom' },
                tooltip: {
                    callbacks: {
                        label: (ctx) => ` $${ctx.parsed.toLocaleString('es-CO')}`
                    }
                }
            }
        }
    });
}

// --- ACCIONES CRUD ---

function registrarGastoEspecial(nombre, valor, tipo, fecha) {
    const fechaFinal = fecha && fecha !== '' ? fecha : new Date().toISOString().split('T')[0];

    const gastos = obtenerGastos();
    gastos.push({
        id:        generarId(),
        nombre:    nombre,
        valor:     parseFloat(valor),
        fecha:     fechaFinal,
        prioridad: tipo
    });
    guardarGastos(gastos);
}

function eliminarGasto(id) {
    if (!confirm('¿Eliminar este gasto?')) return;

    const gastos = obtenerGastos().filter(g => g.id !== id);
    guardarGastos(gastos);

    mostrarNotificacion('✅ Gasto eliminado');
    cargarHistorial();
    actualizarTotales();
}

// --- INICIALIZACIÓN DE EVENTOS ---

document.addEventListener('DOMContentLoaded', () => {
    cargarHistorial();
    actualizarTotales();

    // 1. GUARDAR INGRESO
    document.getElementById('botonGuardar')?.addEventListener('click', () => {
        const monto  = document.getElementById('CopQuincenal')?.value;
        const clases = document.getElementById('num-clases')?.value;

        if (!monto || !clases) {
            return mostrarNotificacion('Monto y clases son obligatorios', 'error');
        }

        const ingresos = obtenerIngresos();
        ingresos.push({
            id:     generarId(),
            monto:  parseFloat(monto),
            clases: parseInt(clases),
            fecha:  new Date().toISOString().split('T')[0]
        });
        guardarIngresos(ingresos);

        mostrarNotificacion('✅ Ingreso guardado');

        // Limpiar campos
        document.getElementById('CopQuincenal').value = '';
        document.getElementById('num-clases').value   = '';
        const desc = document.getElementById('desc-ingreso');
        if (desc) desc.value = '';

        actualizarTotales();
    });

    // 2. CALCULAR Y GUARDAR GASTOS
    document.getElementById('botonCalcularGastos')?.addEventListener('click', () => {
        const fechaUnica = document.getElementById('fecha-global-registro')?.value;
        const descGasto  = document.getElementById('desc-gasto')?.value.trim();
        const valorGasto = document.getElementById('valor-gasto-real')?.value;
        const vCompras   = document.getElementById('gasto-compras')?.value;
        const vAntojos   = document.getElementById('gasto-antojos')?.value;
        const dCorto     = document.getElementById('deuda-corto')?.value;
        const dLargo     = document.getElementById('deuda-largo')?.value;

        const hayDatos = descGasto || valorGasto || vCompras || vAntojos || dCorto || dLargo;
        if (!hayDatos) {
            return mostrarNotificacion('❌ No hay datos para registrar', 'error');
        }

        if (descGasto && valorGasto)  registrarGastoEspecial(descGasto,          valorGasto, 'Media',    fechaUnica);
        if (vCompras > 0)             registrarGastoEspecial('Mercado',           vCompras,   'Variable', fechaUnica);
        if (vAntojos > 0)             registrarGastoEspecial('Antojos',           vAntojos,   'Variable', fechaUnica);
        if (dCorto > 0)               registrarGastoEspecial('Deuda Celular',     dCorto,     'Deuda',    fechaUnica);
        if (dLargo > 0)               registrarGastoEspecial('Deuda Largo Plazo', dLargo,     'Deuda',    fechaUnica);

        // Limpiar campos
        ['desc-gasto', 'valor-gasto-real', 'gasto-compras', 'gasto-antojos', 'deuda-corto', 'deuda-largo']
            .forEach(id => { const el = document.getElementById(id); if (el) el.value = ''; });

        cargarHistorial();
        actualizarTotales();
        mostrarNotificacion('✅ Registros guardados');
    });

    // 3. BORRAR TODO EL HISTORIAL
    document.getElementById('botonBorrarHistorial')?.addEventListener('click', () => {
        if (!confirm('⚠️ ¿ESTÁS SEGURO? Esta acción borrará TODOS los registros permanentemente.')) return;

        localStorage.removeItem('gestiong_gastos');
        localStorage.removeItem('gestiong_ingresos');

        cargarHistorial();
        actualizarTotales();
        mostrarNotificacion('🗑️ Historial vaciado con éxito');
    });

    // 4. EXPORTAR A CSV
    document.getElementById('boton-exportar')?.addEventListener('click', () => {
        const gastos = obtenerGastos();
        if (gastos.length === 0) {
            return mostrarNotificacion('No hay datos para exportar', 'error');
        }

        let csv = 'Fecha,Descripcion,Valor,Prioridad\n';
        gastos.forEach(g => {
            csv += `${g.fecha},"${g.nombre}",${g.valor},${g.prioridad}\n`;
        });

        const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
        const url  = URL.createObjectURL(blob);
        const a    = document.createElement('a');
        a.href     = url;
        a.download = `Reporte_GestionG_${new Date().toISOString().split('T')[0]}.csv`;
        a.click();
        URL.revokeObjectURL(url);
        mostrarNotificacion('✅ Archivo CSV exportado');
    });
});
