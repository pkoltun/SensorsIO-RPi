var util = require("util");
var ProcessSensor = require('sensors-io').ProcessSensor;
var cp = require('child_process');
var psTree = require('ps-tree');


function RingState() {
    this.on = false;
    this.soundFile = require.resolve('./Sounds/Vibell.wav');
}

function Ring(logger) {
	
    var arg = '%soundFile%';

    var processInfo = {
        command: 'paplay',
        args: arg.split(' ')
    };
    
    ProcessSensor.Sensor.call(this, new RingState(), processInfo, logger);
    this.logger(arg);
}

util.inherits(Ring, ProcessSensor.Sensor);

exports.Ring = Ring
