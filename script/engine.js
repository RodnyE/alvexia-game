
//objetos del juego
gx = {
  player: null,
  world: null,
  pjs: {},
  obj: {},
  cache: PIXI.utils.TextureCache,
  obj_colision: {},
  get src(){return game.loader.resources},
  
  /* atributos editables */
  _paint_offset: 200, //espacio de dibujado fuera de la pantalla
  _tile_size: 100, //tamaño de cuadrícula
  _screen_reference: 620*2, //ancho de pantalla de referencia para escala
  _emitps: 5,  //emit por segundo
  _engine_fps: 30,  //cuadros por segundo
  _smooth_mov_fps: 60, //velocidad de suavizado de movimiento
  _smooth_mov_steps: 30, //cantidad de pasos en el suavisado

  _colision_enable: true,
  _colision_axis: true,
  _colision_center: true,
};


// INICIALIZAR JUEGO //
engine.init = function(){
  let callback = ()=>{};
  cvw = function (n){return screen.width * (n * 100 / gx._screen_reference) / 100};
  gx._paint_offset = cvw(gx._paint_offset);
  
  // PLAYER //
  gx.player = {
    pos: {
      x: 0, 
      y: 0,
      get z(){return (gx.player.pos.y + gx.player.size.y) / gx.world.size.y}
    },
    speed: 0,
    mov: {x:0, y:0},
    size: {x:40, y:50},
    status: {
      level: 0,
      hp: 0,
      mp: 0,
      xp: 0,
      hp_max: 0,
      mp_max: 0,
      xp_max: 0,
      get $hp(){return gx.player.status.hp / gx.player.status.hp_max * 100},
      get $mp(){return gx.player.status.mp / gx.player.status.mp_max * 100},
      get $xp(){return gx.player.status.xp / gx.player.status.xp_max * 100}
    },
    get deg(){
      let deg = Math.atan2(gx.player.mov.y, gx.player.mov.x) * (180/Math.PI);
      return -deg<0? 360-deg: -deg
    },
    texture: null,
    mov_sprite: {
      texture: 0,
      time: 1,
      x: 0
    },
    
    _emit_joy_enable: false,
  };
  
  // WORLD //
  gx.world = {
    size: {x:0, y:0},
    pos: {x:0, y:0},
    bioma: "nature",
    textures: [],
    sprite: null
  };
  
  engine.load_textures().ready(()=>{
    gx.player.sprite = new PIXI.Sprite(gx.src["pj_hero_male_1"].texture);
    gx.world.sprite = new PIXI.TilingSprite(gx.src["w_floor"].texture);
   
    callback();
  });
  return {ready: n=>{callback = n}}
}

engine.animation = function(){
  var world = gx.world;
  var player = gx.player;
  
  // MOSTRAR //
  if(gx.render) gx.render.stop()
  else gx.render = mx.Animate("pixi", engine.generate_frame);
  
  
  // LOGICA //
  const logic = mx.Animate(gx._engine_fps, ()=>{
    if(config.USER.is_connect){
      
      let p_cx = mx.round(player.pos.x + (player.mov.x>player.speed? player.speed:player.mov.x));
      let p_cy = mx.round(player.pos.y + (player.mov.y>player.speed? player.speed:player.mov.y));
      
      // COLISION BORDE DEL MAPA //
      //x
      if( p_cx > 0 ) {
        if (p_cx > world.size.x) p_cx = world.size.x
      } else p_cx = 0;
      //y
      if( p_cy > 0 ) {
        if (p_cy > world.size.y) p_cy = world.size.y
      } else p_cy = 0;
      
     //AUN EN DESARROLLO
     //esta colisionando con algo?
     if(gx._colision_enable) {
      let _player = {
        pos: {
          x: p_cx - (!gx._colision_center?player.size.x/2:0),
          y: p_cy - (!gx._colision_center?player.size.y/2:0),
        },
        size: gx._colision_center?{x:0,y:0}:player.size
      }
      
      for(let i in gx.obj_colision){
        let obj = gx.obj_colision[i];
        let colision = engine.collision(_player, obj);
        if(obj.type === 0 ){
          if(colision.x || (colision.t && gx._colision_axis)) {
            p_cx = player.pos.x;
            //console.log("colision x:")
          }
          if(colision.y || (colision.t && gx._colision_axis)) {
            p_cy = player.pos.y;
            //console.log("colision y:")
          }
        }
      }
     }
      
      //desplazar
      player.pos.x = p_cx;
      player.pos.y = p_cy;
      world.pos.x = -p_cx;
      world.pos.y = -p_cy;
      
    }
  });
  
  // EMITIR AL SERVIDOR //
  const emit = mx.Animate(gx._emitps, function(){
    if(player._emit_joy_enable){
        let emit_data = 
          player.pos.x.toFixed(2)+"&" + 
          player.pos.y.toFixed(2)+"&" + 
          player.deg;
        socket.emit("move_pj", emit_data);
        bytes_s += emit_data.length;
        total_emit++;
    }
  });
  
  //iniciar
  logic.start();
  emit.start();
  gx.render.start();
}

