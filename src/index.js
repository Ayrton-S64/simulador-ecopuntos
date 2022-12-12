import * as Matter from "matter-js";
import * as mqtt from 'mqtt';

console.log(Matter)

const canvas = document.getElementById('simulationCanvas');
const canvas_container = document.getElementById('canvas-container');

const txtCodigoMatricula = document.getElementById('codMatricula');
const btnRequestLogin = document.getElementById('btnRequest');

const indicator_detection = document.getElementById('LED-Detection');
const indicator_login = document.getElementById('LED-Login');

const logger = document.getElementById('txtLog');
const count_display = document.getElementById('txt-counter');

setTimeout(()=>{
    canvas_container.append(canvas)
    logger.value = '>Simulacion Iniciada...'
},1)

var userCode = '1013300219'

var bool_active = false;

var timeOut_filled = null;

var cant_basura = 0;

// module aliases
var Engine = Matter.Engine,
    Render = Matter.Render,
    Runner = Matter.Runner,
    Bodies = Matter.Bodies,
    Body = Matter.Body,
    Composite = Matter.Composite,
    Events = Matter.Events,
    Constraint = Matter.Constraint,
    MouseConstraint = Matter.MouseConstraint,
    Mouse = Matter.Mouse;

const defaultCategory = 0x0001,
      trash = 0x0002;

var categorias = [defaultCategory, trash];

// create an engine
var engine = Engine.create();

// create a renderer
var render = Render.create({
    element: document.body,
    engine: engine,
    canvas: canvas,
    options: {
        wireframes: false
    }
});

var trashcan_b = Bodies.rectangle(510, 576, 114, 8, {
    isStatic: true,
    render: {
        fillStyle: '#236924'
    }
})

var trashcan_l = Bodies.rectangle(447, 479, 8, 200, {
    render: trashcan_b.render,
    isStatic: true
})
Body.rotate(trashcan_l,-Math.PI/32)

var trashcan_r = Bodies.rectangle(573, 479, 8, 200, {
    render: trashcan_b.render,
    isStatic: true
})
Body.rotate(trashcan_r,Math.PI/32)

var trashcan = Body.create({
    parts: [trashcan_b, trashcan_l, trashcan_r],
    isStatic: true
})

var us_sensor = Bodies.rectangle(573, 404, 4, 10,{
    isStatic: true,
    render: {
        fillStyle: '#74543c',
        strokeStyle: '#74543c'
    }
})


var sensor_ray = Bodies.fromVertices(496, 404, [{x: -133, y: -20},{x: 0, y: -4},{x: 0, y: 4},{x: -129, y: 20}], {
    isStatic: true,
    isSensor: true,
    render: {
        strokeStyle: '#6b1711',
        fillStyle: 'transparent',
        lineWidth: 1
    }
})


Composite.add(engine.world, [trashcan, us_sensor,sensor_ray])

// create two boxes and a ground
var boxA = Bodies.rectangle(400, 200, 80, 80,);
var boxB = Bodies.rectangle(450, 50, 80, 80,{label: "Trash"});
boxB.data = {idUsuario: 1, cod: 1013300219, escuela: "Ingenieria de sistemas"}
var ground = Bodies.rectangle(400, 610, 810, 60, { isStatic: true, render:{
    fillStyle: '#404040'
} });

// add all of the bodies to the world
Composite.add(engine.world, [boxA, boxB, ground]);

// run the renderer
Render.run(render);
var mouse = Mouse.create(render.canvas);
var mouseConstraint = MouseConstraint.create(engine, {
    mouse: mouse,
    constraint: {
        render: {
            visible: true
        }
    }
})

Composite.add(engine.world, mouseConstraint);

Events.on(engine, 'collisionStart', startDeteccionBasura)
Events.on(engine, 'collisionEnd', endDeteccionBasura)

render.mouse = mouse;

// create runner
var runner = Runner.create();

// run the engine
Runner.run(runner, engine);

function startDeteccionBasura(ev){
    const pares = ev.pairs;
    pares.forEach(par => {
        if(par.bodyA === sensor_ray || par.bodyB === sensor_ray){
            bool_active = true;
            timeOut_filled = setTimeout(()=>{
                // console.log("tachoLleno!!!"), 
                // alert("TACHO LLENO!!"),
                logMessage('Error: Sensor obstruido!!!')
            },10*1000);
            sensor_ray.render.fillStyle = '#6b1711'
            indicator_detection.style.backgroundColor = '#ff0000';
            logMessage('Objeto detectado')
        }
    });

    // if()
}
function endDeteccionBasura(ev){
    const pares = ev.pairs;
    pares.forEach(par => {
        if(par.bodyA === sensor_ray || par.bodyB === sensor_ray){
            if(bool_active){
                cant_basura++
                console.log("Basura detectada", cant_basura)
                bool_active = false;
                clearTimeout(timeOut_filled)
                sensor_ray.render.fillStyle = 'transparent'
                indicator_detection.style.backgroundColor = '#460606';
                count_display.innerText = cant_basura
                logMessage('Contador incrementado, valor: '+cant_basura)
            }
        }
    });
}

function logMessage(message){
    logger.value = logger.value+=`\n>${message}`
    logger.scrollTop = logger.scrollHeight;
}

// ------------------ MQTT Comunication Code -----------------------

// console.log(mqtt);

const clientId = 'mqttjs_' + Math.random().toString(16).substring(2,8);

const host = 'ws://192.168.1.18:8093/mqtt';

const options = {
    keepalive: 60,
    clientId: clientId,
    protocolId: 'MQTT',
    protocolVersion: 4,
    clean: true,
    reconnectPeriod: 1000,
    connectTimeout: 30 * 1000,
    will: {
        topic: 'ecopuntos',
        payload: 'Cerrada.!',
        qos: 0,
        retain: false
    },
}

console.log('mqtt client Listo');
const client = mqtt.connect(host, options);

client.on('error', (err) => {
    console.log('Error de conexion: ' , err);
    cliente.end();
});

client.on('reconnect' , () => {
    console.log('Reconectando...');
});


client.on('connect', () => {
    console.log('Cliente Listo: ' , clientId);
    // Subscribe
    client.subscribe('testtopic', {qos: 0});
});

//Publicando
client.publish('inicioSesion', 'MENSAJE!!!...!', {qos: 0, retain: false});

// Recibiendo datos
client.on('message' , (topic, message, packet) => {
    console.log('-------inicio sesion')
    console.log('topic: ', topic)
    console.log('message: ', message)
    console.log('packet: ', packet)
    console.log('inicio sesion-------')
    if(topic==='inicioSesion'){
        console.log('fn inicioSesion: ', message.toString())
        response = message.toString();
        client.publish('inicioSesion','loginValido', {qos: 0, retain: false})
        if(response==='loginValido'){
            logger('AceptadoInicio de sesion')
            setTimeout(()=>{
                logger(`enviando data: ${userCode}, ${cant_basura}`);
                cant_basura = 0;
            },30*1000)
        }
    }
});

function loginUser(codigoEstudiante){
    client.publish('inicioSesion', `${codigoEstudiante}`, {qos: 0, retain: false});
}

function sendDataBasura(codigoEstudiante, cant_basura){

}
// ------------------ MQTT Comunication Code -----------------------