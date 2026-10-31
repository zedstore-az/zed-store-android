self.addEventListener('install',e=>self.skipWaiting());
self.addEventListener('activate',e=>e.waitUntil(self.clients.claim()));
self.addEventListener('push',e=>{
 let p={title:'ZED STORE',body:'Yeni bildiriş var.',url:'/notifications'};
 try{if(e.data)p={...p,...e.data.json()};}catch{if(e.data)p.body=e.data.text();}
 e.waitUntil(self.registration.showNotification(p.title||'ZED STORE',{body:p.body||'Yeni bildiriş var.',icon:'/zed-store-icon.svg',badge:'/zed-store-icon.svg',tag:p.tag||undefined,data:{url:p.url||'/notifications'}}));
});
self.addEventListener('notificationclick',e=>{
 e.notification.close();
 const target=new URL(e.notification.data?.url||'/notifications',self.location.origin).href;
 e.waitUntil(self.clients.matchAll({type:'window',includeUncontrolled:true}).then(list=>{
  const client=list.find(c=>'focus' in c);
  if(client){client.navigate(target);return client.focus();}
  return self.clients.openWindow?self.clients.openWindow(target):undefined;
 }));
});