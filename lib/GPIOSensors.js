var util = require("util");
var sensor = require('sensors-io').Sensor;
var onoff = require('onoff');

function OutGPIOSensor(on, pin, logger) {
    var state = {
        on: null
    };
    sensor.Sensor.call(this, state, logger);
    var that = this;
    this.readOnly = false;
    this.pin = pin;
    
    this.gpio = new onoff.Gpio(pin, "out");
    
    that.logger("Pin setup: " + pin, "INFO");
    
    that.gpio.write(on, function (error) {
        if (error) {
            that.logger("Error while writing pin", "ERROR");
        }
        else {
            that.logger("State changed to " + on, "INFO");
            that.state.on = on;
            that.emitStateChangedEvent();
        }
    });
    
    this.close = function () {
        if (that.gpio !== null) {
            that.logger("Unexporting out pin " + that.pin, "INFO");
            that.gpio.unexport();
            that.gpio = null;
        }
    }
}

util.inherits(OutGPIOSensor, sensor.Sensor);

OutGPIOSensor.prototype.setState = function (newState, senderAddress, callback) {
    var that = this;
    if (!this.readOnly) {
        if (newState.on === false || newState.on === true) {
            
            this.gpio.write(newState.on ? 1 : 0, function (error) {
                if (error) {
                    that.logger("Error while writing pin", "ERROR");
                }
                else {
                    that.logger("State changed to " + newState.on, "INFO");
                    that.state.on = newState.on;
                    that.emitStateChangedEvent();
                }
            });
        }
        else {
            that.logger("State on property should be true or false");
        }
            
    }
}

function InGPIOSensor(pin, logger) {
    var state = {
        on: null
    };
    
    sensor.Sensor.call(this, state, logger);
    var that = this;
    this.readOnly = true;
    this.pin = pin;
    this.gpio = new onoff.Gpio(pin, "in", "both")
    this.logger("In Pin setup: " + pin, "INFO");
    var watchFunction = function (error, value) {
        if (error) {
            that.logger("Error while reading pin", "ERROR");
        }
        else {
            
            if (that.state.on !== value) {
                that.logger("State read " + value, "INFO");
                that.state.on = value === 1 ? true : false;
                that.emitStateChangedEvent();
            }
        }

    };
    this.gpio.read(watchFunction);
    this.gpio.watch(watchFunction);
    this.close = function () {
        if (that.gpio !== null) {
            that.logger("Unexporting in pin " + that.pin, "INFO");
            that.gpio.unexport();
            that.gpio = null;
        }
    }
}

util.inherits(InGPIOSensor, sensor.Sensor);

InGPIOSensor.prototype.setState = function (newState, senderAddress, callback) {
}

exports.OutGPIOSensor = OutGPIOSensor;
exports.InGPIOSensor = InGPIOSensor;
