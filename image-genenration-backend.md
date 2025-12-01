importexpressfrom"express";

importfetchSwiggySuggestionsfrom"../utils/swiggy/fetchSwiggySuggestions";

import{deleteProcessingMenu,getProcessingMenuByEmail,getProcessingMenus,getProcessingNumber,updateProcessingMenu,writeProcessingMenu}from"../imagegen-db/lowDb2";

constrouter=express.Router();

asyncfunctionimageRequestHandler(req:any,res:any){

const{lat,lng,query}=req.query;

if(!lat||!lng||!query){

returnres.status(400).json({error:"Missing required parameters"});

}

try{

constimageUrls=awaitfetchSwiggySuggestions(

latasstring,

lngasstring,

queryasstring,

req.headers

);

res.json(imageUrls);

}catch(err){

console.error(err);

res.status(500).json({error:"Internal error"});

}

}

asyncfunctionimagesv2RequestHandler(req:any,res:any){

const{lat,lng,itemNames,partnerEmail}=req.body;

if(!lat||!lng||!itemNames||!partnerEmail){

returnres.status(400).json({error:"Missing required parameters"});

}

awaitwriteProcessingMenu(

{

partnerEmail:partnerEmailasstring,

lat:latasstring,

lng:lngasstring,

itemNames:itemNamesasstring[],

timestamp:newDate().toISOString(),

status:"pending",

processedNumber:0

}

);

res.json({message:"Menu processing request received."});

try{

for(constitemNameofitemNamesasstring[]){

constimageUrls=awaitfetchSwiggySuggestions(

latasstring,

lngasstring,

itemName,

req.headers

);

console.log(`Item: ${itemName} - Found ${imageUrls.length} images.`);

constcurrentProcessedNumber=awaitgetProcessingNumber(partnerEmailasstring)||0;

awaitupdateProcessingMenu(partnerEmailasstring,{

returnData:{

[itemName]: imageUrls,
},

processedNumber:currentProcessedNumber+1,

status:"processing"

});

}

awaitupdateProcessingMenu(partnerEmailasstring,{

status:"completed",

processedNumber:(itemNamesasstring[]).length

});

}catch(error){

console.error(error);

awaitupdateProcessingMenu(partnerEmailasstring,{

status:"failed"

});

}

}

asyncfunctionimagev2PingRequestHandler(req:any,res:any){

constpartner=req.query.partnerasstring;

if(!partner){

returnres.status(400).json({error:"Missing required parameter: partner"});

}

try{

constmenu=awaitgetProcessingMenuByEmail(partner)

returnres.json({processedNumber:menu?.processedNumber||0,status:menu?.status||"not_found"});

}catch(error){

console.error(error);

returnres.status(500).json({error:"Internal error"});

}

}

asyncfunctionimageV2GetRequestHandler(req:any,res:any){

constpartner=req.query.partnerasstring;

if(!partner){

returnres.status(400).json({error:"Missing required parameter: partner"});

}

try{

constmenu=awaitgetProcessingMenuByEmail(partner)

res.json(menu?.returnData||{});

awaitdeleteProcessingMenu(partner);

}catch(error){

console.error(error);

returnres.status(500).json({error:"Internal error"});

}

}

router.get("/images",imageRequestHandler);

router.post("/images-v2",imagesv2RequestHandler);

router.get("/image-v2/ping",imagev2PingRequestHandler);

router.get("/image-v2/get",imageV2GetRequestHandler);

exportdefaultrouter;
