//clase que va a administrar la presencia de mods (time to live mod admin)
//la idea: cuando se publica el ID de un nuevo mod lo paso como parametro en addOnReset
//de esta forma lo agrego a un array. Con decrementar reduzco en 1 el ttl. Si alguno llega a cero
//la funcion devuelve un array de nombres de los que llegaron a cero
//si el modulo ya estaba en el array se reseta el su ttl

class TtlAdmin {

    constructor(ttl) {
        this.ttldefault=ttl
        this.mods = new Array()
        this.mods = []
    }

    addOrReset(id) {
        let flag=0
        for (let i = 0; i < this.mods.length; i++) {
            if(this.mods[i].id===id){
                flag=1
                this.mods[i].ttl=this.ttldefault
            }
        }
        if(!flag){
            this.mods.push({     // un objeto
                    id: id,
                    ttl: this.ttldefault
                }
            )
        }
    }

    //devuelve arreglo
    decrementar(){
        let out=new Array()
        for (let i = 0; i < this.mods.length; i++) {
            this.mods[i].ttl=this.mods[i].ttl-1
            if (this.mods[i].ttl<1) {
                out.push(this.mods[i].id)

            }
        }
        this.mods=this.mods.filter(item => item.ttl != 0)
        return out
    }
}

module.exports = TtlAdmin

/*
//test
let a = new TtlAdmin(2)

a.addOrReset('algo1')
a.addOrReset('algo1.2')
console.log(a.decrementar())
a.addOrReset('algo2')
console.log(a.decrementar())
a.addOrReset('algo2')
console.log(a.decrementar())
a.addOrReset('algo3')
console.log(a.decrementar())
console.log(a.decrementar())
*/