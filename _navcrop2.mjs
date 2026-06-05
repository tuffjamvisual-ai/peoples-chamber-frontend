import sharp from 'sharp';
const W=1023,H=1537;
const top=Math.round(H*0.195), bot=Math.round(H*0.235);
await sharp('public/pca-art.webp').extract({left:0,top,width:W,height:bot-top}).resize({width:1023}).png().toFile('/tmp/nav-labels.png');
console.log('band y', (100*top/H).toFixed(1)+'% to',(100*bot/H).toFixed(1)+'%');
