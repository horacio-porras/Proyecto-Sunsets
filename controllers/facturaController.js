const { pool } = require('../config/database');
const PDFDocument = require('pdfkit');
const fs = require('fs');
const path = require('path');
const nodemailer = require('nodemailer');

// Configurar transporter de email
let transporter = null;
try {
    // Usar las mismas variables que config.env (SMTP_*)
    if (process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS) {
        transporter = nodemailer.createTransport({
            host: process.env.SMTP_HOST,
            port: parseInt(process.env.SMTP_PORT || '587', 10),
            secure: process.env.SMTP_SECURE === 'true',
            auth: {
                user: process.env.SMTP_USER,
                pass: process.env.SMTP_PASS
            }
        });
    } else {
        console.warn('⚠ Variables SMTP no configuradas en config.env para facturas');
    }
} catch (err) {
    console.warn('No se pudo configurar transporter SMTP para facturas:', err.message || err);
    transporter = null;
}

// Función para generar número de factura único
function generarNumeroFactura(idPedido) {
    const fecha = new Date();
    const año = fecha.getFullYear();
    const mes = String(fecha.getMonth() + 1).padStart(2, '0');
    const numero = String(idPedido).padStart(6, '0');
    return `FAC-${año}${mes}-${numero}`;
}

// Función para generar PDF de factura
async function generarPDFFactura(facturaData) {
    return new Promise(async (resolve, reject) => {
        try {
            const doc = new PDFDocument({ margin: 50, size: 'LETTER' });
            const buffers = [];
            
            doc.on('data', buffers.push.bind(buffers));
            doc.on('end', () => {
                const pdfData = Buffer.concat(buffers);
                resolve(pdfData);
            });
            doc.on('error', reject);

            // Encabezado
            doc.fontSize(20)
               .fillColor('#FF6B35')
               .text('Sunset\'s Tarbaca', 50, 50, { align: 'left' });
            
            doc.fontSize(10)
               .fillColor('#666666')
               .text('Pizzería & Restaurante', 50, 75);
            
            // Información de la empresa
            doc.fontSize(8)
               .fillColor('#000000')
               .text('Teléfono: +506 0000-0000', 50, 100)
               .text('Email: info@sunsets.com', 50, 115)
               .text('Dirección: Tarbaca, San José, Costa Rica', 50, 130);

            // Título de factura
            doc.fontSize(16)
               .fillColor('#000000')
               .text('FACTURA ELECTRÓNICA', 50, 160, { align: 'center' });

            // Número de factura y fecha
            doc.fontSize(10)
               .fillColor('#000000')
               .text(`Número: ${facturaData.numero_factura}`, 400, 50, { align: 'right' })
               .text(`Fecha: ${new Date(facturaData.fecha_emision).toLocaleDateString('es-CR')}`, 400, 65, { align: 'right' });

            // Información del cliente
            doc.fontSize(12)
               .fillColor('#000000')
               .text('DATOS DEL CLIENTE', 50, 200)
               .fontSize(10)
               .text(`Nombre: ${facturaData.cliente_nombre}`, 50, 220)
               .text(`Email: ${facturaData.cliente_email || 'N/A'}`, 50, 235)
               .text(`Teléfono: ${facturaData.cliente_telefono || 'N/A'}`, 50, 250);

            if (facturaData.direccion_completa) {
                doc.text(`Dirección: ${facturaData.direccion_completa}`, 50, 265);
            }

            // Información del pedido
            doc.fontSize(10)
               .text(`Pedido #${facturaData.id_pedido}`, 400, 200, { align: 'right' })
               .text(`Método de pago: ${facturaData.metodo_pago}`, 400, 215, { align: 'right' })
               .text(`Estado: ${facturaData.estado_pago}`, 400, 230, { align: 'right' });

            // Tabla de productos
            let yPos = 300;
            doc.fontSize(10)
               .fillColor('#000000')
               .text('DETALLE DE PRODUCTOS', 50, yPos);
            
            yPos += 20;
            
            // Encabezados de tabla
            doc.fontSize(9)
               .fillColor('#666666')
               .text('Producto', 50, yPos)
               .text('Cantidad', 300, yPos)
               .text('Precio Unit.', 380, yPos)
               .text('Subtotal', 480, yPos);
            
            yPos += 15;
            doc.moveTo(50, yPos).lineTo(550, yPos).stroke();
            yPos += 10;

            // Items del pedido
            doc.fontSize(9)
               .fillColor('#000000');
            
            facturaData.items.forEach(item => {
                const nombre = item.producto_nombre || 'Producto';
                const cantidad = item.cantidad || 0;
                const precioUnit = parseFloat(item.precio_unitario || 0).toFixed(2);
                const subtotal = parseFloat(item.subtotal_item || 0).toFixed(2);
                
                doc.text(nombre, 50, yPos, { width: 240 })
                   .text(String(cantidad), 300, yPos)
                   .text(`CRC ${precioUnit}`, 380, yPos)
                   .text(`CRC ${subtotal}`, 480, yPos);
                
                yPos += 20;
                
                if (yPos > 700) {
                    doc.addPage();
                    yPos = 50;
                }
            });

            yPos += 10;
            doc.moveTo(50, yPos).lineTo(550, yPos).stroke();
            yPos += 20;

            // Usar la misma lógica de cálculo que orders.js
            // Constantes (deben coincidir con orders.js)
            const TAX_RATE = 0.13; // 13% IVA
            const DELIVERY_FEE = 1500;
            
            // 1. Obtener valores guardados en la BD
            // El subtotal en BD es subtotalConDescuentos (con descuentos de productos aplicados)
            const subtotalConDescuentos = parseFloat(facturaData.subtotal || 0);
            const impuestosBD = parseFloat(facturaData.impuestos || 0);
            const descuentosRecompensas = parseFloat(facturaData.descuentos || 0); // Descuentos de recompensas ya calculados en colones
            const totalRaw = parseFloat(facturaData.total_facturado || 0);
            
            // 2. Obtener información del canje de puntos si existe (para determinar si es porcentaje o colones)
            let rewardCanje = null;
            if (facturaData.id_cliente && descuentosRecompensas > 0) {
                try {
                    const [canjeRows] = await pool.execute(`
                        SELECT 
                            cp.id_canje,
                            cp.valor_canje,
                            cp.estado_canje,
                            r.tipo_promocion,
                            r.nombre as recompensa_nombre
                        FROM canje_puntos cp
                        LEFT JOIN recompensa r ON cp.id_recompensa = r.id_recompensa
                        WHERE cp.id_cliente = ? 
                        AND cp.estado_canje = 'aplicado'
                        AND DATE(cp.fecha_canje) = DATE(?)
                        ORDER BY cp.fecha_canje DESC
                        LIMIT 1
                    `, [facturaData.id_cliente, facturaData.fecha_pedido || new Date()]);
                    
                    if (canjeRows.length > 0) {
                        rewardCanje = canjeRows[0];
                    }
                } catch (error) {
                    console.warn('Error al obtener información del canje de puntos:', error);
                }
            }
            
            // 3. Calcular subtotalAfterReward desde los impuestos guardados
            // En orders.js: taxes = subtotalAfterReward * TAX_RATE (después del descuento de recompensa)
            // Entonces: subtotalAfterReward = taxes / TAX_RATE
            const subtotalAfterReward = impuestosBD > 0 ? impuestosBD / TAX_RATE : 0;
            
            // 4. Obtener información del tipo de recompensa
            let rewardType = rewardCanje ? (rewardCanje.tipo_promocion || null) : null;
            
            // 4.5. Si rewardCanje es null pero hay descuentos, intentar detectar si es porcentaje
            // Si descuentosRecompensas es muy pequeño (menor a 100) y el subtotal es grande,
            // probablemente es un porcentaje guardado incorrectamente
            if (!rewardType && descuentosRecompensas > 0 && descuentosRecompensas < 100 && subtotalConDescuentos > 1000) {
                const posiblePorcentaje = descuentosRecompensas / 100;
                if (subtotalAfterReward > 0 && (1 - posiblePorcentaje) > 0) {
                    const subtotalCalculado = subtotalAfterReward / (1 - posiblePorcentaje);
                    const descuentoCalculado = subtotalCalculado * posiblePorcentaje;
                    // Si el descuento calculado es razonable (mayor a descuentosRecompensas pero menor al subtotal)
                    // O si el descuento calculado es mucho mayor que descuentosRecompensas, definitivamente es porcentaje
                    if ((descuentoCalculado > descuentosRecompensas && descuentoCalculado < subtotalConDescuentos) || 
                        descuentoCalculado > descuentosRecompensas * 10) {
                        rewardType = 'descuento_porcentaje';
                        console.log('Factura: Detectado porcentaje desde descuentosRecompensas:', { 
                            descuentosRecompensas, 
                            posiblePorcentaje, 
                            descuentoCalculado 
                        });
                    }
                }
            }
            
            // 5. Calcular subtotalAfterPromotions y descuento de recompensa correctamente
            let descuentoRecompensaCalculado = descuentosRecompensas;
            let subtotalAfterPromotions;
            
            if (rewardType === 'descuento_porcentaje') {
                // Si rewardCanje existe, usar su valor_canje, sino usar descuentosRecompensas como porcentaje
                const porcentajeRaw = rewardCanje && rewardCanje.valor_canje 
                    ? parseFloat(rewardCanje.valor_canje)
                    : parseFloat(descuentosRecompensas);
                // Si el valor es mayor a 1, asumir que es un porcentaje (ej: 10 para 10%)
                // Si es menor o igual a 1, asumir que ya está en decimal (ej: 0.10 para 10%)
                const porcentaje = porcentajeRaw > 1 ? porcentajeRaw / 100 : porcentajeRaw;
                
                // Si es porcentaje:
                // subtotalAfterReward = subtotalAfterPromotions - (subtotalAfterPromotions * porcentaje)
                // subtotalAfterReward = subtotalAfterPromotions * (1 - porcentaje)
                // Por lo tanto: subtotalAfterPromotions = subtotalAfterReward / (1 - porcentaje)
                if (porcentaje > 0 && porcentaje < 1 && subtotalAfterReward > 0 && (1 - porcentaje) > 0) {
                    subtotalAfterPromotions = subtotalAfterReward / (1 - porcentaje);
                    // Recalcular el descuento de recompensa desde subtotalAfterPromotions
                    descuentoRecompensaCalculado = subtotalAfterPromotions * porcentaje;
                    console.log('Factura: Calculado descuento desde porcentaje:', { 
                        porcentaje, 
                        subtotalAfterPromotions, 
                        descuentoRecompensaCalculado 
                    });
                } else if (porcentaje > 0 && porcentaje < 1 && subtotalConDescuentos > 0) {
                    // Fallback: usar subtotalConDescuentos como aproximación
                    subtotalAfterPromotions = subtotalConDescuentos;
                    descuentoRecompensaCalculado = subtotalConDescuentos * porcentaje;
                    console.log('Factura: Calculado descuento desde subtotalConDescuentos:', { 
                        porcentaje, 
                        subtotalAfterPromotions, 
                        descuentoRecompensaCalculado 
                    });
                } else {
                    // Fallback: usar el valor de la BD
                    subtotalAfterPromotions = subtotalAfterReward + descuentosRecompensas;
                    descuentoRecompensaCalculado = descuentosRecompensas;
                    console.warn('Factura: No se pudo calcular desde porcentaje, usando valor de BD:', { 
                        porcentaje, 
                        descuentoRecompensaCalculado 
                    });
                }
            } else {
                // Si es colones: el descuento se restó directamente
                // subtotalAfterPromotions = subtotalAfterReward + descuentosRecompensas
                subtotalAfterPromotions = subtotalAfterReward + descuentosRecompensas;
                // El descuento ya está correcto en colones
                descuentoRecompensaCalculado = descuentosRecompensas;
            }
            
            // 6. Calcular descuentos de promociones (sin incluir descuento de recompensa)
            // Los descuentos de promociones = subtotalConDescuentos - subtotalAfterPromotions
            // Esto NO incluye el descuento de recompensa porque subtotalAfterPromotions ya está antes del descuento de recompensa
            const descuentosPromociones = Math.max(0, subtotalConDescuentos - subtotalAfterPromotions);
            
            // 6. Usar los impuestos de la BD (ya calculados correctamente sobre subtotalAfterReward)
            // Si no están disponibles, recalcular sobre subtotalAfterReward
            const impuestos = impuestosBD > 0 
                ? impuestosBD 
                : subtotalAfterReward * TAX_RATE;
            
            // 7. Verificar que el cálculo sea consistente con el total guardado
            // El total debería ser: subtotalAfterReward + deliveryFee + taxes
            const totalCalculado = Math.max(0, subtotalAfterReward + DELIVERY_FEE + impuestos);
            // Usar el total de la BD si la diferencia es mínima (por redondeos)
            const totalFinal = Math.abs(totalCalculado - totalRaw) < 1 ? totalRaw : totalCalculado;
            
            // 8. Subtotal real (para mostrar en factura) - es el subtotalConDescuentos
            const subtotalReal = subtotalConDescuentos;

            // Formatear valores con separadores de miles
            // Usar formato simple para evitar problemas de superposición
            const formatNumber = (num) => {
                const numStr = parseFloat(num.toFixed(2)).toString();
                // Agregar separador de miles manualmente para mejor control
                const parts = numStr.split('.');
                const integerPart = parts[0];
                const decimalPart = parts[1] || '00';
                
                // Agregar separadores de miles cada 3 dígitos
                let formattedInteger = '';
                for (let i = integerPart.length - 1, j = 0; i >= 0; i--, j++) {
                    if (j > 0 && j % 3 === 0) {
                        formattedInteger = ' ' + formattedInteger;
                    }
                    formattedInteger = integerPart[i] + formattedInteger;
                }
                
                return `${formattedInteger},${decimalPart}`;
            };
            
            const subtotalFormatted = formatNumber(subtotalReal);
            const subtotalAfterPromotionsFormatted = formatNumber(subtotalAfterPromotions);
            const descuentosPromocionesFormatted = formatNumber(descuentosPromociones);
            const deliveryFeeFormatted = formatNumber(DELIVERY_FEE);
            const impuestosFormatted = formatNumber(impuestos);
            const descuentosRecompensasFormatted = formatNumber(descuentoRecompensaCalculado);
            const totalFormatted = formatNumber(totalFinal);

            // Mostrar resumen financiero con mejor alineamiento y espaciado
            // Usar posiciones fijas con más espacio entre etiquetas y valores
            const labelX = 280; // Posición para las etiquetas (alineadas a la derecha)
            const valueX = 470; // Posición fija para los valores (con más espacio horizontal - 190px de separación)
            const valueWidth = 100; // Ancho amplio para valores normales
            const totalValueWidth = 150; // Ancho más amplio para el total (acomoda 5+ dígitos con decimales como "13 602,14")
            const lineSpacing = 20; // Espaciado vertical entre líneas (aumentado)
            
            doc.fontSize(10)
               .fillColor('#000000');
            
            const labelWidth = 180; // Ancho más amplio para etiquetas
            
            // Subtotal
            doc.text('Subtotal:', labelX, yPos, { align: 'right', width: labelWidth })
               .text(`CRC ${subtotalFormatted}`, valueX, yPos, { width: valueWidth, align: 'right' });
            
            yPos += lineSpacing;
            
            // Descuentos de promociones (si aplican)
            if (descuentosPromociones > 0.01) {
                doc.text('Descuentos promocionales:', labelX, yPos, { align: 'right', width: labelWidth })
                   .fillColor('#006400')
                   .text(`-CRC ${descuentosPromocionesFormatted}`, valueX, yPos, { width: valueWidth, align: 'right' })
                   .fillColor('#000000');
                yPos += lineSpacing;
            }
            
            // Descuentos de recompensas (si aplican) - ANTES de costo de entrega e impuestos (igual que orders.js)
            if (descuentoRecompensaCalculado > 0.01) {
                doc.text('Descuentos por recompensas:', labelX, yPos, { align: 'right', width: labelWidth })
                   .fillColor('#006400')
                   .text(`-CRC ${descuentosRecompensasFormatted}`, valueX, yPos, { width: valueWidth, align: 'right' })
                   .fillColor('#000000');
                yPos += lineSpacing;
            }
            
            // Costo de entrega
            doc.text('Costo de entrega:', labelX, yPos, { align: 'right', width: labelWidth })
               .text(`CRC ${deliveryFeeFormatted}`, valueX, yPos, { width: valueWidth, align: 'right' });
            
            yPos += lineSpacing;
            
            // Impuestos
            doc.text('Impuestos (13%):', labelX, yPos, { align: 'right', width: labelWidth })
               .text(`CRC ${impuestosFormatted}`, valueX, yPos, { width: valueWidth, align: 'right' });
            
            yPos += lineSpacing;
            
            // Línea separadora
            yPos += 8;
            doc.moveTo(labelX - 20, yPos).lineTo(550, yPos).stroke();
            yPos += 12;
            
            // Total - asegurar que no se corte en dos líneas, usar ancho más amplio
            const totalText = `CRC ${totalFormatted}`;
            // Ajustar posición del total si es necesario para números grandes
            // Para números de 5 dígitos con decimales (ej: "13 602,14") necesitamos más espacio
            // Mover más a la izquierda para dar más espacio y evitar que se corte
            const totalValueX = valueX - 40; // Mover significativamente a la izquierda para acomodar números grandes
            doc.fontSize(12)
               .fillColor('#FF6B35')
               .font('Helvetica-Bold')
               .text('TOTAL:', labelX, yPos, { align: 'right', width: labelWidth });
            // Usar un ancho amplio sin restricción de línea para el total
            doc.text(totalText, totalValueX, yPos, { 
                width: totalValueWidth, 
                align: 'right'
            });

            // Pie de página
            yPos = 750;
            doc.fontSize(8)
               .fillColor('#666666')
               .text('Gracias por su compra', 50, yPos, { align: 'center' })
               .text('Esta es una factura electrónica válida', 50, yPos + 15, { align: 'center' });

            doc.end();
        } catch (error) {
            reject(error);
        }
    });
}

