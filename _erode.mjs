import sharp from 'sharp';
async function erodeEdge(file, out, R=2, aThresh=60){
  const { data, info } = await sharp(file).ensureAlpha().raw().toBuffer({ resolveWithObject:true });
  const {width:W,height:H,channels:C}=info;
  const A=(x,y)=> (x<0||y<0||x>=W||y>=H) ? 255 : data[(y*W+x)*C+3]; // OOB = opaque (don't erode image borders)
  const clear=[];
  for(let y=0;y<H;y++) for(let x=0;x<W;x++){
    const i=(y*W+x)*C; if(data[i+3]===0) continue;
    let touch=false;
    for(let dy=-R;dy<=R&&!touch;dy++) for(let dx=-R;dx<=R;dx++){ if(A(x+dx,y+dy)<aThresh){touch=true;break;} }
    if(touch) clear.push(i);
  }
  for(const i of clear) data[i+3]=0;
  await sharp(data,{raw:{width:W,height:H,channels:C}}).webp({quality:88}).toFile(out);
  console.log(file,'→',out,'eroded',clear.length,'edge px');
}
await erodeEdge('public/folder-top.webp','/tmp/folder-top-eroded.webp');
// preview corner on dark
const m=await sharp('/tmp/folder-top-eroded.webp').metadata();
await sharp({create:{width:m.width,height:m.height,channels:4,background:'#140d07'}})
  .composite([{input:'/tmp/folder-top-eroded.webp'}]).extract({left:0,top:0,width:260,height:150}).resize({width:520}).png().toFile('/tmp/ft-corner-eroded.png');
