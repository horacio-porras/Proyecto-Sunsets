-- Crear la base de datos
CREATE DATABASE IF NOT EXISTS SunsetsDB;
USE SunsetsDB;

CREATE TABLE rol (
    id_rol INT PRIMARY KEY AUTO_INCREMENT,
    nombre_rol VARCHAR(50) UNIQUE
);

-- Tabla USUARIO
CREATE TABLE usuario (
    id_usuario INT PRIMARY KEY AUTO_INCREMENT,
    nombre VARCHAR(100),
    correo VARCHAR(100) UNIQUE,
    telefono VARCHAR(20),
    contrasena VARCHAR(255),
    id_rol INT,
    fecha_registro DATETIME,
    activo BOOLEAN,
    FOREIGN KEY (id_rol) REFERENCES rol(id_rol)
);

-- Tabla CLIENTE
CREATE TABLE cliente (
    id_cliente INT PRIMARY KEY AUTO_INCREMENT,
    id_usuario INT,
    puntos_acumulados INT,
    fecha_registro_programa DATETIME,
    notificaciones_activas BOOLEAN,
    FOREIGN KEY (id_usuario) REFERENCES usuario(id_usuario)
);

-- Tabla EMPLEADO
CREATE TABLE empleado (
    id_empleado INT PRIMARY KEY AUTO_INCREMENT,
    id_usuario INT,
    area_trabajo VARCHAR(100),
    fecha_contratacion DATETIME,
    archivado BOOLEAN,
    FOREIGN KEY (id_usuario) REFERENCES usuario(id_usuario)
);

-- Tabla ADMINISTRADOR
CREATE TABLE administrador (
    id_admin INT PRIMARY KEY AUTO_INCREMENT,
    id_usuario INT,
    permisos_especiales VARCHAR(255),
    FOREIGN KEY (id_usuario) REFERENCES usuario(id_usuario)
);

-- Tabla DIRECCION
CREATE TABLE direccion (
    id_direccion INT PRIMARY KEY AUTO_INCREMENT,
    id_cliente INT,
    direccion_completa TEXT,
    referencia TEXT,
    provincia VARCHAR(100),
    canton VARCHAR(100),
    distrito VARCHAR(100),
    direccion_principal BOOLEAN,
    FOREIGN KEY (id_cliente) REFERENCES cliente(id_cliente)
);

-- Tabla CATEGORIA
CREATE TABLE categoria (
    id_categoria INT PRIMARY KEY AUTO_INCREMENT,
    nombre_categoria VARCHAR(100),
    descripcion TEXT,
    activa BOOLEAN
);

-- Tabla PRODUCTO
CREATE TABLE producto (
    id_producto INT PRIMARY KEY AUTO_INCREMENT,
    id_categoria INT,
    nombre VARCHAR(100),
    descripcion TEXT,
    ingredientes TEXT,
    precio DECIMAL(10,2),
    imagen_url VARCHAR(255),
    vegetariano BOOLEAN,
    vegano BOOLEAN,
    sin_gluten BOOLEAN,
    disponible BOOLEAN,
    tiempo_preparacion INT,
    FOREIGN KEY (id_categoria) REFERENCES categoria(id_categoria)
);

-- Tabla INVENTARIO
CREATE TABLE inventario (
    id_inventario INT PRIMARY KEY AUTO_INCREMENT,
    nombre_item VARCHAR(100),
    cantidad_actual INT,
    cantidad_minima INT,
    unidad_medida VARCHAR(50),
    costo_unitario DECIMAL(10,2),
    ultima_actualizacion DATETIME,
    id_responsable INT,
    FOREIGN KEY (id_responsable) REFERENCES empleado(id_empleado)
);

