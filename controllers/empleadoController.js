const pool = require('../config/database');

// Crear empleado
exports.crearEmpleado = async (req, res) => {
  const { nombre, correo, telefono, area_trabajo } = req.body;
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();

    // Insertar usuario
    const [resultUsuario] = await conn.query(
      'INSERT INTO usuario (nombre, correo, telefono, id_rol, fecha_registro, activo) VALUES (?, ?, ?, ?, NOW(), TRUE)',
      [nombre, correo, telefono, 2] // 2 = Empleado
    );

    const id_usuario = resultUsuario.insertId;

    // Insertar empleado
    await conn.query(
      'INSERT INTO empleado (id_usuario, area_trabajo, fecha_contratacion, archivado) VALUES (?, ?, NOW(), FALSE)',
      [id_usuario, area_trabajo]
    );

    await conn.commit();
    res.status(201).json({ mensaje: 'Empleado creado correctamente' });
  } catch (error) {
    await conn.rollback();
    res.status(500).json({ mensaje: 'Error al crear empleado', error });
  } finally {
    conn.release();
  }
};

// Listar empleados
exports.obtenerEmpleados = async (req, res) => {
  try {
    const [empleados] = await pool.query(
      `SELECT e.id_empleado, u.nombre, u.correo, u.telefono, e.area_trabajo, e.archivado
       FROM empleado e
       JOIN usuario u ON e.id_usuario = u.id_usuario`
    );
    res.json(empleados);
  } catch (error) {
    res.status(500).json({ mensaje: 'Error al obtener empleados', error });
  }
};

// Editar empleado
exports.editarEmpleado = async (req, res) => {
  const { id } = req.params;
  const { nombre, correo, telefono, area_trabajo } = req.body;
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();

    // Obtener id_usuario
    const [rows] = await conn.query('SELECT id_usuario FROM empleado WHERE id_empleado = ?', [id]);
    if (rows.length === 0) return res.status(404).json({ mensaje: 'Empleado no encontrado' });
    const id_usuario = rows[0].id_usuario;

    // Actualizar usuario
    await conn.query(
      'UPDATE usuario SET nombre = ?, correo = ?, telefono = ? WHERE id_usuario = ?',
      [nombre, correo, telefono, id_usuario]
    );

    // Actualizar empleado
    await conn.query(
      'UPDATE empleado SET area_trabajo = ? WHERE id_empleado = ?',
      [area_trabajo, id]
    );

    await conn.commit();
    res.json({ mensaje: 'Empleado actualizado correctamente' });
  } catch (error) {
    await conn.rollback();
    res.status(500).json({ mensaje: 'Error al editar empleado', error });
  } finally {
    conn.release();
  }
};

// Archivar empleado
exports.archivarEmpleado = async (req, res) => {
  const { id } = req.params;
  try {
    await pool.query('UPDATE empleado SET archivado = TRUE WHERE id_empleado = ?', [id]);
    res.json({ mensaje: 'Empleado archivado correctamente' });
  } catch (error) {
    res.status(500).json({ mensaje: 'Error al archivar empleado', error });
  }
};
