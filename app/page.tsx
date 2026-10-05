import Inventory from './inventory';
import {readStock} from '../lib/stock';
import {getChatGPTUser,requireChatGPTUser} from './chatgpt-auth';
import {authConfig} from '../lib/supabase';
import {ensureAccount,accountEnabled} from '../lib/accounts';
import {AccessState} from './access-state';
export const dynamic='force-dynamic';
export default async function Home(){
  const user=await getChatGPTUser();
  const products=await readStock();
  if(user){
    try{
      const account=await ensureAccount(user);
      if(!accountEnabled(account,user))return <AccessState deleted={account.status==='deleted'}/>;
      return <Inventory initialProducts={products}/>;
    }catch(error){
      console.error('Account access check failed',error);
      return <AccessState error/>;
    }
  }
  return <Inventory initialProducts={products}/>;
}

