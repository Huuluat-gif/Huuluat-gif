import { getUser,syncProfile,getProfileAvatar } from '@/lib/auth/server';
import { json,route } from '@/lib/api';
import { getMembership } from '@/lib/membership';
import { getUserData,statsFor } from '@/lib/user-data';
export const dynamic='force-dynamic';
export const GET=route(async()=>{
 const user=await getUser();if(!user){const data={saved:[],progress:{},secondsByDay:{}};return json({user:null,data,membership:null,stats:statsFor(data.secondsByDay)});}
 await syncProfile(user);const [data,membership,avatarUrl]=await Promise.all([getUserData(user.id),getMembership(user.id),getProfileAvatar(user.id)]);return json({user:{...user,avatarUrl},data,membership,stats:statsFor(data.secondsByDay)});
});
