const { pool } = require('../config/database');

// Obtener pedidos asignados al empleado que hace la solicitud
exports.getPedidosAsignados = async (req, res) => {
    try {
        const empleadoId = req.user.id; // id_usuario
        // Intentamos obtener el id_empleado relacionado al usuario
        const [empleadoRows] = await pool.execute('SELECT id_empleado FROM empleado WHERE id_usuario = ?', [empleadoId]);
        if (empleadoRows.length === 0) {
            return res.status(404).json({ success: false, message: 'Empleado no encontrado' });
        }
        const idEmpleado = empleadoRows[0].id_empleado;

        // Obtener pedidos asignados a este empleado
        const [pedidos] = await pool.execute(
            `SELECT p.id_pedido, p.subtotal, p.impuestos, p.descuentos, p.total, p.estado_pedido, p.fecha_pedido, c.nombre AS cliente_nombre, c.id_cliente, p.id_empleado_asignado
             FROM pedido p
             LEFT JOIN cliente cl ON p.id_cliente = cl.id_cliente
             LEFT JOIN usuario c ON cl.id_usuario = c.id_usuario
             WHERE p.id_empleado_asignado = ?`,
            [idEmpleado]
        );

        res.json({ success: true, pedidos });
    } catch (error) {
        console.error('Error getPedidosAsignados:', error);
        res.status(500).json({ success: false, message: 'Error interno del servidor' });
    }
};

// Actualizar estado de un pedido (solo si está asignado al empleado o si es admin)
exports.updateEstadoPedido = async (req, res) => {
    try {
        const pedidoId = req.params.id;
        const { nuevoEstado } = req.body;
        const user = req.user;

        // Obtener pedido
        const [pedidoRows] = await pool.execute('SELECT id_pedido, id_empleado_asignado FROM pedido WHERE id_pedido = ?', [pedidoId]);
        if (pedidoRows.length === 0) {
            return res.status(404).json({ success: false, message: 'Pedido no encontrado' });
        }
        const pedido = pedidoRows[0];

        // Obtener id_empleado del usuario
        const [empleadoRows] = await pool.execute('SELECT id_empleado, id_usuario FROM empleado WHERE id_usuario = ?', [user.id]);
        const idEmpleado = empleadoRows.length ? empleadoRows[0].id_empleado : null;

        // Verificar si el usuario tiene permiso para actualizar (admin o asignado)
        if (user.tipoUsuario !== 'Administrador' && pedido.id_empleado_asignado !== idEmpleado) {
            return res.status(403).json({ success: false, message: 'No tienes permiso para actualizar este pedido' });
        }

        // Actualizar estado
        await pool.execute('UPDATE pedido SET estado_pedido = ? WHERE id_pedido = ?', [nuevoEstado, pedidoId]);

        // Opcional: emitir evento real-time (si se integra sockets)

        res.json({ success: true, message: 'Estado del pedido actualizado' });
    } catch (error) {
        console.error('Error updateEstadoPedido:', error);
        res.status(500).json({ success: false, message: 'Error interno del servidor' });
    }
};
