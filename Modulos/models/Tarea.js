const { Schema, model } = require('mongoose');

const tareaSchema = new Schema({
    nombre: String,
    estado: {
        type: String,
        default: 'inactiva'
    },
    data:{
        type: String,
        default: ''
    }
});

module.exports = model('Tarea', tareaSchema);
