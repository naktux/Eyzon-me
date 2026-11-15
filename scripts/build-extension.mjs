import path from "node:path";
import { readFile, writeFile, mkdir, cp } from "node:fs/promises";
import { build as viteBuild } from "vite";
import tailwindcss from "@tailwindcss/vite";
import { build } from "esbuild";
import {VOICE_LINES} from '../lib/voice-lines.mjs';
import "./assets.mjs";
const root = process.cwd();
const output = path.resolve(root, "extension-dist");
if (!output.startsWith(root + path.sep) || path.basename(output) !== "extension-dist") throw Error("Invalid extension output path");
const voiceManifest=JSON.parse(await readFile('public/voice/manifest.json','utf8').catch(()=>{throw Error('Generate Eyzon’s Gradium clips first: npm run voice:generate');}));
for(const [id,line] of Object.entries(VOICE_LINES)){
 if(voiceManifest.provider!=='Gradium'||voiceManifest.clips?.[id]?.text!==line.text)throw Error(`Missing/stale Gradium clip ${id}; run npm run voice:generate.`);
 const clip=await readFile(`public/voice/${id}.wav`);
 if(clip.toString('ascii',0,4)!=='RIFF'||clip.toString('ascii',8,12)!=='WAVE')throw Error(`Invalid voice clip ${id}`);
}
await viteBuild({ configFile: false, root, base: "./", publicDir: false, plugins: [tailwindcss()], build: { outDir: output, emptyOutDir: true, rollupOptions: { input: path.join(root, "dashboard.html") } } });
await build({ entryPoints: ["extension/background.ts"], bundle: true, format: "iife", outfile: path.join(output, "background.js"), minify: true });
await build({ entryPoints: ["extension/content.tsx"], bundle: true, format: "iife", jsx: "automatic", outfile: path.join(output, "content.js"), minify: true,
 plugins: [{ name: "inline-pet-css", setup(b) {
  b.onResolve({ filter: /\?inline$/ }, args => ({ path: path.resolve(args.resolveDir, args.path.slice(0, -7)) }));
  b.onLoad({ filter: /pet\.css$/ }, async args => ({ contents: await readFile(args.path, "utf8"), loader: "text" }));
 } }]
});
const packageInfo=JSON.parse(await readFile("package.json","utf8"));
const manifest = {
 manifest_version: 3, name: "Eyzon-me", version: packageInfo.version, minimum_chrome_version: "116",
 description: "Keep your eyes on the task with Eyzon, your local webcam focus companion. No uploads, recordings or AI service required.",
 permissions: ["storage"], action: { default_title: "Open Eyzon-me" }, background: { service_worker: "background.js" },
 content_scripts: [{ matches: ["http://*/*", "https://*/*"], js: ["content.js"], run_at: "document_idle", all_frames: false }],
 content_security_policy: { extension_pages: "script-src 'self' 'wasm-unsafe-eval'; object-src 'self'; worker-src 'self'; font-src 'self'; connect-src 'self'; media-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data:" }
};
await mkdir(output, {recursive:true});
await cp("public/tracking", path.join(output, "tracking"), {recursive:true});
await mkdir(path.join(output,'voice'),{recursive:true});
for(const id of Object.keys(VOICE_LINES))await cp(`public/voice/${id}.wav`,path.join(output,'voice',`${id}.wav`));
await writeFile(path.join(output,'voice','manifest.json'),JSON.stringify(voiceManifest,null,2));
await cp("public/THIRD_PARTY_NOTICES.txt", path.join(output,"THIRD_PARTY_NOTICES.txt"));
await cp("node_modules/@fontsource/pixelify-sans/LICENSE",path.join(output,"Pixelify-Sans-LICENSE.txt"));
const matrixLicenses=await Promise.all(['ml-matrix','ml-array-rescale','ml-array-min','ml-array-max','is-any-array'].map(async name=>name+'\n\n'+await readFile(`node_modules/${name}/LICENSE`,'utf8')));
await writeFile(path.join(output,'Matrix-LICENSES.txt'),matrixLicenses.join('\n\n--------------------\n\n'));
await writeFile(path.join(output, "manifest.json"), JSON.stringify(manifest, null, 2));
console.log("Load unpacked extension: " + output);