-- Tabla MOVIMIENTO_INVENTARIO
CREATE TABLE movimiento_inventario (
    id_movimiento INT PRIMARY KEY AUTO_INCREMENT,
    id_inventario INT,
    id_responsable INT,
    tipo_movimiento VARCHAR(50),
    cantidad INT,
    motivo TEXT,
    fecha_movimiento DATETIME,
    FOREIGN KEY (id_inventario) REFERENCES inventario(id_inventario),
    FOREIGN KEY (id_responsable) REFERENCES empleado(id_empleado)
);

-- Tabla PEDIDO
CREATE TABLE pedido (
    id_pedido INT PRIMARY KEY AUTO_INCREMENT,
    id_cliente INT,
    id_direccion INT,
    id_empleado_asignado INT,
    subtotal DECIMAL(10,2),
    impuestos DECIMAL(10,2),
    descuentos DECIMAL(10,2),
    total DECIMAL(10,2),
    estado_pedido VARCHAR(50),
    fecha_pedido DATETIME,
    fecha_entrega_estimada DATETIME,
    metodo_pago VARCHAR(50),
    notas_especiales TEXT,
    puntos_otorgados INT,
    FOREIGN KEY (id_cliente) REFERENCES cliente(id_cliente),
    FOREIGN KEY (id_direccion) REFERENCES direccion(id_direccion),
    FOREIGN KEY (id_empleado_asignado) REFERENCES empleado(id_empleado)
);

-- Tabla DETALLE_PEDIDO
CREATE TABLE detalle_pedido (
    id_detalle INT PRIMARY KEY AUTO_INCREMENT,
    id_pedido INT,
    id_producto INT,
    cantidad INT,
    precio_unitario DECIMAL(10,2),
    subtotal_item DECIMAL(10,2),
    personalizaciones TEXT,
    notas_producto TEXT,
    FOREIGN KEY (id_pedido) REFERENCES pedido(id_pedido),
    FOREIGN KEY (id_producto) REFERENCES producto(id_producto)
);

-- Tabla FACTURA
CREATE TABLE factura (
    id_factura INT PRIMARY KEY AUTO_INCREMENT,
    id_pedido INT,
    numero_factura VARCHAR(50),
    fecha_emision DATETIME,
    total_facturado DECIMAL(10,2),
    metodo_pago VARCHAR(50),
    estado_pago VARCHAR(50),
    detalles_fiscales TEXT,
    FOREIGN KEY (id_pedido) REFERENCES pedido(id_pedido)
);

-- Tabla RESERVACION
CREATE TABLE reservacion (
    id_reservacion INT PRIMARY KEY AUTO_INCREMENT,
    id_cliente INT,
    fecha_reserva DATE,
    hora_reserva TIME,
    cantidad_personas INT,
    estado_reserva VARCHAR(50),
    notas_especiales TEXT,
    fecha_creacion DATETIME,
    recordatorio_enviado BOOLEAN,
    FOREIGN KEY (id_cliente) REFERENCES cliente(id_cliente)
);

-- Tabla PROMOCION
CREATE TABLE promocion (
    id_promocion INT PRIMARY KEY AUTO_INCREMENT,
    nombre_promocion VARCHAR(100),
    descripcion TEXT,
    tipo_promocion VARCHAR(50),
    valor_descuento DECIMAL(10,2),
    fecha_inicio DATETIME,
    fecha_fin DATETIME,
    hora_inicio TIME,
    hora_fin TIME,
    activa BOOLEAN,
    puntos_requeridos INT
);

-- Tabla PRODUCTO_PROMOCION
CREATE TABLE producto_promocion (
    id_producto_promocion INT PRIMARY KEY AUTO_INCREMENT,
    id_producto INT,
    id_promocion INT,
    fecha_aplicacion DATETIME,
    FOREIGN KEY (id_producto) REFERENCES producto(id_producto),
    FOREIGN KEY (id_promocion) REFERENCES promocion(id_promocion)
);

