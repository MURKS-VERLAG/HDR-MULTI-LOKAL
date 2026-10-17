/* Renchtal — Neubau 08: Brückenaußenkollision, Winterbach-Gelände und Eisphysik. Keine externen Bibliotheken, Musik oder fremden Hitboxen.
 * Weltkoordinaten 10000 x 6667: identisch zur Oberkirch-Referenz.
 * Karte: Anhang 2048 x 1365, nach 12288 x 8190 hochskaliert (keine neuen Details).
 * Die zwei Uferpolygone wurden an diesem Kartenanhang neu nachgezeichnet.
 * Steinbrücke: durchgehender begehbarer Bogen bis zum sichtbaren rechten Ende.
 * Holzbrücke und ihre Ausblendung unverändert aus Neubau 03.
 */
(() => {
  "use strict";
  const MAPS=Object.freeze({
    oberkirch:Object.freeze({id:'oberkirch',width:10000,height:6667,image:'assets/maps/oberkirch-12k.webp',name:'Oberkirch'}),
    winterbach:Object.freeze({id:'winterbach',width:10000,height:6006,image:'assets/maps/winterbach-12k.webp',name:'Winterbach'})
  });
  let activeMapId='oberkirch';
  function setActiveMap(id){if(!MAPS[id])throw new Error('Unknown map');activeMapId=id;}
  const WORLD=Object.freeze({get width(){return MAPS[activeMapId].width;},get height(){return MAPS[activeMapId].height;}});
  const MAP_ROUTES=Object.freeze({
    oberkirch:[{x1:2150,x2:3250,side:'north',target:'winterbach',spawn:{x:5485,y:5925}},
               {x1:5750,x2:6750,side:'north',target:'winterbach',spawn:{x:8175,y:5925}}],
    winterbach:[{x1:4900,x2:6150,side:'south',target:'oberkirch',spawn:{x:2590,y:673}},
                {x1:7750,x2:8600,side:'south',target:'oberkirch',spawn:{x:6225,y:760}}]
  });
  function exitRoute(player,dy){return MAP_ROUTES[activeMapId].find(r=>player.x>=r.x1&&player.x<=r.x2&&
    (r.side==='north'?dy<0&&player.y<=-18:dy>0&&player.y>=WORLD.height+PLAYER.height+18));}
  function footWithinMap(x,y){
    const lane=MAP_ROUTES[activeMapId].find(r=>x>=r.x1&&x<=r.x2);
    const minY=lane?.side==='north'?-30:PLAYER.height;
    const maxY=lane?.side==='south'?WORLD.height+PLAYER.height+35:WORLD.height-10;
    return x>=PLAYER.width/2&&x<=WORLD.width-PLAYER.width/2&&y>=minY&&y<=maxY;
  }
  const PLAYER = Object.freeze({ width: 420, height: 630, speed: 520 });
  const STONE_BRIDGE_REFERENCE = Object.freeze([
    Object.freeze([3490, 5871]),
    Object.freeze([3855, 5791]),
    Object.freeze([4220, 5725]),
    Object.freeze([4585, 5693]),
    Object.freeze([4950, 5691]),
    Object.freeze([5315, 5722]),
    Object.freeze([5680, 5785]),
    Object.freeze([6045, 5871]),
    Object.freeze([6410, 5981]),
    Object.freeze([6775, 5977]),
    Object.freeze([7016, 5966])
  ]);

  // Trim along arc length, not just X: precisely 3 WORLD pixels at each end.
  function trimPathEnds(path, amount) {
    const lengths=path.slice(1).map((p,i)=>Math.hypot(p[0]-path[i][0],p[1]-path[i][1]));
    const total=lengths.reduce((a,b)=>a+b,0),result=[];
    const at=d=>{
      let start=0;
      for(let i=0;i<lengths.length;i++) {
        if(d<=start+lengths[i] || i===lengths.length-1) {
          const t=(d-start)/lengths[i];
          return [path[i][0]+(path[i+1][0]-path[i][0])*t,path[i][1]+(path[i+1][1]-path[i][1])*t];
        }
        start+=lengths[i];
      }
    };
    result.push(at(amount));
    let d=0;
    for(let i=1;i<path.length-1;i++){d+=lengths[i-1];if(d>amount && d<total-amount)result.push(path[i]);}
    result.push(at(total-amount));
    return Object.freeze(result.map(p=>Object.freeze([...p])));
  }
  // The visible right-hand masonry ends at about source X=1280/2048.
  // The old road extension (through X=7016) must never capture the player.
  const STONE_DECK=Object.freeze({rightX:6250,upperOffset:-110,lowerOffset:130,entryPadding:12});
  function clipStonePath(path) {
    const result=[];
    for(let i=0;i<path.length;i++) {
      if(path[i][0]<=STONE_DECK.rightX) result.push(path[i]);
      else {
        const a=path[i-1],b=path[i],t=(STONE_DECK.rightX-a[0])/(b[0]-a[0]);
        result.push(Object.freeze([STONE_DECK.rightX,a[1]+(b[1]-a[1])*t]));break;
      }
    }
    return Object.freeze(result);
  }
  const STONE_BRIDGE_PATH=clipStonePath(trimPathEnds(STONE_BRIDGE_REFERENCE,3));
  const STONE_BRIDGE_LOWER_PATH=Object.freeze(STONE_BRIDGE_PATH.map(([x,y])=>Object.freeze([x,y+2])));

  const COVERED_BRIDGE_PATH = Object.freeze([
    // FINAL: only the short straight bridge corridor is forced.
    // The road junctions inside the blue circles stay completely free.
    Object.freeze([3505, 1305]),
    Object.freeze([5750, 1305])
  ]);

  const BRIDGE_CONFIG = Object.freeze({
    stoneCorridor: 150,
    coveredCorridor: 72,
    engageDistance: 285,
    coveredFadeMs: 145,

    // FINAL R9: left invisibility starts exactly at the red vertical line.
    // The confirmed-perfect right boundary stays unchanged.
    coveredInterior: Object.freeze({
      x1: 3650,
      y1: 800,
      x2: 5790,
      y2: 1470
    }),

    // FINAL R9: capture zones exist only immediately before the bridge.
    // They no longer reach into either blue-circled road junction.
    coveredCaptureLeft: Object.freeze({
      x1: 3440, y1: 1080, x2: 3735, y2: 1535
    }),
    coveredCaptureRight: Object.freeze({
      x1: 5700, y1: 1080, x2: 5805, y2: 1535
    })
  });

  const RIVER_BLOCK_ZONES = [[[793,0],[785,8],[795,16],[806,24],[796,32],[796,40],[809,48],[807,56],[811,64],[814,72],[817,80],[819,88],[826,96],[839,104],[818,112],[820,120],[835,128],[826,136],[828,144],[836,152],[848,160],[838,168],[838,176],[873,292],[873,300],[885,308],[869,316],[857,324],[851,332],[851,340],[857,348],[846,356],[852,364],[864,372],[870,380],[867,388],[859,396],[858,404],[854,412],[858,420],[875,428],[857,436],[846,444],[849,452],[852,460],[854,468],[860,476],[861,484],[853,492],[854,500],[854,508],[859,516],[851,524],[842,532],[842,540],[870,548],[870,550],[1032,550],[1032,548],[1033,540],[1020,532],[1031,524],[1032,516],[1024,508],[1037,500],[1045,492],[1048,484],[1054,476],[1057,468],[1055,460],[1041,452],[1058,444],[1059,436],[1048,428],[1047,420],[1054,412],[1056,404],[1048,396],[1038,388],[1045,380],[1039,372],[1040,364],[1045,356],[1047,348],[1061,340],[1060,332],[1043,324],[1043,316],[1019,308],[1018,300],[1018,292],[1066,176],[1066,168],[1059,160],[1047,152],[1060,144],[1062,136],[1043,128],[1043,120],[1049,112],[1048,104],[1033,96],[1028,88],[1015,80],[1005,72],[1016,64],[1017,56],[1009,48],[1001,40],[997,32],[1009,24],[1011,16],[1010,8],[1008,0]],[[930,950],[932,960],[910,968],[912,976],[908,984],[892,992],[898,1000],[918,1008],[919,1016],[898,1024],[900,1032],[901,1040],[901,1048],[903,1056],[902,1064],[872,1072],[874,1080],[875,1088],[868,1096],[874,1104],[879,1112],[883,1120],[883,1128],[883,1134],[865,1250],[865,1260],[863,1268],[870,1276],[871,1284],[869,1292],[869,1300],[859,1308],[854,1316],[854,1324],[853,1332],[852,1340],[857,1348],[857,1356],[855,1364],[855,1365],[1123,1365],[1123,1364],[1125,1356],[1124,1348],[1116,1340],[1112,1332],[1107,1324],[1089,1316],[1093,1308],[1095,1300],[1096,1292],[1080,1284],[1081,1276],[1085,1268],[1084,1260],[1084,1250],[1117,1134],[1117,1128],[1116,1120],[1113,1112],[1099,1104],[1099,1096],[1102,1088],[1105,1080],[1103,1072],[1110,1064],[1099,1056],[1089,1048],[1082,1040],[1081,1032],[1071,1024],[1066,1016],[1076,1008],[1065,1000],[1076,992],[1077,984],[1069,976],[1063,968],[1045,960],[1040,950]]].map(polygon => polygon.map(([x,y]) => [x / 2048 * WORLD.width, y / 1365 * WORLD.height]));

  const bridgePathCache = new Map();
  function getPathMetrics(path) {
    if (bridgePathCache.has(path)) return bridgePathCache.get(path);
    const cumulative = [0];
    let total = 0;
    for (let i = 1; i < path.length; i++) {
      total += Math.hypot(path[i][0] - path[i-1][0], path[i][1] - path[i-1][1]);
      cumulative.push(total);
    }
    const result = { cumulative, total };
    bridgePathCache.set(path, result);
    return result;
  }
  const clamp = (value, min, max) => Math.max(min, Math.min(max, value));
  function closestPointOnBridgePath(x, y, path) {
    const metrics = getPathMetrics(path);
    let best = null;
    for (let i = 0; i < path.length - 1; i++) {
      const [ax, ay] = path[i], [bx, by] = path[i+1];
      const vx = bx-ax, vy = by-ay;
      const t = clamp(((x-ax)*vx+(y-ay)*vy)/(vx*vx+vy*vy || 1), 0, 1);
      const px = ax+vx*t, py = ay+vy*t;
      const distance = Math.hypot(x-px,y-py);
      const pathDistance = metrics.cumulative[i]+Math.hypot(vx,vy)*t;
      if (!best || distance < best.distance) best = {x:px,y:py,distance,pathDistance,progress:pathDistance/metrics.total};
    }
    return best;
  }
  function pointAtBridgeDistance(path, distance) {
    const m = getPathMetrics(path), d = clamp(distance,0,m.total);
    for (let i=0;i<path.length-1;i++) {
      if (d<=m.cumulative[i+1] || i===path.length-2) {
        const t=(d-m.cumulative[i])/(m.cumulative[i+1]-m.cumulative[i] || 1);
        return {x:path[i][0]+(path[i+1][0]-path[i][0])*t,y:path[i][1]+(path[i+1][1]-path[i][1])*t};
      }
    }
  }
  function pointInRect(x,y,r) { return x>=r.x1 && x<=r.x2 && y>=r.y1 && y<=r.y2; }
  function worldPointInPolygon(x,y,polygon) {
    let inside=false;
    for(let i=0,j=polygon.length-1;i<polygon.length;j=i++) {
      const [ax,ay]=polygon[i], [bx,by]=polygon[j];
      if(((ay>y)!==(by>y)) && x<(bx-ax)*(y-ay)/(by-ay)+ax) inside=!inside;
    }
    return inside;
  }
  function bridgeDefinition(id) {
    return id==='covered'
      ? {id,path:COVERED_BRIDGE_PATH,corridor:BRIDGE_CONFIG.coveredCorridor}
      : {id:'stone',path:STONE_BRIDGE_PATH,corridor:BRIDGE_CONFIG.stoneCorridor};
  }
  function stonePointAtX(x) {
    const path=STONE_BRIDGE_PATH,m=getPathMetrics(path);
    x=clamp(x,path[0][0],path[path.length-1][0]);
    for(let i=0;i<path.length-1;i++) {
      if(x<=path[i+1][0] || i===path.length-2) {
        const t=(x-path[i][0])/(path[i+1][0]-path[i][0]);
        return {x,y:path[i][1]+(path[i+1][1]-path[i][1])*t,distance:m.cumulative[i]+(m.cumulative[i+1]-m.cumulative[i])*t};
      }
    }
  }
  function insideStoneDeck(x,y,padding=0) {
    if(x<STONE_BRIDGE_PATH[0][0]-padding || x>STONE_DECK.rightX+padding) return false;
    const offset=y-stonePointAtX(x).y;
    return offset>=STONE_DECK.upperOffset && offset<=STONE_DECK.lowerOffset;
  }
  function isRiverBlockedFootPoint(x,y) {
    if(activeMapId!=='oberkirch')return false;
    const covered=bridgeDefinition('covered');
    if(closestPointOnBridgePath(x,y,covered.path).distance<=covered.corridor) return false;
    // Only the actual paved ribbon opens the river, without rounded end caps.
    if(insideStoneDeck(x,y)) return false;
    return RIVER_BLOCK_ZONES.some(polygon=>worldPointInPolygon(x,y,polygon));
  }
  function engageStoneBridge(player,dx,dy) {
    if(activeMapId!=='oberkirch')return null;
    if(!(dx||dy) || !insideStoneDeck(player.x,player.y,STONE_DECK.entryPadding)) return null;
    const left=STONE_BRIDGE_PATH[0][0],right=STONE_DECK.rightX;
    if((player.x<=left+.01 && dx<0)||(player.x>=right-.01 && dx>0)) return null;
    const point=stonePointAtX(player.x);
    // Preserve the exact approach height. No pulling to either discrete lane.
    return {id:'stone',path:STONE_BRIDGE_PATH,distance:point.distance,offset:player.y-point.y,snapping:false};
  }
  function moveAlongStoneBridge(player,bridge,dx,dy,dt) {
    const length=Math.hypot(dx,dy);
    if(!length) return bridge;
    const amount=PLAYER.speed*dt/length,total=getPathMetrics(STONE_BRIDGE_PATH).total;
    const distance=clamp(bridge.distance+dx*amount,0,total);
    bridge.offset=clamp(bridge.offset+dy*amount,STONE_DECK.upperOffset,STONE_DECK.lowerOffset);
    const point=pointAtBridgeDistance(STONE_BRIDGE_PATH,distance);
    player.x=point.x;player.y=point.y+bridge.offset;bridge.distance=distance;
    if((distance<=.001 && dx<0)||(distance>=total-.001 && dx>0)) {
      // Tiny outward step releases once. No catch/release loop at the entrance.
      const nextX=player.x+Math.sign(dx)*2;
      if(canMoveFootTo(nextX,player.y))player.x=nextX;
      return null;
    }
    return bridge;
  }
  function tryEngageBridge(player,dx,dy) {
    if(activeMapId!=='oberkirch')return null;
    const horizontal=Math.sign(dx);
    if(dx || dy) {
      const bridge=bridgeDefinition('covered');
      const closest=closestPointOnBridgePath(player.x,player.y,bridge.path);
      const feeder=pointInRect(player.x,player.y,BRIDGE_CONFIG.coveredCaptureLeft) || pointInRect(player.x,player.y,BRIDGE_CONFIG.coveredCaptureRight);
      const leaving=(closest.progress<=.04 && horizontal<0)||(closest.progress>=.96 && horizontal>0);
      if(feeder && !leaving) return {id:'covered',path:bridge.path,distance:closest.pathDistance,snapping:true};
    }
    return engageStoneBridge(player,dx,dy);
  }
  function moveAlongActiveBridge(player,bridge,horizontal,dt) {
    if(bridge.id==='stone') return moveAlongStoneBridge(player,bridge,horizontal,0,dt);
    const anchor=pointAtBridgeDistance(bridge.path,bridge.distance);
    if(bridge.snapping) {
      const dx=anchor.x-player.x,dy=anchor.y-player.y;
      if(Math.hypot(dx,dy)>5) {
        const pull=Math.min(1,(bridge.snapRate || 10)*dt);
        player.x+=dx*pull; player.y+=dy*pull;
        return bridge;
      }
      player.x=anchor.x;player.y=anchor.y;bridge.snapping=false;
    }
    if(!horizontal) return bridge;
    const total=getPathMetrics(bridge.path).total;
    bridge.distance=clamp(bridge.distance+horizontal*PLAYER.speed*dt,0,total);
    Object.assign(player,pointAtBridgeDistance(bridge.path,bridge.distance));
    if((bridge.distance<=.001 && horizontal<0)||(bridge.distance>=total-.001 && horizontal>0)) {
      if(bridge.id==='covered') player.x+=horizontal*18;
      return null;
    }
    return bridge;
  }
  function playerInsideCoveredBridgeInterior(player,bridge) {
    return Boolean(activeMapId==='oberkirch' && bridge && bridge.id==='covered' && pointInRect(player.x,player.y,BRIDGE_CONFIG.coveredInterior));
  }
  // Visible upper parapet and lower masonry, traced in original 2048x1365
  // map pixels. The walkable ribbon is the sole opening in this structure.
  const STONE_STRUCTURE=Object.freeze([
    [710,1157],[795,1132],[905,1113],[1015,1115],[1130,1130],
    [1240,1153],[1280,1170],[1280,1265],[1220,1278],[1120,1295],
    [1010,1310],[900,1314],[790,1291],[715,1285]
  ].map(([x,y])=>Object.freeze([x/2048*WORLD.width,y/1365*WORLD.height])));
  function isStoneStructureBlocked(x,y) {
    if(activeMapId!=='oberkirch')return false;
    // Side portals must open through the whole masonry, not only its deck.
    if(x<STONE_BRIDGE_PATH[0][0] || x>STONE_DECK.rightX)return false;
    return !insideStoneDeck(x,y) && worldPointInPolygon(x,y,STONE_STRUCTURE);
  }
  // Contours measured against the NEW winter map, in its 1600x960 preview.
  const winterPoint=([x,y])=>Object.freeze([x/1600*10000,y/960*6006]);
  const WINTER_RIVER=Object.freeze([[930,0],[932,36],[942,72],[954,108],[964,144],[967,180],[975,216],[978,240],[984,252],[962,264],[965,276],[988,288],[991,300],[1000,312],[975,324],[993,336],[1001,348],[1007,360],[1017,372],[1021,384],[1018,396],[1024,408],[1027,420],[1031,432],[1039,444],[1038,456],[1039,468],[1051,480],[1050,492],[1057,504],[1057,516],[1053,528],[1057,540],[1059,552],[1062,564],[1027,576],[1033,588],[1051,600],[1045,612],[1044,624],[1043,636],[1039,648],[1039,660],[1029,672],[1034,684],[1030,696],[1016,708],[1023,720],[1019,732],[1017,744],[1012,756],[1011,768],[1007,780],[1009,792],[1005,804],[1016,816],[1017,828],[1022,840],[1027,852],[1028,864],[1031,876],[1039,888],[1043,900],[1044,912],[1044,924],[1044,936],[1047,948],[1059,960],[1059,960],[1159,960],[1159,960],[1157,948],[1149,936],[1150,924],[1146,912],[1148,900],[1144,888],[1135,876],[1131,864],[1130,852],[1127,840],[1125,828],[1121,816],[1118,804],[1116,792],[1115,780],[1119,768],[1116,756],[1117,744],[1116,732],[1121,720],[1115,708],[1121,696],[1127,684],[1132,672],[1141,660],[1147,648],[1142,636],[1143,624],[1144,612],[1149,600],[1149,588],[1148,576],[1150,564],[1155,552],[1154,540],[1162,528],[1161,516],[1162,504],[1152,492],[1153,480],[1154,468],[1150,456],[1146,444],[1141,432],[1135,420],[1135,408],[1133,396],[1131,384],[1125,372],[1120,360],[1117,348],[1114,336],[1116,324],[1110,312],[1109,300],[1114,288],[1114,276],[1117,264],[1120,252],[1128,240],[1128,216],[1137,180],[1140,144],[1134,108],[1127,72],[1124,36],[1112,0]].map(winterPoint));
  const WINTER_ICE=Object.freeze([[930,0],[932,36],[942,72],[954,108],[964,144],[967,180],[975,216],[978,240],[979,248],[995,253],[1016,260],[1033,265],[1054,260],[1077,253],[1099,254],[1125,244],[1128,240],[1128,216],[1137,180],[1140,144],[1134,108],[1127,72],[1124,36],[1112,0]].map(winterPoint));
  const WINTER_MOUNTAINS=Object.freeze([[0,0],[122,0],[160,35],[175,80],[203,118],[207,160],[225,180],[221,225],[244,251],[257,300],[244,326],[274,360],[263,398],[241,430],[232,471],[215,500],[183,530],[160,559],[131,580],[102,615],[0,645]].map(winterPoint));
  const ICE_PHYSICS=Object.freeze({acceleration:5200,maxSpeed:PLAYER.speed*2,dragMoving:.985,dragNoInput:.975,minSpeed:14,swayAngle:4.6,swayX:8});
  const iceMotion={vx:0,vy:0,phase:0};
  function onWinterIce(x,y){return activeMapId==='winterbach'&&worldPointInPolygon(x,y,WINTER_ICE);}
  function winterTerrainBlocked(x,y){
    if(activeMapId!=='winterbach')return false;
    if(worldPointInPolygon(x,y,WINTER_MOUNTAINS))return true;
    return worldPointInPolygon(x,y,WINTER_RIVER)&&!onWinterIce(x,y);
  }
  function clearIceMotion(){iceMotion.vx=0;iceMotion.vy=0;iceMotion.phase=0;}
  function movePlayerOnIce(player,inputX,inputY,dt){
    const len=Math.hypot(inputX,inputY),hasInput=len>0;
    if(hasInput){iceMotion.vx+=inputX/len*ICE_PHYSICS.acceleration*dt;iceMotion.vy+=inputY/len*ICE_PHYSICS.acceleration*dt;}
    const speed=Math.hypot(iceMotion.vx,iceMotion.vy);
    if(speed>ICE_PHYSICS.maxSpeed){const k=ICE_PHYSICS.maxSpeed/speed;iceMotion.vx*=k;iceMotion.vy*=k;}
    const drag=Math.pow(hasInput?ICE_PHYSICS.dragMoving:ICE_PHYSICS.dragNoInput,dt*60);iceMotion.vx*=drag;iceMotion.vy*=drag;
    if(!hasInput&&Math.hypot(iceMotion.vx,iceMotion.vy)<ICE_PHYSICS.minSpeed){clearIceMotion();return;}
    const steps=Math.max(1,Math.ceil(Math.hypot(iceMotion.vx,iceMotion.vy)*dt/6));
    for(let i=0;i<steps;i++){
      const x=player.x+iceMotion.vx*dt/steps,y=player.y+iceMotion.vy*dt/steps;
      if(canMoveFootTo(x,player.y))player.x=x;else iceMotion.vx=0;
      if(canMoveFootTo(player.x,y))player.y=y;else iceMotion.vy=0;
      if(!onWinterIce(player.x,player.y)){clearIceMotion();break;}
    }
  }
  // Roof, parapets and supports. Only the covered deck remains passable.
  const COVERED_STRUCTURE=Object.freeze([[740,175],[1158,175],[1162,290],[1125,307],[780,310],[741,287]].map(([x,y])=>Object.freeze([x/2048*10000,y/1365*6667])));
  function isCoveredStructureBlocked(x,y){
    if(activeMapId!=='oberkirch'||!worldPointInPolygon(x,y,COVERED_STRUCTURE))return false;
    return closestPointOnBridgePath(x,y,COVERED_BRIDGE_PATH).distance>BRIDGE_CONFIG.coveredCorridor;
  }
  function canMoveFootTo(x,y) {
    return footWithinMap(x,y) && !isRiverBlockedFootPoint(x,y) && !isStoneStructureBlocked(x,y) && !isCoveredStructureBlocked(x,y) && !winterTerrainBlocked(x,y);
  }
  function movePlayer(player,bridge,dx,dy,dt) {
    if(onWinterIce(player.x,player.y)){movePlayerOnIce(player,dx,dy,dt);return null;}
    clearIceMotion();
    if(!dx && !dy) return bridge;
    bridge=bridge || tryEngageBridge(player,dx,dy);
    if(bridge) return bridge.id==='stone'
      ? moveAlongStoneBridge(player,bridge,dx,dy,dt)
      : moveAlongActiveBridge(player,bridge,Math.sign(dx),dt);
    // Small steps prevent stepping across a thin shoreline at a slow frame rate.
    const length=Math.hypot(dx,dy),distance=PLAYER.speed*dt;
    const steps=Math.max(1,Math.ceil(distance/6));
    const sx=dx/length*distance/steps,sy=dy/length*distance/steps;
    for(let i=0;i<steps;i++) {
      const stone=engageStoneBridge(player,dx,dy);
      if(stone) return moveAlongStoneBridge(player,stone,dx,dy,dt*(steps-i)/steps);
      if(canMoveFootTo(player.x+sx,player.y)) player.x+=sx;
      if(canMoveFootTo(player.x,player.y+sy)) player.y+=sy;
    }
    return null;
  }
  function coverCamera(width,height,x,y) {
    const scale=Math.max(width/WORLD.width,height/WORLD.height);
    return {scale,x:clamp(x,width/scale/2,WORLD.width-width/scale/2),y:clamp(y,height/scale/2,WORLD.height-height/scale/2)};
  }

  function trackCamera(camera,player,dx,dy,unusedPointer,width,height,dt) {
    const c=coverCamera(width,height,camera.x,camera.y),scale=c.scale;
    const focus={x:player.x,y:player.y-PLAYER.height*.5};
    const rx=Math.min(110,width*.09)/scale,ry=Math.min(78,height*.09)/scale;
    const target=coverCamera(width,height,
      clamp(camera.x,focus.x-rx,focus.x+rx),
      clamp(camera.y,focus.y-ry,focus.y+ry));
    // Exponential smoothing preserves camera position on direction changes and
    // has the same response at 30/60/144 Hz. Pointer position has no effect.
    const blend=1-Math.exp(-6*Math.max(0,Math.min(.05,dt)));
    camera.x+=(target.x-camera.x)*blend;
    camera.y+=(target.y-camera.y)*blend;
    Object.assign(camera,coverCamera(width,height,camera.x,camera.y));
    return camera;
  }

  // Only the red-marked crowns in the supplied Oberkirch screenshot.
  // Original map/WORLD registration: viewport X/1609, viewport Y+87.
  const TREE_AREAS=Object.freeze([[8,90,22,39],[94,95,32,60],[210,43,23,30],[543,47,45,29],[956,47,41,30],[1223,38,31,29],[1507,204,39,59],[30,270,32,57],[201,292,31,57],[488,201,22,49],[541,199,29,74],[948,226,42,98],[1434,423,36,59],[1519,502,31,35],[309,560,43,53],[43,757,40,41],[575,735,31,65],[981,662,45,65],[1040,754,59,63],[1346,733,29,42],[1269,892,59,50],[331,870,35,55],[227,883,30,34]].map(([x,y,rx,ry])=>Object.freeze({
    x:x/1609*WORLD.width,y:(y+87)/1609*WORLD.width,
    rx:(rx-3)/1609*WORLD.width,ry:(ry-3)/1609*WORLD.width
  })));
  const LOWER_BRIDGE_TREES=Object.freeze([
    [627,1261,67,102],[690,1332,50,47],
    [1324,1290,78,62],[1411,1316,53,49]
  ].map(([x,y,rx,ry])=>Object.freeze({x:x/2048*WORLD.width,y:y/1365*WORLD.height,rx:rx/2048*WORLD.width,ry:ry/1365*WORLD.height})));
  function taperedTreeContains(t,x,y){
    const ny=(y-t.y)/t.ry,nx=(x-t.x)/t.rx;
    if(nx*nx+ny*ny>1)return false;
    // Keep the broad lower crown, but narrow continuously toward its actual tip.
    return ny>=-.25 || Math.abs(nx)<=(ny+1)/.75;
  }
  function treeAreaAt(x,y) {
    if(activeMapId!=='oberkirch')return -1;
    const first=TREE_AREAS.findIndex(t=>((x-t.x)/t.rx)**2+((y-t.y)/t.ry)**2<=1);
    if(first>=0)return first;
    const lower=LOWER_BRIDGE_TREES.findIndex(t=>taperedTreeContains(t,x,y));
    return lower<0?-1:TREE_AREAS.length+lower;
  }
  function shouldPlayTreeEffects(player,moved) {return Boolean(moved && treeAreaAt(player.x,player.y)>=0);}

  // Opaque bounds measured from the supplied PNG alpha channel. The original
  // artwork is retained; layout corrects transparent margins, height and soles.
  const SPRITE_BOUNDS={"stand-down":{"top":3,"bottom":1498},"stand-left":{"top":41,"bottom":1491},"stand-right":{"top":41,"bottom":1491},"stand-up":{"top":281,"bottom":1518},"walk-01":{"top":45,"bottom":1523},"walk-02":{"top":44,"bottom":1524},"walk-03":{"top":45,"bottom":1524},"walk-04":{"top":45,"bottom":1524},"walk-05":{"top":44,"bottom":1524},"walk-06":{"top":45,"bottom":1524},"walk-07":{"top":45,"bottom":1524},"walk-08":{"top":44,"bottom":1524},"walk-09":{"top":46,"bottom":1524},"walk-10":{"top":44,"bottom":1523},"walk-11":{"top":45,"bottom":1523}};
  const WALK_SEQUENCES=Object.freeze({down:[1,2,3,2],up:[4,5,6,7],right:[8,10,9,11],left:[8,10,9,11]});
  const WALK_FRAME_MS=120;
  const VERTICAL_WALK_FRAME_MS=135;
  // Small alternating lateral sole separation for the rear-facing gait.
  // Render-only: the world foot anchor, collision and movement never change.
  const UP_WALK_OFFSETS=Object.freeze({'walk-04':18,'walk-05':-18,'walk-06':18,'walk-07':-18});
  function walkFrameDuration(direction) {return direction==='up'||direction==='down'?VERTICAL_WALK_FRAME_MS:WALK_FRAME_MS;}
  const TARGET_VISIBLE_HEIGHT=(1498-3)/1536*PLAYER.height;
  function spriteLayout(key) {
    const bounds=SPRITE_BOUNDS[key];
    const scale=TARGET_VISIBLE_HEIGHT/(bounds.bottom-bounds.top);
    return {width:1024*scale,height:1536*scale,bottom:-(1536-bounds.bottom)*scale,visibleHeight:(bounds.bottom-bounds.top)*scale,offsetX:(UP_WALK_OFFSETS[key]||0)*scale};
  }
  function directionForInput(dx,dy) {return dy<0?'up':dy>0?'down':dx<0?'left':'right';}
  function advanceWalkAnimation(animation,direction,moving,dt) {
    if(!moving){animation.moving=false;animation.index=0;animation.elapsed=0;animation.direction=direction;return `stand-${direction}`;}
    if(!animation.moving || animation.direction!==direction){animation.index=0;animation.elapsed=0;}
    else {
      animation.elapsed+=Math.max(0,dt)*1000;
      const duration=walkFrameDuration(direction);
      while(animation.elapsed>=duration){animation.elapsed-=duration;animation.index=(animation.index+1)%WALK_SEQUENCES[direction].length;}
    }
    animation.moving=true;animation.direction=direction;
    return `walk-${String(WALK_SEQUENCES[direction][animation.index]).padStart(2,'0')}`;
  }

  // Geometry and animation can be verified directly in Node without asset stubs.
  if(typeof module!=='undefined' && module.exports) {
    module.exports={WINTER_RIVER,WINTER_ICE,WINTER_MOUNTAINS,ICE_PHYSICS,iceMotion,onWinterIce,winterTerrainBlocked,clearIceMotion,movePlayerOnIce,COVERED_STRUCTURE,isCoveredStructureBlocked,MAPS,MAP_ROUTES,setActiveMap,exitRoute,footWithinMap,taperedTreeContains,STONE_STRUCTURE,isStoneStructureBlocked,LOWER_BRIDGE_TREES,TREE_AREAS,treeAreaAt,shouldPlayTreeEffects,STONE_DECK,stonePointAtX,insideStoneDeck,engageStoneBridge,moveAlongStoneBridge,trackCamera,VERTICAL_WALK_FRAME_MS,UP_WALK_OFFSETS,walkFrameDuration,SPRITE_BOUNDS,WALK_SEQUENCES,WALK_FRAME_MS,TARGET_VISIBLE_HEIGHT,spriteLayout,directionForInput,advanceWalkAnimation,STONE_BRIDGE_REFERENCE,STONE_BRIDGE_LOWER_PATH,WORLD,PLAYER,BRIDGE_CONFIG,STONE_BRIDGE_PATH,COVERED_BRIDGE_PATH,RIVER_BLOCK_ZONES,getPathMetrics,closestPointOnBridgePath,pointAtBridgeDistance,isRiverBlockedFootPoint,tryEngageBridge,moveAlongActiveBridge,playerInsideCoveredBridgeInterior,canMoveFootTo,movePlayer,coverCamera};
    return;
  }

  const menu=document.getElementById('menu'),game=document.getElementById('game');
  const world=document.getElementById('world'),map=document.getElementById('map');
  const playerEl=document.getElementById('player');
  const originalSprite=document.getElementById('playerSprite');
  // One opaque frame transaction: clear the complete backing bitmap, then draw
  // exactly one already-decoded source. No old DOM image or crossfade survives.
  const sprite=document.createElement('canvas');
  sprite.id='playerSprite';sprite.width=1024;sprite.height=1536;
  sprite.setAttribute('aria-hidden','true');
  originalSprite.replaceWith(sprite);
  const spriteContext=sprite.getContext('2d');
  const startButton=document.getElementById('singleplayer'),status=document.getElementById('status');
  const state={playing:false,starting:false,transitioning:false,player:{x:4950,y:3750,facing:'down'},bridge:null};
  const camera={x:5000,y:3333.5,scale:1};

  const keys=new Set(),images={};
  const animation={moving:false,index:0,elapsed:0,direction:'down'};
  let activeSpriteKey='',activeMirror=false;
  function showPlayerSprite(key,mirror=false) {
    if(activeSpriteKey===key && activeMirror===mirror) return;
    const layout=spriteLayout(key);
    sprite.style.position='absolute';sprite.style.left=`calc(50% + ${layout.offsetX}px)`;
    sprite.style.width=`${layout.width}px`;sprite.style.height=`${layout.height}px`;
    sprite.style.bottom=`${layout.bottom}px`;
    sprite.style.transform=`translateX(-50%) scaleX(${mirror?-1:1})`;
    sprite.style.transformOrigin='50% 100%';
    spriteContext.setTransform(1,0,0,1,0,0);
    spriteContext.clearRect(0,0,sprite.width,sprite.height);
    spriteContext.drawImage(images[key],0,0,sprite.width,sprite.height);
    activeSpriteKey=key;activeMirror=mirror;
  }
  function updateAnimation(moving,dt) {
    const key=advanceWalkAnimation(animation,state.player.facing,moving,dt);
    showPlayerSprite(key,moving && state.player.facing==='left');
  }

  const cursorStyle=document.createElement('style');
  cursorStyle.textContent='html, body, body * { cursor: url("assets/ui/sword-cursor.svg") 2 2, auto !important; }';
  document.head.appendChild(cursorStyle);
  // The cursor hotspot is precisely the sword tip (2,2). No game click action.
  const leafLayer=document.createElement('div');
  Object.assign(leafLayer.style,{position:'absolute',left:'0',top:'0',width:'100%',height:'100%',pointerEvents:'none',overflow:'visible',zIndex:'12'});
  leafLayer.setAttribute('aria-hidden','true');world.appendChild(leafLayer);
  const treeSound=new Audio('assets/audio/tree-rustle.mp3');
  treeSound.preload='auto';treeSound.loop=false;treeSound.volume=1;
  const treeFX={active:false,elapsed:0,leaves:new Set()};
  let treeAudioPending=false;
  function playTreeSound() {
    if(!treeFX.active || document.hidden || treeAudioPending || (!treeSound.paused && !treeSound.ended)) return;
    treeSound.currentTime=0;treeAudioPending=true;
    const result=treeSound.play();
    if(result && typeof result.then==='function') result.then(()=>{treeAudioPending=false;},()=>{treeAudioPending=false;});
    else treeAudioPending=false;
  }
  treeSound.addEventListener('ended',()=>{if(treeFX.active && !document.hidden)playTreeSound();});
  function stopTreeLeaves() {
    treeFX.active=false;treeFX.elapsed=0;
    for(const entry of treeFX.leaves){entry.anim.cancel();entry.leaf.remove();}
    treeFX.leaves.clear();
    // Intentionally do not pause/restart the sound: the current clip finishes.
  }
  function burstMap1TreeLeaves() {
    // Exact legacy glyphs, font, palette, shadow, rotations and easing.
    // Adapted origin/fall endpoints spread leaves around the moving character
    // and land them at the ground instead of hiding/replacing the player.
    const glyphs=['●','◆','●','◆','●','◆','●','◆','●','◆','●','◆','●','◆','●','◆','●','◆','●','◆','●','◆','●','◆','●','◆','●','◆'];
    const unit=WORLD.width/1536;
    glyphs.forEach((glyph,i)=>{
      if(treeFX.leaves.size>=168) return;
      const leaf=document.createElement('span');leaf.textContent=glyph;
      const size=(5+(i%4)*2)*unit;
      const fall=230+(i%6)*35;
      const originX=state.player.x+(Math.random()-.5)*PLAYER.width*.8;
      const groundY=state.player.y+(Math.random()-.5)*100;
      const originY=groundY-fall;
      Object.assign(leaf.style,{position:'absolute',left:`${originX}px`,top:`${originY}px`,font:`900 ${size}px/1 Georgia,serif`,color:i%3===0?'#78a83a':(i%3===1?'#4f8b2c':'#96bd4d'),textShadow:`0 ${unit}px ${unit}px rgba(30,60,15,.35)`,pointerEvents:'none',opacity:'1',transform:'translate(-50%,-50%) rotate(0deg)',willChange:'transform,opacity'});
      leafLayer.appendChild(leaf);
      const angle=-Math.PI*.95+(Math.PI*1.9)*(i/(glyphs.length-1));
      const burst=24+(i%7)*7;
      const dx=Math.cos(angle)*burst*unit*.45;
      const down=(12+(i%5)*3)*unit;
      const drift=dx+(i%2?18:-18)*unit*.45;
      const rot=(i%2?1:-1)*(180+37*i);
      const anim=leaf.animate([
        {transform:'translate(-50%,-50%) translate(0,0) rotate(0deg) scale(.7)',opacity:0,offset:0},
        {transform:`translate(-50%,-50%) translate(${dx}px,${down}px) rotate(${rot*.28}deg) scale(1)`,opacity:1,offset:.18},
        {transform:`translate(-50%,-50%) translate(${drift*.82}px,${fall*.55}px) rotate(${rot*.72}deg) scale(.92)`,opacity:.95,offset:.72},
        {transform:`translate(-50%,-50%) translate(${drift}px,${fall}px) rotate(${rot}deg) scale(.72)`,opacity:0,offset:1}
      ],{duration:1500+(i%5)*95,easing:'cubic-bezier(.18,.65,.28,1)',fill:'forwards'});
      const entry={leaf,anim};treeFX.leaves.add(entry);
      anim.onfinish=()=>{treeFX.leaves.delete(entry);leaf.remove();};
    });
  }
  function updateTreeEffects(moved,dt) {
    if(!shouldPlayTreeEffects(state.player,moved)){if(treeFX.active)stopTreeLeaves();return;}
    if(!treeFX.active){treeFX.active=true;treeFX.elapsed=0;burstMap1TreeLeaves();playTreeSound();}
    else {
      treeFX.elapsed+=dt*1000;
      if(treeFX.elapsed>=350){treeFX.elapsed%=350;burstMap1TreeLeaves();}
      if(treeSound.paused || treeSound.ended)playTreeSound();
    }
  }
  let width=innerWidth,height=innerHeight,lastTime=0;

  function waitForImage(image) {
    return new Promise((resolve,reject)=>{
      const ready=()=>{
        image.onload=null;image.onerror=null;
        if(typeof image.decode==='function') image.decode().then(resolve,reject);
        else resolve();
      };
      if(image.complete) {
        if(image.naturalWidth) ready(); else reject(new Error('Bild konnte nicht geladen werden.'));
      } else {image.onload=ready;image.onerror=()=>reject(new Error('Bild konnte nicht geladen werden.'));}
    });
  }
  const mapCurtain=document.createElement('div');
  Object.assign(mapCurtain.style,{position:'fixed',inset:'0',background:'#000',zIndex:'5000',display:'none',opacity:'0',pointerEvents:'none'});
  game.appendChild(mapCurtain);
  function openMapIris(){
    return new Promise(resolve=>{
      const began=performance.now();
      function reveal(now){
        const p=clamp((now-began)/2700,0,1),eased=1-Math.pow(1-p,3);
        const radius=Math.hypot(width,height)*.6*eased;
        const mask=`radial-gradient(circle at 50% 50%, transparent 0 ${radius}px, #000 ${radius+2}px)`;
        mapCurtain.style.maskImage=mask;mapCurtain.style.webkitMaskImage=mask;
        if(p<1)requestAnimationFrame(reveal);else resolve();
      }
      requestAnimationFrame(reveal);
    });
  }
  async function switchMap(route){
    if(state.transitioning)return;
    state.transitioning=true;keys.clear();clearIceMotion();updateAnimation(false,0);stopTreeLeaves();
    const previous={map:activeMapId,x:state.player.x,y:state.player.y};
    mapCurtain.style.display='block';mapCurtain.style.maskImage='none';mapCurtain.style.webkitMaskImage='none';
    mapCurtain.style.transition='opacity 200ms ease';mapCurtain.style.opacity='0';
    void mapCurtain.offsetWidth;mapCurtain.style.opacity='1';
    try{
      await new Promise(resolve=>setTimeout(resolve,210));
      const next=MAPS[route.target],image=new Image();image.src=next.image;
      await waitForImage(image);
      map.src=image.src;await waitForImage(map);
      setActiveMap(route.target);state.bridge=null;
      state.player.x=route.spawn.x;state.player.y=route.spawn.y;
      state.player.facing=route.side==='north'?'up':'down';updateAnimation(false,0);
      game.setAttribute('aria-label',next.name);map.alt=next.name;
      world.style.width=`${WORLD.width}px`;world.style.height=`${WORLD.height}px`;
      camera.x=state.player.x;camera.y=state.player.y-PLAYER.height*.5;
      render();mapCurtain.style.transition='none';
      await openMapIris();
    }catch(error){
      console.error('Map transition failed',error);
      setActiveMap(previous.map);state.player.x=previous.x;state.player.y=previous.y;
      map.src=MAPS[previous.map].image;world.style.height=`${WORLD.height}px`;render();
    }finally{
      mapCurtain.style.display='none';mapCurtain.style.opacity='0';mapCurtain.style.maskImage='none';mapCurtain.style.webkitMaskImage='none';
      keys.clear();lastTime=0;state.transitioning=false;
    }
  }
  function render() {
    const c=coverCamera(width,height,camera.x,camera.y);
    Object.assign(camera,c);
    world.style.transform=`translate3d(${width/2-camera.x*c.scale}px,${height/2-camera.y*c.scale}px,0) scale(${c.scale})`;
    playerEl.style.left=`${state.player.x}px`;playerEl.style.top=`${state.player.y}px`;
    playerEl.style.opacity=playerInsideCoveredBridgeInterior(state.player,state.bridge)?'0':'1';
  }
  function face(dx,dy) {
    state.player.facing=directionForInput(dx,dy);
  }
  function updateCamera(dx,dy,dt) {
    trackCamera(camera,state.player,dx,dy,null,width,height,dt);
  }
  function frame(now) {
    const dt=lastTime?clamp((now-lastTime)/1000,0,.05):0;lastTime=now;
    if(state.playing && !state.transitioning && !document.hidden) {
      const dx=Number(keys.has('KeyD')||keys.has('ArrowRight'))-Number(keys.has('KeyA')||keys.has('ArrowLeft'));
      const dy=Number(keys.has('KeyS')||keys.has('ArrowDown'))-Number(keys.has('KeyW')||keys.has('ArrowUp'));
      const oldX=state.player.x,oldY=state.player.y;
      if(dx || dy)face(dx,dy);
      state.bridge=movePlayer(state.player,state.bridge,dx,dy,dt);
      const route=exitRoute(state.player,dy);
      if(route){switchMap(route);requestAnimationFrame(frame);return;}
      const moved=Math.hypot(state.player.x-oldX,state.player.y-oldY)>.00001;
      updateAnimation(moved && (!onWinterIce(state.player.x,state.player.y) || Boolean(dx||dy)),dt);
      updateTreeEffects(moved,dt);
      updateCamera(dx,dy,dt);render();
      const sliding=onWinterIce(state.player.x,state.player.y)&&Math.hypot(iceMotion.vx,iceMotion.vy)>ICE_PHYSICS.minSpeed;
      if(sliding){
        iceMotion.phase+=dt;
        const wave=Math.sin(iceMotion.phase*Math.PI*2/.82);
        sprite.style.transform=`translateX(calc(-50% + ${wave*ICE_PHYSICS.swayX}px)) scaleX(${activeMirror?-1:1}) rotate(${wave*ICE_PHYSICS.swayAngle}deg)`;
      }else sprite.style.transform=`translateX(-50%) scaleX(${activeMirror?-1:1})`;
    }
    requestAnimationFrame(frame);
  }
  startButton.addEventListener('click',async()=>{
    if(state.starting || state.playing) return;
    state.starting=true;status.hidden=false;status.textContent='Oberkirch wird geöffnet …';
    try {
      const jobs=[waitForImage(map)];
      for(const direction of ['down','left','right','up']) {
        const image=new Image();image.src=`assets/player/stand-${direction}.png`;
        images[`stand-${direction}`]=image;jobs.push(waitForImage(image));
      }
      for(let i=1;i<=11;i++) {
        const number=String(i).padStart(2,'0'),image=new Image();
        image.src=`assets/player/walk/frame-${number}.png`;
        images[`walk-${number}`]=image;jobs.push(waitForImage(image));
      }
      // All frames stay resident and decoded before control is enabled.
      await Promise.all(jobs);
      updateAnimation(false,0);
      menu.hidden=true;game.hidden=false;state.playing=true;keys.clear();
      camera.x=state.player.x;camera.y=state.player.y-PLAYER.height*.5;
      resize();game.focus({preventScroll:true});
    } catch(error) {
      console.error(error);status.textContent='Eine Bilddatei fehlt oder konnte nicht geladen werden. Bitte das ZIP vollständig entpacken und erneut versuchen.';
    } finally {state.starting=false;}
  });
  // MEHRSPIELER (LOKAL) deliberately has no click handler, navigation or action.
  addEventListener('keydown',event=>{
    if(!state.playing) return;
    if(['KeyW','KeyA','KeyS','KeyD','ArrowUp','ArrowDown','ArrowLeft','ArrowRight','Space'].includes(event.code)) {
      event.preventDefault();keys.add(event.code);
    }
  },{passive:false});
  addEventListener('keyup',event=>{
    keys.delete(event.code);
    if(state.playing && !['KeyW','KeyA','KeyS','KeyD','ArrowUp','ArrowDown','ArrowLeft','ArrowRight'].some(k=>keys.has(k))) {updateAnimation(false,0);stopTreeLeaves();}
  });
  function resetInput(){keys.clear();clearIceMotion();lastTime=0;if(state.playing)updateAnimation(false,0);stopTreeLeaves();}
  addEventListener('blur',resetInput);
  document.addEventListener('visibilitychange',resetInput);

  game.addEventListener('wheel',event=>event.preventDefault(),{passive:false});
  function resize(){width=innerWidth;height=innerHeight;render();}
  addEventListener('resize',resize);
  if(new URLSearchParams(location.search).get('debug')==='1') {
    const svg=document.createElementNS('http://www.w3.org/2000/svg','svg');
    svg.setAttribute('viewBox',`0 0 ${WORLD.width} ${WORLD.height}`);svg.classList.add('geometry-debug');
    for(const polygon of RIVER_BLOCK_ZONES) {
      const shape=document.createElementNS(svg.namespaceURI,'polygon');
      shape.setAttribute('points',polygon.map(p=>p.join(',')).join(' '));shape.setAttribute('fill','#f003');shape.setAttribute('stroke','#f55');shape.setAttribute('stroke-width','7');svg.append(shape);
    }
    for(const path of [STONE_BRIDGE_PATH.map(([x,y])=>[x,y+STONE_DECK.upperOffset]),STONE_BRIDGE_PATH.map(([x,y])=>[x,y+STONE_DECK.lowerOffset]),COVERED_BRIDGE_PATH]) {
      const line=document.createElementNS(svg.namespaceURI,'polyline');
      line.setAttribute('points',path.map(p=>p.join(',')).join(' '));line.setAttribute('fill','none');line.setAttribute('stroke','#ffe600');line.setAttribute('stroke-width','10');svg.append(line);
    }
    world.append(svg);
  }
  render();requestAnimationFrame(frame);
})();