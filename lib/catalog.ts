export const APP_VERSION = 'v2.3';

export interface Category {id:string;name:string}
export interface Product {
  id:number;
  name:string;
  category:string;
  sku:string;
  brand:string;
  stock:number;
  price:number;
  unit:string;
  imageId:number;
  imageSrc:string;
}
export interface OrderItem {product:Product;quantity:number}
export const names=['Masonería','Hierros y Estructuras','Herramientas','Sanitaria','Electricidad','Pinturería'];
export const categories:Category[]=names.map(name=>({id:name,name}));

const data:[string,number,string,string,number,number,string,string][]=[
  // Masonería (0)
  ['Cemento Portland 50kg',0,'MAS-001','ANCAP',240,485,'bolsa','1.jpg'],
  ['Arena Gruesa Lavada 1m³',0,'MAS-012','Barraca Uno',42,1850,'m³','7.jpg'],
  ['Arena Fina de Pedregal 1m³',0,'MAS-013','Barraca Uno',28,1650,'m³','7-2.jpg'],
  ['Ladrillo de Campo',0,'MAS-024','Cerámica del Sur',3200,18,'unidad','9.jpg'],
  ['Ladrillo Esmaltado Blanco 20x10x5cm',0,'MAS-025','Cerámica del Sur',850,52,'unidad','ladrillo_blanco.jpg'],
  ['Block Hormigón 20x20x40cm',0,'MAS-030','Prefabricados del Este',420,145,'unidad','block_hormigon.jpg'],
  ['Cal Hidratada 25kg',0,'MAS-040','Onorat',180,220,'bolsa','cal_hidratada.jpg'],
  ['Baldosa Gres 45x45cm',0,'MAS-051','San Lorenzo',320,890,'m²','baldosa_gres.jpg'],
  ['Membrana Impermeabilizante 10kg',0,'MAS-060','Impercoll',95,1480,'lata','membrana.jpg'],
  ['Mezcla de Albañilería 25kg',0,'MAS-070','ANCAP',310,285,'bolsa','mezcla_albanileria.jpg'],
  // Hierros y Estructuras (1)
  ['Varilla de Hierro A42 8mm x 12m',1,'HIE-008','Gerdau',85,390,'unidad','2.jpg'],
  ['Varilla de Hierro A42 12mm x 12m',1,'HIE-012','Gerdau',62,870,'unidad','2-2.jpg'],
  ['Varilla de Hierro A63 16mm x 12m',1,'HIE-016','Gerdau',24,1650,'unidad','2-3.jpg'],
  ['Malla Electrosoldada 15x15cm',1,'HIE-015','Gerdau',6,1490,'panel','8.jpg'],
  ['Perfil Ángulo 50x50x4mm x 6m',1,'HIE-050','Gerdau',45,1240,'unidad','perfil_angulo.jpg'],
  ['Caño Cuadrado 40x40x2mm x 6m',1,'HIE-040','Gerdau',38,1180,'unidad','cano_cuadrado.jpg'],
  ['Chapa Galvanizada 1mm 1x2m',1,'HIE-110','CINTER',70,2100,'plancha','chapa_galvanizada.jpg'],
  ['Placa de Yeso Estándar 1.2x2.4m',1,'HIE-200','Knauf',55,950,'plancha','placa_yeso.jpg'],
  // Herramientas (2)
  ['Taladro Percutor 650W',2,'HER-650','Bosch',18,4590,'unidad','6.jpg'],
  ['Amoladora 115mm 720W',2,'HER-115','Bosch',22,3890,'unidad','amoladora.jpg'],
  ['Sierra Circular 1400W 185mm',2,'HER-185','Makita',11,8750,'unidad','sierra_circular.jpg'],
  ['Nivel de Burbuja Aluminio 60cm',2,'HER-060','Stanley',40,890,'unidad','nivel_burbuja.jpg'],
  ['Cinta Métrica 5m',2,'HER-005','Stanley',75,320,'unidad','cinta_metrica.jpg'],
  ['Juego de Llaves Combinadas 8-19mm',2,'HER-LLA','Stanley',28,1890,'juego','juego_llaves.jpg'],
  ['Pala Ancha Punta de Lanza',2,'HER-PAL','Bellota',32,980,'unidad','pala.jpg'],
  ['Carretilla Construcción 85L',2,'HER-CAR','Truper',14,4200,'unidad','carretilla.jpg'],
  ['Mezcladora Eléctrica 1200W',2,'HER-MIX','Bauker',7,12500,'unidad','mezcladora.jpg'],
  // Sanitaria (3)
  ['Caño PVC 110mm x 3m',3,'SAN-112','Tigre',64,620,'unidad','10.jpg'],
  ['Codo PVC 110mm 90°',3,'SAN-110','Tigre',120,185,'unidad','4.jpg'],
  ['Caño PVC 50mm x 3m',3,'SAN-050','Tigre',88,320,'unidad','10-2.jpg'],
  ['Canilla Monocomando Cocina',3,'SAN-220','FV',35,3800,'unidad','canilla_cocina.jpg'],
  ['Canilla Pileta Baño Cromada',3,'SAN-221','FV',48,1950,'unidad','canilla_bano.jpg'],
  ['Inodoro Común con Mochila',3,'SAN-300','Ferrum',12,8900,'juego','inodoro.jpg'],
  ['Lavamanos de Colgar',3,'SAN-310','Ferrum',9,6200,'unidad','lavamanos.jpg'],
  ['Flexible Sanitario 50cm',3,'SAN-400','Ferrum',90,280,'unidad','flexible_sanitario.jpg'],
  ['Cinta Teflón 1/2" x 10m',3,'SAN-500','Intertec',250,75,'rollo','cinta_teflon.jpg'],
  // Electricidad (4)
  ['Cable Unipolar 2.5mm 100m',4,'ELE-025','Funsa',0,2890,'rollo','5.jpg'],
  ['Cable Unipolar 4mm 100m',4,'ELE-040','Funsa',22,4200,'rollo','cable_4mm.jpg'],
  ['Cable Bipolar 2x2.5mm 100m',4,'ELE-B25','Funsa',18,5800,'rollo','cable_bipolar.jpg'],
  ['Llave Térmica Bipolar 25A',4,'ELE-125','Schneider',32,890,'unidad','12.jpg'],
  ['Tomacorriente Doble Schuko',4,'ELE-T20','Schneider',80,520,'unidad','tomacorriente.jpg'],
  ['Interruptor Simple',4,'ELE-I10','Schneider',95,380,'unidad','interruptor.jpg'],
  ['Caja Embutir Rectangular',4,'ELE-C01','Legrand',150,85,'unidad','caja_embutir.jpg'],
  ['Lámpara LED 18W E27',4,'ELE-LED','Philips',110,420,'unidad','lampara_led.jpg'],
  ['Canaleta PVC 20x12mm x 2m',4,'ELE-CAN','Dexson',200,185,'tira','canaleta_pvc.jpg'],
  // Pinturería (5)
  ['Pintura Látex Interior 20L',5,'PIN-020','Inca',8,3250,'balde','pintura_interior.jpg'],
  ['Pintura Látex Exterior 20L',5,'PIN-021','Inca',12,3890,'balde','pintura_exterior.jpg'],
  ['Esmalte Sintético Brillante 1L',5,'PIN-030','Sinteplast',45,980,'lata','3.jpg'],
  ['Fijador Sellador 1L',5,'PIN-040','Ceresita',60,750,'lata','fijador.jpg'],
  ['Rodillo de Lana 23cm',5,'PIN-023','Condor',9,280,'unidad','11.jpg'],
  ['Pincel de Cerda 3"',5,'PIN-050','Condor',55,195,'unidad','pincel.jpg'],
  ['Lija al Agua Grano 220 (hoja)',5,'PIN-220','3M',180,45,'hoja','lija.jpg'],
  ['Masilla Plástica 1kg',5,'PIN-060','Bostik',70,520,'lata','masilla.jpg'],
];

export const defaultProducts:Product[]=data.map((d,i)=>{
  const id=i+1;
  const catIndex=d[1];
  const imgFile=d[7];
  const numMatch=imgFile.match(/^(\d+)/);
  const imageId=numMatch?parseInt(numMatch[1],10):(id>12?[1,3,5,7,9,11][catIndex]:id);
  const imageSrc='/products/'+imgFile;
  return {id,name:d[0],category:names[catIndex],sku:d[2],brand:d[3],stock:d[4],price:d[5],unit:d[6],imageId,imageSrc};
});

export interface StockProduct extends Product {version:number;updatedAt:string}
