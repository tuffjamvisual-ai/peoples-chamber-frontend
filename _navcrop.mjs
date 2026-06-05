import sharp from 'sharp';
const W=1023,H=1537;
// nav strip: y 16%–22%
const top=Math.round(H*0.16), h=Math.round(H*0.065);
await sharp('public/pca-art.webp').extract({left:0,top,width:W,height:h}).resize({width:1023}).png().toFile('/tmp/nav-strip.png');
console.log('nav strip: y', (100*top/H).toFixed(1)+'%','to',(100*(top+h)/H).toFixed(1)+'%','(px',top,'-',top+h,')');