// Generar factura automáticamente al confirmar pago
async function generarFacturaAutomatica(idPedido, connection = null) {
    const shouldReleaseConnection = !connection;
    if (!connection) {
        connection = await pool.getConnection();
    }

    try {
        // Verificar si ya existe una factura para este pedido
        const [facturaExistente] = await connection.execute(
            'SELECT id_factura FROM factura WHERE id_pedido = ?',
            [idPedido]
        );

        if (facturaExistente.length > 0) {
            return facturaExistente[0].id_factura;
        }

        // Obtener datos del pedido
        const [pedidoRows] = await connection.execute(`
            SELECT 
                p.id_pedido,
                p.subtotal,
                p.impuestos,
                p.descuentos,
                p.total,
                p.metodo_pago,
                p.estado_pedido,
                COALESCE(u.nombre, p.cliente_invitado_nombre) as cliente_nombre,
                COALESCE(u.correo, p.cliente_invitado_email) as cliente_email,
                COALESCE(u.telefono, p.cliente_invitado_telefono) as cliente_telefono,
                d.direccion_completa
            FROM pedido p
            LEFT JOIN cliente c ON p.id_cliente = c.id_cliente
            LEFT JOIN usuario u ON c.id_usuario = u.id_usuario
            LEFT JOIN direccion d ON p.id_direccion = d.id_direccion
            WHERE p.id_pedido = ?
        `, [idPedido]);

        if (pedidoRows.length === 0) {
            throw new Error('Pedido no encontrado');
        }

        const pedido = pedidoRows[0];

        // Obtener items del pedido
        const [itemsRows] = await connection.execute(`
            SELECT 
                dp.cantidad,
                dp.precio_unitario,
                dp.subtotal_item,
                p.nombre as producto_nombre
            FROM detalle_pedido dp
            LEFT JOIN producto p ON dp.id_producto = p.id_producto
            WHERE dp.id_pedido = ?
        `, [idPedido]);

        const numeroFactura = generarNumeroFactura(idPedido);

        // Crear factura en la base de datos
        const [facturaResult] = await connection.execute(
            `INSERT INTO factura (
                id_pedido,
                numero_factura,
                fecha_emision,
                total_facturado,
                metodo_pago,
                estado_pago,
                detalles_fiscales
            ) VALUES (?, ?, NOW(), ?, ?, ?, ?)`,
            [
                idPedido,
                numeroFactura,
                pedido.total,
                pedido.metodo_pago,
                pedido.estado_pedido === 'entregado' ? 'pagado' : 'pendiente',
                JSON.stringify({ subtotal: pedido.subtotal, impuestos: pedido.impuestos, descuentos: pedido.descuentos })
            ]
        );

        const idFactura = facturaResult.insertId;

        // Generar PDF
        const facturaData = {
            ...pedido,
            id_factura: idFactura,
            numero_factura: numeroFactura,
            fecha_emision: new Date(),
            items: itemsRows,
            total_facturado: pedido.total,
            id_cliente: pedido.id_cliente,
            fecha_pedido: pedido.fecha_pedido || new Date()
        };

        const pdfBuffer = await generarPDFFactura(facturaData);

        // Guardar PDF en el sistema de archivos (opcional)
        const uploadsDir = path.join(__dirname, '../uploads/facturas');
        if (!fs.existsSync(uploadsDir)) {
            fs.mkdirSync(uploadsDir, { recursive: true });
        }
        const pdfPath = path.join(uploadsDir, `factura_${idFactura}.pdf`);
        fs.writeFileSync(pdfPath, pdfBuffer);

        // Enviar factura por correo si el cliente tiene email
        if (pedido.cliente_email) {
            if (transporter) {
                try {
                    await transporter.sendMail({
                        from: process.env.MAIL_FROM || process.env.SMTP_USER || 'no-reply@sunsets.local',
                        to: pedido.cliente_email,
                        bcc: process.env.MAIL_BCC || undefined,
                        replyTo: process.env.REPLY_TO || process.env.SMTP_USER || undefined,
                        subject: `[Sunset's Tarbaca] Factura Electrónica ${numeroFactura}`,
                        text: `Estimado/a ${pedido.cliente_nombre},\n\nAdjunto encontrará su factura electrónica ${numeroFactura} correspondiente al pedido #${idPedido}.\n\nGracias por su compra.\n\nSunset's Tarbaca`,
                        html: `
                            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                                <h2 style="color: #FF6B35;">Factura Electrónica</h2>
                                <p>Estimado/a <strong>${pedido.cliente_nombre}</strong>,</p>
                                <p>Adjunto encontrará su factura electrónica <strong>${numeroFactura}</strong> correspondiente al pedido <strong>#${idPedido}</strong>.</p>
                                <p>Gracias por su compra.</p>
                                <p style="color: #666;">Sunset's Tarbaca</p>
                            </div>
                        `,
                        attachments: [
                            {
                                filename: `factura_${numeroFactura}.pdf`,
                                content: pdfBuffer
                            }
                        ]
                    });
                    console.log(`✓ Factura ${numeroFactura} enviada por correo a ${pedido.cliente_email}`);
                } catch (emailError) {
                    console.error(`✗ Error al enviar factura por correo a ${pedido.cliente_email}:`, emailError.message || emailError);
                    // No lanzar error, la factura ya fue creada
                }
            } else {
                console.warn(`⚠ Transporter de email no configurado. Factura ${numeroFactura} no se pudo enviar a ${pedido.cliente_email}`);
            }
        } else {
            console.warn(`⚠ Cliente sin email registrado. Factura ${numeroFactura} no se pudo enviar.`);
        }

        return idFactura;
    } catch (error) {
        console.error('Error al generar factura automática:', error);
        throw error;
    } finally {
        if (shouldReleaseConnection) {
            connection.release();
        }
    }
}

