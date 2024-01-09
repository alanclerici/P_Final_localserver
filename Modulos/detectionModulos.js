const mqtt = require('mqtt')
const mongoose = require("mongoose");
const TtlAdmin = require('./clases')
//importo el modelo para la DB (modelo de objeto que quiero guardar)
const modulo = require('./models/Modulo');

//mongo: localhost:27017
const uri = "mongodb://localhost:27017/mod";

const mqttclient  = mqtt.connect({
    host: '192.168.0.200',
    port: 1883,
    username: 'server',
    password: 'server'
})

//creo el objeto para conectar con la db
mongoose
  .connect(uri, {
    useNewUrlParser: true,
    //useUnifiedTopology: true,
    //useCreateIndex: true,
    //useFindAndModify: true
  })
  .catch(err => console.log(err));

//conecto con la DB
const db = mongoose.connection;
//creo el objeto para comprobar la presencia de mods
const ttlmng = new TtlAdmin(10);   //ttlmng ttl manager

db.once("open", _ => {
  console.log("Conectado a la DB:", uri);
  modulo.find().lean().exec(function (err, docs) {
    for (i of docs) {
      // console.log(i.id + ':' + i.zona);
        modulo.findOneAndUpdate({ id: i.id },{estado: 'inactivo'}, function (err, docs) {
        publicarDB()
        })
    }
  });
});

// to test the error stop mongod
db.on("error", err => {
  console.log(err);
});

mqttclient.on('connect', function () {
  mqttclient.subscribe('/status')
  console.log('conectado al broker')
  publicarDB()
})

//callback de arribo de mensajes
mqttclient.on('message', function (topic, message) {
  //si es un nuevo mod lo agrego al detector de presencia
  ttlmng.addOrReset(message.toString())

  //busco si existe
  modulo.findOne({ id: message.toString()}, function (err, docs) {

    //si no existe lo creo
    if (docs==null) {
      const mod = new modulo({
        id: message.toString(),
        zona: 'Sin zona',
        estado: 'activo',
        funcion: ''
      });
      mod.save((err, document) => {
        if (err) console.log(err);
        //publico result
        publicarDB()
    });
    }
  });
  //busco si existe y ademas esta inactivo para ponerlo como activo
  modulo.findOneAndUpdate({ id: message.toString(),estado:'inactivo'},{estado: 'activo'}, function (err, docs) {
    if (docs!=null) {
      publicarDB()
    }
  })
})

//inicio temporizador
setInterval(() => {
    //cuando el tiempo de algun mod llega a cero lo devuelve en un array de IDs
    let aux=ttlmng.decrementar()
    //recorro el array de IDs que contiene los modulos que se desconectaron
    for (let i = 0; i < aux.length; i++) {
      //console.log('se desconecto:'+aux[i])
      modulo.findOneAndUpdate({ id: aux[i]},{estado: 'inactivo'}, function (err, docs) {
        publicarDB()
      });
    }
  }, 1000);


function publicarDB(){
  modulo.find().lean().exec(function (err, docs) {
    mqttclient.publish('/mod/modsactivos',JSON.stringify(docs),{qos:1,retain:true})
  });
}
