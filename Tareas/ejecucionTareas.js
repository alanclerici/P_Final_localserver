const mqtt = require('mqtt')

const mqttclient  = mqtt.connect({
    host: '192.168.10.200',
    port: 1883,
    username: 'server',
    password: 'server'
})

mqttclient.on('connect', function () {
  mqttclient.subscribe('/mod/#')
  console.log('conectado al broker')
})

// "prueba;/mod/S00001/temperatura-Mayor que-34;/mod/R00001/comandos-on;Ninguno---"

class Tarea {

    constructor(trama) {
        trama=trama.split(';')

        this.nombre = trama[0];

        let entrada = trama[1].split('-')
        this.topicoEntrada = entrada[0]
        this.tipoComparacion = entrada[1]
        this.valorComparacion = entrada[2]

        let salida = trama[2].split('-')
        this.topicoSalida = salida[0]
        this.msgSalida = salida[1]

        let secundario = trama[3].split('-')
        this.efectoSecundario = secundario[0]
        this.causaSecundaria = secundario[1]
        this.horaSec = secundario[2].split(':')[0]
        this.minSec = secundario[2].split(':')[1]
        this.msgSecundario = secundario[3]

        //solo si la causa es un suceso temporal
        if (this.topicoEntrada==='Tiempo') {
            this.causasTemporales()
        }
    }


    procesar(topico,msg) {
        //para causas temporales no hace nada
      if (topico!='Tiempo' && topico===this.topicoEntrada && this.comparacionNumerica(msg)) {
        this.efectoSalida();
      }
    }

    //en caso de que la causa sea una comparacion entre valores numericos
    comparacionNumerica(msg){
        switch (this.tipoComparacion) {
            case 'Mayor que':
                if (parseInt(msg)>=parseInt(this.valorComparacion)) {
                    return true
                } else {
                    return false
                }
            case 'Menor que':
                if (parseInt(msg)<=parseInt(this.valorComparacion)) {
                    return true
                } else {
                    return false
                }
            case 'Igual a':
                if (parseInt(msg)==parseInt(this.valorComparacion)) {
                    return true
                } else {
                    return false
                }
            default:
                return false
        }
    }

    procEfectoSecundario(){
        if (this.efectoSecundario!='Ninguno') {
            switch (this.causaSecundaria) {
                case 'Despues de':
                    this.idTimmerSec=setTimeout(function(topico,msg){
                        mqttclient.publish(topico,msg)
                    }, (parseInt(this.horaSec)*3600+parseInt(this.minSec)*60) * 100 ,this.topicoSalida,this.msgSecundario)
                    break;
                default:
                    break;
            }
        }
    }

    efectoSalida(){
        mqttclient.publish(this.topicoSalida,this.msgSalida)
        this.procEfectoSecundario()
    }

    efectoSecundario(){
        console.log(this.msgSecundario)
        mqttclient.publish(this.topicoSalida,this.msgSecundario)
    }

    causasTemporales(){
        switch (this.tipoComparacion) {
            case 'Periodo':
                //disparo una inter periodica para ejec tarea
                console.log('causa temporal')
                //desarmo el msg 'xHxM'
                let t=this.valorComparacion.split(':')
                let min=parseInt(t[0])*60+parseInt(t[1])

                this.idTimmer=setInterval(()=>{
                    this.efectoSalida()
                },min*60*100)
                break;

            case 'Hora exacta':
                //disparo una interrup cada segundo para chequear si la hora coincide
                let aux=this.valorComparacion.split(':')
                let hs=parseInt(aux[0])
                let mins=parseInt(aux[1])
                this.idTimmer=setInterval(()=>{
                    let date = new Date();
                    if (date.getHours()==hs && date.getMinutes()==mins) {
                        this.efectoSalida()
                    }
                },1000)
                break;

            default:
                break;
        }
    }

    destructor() {
      //utilizo en el caso de causas temporales, para eliminar timmers
        if (this.topicoEntrada==='Tiempo') {
            clearInterval(this.idTimmer)
        }
    }

   cleanTimmers(){
        if (this.topicoEntrada==='Tiempo') {
            clearInterval(this.idTimmer)
        }
        if (this.efectoSecundario!='Ninguno') {
            clearInterval(this.idTimmerSec)
        }
   }

  }

  // Uso:
//   let user = new User("John");

class AdminTareas{

    constructor(){
        this.listaTareasActivas=[]
        this.arregloTareas=[]
    }

    getListaTareasActivas(){
        return this.listaTareasActivas
    }

    //recibo el json de tareas
    actualizarLista(tareasJson){
        if (this.listaTareasActivas.length<=0) {
            //lista vacia. Agrego 1 o mas tareas por primera vez
            for (const i of tareasJson) {
                if (i['estado']==='activa') {
                    this.arregloTareas.push(new Tarea(i['data']))
                    this.listaTareasActivas.push(i['nombre'])
                }
            }
        } else {
            //al menos una tarea previamente activa

            let flag=0  //flag=1 significa que la tarea esta presente

            //Reviso si se agregaron tareas
            for (const i of tareasJson) {
                if (i['estado']==='activa') {
                    flag=0
                    for (const j in this.listaTareasActivas) {
                        if (i['nombre']===j) {
                            flag=1
                        }
                    }
                    //creo la nueva tarea
                    if (!flag) {
                        this.arregloTareas.push(new Tarea(i['data']))
                        this.listaTareasActivas.push(i['nombre'])
                    }
                }
            }

            flag=0
            let index=0
            //Reviso si se eliminaron tareas
            for (const j in this.listaTareasActivas) {
                flag=0
                for (const i of tareasJson) {
                    if (i['nombre']===j && i['estado']==='activa') {
                        flag=1
                    }
                }
                if (!flag) {
                    //elimino tarea
                    this.listaTareasActivas.splice(index,1)
                    this.arregloTareas[index].cleanTimmers()
                    delete this.arregloTareas[index]    //ejecuto el destructor
                    this.arregloTareas.splice(index,1)
                }
                index++
            }
        }
    }

    ejecutar(topico,msg){
        for (let i = 0; i < this.arregloTareas.length; i++) {
            this.arregloTareas[i].procesar(topico,msg)
        }
    }
}

let adminTareas = new AdminTareas()

//callback de arribo de mensajes
mqttclient.on('message', function (topic, message) {

    //separo el topico con la barra como delimitador
    let aux=topic.toString().split('/');

    if (aux[2]==='tareasactivas') {
        const obj = JSON.parse(message.toString())
        adminTareas.actualizarLista(obj)
        // console.log(adminTareas.getListaTareasActivas())
    } else {
        adminTareas.ejecutar(topic.toString(),message.toString())
    }
})