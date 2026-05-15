/* ═══════════════════════════════════════════════════════════
   AYALYM — Build script
   Minifica app.js → app.min.js  y  style.css → style.min.css
   Uso: node build.js
   ═══════════════════════════════════════════════════════════ */

const fs   = require('fs');
const path = require('path');

async function build(){
  console.log('\n🔧  AYALYM build — minificando assets...\n');

  /* ── JavaScript ── */
  try {
    const { minify } = require('terser');
    const jsSrc  = fs.readFileSync('./js/app.js', 'utf8');
    const jsOut  = await minify(jsSrc, {
      compress : {
        drop_debugger  : true,
        passes         : 3,
        dead_code      : true,
        collapse_vars  : true,
        reduce_vars    : true,
        pure_getters   : true,
        unsafe_math    : false
      },
      mangle   : { toplevel: false },
      format   : { comments: false, indent_level: 0 }
    });
    fs.writeFileSync('./js/app.min.js', jsOut.code, 'utf8');
    const orig = Math.round(fs.statSync('./js/app.js').size  / 1024);
    const mini = Math.round(jsOut.code.length / 1024);
    console.log(`✅  app.js     ${orig} KB  →  app.min.js  ${mini} KB  (${Math.round((1-mini/orig)*100)}% reducción)`);
  } catch(e) {
    console.error('❌  Error minificando JS:', e.message);
    process.exit(1);
  }

  /* ── CSS ── */
  try {
    const CleanCSS = require('clean-css');
    const cssSrc   = fs.readFileSync('./css/style.css', 'utf8');
    const cssOut   = new CleanCSS({ level: 2 }).minify(cssSrc);
    if(cssOut.errors && cssOut.errors.length){
      console.warn('⚠️   Advertencias CSS:', cssOut.errors);
    }
    fs.writeFileSync('./css/style.min.css', cssOut.styles, 'utf8');
    const orig = Math.round(fs.statSync('./css/style.css').size / 1024);
    const mini = Math.round(cssOut.styles.length / 1024);
    console.log(`✅  style.css  ${orig} KB  →  style.min.css  ${mini} KB  (${Math.round((1-mini/orig)*100)}% reducción)`);
  } catch(e) {
    console.error('❌  Error minificando CSS:', e.message);
    process.exit(1);
  }

  console.log('\n🎉  Build completo — listo para desplegar con firebase deploy\n');
}

build().catch(e => { console.error(e); process.exit(1); });
