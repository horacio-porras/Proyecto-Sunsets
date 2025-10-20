import { obtenerEmpleados, crearEmpleado, editarEmpleado, archivarEmpleado } from './services/empleadoService.js';

const tabla = document.getElementById('tablaEmpleados');
const modal = document.getElementById('modalEmpleado');
const form = document.getElementById('formEmpleado');
const modalTitulo = document.getElementById('modalTitulo');
const btnNuevo = document.getElementById('btnNuevoEmpleado');
const btnCancelar = document.getElementById('btnCancelar');

let editandoId = null;

// Cargar empleados
async function cargarEmpleados() {
    tabla.innerHTML = '<tr><td colspan="6" class="text-center py-4 text-gray-500">Cargando empleados...</td></tr>';
    try {
        const empleados = await obtenerEmpleados();
        if (!empleados.length) {
            tabla.innerHTML = '<tr><td colspan="6" class="text-center py-4 text-gray-500">No hay empleados registrados</td></tr>';
            return;
        }

        tabla.innerHTML = empleados.map(e => `
            <tr>
                <td class="px-6 py-4">${e.nombre}</td>
                <td class="px-6 py-4">${e.correo}</td>
                <td class="px-6 py-4">${e.telefono}</td>
                <td class="px-6 py-4">${e.area_trabajo}</td>
                <td class="px-6 py-4">
                    <span class="text-sm px-2 py-1 rounded ${!e.archivado ? 'bg-green-100 text-green-800' : 'bg-gray-200 text-gray-600'}">
                        ${!e.archivado ? 'Activo' : 'Archivado'}
                    </span>
                </td>
                <td class="px-6 py-4 text-center space-x-2">
                    <button class="text-blue-600 hover:underline btnEditar" 
                        data-id="${e.id_empleado}" 
                        data-nombre="${e.nombre}" 
                        data-correo="${e.correo}" 
                        data-telefono="${e.telefono}" 
                        data-area="${e.area_trabajo}">Editar</button>
                    <button class="text-red-600 hover:underline btnArchivar" data-id="${e.id_empleado}">Archivar</button>
                </td>
            </tr>
        `).join('');

        // Editar
        tabla.querySelectorAll('.btnEditar').forEach(btn => {
            btn.addEventListener('click', () => {
                editandoId = btn.dataset.id;
                modalTitulo.textContent = 'Editar Empleado';
                document.getElementById('nombre').value = btn.dataset.nombre;
                document.getElementById('correo').value = btn.dataset.correo;
                document.getElementById('telefono').value = btn.dataset.telefono;
                document.getElementById('area_trabajo').value = btn.dataset.area;
                modal.classList.remove('hidden');
                modal.classList.add('flex');
            });
        });

        // Archivar
        tabla.querySelectorAll('.btnArchivar').forEach(btn => {
            btn.addEventListener('click', async () => {
                if (!confirm('¿Deseas archivar este empleado?')) return;
                await archivarEmpleado(btn.dataset.id);
                await cargarEmpleados();
            });
        });

    } catch (error) {
        tabla.innerHTML = '<tr><td colspan="6" class="text-center py-4 text-red-500">Error al cargar empleados</td></tr>';
        console.error(error);
    }
}

// Nuevo
btnNuevo.addEventListener('click', () => {
    editandoId = null;
    modalTitulo.textContent = 'Nuevo Empleado';
    form.reset();
    modal.classList.remove('hidden');
    modal.classList.add('flex');
});

// Cancelar
btnCancelar.addEventListener('click', () => modal.classList.add('hidden'));

// Guardar empleado
form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const nombre = document.getElementById('nombre').value.trim();
    const correo = document.getElementById('correo').value.trim();
    const telefono = document.getElementById('telefono').value.trim();
    const area_trabajo = document.getElementById('area_trabajo').value.trim();

    try {
        if (editandoId) {
            await editarEmpleado(editandoId, { nombre, correo, telefono, area_trabajo });
        } else {
            await crearEmpleado({ nombre, correo, telefono, area_trabajo });
        }
        modal.classList.add('hidden');
        await cargarEmpleados();
    } catch (error) {
        console.error('Error al guardar empleado:', error);
        alert('Error al guardar empleado');
    }
});

// Inicializar tabla
cargarEmpleados();
