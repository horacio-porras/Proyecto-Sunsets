const API_URL = 'https://localhost:3000/api/producto';

export const obtenerProductos = async () => {
    const token = localStorage.getItem('authToken');
    const res = await fetch(API_URL, { headers: { Authorization: `Bearer ${token}` } });
    return res.json();
};

export const crearProducto = async (producto) => {
    const token = localStorage.getItem('authToken');
    const res = await fetch(API_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify(producto)
    });
    return res.json();
};

export const editarProducto = async (id, producto) => {
    const token = localStorage.getItem('authToken');
    const res = await fetch(`${API_URL}/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify(producto)
    });
    return res.json();
};

export const eliminarProducto = async (id) => {
    const token = localStorage.getItem('authToken');
    const res = await fetch(`${API_URL}/${id}`, { method: 'DELETE', headers: { Authorization: `Bearer ${token}` } });
    return res.json();
};
