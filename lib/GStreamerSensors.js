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
    this.clients = "127.0.0.1:5000,192.168.1.88:5000";
    this.time = 0;
    this.sensorMode = 5;
    this.fps = 5;
    this.bitrate = 17000000; 
    this.profile = "baseline";
    this.width = 1296;
    this.height = 730;
    this.hflip = true; 
    this.vflip = true;
    this.inlineHeaders = true;
    this.annotation = 12;
    this.keyframeInterval = -1;
    this.intraRefreshType = "GST_RPI_CAM_SRC_INTRA_REFRESH_TYPE_NONE"
    this.exposureMode= "GST_RPI_CAM_SRC_EXPOSURE_MODE_AUTO";
this.quantisation = 0;

}

function Camera(gstreamerRoot, singleClient, logger) {
	
    var arg = '-e -vvv rpicamsrc do-timestamp=true keyframe-interval=%keyframeInterval% intra-refresh-type=%intraRefreshType% inline-headers=%inlineHeaders% preview=false fullscreen=false annotation-mode=%annotation% bitrate=%bitrate%  quantisation-parameter=%quantisation%  vflip=%vflip% hflip=%hflip% exposure-mode=%exposureMode% sensor-mode=%sensorMode% ! video/x-h264,framerate=%fps%/1,profile=%profile%,width=%width%,height=%height% ! h264parse ! rtph264pay pt=96 config-interval=1 ! multiudpsink clients=%clients%';
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
        newState.clients =  senderAddress + ":5000";
    }
}

function MicrophoneState() {
    this.on = false;
    this.clients = "192.168.1.88:5001,127.0.0.1:5001";
    this.samplingRate = 8000;
    this.audioCodec = "raw";
}

var rawAudioMic = "-e -vvv pulsesrc do-timestamp=true ! audio/x-raw,format=S16BE,channels=1,depth=16,width=16,rate=%samplingRate% ! rtpL16pay ! multiudpsink clients=%clients%";
var opusAudioMic = "-e -vvv pulsesrc do-timestamp=true ! audio/x-raw,format=S16LE,channels=1,rate=%samplingRate% ! opusenc ! rtpopuspay ! multiudpsink clients=%clients%";


function Microphone(gstreamerRoot,singleClient, logger) {
	
    var arg = rawAudioMic;
    var gstreamer = gstreamerPath(gstreamerRoot);

    var processInfo = {
        command: gstreamer,
        args: arg.split(' ')
    };
    
    ProcessSensor.Sensor.call(this, new MicrophoneState(), processInfo, logger);
}

util.inherits(Microphone, ProcessSensor.Sensor);

Microphone.prototype.changingState = function (oldState, newState, senderAddress) {
    if (newState.audioCodec === "opus") {
        this.logger("Changing the proces info to: " + opusAudioMic, "INFO");
        this.argsTemplate = opusAudioMic.split(' ');
    }
    else{
        this.logger("Changing the proces info to: " + rawAudioMic, "INFO");
        this.argsTemplate = rawAudioMic.split(' ');
    }
}

function SpeakerState() {
    this.on = false;
    this.sensorAddress = "";
    this.port = 5002;
    this.samplingRate = 8000;
    this.audioCodec = "raw";
};

var opusAudio = '-e -vvv udpsrc port=%port% ! application/x-rtp,media=audio,clock-rate=48000,channels=1,format=S16LE,rate=%samplingRate%,encoding-name=(string)X-GST-OPUS-DRAFT-SPITTKA-00,payload\=(int)96 ! rtpjitterbuffer latency=0 ! rtpopusdepay ! opusdec ! pulsesink  sync=false';

var rawAudio = '-e -vvv udpsrc port=%port% ! application/x-rtp,media=audio,clock-rate=8000,channels=1,format=S16BE,rate=%samplingRate%,encoding-name=(string)L16,payload\=(int)96,width=16, height=16 ! rtpjitterbuffer latency=0 ! rtpL16depay ! pulsesink  sync=false';

function Speaker( gstreamerRoot, singleClient, logger) {
    var state = new SpeakerState();


    var arg =  rawAudio;
    var gstreamer = gstreamerPath(gstreamerRoot);

    var processInfo = {
        command: gstreamer,
        args: arg.split(' ')
    };
    this.sensorConnection = null;
    ProcessSensor.Sensor.call(this, state, processInfo, logger);
}


util.inherits(Speaker, ProcessSensor.Sensor);

Speaker.prototype.changingState = function (oldState, newState, senderAddress) {
    if (newState.audioCodec === "opus") {
        this.logger("Changing the proces info to: " + opusAudio, "INFO");
        this.argsTemplate = opusAudio.split(' ');
    }
    else{
        this.logger("Changing the proces info to: " + rawAudio, "INFO");
        this.argsTemplate = rawAudio.split(' ');

    }
}

exports.Camera = Camera;
exports.Speaker = Speaker;
exports.Microphone = Microphone;
