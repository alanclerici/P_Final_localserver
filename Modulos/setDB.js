const mqtt = require('mqtt')
const mongoose = require("mongoose");

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

db.once("open", _ => {
  console.log("Conectado a la DB:", uri);
});

// to test the error stop mongod
db.on("error", err => {
  console.log(err);
});

mqttclient.on('connect', function () {
  mqttclient.subscribe('/setDB/#')
  console.log('conectado al broker')
})

//callback de arribo de mensajes
mqttclient.on('message', function (topic, message) {

    //separo el topico con la barra como delimitador
    let aux=topic.toString().split('/');

    if (aux[2]==='zona') {
        modulo.findOneAndUpdate({ id: aux[3]},{zona: message.toString()}, function (err, docs) {
            if (docs!=null) {
              publicarDB()
            }
          })
    }
    if (aux[2]==='funcion') {
      if (aux[4][0]==='b' && aux[3][0]==='L') {

        modulo.findOne({ id: aux[3]}, function (err, docs) {
          //si existe
          if (docs!=null) {
            funcupdate=procFuncion(docs.funcion,aux[4],message)
            modulo.findOneAndUpdate({ id: aux[3]},{funcion: funcupdate}, function (err, docs) {
              if (docs!=null) {
                publicarDB()
              }
            })
          }
        })
      }
    }
})

function publicarDB(){
  modulo.find().lean().exec(function (err, docs) {
    mqttclient.publish('/mod/modsactivos',JSON.stringify(docs),{qos:1,retain:true})
  });
}

//separo el string de la DB,agrego o identifico y reemplazo
function procFuncion(trama,boton,codigo){
  let funcupdate=trama.split(';')
  let flag=0
  let n=0
    for (let i = 0; i < funcupdate.length; i++) {
      if (funcupdate[i].split(':')[0]===boton) {
        flag=1
        n=i
      }
    }
      if (flag) {
        funcupdate[n]=boton+':'+codigo
        //compongo la 'trama'
        trama=''
        for (let i = 0; i < funcupdate.length-1; i++) {
            trama+=funcupdate[i]+';'
        }
            trama+=funcupdate[funcupdate.length-1]

      } else {
        trama=trama+';'+boton+':'+codigo
      }

    return trama
}
