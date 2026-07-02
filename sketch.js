p5.disableFriendlyErrors = true;

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

    world = new WorldGenerator(1024, {});

    funcList = [
        world.actOnCells(world.sphereNoise, world.testDrawCell),
        world.actOnCells(world.calcNoiseVariance, world.testDrawCell),
        world.actOnCells(world.elevationWater, world.testDrawCell),
    ];

    console.log(`Started at ${Math.floor(millis())} ms.`);
}

function draw() {
    let startTime = millis();
    while(processing && millis() - startTime < maxFrame) {
        if(funcList[currentFunc].next().done) {
            console.log(`Stopped ${world.func.name} at ${Math.floor(millis())} ms.`);
            currentFunc++;
            if(currentFunc < funcList.length) {
                // console.log(`Started ${world.func.name} at ${Math.floor(millis())} ms.`);
            } else {
                processing = false;
                console.log(world.details.waterPercent);
                // console.log(world.details.noiseAvg);
                // console.log(world.details.noiseVar);
            }
        }
    }   

    if(sphereMode) {
        background(10);

        ortho();

        noStroke();
        rotateX(constrain((height/2 - mouseY)/100, -Math.PI/2, Math.PI/2));
        rotateY(mouseX/100);
        texture(world.vis);
        sphere(200, 100, 50);
    } else {
        background(0);
        push();
        translate(-width/2, -height/2);
        image(world.vis, 0, 0, width, height);
        pop();
    }
}

function mousePressed() {
    sphereMode = !sphereMode
}