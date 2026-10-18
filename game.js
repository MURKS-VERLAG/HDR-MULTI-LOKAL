/* Renchtal — Neubau 09: Winterbacher Burg und flächenabhängiges Winterwetter. Keine externen Bibliotheken, Musik oder fremden Hitboxen.
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
    winterbach:Object.freeze({id:'winterbach',width:10000,height:6006,image:'assets/maps/winterbach-12k.webp',name:'Winterbach'}),
    lautenbach:Object.freeze({id:'lautenbach',width:10000,height:10000*1365/2048,image:'assets/maps/lautenbach.webp',name:'Lautenbach'})
  });
  let activeMapId='oberkirch';
  function setActiveMap(id){if(!MAPS[id])throw new Error('Unknown map');activeMapId=id;}
  const WORLD=Object.freeze({get width(){return MAPS[activeMapId].width;},get height(){return MAPS[activeMapId].height;}});
  const MAP_ROUTES=Object.freeze({
    oberkirch:[{x1:2150,x2:3250,side:'north',target:'winterbach',spawn:{x:5485,y:5925}},
               {x1:5750,x2:6750,side:'north',target:'winterbach',spawn:{x:8175,y:5925}}],
    winterbach:[{x1:4900,x2:6150,side:'south',target:'oberkirch',spawn:{x:2590,y:673}},
                {x1:7750,x2:8600,side:'south',target:'oberkirch',spawn:{x:6225,y:760}},
                {x1:5270,x2:5670,side:'north',target:'lautenbach',spawn:{x:4780,y:10000*1365/2048-85}},
                {x1:7090,x2:7480,side:'north',target:'lautenbach',spawn:{x:7920,y:10000*1365/2048-85}}],
    lautenbach:[{x1:4520,x2:4920,side:'south',target:'winterbach',spawn:{x:5470,y:680}},
                {x1:7730,x2:8080,side:'south',target:'winterbach',spawn:{x:7310,y:680}}]
  });
  function exitRoute(player,dy){return MAP_ROUTES[activeMapId].find(r=>player.x>=r.x1&&player.x<=r.x2&&
    (r.side==='north'?dy<0&&player.y<=-18:dy>0&&player.y>=WORLD.height+PLAYER.height+18));}
  function footWithinMap(x,y){
    const lanes=MAP_ROUTES[activeMapId].filter(r=>x>=r.x1&&x<=r.x2);
    const minY=lanes.some(r=>r.side==='north')?-30:PLAYER.height;
    const maxY=lanes.some(r=>r.side==='south')?WORLD.height+PLAYER.height+35:WORLD.height-10;
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

  // Lautenbach geometry traced against the supplied 2048 x 1365 artwork.
  const lautenPoint=([x,y])=>Object.freeze([x/1800*10000,y/1200*(10000*1365/2048)]);
  const LAUTEN_RIVER=Object.freeze([[1192,0],[1195,40],[1207,80],[1203,116],[1204,144],[1204,190],[1215,221],[1233,258],[1240,296],[1248,333],[1252,371],[1259,407],[1277,442],[1282,470],[1264,500],[1259,535],[1255,574],[1245,610],[1234,645],[1217,682],[1195,720],[1175,757],[1155,790],[1138,818],[1114,852],[1095,887],[1084,924],[1071,960],[1058,1000],[1048,1040],[1034,1080],[1025,1120],[1017,1160],[1007,1200],[1278,1200],[1280,1160],[1283,1120],[1288,1080],[1291,1040],[1297,1000],[1305,960],[1310,924],[1311,887],[1312,852],[1308,818],[1305,790],[1312,757],[1320,720],[1326,682],[1335,645],[1340,610],[1342,574],[1344,535],[1352,500],[1360,470],[1356,442],[1343,407],[1331,371],[1324,333],[1314,296],[1306,258],[1298,221],[1288,190],[1284,144],[1282,116],[1277,80],[1266,40],[1258,0]].map(lautenPoint));
  const LAUTEN_ICE=Object.freeze([[1105,881],[1129,875],[1146,859],[1167,858],[1185,867],[1205,881],[1226,877],[1242,864],[1261,869],[1278,883],[1296,871],[1312,876],[1311,887],[1310,924],[1305,960],[1297,1000],[1291,1040],[1288,1080],[1283,1120],[1280,1160],[1278,1200],[1007,1200],[1017,1160],[1025,1120],[1034,1080],[1048,1040],[1058,1000],[1071,960],[1084,924],[1095,887]].map(lautenPoint));
  const LAUTEN_VINE_PATH=Object.freeze([[475.0,634.0],[449.009,632.215],[433.627,630.535],[417.824,627.76],[409.518,625.735],[404.627,624.24],[396.438,620.938],[392.913,619.088],[388.0,616.0],[385.141,613.592],[378.004,605.408],[375.0,603.0],[368.701,599.817],[355.497,594.639],[353.301,593.457],[352.492,592.659],[352.564,592.125],[353.249,591.504],[353.37,591.0],[348.0,579.3],[343.966,572.4],[340.791,565.5],[339.714,561.9],[339.667,558.6],[340.071,556.2],[340.788,553.8],[343.376,548.4],[345.6,544.8],[351.377,537.3],[354.666,530.4],[359.123,522.9],[360.007,520.5],[360.593,517.8],[360.798,515.4],[360.679,513.3],[359.444,509.4],[354.197,497.7],[351.846,493.5],[349.669,490.5],[346.856,487.2],[334.397,474.3],[326.099,464.1],[321.399,456.6],[318.497,450.3],[315.852,445.8],[314.907,443.7],[314.429,441.6],[314.381,439.5],[314.732,437.4],[316.556,431.4],[316.503,425.7],[316.7,423.0],[319.039,412.5],[319.979,405.6],[321.314,400.2],[321.291,398.1],[320.613,395.7],[318.825,392.4],[315.46,387.3],[312.81,384.0],[309.82,381.0],[305.017,377.4],[290.59,369.0],[283.582,364.2],[270.914,353.7],[263.981,347.1],[257.62,342.0],[255.522,339.9],[254.012,337.8],[252.655,334.8],[251.442,330.6],[251.189,327.9],[251.527,325.8],[252.464,323.4],[254.53,319.8],[268.185,299.4],[272.111,291.6],[273.205,288.6],[273.517,285.9],[273.138,283.2],[271.865,279.6],[265.987,267.9],[260.681,258.6],[258.002,254.7],[254.957,251.4],[251.263,248.4],[245.755,244.8],[223.766,232.2],[214.259,225.3],[205.005,219.3],[202.348,217.2],[199.82,214.8],[196.39,210.9],[193.923,207.6],[189.877,201.3],[188.933,198.9],[188.761,197.1],[189.411,194.1],[192.53,186.0],[193.86,183.0],[197.38,177.0],[198.885,171.9],[199.331,168.9],[199.271,166.5],[198.078,159.9],[196.982,156.3],[195.702,153.6],[193.877,150.6],[187.13,141.0],[184.448,137.7],[181.123,134.4],[173.386,127.5],[166.146,120.3],[156.908,112.5],[154.885,110.4]].map(lautenPoint));
  const LAUTEN_BRIDGE_PATH=Object.freeze([[1165,173],[1183,171],[1204,169],[1235,169],[1268,170],[1294,172],[1315,173]].map(lautenPoint));
  const LAUTEN_TREES=Object.freeze([[531,169,89,66],[1618,285,111,79],[499,799,102,62]].map(([x,y,rx,ry])=>({x:x/1800*10000,y:y/1200*(10000*1365/2048),rx:rx/1800*10000,ry:ry/1200*(10000*1365/2048)})));
  function lautenTerrainBlocked(x,y){
    if(activeMapId!=='lautenbach')return false;
    const p=closestPointOnBridgePath(x,y,LAUTEN_BRIDGE_PATH);
    // The bridge cannot be entered sideways through its rails.
    if(x>LAUTEN_BRIDGE_PATH[0][0]+45&&x<LAUTEN_BRIDGE_PATH.at(-1)[0]-45&&p.distance<115)return true;
    return worldPointInPolygon(x,y,LAUTEN_RIVER)&&!worldPointInPolygon(x,y,LAUTEN_ICE);
  }
  function engageLautenTrack(player,dx,dy){
    if(activeMapId!=='lautenbach')return null;
    const vine=LAUTEN_VINE_PATH[0],end=LAUTEN_BRIDGE_PATH.at(-1),start=LAUTEN_BRIDGE_PATH[0];
    if(dx<0&&dy<0&&Math.hypot(player.x-vine[0],player.y-vine[1])<95)
      return {id:'vineyard',path:LAUTEN_VINE_PATH,distance:0,snapping:true};
    if(dx>0&&Math.hypot(player.x-start[0],player.y-start[1])<110)
      return {id:'lautenBridge',path:LAUTEN_BRIDGE_PATH,distance:0,snapping:true};
    if(dx<0&&Math.hypot(player.x-end[0],player.y-end[1])<110)
      return {id:'lautenBridge',path:LAUTEN_BRIDGE_PATH,distance:getPathMetrics(LAUTEN_BRIDGE_PATH).total,snapping:true};
    return null;
  }
  function moveLautenTrack(player,track,dx,dy,dt){
    const vine=track.id==='vineyard';
    const direction=vine?(dx<0&&dy<0?1:dx>0&&dy>0?-1:0):Math.sign(dx);
    if(!direction)return track;
    if(track.snapping){
      const anchor=pointAtBridgeDistance(track.path,track.distance),gap=Math.hypot(anchor.x-player.x,anchor.y-player.y);
      const k=Math.min(1,PLAYER.speed*dt/Math.max(.001,gap));
      player.x+=(anchor.x-player.x)*k;player.y+=(anchor.y-player.y)*k;
      if(gap>PLAYER.speed*dt)return track;
      track.snapping=false;
    }
    const total=getPathMetrics(track.path).total;
    track.distance=clamp(track.distance+direction*PLAYER.speed*dt,0,total);
    Object.assign(player,pointAtBridgeDistance(track.path,track.distance));
    if(vine){
      if(track.distance<=.001&&direction<0){player.x+=12;player.y+=12;return null;}
    }else if((track.distance<=.001&&direction<0)||(track.distance>=total-.001&&direction>0)){
      player.x+=direction*12;return null;
    }
    return track;
  }

  const ICE_PHYSICS=Object.freeze({acceleration:5200,maxSpeed:PLAYER.speed*2,dragMoving:.985,dragNoInput:.975,minSpeed:14,swayAngle:4.6,swayX:8});
  const iceMotion={vx:0,vy:0,phase:0};
  function onWinterIce(x,y){return (activeMapId==='winterbach'&&worldPointInPolygon(x,y,WINTER_ICE))||(activeMapId==='lautenbach'&&worldPointInPolygon(x,y,LAUTEN_ICE));}
  function winterTerrainBlocked(x,y){
    if(activeMapId!=='winterbach')return false;
    if(worldPointInPolygon(x,y,WINTER_MOUNTAINS)&&!castleGroundOverridesMountain(x,y))return true;
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
  const WINTER_CASTLE=Object.freeze({x:1059.6494915121968,y:605.0907042154288,width:4336.72663106489,height:2891.1510873765938,sourceWidth:1536,sourceHeight:1024,splitY:550});
  // Ground footprints are independent of the sprite's front/back depth split.
  const CASTLE_COMPOUND_LOCAL=Object.freeze([[271,452],[278,425],[298,405],[330,390],[373,379],[423,372],[477,368],[531,368],[586,373],[640,384],[699,401],[756,416],[812,433],[866,451],[918,475],[963,501],[999,534],[1027,568],[1045,602],[1057,635],[1035,660],[999,704],[969,701],[938,706],[894,725],[839,744],[774,748],[704,743],[629,725],[558,704],[479,674],[405,644],[345,609],[304,567],[280,516]]);
  const CASTLE_ROCKS_LOCAL=Object.freeze([[[169.124,606.613],[199.225,606.613],[291.843,724.701],[333.521,766.379],[368.252,791.849],[453.924,831.211],[588.22,868.258],[625.267,872.889],[659.999,902.99],[669.26,916.883],[669.26,930.775],[657.683,942.353],[629.898,951.614],[481.709,951.614],[358.991,898.359],[257.111,842.788],[201.54,784.902],[166.809,710.808],[136.708,615.875],[143.654,608.928]],[[277.95,490.841],[268.688,490.841],[133.235,610.086],[200.383,610.086],[301.104,562.619],[305.735,562.619]]]);
  const CASTLE_GATE_LEAF_LOCAL=Object.freeze([[1031,552],[1087,581],[1086,653],[1031,626]]);
  const CASTLE_COLLIDERS=Object.freeze([CASTLE_COMPOUND_LOCAL,CASTLE_GATE_LEAF_LOCAL,...CASTLE_ROCKS_LOCAL].map(poly=>Object.freeze(poly.map(([x,y])=>Object.freeze([WINTER_CASTLE.x+x/1536*WINTER_CASTLE.width,WINTER_CASTLE.y+y/1024*WINTER_CASTLE.height])))));
  const CASTLE_GATE=Object.freeze({x:WINTER_CASTLE.x+1035/1536*WINTER_CASTLE.width,y:WINTER_CASTLE.y+660/1024*WINTER_CASTLE.height});
  // Blue area traced from the supplied in-game reference, registered to the castle PNG.
  const CASTLE_GATE_ZONE_LOCAL=Object.freeze([[1113.826,576.512],[1141.611,604.297],[1153.189,632.083],[1155.504,659.868],[1143.927,692.284],[1136.981,701.546],[1106.88,729.331],[1069.833,745.54],[1042.047,750.171],[988.792,747.855],[961.007,738.593],[940.168,727.016],[930.906,720.07],[910.067,696.915],[903.12,683.023],[896.174,659.868],[896.174,641.345],[900.805,620.506],[914.698,597.351],[933.221,578.827],[947.114,569.566],[970.268,557.988],[998.054,551.042],[1023.524,548.727],[1053.625,551.042],[1079.094,557.988]]);
  const CASTLE_GATE_ZONE=Object.freeze(CASTLE_GATE_ZONE_LOCAL.map(([x,y])=>Object.freeze([WINTER_CASTLE.x+x/1536*WINTER_CASTLE.width,WINTER_CASTLE.y+y/1024*WINTER_CASTLE.height])));
  function castleLocal(x,y){return {x:(x-WINTER_CASTLE.x)/WINTER_CASTLE.width*1536,y:(y-WINTER_CASTLE.y)/WINTER_CASTLE.height*1024};}
  // A continuous ground apron replaces the jagged alpha/mountain seam only around this prop.
  const CASTLE_TRAVEL_ENVELOPE_LOCAL=Object.freeze([[250,365],[190,420],[145,485],[125,545],[80,595],[25,630],[-20,690],[-10,755],[35,815],[95,860],[170,900],[230,960],[350,1025],[520,1055],[690,1050],[840,1010],[1010,945],[1140,865],[1240,815],[1550,815],[1580,675],[1360,610],[1140,510],[1080,460],[980,390],[860,330],[700,300],[560,300],[420,310],[310,340]]);
  function castleGroundOverridesMountain(x,y){
    const p=castleLocal(x,y);
    return worldPointInPolygon(p.x,p.y,CASTLE_TRAVEL_ENVELOPE_LOCAL);
  }
  function castleBehindFoot(x,y){const p=castleLocal(x,y);return activeMapId==='winterbach'&&p.x>=0&&p.x<=1536&&p.y>=0&&p.y<WINTER_CASTLE.splitY;}
  function castleBlockedFoot(x,y){
    if(activeMapId!=='winterbach')return false;
    const p=castleLocal(x,y);if(p.x<80||p.x>1095||p.y<315||p.y>990)return false;
    return CASTLE_COLLIDERS.some(poly=>worldPointInPolygon(x,y,poly));
  }
  function castleGateHighlighted(player){
    // Standing anywhere in the marked gate area lights the castle, including contact
    // with the gate/palisade. Facing direction must never suppress this highlight.
    return activeMapId==='winterbach'&&worldPointInPolygon(player.x,player.y,CASTLE_GATE_ZONE);
  }
  function castleFirstHit(x,y,dx,dy){
    let hit=null;
    for(const polygon of CASTLE_COLLIDERS){
      for(let i=0;i<polygon.length;i++){
        const [ax,ay]=polygon[i],[bx,by]=polygon[(i+1)%polygon.length],ex=bx-ax,ey=by-ay;
        const det=dx*ey-dy*ex;if(Math.abs(det)<1e-10)continue;
        const qx=ax-x,qy=ay-y,t=(qx*ey-qy*ex)/det,u=(qx*dy-qy*dx)/det;
        if(t>=-1e-8&&t<=1+1e-8&&u>=-1e-8&&u<=1+1e-8&&(!hit||t<hit.t))hit={t:Math.max(0,t),ax,ay,ex,ey};
      }
    }
    return hit;
  }
  function slideAgainstCastle(player,dx,dy){
    if(activeMapId!=='winterbach'||!castleBlockedFoot(player.x+dx,player.y+dy))return false;
    const hit=castleFirstHit(player.x,player.y,dx,dy);
    if(!hit)return true;
    const len=Math.hypot(hit.ex,hit.ey),tx=hit.ex/len,ty=hit.ey/len;
    const hx=player.x+dx*hit.t,hy=player.y+dy*hit.t;
    let nx=-ty,ny=tx;
    if((player.x-hx)*nx+(player.y-hy)*ny<0){nx=-nx;ny=-ny;}
    // A sub-pixel clearance prevents re-colliding with the same polygon edge.
    const safe={x:hx+nx*.45,y:hy+ny*.45};
    if(canMoveFootTo(safe.x,safe.y)){player.x=safe.x;player.y=safe.y;}
    const along=(dx*tx+dy*ty)*(1-hit.t);
    const target={x:player.x+tx*along,y:player.y+ty*along};
    if(canMoveFootTo(target.x,target.y)){player.x=target.x;player.y=target.y;return true;}
    // At a second edge, consume the valid portion instead of jumping into a corner.
    let lo=0,hi=1;for(let i=0;i<9;i++){const t=(lo+hi)/2;if(canMoveFootTo(player.x+tx*along*t,player.y+ty*along*t))lo=t;else hi=t;}
    player.x+=tx*along*lo;player.y+=ty*along*lo;return true;
  }
  const CASTLE_SNOW_GRID=Object.freeze([0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,2,4,4,1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,11,48,92,82,20,1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,4,57,157,222,210,67,6,3,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,4,58,141,174,143,49,63,55,13,2,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,2,10,13,5,1,19,78,79,46,60,166,196,102,31,5,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1,23,101,128,82,48,57,74,41,70,139,194,246,232,150,44,3,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,2,56,202,240,226,204,202,146,80,146,209,237,253,252,225,86,6,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1,24,96,144,207,246,254,229,199,239,251,240,204,144,93,28,1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1,4,13,47,110,173,211,222,201,152,91,38,10,2,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,4,20,46,59,38,13,2,0,0,0,0,0,1,3,2,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1,19,57,45,17,5,3,6,4,1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1,0,0,0,1,3,57,183,196,134,70,53,82,59,10,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,4,20,6,0,0,0,16,28,4,2,23,35,19,27,109,212,243,221,206,227,163,37,3,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,6,29,10,0,0,1,23,35,5,14,86,108,65,17,28,107,180,223,241,252,232,123,25,1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,2,15,26,6,0,2,1,0,0,0,2,3,0,7,44,86,96,51,34,42,72,107,131,196,249,205,51,2,2,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,3,30,98,108,24,0,1,0,0,0,0,0,0,0,3,47,161,209,171,139,71,40,67,79,97,158,101,13,17,42,19,3,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1,25,129,161,80,11,6,25,8,0,0,0,2,8,11,37,154,241,253,252,241,182,131,108,91,68,40,10,1,46,149,121,40,6,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,2,58,196,127,21,1,7,34,13,0,0,2,37,88,76,110,232,207,165,217,249,252,244,215,177,130,25,0,0,16,93,178,157,49,5,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,2,15,64,159,131,62,41,21,7,1,0,0,2,58,156,142,142,241,180,43,60,131,208,248,255,249,146,14,0,0,3,16,79,197,154,36,2,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1,29,134,164,129,154,187,196,175,88,20,4,1,4,28,111,156,150,228,162,62,53,22,46,121,192,194,71,2,0,3,52,79,37,108,210,117,16,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,9,79,227,245,130,123,238,255,254,226,163,103,82,112,119,105,144,163,222,175,107,100,33,1,6,27,33,7,0,1,12,136,219,126,57,171,194,45,2,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,7,61,130,232,253,161,57,162,241,255,255,253,244,240,248,247,223,208,221,251,247,188,97,35,9,2,0,0,0,15,46,41,138,250,234,122,157,223,120,30,2,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,12,96,196,251,255,221,68,33,119,221,251,254,255,255,255,255,255,255,255,254,255,252,212,147,121,71,23,5,8,72,169,140,172,252,254,197,153,226,234,145,28,1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,11,87,220,255,255,252,171,32,13,72,142,173,233,255,255,255,255,255,254,228,242,255,254,250,244,224,172,100,84,113,162,177,235,255,255,206,77,156,247,239,126,21,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,2,47,165,249,255,255,255,238,141,43,5,12,25,114,220,250,255,255,255,254,232,246,255,255,251,224,234,251,231,171,113,89,134,216,233,247,176,26,39,143,238,217,65,4,1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,6,49,131,208,253,255,255,255,248,188,68,7,0,13,62,135,193,220,245,242,225,251,255,255,255,244,221,248,246,185,149,157,194,155,88,119,78,7,1,58,218,213,75,43,22,2,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,9,51,70,69,140,207,238,254,252,254,253,208,83,12,0,1,9,28,57,104,102,88,186,236,246,250,251,252,247,226,231,233,204,137,50,6,8,6,0,0,33,180,228,145,105,59,27,15,1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,5,75,194,160,45,52,80,129,192,198,245,255,253,206,80,23,17,6,0,1,3,4,5,35,73,99,120,129,142,123,74,96,98,56,17,2,0,0,0,0,0,8,96,214,204,133,81,91,73,12,2,1,0,0,0,1,0,0,0,0,0,0,0,0,7,88,183,122,30,10,14,35,86,164,247,254,255,250,205,168,168,104,27,9,3,2,1,0,1,2,4,6,9,7,2,3,3,1,6,17,19,17,14,8,8,5,21,75,99,79,52,69,70,26,23,18,3,7,27,23,3,0,0,0,0,0,0,0,1,14,33,34,60,31,1,4,46,120,156,170,227,255,255,254,254,212,105,76,74,92,50,14,7,1,1,1,0,0,0,0,11,58,121,165,173,173,158,101,84,69,23,21,23,8,4,8,16,11,22,20,5,20,73,64,13,5,9,4,0,0,0,0,0,0,0,9,39,16,0,7,47,49,42,109,224,253,245,239,225,149,84,121,210,242,194,117,97,55,66,75,50,12,1,6,67,202,248,254,255,253,251,195,118,110,57,69,72,18,1,1,2,0,1,1,0,5,28,24,4,3,7,4,0,0,0,0,0,0,0,0,2,0,0,9,30,31,80,158,195,159,108,95,128,143,84,157,251,255,231,173,159,170,225,237,211,103,15,12,64,192,253,255,247,182,159,115,65,62,23,32,46,17,2,9,14,4,9,21,8,2,3,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1,8,10,27,81,78,40,16,5,6,51,116,78,127,201,202,207,171,96,153,249,255,253,165,31,25,96,174,242,239,173,60,23,16,48,70,16,1,2,1,0,5,32,33,62,122,64,25,33,10,1,1,2,0,0,0,0,0,0,0,0,0,0,0,0,0,0,5,42,42,5,0,0,0,4,15,13,32,51,59,76,69,29,79,214,250,252,165,43,61,196,240,176,101,44,6,6,11,14,31,11,0,0,0,0,3,36,43,54,105,62,28,47,18,2,4,7,1,0,0,0,0,0,0,0,0,0,0,0,0,0,3,53,72,13,0,1,1,0,0,0,1,4,12,8,2,2,29,97,137,204,203,92,47,126,193,110,17,2,0,6,11,1,2,1,0,0,0,0,0,7,8,6,15,9,4,9,3,0,0,1,0,0,0,0,0,0,0,0,0,0,0,0,2,3,1,15,24,4,5,17,10,0,4,25,47,61,88,45,3,0,3,14,15,60,104,69,35,37,47,25,2,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,12,20,1,0,0,1,14,13,4,2,38,118,183,152,113,60,21,2,0,0,0,2,8,29,89,78,10,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,4,7,0,0,0,0,2,1,0,2,34,102,158,104,37,31,36,5,0,0,0,0,0,7,51,53,6,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,2,17,18,18,45,68,41,8,9,1,0,0,0,0,0,0,2,3,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,10,64,52,4,11,63,46,3,0,0,0,0,0,3,2,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,3,24,18,1,1,13,9,0,0,0,0,0,1,20,14,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,6,4,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0]);
  const CASTLE_ART_ALPHA_GRID=Object.freeze([0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1,41,5,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,12,138,27,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,20,129,231,148,26,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1,45,175,247,253,249,188,60,3,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,7,84,211,252,253,253,253,253,225,111,18,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,25,135,236,253,253,253,253,253,253,253,246,180,60,4,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,18,170,249,253,253,253,253,253,253,253,253,253,253,209,42,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,4,136,253,253,253,253,253,253,253,253,253,254,253,172,8,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,113,252,253,253,254,253,253,254,254,253,254,253,157,3,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,50,219,253,253,253,253,253,254,254,254,253,238,77,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,11,189,253,253,253,253,253,253,253,254,253,226,37,0,0,1,9,1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,10,187,253,253,253,253,253,253,253,253,253,227,38,0,0,42,170,115,39,5,2,21,12,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,10,187,253,253,253,253,253,253,253,253,254,227,39,1,11,159,252,250,221,148,87,193,126,2,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,10,188,253,253,253,253,253,253,253,253,253,241,150,136,152,240,253,253,253,252,243,251,171,19,1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,14,191,253,253,253,253,253,253,253,253,253,254,253,252,252,253,253,253,253,253,253,253,244,185,41,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1,34,139,238,253,253,253,253,253,253,253,253,253,253,253,253,253,253,253,253,253,253,253,253,253,251,161,18,5,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,62,203,249,253,253,253,253,253,253,253,253,253,253,253,253,253,253,253,253,253,253,253,253,254,253,253,244,188,136,36,1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,13,179,253,253,253,253,253,253,253,253,253,253,253,254,253,253,253,253,253,254,253,253,253,253,253,253,254,253,253,250,200,72,3,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,12,131,238,253,253,253,253,253,253,253,253,253,253,253,253,253,253,253,253,253,253,253,253,253,253,253,254,254,253,253,253,253,220,58,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,4,79,237,253,253,253,253,253,253,253,253,253,253,253,253,253,253,253,253,253,253,254,253,253,253,253,253,254,254,253,253,253,253,252,196,32,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,3,85,223,252,253,253,253,253,253,253,253,253,253,253,253,253,253,253,253,253,253,253,253,253,253,253,253,253,253,253,253,253,253,253,253,250,122,1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,48,216,253,253,253,253,253,253,253,253,253,253,253,253,253,253,253,253,253,253,253,253,253,253,253,253,253,253,253,253,253,253,253,253,253,253,187,19,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,3,135,251,253,253,253,253,253,253,253,253,253,253,253,253,253,253,253,253,253,253,253,253,253,253,253,253,253,253,253,254,254,253,253,253,253,253,244,179,64,2,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,2,35,210,253,253,253,253,253,253,253,253,254,253,254,253,253,253,253,253,253,253,253,253,253,253,253,253,253,253,253,253,253,253,253,253,253,253,253,253,253,215,58,10,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,2,85,197,248,253,253,253,253,253,253,253,253,253,253,253,253,253,253,253,253,253,253,253,253,253,253,253,253,253,253,253,253,253,253,253,253,253,253,253,253,253,252,220,164,32,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,4,57,208,253,253,253,253,253,253,253,253,253,253,253,253,253,253,253,253,253,253,253,253,253,253,253,253,253,253,253,253,253,253,253,253,253,253,253,253,253,253,253,253,253,250,163,15,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1,99,224,252,253,253,253,253,253,253,253,253,253,253,253,253,254,253,253,253,253,253,253,253,253,253,253,253,253,253,253,253,253,253,253,253,253,253,253,253,253,253,253,253,253,253,243,127,33,14,0,0,0,0,0,0,0,0,0,0,0,0,0,2,71,208,253,253,253,253,253,253,253,253,253,253,253,253,253,253,253,253,253,253,253,253,253,253,253,253,253,253,253,253,253,253,253,253,253,253,253,253,253,253,253,253,253,253,253,253,253,246,218,178,88,24,3,1,2,0,0,0,0,0,0,0,1,61,215,253,253,253,253,253,253,253,253,253,253,253,253,253,253,253,253,253,253,253,253,253,253,253,253,253,253,253,254,253,253,253,253,253,253,253,253,253,253,253,253,253,253,253,253,253,253,253,253,253,246,196,156,139,132,62,31,10,1,0,0,0,1,120,250,253,253,253,253,253,253,253,253,253,253,253,253,253,253,253,253,253,253,253,253,253,253,253,253,253,253,253,253,253,253,253,253,253,253,253,253,253,253,253,253,253,253,253,253,253,253,253,253,253,253,253,253,253,251,237,214,178,127,92,54,11,0,73,233,253,253,253,253,253,253,253,253,253,253,253,253,253,253,253,253,253,253,253,253,253,253,253,253,253,253,253,253,253,253,253,253,253,253,253,253,253,253,253,253,253,253,253,253,253,253,253,253,253,253,253,253,253,253,253,253,253,253,248,231,122,0,63,231,253,253,253,253,253,253,253,253,253,253,253,253,253,253,253,253,253,253,253,253,253,253,253,253,253,253,253,253,253,253,253,253,253,253,253,253,253,253,253,253,253,253,253,253,253,253,253,253,253,253,253,253,253,253,253,253,253,253,253,245,94,0,13,139,230,253,253,253,253,253,253,253,253,253,253,253,253,253,253,253,253,253,253,253,253,253,253,253,253,253,253,253,253,253,253,253,253,253,253,253,253,253,253,253,253,253,253,253,253,253,253,253,253,253,253,253,253,253,253,253,252,253,252,198,31,0,0,13,144,215,248,253,253,253,253,253,253,253,253,253,253,253,253,253,253,253,253,253,253,253,253,253,253,253,253,253,253,253,253,253,253,253,253,253,253,253,253,253,253,253,253,253,253,253,253,242,229,237,218,209,221,157,168,148,125,133,137,61,1,0,0,1,13,70,233,253,253,253,253,253,253,253,253,253,253,253,253,253,253,253,253,253,253,253,253,253,253,253,253,253,253,253,253,253,253,253,253,253,253,253,253,253,253,253,253,253,253,251,207,126,50,61,46,27,47,6,6,2,0,0,1,0,0,0,0,0,0,36,194,239,252,253,253,253,253,253,253,253,253,253,253,253,253,253,253,253,253,253,253,253,253,253,253,253,253,253,253,253,253,253,253,253,253,253,253,253,253,253,253,253,252,173,62,4,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,2,37,103,240,253,253,253,253,253,253,253,253,253,253,253,253,253,253,253,253,253,253,253,253,253,253,253,253,253,253,253,253,253,253,253,253,253,253,253,253,253,251,244,196,86,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,19,117,198,249,253,253,253,253,253,253,253,253,253,253,253,253,253,253,253,253,253,253,253,253,253,253,253,253,253,253,253,253,253,253,253,253,253,252,225,195,93,42,2,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,2,29,159,213,246,252,253,253,253,253,253,253,253,253,253,253,253,253,253,253,253,253,253,253,253,253,253,253,253,253,253,253,253,253,249,232,209,64,20,3,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,15,38,118,157,232,249,253,253,253,253,253,253,253,253,253,253,253,253,253,253,253,253,253,253,253,253,253,253,253,253,249,241,207,67,57,5,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,15,58,173,211,240,248,250,253,252,253,253,253,253,253,253,250,252,253,253,253,253,253,253,250,248,211,208,112,65,44,6,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1,15,31,112,93,122,175,134,194,220,234,225,248,245,200,211,240,228,245,227,168,182,129,110,38,28,5,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1,0,1,8,3,29,41,60,47,124,124,56,44,74,51,89,59,7,13,6,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0]);
  function sampleWeatherGrid(grid,w,h,x,y){
    const fx=clamp(x,0,1)*(w-1),fy=clamp(y,0,1)*(h-1),ix=Math.floor(fx),iy=Math.floor(fy),tx=fx-ix,ty=fy-iy;
    const at=(x,y)=>grid[Math.min(h-1,y)*w+Math.min(w-1,x)]/255;
    return (at(ix,iy)*(1-tx)+at(ix+1,iy)*tx)*(1-ty)+(at(ix,iy+1)*(1-tx)+at(ix+1,iy+1)*tx)*ty;
  }
  const WINTER_SNOW_GRID=[46,72,101,96,86,53,65,131,189,222,229,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,251,127,115,141,220,255,255,255,255,255,255,229,217,255,255,255,255,255,255,255,255,255,255,255,255,246,255,255,255,255,36,48,67,74,62,39,55,105,160,215,243,229,205,196,222,255,255,255,255,255,255,229,220,243,255,255,255,255,255,255,255,255,255,255,234,120,96,117,203,255,255,255,255,255,255,227,201,255,255,255,255,255,255,255,255,255,253,220,215,217,234,248,255,255,79,67,70,74,65,31,34,84,155,231,255,205,167,170,193,248,255,255,255,255,255,215,212,246,255,255,255,255,255,255,255,234,243,255,215,115,86,103,203,255,255,255,255,255,255,222,189,210,255,255,255,255,255,255,255,255,189,165,191,201,224,255,255,255,141,108,84,72,60,22,15,48,115,196,224,198,184,201,234,255,255,255,208,189,201,229,255,255,255,255,255,255,255,255,255,239,243,229,179,103,86,101,210,255,255,255,255,255,255,212,174,162,212,255,255,255,203,222,253,215,177,172,186,177,198,236,255,255,167,124,91,70,48,10,0,8,46,110,155,184,186,191,217,234,201,146,108,93,120,191,255,255,255,255,255,255,255,255,184,179,196,189,146,77,60,79,196,255,255,255,255,255,255,208,143,110,136,196,229,186,153,177,210,191,210,231,243,212,189,201,255,255,189,136,93,62,34,1,0,0,12,48,93,148,165,160,165,151,89,39,24,27,36,81,167,241,251,227,217,229,231,201,143,117,127,141,115,65,60,77,170,255,255,255,255,255,255,201,105,77,112,170,177,146,139,158,172,146,184,251,255,255,253,220,255,255,177,122,67,31,5,0,0,0,22,31,60,131,165,131,101,74,29,0,0,0,0,3,51,122,153,148,143,160,172,189,179,151,120,105,84,81,112,112,153,255,255,255,255,255,255,201,84,62,115,165,172,160,165,177,158,127,165,255,255,255,255,229,201,212,162,120,70,29,1,0,0,3,22,20,41,117,151,96,41,15,0,0,0,0,0,0,0,27,67,86,81,79,103,158,201,215,167,103,65,91,141,115,120,241,255,255,255,255,255,191,81,65,105,122,139,181,222,224,191,167,193,251,255,236,191,131,77,58,201,160,117,74,31,1,0,0,10,5,29,101,124,65,10,0,0,0,0,0,0,0,0,0,1,17,20,20,46,115,191,236,196,105,43,62,101,81,86,201,255,255,255,255,255,158,60,41,62,62,93,174,251,255,253,231,222,196,141,93,55,17,0,0,248,208,165,115,62,17,0,0,5,3,22,77,103,51,0,0,0,0,0,0,0,0,0,0,0,0,0,1,31,84,146,184,165,93,24,27,62,70,72,155,255,255,255,255,255,108,34,29,58,67,98,177,255,255,255,255,255,174,67,5,0,0,0,0,255,255,198,127,74,29,0,0,3,20,43,79,86,34,0,0,0,0,0,0,0,0,0,0,0,0,0,0,24,70,115,143,139,84,22,29,86,98,81,120,239,255,255,255,172,65,24,55,122,143,160,215,253,255,255,255,255,222,93,1,0,0,0,0,255,203,146,77,34,10,0,1,20,51,89,101,62,10,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1,51,110,134,112,55,10,41,112,112,72,81,162,217,222,179,96,39,24,84,179,196,189,217,217,196,231,255,255,234,146,41,0,0,0,0,170,129,93,36,0,0,3,27,55,77,93,81,29,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,24,77,89,60,15,0,24,93,103,58,41,86,129,136,103,48,27,27,81,189,231,205,174,139,124,181,217,193,184,158,84,8,0,0,0,134,110,93,39,0,0,5,29,65,81,72,43,10,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,17,46,46,17,0,0,0,39,65,34,15,43,81,89,58,17,8,15,46,136,215,203,136,93,112,174,193,148,120,131,115,58,0,0,0,110,86,62,22,0,0,0,1,31,55,51,27,17,3,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,8,12,5,0,0,0,0,0,12,0,0,15,48,48,27,0,0,0,12,77,170,196,151,124,155,193,165,98,62,101,148,139,55,0,0,74,60,41,15,0,0,0,0,12,24,24,20,24,5,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,3,10,5,0,0,0,0,24,96,160,170,146,136,148,110,46,17,65,158,203,124,20,0,48,39,39,27,0,0,0,8,29,29,24,12,5,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1,10,5,0,0,0,0,0,0,0,0,0,0,24,91,131,101,67,86,89,41,1,17,93,167,134,39,0,51,24,17,10,0,0,0,12,36,41,41,12,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1,34,48,12,0,0,0,0,0,0,0,0,0,0,41,81,51,27,60,98,62,10,0,31,84,84,36,0,51,22,1,0,0,0,0,17,39,31,20,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,20,46,12,0,0,0,0,0,0,0,0,0,0,3,29,17,10,39,67,53,29,22,36,62,67,39,8,62,41,15,0,0,0,0,17,36,20,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,3,0,0,0,0,0,0,0,0,0,0,0,0,0,1,15,41,70,72,65,62,70,74,62,27,0,98,70,36,0,0,0,17,15,8,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,22,58,79,105,91,60,43,36,24,10,0,0,89,58,31,1,0,1,22,12,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,46,79,70,65,46,20,0,0,0,0,0,0,29,24,27,12,3,5,5,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,17,36,20,5,1,0,0,0,0,0,0,0,0,5,25,33,29,15,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,18,33,25,5,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,10,3,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0];
  function winterSnowBaseAt(x,y){
    let coverage=sampleWeatherGrid(WINTER_SNOW_GRID,64,40,x/10000,y/6006);
    // Snow on the shaded western mountains must not depend on their gray pixel color.
    if(worldPointInPolygon(x,y,WINTER_MOUNTAINS))coverage=Math.max(coverage,.96);
    else{
      let distance=Infinity;
      for(let i=0;i<WINTER_MOUNTAINS.length;i++){
        const [ax,ay]=WINTER_MOUNTAINS[i],[bx,by]=WINTER_MOUNTAINS[(i+1)%WINTER_MOUNTAINS.length];
        const dx=bx-ax,dy=by-ay,t=clamp(((x-ax)*dx+(y-ay)*dy)/(dx*dx+dy*dy),0,1);
        distance=Math.min(distance,Math.hypot(x-ax-dx*t,y-ay-dy*t));
      }
      coverage=Math.max(coverage,.96*clamp(1-distance/90,0,1));
    }
    const p=castleLocal(x,y);
    if(p.x>=0&&p.x<=1536&&p.y>=0&&p.y<=1024){
      const alpha=sampleWeatherGrid(CASTLE_ART_ALPHA_GRID,64,43,p.x/1536,p.y/1024);
      const snow=sampleWeatherGrid(CASTLE_SNOW_GRID,64,43,p.x/1536,p.y/1024);
      coverage=coverage*(1-alpha)+snow*alpha;
    }
    return clamp(coverage,0,1);
  }
  function winterSnowCoverageAt(x,y){
    if(x<0||y<0||x>10000||y>6006)return 0;
    // Exactly ten WORLD pixels of downward extension, independent of camera zoom.
    return Math.max(winterSnowBaseAt(x,y),winterSnowBaseAt(x,Math.max(0,y-10)));
  }
  function castleSnowfallCoverageAt(x,y){
    const p=castleLocal(x,y);
    if(p.x<0||p.x>1536||p.y<0||p.y>1024)return 0;
    // Snow falls in front of the whole prop, including tower walls and the grassy slope.
    // The frost tint still uses the separate snow/grass mask above.
    return .95*sampleWeatherGrid(CASTLE_ART_ALPHA_GRID,64,43,p.x/1536,p.y/1024);
  }
  function winterSnowParticleCoverageAt(x,y){
    if(x<0||y<0||x>10000||y>6006)return 0;
    return Math.max(winterSnowCoverageAt(x,y),castleSnowfallCoverageAt(x,y),castleSnowfallCoverageAt(x,Math.max(0,y-10)));
  }
  function winterSnowCoverage(x,y){return activeMapId==='winterbach'?winterSnowParticleCoverageAt(x,y):0;}
  function canMoveFootTo(x,y) {
    return footWithinMap(x,y) && !isRiverBlockedFootPoint(x,y) && !isStoneStructureBlocked(x,y) && !isCoveredStructureBlocked(x,y) && !winterTerrainBlocked(x,y) && !castleBlockedFoot(x,y) && !lautenTerrainBlocked(x,y);
  }
  function movePlayer(player,bridge,dx,dy,dt) {
    if(activeMapId==='lautenbach'){
      bridge=bridge||engageLautenTrack(player,dx,dy);
      if(bridge)return moveLautenTrack(player,bridge,dx,dy,dt);
    }
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
      const localTrack=engageLautenTrack(player,dx,dy);
      if(localTrack)return moveLautenTrack(player,localTrack,dx,dy,dt*(steps-i)/steps);
      const stone=engageStoneBridge(player,dx,dy);
      if(stone) return moveAlongStoneBridge(player,stone,dx,dy,dt*(steps-i)/steps);
      if(slideAgainstCastle(player,sx,sy))continue;
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
    if(activeMapId==='lautenbach')return LAUTEN_TREES.findIndex(t=>((x-t.x)/t.rx)**2+((y-t.y)/t.ry)**2<=1);
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
    module.exports={LAUTEN_RIVER,LAUTEN_ICE,LAUTEN_VINE_PATH,LAUTEN_BRIDGE_PATH,LAUTEN_TREES,lautenTerrainBlocked,engageLautenTrack,moveLautenTrack,CASTLE_GATE_ZONE_LOCAL,CASTLE_GATE_ZONE,CASTLE_TRAVEL_ENVELOPE_LOCAL,castleSnowfallCoverageAt,winterSnowParticleCoverageAt,WINTER_CASTLE,CASTLE_COLLIDERS,CASTLE_COMPOUND_LOCAL,CASTLE_ROCKS_LOCAL,CASTLE_GATE,castleGroundOverridesMountain,castleLocal,castleBlockedFoot,castleBehindFoot,castleGateHighlighted,castleFirstHit,slideAgainstCastle,CASTLE_SNOW_GRID,CASTLE_ART_ALPHA_GRID,sampleWeatherGrid,winterSnowBaseAt,winterSnowCoverageAt,WINTER_SNOW_GRID,winterSnowCoverage,WINTER_RIVER,WINTER_ICE,WINTER_MOUNTAINS,ICE_PHYSICS,iceMotion,onWinterIce,winterTerrainBlocked,clearIceMotion,movePlayerOnIce,COVERED_STRUCTURE,isCoveredStructureBlocked,MAPS,MAP_ROUTES,setActiveMap,exitRoute,footWithinMap,taperedTreeContains,STONE_STRUCTURE,isStoneStructureBlocked,LOWER_BRIDGE_TREES,TREE_AREAS,treeAreaAt,shouldPlayTreeEffects,STONE_DECK,stonePointAtX,insideStoneDeck,engageStoneBridge,moveAlongStoneBridge,trackCamera,VERTICAL_WALK_FRAME_MS,UP_WALK_OFFSETS,walkFrameDuration,SPRITE_BOUNDS,WALK_SEQUENCES,WALK_FRAME_MS,TARGET_VISIBLE_HEIGHT,spriteLayout,directionForInput,advanceWalkAnimation,STONE_BRIDGE_REFERENCE,STONE_BRIDGE_LOWER_PATH,WORLD,PLAYER,BRIDGE_CONFIG,STONE_BRIDGE_PATH,COVERED_BRIDGE_PATH,RIVER_BLOCK_ZONES,getPathMetrics,closestPointOnBridgePath,pointAtBridgeDistance,isRiverBlockedFootPoint,tryEngageBridge,moveAlongActiveBridge,playerInsideCoveredBridgeInterior,canMoveFootTo,movePlayer,coverCamera};
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

  const castleImage=new Image();castleImage.src='assets/props/winterbach-tower.png';castleImage.alt='';castleImage.draggable=false;
  Object.assign(castleImage.style,{position:'absolute',left:`${WINTER_CASTLE.x}px`,top:`${WINTER_CASTLE.y}px`,width:`${WINTER_CASTLE.width}px`,height:`${WINTER_CASTLE.height}px`,zIndex:'9',pointerEvents:'none',userSelect:'none',display:'none',transition:'filter 140ms ease-out'});
  world.appendChild(castleImage);
  let castleIsHighlighted=false;
  const weatherCanvas=document.createElement('canvas');weatherCanvas.setAttribute('aria-hidden','true');
  Object.assign(weatherCanvas.style,{position:'absolute',inset:'0',width:'100%',height:'100%',pointerEvents:'none',zIndex:'30',display:'none'});game.appendChild(weatherCanvas);
  const weatherContext=weatherCanvas.getContext('2d');
  const frostCanvas=document.createElement('canvas');frostCanvas.width=192;frostCanvas.height=116;
  const frostContext=frostCanvas.getContext('2d'),frostImage=frostContext.createImageData(192,116);
  for(let y=0;y<116;y++)for(let x=0;x<192;x++){
    const i=(y*192+x)*4,coverage=winterSnowCoverageAt(x/191*10000,y/115*6006);
    frostImage.data[i]=183;frostImage.data[i+1]=216;frostImage.data[i+2]=244;frostImage.data[i+3]=Math.round(coverage*255*.18);
  }
  frostContext.putImageData(frostImage,0,0);
  function snowSpawn(){
    let x=0,y=0;
    for(let i=0;i<60;i++){x=Math.random()*10000;y=Math.random()*6006;if(winterSnowParticleCoverageAt(x,y)>.25)break;}
    return {x,y};
  }
  const snowflakes=Array.from({length:850},()=>({...snowSpawn(),speed:(38+Math.random()*35)*1.12,size:.9+Math.random()*1.7,phase:Math.random()*Math.PI*2,age:Math.random()*20}));
  function renderWinterWeather(dt){
    if(activeMapId!=='winterbach')return;
    weatherCanvas.style.display='block';
    if(weatherCanvas.width!==width||weatherCanvas.height!==height){weatherCanvas.width=width;weatherCanvas.height=height;}
    const ctx=weatherContext;ctx.clearRect(0,0,width,height);
    const scale=camera.scale,tx=width/2-camera.x*scale,ty=height/2-camera.y*scale;
    ctx.drawImage(frostCanvas,tx,ty,WORLD.width*scale,WORLD.height*scale);
    for(const f of snowflakes){
      f.age+=dt;f.y+=f.speed*dt;f.x+=Math.sin(f.age*.6+f.phase)*12*dt;
      if(f.y>6006||winterSnowCoverage(f.x,f.y)<.015)Object.assign(f,snowSpawn());if(f.x<0)f.x+=10000;if(f.x>10000)f.x-=10000;
      const coverage=winterSnowCoverage(f.x,f.y);if(coverage<.04)continue;
      const x=tx+f.x*scale,y=ty+f.y*scale;if(x< -3||x>width+3||y< -3||y>height+3)continue;
      ctx.beginPath();ctx.arc(x,y,f.size,0,Math.PI*2);ctx.fillStyle=`rgba(246,250,255,${coverage*.88})`;ctx.fill();
    }
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
      render();renderWinterWeather(0);mapCurtain.style.transition='none';
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
    castleImage.style.display=activeMapId==='winterbach'?'block':'none';
    const highlight=castleGateHighlighted(state.player);
    if(highlight!==castleIsHighlighted){
      castleIsHighlighted=highlight;
      castleImage.style.filter=highlight?'drop-shadow(0 0 9px #fff) drop-shadow(0 0 18px rgba(255,255,255,.95)) brightness(1.12)':'';
    }
    playerEl.style.zIndex=castleBehindFoot(state.player.x,state.player.y)?'8':'10';
    weatherCanvas.style.display=activeMapId==='winterbach'?'block':'none';
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
      updateCamera(dx,dy,dt);render();renderWinterWeather(dt);
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
      const jobs=[waitForImage(map),waitForImage(castleImage)];
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