// Obtener factura por ID
async function obtenerFactura(req, res) {
    try {
        const { id } = req.params;
        const userId = req.user?.id;

        const [facturaRows] = await pool.execute(`
            SELECT 
                f.id_factura,
                f.id_pedido,
                f.numero_factura,
                f.fecha_emision,
                f.total_facturado,
                f.metodo_pago,
                f.estado_pago,
                p.subtotal,
                p.impuestos,
                p.descuentos,
                COALESCE(u.nombre, p.cliente_invitado_nombre) as cliente_nombre,
                COALESCE(u.correo, p.cliente_invitado_email) as cliente_email,
                COALESCE(u.telefono, p.cliente_invitado_telefono) as cliente_telefono,
                d.direccion_completa
            FROM factura f
            JOIN pedido p ON f.id_pedido = p.id_pedido
            LEFT JOIN cliente c ON p.id_cliente = c.id_cliente
            LEFT JOIN usuario u ON c.id_usuario = u.id_usuario
            LEFT JOIN direccion d ON p.id_direccion = d.id_direccion
            WHERE f.id_factura = ?
        `, [id]);

        if (facturaRows.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Factura no encontrada'
            });
        }

        const factura = facturaRows[0];

        // Verificar que el usuario tiene acceso a esta factura
        if (userId) {
            const [userRows] = await pool.execute(
                'SELECT id_usuario FROM usuario WHERE id_usuario = ?',
                [userId]
            );
            if (userRows.length > 0) {
                const [clienteRows] = await pool.execute(
                    'SELECT id_cliente FROM cliente WHERE id_usuario = ?',
                    [userId]
                );
                if (clienteRows.length > 0) {
                    const [pedidoRows] = await pool.execute(
                        'SELECT id_cliente FROM pedido WHERE id_pedido = ?',
                        [factura.id_pedido]
                    );
                    if (pedidoRows.length > 0 && pedidoRows[0].id_cliente !== clienteRows[0].id_cliente) {
                        return res.status(403).json({
                            success: false,
                            message: 'No tienes acceso a esta factura'
                        });
                    }
                }
            }
        }

        // Obtener items
        const [itemsRows] = await pool.execute(`
            SELECT 
                dp.cantidad,
                dp.precio_unitario,
                dp.subtotal_item,
                p.nombre as producto_nombre
            FROM detalle_pedido dp
            LEFT JOIN producto p ON dp.id_producto = p.id_producto
            WHERE dp.id_pedido = ?
        `, [factura.id_pedido]);

        factura.items = itemsRows;

        res.json({
            success: true,
            factura
        });
    } catch (error) {
        console.error('Error al obtener factura:', error);
        res.status(500).json({
            success: false,
            message: 'Error interno del servidor'
        });
    }
}

