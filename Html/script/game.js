Emulator = {};
engine = {};
gx = {};
interface = {};

//cargar librerías
app.Script(config.PATH.lib+"/pixi.min.js");
app.Script(config.PATH.lib+"/socket-io.min.js");
app.Script(config.PATH.lib+"/joy.min.js");
app.Script(config.PATH.lib+"/fpsmeter.min.js");

//game
app.Script(config.PATH.script+"/engine/engine.js");
app.Script(config.PATH.script+"/engine/socket.js");
app.Script(config.PATH.script+"/engine/interface.js");


function OnStart() {
  mx.debug_init();
  app.SetScreenMode("Game");
  
  // USER STATUS //
  config.USER = {
    socket: {query: app.GetData("auth-query")},
    name: mx.LoadText("login-user"),
    pass: mx.LoadText("login-pass"),
    is_connect: false,
    socket_enabled: JSON.parse(app.GetData("emulator")).value
  }
  
  //cargar motor de emulación
  if(!config.socket_enabled) app.Script(config.PATH.script+"/emulator/socket.js");
  
  game_view = dom.get("#game-view");
  joy = new JoyStick("joystick", {}, engine.joystick);
  game_view.width = screen.width;
  game_view.height = screen.height;
  
  // inicializar pixi
  PIXI.utils.sayHello(PIXI.utils.isWebGLSupported()?"WebGL": "canvas");
  game = new PIXI.Application({
    width: screen.width,
    height: screen.height
  });
  game.stage.sortableChildren = true;
  game_view.dom.add(game.view);
  
  //obtener elementos del DOM
  btns = dom.getAll("button.btn-action-items");
  for(let i = 0; i < btns.length; i++) btns[i].dom.on("touchstart",()=>{})
  
  //mantener la pantalla
  mx.Animate(0.3, () => app.SetScreenMode("Game")).start()
  
  if(config.TEST_ENABLE) ActivateTest()
  engine.init().ready(()=>{
    Connect();
  });
}



// CONEXION //
function Connect() {
  mx.ShowProgress();
  if(config.USER.socket_enabled) {
    Emulator._init();
    io = new Emulator.Client();
  }
  socket = io.connect(config.URL.socket, config.USER.socket);

  socket.on("connect", ()=>{
    mx.HideProgress();
    config.USER.is_connect = true;
  });
  
  socket.on("disconnect", ()=>{
    mx.ShowProgress("Reconectando...");
    config.USER.is_connect = false;
  });
  
  socket.on("reconnected", ()=>{
    mx.HideProgress();
    config.USER.is_connect = true;
  });
  
  engine.socket(socket);
  
}

// OPCIONES DE TESTEO //
function ActivateTest(){
  fps_count = new FPSMeter({
    left: "auto",
    right: screen.width/2+"px",
    maxFps: 75,
    theme: "dark",
    heat: ["red", "blue", "green"],
    graph: 1
  });
  
  const dev = new interface.debug();
  
  // LUPA //
  let sr = gx._screen_reference;
  let pf = gx._paint_offset;
  input_lupa = dom.create("input");
  input_lupa.dom.set("type", "range");
  input_lupa.dom.set("value", "50");
  input_lupa.onchange = () => {
    gx._screen_reference = sr*(parseFloat(input_lupa.value)/100)*2;
    gx._paint_offset = pf*(parseFloat(input_lupa.value)*100)/2
    console.warn("reference screen changed >> "+gx._screen_reference)
  }
  dev.add(input_lupa);
  
  // OCULTAR STATUS //
  dev.add_toggle("Ocultar estado", false, on => {
    dom.get("div.status-box").style.display = !on?"flex":"none";
  });
  
  // DESACTIVAR COLISIONES //
  dev.add_toggle("Ignorar colisiones", false, on => {
    gx._colision_enable = !gx._colision_enable;
    console.warn("colision >> "+(gx._colision_enable?"enable":"disable"))
  });
  
  // COLISION TOTAL //
  dev.add_toggle("Colision sin eje", true, on=>{
    gx._colision_axis = !gx._colision_axis;
  });
  
  //FORMA DE COLISION PLAYER
  dev.add_toggle("Colision cuadrada", false, ()=>{
    gx._colision_center = !gx._colision_center;
  })
  
  // LOGIN //
  dev.add_button("Ir a login", ()=> mx.open("view-login.html"))
  
  // RECONECTAR //
  dev.add_button("Reconectar", ()=> app.Execute("ext.reload_url()"))
  
  // SALIR //
  dev.add_button("Exit App", ()=> app.Exit(true));
}