-- Tabla OPINION
CREATE TABLE opinion (
    id_opinion INT PRIMARY KEY AUTO_INCREMENT,
    id_cliente INT,
    id_producto INT,
    id_reservacion INT,
    calificacion INT,
    comentario TEXT,
    tipo_opinion VARCHAR(50),
    fecha_opinion DATETIME,
    aprobada BOOLEAN,
    id_moderador INT,
    FOREIGN KEY (id_cliente) REFERENCES cliente(id_cliente),
    FOREIGN KEY (id_producto) REFERENCES producto(id_producto),
    FOREIGN KEY (id_reservacion) REFERENCES reservacion(id_reservacion),
    FOREIGN KEY (id_moderador) REFERENCES administrador(id_admin)
);

-- Tabla PROGRAMA_LEALTAD
CREATE TABLE programa_lealtad (
    id_transaccion INT PRIMARY KEY AUTO_INCREMENT,
    id_cliente INT,
    puntos_movimiento INT,
    tipo_transaccion VARCHAR(50),
    descripcion TEXT,
    fecha_transaccion DATETIME,
    id_pedido_relacionado INT,
    FOREIGN KEY (id_cliente) REFERENCES cliente(id_cliente),
    FOREIGN KEY (id_pedido_relacionado) REFERENCES pedido(id_pedido)
);

-- Tabla CANJE_PUNTOS
CREATE TABLE canje_puntos (
    id_canje INT PRIMARY KEY AUTO_INCREMENT,
    id_cliente INT,
    puntos_utilizados INT,
    producto_canjeado VARCHAR(100),
    valor_canje DECIMAL(10,2),
    fecha_canje DATETIME,
    estado_canje VARCHAR(50),
    FOREIGN KEY (id_cliente) REFERENCES cliente(id_cliente)
);

-- Tabla NOTIFICACION
CREATE TABLE notificacion (
    id_notificacion INT PRIMARY KEY AUTO_INCREMENT,
    id_usuario INT,
    titulo VARCHAR(150),
    contenido TEXT,
    tipo_notificacion VARCHAR(50),
    leida BOOLEAN,
    fecha_envio DATETIME,
    canal_envio VARCHAR(50),
    FOREIGN KEY (id_usuario) REFERENCES usuario(id_usuario)
);

-- Tabla HISTORIAL_CAMBIOS
CREATE TABLE historial_cambios (
    id_cambio INT PRIMARY KEY AUTO_INCREMENT,
    id_usuario INT,
    tabla_afectada VARCHAR(100),
    id_registro_afectado INT,
    accion_realizada VARCHAR(50),
    datos_anteriores TEXT,
    datos_nuevos TEXT,
    fecha_cambio DATETIME,
    ip_usuario VARCHAR(50),
    FOREIGN KEY (id_usuario) REFERENCES usuario(id_usuario)
);

-- Tabla CHAT_BOT
CREATE TABLE chat_bot (
    id_conversacion INT PRIMARY KEY AUTO_INCREMENT,
    id_usuario INT,
    pregunta TEXT,
    respuesta TEXT,
    categoria_consulta VARCHAR(100),
    fecha_consulta DATETIME,
    resuelto BOOLEAN,
    FOREIGN KEY (id_usuario) REFERENCES usuario(id_usuario)
);

-- Tabla CONFIGURACION_SISTEMA
CREATE TABLE configuracion_sistema (
    id_config INT PRIMARY KEY AUTO_INCREMENT,
    parametro VARCHAR(100),
    valor VARCHAR(255),
    descripcion TEXT,
    fecha_modificacion DATETIME,
    id_usuario_modificacion INT,
    FOREIGN KEY (id_usuario_modificacion) REFERENCES usuario(id_usuario)
);


-- Inserts de roles
INSERT INTO rol (nombre_rol) VALUES 
('Administrador'), 
('Empleado'), 
('Cliente');