// ACCIONES JOYSTICK //
engine.joystick = function(d){
    var player = gx.player;
    player._emit_joy_enable = d.x!=0 && d.y!=0;
    player.mov.x = d.x/100 * player.speed;
    player.mov.y = -d.y/100 * player.speed;
}

// CARGAR DATOS LOCALES DEL MUNDO //
engine.load_textures = function(){
  let callback = ()=>{};
  
  const world = gx.world;
  const path_world = config.PATH.img_world + "/" + gx.world.bioma;
  const path_pj = config.PATH.img_pjs;
  
  // CARGAR TEXTURAS EN LA CACHÉ //
  const cache = new engine.cache();
  cache.add("w_floor", mx.BImg(path_world+"/base"));
  for (let i = 1; i <= 1; i++) cache.add("w_tree_"+i, mx.BImg(path_world+"/tree_"+i));
  for (let i = 1; i <= 1; i++) {
    let _path = path_pj+"/hero_male_"+i;
    cache.add("pj_hero_male_"+i, mx.BImg(_path+"/hero_male_"+i));
    for (let o = 1; o <= 3; o++) cache.add("pj_hero_male_"+i+"_m"+o, mx.BImg(_path+"/hero_male_"+i+"_m"+o));
  }
  cache.save(() => callback());
  
  return {ready: n=>{callback=n}}
};

// COLISION //
engine.collision = function(oo1, oo2){
  let res = {x:false , y:false};
  
  let o1 = {
    pos: oo1.coll_min !== undefined? oo1.coll_min : oo1.pos,
    size: oo1.coll_max!== undefined? oo1.coll_max : oo1.size,
  }
  let o2 = {
    pos: oo2.coll_min !== undefined? oo2.coll_min : oo2.pos,
    size: oo2.coll_max!== undefined? oo2.coll_max : oo2.size,
  }
  
  if(
     o1.pos.x + o1.size.x >= o2.pos.x && //derecha o1
     o1.pos.x <= o2.pos.x + o2.size.x &&   //izquierda o1
     o1.pos.y + o1.size.y >= o2.pos.y && //arriba o1
     o1.pos.y <= o2.pos.y + o2.size.y  //abajo o1
  ) {
     if(m(o1.pos.x - o2.pos.x) > m(o1.pos.y - o2.pos.y)) res.x = true;
     else if(m(o1.pos.x - o2.pos.x) < m(o1.pos.y - o2.pos.y)) res.y = true;
     else {
       res.x = true;
       res.y = true;
     };
  }
  
  res.t = res.x || res.y;
  return res;
  
  function m(n){return n<0?-n:n}
}

