let INTERVAL_TIME=16;

let logger=document.getElementById('logger');
function log(...t) {
    logger.textContent+='\n'+JSON.stringify(t);
}

let conn=new RTCPeerConnection({iceServers: []});
let channel=conn.createDataChannel('data',{
    maxRetransmits: 0,
    ordered: false,
    reliable: false,
});

let okay=false;
channel.onopen=(e)=>{
    log('open',e);
    okay=true;
};
channel.onclose=(e)=>{
    log('close',e);
    okay=false;
};

function gather_ice() {
    return new Promise((resolve,reject)=>{
        conn.onicecandidate=(e)=>{
            if(e.candidate)
                log('onicedandidate',e.candidate);
            else {
                log('onicedandidate','COMPLETED');
                log('return',conn.localDescription);
                resolve(conn.localDescription);
            }
        };
    });
}

let _send_data_store=null;
function send_data(data) {
    _send_data_store=data;
}

function _send_data_loop() {
    if(_send_data_store!==null) {
        if(okay)
            channel.send(JSON.stringify(_send_data_store));
        _send_data_store=null;
    }
}

function start_channel(name) {
    log('start');
    conn.createOffer()
        .then((offer)=>conn.setLocalDescription(offer))
        .then(gather_ice())
        .then(()=>fetch('/handshake?name='+encodeURIComponent(name),{
            method: 'POST',
            headers: {
                'Accept': 'application/json',
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(conn.localDescription),
        }))
        .then((res)=>res.json())
        .then((json)=>{
            log('json',json);
            return conn.setRemoteDescription(json);
        })
        .then(()=>{
            setInterval(_send_data_loop,INTERVAL_TIME);
        })
        .catch((e)=>log('catch',e));
}