// Función auxiliar para generar PDF desde la base de datos
async function generatePDFFromDatabase(idFactura, factura) {
    // Obtener items
    const [itemsRows] = await pool.execute(`
        SELECT 
            dp.cantidad,
            dp.precio_unitario,
            dp.subtotal_item,
            p.nombre as producto_nombre
        FROM detalle_pedido dp
        LEFT JOIN producto p ON dp.id_producto = p.id_producto
        WHERE dp.id_pedido = ?
    `, [factura.id_pedido]);

    // Obtener información adicional del pedido si no está en factura
    let id_cliente = factura.id_cliente;
    let fecha_pedido = factura.fecha_pedido;
    
    if (!id_cliente || !fecha_pedido) {
        const [pedidoRows] = await pool.execute(`
            SELECT id_cliente, fecha_pedido
            FROM pedido
            WHERE id_pedido = ?
        `, [factura.id_pedido]);
        
        if (pedidoRows.length > 0) {
            id_cliente = id_cliente || pedidoRows[0].id_cliente;
            fecha_pedido = fecha_pedido || pedidoRows[0].fecha_pedido;
        }
    }

    // Generar PDF
    const facturaData = {
        ...factura,
        items: itemsRows,
        id_cliente: id_cliente,
        fecha_pedido: fecha_pedido || new Date()
    };

    return await generarPDFFactura(facturaData);
}

