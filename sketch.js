let cnv;

const maxFrame = 1/60*1000;

let world;

let processing = true;
let currentFunc = 0;
let funcList;
let worldIter;

function setup() {
    cnv = createCanvas(1024, 512);
    
    background(0);

    world = new WorldGenerator(1024)
    funcList = [world.sphereNoise];
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

    world.draw();
}