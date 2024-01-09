const { initializeApp, applicationDefault, cert } = require('firebase-admin/app');
const { getFirestore, Timestamp, FieldValue } = require('firebase-admin/firestore');

const serviceAccount = require('./claves.json');

setTimeout(function() {

initializeApp({
  credential: cert(serviceAccount)
});

const db = getFirestore();

const idserver='server1'

const mqtt = require('mqtt')

const mqttclient  = mqtt.connect({
    host: '192.168.0.200',
    port: 1883,
    username: 'server',
    password: 'server'
})

mqttclient.on('connect', function () {
  mqttclient.subscribe('/mod/#')
  console.log('conectado al broker')
})

//mensajes desde el server hacia firebase
mqttclient.on('message', function (topic, message) {

    //separo el topico con la barra como delimitador
    let aux=topic.toString().split('/');

    const path=db.collection(idserver+'toApp')

    if (aux[2]==='modsactivos') {
        const data = {'mod-modsactivos': message.toString(),};
        path.doc('mod-modsactivos').set(data, { merge: true });
    }

    if (aux[2]==='tareasactivas') {
      const data = {'mod-tareasactivas': message.toString(),};
      path.doc('mod-tareasactivas').set(data, { merge: true });
    }

    if (aux[2][0]=='S') {
      const data = {};
      const etiqueta = 'mod-'+aux[2]+'-'+aux[3];
      data[etiqueta]=message.toString()
      path.doc(etiqueta).set(data, { merge: true });
    }

    if (aux[2][0]=='R') {
      if (aux[3]==='estado') {
        const data = {};
        const etiqueta = 'mod-'+aux[2]+'-estado';
        data[etiqueta]=message.toString()
        path.doc(etiqueta).set(data, { merge: true });
      }
    }
    //del modulo de led no hay nada ya que la app no recibe info
})

//mensajes desde firebase hacia el server

db.collection(idserver+'toServer').onSnapshot(querySnapshot => {
  querySnapshot.docChanges().forEach(change => {
      if (change.type === 'modified') {
          const dato = change.doc.data()
          const topico = '/'+Object.keys(dato).toString().replaceAll('-','/')
          const mensaje = dato[Object.keys(dato).toString()]
          mqttclient.publish(topico,mensaje)
      }
  });
});
}, 5000);
