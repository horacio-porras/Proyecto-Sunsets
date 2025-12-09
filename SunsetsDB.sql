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
    descuento_activo BOOLEAN DEFAULT FALSE,
    porcentaje_descuento DECIMAL(5,2),
    fecha_inicio_descuento DATETIME,
    fecha_fin_descuento DATETIME,
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
    area VARCHAR(50),
    FOREIGN KEY (id_responsable) REFERENCES empleado(id_empleado)
);

-- Tabla MOVIMIENTO_INVENTARIO
CREATE TABLE movimiento_inventario (
    id_movimiento INT PRIMARY KEY AUTO_INCREMENT,
    id_inventario INT,
    id_responsable INT,
    tipo_responsable ENUM('empleado', 'administrador') DEFAULT 'empleado',
    tipo_movimiento VARCHAR(50),
    cantidad INT,
    motivo TEXT,
    fecha_movimiento DATETIME,
    FOREIGN KEY (id_inventario) REFERENCES inventario(id_inventario)
);

-- Tabla PEDIDO
CREATE TABLE pedido (
    id_pedido INT PRIMARY KEY AUTO_INCREMENT,
    id_cliente INT,
    cliente_invitado_nombre VARCHAR(100),
    cliente_invitado_telefono VARCHAR(20),
    cliente_invitado_email VARCHAR(100),
    id_direccion INT,
    id_empleado_asignado INT,
    area_asignacion VARCHAR(50),
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
    puntos_requeridos INT,
    alcance ENUM('general', 'producto') DEFAULT 'general'
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

-- Tabla RECOMPENSA
CREATE TABLE recompensa (
    id_recompensa INT PRIMARY KEY AUTO_INCREMENT,
    nombre_recompensa VARCHAR(100),
    descripcion TEXT,
    tipo_recompensa VARCHAR(50),
    valor_recompensa DECIMAL(10,2),
    puntos_requeridos INT,
    fecha_inicio DATETIME,
    fecha_fin DATETIME,
    activa BOOLEAN
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
    id_recompensa INT,
    FOREIGN KEY (id_cliente) REFERENCES cliente(id_cliente),
    FOREIGN KEY (id_recompensa) REFERENCES recompensa(id_recompensa)
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
VALUES ('Admin', 'admin@sunsets.com', '12345678', '$2a$12$XN4rbpnZXEwwLDZ2tb0mquhdVcV37ziLilZWBUU2ImwqEKbDKPdtS', 1, NOW(), TRUE);

-- Creación de perfil de admin (tabla administrador)
INSERT INTO administrador (id_usuario, permisos_especiales)
VALUES (
 (SELECT id_usuario FROM usuario WHERE correo = 'admin@sunsets.com'), 
 'TODOS'
);

-- Creación de categorias
INSERT INTO categoria (nombre_categoria, descripcion, activa) VALUES
('Arroces', 'Acompañados de ensalada y papas', TRUE),
('Bebidas Calientes', 'Bebidas calientes como café, chocolate y té', TRUE),
('Bebidas Frías', 'Bebidas frías y naturales', TRUE),
('Cafés Fríos', 'Cafés fríos como cold brew y capuchino', TRUE),
('Casados', 'Casados con diversas proteínas y acompañamientos', TRUE),
('Cortes de Carne', 'Cortes de carne acompañados de papas y ensalada', TRUE),
('Cócteles', 'Cócteles y tragos', TRUE),
('Desayunos', 'Desayunos variados', TRUE),
('Entradas', 'Entradas y aperitivos', TRUE),
('Hamburguesas', 'Hamburguesas artesanales', TRUE),
('Licores', 'Variedad de bebidas alcohólicas disponibles en el restaurante', TRUE),
('Menú de Niños', 'Opciones diseñadas especialmente para niños, acompañadas de papa en gajo y salsa de la casa', TRUE),
('Paninis', 'Paninis artesanales con variedad de ingredientes, acompañados de papa en gajo y salsa de la casa', TRUE),
('Para el café', 'Opciones tradicionales para acompañar el café, disponibles en horario de desayuno o merienda', TRUE),
('Pizzas', 'Pizzas artesanales con masa Crunch o masa tradicional, disponibles en variedad de sabores', TRUE),
('Platos Fuertes', 'Comidas principales del restaurante, ideales para almuerzo o cena', TRUE),
('Postres', 'Opciones dulces para finalizar la comida, elaboradas con ingredientes frescos y tradicionales', TRUE),
('Quesadillas', 'Quesadillas artesanales acompañadas de papas en gajo o aros de cebolla', TRUE),
('Sandwiches', 'Sandwiches servidos con papas en gajo y ensalada fresca', TRUE),
('Vinos', 'Selección de vinos por copa disponibles en el restaurante', TRUE);

-- Creación de productos existentes (tabla productos)
INSERT INTO producto (id_categoria, nombre, descripcion, ingredientes, precio, imagen_url, vegetariano, vegano, sin_gluten, disponible, tiempo_preparacion) VALUES
-- ARROCES
(1, 'Arroz Vegetariano', 'Arroz con acompañamientos de ensalada y papas en gajos.', 'Arroz, vegetales mixtos, ensalada fresca, papas en gajos (empanizadas).', 4500, NULL, TRUE, FALSE, FALSE, TRUE, 20),
(1, 'Arroz con Camarones', 'Arroz con camarones acompañado con ensalada y papas en gajo.', 'Arroz, camarones, vegetales, ensalada fresca, papas en gajo (empanizadas).', 5000, NULL, FALSE, FALSE, FALSE, TRUE, 20),
(1, 'Arroz con Cerdo', 'Arroz con cerdo acompañado de papas en gajo y ensalada.', 'Arroz, cerdo, vegetales, ensalada fresca, papas en gajo (empanizadas).', 4500, NULL, FALSE, FALSE, FALSE, TRUE, 20),
(1, 'Arroz con Lomito', 'Arroz con lomito acompañado con ensalada y papas en gajo.', 'Arroz, lomito de res, vegetales, ensalada fresca, papas en gajo (empanizadas).', 4800, NULL, FALSE, FALSE, FALSE, TRUE, 20),
-- BEBIDAS CALIENTES
(2, 'Agua Dulce con Leche', 'Bebida caliente tradicional a base de tapa de dulce y leche.', 'Tapa de dulce, leche de vaca, agua.', 2000, NULL, TRUE, FALSE, TRUE, TRUE, 10),
(2, 'Aguadulce', 'Bebida caliente tradicional costarricense.', 'Tapa de dulce, agua.', 1500, NULL, TRUE, TRUE, TRUE, TRUE, 10),
(2, 'Café Negro', 'Café filtrado caliente.', 'Café molido, agua.', 1000, NULL, TRUE, TRUE, TRUE, TRUE, 10),
(2, 'Café con Leche', 'Café caliente con leche de vaca.', 'Café molido, leche de vaca, agua.', 1500, NULL, TRUE, FALSE, TRUE, TRUE, 10),
(2, 'Chocolate', 'Chocolate caliente tradicional con leche.', 'Cacao, leche de vaca, azúcar.', 2000, NULL, TRUE, FALSE, TRUE, TRUE, 10),
(2, 'Té', 'Infusión caliente de hojas de té.', 'Té en hoja o bolsita, agua.', 1000, NULL, TRUE, TRUE, TRUE, TRUE, 10),
-- BEBIDAS FRÍAS
(3, 'Cerveza Nacional', 'Imperial, Ultra, Light, Silver, Pilsen.', 'Cebada, agua, lúpulo, levadura.', 1500, NULL, FALSE, FALSE, FALSE, TRUE, 10),
(3, 'Cerveza Nacional Michelada', 'Cerveza con jugo y condimentos.', 'Cerveza, limón, salsa inglesa, sal.', 2000, NULL, FALSE, FALSE, FALSE, TRUE, 10),
(3, 'Cerveza Heineken', 'Cerveza rubia importada.', 'Cebada, agua, lúpulo, levadura.', 2000, NULL, FALSE, FALSE, FALSE, TRUE, 10),
(3, 'Cerveza Sol', 'Cerveza rubia importada.', 'Cebada, agua, lúpulo, levadura.', 1600, NULL, FALSE, FALSE, FALSE, TRUE, 10),
(3, 'Rock Limón', 'Bebida refrescante gaseosa sabor limón.', 'Agua carbonatada, azúcar, sabor limón.', 1600, NULL, TRUE, TRUE, TRUE, TRUE, 10),
(3, 'Smirnoff', 'Smirnoff sabores: Manzana Verde, Negra, Guaraná.', 'Vodka, saborizantes, agua, azúcar.', 2000, NULL, TRUE, TRUE, TRUE, TRUE, 10),
(3, 'Bamboo', 'Bebida refrescante alcohólica.', 'Vodka, jugo de frutas, agua.', 1800, NULL, TRUE, TRUE, TRUE, TRUE, 10),
(3, 'Gaseosas', 'Variedades: Gin, 7up, Pepsi, Toronja, Milory Roja.', 'Agua carbonatada, azúcar, saborizantes.', 1000, NULL, TRUE, TRUE, TRUE, TRUE, 10),
(3, 'Tropicales', 'Variedades: Frutas, Blanco, Té Melocotón, Tropical Cero.', 'Agua carbonatada, saborizantes, azúcar.', 1000, NULL, TRUE, TRUE, TRUE, TRUE, 10),
(3, 'Natural en Agua', 'Jugos naturales en agua.', 'Frutas: Sandía, Melón, Maracuyá, Mango, agua.', 1500, NULL, TRUE, FALSE, TRUE, TRUE, 10),
(3, 'Natural en Leche', 'Jugos naturales en leche.', 'Frutas: Crema, Maracuyá, leche de vaca.', 2000, NULL, TRUE, FALSE, TRUE, TRUE, 10),
-- CAFÉS FRÍOS
(4, 'Café Frío', 'Cold brew con leche y jarabe.', 'Cold brew, leche de vaca, jarabe.', 2500, NULL, TRUE, FALSE, TRUE, TRUE, 10),
(4, 'Capuchino Frío', 'Cold brew con leche, canela y jarabe.', 'Cold brew, leche de vaca, jarabe, canela.', 2500, NULL, TRUE, FALSE, TRUE, TRUE, 10),
(4, 'Mocaccino', 'Cold brew con cocoa, leche y jarabe.', 'Cold brew, leche de vaca, cocoa, jarabe.', 2500, NULL, TRUE, FALSE, TRUE, TRUE, 10),
-- CASADOS
(5, 'Casado con Bistec', 'Acompañado con ensalada, papas en gajo y plátano maduro.', 'Bistec, arroz, frijoles, ensalada, papas en gajo, plátano maduro.', 4100, NULL, FALSE, FALSE, TRUE, TRUE, 20),
(5, 'Casado con Chicharrones', 'Acompañado con ensalada, papas en gajo y plátano maduro.', 'Chicharrón, arroz, frijoles, ensalada, papas en gajo, plátano maduro.', 4100, NULL, FALSE, FALSE, TRUE, TRUE, 20),
(5, 'Casado con Chuleta de Cerdo', 'Acompañado con ensalada, papas en gajo y plátano maduro.', 'Chuleta de cerdo, arroz, frijoles, ensalada, papas en gajo, plátano maduro.', 4100, NULL, FALSE, FALSE, TRUE, TRUE, 20),
(5, 'Casado con Fajitas Mixtas', 'Acompañado con ensalada, papas en gajo y plátano maduro.', 'Pollo, res, arroz, frijoles, ensalada, papas en gajo, plátano maduro.', 4100, NULL, FALSE, FALSE, TRUE, TRUE, 20),
(5, 'Casado con Fajitas de Pollo', 'Acompañado con ensalada, papas en gajo y plátano maduro.', 'Pollo, arroz, frijoles, ensalada, papas en gajo, plátano maduro.', 4100, NULL, FALSE, FALSE, TRUE, TRUE, 20),
(5, 'Casado con Fajitas de Res', 'Acompañado con ensalada, papas en gajo y plátano maduro.', 'Res, arroz, frijoles, ensalada, papas en gajo, plátano maduro.', 4100, NULL, FALSE, FALSE, TRUE, TRUE, 20),
(5, 'Casado con Pechuga de Pollo', 'Acompañado con ensalada, papas en gajo y plátano maduro.', 'Pollo, arroz, frijoles, ensalada, papas en gajo, plátano maduro.', 4100, NULL, FALSE, FALSE, TRUE, TRUE, 20),
(5, 'Casado con Carne en Salsa', 'Acompañado con ensalada, papas en gajo y plátano maduro.', 'Carne en salsa, arroz, frijoles, ensalada, papas en gajo, plátano maduro.', 4100, NULL, FALSE, FALSE, TRUE, TRUE, 20),
-- CORTES DE CARNE
(6, 'Churrasco', 'Acompañado de papa en gajo y ensalada.', 'Churrasco, papas en gajo, ensalada.', 7500, NULL, FALSE, FALSE, TRUE, TRUE, 20),
(6, 'Costilla BBQ al Carbón', '400 g de costilla de cerdo, papas y ensalada.', 'Costilla de cerdo, salsa BBQ, papas en gajo, ensalada.', 7500, NULL, FALSE, FALSE, TRUE, TRUE, 20),
(6, 'New York', 'Acompañado de papa en gajo y ensalada.', 'New York Strip, papas en gajo, ensalada.', 7500, NULL, FALSE, FALSE, TRUE, TRUE, 20),
(6, 'Sirloin', 'Acompañado de papa en gajo y ensalada.', 'Sirloin, papas en gajo, ensalada.', 7500, NULL, FALSE, FALSE, TRUE, TRUE, 20),
-- CÓCTELES
(7, 'Sangría', 'Cóctel de frutas y vino.', 'Vino, jugo de frutas, azúcar, hielo.', 2500, NULL, TRUE, TRUE, TRUE, TRUE, 10),
-- DESAYUNOS
(8, 'Chorreadas', '*Preguntar disponibilidad*', 'Maíz, azúcar, aceite.', 2000, NULL, TRUE, TRUE, TRUE, TRUE, 20),
(8, 'Desayuno Americano', 'Tostadas de masa madre con mantequilla, mermelada, huevos y tocino.', 'Pan de masa madre, mantequilla, mermelada, huevos, tocino.', 3700, NULL, FALSE, FALSE, FALSE, TRUE, 20),
(8, 'Desayuno Típico', 'Pinto, huevos, natilla, salchichón, plátano maduro.', 'Frijoles, arroz, huevos, natilla, salchichón, plátano maduro.', 3800, NULL, FALSE, FALSE, TRUE, TRUE, 20),
(8, 'Desayuno Típico Especial', 'Pinto, huevos, natilla, plátano maduro, salchichón y proteína extra.', 'Frijoles, arroz, huevos, natilla, salchichón, plátano maduro, carne adicional.', 4500, NULL, FALSE, FALSE, TRUE, TRUE, 20),
(8, 'Pancakes', 'Pancakes artesanales con jarabe de maple y frutas.', 'Harina de trigo, leche, huevo, jarabe de maple, frutas.', 3800, NULL, TRUE, FALSE, FALSE, TRUE, 20),
(8, 'Plátano maduro con queso y natilla', 'Plátano maduro acompañado con queso y natilla.', 'Plátano maduro, queso, natilla.', 2500, NULL, TRUE, FALSE, TRUE, TRUE, 20),
(8, 'Queque de zanahoria', 'Queque de zanahoria casero.', 'Harina de trigo, huevo, azúcar, mantequilla, zanahoria.', 2500, NULL, TRUE, FALSE, FALSE, TRUE, 20),
(8, 'Tostadas', 'Pan de masa madre con guacamole, tomate cherry, pesto y huevos.', 'Pan de masa madre, guacamole, tomate cherry, pesto, huevos.', 4300, NULL, TRUE, FALSE, FALSE, TRUE, 20),
-- ENTRADAS
(9, 'Aros de Cebolla', 'Aros de cebolla empanizados y fritos.', 'Cebolla, harina de trigo, aceite, condimentos.', 3000, NULL, TRUE, FALSE, FALSE, TRUE, 20),
(9, 'Breadsticks', 'Palitos de pan acompañados con salsa de pizza.', 'Harina de trigo, levadura, aceite, sal, salsa de pizza.', 2500, NULL, TRUE, FALSE, FALSE, TRUE, 20),
(9, 'Enyucados', 'Bocadillos de yuca frita.', 'Yuca, queso, aceite, condimentos.', 2500, NULL, TRUE, FALSE, TRUE, TRUE, 20),
(9, 'Pan de Ajo', 'Pan de ajo acompañado de salsa de pizza.', 'Pan de trigo, ajo, mantequilla, salsa de pizza.', 1700, NULL, TRUE, FALSE, FALSE, TRUE, 20),
(9, 'Papa en Gajos', 'Papas en gajo acompañadas de salsa de la casa.', 'Papas, aceite, salsa de la casa.', 2000, NULL, TRUE, TRUE, TRUE, TRUE, 20),
(9, 'Tortilla con Queso', 'Tortilla con queso.', 'Tortilla de maíz, queso.', 2500, NULL, FALSE, FALSE, TRUE, TRUE, 15),
-- HAMBURGUESAS
(10, 'Cheese Burger', 'Pan artesanal con doble torta Angus y doble queso.', 'Pan de trigo, carne Angus, queso, tomate, lechuga, mayonesa.', 5900, NULL, FALSE, FALSE, FALSE, TRUE, 20),
(10, 'Doble con Bacon', 'Pan artesanal con doble torta Angus, bacon y doble queso.', 'Pan de trigo, carne Angus, bacon, queso, cebolla caramelizada, pepinillos, salsa de cebolla ahumada.', 5900, NULL, FALSE, FALSE, FALSE, TRUE, 20),
(10, 'Doble con Chile Ahumado', 'Pan artesanal con doble torta Angus y chile morrón.', 'Pan de trigo, carne Angus, chile morrón, queso, cebolla caramelizada, chipotle ahumado.', 5900, NULL, FALSE, FALSE, FALSE, TRUE, 20),
(10, 'Hamburguesa Vegetariana', 'Pan artesanal con hongos salteados y chimichurri argentino.', 'Pan de trigo, hongos salteados, lechuga, tomate, chimichurri argentino, salsa de cebolla ahumada.', 4200, NULL, TRUE, FALSE, FALSE, TRUE, 20),
(10, 'Hamburguesa de Muslo Empanizado', 'Pan artesanal con muslo de pollo empanizado.', 'Pan de trigo, muslo de pollo empanizado, queso blanco, tomate asado, pepinillos, salsa tártara.', 4800, NULL, FALSE, FALSE, FALSE, TRUE, 20),
(10, 'Pollo Picante', 'Pan artesanal con pollo empanizado y salsa picante.', 'Pan de trigo, pollo empanizado, queso blanco, arúgula, chipotle, salsa de semillas picante.', 4800, NULL, FALSE, FALSE, FALSE, TRUE, 20),
(10, 'Provolone y Chimichurri', 'Pan artesanal con doble torta Angus y queso provolone.', 'Pan de trigo, carne Angus, queso provolone, arúgula, tomate asado, chimichurri argentino, salsa de cebolla ahumada.', 5900, NULL, FALSE, FALSE, FALSE, TRUE, 20),
-- LICORES
(11, 'Antioqueño Azul', 'Licor tradicional colombiano', NULL, 1500.00, NULL, TRUE, TRUE, TRUE, TRUE, 2),
(11, 'Flor de caña 12 años', 'Ron añejo de Nicaragua con 12 años de maduración', NULL, 2500.00, NULL, TRUE, TRUE, TRUE, TRUE, 2),
(11, 'Flor de caña de coco', 'Ron con sabor a coco', NULL, 2000.00, NULL, TRUE, TRUE, TRUE, TRUE, 2),
(11, 'Jack Daniels', 'Whiskey americano clásico', NULL, 2500.00, NULL, TRUE, TRUE, TRUE, TRUE, 2),
(11, 'Jack Daniels Honey', 'Whiskey con infusión de miel', NULL, 2500.00, NULL, TRUE, TRUE, TRUE, TRUE, 2),
(11, 'Jager', 'Licor herbal alemán', NULL, 1500.00, NULL, TRUE, TRUE, TRUE, TRUE, 2),
(11, 'José Cuervo Oscuro', 'Tequila oscuro mexicano', NULL, 1500.00, NULL, TRUE, TRUE, TRUE, TRUE, 2),
(11, 'Old Parr', 'Whiskey escocés de mezcla premium', NULL, 3000.00, NULL, TRUE, TRUE, TRUE, TRUE, 2),
(11, 'Ron Zacapa 23 años', 'Ron guatemalteco añejado por 23 años', NULL, 3000.00, NULL, TRUE, TRUE, TRUE, TRUE, 2),
-- MENÚ DE NIÑOS
(12, 'Nuggets de pollo', 'Acompañados de papa en gajo y salsa de la casa', 'Nuggets de pollo, papa en gajo, salsa de la casa', 3200.00, NULL, FALSE, FALSE, FALSE, TRUE, 15),
-- PANINIS
(13, 'Panini de camarones al ajo', 'Acompañado de papa en gajo y salsa de la casa', 'Camarones, ajo, cebolla morada, albahaca', 4900.00, NULL, FALSE, FALSE, FALSE, TRUE, 20),
(13, 'Panini de camarones con piña', 'Acompañado de papa en gajo y salsa de la casa', 'Camarones, piña, perejil', 4900.00, NULL, FALSE, FALSE, FALSE, TRUE, 20),
(13, 'Panini de chicharrón', 'Acompañado de papa en gajo y salsa de la casa', 'Chicharrón, guacamole, jalapeño', 4800.00, NULL, FALSE, FALSE, FALSE, TRUE, 20),
(13, 'Panini de jamón y piña', 'Acompañado de papa en gajo y salsa de la casa', 'Jamón, piña, coco rallado', 4600.00, NULL, FALSE, FALSE, FALSE, TRUE, 20),
(13, 'Panini de peperonni y hongos', 'Acompañado de papa en gajo y salsa de la casa', 'Peperonni, hongos, jalapeños', 4700.00, NULL, FALSE, FALSE, FALSE, TRUE, 20),
(13, 'Panini de pesto y cherry', 'Acompañado de papa en gajo y salsa de la casa', 'Pesto, tomate cherry, queso parmesano', 4500.00, NULL, TRUE, FALSE, FALSE, TRUE, 20),
(13, 'Panini de pollo y chile dulce', 'Acompañado de papa en gajo y salsa de la casa', 'Pollo a la plancha, chile dulce, cebolla morada', 4800.00, NULL, FALSE, FALSE, FALSE, TRUE, 20),
(13, 'Panini de pollo con guacamole', 'Acompañado de papa en gajo y salsa de la casa', 'Pollo a la plancha, jalapeño, guacamole', 4900.00, NULL, FALSE, FALSE, FALSE, TRUE, 20),
-- PARA EL CAFÉ
(14, 'Chorreadas con natilla', 'Tortillas dulces de maíz acompañadas con natilla', 'Maíz, natilla', 2000.00, NULL, TRUE, FALSE, FALSE, TRUE, 10),
(14, 'Enyucados', 'Bocados fritos de yuca rellenos o acompañados', 'Yuca, condimentos', 2500.00, NULL, TRUE, FALSE, TRUE, TRUE, 10),
(14, 'Plátano maduro con queso', 'Plátano dulce acompañado con queso derretido', 'Plátano maduro, queso', 2500.00, NULL, TRUE, FALSE, FALSE, TRUE, 10),
(14, 'Queque de naranja', 'Bizcocho casero con sabor a naranja', 'Harina, naranja, azúcar, huevo', 2200.00, NULL, FALSE, FALSE, FALSE, TRUE, 10),
(14, 'Queque de zanahoria', 'Bizcocho húmedo con zanahoria rallada', 'Harina, zanahoria, azúcar, huevo', 2500.00, NULL, FALSE, FALSE, FALSE, TRUE, 10),
(14, 'Queque navideño con ron', 'Bizcocho tradicional con frutas y ron', 'Harina, frutas secas, ron, azúcar, huevo', 2500.00, NULL, FALSE, FALSE, FALSE, TRUE, 10),
(14, 'Tortilla con queso', 'Tortilla tradicional rellena de queso', 'Harina de maíz, queso', 2500.00, NULL, TRUE, FALSE, FALSE, TRUE, 10),
-- PIZZAS
(15, 'Bacon & tomate', 'Pizza con tocino ahumado, tomate, cebolla y orégano', 'Tocino ahumado, tomate, cebolla, orégano', 6400.00, NULL, FALSE, FALSE, FALSE, TRUE, 20),
(15, 'Barbacoa picante', 'Pizza con pollo crispy, salsa BBQ, cebolla morada, chile dulce, hongos y jalapeño', 'Pollo crispy, salsa BBQ, cebolla morada, chile dulce, hongos, jalapeño', 6900.00, NULL, FALSE, FALSE, FALSE, TRUE, 20),
(15, 'Camarones con perejil y ajo', 'Pizza con camarones, piña y perejil', 'Camarones, piña, perejil', 6300.00, NULL, FALSE, FALSE, FALSE, TRUE, 20),
(15, 'Camarones con piña y perejil', 'Pizza con camarones, piña y perejil', 'Camarones, piña, perejil', 6300.00, NULL, FALSE, FALSE, FALSE, TRUE, 20),
(15, 'Capresse de queso de búfala', 'Pizza con queso de búfala fresco, pesto, tomate cherry y albahaca fresca', 'Queso de búfala, pesto, tomate cherry, albahaca', 6500.00, NULL, TRUE, FALSE, FALSE, TRUE, 20),
(15, 'Chicharrón y tomate', 'Pizza con chicharrón y tomate', 'Chicharrón, tomate', 5800.00, NULL, FALSE, FALSE, FALSE, TRUE, 20),
(15, 'Hawaiana', 'Pizza clásica con jamón y piña', 'Jamón, piña, queso mozzarella', 5500.00, NULL, FALSE, FALSE, FALSE, TRUE, 20),
(15, 'Jamón y queso', 'Pizza sencilla con jamón y queso', 'Jamón, queso mozzarella', 5300.00, NULL, FALSE, FALSE, FALSE, TRUE, 20),
(15, 'Margarita', 'Pizza con tomate cherry, queso mozzarella, queso parmesano y albahaca', 'Tomate cherry, queso mozzarella, queso parmesano, albahaca', 5500.00, NULL, TRUE, FALSE, FALSE, TRUE, 20),
(15, 'Pepperoni', 'Pizza clásica con pepperoni', 'Pepperoni, queso mozzarella', 5500.00, NULL, FALSE, FALSE, FALSE, TRUE, 20),
(15, 'Pollo crispy picante', 'Pizza con pollo crispy, jalapeño, cebolla morada y hongos', 'Pollo crispy, jalapeño, cebolla morada, hongos', 5900.00, NULL, FALSE, FALSE, FALSE, TRUE, 20),
(15, 'Pollo crispy con vegetales', 'Pizza con pollo crispy, hongos, cebolla morada y chile dulce', 'Pollo crispy, hongos, cebolla morada, chile dulce', 5900.00, NULL, FALSE, FALSE, FALSE, TRUE, 20),
(15, 'Suprema', 'Pizza con peperoni, jamón, hongos, cebolla y chile dulce', 'Peperoni, jamón, hongos, cebolla, chile dulce', 5900.00, NULL, FALSE, FALSE, FALSE, TRUE, 20),
(15, 'Tres Quesos', 'Pizza con mezcla de gorgonzola, mozzarella y parmesano', 'Gorgonzola, mozzarella, parmesano', 6500.00, NULL, TRUE, FALSE, FALSE, TRUE, 20),
(15, 'Vegetariana', 'Pizza con hongos, aceitunas, chile dulce, cebolla morada y tomate', 'Hongos, aceitunas, chile dulce, cebolla morada, tomate', 5400.00, NULL, TRUE, FALSE, FALSE, TRUE, 20),
-- PLATOS FUERTES
(16, 'Chicharrones con Yuca', 'Chicharrones acompañados con yuca frita', 'Chicharrones, yuca', 5000.00, NULL, FALSE, FALSE, TRUE, TRUE, 20),
(16, 'Chifrijo', 'Plato típico con arroz, frijoles, chicharrón y pico de gallo', 'Arroz, frijoles, chicharrón, pico de gallo', 4500.00, NULL, FALSE, FALSE, FALSE, TRUE, 20),
(16, 'Ensalada César', 'Ensalada fresca con aderezo César', 'Lechuga, aderezo César, crutones, queso parmesano', 3500.00, NULL, TRUE, FALSE, FALSE, TRUE, 10),
(16, 'Fajitas de pollo, res o mixtas', 'Fajitas acompañadas con papas en gajo y ensalada', 'Pollo o res, papas en gajo, ensalada', 5200.00, NULL, FALSE, FALSE, FALSE, TRUE, 20),
(16, 'Nachos de cerdo mechado', 'Tortilla de maíz con cerdo mechado, guacamole, pico de gallo, salsa BBQ, natilla y queso amarillo', 'Tortilla de maíz, cerdo mechado, guacamole, pico de gallo, salsa BBQ, natilla, queso amarillo', 4900.00, NULL, FALSE, FALSE, FALSE, TRUE, 15),
(16, 'Nachos de chili con carne', 'Tortilla de maíz con chili con carne, guacamole, pico de gallo, salsa de la casa, natilla y queso amarillo', 'Tortilla de maíz, chili con carne, guacamole, pico de gallo, salsa de la casa, natilla, queso amarillo', 4900.00, NULL, FALSE, FALSE, FALSE, TRUE, 15),
(16, 'Nachos de carne mechada', 'Tortilla de maíz con carne mechada y acompañamientos', 'Tortilla de maíz, carne mechada, guacamole, pico de gallo, natilla, queso amarillo', 4900.00, NULL, FALSE, FALSE, FALSE, TRUE, 15),
-- POSTRES
(17, 'Cheesecake de cas', 'Postre cremoso con sabor a cas, fruta tropical costarricense', 'Queso crema, cas, azúcar, base de galleta', 3000.00, NULL, TRUE, FALSE, FALSE, TRUE, 10),
(17, 'Cheesecake de frutos rojos', 'Cheesecake con cobertura de frutos rojos frescos', 'Queso crema, frutos rojos, azúcar, base de galleta', 3000.00, NULL, TRUE, FALSE, FALSE, TRUE, 10),
(17, 'Cheesecake de maracuyá', 'Cheesecake con cobertura de maracuyá tropical', 'Queso crema, maracuyá, azúcar, base de galleta', 3000.00, NULL, TRUE, FALSE, FALSE, TRUE, 10),
(17, 'Fresas con crema', 'Fresas frescas bañadas en crema dulce', 'Fresas, crema dulce', 2000.00, NULL, TRUE, FALSE, FALSE, TRUE, 5),
(17, 'Queque de chocolate', 'Bizcocho húmedo de chocolate', 'Harina, cacao, azúcar, huevo, mantequilla', 3000.00, NULL, FALSE, FALSE, FALSE, TRUE, 10),
-- QUESADILLAS
(18, 'Lomito y 2 quesos', 'Quesadilla con lomito de res, queso mozzarella y parmesano, chile dulce, cebolla y chimichurri argentino', 'Tortilla de harina, queso mozzarella, queso parmesano, lomito de res, chile dulce, cebolla, chimichurri argentino', 5200.00, NULL, FALSE, FALSE, FALSE, TRUE, 15),
(18, 'Mar y tierra', 'Quesadilla con camarones, lomito de res, queso mozzarella, chile dulce, cebolla y chimichurri argentino', 'Tortilla de harina, queso mozzarella, camarones, lomito de res, chile dulce, cebolla, chimichurri argentino', 5500.00, NULL, FALSE, FALSE, FALSE, TRUE, 15),
(18, 'Pollo salteado', 'Quesadilla con pollo salteado, queso mozzarella, hongos, chile dulce y cebolla', 'Tortilla de harina, queso mozzarella, pollo salteado, hongos, chile dulce, cebolla', 500.00, NULL, FALSE, FALSE, FALSE, TRUE, 15),
(18, 'Quesadilla de pulled pork', 'Quesadilla con cerdo desmenuzado, queso mozzarella y chile adobado con salsa BBQ', 'Tortilla de harina, queso mozzarella, cerdo desmenuzado, chile adobado, salsa BBQ', 5500.00, NULL, FALSE, FALSE, FALSE, TRUE, 15),
(18, 'Quesadilla vegetariana', 'Quesadilla con vegetales salteados y chimichurri argentino', 'Tortilla de harina, queso mozzarella, chile dulce, cebolla, hongos, espinaca, elote dulce, chimichurri argentino', 4500.00, NULL, TRUE, FALSE, FALSE, TRUE, 15),
-- SANDWICHES
(19, 'Sandwich de carne mechada de res', 'Sandwich con carne mechada de res, mayonesa de ajo y lechuga en pan artesanal', 'Pan artesanal, carne mechada de res, mayonesa de ajo, lechuga', 5200.00, NULL, FALSE, FALSE, FALSE, TRUE, 15),
(19, 'Sandwich de cerdo mechado con BBQ', 'Sandwich con cerdo mechado en salsa BBQ y ensalada de repollo', 'Pan artesanal, cerdo mechado, salsa BBQ, ensalada de repollo', 5200.00, NULL, FALSE, FALSE, FALSE, TRUE, 15),
(19, 'Sandwich vegetariano', 'Sandwich con lechuga, tomate, hongos salteados y queso mozzarella', 'Pan artesanal, lechuga, tomate, hongos salteados, queso mozzarella', 5200.00, NULL, TRUE, FALSE, FALSE, TRUE, 15),
-- VINOS
(20, 'Copa de vino Cabernet Sauvignon', 'Vino tinto seco servido por copa', 'Cabernet Sauvignon', 2500.00, NULL, TRUE, TRUE, TRUE, TRUE, 2),
(20, 'Copa de vino Merlot', 'Vino tinto suave servido por copa', 'Merlot', 2500.00, NULL, TRUE, TRUE, TRUE, TRUE, 2);

-- Verificar usuario administrador
SELECT id_usuario, nombre, correo, id_rol, fecha_registro, activo
FROM usuario
WHERE correo = 'admin@sunsets.com';

-- Verificar perfil de administrador y permisos
SELECT u.id_usuario, u.nombre, u.correo, a.permisos_especiales
FROM usuario u
JOIN administrador a ON u.id_usuario = a.id_usuario
WHERE u.correo = 'admin@sunsets.com';
