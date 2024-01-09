const { Schema, model } = require('mongoose');

// https://mongoosejs.com/docs/schematypes.html
const moduloSchema = new Schema({
    id: String,
    zona: {
        type: String,
        default: 'Sin zona'
    },
    estado: {
        type: String,
        default: 'inactivo'
    },
    funcion:{
        type: String,
        default: ''
    }
});

module.exports = model('Modulo', moduloSchema);
