cc.Class({
    extends: cc.Component,

    properties: {
        gameBtn1: {
            default: null,
            type: cc.Button
        },

        gameBtn2: {
            default: null,
            type: cc.Button
        },

    },

    // use this for initialization
    onLoad: function () {
        cc.systemEvent.on(cc.SystemEvent.EventType.KEY_DOWN, this.onKeyDown, this);
    },

    start(){

    },
    // called every frame
    update: function (dt) {

    },

    onClike(obj, data){
        console.log('----> data:', data);
        if(data == 1){
            cc.director.loadScene('game1');
        }else if(data == 2){
            cc.director.loadScene('game2');
        }else{

        }
    },

    onDestroy () {
        cc.systemEvent.off(cc.SystemEvent.EventType.KEY_DOWN, this.onKeyDown, this);
    },

    onKeyDown (event) {
        switch(event.keyCode) {
            case cc.KEY.back:
                cc.director.end(); 
                break;
        }
    },





});
