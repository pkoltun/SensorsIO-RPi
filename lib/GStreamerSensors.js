var util = require("util");
var ProcessSensor = require('sensors-io').ProcessSensor;
var cp = require('child_process');
var psTree = require('ps-tree');
var path = require('path');

var gstreamerPath = function (gstreamerRoot){
    if (!gstreamerRoot) {
        gstreamerRoot = "";
    }
    return path.join(gstreamerRoot, "gst-launch-1.0");
}

ProcessSensor.Sensor.prototype.kill = function () {
    
    this.process.pid;
    psTree(this.process.pid, function (err, children) {
        cp.spawn('kill', ['-9'].concat(children.map(function (p) { return p.PID })))
    })
    this.process.kill();

}

function CameraState() {
    this.on = false;
    this.client = "224.1.1.1";
    this.port = 5000;
    this.time = 0;
    this.sensorMode = 5;
    this.fps = 5;
    this.bitrate = 1000000; 
    this.profile = "high";
    this.width = 1296;
    this.height = 730;
    this.hflip = true; 
    this.vflip = true;
    this.inlineHeaders = true;
    this.annotation = 12;
    this.keyframeInterval = -1;
    this.intraRefreshType = "GST_RPI_CAM_SRC_INTRA_REFRESH_TYPE_NONE"
    this.exposureMode= "GST_RPI_CAM_SRC_EXPOSURE_MODE_AUTO";
	this.multicastIface = "eth0";
}

function Camera(gstreamerRoot, singleClient, logger) {
	
    var arg = '-e -vvv rpicamsrc keyframe-interval=%keyframeInterval% intra-refresh-type=%intraRefreshType% inline-headers=%inlineHeaders% preview=false fullscreen=false annotation-mode=%annotation% bitrate=%bitrate% vflip=%vflip% hflip=%hflip% exposure-mode=%exposureMode% sensor-mode=%sensorMode% ! video/x-h264,framerate=%fps%/1,profile=%profile%,width=%width%,height=%height% ! rtph264pay pt=96 config-interval=1 ! udpsink host=%client% port=%port%';
	if (!singleClient){
	 arg = arg + " auto-multicast=true multicast-iface=%multicastIface%";
	}
//    var arg = "raspivid -t %time% -w %width% -h %height% -fps %fps% -b %bitrate% -o - | gst-launch-1.0 -e -vvv fdsrc ! h264parse ! rtph264pay pt=96 config-interval=5 ! udpsink host=%client% port=%port%";
    
   var gstreamer = gstreamerPath(gstreamerRoot);

    var processInfo = {
        command: gstreamer,
        args: arg.split(' ')
    };
    
    ProcessSensor.Sensor.call(this, new CameraState(), processInfo, logger);
    this.logger(arg);
}

util.inherits(Camera, ProcessSensor.Sensor);

Camera.prototype.changingState = function (oldState, newState, senderAddress) {
    if (senderAddress && newState.client === "CLIENTIP") {
        this.logger("Setting client address to: " + senderAddress, "INFO");
        newState.client = senderAddress;
    }
}

function MicrophoneState() {
    this.on = false;
    this.client = "224.1.1.1";
    this.port = 5001;
    this.device = "plughw:Set";
    this.samplingRate = 8000;
	this.multicastIface = "eth0";
}

function Microphone(gstreamerRoot,singleClient, logger) {
	var source = "alsasrc device=%device%";
	
    var arg = source +" ! audioconvert ! audioresample ! audio/x-raw,format=S16LE,channels=1,rate=%samplingRate% ! speexenc ! rtpspeexpay !  udpsink host=%client% port=%port%";
	if (!singleClient){
	 arg = arg + " auto-multicast=true multicast-iface=%multicastIface%";
	}
    var gstreamer = gstreamerPath(gstreamerRoot);

    var processInfo = {
        command: gstreamer,
        args: arg.split(' ')
    };
    
    ProcessSensor.Sensor.call(this, new MicrophoneState(), processInfo, logger);
}

util.inherits(Microphone, ProcessSensor.Sensor);

Microphone.prototype.changingState = function (oldState, newState, senderAddress) {
    if (senderAddress && newState.client === "CLIENTIP") {
        this.logger("Setting client address to: " + senderAddress, "INFO");
        newState.client = senderAddress;
    }
}

function SpeakerState() {
    this.on = false;
    this.sensorAddress = "";
    this.port = 5002;
    this.samplingRate = 8000;
    this.volume = 1.0;
	this.multicastIface = "eth0";
	this.device = "plughw:Set";
	this.client = "224.1.1.1";
	this.buffer_size = 1000;
};

function Speaker( gstreamerRoot, singleClient, logger) {
    var state = new SpeakerState();
	var source = "-v udpsrc port=%port% buffer-size=%buffer_size%";
	if (!singleClient){
		source = source + " multicast-group=%client% auto-multicast=true";
	}
    var arg =  source + ' ! application/x-rtp,media=audio,clock-rate=%samplingRate%,channels=1,format=S16LE,encoding-name=SPEEX ! rtpspeexdepay ! speexdec ! volume volume=%volume% ! alsasink device=%device% sync=false';
    var gstreamer = gstreamerPath(gstreamerRoot);

    var processInfo = {
        command: gstreamer,
        args: arg.split(' ')
    };
    this.sensorConnection = null;
    ProcessSensor.Sensor.call(this, state, processInfo, logger);
}

util.inherits(Speaker, ProcessSensor.Sensor);

exports.Camera = Camera;
exports.Speaker = Speaker;
exports.Microphone = Microphone;
