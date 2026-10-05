import type {Product} from './catalog';

export const stockSections = [
 {id:'tubos',name:'Tubos y conexiones',label:'01',description:'Caños, tubos, codos y accesorios de sanitaria.'},
 {id:'hierros',name:'Varillas y hierros',label:'02',description:'Varillas, mallas y materiales para estructuras.'},
 {id:'polvos',name:'Cemento, Portland y polvos',label:'03',description:'Cemento en bolsas, cal, yeso y mezclas secas.'},
 {id:'mamposteria',name:'Bloques y ladrillos',label:'04',description:'Ladrillos, bloques y piezas de mampostería.'},
 {id:'aridos',name:'Arena, piedra y áridos',label:'05',description:'Materiales a granel para mezclas y obra.'},
 {id:'herramientas',name:'Herramientas',label:'06',description:'Herramientas manuales, máquinas y accesorios.'},
 {id:'electricidad',name:'Electricidad',label:'07',description:'Cables, protecciones y componentes eléctricos.'},
 {id:'pintureria',name:'Pinturas y accesorios',label:'08',description:'Pinturas, rodillos y materiales de terminación.'},
 {id:'otros',name:'Otros materiales',label:'09',description:'Los demás materiales del depósito.'},
] as const;
export type StockSectionId = typeof stockSections[number]['id'];

export function stockSectionFor(product:Product):StockSectionId {
 const name=product.name.normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase();
 if(/\b(tubo|tubos|cano|canos|codo|codos|pvc|conexion|conexiones)\b/.test(name)||product.category==='Sanitaria')return 'tubos';
 if(/\b(varilla|varillas|hierro|hierros|malla|mallas)\b/.test(name)||product.category==='Hierros y Estructuras')return 'hierros';
 if(/\b(cemento|portland|cal|yeso|mortero|polvo|polvos|mezcla seca)\b/.test(name))return 'polvos';
 if(/\b(bloque|bloques|ladrillo|ladrillos)\b/.test(name))return 'mamposteria';
 if(/\b(arena|piedra|pedregullo|grava|arido|aridos)\b/.test(name))return 'aridos';
 if(product.category==='Herramientas')return 'herramientas';
 if(product.category==='Electricidad')return 'electricidad';
 if(product.category==='Pinturería')return 'pintureria';
 return 'otros';
}
