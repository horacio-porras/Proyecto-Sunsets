const API_URL = 'http://localhost:3000/api/empleado';

export const obtenerEmpleados = async () => {
    const token = localStorage.getItem('authToken');
    const res = await fetch(API_URL, {
        headers: { Authorization: `Bearer ${token}` }
    });
    if (!res.ok) throw new Error('No se pudieron obtener los empleados');
    return res.json();
};

export const crearEmpleado = async (empleado) => {
    const token = localStorage.getItem('authToken');
    const res = await fetch(API_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify(empleado)
    });
    if (!res.ok) {
        const err = await res.json();
        throw new Error(err.message || 'Error al crear empleado');
    }
    return res.json();
};

export const editarEmpleado = async (id, empleado) => {
    const token = localStorage.getItem('authToken');
    const res = await fetch(`${API_URL}/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify(empleado)
    });
    if (!res.ok) {
        const err = await res.json();
        throw new Error(err.message || 'Error al editar empleado');
    }
    return res.json();
};

export const archivarEmpleado = async (id) => {
    const token = localStorage.getItem('authToken');
    const res = await fetch(`${API_URL}/${id}/archivar`, {
        method: 'PATCH',
        headers: { Authorization: `Bearer ${token}` }
    });
    if (!res.ok) {
        const err = await res.json();
        throw new Error(err.message || 'Error al archivar empleado');
    }
    return res.json();
};
