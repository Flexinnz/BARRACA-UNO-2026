import {getChatGPTUser} from '../../chatgpt-auth';
import {ensureAccount,accountEnabled} from '../../../lib/accounts';
import {readStock} from '../../../lib/stock';
export const dynamic='force-dynamic';
export async function GET(){
  const user=await getChatGPTUser();
  if(user){
    try{
      const account=await ensureAccount(user);
      if(!accountEnabled(account,user))return Response.json({error:'Tu cuenta está deshabilitada.'},{status:403});
    }catch{}
  }
  try{
    return Response.json({products:await readStock()},{headers:{'Cache-Control':'no-store'}});
  }catch(e){
    console.error('Stock read failed',e);
    return Response.json({error:'No pudimos consultar las existencias.'},{status:503});
  }
}

