let cnv;

const maxFrame = 1/60*1000;

const world = new WorldGenerator(1024);

let processing = true;
let currentFunc = 0;
let funcList;
let worldIter;

function setup() {
    cnv = createCanvas(1024, 512);
    
    background(0);

    funcList = [world.testNoise];
    worldIter = world.actOnCell(funcList[currentFunc], world.testDrawCell);
}

function draw() {
    if(processing) {
        let startTime = millis();
        while(millis() - startTime < maxFrame) {
            if(worldIter.next().done) {
                currentFunc++;
                if(currentFunc < funcList.length) {
                    worldIter = world.actOnCell(funcList[currentFunc], world.testDrawCell);
                } else {
                    processing = false;
                }
            }
        }
    }
}