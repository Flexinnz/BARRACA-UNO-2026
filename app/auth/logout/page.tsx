"use client";
import {useEffect,useState} from 'react';
export default function Logout(){const [error,setError]=useState(false);useEffect(()=>{fetch('/api/auth',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({action:'logout'})}).then(r=>{if(!r.ok)throw Error();window.location.replace('/ingresar')}).catch(()=>setError(true))},[]);return <main className="account-page-main"><h1>{error?'No pudimos cerrar la sesión.':'Cerrando sesión…'}</h1>{error&&<button onClick={()=>window.location.reload()}>Reintentar</button>}</main>;}
