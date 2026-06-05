import sharp from 'sharp';
const W=1023,H=1537;
// top strip full width, to see box + title + locate clean paper
await sharp('public/pca-art.webp').extract({ left:0, top:0, width:W, height:Math.round(H*0.23) }).resize({width:900}).png().toFile('/tmp/masthead-top.png');
console.log('saved masthead-top');
