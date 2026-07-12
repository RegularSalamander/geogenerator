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

    world = new WorldGenerator(512, {noiseSeed: 6});

    funcList = [
        world.actOnCells(world.sphereNoise, world.drawCellNoise),
        world.actOnCells(world.sumNoiseVariance),
        world.actOnce(world.calcWaterLevel),
        world.actOnCells(world.elevationWater, world.drawCellElev),
        world.actOnCells(world.elevationRidges, world.drawCellElev),
        world.actOnCellsTimes([world.traceHydro, world.finalizeHydro], 10, world.drawCellElev, 1),
    ];

    console.log(`Started at ${Math.floor(millis())} ms.`);
}

function draw() {
    let progress = 0;

    let startTime = millis();
    while(processing && millis() - startTime < maxFrame) {
        let next = funcList[currentFunc].next()
        progress = next.value;
        if(next.done) {
            console.log(`Finished ${world.func.name} at ${Math.floor(millis())} ms.`);
            currentFunc++;
            if(currentFunc >= funcList.length) {
                processing = false;
            }
        }
    }

    if(sphereMode) {
        background(10);

        ortho();

        noStroke();
        push();
        rotateX(constrain((height/2 - mouseY)/100, -Math.PI/2, Math.PI/2));
        rotateY(mouseX/100);
        texture(world.vis);
        sphere(200, 100, 50);
        pop();
    } else {
        background(0);
        push();
        translate(-width/2, -height/2);
        image(world.vis, 0, 0, width, height);
        pop();
    }

    if(processing) {
        push();
        translate(-width/2, -height/2);
        noStroke();
        fill(0);
        rect(0, height - 10, width, 10);
        fill(255, 0, 0);
        rect(0, height - 10, progress * width, 10);
        rect()
        pop();
    }
}

function mousePressed() {
    sphereMode = !sphereMode
}