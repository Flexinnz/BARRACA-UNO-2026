import {getChatGPTUser,requireChatGPTUser,chatGPTSignInPath} from '../chatgpt-auth';
import {AccountScreen} from '../profile-panel';
import {ensureAccount,accountEnabled} from '../../lib/accounts';
import {authConfig} from '../../lib/supabase';
import {AccessState} from '../access-state';
export const dynamic='force-dynamic';
export const metadata={title:'Mi cuenta | Barraca Uno'};
export default async function AccountPage(){const user=authConfig()?await requireChatGPTUser('/cuenta'):await getChatGPTUser();if(user){try{const account=await ensureAccount(user);if(!accountEnabled(account,user))return <AccessState deleted={account.status==='deleted'}/>;}catch{return <AccessState error/>;}}return <AccountScreen authenticated={!!user} signInHref={chatGPTSignInPath('/cuenta')}/>;}

