const PDFDocument = require('pdfkit');
const ExcelJS = require('exceljs');
const { pool } = require('../config/database');

/**
 * Formatea números con separador de miles
 */
function formatNumber(num) {
    return parseFloat(num || 0).toLocaleString('es-CR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

/**
 * Genera un PDF con reporte de ventas
 */
async function generarPDFVentas(datos) {
    return new Promise((resolve, reject) => {
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
            
            doc.fontSize(16)
               .fillColor('#000000')
               .text('REPORTE DE VENTAS', 50, 100, { align: 'center' });

            doc.fontSize(10)
               .fillColor('#666666')
               .text(`Fecha de generación: ${new Date().toLocaleString('es-CR')}`, 50, 130)
               .text(`Período: ${datos.fechaDesde || 'Inicio'} - ${datos.fechaHasta || 'Hoy'}`, 50, 145);

            let yPos = 180;

            // Resumen
            doc.fontSize(12)
               .fillColor('#000000')
               .text('RESUMEN', 50, yPos);
            
            yPos += 25;
            doc.fontSize(10)
               .text(`Total de pedidos: ${datos.totalPedidos || 0}`, 50, yPos)
               .text(`Total de ventas: CRC ${formatNumber(datos.totalVentas || 0)}`, 50, yPos + 15)
               .text(`Promedio por pedido: CRC ${formatNumber(datos.promedioPedido || 0)}`, 50, yPos + 30);

            yPos += 60;

            // Tabla de pedidos
            if (datos.pedidos && datos.pedidos.length > 0) {
                doc.fontSize(12)
                   .fillColor('#000000')
                   .text('DETALLE DE PEDIDOS', 50, yPos);
                
                yPos += 25;
                
                // Encabezados
                doc.fontSize(9)
                   .fillColor('#666666')
                   .text('ID', 50, yPos)
                   .text('Fecha', 100, yPos)
                   .text('Cliente', 180, yPos)
                   .text('Estado', 280, yPos)
                   .text('Total', 400, yPos);
                
                yPos += 15;
                doc.moveTo(50, yPos).lineTo(550, yPos).stroke();
                yPos += 10;

                doc.fontSize(9)
                   .fillColor('#000000');

                datos.pedidos.forEach(pedido => {
                    if (yPos > 700) {
                        doc.addPage();
                        yPos = 50;
                    }

                    doc.text(String(pedido.id_pedido || ''), 50, yPos)
                       .text(new Date(pedido.fecha_pedido).toLocaleDateString('es-CR'), 100, yPos)
                       .text((pedido.cliente_nombre || 'Invitado').substring(0, 20), 180, yPos)
                       .text(pedido.estado_pedido || '', 280, yPos)
                       .text(`CRC ${formatNumber(pedido.total || 0)}`, 400, yPos);
                    
                    yPos += 20;
                });
            }

            doc.end();
        } catch (error) {
            reject(error);
        }
    });
}

/**
 * Genera un PDF con reporte de clientes
 */
async function generarPDFClientes(datos) {
    return new Promise((resolve, reject) => {
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
            
            doc.fontSize(16)
               .fillColor('#000000')
               .text('REPORTE DE CLIENTES', 50, 100, { align: 'center' });

            doc.fontSize(10)
               .fillColor('#666666')
               .text(`Fecha de generación: ${new Date().toLocaleString('es-CR')}`, 50, 130);

            let yPos = 180;

            // Resumen
            doc.fontSize(12)
               .fillColor('#000000')
               .text('RESUMEN', 50, yPos);
            
            yPos += 25;
            doc.fontSize(10)
               .text(`Total de clientes: ${datos.totalClientes || 0}`, 50, yPos)
               .text(`Clientes activos: ${datos.clientesActivos || 0}`, 50, yPos + 15);

            yPos += 50;

            // Tabla de clientes
            if (datos.clientes && datos.clientes.length > 0) {
                doc.fontSize(12)
                   .fillColor('#000000')
                   .text('LISTADO DE CLIENTES', 50, yPos);
                
                yPos += 25;
                
                // Encabezados
                doc.fontSize(9)
                   .fillColor('#666666')
                   .text('ID', 50, yPos)
                   .text('Nombre', 100, yPos)
                   .text('Correo', 220, yPos)
                   .text('Teléfono', 380, yPos)
                   .text('Pedidos', 480, yPos);
                
                yPos += 15;
                doc.moveTo(50, yPos).lineTo(550, yPos).stroke();
                yPos += 10;

                doc.fontSize(9)
                   .fillColor('#000000');

                datos.clientes.forEach(cliente => {
                    if (yPos > 700) {
                        doc.addPage();
                        yPos = 50;
                    }

                    doc.text(String(cliente.id_cliente || ''), 50, yPos)
                       .text((cliente.nombre || '').substring(0, 25), 100, yPos)
                       .text((cliente.correo || '').substring(0, 25), 220, yPos)
                       .text(cliente.telefono || '', 380, yPos)
                       .text(String(cliente.total_pedidos || 0), 480, yPos);
                    
                    yPos += 20;
                });
            }

            doc.end();
        } catch (error) {
            reject(error);
        }
    });
}

