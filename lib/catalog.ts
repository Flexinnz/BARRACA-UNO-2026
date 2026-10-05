export interface Category {id:string;name:string}
export interface Product {id:number;name:string;category:string;sku:string;brand:string;stock:number;price:number;unit:string}
export interface OrderItem {product:Product;quantity:number}
export const names=['Masonería','Hierros y Estructuras','Herramientas','Sanitaria','Electricidad','Pinturería'];
export const categories:Category[]=names.map(name=>({id:name,name}));
const data:[string,number,string,string,number,number,string][]=[['Cemento Portland 50kg',0,'MAS-001','ANCAP',240,485,'bolsa'],['Varilla de Hierro A42 8mm x 12m',1,'HIE-008','Gerdau',85,390,'unidad'],['Pintura Látex Interior 20L',5,'PIN-020','Inca',8,3250,'balde'],['Codo PVC 110mm 90°',3,'SAN-110','Tigre',120,185,'unidad'],['Cable Unipolar 2.5mm 100m',4,'ELE-025','Funsa',0,2890,'rollo'],['Taladro Percutor 650W',2,'HER-650','Bosch',18,4590,'unidad'],['Arena Gruesa Lavada 1m³',0,'MAS-012','Barraca Uno',42,1850,'m³'],['Malla Electrosoldada 15 x 15cm',1,'HIE-015','Gerdau',6,1490,'panel'],['Ladrillo de Campo',0,'MAS-024','Cerámica del Sur',3200,18,'unidad'],['Caño PVC 110mm x 3m',3,'SAN-112','Tigre',64,620,'unidad'],['Rodillo de Lana 23cm',5,'PIN-023','Condor',9,280,'unidad'],['Llave Térmica Bipolar 25A',4,'ELE-125','Schneider',32,890,'unidad']];
export const defaultProducts:Product[]=data.map((d,i)=>({id:i+1,name:d[0],category:names[d[1]],sku:d[2],brand:d[3],stock:d[4],price:d[5],unit:d[6]}));

export interface StockProduct extends Product {version:number;updatedAt:string}
