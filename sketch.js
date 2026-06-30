let cnv;

const maxFrame = 1/60*1000;

let world;

let processing = true;
let currentFunc = 0;
let funcList;
let worldIter;

let sphereMode = false;

function setup() {
    frameRate(60);

    cnv = createCanvas(1024, 512, WEBGL);
    
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

    if(sphereMode) {
        background(10);

        noStroke();
        rotateX(constrain((height/2 - mouseY)/100, -Math.PI/2, Math.PI/2));
        rotateY(mouseX/100);
        texture(world.vis);
        sphere(200, 100, 50);
    } else {
        background(0);
        push();
        translate(-world.cols/2, -world.rows/2);
        world.draw();
        pop();
    }
}

function mousePressed() {
    sphereMode = !sphereMode
}