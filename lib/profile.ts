export type Theme='light'|'dark'|'system';
export interface UserProfile {displayName:string;company:string;phone:string;bio:string;avatar:string;accent:string;theme:Theme;density:string;email:string;updatedAt?:string}
export const accents=['ocean','sky','copper','forest'] as const;
export const avatars=['initials','builder','helmet','house','tools'] as const;
export const avatarSymbols:Record<string,string>={builder:'👷',helmet:'🪖',house:'🏠',tools:'🛠️'};
export const defaultProfile:UserProfile={displayName:'',company:'',phone:'',bio:'',avatar:'initials',accent:'ocean',theme:'dark',density:'comfortable',email:''};
export function validateProfile(value:unknown):Omit<UserProfile,'email'|'updatedAt'> {
 if(!value||typeof value!=='object')throw Error('El perfil no es válido.');
 const input=value as Record<string,unknown>;
 const text=(key:string,max:number,required=false)=>{if(typeof input[key]!=='string')throw Error(`El campo ${key} no es válido.`);const s=(input[key] as string).trim();if(s.length>max||(required&&!s))throw Error(`Revisá el campo ${key}.`);return s};
 const displayName=text('displayName',80,true),company=text('company',100),phone=text('phone',30),bio=text('bio',280);
 const avatarStr=typeof input.avatar==='string'?input.avatar.trim():'initials';
 const isCustomImg=avatarStr.startsWith('data:image/')||avatarStr.startsWith('http://')||avatarStr.startsWith('https://')||avatarStr.startsWith('/');
 if(!avatars.includes(avatarStr as typeof avatars[number])&&!isCustomImg)throw Error('El avatar no es válido.');
 if(avatarStr.length>800000)throw Error('La imagen de perfil es demasiado grande. Elegí una imagen más liviana.');
 if(!accents.includes(input.accent as typeof accents[number])||!['light','dark','system'].includes(String(input.theme))||!['comfortable','compact'].includes(String(input.density)))throw Error('Las preferencias no son válidas.');
 return {displayName,company,phone,bio,avatar:avatarStr,accent:String(input.accent),theme:input.theme as Theme,density:String(input.density)};
}

