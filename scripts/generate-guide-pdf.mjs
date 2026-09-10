import PDFDocument from 'pdfkit';
import fs from 'fs';
import path from 'path';

const doc = new PDFDocument({
  size: 'A4',
  margin: 50,
  info: {
    Title: 'Guía de Funcionamiento - Pulse Panel Boost',
    Author: 'Pulse Panel Boost',
  }
});

const outputPath = path.resolve('GUIA_FUNCIONAMIENTO_PANEL_BOOST.pdf');
doc.pipe(fs.createWriteStream(outputPath));

// Colors
const PRIMARY = '#1e293b';
const ACCENT = '#0ea5e9';
const SUCCESS = '#10b981';
const WARNING = '#f59e0b';
const MUTED = '#64748b';

// Header
doc.rect(0, 0, 595.28, 80).fill('#0f172a');
doc.fontSize(22).fillColor('#ffffff').text('PULSE PANEL BOOST', 50, 25, { characterSpacing: 1.5 });
doc.fontSize(10).fillColor(ACCENT).text('GUÍA COMPLETA DE FUNCIONAMIENTO Y MODELO DE NEGOCIO', 50, 52);

doc.moveDown(3);
doc.y = 100;

// Intro
doc.fontSize(14).fillColor(PRIMARY).text('1. ¿Cómo funciona tu plataforma?', { underline: true });
doc.moveDown(0.4);
doc.fontSize(10).fillColor('#334155').text(
  'Tu panel es una plataforma de reventa de servicios para redes sociales (seguidores, likes, visualizaciones). ' +
  'Opera conectado mediante API con un proveedor mayorista (SMMSAT). ' +
  'Ustedes fijan sus propios precios con margen de ganancia (configurado al 284%, de modo que servicios de $2.47 USD se comercializan a ~$7.00 USD), ' +
  'cobran a sus clientes en su propia cuenta bancaria o MercadoPago, y el proveedor se encarga de la entrega técnica.'
);
doc.moveDown(1);

// Step by Step
doc.fontSize(14).fillColor(PRIMARY).text('2. El Ciclo de una Venta: ¿Qué es manual y qué es automático?', { underline: true });
doc.moveDown(0.6);

// Step A
doc.fontSize(11).fillColor(ACCENT).text('PASO 1: El cliente carga saldo en su web (Cobro en Pesos / Cripto)');
doc.fontSize(10).fillColor('#334155').text(
  '• El cliente ingresa a su página en "Cargar Saldo", ve los datos bancarios / alias de MercadoPago de ustedes y realiza una transferencia.\n' +
  '• Notifica el pago cargando el comprobante en la web o enviándolo al WhatsApp (+549 3815944751).\n' +
  '• El dinero real va directo a la cuenta bancaria de ustedes.'
);
doc.moveDown(0.6);

// Step B
doc.fontSize(11).fillColor(WARNING).text('PASO 2: Aprobación del saldo (Acción Manual del Superadmin)');
doc.fontSize(10).fillColor('#334155').text(
  '• Ustedes abren su app bancaria o MercadoPago y verifican que el dinero haya ingresado.\n' +
  '• Ingresan al Superadmin (/dashboard/admin), van a "Pagos y Acreditaciones" y tocan "Aprobar Saldo".\n' +
  '• Al tocar Aprobar, el sistema le suma automáticamente el saldo en USD al cliente en su cuenta de la web.'
);
doc.moveDown(0.6);

// Step C
doc.fontSize(11).fillColor(SUCCESS).text('PASO 3: El cliente compra los seguidores (¡100% AUTOMÁTICO!)');
doc.fontSize(10).fillColor('#334155').text(
  '• ¡IMPORTANTE! USTEDES NO TIENEN QUE IR A CARGAR NADA A MANO EN LA OTRA PÁGINA.\n' +
  '• El cliente elige el servicio (ej. Seguidores Instagram), pega su link, indica la cantidad y da clic en "Hacer Pedido".\n' +
  '• Su página, mediante la API conectada con SMMSAT, envía la orden al instante al proveedor mayorista de forma automática.\n' +
  '• El proveedor recibe la orden y comienza a enviar los seguidores a la cuenta del cliente.'
);
doc.moveDown(1);

// Section 3
doc.fontSize(14).fillColor(PRIMARY).text('3. ¿Cómo cobra y despacha el proveedor (SMMSAT)?', { underline: true });
doc.moveDown(0.4);
doc.fontSize(10).fillColor('#334155').text(
  'Para que la API de SMMSAT acepte y entregue los pedidos de sus clientes, la cuenta mayorista de ustedes en smmsat.com debe tener saldo disponible.\n\n' +
  'Ejemplo práctico de ganancias:\n' +
  '1. Ustedes precargan $20 USD de saldo en su cuenta de SMMSAT.\n' +
  '2. Un cliente en su panel les transfiere $10.000 ARS por un paquete de seguidores.\n' +
  '3. Ustedes aprueban el saldo en su web y conservan los $10.000 ARS limpios en su banco.\n' +
  '4. El cliente pide los seguidores; la web llama a SMMSAT y SMMSAT descuenta el costo mayorista (ej. $2 USD) de su saldo precargado y entrega los seguidores.\n' +
  '5. Ganancia neta: La diferencia entre lo que cobraron en Pesos y lo que costó el servicio en el mayorista.'
);
doc.moveDown(1);

// Section 4
doc.fontSize(14).fillColor(PRIMARY).text('4. Demoras y Tiempos de Entrega de los Seguidores', { underline: true });
doc.moveDown(0.4);
doc.fontSize(10).fillColor('#334155').text(
  '• Inicio del servicio: La mayoría inicia entre 5 y 60 minutos luego de creado el pedido.\n' +
  '• Velocidad de entrega: Los seguidores entran de forma gradual (ej. 500 a 2.000 por día según el paquete elegido) para proteger la cuenta del cliente contra algoritmos de spam de Instagram o TikTok.\n' +
  '• Estado en vivo: El cliente puede seguir en todo momento si su pedido está "En progreso" o "Completado" en la sección "Mis Pedidos".'
);
doc.moveDown(1);

// Section 5
doc.fontSize(14).fillColor(PRIMARY).text('5. ¿Cómo automatizar también los pagos al 100% en el futuro?', { underline: true });
doc.moveDown(0.4);
doc.fontSize(10).fillColor('#334155').text(
  'Actualmente el pedido es 100% automático y solo la acreditación de la transferencia es manual para que ustedes no paguen comisiones a pasarelas.\n' +
  'Si en el futuro quieren que el cliente pague y se le acredite el saldo solo sin intervención de ustedes:\n' +
  '• Se integra la API de MercadoPago Checkout Pro / Webhook.\n' +
  '• El cliente paga con tarjeta, débito o dinero en cuenta, MercadoPago avisa a su servidor por webhook y el saldo se acredita en un segundo automáticamente.'
);

// Footer
doc.rect(0, 792, 595.28, 50).fill('#f1f5f9');
doc.fontSize(8).fillColor(MUTED).text('Pulse Panel Boost — Sistema Automatizado de Servicios SMM | Soporte WhatsApp: +549 3815944751', 50, 805, { align: 'center' });

doc.end();
console.log('PDF generado exitosamente en:', outputPath);