-- Creación de usuario admin (tabla usuario)
INSERT INTO usuario (nombre, correo, telefono, contrasena, id_rol, fecha_registro, activo)
VALUES ('Christian Armando Jiménez Cerdas', 'admin@sunsets.com', '61319543', '$2a$12$XN4rbpnZXEwwLDZ2tb0mquhdVcV37ziLilZWBUU2ImwqEKbDKPdtS', 1, NOW(), TRUE);

-- Creación de perfil de admin (tabla administrador)
INSERT INTO administrador (id_usuario, permisos_especiales)
VALUES (
 (SELECT id_usuario FROM usuario WHERE correo = 'admin@sunsets.com'), 
 'TODOS'
);

-- Creación de categorias
INSERT INTO categoria (nombre_categoria, descripcion, activa) VALUES
('Pizzas', 'Masa Crunch o Masa Artesanal', 1);

-- Creación de productos existentes (tabla productos)
INSERT INTO producto (
    id_categoria,
    nombre,
    descripcion,
    ingredientes,
    precio,
    imagen_url,
    vegetariano,
    vegano,
    sin_gluten,
    disponible,
    tiempo_preparacion
) VALUES
-- PIZZAS
(1, 'Bacon & tomate', 'Tocino ahumado, tomate, cebolla y orégano', NULL, 6400.00, NULL, 0, 0, 0, 1, NULL),
(1, 'Barbacoa picante', 'Pollo crispy, salsa BBQ, cebolla morada, chile dulce, hongos, chile jalapeño', NULL, 6900.00, NULL, 0, 0, 0, 1, NULL),
(1, 'Camarones con Perejil y Ajo', NULL, NULL, 6300.00, NULL, 0, 0, 0, 1, NULL),
(1, 'Camarones, piña y perejil', NULL, NULL, 6300.00, NULL, 0, 0, 0, 1, NULL),
(1, 'Capresse de queso de bufala', 'Queso de bufala fresco, pesto, tomate cherry y albahaca', NULL, 6500.00, NULL, 1, 0, 0, 1, NULL),
(1, 'Chicharrón y Tomate', NULL, NULL, 5800.00, NULL, 0, 0, 0, 1, NULL),
(1, 'Hawaiana', NULL, NULL, 5500.00, NULL, 0, 0, 0, 1, NULL),
(1, 'Jamón y Queso', NULL, NULL, 5300.00, NULL, 0, 0, 0, 1, NULL),
(1, 'Margarita', 'Tomate cherry, queso mozarella, queso parmesano y albahaca', NULL, 5500.00, NULL, 1, 0, 0, 1, NULL),
(1, 'Pepperoni', NULL, NULL, 5500.00, NULL, 0, 0, 0, 1, NULL),
(1, 'Pollo crispy picante', 'Pollo Crispy, Jalapeño y Cebolla Morada, hongos', NULL, 5900.00, NULL, 0, 0, 0, 1, NULL),
(1, 'Pollos crispy, hongos, cebolla morada, chile dulce', NULL, NULL, 5900.00, NULL, 0, 0, 0, 1, NULL),
(1, 'Suprema', 'Peperoni, Jamón, Hongos, Cebolla y Chile dulce', NULL, 5900.00, NULL, 0, 0, 0, 1, NULL),
(1, 'Tres Quesos', 'Gorgonzola, Mozarella y Parmesano', NULL, 6500.00, NULL, 1, 0, 0, 1, NULL),
(1, 'Vegetariana', 'Hongos Aceitunas, chile dulce, cebolla morada y Tomate', NULL, 5400.00, NULL, 1, 0, 0, 1, NULL);


-- Verificar usuario administrador
SELECT id_usuario, nombre, correo, id_rol, fecha_registro, activo
FROM usuario
WHERE correo = 'admin@sunsets.com';

-- Verificar perfil de administrador y permisos
SELECT u.id_usuario, u.nombre, u.correo, a.permisos_especiales
FROM usuario u
JOIN administrador a ON u.id_usuario = a.id_usuario
WHERE u.correo = 'admin@sunsets.com';
