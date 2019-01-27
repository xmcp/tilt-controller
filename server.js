let express=require('express');
let wrtc=require('wrtc');
let robot=require('robotjs');

let app=express();
app.use(express.json());

const BETA_SENSITIVITY=15;
const GAMMA_SENSITIVITY=-10;
const BETA_INPUT0=0;
const GAMMA_INPUT0=-30;
const BETA_OUTPUT0=robot.getScreenSize().width/2;
const GAMMA_OUTPUT0=robot.getScreenSize().height/2;

const REL_SPEED=.025;
const EXPONENT=1.5;

let px=BETA_OUTPUT0;
let py=GAMMA_OUTPUT0;
function do_expo(d,ex) {
    let symbol=d>0?1:-1;
    return symbol*Math.pow(Math.abs(d),ex);
}

function callback_absolute(beta,gamma) {
    let x=BETA_OUTPUT0+BETA_SENSITIVITY*(beta-BETA_INPUT0);
    let y=GAMMA_OUTPUT0+GAMMA_SENSITIVITY*(gamma-GAMMA_INPUT0);
    //console.log('move mouse',x,y);
    robot.moveMouse(x,y);
}
function callback_relative(beta,gamma) {
    let x=do_expo(BETA_SENSITIVITY*(beta-BETA_INPUT0),EXPONENT)*REL_SPEED;
    let y=do_expo(GAMMA_SENSITIVITY*(gamma-GAMMA_INPUT0),EXPONENT)*REL_SPEED;
    px+=x; py+=y;
    if(px<0) px=0; else if(px>BETA_OUTPUT0*2) px=BETA_OUTPUT0*2;
    if(py<0) py=0; else if(py>GAMMA_OUTPUT0*2) py=GAMMA_OUTPUT0*2;
    robot.moveMouse(px,py);
}

let MOUSE_STATUS='up';
function callback(beta,gamma,touched) {
    callback_absolute(beta,gamma);
    let next_status=touched?'down':'up';
    if(next_status!==MOUSE_STATUS) {
        robot.mouseToggle(next_status);
        MOUSE_STATUS=next_status;
    }
}

function init_rtc(descriptor,res) {
    console.log('init_rtc',descriptor);

    let conn=new wrtc.RTCPeerConnection({iceServers: []});
    conn.ondatachannel=(event)=>{
        let channel=event.channel;
        console.log('ondatachannel',channel);
        channel.onmessage=(event)=>{
            //console.log('onmessage',event.data);
            callback(...JSON.parse(event.data));
        };
        channel.onopen=()=>{
            console.log('onopen');
        };
        channel.onclose=()=>{
            console.log('onclose');
        };
    };

    function gather_ice() {
        return new Promise((resolve,reject)=>{
            conn.onicecandidate=(e)=>{
                if(e.candidate)
                    console.log('onicedandidate',e.candidate);
                else {
                    console.log('onicedandidate','COMPLETED');
                    resolve(conn.localDescription);
                }
            };
        });
    }

    conn.setRemoteDescription(descriptor)
        .then(()=>conn.createAnswer())
        .then((answer)=>conn.setLocalDescription(answer))
        .then(gather_ice())
        .then(()=>{
            console.log('return',conn.localDescription);
            res.json(conn.localDescription)
        });
}

app.get('/',(req,res)=>{
    res.sendFile('client.html',{root:__dirname});
});

app.post('/handshake',(req,res)=>{
    console.log(req.body);
    init_rtc(req.body,res);
});

let server=app.listen(8080,()=>{
    console.log('started');
});