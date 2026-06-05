import sharp from 'sharp';
async function tone(file,out,{D=8,brightLuma=168,factor=0.8,top=false,bottom=false}={}){
  const {data,info}=await sharp(file).ensureAlpha().raw().toBuffer({resolveWithObject:true});
  const {width:W,height:H,channels:C}=info;
  const A=(x,y)=>(x<0||y<0||x>=W||y>=H)?255:data[(y*W+x)*C+3];
  // perimeter = within D of transparent, or near left/right edges (and top/bottom only if this is the outer slice for that edge)
  const isPerim=(x,y)=>{
    if(x<D||x>=W-D) return true;
    if(top && y<D) return true;
    if(bottom && y>=H-D) return true;
    for(let dy=-D;dy<=D;dy++)for(let dx=-D;dx<=D;dx++){ if(A(x+dx,y+dy)===0) return true; }
    return false;
  };
  let n=0;
  for(let y=0;y<H;y++)for(let x=0;x<W;x++){
    const i=(y*W+x)*C; if(data[i+3]<200) continue;
    const r=data[i],g=data[i+1],b=data[i+2];
    const luma=0.299*r+0.587*g+0.114*b;
    if(luma>brightLuma && isPerim(x,y)){ data[i]=r*factor|0; data[i+1]=g*factor|0; data[i+2]=b*factor|0; n++; }
  }
  await sharp(data,{raw:{width:W,height:H,channels:C}}).webp({quality:88}).toFile(out);
  console.log(file,'toned',n,'edge-highlight px');
}
await tone('public/folder-top.webp','/tmp/ft-toned.webp',{top:true});
await sharp('/tmp/ft-toned.webp').flatten({background:'#140d07'}).extract({left:0,top:0,width:300,height:150}).resize({width:600}).png().toFile('/tmp/ft-toned-corner.png');
