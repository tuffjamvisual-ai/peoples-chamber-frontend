import sharp from 'sharp';
// composite the top slice over the page backdrop colour, zoom the top-left rounded corner
const meta = await sharp('public/folder-top.webp').metadata();
console.log('folder-top:', meta.width+'x'+meta.height, 'alpha='+meta.hasAlpha);
await sharp({create:{width:meta.width,height:meta.height,channels:4,background:'#140d07'}})
  .composite([{input:'public/folder-top.webp'}]).png().toFile('/tmp/ft-on-dark.png');
// zoom top-left corner
await sharp('/tmp/ft-on-dark.png').extract({left:0,top:0,width:Math.min(260,meta.width),height:Math.min(150,meta.height)}).resize({width:520}).png().toFile('/tmp/ft-corner.png');
// sample edge pixels (leftmost column, a few rows down) to detect light halo
const {data,info}=await sharp('public/folder-top.webp').ensureAlpha().raw().toBuffer({resolveWithObject:true});
const px=(x,y)=>{const i=(y*info.width+x)*info.channels;return [data[i],data[i+1],data[i+2],data[i+3]];};
console.log('edge samples (x,y → RGBA):');
for (const [x,y] of [[0,80],[1,80],[2,80],[3,80],[60,0],[60,1],[60,2]]) console.log(' ',x,y,'→',px(x,y));