/**
 * Genera un PDF con reporte de pedidos
 */
async function generarPDFPedidos(datos) {
    return new Promise((resolve, reject) => {
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
            
            doc.fontSize(16)
               .fillColor('#000000')
               .text('REPORTE DE PEDIDOS', 50, 100, { align: 'center' });

            doc.fontSize(10)
               .fillColor('#666666')
               .text(`Fecha de generación: ${new Date().toLocaleString('es-CR')}`, 50, 130)
               .text(`Período: ${datos.fechaDesde || 'Inicio'} - ${datos.fechaHasta || 'Hoy'}`, 50, 145);

            let yPos = 180;

            // Resumen
            doc.fontSize(12)
               .fillColor('#000000')
               .text('RESUMEN', 50, yPos);
            
            yPos += 25;
            doc.fontSize(10)
               .text(`Total de pedidos: ${datos.totalPedidos || 0}`, 50, yPos)
               .text(`Total ingresos: CRC ${formatNumber(datos.totalIngresos || 0)}`, 50, yPos + 15);

            yPos += 50;

            // Tabla de pedidos
            if (datos.pedidos && datos.pedidos.length > 0) {
                doc.fontSize(12)
                   .fillColor('#000000')
                   .text('DETALLE DE PEDIDOS', 50, yPos);
                
                yPos += 25;
                
                // Encabezados
                doc.fontSize(9)
                   .fillColor('#666666')
                   .text('ID', 50, yPos)
                   .text('Fecha', 100, yPos)
                   .text('Cliente', 180, yPos)
                   .text('Estado', 280, yPos)
                   .text('Total', 400, yPos);
                
                yPos += 15;
                doc.moveTo(50, yPos).lineTo(550, yPos).stroke();
                yPos += 10;

                doc.fontSize(9)
                   .fillColor('#000000');

                datos.pedidos.forEach(pedido => {
                    if (yPos > 700) {
                        doc.addPage();
                        yPos = 50;
                    }

                    doc.text(String(pedido.id_pedido || ''), 50, yPos)
                       .text(new Date(pedido.fecha_pedido).toLocaleDateString('es-CR'), 100, yPos)
                       .text((pedido.cliente_nombre || 'Invitado').substring(0, 20), 180, yPos)
                       .text(pedido.estado_pedido || '', 280, yPos)
                       .text(`CRC ${formatNumber(pedido.total || 0)}`, 400, yPos);
                    
                    yPos += 20;
                });
            }

            doc.end();
        } catch (error) {
            reject(error);
        }
    });
}

/**
 * Genera un PDF con reporte de actividad
 */
async function generarPDFActividad(datos) {
    return new Promise((resolve, reject) => {
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
            
            doc.fontSize(16)
               .fillColor('#000000')
               .text('REPORTE DE ACTIVIDAD', 50, 100, { align: 'center' });

            doc.fontSize(10)
               .fillColor('#666666')
               .text(`Fecha de generación: ${new Date().toLocaleString('es-CR')}`, 50, 130)
               .text(`Período: ${datos.fechaDesde || 'Inicio'} - ${datos.fechaHasta || 'Hoy'}`, 50, 145);

            let yPos = 180;

            // Resumen
            doc.fontSize(12)
               .fillColor('#000000')
               .text('RESUMEN', 50, yPos);
            
            yPos += 25;
            doc.fontSize(10)
               .text(`Total de cambios: ${datos.totalCambios || 0}`, 50, yPos)
               .text(`Tablas afectadas: ${datos.tablasAfectadas || 0}`, 50, yPos + 15);

            yPos += 50;

            // Tabla de cambios
            if (datos.cambios && datos.cambios.length > 0) {
                doc.fontSize(12)
                   .fillColor('#000000')
                   .text('REGISTRO DE ACTIVIDAD', 50, yPos);
                
                yPos += 25;
                
                // Encabezados
                doc.fontSize(9)
                   .fillColor('#666666')
                   .text('Fecha', 50, yPos)
                   .text('Usuario', 120, yPos)
                   .text('Tabla', 220, yPos)
                   .text('Acción', 320, yPos);
                
                yPos += 15;
                doc.moveTo(50, yPos).lineTo(550, yPos).stroke();
                yPos += 10;

                doc.fontSize(9)
                   .fillColor('#000000');

                datos.cambios.forEach(cambio => {
                    if (yPos > 700) {
                        doc.addPage();
                        yPos = 50;
                    }

                    const fecha = new Date(cambio.fecha_cambio);
                    doc.text(fecha.toLocaleDateString('es-CR'), 50, yPos)
                       .text((cambio.usuario_nombre || 'N/A').substring(0, 20), 120, yPos)
                       .text(cambio.tabla_afectada || '', 220, yPos)
                       .text(cambio.accion_realizada || '', 320, yPos);
                    
                    yPos += 20;
                });
            }

            doc.end();
        } catch (error) {
            reject(error);
        }
    });
}

