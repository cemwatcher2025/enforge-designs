import * as THREE from "./node_modules/three/build/three.module.js";

(() => {
  "use strict";

  const canvas = document.querySelector("#game");
  let renderer;
  try {
    renderer=new THREE.WebGLRenderer({canvas,antialias:true,powerPreference:"high-performance"});
  } catch (_) {
    document.querySelector(".panel p").textContent = "This expedition needs WebGL enabled in your browser.";
    return;
  }

  renderer.outputColorSpace=THREE.SRGBColorSpace;
  renderer.toneMapping=THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure=1.1;
  renderer.shadowMap.enabled=true;
  renderer.shadowMap.type=THREE.PCFSoftShadowMap;
  canvas.dataset.renderer="three-pbr";
  const scene=new THREE.Scene();
  const camera=new THREE.PerspectiveCamera(68,1,.1,360);camera.rotation.order="YXZ";
  const hemisphere=new THREE.HemisphereLight(0xcbe8ff,0x172018,1.25);scene.add(hemisphere);
  const sunLight=new THREE.DirectionalLight(0xffefd0,3.1);sunLight.position.set(-35,70,25);sunLight.castShadow=true;
  sunLight.shadow.mapSize.set(2048,2048);sunLight.shadow.camera.left=-95;sunLight.shadow.camera.right=95;sunLight.shadow.camera.top=95;sunLight.shadow.camera.bottom=-95;sunLight.shadow.camera.far=240;scene.add(sunLight);
  const lanternLight=new THREE.PointLight(0xbfffdc,0,48,1.7);lanternLight.castShadow=true;lanternLight.shadow.mapSize.set(512,512);scene.add(lanternLight);
  const lanternBeam=new THREE.SpotLight(0xd8ffe8,0,95,Math.PI/5,.62,1.15);lanternBeam.castShadow=true;lanternBeam.shadow.mapSize.set(1024,1024);scene.add(lanternBeam,lanternBeam.target);
  const worldGroup=new THREE.Group(),dynamicGroup=new THREE.Group();scene.add(worldGroup,dynamicGroup);

  function noiseTexture(size=128){
    const c=document.createElement("canvas");c.width=c.height=size;const ctx=c.getContext("2d"),img=ctx.createImageData(size,size);
    for(let y=0;y<size;y++)for(let x=0;x<size;x++){const i=(y*size+x)*4,n=158+(Math.random()-.5)*38+(Math.random()-.5)*18;img.data[i]=img.data[i+1]=img.data[i+2]=Math.max(95,Math.min(205,n));img.data[i+3]=255;}
    ctx.putImageData(img,0,0);const texture=new THREE.CanvasTexture(c);texture.wrapS=texture.wrapT=THREE.RepeatWrapping;texture.repeat.set(1.5,1.5);texture.colorSpace=THREE.SRGBColorSpace;texture.anisotropy=renderer.capabilities.getMaxAnisotropy();return texture;
  }
  function normalTexture(size=128){
    const c=document.createElement("canvas");c.width=c.height=size;const ctx=c.getContext("2d"),img=ctx.createImageData(size,size);
    for(let y=0;y<size;y++)for(let x=0;x<size;x++){const i=(y*size+x)*4;img.data[i]=128+(Math.random()-.5)*34;img.data[i+1]=128+(Math.random()-.5)*34;img.data[i+2]=238;img.data[i+3]=255;}
    ctx.putImageData(img,0,0);const texture=new THREE.CanvasTexture(c);texture.wrapS=texture.wrapT=THREE.RepeatWrapping;texture.repeat.set(1.8,1.8);texture.colorSpace=THREE.NoColorSpace;texture.anisotropy=renderer.capabilities.getMaxAnisotropy();return texture;
  }
  const terrainMap=noiseTexture(),terrainNormal=normalTexture(),waterNormal=normalTexture();
  const terrainMaterials=Array.from({length:5},(_,i)=>new THREE.MeshStandardMaterial({vertexColors:true,map:terrainMap,normalMap:terrainNormal,normalScale:new THREE.Vector2(.13,.13),roughness:[.92,.84,.72,.88,.68][i],metalness:i===3?.10:.02,side:THREE.DoubleSide}));
  const propMaterials=Array.from({length:5},(_,i)=>new THREE.MeshStandardMaterial({vertexColors:true,roughness:[.82,.75,.58,.74,.55][i],metalness:i===3?.16:.035,side:THREE.DoubleSide,flatShading:false}));
  const wildlifeMaterial=new THREE.MeshStandardMaterial({vertexColors:true,roughness:.88,metalness:.02});
  const grassGeometry=new THREE.PlaneGeometry(.32,1.35,1,2);grassGeometry.translate(0,.675,0);
  const rockGeometry=new THREE.DodecahedronGeometry(.72,1);
  const trunkGeometry=new THREE.CylinderGeometry(.18,.28,2.8,7);trunkGeometry.translate(0,1.4,0);
  const canopyGeometry=new THREE.IcosahedronGeometry(1.45,1);canopyGeometry.translate(0,3.4,0);
  const crystalGeometry=new THREE.OctahedronGeometry(1,1);crystalGeometry.scale(.55,2.1,.55);crystalGeometry.translate(0,1.7,0);
  const mushroomStemGeometry=new THREE.CylinderGeometry(.12,.2,1.4,8);mushroomStemGeometry.translate(0,.7,0);
  const mushroomCapGeometry=new THREE.SphereGeometry(.7,12,6,0,Math.PI*2,0,Math.PI/2);mushroomCapGeometry.translate(0,1.35,0);
  const detailMaterials=[
    new THREE.MeshStandardMaterial({color:0x3f842e,roughness:.94,side:THREE.DoubleSide}),
    new THREE.MeshStandardMaterial({color:0x9b632a,roughness:.9}),
    new THREE.MeshStandardMaterial({color:0x9cc4c8,roughness:.68,metalness:.05}),
    new THREE.MeshStandardMaterial({color:0x3d2821,roughness:.86}),
    new THREE.MeshStandardMaterial({color:0x1b6961,roughness:.62,emissive:0x073b37,emissiveIntensity:.35})
  ];
  const trunkMaterial=new THREE.MeshStandardMaterial({color:0x332014,roughness:.94});
  const canopyMaterial=new THREE.MeshStandardMaterial({color:0x26753b,roughness:.88});
  const mushroomGlowMaterial=new THREE.MeshStandardMaterial({color:0x35bfa5,roughness:.42,emissive:0x0b5f57,emissiveIntensity:1.15});
  const waterMaterials=[
    new THREE.MeshPhysicalMaterial({vertexColors:true,color:0x2d8f95,normalMap:waterNormal,normalScale:new THREE.Vector2(.45,.45),roughness:.16,transmission:.18,transparent:true,opacity:.76,clearcoat:1,clearcoatRoughness:.1,side:THREE.DoubleSide}),
    new THREE.MeshPhysicalMaterial({vertexColors:true,color:0xff6a16,normalMap:waterNormal,normalScale:new THREE.Vector2(.7,.7),roughness:.42,emissive:0xa72d05,emissiveIntensity:2.2,transparent:true,opacity:.92,side:THREE.DoubleSide}),
    new THREE.MeshPhysicalMaterial({vertexColors:true,color:0x9bdce7,normalMap:waterNormal,normalScale:new THREE.Vector2(.28,.28),roughness:.2,transmission:.34,transparent:true,opacity:.78,clearcoat:1,side:THREE.DoubleSide})
  ];
  function geometryFromInterleaved(array){
    const count=array.length/9,positions=new Float32Array(count*3),colors=new Float32Array(count*3),normals=new Float32Array(count*3),uvs=new Float32Array(count*2);
    for(let i=0;i<count;i++){const s=i*9,p=i*3,u=i*2;positions[p]=array[s];positions[p+1]=array[s+1];positions[p+2]=array[s+2];colors[p]=array[s+3];colors[p+1]=array[s+4];colors[p+2]=array[s+5];normals[p]=array[s+6];normals[p+1]=array[s+7];normals[p+2]=array[s+8];uvs[u]=array[s]*.035;uvs[u+1]=array[s+2]*.035;}
    const geometry=new THREE.BufferGeometry();geometry.setAttribute("position",new THREE.BufferAttribute(positions,3));geometry.setAttribute("color",new THREE.BufferAttribute(colors,3));geometry.setAttribute("normal",new THREE.BufferAttribute(normals,3));geometry.setAttribute("uv",new THREE.BufferAttribute(uvs,2));geometry.computeBoundingSphere();return geometry;
  }
  function disposeObject(object){if(!object)return;object.parent?.remove(object);object.traverse?.(child=>{if(!child.userData?.sharedGeometry)child.geometry?.dispose();if(child.userData?.ownedMaterial)child.material?.dispose();});}
  function addChunkDetails(group,cx,cz,realmIndex){
    const count=realmIndex===0?34:realmIndex===2?22:16,geometry=realmIndex===0?grassGeometry:realmIndex===2?crystalGeometry:rockGeometry;
    const instanced=new THREE.InstancedMesh(geometry,detailMaterials[realmIndex],count),matrix=new THREE.Matrix4(),quat=new THREE.Quaternion(),scale=new THREE.Vector3(),position=new THREE.Vector3();
    for(let i=0;i<count;i++){
      const x=cx*34+2+((Math.sin((cx*43+i*17)*12.9898)*43758.5453)%1+1)%1*30,z=cz*34+2+((Math.sin((cz*61-i*13)*78.233)*24634.6345)%1+1)%1*30;
      const r1=hash(cx*37+i*11,cz*29-i*7),r2=hash(cx*17-i*5,cz*53+i*13);
      position.set(x,terrainHeight(x,z)+.04,z);quat.setFromEuler(new THREE.Euler(realmIndex===0?0:(r1-.5)*.4,r2*Math.PI,realmIndex===0?0:(r2-.5)*.4));
      const s=realmIndex===0?.55+r1*.8:.45+r1*1.3;scale.set(s,realmIndex===0?s*(.8+r2*.7):s*.7,s);
      matrix.compose(position,quat,scale);instanced.setMatrixAt(i,matrix);
    }
    instanced.castShadow=realmIndex!==0;instanced.receiveShadow=true;instanced.userData.sharedGeometry=true;group.add(instanced);
    const modelCount=realmIndex===0?5:realmIndex===4?7:6;
    const primaryGeometry=realmIndex===0?trunkGeometry:realmIndex===4?mushroomStemGeometry:realmIndex===2?crystalGeometry:rockGeometry;
    const secondaryGeometry=realmIndex===0?canopyGeometry:realmIndex===4?mushroomCapGeometry:null;
    const primaryMaterial=realmIndex===0?trunkMaterial:realmIndex===4?mushroomGlowMaterial:detailMaterials[realmIndex];
    const primary=new THREE.InstancedMesh(primaryGeometry,primaryMaterial,modelCount),secondary=secondaryGeometry?new THREE.InstancedMesh(secondaryGeometry,realmIndex===0?canopyMaterial:mushroomGlowMaterial,modelCount):null;
    for(let i=0;i<modelCount;i++){
      const r1=hash(cx*83+i*19,cz*71-i*23),r2=hash(cx*47-i*11,cz*89+i*7),x=cx*34+4+r1*26,z=cz*34+4+r2*26,y=terrainHeight(x,z),s=.7+hash(cx*13+i,cz*17-i)*1.15;
      position.set(x,y,z);quat.setFromEuler(new THREE.Euler(0,r2*Math.PI*2,0));scale.set(s,s*(.82+r1*.45),s);matrix.compose(position,quat,scale);primary.setMatrixAt(i,matrix);secondary?.setMatrixAt(i,matrix);
    }
    primary.castShadow=true;primary.receiveShadow=true;primary.userData.sharedGeometry=true;group.add(primary);
    if(secondary){secondary.castShadow=true;secondary.receiveShadow=true;secondary.userData.sharedGeometry=true;group.add(secondary);}
  }

  const realms = [
    { name:"VERDANT REACH", x:0, z:0, fog:[.43,.63,.62], sky:[.20,.39,.43], base:[.13,.34,.16], accent:[.33,.52,.18], rough:9, freq:.020, water:1.5 },
    { name:"SUNGOLD DUNES", x:1250, z:0, fog:[.76,.56,.32], sky:[.46,.34,.24], base:[.52,.29,.10], accent:[.78,.54,.23], rough:17, freq:.013, water:-99 },
    { name:"GLASS TUNDRA", x:0, z:1250, fog:[.20,.30,.40], sky:[.045,.085,.15], base:[.43,.55,.58], accent:[.78,.84,.82], rough:12, freq:.018, water:-99 },
    { name:"EMBER CALDERA", x:-1250, z:0, fog:[.30,.10,.075], sky:[.14,.045,.035], base:[.16,.11,.09], accent:[.72,.16,.045], rough:25, freq:.016, water:-99 },
    { name:"THE HOLLOW BELOW", x:0, z:-1250, fog:[.035,.075,.085], sky:[.008,.018,.025], base:[.055,.10,.11], accent:[.10,.44,.42], rough:14, freq:.024, water:-99, cave:true }
  ];
  const discoveries = new Set();
  const locations = [
    {realm:0,x:48,z:-72,name:"THE FOSSIL CROWN",kind:"PAST LIFE",story:"A spiral skeleton of something that once flew without wings.",shape:"bones"},
    {realm:0,x:-88,z:-38,name:"MYCELIAL CHOIR",kind:"LIVING ANOMALY",story:"The luminous caps pulse in a rhythm too deliberate to be wind.",shape:"choir"},
    {realm:0,x:72,z:82,name:"SURVEYOR'S CACHE",kind:"TREASURE",story:"Old-world coin and a map fragment marked with five impossible seas.",shape:"cache"},
    {realm:1,x:1312,z:-54,name:"BURIED ORRERY",kind:"LOST KNOWLEDGE",story:"Stone planets still turn around a sun that no longer exists.",shape:"orrery"},
    {realm:1,x:1172,z:44,name:"GLASS LEVIATHAN",kind:"PAST LIFE",story:"Ribs fused to desert glass by a heat older than the dunes.",shape:"bones"},
    {realm:1,x:1275,z:96,name:"THE GILDED WELL",kind:"TREASURE",story:"Coins ring beneath the sand, minted for a nameless monarch.",shape:"well"},
    {realm:2,x:56,z:1185,name:"STARFALL MONOLITH",kind:"CELESTIAL",story:"It is warmer than the air and quietly repeats your heartbeat.",shape:"monolith"},
    {realm:2,x:-82,z:1290,name:"AURORA ARCHIVE",kind:"LOST KNOWLEDGE",story:"Frozen prisms preserve voices as bands of colored light.",shape:"archive"},
    {realm:2,x:76,z:1338,name:"THE SLEEPING HERD",kind:"PAST LIFE",story:"A family of immense creatures rests beneath translucent ice.",shape:"bones"},
    {realm:3,x:-1182,z:-52,name:"FORGE OF THE FIRST FIRE",kind:"RUIN",story:"Its anvil holds a flame that casts no shadow.",shape:"forge"},
    {realm:3,x:-1328,z:38,name:"THE PETRIFIED TITAN",kind:"PAST LIFE",story:"A colossal hand reaches through the basalt, still gripping a bell.",shape:"titan"},
    {realm:3,x:-1230,z:102,name:"EMBERHEART VAULT",kind:"TREASURE",story:"Heat-proof tablets describe how to bottle a dying star.",shape:"vault"},
    {realm:4,x:58,z:-1318,name:"THE MEMORY WELL",kind:"LOST KNOWLEDGE",story:"Its surface reflects places you have never visited.",shape:"well"},
    {realm:4,x:-76,z:-1194,name:"LANTERN NURSERY",kind:"LIVING ANOMALY",story:"Translucent eggs answer your footsteps with waves of blue light.",shape:"nursery"},
    {realm:4,x:92,z:-1190,name:"LIBRARY OF ROOTS",kind:"RUIN",story:"Stone leaves contain a botanical history of extinct suns.",shape:"archive"}
  ];
  const adventureSites = [
    {realm:0,x:-18,z:38,name:"WHISPERWATER BRIDGE",type:"bridge",activity:"Listen to the river stones",reward:12,lore:"The stones repeat the footsteps of everyone who crossed before you."},
    {realm:0,x:-42,z:94,name:"MOONGLASS LAKE",type:"lakeTemple",activity:"Wake the lake lanterns",reward:18,lore:"Five lights rise from the water and arrange themselves into a forgotten constellation."},
    {realm:0,x:12,z:-142,name:"HIGHGREEN OBSERVATORY",type:"observatory",activity:"Survey the five horizons",reward:22,lore:"From this height, paths between all five worlds briefly become visible."},
    {realm:1,x:1212,z:-88,name:"CANYON OF BELLS",type:"canyonGate",activity:"Sound the wind bells",reward:14,lore:"The canyon answers with a chord from a civilization buried below the sand."},
    {realm:1,x:1360,z:48,name:"THE SUNKEN QUARTER",type:"desertCity",activity:"Restore the market beacon",reward:20,lore:"The empty city projects the shadows of its former citizens at noon."},
    {realm:1,x:1240,z:142,name:"SKYSAIL STATION",type:"tower",activity:"Launch the ancient windsail",reward:24,lore:"A golden sail climbs into the upper air, carrying your expedition mark."},
    {realm:2,x:-42,z:1208,name:"MIRRORICE LAKE",type:"iceLake",activity:"Trace the song beneath the ice",reward:16,lore:"Something enormous turns below, careful not to break the surface."},
    {realm:2,x:18,z:1378,name:"AURORA ASCENT",type:"mountainGate",activity:"Align the aurora prisms",reward:24,lore:"The sky folds into a doorway for exactly seven heartbeats."},
    {realm:2,x:112,z:1260,name:"THE LAST WAYSTATION",type:"lodge",activity:"Relight the expedition hearth",reward:14,lore:"Names appear in the smoke—explorers who never returned, and one who has not left yet."},
    {realm:3,x:-1288,z:-86,name:"LAVAWEIR CROSSING",type:"lavaBridge",activity:"Redirect the molten channel",reward:18,lore:"The diverted flow reveals metal flowers blooming in impossible heat."},
    {realm:3,x:-1360,z:-5,name:"ASHEN AMPHITHEATER",type:"amphitheater",activity:"Complete the echo ritual",reward:22,lore:"Your voice returns spoken by a thousand unseen witnesses."},
    {realm:3,x:-1198,z:52,name:"CINDERKEEP",type:"fortress",activity:"Raise the basalt standard",reward:26,lore:"The caldera dims in recognition, as though accepting a new keeper."},
    {realm:4,x:-24,z:-1282,name:"GLOWWORM CATHEDRAL",type:"cathedral",activity:"Conduct the living lights",reward:20,lore:"The colony paints a moving map of tunnels that do not exist yet."},
    {realm:4,x:34,z:-1162,name:"THE DEEP RAIL",type:"rail",activity:"Start the stone engine",reward:24,lore:"The engine travels three meters, then returns carrying dust from another age."},
    {realm:4,x:-112,z:-1270,name:"ECHOSEA SHORE",type:"undergroundLake",activity:"Cast a memory into the water",reward:28,lore:"The black lake returns a memory that belongs to the world itself."}
  ];
  const portals = [
    {realm:0,x:5,z:-158,name:"ROOT CAVE",toRealm:4,toX:-95,toZ:-1278},
    {realm:1,x:1188,z:-112,name:"SAND TUNNEL",toRealm:4,toX:18,toZ:-1342},
    {realm:2,x:20,z:1392,name:"ICE CREVASSE",toRealm:4,toX:106,toZ:-1262},
    {realm:3,x:-1372,z:-16,name:"MAGMA VENT",toRealm:4,toX:-10,toZ:-1148},
    {realm:4,x:-95,z:-1278,name:"ROOT CAVE EXIT",toRealm:0,toX:5,toZ:-150},
    {realm:4,x:18,z:-1342,name:"SAND TUNNEL EXIT",toRealm:1,toX:1194,toZ:-108},
    {realm:4,x:106,z:-1262,name:"ICE CREVASSE EXIT",toRealm:2,toX:20,toZ:1386},
    {realm:4,x:-10,z:-1148,name:"MAGMA VENT EXIT",toRealm:3,toX:-1365,toZ:-16}
  ];
  // Volumetric cave networks. Chunks intersecting these bounds are meshed
  // from a signed-distance field instead of the height-surface fast path.
  // Control points are evaluated against terrain at runtime so entrances
  // remain open even as mountain generation evolves.
  const caveNetworks = [
    {realm:0,name:"THE ROOTWAYS",color:[.07,.24,.16],radius:5.2,points:[
      [-55,-141,"surface"],[-55,-154,"entry"],[-61,-169,7],[-70,-184,1],[-82,-196,-4],[-96,-201,-7]
    ],branches:[[[-70,-184,1],[-55,-190,-1],[-45,-204,-7]],[[-82,-196,-4],[-80,-214,-10],[-67,-225,-13],[-55,-238,"surface"]]],chambers:[[-96,-201,-7,10],[-70,-184,1,7],[-45,-204,-7,8],[-67,-225,-13,9]]},
    {realm:1,name:"THE SINGING CATACOMBS",color:[.34,.20,.08],radius:5.6,points:[
      [1188,-94,"surface"],[1188,-108,"entry"],[1200,-120,0],[1217,-130,-5],[1234,-125,-8]
    ],branches:[[[1200,-120,0],[1187,-132,-4],[1175,-148,-10]],[[1217,-130,-5],[1220,-150,-11],[1232,-163,-14],[1246,-177,"surface"]]],chambers:[[1234,-125,-8,11],[1202,-120,0,7],[1175,-148,-10,8],[1232,-163,-14,9]]},
    {realm:2,name:"THE BLUE CREVASSE",color:[.28,.52,.60],radius:5.0,points:[
      [20,1375,"surface"],[20,1388,"entry"],[10,1402,7],[-4,1413,1],[-18,1410,-5]
    ],branches:[[[10,1402,7],[25,1414,1],[36,1429,-6]],[[-4,1413,1],[-3,1431,-7],[-16,1444,-12],[-28,1458,"surface"]]],chambers:[[-18,1410,-5,10],[8,1402,6,6],[36,1429,-6,8],[-16,1444,-12,9]]},
    {realm:3,name:"THE MAGMA VEINS",color:[.24,.07,.035],radius:5.4,points:[
      [-1372,-2,"surface"],[-1372,-16,"entry"],[-1360,-31,2],[-1342,-40,-4],[-1324,-36,-8]
    ],branches:[[[-1360,-31,2],[-1374,-43,-4],[-1385,-58,-11]],[[-1342,-40,-4],[-1338,-58,-10],[-1324,-70,-14],[-1308,-82,"surface"]]],chambers:[[-1324,-36,-8,10],[-1350,-36,-2,6],[-1385,-58,-11,8],[-1324,-70,-14,9]]},
    {realm:2,name:"THE CROWNWALL WINDTUNNELS",color:[.30,.48,.56],radius:6.0,optional:true,hazardA:"frost",hazardB:"collapse",points:[
      [646,1768,"surface"],[646,1784,"entry"],[628,1804,24],[604,1828,18],[578,1860,12]
    ],branches:[[[628,1804,24],[664,1818,16],[706,1846,10],[732,1864,"surface"]],[[604,1828,18],[560,1832,13],[522,1818,9],[500,1796,"surface"]]],chambers:[[578,1860,12,12],[628,1804,24,7],[706,1846,10,9],[522,1818,9,8]]}
  ];
  const coreCaveNetworks = caveNetworks.filter(n=>!n.optional);
  const caveDiscoveries = coreCaveNetworks.flatMap((n,i)=>[
    {realm:n.realm,x:n.chambers[2][0],z:n.chambers[2][1],y:n.chambers[2][2],name:["THE PALE GARDEN","THE BELLMAKER'S GRAVE","THE FROZEN WITNESS","THE FIRST SPARK"][i],kind:"DEEP DISCOVERY",story:["A forest of root-white flowers grows without soil, each blossom holding a borrowed memory.","Hundreds of stone chimes surround a craftsman who appears to have become the final bell.","A translucent creature remains awake inside ancient ice and follows you with one silver eye.","A small flame burns beneath the basalt and recoils whenever the lantern approaches."][i]},
    {realm:n.realm,x:n.chambers[3][0],z:n.chambers[3][1],y:n.chambers[3][2],name:["THE ROOT CROWN","THE DUST VAULT","THE SKY BELOW","THE CALDERA ENGINE"][i],kind:"EXPEDITION TREASURE",story:["A living crown grants the bearer an instinctive sense of every path already walked.","A sealed archive contains maps made by people who charted the desert from beneath it.","An inverted pool reflects stars that have never risen over this world.","A buried machine is still turning heat into a language no living throat can speak."][i]}
  ]);
  const caveHazards = caveNetworks.flatMap((n,i)=>[
    {realm:n.realm,x:n.chambers[1][0],z:n.chambers[1][1],radius:7,type:n.hazardA||(i===3?"lava":i===2?"frost":"gas")},
    {realm:n.realm,x:n.chambers[3][0],z:n.chambers[3][1],radius:6,type:n.hazardB||(i===0?"flood":i===1?"collapse":i===2?"frost":"lava")}
  ]);
  const caveObjectives=coreCaveNetworks.map((n,i)=>({realm:n.realm,x:n.chambers[3][0],z:n.chambers[3][1],name:["HEARTSEED","RESONANT KEY","AURORA CORE","EMBER SIGIL"][i]}));
  const interiorRooms = [
    {realm:0,x:420,z:20,name:"OBSERVATORY INTERIOR",entryX:12,entryZ:-142,returnX:14,returnZ:-136,color:[.12,.28,.22]},
    {realm:1,x:1680,z:20,name:"BURIED CITY VAULT",entryX:1360,entryZ:48,returnX:1352,returnZ:48,color:[.34,.20,.08]},
    {realm:2,x:420,z:1520,name:"WAYSTATION INTERIOR",entryX:112,entryZ:1260,returnX:106,returnZ:1260,color:[.25,.42,.48]},
    {realm:3,x:-1680,z:20,name:"CINDERKEEP INTERIOR",entryX:-1198,entryZ:52,returnX:-1206,returnZ:52,color:[.22,.07,.035]},
    {realm:4,x:420,z:-1520,name:"ROOT LIBRARY INTERIOR",entryX:92,entryZ:-1190,returnX:84,returnZ:-1190,color:[.04,.28,.23]}
  ];
  const puzzleBank = {
    bridge:["Which sound belongs to the oldest crossing?",["The deepest stone","The fastest water","The nearest bird"],0],
    lakeTemple:["The lanterns mirror a pattern above. What completes it?",["A broken circle","Five wandering lights","A single fixed star"],1],
    observatory:["What connects all five horizons?",["The weather","The Worldstream","The explorer"],1],
    canyonGate:["Which note opens a path through stone?",["The note the canyon returns","The loudest bell","Silence alone"],0],
    desertCity:["Where should the market beacon face?",["The buried palace","The morning sun","The empty road"],2],
    tower:["What carries farther than a traveler?",["A sail marked with memory","A shouted name","Desert dust"],0],
    iceLake:["What moves beneath unbroken ice?",["A sleeping mountain","A careful living giant","The aurora's shadow"],1],
    mountainGate:["How many heartbeats does the sky-door remain?",["Five","Seven","Thirteen"],1],
    lodge:["Whose name appears last in the smoke?",["The first explorer","Your own","No one's"],1],
    lavaBridge:["Where must the molten river be sent?",["Toward the metal flowers","Into the fortress","Back underground"],0],
    amphitheater:["Whose voice completes the chorus?",["The caldera's","The unseen witnesses'","Yours"],2],
    fortress:["What does the caldera recognize?",["A conqueror","A new keeper","A sacrifice"],1],
    cathedral:["What are the living lights drawing?",["A warning","A map of future tunnels","A constellation"],1],
    rail:["Where did the returning engine travel?",["Another age","The surface","Nowhere"],0],
    undergroundLake:["What should be offered to the black water?",["Gold","A memory","A name"],1]
  };
  const worldheart={realm:4,x:0,z:-1400,name:"THE WORLDHEART",targetKind:"FINAL MEMORY"};
  const postgameEchoes = [
    {realm:0,x:106,z:-116,name:"ECHO OF GROWTH",story:"The Verdant Reach remembers every footprint as a seed."},
    {realm:1,x:1338,z:112,name:"ECHO OF DISTANCE",story:"The dunes reveal that no horizon was ever empty."},
    {realm:2,x:-108,z:1360,name:"ECHO OF SILENCE",story:"The ice preserved the sound of your first arrival."},
    {realm:3,x:-1368,z:92,name:"ECHO OF FIRE",story:"The caldera learned warmth from the light you carried below."},
    {realm:4,x:118,z:-1378,name:"ECHO OF RETURNING",story:"The Hollow offers a path that exists only because you came back."}
  ];
  const frontierSites = [
    {realm:0,x:386,z:-278,name:"THE WALKING GROVE",kind:"FRONTIER ECOLOGY",story:"A forest migrates several meters each night, leaving rings of fresh mushrooms where it slept.",form:"grove"},
    {realm:0,x:-472,z:344,name:"SKYROOT BASIN",kind:"DISTANT GEOLOGY",story:"Roots descend from clouds into a basin whose stones have never seen rain.",form:"basin"},
    {realm:1,x:1718,z:286,name:"THE HORIZON ENGINE",kind:"LOST MECHANISM",story:"A brass machine slowly pulls the visible horizon closer, one grain of sand at a time.",form:"engine"},
    {realm:1,x:828,z:-438,name:"NOMAD'S LAST SHADOW",kind:"HUMAN TRACE",story:"A permanent shadow waits beside an empty camp, still facing the road home.",form:"camp"},
    {realm:2,x:418,z:1632,name:"THE WHITE THUNDERHEAD",kind:"WEATHER ANOMALY",story:"A grounded storm has frozen into branching towers that hum beneath a clear sky.",form:"storm"},
    {realm:2,x:-506,z:914,name:"MAMMOTH GLASSFIELD",kind:"PAST LIFE",story:"Thousands of warm footprints cross the glass, but no creature stands at either end.",form:"field"},
    {realm:3,x:-1738,z:318,name:"THE ASH CLOCK",kind:"VOLCANIC RUIN",story:"Each eruption advances its black hands by one minute. It has nearly reached midnight.",form:"clock"},
    {realm:3,x:-842,z:-472,name:"RED ORCHARD",kind:"EXTREME BIOLOGY",story:"Metallic trees bear fruit that rings like cooling iron when the wind touches it.",form:"orchard"},
    {realm:4,x:438,z:-1654,name:"THE UPSIDE-DOWN CITY",kind:"SUBTERRANEAN RUIN",story:"Its towers descend from the cavern roof and its windows glow toward the stone below.",form:"city"},
    {realm:4,x:-486,z:-942,name:"THE SLOW SEA",kind:"DEEP HYDROLOGY",story:"A suspended black tide advances through the cavern at the pace of growing crystal.",form:"sea"},
    {realm:2,x:548,z:1776,name:"CROWNWALL RANGE",kind:"ALPINE RANGE",story:"A white wall of peaks rises beyond the old trail, cut by goat paths, wind caves and blue waterfalls.",form:"range"},
    {realm:2,x:646,z:1768,name:"THUNDERFALL CIRQUE",kind:"GLACIAL WATERFALL",story:"Meltwater pours from a split glacier into a frozen bowl where silver animals gather at dusk.",form:"falls"},
    {realm:2,x:708,z:1846,name:"SKYGOAT PASS",kind:"WILDLIFE CORRIDOR",story:"A high pass marked by horn-scratched stones and warm nests tucked inside the snow.",form:"pass"}
  ];
  const FRONTIER_TOTAL=frontierSites.length, ECHO_TOTAL=postgameEchoes.length;
  const CROWNWALL_FRONTIERS=["CROWNWALL RANGE","THUNDERFALL CIRQUE","SKYGOAT PASS"];

  const state = { x:0, y:12, z:0, vx:0, vz:0, vy:0, yaw:0, pitch:-.12, realm:0, grounded:false, inCave:false, time:0, stamina:100, air:100, lore:0, coyote:0, bob:0, hazard:0 };
  const wrapDegrees=d=>((d%360)+360)%360;
  function headingDegrees(){return wrapDegrees(-state.yaw*180/Math.PI);}
  function compassName(deg){return ["N","NE","E","SE","S","SW","W","NW"][Math.round(wrapDegrees(deg)/45)%8];}
  function signedAngleDelta(a,b){return ((a-b+540)%360)-180;}
  function updateCompass(){
    const heading=headingDegrees(),ribbon=document.querySelector("#compass-ribbon"),headingEl=document.querySelector("#compass-heading");
    if(!ribbon||!headingEl)return;
    const markers=[0,30,45,60,90,120,135,150,180,210,225,240,270,300,315,330];
    ribbon.innerHTML=markers.map(deg=>{
      const rel=signedAngleDelta(deg,heading);
      if(Math.abs(rel)>95)return "";
      const left=50+rel/95*50,label=deg%90===0?compassName(deg):deg%45===0?compassName(deg):String(deg).padStart(3,"0");
      return `<span class="${deg%90===0?"major":""}" style="left:${left.toFixed(2)}%">${label}</span>`;
    }).join("");
    headingEl.textContent=`${String(Math.round(heading)).padStart(3,"0")}° ${compassName(heading)}`;
    canvas.dataset.heading=`${Math.round(heading)} ${compassName(heading)}`;
  }
  const keys = {};
  const completedActivities = new Set();
  const densityEdits=[];
  const chunks = new Map();
  let skyMesh=null,wildlifeMesh=null;
  const CHUNK = 34, RES = 14;
  let last = performance.now(), noticeTimer = 0, dragging = false, hasEntered = false;
  let activeInteractable=null, journalOpen=false, mapOpen=false, lastSafe={x:0,z:0,realm:0};
  let paused=false,puzzleOpen=false,scannerOn=false,lanternOn=false,picksOn=false,sensitivity=1,viewRange=5,motionEnabled=true,activeSlot=1,needsCrownwallMigration=false;
  let previewSpawn=null;
  let audioCtx=null,masterGain=null,ambientGain=null,musicNodes=[],gamepadButtons=[];
  let scannerPulse=0,footstepTimer=0,environmentTimer=2;
  let ritualSession=0,worldheartSeen=false;
  const surveyed=[],trailMarkers=[],recoveredCave=new Set(),recoveredObjectives=new Set(),recoveredEchoes=new Set(),recoveredFrontier=new Set(),knownActivities=new Set();

  try {
    activeSlot=+(localStorage.getItem("worldstream-active-slot")||1);
    const saved=JSON.parse(localStorage.getItem(`worldstream-save-${activeSlot}`)||localStorage.getItem("worldstream-save")||"{}");
    (saved.discoveries||[]).forEach(v=>discoveries.add(v));
    (saved.activities||[]).forEach(v=>completedActivities.add(v));
    (saved.knownActivities||[]).forEach(v=>knownActivities.add(v));
    (saved.caveDiscoveries||[]).forEach(v=>recoveredCave.add(v));
    (saved.caveObjectives||[]).forEach(v=>recoveredObjectives.add(v));
    (saved.echoes||[]).forEach(v=>recoveredEchoes.add(v));
    (saved.frontier||[]).forEach(v=>recoveredFrontier.add(v));
    if(saved.crownwallUpgrade!==true){CROWNWALL_FRONTIERS.forEach(v=>recoveredFrontier.delete(v));needsCrownwallMigration=true;}
    worldheartSeen=saved.worldheartSeen===true;
    (saved.markers||[]).forEach(v=>trailMarkers.push(v));
    state.lore=saved.lore||0;
    sensitivity=saved.settings?.sensitivity||1;viewRange=saved.settings?.viewRange||5;motionEnabled=saved.settings?.motion!==false;
  } catch (_) {}
  if(discoveries.size===15&&completedActivities.size===15&&recoveredCave.size===8&&recoveredObjectives.size===4)worldheartSeen=true;
  const saveProgress=()=>localStorage.setItem(`worldstream-save-${activeSlot}`,JSON.stringify({
    discoveries:[...discoveries],activities:[...completedActivities],knownActivities:[...knownActivities],caveDiscoveries:[...recoveredCave],caveObjectives:[...recoveredObjectives],echoes:[...recoveredEchoes],frontier:[...recoveredFrontier],worldheartSeen,markers:trailMarkers.slice(-24),lore:state.lore,
    crownwallUpgrade:true,settings:{sensitivity,viewRange,motion:motionEnabled}
  }));
  if(needsCrownwallMigration)saveProgress();
  const showNotice=(html,seconds=4)=>{
    const n=document.querySelector("#notice");n.innerHTML=html;n.classList.add("show");noticeTimer=seconds;
  };
  function initAudio() {
    if(audioCtx)return;
    audioCtx=new (window.AudioContext||window.webkitAudioContext)();
    masterGain=audioCtx.createGain();ambientGain=audioCtx.createGain();
    masterGain.gain.value=+document.querySelector("#setting-volume").value;
    ambientGain.gain.value=.22;ambientGain.connect(masterGain);masterGain.connect(audioCtx.destination);
    for(const detune of [-9,0,7]) {
      const osc=audioCtx.createOscillator(),gain=audioCtx.createGain(),filter=audioCtx.createBiquadFilter();
      osc.type=detune===0?"sine":"triangle";osc.frequency.value=55;osc.detune.value=detune;
      gain.gain.value=.025;filter.type="lowpass";filter.frequency.value=420;
      osc.connect(filter);filter.connect(gain);gain.connect(ambientGain);osc.start();
      musicNodes.push({osc,gain,filter});
    }
  }
  function tuneAudio() {
    if(!audioCtx)return;
    const roots=[65.4,55,49,43.65,36.7],root=roots[state.realm];
    musicNodes.forEach((n,i)=>{
      n.osc.frequency.setTargetAtTime(root*(i===2?1.5:1),audioCtx.currentTime,1.4);
      n.filter.frequency.setTargetAtTime((state.realm===4?260:520)+state.stamina*2,audioCtx.currentTime,.6);
    });
  }
  function sound(freq=440,duration=.35,type="sine",volume=.12,pan=0) {
    if(!audioCtx)return;
    const osc=audioCtx.createOscillator(),gain=audioCtx.createGain();
    const panner=audioCtx.createStereoPanner?audioCtx.createStereoPanner():null;
    osc.type=type;osc.frequency.value=freq;gain.gain.setValueAtTime(volume,audioCtx.currentTime);
    gain.gain.exponentialRampToValueAtTime(.0001,audioCtx.currentTime+duration);
    osc.connect(gain);if(panner){panner.pan.value=pan;gain.connect(panner);panner.connect(masterGain);}else gain.connect(masterGain);
    osc.start();osc.stop(audioCtx.currentTime+duration);
  }
  function discoveryChord() {[392,523.25,659.25].forEach((f,i)=>setTimeout(()=>sound(f,.9,"sine",.08),i*110));}

  const fract = n => n - Math.floor(n);
  const hash = (x,z) => fract(Math.sin(x*127.1 + z*311.7) * 43758.5453);
  const smooth = t => t*t*(3-2*t);
  function noise(x,z) {
    const ix=Math.floor(x), iz=Math.floor(z), fx=smooth(x-ix), fz=smooth(z-iz);
    const a=hash(ix,iz), b=hash(ix+1,iz), c=hash(ix,iz+1), d=hash(ix+1,iz+1);
    return (a+(b-a)*fx) + ((c+(d-c)*fx)-(a+(b-a)*fx))*fz;
  }
  function fbm(x,z) {
    let v=0, a=.55, f=1;
    for(let i=0;i<5;i++){ v += noise(x*f,z*f)*a; f*=2.03; a*=.47; }
    return v;
  }
  const radial=(x,z,cx,cz,r)=>Math.max(0,1-Math.hypot(x-cx,z-cz)/r);
  function crownwallRange(x,z){
    const spineZ=1785+Math.sin(x*.010)*48+Math.sin(x*.027)*18;
    const ridge=Math.max(0,1-Math.abs(z-spineZ)/245);
    const longitudinal=Math.max(0,1-Math.abs(x-570)/760);
    return ridge*longitudinal;
  }
  function crownwallFalls(){
    return [
      {x:646,z:1744,w:7,top:58,bottom:8,name:"THUNDERFALL"},
      {x:512,z:1786,w:5,top:44,bottom:12,name:"VEILRUN"}
    ];
  }
  function waterAt(x,z,realmIndex=state.realm) {
    if(realmIndex===0) {
      const riverX=-18+Math.sin(z*.045)*13;
      if(Math.abs(x-riverX)<4.2 && z>-55 && z<100)return {level:-1.2,color:[.055,.34,.42],kind:"river"};
      if(Math.hypot(x+42,z-94)<30)return {level:-1.05,color:[.07,.31,.42],kind:"lake"};
    }
    if(realmIndex===2 && Math.hypot(x+42,z-1208)<31)return {level:-1.4,color:[.32,.62,.70],kind:"ice"};
    if(realmIndex===2 && Math.hypot(x-646,z-1788)<34)return {level:7.6,color:[.30,.66,.78],kind:"alpine"};
    if(realmIndex===2 && Math.hypot(x-512,z-1806)<24)return {level:10.2,color:[.28,.62,.72],kind:"alpine"};
    if(realmIndex===3) {
      const lavaX=-1288+Math.sin(z*.055)*10;
      if(Math.abs(x-lavaX)<5.4 && z>-145 && z<105)return {level:-4.2,color:[1,.12,.015],kind:"lava"};
    }
    if(realmIndex===4 && Math.hypot(x+112,z+1270)<34)return {level:-8.2,color:[.025,.25,.28],kind:"deep"};
    return null;
  }
  function terrainHeight(x,z, realm=realms[state.realm]) {
    const realmIndex=realms.indexOf(realm);
    const nx=(x-realm.x)*realm.freq, nz=(z-realm.z)*realm.freq;
    let h=(fbm(nx,nz)-.54)*realm.rough;
    if(realmIndex===0) {
      h += radial(x,z,12,-150,75)*34 + radial(x,z,-54,-172,58)*18;
      const riverX=-18+Math.sin(z*.045)*13;
      if(z>-60&&z<102)h-=Math.max(0,1-Math.abs(x-riverX)/10)*5.5;
      h-=radial(x,z,-42,94,36)*8;
    }
    if(realmIndex===1) {
      h += Math.sin(nx*7 + Math.sin(nz*3))*4.5;
      const canyon=Math.max(0,1-Math.abs((x-1212)-Math.sin(z*.035)*16)/15);
      if(z>-145&&z<5)h-=canyon*15;
      h+=radial(x,z,1240,142,54)*13;
    }
    if(realmIndex===2) {
      h += Math.pow(Math.max(0, fbm(nx*.45,nz*.45)-.55), 2)*75;
      h-=radial(x,z,-42,1208,37)*8;
      h+=radial(x,z,18,1390,74)*33;
      const crown=crownwallRange(x,z), teeth=Math.pow(Math.max(0,fbm(x*.011+9.1,z*.018-4.7)-.36),1.35);
      h += crown*(24+teeth*105);
      h += radial(x,z,420,1728,170)*34 + radial(x,z,640,1768,135)*52 + radial(x,z,745,1840,125)*46 + radial(x,z,275,1818,150)*26;
      h -= radial(x,z,646,1788,44)*34 + radial(x,z,512,1806,32)*22 + radial(x,z,708,1846,60)*20;
      h -= Math.max(0,1-Math.abs((x-610)-Math.sin(z*.025)*42)/38)*Math.max(0,1-Math.abs(z-1815)/160)*22;
    }
    if(realmIndex===3) {
      h += Math.pow(Math.max(0, fbm(nx*.7,nz*.7)-.50), 2)*95 - 3;
      const lavaX=-1288+Math.sin(z*.055)*10;
      if(z>-150&&z<110)h-=Math.max(0,1-Math.abs(x-lavaX)/12)*10;
      h+=radial(x,z,-1198,52,48)*10;
    }
    if(realmIndex===4) {
      h = -8 + Math.abs(h)*.7 + Math.sin(nx*9)*1.5;
      h-=radial(x,z,-112,-1270,39)*5;
      h+=radial(x,z,-24,-1282,34)*4;
    }
    for(const room of interiorRooms) {
      if(room.realm===realmIndex&&Math.hypot(x-room.x,z-room.z)<28)h=-3;
    }
    return h;
  }
  function mix(a,b,t){ return a+(b-a)*t; }
  function colorAt(x,z,h,realm) {
    let t=Math.min(1,Math.max(0,(fbm(x*.035,z*.035)-.28)*1.5));
    if(state.realm===0 && h>6) t*=.45;
    if(state.realm===2) t=Math.min(1,t+h*.025);
    if(state.realm===3) t=Math.max(t, fract(Math.sin(x*.17+z*.11))*((h+8)/28));
    const c=[mix(realm.base[0],realm.accent[0],t),mix(realm.base[1],realm.accent[1],t),mix(realm.base[2],realm.accent[2],t)];
    const grain=.87+hash(Math.floor(x*2),Math.floor(z*2))*.19;
    return c.map(v=>v*grain);
  }
  function normalAt(x,z) {
    const e=.7, l=terrainHeight(x-e,z), r=terrainHeight(x+e,z), d=terrainHeight(x,z-e), u=terrainHeight(x,z+e);
    let nx=l-r, ny=e*2, nz=d-u, q=1/Math.hypot(nx,ny,nz);
    return [nx*q,ny*q,nz*q];
  }
  function resolvedCavePoints(network) {
    return network.points.map(([x,z,y],i)=>{
      if(y==="surface")return [x,terrainHeight(x,z)+1.2,z];
      if(y==="entry")return [x,terrainHeight(x,z)-1.1,z];
      return [x,y,z];
    });
  }
  function resolvedCavePaths(network) {
    const resolve=path=>path.map(([x,z,y])=>{
      if(y==="surface")return [x,terrainHeight(x,z)+1.2,z];
      if(y==="entry")return [x,terrainHeight(x,z)-1.1,z];
      return [x,y,z];
    });
    return [resolve(network.points),...(network.branches||[]).map(resolve)];
  }
  function pointSegmentDistance3(px,py,pz,a,b) {
    const abx=b[0]-a[0],aby=b[1]-a[1],abz=b[2]-a[2];
    const apx=px-a[0],apy=py-a[1],apz=pz-a[2];
    const den=abx*abx+aby*aby+abz*abz||1;
    const t=Math.max(0,Math.min(1,(apx*abx+apy*aby+apz*abz)/den));
    const dx=px-(a[0]+abx*t),dy=py-(a[1]+aby*t),dz=pz-(a[2]+abz*t);
    return {distance:Math.hypot(dx,dy,dz),t,center:[a[0]+abx*t,a[1]+aby*t,a[2]+abz*t]};
  }
  function caveDistance(x,y,z,network) {
    let best={distance:1e9,center:null};
    for(const pts of resolvedCavePaths(network))for(let i=0;i<pts.length-1;i++){const d=pointSegmentDistance3(x,y,z,pts[i],pts[i+1]);if(d.distance<best.distance)best=d;}
    for(const [cx,cz,cy,r] of network.chambers) {
      const d=Math.hypot(x-cx,y-cy,z-cz)-Math.max(0,r-network.radius);
      if(d<best.distance)best={distance:d,center:[cx,cy,cz]};
    }
    return best;
  }
  function nearCaveEntrance(x,z,radius=18,realmIndex=state.realm) {
    return caveNetworks.some(network=>network.realm===realmIndex&&Math.hypot(x-network.points[0][0],z-network.points[0][1])<radius);
  }
  function terrainDensity(x,y,z,realmIndex=state.realm) {
    let density=terrainHeight(x,z,realms[realmIndex])-y;
    for(const network of caveNetworks) {
      if(network.realm!==realmIndex)continue;
      const cave=caveDistance(x,y,z,network);
      // Positive density is rock; negative density is open air.
      density=Math.min(density,cave.distance-network.radius);
      // The first tunnel span is deliberately broader and taller than the
      // interior so its silhouette reads clearly from the approach path.
      const mouth=resolvedCavePoints(network);
      const mouthDistance=pointSegmentDistance3(x,y,z,mouth[0],mouth[1]).distance;
      density=Math.min(density,mouthDistance-network.radius*1.55);
    }
    for(const edit of densityEdits) {
      if(edit.realm!==realmIndex)continue;
      const sphere=Math.hypot(x-edit.x,y-edit.y,z-edit.z)-edit.radius;
      density=edit.mode==="add"?Math.max(density,-sphere):Math.min(density,sphere);
    }
    return density;
  }
  function densityNormal(x,y,z) {
    const e=.28;
    let nx=terrainDensity(x+e,y,z)-terrainDensity(x-e,y,z);
    let ny=terrainDensity(x,y+e,z)-terrainDensity(x,y-e,z);
    let nz=terrainDensity(x,y,z+e)-terrainDensity(x,y,z-e);
    const q=1/(Math.hypot(nx,ny,nz)||1);
    return [-nx*q,-ny*q,-nz*q];
  }
  function caveNetworkForChunk(cx,cz) {
    const minX=cx*CHUNK,maxX=minX+CHUNK,minZ=cz*CHUNK,maxZ=minZ+CHUNK;
    return caveNetworks.find(network=>{
      if(network.realm!==state.realm)return false;
      const pts=resolvedCavePaths(network).flat();
      return pts.some(p=>p[0]>minX-12&&p[0]<maxX+12&&p[2]>minZ-12&&p[2]<maxZ+12)
        ||network.chambers.some(c=>c[0]>minX-c[3]&&c[0]<maxX+c[3]&&c[1]>minZ-c[3]&&c[1]<maxZ+c[3]);
    });
  }
  function caveFloorAt(x,z) {
    let best=null;
    for(const network of caveNetworks) {
      if(network.realm!==state.realm)continue;
      for(const pts of resolvedCavePaths(network))for(let i=0;i<pts.length-1;i++) {
        const a=pts[i],b=pts[i+1],abx=b[0]-a[0],abz=b[2]-a[2],den=abx*abx+abz*abz||1;
        const t=Math.max(0,Math.min(1,((x-a[0])*abx+(z-a[2])*abz)/den));
        const cx=a[0]+abx*t,cz=a[2]+abz*t,cy=a[1]+(b[1]-a[1])*t,d=Math.hypot(x-cx,z-cz);
        if(d<network.radius*.88){const floor=cy-Math.sqrt(Math.max(0,network.radius*network.radius-d*d))+1.15;if(!best||floor<best.floor)best={floor,network,d};}
      }
      for(const [cx,cz,cy,r] of network.chambers){const d=Math.hypot(x-cx,z-cz);if(d<r*.86){const floor=cy-Math.sqrt(Math.max(0,r*r-d*d))+1.15;if(!best||floor<best.floor)best={floor,network,d};}}
    }
    return best;
  }

  function makeChunk(cx,cz) {
    const realm=realms[state.realm], data=[],waterData=[], step=CHUNK/RES;
    const volumeNetwork=caveNetworkForChunk(cx,cz);
    const vertex=(x,z) => {
      const y=terrainHeight(x,z), c=colorAt(x,z,y,realm), n=normalAt(x,z);
      data.push(x,y,z,...c,...n);
    };
    const raw=(x,y,z,c,n)=>data.push(x,y,z,...c,...n);
    const tri=(a,b,c,color,normal)=>{
      raw(...a,color,normal); raw(...b,color,normal); raw(...c,color,normal);
    };
    const waterRaw=(x,y,z,c,n)=>waterData.push(x,y,z,...c,...n);
    const waterTri=(a,b,c,color,normal)=>{waterRaw(...a,color,normal);waterRaw(...b,color,normal);waterRaw(...c,color,normal);};
    const pyramid=(x,z,y,w,h,color,leanX=0,leanZ=0)=>{
      const top=[x+leanX,y+h,z+leanZ], a=[x-w,y,z-w], b=[x+w,y,z-w], c=[x+w,y,z+w], d=[x-w,y,z+w];
      tri(a,b,top,color,[0,.32,-.95]); tri(b,c,top,color,[.95,.32,0]);
      tri(c,d,top,color,[0,.32,.95]); tri(d,a,top,color,[-.95,.32,0]);
      tri(a,d,c,color,[0,-1,0]); tri(a,c,b,color,[0,-1,0]);
    };
    const stalactite=(x,z,ceiling,w,h,color)=>{
      const tip=[x,ceiling-h,z],a=[x-w,ceiling,z-w],b=[x+w,ceiling,z-w],c=[x+w,ceiling,z+w],d=[x-w,ceiling,z+w];
      tri(a,tip,b,color,[0,-.4,-.8]);tri(b,tip,c,color,[.8,-.4,0]);tri(c,tip,d,color,[0,-.4,.8]);tri(d,tip,a,color,[-.8,-.4,0]);
    };
    const box=(x,z,y,w,h,color)=>{
      const a=[x-w,y,z-w],b=[x+w,y,z-w],c=[x+w,y,z+w],d=[x-w,y,z+w];
      const e=[x-w,y+h,z-w],f=[x+w,y+h,z-w],g=[x+w,y+h,z+w],q=[x-w,y+h,z+w];
      tri(a,b,f,color,[0,0,-1]);tri(a,f,e,color,[0,0,-1]);tri(b,c,g,color,[1,0,0]);tri(b,g,f,color,[1,0,0]);
      tri(c,d,q,color,[0,0,1]);tri(c,q,g,color,[0,0,1]);tri(d,a,e,color,[-1,0,0]);tri(d,e,q,color,[-1,0,0]);
      tri(e,f,g,color,[0,1,0]);tri(e,g,q,color,[0,1,0]);
    };
    const beam=(x,z,y,w,h,color)=>box(x,z,y,w,h,color);
    const landmark=(poi)=>{
      const x=poi.x,z=poi.z,y=terrainHeight(x,z), gold=[.95,.57,.10], cyan=[.08,.78,.72], ivory=[.74,.70,.58], violet=[.35,.28,.78];
      const stone=[.16,.18,.17], dark=[.045,.065,.065], ice=[.56,.78,.84], ember=[1,.18,.025], green=[.16,.68,.27];
      const orb=(ox,oz,oy,r,color)=>{pyramid(ox,oz,oy-r,r,r*2,color,0,0);pyramid(ox,oz,oy+r,r,r*2,color,0,0);};
      const ring=(ox,oz,oy,r,count,color,size=.32)=>{
        for(let i=0;i<count;i++){const a=i/count*Math.PI*2;orb(ox+Math.sin(a)*r,oz+Math.cos(a)*r,oy,size,color);}
      };
      const arch=(ox,oz,oy,w,h,color)=>{
        beam(ox-w,oz,oy,.55,h,color);beam(ox+w,oz,oy,.55,h,color);
        for(let i=0;i<7;i++){const a=Math.PI*i/6;orb(ox+Math.cos(a)*w,oz,oy+h+Math.sin(a)*w,.62,color);}
      };
      const animal=(ox,oz,oy,s,color)=>{
        box(ox,oz,oy+.7*s,2.2*s,1.35*s,color);
        pyramid(ox,oz-2.1*s,oy+1.1*s,1.15*s,2.1*s,color,0,-.8*s);
        for(const dx of [-1.4,1.4])for(const dz of [-.65,.65])beam(ox+dx*s,oz+dz*s,oy,.28*s,1.3*s,color);
        pyramid(ox-.8*s,oz-3.1*s,oy+2.2*s,.25*s,1.2*s,ivory,-.35*s,-.25*s);
        pyramid(ox+.8*s,oz-3.1*s,oy+2.2*s,.25*s,1.2*s,ivory,.35*s,-.25*s);
      };

      if(poi.name==="THE FOSSIL CROWN") {
        // A coiled airborne skeleton with a crowned skull and long wing bones.
        for(let i=0;i<19;i++){const a=i*.62,r=1.2+i*.34,hh=2.2+i*.23;orb(x+Math.cos(a)*r,z+Math.sin(a)*r,y+hh,.35,ivory);}
        for(let side of [-1,1])for(let i=0;i<8;i++){const span=(i+1)*1.15;beam(x+side*span,z-1+i*.35,y+4+i*.24,.18,1.1,ivory);}
        orb(x,z-4.5,y+5.3,1.5,ivory);
        for(let i=-2;i<=2;i++)pyramid(x+i*.62,z-4.7,y+6.4,.18,1.9,gold,i*.12,0);
      } else if(poi.name==="MYCELIAL CHOIR") {
        // A circular chorus of mushrooms facing a translucent conductor.
        for(let i=0;i<16;i++){const a=i/16*Math.PI*2,r=4.5+(i%3)*.7,h=1.2+(i%5)*.52,px=x+Math.sin(a)*r,pz=z+Math.cos(a)*r;beam(px,pz,y,.2,h,[.24,.14,.22]);box(px,pz,y+h,.85+h*.12,.24,i%2?green:violet);}
        beam(x,z,y,.7,5.5,[.08,.42,.25]);orb(x,z,y+6.1,1.5,cyan);ring(x,z,y+6.1,2.4,12,[.25,.95,.48],.18);
      } else if(poi.name==="SURVEYOR'S CACHE") {
        // Open expedition chest, coin spill, tripod instrument and map stones.
        box(x,z,y,3.8,1.1,[.25,.13,.04]);box(x,z+1.5,y+1.1,3.8,.38,gold);
        for(let i=0;i<18;i++)orb(x-3.5+(i%6)*1.05,z+2.6+Math.floor(i/6)*.62,y+.25,.24,gold);
        for(let i=0;i<3;i++)pyramid(x+5,z-1,y,.18,5,[.22,.19,.12],(i-1)*1.8,(i-1)*.4);
        orb(x+5,z-1,y+5.2,1.25,cyan);box(x-1,z-3.5,y,.9,.18,ivory);box(x+1.3,z-3.5,y,.9,.18,ivory);
      } else if(poi.name==="BURIED ORRERY") {
        // Multi-axis planetary machine emerging from the dune.
        beam(x,z,y,1.1,8,[.31,.20,.08]);orb(x,z,y+9,2.1,[1,.38,.04]);
        ring(x,z,y+8.8,4.2,18,gold,.22);ring(x,z,y+8.8,7.0,24,[.52,.34,.13],.22);
        for(let i=0;i<7;i++){const a=i/7*Math.PI*2,r=i%2?4.2:7;orb(x+Math.sin(a)*r,z+Math.cos(a)*r,y+8.8,.55+i*.06,i%2?cyan:ivory);}
        arch(x,z+1,y,8,4,[.28,.18,.07]);
      } else if(poi.name==="GLASS LEVIATHAN") {
        // A vast serpentine spine and glass ribs fused into the desert.
        for(let i=-9;i<=9;i++){const sx=x+i*1.25,sz=z+Math.sin(i*.55)*2.2,sy=y+2.5+Math.cos(i*.42)*1.4;orb(sx,sz,sy,.52,ivory);const rib=4.8-Math.abs(i)*.16;pyramid(sx,sz,sy-.2,.24,rib,[.68,.39,.18],i*.05,Math.sin(i)*1.4);}
        orb(x-12,z+1,y+3.2,2.4,ivory);for(let i=-2;i<=2;i++)pyramid(x-12+i*.8,z-1,y+4.5,.3,2.2,[.72,.55,.30],i*.25,-.6);
        ring(x,z,y+.5,7,18,[.78,.48,.19],.28);
      } else if(poi.name==="THE GILDED WELL") {
        // A deep octagonal well with a suspended bucket of impossible gold.
        ring(x,z,y+1,4.7,16,[.55,.34,.10],.72);pyramid(x,z,y-2,1.0,9,[.08,.04,.02],0,0);
        arch(x,z,y,5.4,6,[.33,.22,.10]);beam(x,z,y+6.2,.16,5,gold);
        box(x,z,y+1.4,1.2,1.3,gold);for(let i=0;i<20;i++){const a=i*.9,r=5.4+(i%4);orb(x+Math.sin(a)*r,z+Math.cos(a)*r,y+.25,.22,gold);}
      } else if(poi.name==="STARFALL MONOLITH") {
        // A black impact shard split by a radiant heartbeat seam.
        ring(x,z,y+.25,8,20,[.20,.30,.36],.48);
        pyramid(x,z,y,3.5,16,[.025,.04,.07],1.2,-.5);pyramid(x+.45,z-.2,y+2,1.4,11,cyan,-.3,.2);
        for(let i=0;i<5;i++)orb(x,z,y+3+i*2.2,.42+(i%2)*.2,[.54,.96,1]);
        for(let i=0;i<8;i++){const a=i/8*Math.PI*2;pyramid(x+Math.sin(a)*9,z+Math.cos(a)*9,y,.35,2.6,ice,-Math.sin(a),-Math.cos(a));}
      } else if(poi.name==="AURORA ARCHIVE") {
        // Seven frozen memory prisms around a crystalline reading dais.
        for(let i=0;i<7;i++){const a=i/7*Math.PI*2,r=6.3,h=7+(i%3)*2;pyramid(x+Math.sin(a)*r,z+Math.cos(a)*r,y,1.15,h,i%2?cyan:violet,-Math.sin(a)*.6,-Math.cos(a)*.6);}
        box(x,z,y,3.2,1.1,[.23,.36,.42]);orb(x,z,y+3.5,2.2,[.65,.92,.94]);
        for(let i=0;i<14;i++){const a=i/14*Math.PI*2;orb(x+Math.sin(a)*3,z+Math.cos(a)*3,y+5+Math.sin(i*.8)*1.2,.2,i%2?cyan:violet);}
      } else if(poi.name==="THE SLEEPING HERD") {
        // Five distinct horned animals resting beneath a low glass-ice canopy.
        animal(x-5,z+1,y,.72,[.31,.43,.47]);animal(x,z-2,y,.9,[.38,.48,.52]);animal(x+5,z+1,y,.68,[.29,.40,.44]);
        animal(x-2,z+5,y,.52,[.36,.46,.50]);animal(x+3,z+5,y,.48,[.33,.44,.47]);
        for(let ix=-4;ix<=4;ix++)for(let iz=-2;iz<=3;iz++)if((ix+iz)%3===0)pyramid(x+ix*1.5,z+iz*1.7,y+.2,.55,2.2,[.48,.72,.79],0,0);
      } else if(poi.name==="FORGE OF THE FIRST FIRE") {
        // A roofed primordial smithy with anvil, chimney and shadowless flame.
        beam(x-6,z,y,.65,9,[.26,.10,.04]);beam(x+6,z,y,.65,9,[.26,.10,.04]);box(x,z,y+8.4,6.8,.65,[.20,.07,.025]);
        box(x,z,y+1.2,3.5,1.4,[.11,.12,.12]);pyramid(x,z,y+2.6,1.8,2.2,[.14,.15,.15],0,0);
        beam(x+4,z+3,y,1.35,8,[.15,.08,.04]);pyramid(x+4,z+3,y+8,1.8,4,[.10,.06,.04],0,0);
        for(let i=0;i<7;i++)pyramid(x-2+i*.55,z,y+3+i*.18,.42,3.5-i*.18,i%2?gold:ember,(i-3)*.15,0);
      } else if(poi.name==="THE PETRIFIED TITAN") {
        // A giant anatomically readable stone hand clutches a hanging bell.
        box(x,z+3,y,5.2,3.2,[.18,.11,.08]);
        for(let i=0;i<5;i++){const fx=x+(i-2)*2.0,h=8-Math.abs(i-2)*.8;beam(fx,z,y+2.7,.8,h,[.22,.13,.09]);pyramid(fx,z,y+2.7+h,.95,4,[.25,.14,.09],(i-2)*.35,-.8);}
        beam(x,z-2,y+5,.35,8,[.42,.25,.08]);pyramid(x,z-2,y+1,2.5,5,gold,0,0);box(x,z-2,y+.5,2.7,.45,[.31,.17,.05]);
        for(let i=0;i<10;i++)orb(x-5+i,z+5+Math.sin(i)*.5,y+.35,.32,[.28,.14,.08]);
      } else if(poi.name==="EMBERHEART VAULT") {
        // A sealed basalt pyramid with a glowing stellar core and tablet circle.
        pyramid(x,z,y,7.2,10,[.09,.045,.035],0,0);pyramid(x,z-1,y+2,3.1,6,ember,0,0);
        box(x,z-4.8,y,2.3,4.3,[.15,.07,.045]);box(x,z-4.85,y+1.1,1.55,2.2,gold);
        for(let i=0;i<12;i++){const a=i/12*Math.PI*2,r=9;box(x+Math.sin(a)*r,z+Math.cos(a)*r,y,.75,2.2,i%2?[.22,.08,.04]:[.42,.16,.05]);}
        ring(x,z,y+7,4.2,16,ember,.24);
      } else if(poi.name==="THE MEMORY WELL") {
        // A reflective cyan aperture framed by four observing statues.
        ring(x,z,y+.6,5.2,20,[.13,.36,.35],.66);pyramid(x,z,y-2,1.2,9,cyan,0,0);
        for(let i=0;i<4;i++){const a=i/4*Math.PI*2;beam(x+Math.sin(a)*7,z+Math.cos(a)*7,y,.62,6,dark);orb(x+Math.sin(a)*7,z+Math.cos(a)*7,y+7,1.15,violet);}
        ring(x,z,y+1.3,3.6,18,[.52,.98,.91],.18);
      } else if(poi.name==="LANTERN NURSERY") {
        // Translucent eggs in nests, connected by a luminous root network.
        for(let i=0;i<13;i++){const a=i*.83,r=2+(i%4)*1.65,px=x+Math.sin(a)*r,pz=z+Math.cos(a)*r,sz=.65+(i%3)*.22;ring(px,pz,y+.15,1.2,7,[.09,.30,.28],.18);orb(px,pz,y+1.3*sz,sz,i%2?cyan:[.19,.88,.66]);}
        for(let i=0;i<16;i++){const a=i/16*Math.PI*2;orb(x+Math.sin(a)*(i%2?6:3.5),z+Math.cos(a)*(i%2?6:3.5),y+.2,.16,[.08,.70,.55]);}
        pyramid(x,z,y,1.4,8,[.04,.46,.38],0,0);orb(x,z,y+8.4,1.5,[.20,1,.73]);
      } else if(poi.name==="LIBRARY OF ROOTS") {
        // A stone tree whose leaf-shaped tablets form shelves around its trunk.
        beam(x,z,y,1.35,12,[.16,.10,.065]);
        for(let level=0;level<4;level++)for(let i=0;i<8;i++){const a=i/8*Math.PI*2+level*.3,r=3.2+level*.9,px=x+Math.sin(a)*r,pz=z+Math.cos(a)*r;box(px,pz,y+3+level*2.3,1.25,.28,level%2?[.17,.42,.30]:[.28,.25,.12]);pyramid(px,pz,y+3.28+level*2.3,.55,1.8,green,Math.sin(a)*.4,Math.cos(a)*.4);}
        for(let i=0;i<8;i++){const a=i/8*Math.PI*2;pyramid(x+Math.sin(a)*4,z+Math.cos(a)*4,y,.35,5,[.22,.13,.07],-Math.sin(a)*1.6,-Math.cos(a)*1.6);}
        orb(x,z,y+13.5,2.0,cyan);
      }
      // Archive plaque: a dark stone lectern with a luminous face, offset
      // consistently so explorers can learn to recognize it from afar.
      const px=x+7.2,pz=z+6.1,py=terrainHeight(px,pz);
      beam(px,pz,py,.38,2.4,[.055,.075,.072]);
      box(px,pz,py+2.1,1.75,1.15,[.035,.09,.085]);
      box(px,pz-.04,py+2.28,1.48,.72,[.10,.72,.61]);
      pyramid(px-1.85,pz,py,.18,1.5,cyan,0,0);
      pyramid(px+1.85,pz,py,.18,1.5,cyan,0,0);
      for(let j=0;j<4;j++){const a=j/4*Math.PI*2;beam(x+Math.sin(a)*9,z+Math.cos(a)*9,y,.12,2.6,cyan);}
    };
    const adventureFeature=(site)=>{
      const x=site.x,z=site.z,y=terrainHeight(x,z),cyan=[.08,.78,.72],gold=[.95,.57,.10],stone=[.19,.20,.18],wood=[.18,.10,.045],ice=[.48,.72,.80],ember=[1,.15,.02];
      const orb=(ox,oz,oy,r,color)=>{pyramid(ox,oz,oy-r,r,r*2,color);pyramid(ox,oz,oy+r,r,r*2,color);};
      const arch=(ox,oz,oy,w,h,color)=>{beam(ox-w,oz,oy,.48,h,color);beam(ox+w,oz,oy,.48,h,color);for(let i=0;i<7;i++){const a=i/6*Math.PI;orb(ox+Math.cos(a)*w,oz,oy+h+Math.sin(a)*w,.58,color);}};
      const beacon=(h,color)=>{beam(x,z,y,.28,h,color);orb(x,z,y+h+1,1.1,color);for(let i=0;i<8;i++){const a=i/8*Math.PI*2;orb(x+Math.sin(a)*3,z+Math.cos(a)*3,y+.25,.18,color);}};
      if(site.type==="bridge") {
        for(let i=-7;i<=7;i++)box(x+i*1.25,z,y+1.3,.54,.22,i%2?wood:[.27,.16,.06]);
        for(const dx of [-9.5,9.5]){beam(x+dx,z-2,y,.3,3.6,wood);beam(x+dx,z+2,y,.3,3.6,wood);}
        for(let i=-8;i<=8;i++){const sag=Math.abs(i)/8;beam(x+i*1.15,z-2,y+2.1-sag,.08,.6,gold);beam(x+i*1.15,z+2,y+2.1-sag,.08,.6,gold);}
        beacon(5,cyan);
      } else if(site.type==="lakeTemple") {
        for(let i=0;i<12;i++){const a=i/12*Math.PI*2;beam(x+Math.sin(a)*8,z+Math.cos(a)*8,y,.45,3.5,stone);}
        box(x,z,y+1,4.5,1.0,stone);arch(x,z-1,y+2,4,5,[.31,.38,.34]);
        for(let i=0;i<5;i++){const a=i/5*Math.PI*2;orb(x+Math.sin(a)*5,z+Math.cos(a)*5,y+3,.8,cyan);}
      } else if(site.type==="observatory") {
        for(let i=0;i<16;i++){const a=i/16*Math.PI*2;beam(x+Math.sin(a)*6,z+Math.cos(a)*6,y,.55,5,stone);}
        box(x,z,y+4.5,6.5,.7,[.24,.27,.25]);pyramid(x,z,y+5.2,6.5,5,[.14,.20,.19],0,0);
        beam(x,z,y+6,.7,7,[.22,.18,.10]);pyramid(x,z-2,y+12,.8,5,gold,0,-3);
        for(let i=0;i<18;i++){const a=i/18*Math.PI*2;orb(x+Math.sin(a)*4,z+Math.cos(a)*4,y+10,.24,cyan);}
      } else if(site.type==="canyonGate") {
        arch(x,z,y,7,10,[.38,.22,.08]);arch(x,z+2,y,5,7,[.54,.32,.10]);
        for(let i=-5;i<=5;i++){beam(x+i*1.2,z-1,y+7+Math.cos(i*.5)*2,.12,2,gold);orb(x+i*1.2,z-1,y+6.4+Math.cos(i*.5)*2,.35,gold);}
      } else if(site.type==="desertCity") {
        for(let gx=-2;gx<=2;gx++)for(let gz=-2;gz<=2;gz++)if((gx+gz)%2===0){const h=3+((gx*gz+8)%4)*1.8;box(x+gx*5,z+gz*5,y,1.8,h,[.43,.27,.11]);pyramid(x+gx*5,z+gz*5,y+h,2,1.8,[.62,.39,.14]);}
        arch(x,z-12,y,5,7,gold);beacon(10,gold);
      } else if(site.type==="tower") {
        for(let i=0;i<4;i++)beam(x+(i<2?-3:3),z+(i%2?-3:3),y,.42,14,[.33,.24,.12]);
        box(x,z,y+13.5,4.2,.8,gold);pyramid(x,z,y+14.3,4.2,5,[.74,.45,.12],0,0);
        for(let i=0;i<9;i++)pyramid(x+i*.75-3,z-1,y+18+i*.3,.16,3,cyan,(i-4)*.3,0);
      } else if(site.type==="iceLake") {
        for(let i=0;i<14;i++){const a=i/14*Math.PI*2;pyramid(x+Math.sin(a)*8,z+Math.cos(a)*8,y,.65,4+(i%3),ice,-Math.sin(a),-Math.cos(a));}
        for(let i=-4;i<=4;i++)box(x+i*1.4,z,y+.25,.6,.16,i%2?cyan:[.72,.88,.90]);
        beacon(6,[.62,.92,1]);
      } else if(site.type==="mountainGate") {
        arch(x,z,y,8,12,ice);for(let i=0;i<7;i++)pyramid(x-6+i*2,z,y+11+i%2*2,.5,7,i%2?cyan:[.38,.42,.75],0,0);
        for(let i=0;i<18;i++){const a=i/18*Math.PI*2;orb(x+Math.sin(a)*5,z+Math.cos(a)*5,y+9,.24,i%2?cyan:[.52,.38,.82]);}
      } else if(site.type==="lodge") {
        box(x,z,y,6,5,[.19,.12,.07]);pyramid(x,z,y+5,6.8,5,[.28,.19,.12],0,0);
        for(let i=-2;i<=2;i++)beam(x+i*2.3,z-6,y,.25,4.5,wood);
        box(x,z-6,y+3.8,5.5,.35,wood);pyramid(x,z-6,y+4.1,5.8,3,[.24,.15,.09]);
        pyramid(x,z-2,y+.2,1.2,4,ember);beam(x+3,z+1,y+5,.7,5,[.16,.10,.07]);
      } else if(site.type==="lavaBridge") {
        for(let i=-8;i<=8;i++)box(x+i*1.3,z,y+2,.58,.4,[.14,.11,.10]);
        for(const dx of [-11,11])arch(x+dx,z,y,2.5,6,[.21,.10,.05]);
        for(let i=-7;i<=7;i++)pyramid(x+i*1.4,z+2,y+.2,.22,1.8,i%2?ember:gold,0,0);
      } else if(site.type==="amphitheater") {
        for(let row=0;row<5;row++)for(let i=0;i<16;i++){const a=(i/15-.5)*Math.PI*1.35,r=5+row*2;box(x+Math.sin(a)*r,z+Math.cos(a)*r,y+row*.7,.75,.6,[.18+row*.018,.11,.08]);}
        box(x,z-3,y,4.5,.8,[.12,.08,.07]);beacon(7,ember);
      } else if(site.type==="fortress") {
        for(const dx of [-7,7])for(const dz of [-7,7]){beam(x+dx,z+dz,y,1.4,12,[.14,.09,.07]);pyramid(x+dx,z+dz,y+12,1.8,3,[.27,.10,.05]);}
        for(let i=-3;i<=3;i++){box(x+i*2,z-7,y,1,6,[.18,.10,.07]);box(x+i*2,z+7,y,1,6,[.18,.10,.07]);}
        arch(x,z-7.2,y,3.5,7,gold);beacon(15,ember);
      } else if(site.type==="cathedral") {
        for(let i=0;i<10;i++){const a=i/10*Math.PI*2,r=7;arch(x+Math.sin(a)*r,z+Math.cos(a)*r,y,2,7,[.05,.28,.26]);}
        for(let i=0;i<24;i++){const a=i/24*Math.PI*2;orb(x+Math.sin(a)*5,z+Math.cos(a)*5,y+8+Math.sin(i*.8)*2,.28,i%3?cyan:[.4,1,.55]);}
        beacon(11,[.18,1,.72]);
      } else if(site.type==="rail") {
        for(let i=-10;i<=10;i++){box(x+i*1.4,z-1.5,y,.55,.18,[.32,.24,.15]);box(x+i*1.4,z+1.5,y,.55,.18,[.32,.24,.15]);}
        box(x,z,y+1,4.3,2,[.12,.18,.17]);pyramid(x-4,z,y+1,2.2,3,[.16,.32,.29],-2,0);
        for(const dx of [-2.6,2.6])for(const dz of [-1.8,1.8])orb(x+dx,z+dz,y+.7,.8,[.08,.50,.44]);
      } else if(site.type==="undergroundLake") {
        for(let i=0;i<12;i++){const a=i/12*Math.PI*2;arch(x+Math.sin(a)*10,z+Math.cos(a)*10,y,2,6,[.04,.20,.20]);}
        for(let i=0;i<20;i++){const a=i/20*Math.PI*2;orb(x+Math.sin(a)*7,z+Math.cos(a)*7,y+.6+Math.sin(i)*.3,.22,cyan);}
        pyramid(x,z,y-2,2,10,[.02,.38,.39]);beacon(8,cyan);
      }
      if(completedActivities.has(site.name)) {
        for(let i=0;i<16;i++){const a=i/16*Math.PI*2,r=4.4+Math.sin(i*1.7);orb(x+Math.sin(a)*r,z+Math.cos(a)*r,y+5+Math.sin(i*.8)*1.7,.22,[.45,1,.72]);}
      }
    };
    const portalFeature=(portal)=>{
      const x=portal.x,z=portal.z,y=terrainHeight(x,z),rock=state.realm===1?[.45,.26,.09]:state.realm===2?[.48,.66,.72]:state.realm===3?[.20,.08,.04]:[.09,.20,.16];
      for(let i=0;i<11;i++){const a=Math.PI*i/10;const px=x+Math.cos(a)*5,pz=z,py=y+Math.sin(a)*6;pyramid(px,pz,py-1,.72,3,rock,0,0);}
      for(let i=0;i<9;i++){const a=i/9*Math.PI*2;const r=2.8;pyramid(x+Math.sin(a)*r,z-.5+Math.cos(a)*r,y+2.8,.28,1.6,[.08,.75,.62],0,0);}
      box(x,z+1.8,y,5.4,.45,[.05,.08,.07]);
    };
    const roomFeature=(room)=>{
      const x=room.x,z=room.z,y=-3,c=room.color,trim=[.10,.74,.62];
      // Walkable pocket interior: floor, four walls, columns, vault ribs,
      // central artifact and an illuminated exit door.
      for(let gx=-3;gx<=3;gx++)for(let gz=-3;gz<=3;gz++)box(x+gx*4,z+gz*4,y-.25,1.95,.25,[c[0]*.7,c[1]*.7,c[2]*.7]);
      for(let i=-6;i<=6;i++){box(x+i*2,z-13,y,1,9,c);box(x+i*2,z+13,y,1,9,c);}
      for(let i=-5;i<=5;i++){box(x-13,z+i*2.3,y,1,9,c);box(x+13,z+i*2.3,y,1,9,c);}
      for(const dx of [-9,-3,3,9])for(const dz of [-9,9]){beam(x+dx,z+dz,y,.45,11,trim);pyramid(x+dx,z+dz,y+11,.8,3,trim);}
      for(const dz of [-6,0,6])for(let i=0;i<9;i++){const a=i/8*Math.PI;const px=x+Math.cos(a)*10,py=y+8+Math.sin(a)*5;orbRoom(px,z+dz,py,.45,c);}
      function orbRoom(ox,oz,oy,r,col){pyramid(ox,oz,oy-r,r,r*2,col);pyramid(ox,oz,oy+r,r,r*2,col);}
      box(x,z,y,3.2,1.2,[.04,.08,.08]);pyramid(x,z,y+1.2,2.2,7,trim);
      for(let i=0;i<12;i++){const a=i/12*Math.PI*2;orbRoom(x+Math.sin(a)*5,z+Math.cos(a)*5,y+5+Math.sin(i*.7),.28,i%2?trim:[.66,.88,.82]);}
      box(x,z+11.8,y,3,5,[.025,.08,.07]);box(x,z+11.6,y+1,2.4,3.1,trim);
    };
    const frontierFeature=(site)=>{
      const x=site.x,z=site.z,y=terrainHeight(x,z),cyan=[.10,.92,.72],gold=[.96,.58,.12],violet=[.54,.24,.82],stone=[.12,.16,.15];
      if(site.form==="range"){
        for(let i=-6;i<=6;i++){const px=x+i*18,pz=z+Math.sin(i*.7)*18,py=terrainHeight(px,pz);pyramid(px,pz,py,5.5+Math.abs(i)*.25,28+Math.cos(i)*8,[.58,.76,.80],(i%2?2:-2),0);pyramid(px,pz,py+18,3.5,16,[.86,.94,.94],0,0);}
        for(let i=0;i<18;i++){const a=i/18*Math.PI*2,r=16+(i%4)*3,px=x+Math.sin(a)*r,pz=z+Math.cos(a)*r;pyramid(px,pz,terrainHeight(px,pz),.42,2.6,i%2?cyan:[.62,.82,.88],0,0);}
      } else if(site.form==="falls"){
        for(const fall of crownwallFalls())if(Math.hypot(fall.x-x,fall.z-z)<160){const fy=terrainHeight(fall.x,fall.z+14);for(let i=0;i<16;i++){const a=i/16*Math.PI*2,r=8+(i%3)*2;pyramid(fall.x+Math.sin(a)*r,fall.z+18+Math.cos(a)*r,fy,.22,2.1,i%2?[.78,.95,1]:cyan,0,0);}beam(fall.x-10,fall.z+8,fy,.3,7,[.38,.52,.56]);beam(fall.x+10,fall.z+8,fy,.3,7,[.38,.52,.56]);}
        box(x,z,y,4.8,.6,[.44,.58,.62]);for(let i=0;i<11;i++)pyramid(x-12+i*2.4,z+5,y,.35,4+(i%4),[.64,.86,.90],0,0);
      } else if(site.form==="pass"){
        for(let i=-5;i<=5;i++){const px=x+i*3.2,pz=z+Math.sin(i*.8)*2,py=terrainHeight(px,pz);beam(px,pz,py,.18,3.8,[.38,.36,.30]);pyramid(px,pz,py+3.2,.35,1.4,i%2?gold:cyan,0,0);}
        for(let i=0;i<7;i++){const px=x-10+i*3.2,pz=z-8+Math.sin(i)*3,py=terrainHeight(px,pz);box(px,pz,py+.55,.9,.65,[.50,.62,.62]);pyramid(px,pz-1.05,py+1.0,.42,.9,[.55,.68,.70],0,-.35);pyramid(px-.35,pz-1.7,py+1.7,.11,.65,[.86,.92,.90],-.18,-.12);pyramid(px+.35,pz-1.7,py+1.7,.11,.65,[.86,.92,.90],.18,-.12);}
      } else if(site.form==="grove"||site.form==="orchard")for(let i=0;i<22;i++){const a=i*.91,r=4+(i%6)*2.1,h=5+(i%5)*1.3;beam(x+Math.sin(a)*r,z+Math.cos(a)*r,y,.28,h,site.form==="orchard"?[.25,.09,.04]:[.08,.22,.09]);pyramid(x+Math.sin(a)*r,z+Math.cos(a)*r,y+h-1,1.6,4,site.form==="orchard"?gold:[.12,.58,.19]);}
      else if(site.form==="basin"||site.form==="field"||site.form==="sea")for(let i=0;i<28;i++){const a=i/28*Math.PI*2,r=5+(i%5)*2.4;pyramid(x+Math.sin(a)*r,z+Math.cos(a)*r,y-.4,.35+(i%3)*.3,2+(i%6),site.form==="sea"?[.02,.34,.42]:cyan,0,0);}
      else if(site.form==="engine"||site.form==="clock"){beam(x,z,y,2.2,12,stone);for(let ring=0;ring<4;ring++)for(let i=0;i<16;i++){const a=i/16*Math.PI*2,r=3+ring*2;pyramid(x+Math.sin(a)*r,z+Math.cos(a)*r,y+5+ring,.22,1.4,ring%2?gold:cyan,0,0);}}
      else if(site.form==="camp"){for(let i=0;i<7;i++)pyramid(x+i*2-6,z,y,.75,4,[.32,.18,.07],0,0);beam(x+7,z,y,.18,7,gold);}
      else if(site.form==="storm"){for(let i=0;i<18;i++){const a=i*.83,r=3+(i%6)*1.8;pyramid(x+Math.sin(a)*r,z+Math.cos(a)*r,y,1.0,9+(i%5)*2,[.52,.82,.92],(i%2?1:-1)*1.8,0);}}
      else if(site.form==="city"){for(let gx=-2;gx<=2;gx++)for(let gz=-2;gz<=2;gz++){const h=5+((gx*7+gz*3+20)%6)*2;beam(x+gx*5,z+gz*5,y,.8,h,[.04,.20,.20]);pyramid(x+gx*5,z+gz*5,y+h,1.2,3,violet,0,0);}}
      beam(x+8,z+5,y,.4,3,stone);box(x+8,z+5,y+2.6,1.7,1,cyan);
      for(let i=0;i<12;i++){const a=i/12*Math.PI*2;pyramid(x+Math.sin(a)*15,z+Math.cos(a)*15,y,.13,2.2,i%2?cyan:gold,0,0);}
    };
    if(volumeNetwork) {
      const VR=8,x0=cx*CHUNK,z0=cz*CHUNK,vStep=CHUNK/VR;
      let yTop=-99;
      for(let iz=0;iz<=VR;iz++)for(let ix=0;ix<=VR;ix++)yTop=Math.max(yTop,terrainHeight(x0+ix*vStep,z0+iz*vStep));
      const yBottom=Math.min(-22,...resolvedCavePaths(volumeNetwork).flat().map(p=>p[1]-volumeNetwork.radius-4));
      yTop+=4;
      const VY=Math.max(9,Math.min(20,Math.ceil((yTop-yBottom)/3.2))),yStep=(yTop-yBottom)/VY;
      const sample=(ix,iy,iz)=>{
        const p=[x0+ix*vStep,yBottom+iy*yStep,z0+iz*vStep];
        return {p,d:terrainDensity(p[0],p[1],p[2])};
      };
      const edgePoint=(a,b)=>{
        const t=Math.max(0,Math.min(1,a.d/(a.d-b.d||.0001)));
        return [mix(a.p[0],b.p[0],t),mix(a.p[1],b.p[1],t),mix(a.p[2],b.p[2],t)];
      };
      const emitVolumeTri=(a,b,c)=>{
        for(const p of [a,b,c]){
          const n=densityNormal(...p),surface=n[1]>.48;
          const base=surface?colorAt(p[0],p[2],p[1],realm):volumeNetwork.color;
          const grain=.82+noise(p[0]*.17,p[2]*.17)*.25;
          raw(...p,base.map(v=>v*grain),n);
        }
      };
      const tets=[[0,5,1,6],[0,1,2,6],[0,2,3,6],[0,3,7,6],[0,7,4,6],[0,4,5,6]];
      for(let iy=0;iy<VY;iy++)for(let iz=0;iz<VR;iz++)for(let ix=0;ix<VR;ix++){
        const v=[
          sample(ix,iy,iz),sample(ix+1,iy,iz),sample(ix+1,iy,iz+1),sample(ix,iy,iz+1),
          sample(ix,iy+1,iz),sample(ix+1,iy+1,iz),sample(ix+1,iy+1,iz+1),sample(ix,iy+1,iz+1)
        ];
        for(const ids of tets){
          const tv=ids.map(i=>v[i]),inside=[],outside=[];
          tv.forEach((vert,index)=>(vert.d>=0?inside:outside).push(index));
          if(inside.length===0||inside.length===4)continue;
          if(inside.length===1){
            const a=inside[0],p0=edgePoint(tv[a],tv[outside[0]]),p1=edgePoint(tv[a],tv[outside[1]]),p2=edgePoint(tv[a],tv[outside[2]]);
            emitVolumeTri(p0,p1,p2);
          } else if(inside.length===3){
            const a=outside[0],p0=edgePoint(tv[a],tv[inside[0]]),p1=edgePoint(tv[a],tv[inside[1]]),p2=edgePoint(tv[a],tv[inside[2]]);
            emitVolumeTri(p0,p2,p1);
          } else {
            const a=inside[0],b=inside[1],c=outside[0],d=outside[1];
            const ac=edgePoint(tv[a],tv[c]),ad=edgePoint(tv[a],tv[d]),bc=edgePoint(tv[b],tv[c]),bd=edgePoint(tv[b],tv[d]);
            emitVolumeTri(ac,bc,ad);emitVolumeTri(ad,bc,bd);
          }
        }
      }
    } else {
      for(let iz=0;iz<RES;iz++) for(let ix=0;ix<RES;ix++) {
        const x=cx*CHUNK+ix*step, z=cz*CHUNK+iz*step, x1=x+step, z1=z+step;
        vertex(x,z); vertex(x,z1); vertex(x1,z);
        vertex(x1,z); vertex(x,z1); vertex(x1,z1);
      }
      // Water, ice and lava are generated in the same streamed chunks as the terrain.
      for(let iz=0;iz<RES;iz++) for(let ix=0;ix<RES;ix++) {
        const x=cx*CHUNK+ix*step,z=cz*CHUNK+iz*step,x1=x+step,z1=z+step;
        const wa=waterAt(x+step*.5,z+step*.5);
        if(!wa)continue;
        const ripple=.018*Math.sin(x*.42+z*.31+state.realm);
        const c=wa.color.map((v,i)=>Math.min(1,v+(i===1?ripple:0))),yy=wa.level+.06;
        waterTri([x,yy,z],[x,yy,z1],[x1,yy,z],c,[0,1,0]);
        waterTri([x1,yy,z],[x,yy,z1],[x1,yy,z1],c,[0,1,0]);
      }
      if(state.realm===2)for(const fall of crownwallFalls()){
        const minX=fall.x-fall.w,maxX=fall.x+fall.w,minZ=fall.z-2,maxZ=fall.z+3;
        if(cx*CHUNK>maxX||cx*CHUNK+CHUNK<minX||cz*CHUNK>maxZ||cz*CHUNK+CHUNK<minZ)continue;
        const shimmer=.06*Math.sin(state.time*2+fall.x*.01),c=[.30+shimmer,.70,.86],n=[0,0,1];
        waterTri([fall.x-fall.w,fall.top,fall.z],[fall.x+fall.w,fall.top,fall.z],[fall.x-fall.w*.72,fall.bottom,fall.z+.8],c,n);
        waterTri([fall.x+fall.w,fall.top,fall.z],[fall.x+fall.w*.72,fall.bottom,fall.z+.8],[fall.x-fall.w*.72,fall.bottom,fall.z+.8],c,n);
        waterTri([fall.x-fall.w*.42,fall.top-7,fall.z-1.2],[fall.x+fall.w*.45,fall.top-5,fall.z-1.2],[fall.x,fall.bottom+1.5,fall.z+1.8],[.72,.95,1],[0,0,1]);
      }
    }
    const terrainVertexCount=data.length/9;
    for(let i=0;i<7;i++) {
      const seed=hash(cx*19+i*7,cz*23-i*11), seed2=hash(cx*31-i*5,cz*13+i*17);
      const x=cx*CHUNK+3+seed*(CHUNK-6), z=cz*CHUNK+3+seed2*(CHUNK-6), y=terrainHeight(x,z);
      const size=.72+hash(cx+i*3,cz-i*9)*1.35;
      if(nearCaveEntrance(x,z,20))continue;
      if(volumeNetwork){
        const floor=caveFloorAt(x,z)?.floor??y-8,ceiling=floor+8+seed2*7;
        pyramid(x,z,floor,.3*size,1.5+seed*2.4,seed>.55?[.08,.68,.56]:[.12,.42,.38],(seed-.5)*.5,(seed2-.5)*.5);
        stalactite(x+1.8,z-1.2,ceiling,.42*size,2.2+seed2*3.5,[.045,.16,.15]);
        continue;
      }
      continue;
      if(state.realm===0) {
        box(x,z,y,.18*size,2.6*size,[.12,.075,.035]);
        pyramid(x,z,y+1.8*size,1.25*size,3.9*size,[.075,.30+seed*.15,.10],(seed-.5)*.45,0);
      } else if(state.realm===1) {
        pyramid(x,z,y,.8*size,4.5*size,[.61,.35+.15*seed,.13],(seed-.5)*1.8,(seed2-.5)*1.2);
      } else if(state.realm===2) {
        pyramid(x,z,y,.48*size,3.8*size,[.48+.22*seed,.72,.78],(seed-.5)*.8,(seed2-.5)*.8);
        if(seed>.55)pyramid(x+.7,z-.3,y,.22*size,2.2*size,[.68,.86,.91],-.3,.2);
      } else if(state.realm===3) {
        pyramid(x,z,y,.9*size,5.8*size,[.12+.17*seed,.075,.055],(seed-.5)*.5,(seed2-.5)*.5);
      } else {
        pyramid(x,z,y,.42*size,3.6*size,[.04,.48+.18*seed,.45],(seed-.5)*1.1,(seed2-.5)*1.1);
        if(seed>.45)pyramid(x-.6,z+.5,y,.2*size,1.9*size,[.08,.65,.57],.3,-.2);
        const ceiling=25+noise(cx*.31+i,cz*.27-i)*7;
        stalactite(x+2,z-1,ceiling,.8*size,5.5*size,[.025,.13,.14]);
        if(seed>.68) {
          box(x+4,z+3,y,.7,Math.max(2,ceiling-y-2),[.035,.16,.16]);
          stalactite(x+4,z+3,ceiling,1.5,4,[.04,.22,.21]);
        }
      }
    }
    if(volumeNetwork) {
      for(const pts of resolvedCavePaths(volumeNetwork))for(let si=0;si<pts.length-1;si++)for(let k=1;k<=4;k++){
        const t=k/5,x=mix(pts[si][0],pts[si+1][0],t),z=mix(pts[si][2],pts[si+1][2],t);
        if(Math.floor(x/CHUNK)!==cx||Math.floor(z/CHUNK)!==cz)continue;
        const floor=caveFloorAt(x,z)?.floor??mix(pts[si][1],pts[si+1][1],t)-volumeNetwork.radius+1;
        const side=k%2?2.8:-2.8;
        pyramid(x+side,z,floor,.28+.1*(k%3),1.3+.6*(k%2),[.08,.78,.62],0,0);
        pyramid(x-side*.55,z+1.2,floor,.18, .7,[.32,.96,.70],0,0);
      }
      for(const [x,z,y,r] of volumeNetwork.chambers)if(Math.floor(x/CHUNK)===cx&&Math.floor(z/CHUNK)===cz){
        for(let i=0;i<10;i++){const a=i/10*Math.PI*2;pyramid(x+Math.sin(a)*r*.68,z+Math.cos(a)*r*.68,y-r+1.2,.38,2.5+(i%3),i%2?[.08,.55,.48]:[.18,.76,.58],0,0);}
      }
    }
    for(const site of caveDiscoveries)if(site.realm===state.realm&&Math.floor(site.x/CHUNK)===cx&&Math.floor(site.z/CHUNK)===cz){
      const floor=caveFloorAt(site.x,site.z)?.floor??site.y-5,cyan=[.16,.94,.72],violet=[.52,.25,.92],gold=[1,.61,.12];
      if(site.kind==="DEEP DISCOVERY"){
        for(let i=0;i<18;i++){const a=i/18*Math.PI*2,r=2.5+(i%4)*.8;pyramid(site.x+Math.sin(a)*r,site.z+Math.cos(a)*r,floor,.22+(i%3)*.12,1.4+(i%5)*.55,i%3?cyan:violet,0,0);}
        pyramid(site.x,site.z,floor,1.2,7,[.72,.92,.78],0,0);
      }else{
        box(site.x,site.z,floor,2.8,1.1,[.13,.09,.04]);box(site.x,site.z,floor+1.1,2.4,.42,gold);
        for(let i=0;i<12;i++){const a=i/12*Math.PI*2;pyramid(site.x+Math.sin(a)*4,site.z+Math.cos(a)*4,floor,.2,2.1,i%2?gold:cyan,0,0);}
      }
      beam(site.x+6,site.z+2,floor,.36,2.7,[.04,.09,.08]);box(site.x+6,site.z+2,floor+2.4,1.55,.9,cyan);
    }
    for(const hazard of caveHazards)if(hazard.realm===state.realm&&Math.floor(hazard.x/CHUNK)===cx&&Math.floor(hazard.z/CHUNK)===cz){
      const floor=caveFloorAt(hazard.x,hazard.z)?.floor??-8;
      const c=hazard.type==="lava"?[1,.10,.01]:hazard.type==="frost"?[.32,.78,1]:hazard.type==="gas"?[.45,.78,.12]:hazard.type==="flood"?[.04,.32,.46]:[.43,.30,.20];
      for(let i=0;i<16;i++){const a=i/16*Math.PI*2,r=hazard.radius*(.25+(i%4)*.17);pyramid(hazard.x+Math.sin(a)*r,hazard.z+Math.cos(a)*r,floor,.22+(i%2)*.18,.7+(i%3)*.65,c,0,0);}
    }
    for(const marker of trailMarkers)if(marker.realm===state.realm&&Math.floor(marker.x/CHUNK)===cx&&Math.floor(marker.z/CHUNK)===cz){
      const floor=caveFloorAt(marker.x,marker.z)?.floor??terrainHeight(marker.x,marker.z);
      beam(marker.x,marker.z,floor,.18,3.4,[.23,.13,.03]);pyramid(marker.x,marker.z,floor+3.2,.72,2.2,[1,.55,.08],0,0);
      for(let i=0;i<8;i++){const a=i/8*Math.PI*2;pyramid(marker.x+Math.sin(a)*1.3,marker.z+Math.cos(a)*1.3,floor+.1,.11,.5,[1,.72,.18],0,0);}
    }
    if(discoveries.size===15&&completedActivities.size===15)for(const echo of postgameEchoes)if(echo.realm===state.realm&&Math.floor(echo.x/CHUNK)===cx&&Math.floor(echo.z/CHUNK)===cz){
      const y=terrainHeight(echo.x,echo.z),col=recoveredEchoes.has(echo.name)?[.18,.45,.38]:[.58,.22,.92];
      for(let layer=0;layer<3;layer++)for(let i=0;i<12;i++){const a=i/12*Math.PI*2+layer*.3,r=2.2+layer*1.8;pyramid(echo.x+Math.sin(a)*r,echo.z+Math.cos(a)*r,y+layer*.7,.18,1.5+layer,col,0,0);}
      pyramid(echo.x,echo.z,y,1.35,9,col,0,0);
    }
    for(const network of caveNetworks) {
      if(network.realm!==state.realm)continue;
      const ex=network.points[0][0],ez=network.points[0][1];
      if(Math.floor(ex/CHUNK)!==cx||Math.floor(ez/CHUNK)!==cz)continue;
      const ey=terrainHeight(ex,ez),marker=[.18,.96,.74],rock=network.color;
      // Monumental entrance frame placed outside the opening, leaving a
      // fourteen-meter clear passage between the pillars.
      beam(ex-8,ez+1,ey,.85,9,rock);beam(ex+8,ez+1,ey,.85,9,rock);
      pyramid(ex-8,ez+1,ey+8.5,1.4,4,marker,1.5,0);
      pyramid(ex+8,ez+1,ey+8.5,1.4,4,marker,-1.5,0);
      for(let i=-3;i<=3;i++)pyramid(ex+i*2.1,ez+.5,ey+10.5+Math.abs(i)*.45,.34,2.2,marker,0,0);
      // A deep, non-colliding silhouette makes the carved void readable
      // against bright terrain while remaining physically walk-through.
      const dark=[.008,.014,.012],mw=5.8,mh=5.0,mz=ez-4.5;
      tri([ex-mw,ey,mz],[ex+mw,ey,mz],[ex-mw,ey+mh,mz],dark,[0,0,1]);
      tri([ex+mw,ey,mz],[ex+mw,ey+mh,mz],[ex-mw,ey+mh,mz],dark,[0,0,1]);
      tri([ex-mw,ey+mh,mz],[ex+mw,ey+mh,mz],[ex,ey+9,mz],dark,[0,0,1]);
      // Low guide lights begin well outside the hill without obstructing
      // the player's view or movement.
      for(let i=0;i<8;i++){
        const pz=ez+6+i*3.2,py=terrainHeight(ex,pz)+.2;
        pyramid(ex-4.2,pz,py,.14,.65,marker,0,0);pyramid(ex+4.2,pz,py,.14,.65,marker,0,0);
      }
      beam(ex,ez+8,ey,.12,15,marker);
    }
    if(discoveries.size===15&&completedActivities.size===15&&state.realm===4&&Math.floor(worldheart.x/CHUNK)===cx&&Math.floor(worldheart.z/CHUNK)===cz) {
      const x=worldheart.x,z=worldheart.z,y=terrainHeight(x,z);
      for(let layer=0;layer<5;layer++)for(let i=0;i<16;i++){const a=i/16*Math.PI*2+layer*.2,r=10-layer*1.5;const px=x+Math.sin(a)*r,pz=z+Math.cos(a)*r;pyramid(px,pz,y+layer*1.6,.45,4+layer,[.12+layer*.05,.65,.55],-Math.sin(a),-Math.cos(a));}
      pyramid(x,z,y,4,18,[.08,.72,.62]);pyramid(x,z,y+6,2,11,[.74,1,.88]);
    }
    for(const poi of locations) {
      if(poi.realm!==state.realm)continue;
      if(Math.floor(poi.x/CHUNK)===cx && Math.floor(poi.z/CHUNK)===cz) landmark(poi);
    }
    for(const site of adventureSites) {
      if(site.realm===state.realm&&Math.floor(site.x/CHUNK)===cx&&Math.floor(site.z/CHUNK)===cz)adventureFeature(site);
    }
    for(const site of frontierSites)if(site.realm===state.realm&&Math.floor(site.x/CHUNK)===cx&&Math.floor(site.z/CHUNK)===cz)frontierFeature(site);
    for(const room of interiorRooms) {
      if(room.realm===state.realm&&Math.floor(room.x/CHUNK)===cx&&Math.floor(room.z/CHUNK)===cz)roomFeature(room);
      if(room.realm===state.realm&&Math.floor(room.entryX/CHUNK)===cx&&Math.floor(room.entryZ/CHUNK)===cz) {
        const ey=terrainHeight(room.entryX,room.entryZ);
        box(room.entryX,room.entryZ,ey,3.2,5,[.035,.09,.08]);box(room.entryX,room.entryZ-.1,ey+1,2.5,3.2,[.10,.72,.61]);
      }
    }
    const group=new THREE.Group(),geometry=geometryFromInterleaved(new Float32Array(data));
    geometry.clearGroups();geometry.addGroup(0,terrainVertexCount,0);if(data.length/9>terrainVertexCount)geometry.addGroup(terrainVertexCount,data.length/9-terrainVertexCount,1);
    const mesh=new THREE.Mesh(geometry,[terrainMaterials[state.realm],propMaterials[state.realm]]);mesh.castShadow=true;mesh.receiveShadow=true;group.add(mesh);
    if(waterData.length){
      const waterGeometry=geometryFromInterleaved(new Float32Array(waterData));
      const waterKind=state.realm===3?1:state.realm===2?2:0,waterMesh=new THREE.Mesh(waterGeometry,waterMaterials[waterKind]);
      waterMesh.receiveShadow=true;waterMesh.renderOrder=2;group.add(waterMesh);
    }
    if(!volumeNetwork&&!interiorRooms.some(room=>room.realm===state.realm&&Math.hypot(cx*CHUNK-room.x,cz*CHUNK-room.z)<48))addChunkDetails(group,cx,cz,state.realm);
    worldGroup.add(group);
    return {object:group,count:data.length/9,cx,cz,volumetric:!!volumeNetwork};
  }
  function streamChunks() {
    const pcx=Math.floor(state.x/CHUNK), pcz=Math.floor(state.z/CHUNK), needed=new Set();
    const fx=-Math.sin(state.yaw), fz=-Math.cos(state.yaw);
    for(let dz=-viewRange;dz<=viewRange;dz++) for(let dx=-viewRange;dx<=viewRange;dx++) {
      const dist=Math.hypot(dx,dz), dot=(dx*fx+dz*fz)/(dist||1);
      if(dist<=2.3 || (dist<=viewRange && dot>-.42)) {
        const key=`${pcx+dx},${pcz+dz}`; needed.add(key);
        if(!chunks.has(key)) chunks.set(key,makeChunk(pcx+dx,pcz+dz));
      }
    }
    for(const [key,ch] of chunks) if(!needed.has(key)){disposeObject(ch.object);chunks.delete(key);}
  }
  function clearChunks(){for(const ch of chunks.values())disposeObject(ch.object);chunks.clear();}

  function perspective(out,fov,aspect,near,far) {
    const f=1/Math.tan(fov/2), nf=1/(near-far);
    out.set([f/aspect,0,0,0, 0,f,0,0, 0,0,(far+near)*nf,-1, 0,0,2*far*near*nf,0]);
  }
  function viewMatrix(out,x,y,z,yaw,pitch) {
    const cy=Math.cos(yaw), sy=Math.sin(yaw), cp=Math.cos(pitch), sp=Math.sin(pitch);
    const rx=cy, ry=0, rz=-sy, ux=-sy*sp, uy=cp, uz=-cy*sp, fx=-sy*cp, fy=-sp, fz=-cy*cp;
    out.set([rx,ux,-fx,0, ry,uy,-fy,0, rz,uz,-fz,0, -(rx*x+ry*y+rz*z),-(ux*x+uy*y+uz*z),fx*x+fy*y+fz*z,1]);
  }

  function makeSky() {
    const data=[], realm=state.realm;
    const v=(p,c)=>data.push(p[0],p[1],p[2],c[0],c[1],c[2],0,1,0);
    const tri=(a,b,c,color)=>{v(a,color);v(b,color);v(c,color);};
    const quad=(angle,radius,y,width,height,color,xShift=0)=>{
      const sx=Math.cos(angle), sz=-Math.sin(angle);
      const cx=state.x+Math.sin(angle)*radius+sx*xShift;
      const cz=state.z+Math.cos(angle)*radius+sz*xShift;
      const a=[cx-sx*width,y-height*.5,cz-sz*width], b=[cx+sx*width,y-height*.5,cz+sz*width];
      const c=[cx+sx*width,y+height*.5,cz+sz*width], d=[cx-sx*width,y+height*.5,cz-sz*width];
      tri(a,b,c,color); tri(a,c,d,color);
    };
    const diamond=(angle,radius,y,size,color,offset=0)=>{
      const sx=Math.cos(angle), sz=-Math.sin(angle);
      const cx=state.x+Math.sin(angle)*radius+sx*offset, cz=state.z+Math.cos(angle)*radius+sz*offset;
      tri([cx,y+size,cz],[cx+sx*size,y,cz+sz*size],[cx,y-size,cz],color);
      tri([cx,y+size,cz],[cx,y-size,cz],[cx-sx*size,y,cz-sz*size],color);
    };
    if(state.inCave){
      for(let i=0;i<42;i++){
        const a=hash(i,51)*Math.PI*2,y=state.y-2+hash(i,18)*16;
        diamond(a,12+hash(i,9)*42,y,.10+hash(i,4)*.24,hash(i,7)>.62?[.16,.92,.77]:[.08,.42,.45],(hash(i,13)-.5)*18);
      }
      if(motionEnabled){
        const alarm=scannerOn?2.8:lanternOn?1.8:1;
        for(let i=0;i<9;i++){
          const flee=(6+i*2.2)*alarm,a=state.time*(.16+i*.012)+i*.71,r=10+flee+(i%3)*3,y=state.y+1.5+Math.sin(state.time*1.4+i)*3;
          diamond(a,r,y,.42,i%3?[.10,.62,.52]:[.54,.82,.26],Math.sin(state.time*.8+i)*4);
          diamond(a+.035,r,y-.25,.24,[.62,1,.75],Math.sin(state.time*.8+i)*4+1.1);
        }
        if(!lanternOn)for(let i=0;i<3;i++){const a=state.yaw+(i-1)*.42+Math.sin(state.time*.3+i)*.15;diamond(a,16+i*3,state.y+.5+i,.34,[.95,.22,.08],0);}
      }
      return new Float32Array(data);
    }

    if(realm===0) {
      for(let i=0;i<13;i++) {
        const a=i*.91+.3, y=state.y+25+hash(i,3)*18, w=5+hash(i,7)*8;
        quad(a,82+hash(i,5)*30,y,w,3.2,[.70,.82,.80]);
        quad(a,81+hash(i,5)*30,y+1.8,w*.58,3.8,[.78,.87,.84],-w*.28);
        quad(a,83+hash(i,5)*30,y+.8,w*.48,3.1,[.66,.79,.77],w*.35);
      }
      for(let i=0;i<11;i++) {
        const a=state.time*.16+i*.57,r=28+(i%4)*5,y=state.y+11+(i%3)*2;
        diamond(a,r,y,.55,[.035,.08,.065],Math.sin(state.time+i)*3);
        diamond(a+.025,r,y,.4,[.035,.08,.065],2.0+Math.sin(state.time+i)*3);
      }
    } else if(realm===1) {
      const sunAngle=-.72, sunY=state.y+39;
      for(let ring=0;ring<3;ring++) for(let i=0;i<14;i++) {
        const t=i/14*Math.PI*2, rr=4.8-ring*1.35;
        diamond(sunAngle,100,sunY+Math.sin(t)*rr,.9+ring*.14,[1,.67+.08*ring,.22],Math.cos(t)*rr);
      }
      for(let i=0;i<9;i++) {
        const a=i*1.23+.5, y=state.y+29+hash(i,4)*14;
        quad(a,88+hash(i,8)*25,y,8+hash(i,2)*11,1.05,[.81,.57,.32]);
        quad(a,89+hash(i,8)*25,y+1.3,5+hash(i,6)*7,.65,[.92,.70,.42],3);
      }
      for(let i=0;i<4;i++) {
        const a=state.time*.035+i*1.55,r=55+i*7,y=state.y+18+i*3;
        quad(a,r,y,4.5,1.2,[.18,.10,.055],Math.sin(state.time*.2+i)*8);
        diamond(a,r,y-1.1,.7,[.72,.39,.09],Math.sin(state.time*.2+i)*8);
      }
    } else if(realm===2) {
      for(let i=0;i<76;i++) {
        const a=hash(i,12)*Math.PI*2, y=state.y+17+hash(i,21)*48;
        diamond(a,92+hash(i,15)*25,y,.12+hash(i,8)*.25,[.80,.91,1],(hash(i,30)-.5)*24);
      }
      for(let i=0;i<16;i++) {
        const a=-1.65+i*.09, wave=Math.sin(i*.72+state.time*.22);
        quad(a,104,state.y+31+wave*5,3.8,18+wave*5,i%2?[.18,.62,.68]:[.35,.45,.72]);
      }
      for(let i=0;i<5;i++){const a=state.time*.025+i*1.25,r=65+i*4,y=state.y+24+Math.sin(state.time*.2+i)*4;quad(a,r,y,6,1.3,[.40,.63,.72],i*4);diamond(a,r,y,.8,[.68,.91,.95],i*4);}
    } else if(realm===3) {
      for(let i=0;i<60;i++) {
        const a=hash(i,41)*Math.PI*2, drift=Math.sin(state.time*(.2+hash(i,3)*.35)+i)*3;
        const y=state.y+8+hash(i,22)*42+drift;
        diamond(a,45+hash(i,9)*62,y,.14+hash(i,5)*.34,hash(i,6)>.55?[1,.24,.035]:[.27,.20,.16],(hash(i,17)-.5)*30);
      }
      for(let i=0;i<7;i++) quad(i*.98,100,state.y+31+hash(i,2)*12,13,2.2,[.28,.12,.09]);
    } else {
      for(let i=0;i<54;i++) {
        const a=hash(i,51)*Math.PI*2, y=state.y+6+hash(i,18)*35;
        diamond(a,32+hash(i,9)*68,y,.13+hash(i,4)*.32,hash(i,7)>.62?[.16,.92,.77]:[.08,.42,.45],(hash(i,13)-.5)*24);
      }
    }
    if(motionEnabled)for(const site of adventureSites) {
      if(site.realm!==state.realm||!completedActivities.has(site.name)||Math.hypot(state.x-site.x,state.z-site.z)>120)continue;
      for(let i=0;i<12;i++){const a=state.time*.28+i/12*Math.PI*2,r=5+Math.sin(state.time*.4+i)*1.2;diamond(a,r,terrainHeight(site.x,site.z)+5+Math.sin(a*2)*1.8,.28,[.36,1,.72],0);}
    }
    return new Float32Array(data);
  }

  function drawSky() {
    const sky=makeSky();
    if(skyMesh)disposeObject(skyMesh);
    const geometry=geometryFromInterleaved(sky),material=new THREE.MeshBasicMaterial({vertexColors:true,side:THREE.DoubleSide,transparent:true,opacity:.92,depthWrite:false,fog:false});
    skyMesh=new THREE.Mesh(geometry,material);skyMesh.userData.ownedMaterial=true;skyMesh.renderOrder=-10;dynamicGroup.add(skyMesh);
  }
  function makeWildlife(){
    const data=[],pcx=Math.floor(state.x/CHUNK),pcz=Math.floor(state.z/CHUNK);
    const raw=(p,c,n)=>data.push(...p,...c,...n);
    const tri=(a,b,c,col,n)=>{raw(a,col,n);raw(b,col,n);raw(c,col,n);};
    const box=(x,y,z,wx,hy,wz,col)=>{
      const a=[x-wx,y,z-wz],b=[x+wx,y,z-wz],c=[x+wx,y,z+wz],d=[x-wx,y,z+wz],e=[x-wx,y+hy,z-wz],f=[x+wx,y+hy,z-wz],g=[x+wx,y+hy,z+wz],h=[x-wx,y+hy,z+wz];
      tri(a,b,f,col,[0,0,-1]);tri(a,f,e,col,[0,0,-1]);tri(b,c,g,col,[1,0,0]);tri(b,g,f,col,[1,0,0]);tri(c,d,h,col,[0,0,1]);tri(c,h,g,col,[0,0,1]);tri(d,a,e,col,[-1,0,0]);tri(d,e,h,col,[-1,0,0]);tri(e,f,g,col,[0,1,0]);tri(e,g,h,col,[0,1,0]);
    };
    const pyramid=(x,y,z,w,h,col,leanX=0,leanZ=0)=>{
      const top=[x+leanX,y+h,z+leanZ],a=[x-w,y,z-w],b=[x+w,y,z-w],c=[x+w,y,z+w],d=[x-w,y,z+w];
      tri(a,b,top,col,[0,.3,-.9]);tri(b,c,top,col,[.9,.3,0]);tri(c,d,top,col,[0,.3,.9]);tri(d,a,top,col,[-.9,.3,0]);
    };
    let count=0;
    for(let dz=-3;dz<=3;dz++)for(let dx=-3;dx<=3;dx++){
      const cx=pcx+dx,cz=pcz+dz,spawn=hash(cx*73+state.realm*17,cz*91-state.realm*11);
      const alpine=state.realm===2&&crownwallRange(cx*CHUNK+CHUNK*.5,cz*CHUNK+CHUNK*.5)>.18;
      if(spawn<(alpine ? .44 : .72)||caveNetworkForChunk(cx,cz))continue;
      const herd=1+Math.floor(hash(cx*31,cz*47)*(alpine?4:2));
      for(let i=0;i<herd;i++){
        const homeX=cx*CHUNK+5+hash(cx*19+i*13,cz*7-i*3)*(CHUNK-10);
        const homeZ=cz*CHUNK+5+hash(cx*5-i*17,cz*23+i*11)*(CHUNK-10);
        const phase=hash(cx*41+i,cz*37-i)*Math.PI*2,species=Math.floor(hash(cx*59+i,cz*61-i)*3);
        let x=homeX+Math.sin(state.time*.18+phase)*5,z=homeZ+Math.cos(state.time*.14+phase)*4;
        if(waterAt(x,z)||interiorRooms.some(room=>room.realm===state.realm&&Math.hypot(x-room.x,z-room.z)<32))continue;
        const pd=Math.hypot(x-state.x,z-state.z),alarm=scannerOn?1:Math.hypot(state.vx,state.vz)>12&&pd<30?.72:lanternOn&&state.inCave?.35:0;
        if((alarm&&pd<48)||pd<5){const q=1/(pd||1),flee=alarm?(48-pd)*alarm:6-pd;x+=(x-state.x)*q*flee;z+=(z-state.z)*q*flee;}
        const y=terrainHeight(x,z),s=.38+hash(cx+i*2,cz-i*5)*.30,bob=Math.sin(state.time*3.2+phase)*.08;
        const palettes=[
          [[.18,.29,.12],[.34,.46,.18],[.10,.18,.08]],
          [[.48,.29,.10],[.68,.45,.18],[.30,.17,.07]],
          alpine?[[.66,.76,.74],[.88,.92,.88],[.42,.52,.54]]:[[.52,.65,.66],[.72,.82,.82],[.30,.42,.46]],
          [[.24,.09,.055],[.52,.16,.06],[.12,.06,.04]],
          [[.06,.28,.25],[.12,.55,.44],[.03,.14,.14]]
        ][state.realm],col=palettes[species],legLift=Math.abs(Math.sin(state.time*3+phase))*.25;
        box(x,y+.8*s+bob,z,1.65*s,1.15*s,.72*s,col);
        box(x,y+1.45*s+bob,z-1.25*s,.82*s,.85*s,.68*s,col.map(v=>v*1.08));
        for(const lx of [-1.05,1.05])for(const lz of [-.38,.38])box(x+lx*s,y+legLift*s,z+lz*s,.18*s,1.1*s,.18*s,palettes[2]);
        if(species===0){pyramid(x-.52*s,y+2.15*s,z-1.55*s,.18*s,1.05*s,palettes[1],-.35*s,-.2*s);pyramid(x+.52*s,y+2.15*s,z-1.55*s,.18*s,1.05*s,palettes[1],.35*s,-.2*s);}
        else if(species===1){pyramid(x,y+1.5*s,z+1.6*s,.28*s,1.5*s,palettes[2],0,.65*s);}
        else for(const ex of [-.38,.38])box(x+ex*s,y+1.85*s,z-1.95*s,.08*s,.08*s,.08*s,[.65,1,.82]);
        count++;
      }
    }
    return {data:new Float32Array(data),count};
  }
  function drawWildlife(){
    const fauna=makeWildlife();
    if(wildlifeMesh)disposeObject(wildlifeMesh);
    wildlifeMesh=new THREE.Mesh(geometryFromInterleaved(fauna.data),wildlifeMaterial);wildlifeMesh.castShadow=true;wildlifeMesh.receiveShadow=true;dynamicGroup.add(wildlifeMesh);
    document.querySelector("#wildlife-count").textContent=`FAUNA: ${fauna.count} NEARBY`;
    canvas.dataset.fauna=String(fauna.count);
  }

  function resize() {
    const d=Math.min(devicePixelRatio,1.7), w=Math.floor(innerWidth*d), h=Math.floor(innerHeight*d);
    if(canvas.width!==w||canvas.height!==h){renderer.setPixelRatio(d);renderer.setSize(innerWidth,innerHeight,false);camera.aspect=innerWidth/innerHeight;camera.updateProjectionMatrix();}
  }
  function draw() {
    resize();
    const realm=realms[state.realm], pulse=realm.cave ? Math.sin(state.time*.4)*.015 : 0;
    const network=caveNetworks.find(n=>n.realm===state.realm),caveTint=network?.color||[.035,.075,.085];
    const bob=state.grounded?Math.sin(state.bob)*Math.min(.075,Math.hypot(state.vx,state.vz)*.006):0;
    camera.position.set(state.x,state.y+bob,state.z);camera.rotation.set(state.pitch+bob*.16,state.yaw,0);
    const bg=state.inCave?caveTint.map(v=>v*.22):[realm.sky[0]+pulse,realm.sky[1]+pulse,realm.sky[2]+pulse];
    scene.background=new THREE.Color(...bg);scene.fog=new THREE.Fog(new THREE.Color(...(state.inCave?caveTint.map(v=>v*.45):realm.fog)),state.inCave?34:78,state.inCave?155:310);
    hemisphere.intensity=state.inCave?.62:1.25;sunLight.intensity=state.inCave?.34:3.1;
    sunLight.position.set(state.x-35,state.y+70,state.z+25);sunLight.target.position.set(state.x,state.y,state.z);scene.add(sunLight.target);
    lanternLight.intensity=lanternOn?46:state.inCave?5:0;lanternLight.position.set(state.x,state.y+.4,state.z);
    const lookX=-Math.sin(state.yaw)*Math.cos(state.pitch),lookY=-Math.sin(state.pitch),lookZ=-Math.cos(state.yaw)*Math.cos(state.pitch);
    lanternBeam.intensity=lanternOn?125:0;lanternBeam.position.set(state.x,state.y+.15,state.z);lanternBeam.target.position.set(state.x+lookX*18,state.y+lookY*18,state.z+lookZ*18);
    terrainMaterials.forEach((m,i)=>{m.emissive.setRGB(...(state.inCave&&i===state.realm?caveTint.map(v=>v*.22):[0,0,0]));m.emissiveIntensity=state.inCave?.55:0;});
    propMaterials.forEach((m,i)=>{m.emissive.setRGB(...(state.inCave&&i===state.realm?caveTint.map(v=>v*.34):[0,0,0]));m.emissiveIntensity=state.inCave?.7:0;});
    waterNormal.offset.set(state.time*.015,state.time*.009);waterMaterials[1].emissiveIntensity=1.8+Math.sin(state.time*2.1)*.45;
    drawSky();
    if(!state.inCave||state.realm===4)drawWildlife();
    else if(wildlifeMesh){disposeObject(wildlifeMesh);wildlifeMesh=null;}
    renderer.render(scene,camera);
  }

  function update(dt) {
    state.time+=dt;
    let padMoveX=0,padMoveY=0,padLookX=0,padLookY=0;
    const pad=navigator.getGamepads?.()[0];
    if(pad) {
      document.querySelector("#controller-state").textContent="INPUT: CONTROLLER";
      padMoveX=Math.abs(pad.axes[0])>.14?pad.axes[0]:0;padMoveY=Math.abs(pad.axes[1])>.14?pad.axes[1]:0;
      padLookX=Math.abs(pad.axes[2])>.12?pad.axes[2]:0;padLookY=Math.abs(pad.axes[3])>.12?pad.axes[3]:0;
      state.yaw-=padLookX*2.2*dt*sensitivity;state.pitch=Math.max(-1.42,Math.min(1.42,state.pitch-padLookY*1.8*dt*sensitivity));
      const pressed=pad.buttons.map(b=>b.pressed);
      if(pressed[0]&&!gamepadButtons[0])interact();
      if(pressed[2]&&!gamepadButtons[2])toggleScanner();
      if(pressed[3]&&!gamepadButtons[3])toggleLantern();
      if(pressed[9]&&!gamepadButtons[9])togglePause();
      gamepadButtons=pressed;
    } else document.querySelector("#controller-state").textContent="INPUT: KEYBOARD";
    const lookSpeed=1.65*dt;
    if(keys.ArrowLeft) state.yaw+=lookSpeed;
    if(keys.ArrowRight) state.yaw-=lookSpeed;
    if(keys.ArrowUp) state.pitch=Math.min(1.42,state.pitch+lookSpeed);
    if(keys.ArrowDown) state.pitch=Math.max(-1.42,state.pitch-lookSpeed);
    const sprinting=(keys.ShiftLeft||keys.ShiftRight)&&state.stamina>1;
    if(sprinting)state.stamina=Math.max(0,state.stamina-28*dt);
    else state.stamina=Math.min(100,state.stamina+17*dt);
    const waterHere=waterAt(state.x,state.z);
    const nearbyHazard=caveHazards.find(h=>h.realm===state.realm&&Math.hypot(state.x-h.x,state.z-h.z)<h.radius);
    const hazardSpeed=nearbyHazard?.type==="flood"?.52:nearbyHazard?.type==="frost"?.72:1;
    const speed=(sprinting?19:9.5)*(waterHere&&waterHere.kind!=="lava" ? .58 : 1)*(picksOn&&state.inCave?1.18:1)*hazardSpeed;
    let f=(keys.KeyW?1:0)-(keys.KeyS?1:0)-padMoveY, r=(keys.KeyD?1:0)-(keys.KeyA?1:0)+padMoveX;
    const inputAmount=Math.min(1,Math.hypot(f,r)),len=Math.hypot(f,r)||1; f/=len; r/=len;
    const previousX=state.x,previousZ=state.z;
    const desiredX=(-Math.sin(state.yaw)*f + Math.cos(state.yaw)*r)*speed*inputAmount;
    const desiredZ=(-Math.cos(state.yaw)*f - Math.sin(state.yaw)*r)*speed*inputAmount;
    const traction=state.grounded?1-Math.exp(-dt*12):1-Math.exp(-dt*2.4);
    state.vx=mix(state.vx,desiredX,traction);state.vz=mix(state.vz,desiredZ,traction);
    const currentSurface=terrainHeight(state.x,state.z);
    const canOccupy=(x,z)=>{
      if(state.inCave)return terrainDensity(x,state.y-1.05,z)<.18;
      return terrainHeight(x,z)-currentSurface<(picksOn?2.5:1.25);
    };
    const nextX=state.x+state.vx*dt;if(canOccupy(nextX,state.z))state.x=nextX;else state.vx*=.12;
    const nextZ=state.z+state.vz*dt;if(canOccupy(state.x,nextZ))state.z=nextZ;else state.vz*=.12;
    state.bob+=Math.hypot(state.vx,state.vz)*dt*(sprinting?1.05:.82);
    if(inputAmount>.1&&state.grounded) {
      footstepTimer-=dt;if(footstepTimer<=0){sound(state.realm===2?180:state.realm===3?95:125,.08,"triangle",.018,(Math.random()-.5)*.4);footstepTimer=sprinting ? .24 : .42;}
    }
    environmentTimer-=dt;if(environmentTimer<=0&&audioCtx) {
      const envFreq=[520,230,740,110,360][state.realm]+Math.random()*90;
      sound(envFreq,1.8,state.realm===3?"sawtooth":"sine",.012,(Math.random()-.5)*1.8);
      environmentTimer=2.8+Math.random()*5;
    }
    let surfaceY=terrainHeight(state.x,state.z);
    let caveFloor=caveFloorAt(state.x,state.z);
    const openMouth=!!caveFloor&&terrainDensity(state.x,surfaceY-.45,state.z)<-.12;
    if(!state.inCave&&openMouth&&state.y<surfaceY+3.6)state.inCave=true;
    if(state.inCave&&!caveFloor)state.inCave=false;
    if(state.inCave&&caveFloor&&terrainDensity(state.x,Math.max(caveFloor.floor+1.1,state.y-1.15),state.z)>.15){
      state.x=previousX;state.z=previousZ;
      surfaceY=terrainHeight(state.x,state.z);
      caveFloor=caveFloorAt(state.x,state.z);
      if(!caveFloor)state.inCave=false;
    }
    const ground=((state.inCave&&caveFloor)?caveFloor.floor:surfaceY)+2.25;
    state.coyote=state.grounded?.11:Math.max(0,state.coyote-dt);
    state.vy-=25*dt; state.y+=state.vy*dt;
    if(state.y<=ground){state.y=ground;state.vy=0;state.grounded=true;state.coyote=.11;} else state.grounded=false;
    if(!state.inCave&&(!waterHere||waterHere.kind!=="lava"))lastSafe={x:state.x,z:state.z,realm:state.realm};
    if(waterHere&&waterHere.kind==="lava"&&state.y<waterHere.level+3.5) {
      state.x=lastSafe.x;state.z=lastSafe.z;state.vy=7;
      showNotice("THE LAVA REJECTS YOU · RETURNED TO SAFE GROUND",3);
    }
    const mastery=recoveredObjectives.size===4?.55:1;
    const airDrain=state.inCave?(nearbyHazard?.type==="gas"?8:nearbyHazard?.type==="flood"?5:.32)*mastery:-9;
    state.air=Math.max(0,Math.min(100,state.air-airDrain*dt));
    const hazardAlert=document.querySelector("#hazard-alert");
    if(nearbyHazard){
      const hazardName={gas:"SPORE GAS",flood:"RISING WATER",frost:"KILLING COLD",lava:"MAGMA HEAT",collapse:"UNSTABLE CEILING"}[nearbyHazard.type];
      const agitation=nearbyHazard.type==="collapse"&&sprinting?38:nearbyHazard.type==="collapse"?18:nearbyHazard.type==="lava"?25:16;
      state.hazard=Math.min(100,state.hazard+dt*agitation);
      document.querySelector("#tool-picks").classList.add("warning");
      if(nearbyHazard.type==="frost"||nearbyHazard.type==="lava")state.stamina=Math.max(0,state.stamina-(picksOn?3:9)*dt);
      if(nearbyHazard.type==="collapse"&&Math.hypot(f,r)>.1&&Math.sin(state.time*3)>0.96)sound(72,.7,"sawtooth",.06);
      canvas.dataset.hazard=hazardName;
      canvas.classList.add("threat");
      hazardAlert.classList.remove("hidden");document.querySelector("#hazard-name").textContent=hazardName;
    }else{state.hazard=Math.max(0,state.hazard-dt*35);document.querySelector("#tool-picks").classList.remove("warning");canvas.dataset.hazard="clear";if(state.hazard<=0){hazardAlert.classList.add("hidden");canvas.classList.remove("threat");}}
    document.querySelector("#hazard-bar").style.width=`${state.hazard}%`;
    if(state.hazard>=100){state.x=lastSafe.x;state.z=lastSafe.z;state.realm=lastSafe.realm;state.hazard=0;state.air=Math.max(35,state.air);state.inCave=false;showNotice("ENVIRONMENTAL LIMIT EXCEEDED · SUIT RECALL",4);}
    if(state.air<=0){state.x=lastSafe.x;state.z=lastSafe.z;state.realm=lastSafe.realm;state.air=45;state.vy=4;state.inCave=false;showNotice("AIR RESERVE FAILED · EMERGENCY RECALL",4);}
    if(state.inCave&&(!surveyed.length||Math.hypot(state.x-surveyed[surveyed.length-1].x,state.z-surveyed[surveyed.length-1].z)>3))surveyed.push({x:state.x,z:state.z,realm:state.realm});
    streamChunks();
    const alt=Math.round(state.y), altText=alt<0?`-${Math.abs(alt).toString().padStart(2,"0")}`:alt.toString().padStart(3,"0");
    document.querySelector("#altitude").textContent=`ALT ${altText}`;
    document.querySelector("#coords").textContent=`X ${Math.round(state.x)} · Z ${Math.round(state.z)}`;
    document.querySelector("#chunks").textContent=`STREAM ${chunks.size}`;
    updateCompass();
    document.querySelector("#stamina-bar").style.width=`${state.stamina}%`;
    document.querySelector("#air-bar").style.width=`${state.air}%`;
    document.querySelector("#lore-count").textContent=String(state.lore).padStart(3,"0");
    canvas.dataset.camera=`${state.yaw.toFixed(3)},${state.pitch.toFixed(3)}`;
    canvas.dataset.density=terrainDensity(state.x,state.y,state.z).toFixed(3);
    canvas.dataset.caveFloor=caveFloor?caveFloor.floor.toFixed(2):"surface";
    canvas.dataset.caveMode=state.inCave?"cave":"surface";
    canvas.dataset.velocity=`${state.vx.toFixed(2)},${state.vz.toFixed(2)}`;
    canvas.dataset.wildlife=state.inCave?(scannerOn?"fleeing-scanner":lanternOn?"circling-lantern":sprinting?"startled":"watching"):(scannerOn?"scattering":sprinting?"startled":"foraging");
    const realmLocations=[...locations.filter(p=>p.realm===state.realm),...caveDiscoveries.filter(p=>p.realm===state.realm),...frontierSites.filter(p=>p.realm===state.realm)];
    let plaqueTarget=null, plaqueDistance=Infinity;
    for(const poi of realmLocations) {
      const distance=Math.hypot(state.x-poi.x,state.z-poi.z);
      if(distance<plaqueDistance){plaqueDistance=distance;plaqueTarget=poi;}
      const isDeep=poi.kind==="DEEP DISCOVERY"||poi.kind==="EXPEDITION TREASURE",isFrontier=frontierSites.includes(poi);
      const found=isDeep?recoveredCave.has(poi.name):isFrontier?recoveredFrontier.has(poi.name):discoveries.has(poi.name);
      if(!found && distance<9) {
        if(isDeep)recoveredCave.add(poi.name);else if(isFrontier)recoveredFrontier.add(poi.name);else discoveries.add(poi.name);
        state.lore+=isFrontier?30:poi.kind==="EXPEDITION TREASURE"?25:poi.kind==="DEEP DISCOVERY"?18:10;saveProgress();discoveryChord();
        if(mapOpen)renderMap();
        showNotice(`DISCOVERED: <b>${poi.name}</b><br>${poi.story}`,7);
      }
    }
    const plaque=document.querySelector("#plaque");
    if(plaqueTarget && plaqueDistance<19) {
      plaque.classList.remove("hidden");
      document.querySelector("#plaque-name").textContent=plaqueTarget.name;
      document.querySelector("#plaque-kind").textContent=plaqueTarget.kind;
      document.querySelector("#plaque-coords").textContent=`X ${plaqueTarget.x} · Z ${plaqueTarget.z}`;
      document.querySelector("#plaque-story").textContent=plaqueTarget.story;
    } else plaque.classList.add("hidden");
    const unknownDiscoveries=realmLocations.filter(p=>{
      if(frontierSites.includes(p))return !recoveredFrontier.has(p.name);
      return !(p.kind==="DEEP DISCOVERY"||p.kind==="EXPEDITION TREASURE"?recoveredCave.has(p.name):discoveries.has(p.name));
    }).map(p=>({...p,targetKind:p.kind,targetFound:false}));
    const unknownActivities=adventureSites.filter(p=>p.realm===state.realm&&!completedActivities.has(p.name)).map(p=>({...p,targetKind:"WORLD ACTIVITY",targetFound:false}));
    const caveSignals=caveNetworks.filter(n=>n.realm===state.realm).map(n=>({
      x:n.points[0][0],z:n.points[0][1],name:n.name,targetKind:"WALK-IN CAVE",targetFound:false
    }));
    const candidates=[...unknownDiscoveries,...unknownActivities,...caveSignals].sort((a,b)=>Math.hypot(state.x-a.x,state.z-a.z)-Math.hypot(state.x-b.x,state.z-b.z));
    const knownFallback=realmLocations.map(p=>({...p,targetKind:p.kind,targetFound:true})).sort((a,b)=>Math.hypot(state.x-a.x,state.z-a.z)-Math.hypot(state.x-b.x,state.z-b.z));
    const finaleReady=discoveries.size===15&&completedActivities.size===15;
    const echoTargets=worldheartSeen?postgameEchoes.filter(e=>e.realm===state.realm&&!recoveredEchoes.has(e.name)).map(e=>({...e,targetKind:"POSTGAME ECHO",targetFound:false})):[];
    const frontierTargets=frontierSites.filter(e=>e.realm===state.realm&&!recoveredFrontier.has(e.name)).map(e=>({...e,targetKind:e.kind,targetFound:false})).sort((a,b)=>Math.hypot(state.x-a.x,state.z-a.z)-Math.hypot(state.x-b.x,state.z-b.z));
    const target=finaleReady&&!worldheartSeen&&state.realm===4?{...worldheart,targetFound:false}:echoTargets[0]||(worldheartSeen?frontierTargets[0]:candidates[0])||knownFallback[0];
    if(target) {
      const dx=target.x-state.x,dz=target.z-state.z,dist=Math.round(Math.hypot(dx,dz));
      const targetAngle=Math.atan2(-dx,-dz), relative=((targetAngle-state.yaw+Math.PI*3)%(Math.PI*2))-Math.PI;
      const arrow=Math.abs(relative)<.35?"↑":relative>0?(relative>2.5?"↓":"←"):(relative<-2.5?"↓":"→");
      const progress=frontierSites.some(f=>f.name===target.name)?`${recoveredFrontier.size}/${FRONTIER_TOTAL} FRONTIERS`:postgameEchoes.some(e=>e.name===target.name)?`${recoveredEchoes.size}/${ECHO_TOTAL} ECHOES`:`${discoveries.size+completedActivities.size}/30`;
      document.querySelector("#signal").textContent=(target.targetFound?"KNOWN: ":"SIGNAL: ")+target.name;
      document.querySelector("#bearing").textContent=`${arrow} ${dist}m · ${target.targetKind} · ${progress}`;
      if(scannerOn) {
        document.querySelector("#bearing").textContent=`${arrow} ${dist}m · X ${Math.round(target.x)} Z ${Math.round(target.z)} · ${target.targetKind}`;
        scannerPulse-=dt;if(scannerPulse<=0){sound(300+Math.max(0,900-dist*5),.09,"sine",.035,Math.max(-1,Math.min(1,relative)));scannerPulse=Math.max(.16,Math.min(1.2,dist/90));}
      }
    }
    // Activities and tunnel gates become available at close range.
    activeInteractable=null;
    let activeDistance=Infinity;
    for(const site of adventureSites) {
      if(site.realm!==state.realm)continue;
      const d=Math.hypot(state.x-site.x,state.z-site.z);
      if(d<13&&!knownActivities.has(site.name)){knownActivities.add(site.name);saveProgress();}
      if(d<13&&d<activeDistance){activeDistance=d;activeInteractable={kind:"activity",data:site};}
    }
    for(const room of interiorRooms) {
      if(room.realm!==state.realm)continue;
      const entryDistance=Math.hypot(state.x-room.entryX,state.z-room.entryZ);
      const exitDistance=Math.hypot(state.x-room.x,state.z-(room.z+11.5));
      if(entryDistance<8&&entryDistance<activeDistance){activeDistance=entryDistance;activeInteractable={kind:"roomEntry",data:room};}
      if(exitDistance<7&&exitDistance<activeDistance){activeDistance=exitDistance;activeInteractable={kind:"roomExit",data:room};}
    }
    for(const objective of caveObjectives){
      if(objective.realm!==state.realm||recoveredObjectives.has(objective.name))continue;
      const d=Math.hypot(state.x-objective.x,state.z-objective.z);
      if(d<8&&d<activeDistance){activeDistance=d;activeInteractable={kind:"caveObjective",data:objective};}
    }
    for(const echo of postgameEchoes){
      if(!worldheartSeen||echo.realm!==state.realm||recoveredEchoes.has(echo.name))continue;
      const d=Math.hypot(state.x-echo.x,state.z-echo.z);
      if(d<10&&d<activeDistance){activeDistance=d;activeInteractable={kind:"echo",data:echo};}
    }
    if(finaleReady&&!worldheartSeen&&state.realm===4) {
      const d=Math.hypot(state.x-worldheart.x,state.z-worldheart.z);
      if(d<14&&d<activeDistance)activeInteractable={kind:"finale",data:worldheart};
    }
    const interaction=document.querySelector("#interaction");
    if(activeInteractable&&!journalOpen) {
      interaction.classList.remove("hidden");
      document.querySelector("#interaction-text").textContent=activeInteractable.kind==="portal"
        ?`ENTER ${activeInteractable.data.name}`
        :activeInteractable.kind==="roomEntry"?`ENTER ${activeInteractable.data.name}`
        :activeInteractable.kind==="roomExit"?"RETURN OUTSIDE"
        :activeInteractable.kind==="caveObjective"?`RECOVER ${activeInteractable.data.name}`
        :activeInteractable.kind==="echo"?`LISTEN TO ${activeInteractable.data.name}`
        :activeInteractable.kind==="finale"?"REMEMBER THE WORLD"
        :(completedActivities.has(activeInteractable.data.name)?"REVISIT MEMORY":activeInteractable.data.activity.toUpperCase());
    } else interaction.classList.add("hidden");

    const activityCount=completedActivities.size,deepCount=recoveredObjectives.size;
    const questTitle=document.querySelector("#quest-title"),questText=document.querySelector("#quest-text");
    if(worldheartSeen&&recoveredEchoes.size<ECHO_TOTAL){questTitle.textContent="THE WORLD AFTER";questText.textContent=`The Worldheart awakened ${ECHO_TOTAL-recoveredEchoes.size} remaining echoes across the realms.`;}
    else if(worldheartSeen&&recoveredFrontier.size<FRONTIER_TOTAL){questTitle.textContent="THE FAR HORIZONS";questText.textContent=`${FRONTIER_TOTAL} frontier signals lie far beyond the old expedition radius. ${FRONTIER_TOTAL-recoveredFrontier.size} remain.`;}
    else if(worldheartSeen){questTitle.textContent="THE OPEN ROAD";questText.textContent="Every echo and distant frontier has answered. The living systems continue without an ending.";}
    else if(state.inCave&&deepCount<4){questTitle.textContent="BENEATH FOUR WORLDS";questText.textContent=`Recover ${4-deepCount} remaining deep keys. Use M to chart, R to mark, X for rope.`;}
    else if(deepCount===4){questTitle.textContent="MASTER SPELUNKER";questText.textContent="All deep keys recovered. Your air reserve and climbing speed are permanently enhanced.";}
    else if(activityCount===0){questTitle.textContent="THE WORLD REMEMBERS";questText.textContent="Find a constructed place and answer its invitation.";}
    else if(activityCount<5){questTitle.textContent="FIVE AWAKENINGS";questText.textContent=`Awaken ${5-activityCount} more world sites to reveal the deeper route.`;}
    else if(discoveries.size<15){questTitle.textContent="THE COMPLETE ARCHIVE";questText.textContent=`Recover ${15-discoveries.size} remaining field discoveries.`;}
    else if(activityCount<15){questTitle.textContent="KEEPER OF THE STREAM";questText.textContent=`Complete ${15-activityCount} remaining world rituals.`;}
    else{questTitle.textContent="THE THIRTY-FIRST MEMORY";questText.textContent="Descend to the Hollow. The Worldheart is waiting.";}
    document.querySelector("#quest-progress i").style.width=`${Math.min(100,(activityCount+discoveries.size)/30*100)}%`;
    if(noticeTimer>0){noticeTimer-=dt;if(noticeTimer<=0)document.querySelector("#notice").classList.remove("show");}
  }
  function loop(now) {
    const dt=Math.min(.04,(now-last)/1000); last=now;
    if(hasEntered&&!paused&&!journalOpen&&!mapOpen&&!puzzleOpen)update(dt);
    draw(); requestAnimationFrame(loop);
  }

  function travelTo(realmIndex,x,z,label) {
    state.realm=realmIndex;state.x=x;state.z=z;state.y=terrainHeight(x,z,realms[realmIndex])+5;state.vy=0;
    state.vx=0;state.vz=0;state.yaw=0;state.pitch=-.08;state.inCave=false;state.air=100;lastSafe={x,z,realm:realmIndex};
    clearChunks();
    document.querySelector("#biome").textContent=realms[realmIndex].name;
    tuneAudio();
    showNotice(`PASSAGE COMPLETE · <b>${label}</b>`,4);
  }
  function interact() {
    if(!activeInteractable||journalOpen)return;
    if(activeInteractable.kind==="portal") {
      const p=activeInteractable.data;
      travelTo(p.toRealm,p.toX,p.toZ,p.name);
      return;
    }
    if(activeInteractable.kind==="roomEntry") {
      const r=activeInteractable.data;travelTo(r.realm,r.x,r.z+8,r.name);return;
    }
    if(activeInteractable.kind==="roomExit") {
      const r=activeInteractable.data;travelTo(r.realm,r.returnX,r.returnZ,`${r.name} EXIT`);return;
    }
    if(activeInteractable.kind==="caveObjective"){
      const objective=activeInteractable.data;recoveredObjectives.add(objective.name);state.lore+=40;
      if(recoveredObjectives.size===4){state.air=100;showNotice("<b>MASTER SPELUNKER</b><br>All four deep keys resonate. Air reserves and subterranean movement permanently enhanced.",8);}
      else showNotice(`<b>${objective.name} RECOVERED</b><br>${recoveredObjectives.size}/4 DEEP KEYS · +40 LORE`,6);
      saveProgress();discoveryChord();clearChunks();return;
    }
    if(activeInteractable.kind==="echo"){
      const echo=activeInteractable.data;recoveredEchoes.add(echo.name);state.lore+=30;saveProgress();discoveryChord();
      showNotice(`<b>${echo.name}</b><br>${echo.story}<br><small>${recoveredEchoes.size}/5 POSTGAME ECHOES · +30 LORE</small>`,8);
      clearChunks();return;
    }
    if(activeInteractable.kind==="finale"){triggerEnding();return;}
    const site=activeInteractable.data;
    if(completedActivities.has(site.name)){showNotice(`<b>MEMORY REVISITED</b><br>${site.lore}`,6);return;}
    openPuzzle(site);
  }
  function openPuzzle(site) {
    const session=++ritualSession;
    puzzleOpen=true;document.querySelector("#puzzle").classList.remove("hidden");
    document.querySelector("#puzzle-title").textContent=site.name;
    document.querySelector("#puzzle-kicker").textContent="OBSERVATION RITUAL";
    const glyphs=["◇","△","○","✦"],seed=[...site.type].reduce((a,c)=>a+c.charCodeAt(0),0);
    const sequence=Array.from({length:4},(_,i)=>(seed+i*i*3+i*7)%glyphs.length);
    const sequenceEl=document.querySelector("#ritual-sequence"),options=document.querySelector("#puzzle-options");
    sequenceEl.classList.remove("hidden");sequenceEl.innerHTML=sequence.map((v,i)=>`<span data-step="${i}">${glyphs[v]}</span>`).join("");
    options.innerHTML="";document.querySelector("#puzzle-prompt").textContent="Observe the site's pulse. When it fades, return the pattern in order.";
    const completeRitual=()=>{
      puzzleOpen=false;document.querySelector("#puzzle").classList.add("hidden");sequenceEl.classList.add("hidden");
      completedActivities.add(site.name);state.lore+=site.reward;saveProgress();discoveryChord();
      showNotice(`<b>${site.name} AWAKENED</b><br>${site.lore}<br><small>+${site.reward} LORE</small>`,8);
      clearChunks();
      if(completedActivities.size===15&&discoveries.size===15)showNotice("A THIRTY-FIRST SIGNAL HAS APPEARED IN THE DEEPEST HOLLOW",7);
      if(hasEntered)canvas.requestPointerLock();
    };
    let reveal=0,input=0,revealTimer=setInterval(()=>{
      if(session!==ritualSession){clearInterval(revealTimer);return;}
      [...sequenceEl.children].forEach((el,i)=>el.classList.toggle("seen",i===reveal));
      sound(360+sequence[reveal]*125,.18,"sine",.045);reveal++;
      if(reveal>=sequence.length){clearInterval(revealTimer);setTimeout(()=>{
        [...sequenceEl.children].forEach(el=>el.classList.remove("seen"));document.querySelector("#puzzle-prompt").textContent="Return the observed pulse.";
        glyphs.forEach((glyph,index)=>{
          const b=document.createElement("button");b.textContent=glyph;b.style.textAlign="center";b.style.fontSize="20px";
          b.addEventListener("click",()=>{
            if(index===sequence[input]){
              sequenceEl.children[input].classList.add("correct");sound(480+input*90,.16,"sine",.055);input++;
              if(input===sequence.length)completeRitual();
            }else{
              input=0;[...sequenceEl.children].forEach(el=>el.classList.remove("correct"));sound(105,.35,"sawtooth",.06);
              document.querySelector("#puzzle-prompt").textContent="The pattern breaks. Observe the carved glyphs and begin again.";
            }
          });options.appendChild(b);
        });
      },500);}
    },560);
    if(document.pointerLockElement===canvas)document.exitPointerLock();
  }
  function triggerEnding() {
    const fullArchive=discoveries.size===15&&recoveredCave.size===8,master=recoveredObjectives.size===4,rituals=completedActivities.size;
    const title=fullArchive&&master&&rituals===15?"THE WITNESS OF FIVE WORLDS":master?"THE DEEP PATHFINDER":"THE LISTENER";
    document.querySelector("#ending-text").textContent=fullArchive
      ?"Every place was seen, every deep memory carried home, and every sleeping structure answered your hands. The Worldheart does not call you conqueror. It calls you witness."
      :"The Worldheart remembers what you found—and leaves the unseen paths open behind you.";
    document.querySelector("#ending-title").textContent=title;
    document.querySelector("#ending-stats").innerHTML=`<span><b>${discoveries.size+recoveredCave.size}</b>MEMORIES</span><span><b>${rituals}</b>AWAKENINGS</span><span><b>${recoveredObjectives.size}</b>DEEP KEYS</span>`;
    worldheartSeen=true;saveProgress();document.querySelector("#ending").classList.remove("hidden");discoveryChord();
    showNotice("POSTGAME ECHOES HAVE AWAKENED ACROSS ALL FIVE REALMS",6);
    if(document.pointerLockElement===canvas)document.exitPointerLock();
  }
  function renderJournal() {
    const grid=document.querySelector("#journal-grid");
    grid.innerHTML=[...locations,...caveDiscoveries,...frontierSites].map((p,i)=>{
      const found=frontierSites.includes(p)?recoveredFrontier.has(p.name):p.kind==="DEEP DISCOVERY"||p.kind==="EXPEDITION TREASURE"?recoveredCave.has(p.name):discoveries.has(p.name);
      return `<article class="journal-card ${found?"found":""}">
        <small>${realms[p.realm].name} · ${p.kind}</small>
        <h3>${found?p.name:"UNRECOVERED SIGNAL "+String(i+1).padStart(2,"0")}</h3>
        <p>${found?p.story:"The archive remains encrypted until this site is reached."}</p>
      </article>`;
    }).join("");
    document.querySelector("#journal-score").textContent=`${discoveries.size} / 15 SITES · ${recoveredCave.size} / 8 DEEP · ${recoveredFrontier.size} / ${FRONTIER_TOTAL} FRONTIERS · ${recoveredEchoes.size} / ${ECHO_TOTAL} ECHOES`;
    document.querySelector("#journal-summary").textContent=completedActivities.size===15&&discoveries.size===15
      ?"You did not conquer these worlds. You listened until they trusted you."
      :`${state.lore} lore recovered. ${30-discoveries.size-completedActivities.size} mysteries remain.`;
  }
  function toggleJournal(force) {
    journalOpen=force===undefined?!journalOpen:force;
    const el=document.querySelector("#journal");
    if(journalOpen){renderJournal();el.classList.remove("hidden");if(document.pointerLockElement===canvas)document.exitPointerLock();}
    else{el.classList.add("hidden");if(hasEntered)canvas.requestPointerLock();}
  }
  function renderMap(){
    const map=document.querySelector("#map-canvas"),ctx=map.getContext("2d"),w=map.width,h=map.height;
    ctx.fillStyle="#020708";ctx.fillRect(0,0,w,h);
    const network=caveNetworks.find(n=>n.realm===state.realm);
    const realmMapSites=[
      ...locations.filter(p=>p.realm===state.realm).map(p=>({...p,mapType:"discovery",found:discoveries.has(p.name)})),
      ...adventureSites.filter(p=>p.realm===state.realm).map(p=>({...p,mapType:"activity",found:knownActivities.has(p.name)||completedActivities.has(p.name)})),
      ...caveDiscoveries.filter(p=>p.realm===state.realm).map(p=>({...p,mapType:"deep",found:recoveredCave.has(p.name)})),
      ...caveObjectives.filter(p=>p.realm===state.realm).map(p=>({...p,mapType:"key",found:recoveredObjectives.has(p.name)})),
      ...frontierSites.filter(p=>p.realm===state.realm).map(p=>({...p,mapType:"frontier",found:recoveredFrontier.has(p.name)})),
      ...(worldheartSeen?postgameEchoes.filter(p=>p.realm===state.realm).map(p=>({...p,mapType:"echo",found:recoveredEchoes.has(p.name)})):[]),
      ...(discoveries.size===15&&completedActivities.size===15&&worldheart.realm===state.realm?[{...worldheart,mapType:"heart",found:worldheartSeen}]:[]),
      ...caveNetworks.filter(n=>n.realm===state.realm).map(n=>({x:n.points[0][0],z:n.points[0][1],name:n.name,mapType:"gate",found:true})),
      ...portals.filter(p=>p.realm===state.realm).map(p=>({...p,mapType:"gate",found:true}))
    ];
    const cavePathPoints=network?resolvedCavePaths(network).flat().map(p=>({x:p[0],z:p[2]})):[];
    const route=surveyed.filter(p=>p.realm===state.realm);
    const markers=trailMarkers.filter(p=>p.realm===state.realm);
    const extents=[{x:state.x,z:state.z},...route,...markers,...realmMapSites,...cavePathPoints];
    let minX=Math.min(...extents.map(p=>p.x))-60,maxX=Math.max(...extents.map(p=>p.x))+60,minZ=Math.min(...extents.map(p=>p.z))-60,maxZ=Math.max(...extents.map(p=>p.z))+60;
    const span=Math.max(maxX-minX,maxZ-minZ,180),cx=(minX+maxX)/2,cz=(minZ+maxZ)/2;
    minX=cx-span/2;maxX=cx+span/2;minZ=cz-span/2;maxZ=cz+span/2;
    const project=(x,z)=>[35+(x-minX)/(maxX-minX)*(w-70),35+(z-minZ)/(maxZ-minZ)*(h-70)];
    ctx.strokeStyle="#0c2825";ctx.lineWidth=1;for(let i=0;i<12;i++){ctx.beginPath();ctx.moveTo(i*w/12,0);ctx.lineTo(i*w/12,h);ctx.stroke();ctx.beginPath();ctx.moveTo(0,i*h/12);ctx.lineTo(w,i*h/12);ctx.stroke();}
    ctx.fillStyle="#07110f";ctx.fillRect(18,16,214,30);ctx.strokeStyle="#12362f";ctx.strokeRect(18,16,214,30);ctx.fillStyle="#7aa497";ctx.font="10px system-ui";ctx.fillText(`${realms[state.realm].name} COMPLETE CHART`,30,35);
    ctx.strokeStyle="#3c9c82";ctx.lineWidth=5;ctx.lineCap="round";ctx.beginPath();
    route.forEach((p,i)=>{const [x,y]=project(p.x,p.z);if(i)ctx.lineTo(x,y);else ctx.moveTo(x,y);});ctx.stroke();
    if(network){ctx.setLineDash([5,9]);ctx.strokeStyle="#214b43";ctx.lineWidth=2;for(const path of resolvedCavePaths(network)){ctx.beginPath();path.forEach((p,i)=>{const q=project(p[0],p[2]);i?ctx.lineTo(...q):ctx.moveTo(...q)});ctx.stroke();}ctx.setLineDash([]);}
    const dot=(x,z,color,r)=>{const p=project(x,z);ctx.fillStyle=color;ctx.shadowColor=color;ctx.shadowBlur=12;ctx.beginPath();ctx.arc(p[0],p[1],r,0,Math.PI*2);ctx.fill();ctx.shadowBlur=0;return p;};
    const markerMeta={
      discovery:{color:"#5be69e",icon:"◆",label:"SITE"},
      activity:{color:"#71ccff",icon:"✦",label:"RITUAL"},
      deep:{color:"#39f0d2",icon:"⬢",label:"DEEP"},
      key:{color:"#b76cff",icon:"♦",label:"KEY"},
      frontier:{color:"#ff9d3b",icon:"⚑",label:"FRONTIER"},
      echo:{color:"#d972ff",icon:"◎",label:"ECHO"},
      heart:{color:"#ffffff",icon:"✹",label:"HEART"},
      gate:{color:"#ffd36a",icon:"▲",label:"GATE"}
    };
    const drawMapSite=(site)=>{
      const meta=markerMeta[site.mapType]||markerMeta.discovery, p=project(site.x,site.z);
      ctx.save();
      ctx.shadowColor=meta.color;ctx.shadowBlur=site.found?14:9;
      ctx.fillStyle=site.found?meta.color:"rgba(255,255,255,.08)";
      ctx.strokeStyle=meta.color;ctx.lineWidth=site.found?2:1.6;
      ctx.beginPath();ctx.arc(p[0],p[1],site.found?8:5.5,0,Math.PI*2);site.found?ctx.fill():ctx.stroke();
      ctx.shadowBlur=0;ctx.fillStyle=site.found?"#02110d":meta.color;
      ctx.font=`${site.found?13:10}px system-ui`;ctx.textAlign="center";ctx.textBaseline="middle";
      ctx.fillText(site.found?meta.icon:"?",p[0],p[1]+.5);
      if(site.found){
        ctx.textAlign="left";ctx.textBaseline="alphabetic";ctx.font="9px system-ui";
        ctx.fillStyle="#cde7dd";ctx.shadowColor="#020708";ctx.shadowBlur=4;
        ctx.fillText(site.name,p[0]+11,p[1]-10);
      }
      ctx.restore();
    };
    realmMapSites.sort((a,b)=>(a.found===b.found?0:a.found?1:-1)).forEach(drawMapSite);
    markers.forEach(p=>dot(p.x,p.z,"#ffbd4a",6));
    const you=dot(state.x,state.z,"#ffffff",7),fx=-Math.sin(state.yaw),fz=-Math.cos(state.yaw),vLen=30;
    ctx.save();
    ctx.strokeStyle="#ffffff";ctx.fillStyle="#ffffff";ctx.shadowColor="#ffffff";ctx.shadowBlur=10;ctx.lineWidth=2.5;ctx.lineCap="round";
    const tx=you[0]+fx*vLen,ty=you[1]+fz*vLen,ang=Math.atan2(fz,fx);
    ctx.beginPath();ctx.moveTo(you[0],you[1]);ctx.lineTo(tx,ty);ctx.stroke();
    ctx.beginPath();ctx.moveTo(tx,ty);ctx.lineTo(tx-Math.cos(ang-.55)*9,ty-Math.sin(ang-.55)*9);ctx.lineTo(tx-Math.cos(ang+.55)*9,ty-Math.sin(ang+.55)*9);ctx.closePath();ctx.fill();
    ctx.shadowBlur=0;ctx.font="9px system-ui";ctx.fillStyle="#eafff7";ctx.fillText(`${String(Math.round(headingDegrees())).padStart(3,"0")}° ${compassName(headingDegrees())}`,you[0]+12,you[1]+18);
    ctx.restore();
    const legend=[["#fff","➤ YOU"],["#5be69e","◆ SITE"],["#71ccff","✦ RITUAL"],["#39f0d2","⬢ DEEP"],["#b76cff","♦ KEY"],["#ff9d3b","⚑ FRONTIER"],["#d972ff","◎ ECHO"],["#ffd36a","▲ GATE"],["#888","? UNKNOWN"]];
    ctx.font="9px system-ui";ctx.textBaseline="middle";
    legend.forEach((l,i)=>{const x=28+(i%5)*88,y=h-32+Math.floor(i/5)*14;ctx.fillStyle=l[0];ctx.fillText(l[1],x,y);});
    const explored=Math.min(100,Math.round(route.length/42*100)),foundCount=realmMapSites.filter(p=>p.found&&p.mapType!=="gate").length,totalCount=realmMapSites.filter(p=>p.mapType!=="gate").length;
    document.querySelector("#map-status").textContent=`${explored}% CHARTED · ${foundCount}/${totalCount} LOCATIONS · ${markers.length} BEACONS`;
  }
  function toggleMap(force){
    mapOpen=force===undefined?!mapOpen:force;document.querySelector("#survey-map").classList.toggle("hidden",!mapOpen);
    document.querySelector("#tool-map").classList.toggle("active",mapOpen);
    if(mapOpen){renderMap();if(document.pointerLockElement===canvas)document.exitPointerLock();}else if(hasEntered)canvas.requestPointerLock();
  }
  function refreshMarkerHud(){
    const remaining=Math.max(0,6-trailMarkers.filter(p=>p.realm===state.realm).length);
    document.querySelector("#tool-marker").textContent=`R BEACON · ${remaining}`;
  }
  function toggleMarker(){
    const nearbyIndex=trailMarkers.findIndex(p=>p.realm===state.realm&&Math.hypot(state.x-p.x,state.z-p.z)<6.5);
    if(nearbyIndex>=0){
      trailMarkers.splice(nearbyIndex,1);
      refreshMarkerHud();saveProgress();sound(220,.28,"triangle",.07);showNotice("TRAIL BEACON RECOVERED",2.5);
      clearChunks();
      return;
    }
    if(trailMarkers.filter(p=>p.realm===state.realm).length>=6){showNotice("BEACON LIMIT REACHED IN THIS REALM · STAND NEAR ONE AND PRESS R TO REMOVE IT",3);return;}
    trailMarkers.push({x:state.x,z:state.z,realm:state.realm});refreshMarkerHud();
    saveProgress();sound(880,.4,"sine",.08);showNotice("TRAIL BEACON DEPLOYED · STAND NEAR IT AND PRESS R TO RECOVER",3);
    clearChunks();
  }
  function useRope(){
    const floor=caveFloorAt(state.x,state.z);
    if(!floor){showNotice("NO SAFE ROPE ANCHOR DETECTED",2);return;}
    state.inCave=true;state.y=floor.floor+2.25;state.vy=0;state.grounded=true;sound(145,.5,"triangle",.06);showNotice("ROPE DESCENT SECURED",2);
  }
  function togglePicks(){
    picksOn=!picksOn;document.querySelector("#tool-picks").classList.toggle("active",picksOn);sound(picksOn?610:210,.18,"triangle",.05);
    showNotice(picksOn?"CLIMBING PICKS READY · FASTER CAVE TRAVERSE":"CLIMBING PICKS STOWED",2);
  }
  function toggleScanner() {
    scannerOn=!scannerOn;canvas.classList.toggle("scanning",scannerOn);
    document.querySelector("#tool-scanner").classList.toggle("active",scannerOn);
    scannerPulse=0;sound(scannerOn?720:260,.18,"sine",.06);
    showNotice(scannerOn?"FIELD SCANNER ACTIVE · SIGNAL COORDINATES RESOLVED":"FIELD SCANNER STOWED",2);
  }
  function toggleLantern() {
    lanternOn=!lanternOn;canvas.classList.toggle("lantern",lanternOn);
    document.querySelector("#tool-lantern").classList.toggle("active",lanternOn);
    sound(lanternOn?520:180,.22,"triangle",.06);
  }
  function togglePause(force) {
    paused=force===undefined?!paused:force;
    document.querySelector("#pause").classList.toggle("hidden",!paused);
    if(paused&&document.pointerLockElement===canvas)document.exitPointerLock();
    else if(!paused&&hasEntered)canvas.requestPointerLock();
  }
  function gate(index) {
    state.realm=index; const realm=realms[index];
    state.x=realm.x; state.z=realm.z; state.y=terrainHeight(state.x,state.z,realm)+7; state.vy=0;
    state.vx=0;state.vz=0;state.inCave=false;state.air=100;
    lastSafe={x:state.x,z:state.z,realm:index};
    clearChunks();
    document.querySelector("#biome").textContent=realm.name;
    refreshMarkerHud();
    tuneAudio();
    showNotice(index===4?"Descending into the Hollow Below":"World gate: "+realm.name,2.5);
  }
  refreshMarkerHud();
  document.querySelector("#enter").addEventListener("click",()=>{
    hasEntered=true;
    initAudio();audioCtx?.resume();tuneAudio();
    canvas.requestPointerLock();
    document.querySelector("#start").classList.add("hidden");
    document.querySelector("#hud").classList.remove("hidden");
    showNotice("FOLLOW THE EXPEDITION SIGNAL · E TO INTERACT · J FOR JOURNAL",5);
  });
  document.querySelectorAll("[data-gate]").forEach(b=>b.addEventListener("click",()=>{gate(+b.dataset.gate-1);canvas.requestPointerLock();}));
  document.addEventListener("pointerlockchange",()=>{
    if(document.pointerLockElement===canvas)document.querySelector("#start").classList.add("hidden");
  });
  document.addEventListener("mousemove",e=>{
    if(document.pointerLockElement===canvas || dragging){
      state.yaw-=e.movementX*.0027*sensitivity;
      state.pitch=Math.max(-1.42,Math.min(1.42,state.pitch-e.movementY*.0025*sensitivity));
    }
  });
  canvas.addEventListener("mousedown",e=>{
    if(e.button!==0 || !hasEntered)return;
    dragging=true;
    if(document.pointerLockElement!==canvas) canvas.style.cursor="grabbing";
  });
  document.addEventListener("mouseup",()=>{dragging=false;canvas.style.cursor="";});
  canvas.addEventListener("click",()=>{
    if(hasEntered && document.pointerLockElement!==canvas) canvas.requestPointerLock();
  });
  document.addEventListener("keydown",e=>{
    keys[e.code]=true;
    if(e.code.startsWith("Arrow")) e.preventDefault();
    if(mapOpen&&e.code!=="KeyM"&&e.code!=="Escape")return;
    if(e.code==="Space"&&state.coyote>0){state.vy=9.2;state.grounded=false;state.coyote=0;}
    if(e.code==="KeyE"&&!e.repeat)interact();
    if(e.code==="KeyJ"&&!e.repeat)toggleJournal();
    if(e.code==="KeyM"&&!e.repeat)toggleMap();
    if(e.code==="KeyR"&&!e.repeat&&!mapOpen)toggleMarker();
    if(e.code==="KeyX"&&!e.repeat&&!mapOpen)useRope();
    if(e.code==="KeyC"&&!e.repeat&&!mapOpen)togglePicks();
    if(e.code==="KeyQ"&&!e.repeat)toggleScanner();
    if(e.code==="KeyF"&&!e.repeat)toggleLantern();
    if(e.code==="Escape"&&!e.repeat&&mapOpen){toggleMap(false);return;}
    if(e.code==="Escape"&&!e.repeat&&!journalOpen&&!puzzleOpen)togglePause();
    if(/^Digit[1-5]$/.test(e.code))gate(+e.code.slice(-1)-1);
  });
  document.addEventListener("keyup",e=>keys[e.code]=false);
  window.addEventListener("blur",()=>Object.keys(keys).forEach(k=>keys[k]=false));
  document.querySelector("#journal-close").addEventListener("click",()=>toggleJournal(false));
  document.querySelector("#map-close").addEventListener("click",()=>toggleMap(false));
  document.querySelector("#puzzle-cancel").addEventListener("click",()=>{ritualSession++;puzzleOpen=false;document.querySelector("#puzzle").classList.add("hidden");document.querySelector("#ritual-sequence").classList.add("hidden");if(hasEntered)canvas.requestPointerLock();});
  document.querySelector("#resume").addEventListener("click",()=>togglePause(false));
  document.querySelector("#save-now").addEventListener("click",()=>{saveProgress();showNotice("EXPEDITION SAVED",2);});
  document.querySelector("#save-slot").value=String(activeSlot);
  document.querySelector("#save-slot").addEventListener("change",e=>{activeSlot=+e.target.value;localStorage.setItem("worldstream-active-slot",String(activeSlot));});
  document.querySelector("#load-slot").addEventListener("click",()=>{localStorage.setItem("worldstream-active-slot",String(activeSlot));location.reload();});
  document.querySelector("#continue-ending").addEventListener("click",()=>{document.querySelector("#ending").classList.add("hidden");if(hasEntered)canvas.requestPointerLock();});
  const sensitivityInput=document.querySelector("#setting-sensitivity"),volumeInput=document.querySelector("#setting-volume"),distanceInput=document.querySelector("#setting-distance"),motionInput=document.querySelector("#setting-motion");
  sensitivityInput.value=sensitivity;distanceInput.value=viewRange;motionInput.checked=motionEnabled;
  sensitivityInput.addEventListener("input",()=>{sensitivity=+sensitivityInput.value;saveProgress();});
  volumeInput.addEventListener("input",()=>{if(masterGain)masterGain.gain.value=+volumeInput.value;});
  distanceInput.addEventListener("change",()=>{viewRange=+distanceInput.value;clearChunks();saveProgress();});
  motionInput.addEventListener("change",()=>{motionEnabled=motionInput.checked;saveProgress();});
  setInterval(()=>{if(hasEntered)saveProgress();},30000);
  window.worldstreamTerrain={
    carveSphere(x,y,z,radius=4,realm=state.realm){densityEdits.push({mode:"carve",x,y,z,radius,realm});clearChunks();},
    addSphere(x,y,z,radius=4,realm=state.realm){densityEdits.push({mode:"add",x,y,z,radius,realm});clearChunks();},
    clearEdits(){densityEdits.length=0;clearChunks();}
  };

  gate(0);
  previewSpawn=new URLSearchParams(location.search).get("spawn");
  if(previewSpawn==="root-cave"){state.x=-55;state.z=-112;state.y=terrainHeight(-55,-112)+2.25;state.yaw=0;clearChunks();}
  if(previewSpawn==="root-cave-mouth"){state.x=-55;state.z=-141;state.y=terrainHeight(-55,-141)+2.25;state.yaw=0;clearChunks();}
  if(previewSpawn==="root-cave-inside"){state.x=-70;state.z=-184;const cf=caveFloorAt(state.x,state.z);state.y=(cf?.floor??-4)+2.25;state.yaw=.78;state.inCave=true;clearChunks();}
  if(previewSpawn==="postgame-echo"){worldheartSeen=true;state.x=98;state.z=-109;state.y=terrainHeight(state.x,state.z)+2.25;state.yaw=-2.4;clearChunks();}
  if(previewSpawn==="hazard"){state.x=-70;state.z=-184;const cf=caveFloorAt(state.x,state.z);state.y=(cf?.floor??-4)+2.25;state.yaw=.78;state.inCave=true;clearChunks();}
  if(previewSpawn==="frontier"){worldheartSeen=true;state.x=350;state.z=-255;state.y=terrainHeight(state.x,state.z)+2.25;state.yaw=-2.3;clearChunks();}
  if(previewSpawn==="fauna"){state.x=205;state.z=165;state.y=terrainHeight(state.x,state.z)+2.25;state.yaw=-1.1;clearChunks();}
  if(previewSpawn==="water"){state.x=-42;state.z=76;state.y=terrainHeight(state.x,state.z)+2.25;state.yaw=Math.PI;clearChunks();}
  if(previewSpawn==="lava"){state.realm=3;state.x=-1288;state.z=-70;state.y=terrainHeight(state.x,state.z)+2.25;state.yaw=Math.PI;document.querySelector("#biome").textContent=realms[3].name;clearChunks();}
  if(previewSpawn==="crownwall"){state.realm=2;state.x=600;state.z=1728;state.y=terrainHeight(state.x,state.z)+2.25;state.yaw=-.55;document.querySelector("#biome").textContent=realms[2].name;clearChunks();}
  if(previewSpawn==="crownwall-cave"){state.realm=2;state.x=646;state.z=1768;state.y=terrainHeight(state.x,state.z)+2.25;state.yaw=Math.PI;document.querySelector("#biome").textContent=realms[2].name;clearChunks();}
  streamChunks(); requestAnimationFrame(loop);
  if(new URLSearchParams(location.search).has("ritual"))setTimeout(()=>openPuzzle(adventureSites[0]),900);
  if(new URLSearchParams(location.search).has("ending"))setTimeout(triggerEnding,900);
})();
