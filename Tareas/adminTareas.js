const mqtt = require('mqtt')
const mongoose = require("mongoose");

//importo el modelo para la DB (modelo de objeto que quiero guardar)
const tarea = require('./models/Tarea');

//mongo: localhost:27017
const uri = "mongodb://localhost:27017/task";

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
  })
  .catch(err => console.log(err));

//conecto con la DB
const db = mongoose.connection;
//creo el objeto para comprobar la presencia de mods

db.once("open", _ => {
  console.log("Conectado a la DB:", uri);
});

// to test the error stop mongod
db.on("error", err => {
  console.log(err);
});

mqttclient.on('connect', function () {
  mqttclient.subscribe('/task/#')
  console.log('conectado al broker')
  publicarDB()
})

//callback de arribo de mensajes
mqttclient.on('message', function (topic, message) {

    //separo el topico con la barra como delimitador
    let aux=topic.toString().split('/');

    if (aux[2]==='setestado') {
        //cambio el estado de una tarea
        tarea.findOneAndUpdate({ nombre: aux[3]},{estado: message.toString()}, function (err, docs) {
            if (docs!=null) {
              publicarDB()
            }
          })
    }
    if (aux[2]==='nueva') {
        //genero nueva tarea
        nombre=message.toString().split(';')[0]
        tarea.findOne({ nombre: nombre}, function (err, docs) {
          //si no existe (para no pisar nombres)
          if (docs==null) {
            const mod = new tarea({
                nombre: nombre,
                estado: 'inactiva',
                data: message.toString()
              });
              mod.save((err, document) => {
                if (err) console.log(err);
                //publico result
                publicarDB()
            });
          }
        })
    }
         if (aux[2]==='borrar') {
                //borro una tarea
                tarea.findOneAndDelete({nombre: message.toString()}, function (err, docs) {
                        publicarDB()
                })
        }

})

function publicarDB(){
  tarea.find().lean().exec(function (err, docs) {
    mqttclient.publish('/mod/tareasactivas',JSON.stringify(docs),{qos:1,retain:true})
  });
}
