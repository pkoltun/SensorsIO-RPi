var util = require("util");
var sensor = require('sensors-io').Sensor;
var gpio = require('rpi-gpio');

function OutGPIOSensor(on, pin, logger) {
    var state = {
        on: null
    };
    sensor.Sensor.call(this, state, logger);
    var that = this;
    this.readOnly = false;
    this.pin = pin;
    
    var onStart = function () {
        that.logger("Pin setup", "INFO");
        gpio.write(pin, on, function (error) {
            if (error) {
                that.logger("Error while writing pin", "ERROR");
            }
            else {
                that.logger("State changed to " + on, "INFO");
                that.state.on = on;
                that.emitStateChangedEvent();
            }
        });
        
    }
    
    
    gpio.setup(pin, gpio.DIR_OUT, onStart);
}

util.inherits(OutGPIOSensor, sensor.Sensor);

OutGPIOSensor.prototype.setState = function (newState, senderAddress, callback) {
    var that = this;
    if (!this.readOnly) {
        if (newState.on === false || newState.on === true) {
            
            gpio.write(this.pin, newState.on, function (error) {
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
    }
}

function InGPIOSensor(pin, logger) {
    var state = {
        on: null
    };
    gpio.setPollFrequency(1007);
    
    sensor.Sensor.call(this, state, logger);
    var that = this;
    this.readOnly = true;
    this.pin = pin;
    
    var onStart = function () {
        that.logger("In Pin setup", "INFO");
        var readValue = function () {
            gpio.read(pin, function (error, value) {
                if (error) {
                    that.logger("Error while reading pin", "ERROR");
                }
                else {
                    
                    if (that.state.on !== value) {
                        that.logger("State read " + value, "INFO");
                        that.state.on = value;
                        that.emitStateChangedEvent();
                    }
                }

            });
        }
        setInterval(readValue, 307);
    }
    /*
     * This is not working, as work around we read value each 1007 miliseconds.
    gpio.on('change', function (channel, value) {
        that.logger("Pin " + channel + " value changed to " + value, "INFO");
        if (channel === pin) {
            that.state.on = value;
            that.emitStateChangedEvent();
        } 
      });
    */
    
    gpio.setup(pin, gpio.DIR_IN, onStart);
}

util.inherits(InGPIOSensor, sensor.Sensor);

InGPIOSensor.prototype.setState = function (newState, senderAddress, callback) {
}

exports.OutGPIOSensor = OutGPIOSensor;
exports.InGPIOSensor = InGPIOSensor;