// PINTAR FRAME //
engine.generate_frame =  function(){
  if(config.TEST_ENABLE) fps_count.tickStart();
  let player = gx.player;
  let world = gx.world;
  
  // DIBUJAR TERRENO //
  if(!world.incanvas) {
    world.sprite.x = 0;
    world.sprite.y = 0;
    world.sprite.width = game_view.width;
    world.sprite.height = game_view.height;
    game.stage.addChild(world.sprite);
    world.incanvas = true
  }
  
  // DIBUJAR JUGADOR //
  if(!player.incanvas) {
    game.stage.addChild(player.sprite);
    player.incanvas = true;
  }
    //animación movimiento
    if(player.mov.x || player.mov.y) {
      player.mov_sprite.time++;
      if(!(player.mov_sprite.time%6)) player.mov_sprite.texture++;
      if(player.mov_sprite.texture > 3) player.mov_sprite.texture = 0;
      if(player.deg>90 && player.deg<=270) {
        player.sprite.scale.x = -1;
        player.mov_sprite.x = cvw(player.size.x);
      } else {
        player.sprite.scale.x = 1;
        player.mov_sprite.x = 0;
      }
    } else player.mov_sprite.texture = 0;
    
    if(player.mov_sprite.texture) player.sprite.texture = gx.src["pj_"+player.texture+"_m"+player.mov_sprite.texture].texture;
    else player.sprite.texture = gx.src["pj_"+player.texture].texture;
  
  player.sprite.width = cvw(player.size.x);
  player.sprite.height = cvw(player.size.y);
  
  let mx = cvw(world.pos.x) + game_view.width/2; //posicion mundo x
  let my = cvw(world.pos.y) + game_view.height/2;//posicion mundo y
  let pX = 0; //player paint x
  let pY = 0; //player paint y
    
    let maxValueCamX = -cvw(world.size.x) + game_view.width;
    let maxValueCamY = -cvw(world.size.y) + game_view.height;
    
    //detener seguimiento de cámara en límite X
    if(mx >= 0) {
      mx = 0;
      pX -= cvw(world.pos.x);
    } else if(mx <= maxValueCamX){
      mx = maxValueCamX;
      pX -= cvw(world.pos.x) - mx;
    } else pX = game_view.width/2;
    
    //detener seguimiento de cámara en límite Y
    if(my >= 0) {
      my = 0;
      pY -= cvw(world.pos.y);
    } else if(my <= maxValueCamY){
      my = maxValueCamY;
      pY -= cvw(world.pos.y) - my;
    } else pY = game_view.height/2;
    
  // UBICAR MUNDO Y JUGADOR //
  player.sprite.x = pX + player.mov_sprite.x - cvw(player.size.x)/2;
  player.sprite.y = pY - cvw(player.size.y)/2;
  player.sprite.zIndex = player.pos.z+1;
  world.sprite.tilePosition.x = mx;
  world.sprite.tilePosition.y = my;
  
  // DIBUJAR PLAYERS //
  for (let i in gx.pjs) if(gx.pjs[i]) {
    let pj = gx.pjs[i];
    if(!gx.pjs[i].delete) {
      
      if(!pj.incanvas) {
        game.stage.addChild(pj.sprite);
        game.stage.addChild(pj.sprite_status);
        pj.incanvas = true;
      }
      
      let pos = {
        x: cvw(pj.pos.x - pj.size.x/2) + mx,
        y: cvw(pj.pos.y - pj.size.y/2) + my
      };
    
      //si está dentro del rango de visión
      if(
        pos.x >= -gx._paint_offset && 
        pos.x <= game_view.width + gx._paint_offset &&
        pos.y >= -gx._paint_offset && 
        pos.y <= game_view.height + gx._paint_offset
      ) {
          //dibujar letrero del player
          pj.sprite_status.visible = true;
          pj.sprite_status.x = pos.x;
          pj.sprite_status.y = pos.y - cvw(20);
          pj.sprite_status.zIndex = 5;
          pj.sprite_status.width = cvw(pj.size.x);
    
          //ubicar personaje
          pj.sprite.visible = true;
          pj.sprite.x = pos.x;
          pj.sprite.y = pos.y;
          pj.sprite.zIndex = pj.pos.z + 1;
          pj.sprite.width = cvw(pj.size.x);
          pj.sprite.height = cvw(pj.size.y);
      } else {
        pj.sprite.visible = false;
        pj.sprite_status.visible = false;
      }
    }
    else {
      //eliminar jugador
      game.stage.removeChild(pj.sprite);
      game.stage.removeChild(pj.sprite_status);
      pj.sprite.destroy();
      try {delete gx.pjs[i]} catch(e) {gx.pjs[i] = undefined;}
    }
  }
  
  // DIBUJAR OBJETOS //
  for(let i in gx.obj ) {
   let obj = gx.obj[i];
   if(!obj.delete) {
    if(!obj.incanvas) {
      game.stage.addChild(obj.sprite);
      obj.incanvas = true;
    }
    
    let pos = {
      x: cvw(obj.pos.x) + mx,
      y: cvw(obj.pos.y) + my
    };
    
    //si está dentro del rango de visión
    if(
      pos.x >= -gx._paint_offset && 
      pos.x <= game_view.width + gx._paint_offset &&
      pos.y >= -gx._paint_offset && 
      pos.y <= game_view.height + gx._paint_offset
    ) {
      obj.sprite.visible = true;
      obj.sprite.x = pos.x;
      obj.sprite.y = pos.y;
      obj.sprite.zIndex = obj.pos.z + 1;
      obj.sprite.width = cvw(obj.size.x);
      obj.sprite.height = cvw(obj.size.y);
      gx.obj_colision[i] = obj;
    } else if(obj.sprite.visible) {
      obj.sprite.visible = false;
      delete gx.obj_colision[i];
    }
   } 
   else {
     //eliminar objeto
      game.stage.removeChild(obj.sprite);
      obj.sprite.destroy();
      try {delete gx.obj[i]} catch(e) {gx.obj[i] = undefined;}
   }
  }
  
  if(config.TEST_ENABLE) {
    engine.debug(
      "player=> x:" + player.pos.x + "/y:" + player.pos.y + "/z:"+player.pos.z.toFixed(2)+"\n"+
      "mov=> x:" + player.mov.x.toFixed(2) + "/y:" + player.mov.y.toFixed(2) + "/a: "+player.deg.toFixed(2) + "\n"+
      "emits enviados: " + total_emit + " ("+gx._emitps+"emit/s)"+"\n"+
      "bytes enviados: " + Number(bytes_s/1024).toFixed(2)+"KB\n"+
      "bytes recibidos: " + Number(bytes_r/1024).toFixed(2)+"KB"+"\n"+
      "total de bytes: " + Number((bytes_r+bytes_s)/1024/1024).toFixed(2)+"MB"
    );
    fps_count.tick();
  }
 game.stage.sortChildren();
}

// IMAGENES CACHÉ //
engine.cache = class {
  constructor(){
    this.list = [];
  }
  add(name, url){
    this.list.push({name:name, url:url});
  }
  save(callback){
    callback = callback || function(){};
    return game.loader.add(this.list).load(callback)
  }
}

// CONVERSOR DE TILES //
engine.tile = function(n){return n * gx._tile_size};
engine.atile = function(n){Math.floor(n / gx._tile_size)};

// DIRECCION //
engine.direction = function(x, y){
  let rad = Math.atan2(y,x);
  let deg = rad * (180/Math.PI);
  /*
      N
    W   E
      S
  */
  return 45<=deg && deg<135? "N" :
        135<=deg && deg<225? "W" :
        225<=deg && deg<315? "S" : "E" 
}


// DEBUG CANVAS //
engine.debug = async function(txt){
  if(!gx.txt_debug) {
    gx.txt_debug = new PIXI.Text("", {
      fontSize: 10
    });
    gx.txt_debug.x = 5;
    gx.txt_debug.y = 5;
    gx.txt_debug.zIndex = 100;
    game.stage.addChild(gx.txt_debug);
  }
  gx.txt_debug.text = txt
}