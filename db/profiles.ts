import {env} from 'cloudflare:workers';
export function profileDb(){if(!env.DB)throw Error('Profile database binding unavailable');return env.DB;}