/**
 * Genera un archivo Excel con reporte de ventas
 */
async function generarExcelVentas(datos) {
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('Reporte de Ventas');

    // Estilos
    const headerStyle = {
        font: { bold: true, color: { argb: 'FFFFFFFF' } },
        fill: { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFF6B35' } },
        alignment: { horizontal: 'center', vertical: 'middle' }
    };

    // Encabezado
    worksheet.mergeCells('A1:E1');
    worksheet.getCell('A1').value = 'Sunset\'s Tarbaca - Reporte de Ventas';
    worksheet.getCell('A1').font = { size: 16, bold: true };
    worksheet.getCell('A1').alignment = { horizontal: 'center' };

    worksheet.getCell('A2').value = `Fecha de generación: ${new Date().toLocaleString('es-CR')}`;
    worksheet.getCell('A3').value = `Período: ${datos.fechaDesde || 'Inicio'} - ${datos.fechaHasta || 'Hoy'}`;

    // Resumen
    worksheet.getCell('A5').value = 'RESUMEN';
    worksheet.getCell('A5').font = { bold: true };
    worksheet.getCell('A6').value = `Total de pedidos: ${datos.totalPedidos || 0}`;
    worksheet.getCell('A7').value = `Total de ventas: CRC ${formatNumber(datos.totalVentas || 0)}`;
    worksheet.getCell('A8').value = `Promedio por pedido: CRC ${formatNumber(datos.promedioPedido || 0)}`;

    // Encabezados de tabla
    const headers = ['ID Pedido', 'Fecha', 'Cliente', 'Estado', 'Total'];
    worksheet.addRow([]);
    const headerRow = worksheet.addRow(headers);
    headerRow.eachCell((cell) => {
        cell.style = headerStyle;
    });

    // Datos
    if (datos.pedidos && datos.pedidos.length > 0) {
        datos.pedidos.forEach(pedido => {
            worksheet.addRow([
                pedido.id_pedido || '',
                new Date(pedido.fecha_pedido).toLocaleDateString('es-CR'),
                pedido.cliente_nombre || 'Invitado',
                pedido.estado_pedido || '',
                pedido.total || 0
            ]);
        });
    }

    // Ajustar anchos de columna
    worksheet.columns.forEach((column) => {
        column.width = 20;
    });

    const buffer = await workbook.xlsx.writeBuffer();
    return buffer;
}

/**
 * Genera un archivo Excel con reporte de clientes
 */
async function generarExcelClientes(datos) {
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('Reporte de Clientes');

    const headerStyle = {
        font: { bold: true, color: { argb: 'FFFFFFFF' } },
        fill: { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFF6B35' } },
        alignment: { horizontal: 'center', vertical: 'middle' }
    };

    worksheet.mergeCells('A1:E1');
    worksheet.getCell('A1').value = 'Sunset\'s Tarbaca - Reporte de Clientes';
    worksheet.getCell('A1').font = { size: 16, bold: true };
    worksheet.getCell('A1').alignment = { horizontal: 'center' };

    worksheet.getCell('A2').value = `Fecha de generación: ${new Date().toLocaleString('es-CR')}`;

    worksheet.getCell('A4').value = 'RESUMEN';
    worksheet.getCell('A4').font = { bold: true };
    worksheet.getCell('A5').value = `Total de clientes: ${datos.totalClientes || 0}`;
    worksheet.getCell('A6').value = `Clientes activos: ${datos.clientesActivos || 0}`;

    const headers = ['ID', 'Nombre', 'Correo', 'Teléfono', 'Total Pedidos'];
    worksheet.addRow([]);
    const headerRow = worksheet.addRow(headers);
    headerRow.eachCell((cell) => {
        cell.style = headerStyle;
    });

    if (datos.clientes && datos.clientes.length > 0) {
        datos.clientes.forEach(cliente => {
            worksheet.addRow([
                cliente.id_cliente || '',
                cliente.nombre || '',
                cliente.correo || '',
                cliente.telefono || '',
                cliente.total_pedidos || 0
            ]);
        });
    }

    worksheet.columns.forEach((column) => {
        column.width = 20;
    });

    const buffer = await workbook.xlsx.writeBuffer();
    return buffer;
}

/**
 * Genera un archivo Excel con reporte de pedidos
 */
async function generarExcelPedidos(datos) {
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('Reporte de Pedidos');

    const headerStyle = {
        font: { bold: true, color: { argb: 'FFFFFFFF' } },
        fill: { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFF6B35' } },
        alignment: { horizontal: 'center', vertical: 'middle' }
    };

    worksheet.mergeCells('A1:E1');
    worksheet.getCell('A1').value = 'Sunset\'s Tarbaca - Reporte de Pedidos';
    worksheet.getCell('A1').font = { size: 16, bold: true };
    worksheet.getCell('A1').alignment = { horizontal: 'center' };

    worksheet.getCell('A2').value = `Fecha de generación: ${new Date().toLocaleString('es-CR')}`;
    worksheet.getCell('A3').value = `Período: ${datos.fechaDesde || 'Inicio'} - ${datos.fechaHasta || 'Hoy'}`;

    worksheet.getCell('A5').value = 'RESUMEN';
    worksheet.getCell('A5').font = { bold: true };
    worksheet.getCell('A6').value = `Total de pedidos: ${datos.totalPedidos || 0}`;
    worksheet.getCell('A7').value = `Total ingresos: CRC ${formatNumber(datos.totalIngresos || 0)}`;

    const headers = ['ID Pedido', 'Fecha', 'Cliente', 'Estado', 'Total'];
    worksheet.addRow([]);
    const headerRow = worksheet.addRow(headers);
    headerRow.eachCell((cell) => {
        cell.style = headerStyle;
    });

    if (datos.pedidos && datos.pedidos.length > 0) {
        datos.pedidos.forEach(pedido => {
            worksheet.addRow([
                pedido.id_pedido || '',
                new Date(pedido.fecha_pedido).toLocaleDateString('es-CR'),
                pedido.cliente_nombre || 'Invitado',
                pedido.estado_pedido || '',
                pedido.total || 0
            ]);
        });
    }

    worksheet.columns.forEach((column) => {
        column.width = 20;
    });

    const buffer = await workbook.xlsx.writeBuffer();
    return buffer;
}

/**
 * Genera un archivo Excel con reporte de actividad
 */
async function generarExcelActividad(datos) {
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('Reporte de Actividad');

    const headerStyle = {
        font: { bold: true, color: { argb: 'FFFFFFFF' } },
        fill: { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFF6B35' } },
        alignment: { horizontal: 'center', vertical: 'middle' }
    };

    worksheet.mergeCells('A1:D1');
    worksheet.getCell('A1').value = 'Sunset\'s Tarbaca - Reporte de Actividad';
    worksheet.getCell('A1').font = { size: 16, bold: true };
    worksheet.getCell('A1').alignment = { horizontal: 'center' };

    worksheet.getCell('A2').value = `Fecha de generación: ${new Date().toLocaleString('es-CR')}`;
    worksheet.getCell('A3').value = `Período: ${datos.fechaDesde || 'Inicio'} - ${datos.fechaHasta || 'Hoy'}`;

    worksheet.getCell('A5').value = 'RESUMEN';
    worksheet.getCell('A5').font = { bold: true };
    worksheet.getCell('A6').value = `Total de cambios: ${datos.totalCambios || 0}`;
    worksheet.getCell('A7').value = `Tablas afectadas: ${datos.tablasAfectadas || 0}`;

    const headers = ['Fecha', 'Usuario', 'Tabla', 'Acción'];
    worksheet.addRow([]);
    const headerRow = worksheet.addRow(headers);
    headerRow.eachCell((cell) => {
        cell.style = headerStyle;
    });

    if (datos.cambios && datos.cambios.length > 0) {
        datos.cambios.forEach(cambio => {
            const fecha = new Date(cambio.fecha_cambio);
            worksheet.addRow([
                fecha.toLocaleString('es-CR'),
                cambio.usuario_nombre || 'N/A',
                cambio.tabla_afectada || '',
                cambio.accion_realizada || ''
            ]);
        });
    }

    worksheet.columns.forEach((column) => {
        column.width = 20;
    });

    const buffer = await workbook.xlsx.writeBuffer();
    return buffer;
}

module.exports = {
    generarPDFVentas,
    generarPDFClientes,
    generarPDFPedidos,
    generarPDFActividad,
    generarExcelVentas,
    generarExcelClientes,
    generarExcelPedidos,
    generarExcelActividad
};

