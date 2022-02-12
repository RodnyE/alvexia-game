total_emit = 0;
engine.socket = (socket)=>{
  
  // LOAD MAP //
  socket.on("load_map", d=>{
    console.log("ws load_map ><")
    /* map = {
        name : WORDNAME,
        pos : {
            x : POS_X,
            y : POS_Y
        },
        size : {
            x : WORD_WIDTH,
            y : WORD_HEIGHT
        },
        biome : "nature",
        terrain : {},
        objects : {},
        npcs : {},
        pjs : {}
    } */
    let world = gx.world;
    world.size[0] = engine.tile(d.size.x);
    world.size[1] = engine.tile(d.size.y);
    world.pos[0] = d.pos.x;
    world.pos[1] = d.pos.y;
    world.biome = d.biome;
    
  });
  
  // AGREGAR NUEVO PLAYER EN LA CAMARA //
  socket.on("new_pj", d=>{
    console.log("ws new_pj>> username:"+d.username)
    /*username,
      pjstats: {
        nickname,
        status: {
            level,
            xp,
            c_xp,
            hp,
            mp,
            c_hp,
            c_mp,
        },
        pos: {x,y,angle}
        size: {x,y}
        
    };
    */
    let stats = d.pjstats;
    let player = {
      pos: [stats.pos.x, stats.pos.y],
      deg: stats.pos.angle,
      size: [stats.size.x, stats.size.y],
      texture: stats.skin,
      img: new Img()
    };
    player.img.src = mx.BImg(config.PATH.img_pjs+"/"+player.texture);
    player.img.onload = ()=>{player.img.ready=true};
    gx.pjs[d.username] = player;
  });
  
  // ACTUALIZAR PLAYER EN LA CAMARA //
  socket.on("del_pj", d=>{
    console.log("ws del_pj>> "+d)
    try {delete gx.pjs[d]}
    catch(e){gx.pjs[d] = undefined}
  });
  
  // MOVER //
  socket.on("move_pj", d=>{
    let is_user = config.USER.name==d.username;
    let player = is_user?gx.player:gx.pjs[d.username];
    player.pos = [d.pos.x, d.pos.y];
    player.deg = d.pos.angle;
    
    if(is_user) gx.world.pos = [
      -d.pos.x, 
      -d.pos.y
    ];
  })
  
}