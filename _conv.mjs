import sharp from 'sharp';
const { data, info } = await sharp('/tmp/pcpkg/art.png').ensureAlpha().raw().toBuffer({ resolveWithObject: true });
const ch = info.channels;
let clearedTL=0;
for (let i=0; i<data.length; i+=ch) {
  const r=data[i],g=data[i+1],b=data[i+2];
  const luma=0.299*r+0.587*g+0.114*b;
  // low threshold: only near-pure-black (torn-edge background) → transparent; keep dark rust/brown text+title
  let a=Math.round(((luma-4)/(20-4))*255);
  data[i+3]=Math.max(0,Math.min(255,a));
}
await sharp(data,{raw:{width:info.width,height:info.height,channels:ch}}).webp({quality:82}).toFile('public/pca-art.webp');
const m=await sharp('public/pca-art.webp').metadata();
console.log('wrote pca-art.webp', m.width+'x'+m.height,'alpha='+m.hasAlpha, (await import('fs')).statSync('public/pca-art.webp').size+'b');
// preview composited over backdrop colour #140d07, full image, to verify corners blend + title intact
await sharp({create:{width:info.width,height:info.height,channels:4,background:'#140d07'}})
  .composite([{input:'public/pca-art.webp'}]).resize({width:500}).png().toFile('/tmp/art-preview.png');