// Descargar PDF de factura
async function descargarFacturaPDF(req, res) {
    try {
        const { id } = req.params;
        const userId = req.user?.id;

        // Obtener datos de la factura
        const [facturaRows] = await pool.execute(`
            SELECT 
                f.id_factura,
                f.id_pedido,
                f.numero_factura,
                f.fecha_emision,
                f.total_facturado,
                f.metodo_pago,
                f.estado_pago,
                p.id_cliente,
                p.subtotal,
                p.impuestos,
                p.descuentos,
                p.fecha_pedido,
                COALESCE(u.nombre, p.cliente_invitado_nombre) as cliente_nombre,
                COALESCE(u.correo, p.cliente_invitado_email) as cliente_email,
                COALESCE(u.telefono, p.cliente_invitado_telefono) as cliente_telefono,
                d.direccion_completa
            FROM factura f
            JOIN pedido p ON f.id_pedido = p.id_pedido
            LEFT JOIN cliente c ON p.id_cliente = c.id_cliente
            LEFT JOIN usuario u ON c.id_usuario = u.id_usuario
            LEFT JOIN direccion d ON p.id_direccion = d.id_direccion
            WHERE f.id_factura = ?
        `, [id]);

        if (facturaRows.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Factura no encontrada'
            });
        }

        const factura = facturaRows[0];

        // Verificar acceso (similar a obtenerFactura)
        if (userId) {
            const [clienteRows] = await pool.execute(
                'SELECT id_cliente FROM cliente WHERE id_usuario = ?',
                [userId]
            );
            if (clienteRows.length > 0) {
                const [pedidoRows] = await pool.execute(
                    'SELECT id_cliente FROM pedido WHERE id_pedido = ?',
                    [factura.id_pedido]
                );
                if (pedidoRows.length > 0 && pedidoRows[0].id_cliente !== clienteRows[0].id_cliente) {
                    return res.status(403).json({
                        success: false,
                        message: 'No tienes acceso a esta factura'
                    });
                }
            }
        }

        // Intentar leer el PDF del disco si existe, sino generarlo dinámicamente
        const uploadsDir = path.join(__dirname, '../uploads/facturas');
        const pdfPath = path.join(uploadsDir, `factura_${id}.pdf`);
        
        let pdfBuffer;
        
        // Verificar si el archivo existe en el disco
        if (fs.existsSync(pdfPath)) {
            try {
                // Leer el PDF existente (más rápido)
                pdfBuffer = fs.readFileSync(pdfPath);
            } catch (readError) {
                console.warn(`No se pudo leer el PDF existente (${pdfPath}), generando nuevo PDF:`, readError.message);
                // Si falla la lectura, generar el PDF dinámicamente
                pdfBuffer = await generatePDFFromDatabase(id, factura);
            }
        } else {
            // El archivo no existe, generar el PDF dinámicamente
            pdfBuffer = await generatePDFFromDatabase(id, factura);
            
            // Opcional: guardar el PDF generado para futuras solicitudes
            try {
                if (!fs.existsSync(uploadsDir)) {
                    fs.mkdirSync(uploadsDir, { recursive: true });
                }
                fs.writeFileSync(pdfPath, pdfBuffer);
            } catch (writeError) {
                console.warn(`No se pudo guardar el PDF generado (${pdfPath}):`, writeError.message);
                // Continuar aunque no se pueda guardar
            }
        }

        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', `attachment; filename="factura_${factura.numero_factura}.pdf"`);
        res.send(pdfBuffer);
    } catch (error) {
        console.error('Error al descargar factura PDF:', error);
        res.status(500).json({
            success: false,
            message: 'Error interno del servidor'
        });
    }
}

// Obtener facturas de un cliente
async function obtenerFacturasCliente(req, res) {
    try {
        const userId = req.user.id;

        const [clienteRows] = await pool.execute(
            'SELECT id_cliente FROM cliente WHERE id_usuario = ?',
            [userId]
        );

        if (clienteRows.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Cliente no encontrado'
            });
        }

        const clienteId = clienteRows[0].id_cliente;

        const [facturasRows] = await pool.execute(`
            SELECT 
                f.id_factura,
                f.id_pedido,
                f.numero_factura,
                f.fecha_emision,
                f.total_facturado,
                f.metodo_pago,
                f.estado_pago
            FROM factura f
            JOIN pedido p ON f.id_pedido = p.id_pedido
            WHERE p.id_cliente = ?
            ORDER BY f.fecha_emision DESC
        `, [clienteId]);

        res.json({
            success: true,
            facturas: facturasRows
        });
    } catch (error) {
        console.error('Error al obtener facturas del cliente:', error);
        res.status(500).json({
            success: false,
            message: 'Error interno del servidor'
        });
    }
}

module.exports = {
    generarFacturaAutomatica,
    obtenerFactura,
    descargarFacturaPDF,
    obtenerFacturasCliente
};

