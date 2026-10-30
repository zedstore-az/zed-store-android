import { createClient } from "npm:@supabase/supabase-js@2";
const cors={"Access-Control-Allow-Origin":"*","Access-Control-Allow-Headers":"authorization, x-client-info, apikey, content-type, x-zed-api-key","Access-Control-Allow-Methods":"GET, POST, PATCH, OPTIONS","Content-Type":"application/json"};
const reply=(body:unknown,status=200)=>new Response(JSON.stringify(body),{status,headers:cors});
const sha=async(s:string)=>Array.from(new Uint8Array(await crypto.subtle.digest("SHA-256",new TextEncoder().encode(s))),b=>b.toString(16).padStart(2,"0")).join("");
Deno.serve(async(req)=>{
 if(req.method==="OPTIONS")return new Response("ok",{headers:cors});
 try{
  const key=req.headers.get("x-zed-api-key")||"";
  if(!key.startsWith("zed_live_"))return reply({error:"API açarı yanlışdır."},401);
  const url=Deno.env.get("SUPABASE_URL")!;
  const secret=Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")||JSON.parse(Deno.env.get("SUPABASE_SECRET_KEYS")||"{}").default;
  if(!secret)return reply({error:"Server açarı konfiqurasiya edilməyib."},500);
  const db=createClient(url,secret,{auth:{persistSession:false}});
  const {data:auth,error:authErr}=await db.from("chatgpt_api_keys").select("id,owner_id").eq("key_hash",await sha(key)).is("revoked_at",null).maybeSingle();
  if(authErr||!auth)return reply({error:"API açarı tanınmadı və ya ləğv edilib."},401);
  await db.from("chatgpt_api_keys").update({last_used_at:new Date().toISOString()}).eq("id",auth.id);
  const u=new URL(req.url),parts=u.pathname.split("/").filter(Boolean),route=parts.slice(parts.indexOf("zed-chatgpt")+1),owner=auth.owner_id;
  if(req.method==="GET"&&route[0]==="products"){
   const q=(u.searchParams.get("query")||"").trim();if(!q)return reply({error:"query parametri lazımdır."},400);
   const {data,error}=await db.from("products").select("id,name,sku,category,sale_price,birmarket_price,cost_price,stock_qty").eq("owner_id",owner).eq("is_active",true).ilike("name","%"+q+"%").limit(12);
   if(error)throw error;return reply({products:data||[]});
  }
  if(req.method==="GET"&&route[0]==="orders"){
   let q=db.from("orders").select("id,order_number,customer_name,customer_phone,source,delivery_status,payment_status,ordered_at,paid_at,order_items(product_name,quantity,unit_sale_price,transferred_amount)").eq("owner_id",owner).order("ordered_at",{ascending:false}).limit(50);
   const status=u.searchParams.get("status");if(status)q=q.eq("delivery_status",status);
   const {data,error}=await q;if(error)throw error;return reply({orders:data||[]});
  }
  if(req.method==="POST"&&route[0]==="orders"&&route.length===1){
   const body=await req.json(),name=String(body.product_query||"").trim(),price=Number(body.sale_price),qty=Number(body.quantity||1);
   if(!name||!Number.isFinite(price)||price<=0||!Number.isInteger(qty)||qty<1)return reply({error:"Məhsul adı, düzgün satış qiyməti və miqdar lazımdır."},400);
   const {data:matches,error:findErr}=await db.from("products").select("id,name,image_url,cost_price,sale_price,stock_qty").eq("owner_id",owner).eq("is_active",true).ilike("name","%"+name+"%").limit(10);
   if(findErr)throw findErr;if(!matches?.length)return reply({error:"Məhsul tapılmadı."},404);
   const exact=matches.filter(x=>x.name.toLocaleLowerCase("az")===name.toLocaleLowerCase("az")),product=exact.length===1?exact[0]:matches.length===1?matches[0]:null;
   if(!product)return reply({error:"Bir neçə uyğun məhsul tapıldı. Dəqiqləşdir.",matches:matches.map(x=>({id:x.id,name:x.name,stock_qty:x.stock_qty}))},409);
   if(Number(product.stock_qty)<qty)return reply({error:"Anbarda kifayət qədər məhsul yoxdur.",available:product.stock_qty},409);
   const {data:order,error:orderErr}=await db.from("orders").insert({owner_id:owner,customer_name:String(body.customer_name||"ChatGPT sifarişi"),customer_phone:String(body.customer_phone||""),source:String(body.source||"ChatGPT"),delivery_status:"new",customer_note:String(body.note||"")}).select("id,delivery_status,payment_status,ordered_at").single();
   if(orderErr)throw orderErr;
   const {error:itemErr}=await db.from("order_items").insert({owner_id:owner,order_id:order.id,product_id:product.id,product_name:product.name,product_image_url:product.image_url,quantity:qty,unit_cost:Number(product.cost_price||0),unit_sale_price:price,birmarket_price:price,marketplace_commission:0,logistics_fee:0,bank_fee:0,transferred_amount:price});
   if(itemErr){await db.from("orders").delete().eq("id",order.id).eq("owner_id",owner);throw itemErr;}
   const {data:ready,error:readyErr}=await db.from("orders").update({delivery_status:"ready"}).eq("id",order.id).eq("owner_id",owner).select("id,delivery_status,payment_status,ordered_at").single();
   if(readyErr){await db.from("orders").delete().eq("id",order.id).eq("owner_id",owner);throw readyErr;}
   return reply({message:"Sifariş yaradıldı, stokdan çıxıldı və Təhvilə hazır statusu verildi. Ödəniş gözləmədədir.",order:ready,product:product.name,quantity:qty,sale_price:price,payment_status:"unpaid"});
  }
  if(route[0]==="orders"&&route[1]&&route[2]==="status"&&req.method==="PATCH"){
   const body=await req.json(),allowed=["courier","pickup_point","delivered","cancelled"];
   if(!allowed.includes(body.status))return reply({error:"Status uyğun deyil."},400);
   const {data:order,error:getErr}=await db.from("orders").select("id,delivery_status,payment_status").eq("id",route[1]).eq("owner_id",owner).single();if(getErr)throw getErr;
   const next:Record<string,string[]>={ready:["courier","cancelled"],courier:["pickup_point","cancelled"],pickup_point:["delivered","cancelled"],delivered:[],cancelled:[]};
   if(!(next[order.delivery_status]||[]).includes(body.status))return reply({error:"Bu status keçidi mümkün deyil.",current_status:order.delivery_status},409);
   const patch:Record<string,string>={delivery_status:body.status};if(body.status==="cancelled")patch.cancelled_by="ChatGPT";
   const {data,error}=await db.from("orders").update(patch).eq("id",route[1]).eq("owner_id",owner).select("id,delivery_status,payment_status,paid_at").single();if(error)throw error;
   return reply({message:"Sifariş statusu yeniləndi.",order:data});
  }
  if(route[0]==="orders"&&route[1]&&route[2]==="paid"&&req.method==="POST"){
   const {data:order,error:getErr}=await db.from("orders").select("id,delivery_status,payment_status").eq("id",route[1]).eq("owner_id",owner).single();if(getErr)throw getErr;
   if(order.delivery_status!=="delivered")return reply({error:"Ödənişi yalnız sifariş təhvil verildikdən sonra təsdiqləmək olar."},409);
   if(order.payment_status==="paid")return reply({message:"Ödəniş artıq təsdiqlənib.",order});
   const {data,error}=await db.from("orders").update({payment_status:"paid"}).eq("id",route[1]).eq("owner_id",owner).select("id,delivery_status,payment_status,paid_at").single();if(error)throw error;
   return reply({message:"Pul köçməsi təsdiqləndi və gəlir hesabatına daxil edildi.",order:data});
  }
  if(req.method==="GET"&&route[0]==="summary"){
   const [{data:orders,error:e1},{data:sales,error:e2},{data:products,error:e3}]=await Promise.all([
    db.from("orders").select("id,delivery_status,payment_status").eq("owner_id",owner),
    db.from("sales").select("transferred_amount,quantity,net_profit,paid_at").eq("owner_id",owner).not("paid_at","is",null),
    db.from("products").select("id,stock_qty").eq("owner_id",owner).eq("is_active",true)
   ]);
   if(e1||e2||e3)throw e1||e2||e3;
   const received=(sales||[]).reduce((s,x)=>s+Number(x.transferred_amount)*Number(x.quantity),0),profit=(sales||[]).reduce((s,x)=>s+Number(x.net_profit||0),0);
   return reply({orders_total:orders?.length||0,orders_pending_delivery:(orders||[]).filter(x=>!["delivered","cancelled"].includes(x.delivery_status)).length,payments_waiting:(orders||[]).filter(x=>x.payment_status!=="paid"&&x.delivery_status!=="cancelled").length,products_active:products?.length||0,stock_units:(products||[]).reduce((s,x)=>s+Number(x.stock_qty),0),money_received_azn:received,net_profit_azn:profit});
  }
  return reply({error:"Endpoint tapılmadı."},404);
 }catch(error){console.error(error);return reply({error:error?.message||"Daxili xəta."},500);}
});