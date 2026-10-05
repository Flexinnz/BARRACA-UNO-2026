export interface Category {id:string;name:string}
export interface Product {id:number;name:string;category:string;sku:string;brand:string;stock:number;price:number;unit:string}
export interface OrderItem {product:Product;quantity:number}
export const names=['Masonería','Hierros y Estructuras','Herramientas','Sanitaria','Electricidad','Pinturería'];
export const categories:Category[]=names.map(name=>({id:name,name}));
const data:[string,number,string,string,number,number,string][]=[
  // Masonería (0)
  ['Cemento Portland 50kg',0,'MAS-001','ANCAP',240,485,'bolsa'],
  ['Arena Gruesa Lavada 1m³',0,'MAS-012','Barraca Uno',42,1850,'m³'],
  ['Arena Fina de Pedregal 1m³',0,'MAS-013','Barraca Uno',28,1650,'m³'],
  ['Ladrillo de Campo',0,'MAS-024','Cerámica del Sur',3200,18,'unidad'],
  ['Ladrillo Esmaltado Blanco 20x10x5cm',0,'MAS-025','Cerámica del Sur',850,52,'unidad'],
  ['Block Hormigón 20x20x40cm',0,'MAS-030','Prefabricados del Este',420,145,'unidad'],
  ['Cal Hidratada 25kg',0,'MAS-040','Onorat',180,220,'bolsa'],
  ['Baldosa Gres 45x45cm',0,'MAS-051','San Lorenzo',320,890,'m²'],
  ['Membrana Impermeabilizante 10kg',0,'MAS-060','Impercoll',95,1480,'lata'],
  ['Mezcla de Albañilería 25kg',0,'MAS-070','ANCAP',310,285,'bolsa'],
  // Hierros y Estructuras (1)
  ['Varilla de Hierro A42 8mm x 12m',1,'HIE-008','Gerdau',85,390,'unidad'],
  ['Varilla de Hierro A42 12mm x 12m',1,'HIE-012','Gerdau',62,870,'unidad'],
  ['Varilla de Hierro A63 16mm x 12m',1,'HIE-016','Gerdau',24,1650,'unidad'],
  ['Malla Electrosoldada 15x15cm',1,'HIE-015','Gerdau',6,1490,'panel'],
  ['Perfil Ángulo 50x50x4mm x 6m',1,'HIE-050','Gerdau',45,1240,'unidad'],
  ['Caño Cuadrado 40x40x2mm x 6m',1,'HIE-040','Gerdau',38,1180,'unidad'],
  ['Chapa Galvanizada 1mm 1x2m',1,'HIE-110','CINTER',70,2100,'plancha'],
  ['Placa de Yeso Estándar 1.2x2.4m',1,'HIE-200','Knauf',55,950,'plancha'],
  // Herramientas (2)
  ['Taladro Percutor 650W',2,'HER-650','Bosch',18,4590,'unidad'],
  ['Amoladora 115mm 720W',2,'HER-115','Bosch',22,3890,'unidad'],
  ['Sierra Circular 1400W 185mm',2,'HER-185','Makita',11,8750,'unidad'],
  ['Nivel de Burbuja Aluminio 60cm',2,'HER-060','Stanley',40,890,'unidad'],
  ['Cinta Métrica 5m',2,'HER-005','Stanley',75,320,'unidad'],
  ['Juego de Llaves Combinadas 8-19mm',2,'HER-LLA','Stanley',28,1890,'juego'],
  ['Pala Ancha Punta de Lanza',2,'HER-PAL','Bellota',32,980,'unidad'],
  ['Carretilla Construcción 85L',2,'HER-CAR','Truper',14,4200,'unidad'],
  ['Mezcladora Eléctrica 1200W',2,'HER-MIX','Bauker',7,12500,'unidad'],
  // Sanitaria (3)
  ['Caño PVC 110mm x 3m',3,'SAN-112','Tigre',64,620,'unidad'],
  ['Codo PVC 110mm 90°',3,'SAN-110','Tigre',120,185,'unidad'],
  ['Caño PVC 50mm x 3m',3,'SAN-050','Tigre',88,320,'unidad'],
  ['Canilla Monocomando Cocina',3,'SAN-220','FV',35,3800,'unidad'],
  ['Canilla Pileta Baño Cromada',3,'SAN-221','FV',48,1950,'unidad'],
  ['Inodoro Común con Mochila',3,'SAN-300','Ferrum',12,8900,'juego'],
  ['Lavamanos de Colgar',3,'SAN-310','Ferrum',9,6200,'unidad'],
  ['Flexible Sanitario 50cm',3,'SAN-400','Ferrum',90,280,'unidad'],
  ['Cinta Teflón 1/2" x 10m',3,'SAN-500','Intertec',250,75,'rollo'],
  // Electricidad (4)
  ['Cable Unipolar 2.5mm 100m',4,'ELE-025','Funsa',0,2890,'rollo'],
  ['Cable Unipolar 4mm 100m',4,'ELE-040','Funsa',22,4200,'rollo'],
  ['Cable Bipolar 2x2.5mm 100m',4,'ELE-B25','Funsa',18,5800,'rollo'],
  ['Llave Térmica Bipolar 25A',4,'ELE-125','Schneider',32,890,'unidad'],
  ['Tomacorriente Doble Schuko',4,'ELE-T20','Schneider',80,520,'unidad'],
  ['Interruptor Simple',4,'ELE-I10','Schneider',95,380,'unidad'],
  ['Caja Embutir Rectangular',4,'ELE-C01','Legrand',150,85,'unidad'],
  ['Lámpara LED 18W E27',4,'ELE-LED','Philips',110,420,'unidad'],
  ['Canaleta PVC 20x12mm x 2m',4,'ELE-CAN','Dexson',200,185,'tira'],
  // Pinturería (5)
  ['Pintura Látex Interior 20L',5,'PIN-020','Inca',8,3250,'balde'],
  ['Pintura Látex Exterior 20L',5,'PIN-021','Inca',12,3890,'balde'],
  ['Esmalte Sintético Brillante 1L',5,'PIN-030','Sinteplast',45,980,'lata'],
  ['Fijador Sellador 1L',5,'PIN-040','Ceresita',60,750,'lata'],
  ['Rodillo de Lana 23cm',5,'PIN-023','Condor',9,280,'unidad'],
  ['Pincel de Cerda 3"',5,'PIN-050','Condor',55,195,'unidad'],
  ['Lija al Agua Grano 220 (hoja)',5,'PIN-220','3M',180,45,'hoja'],
  ['Masilla Plástica 1kg',5,'PIN-060','Bostik',70,520,'lata'],
];
export const defaultProducts:Product[]=data.map((d,i)=>({id:i+1,name:d[0],category:names[d[1]],sku:d[2],brand:d[3],stock:d[4],price:d[5],unit:d[6]}));

export interface StockProduct extends Product {version:number;updatedAt:string}
